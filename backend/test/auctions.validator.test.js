import assert from "node:assert/strict";
import test from "node:test";

import { validateAuctionCreate, validateAuctionList, validateAuctionUpdate, validateListingIdx } from "../src/modules/auctions/auctions.validator.js";

test("경매 목록의 기본 페이지와 정렬 조건을 만든다", () => {
  assert.deepEqual(validateAuctionList(), { q: "", categoryIdx: null, status: null, sort: "LATEST", page: 1, limit: 16, offset: 0 });
});

test("경매 등록 입력의 숫자와 문자열을 정규화한다", () => {
  const data = validateAuctionCreate({ title: " 노트북 ", description: "설명", categoryIdx: "2", productStatus: "like_new", startPrice: "10000" });
  assert.equal(data.title, "노트북");
  assert.equal(data.categoryIdx, 2);
  assert.equal(data.productStatus, "LIKE_NEW");
  assert.equal(data.startPrice, 10000);
});

test("경매 수정에서 시작 가격 변경을 거부한다", () => {
  assert.throws(() => validateAuctionUpdate({ startPrice: 20000 }), (error) => error.code === "IMMUTABLE_FIELD");
});

test("잘못된 경매 식별자를 거부한다", () => {
  assert.throws(() => validateListingIdx("0"), (error) => error.code === "VALIDATION_ERROR");
});
