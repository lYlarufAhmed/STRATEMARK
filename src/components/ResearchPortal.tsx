import React, { useState, useEffect } from 'react';
import { CompanyProfile, AIConfig, getCompanyDomain, getMonopolyTheme } from '../types';
import StratemarkLoader from './StratemarkLoader';
import { 
  Briefcase, DollarSign, Compass, BookOpen, Users,
  TrendingUp, Target, Key, Flame,
  Globe, Search, ExternalLink,
  RefreshCw, AlertTriangle, Send, Sparkles, X, LayoutGrid, Chrome, Copy,
  ArrowLeft, ArrowRight, Loader2
} from 'lucide-react';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';

interface IntelReport {
  content: string;
  sources: Array<{ title: string; uri: string }>;
  queries: string[];
}

interface ResearchPortalProps {
  company: CompanyProfile;
  niche: string;
  onClose: () => void;
  aiConfig: AIConfig;
  onUpdateCompany: (company: CompanyProfile) => void;
}

export default function ResearchPortal({ company, niche, onClose, aiConfig, onUpdateCompany }: ResearchPortalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'team' | 'financials' | 'mission' | 'story' | 'live-intel' | 'advisor' | 'landing-page'>('overview');
  const [resolvedUrl, setResolvedUrl] = useState<string>('');
  const [loadingUrl, setLoadingUrl] = useState<boolean>(true);
  const [previewMode, setPreviewMode] = useState<'live' | 'generated'>('live');
  const [logo, setLogo] = useState<string>('');
  const [loadingLogo, setLoadingLogo] = useState<boolean>(true);
  const [logoError, setLogoError] = useState<boolean>(false);
  const [fallbackAttempted, setFallbackAttempted] = useState<boolean>(false);
  const [intelReport, setIntelReport] = useState<IntelReport | null>(null);
  const [loadingIntel, setLoadingIntel] = useState(false);
  const [intelError, setIntelError] = useState<string | null>(null);

  const [expandedContents, setExpandedContents] = useState<{ [key: string]: { expandedContent: string, sources: any[] } }>({});
  const [expandingTab, setExpandingTab] = useState<string | null>(null);

  const [chatMessages, setChatMessages] = useState<Array<{role: 'user'|'assistant', content: string}>>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatting, setChatting] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const [loadingProfile, setLoadingProfile] = useState(!company.team);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Advanced Visualizations State
  const [activeChart, setActiveChart] = useState<'trajectory' | 'share' | 'funding'>('trajectory');
  const [hoveredPoint, setHoveredPoint] = useState<any | null>(null);

  // Key Player Dossier Details
  const [selectedPlayer, setSelectedPlayer] = useState<any | null>(null);
  const [playerChatInput, setPlayerChatInput] = useState('');
  const [playerChatMessages, setPlayerChatMessages] = useState<Array<{role: 'user' | 'assistant', content: string}>>([]);
  const [playerChatting, setPlayerChatting] = useState(false);

  // Robust Money Formatter
  const formatMoney = (val: number) => {
    if (val >= 1000) {
      return `$${(val / 1000).toFixed(1)}B`;
    }
    return `$${val.toFixed(1)}M`;
  };

  // Dynamic Financial parsing utilities for custom SVG charts
  const revenueStr = company.numbers?.annualRevenue || "$0";
  const fundingStr = company.numbers?.fundingRaised || "$0";
  const burnStr = company.numbers?.burnRate || "$0";
  
  const parseToNum = (str: string, fallback: number) => {
    const clean = str.replace(/[$,\s]/g, '').toLowerCase();
    let mult = 1;
    if (clean.includes('b') || clean.includes('billion')) mult = 1000;
    else if (clean.includes('m') || clean.includes('million')) mult = 1;
    else if (clean.includes('k') || clean.includes('thousand')) mult = 0.001;
    
    const match = clean.match(/[\d.]+/);
    if (match) {
      const parsed = parseFloat(match[0]);
      if (!isNaN(parsed)) {
        return parsed * mult;
      }
    }
    return fallback;
  };

  const getBurnAnnualVal = (str: string, fallback: number) => {
    const isMonthly = str.toLowerCase().includes('month') || str.toLowerCase().includes('/mo') || str.toLowerCase().includes('per month');
    const base = parseToNum(str, fallback);
    return isMonthly ? base * 12 : base;
  };

  const currentRev = parseToNum(revenueStr, 0);
  const currentBurn = getBurnAnnualVal(burnStr, 0);

  const tier = company.tier || 'Emerging';
  let defaultRev = 5;
  let defaultBurn = 2;
  if (tier.toLowerCase().includes('growth')) {
    defaultRev = 25;
    defaultBurn = 8;
  } else if (tier.toLowerCase().includes('established')) {
    defaultRev = 120;
    defaultBurn = 24;
  } else if (tier.toLowerCase().includes('dominant')) {
    defaultRev = 450;
    defaultBurn = 60;
  }

  const finalRev = currentRev > 0 ? currentRev : defaultRev;
  const finalBurn = currentBurn > 0 ? currentBurn : defaultBurn;

  // Compute 5-Year projection points
  const maxVal = Math.max(finalRev * 1.85, finalBurn * 1.1) * 1.1 || 10;
  const getY = (val: number) => {
    const calculated = 190 - (val / maxVal) * 150 + 20;
    return isNaN(calculated) ? 20 : calculated;
  };

  const revPoints = [
    { x: 60, y: getY(finalRev * 0.4), val: finalRev * 0.4, label: "Year -2" },
    { x: 190, y: getY(finalRev * 0.7), val: finalRev * 0.7, label: "Year -1" },
    { x: 320, y: getY(finalRev), val: finalRev, label: "Current" },
    { x: 450, y: getY(finalRev * 1.35), val: finalRev * 1.35, label: "Year +1 (Proj)" },
    { x: 580, y: getY(finalRev * 1.85), val: finalRev * 1.85, label: "Year +2 (Proj)" }
  ];
  
  const burnPoints = [
    { x: 60, y: getY(finalBurn * 0.7), val: finalBurn * 0.7, label: "Year -2" },
    { x: 190, y: getY(finalBurn * 0.9), val: finalBurn * 0.9, label: "Year -1" },
    { x: 320, y: getY(finalBurn), val: finalBurn, label: "Current" },
    { x: 450, y: getY(finalBurn * 1.1), val: finalBurn * 1.1, label: "Year +1 (Proj)" },
    { x: 580, y: getY(finalBurn * 0.8), val: finalBurn * 0.8, label: "Year +2 (Proj)" }
  ];

  const getLinePath = (pts: Array<{x: number, y: number}>) => {
    const validPts = pts.filter(p => !isNaN(p.x) && !isNaN(p.y));
    if (validPts.length === 0) return "M 0 0";
    return validPts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  };

  const getAreaPath = (pts: Array<{x: number, y: number}>) => {
    const validPts = pts.filter(p => !isNaN(p.x) && !isNaN(p.y));
    if (validPts.length === 0) return "M 0 0";
    return `${getLinePath(validPts)} L 580 210 L 60 210 Z`;
  };

  // Compute market share donut slices
  const parseShare = (shareStr: string | undefined): number => {
    if (!shareStr) return 2.5;
    const match = shareStr.match(/[\d.]+/);
    if (match) {
      const val = parseFloat(match[0]);
      if (isNaN(val)) return 2.5;
      return val > 100 ? 100 : (val <= 0 ? 0.5 : val);
    }
    return 2.5;
  };
  const targetShare = Math.min(95, Math.max(0.5, parseShare(company.marketShare)));

  const rival1 = Math.max(1, Math.min(35, 100 - targetShare - 10));
  const rival2 = Math.max(1, Math.min(20, 100 - targetShare - rival1 - 5));
  const rival3 = Math.max(1, Math.min(15, 100 - targetShare - rival1 - rival2 - 2));
  const restMarket = Math.max(1, 100 - targetShare - rival1 - rival2 - rival3);
  
  const shareSegments = [
    { label: company.name, percentage: targetShare, color: "#C5A68F", desc: "Target Company Position" },
    { label: "Tier 1 Competitor", percentage: rival1, color: "#4F4739", desc: "Leading Sector Incumbent" },
    { label: "Tier 2 Competitor", percentage: rival2, color: "#786759", desc: "Mid-Market Scaling Challenger" },
    { label: "Direct Rival", percentage: rival3, color: "#BAACA0", desc: "Direct Specialized Competitor" },
    { label: "Other Players", percentage: restMarket, color: "#EEDCD0", desc: "Long-Tail & Niche Players" }
  ].filter(s => s.percentage > 0);

  const circumference = 314.159;

  // Chronology ladder milestones
  const milestones = [
    { title: "Founding & Seed", subtitle: "Core Ideation", y: 160, val: company.numbers?.fundingRaised ? `~10% of ${company.numbers.fundingRaised}` : "Early Capital", desc: "Founders assembled core team, designed original proof of concept, and closed initial seed round." },
    { title: "Series A Expansion", subtitle: "Validation GTM", y: 120, val: "Scale GTM", desc: "First institutional capital deployed to build repeatable enterprise market-fit and client acquisition." },
    { title: "Series B Growth", subtitle: "Market Scaling", y: 80, val: company.numbers?.fundingRaised || "Series B", desc: "Aggressive organizational expansion, global sales channels, and product line enhancements." },
    { title: "Est. Breakeven", subtitle: "Cash Sustainability", y: 50, val: company.numbers?.profitability || "Operational Breakeven", desc: "Optimizing unit economics, reducing burn-to-revenue ratio, and hitting net-positive margins." },
    { title: "Future Domination", subtitle: "Ecosystem Moat", y: 20, val: "Horizontal Play", desc: "Rolling out adjacent vertical tools, acquiring niche tech assets, and reinforcing defensible IP." }
  ];

  // Advisor transition helper
  const handleInquireWithAdvisor = (topic: string, details: string) => {
    setActiveTab('advisor');
    setChatInput(`Deepen our research on ${company.name}. Provide a highly strategic, search-grounded analysis of: ${topic} (${details}). How does this impact their valuation, core operational risks, and long-term competitive advantages up to today's date?`);
  };

  useEffect(() => {
    setProfileError(null);
    setLoadingProfile(!company.team);
  }, [company.name, company.team]);

  useEffect(() => {
    if (loadingProfile && !company.team) {
      const fetchProfile = async () => {
        try {
          const res = await fetch('/api/generate-company-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ companyName: company.name, niche, aiConfig })
          });
          if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || 'Failed to generate profile');
          }
          const profileData = await res.json();
          onUpdateCompany({ ...company, ...profileData });
        } catch (err: any) {
          console.error(err);
          setProfileError(err.message || 'Error generating deep dive profile');
        } finally {
          setLoadingProfile(false);
        }
      };
      fetchProfile();
    }
  }, [loadingProfile]);

  const handleFetchLiveIntel = async () => {
    setLoadingIntel(true);
    setIntelError(null);
    try {
      const response = await fetch('/api/deep-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName: company.name, niche, aiConfig })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to retrieve search groundings');
      }

      const data = await response.json();
      setIntelReport(data);
    } catch (err: any) {
      console.error(err);
      setIntelError(err.message || "Failed to load live intelligence.");
    } finally {
      setLoadingIntel(false);
    }
  };

  const handleExpandTab = async (tabId: string, currentContent: string) => {
    setExpandingTab(tabId);
    try {
      const response = await fetch('/api/expand-tab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          companyName: company.name, 
          niche, 
          tabId, 
          existingContent: currentContent,
          aiConfig 
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Grounded agent failed to synthesize expansion.");
      }
      const data = await response.json();
      setExpandedContents(prev => ({ ...prev, [tabId]: data }));
    } catch (err: any) {
      console.error(err);
      alert(err.message);
    } finally {
      setExpandingTab(null);
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatting) return;

    const userMsg = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setChatting(true);
    setChatError(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: company.name,
          niche,
          message: userMsg,
          history: chatMessages.slice(-5),
          aiConfig
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Chat engine disconnected.");
      }
      const data = await response.json();
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (err: any) {
      console.error(err);
      setChatError(err.message);
      setChatMessages(prev => [...prev, { role: 'assistant', content: `[SYSTEM FAILURE] ${err.message}` }]);
    } finally {
      setChatting(false);
    }
  };

  useEffect(() => {
    setLogoError(false);
  }, [logo]);

  // Removed generated sandbox fallback message handler to prioritize live sandbox only

  useEffect(() => {
    setLogoError(false);
    setFallbackAttempted(false);
  }, [company.name]);

  useEffect(() => {
    let active = true;
    const domain = getCompanyDomain(company.name);

    async function fetchLogoAndUrl() {
      setLoadingLogo(true);
      setLogoError(false);
      try {
        const response = await fetch('/api/brand-logo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ companyName: company.name, niche })
        });
        if (response.ok) {
          const data = await response.json();
          if (active) {
            if (data.url) {
              setLogo(data.url);
            } else if (domain) {
              setLogo(`https://www.google.com/s2/favicons?sz=128&domain=${domain}`);
              setFallbackAttempted(true);
            }
          }
        } else {
          if (active && domain) {
            setLogo(`https://www.google.com/s2/favicons?sz=128&domain=${domain}`);
            setFallbackAttempted(true);
          }
        }
      } catch (err) {
        console.warn('Error fetching logo in portal', err);
        if (active && domain) {
          setLogo(`https://www.google.com/s2/favicons?sz=128&domain=${domain}`);
          setFallbackAttempted(true);
        }
      } finally {
        if (active) setLoadingLogo(false);
      }
    }

    async function fetchCompanyUrl() {
      setLoadingUrl(true);
      try {
        const response = await fetch('/api/company-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ companyName: company.name, niche })
        });
        if (response.ok) {
          const data = await response.json();
          if (active && data.url) {
            setResolvedUrl(data.url);
          }
        }
      } catch (err) {
        console.warn('Error fetching official URL', err);
      } finally {
        if (active) setLoadingUrl(false);
      }
    }

    fetchLogoAndUrl();
    fetchCompanyUrl();
    return () => { active = false; };
  }, [company.name, niche]);

  useEffect(() => {
    if (activeTab === 'live-intel' && !intelReport && !loadingIntel && !intelError) {
      handleFetchLiveIntel();
    }
  }, [activeTab]);

  if (loadingProfile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[85vh] bg-[#F1EBE4] text-[#4F4739] p-4 sm:p-10 text-center relative rounded-2xl overflow-y-auto">
        <button onClick={onClose} className="absolute top-6 right-6 p-2 hover:bg-[#BAACA0]/20 rounded-xl transition-all cursor-pointer z-20">
          <X className="w-5 h-5 text-[#786759]" />
        </button>
        <div className="w-full max-w-2xl">
          <StratemarkLoader 
            title="Synthesizing Dossier"
            subtitle={`Compiling exhaustive corporate intelligence for ${company.name} within the ${niche} landscape...`}
          />
        </div>
      </div>
    );
  }

  if (profileError && !company.team) {
    return (
      <div className="flex flex-col items-center justify-center h-[85vh] bg-[#F1EBE4] p-10 text-center relative rounded-2xl">
        <button onClick={onClose} className="absolute top-6 right-6 p-2 hover:bg-[#BAACA0]/20 rounded-xl transition-all cursor-pointer">
          <X className="w-5 h-5 text-[#786759]" />
        </button>
        <AlertTriangle className="w-12 h-12 text-[#8b3c3c] mb-6" />
        <h2 className="text-2xl font-display font-bold tracking-widest uppercase text-[#8b3c3c] mb-2">SYNTHESIS TIMEOUT</h2>
        <p className="text-[#786759] max-w-md font-serif mb-6 italic">{profileError}</p>
        <button onClick={() => setLoadingProfile(true)} className="px-6 py-2.5 bg-[#4F4739] hover:bg-[#786759] text-[#F1EBE4] font-mono rounded-lg uppercase tracking-wider text-xs">
          Re-engage
        </button>
      </div>
    );
  }

  const theme = getMonopolyTheme(company.index);
  const domain = getCompanyDomain(company.name);

  const generateLandingPageSrcDoc = () => {
    const primaryColor = theme.color || '#4F4739';
    const execsHtml = (company.team?.keyExecutives || []).map(exec => `
      <div class="p-5 bg-white border border-gray-100 rounded-xl shadow-sm">
        <h4 class="font-serif font-bold text-gray-800 text-lg">${exec.name}</h4>
        <p class="text-xs font-mono font-semibold uppercase tracking-wider mb-2" style="color: ${primaryColor}">${exec.role}</p>
        <p class="text-sm text-gray-500 leading-relaxed">${exec.bio}</p>
      </div>
    `).join('');

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${company.name} | Official Website</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@0,600;0,800;1,400&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Inter', sans-serif; }
          .font-serif { font-family: 'Playfair Display', serif; }
        </style>
      </head>
      <body class="bg-[#FCFBFA] text-gray-800 min-h-screen flex flex-col justify-between selection:bg-gray-200">
        <!-- Top banner -->
        <div class="text-white text-xs py-2 px-4 text-center tracking-wide font-medium" style="background-color: ${primaryColor}">
          ✨ Strategic Platform: Mapping new corporate horizons within the ${niche} sector
        </div>

        <!-- Header -->
        <header class="border-b border-gray-100 bg-white sticky top-0 z-50 shadow-sm px-6 py-4 flex justify-between items-center">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg flex items-center justify-center font-black text-white text-sm" style="background-color: ${primaryColor}">
              ${company.name.charAt(0)}
            </div>
            <span class="font-serif font-black text-xl text-gray-800 tracking-tight">${company.name}</span>
          </div>
          <nav class="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
            <a href="#" class="hover:text-gray-900">Platform</a>
            <a href="#" class="hover:text-gray-900">Ecosystem</a>
            <a href="#" class="hover:text-gray-900">Board</a>
            <a href="#" class="hover:text-gray-900">Milestones</a>
          </nav>
          <button onclick="alert('Welcome to ${company.name}! Connected safely inside the Stratemark live research sandbox.')" class="px-4 py-2 text-xs font-mono uppercase tracking-wider text-white rounded-lg font-bold transition-all hover:opacity-90" style="background-color: ${primaryColor}">
            Connect Portal
          </button>
        </header>

        <!-- Main Body -->
        <main class="flex-1">
          <!-- Hero Section -->
          <section class="max-w-6xl mx-auto px-6 py-14 text-center">
            <span class="px-3 py-1 text-[10px] font-mono tracking-widest uppercase rounded-full bg-gray-100 text-gray-600 inline-block mb-4">
              ${niche} &bull; ${company.tier || 'Asset'}
            </span>
            <h1 class="text-3xl md:text-5xl font-serif font-black text-gray-900 leading-tight tracking-tight mb-5 max-w-4xl mx-auto">
              ${company.mission?.statement || 'Pioneering strategic growth and market solutions.'}
            </h1>
            <p class="text-base text-gray-500 max-w-2xl mx-auto leading-relaxed mb-6">
              ${company.mission?.corePhilosophy || 'Architecting foundational systems to optimize sector valuation, platform utility, and operational efficiency.'}
            </p>
            <div class="flex flex-col sm:flex-row justify-center items-center gap-3">
              <button onclick="document.getElementById('explore').scrollIntoView({behavior: 'smooth'})" class="w-full sm:w-auto px-5 py-2.5 text-xs font-mono uppercase tracking-wider text-white rounded-xl shadow-md transition-all hover:opacity-95" style="background-color: ${primaryColor}">
                Explore Milestones
              </button>
              <button onclick="document.getElementById('subscribe-box').focus()" class="w-full sm:w-auto px-5 py-2.5 text-xs font-mono uppercase tracking-wider bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl transition-all">
                Get Updates
              </button>
            </div>
          </section>

          <!-- Stats Grid -->
          <section id="explore" class="bg-gray-50 border-y border-gray-100 py-10 px-6">
            <div class="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div>
                <p class="text-xs font-mono text-gray-400 uppercase tracking-widest mb-1">Valuation</p>
                <p class="text-xl md:text-2xl font-serif font-black text-gray-900">${company.valuation}</p>
              </div>
              <div>
                <p class="text-xs font-mono text-gray-400 uppercase tracking-widest mb-1">Market Share</p>
                <p class="text-xl md:text-2xl font-serif font-black text-gray-900">${company.marketShare}</p>
              </div>
              <div>
                <p class="text-xs font-mono text-gray-400 uppercase tracking-widest mb-1">Annual Revenue</p>
                <p class="text-xl md:text-2xl font-serif font-black text-gray-900">${company.numbers?.annualRevenue || 'Confidential'}</p>
              </div>
              <div>
                <p class="text-xs font-mono text-gray-400 uppercase tracking-widest mb-1">Total Funding</p>
                <p class="text-xl md:text-2xl font-serif font-black text-gray-900">${company.numbers?.fundingRaised || 'Bootstrapped'}</p>
              </div>
            </div>
          </section>

          <!-- Executive Leadership -->
          ${execsHtml ? `
          <section class="max-w-5xl mx-auto px-6 py-12">
            <h3 class="text-xl font-serif font-black text-gray-900 text-center mb-8">Meet Our Executive Board</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              ${execsHtml}
            </div>
          </section>
          ` : ''}

          <!-- Interactive CTA Callout -->
          <section class="max-w-4xl mx-auto px-6 py-10 text-center">
            <div class="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm space-y-4">
              <h3 class="text-lg md:text-xl font-serif font-black text-gray-900">Stay Updated with Our Growth</h3>
              <p class="text-xs text-gray-500 max-w-md mx-auto">Receive direct quarterly intelligence reports regarding our asset growth and market expansions.</p>
              <div class="max-w-md mx-auto flex gap-2">
                <input id="subscribe-box" type="email" placeholder="enter.email@domain.com" class="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-gray-300">
                <button onclick="this.innerText='Subscribed!'; this.style.backgroundColor='#10B981';" class="px-4 py-2 text-[10px] font-mono uppercase tracking-wider text-white rounded-xl font-bold transition-all" style="background-color: ${primaryColor}">
                  Subscribe
                </button>
              </div>
            </div>
          </section>
        </main>

        <!-- Footer -->
        <footer class="bg-gray-900 text-gray-400 text-[10px] py-8 px-6 border-t border-gray-800 text-center space-y-2">
          <p class="font-serif font-bold text-white text-xs">${company.name}</p>
          <p class="max-w-md mx-auto text-gray-500">Connecting institutional stakeholders with synthesized sector analysis. Secured via sandbox channel proxy.</p>
          <p class="text-gray-600">&copy; 2026 ${company.name}. All Rights Reserved.</p>
        </footer>
      </body>
      </html>
    `;
  };

  const handlePlayerChatSubmit = async (textToSend: string) => {
    if (!textToSend.trim() || playerChatting || !selectedPlayer) return;
    
    const userMsg = textToSend.trim();
    setPlayerChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setPlayerChatInput('');
    setPlayerChatting(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: company.name,
          niche,
          message: userMsg,
          history: [
            {
              role: 'assistant',
              content: `You are ${selectedPlayer.name}, the ${selectedPlayer.role} of ${company.name}. 
Background: ${selectedPlayer.background || ''}
Philosophy: ${selectedPlayer.philosophy || ''}
Achievements: ${selectedPlayer.achievements || ''}
Short bio: ${selectedPlayer.bio || ''}

Respond directly in the first person ('I', 'my') mimicking their specific role and persona. Keep it very conversational, direct, highly professional, realistic, and insightful. Limit to 1-2 concise, highly punchy sentences.`
            }
          ],
          aiConfig
        })
      });

      if (!response.ok) {
        throw new Error('Player voice server offline.');
      }
      const data = await response.json();
      setPlayerChatMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (err: any) {
      console.error(err);
      setPlayerChatMessages(prev => [...prev, { role: 'assistant', content: `[CONNECTION LOST] Player is currently in a meeting. Try asking again.` }]);
    } finally {
      setPlayerChatting(false);
    }
  };

  return (
    <div className="flex flex-col h-[85vh] bg-[#F1EBE4] text-[#4F4739] font-sans">
      {/* Header */}
      <div className="flex justify-between items-center px-8 py-5 border-b border-[#BAACA0] bg-[#F0E1D4]">
        <div className="flex items-center gap-4">
          {/* Dynamic Company Logo */}
          <div className="w-14 h-14 rounded-xl bg-white border border-[#BAACA0]/40 flex items-center justify-center p-1.5 shadow-sm overflow-hidden flex-shrink-0">
            {loadingLogo ? (
              <Loader2 className="w-5 h-5 animate-spin text-[#786759]/60" />
            ) : logoError || !logo ? (
              <div 
                style={{ backgroundColor: theme.color }}
                className="w-full h-full flex items-center justify-center text-2xl font-serif font-black text-white rounded-lg"
              >
                {company.name.charAt(0).toUpperCase()}
              </div>
            ) : (
              <img 
                src={logo}
                alt={`${company.name} logo`}
                className="w-full h-full object-contain bg-white animate-in fade-in duration-300"
                referrerPolicy="no-referrer"
                onError={() => {
                  const domain = getCompanyDomain(company.name);
                  if (!fallbackAttempted && domain) {
                    setFallbackAttempted(true);
                    setLogo(`https://www.google.com/s2/favicons?sz=128&domain=${domain}`);
                  } else {
                    setLogoError(true);
                  }
                }}
              />
            )}
          </div>
          <div>
            <h2 className="text-3xl font-serif font-black tracking-tight text-[#4F4739] leading-none mb-1.5">{company.name}</h2>
            <div className="flex flex-wrap items-center gap-3.5 text-xs font-mono text-[#786759] uppercase tracking-wider">
              <span>Valuation: <strong className="text-[#4F4739] font-bold">{company.valuation}</strong></span>
              <span>&bull;</span>
              <span>Share: <strong className="text-[#4F4739] font-bold">{company.marketShare}</strong></span>
              <span>&bull;</span>
              <span 
                style={{ backgroundColor: `${theme.color}15`, color: theme.color, borderColor: `${theme.color}30` }}
                className="px-2.5 py-0.5 border rounded-md font-black text-[10px]"
              >
                {company.tier || 'Sector Asset'}
              </span>
            </div>
          </div>
        </div>
        <button onClick={onClose} className="p-2.5 hover:bg-[#BAACA0]/20 rounded-xl transition-all cursor-pointer border border-transparent hover:border-[#BAACA0]/40">
          <X className="w-5 h-5 text-[#786759]" />
        </button>
      </div>

      {/* Elegant Nav Tabs */}
      <div className="flex border-b border-[#BAACA0] px-4 bg-[#F0E1D4] overflow-x-auto no-scrollbar">
        {[
          { id: 'overview', icon: Briefcase, label: 'Overview' },
          { id: 'landing-page', icon: Globe, label: 'Live Landing Page' },
          { id: 'team', icon: Users, label: 'Key Players' },
          { id: 'financials', icon: DollarSign, label: 'Metrics' },
          { id: 'mission', icon: Target, label: 'Mission' },
          { id: 'story', icon: BookOpen, label: 'History' },
          { id: 'live-intel', icon: Search, label: 'Live Intel' },
          { id: 'advisor', icon: Sparkles, label: 'Strategic Advisor' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-5 py-3.5 font-mono text-xs font-semibold tracking-wider uppercase transition-all whitespace-nowrap border-b-2 cursor-pointer
              ${activeTab === tab.id 
                ? 'border-[#4F4739] text-[#4F4739] bg-[#F1EBE4]' 
                : 'border-transparent text-[#786759]/80 hover:text-[#4F4739] hover:bg-[#F1EBE4]/30'
              }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Container */}
      <div className="flex-1 overflow-y-auto relative bg-[#F1EBE4] flex flex-col">
        {activeTab === 'advisor' ? (
          /* Strategic Advisor as a dedicated full screen scrollable tab */
          <div className="flex-1 overflow-y-auto p-6 md:p-10 max-w-4xl w-full mx-auto flex flex-col space-y-6">
            <div className="bg-[#4F4739] text-[#F1EBE4] p-5 rounded-2xl flex items-center justify-between shadow-sm animate-in fade-in duration-300">
              <div className="flex items-center gap-3 font-mono text-xs font-bold tracking-widest uppercase">
                <div className="w-2.5 h-2.5 bg-[#C5A68F] rounded-full animate-pulse" />
                Grounded Strategic Advisor
              </div>
              <span className="text-[10px] text-[#C5A68F] font-mono border border-[#C5A68F]/30 bg-[#4F4739] px-3 py-1 rounded-md uppercase tracking-wider">
                {aiConfig.modelName.replace('gemini-', '')}
              </span>
            </div>

            <div className="flex-1 bg-[#F0E1D4]/30 rounded-2xl border border-[#BAACA0]/50 p-6 space-y-5 overflow-y-auto min-h-[350px] shadow-sm font-serif">
              <div className="bg-[#F0E1D4]/70 p-5 rounded-2xl border border-[#BAACA0]/60 text-[#4F4739] leading-relaxed shadow-sm">
                Welcome, Researcher. I am the lead corporate strategist mapping <strong>{company.name}</strong>. Inquiry about metrics, operational challenges, leadership style, or strategic risks will be groundedly answered.
              </div>

              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                  <div className={`p-4 rounded-2xl max-w-[85%] leading-relaxed text-sm shadow-sm font-serif ${msg.role === 'user' ? 'bg-[#4F4739] text-[#F1EBE4]' : 'bg-[#F0E1D4] border border-[#BAACA0]/60 text-[#4F4739]'}`}>
                     {msg.role === 'assistant' ? (
                       <div className="prose prose-sm max-w-none markdown-body"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
                     ) : (
                       msg.content
                     )}
                  </div>
                </div>
              ))}
              {chatting && (
                <div className="flex justify-start">
                  <div className="p-4 bg-[#F0E1D4]/60 border border-[#BAACA0]/50 rounded-2xl flex items-center gap-3 text-[#786759] text-xs font-mono shadow-sm">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#C5A68F]" /> Grounding response via live data index...
                  </div>
                </div>
              )}
            </div>

            <div className="p-5 bg-[#F0E1D4]/40 rounded-2xl border border-[#BAACA0]/50">
              {chatMessages.length === 0 && (
                <div className="flex flex-wrap gap-2 mb-3.5">
                  {['IP advantage?', 'Core executives?', 'Principal risks?', 'Funding context?'].map((q) => (
                    <button key={q} onClick={() => setChatInput(q)} className="text-[10px] font-mono uppercase bg-[#F1EBE4] border border-[#BAACA0] text-[#786759] px-3 py-1.5 rounded-lg hover:bg-[#4F4739] hover:text-[#F1EBE4] transition-all cursor-pointer">
                      {q}
                    </button>
                  ))}
                </div>
              )}
              <form onSubmit={handleChatSubmit} className="relative">
                <input
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  placeholder="Submit strategic inquiry regarding company metrics, execution moats, or leadership..."
                  disabled={chatting}
                  className="w-full bg-[#F1EBE4] border border-[#BAACA0] rounded-xl pl-5 pr-14 py-4 text-sm focus:outline-none focus:ring-1 focus:ring-[#786759] text-[#4F4739] placeholder-[#786759]/60 font-serif shadow-inner"
                />
                <button 
                  type="submit" 
                  disabled={!chatInput.trim() || chatting}
                  className="absolute right-2 top-2 p-2.5 bg-[#4F4739] text-[#F1EBE4] hover:bg-[#786759] rounded-lg disabled:opacity-50 transition-all cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* Normal Document Panel occupying 100% full-width */
          <div className="flex-1 overflow-y-auto p-8 font-serif leading-relaxed text-base text-[#4F4739]/90">
          
          {activeTab === 'landing-page' && (
            <div className="space-y-6 animate-in fade-in duration-300 w-full max-w-5xl mx-auto">
              
              {/* Browser Frame Header */}
              <div className="bg-[#EEDCD0] border border-[#BAACA0] rounded-xl overflow-hidden shadow-lg flex flex-col">
                <div className="bg-[#E6D4C6] px-4 py-3 flex flex-wrap gap-3 items-center justify-between border-b border-[#BAACA0]">
                  {/* Window Controls & Nav */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-[#E63946] inline-block opacity-80" />
                      <span className="w-3 h-3 rounded-full bg-[#FF7A00] inline-block opacity-80" />
                      <span className="w-3 h-3 rounded-full bg-[#1FB25A] inline-block opacity-80" />
                    </div>

                    <div className="flex items-center gap-2 text-[#786759] ml-1">
                      <button 
                        onClick={() => alert('Browser history navigation is managed natively inside the frame below.')} 
                        className="hover:text-[#4F4739] transition-colors cursor-pointer" 
                        title="Back"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => alert('Browser history navigation is managed natively inside the frame below.')} 
                        className="hover:text-[#4F4739] transition-colors cursor-pointer" 
                        title="Forward"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => {
                          const iframe = document.getElementById('live-web-frame') as HTMLIFrameElement;
                          if (iframe) {
                            iframe.src = iframe.src;
                          }
                        }} 
                        className="hover:text-[#4F4739] transition-colors cursor-pointer" 
                        title="Reload Page"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Mode Selector Toggle removed to prioritize real website sandbox */}

                  {/* URL Address Bar */}
                  <div className="flex-1 min-w-[200px] bg-[#FDFDFD]/90 border border-[#BAACA0]/50 rounded-lg px-3 py-1.5 flex items-center gap-2 text-xs font-mono text-[#786759] order-2 sm:order-3">
                    <Chrome className="w-3.5 h-3.5 text-[#1FB25A]" />
                    <span className="text-[#1FB25A] font-bold text-[10px] tracking-wide uppercase">Secure</span>
                    <span className="text-[#BAACA0]">&bull;</span>
                    <span className="truncate text-[#4F4739] select-all flex-1">
                      {previewMode === 'live' ? (resolvedUrl || `https://www.${domain}`) : 'local://bespoke-corporate-pitch'}
                    </span>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(previewMode === 'live' ? (resolvedUrl || `https://www.${domain}`) : 'local://bespoke-corporate-pitch');
                        alert('URL copied to clipboard.');
                      }} 
                      title="Copy URL" 
                      className="ml-auto hover:text-[#4F4739] transition-colors cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Outer Link Button */}
                  <a 
                    href={resolvedUrl || `https://www.${domain}`} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#4F4739] hover:bg-[#786759] text-white text-[10px] font-mono rounded-md uppercase tracking-wider transition-colors cursor-pointer order-4"
                  >
                    <span>Launch</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {/* Secure Sandbox Bar */}
                <div className="bg-[#FFFDF9] px-5 py-2 flex justify-between items-center border-b border-[#BAACA0]/35 text-[11px] font-serif italic text-amber-900/90 bg-amber-50/50">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <span>In-App secure sandboxed link of <strong>{previewMode === 'live' ? (resolvedUrl || `https://www.${domain}`) : 'Bespoke Corporate Pitch Slide'}</strong>.</span>
                  </div>
                  <span className="text-[10px] font-mono text-[#786759] uppercase not-italic">
                    Frame Link: <span className="text-[#1FB25A] font-bold">Connected</span>
                  </span>
                </div>

                {/* Browser Canvas Container */}
                <div className="bg-[#FDFDFD] relative overflow-hidden flex flex-col min-h-[580px]">
                  {previewMode === 'live' && loadingUrl ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#FCFCFA] text-[#786759] z-20 space-y-3">
                      <Loader2 className="w-8 h-8 animate-spin text-[#C5A68F]" />
                      <p className="font-mono text-xs uppercase tracking-widest font-bold">Connecting Live Proxy Channel...</p>
                      <p className="font-serif italic text-sm text-[#786759]/80 text-center max-w-xs px-4">Resolving the official landing page for {company.name} and bypassing sandbox frame restrictions...</p>
                    </div>
                  ) : null}

                  <iframe 
                    id="live-web-frame"
                    key={previewMode + '-' + resolvedUrl}
                    src={previewMode === 'live' && resolvedUrl ? `/api/website-proxy?url=${encodeURIComponent(resolvedUrl)}` : undefined}
                    srcDoc={previewMode === 'generated' ? generateLandingPageSrcDoc() : undefined}
                    className="w-full border-0 min-h-[580px] bg-white relative z-10"
                    title={`${company.name} Live Web Frame`}
                    sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-presentation"
                  />
                  
                  {/* Footer Bar */}
                  <div className="p-3.5 bg-[#FAF8F5] border-t border-[#BAACA0]/20 flex flex-col sm:flex-row justify-between items-center gap-2 text-[10px] font-mono text-[#786759]/90 relative z-20">
                    <span>Note: If the page displays blank, it is due to strict frame restrictions (X-Frame-Options). Click <strong>Launch</strong> above to view.</span>
                    <span className="text-[#1FB25A] font-bold uppercase flex items-center gap-1 whitespace-nowrap">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1FB25A]" /> Live Channel Active
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'overview' && (
            <div className="max-w-3xl space-y-8 animate-in fade-in duration-300">
              
              {/* Brand Title Deed style Banner Card */}
              <div className="border-2 border-[#4F4739] bg-white rounded-xl overflow-hidden shadow-md">
                <div style={{ backgroundColor: theme.color }} className="h-5 w-full shadow-sm" />
                <div className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 text-left">
                  <div className="space-y-1.5">
                    <span style={{ color: theme.color }} className="text-[10px] font-mono uppercase tracking-widest font-black block">
                      Strategic Enterprise Deed
                    </span>
                    <h3 className="text-2xl font-serif font-black text-[#4F4739] tracking-tight">{company.name}</h3>
                    <p className="text-xs font-mono text-[#786759] uppercase tracking-wider">
                      Asset Index #{company.index} &bull; {company.tier || 'Asset'}
                    </p>
                  </div>
                  
                   {/* Real-time Corporate Logo */}
                  <div className="w-16 h-16 rounded-xl bg-white border border-[#BAACA0]/40 flex items-center justify-center p-1.5 shadow-inner overflow-hidden flex-shrink-0">
                    {loadingLogo ? (
                      <Loader2 className="w-5 h-5 animate-spin text-[#786759]/60" />
                    ) : logoError || !logo ? (
                      <div 
                        style={{ backgroundColor: theme.color }}
                        className="w-full h-full flex items-center justify-center text-2xl font-serif font-black text-white rounded-lg"
                      >
                        {company.name.charAt(0).toUpperCase()}
                      </div>
                    ) : (
                      <img 
                        src={logo}
                        alt={`${company.name} logo`}
                        className="w-full h-full object-contain bg-white animate-in fade-in duration-300"
                        referrerPolicy="no-referrer"
                        onError={() => {
                          const domain = getCompanyDomain(company.name);
                          if (!fallbackAttempted && domain) {
                            setFallbackAttempted(true);
                            setLogo(`https://www.google.com/s2/favicons?sz=128&domain=${domain}`);
                          } else {
                            setLogoError(true);
                          }
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>

              <p className="text-xl text-[#4F4739] font-medium leading-relaxed italic border-l-2 border-[#C5A68F] pl-6">
                "{company.mission?.statement}"
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                <div className="p-5 bg-[#F0E1D4]/40 border border-[#BAACA0]/50 rounded-2xl">
                  <h3 className="font-mono text-xs font-bold tracking-widest text-[#786759] uppercase mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#C5A68F]" /> Core Projections
                  </h3>
                  <ul className="space-y-3 font-mono text-xs text-[#786759]">
                    <li className="flex justify-between border-b border-[#BAACA0]/20 pb-2.5">
                      <span>Annual Revenue</span>
                      <strong className="text-[#4F4739] font-bold">{company.numbers?.annualRevenue}</strong>
                    </li>
                    <li className="flex justify-between border-b border-[#BAACA0]/20 pb-2.5">
                      <span>Total Funding</span>
                      <strong className="text-[#4F4739] font-bold">{company.numbers?.fundingRaised}</strong>
                    </li>
                  </ul>
                </div>

                <div className="p-5 bg-[#F0E1D4]/40 border border-[#BAACA0]/50 rounded-2xl">
                  <h3 className="font-mono text-xs font-bold tracking-widest text-[#786759] uppercase mb-4 flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#C5A68F]" /> Personnel & Burn
                  </h3>
                  <ul className="space-y-3 font-mono text-xs text-[#786759]">
                    <li className="flex justify-between border-b border-[#BAACA0]/20 pb-2.5">
                      <span>Headcount</span>
                      <strong className="text-[#4F4739] font-bold">{company.team?.headcount}</strong>
                    </li>
                    <li className="flex justify-between border-b border-[#BAACA0]/20 pb-2.5">
                      <span>Est. Burn Rate</span>
                      <strong className="text-[#4F4739] font-bold">{company.numbers?.burnRate}</strong>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'team' && (
            <div className="max-w-4xl space-y-8 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-xl font-serif font-black text-[#4F4739]">Key Players ({company.team?.keyPlayers?.length || 0})</h3>
                  <p className="text-xs font-mono text-[#786759] uppercase tracking-wider">Meet the key individuals architecting and executing this enterprise</p>
                </div>
                <div className="px-3.5 py-1.5 bg-[#4F4739]/5 border border-[#4F4739]/10 rounded-lg text-xs font-mono text-[#786759]">
                  Headcount: <strong className="text-[#4F4739]">{company.team?.headcount || 'N/A'}</strong>
                </div>
              </div>

              {/* Grid of Key Players */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(company.team?.keyPlayers || company.team?.keyExecutives || []).map((player, i) => (
                  <div 
                    key={i} 
                    className="bg-white border-2 border-[#DCD3C9] hover:border-[#4F4739] rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between"
                  >
                    <div className="flex gap-4">
                      {/* Portrait Avatar */}
                      <div className="w-16 h-16 rounded-xl overflow-hidden border border-[#BAACA0]/40 flex-shrink-0 bg-[#F1EBE4]">
                        <img 
                          src={player.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=F1EBE4&color=4F4739`} 
                          alt={player.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      
                      <div className="space-y-1 flex-1">
                        <h4 className="text-lg font-serif font-bold text-[#4F4739] leading-snug">{player.name}</h4>
                        <div className="font-mono text-[10px] font-bold text-[#C5A68F] uppercase tracking-widest leading-none">{player.role}</div>
                        <p className="text-xs font-serif text-[#786759] line-clamp-3 leading-relaxed mt-2">{player.bio}</p>
                      </div>
                    </div>

                    <div className="mt-5 pt-4 border-t border-[#BAACA0]/20 flex justify-between items-center">
                      <button
                        onClick={() => handleInquireWithAdvisor(`Leadership role: ${player.name}`, player.role)}
                        className="text-[10px] font-mono text-[#786759] hover:text-[#4F4739] uppercase tracking-wider font-bold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        Ask Advisor about them
                      </button>
                      <button
                        onClick={() => {
                          setSelectedPlayer(player);
                          setPlayerChatMessages([
                            { role: 'assistant', content: `Greetings. I am ${player.name}, the ${player.role} here. How can I assist you with your due diligence or strategic alignment review?` }
                          ]);
                          setPlayerChatInput('');
                        }}
                        className="px-3.5 py-1.5 bg-[#4F4739] hover:bg-[#786759] text-[#F1EBE4] hover:text-white rounded-lg text-[10px] font-mono uppercase tracking-wider font-bold transition-colors cursor-pointer"
                      >
                        Dive Deeper
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Corporate Culture Callout */}
              <div className="bg-[#F0E1D4]/40 p-6 rounded-2xl border border-[#BAACA0]/50 font-serif text-sm">
                <h4 className="font-mono font-bold tracking-widest text-[11px] uppercase text-[#786759] mb-3">Corporate Culture & Recruiting</h4>
                <p className="mb-4 text-[#4F4739]/95 leading-relaxed">{company.team?.culture}</p>
                <p className="text-[#4F4739]/95 leading-relaxed">{company.team?.hiringTrends}</p>
              </div>
            </div>
          )}

          {activeTab === 'financials' && (
            <div className="max-w-4xl space-y-8 animate-in fade-in duration-300">
              {/* Interactive Metric Cards */}
              <div>
                <h3 className="font-mono text-xs font-bold tracking-widest text-[#786759] uppercase mb-4">
                  Corporate Core Metrics (Click card to deep-dive with Advisor)
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Revenue", value: company.numbers?.annualRevenue || "N/A", icon: DollarSign },
                    { label: "Funding", value: company.numbers?.fundingRaised || "N/A", icon: TrendingUp },
                    { label: "Burn Rate", value: company.numbers?.burnRate || "N/A", icon: Flame },
                    { label: "Profitability", value: company.numbers?.profitability || "N/A", icon: Target },
                  ].map((stat, i) => (
                    <div 
                      key={i} 
                      onClick={() => handleInquireWithAdvisor(`${stat.label} Metrics`, stat.value)}
                      className="bg-[#F0E1D4]/30 hover:bg-[#F0E1D4]/70 border border-[#BAACA0]/50 p-4 rounded-xl text-center cursor-pointer group transition-all hover:shadow-sm"
                      title="Click to deep dive with Strategic Advisor"
                    >
                      <stat.icon className="w-4 h-4 mx-auto text-[#786759] mb-2 group-hover:scale-110 transition-transform" />
                      <div className="text-base font-bold text-[#4F4739] mb-0.5">{stat.value}</div>
                      <div className="text-[10px] font-mono text-[#786759] uppercase tracking-wider flex items-center justify-center gap-1">
                        {stat.label}
                        <Sparkles className="w-2.5 h-2.5 text-[#C5A68F] opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Data Visualization Workspace */}
              <div className="bg-[#F0E1D4]/20 border border-[#BAACA0]/50 rounded-2xl p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#BAACA0]/40 pb-4 mb-6">
                  <div>
                    <h3 className="font-serif font-bold text-lg text-[#4F4739]">Interactive Intelligence Charts</h3>
                    <p className="text-xs font-mono text-[#786759] mt-0.5">Synthesized models of financial and competitive positioning</p>
                  </div>
                  
                  {/* Chart Selector Buttons */}
                  <div className="flex bg-[#F0E1D4]/60 p-1 rounded-xl border border-[#BAACA0]/40 overflow-x-auto no-scrollbar">
                    {[
                      { id: 'trajectory', label: '5Y Growth Trend' },
                      { id: 'share', label: 'Sector Market Share' },
                      { id: 'funding', label: 'Funding Ladder' }
                    ].map(chart => (
                      <button
                        key={chart.id}
                        onClick={() => {
                          setActiveChart(chart.id as any);
                          setHoveredPoint(null);
                        }}
                        className={`px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap
                          ${activeChart === chart.id 
                            ? 'bg-[#4F4739] text-[#F1EBE4]' 
                            : 'text-[#786759] hover:text-[#4F4739]'
                          }`}
                      >
                        {chart.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Trajectory Area Chart */}
                {activeChart === 'trajectory' && (
                  <div className="space-y-6">
                    <div className="relative overflow-x-auto">
                      <svg width="100%" height="240" viewBox="0 0 600 240" preserveAspectRatio="xMidYMid meet" className="min-w-[500px]">
                        <defs>
                          <linearGradient id="revAreaGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#C5A68F" stopOpacity="0.4"/>
                            <stop offset="100%" stopColor="#C5A68F" stopOpacity="0.0"/>
                          </linearGradient>
                          <linearGradient id="burnAreaGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#8b3c3c" stopOpacity="0.15"/>
                            <stop offset="100%" stopColor="#8b3c3c" stopOpacity="0.0"/>
                          </linearGradient>
                        </defs>
                        
                        {/* Horizontal Gridlines */}
                        {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                          const y = getY(maxVal * ratio);
                          return (
                            <g key={idx} className="opacity-45">
                              <line x1="60" y1={y} x2="580" y2={y} stroke="#BAACA0" strokeWidth="1" strokeDasharray="3 3" />
                              <text x="50" y={y + 4} textAnchor="end" className="fill-[#786759] font-mono text-[9px] font-medium">
                                {formatMoney(maxVal * ratio)}
                              </text>
                            </g>
                          );
                        })}

                        {/* Chart Area Paths */}
                        <path d={getAreaPath(revPoints)} fill="url(#revAreaGrad)" className="transition-all duration-300" />
                        <path d={getAreaPath(burnPoints)} fill="url(#burnAreaGrad)" className="transition-all duration-300" />

                        {/* Chart Line Paths */}
                        <path d={getLinePath(revPoints)} fill="none" stroke="#C5A68F" strokeWidth="3" className="transition-all duration-300" />
                        <path d={getLinePath(burnPoints)} fill="none" stroke="#8b3c3c" strokeWidth="2.5" strokeDasharray="5 3" className="transition-all duration-300" />

                        {/* Revenue Points */}
                        {revPoints.map((pt, idx) => (
                          <g 
                            key={`rev-${idx}`}
                            className="cursor-pointer group"
                            onMouseEnter={() => setHoveredPoint({ 
                              type: 'trajectory', 
                              year: pt.label, 
                              rev: formatMoney(pt.val), 
                              burn: formatMoney(burnPoints[idx].val),
                              isProj: pt.label.includes('Proj')
                            })}
                            onMouseLeave={() => setHoveredPoint(null)}
                          >
                            <circle cx={pt.x} cy={pt.y} r="6" className="fill-[#F1EBE4] stroke-[#C5A68F] stroke-[3px] group-hover:r-8 transition-all" />
                            <circle cx={pt.x} cy={pt.y} r="2.5" className="fill-[#4F4739]" />
                          </g>
                        ))}

                        {/* Burn Points */}
                        {burnPoints.map((pt, idx) => (
                          <g 
                            key={`burn-${idx}`}
                            className="cursor-pointer group"
                            onMouseEnter={() => setHoveredPoint({ 
                              type: 'trajectory', 
                              year: pt.label, 
                              rev: formatMoney(revPoints[idx].val), 
                              burn: formatMoney(pt.val),
                              isProj: pt.label.includes('Proj')
                            })}
                            onMouseLeave={() => setHoveredPoint(null)}
                          >
                            <rect x={pt.x - 5} y={pt.y - 5} width="10" height="10" className="fill-[#F1EBE4] stroke-[#8b3c3c] stroke-[2.5px] group-hover:scale-125 origin-center transition-all" />
                            <rect x={pt.x - 2} y={pt.y - 2} width="4" height="4" className="fill-[#8b3c3c]" />
                          </g>
                        ))}

                        {/* X-axis labels */}
                        {revPoints.map((pt, idx) => (
                          <text key={`lbl-${idx}`} x={pt.x} y="228" textAnchor="middle" className="fill-[#786759] font-mono text-[9px] font-bold uppercase tracking-wider">
                            {pt.label.replace(' (Proj)', '')}
                          </text>
                        ))}
                      </svg>
                    </div>

                    {/* Trajectory Legend and Dynamic Tooltip details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#F0E1D4]/40 p-4 rounded-xl border border-[#BAACA0]/40 font-mono text-xs">
                      <div className="space-y-2.5">
                        <div className="font-bold text-[#4F4739] uppercase tracking-wider pb-1 border-b border-[#BAACA0]/30">Dossier Projections</div>
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-[#C5A68F] inline-block border border-[#4F4739]/10" />
                          <span className="text-[#786759]">Annualized Revenue (Grounded scale)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-1 bg-[#8b3c3c] inline-block border-t border-[#8b3c3c] border-dashed" />
                          <span className="text-[#786759]">Est. Corporate Cash Burn Trajectory</span>
                        </div>
                      </div>

                      <div className="bg-[#F1EBE4] p-3 rounded-lg border border-[#BAACA0]/40 flex flex-col justify-center min-h-[75px]">
                        {hoveredPoint?.type === 'trajectory' ? (
                          <div className="space-y-1">
                            <div className="font-bold text-[#4F4739] uppercase flex justify-between">
                              <span>{hoveredPoint.year}</span>
                              <span className="text-[9px] bg-[#C5A68F]/20 text-[#C5A68F] px-1.5 py-0.2 rounded font-mono">
                                {hoveredPoint.isProj ? 'Projected' : 'Historical'}
                              </span>
                            </div>
                            <div className="flex justify-between text-xs pt-1">
                              <span className="text-[#786759]">Extrapolated Revenue:</span>
                              <span className="font-bold text-[#4F4739]">{hoveredPoint.rev}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-[#786759]">Operating Capital Burn:</span>
                              <span className="font-bold text-[#8b3c3c]">{hoveredPoint.burn}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-[#786759]/70 italic text-center text-[11px] leading-relaxed">
                            Hover over coordinate nodes on the trajectory chart to inspect detailed financial projections.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Competitive Market Share Donut Chart */}
                {activeChart === 'share' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center py-4">
                    <div className="flex justify-center relative">
                      <svg width="220" height="220" viewBox="0 0 200 200" className="animate-in fade-in duration-300">
                        {/* Render Segments */}
                        {(() => {
                          let accPercent = 0;
                          return shareSegments.map((seg, idx) => {
                            const strokeDasharray = `${circumference * (seg.percentage / 100)} ${circumference}`;
                            const strokeDashoffset = -circumference * (accPercent / 100);
                            accPercent += seg.percentage;
                            return (
                              <circle
                                key={idx}
                                cx="100"
                                cy="100"
                                r="50"
                                fill="transparent"
                                stroke={seg.color}
                                strokeWidth="18"
                                strokeDasharray={strokeDasharray}
                                strokeDashoffset={strokeDashoffset}
                                transform="rotate(-90 100 100)"
                                className="transition-all duration-300 hover:stroke-[22px] origin-center cursor-pointer"
                                onMouseEnter={() => setHoveredPoint({ 
                                  type: 'share', 
                                  label: seg.label, 
                                  value: `${seg.percentage.toFixed(2)}%`, 
                                  desc: seg.desc 
                                })}
                                onMouseLeave={() => setHoveredPoint(null)}
                              />
                            );
                          });
                        })()}
                        {/* Center label */}
                        <circle cx="100" cy="100" r="41" fill="#F1EBE4" />
                        <text x="100" y="96" textAnchor="middle" className="fill-[#786759] font-mono text-[9px] font-bold uppercase tracking-wider">Sector Share</text>
                        <text x="100" y="116" textAnchor="middle" className="fill-[#4F4739] font-serif text-lg font-bold">
                          {targetShare.toFixed(3)}%
                        </text>
                      </svg>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-[#F1EBE4] p-4 rounded-xl border border-[#BAACA0]/40 font-mono text-xs min-h-[100px] flex flex-col justify-center">
                        {hoveredPoint?.type === 'share' ? (
                          <div className="space-y-1">
                            <div className="font-bold text-[#4F4739] text-sm uppercase border-b border-[#BAACA0]/20 pb-1 flex justify-between">
                              <span>{hoveredPoint.label}</span>
                              <span className="text-[#C5A68F]">{hoveredPoint.value}</span>
                            </div>
                            <p className="text-[#786759] font-serif italic text-xs pt-1.5">{hoveredPoint.desc}</p>
                          </div>
                        ) : (
                          <div className="text-[#786759]/70 italic text-[11px] text-center leading-relaxed">
                            Hover over donut segments to review synthesized market concentration ratios and incumbent power.
                          </div>
                        )}
                      </div>

                      {/* Legend List */}
                      <div className="space-y-2 font-mono text-[10px]">
                        {shareSegments.map((seg, idx) => (
                          <div 
                            key={idx} 
                            onClick={() => handleInquireWithAdvisor(`${seg.label} Competition`, `${seg.percentage.toFixed(2)}% share`)}
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-[#F0E1D4]/40 border border-transparent hover:border-[#BAACA0]/20 cursor-pointer group transition-all"
                            title="Click to deep dive with Advisor"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full inline-block border border-[#4F4739]/10" style={{ backgroundColor: seg.color }} />
                              <span className="text-[#4F4739] font-bold group-hover:underline">{seg.label}</span>
                              <span className="text-[#786759]/60 italic">({seg.desc})</span>
                            </div>
                            <span className="font-bold text-[#4F4739] flex items-center gap-1">
                              {seg.percentage.toFixed(2)}%
                              <Sparkles className="w-2.5 h-2.5 text-[#C5A68F] opacity-0 group-hover:opacity-100 transition-opacity" />
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Funding Timeline / Ladder */}
                {activeChart === 'funding' && (
                  <div className="space-y-6">
                    <div className="relative overflow-x-auto">
                      <svg width="100%" height="200" viewBox="0 0 600 200" preserveAspectRatio="xMidYMid meet" className="min-w-[500px]">
                        {/* Connection Line */}
                        <line x1="60" y1="100" x2="580" y2="100" stroke="#BAACA0" strokeWidth="4" />
                        <line x1="60" y1="100" x2="320" y2="100" stroke="#C5A68F" strokeWidth="4" /> {/* Current completed path */}
                        
                        {/* Render Milestone Nodes */}
                        {milestones.map((ms, idx) => {
                          const isCompleted = idx <= 2; // Founding, Series A, Series B completed
                          const x = 60 + idx * 130;
                          return (
                            <g 
                              key={idx} 
                              className="cursor-pointer group"
                              onClick={() => handleInquireWithAdvisor(`Milestone: ${ms.title}`, ms.desc)}
                              onMouseEnter={() => setHoveredPoint({
                                type: 'funding',
                                index: idx,
                                title: ms.title,
                                subtitle: ms.subtitle,
                                val: ms.val,
                                desc: ms.desc,
                                completed: isCompleted
                              })}
                              onMouseLeave={() => setHoveredPoint(null)}
                            >
                              {/* Connector line vertical */}
                              <line x1={x} y1="100" x2={x} y2={ms.y} stroke={isCompleted ? "#C5A68F" : "#BAACA0"} strokeWidth="2" strokeDasharray="3 3" />
                              
                              {/* Circle Node */}
                              <circle 
                                cx={x} 
                                cy={ms.y} 
                                r="8" 
                                className={`transition-all duration-300 group-hover:r-10 stroke-[3px] 
                                  ${isCompleted 
                                    ? "fill-[#F1EBE4] stroke-[#C5A68F]" 
                                    : "fill-[#F1EBE4] stroke-[#BAACA0]"}`} 
                              />
                              <circle 
                                cx={x} 
                                cy={ms.y} 
                                r="4" 
                                className={isCompleted ? "fill-[#4F4739]" : "fill-[#BAACA0]"} 
                              />

                              {/* Text values */}
                              <text x={x} y={ms.y > 100 ? ms.y + 20 : ms.y - 12} textAnchor="middle" className="fill-[#4F4739] font-mono text-[9px] font-bold uppercase tracking-wider group-hover:fill-[#C5A68F] transition-colors">
                                {ms.title}
                              </text>
                            </g>
                          );
                        })}
                      </svg>
                    </div>

                    {/* Milestone details board */}
                    <div className="bg-[#F0E1D4]/40 p-5 rounded-xl border border-[#BAACA0]/40 font-mono text-xs min-h-[110px] flex flex-col justify-center">
                      {hoveredPoint?.type === 'funding' ? (
                        <div className="space-y-2">
                          <div className="flex justify-between items-start border-b border-[#BAACA0]/20 pb-1.5">
                            <div>
                              <span className="font-bold text-[#4F4739] text-sm uppercase">{hoveredPoint.title}</span>
                              <span className="text-[#786759] text-[10px] ml-2 italic">({hoveredPoint.subtitle})</span>
                            </div>
                            <span className={`text-[9px] px-2 py-0.5 rounded uppercase font-bold tracking-wider
                              ${hoveredPoint.completed 
                                ? 'bg-[#C5A68F]/20 text-[#C5A68F]' 
                                : 'bg-[#786759]/20 text-[#786759]'
                              }`}
                            >
                              {hoveredPoint.completed ? 'Validated Round' : 'Growth Roadmap'}
                            </span>
                          </div>
                          
                          <p className="text-[#4F4739] font-serif text-sm leading-relaxed">{hoveredPoint.desc}</p>
                          <div className="flex justify-between text-[10px] text-[#C5A68F] font-bold pt-1 uppercase tracking-wider">
                            <span>Round Scale: {hoveredPoint.val}</span>
                            <span className="flex items-center gap-1 text-[#4F4739] hover:underline cursor-pointer">
                              Click node to ask Strategic Advisor about this milestone
                              <Sparkles className="w-3 h-3 text-[#C5A68F]" />
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-[#786759]/70 italic text-[11px] text-center leading-relaxed">
                          Hover over chronology milestones on the funding ladder to inspect validation gates, completed funding rounds, and operational roadmaps. Click any milestone to consult the Advisor.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Defensible Moats text info */}
              <div className="p-6 bg-[#F0E1D4]/40 border border-[#BAACA0]/50 rounded-2xl">
                <h3 className="font-mono text-xs font-bold tracking-widest text-[#786759] uppercase mb-3 flex items-center gap-2">
                  <Key className="w-4 h-4 text-[#C5A68F]" /> Defensible IP & Moats
                </h3>
                <p className="text-sm text-[#4F4739] leading-relaxed font-serif">{company.numbers?.keyAssets}</p>
              </div>
            </div>
          )}

          {activeTab === 'mission' && (
            <div className="max-w-3xl space-y-8 animate-in fade-in duration-300">
              <blockquote className="text-xl text-[#4F4739] italic border-l-2 border-[#C5A68F] pl-6 py-1 leading-relaxed">
                "{company.mission?.statement}"
              </blockquote>
              
              <div>
                <h3 className="font-mono text-xs font-bold tracking-widest text-[#786759] uppercase mb-2 flex items-center gap-2">
                  <Compass className="w-4 h-4 text-[#C5A68F]" /> Core Philosophy
                </h3>
                <p className="text-sm text-[#4F4739]/90 font-serif leading-relaxed">{company.mission?.corePhilosophy}</p>
              </div>

              <div className="p-6 bg-[#8b3c3c]/5 border border-[#8b3c3c]/15 rounded-2xl">
                <h3 className="font-mono text-xs font-bold tracking-widest text-[#8b3c3c] uppercase mb-2.5 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Ethical Constraints & Risks
                </h3>
                <p className="text-sm text-[#4F4739]/95 font-serif leading-relaxed">{company.mission?.ethicalDilemmas}</p>
              </div>
            </div>
          )}

          {activeTab === 'story' && (
            <div className="max-w-3xl space-y-8 animate-in fade-in duration-300">
              <div>
                <h3 className="font-mono text-xs font-bold tracking-widest text-[#786759] uppercase mb-2 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#C5A68F]" /> Corporate Origin
                </h3>
                <p className="text-sm text-[#4F4739]/90 font-serif leading-relaxed">{company.story?.origin}</p>
              </div>
              <div>
                <h3 className="font-mono text-xs font-bold tracking-widest text-[#786759] uppercase mb-2 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-[#C5A68F]" /> Operational Pivots
                </h3>
                <p className="text-sm text-[#4F4739]/90 font-serif leading-relaxed">{company.story?.pivots}</p>
              </div>
              <div>
                <h3 className="font-mono text-xs font-bold tracking-widest text-[#786759] uppercase mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#C5A68F]" /> Historical Hardships
                </h3>
                <p className="text-sm text-[#4F4739]/90 font-serif leading-relaxed">{company.story?.challenges}</p>
              </div>
            </div>
          )}

          {activeTab === 'live-intel' && (
            <div className="max-w-3xl animate-in fade-in duration-300">
              {loadingIntel ? (
                <div className="flex flex-col items-center justify-center py-20 text-[#786759]">
                  <RefreshCw className="w-8 h-8 animate-spin mb-4 text-[#C5A68F]" />
                  <p className="font-mono text-xs font-bold tracking-widest uppercase text-[#4F4739]">Engaging Web Indexing...</p>
                  <p className="text-xs mt-2 max-w-sm text-center italic font-serif">Synthesizing live news, public records, and competitive actions.</p>
                </div>
              ) : intelError ? (
                <div className="bg-[#8b3c3c]/5 border border-[#8b3c3c]/20 p-6 rounded-2xl text-[#8b3c3c]">
                  <AlertTriangle className="w-6 h-6 mb-2" />
                  <p className="font-bold mb-1">Dossier Collection Suspended</p>
                  <p className="text-xs">{intelError}</p>
                  <button onClick={handleFetchLiveIntel} className="mt-4 px-4 py-2 bg-[#8b3c3c]/10 hover:bg-[#8b3c3c]/20 text-[#8b3c3c] border border-[#8b3c3c]/30 rounded-xl font-mono text-xs font-bold uppercase cursor-pointer">Retry</button>
                </div>
              ) : intelReport ? (
                <div className="space-y-8">
                  <div className="prose prose-stone max-w-none font-serif text-sm leading-relaxed text-[#4F4739]/95 markdown-body">
                    <ReactMarkdown>{intelReport.content}</ReactMarkdown>
                  </div>
                  
                  {intelReport.sources && intelReport.sources.length > 0 && (
                    <div className="bg-[#F0E1D4]/40 p-6 rounded-2xl border border-[#BAACA0]/50 mt-12">
                      <h4 className="font-mono font-bold tracking-widest text-[10px] uppercase text-[#786759] mb-4 flex items-center gap-2">
                        <Globe className="w-4 h-4 text-[#C5A68F]" /> Referenced Intel Sources
                      </h4>
                      <ul className="space-y-2">
                        {intelReport.sources.map((s, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <ExternalLink className="w-3.5 h-3.5 text-[#786759]/60 mt-1 flex-shrink-0" />
                            <a href={s.uri} target="_blank" rel="noreferrer" className="text-sm text-[#C5A68F] hover:underline font-serif italic">
                              {s.title || s.uri}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}

          {/* AI Expand Section */}
          {activeTab !== 'overview' && activeTab !== 'live-intel' && (
             <div className="mt-12 max-w-3xl">
                {!expandedContents[activeTab] ? (
                   <button 
                     onClick={() => handleExpandTab(activeTab, JSON.stringify(company))}
                     disabled={expandingTab === activeTab}
                     className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-[#4F4739] hover:bg-[#786759] disabled:opacity-50 text-[#F1EBE4] font-mono font-bold tracking-widest text-xs uppercase rounded-xl transition-all cursor-pointer shadow-sm"
                   >
                     {expandingTab === activeTab ? (
                       <><RefreshCw className="w-4 h-4 animate-spin text-[#C5A68F]" /> Deepening Analysis...</>
                     ) : (
                       <><Sparkles className="w-4 h-4 text-[#C5A68F]" /> Deep Dive {activeTab} via Grounded AI</>
                     )}
                   </button>
                ) : (
                   <div className="mt-8 pt-8 border-t border-double border-[#BAACA0]">
                     <div className="flex items-center gap-2 text-[#C5A68F] mb-6 font-mono font-bold tracking-widest text-xs uppercase">
                       <Sparkles className="w-4 h-4" /> AI Expanded Supplement
                     </div>
                     <div className="prose prose-stone max-w-none font-serif text-sm leading-relaxed text-[#4F4739]/95 markdown-body">
                       <ReactMarkdown>{expandedContents[activeTab].expandedContent}</ReactMarkdown>
                     </div>
                     {expandedContents[activeTab].sources && expandedContents[activeTab].sources.length > 0 && (
                       <div className="bg-[#F0E1D4]/40 p-4 rounded-xl mt-6 border border-[#BAACA0]/40">
                         <ul className="space-y-1">
                           {expandedContents[activeTab].sources.map((s, i) => (
                             <li key={i} className="flex items-start gap-2 text-xs text-[#786759]">
                               <ExternalLink className="w-3 h-3 text-[#786759]/60 mt-0.5" />
                               <a href={s.uri} target="_blank" rel="noreferrer" className="text-[#C5A68F] hover:underline truncate">
                                 {s.title || s.uri}
                               </a>
                             </li>
                           ))}
                         </ul>
                       </div>
                     )}
                   </div>
                )}
             </div>
          )}

        </div>
        )}
      </div>

      {/* Key Player Detailed Dossier Overlay Modal */}
      {selectedPlayer && (
        <div className="fixed inset-0 bg-[#000000]/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-[#F1EBE4] border-2 border-[#4F4739] rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl relative">
            
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-[#BAACA0] bg-[#F0E1D4]">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#C5A68F]" />
                <span className="font-mono text-xs font-bold tracking-wider uppercase text-[#786759]">Player Intelligence Dossier</span>
              </div>
              <button 
                onClick={() => setSelectedPlayer(null)}
                className="p-1.5 hover:bg-[#BAACA0]/20 rounded-lg transition-all cursor-pointer text-[#786759] hover:text-[#4F4739]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 grid grid-cols-1 md:grid-cols-12 gap-8">
              
              {/* Left Column - Card */}
              <div className="md:col-span-5 space-y-5">
                <div className="bg-white border-2 border-[#DCD3C9] p-5 rounded-2xl text-center space-y-4">
                  <div className="w-32 h-32 rounded-2xl overflow-hidden border-2 border-[#BAACA0]/40 mx-auto bg-[#F1EBE4] shadow-sm">
                    <img 
                      src={selectedPlayer.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedPlayer.name)}&background=F1EBE4&color=4F4739`} 
                      alt={selectedPlayer.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div>
                    <h3 className="text-xl font-serif font-black text-[#4F4739]">{selectedPlayer.name}</h3>
                    <div className="font-mono text-[10px] font-bold text-[#C5A68F] uppercase tracking-widest mt-1">{selectedPlayer.role}</div>
                  </div>
                  <p className="text-xs font-serif italic text-[#786759] px-2">"{selectedPlayer.bio}"</p>
                </div>

                <div className="bg-[#F0E1D4]/40 border border-[#BAACA0]/50 p-4 rounded-xl font-mono text-[11px] space-y-2.5">
                  <div className="flex justify-between border-b border-[#BAACA0]/20 pb-1.5">
                    <span className="text-[#786759]">Leadership Level</span>
                    <strong className="text-[#4F4739]">Director / Executive</strong>
                  </div>
                  <div className="flex justify-between border-b border-[#BAACA0]/20 pb-1.5">
                    <span className="text-[#786759]">Organizational Impact</span>
                    <strong className="text-[#1FB25A]">Critical Path</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#786759]">Simulated Voice Match</span>
                    <strong className="text-[#C5A68F]">Calibrated</strong>
                  </div>
                </div>

                {/* Pre-set questions */}
                <div className="space-y-2">
                  <div className="font-mono text-[9px] font-bold text-[#786759] uppercase tracking-wider">Ask preset questions:</div>
                  <div className="flex flex-col gap-1.5">
                    {[
                      "What is your highest strategic priority?",
                      "Describe your biggest career achievement.",
                      "What is your advice for scaling operations?",
                    ].map((q, idx) => (
                      <button
                        key={idx}
                        onClick={() => handlePlayerChatSubmit(q)}
                        disabled={playerChatting}
                        className="text-[10px] font-mono text-left bg-white hover:bg-[#4F4739] text-[#786759] hover:text-[#F1EBE4] border border-[#BAACA0]/40 p-2 rounded-lg transition-all cursor-pointer whitespace-normal"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column - Dossier Tabs & Chat */}
              <div className="md:col-span-7 flex flex-col justify-between space-y-6">
                
                {/* Dossier sections */}
                <div className="space-y-4">
                  <div className="bg-[#FAF8F5] border border-[#BAACA0]/40 p-4 rounded-xl space-y-2">
                    <h4 className="font-mono text-[10px] font-bold text-[#C5A68F] uppercase tracking-widest flex items-center gap-1">
                      <Briefcase className="w-3 h-3" /> Career Background
                    </h4>
                    <p className="text-xs font-serif text-[#4F4739] leading-relaxed">{selectedPlayer.background}</p>
                  </div>

                  <div className="bg-[#FAF8F5] border border-[#BAACA0]/40 p-4 rounded-xl space-y-2">
                    <h4 className="font-mono text-[10px] font-bold text-[#C5A68F] uppercase tracking-widest flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Key Achievements
                    </h4>
                    <p className="text-xs font-serif text-[#4F4739] leading-relaxed">{selectedPlayer.achievements}</p>
                  </div>

                  <div className="bg-[#FAF8F5] border border-[#BAACA0]/40 p-4 rounded-xl space-y-2">
                    <h4 className="font-mono text-[10px] font-bold text-[#C5A68F] uppercase tracking-widest flex items-center gap-1">
                      <Users className="w-3 h-3" /> Habits & Leadership Philosophy
                    </h4>
                    <p className="text-xs font-serif text-[#4F4739] leading-relaxed">
                      <strong>Daily Routine:</strong> {selectedPlayer.routine}<br/>
                      <strong className="mt-1 block">Philosophy:</strong> {selectedPlayer.philosophy}
                    </p>
                  </div>
                </div>

                {/* Simulated Chat Panel */}
                <div className="border border-[#BAACA0] rounded-xl overflow-hidden bg-white flex flex-col h-[280px]">
                  
                  {/* Chat Terminal Header */}
                  <div className="bg-[#F0E1D4]/80 px-4 py-2 border-b border-[#BAACA0]/60 flex items-center justify-between text-[10px] font-mono text-[#786759]">
                    <span>SECURE DIRECT VOICECOM CHANNEL</span>
                    <span className="text-[#1FB25A] font-bold animate-pulse">&bull; ONLINE</span>
                  </div>

                  {/* Message Stream */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 font-serif text-xs">
                    {playerChatMessages.map((msg, idx) => (
                      <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-xl p-2.5 leading-relaxed ${
                          msg.role === 'user' 
                            ? 'bg-[#4F4739] text-[#F1EBE4]' 
                            : 'bg-[#FAF8F5] border border-[#BAACA0]/40 text-[#4F4739]'
                        }`}>
                          <div className="font-mono text-[9px] opacity-60 mb-0.5 uppercase tracking-wider">
                            {msg.role === 'user' ? 'Investigator' : selectedPlayer.name}
                          </div>
                          <div>{msg.content}</div>
                        </div>
                      </div>
                    ))}
                    {playerChatting && (
                      <div className="flex justify-start">
                        <div className="bg-[#FAF8F5] border border-[#BAACA0]/40 rounded-xl p-2.5 text-[#786759]/60 font-mono text-[10px] flex items-center gap-1">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Player is typing response...</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Input Form */}
                  <form onSubmit={(e) => { e.preventDefault(); handlePlayerChatSubmit(playerChatInput); }} className="border-t border-[#BAACA0]/60 p-2 flex gap-2 bg-[#FAF8F5]">
                    <input
                      type="text"
                      value={playerChatInput}
                      onChange={(e) => setPlayerChatInput(e.target.value)}
                      placeholder={`Message ${selectedPlayer.name}...`}
                      disabled={playerChatting}
                      className="flex-1 bg-white border border-[#BAACA0]/60 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#786759] text-[#4F4739] placeholder-[#786759]/50"
                    />
                    <button
                      type="submit"
                      disabled={!playerChatInput.trim() || playerChatting}
                      className="px-3.5 py-1.5 bg-[#4F4739] hover:bg-[#786759] text-white rounded-lg text-xs font-mono font-bold transition-all disabled:opacity-50 cursor-pointer"
                    >
                      Send
                    </button>
                  </form>
                </div>

              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 bg-[#F0E1D4] border-t border-[#BAACA0] text-[10px] font-mono text-[#786759] text-center">
              This terminal simulates direct Q&A interaction with {selectedPlayer.name} using the corporate profile context.
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
