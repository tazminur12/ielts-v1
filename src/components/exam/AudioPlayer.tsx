"use client";

import React, { useCallback, useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";

type Props = {
  src: string;
  lockKey?: string;
  singlePlay?: boolean;
};

type LockState = {
  startedAt?: number;
  endedAt?: number;
  lastTime?: number;
};

export const AudioPlayer = ({ src, lockKey, singlePlay }: Props) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const lastTimeRef = useRef(0);
  const storageKey = lockKey ? `audio_lock:${lockKey}` : null;
  const [locked, setLocked] = useState(() => {
    if (!singlePlay || !storageKey) return false;
    try {
      const raw = localStorage.getItem(storageKey);
      const s = raw ? (JSON.parse(raw) as LockState) : {};
      return typeof s.endedAt === "number";
    } catch {
      return false;
    }
  });

  const readLock = useCallback((): LockState => {
    if (!storageKey) return {};
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? (JSON.parse(raw) as LockState) : {};
    } catch {
      return {};
    }
  }, [storageKey]);

  const writeLock = useCallback((patch: Partial<LockState>) => {
    if (!storageKey) return;
    const prev = readLock();
    const next = { ...prev, ...patch };
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {}
  }, [readLock, storageKey]);

  // Sync lock/position when switching listening parts (same player instance, new lockKey/src)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    setIsPlaying(false);
    setDuration(0);
    setCurrentTime(0);

    if (singlePlay && storageKey) {
      const s = readLock();
      const ended = typeof s.endedAt === "number";
      setLocked(ended);
      const resumeAt =
        typeof s.lastTime === "number" && s.lastTime > 0 && Number.isFinite(s.lastTime)
          ? s.lastTime
          : 0;
      lastTimeRef.current = resumeAt;
      audio.currentTime = Math.max(0, resumeAt);
      setCurrentTime(audio.currentTime);
    } else {
      setLocked(false);
      lastTimeRef.current = 0;
      audio.currentTime = 0;
    }
  }, [readLock, singlePlay, src, storageKey]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const setAudioData = () => {
      setDuration(audio.duration);
      setCurrentTime(audio.currentTime);
    }

    const setAudioTime = () => {
      if (singlePlay) {
        if (audio.currentTime + 0.2 < lastTimeRef.current) {
          audio.currentTime = lastTimeRef.current;
          return;
        }
        lastTimeRef.current = audio.currentTime;
        writeLock({ lastTime: audio.currentTime });
      }
      setCurrentTime(audio.currentTime);
    }

    // Events
    audio.addEventListener("loadeddata", setAudioData);
    audio.addEventListener("timeupdate", setAudioTime);
    const onEnded = () => {
      setIsPlaying(false);
      if (singlePlay) {
        setLocked(true);
        writeLock({ endedAt: Date.now(), lastTime: audio.duration });
      }
    };
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("loadeddata", setAudioData);
      audio.removeEventListener("timeupdate", setAudioTime);
      audio.removeEventListener("ended", onEnded);
    }
  }, [readLock, singlePlay, storageKey, writeLock]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (singlePlay && locked) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      if (singlePlay && storageKey) {
        const s = readLock();
        if (typeof s.startedAt !== "number") {
          writeLock({ startedAt: Date.now() });
        }
      }
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) {
        audioRef.current.volume = val;
        setIsMuted(val === 0);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="bg-[#1e293b] text-white p-3 rounded-lg shadow-lg flex items-center gap-4 w-full max-w-2xl mx-auto mb-6">
      <audio
        ref={audioRef}
        src={src}
        controls={false}
        preload="auto"
        controlsList="nodownload noplaybackrate noremoteplayback"
      />
      
      <button 
        onClick={togglePlay}
        disabled={singlePlay && locked}
        className="bg-blue-600 hover:bg-blue-500 rounded-full p-2 transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label={singlePlay && locked ? "Audio locked" : isPlaying ? "Pause audio" : "Play audio"}
      >
        {isPlaying ? <Pause size={20} /> : <Play size={20} />}
      </button>

      <div className="flex-1 flex flex-col justify-center">
         <div className="flex justify-between text-xs text-slate-400 mb-1">
             <span>{formatTime(currentTime)}</span>
             <span>{formatTime(duration || 0)}</span>
         </div>
         <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
             <div 
                className="bg-blue-500 h-full rounded-full transition-all duration-100"
                style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
             />
         </div>
         {singlePlay && (
           <div className="mt-2 text-[11px] text-slate-300 font-semibold">
             {locked ? "Audio has finished. Replaying is disabled." : "Single play mode enabled."}
           </div>
         )}
      </div>

      <div className="flex items-center gap-2 w-24 flex-shrink-0">
          <button onClick={() => {
              if (audioRef.current) {
                  audioRef.current.muted = !isMuted;
                  setIsMuted(!isMuted);
              }
          }} aria-label={isMuted ? "Unmute" : "Mute"}>
             {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.01" 
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            aria-label="Volume"
          />
      </div>
    </div>
  );
};
