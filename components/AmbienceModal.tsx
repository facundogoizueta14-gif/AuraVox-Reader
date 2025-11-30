import React from 'react';
import { Settings, AmbienceType } from '../types';
import { AMBIENCE_SOUNDS } from '../constants';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onUpdate: (s: Settings) => void;
}

const AmbienceModal: React.FC<Props> = ({ isOpen, onClose, settings, onUpdate }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-[90%] max-w-sm shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">✕</button>
        
        <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Atmosphere
        </h2>

        {/* Volume Slider */}
        <div className="mb-6 bg-slate-800 p-4 rounded-xl">
             <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Background Volume</label>
             <div className="flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
                <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.05"
                    value={settings.ambienceVolume} 
                    onChange={(e) => onUpdate({...settings, ambienceVolume: Number(e.target.value)})}
                    className="flex-1 accent-amber-500 h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer" 
                />
                <span className="text-xs font-mono text-slate-300 w-8 text-right">{Math.round(settings.ambienceVolume * 100)}%</span>
             </div>
        </div>

        {/* Ambience Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
            {(Object.keys(AMBIENCE_SOUNDS) as AmbienceType[]).map((key) => {
                const isActive = settings.ambience === key;
                return (
                    <button
                        key={key}
                        onClick={() => onUpdate({ ...settings, ambience: key })}
                        className={`p-3 rounded-lg border text-sm font-medium transition-all text-left flex flex-col justify-between h-20 ${
                            isActive 
                            ? 'bg-amber-500 text-slate-900 border-amber-500 shadow-lg shadow-amber-500/20' 
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-500'
                        }`}
                    >
                        <span className="block">{AMBIENCE_SOUNDS[key].label}</span>
                        {isActive && <div className="h-1 w-4 bg-slate-900 rounded-full"></div>}
                    </button>
                );
            })}
        </div>

        <button onClick={onClose} className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition border border-slate-700">
            Close
        </button>
      </div>
    </div>
  );
};

export default AmbienceModal;