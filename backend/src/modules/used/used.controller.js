// import { usedListings } from "./used.model.mock.js"

export function listUsed(req, res) {
  // TODO: list/search used listings by query and exclude deleted listings.
  try {
    const { category, search, q, sort = "recent", page = 1, limit = 10 } = req.query
    const searchKeyword = search || q || ""
    let filtered = [...usedListings]

    if (category && category !== "전체") {
      filtered = filtered.filter(
        (item) => item.categoryName === category || String(item.categoryIdx) === String(category)
      )
    }

    if (searchKeyword && searchKeyword.trim() !== "") {
      filtered = filtered.filter((item) =>
        item.title.toLowerCase().includes(searchKeyword.trim().toLowerCase())
      )
    }

    if (sort === "popular") {
      filtered.sort((a, b) => b.favoriteCount - a.favoriteCount)
    } else {
      filtered.sort((a, b) => b.listingIdx - a.listingIdx)
    }

    const pageNum = Number(page) || 1
    const limitNum = Number(limit) || 10

    return res.status(200).json({
      success: true,
      data: {
        items: filtered,
        page: pageNum,
        limit: limitNum,
        totalCount: filtered.length,
        totalPages: Math.ceil(filtered.length / limitNum) || 1,
      },
    })
  } catch (error) {
    console.error("중고거래 목록 조회 오류:", error)
    return res.status(500).json({
      success: false,
      code: "INTERNAL_SERVER_ERROR",
      message: "중고거래 목록을 불러오지 못했습니다.",
    })
  }
}

export function createUsed(req, res) {
  // TODO: create listing, used post, and post images in a DB transaction.
  try {
    const { title, category, price, condition, location, preferredTradeLocation, description, images } = req.body

    if (!title || price === undefined) {
      return res.status(400).json({
        success: false,
        code: "VALIDATION_ERROR",
        message: "상품 정보를 확인해주세요.",
        details: { fields: ["title", "price"] },
      })
    }

    const newListing = {
      listingIdx: Date.now(),
      listingType: "USED",
      title,
      description: description || "",
      categoryIdx: 1,
      categoryName: category || "기타",
      price: Number(price),
      tradeStatus: "ON_SALE",
      preferredTradeLocation: location || preferredTradeLocation || "지역 정보 없음",
      location: location || preferredTradeLocation || "지역 정보 없음",
      condition: condition || "사용감 적음",
      thumbnailUrl:
        images && images.length > 0
          ? typeof images[0] === "string"
            ? images[0]
            : images[0].imageUrl
          : "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600",
      images:
        images && images.length > 0
          ? typeof images[0] === "string"
            ? images.map((url, i) => ({ imageIdx: i + 1, imageUrl: url, sortOrder: i + 1 }))
            : images
          : [
              {
                imageIdx: 1,
                imageUrl: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600",
                sortOrder: 1,
              },
            ],
      seller: {
        userIdx: 123,
        nickname: "나의감자",
        profileImageUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100",
        averageRating: 5.0,
      },
      sellerNickname: "나의감자",
      isFavorite: false,
      favoriteCount: 0,
      viewCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    usedListings.unshift(newListing);

    return res.status(201).json({
      success: true,
      data: {
        listingIdx: newListing.listingIdx,
        listingType: "USED",
        tradeStatus: "ON_SALE",
        createdAt: newListing.createdAt,
        message: "글이 성공적으로 등록되었습니다.",
      },
    })
  } catch (error) {
    console.error("중고거래 글 등록 오류:", error);
    return res.status(400).json({
      success: false,
      code: "VALIDATION_ERROR",
      message: "상품을 등록하지 못했습니다.",
    })
  }
}

export function getUsedDetail(req, res) {
  // TODO: read used listing detail and return 404 for deleted listing.
  try {
    const listingIdx = Number(req.params.listingIdx)
    const item = usedListings.find((l) => l.listingIdx === listingIdx)

    if (!item) {
      return res.status(404).json({
        success: false,
        code: "NOT_FOUND",
        message: "게시글을 찾을 수 없습니다.",
      })
    }

    item.viewCount += 1

    const currentUserId = req.headers["x-user-idx"] ? Number(req.headers["x-user-idx"]) : null
    const isOwner = currentUserId !== null && currentUserId === item.seller.userIdx

    return res.status(200).json({
      success: true,
      data: {
        item: {
          ...item,
          location: item.preferredTradeLocation,
        },
        ...item,
        location: item.preferredTradeLocation,
        isOwner,
      },
    })
  } catch (error) {
    console.error("중고거래 상세 조회 오류:", error)
    return res.status(500).json({
      success: false,
      code: "INTERNAL_SERVER_ERROR",
      message: "상품 상세 정보를 불러오지 못했습니다.",
    })
  }
}

export function updateUsed(req, res) {
  // TODO: verify owner/admin and update used listing fields/images.
  try {
    const listingIdx = Number(req.params.listingIdx)
    const { title, category, price, condition, location, preferredTradeLocation, description, images } = req.body

    const itemIndex = usedListings.findIndex((l) => l.listingIdx === listingIdx)
    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        code: "NOT_FOUND",
        message: "게시글을 찾을 수 없습니다.",
      })
    }

    const currentItem = usedListings[itemIndex]
    const updatedLocation = location || preferredTradeLocation || currentItem.preferredTradeLocation

    usedListings[itemIndex] = {
      ...currentItem,
      title: title || currentItem.title,
      categoryName: category || currentItem.categoryName,
      price: price !== undefined ? Number(price) : currentItem.price,
      condition: condition || currentItem.condition,
      preferredTradeLocation: updatedLocation,
      location: updatedLocation,
      description: description || currentItem.description,
      updatedAt: new Date().toISOString(),
    }

    return res.status(200).json({
      success: true,
      data: {
        listingIdx,
        updated: true,
        updatedAt: usedListings[itemIndex].updatedAt,
        message: "게시글이 수정되었습니다.",
      },
    })
  } catch (error) {
    console.error("중고거래 글 수정 오류:", error);
    return res.status(400).json({
      success: false,
      code: "VALIDATION_ERROR",
      message: "상품을 수정하지 못했습니다.",
    })
  }
}

export function deleteUsed(req, res) {
  // TODO: soft delete listing and delete related favorites.
  try {
    const listingIdx = Number(req.params.listingIdx)
    const itemIndex = usedListings.findIndex((l) => l.listingIdx === listingIdx)

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        code: "NOT_FOUND",
        message: "게시글을 찾을 수 없습니다.",
      })
    }

    usedListings.splice(itemIndex, 1)

    return res.status(200).json({
      success: true,
      data: {
        listingIdx,
        deleted: true,
        deletedAt: new Date().toISOString(),
        message: "게시글이 삭제되었습니다.",
      },
    })
  } catch (error) {
    console.error("중고거래 글 삭제 오류:", error)
    return res.status(500).json({
      success: false,
      code: "INTERNAL_SERVER_ERROR",
      message: "게시글을 삭제하지 못했습니다.",
    })
  }
}

export function addUsedFavorite(req, res) {
  // TODO: verify active user and add favorite for non-deleted used listing.
  try {
    const listingIdx = Number(req.params.listingIdx)
    const item = usedListings.find((l) => l.listingIdx === listingIdx)

    if (!item) {
      return res.status(404).json({
        success: false,
        code: "NOT_FOUND",
        message: "게시글을 찾을 수 없습니다.",
      })
    }

    item.isFavorite = true
    item.favoriteCount += 1

    return res.status(200).json({
      success: true,
      data: {
        listingIdx,
        favorited: true,
        favoriteCount: item.favoriteCount,
      },
    })
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, code: "INTERNAL_SERVER_ERROR", message: "관심 등록 오류" })
  }
}

export function removeUsedFavorite(req, res) {
  // TODO: remove favorite for current user and listing.
  try {
    const listingIdx = Number(req.params.listingIdx)
    const item = usedListings.find((l) => l.listingIdx === listingIdx)

    if (!item) {
      return res.status(404).json({
        success: false,
        code: "NOT_FOUND",
        message: "게시글을 찾을 수 없습니다.",
      })
    }

    item.isFavorite = false
    item.favoriteCount = Math.max(item.favoriteCount - 1, 0)

    return res.status(200).json({
      success: true,
      data: {
        listingIdx,
        favorited: false,
        favoriteCount: item.favoriteCount,
      },
    })
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, code: "INTERNAL_SERVER_ERROR", message: "관심 해제 오류" })
  }
}

