import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";

import { chatApi } from "../../api/chatApi";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";

function createClientMessageId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `chat-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatTime(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function mergeMessage(currentMessages, incoming, currentUserIdx) {
  const existingIndex = currentMessages.findIndex((message) => (
    String(message.messageIdx) === String(incoming.messageIdx)
    || (incoming.clientMessageId && message.clientMessageId === incoming.clientMessageId)
  ));
  if (existingIndex >= 0) {
    const next = [...currentMessages];
    next[existingIndex] = { ...next[existingIndex], ...incoming, sending: false, failed: false };
    return next;
  }
  const pendingIndex = incoming.senderIdx === currentUserIdx
    ? currentMessages.findIndex((message) => (
      message.sending
      && message.messageType === incoming.messageType
      && message.content === incoming.content
    ))
    : -1;
  if (pendingIndex >= 0) {
    const next = [...currentMessages];
    next[pendingIndex] = { ...next[pendingIndex], ...incoming, sending: false, failed: false };
    return next;
  }
  return [...currentMessages, incoming];
}

export default function Chat() {
  const { chatRoomIdx: chatRoomIdxParam } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket, emitWithAck } = useSocket();
  const selectedChatRoomIdx = chatRoomIdxParam ? Number(chatRoomIdxParam) : null;
  const currentUserIdx = Number(user?.userIdx ?? user?.id);
  const fileInputRef = useRef(null);

  const [chatRooms, setChatRooms] = useState([]);
  const [chatPage, setChatPage] = useState(1);
  const [chatTotalPages, setChatTotalPages] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoadingRoom, setIsLoadingRoom] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const loadChatRooms = useCallback(async () => {
    const data = await chatApi.list({ q: searchQuery, page: chatPage, limit: 7 });
    setChatRooms(data.items ?? []);
    setChatTotalPages(data.totalPages ?? 0);
  }, [chatPage, searchQuery]);

  const loadRoom = useCallback(async (chatRoomIdx) => {
    const [detail, messageData] = await Promise.all([
      chatApi.detail(chatRoomIdx),
      chatApi.messages(chatRoomIdx),
    ]);
    setRoom(detail);
    setMessages(messageData.items ?? []);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadChatRooms().catch((error) => setErrorMessage(error.message));
  }, [loadChatRooms]);

  useEffect(() => {
    if (!socket) return undefined;
    const refreshList = () => void loadChatRooms().catch(() => {});
    socket.on("chat:room:new", refreshList);
    socket.on("chat:room:updated", refreshList);
    return () => {
      socket.off("chat:room:new", refreshList);
      socket.off("chat:room:updated", refreshList);
    };
  }, [socket, loadChatRooms]);

  useEffect(() => {
    if (!selectedChatRoomIdx || !Number.isInteger(selectedChatRoomIdx)) {
      return undefined;
    }

    let disposed = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoadingRoom(true);
    setErrorMessage("");
    const loadAndJoin = async () => {
      try {
        await loadRoom(selectedChatRoomIdx);
        if (!disposed && socket?.connected) {
          await emitWithAck("chat:join", { chatRoomIdx: selectedChatRoomIdx });
        }
      } catch (error) {
        if (!disposed) setErrorMessage(error.message);
      } finally {
        if (!disposed) setIsLoadingRoom(false);
      }
    };
    void loadAndJoin();

    const handleConnect = () => {
      void (async () => {
        try {
          await loadRoom(selectedChatRoomIdx);
          await emitWithAck("chat:join", { chatRoomIdx: selectedChatRoomIdx });
        } catch (error) {
          if (!disposed) setErrorMessage(error.message);
        }
      })();
    };
    const handleMessage = (message) => {
      if (Number(message.chatRoomIdx) !== selectedChatRoomIdx) return;
      setMessages((current) => mergeMessage(current, message, currentUserIdx));
      if (Number(message.senderIdx) !== currentUserIdx) {
        void emitWithAck("chat:read", { chatRoomIdx: selectedChatRoomIdx }).catch(() => {});
      }
    };

    socket?.on("connect", handleConnect);
    socket?.on("chat:message:new", handleMessage);
    return () => {
      socket?.off("connect", handleConnect);
      socket?.off("chat:message:new", handleMessage);
      if (socket?.connected) {
        void emitWithAck("chat:leave", { chatRoomIdx: selectedChatRoomIdx }).catch(() => {});
      }
      disposed = true;
    };
  }, [currentUserIdx, emitWithAck, loadRoom, selectedChatRoomIdx, socket]);

  const selectedOpponent = useMemo(() => {
    if (!room) return null;
    return room.seller.userIdx === currentUserIdx ? room.buyer : room.seller;
  }, [currentUserIdx, room]);

  const handleSearch = (event) => {
    event.preventDefault();
    setChatPage(1);
    setSearchQuery(searchInput.trim());
  };

  const handleSendMessage = async (event) => {
    event.preventDefault();
    if (!room || !room.canSendMessage || !messageInput.trim()) return;

    const content = messageInput.trim();
    const clientMessageId = createClientMessageId();
    const optimisticMessage = {
      messageIdx: `temp-${clientMessageId}`,
      chatRoomIdx: room.chatRoomIdx,
      senderIdx: currentUserIdx,
      messageType: "TEXT",
      content,
      clientMessageId,
      imageUrl: null,
      transactionIdx: null,
      createdAt: new Date().toISOString(),
      sending: true,
    };
    setMessages((current) => [...current, optimisticMessage]);
    setMessageInput("");
    try {
      const acknowledgement = await emitWithAck("chat:message:send", {
        clientMessageId,
        chatRoomIdx: room.chatRoomIdx,
        messageType: "TEXT",
        content,
      });
      setMessages((current) => current.map((message) => (
        message.clientMessageId === clientMessageId
          ? { ...message, messageIdx: acknowledgement.messageIdx, createdAt: acknowledgement.createdAt, sending: false }
          : message
      )));
    } catch (error) {
      setMessages((current) => current.map((message) => (
        message.clientMessageId === clientMessageId ? { ...message, sending: false, failed: true } : message
      )));
      setErrorMessage(error.message);
    }
  };

  const retryMessage = async (message) => {
    if (!room || !message.failed) return;
    setMessages((current) => current.map((item) => (
      item.clientMessageId === message.clientMessageId ? { ...item, failed: false, sending: true } : item
    )));
    try {
      const acknowledgement = await emitWithAck("chat:message:send", {
        clientMessageId: message.clientMessageId,
        chatRoomIdx: room.chatRoomIdx,
        messageType: "TEXT",
        content: message.content,
      });
      setMessages((current) => current.map((item) => (
        item.clientMessageId === message.clientMessageId
          ? { ...item, messageIdx: acknowledgement.messageIdx, createdAt: acknowledgement.createdAt, sending: false }
          : item
      )));
    } catch (error) {
      setMessages((current) => current.map((item) => (
        item.clientMessageId === message.clientMessageId ? { ...item, sending: false, failed: true } : item
      )));
      setErrorMessage(error.message);
    }
  };

  const handleUploadImages = async (event) => {
    const files = event.target.files;
    if (!room || !files?.length) return;
    setIsUploading(true);
    try {
      const data = await chatApi.uploadImages(room.chatRoomIdx, files);
      setMessages((current) => (data.messages ?? []).reduce(
        (next, message) => mergeMessage(next, { ...message, senderIdx: currentUserIdx }, currentUserIdx),
        current,
      ));
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  const handlePaymentRequest = async () => {
    if (!room || !selectedOpponent) return;
    const amount = Number(globalThis.prompt("송금 요청 금액을 입력해주세요.", room.listing.displayPrice ?? ""));
    if (!Number.isInteger(amount) || amount < 0) return;
    try {
      const transaction = await chatApi.createPaymentRequest({
        listingIdx: room.listing.listingIdx,
        buyerIdx: selectedOpponent.userIdx,
        amount,
      });
      navigate(`/payment/${transaction.transactionIdx}`);
    } catch (error) {
      setErrorMessage(error.message);
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 360px) 1fr", gap: 24, padding: 24 }}>
      <section aria-label="채팅방 목록">
        <h2>채팅</h2>
        <form onSubmit={handleSearch}>
          <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="상대방 닉네임 검색" />
          <button type="submit">검색</button>
        </form>
        <ul style={{ listStyle: "none", padding: 0 }}>
          {chatRooms.map((chatRoom) => (
            <li key={chatRoom.chatRoomIdx}>
              <button type="button" onClick={() => navigate(`/chat/${chatRoom.chatRoomIdx}`)} style={{ width: "100%", textAlign: "left" }}>
                <strong>{chatRoom.opponentNickname}</strong>
                {chatRoom.unreadCount > 0 && <span aria-label="읽지 않은 메시지"> ({chatRoom.unreadCount})</span>}
                <div>{chatRoom.listingTitle}</div>
                <small>{chatRoom.lastMessage?.content ?? "아직 메시지가 없습니다."} {formatTime(chatRoom.updatedAt)}</small>
              </button>
            </li>
          ))}
        </ul>
        {chatTotalPages > 1 && (
          <div>
            <button type="button" disabled={chatPage <= 1} onClick={() => setChatPage((page) => page - 1)}>이전</button>
            <span> {chatPage} / {chatTotalPages} </span>
            <button type="button" disabled={chatPage >= chatTotalPages} onClick={() => setChatPage((page) => page + 1)}>다음</button>
          </div>
        )}
      </section>

      <section aria-label="채팅방">
        {!selectedChatRoomIdx && <p>채팅방을 선택해주세요.</p>}
        {isLoadingRoom && <p>채팅방을 불러오는 중입니다.</p>}
        {room && (
          <>
            <header>
              <h2>{selectedOpponent?.displayName ?? "채팅"}</h2>
              <p>{room.listing.title}</p>
              {room.readOnly && <p role="status">읽기 전용 채팅방입니다. ({room.readOnlyReason})</p>}
            </header>
            <div aria-live="polite" style={{ minHeight: 360, maxHeight: 560, overflowY: "auto" }}>
              {messages.map((message) => {
                const isMine = Number(message.senderIdx) === currentUserIdx;
                if (message.messageType === "PAYMENT_REQUEST") {
                  return <p key={message.messageIdx}><button type="button" onClick={() => navigate(`/payment/${message.transactionIdx}`)}>{message.content || "송금 요청을 확인하세요."}</button></p>;
                }
                if (message.messageType === "TRADE_COMPLETE" || message.messageType === "SYSTEM") {
                  return <p key={message.messageIdx}><em>{message.content}</em></p>;
                }
                return (
                  <div key={message.messageIdx} style={{ textAlign: isMine ? "right" : "left", margin: "10px 0" }}>
                    {message.imageUrl ? <img src={message.imageUrl} alt="채팅으로 전송한 이미지" style={{ maxWidth: 240 }} /> : <span>{message.content}</span>}
                    <small> {formatTime(message.createdAt)} {message.sending ? "전송 중" : ""}</small>
                    {message.failed && <button type="button" onClick={() => retryMessage(message)}>재전송</button>}
                  </div>
                );
              })}
            </div>
            {room.canCreatePaymentRequest && <button type="button" onClick={handlePaymentRequest}>송금 요청</button>}
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" multiple hidden onChange={handleUploadImages} />
            <form onSubmit={handleSendMessage}>
              <button type="button" disabled={!room.canSendMessage || isUploading} onClick={() => fileInputRef.current?.click()}>이미지</button>
              <input disabled={!room.canSendMessage} value={messageInput} onChange={(event) => setMessageInput(event.target.value)} maxLength={2000} placeholder={room.canSendMessage ? "메시지를 입력하세요" : "읽기 전용 채팅방입니다"} />
              <button type="submit" disabled={!room.canSendMessage || !messageInput.trim()}>전송</button>
            </form>
          </>
        )}
        {errorMessage && <p role="alert">{errorMessage}</p>}
      </section>
    </div>
  );
}
