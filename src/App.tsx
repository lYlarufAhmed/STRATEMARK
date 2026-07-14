import React, { useState, useEffect } from 'react';
import { BoardData, CompanyProfile, AIConfig } from './types';
import Onboarding from './components/Onboarding';
import Landscape from './components/Landscape';
import ResearchPortal from './components/ResearchPortal';

export default function App() {
  const [activeBoard, setActiveBoard] = useState<BoardData | null>(null);
  const [inspectedCompany, setInspectedCompany] = useState<CompanyProfile | null>(null);
  const [generating, setGenerating] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [aiConfig, setAiConfig] = useState<AIConfig>({ modelName: 'gemini-3.5-flash' });

  // Load active board from storage on init
  useEffect(() => {
    const cachedActive = localStorage.getItem('stratemark_active_board');
    if (cachedActive) {
      try {
        setActiveBoard(JSON.parse(cachedActive) as BoardData);
      } catch (e) {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    if (activeBoard) {
      localStorage.setItem('stratemark_active_board', JSON.stringify(activeBoard));
    } else {
      localStorage.removeItem('stratemark_active_board');
    }
  }, [activeBoard]);

  const handleGenerateCustomNiche = async (niche: string) => {
    const startTime = Date.now();
    setGenerating(true);
    setErrorText(null);
    try {
      const response = await fetch('/api/generate-board', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche, aiConfig })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Server returned non-ok status');
      }

      const generatedBoard: BoardData = await response.json();

      // Enforce 35 seconds minimum loading time for the deep parallel synthesis simulation
      const elapsed = Date.now() - startTime;
      const minDuration = 35000; // 35 seconds
      if (elapsed < minDuration) {
        await new Promise(resolve => setTimeout(resolve, minDuration - elapsed));
      }

      setActiveBoard(generatedBoard);
    } catch (err: any) {
      console.error(err);
      setErrorText(err.message || 'Network error encountered during market sector generation.');
    } finally {
      setGenerating(false);
    }
  };

  const handleExit = () => {
    setActiveBoard(null);
    setInspectedCompany(null);
  };

  return (
    <div className="min-h-screen bg-[#F1EBE4] text-[#4F4739] font-sans selection:bg-[#C5A68F]/30">
      {!activeBoard ? (
        <Onboarding 
          onGenerate={handleGenerateCustomNiche} 
          generating={generating}
          errorText={errorText}
          aiConfig={aiConfig}
          setAiConfig={setAiConfig}
        />
      ) : (
        <div className="flex flex-col min-h-screen">
          <header className="px-6 py-4 bg-[#F0E1D4] border-b border-[#BAACA0] flex justify-between items-center shadow-sm">
            <h1 className="text-2xl font-display font-bold tracking-widest text-[#4F4739] flex items-center gap-2">
              <span>STRATEMARK</span>
            </h1>
            <div className="flex items-center gap-5">
              <div className="flex items-center gap-2 bg-[#4F4739]/5 border border-[#BAACA0]/50 rounded-full px-4.5 py-1.5 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1FB25A] animate-pulse" />
                <span className="text-[11px] font-mono font-black tracking-widest uppercase text-[#786759]">
                  Sector Index: <strong className="text-[#4F4739] font-sans tracking-normal ml-1 text-sm font-bold normal-case">{activeBoard.niche}</strong>
                </span>
              </div>
              <button 
                onClick={handleExit}
                className="px-4 py-2 rounded-xl border border-[#BAACA0] hover:bg-[#4F4739] text-[#4F4739] hover:text-[#F1EBE4] transition-all font-mono uppercase text-xs font-semibold cursor-pointer"
              >
                Start Over
              </button>
            </div>
          </header>

          <main className="flex-1 relative">
            <Landscape 
              board={activeBoard} 
              onInspectCompany={setInspectedCompany} 
            />
          </main>
        </div>
      )}

      {inspectedCompany && activeBoard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#4F4739]/65 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-5xl bg-[#F0E1D4] border border-[#BAACA0] rounded-2xl shadow-2xl overflow-hidden my-8">
            <ResearchPortal 
              company={inspectedCompany}
              niche={activeBoard.niche}
              onClose={() => setInspectedCompany(null)}
              aiConfig={aiConfig}
              onUpdateCompany={(updatedProfile) => {
                const newBoard = { ...activeBoard };
                newBoard.companies = newBoard.companies.map(c => 
                  c.name === updatedProfile.name ? updatedProfile : c
                );
                setActiveBoard(newBoard);
                setInspectedCompany(updatedProfile);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
