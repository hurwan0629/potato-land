import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { ImagePlus, Search, Send, WalletCards } from "lucide-react";
import { useNavigate, useParams } from "react-router";

import { chatApi, transactionsApi } from "../../api/appApi";
import primaryPotato from "../../assets/potato/primary-potato.png";
import { SOCKET_EVENT } from "../../constants/socketEvents";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import { useToast } from "../../context/ToastContext";
import { useRemote } from "../../hooks/useRemote";
import { formatTime, resolveResourceUrl } from "../../utils/format";
import {
  Avatar,
  EmptyState,
  ErrorState,
  ImageWithFallback,
  LoadingState,
  Modal,
  Pagination,
  StatusBadge,
} from "../components/ui";

function createClientMessageId() {
  return globalThis.crypto?.randomUUID?.()
    ?? `message-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function mergeMessage(messages, incoming) {
  const index = messages.findIndex((message) => (
    String(message.messageIdx) === String(incoming.messageIdx)
    || (incoming.clientMessageId && message.clientMessageId === incoming.clientMessageId)
  ));

  if (index < 0) {
    return [...messages, incoming];
  }

  const next = [...messages];
  next[index] = {
    ...next[index],
    ...incoming,
    sending: false,
    failed: false,
  };
  return next;
}

export default function ChatPage() {
  const { chatRoomIdx } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket, isConnected, emitWithAck } = useSocket();
  const { notify } = useToast();
  const fileInputRef = useRef(null);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [paymentRequestOpen, setPaymentRequestOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [isCreatingPaymentRequest, setIsCreatingPaymentRequest] = useState(false);

  const selectedRoomIdx = Number(chatRoomIdx) || null;
  const currentUserIdx = Number(user?.userIdx);

  const loadRooms = useCallback(
    () => chatApi.list({ q: query, page, limit: 8 }),
    [page, query],
  );
  const {
    data: roomsData,
    error: roomsError,
    isLoading: roomsLoading,
    reload: reloadRooms,
  } = useRemote(loadRooms, {
    items: [],
    page: 1,
    totalPages: 0,
  });

  const loadSelectedRoom = useCallback(async () => {
    if (!selectedRoomIdx) {
      return null;
    }

    const [room, messagePage] = await Promise.all([
      chatApi.detail(selectedRoomIdx),
      chatApi.messages(selectedRoomIdx, { page: 1, limit: 50 }),
    ]);

    return {
      room,
      messages: messagePage.items ?? [],
    };
  }, [selectedRoomIdx]);
  const {
    data: selectedData,
    error: selectedError,
    isLoading: selectedLoading,
    reload: reloadSelected,
    setData: setSelectedData,
  } = useRemote(loadSelectedRoom, null);

  useEffect(() => {
    if (!socket) {
      return undefined;
    }

    const refreshRooms = () => reloadRooms();
    socket.on(SOCKET_EVENT.CHAT_ROOM_NEW, refreshRooms);
    socket.on(SOCKET_EVENT.CHAT_ROOM_UPDATED, refreshRooms);

    return () => {
      socket.off(SOCKET_EVENT.CHAT_ROOM_NEW, refreshRooms);
      socket.off(SOCKET_EVENT.CHAT_ROOM_UPDATED, refreshRooms);
    };
  }, [reloadRooms, socket]);

  useEffect(() => {
    if (!socket || !isConnected || !selectedRoomIdx) {
      return undefined;
    }

    let active = true;
    emitWithAck(SOCKET_EVENT.CHAT_JOIN, { chatRoomIdx: selectedRoomIdx })
      .then(() => emitWithAck(SOCKET_EVENT.CHAT_READ, { chatRoomIdx: selectedRoomIdx }))
      .catch((error) => {
        if (active) {
          notify(error.message, "error");
        }
      });

    const handleMessage = (message) => {
      if (Number(message.chatRoomIdx) !== selectedRoomIdx) {
        return;
      }

      setSelectedData((current) => current ? {
        ...current,
        messages: mergeMessage(current.messages, message),
      } : current);

      if (Number(message.senderIdx) !== currentUserIdx) {
        emitWithAck(SOCKET_EVENT.CHAT_READ, { chatRoomIdx: selectedRoomIdx })
          .catch(() => {});
      }
    };

    socket.on(SOCKET_EVENT.CHAT_MESSAGE_NEW, handleMessage);

    return () => {
      active = false;
      socket.off(SOCKET_EVENT.CHAT_MESSAGE_NEW, handleMessage);
      if (socket.connected) {
        emitWithAck(SOCKET_EVENT.CHAT_LEAVE, { chatRoomIdx: selectedRoomIdx })
          .catch(() => {});
      }
    };
  }, [
    currentUserIdx,
    emitWithAck,
    isConnected,
    notify,
    setSelectedData,
    selectedRoomIdx,
    socket,
  ]);

  const room = selectedData?.room;
  const messages = selectedData?.messages ?? [];
  const opponent = useMemo(() => {
    if (!room) {
      return null;
    }

    return Number(room.seller?.userIdx) === currentUserIdx
      ? room.buyer
      : room.seller;
  }, [currentUserIdx, room]);

  const handleSearch = (event) => {
    event.preventDefault();
    setPage(1);
    setQuery(searchInput.trim());
  };

  const handleSend = async (event) => {
    event.preventDefault();
    const content = messageInput.trim();
    if (!room?.canSendMessage || !content || isSending) {
      return;
    }

    const clientMessageId = createClientMessageId();
    const optimistic = {
      messageIdx: `temp-${clientMessageId}`,
      chatRoomIdx: selectedRoomIdx,
      senderIdx: currentUserIdx,
      messageType: "TEXT",
      content,
      clientMessageId,
      createdAt: new Date().toISOString(),
      sending: true,
    };

    setSelectedData((current) => ({
      ...current,
      messages: [...current.messages, optimistic],
    }));
    setMessageInput("");
    setIsSending(true);

    try {
      const result = await emitWithAck(SOCKET_EVENT.CHAT_MESSAGE_SEND, {
        chatRoomIdx: selectedRoomIdx,
        clientMessageId,
        messageType: "TEXT",
        content,
      });

      setSelectedData((current) => ({
        ...current,
        messages: current.messages.map((message) => (
          message.clientMessageId === clientMessageId
            ? {
                ...message,
                messageIdx: result.messageIdx,
                createdAt: result.createdAt,
                sending: false,
              }
            : message
        )),
      }));
    } catch (error) {
      setSelectedData((current) => ({
        ...current,
        messages: current.messages.map((message) => (
          message.clientMessageId === clientMessageId
            ? { ...message, sending: false, failed: true }
            : message
        )),
      }));
      notify(error.message, "error");
    } finally {
      setIsSending(false);
    }
  };

  const retryMessage = async (message) => {
    setSelectedData((current) => ({
      ...current,
      messages: current.messages.map((item) => (
        item.clientMessageId === message.clientMessageId
          ? { ...item, failed: false, sending: true }
          : item
      )),
    }));

    try {
      const result = await emitWithAck(SOCKET_EVENT.CHAT_MESSAGE_SEND, {
        chatRoomIdx: selectedRoomIdx,
        clientMessageId: message.clientMessageId,
        messageType: "TEXT",
        content: message.content,
      });

      setSelectedData((current) => ({
        ...current,
        messages: current.messages.map((item) => (
          item.clientMessageId === message.clientMessageId
            ? {
                ...item,
                messageIdx: result.messageIdx,
                createdAt: result.createdAt,
                sending: false,
              }
            : item
        )),
      }));
    } catch (error) {
      setSelectedData((current) => ({
        ...current,
        messages: current.messages.map((item) => (
          item.clientMessageId === message.clientMessageId
            ? { ...item, failed: true, sending: false }
            : item
        )),
      }));
      notify(error.message, "error");
    }
  };

  const handleImages = async (event) => {
    const files = [...(event.target.files ?? [])];
    event.target.value = "";
    if (!files.length || !selectedRoomIdx) {
      return;
    }

    setIsUploading(true);
    try {
      const result = await chatApi.uploadImages(selectedRoomIdx, files);
      setSelectedData((current) => ({
        ...current,
        messages: (result.messages ?? []).reduce(
          (next, message) => mergeMessage(next, message),
          current.messages,
        ),
      }));
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setIsUploading(false);
    }
  };

  const openPaymentRequest = () => {
    if (!room?.listing || !opponent) {
      return;
    }

    setPaymentAmount(String(room.listing.displayPrice ?? ""));
    setPaymentRequestOpen(true);
  };

  const handlePaymentRequest = async () => {
    const amount = Number(paymentAmount);
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      notify("올바른 송금 요청 금액을 입력해주세요.", "error");
      return;
    }

    setIsCreatingPaymentRequest(true);
    try {
      const transaction = await transactionsApi.createPaymentRequest({
        listingIdx: room.listing.listingIdx,
        buyerIdx: opponent.userIdx,
        amount,
      });
      setPaymentRequestOpen(false);
      navigate(`/payment/${transaction.transactionIdx}`);
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setIsCreatingPaymentRequest(false);
    }
  };

  return (
    <div className="page-container chat-page">
      <aside className="chat-sidebar">
        <div className="chat-sidebar__header">
          <div>
            <p className="eyebrow">실시간 대화</p>
            <h1>채팅</h1>
          </div>
          <span className={`connection-pill ${isConnected ? "is-online" : ""}`}>
            {isConnected ? "연결됨" : "연결 대기"}
          </span>
        </div>

        <form className="chat-search" onSubmit={handleSearch}>
          <Search size={18} />
          <input
            value={searchInput}
            placeholder="상대방 또는 상품 검색"
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </form>

        {roomsLoading && <LoadingState label="채팅 목록을 불러오는 중입니다." />}
        {roomsError && <ErrorState error={roomsError} onRetry={reloadRooms} />}
        {!roomsLoading && !roomsError && roomsData.items.length === 0 && (
          <EmptyState
            title="아직 채팅방이 없습니다."
            description="상품 상세 화면에서 판매자에게 먼저 말을 걸어보세요."
          />
        )}

        <div className="chat-room-list">
          {roomsData.items.map((item) => (
            <button
              key={item.chatRoomIdx}
              type="button"
              className={Number(item.chatRoomIdx) === selectedRoomIdx ? "is-active" : undefined}
              onClick={() => {
                item.unreadCount = 0
                navigate(`/chat/${item.chatRoomIdx}`)
              }}
            >
              <Avatar
                user={{
                  nickname: item.opponentNickname,
                  profileImageUrl: item.opponentProfileImageUrl,
                }}
                size="small"
              />
              <span className="chat-room-list__copy">
                <strong>{item.opponentNickname ?? "사용자"}</strong>
                <small>{item.listingTitle}</small>
                <p>{item.lastMessage?.content ?? "아직 메시지가 없습니다."}</p>
              </span>
              <span className="chat-room-list__meta">
                <small>{formatTime(item.updatedAt)}</small>
                {Number(item.unreadCount) > 0 && <b>{item.unreadCount}</b>}
              </span>
            </button>
          ))}
        </div>

        <Pagination
          page={page}
          totalPages={roomsData.totalPages}
          onChange={setPage}
        />
      </aside>

      <section className="chat-panel">
        {!selectedRoomIdx && (
          <EmptyState
            title="대화를 선택해주세요."
            description="판매자와 상품에 대해 편하게 이야기해 보세요!"
            action={<img className="chat-empty-potato" src={primaryPotato} alt="" />}
          />
        )}

        {selectedRoomIdx && selectedLoading && (
          <LoadingState label="대화를 불러오는 중입니다." />
        )}
        {selectedRoomIdx && selectedError && (
          <ErrorState error={selectedError} onRetry={reloadSelected} />
        )}

        {room && (
          <>
            <header className="chat-panel__header">
              <div className="chat-panel__opponent">
                <Avatar user={opponent} />
                <div>
                  <h2>{opponent?.nickname ?? "채팅 상대"}</h2>
                  <p>{room.listing?.title}</p>
                </div>
              </div>
              <div className="chat-panel__header-actions">
                <StatusBadge status={room.listing?.status} />
                {room.canCreatePaymentRequest && (
                  <button type="button" className="button button--small" onClick={openPaymentRequest}>
                    <WalletCards size={17} />
                    송금 요청
                  </button>
                )}
              </div>
            </header>

            {room.readOnly && (
              <div className="chat-readonly">
                이 채팅방은 읽기 전용입니다. {room.readOnlyReason}
              </div>
            )}

            <div className="chat-messages" aria-live="polite">
              {messages.length === 0 && (
                <div className="chat-first-message">
                  <img src={primaryPotato} alt="" />
                  <strong>첫 메시지를 보내보세요.</strong>
                </div>
              )}

              {messages.map((message) => {
                const isMine = Number(message.senderIdx) === currentUserIdx;
                const isSystem = ["SYSTEM", "TRADE_COMPLETE"].includes(message.messageType);

                if (isSystem) {
                  return (
                    <div key={message.messageIdx} className="chat-system-message">
                      {message.content}
                    </div>
                  );
                }

                if (message.messageType === "PAYMENT_REQUEST") {
                  return (
                    <div key={message.messageIdx} className="chat-payment-message">
                      <WalletCards size={20} />
                      <div>
                        <strong>{message.content || "송금 요청이 도착했습니다."}</strong>
                        <button
                          type="button"
                          onClick={() => navigate(`/payment/${message.transactionIdx}`)}
                        >
                          거래 확인
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <article
                    key={message.messageIdx}
                    className={`chat-message ${isMine ? "is-mine" : ""}`}
                  >
                    {!isMine && <Avatar user={opponent} size="small" />}
                    <div>
                      <div className="chat-bubble">
                        {message.imageUrl ? (
                          <a
                            href={resolveResourceUrl(message.imageUrl)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <ImageWithFallback
                              src={message.imageUrl}
                              alt="채팅 이미지"
                              className="chat-image"
                            />
                          </a>
                        ) : (
                          <p>{message.content}</p>
                        )}
                      </div>
                      <small>
                        {formatTime(message.createdAt)}
                        {message.sending && " · 전송 중"}
                        {message.failed && " · 전송 실패"}
                      </small>
                      {message.failed && (
                        <button
                          type="button"
                          className="chat-retry"
                          onClick={() => retryMessage(message)}
                        >
                          다시 보내기
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>

            <form className="chat-composer" onSubmit={handleSend}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                multiple
                hidden
                onChange={handleImages}
              />
              <button
                type="button"
                className="icon-button"
                aria-label="이미지 전송"
                disabled={!room.canSendMessage || isUploading}
                onClick={() => fileInputRef.current?.click()}
              >
                <ImagePlus size={21} />
              </button>
              <input
                value={messageInput}
                maxLength={2000}
                disabled={!room.canSendMessage}
                placeholder={room.canSendMessage ? "메시지를 입력하세요." : "읽기 전용 채팅방입니다."}
                onChange={(event) => setMessageInput(event.target.value)}
              />
              <button
                type="submit"
                className="button button--icon"
                aria-label="메시지 전송"
                disabled={!room.canSendMessage || !messageInput.trim() || isSending}
              >
                <Send size={20} />
              </button>
            </form>
          </>
        )}
      </section>

      <Modal
        open={paymentRequestOpen}
        className="payment-request-modal"
        title="송금 요청"
        description={`${opponent?.nickname ?? "구매자"}님에게 요청할 금액을 입력해주세요.`}
        onClose={() => {
          if (!isCreatingPaymentRequest) setPaymentRequestOpen(false);
        }}
        footer={(
          <>
            <button
              type="button"
              className="button button--secondary"
              disabled={isCreatingPaymentRequest}
              onClick={() => setPaymentRequestOpen(false)}
            >
              취소
            </button>
            <button
              type="button"
              className="button"
              disabled={isCreatingPaymentRequest || !paymentAmount}
              onClick={handlePaymentRequest}
            >
              {isCreatingPaymentRequest ? "요청 중..." : "송금 요청 보내기"}
            </button>
          </>
        )}
      >
        <label className="form-field">
          <span>요청 금액</span>
          <div className="input-suffix">
            <input
              type="number"
              min="1"
              step="1"
              value={paymentAmount}
              autoFocus
              onChange={(event) => setPaymentAmount(event.target.value)}
            />
            <span>원</span>
          </div>
        </label>
      </Modal>
    </div>
  );
}
