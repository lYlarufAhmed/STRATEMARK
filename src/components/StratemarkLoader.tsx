import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HelpCircle, CheckCircle2, RefreshCw, ChevronLeft, ChevronRight, Activity } from 'lucide-react';

interface StratemarkLoaderProps {
  title?: string;
  subtitle?: string;
}

const STRATEGIC_QUESTIONS = [
  "Does the market leader possess a genuine structural moat, or are they vulnerable to nimbler, infrastructure-native challengers?",
  "Are emerging players scaling via sustainable capital-efficient unit economics, or are they burning cash for temporary customer acquisition?",
  "How will foundation platform players in this niche capture value compared to direct end-user application builders?",
  "Is there a latent regulatory inflection point or policy shift that could redistribute 30% of this sector's market share overnight?",
  "Which competitors in this landscape own the proprietary data assets, talent hubs, or key patents required to dominate the next cycle?",
  "If the cost of capital remains high, which of these balance sheets can withstand prolonged pre-profitable operations?",
  "What invisible cross-border partnerships or supply-chain dependencies could disrupt this entire market map?",
  "If we stripped away marketing hype, which company is executing with the highest product quality and actual code craftsmanship?"
];

const STATUS_STEPS = [
  "Engaging search grounding engine to crawl market databases...",
  "Retrieving active real-world valuations, funding histories, and revenues...",
  "Structuring initial market competitor matrix (20 entities)...",
  "Invoking LLM-as-Judge fact-checking protocol...",
  "Auditing financial details for logical consistency and cross-verifying shares...",
  "Polishing final landscape dossier and board coordinates..."
];

const TILE_LABELS: { [key: number]: string } = {
  1: "START",
  2: "Seed",
  3: "MVP",
  4: "Beta",
  5: "Launch",
  6: "GROWTH",
  7: "Users",
  8: "Revenue",
  9: "Scale",
  10: "Moat",
  11: "EXPAND",
  12: "Partner",
  13: "Series A",
  14: "Series B",
  15: "Market",
  16: "MONOPOLY",
  17: "Merger",
  18: "Acquire",
  19: "IPO",
  20: "Titan"
};

function getCoordinates(index: number) {
  const mapping: { [key: number]: { col: number; row: number } } = {
    1: { col: 0, row: 0 },
    2: { col: 1, row: 0 },
    3: { col: 2, row: 0 },
    4: { col: 3, row: 0 },
    5: { col: 4, row: 0 },
    6: { col: 5, row: 0 },
    7: { col: 5, row: 1 },
    8: { col: 5, row: 2 },
    9: { col: 5, row: 3 },
    10: { col: 5, row: 4 },
    11: { col: 5, row: 5 },
    12: { col: 4, row: 5 },
    13: { col: 3, row: 5 },
    14: { col: 2, row: 5 },
    15: { col: 1, row: 5 },
    16: { col: 0, row: 5 },
    17: { col: 0, row: 4 },
    18: { col: 0, row: 3 },
    19: { col: 0, row: 2 },
    20: { col: 0, row: 1 },
  };
  return mapping[index] || { col: 0, row: 0 };
}

function getHeaderColor(idx: number): string {
  if (idx === 1 || idx === 6 || idx === 11 || idx === 16) return "bg-[#786759]/20"; // Corners
  if (idx > 1 && idx < 6) return "bg-[#3B82F6]"; // Emerging - Blue
  if (idx > 6 && idx < 11) return "bg-[#F97316]"; // Growth - Orange
  if (idx > 11 && idx < 16) return "bg-[#10B981]"; // Established - Green
  if (idx > 16) return "bg-[#8B5CF6]"; // Dominant - Purple
  return "bg-[#786759]/10";
}

export default function StratemarkLoader({ 
  title = "Synthesizing Market Landscape", 
  subtitle = "Fact-checking real-world metrics and compiling competitor map..." 
}: StratemarkLoaderProps) {
  const [questionIdx, setQuestionIdx] = useState(0);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [filledCount, setFilledCount] = useState(1);

  // Cycle through deep-thinking questions at a comfortable pace (9 seconds)
  useEffect(() => {
    const qInterval = setInterval(() => {
      setQuestionIdx((prev) => (prev + 1) % STRATEGIC_QUESTIONS.length);
    }, 9000);

    return () => clearInterval(qInterval);
  }, []);

  // Simulate progress checklist steps
  useEffect(() => {
    const stepInterval = setInterval(() => {
      setCurrentStepIdx((prev) => {
        if (prev < STATUS_STEPS.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 4500);

    return () => clearInterval(stepInterval);
  }, []);

  // Simulate scanning of the 20 board game properties
  useEffect(() => {
    const boardInterval = setInterval(() => {
      setFilledCount((prev) => {
        if (prev < 20) return prev + 1;
        return 1; // loop back so the pawn keeps moving and scanning while waiting
      });
    }, 450);

    return () => clearInterval(boardInterval);
  }, []);

  const nextQuestion = () => {
    setQuestionIdx((prev) => (prev + 1) % STRATEGIC_QUESTIONS.length);
  };

  const prevQuestion = () => {
    setQuestionIdx((prev) => (prev - 1 + STRATEGIC_QUESTIONS.length) % STRATEGIC_QUESTIONS.length);
  };

  const pawnCoords = getCoordinates(filledCount);

  return (
    <div className="flex flex-col items-center justify-center p-6 sm:p-10 text-center relative rounded-3xl bg-[#FCFBF8] border-2 border-[#4F4739] shadow-[0_16px_40px_rgba(85,68,37,0.12)] max-w-2xl w-full mx-auto outline outline-1 outline-offset-[-8px] outline-[#C5A68F]/70">
      
      {/* Decorative Corner Labels */}
      <div className="absolute top-3 left-4 text-[#4F4739]/30 text-[9px] font-mono">MAP</div>
      <div className="absolute top-3 right-4 text-[#4F4739]/30 text-[9px] font-mono">LOAD</div>
      <div className="absolute bottom-3 left-4 text-[#4F4739]/30 text-[9px] font-mono">PLAN</div>
      <div className="absolute bottom-3 right-4 text-[#4F4739]/30 text-[9px] font-mono">PLAY</div>

      {/* 1. Header Block */}
      <div className="mb-6 mt-2">
        <span className="text-[10px] font-mono tracking-widest text-[#C5A68F] font-bold uppercase block mb-1">
          ACTIVE ANALYSIS ENGINE
        </span>
        <h2 className="text-3xl font-display font-black text-[#4F4739] tracking-tight uppercase leading-none">
          {title}
        </h2>
        <p className="text-[#786759] text-xs font-serif italic mt-2 max-w-lg mx-auto">
          {subtitle}
        </p>
      </div>

      {/* 2. Tactical Monopoly-Style Board Animation */}
      <div className="relative w-full max-w-[280px] aspect-square bg-[#FAF7F0] border-2 border-[#4F4739] p-1 rounded-2xl shadow-md mx-auto mb-8 overflow-hidden select-none">
        
        {/* Active Property Scanning Path Grid (6x6 Grid Layout) */}
        <div className="grid grid-cols-6 grid-rows-6 gap-1 w-full h-full relative">
          
          {/* Centered Board Game Core Panel */}
          <div className="col-start-2 col-end-6 row-start-2 row-end-6 bg-[#FCFBF8] border border-dashed border-[#BAACA0]/70 rounded-xl flex flex-col items-center justify-center p-3 text-center shadow-inner relative z-10">
            <Activity className="w-5 h-5 text-[#5C8B56] animate-pulse mb-1.5" />
            <div className="text-[9px] font-mono tracking-widest text-[#C5A68F] font-bold uppercase leading-none">
              COMPILING LANDSCAPE
            </div>
            <div className="text-lg font-display font-black text-[#4F4739] mt-1 tracking-tight leading-none">
              {filledCount} / 20
            </div>
            <p className="text-[9px] text-[#786759] mt-1 font-serif italic leading-snug">
              Syncing properties...
            </p>
          </div>

          {/* Smooth Sliding Red Pawn Piece */}
          <motion.div
            animate={{ 
              left: `${pawnCoords.col * 16.666}%`, 
              top: `${pawnCoords.row * 16.666}%` 
            }}
            transition={{ type: "spring", stiffness: 120, damping: 13 }}
            className="absolute w-[16.666%] h-[16.666%] p-1 z-30 pointer-events-none flex items-center justify-center"
          >
            {/* Wooden Board Game Token Shape */}
            <div className="w-5 h-5 rounded-full bg-[#E5484D] border-2 border-white shadow-[0_4px_10px_rgba(229,72,77,0.4)] flex items-center justify-center relative">
              <div className="w-1.5 h-1.5 rounded-full bg-white opacity-50 absolute top-0.5" />
            </div>
          </motion.div>

          {/* Render the 20 Perimeter Property Tiles */}
          {Array.from({ length: 20 }, (_, i) => {
            const index = i + 1;
            const coords = getCoordinates(index);
            const isScanned = index <= filledCount;
            const isCurrent = index === filledCount;
            const isCorner = index === 1 || index === 6 || index === 11 || index === 16;
            
            return (
              <div
                key={index}
                style={{
                  gridColumnStart: coords.col + 1,
                  gridRowStart: coords.row + 1,
                }}
                className={`relative rounded-md border flex flex-col justify-between overflow-hidden transition-all duration-300 ${
                  isCurrent 
                    ? 'border-[#E5484D] bg-[#FFF0F0] scale-105 z-20 shadow-[0_0_8px_rgba(229,72,77,0.35)]' 
                    : isScanned 
                      ? 'border-[#4F4739] bg-white' 
                      : 'border-[#BAACA0]/40 bg-white/40 opacity-40'
                }`}
              >
                {/* Colored Property Stripe */}
                <div className={`h-1.5 w-full ${getHeaderColor(index)}`} />

                {/* Property Content */}
                <div className="flex-1 flex flex-col items-center justify-center p-0.5 relative">
                  <span className={`font-mono text-[7px] font-bold tracking-tight leading-none ${
                    isCurrent ? 'text-[#E5484D]' : 'text-[#4F4739]'
                  }`}>
                    {index}
                  </span>
                  
                  <span className="text-[6px] font-sans font-bold tracking-tighter uppercase text-[#786759]/80 block max-w-full truncate scale-[0.85] leading-none mt-0.5">
                    {TILE_LABELS[index] || ""}
                  </span>
                </div>

                {/* Subtle Glow Checkmark on Complete Scanned tiles */}
                {isScanned && !isCurrent && (
                  <div className="absolute bottom-0.5 right-0.5 w-1 h-1 rounded-full bg-[#10B981]" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Live Fact-Checking Checkpoints */}
      <div className="w-full bg-[#FAF7F0] border-2 border-[#BAACA0]/40 rounded-2xl p-4 mb-6 text-left max-w-lg mx-auto shadow-inner">
        <h4 className="text-[10px] font-mono font-bold tracking-widest text-[#786759] uppercase mb-2.5 border-b border-[#BAACA0]/30 pb-1.5 flex items-center justify-between">
          <span>Real-time Verification Checklist</span>
          <span className="text-[#5C8B56] animate-pulse font-bold">LLM Judge Engaged</span>
        </h4>
        <div className="space-y-2">
          {STATUS_STEPS.map((step, idx) => {
            const isCompleted = idx < currentStepIdx;
            const isActive = idx === currentStepIdx;
            return (
              <div 
                key={step} 
                className={`flex items-start gap-2.5 transition-all duration-300 text-xs ${
                  isCompleted ? 'text-[#5C8B56]' : isActive ? 'text-[#4F4739] font-medium' : 'text-[#786759]/40'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4 text-[#5C8B56] flex-shrink-0 mt-0.5" />
                ) : isActive ? (
                  <RefreshCw className="w-4 h-4 text-[#C5A68F] animate-spin flex-shrink-0 mt-0.5" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-[#BAACA0]/30 flex-shrink-0 mt-0.5" />
                )}
                <span>{step}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Strategic Questions Slideshow Panel (Swipeable with arrow controls) */}
      <div className="w-full max-w-lg bg-[#FAF7F0] border border-[#BAACA0]/50 rounded-2xl p-4.5 relative overflow-hidden text-left shadow-sm">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-[#C5A68F]" />
        
        {/* Panel Header with Swipe Controls */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-[#C5A68F]">
            <HelpCircle className="w-4.5 h-4.5" />
            <span className="text-[10px] font-mono tracking-widest uppercase font-bold text-[#786759]">
              Strategic Inquiry Panel
            </span>
          </div>
          
          <div className="flex items-center gap-1">
            <button 
              onClick={prevQuestion} 
              className="p-1 hover:bg-[#BAACA0]/20 rounded-md transition-all cursor-pointer text-[#786759] hover:text-[#4F4739]"
              title="Previous Question"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={nextQuestion} 
              className="p-1 hover:bg-[#BAACA0]/20 rounded-md transition-all cursor-pointer text-[#786759] hover:text-[#4F4739]"
              title="Next Question"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content with elegant fade transition */}
        <div className="min-h-[64px] flex items-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={questionIdx}
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="text-[#4F4739] font-serif text-[12.5px] leading-relaxed italic pr-2"
            >
              "{STRATEGIC_QUESTIONS[questionIdx]}"
            </motion.p>
          </AnimatePresence>
        </div>
        
        <div className="flex justify-end mt-1.5 text-[8px] font-mono text-[#786759]/60">
          Question {questionIdx + 1} of {STRATEGIC_QUESTIONS.length}
        </div>
      </div>

      <p className="text-[9px] font-mono text-[#786759]/50 mt-5 tracking-widest uppercase">
        Stratemark & Co. • Tactile Market Intelligence Board
      </p>
    </div>
  );
}
