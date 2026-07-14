import React, { useState, useEffect } from 'react';
import { BoardData, CompanyProfile, getCompanyDomain, getMonopolyTheme } from '../types';
import { Briefcase, Activity, Calendar, Layers, ShieldCheck, HelpCircle, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

interface CompanyCardProps {
  comp: CompanyProfile;
  niche: string;
  idx: number;
  onInspectCompany: (c: CompanyProfile) => void;
}

function CompanyCard({ comp, niche, idx, onInspectCompany }: CompanyCardProps) {
  const theme = getMonopolyTheme(comp.index);
  const domain = getCompanyDomain(comp.name);
  const [logoSrc, setLogoSrc] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);
  const [fallbackAttempted, setFallbackAttempted] = useState<boolean>(false);

  useEffect(() => {
    setHasError(false);
    setFallbackAttempted(false);
  }, [comp.name]);

  useEffect(() => {
    let active = true;
    async function fetchLogo() {
      setLoading(true);
      try {
        const response = await fetch('/api/brand-logo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ companyName: comp.name, niche })
        });
        if (response.ok) {
          const data = await response.json();
          if (active) {
            if (data.url) {
              setLogoSrc(data.url);
            } else if (domain) {
              // Direct client fallback to Google Favicon API for instant high-quality logo representation
              setLogoSrc(`https://www.google.com/s2/favicons?sz=128&domain=${domain}`);
              setFallbackAttempted(true);
            }
          }
        } else {
          if (active && domain) {
            setLogoSrc(`https://www.google.com/s2/favicons?sz=128&domain=${domain}`);
            setFallbackAttempted(true);
          }
        }
      } catch (err) {
        console.warn('Error fetching logo for ' + comp.name, err);
        if (active && domain) {
          setLogoSrc(`https://www.google.com/s2/favicons?sz=128&domain=${domain}`);
          setFallbackAttempted(true);
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchLogo();
    return () => { active = false; };
  }, [comp.name, niche, domain]);

  const displayLogo = logoSrc;

  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.03 }}
      onClick={() => onInspectCompany(comp)}
      className="group relative flex flex-col justify-between text-left bg-[#FCFBF8] border-2 border-[#4F4739] hover:border-[#5C8B56] rounded-2xl transition-all duration-300 shadow-md hover:shadow-xl cursor-pointer overflow-hidden min-h-[315px] focus:outline-none focus:ring-2 focus:ring-[#5C8B56]/35 outline outline-1 outline-offset-[-6px] outline-[#C5A68F]/40"
    >
      {/* Property Header Band */}
      <div 
        style={{ backgroundColor: theme.color }}
        className="w-full h-5.5 flex items-center justify-between px-3 text-[9px] font-mono font-black text-white tracking-widest uppercase shadow-sm"
      >
        <span>🍃 Index #{comp.index}</span>
        <span>{comp.tier || 'Asset'}</span>
      </div>

      {/* Styled Brand Logo Stage (Reformatted Display Image area) */}
      <div className="w-full h-32 relative overflow-hidden border-b border-[#BAACA0]/30 flex-shrink-0 flex items-center justify-center bg-gradient-to-b from-[#FDFCF9] via-[#FAF7F0] to-[#EFEAE0]">
        {/* Subtle high-contrast geometric background pattern */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:12px_12px]" />
        
        {/* Elegant glowing background bloom in the property's color */}
        <div 
          style={{ backgroundColor: theme.color }}
          className="absolute w-28 h-28 rounded-full blur-2xl opacity-[0.14] pointer-events-none" 
        />

        {/* Brand Monogram Initials Watermark in background */}
        <span className="absolute bottom-1 right-2.5 text-[32px] font-black font-serif opacity-[0.04] select-none uppercase tracking-tighter">
          {comp.name.substring(0, 2)}
        </span>

        {/* Elegant Logo Frame Medallion (Woodcut circular aesthetic) */}
        <div className="relative z-10 w-20 h-20 rounded-full bg-[#FAF7F0] border-2 border-[#4F4739] shadow-[inset_0_2px_8px_rgba(85,68,37,0.12)] flex items-center justify-center p-2.5 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
          {loading ? (
            <div className="flex flex-col items-center justify-center space-y-1">
              <Loader2 className="w-5 h-5 animate-spin text-[#786759]/60" />
            </div>
          ) : hasError || !displayLogo ? (
            <div 
              style={{ backgroundColor: theme.color }}
              className="w-full h-full flex items-center justify-center text-2xl font-serif font-black text-white rounded-full border-2 border-white/80 shadow-md transition-all duration-300 uppercase select-none"
            >
              {comp.name.charAt(0)}
            </div>
          ) : (
            <img 
              src={displayLogo}
              alt={`${comp.name} logo`}
              className="w-full h-full object-contain rounded-full bg-white"
              referrerPolicy="no-referrer"
              onError={() => {
                if (!fallbackAttempted && domain) {
                  setFallbackAttempted(true);
                  setLogoSrc(`https://www.google.com/s2/favicons?sz=128&domain=${domain}`);
                } else {
                  setHasError(true);
                }
              }}
            />
          )}
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col justify-between space-y-3 w-full">
        {/* Brand Info */}
        <div className="space-y-0.5 w-full">
          <h5 className="font-serif font-black text-[17px] text-[#4F4739] tracking-tight group-hover:text-[#5C8B56] transition-colors leading-tight truncate">
            {comp.name}
          </h5>
          {comp.location && (
            <p className="text-[10px] uppercase font-mono tracking-wide text-[#786759]/80 truncate" title={[comp.location.city, comp.location.state, comp.location.country].filter(Boolean).filter(l => l !== "Unknown").join(", ")}>
              {[comp.location.city, comp.location.state, comp.location.country]
                .filter(Boolean)
                .filter(l => l !== "Unknown")
                .join(", ") || "Location Unknown"}
            </p>
          )}
        </div>

        {/* Valuation & Telemetry Metrics (Cozy Board Game layout, Professional terms) */}
        <div className="space-y-2 text-xs text-[#786759] border-t-2 border-double border-[#BAACA0]/60 pt-3.5 w-full font-sans">
          <div className="flex justify-between items-center">
            <span className="font-serif italic text-[#786759]/90 flex items-center gap-1">💰 Valuation</span>
            <span className="font-mono font-bold text-[#4F4739]">{comp.valuation}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-serif italic text-[#786759]/90 flex items-center gap-1">📊 Market Share</span>
            <span className="font-mono font-semibold text-[#4F4739]">{comp.marketShare}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-serif italic text-[#786759]/90 flex items-center gap-1">📈 Annual Revenue</span>
            <span className="font-mono text-[#4F4739] font-medium">{comp.numbers?.annualRevenue || '—'}</span>
          </div>
        </div>
      </div>
    </motion.button>
  );
}

interface LandscapeProps {
  board: BoardData;
  onInspectCompany: (c: CompanyProfile) => void;
}

export default function Landscape({ board, onInspectCompany }: LandscapeProps) {
  const tiers = ['Emerging', 'Growth', 'Established', 'Dominant'];

  // Helper to group companies by tier
  const getCompaniesByTier = (tierName: string) => {
    const companies = board?.companies || [];
    return companies.filter(c => c.tier?.toLowerCase() === tierName.toLowerCase() || 
      // Fallback if AI didn't use exact tier names, try to bucket by index
      (c.tier == null && getFallbackTier(c.index) === tierName)
    ).sort((a, b) => a.index - b.index);
  };

  const getFallbackTier = (index: number) => {
    if (index <= 5) return 'Emerging';
    if (index <= 10) return 'Growth';
    if (index <= 15) return 'Established';
    return 'Dominant';
  };


  const getTierStyles = (tier: string) => {
    switch(tier) {
      case 'Emerging': 
        return {
          card: 'border-[#4F4739]/40 hover:border-[#9DDAF0] bg-[#FAF7F0]/60 hover:bg-[#FAF7F0]',
          badge: 'bg-[#9DDAF0]/20 text-[#2A5E70] border-[#9DDAF0]/40'
        };
      case 'Growth': 
        return {
          card: 'border-[#4F4739]/40 hover:border-[#D97E9C] bg-[#FAF7F0]/60 hover:bg-[#FAF7F0]',
          badge: 'bg-[#D97E9C]/20 text-[#873F55] border-[#D97E9C]/40'
        };
      case 'Established': 
        return {
          card: 'border-[#4F4739]/40 hover:border-[#E38B60] bg-[#FAF7F0]/60 hover:bg-[#FAF7F0]',
          badge: 'bg-[#E38B60]/20 text-[#8C4625] border-[#E38B60]/40'
        };
      case 'Dominant': 
        return {
          card: 'border-[#4F4739]/50 hover:border-[#C83C41] bg-[#FAF7F0]/60 hover:bg-[#FAF7F0]',
          badge: 'bg-[#C83C41]/20 text-[#7E1A1D] border-[#C83C41]/40'
        };
      default: 
        return {
          card: 'border-[#BAACA0]/40 bg-[#FAF7F0]/40',
          badge: 'bg-[#5C8B56]/20 text-[#2C4F27] border-[#5C8B56]/30'
        };
    }
  };

  return (
    <div className="p-6 md:p-10 space-y-14 bg-[#FAF7F0] min-h-screen">
      {/* Sector Overview Banner with Ghibli Board Game vibes */}
      <div className="border-b-2 border-double border-[#4F4739]/60 pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 relative">
        <div className="absolute -top-3 right-4 opacity-15 text-5xl pointer-events-none select-none">🍃</div>
        <div>
          <h2 className="text-xs font-mono tracking-widest text-[#786759] uppercase mb-1.5 flex items-center gap-1.5">
            <span>🗺️ Sector Market Landscape</span>
          </h2>
          <h3 className="text-3xl font-display font-bold text-[#4F4739] tracking-tight">
            Synthesized Competitor Board
          </h3>
        </div>
        <span className="text-[11px] font-mono text-[#786759] uppercase tracking-wider bg-[#5C8B56]/10 border border-[#5C8B56]/30 px-3 py-1 rounded-full flex items-center gap-1.5">
          <span>📊 Total Mapped:</span> 
          <strong className="text-[#4F4739]">{board?.companies?.length || 0} Companies</strong>
        </span>
      </div>

      {tiers.map((tier) => {
        const comps = getCompaniesByTier(tier);
        if (comps.length === 0) return null;
        
        const styles = getTierStyles(tier);

        return (
          <section key={tier} className="space-y-6">
            <div className="flex items-center gap-3 border-b border-[#BAACA0]/50 pb-2.5">
              <span className={`px-2.5 py-0.5 text-[10px] font-mono tracking-widest uppercase border-2 rounded-full ${styles.badge}`}>
                {tier} Tier
              </span>
              <h4 className="text-lg font-serif font-bold text-[#4F4739] italic">
                {tier === 'Emerging' && '🌱 Emerging & Disruptive Challengers'}
                {tier === 'Growth' && '✨ Rapid Expansion & Scaling Innovators'}
                {tier === 'Established' && '🏰 Established Industry Contenders'}
                {tier === 'Dominant' && '👑 Market Leaders & Dominant Oligarchs'}
              </h4>
              <span className="ml-auto text-xs font-mono text-[#786759] bg-[#FAF7F0] border border-[#BAACA0]/40 px-2 py-0.5 rounded-md">
                {comps.length} {comps.length === 1 ? 'Entity' : 'Entities'}
              </span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {comps.map((comp, idx) => (
                <CompanyCard
                  key={comp.name}
                  comp={comp}
                  niche={board.niche}
                  idx={idx}
                  onInspectCompany={onInspectCompany}
                />
              ))}
            </div>
          </section>
        );
      })}

      {/* Platforms & Events Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 pt-10 border-t border-[#4F4739]/30">
        {board.platforms && board.platforms.length > 0 && (
          <section className="space-y-5">
            <h4 className="text-xs font-mono tracking-widest text-[#786759] uppercase flex items-center gap-2 bg-[#FAF7F0] px-3 py-1 border border-[#BAACA0]/40 rounded-full w-fit">
              <Layers className="w-3.5 h-3.5 text-[#5C8B56]" /> Foundation Infrastructure Platforms
            </h4>
            <div className="grid gap-4">
              {board.platforms.map(p => (
                <div key={p.name} className="p-5 bg-[#FCFBF8] border-2 border-[#4F4739] rounded-2xl outline outline-1 outline-offset-[-6px] outline-[#C5A68F]/30 hover:border-[#5C8B56] transition-all duration-300">
                  <h5 className="font-serif font-bold text-base text-[#4F4739] mb-1 flex items-center gap-1.5">
                    <span>🔌</span> {p.name}
                  </h5>
                  <p className="text-sm text-[#786759] font-serif leading-relaxed">{p.description}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {board.events && board.events.length > 0 && (
          <section className="space-y-5">
            <h4 className="text-xs font-mono tracking-widest text-[#786759] uppercase flex items-center gap-2 bg-[#FAF7F0] px-3 py-1 border border-[#BAACA0]/40 rounded-full w-fit">
              <Calendar className="w-3.5 h-3.5 text-[#D97E9C]" /> Major Sector Inflections & Events
            </h4>
            <div className="grid gap-4">
              {board.events.map(e => (
                <div key={e.title} className="p-5 bg-[#FCFBF8] border-2 border-[#4F4739] rounded-2xl outline outline-1 outline-offset-[-6px] outline-[#C5A68F]/30 hover:border-[#5C8B56] transition-all duration-300 flex flex-col justify-between">
                  <div>
                    <h5 className="font-serif font-bold text-base text-[#4F4739] mb-1.5 flex items-center gap-1.5">
                      <span>📅</span> {e.title}
                    </h5>
                    <p className="text-sm text-[#786759] font-serif leading-relaxed mb-3">{e.description}</p>
                  </div>
                  <span className="inline-block self-start px-2.5 py-1 bg-[#FAF7F0] border border-[#BAACA0] text-[10px] font-mono rounded-lg text-[#786759] uppercase tracking-wider">
                    Impact Magnitude: {e.impact}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
