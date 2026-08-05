// import { allAuctionItems, mockCategories, usedListings } from "../used/used.model.mock.js"

export function getMain(req, res) {
  // TODO: read main used/auction listings and summary sections.
  try {
    const usedListingsData = usedListings.slice(0, 4)
    const auctionListingsData = allAuctionItems.slice(0, 4)
    const popularListingsData = [...usedListings]
      .sort((a, b) => b.favoriteCount - a.favoriteCount)
      .slice(0, 4)

    return res.status(200).json({
      success: true,
      data: {
        usedListings: usedListingsData,
        auctionListings: auctionListingsData,
        popularListings: popularListingsData,

        usedPopular: usedListingsData,
        auctionPopular: auctionListingsData,
        recentListings: usedListings.filter((item) => item.listingIdx >= 301),
        auctionClosingSoon: allAuctionItems.filter((item) => item.isClosingSoon),
      },
    })
  } catch (error) {
    console.error("메인 페이지 데이터 조회 오류:", error)
    return res.status(500).json({
      success: false,
      code: "INTERNAL_SERVER_ERROR",
      message: "메인 페이지 데이터를 불러오지 못했습니다.",
    })
  }
}

export function getCategories(req, res) {
  // TODO: read category list.
  try {
    return res.status(200).json({
      success: true,
      data: {
        items: mockCategories,
      },
    })
  } catch (error) {
    console.error("카테고리 조회 오류:", error)
    return res.status(500).json({
      success: false,
      code: "INTERNAL_SERVER_ERROR",
      message: "카테고리 목록을 불러오지 못했습니다.",
    })
  }
}

// export function listCategories(req, res) {
//   // TODO 처리 순서:
//   // 1. categories에서 is_active=true인 행만 sort_order 순서로 조회한다.
//   // 2. categoryIdx, name, sortOrder만 공개 DTO로 반환한다.
//   return notImplemented(res, "카테고리 조회");
// }