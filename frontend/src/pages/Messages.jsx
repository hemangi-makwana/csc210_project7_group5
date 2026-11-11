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

export function Messages() {
  const { user, isAuthenticated, isLearner } = useAuth();
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

  // Attachment upload state
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const fileInputRef = useRef(null);

  // Audio Voice Note state
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);

  // WebRTC Call state
  // callStatus: 'idle' | 'outgoing' | 'incoming' | 'connected'
  const [callStatus, setCallStatus] = useState('idle');
  const [connectionState, setConnectionState] = useState('idle'); // 'idle' | 'calling' | 'connecting' | 'connected' | 'reconnecting' | 'failed'
  const [callMode, setCallMode] = useState('video'); // 'video' | 'audio'
  const [incomingCallData, setIncomingCallData] = useState(null);
  const [permissionError, setPermissionError] = useState(null);
  const [showInCallChat, setShowInCallChat] = useState(false);
  const [inCallText, setInCallText] = useState('');
  const [callDuration, setCallDuration] = useState(0);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoDisabled, setIsVideoDisabled] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showNetworkInfo, setShowNetworkInfo] = useState(false);
  const [floatingReactions, setFloatingReactions] = useState([]);

  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenTrackRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const remoteOfferRef = useRef(null);
  const candidateQueueRef = useRef([]);
  const lastSignalTimeRef = useRef(Date.now() - 5000);
  const callTimerRef = useRef(null);
  const callDurationRef = useRef(0);
  const iceServersRef = useRef([
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]);

  const messagesEndRef = useRef(null);
  const token = localStorage.getItem('token') || '';

  // Scroll to bottom of active message list
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load ICE servers on mount
  useEffect(() => {
    if (isAuthenticated) {
      getIceServers()
        .then((res) => {
          if (res && res.iceServers) {
            iceServersRef.current = res.iceServers;
          }
        })
        .catch(() => {});
    }
  }, [isAuthenticated]);

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
            const existing = convList.find(
              (c) => c.peer && String(c.peer.id) === String(targetUserId)
            );
            if (existing) {
              setActiveConvId(existing.id);
              setActivePeer(existing.peer);
            } else {
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

  // Send regular text message
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

  // Handle file attachment selection (images, PDF, DOCX, XLSX)
  async function handleFileSelected(e) {
    const file = e.target.files?.[0];
    if (!file || !activeConvId) return;

    if (file.size > 15 * 1024 * 1024) {
      setErrorMessage('File exceeds the 15MB upload limit.');
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
        setMessages((prev) => [...prev, res.message]);
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeConvId
              ? {
                  ...c,
                  last_message_content: `[Attachment] ${file.name}`,
                  last_message_time: new Date().toISOString(),
                }
              : c
          )
        );
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to upload attachment.');
    } finally {
      setIsUploadingAttachment(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  // Start recording audio voice note
  async function startVoiceRecording() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setErrorMessage('Audio recording is not supported in this browser.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.start(250);
      setIsRecordingVoice(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      setErrorMessage('Could not access microphone: ' + (err.message || 'Permission denied.'));
    }
  }

  // Cancel recording voice note
  function cancelVoiceRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream?.getTracks().forEach((t) => t.stop());
    }
    clearInterval(recordingTimerRef.current);
    setIsRecordingVoice(false);
    setRecordingSeconds(0);
    audioChunksRef.current = [];
  }

  // Finish and send voice note
  async function sendVoiceRecording() {
    if (!mediaRecorderRef.current || !activeConvId) return;

    const recorder = mediaRecorderRef.current;
    const duration = recordingSeconds;

    clearInterval(recordingTimerRef.current);
    setIsRecordingVoice(false);

    recorder.onstop = async () => {
      recorder.stream?.getTracks().forEach((t) => t.stop());
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      audioChunksRef.current = [];

      const formData = new FormData();
      formData.append('file', audioBlob, `voice_note_${Date.now()}.webm`);
      formData.append('durationSeconds', String(duration));

      setIsSending(true);
      try {
        const res = await uploadAttachment(activeConvId, formData);
        if (res && res.message) {
          setMessages((prev) => [...prev, res.message]);
          setConversations((prev) =>
            prev.map((c) =>
              c.id === activeConvId
                ? {
                    ...c,
                    last_message_content: `[Voice Note] (${duration}s)`,
                    last_message_time: new Date().toISOString(),
                  }
                : c
            )
          );
        }
      } catch (err) {
        setErrorMessage(err.message || 'Failed to send voice note.');
      } finally {
        setIsSending(false);
        setRecordingSeconds(0);
      }
    };

    if (recorder.state !== 'inactive') {
      recorder.stop();
    }
  }

  // --------------------------------------------------------------------------
  // WEBRTC CALLING LOGIC (Audio & VideoDirect In-Website Calls)
  // --------------------------------------------------------------------------

  // Helper to acquire local audio or video stream with graceful fallbacks
  async function acquireMediaStream(mode) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('WebRTC media devices are not supported in this browser context.');
    }

    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: mode === 'video',
      });
    } catch (err) {
      // If video requested but no camera device is connected/found, fall back to audio
      if (mode === 'video' && (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError')) {
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          setCallMode('audio');
          return audioStream;
        } catch (audioErr) {
          throw audioErr;
        }
      }
      throw err;
    }
  }

  // Clean up WebRTC peer connection and tracks
  const cleanupCall = useCallback(() => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    if (screenTrackRef.current) {
      screenTrackRef.current.stop();
      screenTrackRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
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
    setCallStatus('idle');
    setConnectionState('idle');
    setIncomingCallData(null);
    setCallDuration(0);
    callDurationRef.current = 0;
    setIsMicMuted(false);
    setIsVideoDisabled(false);
    setIsScreenSharing(false);
    setShowInCallChat(false);
    remoteOfferRef.current = null;
    candidateQueueRef.current = [];
  }, []);

  // Synchronize remote media stream to video and audio elements
  useEffect(() => {
    if (remoteStreamRef.current) {
      if (remoteAudioRef.current && remoteAudioRef.current.srcObject !== remoteStreamRef.current) {
        remoteAudioRef.current.srcObject = remoteStreamRef.current;
        remoteAudioRef.current.play().catch(() => {});
      }
      if (remoteVideoRef.current && callMode === 'video' && remoteVideoRef.current.srcObject !== remoteStreamRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
        remoteVideoRef.current.play().catch(() => {});
      }
    }
  }, [callStatus, callMode]);

  // Initiate an outgoing call
  async function initiateCall(mode = 'video') {
    if (!activeConvId) return;

    const activeConv = conversations.find((c) => String(c.id) === String(activeConvId));
    if (activeConv?.session_status && !['accepted', 'confirmed'].includes(activeConv.session_status)) {
      setErrorMessage(`In-website calls require an accepted session (current status: "${activeConv.session_status}").`);
      return;
    }

    try {
      setCallMode(mode);
      setCallStatus('outgoing');
      setConnectionState('calling');
      setErrorMessage(null);
      setPermissionError(null);

      const stream = await acquireMediaStream(mode);
      localStreamRef.current = stream;

      if (localVideoRef.current && mode === 'video') {
        localVideoRef.current.srcObject = stream;
      }

      const pc = new RTCPeerConnection({ iceServers: iceServersRef.current });
      pcRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        const remoteStream = event.streams[0] || new MediaStream([event.track]);
        remoteStreamRef.current = remoteStream;
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = remoteStream;
          remoteAudioRef.current.play().catch(() => {});
        }
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
          remoteVideoRef.current.play().catch(() => {});
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendCallSignal(activeConvId, 'candidate', event.candidate).catch(() => {});
        }
      };

      pc.oniceconnectionstatechange = () => {
        const s = pc.iceConnectionState;
        if (s === 'connected' || s === 'completed') {
          setConnectionState('connected');
          setCallStatus('connected');
        } else if (s === 'disconnected') {
          setConnectionState('reconnecting');
        } else if (s === 'failed') {
          setConnectionState('failed');
        }
      };

      pc.onconnectionstatechange = () => {
        const s = pc.connectionState;
        if (s === 'connected') {
          setConnectionState('connected');
          setCallStatus('connected');
        } else if (s === 'disconnected' || s === 'failed') {
          setConnectionState(s);
        }
      };

      // Notify peer that call started
      await sendCallSignal(activeConvId, 'start', { mode });

      // Create and send WebRTC offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await sendCallSignal(activeConvId, 'offer', { offer, mode });
    } catch (err) {
      cleanupCall();
      const isDenied = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError';
      setPermissionError({
        type: isDenied ? 'permission_denied' : 'device_error',
        message: isDenied
          ? 'Microphone or camera access was blocked by your browser. Please allow permission via the camera/lock icon in your browser address bar and click Try Again.'
          : (err.message || 'Media permission denied or no device found.'),
        mode: mode,
        isIncoming: false,
      });
    }
  }

  // Accept an incoming call
  async function acceptIncomingCall() {
    if (!activeConvId) return;

    try {
      const mode = incomingCallData?.mode || 'video';
      setCallMode(mode);
      setCallStatus('connected');
      setConnectionState('connecting');
      setPermissionError(null);

      // Start call timer
      callDurationRef.current = 0;
      setCallDuration(0);
      callTimerRef.current = setInterval(() => {
        callDurationRef.current += 1;
        setCallDuration((prev) => prev + 1);
      }, 1000);

      const stream = await acquireMediaStream(mode);
      localStreamRef.current = stream;

      if (localVideoRef.current && mode === 'video') {
        localVideoRef.current.srcObject = stream;
      }

      const pc = new RTCPeerConnection({ iceServers: iceServersRef.current });
      pcRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        const remoteStream = event.streams[0] || new MediaStream([event.track]);
        remoteStreamRef.current = remoteStream;
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = remoteStream;
          remoteAudioRef.current.play().catch(() => {});
        }
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
          remoteVideoRef.current.play().catch(() => {});
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendCallSignal(activeConvId, 'candidate', event.candidate).catch(() => {});
        }
      };

      pc.oniceconnectionstatechange = () => {
        const s = pc.iceConnectionState;
        if (s === 'connected' || s === 'completed') {
          setConnectionState('connected');
        } else if (s === 'disconnected') {
          setConnectionState('reconnecting');
        }
      };

      const offerToUse = incomingCallData?.offer || remoteOfferRef.current;
      if (offerToUse) {
        await pc.setRemoteDescription(new RTCSessionDescription(offerToUse));
        // Flush any candidates that arrived while waiting
        for (const c of candidateQueueRef.current) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(c));
          } catch (e) {}
        }
        candidateQueueRef.current = [];

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await sendCallSignal(activeConvId, 'answer', { answer });
      }

      setIncomingCallData(null);
    } catch (err) {
      cleanupCall();
      const isDenied = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError';
      setPermissionError({
        type: isDenied ? 'permission_denied' : 'device_error',
        message: isDenied
          ? 'Microphone or camera access was blocked by your browser. Please allow permission via the camera/lock icon in your address bar and click Try Again.'
          : (err.message || 'Media permission denied.'),
        mode: incomingCallData?.mode || 'video',
        isIncoming: true,
      });
    }
  }

  // Decline incoming call
  function declineIncomingCall() {
    if (activeConvId) {
      sendCallSignal(activeConvId, 'end', { reason: 'declined' }).catch(() => {});
    }
    setIncomingCallData(null);
    setCallStatus('idle');
    setConnectionState('idle');
  }

  // End active call
  async function endCall() {
    const duration = callDurationRef.current;
    if (activeConvId) {
      await sendCallSignal(activeConvId, 'end', { duration }).catch(() => {});
      // Refresh messages to show the call log
      getMessages(activeConvId)
        .then((res) => {
          if (res && res.messages) setMessages(res.messages);
        })
        .catch(() => {});
    }
    cleanupCall();
  }

  // Toggle microphone
  function toggleMic() {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicMuted(!audioTrack.enabled);
      }
    }
  }

  // Toggle camera
  function toggleCamera() {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoDisabled(!videoTrack.enabled);
      }
    }
  }

  // Toggle screen share
  async function toggleScreenShare() {
    if (!pcRef.current) return;

    if (isScreenSharing) {
      // Revert to camera track
      if (screenTrackRef.current) {
        screenTrackRef.current.stop();
        screenTrackRef.current = null;
      }
      const camTrack = localStreamRef.current?.getVideoTracks()[0];
      const sender = pcRef.current.getSenders().find((s) => s.track && s.track.kind === 'video');
      if (sender && camTrack) {
        sender.replaceTrack(camTrack);
      }
      if (localVideoRef.current && camTrack) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
      setIsScreenSharing(false);
    } else {
      try {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = displayStream.getVideoTracks()[0];
        screenTrackRef.current = screenTrack;

        const sender = pcRef.current.getSenders().find((s) => s.track && s.track.kind === 'video');
        if (sender) {
          sender.replaceTrack(screenTrack);
        }
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = displayStream;
        }

        screenTrack.onended = () => {
          toggleScreenShare();
        };

        setIsScreenSharing(true);
      } catch (err) {
        setErrorMessage('Screen sharing was cancelled or not permitted.');
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

  // Send message from in-call chat
  async function handleSendInCallMessage(e) {
    e.preventDefault();
    if (!inCallText.trim() || !activeConvId) return;

    const content = inCallText.trim();
    setInCallText('');

    try {
      const res = await sendMessage(activeConvId, content);
      if (res && res.data) {
        setMessages((prev) => [...prev, res.data]);
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
      setErrorMessage(err.message || 'Failed to send message during call.');
    }
  }

  // Signaling polling loop (dynamic interval: 800ms when active call, 2000ms idle)
  useEffect(() => {
    if (!activeConvId || !isAuthenticated) return;

    let isMounted = true;
    const pollIntervalTime = callStatus !== 'idle' ? 800 : 2000;

    const signalPoll = setInterval(async () => {
      try {
        const res = await getCallSignals(activeConvId, lastSignalTimeRef.current);
        if (!isMounted || !res || !res.signals || res.signals.length === 0) return;

        lastSignalTimeRef.current = res.serverTime || Date.now();

        for (const sig of res.signals) {
          if (sig.type === 'start') {
            if (callStatus === 'idle') {
              setIncomingCallData({
                from: sig.from,
                mode: sig.payload?.mode || 'video',
              });
              setCallStatus('incoming');
            }
          } else if (sig.type === 'offer') {
            remoteOfferRef.current = sig.payload?.offer;
            if (callStatus === 'idle' || callStatus === 'incoming') {
              setIncomingCallData((prev) => ({
                ...(prev || {}),
                from: sig.from,
                mode: sig.payload?.mode || prev?.mode || 'video',
                offer: sig.payload?.offer,
              }));
              setCallStatus('incoming');
            } else if (pcRef.current) {
              await pcRef.current.setRemoteDescription(new RTCSessionDescription(sig.payload.offer));
              for (const c of candidateQueueRef.current) {
                try {
                  await pcRef.current.addIceCandidate(new RTCIceCandidate(c));
                } catch (e) {}
              }
              candidateQueueRef.current = [];
              const answer = await pcRef.current.createAnswer();
              await pcRef.current.setLocalDescription(answer);
              await sendCallSignal(activeConvId, 'answer', { answer });
            }
          } else if (sig.type === 'answer') {
            if (pcRef.current && sig.payload?.answer) {
              await pcRef.current.setRemoteDescription(new RTCSessionDescription(sig.payload.answer));
              for (const c of candidateQueueRef.current) {
                try {
                  await pcRef.current.addIceCandidate(new RTCIceCandidate(c));
                } catch (e) {}
              }
              candidateQueueRef.current = [];
              setCallStatus('connected');
              setConnectionState('connected');
              if (!callTimerRef.current) {
                callDurationRef.current = 0;
                setCallDuration(0);
                callTimerRef.current = setInterval(() => {
                  callDurationRef.current += 1;
                  setCallDuration((prev) => prev + 1);
                }, 1000);
              }
            }
          } else if (sig.type === 'candidate') {
            if (pcRef.current && pcRef.current.remoteDescription && sig.payload) {
              try {
                await pcRef.current.addIceCandidate(new RTCIceCandidate(sig.payload));
              } catch (e) {}
            } else if (sig.payload) {
              candidateQueueRef.current.push(sig.payload);
            }
          } else if (sig.type === 'reaction') {
            if (sig.payload?.emoji) {
              triggerFloatingReaction(sig.payload.emoji);
            }
          } else if (sig.type === 'end') {
            cleanupCall();
            // Refresh messages to show updated call log
            getMessages(activeConvId)
              .then((mRes) => {
                if (mRes && mRes.messages) setMessages(mRes.messages);
              })
              .catch(() => {});
          }
        }
      } catch (err) {}
    }, pollIntervalTime);

    return () => {
      isMounted = false;
      clearInterval(signalPoll);
    };
  }, [activeConvId, isAuthenticated, callStatus, cleanupCall]);

  function selectConversation(conv) {
    if (callStatus !== 'idle') cleanupCall();
    setActiveConvId(conv.id);
    setActivePeer(conv.peer);
    setSearchParams({ conversationId: conv.id });
  }

  // Format call duration MM:SS
  const formatDuration = (totalSec) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
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
                            disabled={!isAcceptedSession || callStatus !== 'idle'}
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
                            disabled={!isAcceptedSession || callStatus !== 'idle'}
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
                            title="WebRTC Network Requirements"
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
                        <strong>Direct Peer WebRTC Calling:</strong> Integrated directly via browser RTCPeerConnection and local STUN servers. Outside localhost, HTTPS is required for camera/microphone access. Strict institutional firewalls or cellular symmetric NAT require a self-hosted TURN relay.
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

                        // Call log system message
                        if (msg.message_type === 'call_log') {
                          return (
                            <div
                              key={msg.id}
                              style={{
                                alignSelf: 'center',
                                padding: '0.35rem 0.85rem',
                                borderRadius: '9999px',
                                backgroundColor: 'var(--color-bg-secondary)',
                                border: '1px solid var(--color-border)',
                                fontSize: '0.78rem',
                                color: 'var(--color-text-secondary)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                margin: '0.25rem 0',
                              }}
                            >
                              <PhoneIcon size={13} style={{ color: 'var(--color-primary)' }} />
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
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', opacity: 0.9 }}>
                                    <MicIcon size={14} />
                                    <span>Voice Note {msg.duration_seconds ? `(${msg.duration_seconds}s)` : ''}</span>
                                  </div>
                                  <audio
                                    controls
                                    src={`/api/conversations/${activeConvId}/attachments/${msg.id}?token=${encodeURIComponent(token)}`}
                                    style={{ maxWidth: '250px', height: '36px' }}
                                  />
                                </div>
                              )}

                              {/* 2. Document or Image Attachment */}
                              {msg.message_type === 'attachment' && msg.attachment_filename && (
                                <div>
                                  {msg.attachment_mimetype?.startsWith('image/') ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                      <img
                                        src={`/api/conversations/${activeConvId}/attachments/${msg.id}?token=${encodeURIComponent(token)}`}
                                        alt={msg.attachment_original_name || 'Attachment'}
                                        style={{
                                          maxWidth: '260px',
                                          maxHeight: '200px',
                                          borderRadius: '8px',
                                          objectFit: 'cover',
                                          display: 'block',
                                        }}
                                      />
                                      <a
                                        href={`/api/conversations/${activeConvId}/attachments/${msg.id}?token=${encodeURIComponent(token)}`}
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
                                        href={`/api/conversations/${activeConvId}/attachments/${msg.id}?token=${encodeURIComponent(token)}`}
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

                  {/* Active Voice Recording Bar */}
                  {isRecordingVoice ? (
                    <div
                      style={{
                        padding: '0.85rem 1rem',
                        borderTop: '1px solid var(--color-border)',
                        backgroundColor: 'var(--color-bg-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
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
                          Recording voice note... {formatDuration(recordingSeconds)}
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
                          className="btn btn-sm btn-primary"
                          onClick={sendVoiceRecording}
                          disabled={recordingSeconds === 0}
                        >
                          Send Voice Note
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
                        accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg,.webp"
                        onChange={handleFileSelected}
                      />

                      {/* Paperclip Button */}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isSending || isUploadingAttachment || activeConv?.is_closed}
                        className="btn btn-sm btn-outline"
                        style={{ padding: '0.55rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title="Attach file (PDF, DOCX, XLSX, Images up to 15MB)"
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
                        title="Record voice note"
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
                  <VideoOffIcon size={24} />
                </div>
                <div>
                  <h4 style={{ fontWeight: '700', fontSize: '1.05rem', color: 'var(--color-text-primary)', margin: 0 }}>
                    {permissionError.type === 'permission_denied'
                      ? 'Media Permission Blocked'
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
                  💡 <strong>How to enable:</strong> Click the camera or lock icon on the left side of your browser address bar, set Camera and Microphone to <em>Allow</em>, then click <strong>Try Again</strong> below.
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
                {permissionError.mode === 'video' && (
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={() => {
                      const mode = 'audio';
                      setPermissionError(null);
                      initiateCall(mode);
                    }}
                  >
                    Switch to Audio Call
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={() => {
                    const isInc = permissionError.isIncoming;
                    const mode = permissionError.mode || 'video';
                    setPermissionError(null);
                    if (isInc) {
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
          <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: 'none' }} />

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
                  {activePeer?.name || 'Peer'} is calling you...
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.65rem' }}>
                <button
                  type="button"
                  onClick={declineIncomingCall}
                  className="btn btn-sm btn-danger"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <PhoneOffIcon size={14} />
                  <span>Decline</span>
                </button>
                <button
                  type="button"
                  onClick={acceptIncomingCall}
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
          {(callStatus === 'connected' || callStatus === 'outgoing') && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 90,
                backgroundColor: 'rgba(15, 23, 42, 0.94)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              {/* Call Top Header */}
              <div
                style={{
                  padding: '1rem 1.5rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#ffffff',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor:
                        connectionState === 'connected'
                          ? '#10b981'
                          : connectionState === 'failed'
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
                      padding: '0.2rem 0.6rem',
                      borderRadius: '9999px',
                      backgroundColor:
                        connectionState === 'connected'
                          ? 'rgba(16, 185, 129, 0.2)'
                          : 'rgba(245, 158, 11, 0.2)',
                      color: connectionState === 'connected' ? '#34d399' : '#fbbf24',
                    }}
                  >
                    {connectionState === 'connected'
                      ? 'Connected (Direct P2P)'
                      : connectionState === 'connecting'
                      ? 'Connecting...'
                      : connectionState === 'reconnecting'
                      ? 'Reconnecting...'
                      : connectionState === 'failed'
                      ? 'Connection Failed'
                      : 'Calling...'}
                  </span>
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
                    <span>In-Call Chat</span>
                  </button>
                  <div style={{ fontWeight: '600', fontSize: '0.95rem', color: '#94a3b8' }}>
                    {callStatus === 'outgoing' ? 'Calling...' : formatDuration(callDuration)}
                  </div>
                </div>
              </div>

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
                  {/* Remote Video Feed */}
                  {callMode === 'video' ? (
                    <video
                      ref={remoteVideoRef}
                      autoPlay
                      playsInline
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  ) : (
                    <div style={{ textAlign: 'center', color: '#ffffff' }}>
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
                      <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                        {callStatus === 'outgoing' ? 'Ringing peer...' : 'Audio connected'}
                      </div>
                    </div>
                  )}

                  {/* Local Picture-in-Picture Video */}
                  {callMode === 'video' && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '1.5rem',
                        right: '1.5rem',
                        width: '160px',
                        height: '110px',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        border: '2px solid rgba(255, 255, 255, 0.25)',
                        backgroundColor: '#0f172a',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                      }}
                    >
                      <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
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
                      width: '320px',
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
                      <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>In-Call Conversation</span>
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
                        gap: '0.75rem',
                      }}
                    >
                      {messages.map((m) => {
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
                            <div>{m.content}</div>
                            <div style={{ fontSize: '0.7rem', opacity: 0.65, marginTop: '0.2rem', textAlign: 'right' }}>
                              {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        );
                      })}
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
                        placeholder="Type a message..."
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
                  padding: '1.25rem',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '1rem',
                  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                  backgroundColor: 'rgba(15, 23, 42, 0.98)',
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

                {/* Toggle Video */}
                {callMode === 'video' && (
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
                )}

                {/* Screen Share */}
                {callMode === 'video' && (
                  <button
                    type="button"
                    onClick={toggleScreenShare}
                    className="btn"
                    style={{
                      backgroundColor: isScreenSharing ? 'var(--color-primary)' : 'rgba(255, 255, 255, 0.15)',
                      color: '#ffffff',
                      borderRadius: '50%',
                      width: '46px',
                      height: '46px',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title={isScreenSharing ? 'Stop screen sharing' : 'Share screen'}
                  >
                    <ScreenShareIcon size={20} />
                  </button>
                )}

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
                <div style={{ display: 'flex', gap: '0.4rem', margin: '0 0.5rem' }}>
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

                {/* End Call Button */}
                <button
                  type="button"
                  onClick={endCall}
                  className="btn btn-danger"
                  style={{
                    borderRadius: '50%',
                    width: '46px',
                    height: '46px',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="End call"
                >
                  <PhoneOffIcon size={20} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
