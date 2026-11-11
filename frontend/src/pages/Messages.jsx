/**
 * ============================================================================
 * Peer Connections & Direct Messaging Page (src/pages/Messages.jsx)
 * ============================================================================
 * Real, connected messaging backed directly by PostgreSQL.
 * Features:
 * 1. Authenticated access with strict participant ownership enforcement.
 * 2. Real-time conversation threads with peer avatar and demo profile tags.
 * 3. File attachments (PDF, DOCX, XLSX, PNG, JPG, WebP) with signature checks.
 * 4. Audio voice notes with browser recording (MediaRecorder) and playback.
 * 5. In-website audio & video calls for accepted sessions (WebRTC, STUN/TURN,
 *    camera/mic controls, screen sharing, floating reactions, call logs).
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  getConversations,
  startConversation,
  getMessages,
  sendMessage,
  uploadAttachment,
  getIceServers,
  sendCallSignal,
  getCallSignals,
  getConnections,
} from '../api/messages.js';
import { Loader, ErrorState, EmptyState } from '../components/Feedback.jsx';
import {
  MessageIcon,
  UserIcon,
  CheckIcon,
  PaperclipIcon,
  MicIcon,
  MicOffIcon,
  PhoneIcon,
  PhoneOffIcon,
  VideoIcon,
  VideoOffIcon,
  ScreenShareIcon,
  FileTextIcon,
  DownloadIcon,
  CloseIcon,
} from '../components/Icons.jsx';

const LAST_CONV_STORAGE_KEY = 'skillexchange_last_conv_id';
const MAX_VOICE_DURATION_SECONDS = 300; // 5 minutes max
const MAX_VOICE_BYTES = 10 * 1024 * 1024; // 10 MB max
const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024; // 15 MB max
const RINGING_TIMEOUT_MS = 35000; // 35 seconds ringing timeout before missed call

function getSupportedVoiceRecorderConfig() {
  const candidates = [
    { mimeType: 'audio/webm;codecs=opus', ext: 'webm', baseMime: 'audio/webm' },
    { mimeType: 'audio/webm', ext: 'webm', baseMime: 'audio/webm' },
    { mimeType: 'audio/ogg;codecs=opus', ext: 'ogg', baseMime: 'audio/ogg' },
    { mimeType: 'audio/mp4', ext: 'm4a', baseMime: 'audio/mp4' },
  ];
  if (typeof window !== 'undefined' && typeof window.MediaRecorder !== 'undefined' && typeof window.MediaRecorder.isTypeSupported === 'function') {
    for (const c of candidates) {
      try {
        if (window.MediaRecorder.isTypeSupported(c.mimeType)) {
          return c;
        }
      } catch (_) {}
    }
  }
  return { mimeType: '', ext: 'webm', baseMime: 'audio/webm' };
}

export function Messages() {
  const { user, isAuthenticated, isLearner } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [conversations, setConversations] = useState([]);
  const [connections, setConnections] = useState([]);
  const [activeConvId, setActiveConvId] = useState(() => {
    const fromUrl = searchParams.get('conversationId');
    if (fromUrl && !Number.isNaN(Number(fromUrl))) return Number(fromUrl);
    const saved = sessionStorage.getItem(LAST_CONV_STORAGE_KEY);
    if (saved && !Number.isNaN(Number(saved))) return Number(saved);
    return null;
  });
  const [activePeer, setActivePeer] = useState(null);
  const [messages, setMessages] = useState([]);

  const [messageText, setMessageText] = useState('');
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Attachment upload state
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const fileInputRef = useRef(null);

  // Audio Voice Note state
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voicePreview, setVoicePreview] = useState(null); // { blob, url, duration, ext, mimeType }
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const recordingStartAtRef = useRef(null);
  const voiceConfigRef = useRef({ mimeType: '', ext: 'webm', baseMime: 'audio/webm' });

  // WebRTC Call state
  // callStatus: 'idle' | 'outgoing' | 'incoming' | 'connecting' | 'connected' | 'declined' | 'missed' | 'disconnected' | 'failed'
  const [callStatus, setCallStatus] = useState('idle');
  // connectionState: 'idle' | 'calling' | 'connecting' | 'connected' | 'disconnected' | 'failed' | 'declined' | 'missed'
  const [connectionState, setConnectionState] = useState('idle');
  const [callMode, setCallMode] = useState('video'); // 'video' | 'audio'
  const [callStatusNotice, setCallStatusNotice] = useState(null);
  const [incomingCallData, setIncomingCallData] = useState(null);
  const [otherConvIncomingCall, setOtherConvIncomingCall] = useState(null);
  const [permissionError, setPermissionError] = useState(null);
  const [showInCallChat, setShowInCallChat] = useState(false);
  const [inCallText, setInCallText] = useState('');
  const [callDuration, setCallDuration] = useState(0);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoDisabled, setIsVideoDisabled] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [remoteMediaState, setRemoteMediaState] = useState({
    micMuted: false,
    cameraOff: false,
    screenSharing: false,
  });
  const [hasRemoteVideoTrack, setHasRemoteVideoTrack] = useState(false);
  const [streamVersion, setStreamVersion] = useState(0);
  const [showNetworkInfo, setShowNetworkInfo] = useState(false);
  const [hasTurnConfigured, setHasTurnConfigured] = useState(false);
  const [floatingReactions, setFloatingReactions] = useState([]);

  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const screenTrackRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const remoteOfferRef = useRef(null);
  const candidateQueueRef = useRef([]);
  const processedCandidateKeysRef = useRef(new Set());
  const lastSignalSeqRef = useRef(0);
  const lastSignalTimeRef = useRef(Date.now() - 15000);
  const activeCallIdRef = useRef(null);
  const ringingTimeoutRef = useRef(null);
  const disconnectTimeoutRef = useRef(null);
  const callTimerRef = useRef(null);
  const callDurationRef = useRef(0);
  const activeConvIdRef = useRef(activeConvId);
  const callStatusRef = useRef(callStatus);
  const stopScreenShareRef = useRef(null);
  const autoStartedCallRef = useRef(false);

  const iceServersRef = useRef([
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ]);

  const messagesEndRef = useRef(null);
  const inCallMessagesEndRef = useRef(null);
  const token = localStorage.getItem('token') || '';

  useEffect(() => {
    activeConvIdRef.current = activeConvId;
    if (activeConvId) {
      sessionStorage.setItem(LAST_CONV_STORAGE_KEY, String(activeConvId));
    }
  }, [activeConvId]);

  useEffect(() => {
    callStatusRef.current = callStatus;
  }, [callStatus]);

  // Callback refs for video/audio elements so srcObject attaches immediately when mounted
  const setLocalVideoEl = useCallback((node) => {
    localVideoRef.current = node;
    if (node) {
      const targetStream = screenStreamRef.current || localStreamRef.current;
      if (targetStream && node.srcObject !== targetStream) {
        node.srcObject = targetStream;
        node.play().catch(() => {});
      }
    }
  }, []);

  const setRemoteVideoEl = useCallback((node) => {
    remoteVideoRef.current = node;
    if (node && remoteStreamRef.current) {
      if (node.srcObject !== remoteStreamRef.current) {
        node.srcObject = remoteStreamRef.current;
      }
      node.play().catch(() => {});
    }
  }, []);

  const setRemoteAudioEl = useCallback((node) => {
    remoteAudioRef.current = node;
    if (node && remoteStreamRef.current) {
      if (node.srcObject !== remoteStreamRef.current) {
        node.srcObject = remoteStreamRef.current;
      }
      node.play().catch(() => {});
    }
  }, []);

  // Scroll to bottom of active message list
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    inCallMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, showInCallChat, scrollToBottom]);

  // Load ICE servers on mount
  useEffect(() => {
    if (isAuthenticated) {
      getIceServers()
        .then((res) => {
          if (res && Array.isArray(res.iceServers) && res.iceServers.length > 0) {
            iceServersRef.current = res.iceServers;
          }
          if (res && typeof res.hasTurnConfigured === 'boolean') {
            setHasTurnConfigured(res.hasTurnConfigured);
          }
        })
        .catch(() => {});
    }
  }, [isAuthenticated]);

  // Helper to stop only media tracks & peer connection without wiping terminal status card
  const releaseCallResources = useCallback(() => {
    if (ringingTimeoutRef.current) {
      clearTimeout(ringingTimeoutRef.current);
      ringingTimeoutRef.current = null;
    }
    if (disconnectTimeoutRef.current) {
      clearTimeout(disconnectTimeoutRef.current);
      disconnectTimeoutRef.current = null;
    }
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    if (screenTrackRef.current) {
      try {
        screenTrackRef.current.onended = null;
        screenTrackRef.current.stop();
      } catch (_) {}
      screenTrackRef.current = null;
    }
    if (screenStreamRef.current) {
      try {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
      } catch (_) {}
      screenStreamRef.current = null;
    }
    if (localStreamRef.current) {
      try {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      } catch (_) {}
      localStreamRef.current = null;
    }
    if (pcRef.current) {
      try {
        pcRef.current.ontrack = null;
        pcRef.current.onicecandidate = null;
        pcRef.current.oniceconnectionstatechange = null;
        pcRef.current.onconnectionstatechange = null;
        pcRef.current.close();
      } catch (_) {}
      pcRef.current = null;
    }
    remoteStreamRef.current = null;
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    setIsScreenSharing(false);
    setHasRemoteVideoTrack(false);
    remoteOfferRef.current = null;
    candidateQueueRef.current = [];
    processedCandidateKeysRef.current.clear();
  }, []);

  // Full cleanup resetting call state back to idle
  const cleanupCall = useCallback(() => {
    releaseCallResources();
    setCallStatus('idle');
    setConnectionState('idle');
    setCallStatusNotice(null);
    setIncomingCallData(null);
    setCallDuration(0);
    callDurationRef.current = 0;
    setIsMicMuted(false);
    setIsVideoDisabled(false);
    setRemoteMediaState({ micMuted: false, cameraOff: false, screenSharing: false });
    setShowInCallChat(false);
    activeCallIdRef.current = null;
  }, [releaseCallResources]);

  // Clean up media tracks & notify peer if user navigates away or closes/refreshes the browser tab
  useEffect(() => {
    const handleBeforeUnload = () => {
      const currentConvId = activeConvIdRef.current;
      const currentStatus = callStatusRef.current;
      if (currentConvId && ['outgoing', 'incoming', 'connecting', 'connected', 'disconnected'].includes(currentStatus)) {
        try {
          sendCallSignal(currentConvId, 'end', {
            duration: callDurationRef.current,
            reason: currentStatus === 'incoming' ? 'declined' : 'hangup',
          }).catch(() => {});
        } catch (_) {}
      }
      releaseCallResources();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      handleBeforeUnload();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
          mediaRecorderRef.current.stream?.getTracks().forEach((t) => t.stop());
        } catch (_) {}
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, [releaseCallResources]);

  // Load conversations and connections on mount (without flashing spinner on URL param change)
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

        if (!isMounted) return;
        let convList = convRes.conversations || [];
        setConnections(connRes.connections || []);

        const targetConvId = searchParams.get('conversationId');
        const targetUserId = searchParams.get('userId');
        const savedConvId = sessionStorage.getItem(LAST_CONV_STORAGE_KEY);

        let selectedConv = null;

        if (targetConvId) {
          selectedConv = convList.find((c) => String(c.id) === String(targetConvId)) || null;
        }

        if (!selectedConv && targetUserId && String(targetUserId) !== String(user?.id)) {
          const existing = convList.find(
            (c) => c.peer && String(c.peer.id) === String(targetUserId)
          );
          if (existing) {
            selectedConv = existing;
          } else {
            try {
              const created = await startConversation(targetUserId);
              if (created && created.conversation) {
                convList = [
                  created.conversation,
                  ...convList.filter((c) => String(c.id) !== String(created.conversation.id)),
                ];
                selectedConv = created.conversation;
              }
            } catch (createErr) {
              if (isMounted) {
                setErrorMessage(createErr.message || 'Could not start conversation with specified user.');
              }
            }
          }
        }

        if (!selectedConv && savedConvId) {
          selectedConv = convList.find((c) => String(c.id) === String(savedConvId)) || null;
        }

        if (!selectedConv && convList.length > 0) {
          selectedConv = convList[0];
        }

        setConversations(convList);

        if (selectedConv) {
          setActiveConvId(selectedConv.id);
          setActivePeer(selectedConv.peer);
          if (String(searchParams.get('conversationId') || '') !== String(selectedConv.id)) {
            const nextParams = { conversationId: String(selectedConv.id) };
            const startCallParam = searchParams.get('startCall');
            if (startCallParam) nextParams.startCall = startCallParam;
            setSearchParams(nextParams, { replace: true });
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

    // Poll conversations periodically for new messages & updated session status
    const pollInterval = setInterval(() => {
      getConversations()
        .then((res) => {
          if (isMounted && res && res.conversations) {
            setConversations(res.conversations);
            const currentId = activeConvIdRef.current;
            if (currentId) {
              const updatedActive = res.conversations.find((c) => String(c.id) === String(currentId));
              if (updatedActive && updatedActive.peer) {
                setActivePeer(updatedActive.peer);
              }
            }
          }
        })
        .catch(() => {});
    }, 8000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [isAuthenticated, user?.id]);

  // Sync active conversation if URL searchParams change externally (e.g., clicking a notification)
  useEffect(() => {
    if (!isAuthenticated || conversations.length === 0) return;
    const targetConvId = searchParams.get('conversationId');
    const targetUserId = searchParams.get('userId');

    if (targetConvId && String(targetConvId) !== String(activeConvId)) {
      const found = conversations.find((c) => String(c.id) === String(targetConvId));
      if (found) {
        setActiveConvId(found.id);
        setActivePeer(found.peer);
      }
    } else if (targetUserId && String(targetUserId) !== String(user?.id)) {
      const found = conversations.find((c) => c.peer && String(c.peer.id) === String(targetUserId));
      if (found && String(found.id) !== String(activeConvId)) {
        setActiveConvId(found.id);
        setActivePeer(found.peer);
      }
    }
  }, [searchParams, conversations, activeConvId, isAuthenticated, user?.id]);

  // Reset signaling cursor when switching conversations so recent signals in that conversation are fetched
  useEffect(() => {
    lastSignalSeqRef.current = 0;
    lastSignalTimeRef.current = Date.now() - 30000;
  }, [activeConvId]);

  // Refresh messages helper
  const refreshThreadMessages = useCallback(async (convIdToFetch) => {
    const targetId = convIdToFetch || activeConvIdRef.current;
    if (!targetId) return;
    try {
      const res = await getMessages(targetId);
      if (res && Array.isArray(res.messages) && String(targetId) === String(activeConvIdRef.current)) {
        setMessages(res.messages);
      }
    } catch (_) {}
  }, []);

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
          // Clear unread badge locally for this conversation
          setConversations((prev) =>
            prev.map((c) => (String(c.id) === String(activeConvId) ? { ...c, unread_count: 0 } : c))
          );
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

    // Poll current thread messages every 3.5 seconds for responsive chat
    const threadInterval = setInterval(() => {
      getMessages(activeConvId)
        .then((res) => {
          if (isMounted && res && Array.isArray(res.messages)) {
            setMessages(res.messages);
          }
        })
        .catch(() => {});
    }, 3500);

    return () => {
      isMounted = false;
      clearInterval(threadInterval);
    };
  }, [activeConvId, isAuthenticated]);

  // Send regular text message
  async function handleSendMessage(e) {
    e.preventDefault();
    if (!messageText.trim() || !activeConvId) return;

    const content = messageText.trim();
    setMessageText('');
    setIsSending(true);
    setErrorMessage(null);

    try {
      const res = await sendMessage(activeConvId, content);
      if (res && res.data) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === res.data.id)) return prev;
          return [...prev, res.data];
        });
        setConversations((prev) =>
          prev.map((c) =>
            String(c.id) === String(activeConvId)
              ? {
                  ...c,
                  last_message_content: content,
                  last_message_time: res.data.created_at || new Date().toISOString(),
                }
              : c
          )
        );
        if (callStatus !== 'idle') {
          sendCallSignal(activeConvId, 'chat_sync', { messageId: res.data.id }).catch(() => {});
        }
      }
    } catch (err) {
      setMessageText(content);
      setErrorMessage(err.message || 'Failed to send message.');
    } finally {
      setIsSending(false);
    }
  }

  // Handle file attachment selection (images, PDF, DOCX, XLSX)
  async function handleFileSelected(e) {
    const file = e.target.files?.[0];
    if (!file || !activeConvId) return;

    if (file.size === 0) {
      setErrorMessage('Cannot upload an empty (0-byte) file.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > MAX_ATTACHMENT_BYTES) {
      setErrorMessage('File exceeds the 15 MB upload limit.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const ext = (file.name.split('.').pop() || '').toLowerCase();
    const allowedExts = ['pdf', 'docx', 'xlsx', 'png', 'jpg', 'jpeg', 'webp', 'gif'];
    if (ext === 'svg' || (file.type && file.type.includes('svg'))) {
      setErrorMessage('SVG files are not permitted for security reasons. Please upload PNG, JPG, WebP, or GIF images.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    if (!allowedExts.includes(ext)) {
      setErrorMessage('Unsupported file type. Allowed formats: PDF, DOCX, XLSX, PNG, JPG, WebP, and GIF.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploadingAttachment(true);
    setErrorMessage(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await uploadAttachment(activeConvId, formData);
      if (res && res.message) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === res.message.id)) return prev;
          return [...prev, res.message];
        });
        setConversations((prev) =>
          prev.map((c) =>
            String(c.id) === String(activeConvId)
              ? {
                  ...c,
                  last_message_content: `[Attachment] ${file.name}`,
                  last_message_time: res.message.created_at || new Date().toISOString(),
                }
              : c
          )
        );
        if (callStatus !== 'idle') {
          sendCallSignal(activeConvId, 'chat_sync', { messageId: res.message.id }).catch(() => {});
        }
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to upload attachment.');
    } finally {
      setIsUploadingAttachment(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  // Clear voice preview URL when discarded
  const clearVoicePreview = useCallback(() => {
    setVoicePreview((prev) => {
      if (prev && prev.url) {
        try {
          URL.revokeObjectURL(prev.url);
        } catch (_) {}
      }
      return null;
    });
  }, []);

  // Upload a recorded voice note blob
  const uploadVoiceBlob = useCallback(
    async (audioBlob, durationSec, ext = 'webm') => {
      if (!activeConvId) return;
      if (!audioBlob || audioBlob.size === 0) {
        setErrorMessage('Recorded voice note was empty. Please check your microphone and try again.');
        return;
      }
      if (audioBlob.size > MAX_VOICE_BYTES) {
        setErrorMessage('Voice note exceeds the 10 MB limit. Please record a shorter message.');
        return;
      }

      const finalDuration = Math.max(1, Math.min(Math.round(durationSec || 1), MAX_VOICE_DURATION_SECONDS));
      const formData = new FormData();
      formData.append('file', audioBlob, `voice_note_${Date.now()}.${ext}`);
      formData.append('durationSeconds', String(finalDuration));

      setIsSending(true);
      setErrorMessage(null);
      try {
        const res = await uploadAttachment(activeConvId, formData);
        if (res && res.message) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === res.message.id)) return prev;
            return [...prev, res.message];
          });
          setConversations((prev) =>
            prev.map((c) =>
              String(c.id) === String(activeConvId)
                ? {
                    ...c,
                    last_message_content: `Audio Voice Note (${finalDuration}s)`,
                    last_message_time: res.message.created_at || new Date().toISOString(),
                  }
                : c
            )
          );
          clearVoicePreview();
          if (callStatusRef.current !== 'idle') {
            sendCallSignal(activeConvId, 'chat_sync', { messageId: res.message.id }).catch(() => {});
          }
        }
      } catch (err) {
        setErrorMessage(err.message || 'Failed to send voice note.');
      } finally {
        setIsSending(false);
        setRecordingSeconds(0);
      }
    },
    [activeConvId, clearVoicePreview]
  );

  // Start recording audio voice note
  async function startVoiceRecording() {
    setErrorMessage(null);
    setPermissionError(null);
    clearVoicePreview();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setPermissionError({
        type: 'device_error',
        context: 'voice',
        message: 'Audio recording is not supported in this browser or non-secure context (use localhost or HTTPS).',
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      audioChunksRef.current = [];
      const config = getSupportedVoiceRecorderConfig();
      voiceConfigRef.current = config;

      const recorder = config.mimeType
        ? new MediaRecorder(stream, { mimeType: config.mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recordingStartAtRef.current = Date.now();

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.start(200);
      setIsRecordingVoice(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - (recordingStartAtRef.current || Date.now())) / 1000);
        setRecordingSeconds(elapsed);
        if (elapsed >= MAX_VOICE_DURATION_SECONDS) {
          stopVoiceRecordingForPreview();
        }
      }, 500);
    } catch (err) {
      const isDenied = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError';
      setPermissionError({
        type: isDenied ? 'permission_denied' : 'device_error',
        context: 'voice',
        message: isDenied
          ? 'Microphone access was blocked by your browser. Please allow microphone permission in your browser address bar to record a voice note.'
          : `Could not access microphone: ${err.message || 'No microphone detected.'}`,
      });
    }
  }

  // Cancel recording voice note
  function cancelVoiceRecording() {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (mediaRecorderRef.current) {
      try {
        mediaRecorderRef.current.onstop = null;
        if (mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
        mediaRecorderRef.current.stream?.getTracks().forEach((t) => t.stop());
      } catch (_) {}
      mediaRecorderRef.current = null;
    }
    setIsRecordingVoice(false);
    setRecordingSeconds(0);
    audioChunksRef.current = [];
    clearVoicePreview();
  }

  // Stop recording and show preview player before sending
  function stopVoiceRecordingForPreview() {
    if (!mediaRecorderRef.current) return;
    const recorder = mediaRecorderRef.current;
    const elapsed = Math.max(
      1,
      recordingSeconds || Math.round((Date.now() - (recordingStartAtRef.current || Date.now())) / 1000)
    );
    const { ext, baseMime } = voiceConfigRef.current;

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setIsRecordingVoice(false);

    recorder.onstop = () => {
      try {
        recorder.stream?.getTracks().forEach((t) => t.stop());
      } catch (_) {}
      const blob = new Blob(audioChunksRef.current, { type: baseMime || 'audio/webm' });
      audioChunksRef.current = [];
      if (blob.size === 0) {
        setErrorMessage('No audio data was captured. Please check your microphone input.');
        return;
      }
      const url = URL.createObjectURL(blob);
      setVoicePreview({
        blob,
        url,
        duration: elapsed,
        ext: ext || 'webm',
        mimeType: baseMime || 'audio/webm',
      });
    };

    try {
      if (recorder.state !== 'inactive') {
        recorder.stop();
      }
    } catch (_) {}
  }

  // Finish and immediately send voice note
  async function sendVoiceRecording() {
    if (voicePreview && voicePreview.blob) {
      await uploadVoiceBlob(voicePreview.blob, voicePreview.duration, voicePreview.ext);
      return;
    }

    if (!mediaRecorderRef.current || !activeConvId) return;

    const recorder = mediaRecorderRef.current;
    const elapsed = Math.max(
      1,
      recordingSeconds || Math.round((Date.now() - (recordingStartAtRef.current || Date.now())) / 1000)
    );
    const { ext, baseMime } = voiceConfigRef.current;

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setIsRecordingVoice(false);

    recorder.onstop = async () => {
      try {
        recorder.stream?.getTracks().forEach((t) => t.stop());
      } catch (_) {}
      const audioBlob = new Blob(audioChunksRef.current, { type: baseMime || 'audio/webm' });
      audioChunksRef.current = [];
      await uploadVoiceBlob(audioBlob, elapsed, ext || 'webm');
    };

    try {
      if (recorder.state !== 'inactive') {
        recorder.stop();
      }
    } catch (_) {}
  }

  // --------------------------------------------------------------------------
  // WEBRTC CALLING LOGIC (Audio & Video Direct In-Website Calls)
  // --------------------------------------------------------------------------

  // Helper to acquire local audio or video stream with graceful fallbacks
  async function acquireMediaStream(mode) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('WebRTC media devices are not available in this browser context (requires localhost or HTTPS).');
    }

    const audioConstraints = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    };

    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
        video: mode === 'video' ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false,
      });
    } catch (err) {
      // If video requested but no camera device is connected/found or camera is busy, fall back to audio-only
      if (
        mode === 'video' &&
        (err.name === 'NotFoundError' ||
          err.name === 'DevicesNotFoundError' ||
          err.name === 'OverconstrainedError' ||
          err.name === 'NotReadableError')
      ) {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints, video: false });
        setCallMode('audio');
        setIsVideoDisabled(true);
        return audioStream;
      }
      throw err;
    }
  }

  // Synchronize local and remote media streams to video and audio elements whenever call status, mode, or tracks update
  useEffect(() => {
    const activeLocalStream = screenStreamRef.current || localStreamRef.current;
    if (localVideoRef.current && activeLocalStream) {
      if (localVideoRef.current.srcObject !== activeLocalStream) {
        localVideoRef.current.srcObject = activeLocalStream;
      }
      localVideoRef.current.play().catch(() => {});
    }

    if (remoteStreamRef.current) {
      if (remoteAudioRef.current) {
        if (remoteAudioRef.current.srcObject !== remoteStreamRef.current) {
          remoteAudioRef.current.srcObject = remoteStreamRef.current;
        }
        remoteAudioRef.current.play().catch(() => {});
      }
      if (remoteVideoRef.current) {
        if (remoteVideoRef.current.srcObject !== remoteStreamRef.current) {
          remoteVideoRef.current.srcObject = remoteStreamRef.current;
        }
        remoteVideoRef.current.play().catch(() => {});
      }
    }
  }, [callStatus, callMode, isScreenSharing, hasRemoteVideoTrack, streamVersion]);

  // Start the connected call duration timer if not already running
  const startCallDurationTimer = useCallback(() => {
    if (ringingTimeoutRef.current) {
      clearTimeout(ringingTimeoutRef.current);
      ringingTimeoutRef.current = null;
    }
    if (!callTimerRef.current) {
      callDurationRef.current = 0;
      setCallDuration(0);
      callTimerRef.current = setInterval(() => {
        callDurationRef.current += 1;
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
  }, []);

  // Configure RTCPeerConnection event handlers (ontrack, onicecandidate, state transitions)
  const createConfiguredPeerConnection = useCallback(
    (convIdForCall) => {
      if (pcRef.current) {
        try {
          pcRef.current.close();
        } catch (_) {}
      }

      const pc = new RTCPeerConnection({ iceServers: iceServersRef.current });
      pcRef.current = pc;

      if (!remoteStreamRef.current) {
        remoteStreamRef.current = new MediaStream();
      }

      pc.ontrack = (event) => {
        let targetStream = remoteStreamRef.current;
        if (!targetStream) {
          targetStream = new MediaStream();
          remoteStreamRef.current = targetStream;
        }

        if (event.streams && event.streams[0]) {
          event.streams[0].getTracks().forEach((t) => {
            if (!targetStream.getTracks().some((existing) => existing.id === t.id)) {
              targetStream.addTrack(t);
            }
          });
        } else if (event.track) {
          if (!targetStream.getTracks().some((existing) => existing.id === event.track.id)) {
            targetStream.addTrack(event.track);
          }
        }

        const hasVideo = targetStream.getVideoTracks().length > 0;
        setHasRemoteVideoTrack(hasVideo);
        if (hasVideo) {
          event.track.onunmute = () => setStreamVersion((v) => v + 1);
        }
        setStreamVersion((v) => v + 1);

        if (remoteAudioRef.current) {
          if (remoteAudioRef.current.srcObject !== targetStream) {
            remoteAudioRef.current.srcObject = targetStream;
          }
          remoteAudioRef.current.play().catch(() => {});
        }
        if (remoteVideoRef.current) {
          if (remoteVideoRef.current.srcObject !== targetStream) {
            remoteVideoRef.current.srcObject = targetStream;
          }
          remoteVideoRef.current.play().catch(() => {});
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && convIdForCall) {
          sendCallSignal(convIdForCall, 'candidate', {
            candidate: event.candidate,
            callId: activeCallIdRef.current,
          }).catch(() => {});
        }
      };

      const handleStateChange = () => {
        if (pcRef.current !== pc) return;
        const iceState = pc.iceConnectionState;
        const connState = pc.connectionState;

        if (iceState === 'checking' || connState === 'connecting') {
          setConnectionState((prev) => (prev === 'connected' ? 'connected' : 'connecting'));
        }

        if (iceState === 'connected' || iceState === 'completed' || connState === 'connected') {
          if (disconnectTimeoutRef.current) {
            clearTimeout(disconnectTimeoutRef.current);
            disconnectTimeoutRef.current = null;
          }
          setConnectionState('connected');
          setCallStatus('connected');
          setCallStatusNotice(null);
          startCallDurationTimer();
          sendCallSignal(convIdForCall, 'connected', { callId: activeCallIdRef.current }).catch(() => {});
        } else if (iceState === 'disconnected' || connState === 'disconnected') {
          setConnectionState('disconnected');
          setCallStatus('disconnected');
          setCallStatusNotice('Network interruption detected — attempting to reconnect...');
          if (!disconnectTimeoutRef.current) {
            disconnectTimeoutRef.current = setTimeout(() => {
              if (pcRef.current === pc && (pc.iceConnectionState === 'disconnected' || pc.connectionState === 'disconnected')) {
                try {
                  if (typeof pc.restartIce === 'function') pc.restartIce();
                } catch (_) {}
              }
            }, 3500);
          }
        } else if (iceState === 'failed' || connState === 'failed') {
          if (disconnectTimeoutRef.current) {
            clearTimeout(disconnectTimeoutRef.current);
            disconnectTimeoutRef.current = null;
          }
          setConnectionState('failed');
          setCallStatus('failed');
          setCallStatusNotice(
            'Peer-to-peer media connection failed. If you and your partner are on different restrictive networks or symmetric NATs, configure TURN_SERVER_URL in backend/.env.'
          );
          sendCallSignal(convIdForCall, 'failed', {
            reason: 'failed',
            callId: activeCallIdRef.current,
          }).catch(() => {});
          releaseCallResources();
          refreshThreadMessages(convIdForCall);
        }
      };

      pc.oniceconnectionstatechange = handleStateChange;
      pc.onconnectionstatechange = handleStateChange;

      return pc;
    },
    [refreshThreadMessages, releaseCallResources, startCallDurationTimer]
  );

  // Flush queued ICE candidates once remoteDescription is set
  const flushCandidateQueue = useCallback(async (pc) => {
    if (!pc || !pc.remoteDescription) return;
    const queued = [...candidateQueueRef.current];
    candidateQueueRef.current = [];
    for (const rawCand of queued) {
      const candObj = rawCand?.candidate ? rawCand.candidate : rawCand;
      if (!candObj) continue;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candObj));
      } catch (_) {}
    }
  }, []);

  // Initiate an outgoing call
  async function initiateCall(mode = 'video') {
    if (!activeConvId) return;

    const activeConv = conversations.find((c) => String(c.id) === String(activeConvId));
    if (activeConv?.is_closed) {
      setErrorMessage('Cannot start a call in a closed conversation.');
      return;
    }
    if (activeConv?.session_status && !['accepted', 'confirmed'].includes(activeConv.session_status)) {
      setErrorMessage(`In-website calls require an accepted session (current status: "${activeConv.session_status}").`);
      return;
    }

    try {
      releaseCallResources();
      const callId = `call_${activeConvId}_${Date.now()}`;
      activeCallIdRef.current = callId;

      setCallMode(mode);
      setCallStatus('outgoing');
      setConnectionState('calling');
      setCallStatusNotice(`Calling ${activePeer?.name || 'participant'}...`);
      setErrorMessage(null);
      setPermissionError(null);
      setIsMicMuted(false);
      setIsVideoDisabled(mode === 'audio');
      setRemoteMediaState({ micMuted: false, cameraOff: mode === 'audio', screenSharing: false });

      const stream = await acquireMediaStream(mode);
      localStreamRef.current = stream;
      setStreamVersion((v) => v + 1);

      const pc = createConfiguredPeerConnection(activeConvId);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // Notify peer that call started
      const startRes = await sendCallSignal(activeConvId, 'start', {
        mode,
        callId,
        callerName: user?.name || 'Peer',
      });
      if (startRes?.latestSeq) {
        lastSignalSeqRef.current = Math.max(lastSignalSeqRef.current, startRes.latestSeq);
      }

      // Create and send WebRTC offer
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await pc.setLocalDescription(offer);
      const offerRes = await sendCallSignal(activeConvId, 'offer', {
        offer,
        sdp: offer,
        mode,
        callId,
      });
      if (offerRes?.latestSeq) {
        lastSignalSeqRef.current = Math.max(lastSignalSeqRef.current, offerRes.latestSeq);
      }

      // Set ringing timeout so unanswered calls transition cleanly to 'missed'
      ringingTimeoutRef.current = setTimeout(() => {
        if (
          callStatusRef.current === 'outgoing' ||
          callStatusRef.current === 'connecting'
        ) {
          sendCallSignal(activeConvId, 'missed', {
            reason: 'missed',
            mode,
            callId,
          }).catch(() => {});
          releaseCallResources();
          setCallStatus('missed');
          setConnectionState('missed');
          setCallStatusNotice(`${activePeer?.name || 'Participant'} did not answer the call.`);
          refreshThreadMessages(activeConvId);
        }
      }, RINGING_TIMEOUT_MS);

      refreshThreadMessages(activeConvId);
    } catch (err) {
      cleanupCall();
      const isDenied = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError';
      setPermissionError({
        type: isDenied ? 'permission_denied' : 'device_error',
        context: 'call',
        message: isDenied
          ? 'Microphone or camera access was blocked by your browser. Please allow permission via the camera/lock icon in your browser address bar and click Try Again.'
          : (err.message || 'Media permission denied or no camera/microphone found.'),
        mode,
        isIncoming: false,
      });
    }
  }

  // Trigger auto-call if navigated from LearningHistory with ?startCall=video|audio
  useEffect(() => {
    const startCallMode = searchParams.get('startCall');
    if (
      startCallMode &&
      activeConvId &&
      activePeer &&
      !isLoadingList &&
      callStatus === 'idle' &&
      !autoStartedCallRef.current
    ) {
      const activeConv = conversations.find((c) => String(c.id) === String(activeConvId));
      if (activeConv && ['accepted', 'confirmed'].includes(activeConv.session_status)) {
        autoStartedCallRef.current = true;
        setSearchParams({ conversationId: String(activeConvId) }, { replace: true });
        initiateCall(startCallMode === 'audio' ? 'audio' : 'video');
      }
    }
  }, [searchParams, activeConvId, activePeer, isLoadingList, callStatus, conversations, setSearchParams]);

  // Accept an incoming call
  async function acceptIncomingCall(overrideCallData = null) {
    const callData = overrideCallData || incomingCallData;
    const targetConvId = callData?.conversationId || activeConvId;
    if (!targetConvId) return;

    try {
      const mode = callData?.mode || 'video';
      activeCallIdRef.current = callData?.callId || `call_${targetConvId}_${Date.now()}`;

      setCallMode(mode);
      setCallStatus('connecting');
      setConnectionState('connecting');
      setCallStatusNotice('Connecting audio/video...');
      setPermissionError(null);
      setIsMicMuted(false);
      setIsVideoDisabled(mode === 'audio');

      await sendCallSignal(targetConvId, 'accept', {
        callId: activeCallIdRef.current,
        mode,
      }).catch(() => {});

      const stream = await acquireMediaStream(mode);
      localStreamRef.current = stream;
      setStreamVersion((v) => v + 1);

      const pc = createConfiguredPeerConnection(targetConvId);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      let offerToUse = callData?.offer || remoteOfferRef.current;
      // If offer hasn't arrived yet in state, fetch latest activeCall from signaling endpoint
      if (!offerToUse) {
        const latestSigRes = await getCallSignals(targetConvId, { sinceSeq: 0, since: Date.now() - 60000 }).catch(() => null);
        if (latestSigRes?.activeCall?.offer) {
          offerToUse = latestSigRes.activeCall.offer.offer || latestSigRes.activeCall.offer;
        } else if (Array.isArray(latestSigRes?.signals)) {
          const offerSig = [...latestSigRes.signals].reverse().find((s) => s.type === 'offer');
          if (offerSig) {
            offerToUse = offerSig.payload?.offer || offerSig.payload?.sdp || offerSig.payload;
          }
          for (const s of latestSigRes.signals) {
            if (s.type === 'candidate' && s.payload) {
              candidateQueueRef.current.push(s.payload.candidate || s.payload);
            }
          }
        }
      }

      if (offerToUse) {
        const normalizedOffer = offerToUse.offer || offerToUse.sdp || offerToUse;
        await pc.setRemoteDescription(new RTCSessionDescription(normalizedOffer));
        await flushCandidateQueue(pc);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        const ansRes = await sendCallSignal(targetConvId, 'answer', {
          answer,
          sdp: answer,
          callId: activeCallIdRef.current,
        });
        if (ansRes?.latestSeq) {
          lastSignalSeqRef.current = Math.max(lastSignalSeqRef.current, ansRes.latestSeq);
        }
      }

      setIncomingCallData(null);
      setOtherConvIncomingCall(null);
      startCallDurationTimer();
    } catch (err) {
      cleanupCall();
      const isDenied = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError';
      setPermissionError({
        type: isDenied ? 'permission_denied' : 'device_error',
        context: 'call',
        message: isDenied
          ? 'Microphone or camera access was blocked by your browser. Please allow permission via the camera/lock icon in your address bar and click Try Again.'
          : (err.message || 'Media permission denied or device unavailable.'),
        mode: callData?.mode || 'video',
        isIncoming: true,
      });
    }
  }

  // Decline incoming call
  async function declineIncomingCall(targetConvIdOverride = null) {
    const targetConvId = targetConvIdOverride || incomingCallData?.conversationId || activeConvId;
    if (targetConvId) {
      await sendCallSignal(targetConvId, 'decline', {
        reason: 'declined',
        mode: incomingCallData?.mode || callMode,
        callId: incomingCallData?.callId || activeCallIdRef.current,
      }).catch(() => {});
      refreshThreadMessages(targetConvId);
    }
    releaseCallResources();
    setIncomingCallData(null);
    setOtherConvIncomingCall(null);
    setCallStatus('declined');
    setConnectionState('declined');
    setCallStatusNotice('You declined the incoming call.');
  }

  // End active or ringing call
  async function endCall() {
    const duration = callDurationRef.current;
    const currentStatus = callStatusRef.current;
    if (activeConvId) {
      if (currentStatus === 'outgoing' && duration === 0) {
        await sendCallSignal(activeConvId, 'missed', {
          reason: 'missed',
          mode: callMode,
          callId: activeCallIdRef.current,
        }).catch(() => {});
      } else {
        await sendCallSignal(activeConvId, 'end', {
          duration,
          callId: activeCallIdRef.current,
        }).catch(() => {});
      }
      refreshThreadMessages(activeConvId);
    }
    cleanupCall();
  }

  // Retry ICE negotiation when in disconnected state
  async function retryReconnectCall() {
    if (!pcRef.current || !activeConvId) {
      initiateCall(callMode);
      return;
    }
    try {
      setConnectionState('connecting');
      setCallStatus('connecting');
      setCallStatusNotice('Re-negotiating peer connection...');
      const offer = await pcRef.current.createOffer({ iceRestart: true });
      await pcRef.current.setLocalDescription(offer);
      await sendCallSignal(activeConvId, 'offer', {
        offer,
        sdp: offer,
        mode: callMode,
        callId: activeCallIdRef.current,
        iceRestart: true,
      });
    } catch (_) {
      initiateCall(callMode);
    }
  }

  // Stop screen sharing and revert to camera track (safe to call from button OR native browser onended)
  const stopScreenShare = useCallback(async () => {
    if (screenTrackRef.current) {
      try {
        screenTrackRef.current.onended = null;
        screenTrackRef.current.stop();
      } catch (_) {}
      screenTrackRef.current = null;
    }
    if (screenStreamRef.current) {
      try {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
      } catch (_) {}
      screenStreamRef.current = null;
    }

    const camTrack = localStreamRef.current?.getVideoTracks()[0] || null;
    if (pcRef.current) {
      const videoSender = pcRef.current
        .getSenders()
        .find((s) => (s.track && s.track.kind === 'video') || !s.track);
      if (videoSender && camTrack) {
        try {
          await videoSender.replaceTrack(camTrack);
        } catch (_) {}
      }
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current || null;
      localVideoRef.current.play().catch(() => {});
    }

    setIsScreenSharing(false);
    setStreamVersion((v) => v + 1);
    if (activeConvIdRef.current) {
      sendCallSignal(activeConvIdRef.current, 'media-state', {
        screenSharing: false,
        cameraOff: !camTrack || !camTrack.enabled,
      }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    stopScreenShareRef.current = stopScreenShare;
  }, [stopScreenShare]);

  // Start screen sharing
  async function startScreenShare() {
    if (!pcRef.current) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      setErrorMessage('Screen sharing is not supported in this browser.');
      return;
    }

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: false,
      });
      const screenTrack = displayStream.getVideoTracks()[0];
      if (!screenTrack) return;

      screenStreamRef.current = displayStream;
      screenTrackRef.current = screenTrack;

      const videoSender = pcRef.current
        .getSenders()
        .find((s) => s.track && s.track.kind === 'video');

      if (videoSender) {
        await videoSender.replaceTrack(screenTrack);
      } else {
        pcRef.current.addTrack(screenTrack, localStreamRef.current || displayStream);
        const offer = await pcRef.current.createOffer();
        await pcRef.current.setLocalDescription(offer);
        if (activeConvId) {
          await sendCallSignal(activeConvId, 'offer', {
            offer,
            sdp: offer,
            mode: 'video',
            callId: activeCallIdRef.current,
          });
        }
      }

      if (callMode !== 'video') {
        setCallMode('video');
      }

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = displayStream;
        localVideoRef.current.play().catch(() => {});
      }

      screenTrack.onended = () => {
        if (stopScreenShareRef.current) {
          stopScreenShareRef.current();
        }
      };

      setIsScreenSharing(true);
      setStreamVersion((v) => v + 1);
      if (activeConvId) {
        sendCallSignal(activeConvId, 'media-state', {
          screenSharing: true,
          cameraOff: false,
        }).catch(() => {});
      }
    } catch (err) {
      if (err.name !== 'NotAllowedError') {
        setErrorMessage('Could not start screen sharing: ' + (err.message || 'Cancelled.'));
      }
    }
  }

  // Toggle screen share
  async function toggleScreenShare() {
    if (isScreenSharing) {
      await stopScreenShare();
    } else {
      await startScreenShare();
    }
  }

  // Toggle microphone
  function toggleMic() {
    if (!localStreamRef.current) return;
    const audioTracks = localStreamRef.current.getAudioTracks();
    if (audioTracks.length > 0) {
      const nextEnabled = !audioTracks[0].enabled;
      audioTracks.forEach((t) => {
        t.enabled = nextEnabled;
      });
      const muted = !nextEnabled;
      setIsMicMuted(muted);
      if (activeConvId) {
        sendCallSignal(activeConvId, 'media-state', { micMuted: muted }).catch(() => {});
      }
    }
  }

  // Toggle camera on/off (including acquiring video if call started as audio-only)
  async function toggleCamera() {
    if (!localStreamRef.current) return;
    const videoTracks = localStreamRef.current.getVideoTracks();

    if (videoTracks.length > 0) {
      const nextEnabled = !videoTracks[0].enabled;
      videoTracks.forEach((t) => {
        t.enabled = nextEnabled;
      });
      const disabled = !nextEnabled;
      setIsVideoDisabled(disabled);
      setStreamVersion((v) => v + 1);
      if (activeConvId) {
        sendCallSignal(activeConvId, 'media-state', { cameraOff: disabled }).catch(() => {});
      }
    } else {
      // No video track yet (e.g. started as audio call) -> acquire camera and attach
      try {
        const camStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        });
        const newVideoTrack = camStream.getVideoTracks()[0];
        if (!newVideoTrack) return;

        localStreamRef.current.addTrack(newVideoTrack);
        setCallMode('video');
        setIsVideoDisabled(false);
        setStreamVersion((v) => v + 1);

        if (pcRef.current) {
          const sender = pcRef.current.getSenders().find((s) => s.track && s.track.kind === 'video');
          if (sender) {
            await sender.replaceTrack(newVideoTrack);
          } else {
            pcRef.current.addTrack(newVideoTrack, localStreamRef.current);
            const offer = await pcRef.current.createOffer();
            await pcRef.current.setLocalDescription(offer);
            if (activeConvId) {
              await sendCallSignal(activeConvId, 'offer', {
                offer,
                sdp: offer,
                mode: 'video',
                callId: activeCallIdRef.current,
              });
            }
          }
        }
        if (activeConvId) {
          sendCallSignal(activeConvId, 'media-state', { cameraOff: false }).catch(() => {});
        }
      } catch (err) {
        setErrorMessage('Could not enable camera: ' + (err.message || 'Camera unavailable.'));
      }
    }
  }

  // Send in-call floating reaction emoji
  function sendCallReaction(emoji) {
    if (!activeConvId) return;
    sendCallSignal(activeConvId, 'reaction', { emoji }).catch(() => {});
    triggerFloatingReaction(emoji);
  }

  function triggerFloatingReaction(emoji) {
    const id = Date.now() + Math.random();
    const x = Math.floor(Math.random() * 60) + 20; // 20% to 80%
    setFloatingReactions((prev) => [...prev, { id, emoji, x }]);
    setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((r) => r.id !== id));
    }, 2500);
  }

  // Send message from in-call chat (persists to the same conversation in PostgreSQL)
  async function handleSendInCallMessage(e) {
    e.preventDefault();
    if (!inCallText.trim() || !activeConvId) return;

    const content = inCallText.trim();
    setInCallText('');

    try {
      const res = await sendMessage(activeConvId, content);
      if (res && res.data) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === res.data.id)) return prev;
          return [...prev, res.data];
        });
        setConversations((prev) =>
          prev.map((c) =>
            String(c.id) === String(activeConvId)
              ? {
                  ...c,
                  last_message_content: content,
                  last_message_time: res.data.created_at || new Date().toISOString(),
                }
              : c
          )
        );
        sendCallSignal(activeConvId, 'chat_sync', { messageId: res.data.id }).catch(() => {});
      }
    } catch (err) {
      setInCallText(content);
      setErrorMessage(err.message || 'Failed to send message during call.');
    }
  }

  // Signaling polling loop (fast 700ms during call activity, 1500ms idle)
  useEffect(() => {
    if (!activeConvId || !isAuthenticated) return;

    let isMounted = true;
    const isBusyCall = ['outgoing', 'incoming', 'connecting', 'connected', 'disconnected'].includes(callStatus);
    const pollIntervalTime = isBusyCall ? 700 : 1500;

    const pollSignals = async () => {
      try {
        const res = await getCallSignals(activeConvId, {
          sinceSeq: lastSignalSeqRef.current,
          since: lastSignalTimeRef.current,
        });
        if (!isMounted || !res) return;

        if (typeof res.latestSeq === 'number' && res.latestSeq > lastSignalSeqRef.current) {
          lastSignalSeqRef.current = res.latestSeq;
        }
        if (res.serverTime) {
          lastSignalTimeRef.current = res.serverTime;
        }

        // Check for ringing incoming call in another conversation
        if (Array.isArray(res.incomingCalls)) {
          const otherIncoming = res.incomingCalls.find(
            (ic) => String(ic.conversationId) !== String(activeConvId)
          );
          setOtherConvIncomingCall(otherIncoming || null);
        }

        // Recover incoming ringing call if user just opened/switched to this conversation
        if (
          res.activeCall &&
          res.activeCall.status === 'ringing' &&
          res.activeCall.calleeId === user?.id &&
          (callStatus === 'idle' || callStatus === 'declined' || callStatus === 'missed' || callStatus === 'failed')
        ) {
          const offerObj = res.activeCall.offer?.offer || res.activeCall.offer || null;
          if (offerObj) remoteOfferRef.current = offerObj;
          if (Array.isArray(res.activeCall.candidates)) {
            for (const c of res.activeCall.candidates) {
              if (c.from !== user?.id && c.candidate) {
                const key = JSON.stringify(c.candidate);
                if (!processedCandidateKeysRef.current.has(key)) {
                  processedCandidateKeysRef.current.add(key);
                  candidateQueueRef.current.push(c.candidate);
                }
              }
            }
          }
          activeCallIdRef.current = res.activeCall.callId;
          setIncomingCallData({
            conversationId: activeConvId,
            callId: res.activeCall.callId,
            from: res.activeCall.callerId,
            callerName: res.activeCall.callerName || activePeer?.name || 'Peer',
            mode: res.activeCall.mode || 'video',
            offer: offerObj,
          });
          setCallStatus('incoming');
          setConnectionState('incoming');
        }

        if (!Array.isArray(res.signals) || res.signals.length === 0) return;

        for (const sig of res.signals) {
          const payload = sig.payload || {};

          if (sig.type === 'start') {
            if (['idle', 'declined', 'missed', 'failed'].includes(callStatusRef.current)) {
              activeCallIdRef.current = payload.callId || `call_${activeConvId}_${sig.timestamp}`;
              setCallStatusNotice(null);
              setIncomingCallData({
                conversationId: activeConvId,
                callId: activeCallIdRef.current,
                from: sig.from,
                callerName: payload.callerName || activePeer?.name || 'Peer',
                mode: payload.mode || 'video',
              });
              setCallStatus('incoming');
              setConnectionState('incoming');
            }
          } else if (sig.type === 'offer') {
            const offerSdp = payload.offer || payload.sdp || payload;
            remoteOfferRef.current = offerSdp;

            if (['idle', 'incoming', 'declined', 'missed', 'failed'].includes(callStatusRef.current)) {
              activeCallIdRef.current = payload.callId || activeCallIdRef.current;
              setIncomingCallData((prev) => ({
                ...(prev || {}),
                conversationId: activeConvId,
                callId: payload.callId || prev?.callId || activeCallIdRef.current,
                from: sig.from,
                callerName: payload.callerName || prev?.callerName || activePeer?.name || 'Peer',
                mode: payload.mode || prev?.mode || 'video',
                offer: offerSdp,
              }));
              setCallStatus('incoming');
              setConnectionState('incoming');
            } else if (pcRef.current) {
              // Mid-call renegotiation (e.g. screen share or camera track added or ICE restart)
              try {
                await pcRef.current.setRemoteDescription(new RTCSessionDescription(offerSdp));
                await flushCandidateQueue(pcRef.current);
                const answer = await pcRef.current.createAnswer();
                await pcRef.current.setLocalDescription(answer);
                await sendCallSignal(activeConvId, 'answer', {
                  answer,
                  sdp: answer,
                  callId: activeCallIdRef.current,
                });
                if (payload.mode === 'video') {
                  setCallMode('video');
                }
              } catch (_) {}
            }
          } else if (sig.type === 'accept') {
            if (callStatusRef.current === 'outgoing') {
              setConnectionState('connecting');
              setCallStatusNotice(`${activePeer?.name || 'Participant'} accepted — connecting media...`);
            }
          } else if (sig.type === 'answer') {
            const answerSdp = payload.answer || payload.sdp || payload;
            if (pcRef.current && answerSdp) {
              try {
                await pcRef.current.setRemoteDescription(new RTCSessionDescription(answerSdp));
                await flushCandidateQueue(pcRef.current);
                setCallStatus('connected');
                setConnectionState('connected');
                setCallStatusNotice(null);
                startCallDurationTimer();
              } catch (_) {}
            }
          } else if (sig.type === 'connected') {
            if (['outgoing', 'connecting', 'disconnected'].includes(callStatusRef.current)) {
              setCallStatus('connected');
              setConnectionState('connected');
              setCallStatusNotice(null);
              startCallDurationTimer();
            }
          } else if (sig.type === 'candidate') {
            const candObj = payload.candidate || payload;
            if (candObj) {
              const key = JSON.stringify(candObj);
              if (!processedCandidateKeysRef.current.has(key)) {
                processedCandidateKeysRef.current.add(key);
                if (pcRef.current && pcRef.current.remoteDescription) {
                  try {
                    await pcRef.current.addIceCandidate(new RTCIceCandidate(candObj));
                  } catch (_) {}
                } else {
                  candidateQueueRef.current.push(candObj);
                }
              }
            }
          } else if (sig.type === 'media-state') {
            setRemoteMediaState((prev) => ({
              ...prev,
              ...(payload || {}),
            }));
            if (payload.screenSharing) {
              setCallMode('video');
            }
          } else if (sig.type === 'chat_sync') {
            refreshThreadMessages(activeConvId);
          } else if (sig.type === 'reaction') {
            if (payload.emoji) {
              triggerFloatingReaction(payload.emoji);
            }
          } else if (sig.type === 'decline' || (sig.type === 'end' && payload.reason === 'declined')) {
            releaseCallResources();
            setIncomingCallData(null);
            setCallStatus('declined');
            setConnectionState('declined');
            setCallStatusNotice(`${activePeer?.name || 'Participant'} declined the call.`);
            refreshThreadMessages(activeConvId);
          } else if (sig.type === 'missed' || (sig.type === 'end' && payload.reason === 'missed')) {
            releaseCallResources();
            setIncomingCallData(null);
            setCallStatus('missed');
            setConnectionState('missed');
            setCallStatusNotice(`Missed call from ${activePeer?.name || 'participant'}.`);
            refreshThreadMessages(activeConvId);
          } else if (sig.type === 'failed' || (sig.type === 'end' && payload.reason === 'failed')) {
            releaseCallResources();
            setIncomingCallData(null);
            setCallStatus('failed');
            setConnectionState('failed');
            setCallStatusNotice('Call failed to establish a media connection.');
            refreshThreadMessages(activeConvId);
          } else if (sig.type === 'end') {
            cleanupCall();
            refreshThreadMessages(activeConvId);
          }
        }
      } catch (_) {}
    };

    pollSignals();
    const signalPoll = setInterval(pollSignals, pollIntervalTime);

    return () => {
      isMounted = false;
      clearInterval(signalPoll);
    };
  }, [
    activeConvId,
    activePeer?.name,
    isAuthenticated,
    callStatus,
    user?.id,
    cleanupCall,
    releaseCallResources,
    flushCandidateQueue,
    refreshThreadMessages,
    startCallDurationTimer,
  ]);

  function selectConversation(conv) {
    if (String(conv.id) === String(activeConvId)) return;
    if (['outgoing', 'incoming', 'connecting', 'connected', 'disconnected'].includes(callStatus)) {
      sendCallSignal(activeConvId, 'end', { duration: callDurationRef.current }).catch(() => {});
    }
    cleanupCall();
    cancelVoiceRecording();
    setActiveConvId(conv.id);
    setActivePeer(conv.peer);
    setSearchParams({ conversationId: String(conv.id) });
  }

  // Format call duration MM:SS
  const formatDuration = (totalSec) => {
    const safeSec = Math.max(0, Math.floor(Number(totalSec) || 0));
    const mins = Math.floor(safeSec / 60);
    const secs = safeSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

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
          Secure, direct communication with qualified mentors and peer learners. Text, attachments, voice notes, and direct in-website calls.
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
          position: 'relative',
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
                <p style={{ fontSize: '0.8rem' }}>Browse courses or mentors to message a peer.</p>
              </div>
            ) : (
              conversations.map((conv) => {
                const isActive = conv.id === activeConvId;
                const peer = conv.peer || { name: 'Peer' };
                const peerAvatar = peer.avatar_url;

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
                          {conv.is_closed && (
                            <span
                              style={{
                                fontSize: '0.65rem',
                                padding: '0.1rem 0.35rem',
                                borderRadius: '4px',
                                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                                color: '#f87171',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                              }}
                            >
                              Closed
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
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--color-bg)', position: 'relative' }}>
          {activeConvId && activePeer ? (
            (() => {
              const activeConv = conversations.find((c) => String(c.id) === String(activeConvId));
              const isAcceptedSession = activeConv?.session_status && ['accepted', 'confirmed'].includes(activeConv.session_status);

              return (
                <>
                  {/* Thread Header with Call Triggers */}
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
                          src={activePeer.avatar_url}
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
                          {activeConv?.session_skill && (
                            <span
                              className="badge"
                              style={{
                                fontSize: '0.68rem',
                                backgroundColor: 'rgba(37, 99, 235, 0.15)',
                                color: 'var(--color-primary)',
                                border: '1px solid rgba(37, 99, 235, 0.3)',
                              }}
                            >
                              {activeConv.session_skill}
                            </span>
                          )}
                          {activeConv?.is_closed && (
                            <span
                              className="badge"
                              style={{
                                fontSize: '0.68rem',
                                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                                color: '#f87171',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                              }}
                            >
                              Closed
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                          {activeConv?.session_status
                            ? `Session: ${activeConv.session_status}`
                            : (activePeer.role || 'Peer Member')}
                        </span>
                      </div>
                    </div>

                    {/* Actions: Direct Calls & Session Booking */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {/* WebRTC Audio & Video Calling Buttons */}
                      {!activeConv?.is_closed && (
                        <>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            title={
                              isAcceptedSession
                                ? 'Start direct audio call with peer'
                                : 'Direct calling requires an accepted session'
                            }
                            onClick={() => initiateCall('audio')}
                            disabled={
                              !isAcceptedSession ||
                              ['outgoing', 'incoming', 'connecting', 'connected', 'disconnected'].includes(callStatus)
                            }
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              opacity: isAcceptedSession ? 1 : 0.5,
                            }}
                          >
                            <PhoneIcon size={15} />
                            <span>Audio</span>
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            title={
                              isAcceptedSession
                                ? 'Start direct video call with peer'
                                : 'Direct calling requires an accepted session'
                            }
                            onClick={() => initiateCall('video')}
                            disabled={
                              !isAcceptedSession ||
                              ['outgoing', 'incoming', 'connecting', 'connected', 'disconnected'].includes(callStatus)
                            }
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              opacity: isAcceptedSession ? 1 : 0.5,
                            }}
                          >
                            <VideoIcon size={15} />
                            <span>Video</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowNetworkInfo((prev) => !prev)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--color-text-muted)',
                              cursor: 'pointer',
                              padding: '0.2rem',
                            }}
                            title="WebRTC Network & TURN Info"
                          >
                            ℹ️
                          </button>
                        </>
                      )}

                      {isLearner && !activeConv?.is_closed && !activeConv?.session_id && (
                        <Link
                          to={`/booking?mentorId=${encodeURIComponent(activePeer.id)}&mentorName=${encodeURIComponent(activePeer.name)}`}
                          className="btn btn-sm btn-outline"
                        >
                          Book Session
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Cross-conversation Incoming Call Alert Banner */}
                  {otherConvIncomingCall && (
                    <div
                      style={{
                        padding: '0.75rem 1.25rem',
                        backgroundColor: 'rgba(37, 99, 235, 0.16)',
                        borderBottom: '1px solid var(--color-primary)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '1rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.88rem' }}>
                        <PhoneIcon size={16} style={{ color: 'var(--color-primary)' }} />
                        <span>
                          <strong>{otherConvIncomingCall.callerName || 'A participant'}</strong> is calling you in another session thread (
                          {otherConvIncomingCall.mode === 'audio' ? 'Audio Call' : 'Video Call'}).
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          onClick={() => declineIncomingCall(otherConvIncomingCall.conversationId)}
                        >
                          Decline
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={() => {
                            const targetConv = conversations.find(
                              (c) => String(c.id) === String(otherConvIncomingCall.conversationId)
                            );
                            if (targetConv) {
                              selectConversation(targetConv);
                            } else {
                              setActiveConvId(otherConvIncomingCall.conversationId);
                            }
                          }}
                        >
                          Switch & Answer
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Network Notice / STUN & TURN info banner */}
                  {showNetworkInfo && (
                    <div
                      style={{
                        padding: '0.75rem 1rem',
                        backgroundColor: 'rgba(37, 99, 235, 0.08)',
                        borderBottom: '1px solid rgba(37, 99, 235, 0.2)',
                        fontSize: '0.8rem',
                        color: 'var(--color-text-secondary)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <strong>Direct Peer WebRTC Calling:</strong> Uses browser RTCPeerConnection with STUN servers (
                        {hasTurnConfigured ? 'TURN relay configured' : 'STUN-only mode; configure TURN_SERVER_URL in backend/.env for restrictive firewalls'}). Outside localhost, HTTPS is required for camera/microphone access.
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowNetworkInfo(false)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
                      >
                        <CloseIcon size={14} />
                      </button>
                    </div>
                  )}

                  {/* Terminal Call State Banner (Declined / Missed / Failed) */}
                  {['declined', 'missed', 'failed'].includes(callStatus) && (
                    <div
                      style={{
                        padding: '0.85rem 1.25rem',
                        backgroundColor:
                          callStatus === 'failed'
                            ? 'rgba(239, 68, 68, 0.14)'
                            : 'rgba(245, 158, 11, 0.14)',
                        borderBottom:
                          callStatus === 'failed'
                            ? '1px solid rgba(239, 68, 68, 0.35)'
                            : '1px solid rgba(245, 158, 11, 0.35)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '1rem',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <PhoneOffIcon
                          size={18}
                          style={{ color: callStatus === 'failed' ? '#ef4444' : '#f59e0b', flexShrink: 0 }}
                        />
                        <div>
                          <div style={{ fontWeight: '700', fontSize: '0.88rem', color: 'var(--color-text-primary)' }}>
                            {callStatus === 'declined'
                              ? 'Call Declined'
                              : callStatus === 'missed'
                              ? 'Missed Call — No Answer'
                              : 'Call Connection Failed'}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                            {callStatusNotice ||
                              (callStatus === 'declined'
                                ? 'The call was declined.'
                                : callStatus === 'missed'
                                ? 'The other participant did not answer in time.'
                                : 'Could not establish a media stream between participants.')}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {isAcceptedSession && !activeConv?.is_closed && (
                          <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            onClick={() => initiateCall(callMode)}
                          >
                            Call Again
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn-sm btn-outline"
                          onClick={cleanupCall}
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  )}

                  {activeConv?.is_closed && (
                    <div
                      style={{
                        padding: '0.65rem 1rem',
                        backgroundColor: 'rgba(239, 68, 68, 0.12)',
                        borderBottom: '1px solid rgba(239, 68, 68, 0.25)',
                        color: 'var(--color-danger)',
                        fontSize: '0.82rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                      }}
                    >
                      <span>🔒 This session coordination thread is closed because the booking was declined. Message history is preserved.</span>
                    </div>
                  )}

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
                        <p style={{ fontSize: '0.82rem' }}>Say hello, share session materials, or start a call!</p>
                      </div>
                    ) : (
                      messages.map((msg) => {
                        const isMine = msg.sender_id === user?.id;
                        const timeStr = new Date(msg.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        });
                        const attachmentStreamUrl = `/api/conversations/${activeConvId}/attachments/${msg.id}?token=${encodeURIComponent(token)}`;
                        const attachmentDownloadUrl = `${attachmentStreamUrl}&download=1`;

                        // Call log system message
                        if (msg.message_type === 'call_log') {
                          const isNegativeLog =
                            msg.call_action === 'declined' ||
                            msg.call_action === 'missed' ||
                            msg.call_action === 'failed';
                          return (
                            <div
                              key={msg.id}
                              style={{
                                alignSelf: 'center',
                                padding: '0.35rem 0.85rem',
                                borderRadius: '9999px',
                                backgroundColor: isNegativeLog
                                  ? 'rgba(239, 68, 68, 0.1)'
                                  : 'var(--color-bg-secondary)',
                                border: isNegativeLog
                                  ? '1px solid rgba(239, 68, 68, 0.3)'
                                  : '1px solid var(--color-border)',
                                fontSize: '0.78rem',
                                color: isNegativeLog ? '#f87171' : 'var(--color-text-secondary)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                margin: '0.25rem 0',
                              }}
                            >
                              {isNegativeLog ? (
                                <PhoneOffIcon size={13} style={{ color: '#ef4444' }} />
                              ) : (
                                <PhoneIcon size={13} style={{ color: 'var(--color-primary)' }} />
                              )}
                              <span>{msg.content}</span>
                              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem' }}>• {timeStr}</span>
                            </div>
                          );
                        }

                        // Attachment or Voice Note or Regular Message
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
                              {/* 1. Voice Note Message */}
                              {msg.message_type === 'voice' && msg.attachment_filename && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', minWidth: '230px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', fontSize: '0.8rem', opacity: 0.92 }}>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: '600' }}>
                                      <MicIcon size={14} />
                                      <span>Voice Note {msg.duration_seconds ? `(${formatDuration(msg.duration_seconds)})` : ''}</span>
                                    </span>
                                    <a
                                      href={attachmentDownloadUrl}
                                      download={msg.attachment_original_name || 'voice_note.webm'}
                                      style={{
                                        color: isMine ? '#ffffff' : 'var(--color-primary)',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        opacity: 0.85,
                                      }}
                                      title="Download voice note"
                                    >
                                      <DownloadIcon size={13} />
                                    </a>
                                  </div>
                                  <audio
                                    controls
                                    preload="metadata"
                                    src={attachmentStreamUrl}
                                    style={{ width: '250px', maxWidth: '100%', height: '38px' }}
                                  />
                                </div>
                              )}

                              {/* 2. Document or Image Attachment */}
                              {msg.message_type === 'attachment' && msg.attachment_filename && (
                                <div>
                                  {msg.attachment_mimetype?.startsWith('image/') ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                      <a href={attachmentStreamUrl} target="_blank" rel="noopener noreferrer">
                                        <img
                                          src={attachmentStreamUrl}
                                          alt={msg.attachment_original_name || 'Attachment'}
                                          style={{
                                            maxWidth: '280px',
                                            maxHeight: '220px',
                                            borderRadius: '8px',
                                            objectFit: 'cover',
                                            display: 'block',
                                          }}
                                        />
                                      </a>
                                      <a
                                        href={attachmentDownloadUrl}
                                        download={msg.attachment_original_name}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                          color: isMine ? '#ffffff' : 'var(--color-primary)',
                                          fontSize: '0.8rem',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '0.35rem',
                                          textDecoration: 'underline',
                                        }}
                                      >
                                        <DownloadIcon size={13} />
                                        <span>Download {msg.attachment_original_name}</span>
                                      </a>
                                    </div>
                                  ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                      <FileTextIcon size={24} style={{ flexShrink: 0 }} />
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: '600', fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                          {msg.attachment_original_name || 'Document'}
                                        </div>
                                        {msg.attachment_size && (
                                          <div style={{ fontSize: '0.72rem', opacity: 0.8 }}>
                                            {(msg.attachment_size / 1024).toFixed(1)} KB
                                          </div>
                                        )}
                                      </div>
                                      <a
                                        href={attachmentDownloadUrl}
                                        download={msg.attachment_original_name}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                          color: isMine ? '#ffffff' : 'var(--color-primary)',
                                          padding: '0.35rem',
                                          borderRadius: '4px',
                                          display: 'flex',
                                          alignItems: 'center',
                                        }}
                                        title="Download document"
                                      >
                                        <DownloadIcon size={16} />
                                      </a>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* 3. Regular Text Content */}
                              {msg.message_type !== 'voice' && msg.message_type !== 'attachment' && (
                                msg.content
                              )}
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

                  {/* Active Voice Recording or Preview Bar */}
                  {isRecordingVoice ? (
                    <div
                      style={{
                        padding: '0.85rem 1rem',
                        borderTop: '1px solid var(--color-border)',
                        backgroundColor: 'var(--color-bg-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.75rem',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <span
                          style={{
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            backgroundColor: '#ef4444',
                            animation: 'pulse 1s infinite',
                          }}
                        />
                        <span style={{ fontWeight: '600', fontSize: '0.9rem', color: '#ef4444' }}>
                          Recording voice note... {formatDuration(recordingSeconds)} / 05:00
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline"
                          onClick={cancelVoiceRecording}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          onClick={stopVoiceRecordingForPreview}
                        >
                          Stop & Preview
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={sendVoiceRecording}
                          disabled={isSending}
                        >
                          {isSending ? 'Sending...' : 'Send Voice Note'}
                        </button>
                      </div>
                    </div>
                  ) : voicePreview ? (
                    <div
                      style={{
                        padding: '0.85rem 1rem',
                        borderTop: '1px solid var(--color-border)',
                        backgroundColor: 'var(--color-bg-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.75rem',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '220px' }}>
                        <MicIcon size={18} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                        <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--color-text-primary)' }}>
                          Preview ({formatDuration(voicePreview.duration)})
                        </span>
                        <audio
                          controls
                          src={voicePreview.url}
                          style={{ height: '34px', maxWidth: '240px' }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline"
                          onClick={clearVoicePreview}
                          disabled={isSending}
                        >
                          Discard
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={sendVoiceRecording}
                          disabled={isSending}
                        >
                          {isSending ? 'Sending...' : 'Send Voice Note'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Normal Message Input Form */
                    <form
                      onSubmit={handleSendMessage}
                      style={{
                        padding: '1rem',
                        borderTop: '1px solid var(--color-border)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.65rem',
                        backgroundColor: 'var(--color-bg-secondary)',
                      }}
                    >
                      {/* Hidden File Input for Attachments */}
                      <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg,.webp,.gif"
                        onChange={handleFileSelected}
                      />

                      {/* Paperclip Button */}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isSending || isUploadingAttachment || activeConv?.is_closed}
                        className="btn btn-sm btn-outline"
                        style={{ padding: '0.55rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title="Attach file (PDF, DOCX, XLSX, PNG, JPG, WebP, GIF up to 15MB)"
                      >
                        <PaperclipIcon size={18} />
                      </button>

                      {/* Microphone Button */}
                      <button
                        type="button"
                        onClick={startVoiceRecording}
                        disabled={isSending || isUploadingAttachment || activeConv?.is_closed}
                        className="btn btn-sm btn-outline"
                        style={{ padding: '0.55rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title="Record voice note (up to 5 minutes / 10MB)"
                      >
                        <MicIcon size={18} />
                      </button>

                      {/* Text Input */}
                      <input
                        type="text"
                        className="form-input"
                        style={{ flex: 1, opacity: activeConv?.is_closed ? 0.6 : 1 }}
                        placeholder={
                          activeConv?.is_closed
                            ? 'This thread is closed (declined booking). Messages are read-only.'
                            : isUploadingAttachment
                            ? 'Uploading attachment...'
                            : `Message ${activePeer.name}...`
                        }
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        disabled={isSending || isUploadingAttachment || activeConv?.is_closed}
                      />

                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={isSending || isUploadingAttachment || activeConv?.is_closed || !messageText.trim()}
                      >
                        {isSending ? 'Sending...' : 'Send'}
                      </button>
                    </form>
                  )}
                </>
              );
            })()
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

          {/* ---------------------------------------------------------------- */}
          {/* MEDIA PERMISSION & DEVICE ERROR MODAL                             */}
          {/* ---------------------------------------------------------------- */}
          {permissionError && (
            <div
              style={{
                position: 'absolute',
                top: '1.5rem',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 110,
                backgroundColor: 'var(--color-surface)',
                border: '2px solid #ef4444',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
                borderRadius: '16px',
                padding: '1.5rem 1.75rem',
                maxWidth: '480px',
                width: '90%',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ef4444',
                    flexShrink: 0,
                  }}
                >
                  {permissionError.context === 'voice' ? <MicOffIcon size={24} /> : <VideoOffIcon size={24} />}
                </div>
                <div>
                  <h4 style={{ fontWeight: '700', fontSize: '1.05rem', color: 'var(--color-text-primary)', margin: 0 }}>
                    {permissionError.type === 'permission_denied'
                      ? 'Microphone / Camera Permission Blocked'
                      : 'Media Device Unavailable'}
                  </h4>
                  <p style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', marginTop: '0.35rem', lineHeight: '1.4' }}>
                    {permissionError.message}
                  </p>
                </div>
              </div>

              {permissionError.type === 'permission_denied' && (
                <div
                  style={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    borderRadius: '8px',
                    padding: '0.75rem 1rem',
                    fontSize: '0.82rem',
                    color: 'var(--color-text-muted)',
                    marginBottom: '1.25rem',
                    lineHeight: '1.4',
                  }}
                >
                  💡 <strong>How to enable:</strong> Click the camera or lock icon on the left side of your browser address bar, set Microphone (and Camera for video calls) to <em>Allow</em>, then click <strong>Try Again</strong> below.
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={() => setPermissionError(null)}
                >
                  Cancel
                </button>
                {permissionError.context !== 'voice' && permissionError.mode === 'video' && (
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={() => {
                      setPermissionError(null);
                      initiateCall('audio');
                    }}
                  >
                    Switch to Audio Call
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={() => {
                    const ctx = permissionError.context;
                    const isInc = permissionError.isIncoming;
                    const mode = permissionError.mode || 'video';
                    setPermissionError(null);
                    if (ctx === 'voice') {
                      startVoiceRecording();
                    } else if (isInc) {
                      acceptIncomingCall();
                    } else {
                      initiateCall(mode);
                    }
                  }}
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {/* Persistent Remote Audio Element for Live Audio in Audio & Video Calls */}
          <audio ref={setRemoteAudioEl} autoPlay playsInline style={{ display: 'none' }} />

          {/* ---------------------------------------------------------------- */}
          {/* INCOMING CALL MODAL PROMPT                                       */}
          {/* ---------------------------------------------------------------- */}
          {callStatus === 'incoming' && (
            <div
              style={{
                position: 'absolute',
                top: '1rem',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 100,
                backgroundColor: 'var(--color-surface)',
                border: '2px solid var(--color-primary)',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4)',
                borderRadius: '16px',
                padding: '1.25rem 1.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '1.25rem',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(37, 99, 235, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-primary)',
                  animation: 'pulse 1.2s infinite',
                }}
              >
                {incomingCallData?.mode === 'audio' ? <PhoneIcon size={24} /> : <VideoIcon size={24} />}
              </div>
              <div>
                <div style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--color-text-primary)' }}>
                  Incoming {incomingCallData?.mode === 'audio' ? 'Audio' : 'Video'} Call
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                  {incomingCallData?.callerName || activePeer?.name || 'Peer'} is calling you...
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.65rem' }}>
                <button
                  type="button"
                  onClick={() => declineIncomingCall()}
                  className="btn btn-sm btn-danger"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <PhoneOffIcon size={14} />
                  <span>Decline</span>
                </button>
                <button
                  type="button"
                  onClick={() => acceptIncomingCall()}
                  className="btn btn-sm btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <PhoneIcon size={14} />
                  <span>Accept</span>
                </button>
              </div>
            </div>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* ACTIVE IN-WEBSITE CALL OVERLAY                                    */}
          {/* ---------------------------------------------------------------- */}
          {['outgoing', 'connecting', 'connected', 'disconnected'].includes(callStatus) && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 90,
                backgroundColor: 'rgba(15, 23, 42, 0.96)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              {/* Call Top Header */}
              <div
                style={{
                  padding: '0.85rem 1.5rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#ffffff',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor:
                        connectionState === 'connected'
                          ? '#10b981'
                          : connectionState === 'disconnected' || connectionState === 'failed'
                          ? '#ef4444'
                          : '#f59e0b',
                      animation: connectionState === 'connected' ? 'none' : 'pulse 1.5s infinite',
                    }}
                  />
                  <span style={{ fontWeight: '700', fontSize: '1rem' }}>
                    {activePeer?.name || 'Peer'} • {callMode === 'audio' ? 'Audio Call' : 'Video Call'}
                  </span>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      padding: '0.2rem 0.65rem',
                      borderRadius: '9999px',
                      backgroundColor:
                        connectionState === 'connected'
                          ? 'rgba(16, 185, 129, 0.2)'
                          : connectionState === 'disconnected'
                          ? 'rgba(239, 68, 68, 0.25)'
                          : 'rgba(245, 158, 11, 0.2)',
                      color:
                        connectionState === 'connected'
                          ? '#34d399'
                          : connectionState === 'disconnected'
                          ? '#fca5a5'
                          : '#fbbf24',
                    }}
                  >
                    {connectionState === 'connected'
                      ? 'Connected (Live P2P)'
                      : connectionState === 'connecting'
                      ? 'Connecting Media...'
                      : connectionState === 'disconnected'
                      ? 'Disconnected — Reconnecting...'
                      : 'Ringing...'}
                  </span>
                  {remoteMediaState.micMuted && (
                    <span
                      style={{
                        fontSize: '0.72rem',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '9999px',
                        backgroundColor: 'rgba(239, 68, 68, 0.2)',
                        color: '#fca5a5',
                      }}
                    >
                      Peer Muted
                    </span>
                  )}
                  {remoteMediaState.screenSharing && (
                    <span
                      style={{
                        fontSize: '0.72rem',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '9999px',
                        backgroundColor: 'rgba(59, 130, 246, 0.25)',
                        color: '#93c5fd',
                      }}
                    >
                      Peer Sharing Screen
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <button
                    type="button"
                    onClick={() => setShowInCallChat(!showInCallChat)}
                    className="btn btn-sm"
                    style={{
                      backgroundColor: showInCallChat ? 'var(--color-primary)' : 'rgba(255, 255, 255, 0.15)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                    }}
                  >
                    <MessageIcon size={14} />
                    <span>In-Call Chat ({messages.length})</span>
                  </button>
                  <div style={{ fontWeight: '600', fontSize: '0.95rem', color: '#94a3b8' }}>
                    {callStatus === 'outgoing' ? 'Ringing...' : formatDuration(callDuration)}
                  </div>
                </div>
              </div>

              {/* Prominent Screen Sharing Active Banner with Stop Sharing Button */}
              {isScreenSharing && (
                <div
                  style={{
                    padding: '0.55rem 1.25rem',
                    backgroundColor: 'rgba(37, 99, 235, 0.28)',
                    borderBottom: '1px solid rgba(96, 165, 250, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    color: '#ffffff',
                    fontSize: '0.84rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ScreenShareIcon size={16} />
                    <span>
                      <strong>You are sharing your screen</strong> with {activePeer?.name || 'your session partner'}.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={stopScreenShare}
                    className="btn btn-sm btn-danger"
                    style={{ fontWeight: '700', padding: '0.25rem 0.75rem' }}
                  >
                    Stop Sharing Screen
                  </button>
                </div>
              )}

              {/* Disconnected State Recovery Banner */}
              {callStatus === 'disconnected' && (
                <div
                  style={{
                    padding: '0.6rem 1.25rem',
                    backgroundColor: 'rgba(239, 68, 68, 0.25)',
                    borderBottom: '1px solid rgba(239, 68, 68, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    color: '#ffffff',
                    fontSize: '0.84rem',
                  }}
                >
                  <span>
                    {callStatusNotice || 'Connection temporarily interrupted. Attempting to restore audio/video...'}
                  </span>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={retryReconnectCall}
                      className="btn btn-sm btn-primary"
                    >
                      Reconnect Now
                    </button>
                    <button
                      type="button"
                      onClick={endCall}
                      className="btn btn-sm btn-danger"
                    >
                      Hang Up
                    </button>
                  </div>
                </div>
              )}

              {/* Main Call Body (Video/Audio Stage + In-Call Chat Drawer) */}
              <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
                {/* Video Viewport / Stage */}
                <div
                  style={{
                    flex: 1,
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#020617',
                    overflow: 'hidden',
                  }}
                >
                  {/* Remote Video Element (always mounted in call overlay so incoming video tracks attach immediately) */}
                  <video
                    ref={setRemoteVideoEl}
                    autoPlay
                    playsInline
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      display:
                        callMode === 'video' &&
                        hasRemoteVideoTrack &&
                        (!remoteMediaState.cameraOff || remoteMediaState.screenSharing)
                          ? 'block'
                          : 'none',
                    }}
                  />

                  {/* Remote Avatar / Status Placeholder when in Audio mode or before remote video track is active */}
                  {(callMode === 'audio' ||
                    !hasRemoteVideoTrack ||
                    (remoteMediaState.cameraOff && !remoteMediaState.screenSharing)) && (
                    <div style={{ textAlign: 'center', color: '#ffffff', padding: '1.5rem' }}>
                      <div
                        style={{
                          width: '96px',
                          height: '96px',
                          borderRadius: '50%',
                          backgroundColor: 'rgba(37, 99, 235, 0.3)',
                          border: '3px solid var(--color-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto 1rem',
                          fontSize: '2rem',
                          fontWeight: '700',
                        }}
                      >
                        {(activePeer?.name || 'P').charAt(0).toUpperCase()}
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: '700' }}>{activePeer?.name}</div>
                      <div style={{ fontSize: '0.88rem', color: '#94a3b8', marginTop: '0.35rem' }}>
                        {callStatus === 'outgoing'
                          ? `Ringing ${activePeer?.name || 'participant'}...`
                          : connectionState === 'connecting'
                          ? 'Establishing encrypted peer-to-peer media...'
                          : remoteMediaState.cameraOff
                          ? 'Camera is turned off (Audio active)'
                          : 'Live audio connected'}
                      </div>
                    </div>
                  )}

                  {/* Local Picture-in-Picture Video */}
                  {(callMode === 'video' || isScreenSharing) && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '1.25rem',
                        right: '1.25rem',
                        width: '180px',
                        height: '124px',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        border: '2px solid rgba(255, 255, 255, 0.25)',
                        backgroundColor: '#0f172a',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <video
                        ref={setLocalVideoEl}
                        autoPlay
                        playsInline
                        muted
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: isVideoDisabled && !isScreenSharing ? 'none' : 'block',
                        }}
                      />
                      {isVideoDisabled && !isScreenSharing && (
                        <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.75rem', padding: '0.5rem' }}>
                          <VideoOffIcon size={20} style={{ margin: '0 auto 0.25rem' }} />
                          <div>Camera Off</div>
                        </div>
                      )}
                      <span
                        style={{
                          position: 'absolute',
                          bottom: '6px',
                          left: '8px',
                          fontSize: '0.68rem',
                          backgroundColor: 'rgba(0, 0, 0, 0.6)',
                          color: '#ffffff',
                          padding: '0.1rem 0.4rem',
                          borderRadius: '4px',
                        }}
                      >
                        {isScreenSharing ? 'Your Screen' : 'You'}
                      </span>
                    </div>
                  )}

                  {/* Floating Emojis Animation */}
                  {floatingReactions.map((r) => (
                    <div
                      key={r.id}
                      style={{
                        position: 'absolute',
                        left: `${r.x}%`,
                        bottom: '20px',
                        fontSize: '2.5rem',
                        pointerEvents: 'none',
                        animation: 'floatUp 2.4s ease-out forwards',
                      }}
                    >
                      {r.emoji}
                    </div>
                  ))}
                </div>

                {/* In-Call Chat Side Drawer */}
                {showInCallChat && (
                  <div
                    style={{
                      width: '340px',
                      backgroundColor: 'rgba(15, 23, 42, 0.98)',
                      borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
                      display: 'flex',
                      flexDirection: 'column',
                      zIndex: 10,
                    }}
                  >
                    <div
                      style={{
                        padding: '0.85rem 1rem',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        color: '#ffffff',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>In-Call Session Chat</div>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                          Saved to this conversation for review after the call
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowInCallChat(false)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#94a3b8',
                          cursor: 'pointer',
                          padding: '0.2rem',
                        }}
                      >
                        <CloseIcon size={16} />
                      </button>
                    </div>

                    <div
                      style={{
                        flex: 1,
                        overflowY: 'auto',
                        padding: '1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.65rem',
                      }}
                    >
                      {messages.map((m) => {
                        if (m.message_type === 'call_log') {
                          return (
                            <div
                              key={m.id || m.created_at}
                              style={{
                                alignSelf: 'center',
                                fontSize: '0.72rem',
                                color: '#94a3b8',
                                padding: '0.2rem 0.6rem',
                                borderRadius: '9999px',
                                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                              }}
                            >
                              {m.content}
                            </div>
                          );
                        }
                        const isMe = m.sender_id === user?.id;
                        return (
                          <div
                            key={m.id || m.created_at}
                            style={{
                              alignSelf: isMe ? 'flex-end' : 'flex-start',
                              maxWidth: '85%',
                              backgroundColor: isMe ? 'var(--color-primary)' : 'rgba(255, 255, 255, 0.12)',
                              color: '#ffffff',
                              padding: '0.5rem 0.85rem',
                              borderRadius: '12px',
                              fontSize: '0.85rem',
                              lineHeight: '1.4',
                              wordBreak: 'break-word',
                            }}
                          >
                            <div>
                              {m.message_type === 'voice'
                                ? `🎤 Voice Note${m.duration_seconds ? ` (${m.duration_seconds}s)` : ''}`
                                : m.message_type === 'attachment'
                                ? `📎 ${m.attachment_original_name || m.content}`
                                : m.content}
                            </div>
                            <div style={{ fontSize: '0.68rem', opacity: 0.65, marginTop: '0.2rem', textAlign: 'right' }}>
                              {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        );
                      })}
                      <div ref={inCallMessagesEndRef} />
                    </div>

                    <form
                      onSubmit={handleSendInCallMessage}
                      style={{
                        padding: '0.75rem',
                        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                        display: 'flex',
                        gap: '0.5rem',
                      }}
                    >
                      <input
                        type="text"
                        value={inCallText}
                        onChange={(e) => setInCallText(e.target.value)}
                        placeholder="Send message to conversation..."
                        style={{
                          flex: 1,
                          backgroundColor: 'rgba(255, 255, 255, 0.08)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          borderRadius: '8px',
                          padding: '0.5rem 0.75rem',
                          color: '#ffffff',
                          fontSize: '0.85rem',
                          outline: 'none',
                        }}
                      />
                      <button
                        type="submit"
                        className="btn btn-sm btn-primary"
                        disabled={!inCallText.trim()}
                      >
                        Send
                      </button>
                    </form>
                  </div>
                )}
              </div>

              {/* Call Controls Footer */}
              <div
                style={{
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '0.85rem',
                  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                  backgroundColor: 'rgba(15, 23, 42, 0.98)',
                  flexWrap: 'wrap',
                }}
              >
                {/* Mute Mic */}
                <button
                  type="button"
                  onClick={toggleMic}
                  className="btn"
                  style={{
                    backgroundColor: isMicMuted ? '#dc2626' : 'rgba(255, 255, 255, 0.15)',
                    color: '#ffffff',
                    borderRadius: '50%',
                    width: '46px',
                    height: '46px',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title={isMicMuted ? 'Unmute microphone' : 'Mute microphone'}
                >
                  {isMicMuted ? <MicOffIcon size={20} /> : <MicIcon size={20} />}
                </button>

                {/* Toggle Camera On/Off */}
                <button
                  type="button"
                  onClick={toggleCamera}
                  className="btn"
                  style={{
                    backgroundColor: isVideoDisabled ? '#dc2626' : 'rgba(255, 255, 255, 0.15)',
                    color: '#ffffff',
                    borderRadius: '50%',
                    width: '46px',
                    height: '46px',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title={isVideoDisabled ? 'Turn camera on' : 'Turn camera off'}
                >
                  {isVideoDisabled ? <VideoOffIcon size={20} /> : <VideoIcon size={20} />}
                </button>

                {/* Screen Share / Stop Sharing */}
                <button
                  type="button"
                  onClick={toggleScreenShare}
                  className="btn"
                  style={{
                    backgroundColor: isScreenSharing ? 'var(--color-primary)' : 'rgba(255, 255, 255, 0.15)',
                    color: '#ffffff',
                    borderRadius: isScreenSharing ? '9999px' : '50%',
                    height: '46px',
                    width: isScreenSharing ? 'auto' : '46px',
                    padding: isScreenSharing ? '0 1rem' : 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    fontSize: '0.82rem',
                    fontWeight: '600',
                  }}
                  title={isScreenSharing ? 'Stop screen sharing' : 'Share screen'}
                >
                  <ScreenShareIcon size={20} />
                  {isScreenSharing && <span>Stop Sharing</span>}
                </button>

                {/* In-Call Chat Toggle Button */}
                <button
                  type="button"
                  onClick={() => setShowInCallChat(!showInCallChat)}
                  className="btn"
                  style={{
                    backgroundColor: showInCallChat ? 'var(--color-primary)' : 'rgba(255, 255, 255, 0.15)',
                    color: '#ffffff',
                    borderRadius: '50%',
                    width: '46px',
                    height: '46px',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title={showInCallChat ? 'Hide in-call chat' : 'Open in-call chat'}
                >
                  <MessageIcon size={20} />
                </button>

                {/* Floating Reactions Toolbar */}
                <div style={{ display: 'flex', gap: '0.35rem', margin: '0 0.25rem' }}>
                  {['👏', '❤️', '🎉', '👍', '💡'].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => sendCallReaction(emoji)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        fontSize: '1.3rem',
                        cursor: 'pointer',
                        padding: '0.2rem',
                      }}
                      title={`Send ${emoji} reaction`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                {/* Hang Up / End Call Button */}
                <button
                  type="button"
                  onClick={endCall}
                  className="btn btn-danger"
                  style={{
                    borderRadius: '9999px',
                    height: '46px',
                    padding: '0 1.1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.45rem',
                    fontWeight: '700',
                    fontSize: '0.85rem',
                  }}
                  title="Hang up call"
                >
                  <PhoneOffIcon size={18} />
                  <span>Hang Up</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
