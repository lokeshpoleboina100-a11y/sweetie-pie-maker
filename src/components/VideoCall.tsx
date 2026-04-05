import { useState, useRef, useEffect, useCallback } from 'react';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface VideoCallProps {
  jobId: string;
  onClose: () => void;
}

type CallState = 'idle' | 'calling' | 'ringing' | 'connected' | 'ended';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export default function VideoCall({ jobId, onClose }: VideoCallProps) {
  const { user } = useAuth();
  const [callState, setCallState] = useState<CallState>('idle');
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isAudioOnly, setIsAudioOnly] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const cleanup = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current = null;
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  const setupPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate && channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: { candidate: e.candidate, from: user?.id },
        });
      }
    };

    pc.ontrack = (e) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = e.streams[0];
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') setCallState('connected');
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        setCallState('ended');
        setTimeout(() => onClose(), 2000);
      }
    };

    return pc;
  }, [user, onClose]);

  const startCall = useCallback(async (audioOnly = false) => {
    if (!user || !jobId) return;
    setIsAudioOnly(audioOnly);
    setCallState('calling');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: !audioOnly,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = setupPeerConnection();
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      const channel = supabase.channel(`call:${jobId}`);
      channelRef.current = channel;

      channel
        .on('broadcast', { event: 'answer' }, async (msg) => {
          if (msg.payload.from !== user.id && pc.signalingState !== 'stable') {
            await pc.setRemoteDescription(new RTCSessionDescription(msg.payload.sdp));
            setCallState('connected');
          }
        })
        .on('broadcast', { event: 'ice-candidate' }, async (msg) => {
          if (msg.payload.from !== user.id && msg.payload.candidate) {
            try { await pc.addIceCandidate(new RTCIceCandidate(msg.payload.candidate)); } catch {}
          }
        })
        .on('broadcast', { event: 'hangup' }, () => {
          setCallState('ended');
          cleanup();
          setTimeout(() => onClose(), 1500);
        })
        .subscribe(async () => {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          channel.send({
            type: 'broadcast',
            event: 'offer',
            payload: { sdp: offer, from: user.id, audioOnly },
          });
        });
    } catch {
      setCallState('idle');
    }
  }, [user, jobId, setupPeerConnection, cleanup, onClose]);

  const answerCall = useCallback(async (offerPayload: any) => {
    if (!user) return;
    setCallState('connected');
    setIsAudioOnly(offerPayload.audioOnly);

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: !offerPayload.audioOnly,
    });
    localStreamRef.current = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;

    const pc = setupPeerConnection();
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));

    await pc.setRemoteDescription(new RTCSessionDescription(offerPayload.sdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    channelRef.current?.send({
      type: 'broadcast',
      event: 'answer',
      payload: { sdp: answer, from: user.id },
    });
  }, [user, setupPeerConnection]);

  // Listen for incoming calls
  useEffect(() => {
    if (!user || !jobId) return;
    const channel = supabase.channel(`call:${jobId}`);
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'offer' }, (msg) => {
        if (msg.payload.from !== user.id && callState === 'idle') {
          setCallState('ringing');
          // Auto-store the offer to answer later
          (window as any).__pendingOffer = msg.payload;
        }
      })
      .on('broadcast', { event: 'ice-candidate' }, async (msg) => {
        if (msg.payload.from !== user.id && pcRef.current && msg.payload.candidate) {
          try { await pcRef.current.addIceCandidate(new RTCIceCandidate(msg.payload.candidate)); } catch {}
        }
      })
      .on('broadcast', { event: 'hangup' }, () => {
        setCallState('ended');
        cleanup();
        setTimeout(() => onClose(), 1500);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, jobId, callState, cleanup, onClose]);

  const hangup = () => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'hangup',
      payload: { from: user?.id },
    });
    cleanup();
    setCallState('ended');
    setTimeout(() => onClose(), 1000);
  };

  const toggleMute = () => {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  };

  const toggleVideo = () => {
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoOn(videoTrack.enabled);
    }
  };

  // Idle: show call buttons
  if (callState === 'idle') {
    return (
      <div className="fixed inset-0 bg-background/95 z-50 flex flex-col items-center justify-center gap-6">
        <Button variant="ghost" size="icon" className="absolute top-4 right-4" onClick={onClose}>
          <X className="h-6 w-6" />
        </Button>
        <h2 className="text-xl font-bold">Start a Call</h2>
        <div className="flex gap-4">
          <Button
            size="lg"
            className="gap-2 rounded-full h-14 px-8 bg-green-600 hover:bg-green-700"
            onClick={() => startCall(true)}
          >
            <Phone className="h-5 w-5" /> Voice Call
          </Button>
          <Button
            size="lg"
            className="gap-2 rounded-full h-14 px-8"
            onClick={() => startCall(false)}
          >
            <Video className="h-5 w-5" /> Video Call
          </Button>
        </div>
      </div>
    );
  }

  // Ringing: incoming call
  if (callState === 'ringing') {
    return (
      <div className="fixed inset-0 bg-background/95 z-50 flex flex-col items-center justify-center gap-6">
        <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
          <Phone className="h-10 w-10 text-primary" />
        </div>
        <h2 className="text-xl font-bold">Incoming Call...</h2>
        <div className="flex gap-4">
          <Button
            size="lg"
            className="rounded-full h-14 w-14 bg-green-600 hover:bg-green-700"
            onClick={() => answerCall((window as any).__pendingOffer)}
          >
            <Phone className="h-6 w-6" />
          </Button>
          <Button
            size="lg"
            variant="destructive"
            className="rounded-full h-14 w-14"
            onClick={hangup}
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Remote video (full screen) */}
      <div className="flex-1 relative">
        {!isAudioOnly ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="h-24 w-24 rounded-full bg-primary/20 flex items-center justify-center">
              <Phone className="h-10 w-10 text-primary" />
            </div>
          </div>
        )}

        {/* Call status */}
        {callState === 'calling' && (
          <div className="absolute top-8 left-0 right-0 text-center">
            <p className="text-white text-lg font-semibold">Calling...</p>
          </div>
        )}

        {/* Local video (pip) */}
        {!isAudioOnly && (
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="absolute bottom-24 right-4 w-32 h-44 rounded-2xl object-cover border-2 border-white/20"
          />
        )}
      </div>

      {/* Controls */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-14 w-14 rounded-full',
            isMuted ? 'bg-destructive/80 text-white' : 'bg-white/20 text-white'
          )}
          onClick={toggleMute}
        >
          {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
        </Button>

        {!isAudioOnly && (
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-14 w-14 rounded-full',
              !isVideoOn ? 'bg-destructive/80 text-white' : 'bg-white/20 text-white'
            )}
            onClick={toggleVideo}
          >
            {isVideoOn ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
          </Button>
        )}

        <Button
          variant="destructive"
          size="icon"
          className="h-14 w-14 rounded-full"
          onClick={hangup}
        >
          <PhoneOff className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}
