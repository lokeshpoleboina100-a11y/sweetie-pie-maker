import { useState, useRef, useCallback } from 'react';
import { Mic, Square, Trash2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface VoiceRecorderProps {
  onSend: (blob: Blob, durationSec: number) => void;
  disabled?: boolean;
}

export default function VoiceRecorder({ onSend, disabled }: VoiceRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const startTime = useRef(0);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorder.current = recorder;
      chunks.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start(100);
      startTime.current = Date.now();
      setRecording(true);
      setAudioBlob(null);
      setAudioUrl(null);

      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTime.current) / 1000));
      }, 250);
    } catch {
      console.error('Microphone access denied');
    }
  }, []);

  const stopRecording = useCallback(() => {
    mediaRecorder.current?.stop();
    setRecording(false);
    clearInterval(timerRef.current);
  }, []);

  const discard = useCallback(() => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setElapsed(0);
  }, [audioUrl]);

  const handleSend = useCallback(() => {
    if (!audioBlob) return;
    onSend(audioBlob, elapsed);
    discard();
  }, [audioBlob, elapsed, onSend, discard]);

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(1, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  // Recording state
  if (recording) {
    return (
      <div className="flex items-center gap-3 px-3 py-2 bg-destructive/10 rounded-2xl animate-in fade-in">
        <span className="h-3 w-3 rounded-full bg-destructive animate-pulse" />
        <span className="text-sm font-mono text-destructive font-medium">{formatTime(elapsed)}</span>
        <span className="text-xs text-muted-foreground flex-1">Recording…</span>
        <Button variant="ghost" size="icon" className="h-10 w-10" onClick={stopRecording}>
          <Square className="h-5 w-5 text-destructive fill-destructive" />
        </Button>
      </div>
    );
  }

  // Preview state
  if (audioBlob && audioUrl) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-secondary rounded-2xl animate-in fade-in">
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={discard}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
        <audio src={audioUrl} controls className="h-10 flex-1 max-w-[200px]" />
        <span className="text-xs text-muted-foreground font-mono">{formatTime(elapsed)}</span>
        <Button size="icon" className="h-10 w-10 rounded-2xl shrink-0" onClick={handleSend}>
          <Send className="h-5 w-5" />
        </Button>
      </div>
    );
  }

  // Idle: mic button
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-10 w-10 shrink-0"
      onClick={startRecording}
      disabled={disabled}
      title="Record voice message"
    >
      <Mic className="h-5 w-5" />
    </Button>
  );
}
