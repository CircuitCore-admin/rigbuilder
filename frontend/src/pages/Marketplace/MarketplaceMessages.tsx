import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import Markdown from 'react-markdown';
import { api, resolveImageUrl } from '../../utils/api';
import { useToast } from '../../components/Toast/Toast';
import { useAuth } from '../../hooks/useAuth';
import styles from './MarketplaceMessages.module.scss';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ConversationPreview {
  conversationId: string;
  lastMessage: {
    id: string;
    senderId: string;
    sender: { id: string; username: string; avatarUrl: string | null };
    recipient: { id: string; username: string; avatarUrl: string | null };
    listing: { id: string; title: string; price?: number | null; currency?: string; imageUrls?: string[]; status?: string };
    preview: string;
    createdAt: string;
    readAt: string | null;
  };
  unreadCount: number;
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  sender: { id: string; username: string; avatarUrl: string | null };
  recipient?: { id: string; username: string; avatarUrl: string | null };
  listing?: { id: string; title: string; price?: number | null; currency?: string; imageUrls?: string[]; status?: string };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const POLL_INTERVAL = 10_000;
const CONV_POLL_INTERVAL = 30_000;

export function MarketplaceMessages() {
  const { conversationId: paramConvoId } = useParams<{ conversationId: string }>();
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // State
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [loadingConvos, setLoadingConvos] = useState(true);

  const [activeConvoId, setActiveConvoId] = useState<string | null>(paramConvoId ?? null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Query params for new conversation context
  const [searchParams] = useSearchParams();
  const listingIdParam = searchParams.get('listingId');
  const recipientIdParam = searchParams.get('recipientId');

  // Context for new conversations (no messages yet)
  const [newConvoContext, setNewConvoContext] = useState<{
    otherUser: { id: string; username: string; avatarUrl: string | null };
    listing: { id: string; title: string; price?: number | null; currency?: string; imageUrls?: string[] };
  } | null>(null);

  // Derived: get the other user and listing info from conversations or messages
  const activeConvo = conversations.find(c => c.conversationId === activeConvoId);
  const otherUser = activeConvo
    ? (activeConvo.lastMessage.sender.id === user?.userId
        ? activeConvo.lastMessage.recipient
        : activeConvo.lastMessage.sender)
    : (messages.length > 0 && user
        ? (messages[0].senderId === user.userId
            ? messages[0].recipient ?? messages[0].sender
            : messages[0].sender)
        : newConvoContext?.otherUser ?? null);
  const listingInfo = activeConvo?.lastMessage.listing
    ?? (messages.length > 0 ? messages[0].listing : null)
    ?? newConvoContext?.listing
    ?? null;

  // Sync activeConvoId with URL param
  useEffect(() => {
    setActiveConvoId(paramConvoId ?? null);
  }, [paramConvoId]);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }, []);

  // Fetch conversations list
  useEffect(() => {
    if (!user) return;
    setLoadingConvos(true);
    api<ConversationPreview[]>('/marketplace/conversations')
      .then(data => setConversations(Array.isArray(data) ? data : []))
      .catch(() => setConversations([]))
      .finally(() => setLoadingConvos(false));
  }, [user]);

  // Poll conversations list for unread counts
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      api<ConversationPreview[]>('/marketplace/conversations')
        .then(data => setConversations(Array.isArray(data) ? data : []))
        .catch(() => {});
    }, CONV_POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [user]);

  // Fetch context for new conversations from URL params
  useEffect(() => {
    if (!listingIdParam || !recipientIdParam) return;
    if (messages.length > 0 || activeConvo) return; // Already have context

    Promise.all([
      api<any>(`/marketplace/${listingIdParam}`),
      api<any>(`/users/id/${recipientIdParam}`).catch(() => null),
    ]).then(([listing, recipient]) => {
      if (listing) {
        setNewConvoContext({
          otherUser: recipient
            ? { id: recipient.id, username: recipient.username, avatarUrl: recipient.avatarUrl }
            : { id: recipientIdParam, username: listing.user?.username ?? 'User', avatarUrl: null },
          listing: {
            id: listing.id,
            title: listing.title,
            price: listing.price,
            currency: listing.currency,
            imageUrls: listing.imageUrls,
          },
        });
      }
    }).catch(() => {});
  }, [listingIdParam, recipientIdParam, messages.length, activeConvo]);

  // Fetch messages when activeConvoId changes
  useEffect(() => {
    if (!activeConvoId) { setMessages([]); return; }
    setLoadingMessages(true);
    api<Message[]>(`/marketplace/conversations/${activeConvoId}`)
      .then(data => {
        setMessages(Array.isArray(data) ? data : []);
        scrollToBottom();
      })
      .catch(() => setMessages([]))
      .finally(() => setLoadingMessages(false));
  }, [activeConvoId, scrollToBottom]);

  // Poll for new messages every 10s
  useEffect(() => {
    if (!activeConvoId) return;
    const interval = setInterval(() => {
      api<Message[]>(`/marketplace/conversations/${activeConvoId}`)
        .then(data => {
          const items = Array.isArray(data) ? data : [];
          setMessages(prev => {
            if (items.length !== prev.length) {
              scrollToBottom();
              return items;
            }
            return prev;
          });
        })
        .catch(() => {});
    }, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [activeConvoId, scrollToBottom]);

  // Auto-resize textarea
  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  };

  // Send message
  const handleSend = async () => {
    if (!messageInput.trim() || !activeConvoId || sending || !user) return;

    // Determine recipient and listing from conversation context
    if (!otherUser || !listingInfo) {
      showToast('Unable to send message — missing conversation context', 'error');
      return;
    }

    setSending(true);
    try {
      const msg = await api<Message>('/marketplace/messages', {
        method: 'POST',
        body: { listingId: listingInfo.id, recipientId: otherUser.id, body: messageInput.trim() },
      });
      setMessages(prev => [...prev, msg]);
      setMessageInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      scrollToBottom();
      showToast('Message sent', 'success');
    } catch {
      showToast('Failed to send message', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Select a conversation
  const selectConversation = (convoId: string) => {
    setActiveConvoId(convoId);
    navigate(`/marketplace/messages/${convoId}`, { replace: true });
  };

  // Auth gate
  if (!user) {
    return (
      <div className={styles.authGate}>
        <h2 className={styles.authGateTitle}>Messages</h2>
        <p className={styles.authGateText}>You must be logged in to view messages.</p>
        <a href="/login" className={styles.authGateLink}>Log In</a>
      </div>
    );
  }

  return (
    <div className={styles.messagesLayout}>
      {/* Conversation list */}
      <aside className={`${styles.conversationList} ${activeConvoId ? styles.conversationListHiddenMobile : ''}`}>
        <div className={styles.conversationListHeader}>
          <h1 className={styles.conversationListTitle}>Messages</h1>
        </div>

        <div className={styles.conversationListBody}>
          {loadingConvos ? (
            <div className={styles.loadingState}>Loading…</div>
          ) : conversations.length === 0 ? (
            <div className={styles.emptyConvos}>
              <p>No conversations yet</p>
              <span>Messages with sellers will appear here</span>
            </div>
          ) : (
            conversations.map(convo => {
              const other = convo.lastMessage.sender.id === user.userId
                ? convo.lastMessage.recipient
                : convo.lastMessage.sender;
              return (
                <button
                  key={convo.conversationId}
                  className={`${styles.conversationItem} ${activeConvoId === convo.conversationId ? styles.conversationItemActive : ''}`}
                  onClick={() => selectConversation(convo.conversationId)}
                >
                  <div className={styles.avatar}>
                    {other.avatarUrl ? (
                      <img src={resolveImageUrl(other.avatarUrl)} alt="" />
                    ) : (
                      <span>{other.username[0]?.toUpperCase()}</span>
                    )}
                  </div>
                  <div className={styles.conversationItemBody}>
                    <div className={styles.conversationItemTopLine}>
                      <a href={`/profile/${other.username}`} className={styles.messageUserLink} onClick={e => e.stopPropagation()}>{other.username}</a>
                      <span className={styles.conversationItemTime}>
                        {relativeTime(convo.lastMessage.createdAt)}
                      </span>
                    </div>
                    <div className={styles.conversationItemListing}>{convo.lastMessage.listing.title}</div>
                    <div className={styles.conversationItemPreview}>
                      {convo.lastMessage.preview.length > 60
                        ? convo.lastMessage.preview.slice(0, 60) + '…'
                        : convo.lastMessage.preview}
                    </div>
                  </div>
                  {convo.unreadCount > 0 && (
                    <span className={styles.unreadBadge}>{convo.unreadCount}</span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* Message thread */}
      <div className={`${styles.messageArea} ${!activeConvoId ? styles.messageAreaHiddenMobile : ''}`}>
        {!activeConvoId ? (
          <div className={styles.noConvoSelected}>
            <span className={styles.noConvoIcon}>✉</span>
            <p>Select a conversation to view messages</p>
          </div>
        ) : (
          <>
            {/* Message header */}
            <div className={styles.messageHeader}>
              <div className={styles.messageHeaderLeft}>
                <button
                  className={styles.mobileBackBtn}
                  onClick={() => navigate('/marketplace/messages')}
                >
                  ←
                </button>
                {otherUser && (
                  <div className={styles.messageHeaderUser}>
                    <div className={styles.avatarSmall}>
                      {otherUser.avatarUrl ? (
                        <img src={resolveImageUrl(otherUser.avatarUrl)} alt="" />
                      ) : (
                        <span>{otherUser.username[0]?.toUpperCase()}</span>
                      )}
                    </div>
                    <a href={`/profile/${otherUser.username}`} className={styles.messageUserLink}>{otherUser.username}</a>
                  </div>
                )}
              </div>
              {listingInfo && (
                <a
                  href={`/marketplace/${listingInfo.id}`}
                  className={styles.messageHeaderListingCard}
                >
                  {listingInfo.imageUrls?.[0] && (
                    <img
                      src={resolveImageUrl(listingInfo.imageUrls[0])}
                      alt=""
                      className={styles.messageHeaderListingImage}
                    />
                  )}
                  <div className={styles.messageHeaderListingInfo}>
                    <span className={styles.messageHeaderListingTitle}>{listingInfo.title}</span>
                    {listingInfo.price != null && listingInfo.currency && (
                      <span className={styles.messageHeaderListingPrice}>
                        {new Intl.NumberFormat('en-GB', { style: 'currency', currency: listingInfo.currency }).format(listingInfo.price)}
                      </span>
                    )}
                  </div>
                </a>
              )}
            </div>

            {/* Messages */}
            {loadingMessages ? (
              <div className={styles.loadingState}>Loading messages…</div>
            ) : (
              <div className={styles.messageList}>
                {messages.map(msg => {
                  const isMine = msg.senderId === user.userId;
                  return (
                    <div
                      key={msg.id}
                      className={`${styles.messageBubbleRow} ${isMine ? styles.messageBubbleRowMine : ''}`}
                    >
                      <div className={`${styles.messageBubble} ${isMine ? styles.messageBubbleMine : styles.messageBubbleTheirs}`}>
                        <div className={styles.messageBubbleBody}>
                          <Markdown>{msg.body}</Markdown>
                        </div>
                        <div className={styles.messageBubbleTime}>
                          {relativeTime(msg.createdAt)}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}

            {/* Input area */}
            <div className={styles.messageInputArea}>
              {listingInfo && (
                <a href={`/marketplace/${listingInfo.id}`} className={styles.inputListingBanner}>
                  {listingInfo.imageUrls?.[0] && (
                    <img
                      src={resolveImageUrl(listingInfo.imageUrls[0])}
                      alt=""
                      className={styles.inputListingImage}
                    />
                  )}
                  <div className={styles.inputListingInfo}>
                    <span className={styles.inputListingTitle}>{listingInfo.title}</span>
                    {listingInfo.price != null && listingInfo.currency && (
                      <span className={styles.inputListingPrice}>
                        {new Intl.NumberFormat('en-GB', { style: 'currency', currency: listingInfo.currency }).format(listingInfo.price)}
                      </span>
                    )}
                  </div>
                </a>
              )}
              <div className={styles.inputRow}>
                <textarea
                  ref={textareaRef}
                  className={styles.messageTextarea}
                  placeholder="Type a message…"
                  value={messageInput}
                  onChange={handleTextareaInput}
                  onKeyDown={handleKeyDown}
                  maxLength={5000}
                  rows={1}
                />
                <button
                  className={styles.messageSendBtn}
                  onClick={handleSend}
                  disabled={!messageInput.trim() || sending}
                >
                  {sending ? '…' : 'Send'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
