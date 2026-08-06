// 경매 글 작성
export async function createAuctionData(auctionData) {
    // 컨트롤러가 넘겨준 데이터 받기(매개변수)
    const { title, description, categoryIdx, startPrice, preferredTradeLocation, images } = auctionData

    // 로그인 인증
    const user = await authService.getuserByToken(access_token)
    if (!user) {
        const err = new Error("로그인이 필요합니다.")
        err.status = 401
        err.code = "UNAUTHORIZED"
        throw err
    }

    // 정지된 사용자 검증
    // ban 당한 사용자 수정 필요(isVBanned)
    if (user.isBanned) {
        const err = new Error("정지된 사용자는 경매를 등록할 수 없습니다.")
        err.status = 403
        err.code = "BANNED_USER"
        throw err
    }

    // 파일 업로드 
    let uploadedImageUrls = [];
    if (images && images.length > 0) {
        // uploadedImageUrls = await storageService.uploadFiles(images)
    }

    const startedAt = new Date().toISOString()
    const endsAtDate = new Date()
    endsAtDate.setDate(endsAtDate.getDate() + 1)
    const endsAt = endsAtDate.toISOString()

    // 트랜잭션 시작
    const connection = await db.beginTransaction()
    let newListingIdx

    try {
        // listings & auction_posts INSERT 쿼리 수행
        // newListingIdx = result.insertId;
        newListingIdx = 2 // 테스트용 임시 ID

        await connection.commit()

        return {
            listingIdx: newListingIdx,
            listingType: "AUCTION",
            status: "ON_GOING",
            startPrice: Number(startPrice),
            currentPrice: Number(startPrice),
            startedAt: startedAt,
            endsAt: endsAt
        }

    } catch (txError) {
        await connection.rollback()
        throw txError
    }
}


// 글 전체 조회
export async function getAuctionsData(auctionData) {
    const { access_token, q, categoryIdx, status, sort, page, limit } = auctionData

    try {
        const offset = (page - 1) * limit;

        // 동적 쿼리 및 페이징 처리 주석
        /*
        let whereClause = "WHERE l.deleted_at IS NULL AND l.listing_type = 'AUCTION'"
        let queryParams = []

        if (q) {
            whereClause += " AND (l.title LIKE ? OR l.description LIKE ?)"
            queryParams.push(`%${q}%`, `%${q}%`)
        }
        if (categoryIdx) {
            whereClause += " AND l.category_idx = ?"
            queryParams.push(categoryIdx)
        }
        if (status) {
            whereClause += " AND ap.status = ?"
            queryParams.push(status)
        }
        */

        // 명세서 규격에 맞는 items 구조 예시 (DB 연동 시 쿼리 결과로 대체)
        const items = [
            {
                listingIdx: 2,
                listingType: "AUCTION",
                title: q ? `${q} 관련 경매 상품` : "경매 상품",
                thumbnailUrl: "/resources/listings/2-1.png",
                category: {
                    categoryIdx: categoryIdx ? Number(categoryIdx) : 2,
                    name: "전자기기"
                },
                startPrice: 10000,
                currentPrice: 20000,
                displayPrice: 20000,
                status: status || "ON_GOING",
                bidCount: 3,
                favoriteCount: 5,
                startedAt: "2026-07-30T13:00:00.000Z",
                endsAt: "2026-07-31T13:00:00.000Z",
                hasMyBid: true,
                myBidAmount: 19000
            }
        ]

        return {
            items: items,
            page: Number(page),
            limit: Number(limit),
            totalCount: items.length,
            totalPages: 1
        }

    } catch (error) {
        throw error
    }
}


// 글 검색 조회
export async function getAuctionDetailData(detailData) {
    const { access_token, listingIdx } = detailData

    try {
        if (Number(listingIdx) === 999) {
            const err = new Error("경매를 찾을 수 없습니다.")
            err.status = 404
            err.code = "NOT_FOUND"
            throw err
        }

        if (Number(listingIdx) === 100) {
            const err = new Error("경매 상태를 불러올 수 없습니다.")
            err.status = 503
            err.code = "REDIS_UNAVAILABLE"
            throw err
        }

        // DB 조회 로직 주석
        /*
        const [rows] = await db.query(`SELECT ... FROM listings l JOIN auction_posts ap ... WHERE l.listing_idx = ?`, [listingIdx])
        if (rows.length === 0) {
            const err = new Error("경매를 찾을 수 없습니다.")
            err.status = 404
            err.code = "NOT_FOUND"
            throw err
        }
        */

        return {
            listingIdx: Number(listingIdx),
            listingType: "AUCTION",
            title: "경매 상품",
            description: "경매 설명",
            category: {
                categoryIdx: 2,
                name: "전자기기"
            },
            productStatus: "LIKE_NEW",
            preferredTradeLocation: "서울 강남역",
            startPrice: 10000,
            currentPrice: 20000,
            minNextBid: 21000,
            status: "ON_GOING",
            startedAt: "2026-07-30T13:00:00.000Z",
            endsAt: "2026-07-31T13:00:00.000Z",
            seller: {
                userIdx: 2,
                nickname: "판매자",
                profileImageUrl: "/resources/profiles/2.png",
                averageRating: 9.6,
                reviewCount: 12
            },
            highestBidder: {
                userIdx: 3,
                nickname: "입찰자"
            },
            images: [
                {
                    imageIdx: 1,
                    imageUrl: "/resources/listings/2-1.png",
                    sortOrder: 0
                }
            ],
            bidCount: 3,
            favoriteCount: 5,
            viewer: {
                isOwner: false,
                isFavorite: false,
                canEdit: false,
                canDelete: false,
                canBid: true,
                canChat: true,
                canFavorite: true
            }
        }

    } catch (error) {
        throw error
    }
}

// 글 수정
export const updateAuctionData = async ({ access_token, listingIdx, updateData, newImages }) => {
    // 로그인 파트 서비스 파일 이름 수정 필요
    const user = await authService.getuserByToken(access_token)
    if (!user) {
        const err = new Error("인증되지 않은 사용자입니다.")
        err.status = 401
        err.code = "UNAUTHORIZED"
        throw err
    }
    // 로그인 파트 끝나면 확인 후 수정 필요
    const userId = user.idx
    // 글 존재, 삭제 여부 확인
    // const listing = await db.query(SELECT FROM )

    if (listing.length === 0) {
        const err = new Error("경매를 찾을 수 없습니다.")
        err.status = 404
        err.code = "NOT_FOUND"
        throw err
    }
    // db에서 조회한 목록 중 가장 첫 번째 행을 꺼냄
    const currentListing = listing[0]

    // 판매자(게시자) 본인 검증
    // user_idx, userId 수정 필요
    if (currentListing.user_idx !== userId) {
        const err = new Error("판매자만 수정할 수 있습니다.")
        err.status = 403
        err.code = "FORBIDDEN"
        throw err
    }

    // 종료된 경매 체크
    const now = new Date()
    if (currentListing.status !== 'ON_GOING' || new Date(currentListing.ends_at) <= now) {
        const err = new Error("종료된 경매는 수정할 수 없습니다.")
        err.status = 409
        err.code = "AUCTION_CLOSED"
        throw err
    }

    // 시작 가격 : 수정 불가
    if (updateData.startPrice !== undefined || updateData.currentPrice !== undefined) {
        const err = new Error("경매 시작가는 수정할 수 없습니다.") // 경매 조건은 수정할 수 없습니다.
        err.status = 400
        err.code = "IMMUTABLE_FIELD"
        err.details = { "fields": ["startPrice", "currentPrice", "bidUnit", "startedAt", "endsAt"] }
        throw err
    }

    // 새 파일(업데이트본) 검증, 저장
    let uploadedImageUrls = []
    if (newImages && newImages.length > 0) {
        // 이미지 저장하는 스토리지 이름 변경 필요 (storageService)
        uploadedImageUrls = await storageService.uploadFiles(newImages)
    }

    // 명세서 포맷(수정된 시간 저장)
    const updatedAt = new Date().toISOString()

    // 트랜잭션 시작 코드(롤백)
    const connection = await db.beginTransaction()
    try {
        const { title, description, categoryIdx, preferredTradeLocation } = updateData

        // listing 테이블 수정
        await connection.query(UPDATE)

        // DB - 이미지 있을 시 사진 교체(기존 이미지 삭제) 
        if (uploadedImageUrls.length > 0) {
            await connection.query(DELETE)
        }

        await connection.commit()
    } catch (txError) {
        // 에러 발생 시 롤백
        await connection.rollback()
        throw txError
    }

    // 실제 파일 - 이미지 있을 시 기존 이미지 삭제
    if (uploadedImageUrls.length > 0) {
        // storageService, cleanOldFiles 이름 변경 필요
        storageService.cleanOldFiles(listingIdx)
    }

    return {
        listingIdx: Number(listingIdx),
        updated: true,
        updatedAt: updatedAt
    }
}



// 경매 글 삭제
export const deleteAuctionData = async ({ access_token, listingIdx, deleteReason }) => {
    // 로그인 파트 서비스 파일 이름 수정 필요
    const user = await authService.getuserByToken(access_token)
    if (!user) {
        const err = new Error("인증되지 않은 사용자입니다.")
        err.status = 401
        err.code = "UNAUTHORIZED"
        throw err
    }

    // const 두 줄 모두 수정 필요
    const userId = user.idx
    const userRole = user.role

    // 경매글이 존재하는지, 이미 삭제된 건 아닌지 조회
    const listing = await db.query(SELECT)

    // 조회된 글 없음
    if (listing.length === 0) {
        const err = new Error('경매를 찾을 수 없습니다.')
        err.status = 404
        err.code = "NOT_FOUND"
        throw err
    }

    const currentListing = listing[0]

    // 작성자거나 관리자일 시 삭제 허용
    // 이름 변경 필요 (user_idx, userId, userRole, ADMIN)
    if (currentListing.user_idx !== userId && userRole !== "ADMIN") {
        const err = new Error("판매자만 삭제할 수 있습니다.")
        err.status = 403
        err.code = "FORBIDDEN"
        throw err
    }

    // 삭제 시간 기록
    const deltedAt = new Date().toISOString()
    // 이름 변경 필요 / 알림 받은 입찰자 수 시작 = 0, 알림 미구현
    let notifiedBidderCount = 0

    // 트랜잭션 시작
    const connection = await db.beginTransaction()
    try {
        const reason = deleteReason || "판매자 삭제"

        // db listings 테이블 수정
        await connection.query(UPDATE)

        // 찜(관심 등록) 삭제
        await connection.query(DELETE)

        // 진행 중인 경매 타이머, 정보 들 다 삭제
        if (currentListing.status === "ON_GOiNG") {
            // 입찰한 사용자에게 경매 취소 알림 발송

            // Redis, 타이머 삭제
            await redisClient.del(`auction:${listingIdx}:state`)
            await redisClient.del(`auction:${listingIdx}:bidders`)
            timerManager.removeTimer(listingIdx)
        }

        await connection.commit()
    } catch (txError) {
        await connection.rollback()
        throw txError
    }

    // 소켓 방송 (실시간 삭제 알림)
    io.to(`auction_${listingIdx}`).emit('auction:deleted', { listingIdx })

    return {
        listingIdx: Number(listingIdx),
        deleted: true,
        deletedAt: deletedAt,
        deletedBy: userId,
        notifiedBidderCount: notifiedBidderCount
    }
}

// 입찰 단위가
function getMinBidUnit(currentPrice) {
    if (currentPrice < 10000) {
        return 500
    } else if (currentPrice < 50000) {
        return 1000
    } else if (currentPrice < 100000) {
        return 2000
    } else if (currentPrice < 500000) {
        return 5000
    } else if (currentPrice < 1000000) {
        return 10000
    } else {
        // 1,000,000원 이상은 현재가의 약 1%
        return Math.floor(currentPrice * 0.01)
    }
}

// 경매 입찰
export const createAuctionBidData = async ({ access_token, listingIdx, bidAmount }) => {
    // 로그인 파트 서비스 파일 이름 수정 필요
    const user = await authService.getuserByToken(access_token)
    if (!user) {
        const err = new Error("인증되지 않은 사용자입니다.")
        err.status = 401
        err.code = "UNAUTHORIZED"
        throw err
    }

    // 수정 필요
    const userId = user.idx

    // 경매 글 여부(존재 여부)
    const listing = await db.query(SELECT)

    if (listing.length === 0) {
        const err = new Error("경매를 찾을 수 없습니다.")
        err.status = 404
        err.code = "NOT_FOUND"
        throw err
    }
    const currentListing = listing[0]

    // 판매자 본인의 경매 입찰 차단
    // 유저 아이디 수정 필요
    if (currentListing.user_idx === userId) {
        const err = new Error("판매자는 본인 경매에 입찰할 수 없습니다.")
        err.status = 403
        err.code = "FORBIDDEN"
        throw err
    }

    // 종료된 경매 검증
    const now = new Date()
    if (currentListing.status !== "ON_GOING" || new Date(currentListing.end_time) <= now) {
        const err = new Error("종료된 경매입니다.")
        err.status = 409
        err.code = "AUCTION_CLOSED"
        throw err
    }

    // 경매 단위가 설정
    const bidUnit = getMinBidUnit(auction.currentPrice);
    const minNextBid = auction.currentPrice + bidUnit;

    if (Number(bidAmount) < minNextBid) {
        const err = new Error("최소 입찰가보다 낮습니다.")
        err.status = 409
        err.code = "BID_TOO_LOW"
        err.details = {
            minNextBid: minNextBid,
            currentPrice: auction.currentPrice,
            bidUnit: bidUnit
        };
        throw err
    }

    // 트랜잭션 시작
    const connection = await db.beginTransaction()
    try {
        // 입찰내역 저장 DB
        const bidResult = await connection.query(INSERT)
        const bidIdx = bidResult.insertId

        // 최고 입찰가 혹은 현재가 갱신 DB
        await connection.query(UPDATE)

        await connection.commit()

        createdBid = {
            bidIdx: Number(bidIdx),
            listingIdx: Number(listingIdx),
            bidderIdx: Number(bidderIdx),
            bidAmount: Number(bidAmount),
            currentPrice: Number(currentPrice),
            highestBidderIdx: Number(highestBidderIdx),
            createdAt: createdAt
        }
    } catch (txError) {
        await connection.rollback()
        throw txError
    }

    // 소켓을 통해 현재가 갱신 실시간 방송
    io.to(`auction_${listingIdx}`).emit('auction:priceUpdated', {
        listingIdx: Number(listingIdx),
        currentPrice: bidAmount,
        highestBidderIdx: userId
    })

    // 기존 최고 입찰자에게 알림 발송

    return createdBid
}

// 입찰 목록 조회
export const listAuctionBidsData = async ({ access_token, listingIdx }) => {
    let userId = null
    if (access_token) {
        try {
            const user = await authService.getuserByToken(access_token)
            if (user) {
                userId = user.idx
            }
        } catch (e) {
            // 공백 ㅇㅇ!
        }
    }
    // 경매 글 존재 여부 확인(수정필요)
    const listing = await db.query(SELECT)

    if (listing.length === 0) {
        const err = new Error("경매를 찾을 수 없습니다.")
        err.status = 404
        err.code = "NOT_FOUND"
        throw err
    }

    // 금액 높은 순 / 상위 5개 입찰내역 조회
    // const topBidsQuery = SELECT ... LIMIT 5

    // db에서 가져온 5개 데이터를 배열에 담음
    const [topBids] = await db.query(topBidsQuery, [listingIdx])
    let items = [...topBids]

    // 로그인 사용자 본인 내역 출력
    if (userId) {
        // const myBidQuery = 'SELECT ...LIMIT1'
        const [myBids] = await db.query(myBidQuery, [listingIdx, userId])

        if (myBids.length > 0) {
            items.push(myBids[0])
        } else {
            // 본인 입찰 내역이 없다면 - 하이픈으로 표시(프론트에서 실행)
            items.push({
                bidIdx: null,
                bidderIdx: userId,
                bidderNickname: null,
                bidAmount: null,
                createdAt: null
            })
        }
    }
    return {
        items: items,
        totalCount: items.length
    }
}

// 관심 등록
export const onAuctionLike = async ({ access_token, listingIdx }) => {
    // 로그인 파트 서비스 파일 이름 수정 필요
    const user = await authService.getuserByToken(access_token)
    if (!user) {
        const err = new Error("로그인이 필요합니다.")
        err.status = 401
        err.code = "UNAUTHORIZED"
        throw err
    }
    const userId = user.idx

    // 경매글 존재 여부 확인
    const listing = await db.query(SELECT)

    if (listing.length === 0) {
        const err = new Error("경매를 찾을 수 없습니다.")
        err.status = 404
        err.code = "NOT_FOUND"
        throw err
    }
    // 관심등록 수 카운트
    let newFavoriteCount = listing[0].favoriteCount + 1

    // 트랜잭션 시작
    const connection = await db.beginTransaction()
    try {
        // 관심 등록 누르기
        await connection.query(INSERT)

        // 관심 등록 클릭 시 카운트 증가
        await connection.query(UPDATE)

        await connection.commit()
    } catch (txError) {
        await connection.rollback()
        throw txError
    }

    return {
        listingIdx: Number(listingIdx),
        favorited: true,
        favoriteCount: newFavoriteCount
    }
}


// 관심등록 삭제
export const deleteAuctionLike = async ({ access_token, listingIdx }) => {
    // 로그인 파트 서비스 파일 이름 수정 필요
    const user = await authService.getuserByToken(access_token)
    if (!user) {
        const err = new Error("로그인이 필요합니다.")
        err.status = 401
        err.code = "UNAUTHORIZED"
        throw err
    }
    const userId = user.idx

    // 트랜잭션 시작
    const connection = await db.beginTransaction()
    try {
        // 관심 등록 삭제
        await connection.query(DELETE)
        // 관심 등록 갯수 -1 시키기
        await connection.query(UPDATE)

        await connection.commit()
    } catch (txError) {
        await connection.rollback()
        throw txError
    }

    return {
        listingIdx: Number(listingIdx),
        favorited: false,
        favoriteCount: updatedListing[0] ? updatedListing[0].favoriteCount : 0
    }
}