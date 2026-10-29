import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, SkipForward, SkipBack, Volume2, VolumeX, Sparkles } from 'lucide-react';
import { MeetingMessage } from '../lib/types';
import { EXECUTIVES } from './ExecutiveCard';

interface BoardroomVoicePlayerProps {
  messages: MeetingMessage[];
  currentSpeakerIndex: number | null;
  isPlaying: boolean;
  onPlayChange: (playing: boolean) => void;
  onSpeakerIndexChange: (index: number | null) => void;
}

// Fallback voice pitch and rate for browser Web Speech API
const WEB_SPEECH_CONFIG: Record<string, { pitch: number; rate: number; gender: 'female' | 'male' }> = {
  ceo: { pitch: 1.05, rate: 0.98, gender: 'female' },
  cfo: { pitch: 0.85, rate: 0.94, gender: 'male' },
  cmo: { pitch: 1.15, rate: 1.04, gender: 'female' },
  coo: { pitch: 0.92, rate: 0.98, gender: 'male' },
  cto: { pitch: 1.02, rate: 1.02, gender: 'male' }
};

export const BoardroomVoicePlayer: React.FC<BoardroomVoicePlayerProps> = ({
  messages,
  currentSpeakerIndex,
  isPlaying,
  onPlayChange,
  onSpeakerIndexChange
}) => {
  const [isPaused, setIsPaused] = useState(false);
  const [audioSource, setAudioSource] = useState<'edge-tts' | 'web-speech'>('edge-tts');
  const [autoScroll, setAutoScroll] = useState(true);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentTurnTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Stop everything if unmounted
  useEffect(() => {
    return () => {
      stopAllAudio();
    };
  }, []);

  const stopAllAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (currentTurnTimeoutRef.current) {
      clearTimeout(currentTurnTimeoutRef.current);
    }
    onPlayChange(false);
    onSpeakerIndexChange(null);
    setIsPaused(false);
  };

  const cleanTextForSpeech = (text: string): string => {
    return text
      .replace(/₹/g, 'Rupees ')
      .replace(/INR/g, 'Rupees')
      .replace(/#+\s*/g, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/^\s*[-*•]\s*/gm, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Play a specific turn sequentially
  const playTurn = async (index: number) => {
    if (index >= messages.length || index < 0) {
      // Finished all turns!
      stopAllAudio();
      return;
    }

    onSpeakerIndexChange(index);
    onPlayChange(true);
    setIsPaused(false);

    const msg = messages[index];
    const exec = EXECUTIVES[msg.executive] || EXECUTIVES.ceo;
    const textToSpeak = `${exec.name}: ${cleanTextForSpeech(msg.content)}`;

    // Try backend Edge-TTS (open-source studio neural voices) first
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const resp = await fetch(`${apiUrl}/api/tts/speak`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToSpeak,
          executive: msg.executive
        })
      });

      if (!resp.ok) {
        throw new Error('Backend TTS error, falling back to Web Speech API');
      }

      const audioBlob = await resp.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.onended = () => {
          URL.revokeObjectURL(audioUrl);
          // Natural conversational pause between executives (450ms)
          currentTurnTimeoutRef.current = setTimeout(() => {
            playTurn(index + 1);
          }, 450);
        };
        audioRef.current.onerror = () => {
          fallbackWebSpeech(textToSpeak, msg.executive, index);
        };
        await audioRef.current.play();
        setAudioSource('edge-tts');
        return;
      }
    } catch {
      // Fallback seamlessly to Browser Web Speech API
      fallbackWebSpeech(textToSpeak, msg.executive, index);
    }
  };

  // Fallback using Browser SpeechSynthesis
  const fallbackWebSpeech = (text: string, executive: string, index: number) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      onPlayChange(false);
      return;
    }

    setAudioSource('web-speech');
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const config = WEB_SPEECH_CONFIG[executive] || WEB_SPEECH_CONFIG.ceo;
    utterance.pitch = config.pitch;
    utterance.rate = config.rate;

    // Pick distinct browser voices if available
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      if (config.gender === 'female') {
        const femaleVoice = voices.find(v => (v.name.includes('Female') || v.name.includes('Zira') || v.name.includes('Samantha') || v.name.includes('Google UK English Female') || v.name.includes('Jenny')) && v.lang.startsWith('en'));
        if (femaleVoice) utterance.voice = femaleVoice;
      } else {
        const maleVoice = voices.find(v => (v.name.includes('Male') || v.name.includes('David') || v.name.includes('George') || v.name.includes('Google UK English Male') || v.name.includes('Guy')) && v.lang.startsWith('en'));
        if (maleVoice) utterance.voice = maleVoice;
      }
    }

    utterance.onend = () => {
      // Natural conversational pause between executives (450ms)
      currentTurnTimeoutRef.current = setTimeout(() => {
        playTurn(index + 1);
      }, 450);
    };

    utterance.onerror = () => {
      stopAllAudio();
    };

    window.speechSynthesis.speak(utterance);
  };

  const handleTogglePlay = () => {
    if (messages.length === 0) return;

    if (isPlaying) {
      if (isPaused) {
        // Resume
        if (audioRef.current && audioSource === 'edge-tts') {
          audioRef.current.play();
        } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          window.speechSynthesis.resume();
        }
        setIsPaused(false);
      } else {
        // Pause
        if (audioRef.current && audioSource === 'edge-tts') {
          audioRef.current.pause();
        } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          window.speechSynthesis.pause();
        }
        setIsPaused(true);
      }
    } else {
      // Start from beginning or current selection
      playTurn(currentSpeakerIndex !== null ? currentSpeakerIndex : 0);
    }
  };

  const handleNext = () => {
    const nextIdx = (currentSpeakerIndex !== null ? currentSpeakerIndex : -1) + 1;
    if (nextIdx < messages.length) {
      playTurn(nextIdx);
    }
  };

  const handlePrev = () => {
    const prevIdx = (currentSpeakerIndex !== null ? currentSpeakerIndex : 1) - 1;
    if (prevIdx >= 0) {
      playTurn(prevIdx);
    }
  };

  if (messages.length === 0) return null;

  const activeMsg = currentSpeakerIndex !== null ? messages[currentSpeakerIndex] : null;
  const activeExec = activeMsg ? (EXECUTIVES[activeMsg.executive] || EXECUTIVES.ceo) : null;

  return (
    <div className="bg-slate-900 text-white rounded-xl p-3.5 shadow-md flex flex-col sm:flex-row items-center justify-between gap-3 border border-slate-800 transition-all">
      {/* Hidden audio element for edge-tts stream */}
      <audio ref={audioRef} className="hidden" />

      {/* Left: Active Speaker & Soundwave Animation */}
      <div className="flex items-center gap-3 w-full sm:w-auto">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
          activeExec ? activeExec.avatarBg : 'bg-slate-800 border-slate-700 text-slate-300'
        }`}>
          <Volume2 className="w-4 h-4" />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-white truncate">
              {activeExec ? activeExec.name : 'Executive Boardroom Voice'}
            </span>
            {activeExec && (
              <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                {activeExec.title.split('&')[0]}
              </span>
            )}
            <span className="text-[9px] text-slate-400">
              {audioSource === 'edge-tts' ? 'Neural Voice' : 'Local Voice'}
            </span>
          </div>

          <div className="flex items-center gap-2 mt-0.5">
            {isPlaying && !isPaused ? (
              <div className="flex items-center gap-1">
                <span className="w-1 h-3 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1 h-4 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1 h-2.5 bg-indigo-400 rounded-full animate-bounce" />
                <span className="text-[11px] text-slate-400 ml-1">
                  Speaking Turn {(currentSpeakerIndex ?? 0) + 1} of {messages.length}
                </span>
              </div>
            ) : (
              <span className="text-[11px] text-slate-400">
                {isPaused ? 'Conversation paused' : 'Turn-by-turn conversational audio ready'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Center & Right: Player Controls */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handlePrev}
          disabled={!isPlaying || (currentSpeakerIndex ?? 0) <= 0}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-40 transition"
          title="Previous Executive"
        >
          <SkipBack className="w-4 h-4" />
        </button>

        <button
          onClick={handleTogglePlay}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition"
        >
          {isPlaying && !isPaused ? (
            <>
              <Pause className="w-3.5 h-3.5" />
              <span>Pause</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isPaused ? 'Resume' : 'Play Conversation'}</span>
            </>
          )}
        </button>

        <button
          onClick={handleNext}
          disabled={!isPlaying || (currentSpeakerIndex ?? 0) >= messages.length - 1}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-40 transition"
          title="Next Executive"
        >
          <SkipForward className="w-4 h-4" />
        </button>

        {isPlaying && (
          <button
            onClick={stopAllAudio}
            className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-slate-800 transition"
            title="Stop Audio"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
          </button>
        )}
      </div>
    </div>
  );
};
