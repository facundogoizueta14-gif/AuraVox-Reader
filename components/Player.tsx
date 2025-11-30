
import React, { useEffect, useRef, useState } from 'react';
import { Settings } from '../types';

interface PlayerProps {
  currentTextChunk: string;
  audioBlobUrl: string | null;
  nextAudioBlobUrl?: string | null;
  onNext: () => void;
  onPrev: () => void;
  isLoading: boolean;
  settings: Settings;
  bookTitle: string;
  setGlobalAnalyserNode: (node: AnalyserNode | null) => void;
}

const Player: React.FC<PlayerProps> = ({ 
  currentTextChunk, 
  audioBlobUrl, 
  nextAudioBlobUrl,
  onNext, 
  onPrev, 
  isLoading, 
  settings,
  bookTitle,
  setGlobalAnalyserNode
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const preloadRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1.0);
  const [isVolumeOpen, setIsVolumeOpen] = useState(false);

  // Initialize Web Audio API and pass Analyser to Parent
  useEffect(() => {
    if (audioRef.current && !audioContextRef.current) {
        try {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            const ctx = new AudioContext();
            
            // Create Source
            const source = ctx.createMediaElementSource(audioRef.current);
            
            // Create Analyser (Visualizer)
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 512;
            analyser.smoothingTimeConstant = 0.8;

            // Connect graph: Source -> Analyser -> Destination
            source.connect(analyser);
            analyser.connect(ctx.destination);

            // Store refs
            audioContextRef.current = ctx;
            
            // LIFT STATE UP: Pass analyser to App for Header Visualizer
            setGlobalAnalyserNode(analyser);

        } catch (e) {
            console.error("Audio Context Init Failed", e);
        }
    }
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = settings.speed;
      audioRef.current.preservesPitch = true; 
    }
  }, [settings.speed]);

  useEffect(() => {
    if (audioRef.current) {
        audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    if (audioRef.current) {
      if (audioBlobUrl) {
        if (audioRef.current.src !== audioBlobUrl) {
            audioRef.current.src = audioBlobUrl;
            audioRef.current.load();
            audioRef.current.play()
                .then(() => {
                    if (audioContextRef.current?.state === 'suspended') {
                        audioContextRef.current.resume();
                    }
                    setIsPlaying(true);
                })
                .catch(e => console.log("Autoplay blocked/handled", e));
        }
      } else {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    }
  }, [audioBlobUrl]);

  useEffect(() => {
    if (preloadRef.current && nextAudioBlobUrl) {
        if (preloadRef.current.src !== nextAudioBlobUrl) {
            preloadRef.current.src = nextAudioBlobUrl;
            preloadRef.current.load();
        }
    }
  }, [nextAudioBlobUrl]);

  // Strict pause if loading and no audio
  useEffect(() => {
      if (isLoading && !audioBlobUrl && audioRef.current) {
          audioRef.current.pause();
          setIsPlaying(false);
      }
  }, [isLoading, audioBlobUrl]);

  const togglePlay = () => {
    if (!audioRef.current || !audioBlobUrl) return;
    if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume();
    }

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setProgress(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleEnded = () => {
    onNext();
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setProgress(time);
    }
  };

  const skip = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime += seconds;
    }
  };

  const downloadAudio = () => {
    if (!audioBlobUrl) return;
    const a = document.createElement('a');
    a.href = audioBlobUrl;
    a.download = `lumina-export-${Date.now()}.wav`;
    a.click();
  };

  return (
    <>
      {/* Backdrop for volume control */}
      {isVolumeOpen && (
        <div 
            className="fixed inset-0 z-[45]" 
            onClick={() => setIsVolumeOpen(false)} 
        />
      )}
      
      {/* Main Player Bar - Docked Bottom, Symmetrical */}
      <div className="fixed z-50 transition-all duration-300
            bottom-0 left-0 w-full border-t border-zinc-800 rounded-none pb-safe
            md:bottom-6 md:left-1/2 md:transform md:-translate-x-1/2 md:w-[95%] md:max-w-4xl md:rounded-2xl md:border md:border-zinc-700/40 md:shadow-2xl md:pb-4
            bg-zinc-900/95 backdrop-blur-xl px-4 py-2 ring-1 ring-white/5">
        
        <audio 
          ref={audioRef}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          className="hidden"
          crossOrigin="anonymous"
        />
        <audio ref={preloadRef} className="hidden" preload="auto" muted />

        {/* Progress Bar - Absolute Top */}
        <div className="absolute top-0 left-0 w-full md:px-4 md:-mt-2 group">
          <input 
            type="range" 
            min="0" 
            max={duration || 100} 
            value={progress}
            onChange={handleSeek}
            className="w-full h-1 bg-zinc-700/50 rounded-lg appearance-none cursor-pointer accent-amber-500 hover:h-1.5 md:hover:h-2 transition-all shadow-lg"
          />
        </div>

        {/* Controls Layout - Symmetrical Grid */}
        <div className="grid grid-cols-3 items-center h-14 md:h-16">
          
          {/* Left: Volume (Symmetrical anchor) */}
          <div className="flex justify-start">
              <div className="relative">
                  <button 
                      onClick={() => setIsVolumeOpen(!isVolumeOpen)}
                      className={`p-2 rounded-full transition-colors ${isVolumeOpen ? 'text-white bg-zinc-800' : 'text-zinc-400 hover:text-white'}`}
                      title="Volume"
                  >
                      {volume === 0 ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                          </svg>
                      ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                          </svg>
                      )}
                  </button>
                  
                  {isVolumeOpen && (
                    <div className="absolute bottom-full left-0 mb-4 bg-zinc-800 p-3 rounded-xl shadow-xl border border-zinc-700 animate-in fade-in slide-in-from-bottom-2 duration-200 z-[60]">
                      <div className="h-24 md:h-32 flex items-center justify-center">
                        <input 
                            type="range" 
                            min="0" 
                            max="1" 
                            step="0.05" 
                            value={volume} 
                            onChange={(e) => setVolume(Number(e.target.value))}
                            className="w-2 h-20 md:h-24 bg-zinc-600 rounded-lg appearance-none cursor-pointer accent-amber-500"
                            style={{ writingMode: 'vertical-lr', direction: 'rtl' }} 
                        />
                      </div>
                    </div>
                  )}
              </div>
          </div>

          {/* Center: Play Controls */}
          <div className="flex justify-center items-center gap-6 md:gap-8">
                <button onClick={() => skip(-15)} className="text-zinc-400 hover:text-white transition transform hover:scale-110 p-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 md:h-8 md:w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
                    </svg>
                </button>

                <button 
                onClick={togglePlay}
                disabled={isLoading && !audioBlobUrl}
                className={`w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center 
                    bg-gradient-to-br from-amber-400 to-amber-600 
                    text-white shadow-lg shadow-amber-500/40 
                    transition-all transform hover:scale-105 active:scale-95
                    border-2 border-amber-300/20
                    ${isLoading && !audioBlobUrl ? 'opacity-80 cursor-wait grayscale' : ''}`}
                >
                {isLoading && !audioBlobUrl ? (
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                ) : isPlaying ? (
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 md:w-8 md:h-8">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                    </svg>
                ) : (
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 md:w-8 md:h-8 ml-1">
                    <path d="M8 5v14l11-7z" />
                    </svg>
                )}
                </button>

                <button onClick={() => skip(15)} className="text-zinc-400 hover:text-white transition transform hover:scale-110 p-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 md:h-8 md:w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
                    </svg>
                </button>
          </div>

          {/* Right: Download (Symmetrical anchor) */}
          <div className="flex justify-end">
              <button onClick={downloadAudio} className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition" title="Download">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
              </button>
          </div>

        </div>
      </div>
    </>
  );
};

export default Player;
