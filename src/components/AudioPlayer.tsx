import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Music } from 'lucide-react';
import { Attachment } from '../types';

interface AudioPlayerProps {
  attachment: Attachment;
  onRemove: () => void;
}

export default function AudioPlayer({ attachment, onRemove }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      setProgress(audio.currentTime);
    };

    const updateDuration = () => {
      setDuration(audio.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl shadow-sm hover:shadow-md transition-all group relative">
      <audio ref={audioRef} src={attachment.url} preload="metadata" />
      
      <button 
        onClick={togglePlay}
        className="w-10 h-10 flex items-center justify-center bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors shrink-0"
      >
        {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-semibold text-stone-900 dark:text-stone-100 truncate pr-2">
            {attachment.name}
          </span>
          <span className="text-xs text-stone-500 dark:text-stone-400 font-mono shrink-0">
            {formatTime(progress)} / {formatTime(duration)}
          </span>
        </div>
        
        <div className="h-1.5 w-full bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-indigo-500 rounded-full transition-all duration-150 ease-linear"
            style={{ width: duration > 0 ? `${(progress / duration) * 100}%` : '0%' }}
          />
        </div>
      </div>

      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove(); }}
        className="absolute -top-2 -right-2 w-6 h-6 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-200 dark:hover:bg-red-900/80"
        title="Supprimer"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      </button>
    </div>
  );
}
