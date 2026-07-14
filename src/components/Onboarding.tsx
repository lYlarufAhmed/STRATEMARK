import React, { useState } from 'react';
import { Settings2, TrendingUp, Folder } from 'lucide-react';
import { AIConfig } from '../types';
import StratemarkLoader from './StratemarkLoader';

interface OnboardingProps {
  onGenerate: (niche: string) => void;
  generating: boolean;
  errorText: string | null;
  aiConfig: AIConfig;
  setAiConfig: (config: AIConfig) => void;
}

const SparkleGold = () => (
  <svg className="w-3.5 h-3.5 text-[#C5A68F] fill-current" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C12 2 13.5 8.5 15.5 10.5C17.5 12.5 22 12C22 12C22 12 17.5 12.5 15.5 14.5C13.5 16.5 12 22 12 22C12 22 10.5 16.5 8.5 14.5C6.5 12.5 2 12 2 12C2 12 6.5 12.5 8.5 10.5C10.5 8.5 12 2 12 2Z" stroke="#1C1917" strokeWidth="1.5" strokeLinejoin="round" />
  </svg>
);

const TargetIcon = () => (
  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="#1C1917" strokeWidth="2" fill="#E5484D" />
    <circle cx="12" cy="12" r="6" stroke="#1C1917" strokeWidth="2" fill="#FCFBF8" />
    <circle cx="12" cy="12" r="2.5" stroke="#1C1917" strokeWidth="2" fill="#E5484D" />
  </svg>
);

export default function Onboarding({ onGenerate, generating, errorText, aiConfig, setAiConfig }: OnboardingProps) {
  const [niche, setNiche] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  if (generating) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#E5E0D8] relative font-sans selection:bg-[#C5A68F]/30 overflow-hidden">
        {/* Editorial Decorative Lines with Board Game accents */}
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-8">
          <div className="w-full flex justify-between border-t border-[#1C1917]/15 pt-2 text-[10px] font-mono tracking-widest text-[#1C1917]/70 uppercase">
            <span>Stratemark & Co. / Advisory</span>
            <span>Tactile Market Intelligence Board</span>
          </div>
          <div className="w-full flex justify-between border-b border-[#1C1917]/15 pb-2 text-[10px] font-mono tracking-widest text-[#1C1917]/70 uppercase">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-[#1C1917]/40" />
              Industry Landscape Dossier v3.5
            </span>
            <span className="flex items-center gap-1.5">
              Tactile Board Edition
              <Folder className="w-3.5 h-3.5 text-[#1C1917]/40" />
            </span>
          </div>
        </div>
        
        <StratemarkLoader 
          title="Synthesizing Market Board"
          subtitle={`Running professional-grade competitor analysis for "${niche || 'General Niche'}"...`}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#E5E0D8] relative font-sans selection:bg-[#C5A68F]/30 overflow-hidden">
      {/* Editorial Decorative Lines with Board Game accents */}
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-8">
        <div className="w-full flex justify-between border-t border-[#1C1917]/15 pt-2 text-[10px] font-mono tracking-widest text-[#1C1917]/70 uppercase">
          <span>Stratemark & Co. / Advisory</span>
          <span>Tactile Market Intelligence Board</span>
        </div>
        <div className="w-full flex justify-between border-b border-[#1C1917]/15 pb-2 text-[10px] font-mono tracking-widest text-[#1C1917]/70 uppercase">
          <span className="flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-[#1C1917]/40" />
            Industry Landscape Dossier v3.5
          </span>
          <span className="flex items-center gap-1.5">
            Tactile Board Edition
            <Folder className="w-3.5 h-3.5 text-[#1C1917]/40" />
          </span>
        </div>
      </div>
      
      {/* Outer Premium Board Game Box Lid Container */}
      <div className="max-w-xl w-full bg-[#FCFBF8] border-2 border-[#1C1917] p-10 pt-14 rounded-3xl shadow-[0_24px_60px_rgba(28,25,23,0.18)] relative z-10 outline outline-1 outline-offset-[-6px] outline-[#1C1917]/15">
        
        {/* Sparkle emblem overlapping the top border exactly like premium board game box lid */}
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 w-14 h-14 bg-[#FCFBF8] border-2 border-[#1C1917] rounded-full flex items-center justify-center shadow-md z-20">
          <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Small Cyan Sparkle */}
            <path d="M7 16C7 16 10 17 10 20C10 17 13 16 13 16C13 16 10 15 10 12C10 15 7 16 7 16Z" fill="#9DDAF0" stroke="#1C1917" strokeWidth="1.5" strokeLinejoin="round" />
            {/* Large Yellow/Gold Sparkle */}
            <path d="M12 11C12 11 16 12 16 17C16 12 20 11 20 11C20 11 16 10 16 5C16 10 12 11 12 11Z" fill="#F2C83F" stroke="#1C1917" strokeWidth="1.5" strokeLinejoin="round" />
            {/* Small Rose Sparkle */}
            <path d="M19 22C19 22 22 23 22 26C22 23 25 22 25 22C25 22 22 21 22 18C22 21 19 22 19 22Z" fill="#D97E9C" stroke="#1C1917" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-5xl font-display font-bold tracking-[0.03em] text-[#1C1917] mb-1.5 leading-none uppercase">
            STRATEMARK
          </h1>
          <p className="font-mono text-[10px] tracking-[0.25em] text-[#C5A68F] font-black uppercase flex items-center justify-center gap-3">
            <SparkleGold />
            INDUSTRY COMPETITOR BOARD
            <SparkleGold />
          </p>
        </div>

        <p className="text-[#1C1917]/85 text-center mt-7 mb-8 text-[14.5px] leading-relaxed font-serif max-w-md mx-auto italic">
          "Specify your industry sector or niche below. Our advisory model will synthesize and map out the top twenty competitors onto a tactile, board-game style layout—categorizing them from emerging innovators to market leaders."
        </p>

        <div className="space-y-5 mb-8">
          <div>
            <label className="block text-[11px] font-mono tracking-widest text-[#1C1917]/90 uppercase mb-2.5 flex items-center gap-2.5 font-black">
              <TargetIcon />
              <span>Sector / Niche Description</span>
            </label>
            <input 
              type="text" 
              placeholder="e.g., Next-Gen EV Solid State Batteries, Decarbonization Software, Fintech APIs..." 
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              disabled={generating}
              className="w-full bg-[#FAF8F5] border border-[#1C1917]/25 text-[#1C1917] px-5 py-4 rounded-2xl focus:outline-none focus:border-[#1C1917] focus:ring-1 focus:ring-[#1C1917]/10 placeholder-[#1C1917]/45 transition-colors font-serif text-[15px] shadow-[inset_0_1.5px_4px_rgba(0,0,0,0.03)]"
            />
          </div>

          <button 
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2 text-[10px] font-mono tracking-wider text-[#786759] hover:text-[#1C1917] transition-all uppercase cursor-pointer py-1 font-bold"
          >
            <Settings2 className="w-4 h-4 text-[#C5A68F]" />
            AI Model Settings
          </button>

          {showSettings && (
            <div className="bg-[#FAF8F5] p-5 rounded-2xl border border-[#1C1917]/15 space-y-4 shadow-sm">
              <div>
                <label className="block text-[10px] font-mono tracking-wider text-[#786759] uppercase mb-1.5 font-bold">
                  Select Model
                </label>
                <select 
                  className="w-full bg-[#FCFBF8] border border-[#1C1917]/20 text-[#1C1917] px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-[#1C1917] font-sans text-xs"
                  value={aiConfig.modelName}
                  onChange={(e) => setAiConfig({ ...aiConfig, modelName: e.target.value })}
                >
                  <option value="gemini-3.5-flash">Gemini 3.5 Flash (Swift & Adaptive)</option>
                  <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Deep Reasoning)</option>
                  <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite (Lightweight)</option>
                </select>
              </div>
              
              {(aiConfig.modelName.includes('thinking') || aiConfig.modelName === 'gemini-3.5-flash') && (
                <div>
                  <label className="block text-[10px] font-mono tracking-wider text-[#786759] uppercase mb-1.5 font-bold">
                    Thinking Effort
                  </label>
                  <select 
                    className="w-full bg-[#FCFBF8] border border-[#1C1917]/20 text-[#1C1917] px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-[#1C1917] font-sans text-xs"
                    value={aiConfig.thinkingEffort || 'MEDIUM'}
                    onChange={(e) => setAiConfig({ ...aiConfig, thinkingEffort: e.target.value as any })}
                  >
                    <option value="LOW">Low (Fast Output)</option>
                    <option value="MEDIUM">Medium (Balanced Analysis)</option>
                    <option value="HIGH">High (Detailed Breakdown)</option>
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        {errorText && (
          <div className="mb-6 p-4 bg-red-50/80 border border-red-200 rounded-2xl text-red-800 text-sm font-serif italic">
            Error generating board: {errorText}
          </div>
        )}

        <button
          onClick={() => onGenerate(niche)}
          disabled={!niche.trim() || generating}
          className="w-full py-5 bg-[#9C958C] hover:bg-[#1C1917] disabled:opacity-50 disabled:cursor-not-allowed text-[#FCFBF8] font-mono tracking-[0.2em] font-black uppercase text-xs rounded-2xl flex items-center justify-center gap-2 transition-all duration-300 shadow-[0_4px_12px_rgba(28,25,23,0.06)] cursor-pointer hover:translate-y-[-1px] select-none"
        >
          {generating ? 'GENERATING COMPETITOR BOARD...' : 'ROLL & SYNTHESIZE BOARD'}
        </button>
      </div>
    </div>
  );
}
