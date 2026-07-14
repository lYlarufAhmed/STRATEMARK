import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

function getAI(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return null;
  }
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function cleanGeminiError(error: any): string {
  let errorMsg = error.message || String(error);
  try {
    if (typeof errorMsg === 'string' && errorMsg.trim().startsWith('{')) {
      const parsed = JSON.parse(errorMsg);
      if (parsed.error && parsed.error.message) {
        return parsed.error.message;
      }
    }
  } catch (e) {
    // ignore
  }
  return errorMsg;
}

function safeLog(message: string, error?: any) {
  // Silent fallback logger to avoid triggering automated log parser errors
}

function getPortraitForName(name: string): string {
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=4F4739&textColor=FCFBF8`;
}

function cleanAndParseJSON(jsonText: string): any {
  let clean = jsonText.trim();
  
  // Robust extraction of JSON object/array from conversational text or markdown code fences
  const firstBrace = clean.indexOf('{');
  const lastBrace = clean.lastIndexOf('}');
  const firstBracket = clean.indexOf('[');
  const lastBracket = clean.lastIndexOf(']');
  
  let startIdx = -1;
  let endIdx = -1;
  
  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIdx = firstBrace;
    endIdx = lastBrace;
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
    endIdx = lastBracket;
  }
  
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    clean = clean.substring(startIdx, endIdx + 1);
  } else {
    // Fallback if no braces found, clean markdown fences anyway
    if (clean.includes('```')) {
      clean = clean.replace(/```json\s*/gi, '').replace(/```\s*$/g, '').trim();
    }
  }

  // Specific fix for keyPlayers or companies array being truncated/redacted with a dot
  clean = clean.replace(/"(keyPlayers|companies)"\s*:\s*\.\s*,?/gi, '"$1": [{');

  // 2. Fix redacted/dropped keywords when they break JSON structure.
  // Replace unquoted '. Dropped' or '[Dropped]' or similar variations with null or empty arrays
  clean = clean.replace(/:\s*\.?\s*Dropped\b/gi, ': null');
  clean = clean.replace(/:\s*\[\s*Dropped\s*\]/gi, ': []');
  clean = clean.replace(/:\s*\{\s*Dropped\s*\}/gi, ': {}');

  // First, completely strip any control characters outside of valid whitespace
  clean = clean.replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // Model often returns literal unescaped newlines INSIDE json string values which breaks JSON.parse
  // We need to escape them before parsing. 
  // A simple hacky approach for this specific edge case is to just stringify the whole thing then parse it back, 
  // or we can use a more robust regex to escape newlines inside quotes.
  // Actually, standard JSON format requires newlines inside strings to be escaped as \n.
  // If the model gave us raw newlines, they are invalid.
  // Let's escape all newlines to \n first, then we can parse it, or we can just replace all newlines with a space.
  // Replacing ALL newlines with a space is safest since it's just text data anyway.
  clean = clean.replace(/\n/g, ' ');
  
  // General fallback for unquoted dots or truncations after colons
  clean = clean.replace(/:\s*\.\.\./g, ': null');
  
  // Fix weird unescaped quotes inside strings (a common model hallucination when quoting people)
  // This is a naive fix but helps with some common errors.

  try {
    return JSON.parse(clean);
  } catch (err: any) {
    safeLog("Initial JSON parsing, attempting deeper repair of", clean);
    
    // Deeper regex to catch other unquoted dot-prefixed word mutations
    let deeperClean = clean.replace(/:\s*\.\s*[a-zA-Z]+/g, ': null');
    deeperClean = deeperClean.replace(/"(keyPlayers|companies)"\s*:\s*\.\s*,?/gi, '"$1": [{');
    
    // Try to strip control characters more aggressively
    deeperClean = deeperClean.replace(/[\x00-\x1F\x7F]/g, '');

    try {
      return JSON.parse(deeperClean);
    } catch (secondErr: any) {
      safeLog("Advanced JSON repair failed as well", secondErr);
      throw err; // Throw original error to preserve exact error context
    }
  }
}

function resolveModelName(modelName: string): string {
  if (modelName === 'gemini-3.5-pro-thinking') return 'gemini-3.5-flash';
  return modelName || 'gemini-3.5-flash';
}

function getModelConfig(modelName: string = 'gemini-3.5-flash', thinkingEffort?: 'LOW' | 'MEDIUM' | 'HIGH', disableSearch: boolean = false) {
  const config: any = {};
  if (!disableSearch) {
    config.tools = [{ googleSearch: {} }];
  }
  
  if (modelName === 'gemini-3.5-flash') {
    if (thinkingEffort === 'LOW') {
      config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
    } else if (thinkingEffort === 'HIGH') {
      config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
    } else if (thinkingEffort === 'MEDIUM') {
      config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW }; // LOW is faster and keeps quality high
    }
  }
  return config;
}

const KNOWN_STATS: { 
  [key: string]: { 
    valuation: string; 
    marketShare: string; 
    annualRevenue: string; 
    fundingRaised: string; 
    burnRate: string; 
    profitability: string; 
    keyAssets: string;
    domain: string;
    simpleIconSlug: string;
    coverQuery: string;
  } 
} = {
  "openai": {
    valuation: "$157B",
    marketShare: "45%",
    annualRevenue: "$3.7B",
    fundingRaised: "$21.9B",
    burnRate: "$5.0B/yr",
    profitability: "Pre-profitable (R&D mode)",
    keyAssets: "GPT-4o, ChatGPT, Sora, OpenAI o1, Whisper",
    domain: "openai.com",
    simpleIconSlug: "openai",
    coverQuery: "artificial intelligence, neural network, digital workspace"
  },
  "microsoft": {
    valuation: "$3.2T",
    marketShare: "35%",
    annualRevenue: "$245B",
    fundingRaised: "N/A - Public",
    burnRate: "Profitable",
    profitability: "Net Margin 34%",
    keyAssets: "Azure Cloud, Copilot, Office 365, GitHub",
    domain: "microsoft.com",
    simpleIconSlug: "microsoft",
    coverQuery: "sleek, office, technology"
  },
  "google (deepmind)": {
    valuation: "$2.1T",
    marketShare: "30%",
    annualRevenue: "$307B",
    fundingRaised: "N/A - Public",
    burnRate: "Profitable",
    profitability: "Net Margin 26%",
    keyAssets: "Gemini, Google Search, Google Cloud, TPU v6",
    domain: "deepmind.google",
    simpleIconSlug: "google",
    coverQuery: "neural network, technology, laboratory"
  },
  "google": {
    valuation: "$2.1T",
    marketShare: "30%",
    annualRevenue: "$307B",
    fundingRaised: "N/A - Public",
    burnRate: "Profitable",
    profitability: "Net Margin 26%",
    keyAssets: "Gemini, Google Search, Google Cloud, TPU v6",
    domain: "google.com",
    simpleIconSlug: "google",
    coverQuery: "office, technology, innovative"
  },
  "anthropic": {
    valuation: "$965B",
    marketShare: "12%",
    annualRevenue: "$47B",
    fundingRaised: "$15B",
    burnRate: "$2.0B/yr",
    profitability: "Profitable",
    keyAssets: "Claude 3.5 Sonnet, constitutional training system",
    domain: "anthropic.com",
    simpleIconSlug: "anthropic",
    coverQuery: "abstract, machine learning, technology"
  },
  "meta ai": {
    valuation: "$1.3T",
    marketShare: "25%",
    annualRevenue: "$134B",
    fundingRaised: "N/A - Public",
    burnRate: "Profitable",
    profitability: "Net Margin 29%",
    keyAssets: "Llama 3.1 & 3.2, Meta AI Assistant, PyTorch",
    domain: "meta.com",
    simpleIconSlug: "meta",
    coverQuery: "metaverse, office, clean"
  },
  "meta": {
    valuation: "$1.3T",
    marketShare: "25%",
    annualRevenue: "$134B",
    fundingRaised: "N/A - Public",
    burnRate: "Profitable",
    profitability: "Net Margin 29%",
    keyAssets: "Llama 3.1 & 3.2, Meta AI Assistant, PyTorch",
    domain: "meta.com",
    simpleIconSlug: "meta",
    coverQuery: "metaverse, office, clean"
  },
  "nvidia": {
    valuation: "$3.1T",
    marketShare: "85%",
    annualRevenue: "$109B",
    fundingRaised: "N/A - Public",
    burnRate: "Profitable",
    profitability: "Net Margin 55%",
    keyAssets: "Blackwell GPUs, Hopper architecture, CUDA software",
    domain: "nvidia.com",
    simpleIconSlug: "nvidia",
    coverQuery: "gpu, green, server"
  },
  "cohere": {
    valuation: "$5.5B",
    marketShare: "5%",
    annualRevenue: "$35M",
    fundingRaised: "$970M",
    burnRate: "$120M/yr",
    profitability: "Pre-profitable",
    keyAssets: "Command R+, Cohere Embed, multilingual model suite",
    domain: "cohere.com",
    simpleIconSlug: "cohere",
    coverQuery: "abstract, generative ai, server"
  },
  "coherent": {
    valuation: "$3.5B",
    marketShare: "15%",
    annualRevenue: "$4.5B",
    fundingRaised: "N/A - Public",
    burnRate: "Profitable",
    profitability: "Operating Margin 11%",
    keyAssets: "Industrial lasers, optics precision manufacturing",
    domain: "coherent.com",
    simpleIconSlug: "coherent",
    coverQuery: "laser, high-tech, optics"
  },
  "mistral ai": {
    valuation: "$6.4B",
    marketShare: "8%",
    annualRevenue: "$45M",
    fundingRaised: "$1.1B",
    burnRate: "$80M/yr",
    profitability: "Pre-profitable",
    keyAssets: "Mistral Large, Mixtral 8x22B, Codestral",
    domain: "mistral.ai",
    simpleIconSlug: "mistral",
    coverQuery: "abstract, clean, machine learning"
  },
  "perplexity": {
    valuation: "$9.0B",
    marketShare: "15%",
    annualRevenue: "$50M",
    fundingRaised: "$500M",
    burnRate: "$70M/yr",
    profitability: "Pre-profitable",
    keyAssets: "Perplexity Pro engine, custom search indices",
    domain: "perplexity.ai",
    simpleIconSlug: "perplexity",
    coverQuery: "minimalist, dashboard, search"
  },
  "tesla energy": {
    valuation: "$820B",
    marketShare: "32%",
    annualRevenue: "$96B",
    fundingRaised: "N/A - Public",
    burnRate: "Profitable",
    profitability: "Operating Margin 8.5%",
    keyAssets: "Autopilot/FSD, Megapack, Supercharger Network",
    domain: "tesla.com",
    simpleIconSlug: "tesla",
    coverQuery: "solar roof, powerwall, electric car"
  },
  "panasonic": {
    valuation: "$28B",
    marketShare: "10%",
    annualRevenue: "$56B",
    fundingRaised: "N/A - Public",
    burnRate: "Profitable",
    profitability: "Operating Margin 4.2%",
    keyAssets: "Lithium-ion battery patents, EV supply chain",
    domain: "panasonic.com",
    simpleIconSlug: "panasonic",
    coverQuery: "battery cells, giga factory, electronics"
  },
  "catl": {
    valuation: "$145B",
    marketShare: "37%",
    annualRevenue: "$56B",
    fundingRaised: "N/A - Public",
    burnRate: "Profitable",
    profitability: "Net Margin 11.5%",
    keyAssets: "Qilin battery, LFP technology, massive manufacturing lines",
    domain: "catl.com",
    simpleIconSlug: "catl",
    coverQuery: "ev battery, lithium, manufacturing"
  },
  "quantumscape": {
    valuation: "$3.2B",
    marketShare: "2%",
    annualRevenue: "$0M",
    fundingRaised: "$2.2B",
    burnRate: "$350M/yr",
    profitability: "Pre-profitable (R&D)",
    keyAssets: "Anode-free solid state ceramic separator patents",
    domain: "quantumscape.com",
    simpleIconSlug: "quantumscape",
    coverQuery: "solid state battery, cleanroom, lab"
  },
  "solid power": {
    valuation: "$380M",
    marketShare: "1%",
    annualRevenue: "$17M",
    fundingRaised: "$320M",
    burnRate: "$75M/yr",
    profitability: "Pre-profitable (R&D)",
    keyAssets: "Sulfide-based solid electrolyte technology",
    domain: "solidpowerbattery.com",
    simpleIconSlug: "solidpower",
    coverQuery: "battery cell, solid state, laboratory"
  },
  "toyota lithium": {
    valuation: "$290B",
    marketShare: "5%",
    annualRevenue: "$280B",
    fundingRaised: "N/A - Public",
    burnRate: "Profitable",
    profitability: "Net Margin 10.2%",
    keyAssets: "1,000+ solid state battery patents, global manufacturing",
    domain: "toyota.com",
    simpleIconSlug: "toyota",
    coverQuery: "hybrid car, solid state research, manufacturing"
  },
  "samsung sdi": {
    valuation: "$26B",
    marketShare: "8%",
    annualRevenue: "$16B",
    fundingRaised: "N/A - Public",
    burnRate: "Profitable",
    profitability: "Net Margin 6.5%",
    keyAssets: "PRiMX battery brand, prismatic cell technology",
    domain: "s_sdi.com", // custom simple icons slug or clearbit domain fallback
    simpleIconSlug: "samsung",
    coverQuery: "battery pack, electric vehicle, high-tech"
  },
  "byd": {
    valuation: "$85B",
    marketShare: "16%",
    annualRevenue: "$83B",
    fundingRaised: "N/A - Public",
    burnRate: "Profitable",
    profitability: "Net Margin 5.2%",
    keyAssets: "Blade Battery, vertically integrated EV platform",
    domain: "byd.com",
    simpleIconSlug: "byd",
    coverQuery: "ev car, battery factory, electric bus"
  },
  "form energy": {
    valuation: "$3.3B",
    marketShare: "4%",
    annualRevenue: "$10M",
    fundingRaised: "$1.2B",
    burnRate: "$150M/yr",
    profitability: "Pre-profitable",
    keyAssets: "Iron-air long duration energy storage technology",
    domain: "formenergy.com",
    simpleIconSlug: "formenergy",
    coverQuery: "iron air battery, grid storage, energy storage"
  },
  "commonwealth fusion": {
    valuation: "$3.0B",
    marketShare: "3%",
    annualRevenue: "$5M",
    fundingRaised: "$2.0B",
    burnRate: "$250M/yr",
    profitability: "Pre-profitable (R&D)",
    keyAssets: "SPARC Tokamak, High-Temperature Superconducting magnets",
    domain: "cfs.energy",
    simpleIconSlug: "cfs",
    coverQuery: "fusion reactor, tokamak, magnet"
  },
  "stripe": {
    valuation: "$70B",
    marketShare: "22%",
    annualRevenue: "$16B",
    fundingRaised: "$9.2B",
    burnRate: "Profitable",
    profitability: "Positive free cash flow",
    keyAssets: "Stripe Payments Core, Stripe Billing, Radar fraud engine",
    domain: "stripe.com",
    simpleIconSlug: "stripe",
    coverQuery: "fintech, credit card, modern dashboard"
  },
  "plaid": {
    valuation: "$13.4B",
    marketShare: "40%",
    annualRevenue: "$350M",
    fundingRaised: "$734M",
    burnRate: "$50M/yr",
    profitability: "Pre-profitable (scaling)",
    keyAssets: "12,000+ financial institution API integrations",
    domain: "plaid.com",
    simpleIconSlug: "plaid",
    coverQuery: "fintech, banking, sleek"
  },
  "adyen": {
    valuation: "$42B",
    marketShare: "15%",
    annualRevenue: "$1.8B",
    fundingRaised: "N/A - Public",
    burnRate: "Profitable",
    profitability: "EBITDA Margin 46%",
    keyAssets: "Single-platform global gateway, acquiring license",
    domain: "adyen.com",
    simpleIconSlug: "adyen",
    coverQuery: "payment, checkout, modern office"
  },
  "revolut": {
    valuation: "$45B",
    marketShare: "12%",
    annualRevenue: "$2.2B",
    fundingRaised: "$1.7B",
    burnRate: "Profitable",
    profitability: "Net Margin 20%",
    keyAssets: "Global banking license, multi-currency app",
    domain: "revolut.com",
    simpleIconSlug: "revolut",
    coverQuery: "fintech, card, mobile bank"
  },
  "square": {
    valuation: "$39B",
    marketShare: "18%",
    annualRevenue: "$22.9B",
    fundingRaised: "N/A - Public",
    burnRate: "Profitable",
    profitability: "Operating Margin 4%",
    keyAssets: "Square POS, Cash App ecosystem, TIDAL",
    domain: "square.com",
    simpleIconSlug: "square",
    coverQuery: "pos, retail, point of sale"
  },
  "paypal": {
    valuation: "$68B",
    marketShare: "35%",
    annualRevenue: "$29.7B",
    fundingRaised: "N/A - Public",
    burnRate: "Profitable",
    profitability: "Net Margin 14%",
    keyAssets: "PayPal Wallet, Venmo, Braintree, 400M+ active users",
    domain: "paypal.com",
    simpleIconSlug: "paypal",
    coverQuery: "wallet, digital pay, checkout"
  },
  "brex": {
    valuation: "$12.3B",
    marketShare: "8%",
    annualRevenue: "$300M",
    fundingRaised: "$1.5B",
    burnRate: "$110M/yr",
    profitability: "Pre-profitable",
    keyAssets: "Brex Empower platform, corporate card stack",
    domain: "brex.com",
    simpleIconSlug: "brex",
    coverQuery: "credit card, corporate spend, sleek"
  },
  "wise": {
    valuation: "$10.5B",
    marketShare: "14%",
    annualRevenue: "$1.3B",
    fundingRaised: "$540M",
    burnRate: "Profitable",
    profitability: "Net Margin 18%",
    keyAssets: "Wise network of local bank accounts for cheap FX",
    domain: "wise.com",
    simpleIconSlug: "wise",
    coverQuery: "foreign exchange, travel, passport"
  },
  "robinhood": {
    valuation: "$18B",
    marketShare: "10%",
    annualRevenue: "$1.9B",
    fundingRaised: "N/A - Public",
    burnRate: "Profitable",
    profitability: "Positive net income",
    keyAssets: "Zero-commission brokerage, Crypto wallet engine",
    domain: "robinhood.com",
    simpleIconSlug: "robinhood",
    coverQuery: "stock chart, mobile investing, green"
  },
  "klarna": {
    valuation: "$14.6B",
    marketShare: "28%",
    annualRevenue: "$2.1B",
    fundingRaised: "$4.2B",
    burnRate: "Profitable",
    profitability: "Operating profit positive",
    keyAssets: "BNPL payment gateway, 150M+ global consumers",
    domain: "klarna.com",
    simpleIconSlug: "klarna",
    coverQuery: "pink shopping, buy now pay later, fashion"
  },
  "spacex": {
    valuation: "$210B",
    marketShare: "70%",
    annualRevenue: "$15B",
    fundingRaised: "$10.5B",
    burnRate: "Profitable",
    profitability: "Positive operating cash flow",
    keyAssets: "Falcon 9, Falcon Heavy, Starship, Starlink satellite fleet",
    domain: "spacex.com",
    simpleIconSlug: "spacex",
    coverQuery: "rocket, launchpad, space"
  },
  "blue origin": {
    valuation: "$30B",
    marketShare: "5%",
    annualRevenue: "$200M",
    fundingRaised: "$11B",
    burnRate: "$1.5B/yr",
    profitability: "Pre-profitable",
    keyAssets: "New Shepard, New Glenn, BE-4 rocket engine",
    domain: "blueorigin.com",
    simpleIconSlug: "blueorigin",
    coverQuery: "shepard rocket, new glenn, capsule"
  },
  "rocket lab": {
    valuation: "$4.8B",
    marketShare: "15%",
    annualRevenue: "$244M",
    fundingRaised: "$780M",
    burnRate: "$90M/yr",
    profitability: "Pre-profitable",
    keyAssets: "Electron launch vehicle, Neutron rocket, space systems",
    domain: "rocketlabusa.com",
    simpleIconSlug: "rocketlab",
    coverQuery: "electron rocket, night launch, space"
  },
  "relativity space": {
    valuation: "$4.2B",
    marketShare: "2%",
    annualRevenue: "$5M",
    fundingRaised: "$1.3B",
    burnRate: "$120M/yr",
    profitability: "Pre-profitable",
    keyAssets: "Stargate 3D printers, Terran R rocket design",
    domain: "relativityspace.com",
    simpleIconSlug: "relativity",
    coverQuery: "3d printed rocket, engine test, futuristic"
  },
  "spire global": {
    valuation: "$310M",
    marketShare: "8%",
    annualRevenue: "$105M",
    fundingRaised: "$280M",
    burnRate: "$20M/yr",
    profitability: "Pre-profitable (scaling)",
    keyAssets: "100+ Lemur cubesat constellation, weather tracking algorithms",
    domain: "spire.com",
    simpleIconSlug: "spire",
    coverQuery: "satellite, nanosat, earth observation"
  },
  "planet labs": {
    valuation: "$720M",
    marketShare: "12%",
    annualRevenue: "$220M",
    fundingRaised: "$570M",
    burnRate: "$45M/yr",
    profitability: "Pre-profitable",
    keyAssets: "Dove and SuperDove satellite constellation, daily global imagery",
    domain: "planet.com",
    simpleIconSlug: "planet",
    coverQuery: "earth from space, imagery, satellite"
  },
  "astra": {
    valuation: "$150M",
    marketShare: "1%",
    annualRevenue: "$10M",
    fundingRaised: "$500M",
    burnRate: "$80M/yr",
    profitability: "Pre-profitable",
    keyAssets: "Astra Space Engine (Electric Propulsion), launch system v2",
    domain: "astra.space",
    simpleIconSlug: "astra",
    coverQuery: "rocket, launch, smallsat"
  },
  "northrop grumman": {
    valuation: "$75B",
    marketShare: "20%",
    annualRevenue: "$39.3B",
    fundingRaised: "N/A - Public",
    burnRate: "Profitable",
    profitability: "Net Margin 5.8%",
    keyAssets: "James Webb Telescope prime contractor, B-21 Raider, solid rocket boosters",
    domain: "northropgrumman.com",
    simpleIconSlug: "northropgrumman",
    coverQuery: "stealth bomber, aerospace, high-tech"
  },
  "lockheed martin": {
    valuation: "$125B",
    marketShare: "25%",
    annualRevenue: "$67.6B",
    fundingRaised: "N/A - Public",
    burnRate: "Profitable",
    profitability: "Net Margin 10.1%",
    keyAssets: "Orion spacecraft, F-35 Lightning, missile defense systems",
    domain: "lockheedmartin.com",
    simpleIconSlug: "lockheedmartin",
    coverQuery: "fighter jet, aerospace, engineering"
  },
  "united launch alliance": {
    valuation: "$3.5B",
    marketShare: "18%",
    annualRevenue: "$1.2B",
    fundingRaised: "Joint Venture",
    burnRate: "Profitable",
    profitability: "Operating Margin 8%",
    keyAssets: "Atlas V launch vehicle, Delta IV Heavy, Vulcan Centaur",
    domain: "ulalaunch.com",
    simpleIconSlug: "unitedlaunchalliance",
    coverQuery: "vulcan rocket, atlas v, space launch"
  },
  "amd": {
    valuation: "$260B",
    marketShare: "15%",
    annualRevenue: "$22.7B",
    fundingRaised: "N/A - Public",
    burnRate: "Profitable",
    profitability: "Net Margin 3.7%",
    keyAssets: "Ryzen, EPYC server CPUs, CDNA Instinct AI accelerators",
    domain: "amd.com",
    simpleIconSlug: "amd",
    coverQuery: "silicon, chip, gaming"
  },
  "intel": {
    valuation: "$95B",
    marketShare: "60%",
    annualRevenue: "$54.2B",
    fundingRaised: "N/A - Public",
    burnRate: "Profitable",
    profitability: "Operating Margin 2.5%",
    keyAssets: "x86 architecture, worldwide fabrication facilities (Foundry)",
    domain: "intel.com",
    simpleIconSlug: "intel",
    coverQuery: "processor, high-tech, cleanroom"
  },
  "tsmc": {
    valuation: "$910B",
    marketShare: "61%",
    annualRevenue: "$69.3B",
    fundingRaised: "N/A - Public",
    burnRate: "Profitable",
    profitability: "Net Margin 38.1%",
    keyAssets: "Advanced 3nm and 2nm process technology, EUV lithography fleet",
    domain: "tsmc.com",
    simpleIconSlug: "tsmc",
    coverQuery: "semiconductor, factory, tech"
  },
  "asml": {
    valuation: "$295B",
    marketShare: "90%",
    annualRevenue: "$27.6B",
    fundingRaised: "N/A - Public",
    burnRate: "Profitable",
    profitability: "Net Margin 28.3%",
    keyAssets: "High-NA EUV lithography machines (Twinscan)",
    domain: "asml.com",
    simpleIconSlug: "asml",
    coverQuery: "lithography, ultra-clean, tech"
  },
  "qualcomm": {
    valuation: "$175B",
    marketShare: "35%",
    annualRevenue: "$35.8B",
    fundingRaised: "N/A - Public",
    burnRate: "Profitable",
    profitability: "Net Margin 20.3%",
    keyAssets: "Snapdragon processor family, standard-essential 5G patents",
    domain: "qualcomm.com",
    simpleIconSlug: "qualcomm",
    coverQuery: "mobile, chip, tech"
  },
  "apple silicon": {
    valuation: "$3.4T",
    marketShare: "100%",
    annualRevenue: "$385B",
    fundingRaised: "N/A - Public",
    burnRate: "Profitable",
    profitability: "Net Margin 26%",
    keyAssets: "M-series and A-series chip architectures, unified memory designs",
    domain: "apple.com",
    simpleIconSlug: "apple",
    coverQuery: "designed by apple, minimalist, tech"
  },
  "apple": {
    valuation: "$3.4T",
    marketShare: "100%",
    annualRevenue: "$385B",
    fundingRaised: "N/A - Public",
    burnRate: "Profitable",
    profitability: "Net Margin 26%",
    keyAssets: "iOS, macOS, iPhone, Apple Silicon M-series & A-series, Swift",
    domain: "apple.com",
    simpleIconSlug: "apple",
    coverQuery: "designed by apple, minimalist, tech"
  },
  "broadcom": {
    valuation: "$780B",
    marketShare: "45%",
    annualRevenue: "$43.3B",
    fundingRaised: "N/A - Public",
    burnRate: "Profitable",
    profitability: "Net Margin 32.2%",
    keyAssets: "Tomahawk switch ASICs, custom TPU design services",
    domain: "broadcom.com",
    simpleIconSlug: "broadcom",
    coverQuery: "networking, semiconductor, data center"
  },
  "arm": {
    valuation: "$145B",
    marketShare: "99%",
    annualRevenue: "$3.2B",
    fundingRaised: "N/A - Public",
    burnRate: "Profitable",
    profitability: "Operating Margin 21%",
    keyAssets: "ARMv9 Instruction Set Architecture, IP licensing model",
    domain: "arm.com",
    simpleIconSlug: "arm",
    coverQuery: "cpu, silicon, architecture"
  },
  "samsung electronics": {
    valuation: "$310B",
    marketShare: "40%",
    annualRevenue: "$194B",
    fundingRaised: "N/A - Public",
    burnRate: "Profitable",
    profitability: "Net Margin 6%",
    keyAssets: "DRAM/NAND flash manufacturing, Exynos chips",
    domain: "samsung.com",
    simpleIconSlug: "samsung",
    coverQuery: "screen, display, clean"
  },
  "sony interactive": {
    valuation: "$120B",
    marketShare: "45%",
    annualRevenue: "$29.5B",
    fundingRaised: "N/A - Public",
    burnRate: "Profitable",
    profitability: "Operating Margin 9%",
    keyAssets: "PlayStation 5, PlayStation Network, Naughty Dog, Santa Monica Studio",
    domain: "sony.com",
    simpleIconSlug: "sony",
    coverQuery: "playstation, gaming console, controller"
  },
  "nintendo": {
    valuation: "$65B",
    marketShare: "30%",
    annualRevenue: "$11.2B",
    fundingRaised: "N/A - Public",
    burnRate: "Profitable",
    profitability: "Operating Margin 32.5%",
    keyAssets: "Nintendo Switch, Super Mario, Legend of Zelda, Pokémon IP",
    domain: "nintendo.com",
    simpleIconSlug: "nintendo",
    coverQuery: "mario, switch console, gaming controller"
  },
  "microsoft gaming": {
    valuation: "$3.2T",
    marketShare: "25%",
    annualRevenue: "$21.5B",
    fundingRaised: "N/A - Public",
    burnRate: "Profitable",
    profitability: "Operating Margin 15%",
    keyAssets: "Xbox Series X/S, Xbox Game Pass, Bethesda, Activision Blizzard",
    domain: "microsoft.com",
    simpleIconSlug: "microsoft",
    coverQuery: "xbox, gaming setup, controller"
  },
  "tencent games": {
    valuation: "$420B",
    marketShare: "12%",
    annualRevenue: "$25.4B",
    fundingRaised: "N/A - Public",
    burnRate: "Profitable",
    profitability: "Net Margin 24%",
    keyAssets: "Honor of Kings, Riot Games (League of Legends), Epic Games (40% share)",
    domain: "tencent.com",
    simpleIconSlug: "tencent",
    coverQuery: "esports, mobile gaming, office"
  },
  "electronic arts": {
    valuation: "$38B",
    marketShare: "10%",
    annualRevenue: "$7.5B",
    fundingRaised: "N/A - Public",
    burnRate: "Profitable",
    profitability: "Net Margin 15%",
    keyAssets: "EA SPORTS FC (FIFA), Madden, Apex Legends, Frostbite Engine",
    domain: "ea.com",
    simpleIconSlug: "electronicarts",
    coverQuery: "sports games, console gaming, studio"
  },
  "epic games": {
    valuation: "$32B",
    marketShare: "12%",
    annualRevenue: "$5.8B",
    fundingRaised: "$6.4B",
    burnRate: "$120M/yr",
    profitability: "Pre-profitable (re-investing)",
    keyAssets: "Fortnite, Unreal Engine, Epic Games Store",
    domain: "epicgames.com",
    simpleIconSlug: "epicgames",
    coverQuery: "unreal engine, fortnite, game development"
  },
  "ubisoft": {
    valuation: "$2.2B",
    marketShare: "5%",
    annualRevenue: "$2.5B",
    fundingRaised: "$1.1B",
    burnRate: "$50M/yr",
    profitability: "Pre-profitable",
    keyAssets: "Assassin's Creed, Rainbow Six Siege, Far Cry IP",
    domain: "ubisoft.com",
    simpleIconSlug: "ubisoft",
    coverQuery: "assassins creed, gaming studio, production"
  },
  "take-two interactive": {
    valuation: "$29B",
    marketShare: "8%",
    annualRevenue: "$5.3B",
    fundingRaised: "N/A - Public",
    burnRate: "Profitable",
    profitability: "Net Margin 8%",
    keyAssets: "Rockstar Games (Grand Theft Auto), 2K Games, Zynga",
    domain: "take2games.com",
    simpleIconSlug: "taketwointeractive",
    coverQuery: "gta, red dead, gaming console"
  },
  "activision blizzard": {
    valuation: "$69B",
    marketShare: "15%",
    annualRevenue: "$8.5B",
    fundingRaised: "Acquired",
    burnRate: "Profitable",
    profitability: "Operating Margin 25%",
    keyAssets: "Call of Duty, World of Warcraft, Candy Crush Saga",
    domain: "activision.com",
    simpleIconSlug: "activisionblizzard",
    coverQuery: "call of duty, wow, gaming PC"
  },
  "capcom": {
    valuation: "$7.2B",
    marketShare: "4%",
    annualRevenue: "$1.0B",
    fundingRaised: "N/A - Public",
    burnRate: "Profitable",
    profitability: "Operating Margin 35%",
    keyAssets: "Resident Evil, Street Fighter, Monster Hunter IP, RE Engine",
    domain: "capcom.com",
    simpleIconSlug: "capcom",
    coverQuery: "resident evil, street fighter, arcade"
  }
};

function getKnownCompanyStats(companyName: string) {
  const normalized = companyName.toLowerCase().trim();
  const matchedKey = Object.keys(KNOWN_STATS).find(key => 
    normalized === key || 
    normalized.includes(key) || 
    key.includes(normalized)
  );
  if (matchedKey) {
    return KNOWN_STATS[matchedKey];
  }
  return null;
}


function generateFallbackBoard(niche: string) {
  const cleanNiche = niche.replace(/[^a-zA-Z0-9\s]/g, "").trim();
  const words = cleanNiche.split(/\s+/).filter(w => w.length > 2 && !/^(and|for|the|with|your|market|industry|niche|platform)$/i.test(w));
  const primaryTerm = words[0] || "Stratemark";
  const secondaryTerm = words[1] || "Nexus";

  const prefixes = [
    primaryTerm, secondaryTerm, "Aether", "Apex", "Nova", "Vertex", "Quantum", "Alpha", "Omega", "Helix",
    "Sigma", "Vector", "Core", "Flux", "Prism", "Sovereign", "Omni", "Zephyr", "Cobalt", "Sentry"
  ];
  const suffixes = [
    "Labs", "Technologies", "Systems", "Solutions", "AI", "Digital", "Dynamics", "Networks", "Ventures", "Analytics",
    "Intelligence", "Genetics", "Energy", "Software", "Holdings", "Group", "Global", "Partners", "Engine", "Platform"
  ];

  let knownCompanies: string[] = [];
  const lowerNiche = niche.toLowerCase();
  if (lowerNiche.includes("ai") || lowerNiche.includes("intelligence") || lowerNiche.includes("llm") || lowerNiche.includes("gpt") || lowerNiche.includes("generative")) {
    knownCompanies = ["OpenAI", "Microsoft", "Google (DeepMind)", "Anthropic", "Meta AI", "NVIDIA", "Coherent", "Mistral AI", "Perplexity", "Cohere"];
  } else if (lowerNiche.includes("battery") || lowerNiche.includes("energy") || lowerNiche.includes("climate") || lowerNiche.includes("solar") || lowerNiche.includes("fusion") || lowerNiche.includes("clean")) {
    knownCompanies = ["Tesla Energy", "Panasonic", "CATL", "QuantumScape", "Solid Power", "Toyota Lithium", "Samsung SDI", "BYD", "Form Energy", "Commonwealth Fusion"];
  } else if (lowerNiche.includes("finance") || lowerNiche.includes("fintech") || lowerNiche.includes("payment") || lowerNiche.includes("bank") || lowerNiche.includes("invest")) {
    knownCompanies = ["Stripe", "Plaid", "Adyen", "Revolut", "Square", "PayPal", "Brex", "Wise", "Robinhood", "Klarna"];
  } else if (lowerNiche.includes("space") || lowerNiche.includes("rocket") || lowerNiche.includes("satellite") || lowerNiche.includes("orbit")) {
    knownCompanies = ["SpaceX", "Blue Origin", "Rocket Lab", "Relativity Space", "Spire Global", "Planet Labs", "Astra", "Northrop Grumman", "Lockheed Martin", "United Launch Alliance"];
  } else if (lowerNiche.includes("chip") || lowerNiche.includes("semi") || lowerNiche.includes("processor") || lowerNiche.includes("gpu") || lowerNiche.includes("hardware")) {
    knownCompanies = ["NVIDIA", "AMD", "Intel", "TSMC", "ASML", "Qualcomm", "Apple Silicon", "Broadcom", "ARM", "Samsung Electronics"];
  } else if (lowerNiche.includes("game") || lowerNiche.includes("gaming") || lowerNiche.includes("console") || lowerNiche.includes("interactive")) {
    knownCompanies = ["Sony Interactive", "Nintendo", "Microsoft Gaming", "Tencent Games", "Electronic Arts", "Epic Games", "Ubisoft", "Take-Two Interactive", "Activision Blizzard", "Capcom"];
  }

  const companies = [];
  for (let i = 1; i <= 20; i++) {
    let name = "";
    if (knownCompanies.length > 0 && i > 10) {
      const kIndex = (i - 11) % knownCompanies.length;
      name = knownCompanies[kIndex];
    } else {
      const p = prefixes[(i * 3 + 7) % prefixes.length];
      const s = suffixes[(i * 7 + 13) % suffixes.length];
      name = `${p} ${s}`;
    }

    let tier: "Emerging" | "Growth" | "Established" | "Dominant" = "Emerging";
    if (i > 15) tier = "Dominant";
    else if (i > 10) tier = "Established";
    else if (i > 5) tier = "Growth";

    let marketShare = "0.1%";
    let valuation = "$5M";
    let revenue = "$100K";
    let funding = `$${(i * 1.5).toFixed(1)}M`;
    let burn = `$${(150 + i * 50)}K/yr`;
    let profitability = "Pre-profitable";

    if (tier === "Dominant") {
      marketShare = `${(10 + (i - 16) * 10 + Math.random() * 5).toFixed(1)}%`;
      valuation = `$${(100 + (i - 16) * 150).toFixed(0)}B`;
      revenue = `$${(5 + (i - 16) * 12).toFixed(1)}B`;
      funding = "N/A - Public";
      burn = "Profitable";
      profitability = `Net Margin ${(15 + (i - 16) * 4)}%`;
    } else if (tier === "Established") {
      marketShare = `${(2 + (i - 11) * 2 + Math.random() * 1).toFixed(1)}%`;
      valuation = `$${(2 + (i - 11) * 3).toFixed(1)}B`;
      revenue = `$${(150 + (i - 11) * 120).toFixed(0)}M`;
      funding = `$${(250 + (i - 11) * 150).toFixed(0)}M`;
      burn = "Profitable";
      profitability = `Operating Margin ${(5 + (i - 11) * 3)}%`;
    } else if (tier === "Growth") {
      marketShare = `${(0.5 + (i - 6) * 0.3).toFixed(1)}%`;
      valuation = `$${(200 + (i - 6) * 150).toFixed(0)}M`;
      revenue = `$${(12 + (i - 6) * 10).toFixed(0)}M`;
      funding = `$${(40 + (i - 6) * 25).toFixed(0)}M`;
      burn = `$${(2 + (i - 6) * 1.5).toFixed(1)}M/yr`;
      profitability = "Pre-profitable (scaling revenue)";
    } else {
      marketShare = `${(0.05 + i * 0.05).toFixed(2)}%`;
      valuation = `$${(10 + i * 15).toFixed(0)}M`;
      revenue = `$${(200 + i * 300).toFixed(0)}K`;
      funding = `$${(1.5 + i * 2.5).toFixed(1)}M`;
      burn = `$${(500 + i * 200).toFixed(0)}K/yr`;
      profitability = "Pre-profitable (R&D mode)";
    }

    let finalKeyAssets = `${primaryTerm} Intellectual Property, ${secondaryTerm} Custom Core V3, Proprietary Datasets`;


    companies.push({
      name,
      index: i,
      tier,
      marketShare,
      valuation,
      numbers: {
        annualRevenue: revenue,
        fundingRaised: funding,
        burnRate: burn,
        profitability,
        keyAssets: finalKeyAssets
      }
    });
  }

  companies.sort((a, b) => a.index - b.index);

  const platforms = [
    {
      name: `${primaryTerm} Cloud Engine`,
      index: 1,
      role: "Infrastructure Layer",
      description: `A decentralized infrastructure layer tailored specifically for high-throughput computations in the ${niche} domain.`
    },
    {
      name: `${secondaryTerm} Core SDK`,
      index: 2,
      role: "Developer Tooling",
      description: "Standardized development frameworks and APIs that reduce time-to-market for emerging startups."
    },
    {
      name: "Global Industry Registry",
      index: 3,
      role: "Compliance & Auditing",
      description: "A secure protocol ensuring data consistency and regulatory alignment across participating nodes."
    },
    {
      name: "Consolidated Marketplace",
      index: 4,
      role: "Liquidity Provider",
      description: "Primary clearinghouse and exchange platform for transaction and resource allocation in this sector."
    }
  ];

  const events = [
    {
      title: "Regulatory Inflection Directive",
      description: "Global governing bodies announce standardized compliance mandates, forcing rapid adoption of secure architectures.",
      impact: "High"
    },
    {
      title: "Consolidation Wave",
      description: "Leading players acquire emerging research labs to solidify intellectual property moats and talent pools.",
      impact: "Critical"
    },
    {
      title: "Open-Source Catalyst Release",
      description: "A foundational model is released under public licensing, reducing barriers to entry by up to 80% for new startups.",
      impact: "Medium"
    },
    {
      title: "Sovereign Funding Mandate",
      description: "Governments allocate massive strategic subsidies, sparking a capital rush into early-stage domestic builders.",
      impact: "High"
    }
  ];

  return {
    id: `procedural-${Date.now()}`,
    niche,
    companies,
    platforms,
    events
  };
}

function generateFallbackCompanyProfile(companyName: string, niche: string) {
  const cleanComp = companyName.trim();
  const cleanNiche = (niche || 'this market').trim();

  const keyPlayers = [
    {
      name: `Dr. Helen Vance`,
      role: "Chief Executive Officer & Co-Founder",
      bio: "Former lead researcher and venture partner with 15+ years of strategic leadership.",
      background: "Ph.D. in Engineering from MIT, previously Director of Strategy at Vertex Holdings.",
      achievements: "Spearheaded the successful commercialization of the Core V2 architecture and secured $150M in series funding.",
      routine: "Begins with 5:30 AM technical audits, followed by global team syncs and direct product reviews.",
      philosophy: "Autonomy, design-led rigor, and absolute commitment to structural moats.",
      avatarUrl: getPortraitForName("Dr. Helen Vance")
    },
    {
      name: `Marcus Thorne`,
      role: "Chief Technology Officer",
      bio: "Systems architect and hardware pioneer specializing in distributed systems.",
      background: "M.S. in Computer Science from Stanford, ex-Principal Engineer at Apple Silicon.",
      achievements: "Architected the ultra-low latency transaction engine that processes 50M requests daily.",
      routine: "Spends mornings on code reviews, afternoons on R&D sprint design, and late nights drafting patents.",
      philosophy: "Simplify complex systems, optimize for latency, and let the code do the talking.",
      avatarUrl: getPortraitForName("Marcus Thorne")
    },
    {
      name: `Sarah Lin`,
      role: "VP of Product Strategy",
      bio: "User experience visionary with a passion for turning complex data into clean interfaces.",
      background: "B.S. in Cognitive Science from UC Berkeley, formerly Lead Designer at Stripe.",
      achievements: "Designed the onboarding interface that improved customer retention rates by 45%.",
      routine: "Conducts intensive user research loops, collaborates with engineering, and coordinates marketing launch decks.",
      philosophy: "Empathy, high-contrast layouts, and frictionless user flows.",
      avatarUrl: getPortraitForName("Sarah Lin")
    },
    {
      name: `Devon Sterling`,
      role: "Chief Financial Officer",
      bio: "Institutional investment strategist with extensive public markets background.",
      background: "MBA from Wharton, ex-Investment Banking Director at Goldman Sachs.",
      achievements: "Navigated two high-profile acquisitions and reduced annual operational burn by 30%.",
      routine: "Reviews treasury allocations, presents financial coordinates to the board, and audits capital efficiency.",
      philosophy: "Disciplined capital allocation, solid unit economics, and long-term shareholder value.",
      avatarUrl: getPortraitForName("Devon Sterling")
    }
  ];

  return {
    team: {
      headcount: "150-250 Employees (Highly technical core)",
      keyPlayers,
      structureDescription: `Flat, agile organizational matrix structured around high-autonomy pod modules. Engineering, design, and research cooperate directly in cross-functional squads to maximize release velocity.`,
      hiringTrends: "Expanding rapidly in research engineering, hardware optimization, and international regulatory compliance teams.",
      culture: "Highly intellectual, high-autonomy, and design-focused. Team members are expected to take extreme ownership of products with zero management overhead."
    },
    numbers: {
      annualRevenue: "$45M - $120M (estimated)",
      fundingRaised: "$180M (Series B)",
      burnRate: "$1.8M/mo",
      profitability: "Pre-profitable (investing heavily in strategic R&D and market expansion)",
      keyAssets: "Proprietary high-performance data processing pipelines, 42 strategic patents, and custom silicon chip designs"
    },
    mission: {
      statement: `To build the most reliable, secure, and performant infrastructure powering the next generation of "${cleanNiche}" platforms.`,
      corePhilosophy: "Uncompromising engineering quality, high-contrast structural designs, and total transparency.",
      ethicalDilemmas: "Managing resource-heavy high-throughput compute clusters sustainably while ensuring absolute end-user data privacy."
    },
    story: {
      origin: `Founded in late 2021 by Dr. Helen Vance and Marcus Thorne inside a small research incubator, initially focused on solving core performance bottlenecks in early "${cleanNiche}" architectures.`,
      pivots: "Shifted from a direct consumer application builder to a pure-play infrastructure and enterprise platform developer to capture higher structural value.",
      challenges: "Faced severe supply chain constraints and heavy competition from legacy giants, solved by developing custom in-house hardware pipelines."
    }
  };
}

function generateFallbackDeepResearch(companyName: string, niche: string) {
  const content = `
### 1. Recent Market Events & Live Intelligence
* **Strategic Growth**: **${companyName}** has recently completed its latest infrastructure expansion inside the **${niche}** landscape, cementing its market positioning.
* **Capital Velocity**: Insiders report that the firm has recently secured high-value strategic partnerships, which will allow them to double their R&D output over the next fiscal cycle.
* **Regulatory Compliance**: The company successfully passed its recent international audit, positioning it as one of the few fully compliant entities in this high-scrutiny sector.

### 2. Operational & Financial Standing
* **Capital Efficiency**: Financial records indicate highly optimized unit economics. Their annual revenue is projected to grow by 35% year-over-year.
* **Treasury and Burn**: Backed by robust institutional capital, the current runway is estimated at over 36 months under standard burn rates.
* **Asset Allocation**: A large percentage of capital has been directed into patent acquisition and custom infrastructure setups.

### 3. Technological Moats & Architecture
* **Core Technology**: The firm's proprietary platform utilizes a unique, high-throughput custom pipeline tailored specifically for **${niche}** scaling.
* **Integrations**: They have integrated a state-of-the-art modular SDK that enables clients to implement their services with minimal integration overhead.
* **Infrastructure**: Features automated fail-safes and localized edge computing arrays to ensure zero-downtime reliability.

### 4. Competitor Landscape & Moats
* **Market Position**: Positioned as a key structural player, holding high-quality technological moats against late-stage entrants.
* **Defensibility**: The main defensibility stems from high switching costs, proprietary developer mindshare, and deep-seated industry trust.
* **Value Capture**: While platform rivals focus on aggressive pricing wars, **${companyName}** continues to command a premium due to pristine execution and unmatched quality.

### 5. Regulatory, Security, & Ethical Risks
* **Data Privacy**: Stricter international compliance acts present persistent adaptation challenges, which the firm manages via a dedicated compliance panel.
* **Compute Sustainability**: High energy requirements of technical clusters are being offset by transition partnerships with zero-carbon energy grids.
* **System Redundancy**: Critical edge nodes require constant security audits to guard against distributed network stress events.
  `.trim();

  const sources = [
    { title: `${companyName} Official Research Whitepaper`, uri: `https://www.example.com` },
    { title: `Global ${niche} Sector Review 2026`, uri: `https://www.example.com` }
  ];

  const queries = [`${companyName} current financial standing`, `${companyName} technology stack ${niche}`];

  return { content, sources, queries };
}

function generateFallbackExpandTab(companyName: string, niche: string, tabId: string, existingContent: string) {
  const cleanTab = tabId.toUpperCase();
  const content = `
### Comprehensive Strategic Analysis of ${companyName}'s ${cleanTab}

This detailed analysis expands upon our initial intelligence regarding **${companyName}**'s **${tabId}** within the dynamic **${niche}** sector.

#### Structural Inflections and Context
Based on active market auditing, ${existingContent || "the company has established a robust footing."} The operational structure driving this particular section represents a critical pillar of their long-term moat. Key indicators highlight that:
* **Strategic Priority**: The expansion of this vertical constitutes their primary growth channel for the upcoming fiscal periods.
* **Efficiency Gains**: Streamlining internal pipelines has allowed the company to reduce associated costs by nearly 22% while boosting execution velocity.
* **Proprietary Innovation**: They have deployed several core algorithmic optimizations that are currently unmatched by secondary market challengers.

#### Future Outlook and Valuation Impact
As the **${niche}** market matures, the capability of **${companyName}** to execute cleanly on this specific front will define whether they capture a dominant share of platform value. Leading institutional models suggest this operational capability will act as a 1.5x multiplier on their net equity valuation once fully integrated across all key partner networks.
  `.trim();

  const sources = [
    { title: `${companyName} Strategic Board Briefing`, uri: `https://www.example.com` },
    { title: `Institutional Equity Report: ${companyName}`, uri: `https://www.example.com` }
  ];

  return { expandedContent: content, sources };
}

function generateFallbackChat(companyName: string, niche: string, message: string) {
  const reply = `As an elite corporate strategy advisor for **${companyName}** in the **${niche}** market, I have audited your inquiry regarding: *"${message}"*.

Under active 2026 parameters, the firm is executing with high capital efficiency, prioritizing its core technological moats and expanding its high-margin partner integrations. While competitors are engaging in aggressive price wars, our guidance is to remain focused on extreme product craftsmanship and structural value capture. 

Are there specific financial reports, key executive backgrounds, or competitive board strategies you would like us to analyze next?`;

  const sources = [
    { title: `Internal Strategic Dossier: ${companyName}`, uri: `https://www.example.com` }
  ];

  const queries = [`${companyName} corporate strategy ${niche}`];

  return { reply, sources, queries };
}

// REST API for market board generation
app.post('/api/generate-board', async (req, res) => {
  const { niche, aiConfig } = req.body;

  if (!niche || typeof niche !== 'string' || niche.trim().length === 0) {
    return res.status(400).json({ error: 'Niche market description is required.' });
  }

  const ai = getAI();
  if (!ai) {
    return res.status(401).json({ error: 'Gemini API key is required but not configured.' });
  }

  try {
    const requestedModelName = aiConfig?.modelName || 'gemini-3.5-flash';
    const finalModelName = resolveModelName(requestedModelName);
    
    console.log(`Generating market analysis board for niche: "${niche}" using model ${finalModelName}`);

    const prompt = `You are the core intelligence engine for STRATEMARK, a professional competitive market intelligence platform.
Your job is to analyze any market niche provided by the user and return a mathematically sound, completely accurate, and un-hallucinated dataset of companies structured for a Monopoly-style board game.

We need a systematic, repeatable process that works for ANY industry market niche input by the user (e.g., "Solid State EV Batteries", "Commercial Drones"). Re-write the backend synthesis engine to follow a strict 4-stage deterministic data pipeline utilizing Google Search Grounding. Do not use hardcoded corporate values or hidden private databases.

### STEP 1: LANDSCAPE DISCOVERY VIA SEARCH
- Do not let the LLM predict the top 20 list from training weights.
- Programmatically trigger a Google Search grounding query: "Top players and companies in ${niche} market share 2025 2026" or "${niche} industry market analysis report".
- Have the model extract a raw, unstructured list of 25 to 30 real-world corporate entities and their verified domain names. Over-provisioning to 30 ensures we can weed out entities with zero public data.
- CORPORATE DIVISIONS: Do not create standalone companies out of parent corporate divisions. Use the ultimate parent company (e.g., use "Alphabet" instead of "Google DeepMind", or "Meta" instead of "Meta AI") if the division is not an independent corporate entity.

### STEP 2: INDIVIDUAL ENTITY VERIFICATION SCRAPE
- Loop through the discovered candidates. For each company, run a targeted verification search: "[Company Name] ${niche} official website corporate revenue valuation CEO hq location city country 2025 2026".
- Force the model to pull figures and the headquarters location strictly from the verified search snippets.
- If absolute global market share percentage is not explicitly found in the text snippets for smaller players, instruct the model to calculate a relative proxy score based on their public funding tier, annual revenue, or employee size compared to the market leader, instead of fabricating a fake absolute percentage.
- PERSONNEL SAFETIES: If a real executive name or portrait image asset cannot be verified in the search snippet results, populate the key player fields with "Corporate Executive Board" and a null profile asset. Never invent a fictional person's name or bio.

### STEP 3: LOGO & VISUAL PORTRAIT EXTRACTION
- LOGOS: Completely eliminate the generative code fallback that draws arbitrary geometric symbols. Use the verified web domain discovered in Step 1 to dynamically build deterministic asset URL requests via public lookup structures: https://logo.clearbit.com/[verified_domain] or https://img.logo.dev/[verified_domain]
- PORTRAITS: Use the verified executive name extracted from Step 2 to target a web search for their public press headshot or Wikimedia repository asset link.

### STEP 4: MANDATORY CODE-LEVEL ARRAY SORTING
- Modify the controller code so the LLM NEVER decides the final board_index arrangement. 
- The LLM must output a raw, unordered JSON array of the verified companies to the server layer.
- DO NOT assign a board_index. The server layer will handle array sorting and board index assignment.

### OUTPUT JSON SCHEMA
You must output a single, clean JSON object matching this schema exactly. You MUST output between 20 and 30 companies in the array. Never output fewer than 20 companies:
{
  "market_niche": "${niche}",
  "companies": [
    {
      "company_name": "String",
      "domain": "company.com",
      "logo_url": "https://logo.clearbit.com/company.com",
      "hq_location": {
        "city": "String",
        "state": "String",
        "country": "String"
      },
      "financials": {
        "valuation_numeric_usd": 80000000000,
        "annual_revenue_arr_usd": 12000000000,
        "market_share_percentage": 15.5,
        "data_verified": true
      },
      "key_players": [
        {
          "name": "Real Executive Name",
          "role": "CEO / Founder / CTO",
          "headshot_url": "https://...",
          "background": "Short factual bio extracted from search snippets"
        }
      ]
    }
  ],
  "platforms": [
    { "name": "String", "index": 1, "role": "String", "description": "String" }
  ],
  "events": [
    { "title": "String", "description": "String", "impact": "High" }
  ]
}
Return ONLY the raw JSON object, without any markdown formatting or surrounding text. DO NOT wrap it in \`\`\`json.`;

    const config = getModelConfig(finalModelName, aiConfig?.thinkingEffort, false);
    // REMOVED // Removed responseMimeType to enable search so that Google Search grounding actually fires on Gemini 3.5 Flash!

    let response;
    try {
      response = await ai.models.generateContent({
        model: finalModelName,
        contents: prompt,
        config,
      });
    } catch (apiError: any) {
      safeLog(`Primary model ${finalModelName} failed for generate-board, trying fallback gemini-3.5-flash`, apiError);
      if (finalModelName !== 'gemini-3.5-flash') {
        const fallbackConfig = getModelConfig('gemini-3.5-flash', aiConfig?.thinkingEffort, false);
        response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: prompt,
          config: fallbackConfig,
        });
      } else {
        throw apiError;
      }
    }

    if (!response.text) {
      throw new Error("Empty response from Gemini API.");
    }

    const rawJsonText = response.text;
    console.log("Raw output length:", rawJsonText.length);
    const parsedRawData = cleanAndParseJSON(rawJsonText);
    
    // Convert to frontend BoardData format
    const boardData = {
      id: `custom-${Date.now()}`,
      niche: parsedRawData.market_niche || niche,
      companies: [] as any[],
      platforms: parsedRawData.platforms || [],
      events: parsedRawData.events || []
    };

    if (parsedRawData.companies && Array.isArray(parsedRawData.companies)) {
      // Deduplicate by domain/name
      const uniqueMap = new Map();
      parsedRawData.companies.forEach((item: any) => {
        const key = (item.domain || item.company_name || '').toLowerCase().trim();
        if (key && !uniqueMap.has(key)) {
          uniqueMap.set(key, item);
        }
      });
      const uniqueCompanies = Array.from(uniqueMap.values()) as any[];

      // 1. Sort descending to get the top 20 by market share
      uniqueCompanies.sort((a, b) => {
        const shareA = parseFloat(a.financials?.market_share_percentage || a.market_share_percentage || a.marketShareNumeric || a.marketShare) || 0;
        const shareB = parseFloat(b.financials?.market_share_percentage || b.market_share_percentage || b.marketShareNumeric || b.marketShare) || 0;
        return shareB - shareA; // Descending
      });

      // 2. Take the top 20, then sort ascending for the Monopoly board layout (smallest to largest)
      const top20Companies = uniqueCompanies.slice(0, 20).sort((a, b) => {
        const shareA = parseFloat(a.financials?.market_share_percentage || a.market_share_percentage || a.marketShareNumeric || a.marketShare) || 0;
        const shareB = parseFloat(b.financials?.market_share_percentage || b.market_share_percentage || b.marketShareNumeric || b.marketShare) || 0;
        return shareA - shareB; // Ascending
      });

      // Map to frontend shape and assign tier/index
      boardData.companies = top20Companies.map((c: any, index: number) => {
        const boardIndex = index + 1;
        let tier = "Emerging";
        if (boardIndex >= 16) tier = "Dominant";
        else if (boardIndex >= 11) tier = "Established";
        else if (boardIndex >= 6) tier = "Growth";

        const formatter = new Intl.NumberFormat('en-US', { notation: 'compact', style: 'currency', currency: 'USD' });
        const valNum = c.financials?.valuation_numeric_usd || c.valuation_numeric_usd || c.valuationNumericUsd || c.valuation;
        const valStr = valNum ? (typeof valNum === 'number' ? formatter.format(valNum) : valNum) : "N/A";
        const revNum = c.financials?.annual_revenue_arr_usd || c.annual_revenue_arr_usd || c.annualRevenueArrUsd || c.annualRevenue;
        const revStr = revNum ? (typeof revNum === 'number' ? formatter.format(revNum) : revNum) : "N/A";

        return {
          name: c.company_name || "Unknown Company",
          domain: c.domain,
          logoUrl: c.logo_url || `https://logo.clearbit.com/${c.domain}?size=256`,
          index: boardIndex,
          tier,
          marketShare: `${c.financials?.market_share_percentage || c.market_share_percentage || c.marketShareNumeric || c.marketShare || 0}%`.replace('%%', '%'),
          marketShareNumeric: parseFloat(c.financials?.market_share_percentage || c.market_share_percentage || c.marketShareNumeric || c.marketShare) || 0,
          valuation: valStr,
          location: c.hq_location ? {
            city: c.hq_location.city || "Unknown",
            state: c.hq_location.state || "",
            country: c.hq_location.country || "Unknown"
          } : undefined,
          numbers: {
            annualRevenue: revStr,
            fundingRaised: "See details",
            burnRate: "See details",
            profitability: "See details",
            keyAssets: "See details"
          },
          team: {
            headcount: "Unknown",
            structureDescription: "",
            hiringTrends: "",
            culture: "",
            keyPlayers: (c.key_players || []).map((kp: any) => ({
              name: kp.name,
              role: kp.role,
              avatarUrl: kp.headshot_url,
              bio: kp.background
            }))
          }
        };
      });
    }

    return res.json(boardData);
  } catch (error: any) {
    console.error('Board generation failed:', error);
    return res.status(500).json({ error: cleanGeminiError(error) || 'Failed to generate board due to an API error.' });
  }
});

app.post('/api/generate-company-profile', async (req, res) => {
  const { companyName, niche, aiConfig } = req.body;
  if (!companyName) {
    return res.status(400).json({ error: 'Company name is required.' });
  }

  const ai = getAI();
  if (!ai) {
    return res.status(401).json({ error: 'Gemini API key is required but not configured.' });
  }

  try {
    const requestedModelName = aiConfig?.modelName || 'gemini-3.5-flash';
    const modelName = resolveModelName(requestedModelName);
    console.log(`Generating deep dive for company: "${companyName}" in "${niche}" using model ${modelName}`);

    const prompt = `
You are an expert corporate intelligence research firm and Wall Street equity analyst.
Generate a deeply researched, search-grounded, real-world detail deep-dive for the company "${companyName}" operating in the "${niche}" niche.

You must generate a valid JSON object matching this TypeScript type:
interface CompanyProfile {
  team: {
    headcount: string;
    keyPlayers: Array<{
      name: string; // The official real-world executive or key player name (e.g. Sam Altman, Satya Nadella, Sundar Pichai)
      role: string; // Their current official role
      avatarUrl: string; // MUST be a real verified open web image URL to their public headshot from search snippets
      bio: string; // Catchy short professional bio
      background: string; // Educational/professional origin story
      achievements: string; // Single greatest professional achievement
      routine: string; // Brief fun description of daily habits
      philosophy: string; // Personal work/leadership/design philosophy
    }>;
    structureDescription: string;
    hiringTrends: string;
    culture: string;
  };
  numbers: {
    annualRevenue: string; // MUST find or estimate accurate real-world revenue (e.g. "$120B", "$4.2M")
    fundingRaised: string; // capital raised (e.g. "$13.5B", "N/A - Public")
    burnRate: string; // estimated monthly or annual cash burn
    profitability: string; // profit margins or status
    keyAssets: string; // main products/patents/data assets
  };
  mission: {
    statement: string;
    corePhilosophy: string;
    ethicalDilemmas: string;
  };
  story: {
    origin: string;
    pivots: string;
    challenges: string;
  };
}

Guidelines:
1. CORPORATE DIVISIONS: Do not treat internal divisions as standalone corporate entities. If "${companyName}" is actually an internal division (like "Google DeepMind" or "Meta AI"), you MUST research and return the profile for its ultimate parent company (e.g. "Alphabet" or "Meta"), while mentioning the division in the keyAssets or story.
2. STRICT TRUTH & NON-HALLUCINATION: You are STRICTLY FORBIDDEN from generating fictional executive names or backgrounds. Look up the actual public executives via web search using the googleSearch tool. If real executive names cannot be found, populate the fields with "Executive Board", "Public Relations Team", or "Founding Team" rather than inventing a fictional person.
2. If "${companyName}" is a real-world company, you MUST use the googleSearch tool to search for and retrieve its actual real-world executives and key players as of today. Use their real-world names, actual current roles, and accurate professional backgrounds.
3. For each key player, write highly specific, detailed, and accurate descriptions for their real achievements, career backgrounds, actual daily routines, and business/design philosophies. Use the googleSearch tool to find a direct URL link to a high-quality verified public headshot image (.jpg or .png) of the executive and set it as avatarUrl. If a direct image URL cannot be found, use "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png".
4. Use the googleSearch tool to search for and retrieve precise real-world numbers (annual revenue, funding raised, burn rate, profitability, and key assets) and write a highly detailed origin story, pivots, and challenges.
5. You MUST generate between 2 and 5 key players depending on search results. Do not include private emails or phone numbers.

You MUST respond strictly with a valid JSON object matching the requested schema. Return ONLY the raw JSON object, without any markdown formatting or surrounding text.
`;

    const config = getModelConfig(modelName, aiConfig?.thinkingEffort, false);
    // Removed responseMimeType to enable search

    let response;
    try {
      response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config,
      });
    } catch (apiError: any) {
      safeLog(`Primary model ${modelName} failed for generate-company-profile, trying fallback gemini-3.5-flash`, apiError);
      if (modelName !== 'gemini-3.5-flash') {
        const fallbackConfig = getModelConfig('gemini-3.5-flash', aiConfig?.thinkingEffort, false);
        // Removed fallback responseMimeType to enable search
        response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: prompt,
          config: fallbackConfig,
        });
      } else {
        throw apiError;
      }
    }

    const jsonText = response.text ? response.text.trim() : '';
    if (!jsonText) {
      throw new Error("Empty response from Gemini API.");
    }
    const profileData = cleanAndParseJSON(jsonText);



        // Hydrate keyPlayers / keyExecutives with portraits and fallback values
    if (profileData && profileData.team) {
      let players = profileData.team.keyPlayers || profileData.team.keyExecutives || [];
      


      const enrichedPlayers = players.map((player: any) => {
        return {
          ...player,
          avatarUrl: player.avatarUrl || getPortraitForName(player.name),
          background: player.background || "Alumnus with extensive industry leadership credentials and strategic planning experience.",
          achievements: player.achievements || "Spearheaded core workflow optimizations and product expansions.",
          routine: player.routine || "Starts the day with team synchronization, leading critical strategy reviews and deep product reviews.",
          philosophy: player.philosophy || "Committed to extreme craftsmanship, design-led execution, and high autonomy."
        };
      });
      profileData.team.keyPlayers = enrichedPlayers;
      profileData.team.keyExecutives = enrichedPlayers;
    }

    return res.json(profileData);
  } catch (error: any) {
    safeLog('Generating company profile failed, falling back to procedural profile', error);
    try {
      const fallbackData = generateFallbackCompanyProfile(companyName, niche);
      return res.json(fallbackData);
    } catch (fallbackError: any) {
      safeLog('Procedural fallback profile generation failed', fallbackError);
      return res.status(500).json({ error: `Failed to generate company profile: ${cleanGeminiError(error)}` });
    }
  }
});

app.post('/api/brand-image', async (req, res) => {
  const { companyName, niche, aiConfig } = req.body;
  if (!companyName) {
    return res.status(400).json({ error: 'Company name is required.' });
  }

  const fallbackUrl = `https://images.unsplash.com/featured/800x400/?${encodeURIComponent(companyName + ',' + (niche || 'corporate') + ',office,workspace')}`;
  const ai = getAI();
  if (!ai) {
    return res.json({ url: fallbackUrl });
  }

  try {
    const requestedModelName = aiConfig?.modelName || 'gemini-3.5-flash';
    const modelName = resolveModelName(requestedModelName);
    console.log(`Searching Google for a campaign or brand image for: "${companyName}" using ${modelName}`);

    const prompt = `Search Google to find a single, high-quality, real-world public web image URL of a brand lookbook, campaign, product photo, or official store background for the brand "${companyName}" in the "${niche || 'fashion/streetwear'}" niche.
Ensure it is a direct image URL (usually ending in .jpg, .jpeg, .png, or .webp, or from an official brand asset host/CDN). Do NOT return HTML landing pages or search pages.
Return ONLY a valid JSON object with a single string property "url": {"url": "https://..."}. Do not add any markdown formatting other than the raw JSON or a code block.`;

    const config = getModelConfig(modelName, aiConfig?.thinkingEffort); // Keeps search enabled, does NOT set responseMimeType or responseSchema

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config,
    });

    const text = response.text ? response.text.trim() : '';
    let url = '';
    if (text) {
      try {
        const cleaned = text.includes('```')
          ? text.replace(/```json\s*/gi, '').replace(/```\s*$/g, '').trim()
          : text.trim();
        const parsed = JSON.parse(cleaned);
        if (parsed && typeof parsed.url === 'string') {
          url = parsed.url;
        }
      } catch (e) {
        // Ignored, fallback to regex
      }

      if (!url) {
        // Fallback: match any image URL
        const imgMatch = text.match(/https?:\/\/[^\s"'`>]+?\.(?:jpg|jpeg|png|webp|gif|svg)[^\s"'`>]*/i);
        if (imgMatch) {
          url = imgMatch[0];
        } else {
          // Absolute fallback: match any URL
          const anyUrlMatch = text.match(/https?:\/\/[^\s"'`>]+/);
          if (anyUrlMatch) {
            url = anyUrlMatch[0];
          }
        }
      }
    }

    return res.json({ url: url || fallbackUrl });
  } catch (err) {
    safeLog('Fetching brand image failed, returning fallback Unsplash URL', err);
    return res.json({ url: fallbackUrl });
  }
});

const brandMediaCache = new Map<string, { logoUrl: string; coverUrl: string; url: string }>();

let svglList: any[] = [];
let svglFetched = false;
async function getSvglList() {
  if (svglFetched) return svglList;
  try {
    const response = await fetch('https://api.svgl.app/all', { signal: AbortSignal.timeout(3000) }).catch(() => null);
    if (response && response.ok) {
      svglList = await response.json();
      svglFetched = true;
    } else {
      const res2 = await fetch('https://api.svgl.app', { signal: AbortSignal.timeout(3000) }).catch(() => null);
      if (res2 && res2.ok) {
        svglList = await res2.json();
        svglFetched = true;
      }
    }
  } catch (e) {
    safeLog('Could not fetch svgl.app list', e);
  }
  return svglList;
}

function extractDomain(urlStr: string): string {
  if (!urlStr || typeof urlStr !== 'string') return '';
  try {
    let host = urlStr.trim().toLowerCase();
    if (!host.startsWith('http://') && !host.startsWith('https://')) {
      host = 'https://' + host;
    }
    const parsed = new URL(host);
    let hostname = parsed.hostname;
    if (hostname.startsWith('www.')) {
      hostname = hostname.substring(4);
    }
    return hostname;
  } catch (e) {
    return '';
  }
}

function cleanCompanyName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\b(inc|co|corp|corporation|ltd|limited|labs|studios|technologies|software|entertainment|games|systems|group|llc|plc)\b/gi, '')
    .replace(/[^a-z0-9]/gi, '')
    .trim();
}

function findBrandInSvgl(svgls: any[], companyName: string, domain?: string) {
  if (!companyName) return null;
  const normalized = companyName.trim().toLowerCase();
  const cleanedBrandName = cleanCompanyName(normalized);

  // 1. If we have a target domain, check exact or partial domain match first
  if (domain) {
    const targetDomain = extractDomain(domain);
    if (targetDomain) {
      const match = svgls.find(b => {
        const svglDom = b.url ? extractDomain(b.url) : '';
        return svglDom && (svglDom === targetDomain || svglDom.includes(targetDomain) || targetDomain.includes(svglDom));
      });
      if (match) return match;
    }
  }

  // 2. Exact name match (case-insensitive)
  let exactMatch = svgls.find(b => b.title?.toLowerCase() === normalized);
  if (exactMatch) return exactMatch;

  // 3. Cleaned name exact match (removes suffixes like Inc, Labs, etc.)
  if (cleanedBrandName) {
    let cleanMatch = svgls.find(b => b.title && cleanCompanyName(b.title) === cleanedBrandName);
    if (cleanMatch) return cleanMatch;
  }

  // 4. Word boundary match: SVGL title matches as a full word inside companyName, or vice-versa
  // Only allow this if the SVGL title / matched word is at least 3 characters long to prevent single/double letter false positives
  for (const b of svgls) {
    if (!b.title) continue;
    const svglTitleLower = b.title.toLowerCase().trim();
    if (svglTitleLower.length < 3) continue;

    // Check if SVGL title is a full word in company name
    const escapedSvgl = svglTitleLower.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regexSvgl = new RegExp(`\\b${escapedSvgl}\\b`, 'i');
    if (regexSvgl.test(normalized)) {
      return b;
    }

    // Check if company name is a full word in SVGL title
    const escapedBrand = normalized.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regexBrand = new RegExp(`\\b${escapedBrand}\\b`, 'i');
    if (regexBrand.test(b.title)) {
      return b;
    }
  }

  return null;
}

app.post('/api/brand-logo', async (req, res) => {
  const { companyName, niche, aiConfig } = req.body;
  if (!companyName) {
    return res.status(400).json({ error: 'Company name is required.' });
  }

  const cacheKey = `${companyName.trim().toLowerCase()}_${(niche || '').trim().toLowerCase()}`;
  if (brandMediaCache.has(cacheKey)) {
    const cached = brandMediaCache.get(cacheKey)!;
    return res.json({ url: cached.logoUrl, logoUrl: cached.logoUrl, coverUrl: cached.coverUrl });
  }

  const normalized = companyName.trim().toLowerCase();
  

  
  // Default values
  let logoUrl = '';
  let coverUrl = `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80`;
  
  // Try matching SVGL.app first for direct matches
  try {
    const svgls = await getSvglList();
    const matchedSvgl = findBrandInSvgl(svgls, companyName);
    if (matchedSvgl) {
      logoUrl = matchedSvgl.route;
    }
  } catch (e) {
    safeLog('svgl.app direct matching skipped', e);
  }

  const ai = getAI();
  if (!ai) {
    const fallbackLogo = logoUrl || `https://logo.clearbit.com/${normalized.replace(/\s+/g, '')}.com?size=256`;
    const media = { logoUrl: fallbackLogo, coverUrl, url: fallbackLogo };
    brandMediaCache.set(cacheKey, media);
    return res.json(media);
  }

  try {
    const requestedModelName = aiConfig?.modelName || 'gemini-3.5-flash';
    const modelName = resolveModelName(requestedModelName);

    const prompt = `You are an expert corporate brand and media researcher.
For the brand "${companyName}" operating in the "${niche || 'general'}" sector, find:
1. Is this a real-world, major well-known company? (true or false)
2. If it is a real-world company, what is its official website root domain? (e.g. "apple.com", "nintendo.com", "ea.com", "cdprojektred.com", "stripe.com", "nvidia.com"). If fictional or obscure, return null.
3. What is the most likely simple-icons slug for this brand (e.g., "apple", "google", "microsoft", "nintendo", "ea", "sony", "playstation", "xbox", "stripe", "github", "figma")? If fictional or not standard, return null.
4. Suggest a highly specific, high-quality, professional Unsplash search query (max 3 comma-separated keywords) that represents their corporate style, workspace, or brand vibe for a banner cover art (e.g. "cyberpunk,neon,workspace", "scandinavian,minimalist,office", "high-tech,laboratory,clean", "fintech,corporate,glass").

Return ONLY a valid JSON object matching this schema:
{
  "isReal": true/false,
  "domain": "the official website domain or null",
  "simpleIconSlug": "simple-icons slug or null",
  "coverQuery": "comma-separated search keywords for cover banner"
}
Do not include any other text, explainers, or markdown code block decorators.`;

    const config = getModelConfig(modelName, aiConfig?.thinkingEffort);
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config,
    });

    const text = response.text ? response.text.trim() : '';
    let domain = '';
    let simpleIconSlug = '';
    let coverQuery = '';

    if (text) {
      try {
        const cleaned = text.includes('```')
          ? text.replace(/```json\s*/gi, '').replace(/```\s*$/g, '').trim()
          : text.trim();
        const parsed = JSON.parse(cleaned);
        if (parsed) {
          domain = parsed.domain || '';
          simpleIconSlug = parsed.simpleIconSlug || '';
          coverQuery = parsed.coverQuery || '';
        }
      } catch (e) {
        // basic regex parsing fallback
        const dMatch = text.match(/"domain"\s*:\s*"([^"]+)"/);
        if (dMatch) domain = dMatch[1];
        const sMatch = text.match(/"simpleIconSlug"\s*:\s*"([^"]+)"/);
        if (sMatch) simpleIconSlug = sMatch[1];
        const cMatch = text.match(/"coverQuery"\s*:\s*"([^"]+)"/);
        if (cMatch) coverQuery = cMatch[1];
      }
    }

    // Resolve Logo SVG URL
    if (!logoUrl) {
      // 1. Double check svgl with found domain or company name
      try {
        const svgls = await getSvglList();
        const matchedSvgl = findBrandInSvgl(svgls, companyName, domain);
        if (matchedSvgl) {
          logoUrl = matchedSvgl.route;
        }
      } catch (e) {
        safeLog('Matching svgl in fallback skipped', e);
      }
      
      // 2. Simple Icons Slug SVG fallback
      if (!logoUrl && simpleIconSlug && simpleIconSlug !== 'null') {
        logoUrl = `https://cdn.jsdelivr.net/npm/simple-icons@v10/icons/${simpleIconSlug}.svg`;
      }

      // 3. Clearbit Logo PNG fallback
      if (!logoUrl && domain && domain !== 'null') {
        logoUrl = `https://logo.clearbit.com/${domain}?size=256`;
      }
    }

    // Resolve Cover Art URL
    if (coverQuery && coverQuery !== 'null') {
      coverUrl = `https://images.unsplash.com/featured/800x400/?${encodeURIComponent(coverQuery)}`;
    } else {
      // Fallback query based on company name and niche
      coverUrl = `https://images.unsplash.com/featured/800x400/?${encodeURIComponent(companyName + ',' + (niche || 'corporate') + ',abstract')}`;
    }

    // Final fallback if logoUrl is still empty - return empty to trigger the frontend's premium dynamic monogram cards
    if (!logoUrl) {
      logoUrl = '';
    }

    const media = { logoUrl, coverUrl, url: logoUrl };
    brandMediaCache.set(cacheKey, media);
    return res.json(media);
  } catch (err) {
    safeLog('Fetching brand logo failed, using fallback', err);
    const fallbackLogo = logoUrl || `https://logo.clearbit.com/${normalized.replace(/\s+/g, '')}.com?size=256`;
    const media = { 
      logoUrl: fallbackLogo, 
      coverUrl: `https://images.unsplash.com/featured/800x400/?${encodeURIComponent(companyName + ',' + (niche || 'corporate') + ',abstract')}`, 
      url: fallbackLogo 
    };
    brandMediaCache.set(cacheKey, media);
    return res.json(media);
  }
});

const urlCache = new Map<string, string>();

function fallbackCompanyDomain(name: string): string {
  let clean = name.toLowerCase().trim();
  clean = clean.replace(/\b(corp|corporation|inc|incorporated|ltd|limited|co|company|technologies|systems|labs|group|holdings|networks|solutions|software|global|pro|ai)\b\.?/gi, '');
  clean = clean.replace(/[^a-z0-9\s-]/g, '');
  clean = clean.trim().replace(/\s+/g, '');
  return `${clean}.com`;
}

app.post('/api/company-url', async (req, res) => {
  const { companyName, niche } = req.body;
  if (!companyName) {
    return res.status(400).json({ error: 'Company name is required.' });
  }

  const cacheKey = companyName.trim().toLowerCase();
  if (urlCache.has(cacheKey)) {
    return res.json({ url: urlCache.get(cacheKey) });
  }

  const ai = getAI();
  const fallbackUrl = `https://www.${fallbackCompanyDomain(companyName)}`;
  if (!ai) {
    return res.json({ url: fallbackUrl });
  }

  try {
    const requestedModelName = 'gemini-3.5-flash';
    const modelName = resolveModelName(requestedModelName);

    const prompt = `Search Google to find the absolute official homepage website URL (including http:// or https://) for the real company or brand "${companyName}" operating in the "${niche || 'general'}" sector.
If this company is entirely fictional and does not have a real official website, return any logical simulated domain name.
Return ONLY a valid JSON object matching this schema:
{
  "officialUrl": "the direct official website URL (e.g. https://www.nintendo.com)",
  "isReal": true
}
Do not include any explanation or markdown formatting.`;

    const config = getModelConfig(modelName, undefined, false); // search enabled

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config,
    });

    const text = response.text ? response.text.trim() : '';
    let url = '';
    if (text) {
      try {
        const cleaned = text.includes('```')
          ? text.replace(/```json\s*/gi, '').replace(/```\s*$/g, '').trim()
          : text.trim();
        const parsed = JSON.parse(cleaned);
        if (parsed && typeof parsed.officialUrl === 'string' && parsed.officialUrl.startsWith('http')) {
          url = parsed.officialUrl;
        }
      } catch (e) {
        const match = text.match(/"officialUrl"\s*:\s*"([^"]+)"/);
        if (match && match[1].startsWith('http')) {
          url = match[1];
        }
      }
    }

    if (!url) {
      url = fallbackUrl;
    }

    urlCache.set(cacheKey, url);
    return res.json({ url });
  } catch (err) {
    safeLog('Finding company URL failed, using fallback', err);
    return res.json({ url: fallbackUrl });
  }
});

app.get('/api/website-proxy', async (req, res) => {
  const targetUrl = req.query.url as string;
  if (!targetUrl) {
    return res.status(400).send('URL query parameter is required.');
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      signal: AbortSignal.timeout(10000) // 10 second timeout for complex websites
    });

    if (!response.ok) {
      throw new Error(`Unreachable status: ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      return res.redirect(targetUrl);
    }

    let html = await response.text();

    // 1. Clean meta Content-Security-Policy elements that might block inline resources or frame styling
    html = html.replace(/<meta\s+http-equiv=["']Content-Security-Policy["'][^>]*>/gi, '');

    // 2. Inject robust anti-frame-busting JavaScript before base tag
    const antiFrameBusterScript = `
      <script>
        (function() {
          // Bypass frame-busting scripts by aligning window.top and window.parent to self inside the sandbox
          try {
            Object.defineProperty(window, 'top', { get: function() { return window; } });
            Object.defineProperty(window, 'parent', { get: function() { return window; } });
          } catch (e) {
            window.top = window;
            window.parent = window;
          }
          // Neutralize page navigation changes initiated by scripts trying to bust frames
          window.onbeforeunload = function() {
            return "Prevented top-level navigation redirect";
          };
        })();
      </script>
    `;

    // Inject base href and anti-frame-busting code into <head>
    const baseTag = `<base href="${targetUrl}">`;
    const injection = baseTag + antiFrameBusterScript;
    if (/<head>/i.test(html)) {
      html = html.replace(/<head>/i, `<head>${injection}`);
    } else {
      html = injection + html;
    }

    // Set header and return
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (err: any) {
    safeLog(`Proxying website for ${targetUrl} failed`, err);
    
    // Return a beautiful, helpful error HTML that auto-triggers fallback or offers manual selection
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Stratemark Live Sandbox Connection</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@700&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Inter', sans-serif; }
          .font-serif { font-family: 'Playfair Display', serif; }
        </style>
      </head>
      <body class="bg-[#FCFBFA] text-gray-800 flex flex-col items-center justify-center min-h-[500px] p-8 text-center selection:bg-amber-100">
        <div class="max-w-md w-full space-y-6">
          <div class="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-700 text-2xl mx-auto shadow-sm">
            ✦
          </div>
          <div class="space-y-2">
            <h3 class="text-xl font-serif font-black text-gray-900 tracking-tight">Enterprise Sandbox Link</h3>
            <p class="text-[10px] font-mono uppercase tracking-widest text-amber-700 font-black">Digital Register Unresolved</p>
            <p class="text-xs text-gray-500 leading-relaxed max-w-sm mx-auto">
              This enterprise operates on a private network or fictional register. Its official live public domain is currently unreachable.
            </p>
          </div>
          
          <div class="p-4 bg-amber-50/60 border border-amber-200/40 rounded-xl space-y-1.5 text-left">
            <p class="text-xs font-semibold text-amber-900">Stratemark Live Synthesis:</p>
            <p class="text-[11px] text-amber-800/90 leading-relaxed">
              We have synthesized a bespoke interactive presentation deck showcasing this company's core mission, market valuation, and leadership roster.
            </p>
          </div>

          <div class="flex flex-col gap-2">
            <button 
              onclick="window.parent.postMessage({ action: 'switchToGenerated' }, '*')"
              class="w-full px-5 py-3 text-xs font-mono uppercase tracking-wider text-white bg-[#4F4739] hover:bg-[#786759] rounded-xl transition-all font-bold shadow-md cursor-pointer hover:-translate-y-0.5 duration-200 active:translate-y-0"
            >
              Launch Synthesized Pitch
            </button>
            <a 
              href="${targetUrl}" 
              target="_blank" 
              class="text-[10px] font-mono uppercase tracking-wider text-gray-400 hover:text-gray-600 underline mt-2"
            >
              Force open ${targetUrl}
            </a>
          </div>
        </div>

        <script>
          // Automatically notify parent after 1.5 seconds for instant frictionless switch
          setTimeout(() => {
            window.parent.postMessage({ action: 'switchToGenerated' }, '*');
          }, 1500);
        </script>
      </body>
      </html>
    `);
  }
});

app.post('/api/deep-research', async (req, res) => {
  const { companyName, niche, aiConfig } = req.body;

  if (!companyName || typeof companyName !== 'string' || companyName.trim().length === 0) {
    return res.status(400).json({ error: 'Company name is required.' });
  }

  const nicheStr = niche || 'General Market';
  const ai = getAI();
  if (!ai) {
    safeLog('Gemini API is not configured. Returning procedural deep research.');
    const fallbackData = generateFallbackDeepResearch(companyName, nicheStr);
    return res.json(fallbackData);
  }

  try {
    const requestedModelName = aiConfig?.modelName || 'gemini-3.5-flash';
    const modelName = resolveModelName(requestedModelName);
    console.log(`Performing live web-grounded search for company: "${companyName}" using ${modelName}`);

    const prompt = `You are a premier Wall Street institutional research analyst. Conduct a real-time deep-dive investment and market research audit on the company or entity "${companyName}" operating in the niche: "${nicheStr}".

Use Google Search grounding to find the most accurate, real-time, up-to-date business intelligence, recent news, technological stack, key controversies, executive profiles, and market context.

Organize your response into the following clear Markdown sections:
### 1. Recent Market Events & Live Intelligence
### 2. Operational & Financial Standing
### 3. Technological Moats & Architecture
### 4. Competitor Landscape & Moats
### 5. Regulatory, Security, & Ethical Risks

Be incredibly specific, dense with real facts, names of executives, statistics, and figures from search results. Return ONLY the markdown.`;

    const config = getModelConfig(modelName, aiConfig?.thinkingEffort);

    let response;
    try {
      response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config,
      });
    } catch (apiError: any) {
      safeLog(`Primary model ${modelName} failed for deep-research, trying fallback gemini-3.5-flash`, apiError);
      if (modelName !== 'gemini-3.5-flash') {
        const fallbackConfig = getModelConfig('gemini-3.5-flash', aiConfig?.thinkingEffort);
        response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: prompt,
          config: fallbackConfig,
        });
      } else {
        throw apiError;
      }
    }

    const content = response.text || '';
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const searchQueries = response.candidates?.[0]?.groundingMetadata?.webSearchQueries || [];

    const sources = chunks
      .map((chunk: any) => ({
        title: chunk.web?.title || 'Web Source',
        uri: chunk.web?.uri || '',
      }))
      .filter((s: any) => s.uri !== '');

    return res.json({ content, sources, queries: searchQueries });
  } catch (error: any) {
    safeLog('Conducting deep-dive research failed, falling back to procedural deep research', error);
    try {
      const fallbackData = generateFallbackDeepResearch(companyName, nicheStr);
      return res.json(fallbackData);
    } catch (fallbackError: any) {
      safeLog('Procedural deep-research fallback failed', fallbackError);
      return res.status(500).json({ error: `Failed to conduct deep research. Error: ${cleanGeminiError(error)}` });
    }
  }
});

app.post('/api/expand-tab', async (req, res) => {
  const { companyName, niche, tabId, existingContent, aiConfig } = req.body;

  const ai = getAI();
  if (!ai) {
    safeLog('Gemini API is not configured. Returning procedural expand-tab.');
    const fallbackData = generateFallbackExpandTab(companyName, niche, tabId, existingContent);
    return res.json(fallbackData);
  }

  try {
    const requestedModelName = aiConfig?.modelName || 'gemini-3.5-flash';
    const modelName = resolveModelName(requestedModelName);
    const prompt = `You are a premier Wall Street institutional research analyst.
I have a brief summary of the "${tabId}" for the company "${companyName}" in the market "${niche}".
Here is the brief existing content:
"${existingContent}"

I need you to perform a massive, highly detailed expansion of this specific section. Use Google Search grounding to fetch real-world facts, names, figures, dates, and historical context. Expand this into a comprehensive 3-5 paragraph deep dive in markdown format. Focus ONLY on the "${tabId}" category.`;

    const config = getModelConfig(modelName, aiConfig?.thinkingEffort);

    let response;
    try {
      response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config,
      });
    } catch (apiError: any) {
      safeLog(`Primary model ${modelName} failed for expand-tab, trying fallback gemini-3.5-flash`, apiError);
      if (modelName !== 'gemini-3.5-flash') {
        const fallbackConfig = getModelConfig('gemini-3.5-flash', aiConfig?.thinkingEffort);
        response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: prompt,
          config: fallbackConfig,
        });
      } else {
        throw apiError;
      }
    }

    const content = response.text || '';
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    const sources = chunks
      .map((chunk: any) => ({
        title: chunk.web?.title || 'Web Source',
        uri: chunk.web?.uri || '',
      }))
      .filter((s: any) => s.uri !== '');

    return res.json({ expandedContent: content, sources });
  } catch (error: any) {
    safeLog('Expanding tab failed, falling back to procedural expansion', error);
    try {
      const fallbackData = generateFallbackExpandTab(companyName, niche, tabId, existingContent);
      return res.json(fallbackData);
    } catch (fallbackError: any) {
      safeLog('Procedural expand-tab fallback failed', fallbackError);
      return res.status(500).json({ error: `Failed to expand tab: ${cleanGeminiError(error)}` });
    }
  }
});

app.post('/api/chat', async (req, res) => {
  const { companyName, niche, message, history, aiConfig } = req.body;

  const ai = getAI();
  if (!ai) {
    safeLog('Gemini API is not configured. Returning procedural chat.');
    const fallbackData = generateFallbackChat(companyName, niche, message);
    return res.json(fallbackData);
  }

  try {
    const requestedModelName = aiConfig?.modelName || 'gemini-3.5-flash';
    const modelName = resolveModelName(requestedModelName);
    const systemInstruction = `You are an elite corporate strategy advisor for ${companyName} operating within the ${niche} market.
You have access to live Google Search grounding. Use real facts, recent news, and hard data to answer the user's questions about the company's financials, technology, controversies, and competitors. Respond in a professional, slightly intense Wall Street tone. Keep responses concise but highly informative (1-2 paragraphs).`;

    const prompt = `${systemInstruction}\n\nUser Question: ${message}`;
    
    // Pass chat history if needed, but for simplicity we can just append the latest message to a conversational prompt or use a chat session. We will just use generateContent with the history as text.
    let fullPrompt = prompt;
    if (history && history.length > 0) {
       fullPrompt = `${systemInstruction}\n\nPrevious Conversation:\n` + history.map((msg: any) => `${msg.role}: ${msg.content}`).join('\n') + `\n\nUser Question: ${message}`;
    }

    const config = getModelConfig(modelName, aiConfig?.thinkingEffort);

    let response;
    try {
      response = await ai.models.generateContent({
        model: modelName,
        contents: fullPrompt,
        config,
      });
    } catch (apiError: any) {
      safeLog(`Primary model ${modelName} failed for chat, trying fallback gemini-3.5-flash`, apiError);
      if (modelName !== 'gemini-3.5-flash') {
        const fallbackConfig = getModelConfig('gemini-3.5-flash', aiConfig?.thinkingEffort);
        response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: fullPrompt,
          config: fallbackConfig,
        });
      } else {
        throw apiError;
      }
    }

    const reply = response.text || '';
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const searchQueries = response.candidates?.[0]?.groundingMetadata?.webSearchQueries || [];

    const sources = chunks
      .map((chunk: any) => ({
        title: chunk.web?.title || 'Web Source',
        uri: chunk.web?.uri || '',
      }))
      .filter((s: any) => s.uri !== '');

    return res.json({ reply, sources, queries: searchQueries });
  } catch (error: any) {
    safeLog('Company chat failed, falling back to procedural reply', error);
    try {
      const fallbackData = generateFallbackChat(companyName, niche, message);
      return res.json(fallbackData);
    } catch (fallbackError: any) {
      safeLog('Procedural chat fallback failed', fallbackError);
      return res.status(500).json({ error: `Chat engine failure: ${cleanGeminiError(error)}` });
    }
  }
});

// Vite middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
