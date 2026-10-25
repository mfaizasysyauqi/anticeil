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
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [activeActivityTab, setActiveActivityTab] = useState<'canvas' | 'scratchpad'>('canvas');
  const [scratchpadCode, setScratchpadCode] = useState(
    '// Anticeil Collaborative Activity Scratchpad\n// Diskusikan logika workflow, payload webhook, atau format data di sini bersama tim.\n\nconst samplePayload = {\n  event: "lead_generated",\n  timestamp: new Date().toISOString(),\n  source: "WhatsApp Cloud API",\n  data: {\n    customerName: "Budi Santoso",\n    phone: "6281234567890",\n    status: "QUALIFIED"\n  }\n};\nconsole.log("Ready to automate:", samplePayload);',
  );

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
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
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

  const handleToggleVideo = () => {
    if (!localStream) return;
    const next = !isVideoOff;
    localStream.getVideoTracks().forEach((track) => {
      track.enabled = !next;
    });
    setIsVideoOff(next);
    socket?.emit('COMMUNITY_CALL_TOGGLE_MEDIA', {
      channelId: channel.id,
      hasVideo: !next,
    });
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
            {!isVideoOff && localStream ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover -scale-x-100"
              />
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
              'flex-1 min-h-0 grid gap-3 items-center justify-center p-1',
              totalInCall === 1 && 'grid-cols-1 max-w-4xl mx-auto w-full',
              totalInCall === 2 && 'grid-cols-1 md:grid-cols-2 max-w-5xl mx-auto w-full',
              totalInCall >= 3 && 'grid-cols-2 md:grid-cols-3 max-w-6xl mx-auto w-full',
            )}
          >
            {/* LOCAL PARTICIPANT TILE */}
            <div className="relative w-full h-full min-h-[220px] rounded-2xl bg-[#2b2d31] border border-white/5 overflow-hidden flex items-center justify-center shadow-lg group">
              {!isVideoOff && localStream ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover -scale-x-100"
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-2">
                  <div
                    className={cn(
                      'w-20 h-20 rounded-full flex items-center justify-center font-bold text-2xl text-white transition-all duration-200',
                      isSpeakingLocal
                        ? 'bg-emerald-600 ring-4 ring-emerald-500 ring-offset-4 ring-offset-[#2b2d31]'
                        : 'bg-primary/30 text-primary border border-primary/40',
                    )}
                  >
                    {currentUserName.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">Kamera Nonaktif</span>
                </div>
              )}

              {/* Status Pill Bottom-Left */}
              <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-xs flex items-center gap-2 text-xs font-semibold text-white border border-white/10">
                <span className="truncate max-w-[120px]">{currentUserName} (Anda)</span>
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
                <div className="absolute top-3 left-3 px-2 py-0.5 rounded bg-primary text-[10px] font-bold text-white flex items-center gap-1">
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
                {peer.stream && peer.hasVideo ? (
                  <RemoteVideoView stream={peer.stream} isMuted={false} />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="w-20 h-20 rounded-full flex items-center justify-center bg-indigo-600/30 text-indigo-300 font-bold text-2xl border border-indigo-500/40">
                      {peer.userName.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">Kamera Nonaktif</span>
                  </div>
                )}

                {/* Status Pill Bottom-Left */}
                <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-xs flex items-center gap-2 text-xs font-semibold text-white border border-white/10">
                  <span className="truncate max-w-[120px]">{peer.userName}</span>
                  {!peer.hasAudio ? (
                    <MicOff className="w-3.5 h-3.5 text-red-400" />
                  ) : (
                    <Mic className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                </div>

                {peer.isScreenSharing && (
                  <div className="absolute top-3 left-3 px-2 py-0.5 rounded bg-primary text-[10px] font-bold text-white flex items-center gap-1">
                    <Monitor className="w-3 h-3" /> Berbagi Layar
                  </div>
                )}
              </div>
            ))}

            {/* Empty Slot Callout (Invite Teammate) */}
            {participants.length === 0 && (
              <div className="w-full h-full min-h-[220px] rounded-2xl bg-[#1e1f22]/30 border border-dashed border-white/10 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-muted-foreground mb-3">
                  <Users className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-semibold text-white mb-1">
                  Menunggu Rekan Bergabung
                </h4>
                <p className="text-xs text-muted-foreground max-w-xs mb-3">
                  Panggilan aktif di #{channel.name}. Anggota tim lain dapat bergabung langsung dari channel ini.
                </p>
                {!isPlusOrAbove && (
                  <span className="text-[11px] text-amber-300/80 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
                    💡 Paket Free: Maksimal 2 Orang (1-on-1 Call)
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── OPTIONAL ANTICEIL ACTIVITY STAGE (Live Interactive Split Mode) ── */}
        {isActivityOpen && (
          <div className="flex-1 min-h-0 rounded-2xl bg-[#1e1f22] border border-white/10 flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-right-4 duration-300">
            {/* Activity Header */}
            <div className="h-11 px-4 bg-[#2b2d31] border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Rocket className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-white">Anticeil Activity Mode</span>
                <div className="flex items-center gap-1 ml-4 bg-[#1e1f22] p-0.5 rounded-lg border border-white/5">
                  <button
                    onClick={() => setActiveActivityTab('canvas')}
                    className={cn(
                      'px-2 py-1 rounded text-xs font-medium transition-colors',
                      activeActivityTab === 'canvas'
                        ? 'bg-primary text-white'
                        : 'text-muted-foreground hover:text-white',
                    )}
                  >
                    Workflow Canvas
                  </button>
                  <button
                    onClick={() => setActiveActivityTab('scratchpad')}
                    className={cn(
                      'px-2 py-1 rounded text-xs font-medium transition-colors',
                      activeActivityTab === 'scratchpad'
                        ? 'bg-primary text-white'
                        : 'text-muted-foreground hover:text-white',
                    )}
                  >
                    Scratchpad Kolaborasi
                  </button>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsActivityOpen(false)}
                className="h-7 w-7 text-muted-foreground hover:text-white"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Activity Content Body */}
            <div className="flex-1 min-h-0 p-4 overflow-y-auto">
              {activeActivityTab === 'canvas' ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-[#111214]/60 rounded-xl border border-white/5">
                  <div className="w-14 h-14 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary mb-3">
                    <Workflow className="w-7 h-7" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-1">
                    Live Flow Canvas Pair-Programming
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-md mb-4 leading-relaxed">
                    Sedang berada di panggilan bersama tim. Buka alur kerja otomasi di tab terpisah untuk melihat pergerakan kursor dan step otomasi secara langsung (*realtime multiplayer presence*).
                  </p>
                  <Button
                    onClick={() => window.open('/flows', '_blank')}
                    size="sm"
                    className="gap-2 font-semibold shadow-md"
                  >
                    <ExternalLink className="w-4 h-4" /> Buka Canvas di Tab Baru
                  </Button>
                </div>
              ) : (
                <div className="h-full flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                      <FileCode className="w-3.5 h-3.5 text-primary" /> Live Code & Data Scratchpad
                    </span>
                    <span className="text-[10px] text-muted-foreground">Otomatis sinkron dengan rekan di panggilan</span>
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
                    className="flex-1 w-full bg-[#111214] border border-white/10 rounded-xl p-3 font-mono text-xs text-emerald-400 focus:outline-none focus:ring-1 focus:ring-primary resize-none [scrollbar-width:thin]"
                    placeholder="Tulis kode, webhook payload, atau catatan arsitektur di sini..."
                  />
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

// ── Helper Subcomponent to render Remote Video Streams cleanly ─────────
function RemoteVideoView({
  stream,
  isMuted = false,
}: {
  stream: MediaStream;
  isMuted?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={isMuted}
      className="w-full h-full object-cover"
    />
  );
}
