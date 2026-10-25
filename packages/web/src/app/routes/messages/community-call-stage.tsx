import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Monitor,
  MonitorOff,
  PhoneOff,
  Rocket,
  Sparkles,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Crown,
  Check,
  Signal,
  Users,
  Grid,
  FileCode,
  Workflow,
  X,
  Radio,
  ExternalLink,
  Copy,
  Share2,
  UserPlus,
  Play,
  RotateCcw,
  Plus,
  CheckCircle2,
  Terminal,
  Palette,
  Trash2,
  Zap,
  Bot,
  Database,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CommunityAvatar } from './messages-avatar';
import { CommunityChannel, CommunityHub, CommunityMember } from './messages-types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export interface CallParticipant {
  socketId: string;
  userId: string;
  userName: string;
  userAvatar?: string | null;
  hasVideo: boolean;
  hasAudio: boolean;
  isScreenSharing?: boolean;
  stream?: MediaStream;
}

interface CommunityCallStageProps {
  channel: CommunityChannel;
  activeHub?: CommunityHub | null;
  currentUser: {
    id?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    imageUrl?: string | null;
  } | null | undefined;
  isPlusOrAbove: boolean;
  socket: Socket | null;
  isCallActive: boolean;
  isPiP: boolean;
  isActivityOpen?: boolean;
  onToggleActivity?: (open?: boolean) => void;
  onTogglePiP: () => void;
  onEndCall: () => void;
  onNavigateToBilling?: () => void;
}

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export function CommunityCallStage({
  channel,
  activeHub,
  currentUser,
  isPlusOrAbove,
  socket,
  isCallActive,
  isPiP,
  isActivityOpen: propsIsActivityOpen,
  onToggleActivity,
  onTogglePiP,
  onEndCall,
  onNavigateToBilling,
}: CommunityCallStageProps) {
  // Local Media states
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isSpeakingLocal, setIsSpeakingLocal] = useState(false);

  // Remote Peers & WebRTC connections
  const [participants, setParticipants] = useState<CallParticipant[]>([]);
  const peerConnections = useRef<Record<string, RTCPeerConnection>>({});
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);

  // Upgrade modal state for Free Plan 2-person limit
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  // Anticeil Activity Mode (Discord Activities style: Flow automation / interactive whiteboard)
  const [internalActivityOpen, setInternalActivityOpen] = useState(false);
  const isActivityOpen = propsIsActivityOpen !== undefined ? propsIsActivityOpen : internalActivityOpen;
  const setIsActivityOpen = (open: boolean | ((prev: boolean) => boolean)) => {
    const next = typeof open === 'function' ? open(isActivityOpen) : open;
    setInternalActivityOpen(next);
    onToggleActivity?.(next);
  };

  const [activeActivityTab, setActiveActivityTab] = useState<'canvas' | 'scratchpad' | 'whiteboard'>('canvas');
  const [scratchpadCode, setScratchpadCode] = useState(
    '// Anticeil Collaborative Activity Scratchpad\n// Diskusikan logika workflow, payload webhook, atau format data bersama tim.\n\nconst samplePayload = {\n  event: "lead_generated",\n  timestamp: new Date().toISOString(),\n  source: "WhatsApp Cloud API",\n  customer: {\n    name: "Budi Santoso",\n    phone: "+6281234567890",\n    status: "QUALIFIED"\n  }\n};\n\nconsole.log("Memproses payload:", samplePayload.customer.name);\nconsole.log("Status lead:", samplePayload.customer.status);',
  );
  const [scratchpadOutput, setScratchpadOutput] = useState<string | null>(null);
  const [isExecutingScript, setIsExecutingScript] = useState(false);

  // Interactive Flow Simulator State
  const [flowNodes, setFlowNodes] = useState<Array<{
    id: string;
    type: 'trigger' | 'ai' | 'action' | 'db';
    title: string;
    description: string;
    status: 'idle' | 'running' | 'success';
    duration?: string;
  }>>([
    {
      id: 'step-1',
      type: 'trigger',
      title: 'WhatsApp Webhook',
      description: 'Menangkap pesan & lead masuk dari WhatsApp Cloud API',
      status: 'idle',
    },
    {
      id: 'step-2',
      type: 'ai',
      title: 'Anticeil AI Agent',
      description: 'Ekstrak kebutuhan pelanggan via model Claude 3.5 / GPT-4o',
      status: 'idle',
    },
    {
      id: 'step-3',
      type: 'action',
      title: 'Notifikasi Tim Internal',
      description: `Broadcast detail lead ke channel #${channel.name}`,
      status: 'idle',
    },
    {
      id: 'step-4',
      type: 'db',
      title: 'Database Supabase / CRM',
      description: 'Simpan kontak & set status lead menjadi QUALIFIED',
      status: 'idle',
    },
  ]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [activeSimulationStep, setActiveSimulationStep] = useState<number | null>(null);

  // Architecture Whiteboard Canvas State
  const whiteboardCanvasRef = useRef<HTMLCanvasElement>(null);
  const [drawColor, setDrawColor] = useState('#10b981');
  const [brushSize, setBrushSize] = useState(3);
  const isDrawing = useRef(false);
  const lastCoord = useRef<{ x: number; y: number } | null>(null);

  // Audio meters for voice speaking detection (Discord green glow ring)
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const currentUserId = currentUser?.id || 'me';
  const currentUserName =
    `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim() ||
    currentUser?.email?.split('@')[0] ||
    'Pengguna Anticeil';

  // ── 1. Initialize Local Media ──────────────────────────────────────────
  const startLocalMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      setLocalStream(stream);
      setIsVideoOff(false);
      return stream;
    } catch (err) {
      console.warn('Camera failed, falling back to audio only', err);
      try {
        const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: true });
        setLocalStream(audioOnly);
        setIsVideoOff(true);
        return audioOnly;
      } catch (audioErr) {
        toast.error('Tidak dapat mengakses mikrofon atau kamera. Pastikan izin perangkat diberikan.');
        setIsVideoOff(true);
        return null;
      }
    }
  }, []);

  // ── 2. Realtime Speaking Detector (Green Ring) ─────────────────────────
  useEffect(() => {
    if (!localStream) return;
    const audioTrack = localStream.getAudioTracks()[0];
    if (!audioTrack) return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      const source = ctx.createMediaStreamSource(localStream);
      source.connect(analyser);

      audioContextRef.current = ctx;
      analyserRef.current = analyser;

      const buffer = new Uint8Array(analyser.frequencyBinCount);
      let animationId: number;

      const detectSpeaking = () => {
        if (!isMuted) {
          analyser.getByteFrequencyData(buffer);
          let sum = 0;
          for (let i = 0; i < buffer.length; i++) {
            sum += buffer[i];
          }
          const average = sum / buffer.length;
          setIsSpeakingLocal(average > 25);
        } else {
          setIsSpeakingLocal(false);
        }
        animationId = requestAnimationFrame(detectSpeaking);
      };
      detectSpeaking();

      return () => {
        cancelAnimationFrame(animationId);
        if (ctx.state !== 'closed') {
          ctx.close().catch(() => {});
        }
      };
    } catch (e) {
      // AudioContext not supported or blocked by autoplay
    }
  }, [localStream, isMuted]);

  // ── 3. Join / Leave Call via Socket.io ─────────────────────────────────
  useEffect(() => {
    if (!isCallActive || !socket) return;

    let localMediaStream: MediaStream | null = null;

    const initCall = async () => {
      localMediaStream = await startLocalMedia();
      if (!localMediaStream) {
        onEndCall();
        return;
      }

      // Check with backend and register participant
      socket.emit(
        'COMMUNITY_CALL_JOIN',
        {
          channelId: channel.id,
          user: {
            id: currentUserId,
            name: currentUserName,
            avatar: currentUser?.imageUrl || null,
          },
          hasVideo: !isVideoOff,
          hasAudio: !isMuted,
          isScreenSharing: false,
          plan: isPlusOrAbove ? 'plus' : 'free',
        },
        async (res: any) => {
          if (!res || !res.success) {
            if (res?.code === 'UPGRADE_REQUIRED') {
              setIsUpgradeModalOpen(true);
            } else {
              toast.error(res?.message || 'Gagal terhubung ke ruang panggilan');
            }
            onEndCall();
            return;
          }

          toast.success(`Terhubung ke panggilan suara & video: #${channel.name}`);

          // Connect to each existing peer in room
          const existingPeers: CallParticipant[] = res.participants || [];
          setParticipants(existingPeers);

          for (const peer of existingPeers) {
            createPeerConnection(peer.socketId, peer, true, localMediaStream);
          }
        },
      );
    };

    initCall();

    // Socket Event: New peer joined
    const handleUserJoined = (newPeer: CallParticipant) => {
      setParticipants((prev) => {
        if (prev.some((p) => p.socketId === newPeer.socketId)) return prev;
        return [...prev, newPeer];
      });

      // Free Plan guard: if count exceeds 2 and not Plus, alert host
      const totalParticipants = participants.length + 2; // local + existing + new
      if (totalParticipants > 2 && !isPlusOrAbove) {
        setIsUpgradeModalOpen(true);
      }
    };

    // Socket Event: Peer left
    const handleUserLeft = ({ socketId }: { socketId: string }) => {
      setParticipants((prev) => prev.filter((p) => p.socketId !== socketId));
      if (peerConnections.current[socketId]) {
        peerConnections.current[socketId].close();
        delete peerConnections.current[socketId];
      }
      toast.info('Peserta keluar dari panggilan');
    };

    // Socket Event: WebRTC signal (Offer / Answer / ICE)
    const handleSignal = async ({
      fromSocketId,
      signal,
    }: {
      fromSocketId: string;
      signal: any;
    }) => {
      let pc = peerConnections.current[fromSocketId];
      if (!pc) {
        const peer = participants.find((p) => p.socketId === fromSocketId) || {
          socketId: fromSocketId,
          userId: 'remote-user',
          userName: 'Peserta',
          hasVideo: true,
          hasAudio: true,
        };
        pc = createPeerConnection(fromSocketId, peer, false, localMediaStream);
      }

      try {
        if (signal.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('COMMUNITY_CALL_SIGNAL', {
            channelId: channel.id,
            targetSocketId: fromSocketId,
            signal: answer,
          });
        } else if (signal.type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
        } else if (signal.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
      } catch (err) {
        console.error('WebRTC signal error', err);
      }
    };

    // Socket Event: Peer media toggled (mute / video / screen)
    const handlePeerMediaUpdated = ({
      socketId,
      hasVideo,
      hasAudio,
      isScreenSharing,
    }: any) => {
      setParticipants((prev) =>
        prev.map((p) => {
          if (p.socketId !== socketId) return p;
          return {
            ...p,
            hasVideo: hasVideo !== undefined ? hasVideo : p.hasVideo,
            hasAudio: hasAudio !== undefined ? hasAudio : p.hasAudio,
            isScreenSharing: isScreenSharing !== undefined ? isScreenSharing : p.isScreenSharing,
          };
        }),
      );
    };

    socket.on('COMMUNITY_CALL_USER_JOINED', handleUserJoined);
    socket.on('COMMUNITY_CALL_USER_LEFT', handleUserLeft);
    socket.on('COMMUNITY_CALL_SIGNAL', handleSignal);
    socket.on('COMMUNITY_CALL_PEER_MEDIA_UPDATED', handlePeerMediaUpdated);

    return () => {
      socket.off('COMMUNITY_CALL_USER_JOINED', handleUserJoined);
      socket.off('COMMUNITY_CALL_USER_LEFT', handleUserLeft);
      socket.off('COMMUNITY_CALL_SIGNAL', handleSignal);
      socket.off('COMMUNITY_CALL_PEER_MEDIA_UPDATED', handlePeerMediaUpdated);

      // Clean up connections
      socket.emit('COMMUNITY_CALL_LEAVE', { channelId: channel.id });
      for (const id in peerConnections.current) {
        peerConnections.current[id].close();
      }
      peerConnections.current = {};

      if (localMediaStream) {
        localMediaStream.getTracks().forEach((track) => track.stop());
      }
      setLocalStream(null);
    };
  }, [isCallActive, channel.id, socket, isPlusOrAbove]);

  // ── 4. WebRTC Peer Connection Factory ──────────────────────────────────
  const createPeerConnection = (
    targetSocketId: string,
    peerInfo: CallParticipant,
    isInitiator: boolean,
    currentLocalStream: MediaStream | null,
  ): RTCPeerConnection => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnections.current[targetSocketId] = pc;

    // Add local tracks
    if (currentLocalStream) {
      currentLocalStream.getTracks().forEach((track) => {
        pc.addTrack(track, currentLocalStream);
      });
    }

    // ICE candidate generation
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('COMMUNITY_CALL_SIGNAL', {
          channelId: channel.id,
          targetSocketId,
          signal: { candidate: event.candidate },
        });
      }
    };

    // Receive remote stream
    pc.ontrack = (event) => {
      const remoteStream = event.streams[0];
      setParticipants((prev) =>
        prev.map((p) => {
          if (p.socketId === targetSocketId) {
            return { ...p, stream: remoteStream };
          }
          return p;
        }),
      );
    };

    // Negotiate offer if initiator
    if (isInitiator) {
      pc.onnegotiationneeded = async () => {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket?.emit('COMMUNITY_CALL_SIGNAL', {
            channelId: channel.id,
            targetSocketId,
            signal: offer,
          });
        } catch (err) {
          console.error('Failed to create offer', err);
        }
      };
    }

    return pc;
  };

  // ── 5. Media Control Actions ───────────────────────────────────────────
  const handleToggleMute = () => {
    if (!localStream) return;
    const next = !isMuted;
    localStream.getAudioTracks().forEach((track) => {
      track.enabled = !next;
    });
    setIsMuted(next);
    socket?.emit('COMMUNITY_CALL_TOGGLE_MEDIA', {
      channelId: channel.id,
      hasAudio: !next,
    });
  };

  const handleToggleVideo = async () => {
    if (!localStream) {
      const s = await startLocalMedia();
      if (s) setIsVideoOff(false);
      return;
    }
    const next = !isVideoOff;
    const videoTracks = localStream.getVideoTracks();

    if (!next && videoTracks.length === 0) {
      try {
        const camStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
        });
        const newTrack = camStream.getVideoTracks()[0];
        if (newTrack) {
          localStream.addTrack(newTrack);
          for (const sId in peerConnections.current) {
            const pc = peerConnections.current[sId];
            const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
            if (sender) {
              sender.replaceTrack(newTrack);
            } else {
              pc.addTrack(newTrack, localStream);
            }
          }
        }
      } catch (err) {
        toast.error('Tidak dapat mengakses kamera. Pastikan izin kamera aktif.');
        return;
      }
    } else {
      videoTracks.forEach((track) => {
        track.enabled = !next;
      });
    }

    setIsVideoOff(next);
    socket?.emit('COMMUNITY_CALL_TOGGLE_MEDIA', {
      channelId: channel.id,
      hasVideo: !next,
    });
  };

  const handleCopyCallLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link panggilan berhasil disalin! Buka di tab atau browser lain untuk menguji panggilan 2 orang.');
  };

  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      if (screenStream) {
        screenStream.getTracks().forEach((track) => track.stop());
        setScreenStream(null);
      }
      setIsScreenSharing(false);
      socket?.emit('COMMUNITY_CALL_TOGGLE_MEDIA', {
        channelId: channel.id,
        isScreenSharing: false,
      });
      return;
    }

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      setScreenStream(displayStream);
      setIsScreenSharing(true);

      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = displayStream;
      }

      // Replace video track in peer connections with screen share track
      const screenTrack = displayStream.getVideoTracks()[0];
      for (const sId in peerConnections.current) {
        const pc = peerConnections.current[sId];
        const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
        if (sender && screenTrack) {
          sender.replaceTrack(screenTrack);
        }
      }

      screenTrack.onended = () => {
        setIsScreenSharing(false);
        setScreenStream(null);
        if (localStream) {
          const camTrack = localStream.getVideoTracks()[0];
          for (const sId in peerConnections.current) {
            const pc = peerConnections.current[sId];
            const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
            if (sender && camTrack) {
              sender.replaceTrack(camTrack);
            }
          }
        }
        socket?.emit('COMMUNITY_CALL_TOGGLE_MEDIA', {
          channelId: channel.id,
          isScreenSharing: false,
        });
      };

      socket?.emit('COMMUNITY_CALL_TOGGLE_MEDIA', {
        channelId: channel.id,
        isScreenSharing: true,
      });
    } catch (err) {
      console.warn('Screen share cancelled or failed', err);
    }
  };

  // ── 6. Activity Collaborative Handlers & Socket Sync ────────────────────
  const drawStroke = (x0: number, y0: number, x1: number, y1: number, color: string, size: number) => {
    const canvas = whiteboardCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  };

  const clearCanvasLocal = () => {
    const canvas = whiteboardCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleClearCanvas = () => {
    clearCanvasLocal();
    socket?.emit('COMMUNITY_CALL_ACTIVITY_EVENT', {
      channelId: channel.id,
      action: 'WHITEBOARD_CLEAR',
      payload: null,
    });
    toast.info('Papan tulis dibersihkan');
  };

  const runSimulationSequence = (broadcast = true) => {
    if (isSimulating) return;
    setIsSimulating(true);
    toast.info('Memulai simulasi eksekusi alur otomasi...');

    if (broadcast && socket) {
      socket.emit('COMMUNITY_CALL_ACTIVITY_EVENT', {
        channelId: channel.id,
        action: 'FLOW_SIMULATE',
        payload: null,
      });
    }

    setFlowNodes((prev) => prev.map((n) => ({ ...n, status: 'idle', duration: undefined })));

    let current = 0;
    const executeStep = () => {
      if (current < flowNodes.length) {
        setActiveSimulationStep(current);
        setFlowNodes((prev) =>
          prev.map((n, idx) => (idx === current ? { ...n, status: 'running' } : n)),
        );

        setTimeout(() => {
          const randomMs = Math.floor(Math.random() * 80) + 15;
          setFlowNodes((prev) =>
            prev.map((n, idx) =>
              idx === current ? { ...n, status: 'success', duration: `${randomMs}ms` } : n,
            ),
          );
          current++;
          executeStep();
        }, 750);
      } else {
        setActiveSimulationStep(null);
        setIsSimulating(false);
        toast.success('Simulasi alur otomasi berhasil dijalankan! Semua langkah selesai (200 OK).');
      }
    };

    setTimeout(executeStep, 200);
  };

  const handleAddFlowNode = () => {
    const newStep = {
      id: `step-${Date.now()}`,
      type: 'action' as const,
      title: 'Langkah Otomasi Baru',
      description: 'Langkah kustom yang ditambahkan oleh tim saat panggilan',
      status: 'idle' as const,
    };
    const updated = [...flowNodes, newStep];
    setFlowNodes(updated);
    socket?.emit('COMMUNITY_CALL_ACTIVITY_EVENT', {
      channelId: channel.id,
      action: 'FLOW_UPDATE',
      payload: updated,
    });
    toast.success('Langkah otomasi baru ditambahkan!');
  };

  const handleResetFlow = () => {
    const initial = [
      {
        id: 'step-1',
        type: 'trigger' as const,
        title: 'WhatsApp Webhook',
        description: 'Menangkap pesan & lead masuk dari WhatsApp Cloud API',
        status: 'idle' as const,
      },
      {
        id: 'step-2',
        type: 'ai' as const,
        title: 'Anticeil AI Agent',
        description: 'Ekstrak kebutuhan pelanggan via model Claude 3.5 / GPT-4o',
        status: 'idle' as const,
      },
      {
        id: 'step-3',
        type: 'action' as const,
        title: 'Notifikasi Tim Internal',
        description: `Broadcast detail lead ke channel #${channel.name}`,
        status: 'idle' as const,
      },
      {
        id: 'step-4',
        type: 'db' as const,
        title: 'Database Supabase / CRM',
        description: 'Simpan kontak & set status lead menjadi QUALIFIED',
        status: 'idle' as const,
      },
    ];
    setFlowNodes(initial);
    socket?.emit('COMMUNITY_CALL_ACTIVITY_EVENT', {
      channelId: channel.id,
      action: 'FLOW_UPDATE',
      payload: initial,
    });
    toast.info('Alur otomasi di-reset ke default');
  };

  const handleRunScratchpad = () => {
    setIsExecutingScript(true);
    const start = performance.now();
    try {
      const trimmed = scratchpadCode.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        const parsed = JSON.parse(trimmed);
        const elapsed = (performance.now() - start).toFixed(2);
        setScratchpadOutput(`✓ Valid JSON Payload (${elapsed}ms)\n` + JSON.stringify(parsed, null, 2));
        toast.success(`Payload JSON valid! (${elapsed}ms)`);
      } else {
        const mockLog: string[] = [];
        const customConsole = {
          log: (...args: any[]) =>
            mockLog.push(
              args.map((a) => (typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a))).join(' '),
            ),
          info: (...args: any[]) => mockLog.push('[INFO] ' + args.join(' ')),
          warn: (...args: any[]) => mockLog.push('[WARN] ' + args.join(' ')),
          error: (...args: any[]) => mockLog.push('[ERROR] ' + args.join(' ')),
        };
        const runFn = new Function('console', scratchpadCode);
        runFn(customConsole);
        const elapsed = (performance.now() - start).toFixed(2);
        setScratchpadOutput(
          `✓ Script executed successfully in ${elapsed}ms\n--- Console Output ---\n` +
            (mockLog.join('\n') || '(Eksekusi selesai tanpa log output)'),
        );
        toast.success(`Script berhasil dijalankan! (${elapsed}ms)`);
      }
    } catch (err: any) {
      setScratchpadOutput(`✕ Error Eksekusi: ${err.message}`);
      toast.error(`Eksekusi gagal: ${err.message}`);
    } finally {
      setIsExecutingScript(false);
    }
  };

  useEffect(() => {
    if (!socket) return;
    const handleActivityEvent = (data: {
      fromSocketId: string;
      fromUserId?: string;
      action: string;
      payload: any;
    }) => {
      if (data.action === 'SCRATCHPAD_UPDATE') {
        setScratchpadCode(data.payload);
      } else if (data.action === 'FLOW_UPDATE') {
        if (Array.isArray(data.payload)) {
          setFlowNodes(data.payload);
        }
      } else if (data.action === 'FLOW_SIMULATE') {
        runSimulationSequence(false);
      } else if (data.action === 'WHITEBOARD_DRAW') {
        const { x0, y0, x1, y1, color, size } = data.payload || {};
        if (typeof x0 === 'number' && typeof y0 === 'number') {
          drawStroke(x0, y0, x1, y1, color, size);
        }
      } else if (data.action === 'WHITEBOARD_CLEAR') {
        clearCanvasLocal();
      }
    };

    socket.on('COMMUNITY_CALL_ACTIVITY_EVENT', handleActivityEvent);
    return () => {
      socket.off('COMMUNITY_CALL_ACTIVITY_EVENT', handleActivityEvent);
    };
  }, [socket, flowNodes, isSimulating]);

  // Total active count including local
  const totalInCall = participants.length + 1;

  if (!isCallActive) return null;

  // ── Render Floating Picture-in-Picture Mini Stage ──────────────────────
  if (isPiP) {
    return (
      <div className="fixed bottom-4 right-4 z-50 w-80 rounded-2xl bg-[#111214] border border-white/10 shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="h-9 px-3 bg-[#1e1f22] flex items-center justify-between border-b border-white/5 select-none">
          <div className="flex items-center gap-1.5 min-w-0">
            <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse shrink-0" />
            <span className="text-xs font-semibold text-white truncate">
              {channel.name}
            </span>
            <span className="text-[10px] text-muted-foreground">({totalInCall})</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={onTogglePiP}
              className="h-6 w-6 text-muted-foreground hover:text-white"
              title="Perbesar Layar Penuh"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onEndCall}
              className="h-6 w-6 text-red-400 hover:text-red-300 hover:bg-red-500/20"
              title="Putus Panggilan"
            >
              <PhoneOff className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Mini Preview Stage */}
        <div className="relative h-44 bg-[#1e1f22]/60 p-2 grid grid-cols-2 gap-1.5 items-center justify-center">
          {/* Local User Mini */}
          <div className="relative w-full h-full rounded-lg bg-[#2b2d31] overflow-hidden flex items-center justify-center border border-white/5">
            {!isVideoOff && localStream && localStream.getVideoTracks().some((t) => t.readyState === 'live' && t.enabled) ? (
              <LocalVideoView stream={localStream} />
            ) : (
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center bg-primary/20 text-primary font-bold text-sm transition-all',
                  isSpeakingLocal && 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-[#2b2d31]',
                )}
              >
                {currentUserName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <span className="absolute bottom-1 left-1 px-1 py-0.5 rounded bg-black/60 text-[9px] text-white">
              Anda {isMuted && '🔇'}
            </span>
          </div>

          {/* Remote Peer Mini */}
          {participants.length > 0 ? (
            <div className="relative w-full h-full rounded-lg bg-[#2b2d31] overflow-hidden flex items-center justify-center border border-white/5">
              {participants[0].stream && participants[0].hasVideo ? (
                <RemoteVideoView stream={participants[0].stream} isMuted={false} />
              ) : (
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-indigo-500/20 text-indigo-400 font-bold text-sm">
                  {participants[0].userName.slice(0, 2).toUpperCase()}
                </div>
              )}
              <span className="absolute bottom-1 left-1 px-1 py-0.5 rounded bg-black/60 text-[9px] text-white truncate max-w-[80px]">
                {participants[0].userName} {!participants[0].hasAudio && '🔇'}
              </span>
            </div>
          ) : (
            <div className="w-full h-full rounded-lg bg-[#2b2d31]/50 border border-dashed border-white/10 flex flex-col items-center justify-center text-center p-2">
              <span className="text-[10px] text-muted-foreground">Menunggu rekan...</span>
            </div>
          )}
        </div>

        {/* Mini Quick Actions */}
        <div className="h-10 px-3 bg-[#1e1f22] flex items-center justify-center gap-3 border-t border-white/5">
          <Button
            size="icon"
            variant="ghost"
            onClick={handleToggleMute}
            className={cn(
              'h-7 w-7 rounded-full',
              isMuted ? 'bg-red-500/20 text-red-400' : 'text-white hover:bg-white/10',
            )}
          >
            {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={handleToggleVideo}
            className={cn(
              'h-7 w-7 rounded-full',
              isVideoOff ? 'bg-red-500/20 text-red-400' : 'text-white hover:bg-white/10',
            )}
          >
            {isVideoOff ? <VideoOff className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
          </Button>
          <Button
            size="icon"
            variant="destructive"
            onClick={onEndCall}
            className="h-7 w-7 rounded-full bg-red-600 hover:bg-red-700"
          >
            <PhoneOff className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  // ── Render Full Discord Stage View ────────────────────────────────────
  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[#111214] text-white select-none relative overflow-hidden">
      {/* ── Discord Top Stage Header Bar ───────────────────────────────── */}
      <div className="h-12 border-b border-white/10 px-4 flex items-center justify-between shrink-0 bg-[#1e1f22]/90 backdrop-blur-xs z-20">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-white truncate">
                #{channel.name}
              </span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 flex items-center gap-1">
                <Signal className="w-3 h-3" /> Voice Terhubung
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground truncate">
              {activeHub?.name || 'Komunitas Anticeil'} • {totalInCall} Peserta dalam panggilan
            </span>
          </div>
        </div>

        {/* Top Header Controls: Plan Pill, Screen Mode & PiP */}
        <div className="flex items-center gap-2">
          {/* Freemium Limit Pill */}
          <div
            onClick={() => {
              if (!isPlusOrAbove) setIsUpgradeModalOpen(true);
            }}
            className={cn(
              'px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all border',
              isPlusOrAbove
                ? 'bg-primary/20 text-primary border-primary/30'
                : 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25',
            )}
            title={isPlusOrAbove ? 'Paket Plus / Unlimited Group Call' : 'Free Plan: Maks 2 Orang'}
          >
            {isPlusOrAbove ? (
              <>
                <Crown className="w-3.5 h-3.5 text-primary" />
                <span>Plus Plan (Group Call Aktif)</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Free Plan ({totalInCall}/2 Orang)</span>
              </>
            )}
          </div>

          {/* Picture in Picture Button */}
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onTogglePiP}
                  className="h-8 w-8 rounded-lg text-muted-foreground hover:text-white hover:bg-white/10"
                >
                  <Minimize2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Minimize ke Picture-in-Picture
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* ── Discord Main Stage Body (Split Video Grid & Optional Activity) ── */}
      <div className="flex-1 min-h-0 flex overflow-hidden p-3 gap-3">
        {/* VIDEO GRID STAGE */}
        <div
          className={cn(
            'flex-1 min-h-0 min-w-0 transition-all duration-300 rounded-2xl bg-[#1e1f22]/50 border border-white/5 p-3 flex flex-col overflow-hidden',
            isActivityOpen && 'lg:w-1/2 shrink-0',
          )}
        >
          {/* Dynamic Video Grid Layout */}
          <div
            className={cn(
              'flex-1 min-h-0 relative flex items-center justify-center p-2',
              participants.length > 0 && 'grid gap-3 w-full',
              participants.length === 1 && 'grid-cols-1 md:grid-cols-2 max-w-5xl mx-auto',
              participants.length >= 2 && 'grid-cols-2 md:grid-cols-3 max-w-6xl mx-auto',
            )}
          >
            {/* Solitary Banner when user is alone */}
            {participants.length === 0 && (
              <div className="absolute top-4 inset-x-0 mx-auto w-fit z-20 px-4 py-2 rounded-full bg-black/70 backdrop-blur-md border border-white/10 flex items-center gap-3 shadow-xl animate-in fade-in slide-in-from-top-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs text-white/90">
                  Anda sendirian di #{channel.name}.
                </span>
                <button
                  onClick={() => setIsActivityOpen((prev) => !prev)}
                  className="px-2.5 py-1 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-1.5 border border-emerald-500/30 transition-all cursor-pointer"
                >
                  <Rocket className="w-3.5 h-3.5" />
                  {isActivityOpen ? 'Tutup Activity' : 'Mulai Anticeil Activity'}
                </button>
                <button
                  onClick={handleCopyCallLink}
                  className="px-2.5 py-1 rounded-full bg-primary/20 hover:bg-primary/30 text-primary text-xs font-semibold flex items-center gap-1.5 border border-primary/30 transition-all cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  Salin Link Panggilan
                </button>
              </div>
            )}

            {/* LOCAL PARTICIPANT TILE */}
            <div
              className={cn(
                'relative rounded-2xl bg-[#2b2d31] border border-white/5 overflow-hidden flex items-center justify-center shadow-lg group transition-all',
                participants.length === 0
                  ? 'w-full h-full max-w-4xl max-h-[80vh] min-h-[300px]'
                  : 'w-full h-full min-h-[220px]',
              )}
            >
              {!isVideoOff && localStream && localStream.getVideoTracks().some((t) => t.readyState === 'live' && t.enabled) ? (
                <LocalVideoView stream={localStream} />
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 py-6">
                  <div className="relative">
                    <div
                      className={cn(
                        'w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center transition-all duration-300 relative z-10',
                        isSpeakingLocal
                          ? 'ring-4 ring-emerald-500 ring-offset-4 ring-offset-[#2b2d31] scale-105'
                          : 'ring-2 ring-white/10',
                      )}
                    >
                      <CommunityAvatar
                        name={currentUserName}
                        imageUrl={currentUser?.imageUrl}
                        email={currentUser?.email}
                        size={104}
                        showStatus={false}
                        className="w-full h-full rounded-full"
                      />
                    </div>
                    {/* Ambient speaking glow behind avatar */}
                    {isSpeakingLocal && (
                      <div className="absolute inset-0 rounded-full bg-emerald-500/25 blur-xl animate-pulse -z-0" />
                    )}
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-base font-bold text-white tracking-wide">{currentUserName}</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                      {isVideoOff ? <VideoOff className="w-3.5 h-3.5 text-red-400" /> : <Mic className="w-3.5 h-3.5 text-emerald-400" />}
                      {isVideoOff ? 'Kamera Mati' : 'Voice Aktif'}
                    </span>
                  </div>
                </div>
              )}

              {/* Status Pill Bottom-Left */}
              <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-xs flex items-center gap-2 text-xs font-semibold text-white border border-white/10 z-10">
                <span className="truncate max-w-[140px]">{currentUserName} (Anda)</span>
                {isMuted ? (
                  <MicOff className="w-3.5 h-3.5 text-red-400" />
                ) : isSpeakingLocal ? (
                  <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                ) : (
                  <Mic className="w-3.5 h-3.5 text-muted-foreground" />
                )}
              </div>

              {/* Screen Share Tag */}
              {isScreenSharing && (
                <div className="absolute top-3 left-3 px-2.5 py-0.5 rounded bg-primary text-[10px] font-bold text-white flex items-center gap-1 z-10">
                  <Monitor className="w-3 h-3" /> Berbagi Layar
                </div>
              )}
            </div>

            {/* REMOTE PARTICIPANTS TILES */}
            {participants.map((peer) => (
              <div
                key={peer.socketId}
                className="relative w-full h-full min-h-[220px] rounded-2xl bg-[#2b2d31] border border-white/5 overflow-hidden flex items-center justify-center shadow-lg group"
              >
                {peer.stream && peer.hasVideo && peer.stream.getVideoTracks().some((t) => t.readyState === 'live') ? (
                  <RemoteVideoView stream={peer.stream} isMuted={false} />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-3 py-6">
                    <div className="relative">
                      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center ring-2 ring-white/10 relative z-10">
                        <CommunityAvatar
                          name={peer.userName}
                          imageUrl={peer.userAvatar}
                          size={104}
                          showStatus={false}
                          className="w-full h-full rounded-full"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-base font-bold text-white tracking-wide">{peer.userName}</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                        {!peer.hasAudio ? <MicOff className="w-3.5 h-3.5 text-red-400" /> : <Mic className="w-3.5 h-3.5 text-emerald-400" />}
                        {!peer.hasAudio ? 'Muted' : 'Tersambung'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Status Pill Bottom-Left */}
                <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-xs flex items-center gap-2 text-xs font-semibold text-white border border-white/10 z-10">
                  <span className="truncate max-w-[140px]">{peer.userName}</span>
                  {!peer.hasAudio ? (
                    <MicOff className="w-3.5 h-3.5 text-red-400" />
                  ) : (
                    <Mic className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                </div>

                {peer.isScreenSharing && (
                  <div className="absolute top-3 left-3 px-2.5 py-0.5 rounded bg-primary text-[10px] font-bold text-white flex items-center gap-1 z-10">
                    <Monitor className="w-3 h-3" /> Berbagi Layar
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── OPTIONAL ANTICEIL ACTIVITY STAGE (Live Interactive Split Mode) ── */}
        {isActivityOpen && (
          <div className="flex-1 min-h-0 rounded-2xl bg-[#1e1f22] border border-white/10 flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-right-4 duration-300">
            {/* Activity Header */}
            <div className="h-11 px-4 bg-[#2b2d31] border-b border-white/10 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Rocket className="w-4 h-4 text-primary animate-pulse" />
                <span className="text-xs font-bold text-white">Anticeil Activity</span>
                <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/25">
                  Multiplayer Live
                </span>
                <div className="flex items-center gap-1 ml-3 bg-[#111214] p-0.5 rounded-lg border border-white/5">
                  <button
                    onClick={() => setActiveActivityTab('canvas')}
                    className={cn(
                      'px-2.5 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5',
                      activeActivityTab === 'canvas'
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-muted-foreground hover:text-white',
                    )}
                  >
                    <Workflow className="w-3.5 h-3.5" />
                    Workflow Canvas
                  </button>
                  <button
                    onClick={() => setActiveActivityTab('scratchpad')}
                    className={cn(
                      'px-2.5 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5',
                      activeActivityTab === 'scratchpad'
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-muted-foreground hover:text-white',
                    )}
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    Code Runner
                  </button>
                  <button
                    onClick={() => setActiveActivityTab('whiteboard')}
                    className={cn(
                      'px-2.5 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5',
                      activeActivityTab === 'whiteboard'
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-muted-foreground hover:text-white',
                    )}
                  >
                    <Palette className="w-3.5 h-3.5" />
                    Whiteboard
                  </button>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsActivityOpen(false)}
                className="h-7 w-7 text-muted-foreground hover:text-white"
                title="Tutup Anticeil Activity"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Activity Content Body */}
            <div className="flex-1 min-h-0 p-3 overflow-y-auto [scrollbar-width:thin]">
              {/* TAB 1: WORKFLOW CANVAS & SIMULATOR */}
              {activeActivityTab === 'canvas' && (
                <div className="h-full flex flex-col gap-3">
                  {/* Canvas Toolbar */}
                  <div className="p-2.5 rounded-xl bg-[#2b2d31]/80 border border-white/5 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => runSimulationSequence(true)}
                        disabled={isSimulating}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-1.5 shadow-md"
                      >
                        {isSimulating ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Play className="w-3.5 h-3.5 fill-current" />
                        )}
                        {isSimulating ? 'Menjalankan Simulasi...' : 'Simulasikan Eksekusi Alur'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleAddFlowNode}
                        className="border-white/10 hover:bg-white/10 text-xs gap-1 text-white"
                      >
                        <Plus className="w-3.5 h-3.5" /> Tambah Langkah
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleResetFlow}
                        className="text-xs text-muted-foreground hover:text-white gap-1"
                      >
                        <RotateCcw className="w-3 h-3" /> Reset
                      </Button>
                    </div>
                    <span className="text-[11px] text-muted-foreground hidden sm:inline">
                      Semua rekan di panggilan dapat melihat simulasi secara sinkron
                    </span>
                  </div>

                  {/* Flow Nodes Visual Canvas */}
                  <div className="flex-1 min-h-[300px] p-4 bg-[#111214]/80 rounded-xl border border-white/5 flex flex-col gap-3 overflow-y-auto">
                    {flowNodes.map((node, index) => {
                      const isLast = index === flowNodes.length - 1;
                      return (
                        <div key={node.id} className="flex flex-col items-center">
                          <div
                            className={cn(
                              'w-full max-w-lg p-3.5 rounded-xl border transition-all duration-300 flex items-center justify-between',
                              node.status === 'running' && 'bg-primary/20 border-primary ring-2 ring-primary/40 scale-102',
                              node.status === 'success' && 'bg-emerald-950/40 border-emerald-500/60',
                              node.status === 'idle' && 'bg-[#1e1f22] border-white/10 hover:border-white/20',
                            )}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={cn(
                                  'w-9 h-9 rounded-lg flex items-center justify-center shrink-0 font-bold',
                                  node.type === 'trigger' && 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
                                  node.type === 'ai' && 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
                                  node.type === 'action' && 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
                                  node.type === 'db' && 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
                                )}
                              >
                                {node.type === 'trigger' && <Zap className="w-4 h-4" />}
                                {node.type === 'ai' && <Bot className="w-4 h-4" />}
                                {node.type === 'action' && <Workflow className="w-4 h-4" />}
                                {node.type === 'db' && <Database className="w-4 h-4" />}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-white truncate">{node.title}</span>
                                  <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.2 rounded bg-white/5 text-muted-foreground">
                                    {node.type}
                                  </span>
                                </div>
                                <span className="text-[11px] text-muted-foreground truncate">{node.description}</span>
                              </div>
                            </div>

                            {/* Status indicator badge */}
                            <div className="shrink-0 ml-2">
                              {node.status === 'running' && (
                                <span className="flex items-center gap-1 text-[11px] font-semibold text-primary animate-pulse">
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Running
                                </span>
                              )}
                              {node.status === 'success' && (
                                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> 200 OK ({node.duration})
                                </span>
                              )}
                              {node.status === 'idle' && (
                                <span className="text-[10px] text-muted-foreground">Menunggu</span>
                              )}
                            </div>
                          </div>

                          {/* Connecting arrow line */}
                          {!isLast && (
                            <div className="w-0.5 h-5 bg-gradient-to-b from-white/20 to-white/10 my-1 relative flex items-center justify-center">
                              <ArrowRight className="w-3 h-3 text-muted-foreground rotate-90" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 2: LIVE CODE RUNNER & JSON SCRATCHPAD */}
              {activeActivityTab === 'scratchpad' && (
                <div className="h-full flex flex-col gap-2">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-primary" /> Live Code & JSON Playground
                    </span>
                    <Button
                      size="sm"
                      onClick={handleRunScratchpad}
                      disabled={isExecutingScript}
                      className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5 shadow"
                    >
                      <Play className="w-3 h-3 fill-current" /> Jalankan Script / Validasi
                    </Button>
                  </div>
                  <textarea
                    value={scratchpadCode}
                    onChange={(e) => {
                      setScratchpadCode(e.target.value);
                      socket?.emit('COMMUNITY_CALL_ACTIVITY_EVENT', {
                        channelId: channel.id,
                        action: 'SCRATCHPAD_UPDATE',
                        payload: e.target.value,
                      });
                    }}
                    className="flex-1 min-h-[160px] w-full bg-[#111214] border border-white/10 rounded-xl p-3 font-mono text-xs text-emerald-400 focus:outline-none focus:ring-1 focus:ring-primary resize-none [scrollbar-width:thin] leading-relaxed select-text"
                    placeholder="Tulis kode Javascript atau payload JSON di sini..."
                  />

                  {/* Terminal Execution Output Console */}
                  <div className="h-32 bg-black/90 border border-white/10 rounded-xl p-2.5 font-mono text-[11px] text-white/90 overflow-y-auto [scrollbar-width:thin] select-text">
                    <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1 flex items-center justify-between">
                      <span>Console Output:</span>
                      <button
                        onClick={() => setScratchpadOutput(null)}
                        className="text-muted-foreground hover:text-white text-[10px]"
                      >
                        Bersihkan
                      </button>
                    </div>
                    {scratchpadOutput ? (
                      <pre className="text-emerald-300 whitespace-pre-wrap">{scratchpadOutput}</pre>
                    ) : (
                      <span className="text-muted-foreground italic">
                        Klik tombol "Jalankan Script / Validasi" di atas untuk melihat hasil eksekusi.
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: WHITEBOARD ARSITEKTUR */}
              {activeActivityTab === 'whiteboard' && (
                <div className="h-full flex flex-col gap-2">
                  {/* Whiteboard Controls */}
                  <div className="p-2 rounded-xl bg-[#2b2d31]/80 border border-white/5 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-muted-foreground mr-1">Warna:</span>
                      {['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#ffffff'].map((color) => (
                        <button
                          key={color}
                          onClick={() => setDrawColor(color)}
                          className={cn(
                            'w-5 h-5 rounded-full transition-all border',
                            drawColor === color ? 'scale-125 border-white ring-2 ring-primary' : 'border-transparent opacity-80 hover:opacity-100',
                          )}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                      <div className="w-[1px] h-4 bg-white/10 mx-1.5" />
                      <span className="text-xs font-semibold text-muted-foreground">Tebal:</span>
                      {[2, 4, 8].map((size) => (
                        <button
                          key={size}
                          onClick={() => setBrushSize(size)}
                          className={cn(
                            'px-2 py-0.5 rounded text-xs font-bold transition-all',
                            brushSize === size ? 'bg-primary text-white' : 'text-muted-foreground hover:text-white',
                          )}
                        >
                          {size}px
                        </button>
                      ))}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleClearCanvas}
                      className="h-7 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/20 gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Bersihkan Papan
                    </Button>
                  </div>

                  {/* HTML5 Canvas Element */}
                  <div className="flex-1 min-h-[300px] rounded-xl overflow-hidden border border-white/10 relative bg-[#111214]">
                    <canvas
                      ref={whiteboardCanvasRef}
                      width={900}
                      height={600}
                      onMouseDown={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const scaleX = e.currentTarget.width / rect.width;
                        const scaleY = e.currentTarget.height / rect.height;
                        const x = (e.clientX - rect.left) * scaleX;
                        const y = (e.clientY - rect.top) * scaleY;
                        isDrawing.current = true;
                        lastCoord.current = { x, y };
                      }}
                      onMouseMove={(e) => {
                        if (!isDrawing.current || !lastCoord.current) return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        const scaleX = e.currentTarget.width / rect.width;
                        const scaleY = e.currentTarget.height / rect.height;
                        const x = (e.clientX - rect.left) * scaleX;
                        const y = (e.clientY - rect.top) * scaleY;
                        drawStroke(lastCoord.current.x, lastCoord.current.y, x, y, drawColor, brushSize);
                        socket?.emit('COMMUNITY_CALL_ACTIVITY_EVENT', {
                          channelId: channel.id,
                          action: 'WHITEBOARD_DRAW',
                          payload: {
                            x0: lastCoord.current.x,
                            y0: lastCoord.current.y,
                            x1: x,
                            y1: y,
                            color: drawColor,
                            size: brushSize,
                          },
                        });
                        lastCoord.current = { x, y };
                      }}
                      onMouseUp={() => {
                        isDrawing.current = false;
                        lastCoord.current = null;
                      }}
                      onMouseLeave={() => {
                        isDrawing.current = false;
                        lastCoord.current = null;
                      }}
                      className="w-full h-full cursor-crosshair touch-none"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Discord Bottom Floating Control Dock ────────────────────────── */}
      <div className="h-20 shrink-0 flex items-center justify-center px-4 bg-gradient-to-t from-[#111214] via-[#111214]/90 to-transparent z-20">
        <div className="px-5 py-2.5 rounded-2xl bg-[#1e1f22] border border-white/10 shadow-2xl flex items-center gap-3">
          {/* Mute Button */}
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleToggleMute}
                  className={cn(
                    'w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-md',
                    isMuted
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-[#2b2d31] hover:bg-white/15 text-white',
                  )}
                >
                  {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs font-semibold">
                {isMuted ? 'Nyalakan Mikrofon' : 'Matikan Mikrofon'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Camera Button */}
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleToggleVideo}
                  className={cn(
                    'w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-md',
                    isVideoOff
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-[#2b2d31] hover:bg-white/15 text-white',
                  )}
                >
                  {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs font-semibold">
                {isVideoOff ? 'Nyalakan Kamera' : 'Matikan Kamera'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Screen Share Button */}
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleToggleScreenShare}
                  className={cn(
                    'w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-md',
                    isScreenSharing
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-[#2b2d31] hover:bg-white/15 text-white',
                  )}
                >
                  {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs font-semibold">
                {isScreenSharing ? 'Hentikan Berbagi Layar' : 'Berbagi Layar (Screen Share)'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Anticeil Activity (Canvas / Flow Whiteboard) */}
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setIsActivityOpen(!isActivityOpen)}
                  className={cn(
                    'w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-md',
                    isActivityOpen
                      ? 'bg-primary text-white shadow-primary/30'
                      : 'bg-[#2b2d31] hover:bg-white/15 text-white',
                  )}
                >
                  <Rocket className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs font-semibold">
                {isActivityOpen ? 'Tutup Anticeil Activity' : 'Mulai Anticeil Activity'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Copy Call Link Button */}
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleCopyCallLink}
                  className="w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-md bg-[#2b2d31] hover:bg-white/15 text-white"
                >
                  <Share2 className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs font-semibold">
                Salin Link Panggilan
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="w-[1px] h-6 bg-white/10 mx-1" />

          {/* Disconnect Call Button (Red Phone Off) */}
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onEndCall}
                  className="w-12 h-11 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-all cursor-pointer shadow-lg shadow-red-600/30"
                >
                  <PhoneOff className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs font-bold text-red-400">
                Putus Panggilan
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* ── Discord Nitro / Anticeil Plus Paywall Modal ──────────────────── */}
      <Dialog open={isUpgradeModalOpen} onOpenChange={setIsUpgradeModalOpen}>
        <DialogContent className="sm:max-w-[480px] p-0 bg-[#1e1f22] border-white/15 text-white overflow-hidden shadow-2xl">
          {/* Banner Graphic Header */}
          <div className="relative h-32 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-6 flex flex-col justify-end">
            <div className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-amber-300 animate-spin-slow" />
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-black/40 text-white backdrop-blur-md w-fit mb-1 border border-white/20">
              <Crown className="w-3.5 h-3.5 text-amber-300" /> ANTICEIL PLUS
            </span>
            <h3 className="text-xl font-extrabold text-white tracking-tight">
              Batas Peserta Tercapai (Free Plan)
            </h3>
          </div>

          <div className="p-6 space-y-4">
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Paket <strong className="text-white">Free</strong> mendukung panggilan video & suara 1-on-1 gratis selamanya (maksimal 2 orang). Untuk menghubungkan <strong className="text-white">3 orang atau lebih</strong> dalam group call bersama tim Anda, silakan tingkatkan ke paket <strong className="text-primary font-semibold">Anticeil Plus</strong>.
            </DialogDescription>

            <div className="space-y-2.5 rounded-xl bg-black/30 p-3.5 border border-white/10 text-xs">
              <div className="flex items-center gap-2 text-white/90">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Group Video & Voice Call hingga 25+ peserta bersamaan</span>
              </div>
              <div className="flex items-center gap-2 text-white/90">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>High-Definition 1080p 60FPS Screen Sharing</span>
              </div>
              <div className="flex items-center gap-2 text-white/90">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Anticeil Activity: Live Collaborative Workflow Canvas</span>
              </div>
              <div className="flex items-center gap-2 text-white/90">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Tanpa batas durasi panggilan (*unlimited minutes*)</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsUpgradeModalOpen(false)}
                className="text-muted-foreground hover:text-white"
              >
                Nanti Saja
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setIsUpgradeModalOpen(false);
                  if (onNavigateToBilling) {
                    onNavigateToBilling();
                  } else {
                    window.location.href = '/platform/billing';
                  }
                }}
                className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:opacity-90 text-white font-bold gap-1.5 shadow-lg shadow-purple-500/20"
              >
                <Sparkles className="w-4 h-4" /> Upgrade ke Plus Sekarang
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Helper Subcomponent to render Local Video Stream cleanly ─────────
function LocalVideoView({
  stream,
  className,
}: {
  stream: MediaStream | null;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video && stream) {
      video.srcObject = stream;
      video.play().catch((err) => {
        console.warn('Local video play error:', err);
      });
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className={cn('w-full h-full object-cover -scale-x-100', className)}
    />
  );
}

// ── Helper Subcomponent to render Remote Video Streams cleanly ─────────
function RemoteVideoView({
  stream,
  isMuted = false,
  className,
}: {
  stream: MediaStream;
  isMuted?: boolean;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video && stream) {
      video.srcObject = stream;
      video.play().catch((err) => {
        console.warn('Remote video play error:', err);
      });
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={isMuted}
      className={cn('w-full h-full object-cover', className)}
    />
  );
}
