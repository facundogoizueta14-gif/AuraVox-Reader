
import React, { useState, useEffect, useRef } from 'react';
import { AppState, Book, Settings, DEFAULT_SETTINGS, VoiceOption, VOICE_LABELS, FontFamily } from './types';
import { generateSpeech } from './services/geminiService';
import { getSettings, saveSettings, getAllBooks, saveBook, deleteBook } from './services/dbService';
import { FONT_OPTIONS } from './constants';

import Library from './components/Library';
import Player from './components/Player';
import Visualizer from './components/Visualizer';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.LIBRARY);
  const [currentBook, setCurrentBook] = useState<Book | null>(null);
  const [savedBooks, setSavedBooks] = useState<Book[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  
  // Playback State
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [nextAudioUrl, setNextAudioUrl] = useState<string | null>(null);
  
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Audio Visualizer State (Lifted from Player)
  const [globalAnalyserNode, setGlobalAnalyserNode] = useState<AnalyserNode | null>(null);

  // Search State
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{index: number, snippet: string}[]>([]);

  // Scroll Progress State
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showScrollProgress, setShowScrollProgress] = useState(false);
  const scrollTimeoutRef = useRef<number | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Copy Feedback State
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Text Selection Menu
  const [selectionMenu, setSelectionMenu] = useState<{top: number, left: number, text: string} | null>(null);
  const [isDownloadingSelection, setIsDownloadingSelection] = useState(false);

  // UI State for Header Dropdowns
  const [isStyleMenuOpen, setIsStyleMenuOpen] = useState(false);

  // Caching & Concurrency
  const audioCache = useRef<Map<number, string>>(new Map());
  const activeBookIdRef = useRef<string | null>(null);
  
  // Promise Deduplication
  const requestPromises = useRef<Map<number, Promise<string | null>>>(new Map());
  const latestRequestRef = useRef<number>(0);
  const manualJumpRef = useRef<boolean>(false);

  // Initialization
  useEffect(() => {
    const init = async () => {
      try {
        const storedSettings = await getSettings();
        setSettings(storedSettings);
        const books = await getAllBooks();
        setSavedBooks(books.sort((a, b) => b.createdAt - a.createdAt));
      } catch (e) {
        console.error("DB Init error", e);
      }
    };
    init();
  }, []);

  // Loading Bar Animation Logic
  useEffect(() => {
    let interval: any;
    if (isLoadingAudio) {
        // Start animation
        interval = setInterval(() => {
            setLoadingProgress((prev) => {
                if (prev >= 90) return 90; 
                const increment = Math.max(1, (90 - prev) / 10); 
                return prev + increment;
            });
        }, 100);
    } else {
        setLoadingProgress(100);
        setTimeout(() => {
            if (!isLoadingAudio) setLoadingProgress(0);
        }, 500);
    }
    return () => clearInterval(interval);
  }, [isLoadingAudio]);

  // Handle Text Selection
  const handleMouseUp = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
          setSelectionMenu(null);
          return;
      }
      
      const text = selection.toString().trim();
      if (!text) {
           setSelectionMenu(null);
           return;
      }

      if (contentRef.current && !contentRef.current.contains(selection.anchorNode)) {
          setSelectionMenu(null);
          return;
      }

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      setSelectionMenu({
          top: rect.top - 50,
          left: rect.left + (rect.width / 2),
          text: text
      });
  };

  const downloadSelection = async () => {
      if (!selectionMenu) return;
      setIsDownloadingSelection(true);
      try {
          const blob = await generateSpeech(selectionMenu.text, settings.voice);
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `selection-${Date.now()}.wav`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          
          window.getSelection()?.removeAllRanges();
          setSelectionMenu(null);
      } catch(e) {
          console.error("Error downloading selection", e);
      } finally {
          setIsDownloadingSelection(false);
      }
  };

  const updateSettings = async (newSettings: Settings) => {
    setSettings(newSettings);
    await saveSettings(newSettings);
    if (newSettings.voice !== settings.voice) {
        // Clear cache if voice changes
        audioCache.current.forEach(url => URL.revokeObjectURL(url));
        audioCache.current.clear();
        requestPromises.current.clear();
        
        if (currentBook) {
            handleManualJump(currentChunkIndex, newSettings.voice);
        }
    }
  };

  const handleBookSelect = (book: Book) => {
    if (activeBookIdRef.current !== book.id) {
        setAudioUrl(null);
        setNextAudioUrl(null);
        audioCache.current.forEach(url => URL.revokeObjectURL(url));
        audioCache.current.clear();
        requestPromises.current.clear();
        activeBookIdRef.current = book.id;
    }

    setCurrentBook(book);
    setCurrentChunkIndex(book.lastPosition || 0);
    setAppState(AppState.READING);
  };

  const handleDeleteBook = async (id: string) => {
    if (window.confirm("¿Estás seguro de que quieres eliminar este libro de tu biblioteca?")) {
      try {
        await deleteBook(id);
        setSavedBooks(prev => prev.filter(b => b.id !== id));
      } catch (e) {
        alert("Error deleting book: " + (e as Error).message);
      }
    }
  };

  const backToLibrary = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setNextAudioUrl(null);
    setAppState(AppState.LIBRARY);
    getAllBooks().then(books => setSavedBooks(books.sort((a, b) => b.createdAt - a.createdAt)));
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setSelectionMenu(null);
    setIsStyleMenuOpen(false);
    
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const maxScroll = scrollHeight - clientHeight;
    const percent = maxScroll > 0 ? Math.round((scrollTop / maxScroll) * 100) : 0;
    
    setScrollProgress(percent);
    setShowScrollProgress(true);

    if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
    }
    
    scrollTimeoutRef.current = window.setTimeout(() => {
        setShowScrollProgress(false);
    }, 2000);
  };

  const handleSearch = (query: string) => {
      setSearchQuery(query);
      if (!query.trim() || !currentBook) {
          setSearchResults([]);
          return;
      }
      
      const results = currentBook.chunks.reduce((acc, chunk, idx) => {
          if (chunk.text.toLowerCase().includes(query.toLowerCase())) {
              const matchIndex = chunk.text.toLowerCase().indexOf(query.toLowerCase());
              const start = Math.max(0, matchIndex - 20);
              const end = Math.min(chunk.text.length, matchIndex + query.length + 20);
              const snippet = (start > 0 ? '...' : '') + chunk.text.substring(start, end) + (end < chunk.text.length ? '...' : '');
              acc.push({ index: idx, snippet });
          }
          return acc;
      }, [] as {index: number, snippet: string}[]);
      
      setSearchResults(results);
  };

  const toggleBookmark = (chunkIndex: number) => {
      if (!currentBook) return;
      const isBookmarked = currentBook.bookmarks?.includes(chunkIndex);
      let newBookmarks = currentBook.bookmarks || [];
      
      if (isBookmarked) {
          newBookmarks = newBookmarks.filter(id => id !== chunkIndex);
      } else {
          newBookmarks = [...newBookmarks, chunkIndex];
      }
      
      const updatedBook = { ...currentBook, bookmarks: newBookmarks };
      setCurrentBook(updatedBook);
      saveBook(updatedBook);
  };

  const handleCopyParagraph = (text: string, index: number) => {
      navigator.clipboard.writeText(text).then(() => {
          setCopiedIndex(index);
          setTimeout(() => setCopiedIndex(null), 2000);
      });
  };

  // Improved Fetcher
  const fetchChunkAudio = async (index: number, chunkText: string, voice: string): Promise<string | null> => {
    if (audioCache.current.has(index)) return audioCache.current.get(index)!;
    
    if (requestPromises.current.has(index)) {
        return requestPromises.current.get(index)!; 
    }

    const promise = (async () => {
        try {
            const blob = await generateSpeech(chunkText, voice);
            const url = URL.createObjectURL(blob);
            
            if (currentBook?.id === activeBookIdRef.current) {
                audioCache.current.set(index, url);
                return url;
            } else {
                URL.revokeObjectURL(url);
                return null;
            }
        } catch (e) {
            console.error(`Failed to fetch chunk ${index}`, e);
            return null;
        } finally {
            requestPromises.current.delete(index);
        }
    })();

    requestPromises.current.set(index, promise);
    return promise;
  };

  // Main Audio Loader managed by useEffect
  useEffect(() => {
    if (appState !== AppState.READING || !currentBook) return;

    const load = async () => {
        const index = currentChunkIndex;
        const voice = settings.voice;
        
        const requestId = Date.now();
        latestRequestRef.current = requestId;

        if (manualJumpRef.current) {
            setAudioUrl(null);
            setNextAudioUrl(null);
            setIsLoadingAudio(true);
            setLoadingProgress(10); 
        }

        const chunk = currentBook.chunks[index];
        if (!chunk) return;

        let url: string | null = null;
        
        if (audioCache.current.has(index)) {
             url = audioCache.current.get(index)!;
             if (latestRequestRef.current === requestId) {
                 setIsLoadingAudio(false);
                 setLoadingProgress(100);
             }
        } else {
             setIsLoadingAudio(true);
             url = await fetchChunkAudio(index, chunk.text, voice);
        }

        if (latestRequestRef.current === requestId) {
            if (url) {
                setAudioUrl(url);
            }
            setIsLoadingAudio(false);
            manualJumpRef.current = false; 
            
            // Prefetch Next (Priority)
            const nextIndex = index + 1;
            if (currentBook.chunks[nextIndex]) {
                fetchChunkAudio(nextIndex, currentBook.chunks[nextIndex].text, voice).then(nextUrl => {
                    if (latestRequestRef.current === requestId && nextUrl && !audioUrl) {
                        setNextAudioUrl(nextUrl);
                    }
                });
            }
            // Prefetch Next + 2 (Background)
            const nextNextIndex = index + 2;
            if (currentBook.chunks[nextNextIndex]) {
                fetchChunkAudio(nextNextIndex, currentBook.chunks[nextNextIndex].text, voice);
            }
        }

        const updatedBook = { ...currentBook, lastPosition: index };
        saveBook(updatedBook);

        setTimeout(() => {
            const element = document.getElementById(`chunk-${index}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 100);
    };

    load();

  }, [currentChunkIndex, appState, currentBook?.id, settings.voice]);

  const handleManualJump = (index: number, specificVoice?: string) => {
      manualJumpRef.current = true;
      setCurrentChunkIndex(index);
      setIsLoadingAudio(true);
  };

  const nextChunk = () => {
    if (currentBook && currentChunkIndex < currentBook.chunks.length - 1) {
      setCurrentChunkIndex(prev => prev + 1);
    }
  };

  const prevChunk = () => {
    if (currentChunkIndex > 0) {
      handleManualJump(currentChunkIndex - 1);
    }
  };

  // Helper to estimate reading time
  const getReadingStats = () => {
      if (!currentBook) return { time: '0m', percent: 0 };
      
      const totalChunks = currentBook.chunks.length;
      const percent = Math.round(((currentChunkIndex + 1) / totalChunks) * 100);
      
      // Estimate: ~150 words per minute
      // Get remaining text
      let remainingWords = 0;
      for (let i = currentChunkIndex; i < totalChunks; i++) {
          remainingWords += currentBook.chunks[i].text.split(/\s+/).length;
      }
      
      const minutesLeft = Math.ceil(remainingWords / 130 / settings.speed);
      const hours = Math.floor(minutesLeft / 60);
      const mins = minutesLeft % 60;
      
      let timeString = `${mins}m`;
      if (hours > 0) timeString = `${hours}h ${mins}m`;
      
      return { time: timeString, percent };
  };

  if (appState === AppState.LIBRARY) {
    return (
        <Library onBookSelected={handleBookSelect} onDeleteBook={handleDeleteBook} savedBooks={savedBooks} />
    );
  }

  const uniqueVoiceOptions = Object.keys(VOICE_LABELS) as VoiceOption[];
  const stats = getReadingStats();

  return (
    <div className={`h-screen bg-zinc-950 text-zinc-300 flex flex-col overflow-hidden relative`}>
      
      {/* Floating Selection Menu */}
      {selectionMenu && (
          <div 
              className="fixed z-[100] transform -translate-x-1/2 bg-zinc-800 border border-zinc-700 shadow-xl rounded-lg p-2 flex items-center gap-2 animate-in fade-in zoom-in duration-200"
              style={{ top: selectionMenu.top, left: selectionMenu.left }}
          >
              <button 
                  onClick={downloadSelection}
                  disabled={isDownloadingSelection}
                  className="flex items-center gap-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 px-3 py-1.5 rounded transition-colors disabled:opacity-50 disabled:cursor-wait"
              >
                  {isDownloadingSelection ? 'Downloading...' : 'Download Audio'}
              </button>
          </div>
      )}

      {/* DASHBOARD HEADER - RESPONSIVE DOCK/FLOAT */}
      <nav className="fixed z-50 transition-all duration-300
        top-0 left-0 w-full rounded-none border-b border-zinc-800
        md:top-6 md:left-1/2 md:transform md:-translate-x-1/2 md:w-[95%] md:max-w-4xl md:rounded-2xl md:border md:border-zinc-700/40 md:ring-1 md:ring-white/5
        bg-zinc-900/90 backdrop-blur-xl shadow-2xl flex flex-col overflow-hidden">
          
          {/* Top Row: Navigation, Stats, Center Viz, Search */}
          <div className="flex justify-between items-center px-4 py-2 md:px-6 md:py-2 h-14 relative z-20">
              
              {/* Left: Back & Stats */}
              <div className="flex items-center gap-4 flex-1">
                  <button onClick={backToLibrary} className="flex items-center justify-center w-8 h-8 rounded-full bg-zinc-800/50 text-zinc-400 hover:bg-amber-500 hover:text-white transition group">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                      </svg>
                  </button>
                  
                  <div className="flex flex-col">
                      <span className="text-xs font-mono text-zinc-400">Restante: <span className="text-white">{stats.time}</span></span>
                      <div className="flex items-center gap-2">
                          <div className="w-16 h-1 bg-zinc-800 rounded-full overflow-hidden">
                               <div className="h-full bg-amber-500" style={{ width: `${stats.percent}%` }}></div>
                          </div>
                          <span className="text-[10px] font-bold text-amber-500">{stats.percent}%</span>
                      </div>
                  </div>
              </div>
              
              {/* Center: Spectrogram OR Loading Bar */}
              <div className="flex items-center justify-center flex-1 h-full relative">
                  {isLoadingAudio ? (
                      <div className="w-full max-w-[200px] flex flex-col items-center">
                          <div className="w-full h-0.5 bg-zinc-800 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)] transition-all duration-100 ease-linear"
                                style={{ width: `${loadingProgress}%` }}
                              ></div>
                          </div>
                          <span className="text-[8px] uppercase tracking-widest font-bold text-amber-500 mt-1 animate-pulse">Cargando...</span>
                      </div>
                  ) : (
                      <div className="w-full h-full flex items-center justify-center opacity-80">
                         {/* Pass the global node to visualizer */}
                         {globalAnalyserNode && <Visualizer analyser={globalAnalyserNode} />}
                         {!globalAnalyserNode && <div className="text-[9px] text-zinc-600 tracking-widest">AuraVox</div>}
                      </div>
                  )}
              </div>
              
              {/* Right: Search */}
              <div className="flex justify-end flex-1">
                  <div className="relative">
                       <button onClick={() => setIsSearchOpen(!isSearchOpen)} className={`w-8 h-8 flex items-center justify-center rounded-full bg-zinc-800/50 text-zinc-400 hover:text-amber-500 transition ${isSearchOpen ? 'text-amber-500 ring-1 ring-amber-500/50' : ''}`}>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                       </button>
                       {isSearchOpen && (
                           <div className="absolute top-full right-0 mt-2 w-64 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl p-2 z-[60]">
                               <input 
                                  type="text" 
                                  autoFocus
                                  placeholder="Buscar..." 
                                  className="w-full bg-zinc-800 text-sm text-white px-3 py-2 rounded mb-2 border border-zinc-700 focus:border-amber-500 outline-none"
                                  value={searchQuery}
                                  onChange={(e) => handleSearch(e.target.value)}
                               />
                               <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                   {searchResults.length === 0 ? (
                                       <p className="text-xs text-zinc-500 text-center py-2">{searchQuery ? 'Sin resultados' : 'Escribe para buscar'}</p>
                                   ) : (
                                       searchResults.map((res, i) => (
                                           <div key={i} onClick={() => { handleManualJump(res.index); setIsSearchOpen(false); }} className="text-xs p-2 hover:bg-zinc-800 rounded cursor-pointer border-b border-zinc-800/50 last:border-0">
                                               <span className="text-amber-500 font-bold mr-2">#{res.index + 1}</span>
                                               <span className="text-zinc-300 line-clamp-1">{res.snippet}</span>
                                           </div>
                                       ))
                                   )}
                               </div>
                           </div>
                       )}
                  </div>
              </div>
          </div>

          <div className="w-full h-px bg-white/5"></div>

          {/* Bottom Row: Dropdown Buttons */}
          <div className="flex items-center justify-between px-2 py-2 md:justify-center md:gap-8 bg-zinc-900/50 relative z-10">
              
              {/* Voice Dropdown Button */}
              <div className="relative flex-1 md:flex-none">
                  <div className="flex items-center justify-center bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 md:px-3 text-zinc-300 hover:text-white hover:border-zinc-500 transition cursor-pointer gap-2">
                      <span className="text-[10px] md:text-xs font-medium truncate max-w-[80px] md:max-w-none">
                          {VOICE_LABELS[settings.voice].split('(')[0].trim()}
                      </span>
                      <svg className="w-3 h-3 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                  <select 
                      value={Object.keys(VOICE_LABELS).find(key => VOICE_LABELS[key as VoiceOption] === VOICE_LABELS[settings.voice]) ? settings.voice : ''}
                      onChange={(e) => updateSettings({...settings, voice: e.target.value as VoiceOption})}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  >
                      {uniqueVoiceOptions.map((key) => (
                          <option key={key} value={key}>{VOICE_LABELS[key].split('(')[0].trim()}</option>
                      ))}
                  </select>
              </div>

              {/* Speed Dropdown Button */}
              <div className="relative flex-1 md:flex-none mx-2">
                  <div className="flex items-center justify-center bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 md:px-3 text-zinc-300 hover:text-white hover:border-zinc-500 transition cursor-pointer gap-2">
                      <span className="text-[10px] md:text-xs font-mono font-medium">{settings.speed}x</span>
                      <svg className="w-3 h-3 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                  <select 
                      value={settings.speed}
                      onChange={(e) => updateSettings({...settings, speed: parseFloat(e.target.value)})}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  >
                      {[0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0].map((s) => (
                          <option key={s} value={s}>{s}x</option>
                      ))}
                  </select>
              </div>

              {/* Typography Toggle Button */}
              <div className="relative flex-1 md:flex-none">
                  <button 
                      onClick={() => setIsStyleMenuOpen(!isStyleMenuOpen)}
                      className={`w-full flex items-center justify-center bg-zinc-800 border rounded-lg px-2 py-1.5 md:px-3 text-zinc-300 hover:text-white transition gap-2 ${isStyleMenuOpen ? 'border-amber-500 text-white' : 'border-zinc-700 hover:border-zinc-500'}`}
                  >
                      <span className="text-[10px] md:text-xs font-serif font-bold">Aa</span>
                      <svg className="w-3 h-3 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>

                  {/* Typography Dropdown Menu */}
                  {isStyleMenuOpen && (
                      <div className="absolute top-full right-0 mt-2 w-48 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-4 z-[70] animate-in fade-in zoom-in-95 duration-200">
                          {/* Close Overlay */}
                          <div className="fixed inset-0 z-[-1]" onClick={() => setIsStyleMenuOpen(false)}></div>
                          
                          <div className="space-y-4">
                              <div>
                                  <label className="text-[10px] uppercase font-bold text-zinc-500 mb-2 block">Fuente</label>
                                  <div className="grid grid-cols-1 gap-1">
                                      {FONT_OPTIONS.map(opt => (
                                          <button 
                                              key={opt.value}
                                              onClick={() => { updateSettings({...settings, fontFamily: opt.value}); setIsStyleMenuOpen(false); }}
                                              className={`text-left px-2 py-1.5 rounded text-xs ${settings.fontFamily === opt.value ? 'bg-amber-500/20 text-amber-500' : 'text-zinc-300 hover:bg-zinc-800'}`}
                                          >
                                              {opt.label.split(' ')[0]}
                                          </button>
                                      ))}
                                  </div>
                              </div>
                              <div className="border-t border-zinc-800 pt-3">
                                  <div className="flex justify-between mb-2">
                                      <label className="text-[10px] uppercase font-bold text-zinc-500">Tamaño</label>
                                      <span className="text-xs font-mono text-amber-500">{settings.fontSize}px</span>
                                  </div>
                                  <input 
                                      type="range" min="12" max="32" step="1"
                                      value={settings.fontSize}
                                      onChange={(e) => updateSettings({...settings, fontSize: parseInt(e.target.value)})}
                                      className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                  />
                              </div>
                          </div>
                      </div>
                  )}
              </div>
          </div>
      </nav>

      {/* Main Content */}
      <div 
        ref={contentRef}
        className="flex-1 pt-[120px] md:pt-40 pb-[80px] md:pb-32 px-4 sm:px-8 md:px-12 overflow-y-auto custom-scrollbar select-text"
        onScroll={handleScroll}
        onMouseUp={handleMouseUp}
      >
         <div className={`max-w-4xl mx-auto font-${settings.fontFamily}`} style={{ fontSize: `${settings.fontSize}px`, lineHeight: '1.6' }}>
            {currentBook?.chunks.map((chunk, index) => {
                const isActive = index === currentChunkIndex;
                const isBookmarked = currentBook.bookmarks?.includes(index);
                
                return (
                    <div 
                        key={index}
                        id={`chunk-${index}`}
                        onClick={() => handleManualJump(index)}
                        onDoubleClick={(e) => { e.stopPropagation(); handleCopyParagraph(chunk.text, index); }}
                        className={`
                            mb-6 p-4 md:p-6 rounded-xl transition-all duration-300 ease-out cursor-pointer relative border-l-4 group
                            ${isActive 
                                ? 'bg-amber-500/10 border-amber-500 text-zinc-100 shadow-sm' 
                                : 'bg-transparent border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/40'
                            }
                        `}
                    >
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleBookmark(index); }}
                        className={`absolute top-2 right-2 p-1.5 rounded-full transition-all ${isBookmarked ? 'text-amber-500 opacity-100' : 'text-zinc-600 opacity-0 group-hover:opacity-100 hover:bg-zinc-800'}`}
                      >
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5" viewBox="0 0 20 20" fill="currentColor">
                             <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                         </svg>
                      </button>

                      {copiedIndex === index && (
                          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-zinc-800 text-emerald-400 text-[10px] md:text-xs font-bold px-3 py-1 rounded-full shadow-lg border border-zinc-700 animate-bounce z-10 flex items-center gap-2">
                              Copiado
                          </div>
                      )}
                      
                      <p className="text-justify">{chunk.text}</p>
                    </div>
                );
            })}
        </div>
      </div>
      
      {/* Scroll Progress ("Aladdin Effect") */}
      <div 
        className={`fixed bottom-[90px] md:bottom-32 left-1/2 -translate-x-1/2 z-[40] transition-all duration-500 pointer-events-none transform ${showScrollProgress ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
      >
         <div className="bg-zinc-900/90 backdrop-blur border border-amber-500/30 text-amber-500 px-4 md:px-6 py-1.5 md:py-2 rounded-full shadow-[0_0_15px_rgba(245,158,11,0.3)] flex items-center gap-3">
             <div className="h-1.5 md:h-2 w-16 md:w-24 bg-zinc-700 rounded-full overflow-hidden">
                 <div className="h-full bg-amber-500 transition-all duration-100" style={{ width: `${scrollProgress}%` }}></div>
             </div>
             <span className="font-mono font-bold text-sm md:text-lg min-w-[3ch] text-right">{scrollProgress}%</span>
         </div>
      </div>

      <Player 
          currentTextChunk={currentBook?.chunks[currentChunkIndex]?.text || ""}
          audioBlobUrl={audioUrl}
          nextAudioBlobUrl={nextAudioUrl}
          onNext={nextChunk}
          onPrev={prevChunk}
          isLoading={isLoadingAudio}
          settings={settings}
          bookTitle={currentBook?.title || ""}
          setGlobalAnalyserNode={setGlobalAnalyserNode}
      />
    </div>
  );
};

export default App;
