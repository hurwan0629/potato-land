import { notImplemented } from "../../common/utils/notImplemented.js";
// import { asyncHandler } from "../../common/utils/asyncHandler.js";

// export const listAuctions = asyncHandler( async(req, res) => {
//   try {
//     // ? : 옵셔널 체이닝 - req.cookies가 있으면 그 안에서 access_token을 꺼내고, 
//     // 만약 req.cookies가 아예 없거나 undefined라면 에러를 내지 않고 undefined를 반환
//     const access_token = req.cookies?.access_token

//     const { q, categoryIdx, status, sort, page, limit } = req.query
//     // api 명세에 적힌 오류
//     if (page && isNaN(page) || limit && isNaN(limit)) {
//       return res.status(400).json({
//         success: false,
//         code: "VALIDATION_ERROR",
//         message: "경매 목록 조회 조건이 올바르지 않습니다."
//       })
//     }


//     const auctions = await auctionService.getAuctionsData({
//       access_token,
//       q,
//       categoryIdx,
//       status,
//       sort,
//       page: page ? Number(page) : 1,
//       limit: limit ? Number(limit) : 16
//     })

//     return res.status(200).json({
//       success: true,
//       data: auctions
//     })
//   } catch (error) {
//     console.error(error)
//     return res.status(500).json({
//       success: false,
//       message: "서버 오류 발생"

//     })
//   }

//   // return notImplemented(res, "경매 목록 조회");
// })

// export function createAuction(req, res) {
//   try {
//     // const access_token = req.cookies.access_token
//     // 위 코드가 맞는 코드 / 해당 아래 코드는 테스트용
//     const access_token = req.cookies?.access_token || "test-token";
//     const { title, description, categoryIdx, startPrice, preferredTradeLocation } = req.body
//     const images = req.files

//     // 비로그인 사용자
//     // if (!access_token) {
//     //     return res.status(401).json({
//     //         success: false,
//     //         code: "UNAUTHORIZED",
//     //         message: "로그인이 필요합니다."
//     //     })
//     // }

//     // 필수값 입력 유효성 검사 에러
//     if (!title || !description || !categoryIdx || !startPrice) {
//       return res.status(400).json({
//         success: false,
//         "code": "VALIDATION_ERROR",
//         "message": "경매 정보를 확인해주세요.",
//         "details": { "fields": ["title", "description", "categoryIdx", "startPrice"] }
//       })
//     }

//     //서비스 로직 호출
//     const newAuction = await auctionService.createAuctionData({
//       title, description, categoryIdx, startPrice, preferredTradeLocation, images
//     })

//     // 성공 응답
//     return res.status(201).json({
//       success: true,
//       // 데이터 예시(테스트용)
//       data: {
//         listingIdx: newAuction.listingIdx,
//         title,
//         description,
//         categoryIdx,
//         startPrice,
//         preferredTradeLocation,
//         status: newAuction.status,
//         startedAt: newAuction.startedAt,
//         endsAt: newAuction.endsAt
//       }
//     })
//   } catch (error) {
//     console.error(error)
//     return res.status(500).json({
//       success: false,
//       message: "서버 오류 발생"
//     })
//   }
//   // return notImplemented(res, "경매글 등록");
// }

// export function getAuctionDetail(req, res) {
//   try {
//     const access_token = req.cookies?.access_token

//     const { listingIdx } = req.params

//     const auction = await auctionService.getAuctionDetailData({
//       access_token,
//       listingIdx
//     })

//     return res.status(200).json({
//       success: true,
//       data: auction
//     })

//   } catch (error) {
//     if (error.status) {
//       return res.status(error.status).json({
//         success: false,
//         code: error.code,
//         message: error.message
//       })
//     }
//     console.error(error)
//     return res.status(500).json({
//       success: false,
//       message: "서버 오류 발생"
//     })
//   }
//   // return notImplemented(res, "경매 상세 조회");
// }

// export function updateAuction(req, res) {
//   // TODO: verify owner/admin and update auction listing fields/images.
//   return notImplemented(res, "경매글 수정");
// }

// export function deleteAuction(req, res) {
//   // TODO: soft delete auction, delete favorites, notify bidders, clear timer/state.
//   return notImplemented(res, "경매글 삭제");
// }

// export function createAuctionBid(req, res) {
//   // TODO: validate bid, update Redis state atomically, persist bid, emit socket events.
//   return notImplemented(res, "경매 입찰");
// }

// export function listAuctionBids(req, res) {
//   // TODO: read auction bid history from DB.
//   return notImplemented(res, "경매 입찰 내역 조회");
// }

// export function addAuctionFavorite(req, res) {
//   // TODO: add favorite for active user and non-deleted auction listing.
//   return notImplemented(res, "경매 관심 추가");
// }

// export function removeAuctionFavorite(req, res) {
//   // TODO: remove auction favorite for current user.
//   return notImplemented(res, "경매 관심 해제");
// }

import { asyncHandler } from "../../common/utils/asyncHandler.js"

// 경매 글 보기(전체 목록)
export const listAuctions = asyncHandler(async (req, res) => {
    const access_token = req.cookies?.access_token

    const { q, categoryIdx, status, sort, page, limit } = req.query
    if (page && isNaN(page) || limit && isNaN(limit)) {
        const error = new Error("경매 목록 조회 조건이 올바르지 않습니다.")
        error.status = 400
        error.code = "VALIDATION_ERROR"
        throw error
    }

    const auctions = await auctionService.getAuctionsData({
        access_token,
        q,
        categoryIdx,
        status,
        sort,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 16
    })

    return res.status(200).json({
        success: true,
        data: auctions
    })
})

// 경매 글 작성
export const createAuction = asyncHandler(async (req, res) => {
    const access_token = req.cookies?.access_token || "test-token"
    const { title, description, categoryIdx, startPrice, preferredTradeLocation } = req.body
    const images = req.files

    if (!title || !description || !categoryIdx || !startPrice) {
        const error = new Error("경매 정보를 확인해주세요.")
        error.status = 400
        error.code = "VALIDATION_ERROR"
        error.details = { fields: ["title", "description", "categoryIdx", "startPrice"] }
        throw error
    }

    const newAuction = await auctionService.createAuctionData({
        title, description, categoryIdx, startPrice, preferredTradeLocation, images
    })

    return res.status(201).json({
        success: true,
        data: {
            listingIdx: newAuction.listingIdx,
            title,
            description,
            categoryIdx,
            startPrice,
            preferredTradeLocation,
            status: newAuction.status,
            startedAt: newAuction.startedAt,
            endsAt: newAuction.endsAt
        }
    })
})

// 경매 글 상세 보기(게시물 보기)
export const getAuctionDetail = asyncHandler(async (req, res) => {
    const access_token = req.cookies?.access_token
    const { listingIdx } = req.params

    const auction = await auctionService.getAuctionDetailData({
        access_token,
        listingIdx
    })

    return res.status(200).json({
        success: true,
        data: auction
    })
})

// 경매 글 수정하기
export const updateAuction = asyncHandler(async (req, res) => {
    const access_token = req.cookies?.access_token
    const {listingIdx} = req.params
    const updateData = req.body
    const newImages = req.files

    const result = await auctionService.updateAuctionData({
        access_token,
        listingIdx,
        updateData,
        newImages
    })

    return res.status(200).json({
        success: true,
        message: "경매 글 수정이 완료되었습니다.",
        data: result
    })
    // return notImplemented(res, "경매글 수정")
})

// 경매 글 삭제하기
export const deleteAuction = asyncHandler(async (req, res) => {
    const access_token = req.cookies?.access_token
    const {listingIdx} = req.params
    const {reason} = req.body

    const result = await auctionService.deleteAuctionData({
        access_token,
        listingIdx,
        reason
    })

    return res.status(200)({
        success: true,
        message: "경매 글이 삭제되었습니다.",
        data: result
    })
    // return notImplemented(res, "경매글 삭제")
})

export const createAuctionBid = asyncHandler(async (req, res) => {
    const access_token = req.cookies?.access_token
    const {listingIdx} = req.params
    const {bidMount} = req.body

    const result = await createAuctionBidData({
        access_token: access_token,
        listingIdx,
        bidMount
    })

    return res.status(200).json({
        success: true,
        data: result
    })
    // return notImplemented(res, "경매 입찰")
})

export const listAuctionBids = asyncHandler(async (req, res) => {
    // return notImplemented(res, "경매 입찰 내역 조회")
})

export const addAuctionFavorite = asyncHandler(async (req, res) => {
    return notImplemented(res, "경매 관심 추가")
})

export const removeAuctionFavorite = asyncHandler(async (req, res) => {
    return notImplemented(res, "경매 관심 해제")
})