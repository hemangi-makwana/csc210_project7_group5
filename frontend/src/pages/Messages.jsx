/**
 * ============================================================================
 * Peer Connections & Direct Messaging Page (src/pages/Messages.jsx)
 * ============================================================================
 * Real, connected messaging backed directly by PostgreSQL.
 * Features:
 * 1. Authenticated access with strict participant ownership enforcement.
 * 2. Real-time conversation threads with peer avatar and demo profile tags.
 * 3. Message sending with automatic recipient notification and email trigger.
 * 4. Master-detail two-column layout optimized for dark blue aesthetic.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  getConversations,
  startConversation,
  getMessages,
  sendMessage,
  getConnections,
} from '../api/messages.js';
import { Loader, ErrorState, EmptyState } from '../components/Feedback.jsx';
import { MessageIcon, UserIcon, CheckIcon } from '../components/Icons.jsx';

export function Messages() {
  const { user, isAuthenticated } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [conversations, setConversations] = useState([]);
  const [connections, setConnections] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [activePeer, setActivePeer] = useState(null);
  const [messages, setMessages] = useState([]);

  const [messageText, setMessageText] = useState('');
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const messagesEndRef = useRef(null);

  // Scroll to bottom of active message list
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load conversations and connections on mount
  useEffect(() => {
    if (!isAuthenticated) return;

    let isMounted = true;

    async function loadData() {
      setIsLoadingList(true);
      setErrorMessage(null);
      try {
        const [convRes, connRes] = await Promise.all([
          getConversations(),
          getConnections().catch(() => ({ connections: [] })),
        ]);

        if (isMounted) {
          const convList = convRes.conversations || [];
          setConversations(convList);
          setConnections(connRes.connections || []);

          // Check if URL specified a conversationId or userId
          const targetConvId = searchParams.get('conversationId');
          const targetUserId = searchParams.get('userId');

          if (targetConvId) {
            const found = convList.find((c) => String(c.id) === String(targetConvId));
            if (found) {
              setActiveConvId(found.id);
              setActivePeer(found.peer);
            }
          } else if (targetUserId && targetUserId !== user?.id) {
            // Find existing or start thread with user
            const existing = convList.find(
              (c) => c.peer && String(c.peer.id) === String(targetUserId)
            );
            if (existing) {
              setActiveConvId(existing.id);
              setActivePeer(existing.peer);
            } else {
              // Initiate new conversation
              const created = await startConversation(targetUserId);
              if (created && created.conversation) {
                setConversations((prev) => [created.conversation, ...prev]);
                setActiveConvId(created.conversation.id);
                setActivePeer(created.conversation.peer);
              }
            }
          } else if (convList.length > 0 && !activeConvId) {
            setActiveConvId(convList[0].id);
            setActivePeer(convList[0].peer);
          }
        }
      } catch (err) {
        if (isMounted) {
          setErrorMessage(err.message || 'Failed to load conversations.');
        }
      } finally {
        if (isMounted) setIsLoadingList(false);
      }
    }

    loadData();

    // Poll conversations periodically for new messages
    const pollInterval = setInterval(() => {
      getConversations()
        .then((res) => {
          if (isMounted && res && res.conversations) {
            setConversations(res.conversations);
          }
        })
        .catch(() => {});
    }, 12000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [isAuthenticated, user?.id, searchParams]);

  // Load messages when activeConvId changes
  useEffect(() => {
    if (!activeConvId || !isAuthenticated) return;

    let isMounted = true;

    async function loadThread() {
      setIsLoadingMessages(true);
      try {
        const res = await getMessages(activeConvId);
        if (isMounted) {
          setMessages(res.messages || []);
        }
      } catch (err) {
        if (isMounted) {
          setErrorMessage(err.message || 'Failed to load messages.');
        }
      } finally {
        if (isMounted) setIsLoadingMessages(false);
      }
    }

    loadThread();

    // Poll current thread messages every 5 seconds for responsive chat
    const threadInterval = setInterval(() => {
      getMessages(activeConvId)
        .then((res) => {
          if (isMounted && res && res.messages) {
            setMessages(res.messages);
          }
        })
        .catch(() => {});
    }, 5000);

    return () => {
      isMounted = false;
      clearInterval(threadInterval);
    };
  }, [activeConvId, isAuthenticated]);

  async function handleSendMessage(e) {
    e.preventDefault();
    if (!messageText.trim() || !activeConvId) return;

    const content = messageText.trim();
    setMessageText('');
    setIsSending(true);

    try {
      const res = await sendMessage(activeConvId, content);
      if (res && res.data) {
        setMessages((prev) => [...prev, res.data]);
        // Update snippet in conversation list
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeConvId
              ? {
                  ...c,
                  last_message_content: content,
                  last_message_time: new Date().toISOString(),
                }
              : c
          )
        );
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to send message.');
    } finally {
      setIsSending(false);
    }
  }

  function selectConversation(conv) {
    setActiveConvId(conv.id);
    setActivePeer(conv.peer);
    setSearchParams({ conversationId: conv.id });
  }

  async function startNewWithContact(peerId) {
    try {
      const res = await startConversation(peerId);
      if (res && res.conversation) {
        setConversations((prev) => {
          const exists = prev.some((c) => c.id === res.conversation.id);
          return exists ? prev : [res.conversation, ...prev];
        });
        setActiveConvId(res.conversation.id);
        setActivePeer(res.conversation.peer);
        setSearchParams({ conversationId: res.conversation.id });
      }
    } catch (err) {
      setErrorMessage(err.message || 'Could not start conversation.');
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="page" style={{ maxWidth: '600px', textAlign: 'center', marginTop: '3rem' }}>
        <div className="card">
          <MessageIcon size={44} style={{ color: 'var(--color-primary)', margin: '0 auto 1rem' }} />
          <h2 className="card-title">Authentication Required</h2>
          <p className="card-subtitle" style={{ marginBottom: '1.5rem' }}>
            Please log in to your SkillExchange account to access your peer connections and messages.
          </p>
          <Link to="/login" className="btn btn-primary">
            Sign In to SkillExchange
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page" style={{ maxWidth: '1100px', height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      <div className="page-header" style={{ marginBottom: '1rem' }}>
        <h1 className="page-title">Messages & Peer Connections</h1>
        <p className="page-subtitle">
          Direct messaging backed by PostgreSQL. Chat with qualified mentors and peer learners.
        </p>
      </div>

      {errorMessage && <ErrorState message={errorMessage} onRetry={() => setErrorMessage(null)} />}

      <div
        className="card"
        style={{
          flex: 1,
          padding: 0,
          display: 'grid',
          gridTemplateColumns: '320px 1fr',
          overflow: 'hidden',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
        }}
      >
        {/* Left Column: Conversations List */}
        <div
          style={{
            borderRight: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'var(--color-bg-secondary)',
            height: '100%',
          }}
        >
          <div
            style={{
              padding: '1rem',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--color-text-primary)' }}>
              Conversations ({conversations.length})
            </span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {isLoadingList ? (
              <div style={{ padding: '2rem' }}>
                <Loader message="Loading chats..." />
              </div>
            ) : conversations.length === 0 ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                <p style={{ fontSize: '0.88rem', marginBottom: '0.75rem' }}>No active conversations yet.</p>
                <p style={{ fontSize: '0.8rem' }}>Browse mentors or recommendations to message a peer.</p>
              </div>
            ) : (
              conversations.map((conv) => {
                const isActive = conv.id === activeConvId;
                const peer = conv.peer || { name: 'Peer' };
                const peerAvatar = peer.avatar_url
                  ? (peer.avatar_url.startsWith('http') ? peer.avatar_url : peer.avatar_url)
                  : null;

                return (
                  <div
                    key={conv.id}
                    onClick={() => selectConversation(conv)}
                    style={{
                      padding: '0.85rem 1rem',
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--color-border-subtle)',
                      backgroundColor: isActive ? 'rgba(79, 70, 229, 0.15)' : 'transparent',
                      borderLeft: isActive ? '3px solid var(--color-primary)' : '3px solid transparent',
                      transition: 'background-color 0.15s ease',
                      display: 'flex',
                      gap: '0.75rem',
                      alignItems: 'center',
                    }}
                  >
                    {peerAvatar ? (
                      <img
                        src={peerAvatar}
                        alt={peer.name}
                        style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          backgroundColor: 'rgba(99, 102, 241, 0.25)',
                          color: '#818cf8',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '700',
                          fontSize: '0.95rem',
                          flexShrink: 0,
                        }}
                      >
                        {(peer.name || 'P').charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', overflow: 'hidden' }}>
                          <span style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {peer.name}
                          </span>
                          {peer.is_demo && (
                            <span
                              style={{
                                fontSize: '0.65rem',
                                padding: '0.1rem 0.35rem',
                                borderRadius: '4px',
                                backgroundColor: 'rgba(99, 102, 241, 0.2)',
                                color: '#a5b4fc',
                              }}
                            >
                              Demo
                            </span>
                          )}
                        </div>
                        {conv.unread_count > 0 && (
                          <span
                            style={{
                              backgroundColor: 'var(--color-primary)',
                              color: '#fff',
                              fontSize: '0.7rem',
                              fontWeight: '700',
                              padding: '0.1rem 0.45rem',
                              borderRadius: '9999px',
                            }}
                          >
                            {conv.unread_count}
                          </span>
                        )}
                      </div>

                      <p
                        style={{
                          fontSize: '0.8rem',
                          color: 'var(--color-text-muted)',
                          margin: '0.2rem 0 0',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {conv.last_message_content || 'No messages yet'}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Chat Thread */}
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--color-bg)' }}>
          {activeConvId && activePeer ? (
            <>
              {/* Thread Header */}
              <div
                style={{
                  padding: '0.85rem 1.25rem',
                  borderBottom: '1px solid var(--color-border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: 'var(--color-bg-secondary)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {activePeer.avatar_url ? (
                    <img
                      src={activePeer.avatar_url.startsWith('http') ? activePeer.avatar_url : activePeer.avatar_url}
                      alt={activePeer.name}
                      style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(99, 102, 241, 0.25)',
                        color: '#818cf8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '700',
                      }}
                    >
                      {(activePeer.name || 'P').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <span style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--color-text-primary)' }}>
                        {activePeer.name}
                      </span>
                      {activePeer.is_demo && (
                        <span
                          className="badge"
                          style={{
                            fontSize: '0.68rem',
                            backgroundColor: 'rgba(99, 102, 241, 0.15)',
                            color: '#a5b4fc',
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                          }}
                        >
                          Demo Profile
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>
                      {activePeer.role || 'Peer Member'}
                    </span>
                  </div>
                </div>

                <Link
                  to={`/booking?mentorId=${encodeURIComponent(activePeer.id)}&mentorName=${encodeURIComponent(activePeer.name)}`}
                  className="btn btn-sm btn-outline"
                >
                  Book Session
                </Link>
              </div>

              {/* Message History Bubble Area */}
              <div
                style={{
                  flex: 1,
                  padding: '1.25rem',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                }}
              >
                {isLoadingMessages ? (
                  <Loader message="Loading messages..." />
                ) : messages.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                    <MessageIcon size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
                    <p style={{ fontSize: '0.9rem' }}>No messages in this conversation yet.</p>
                    <p style={{ fontSize: '0.82rem' }}>Say hello to start the discussion!</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMine = msg.sender_id === user?.id;
                    const timeStr = new Date(msg.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <div
                        key={msg.id}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: isMine ? 'flex-end' : 'flex-start',
                          maxWidth: '75%',
                          alignSelf: isMine ? 'flex-end' : 'flex-start',
                        }}
                      >
                        <div
                          style={{
                            padding: '0.75rem 1rem',
                            borderRadius: '16px',
                            borderBottomRightRadius: isMine ? '4px' : '16px',
                            borderBottomLeftRadius: isMine ? '16px' : '4px',
                            backgroundColor: isMine ? 'var(--color-primary)' : 'var(--color-bg-secondary)',
                            color: isMine ? '#ffffff' : 'var(--color-text-primary)',
                            fontSize: '0.92rem',
                            lineHeight: 1.45,
                            border: isMine ? 'none' : '1px solid var(--color-border)',
                            wordBreak: 'break-word',
                          }}
                        >
                          {msg.content}
                        </div>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            color: 'var(--color-text-muted)',
                            marginTop: '0.2rem',
                            padding: '0 0.25rem',
                          }}
                        >
                          {timeStr}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Form */}
              <form
                onSubmit={handleSendMessage}
                style={{
                  padding: '1rem',
                  borderTop: '1px solid var(--color-border)',
                  display: 'flex',
                  gap: '0.75rem',
                  backgroundColor: 'var(--color-bg-secondary)',
                }}
              >
                <input
                  type="text"
                  className="form-input"
                  style={{ flex: 1 }}
                  placeholder={`Message ${activePeer.name}...`}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  disabled={isSending}
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSending || !messageText.trim()}
                >
                  {isSending ? 'Sending...' : 'Send'}
                </button>
              </form>
            </>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'var(--color-text-muted)',
                padding: '2rem',
                textAlign: 'center',
              }}
            >
              <MessageIcon size={48} style={{ opacity: 0.4, marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>
                Select a conversation
              </h3>
              <p style={{ fontSize: '0.88rem', maxWidth: '360px' }}>
                Choose an existing chat thread from the left or message a mentor from their profile card.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
