import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { validateAuctionList, validateBidAmount } from "../../src/modules/auctions/auctions.validator.js";
import { validateUsedCreate, validateUsedList } from "../../src/modules/used/used.validator.js";
import { validateAccountUpdate } from "../../src/modules/users/users.validator.js";

function catchesCode(work, code) {
  assert.throws(work, (error) => error?.code === code);
}

test("중고 목록 조건을 정규화한다", () => {
  assert.deepEqual(validateUsedList({ q: " 감자 ", page: "2", limit: "10", sort: "popular" }), {
    q: "감자", categoryIdx: null, status: null, sort: "POPULAR", page: 2, limit: 10, offset: 10,
  });
});

test("중고 등록은 필수 필드를 모두 검증한다", () => {
  catchesCode(() => validateUsedCreate({ title: "", price: -1 }, []), "VALIDATION_ERROR");
});

test("경매 목록과 입찰 금액을 검증한다", () => {
  assert.equal(validateAuctionList({ page: 1 }).sort, "LATEST");
  assert.equal(validateBidAmount("12000"), 12000);
  catchesCode(() => validateBidAmount(0), "VALIDATION_ERROR");
});

test("회원정보 수정 최종 파라미터는 newPassword 계열이다", () => {
  const value = validateAccountUpdate({
    editToken: "token", nickname: "감자", phone: "010-1234-5678",
    email: "potato@example.com", newPassword: "password1!", newPasswordConfirm: "password1!",
  });
  assert.equal(value.phone, "01012345678");
  assert.equal(value.newPassword, "password1!");
});

test("핵심 구현 모듈에는 501 또는 merge conflict 표식이 없다", async () => {
  const paths = [
    "src/modules/main/main.controller.js", "src/modules/used/used.controller.js",
    "src/modules/auctions/auctions.controller.js", "src/modules/users/users.controller.js",
    "src/modules/reviews/reviews.controller.js", "src/modules/mypage/mypage.controller.js",
    "src/modules/admin/admin.controller.js",
  ];
  for (const path of paths) {
    const content = await readFile(new URL(`../../${path}`, import.meta.url), "utf8");
    assert.doesNotMatch(content, /NOT_IMPLEMENTED|notImplemented|<<<<<<<|=======|>>>>>>>/, path);
  }
});
