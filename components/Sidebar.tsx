
import React from 'react';
import { TextChunk } from '../types';

interface SidebarProps {
  chunks: TextChunk[];
  currentChunkIndex: number;
  onJump: (index: number) => void;
  isOpen: boolean;
  toggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ chunks, currentChunkIndex, onJump, isOpen, toggle }) => {
  const chapters = chunks.filter(c => c.isHeading);

  return (
    <>
      {/* Mobile Toggle Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={toggle}
        />
      )}

      <aside className={`fixed top-0 left-0 h-full bg-slate-950 border-r border-slate-800 z-50 transition-transform duration-300 w-80 flex flex-col pt-20 ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 shadow-2xl`}>
        <div className="px-6 pb-6 border-b border-slate-800 flex justify-between items-center bg-slate-950">
            <div>
              <h2 className="text-amber-500 font-bold uppercase tracking-widest text-xs mb-1">Navigation</h2>
              <p className="text-slate-400 text-xs">Table of Contents</p>
            </div>
            <button onClick={toggle} className="lg:hidden text-slate-400 p-2 hover:bg-slate-800 rounded">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
            {chapters.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-slate-600 text-sm italic px-4 text-center border-2 border-dashed border-slate-800 rounded-lg">
                    <span className="mb-2 text-xl">📑</span>
                    No chapters detected.<br/>
                    <span className="text-xs opacity-70">Headers are auto-detected based on format (e.g., "Chapter 1", "Introduction").</span>
                </div>
            ) : (
                <div className="space-y-1">
                    {chapters.map((chapter) => {
                         const isActive = currentChunkIndex >= chapter.id && 
                                          (chapters.find(c => c.id > chapter.id)?.id || Infinity) > currentChunkIndex;
                        return (
                          <button
                              key={chapter.id}
                              onClick={() => { onJump(chapter.id); if(window.innerWidth < 1024) toggle(); }}
                              className={`w-full text-left p-3 rounded-lg text-sm transition-all duration-200 border-l-2 ${
                                  isActive
                                      ? 'bg-amber-900/20 text-amber-500 border-amber-500 font-semibold shadow-inner pl-4' 
                                      : 'text-slate-400 border-transparent hover:bg-slate-900 hover:text-slate-200 hover:pl-4'
                              }`}
                          >
                              <span className="line-clamp-2">{chapter.text}</span>
                          </button>
                        );
                    })}
                </div>
            )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
