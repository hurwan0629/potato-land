import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { io } from "socket.io-client";

const apiBaseUrl = process.env.TEST_API_URL ?? "http://127.0.0.1:8080/api";
const socketUrl = process.env.TEST_SOCKET_URL ?? "http://127.0.0.1:8080";
const fixturePath = process.env.TEST_FIXTURE_FILE;

if (!fixturePath) {
  throw new Error("TEST_FIXTURE_FILE 환경변수로 fixture JSON 경로를 지정해주세요.");
}

const fixture = JSON.parse(await readFile(resolve(fixturePath), "utf8"));

async function request(path, { cookie, method = "GET", body } = {}) {
  const isFormData = body instanceof FormData;
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method,
    headers: {
      ...(body && !isFormData ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body
      ? isFormData
        ? body
        : JSON.stringify(body)
      : undefined,
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.success) {
    throw new Error(
      `${method} ${path} 실패: ${payload?.message ?? response.status}`,
    );
  }

  return { response, data: payload.data };
}

function readCookies(response) {
  const setCookies = typeof response.headers.getSetCookie === "function"
    ? response.headers.getSetCookie()
    : [response.headers.get("set-cookie")].filter(Boolean);

  return setCookies
    .map((cookie) => cookie.split(";", 1)[0])
    .join("; ");
}

async function login(loginId) {
  const { response } = await request("/auth/login", {
    method: "POST",
    body: {
      loginId,
      password: fixture.password,
    },
  });

  const cookie = readCookies(response);
  if (!cookie) {
    throw new Error(`${loginId} 로그인 쿠키를 받지 못했습니다.`);
  }
  return cookie;
}


async function verifyFourImageAuctionUpload(sellerCookie) {
  const imageBytes = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zr2cAAAAASUVORK5CYII=",
    "base64",
  );
  const formData = new FormData();
  formData.append("title", "네 장 이미지 HTTP 시나리오");
  formData.append("description", "실제 multipart 경로에서 네 장이 저장되는지 확인합니다.");
  formData.append("categoryIdx", String(fixture.categoryIdx));
  formData.append("productStatus", "LIKE_NEW");
  formData.append("startPrice", "10000");
  formData.append("preferredTradeLocation", "테스트역");

  for (let index = 0; index < 4; index += 1) {
    formData.append(
      "images",
      new Blob([imageBytes], { type: "image/png" }),
      `scenario-${index + 1}.png`,
    );
  }

  const created = await request("/auctions", {
    cookie: sellerCookie,
    method: "POST",
    body: formData,
  });
  const detail = await request(`/auctions/${created.data.listingIdx}`);

  if (detail.data.images?.length !== 4) {
    throw new Error(
      `경매 이미지 4장을 기대했지만 ${detail.data.images?.length ?? 0}장이 조회되었습니다.`,
    );
  }

  console.log("PASS: 실제 multipart 경매 등록 경로가 이미지 네 장을 보존했습니다.");
}

function connectSocket(cookie) {
  return new Promise((resolveConnection, rejectConnection) => {
    const socket = io(socketUrl, {
      transports: ["websocket"],
      extraHeaders: { Cookie: cookie },
      reconnection: false,
      timeout: 5_000,
    });

    socket.once("connect", () => resolveConnection(socket));
    socket.once("connect_error", rejectConnection);
  });
}

function waitForNotification(socket, notificationType) {
  return new Promise((resolveNotification, rejectNotification) => {
    const timeout = setTimeout(() => {
      socket.off("notification:new", handleNotification);
      rejectNotification(
        new Error(`${notificationType} 알림 수신 시간이 초과되었습니다.`),
      );
    }, 8_000);

    function handleNotification(notification) {
      if (notification?.notificationType !== notificationType) {
        return;
      }

      clearTimeout(timeout);
      socket.off("notification:new", handleNotification);
      resolveNotification(notification);
    }

    socket.on("notification:new", handleNotification);
  });
}

const cookies = await Promise.all([
  login("test_seller"),
  login("test_bidder_a"),
  login("test_bidder_b"),
]);
const [sellerCookie, bidderACookie, bidderBCookie] = cookies;
await verifyFourImageAuctionUpload(sellerCookie);

const [bidderASocket, bidderBSocket] = await Promise.all([
  connectSocket(bidderACookie),
  connectSocket(bidderBCookie),
]);

try {
  const bidderANotification = waitForNotification(
    bidderASocket,
    "LISTING_DELETED",
  );
  const bidderBNotification = waitForNotification(
    bidderBSocket,
    "LISTING_DELETED",
  );

  await request(`/auctions/${fixture.auctions.deletion}`, {
    cookie: sellerCookie,
    method: "DELETE",
    body: { deleteReason: "Socket 시나리오 테스트 삭제" },
  });

  const notifications = await Promise.all([
    bidderANotification,
    bidderBNotification,
  ]);

  for (const notification of notifications) {
    if (Number(notification.referenceIdx) !== fixture.auctions.deletion) {
      throw new Error("삭제 알림의 경매 참조값이 일치하지 않습니다.");
    }
  }

  console.log("PASS: 화면 미접속 입찰자 두 명이 경매 삭제 알림을 수신했습니다.");
} finally {
  bidderASocket.disconnect();
  bidderBSocket.disconnect();
}
