import React from 'react';
import { Settings, VoiceOption, VOICE_LABELS, FontFamily } from '../types';
import { FONT_OPTIONS } from '../constants';
import { generateSpeech } from '../services/geminiService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onUpdate: (s: Settings) => void;
}

const SettingsModal: React.FC<Props> = ({ isOpen, onClose, settings, onUpdate }) => {
  if (!isOpen) return null;

  const playPreview = async (voice: VoiceOption) => {
    try {
        const blob = await generateSpeech("Hola, soy una voz de inteligencia artificial.", voice);
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.play();
    } catch (e) {
        alert("Preview failed: " + (e as Error).message);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-[90%] max-w-md shadow-2xl">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-white">Reader Settings</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>

        {/* Voices */}
        <div className="mb-6">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Voice</label>
            <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                {Object.values(VoiceOption).map((voice) => (
                    <div key={voice} className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${settings.voice === voice ? 'border-amber-500 bg-amber-500/10' : 'border-slate-700 hover:border-slate-600'}`} onClick={() => onUpdate({...settings, voice})}>
                        <div className="flex items-center gap-3">
                             <div className={`w-4 h-4 rounded-full border-2 ${settings.voice === voice ? 'border-amber-500 bg-amber-500' : 'border-slate-500'}`}></div>
                             <span className="text-slate-200">{VOICE_LABELS[voice]}</span>
                        </div>
                        <button 
                            onClick={(e) => { e.stopPropagation(); playPreview(voice); }}
                            className="text-xs bg-slate-800 hover:bg-slate-700 text-amber-500 px-2 py-1 rounded"
                        >
                            Preview
                        </button>
                    </div>
                ))}
            </div>
        </div>

        {/* Typography */}
        <div className="mb-6">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Typography</label>
            <div className="grid grid-cols-2 gap-3 mb-3">
                {FONT_OPTIONS.map((f) => (
                    <button
                        key={f.value}
                        onClick={() => onUpdate({...settings, fontFamily: f.value})}
                        className={`p-2 text-sm rounded border ${settings.fontFamily === f.value ? 'border-amber-500 text-amber-500' : 'border-slate-700 text-slate-400'}`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>
            <div className="flex items-center gap-4">
                <span className="text-slate-400 text-sm">Size</span>
                <input 
                    type="range" 
                    min="14" 
                    max="32" 
                    step="1"
                    value={settings.fontSize} 
                    onChange={(e) => onUpdate({...settings, fontSize: Number(e.target.value)})}
                    className="flex-1 accent-amber-500 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer" 
                />
                <span className="text-slate-200 text-sm w-8">{settings.fontSize}px</span>
            </div>
        </div>

        {/* Speed */}
        <div className="mb-6">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Speed (x{settings.speed})</label>
            <div className="flex items-center gap-4">
                <span className="text-slate-400 text-sm">Slow</span>
                <input 
                    type="range" 
                    min="0.25" 
                    max="2.0" 
                    step="0.25"
                    value={settings.speed} 
                    onChange={(e) => onUpdate({...settings, speed: Number(e.target.value)})}
                    className="flex-1 accent-amber-500 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer" 
                />
                <span className="text-slate-400 text-sm">Fast</span>
            </div>
        </div>

        {/* Pitch */}
        <div className="mb-6">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Pitch (Simulated)</label>
            <div className="flex items-center gap-4">
                <span className="text-slate-400 text-sm">Low</span>
                <input 
                    type="range" 
                    min="-10" 
                    max="10" 
                    step="1"
                    value={settings.pitch} 
                    onChange={(e) => onUpdate({...settings, pitch: Number(e.target.value)})}
                    className="flex-1 accent-amber-500 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer" 
                />
                <span className="text-slate-200 text-sm w-8">{settings.pitch}</span>
                <span className="text-slate-400 text-sm">High</span>
            </div>
        </div>

        <button onClick={onClose} className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition">
            Done
        </button>
      </div>
    </div>
  );
};

export default SettingsModal;