export interface KeyPlayer {
  name: string;
  role: string;
  bio: string;
  avatarUrl?: string;
  achievements?: string;
  background?: string;
  routine?: string;
  philosophy?: string;
}

export interface CompanyTeam {
  headcount: string;
  keyPlayers: KeyPlayer[];
  keyExecutives?: KeyPlayer[]; // fallback support
  structureDescription: string;
  hiringTrends: string;
  culture: string;
}

export interface CompanyNumbers {
  annualRevenue: string;
  fundingRaised: string;
  burnRate: string;
  profitability: string;
  keyAssets: string;
}

export interface CompanyMission {
  statement: string;
  corePhilosophy: string;
  ethicalDilemmas: string;
}

export interface CompanyStory {
  origin: string;
  pivots: string;
  challenges: string;
}

export interface CompanyProfile {
  name: string;
  index: number;
  tier: string; 
  marketShare: string;
  valuation: string;
  location?: { city: string; state: string; country: string; };
  team?: CompanyTeam;
  numbers?: CompanyNumbers;
  mission?: CompanyMission;
  story?: CompanyStory;
}

export interface PlatformProfile {
  name: string;
  index: number;
  role: string;
  description: string;
}

export interface MarketEvent {
  title: string;
  description: string;
  impact: string;
}

export interface BoardData {
  id: string;
  niche: string;
  companies: CompanyProfile[];
  platforms: PlatformProfile[];
  events: MarketEvent[];
}

export interface AIConfig {
  modelName: string;
  thinkingEffort?: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface MonopolyColorTheme {
  name: string;
  color: string;
  bgGradient: string;
  borderStyle: string;
  badgeStyle: string;
  subtleBg: string;
}

export function getCompanyDomain(name: string): string {
  let clean = name.toLowerCase().trim();
  
  // Remove trailing company suffixes
  clean = clean.replace(/\b(corp|corporation|inc|incorporated|ltd|limited|co|company|technologies|systems|labs|group|holdings|networks|solutions|software|global|pro|ai)\b\.?/gi, '');
  
  // Remove non-alphanumeric chars except spaces/hyphens
  clean = clean.replace(/[^a-z0-9\s-]/g, '');
  
  // Replace spaces with hyphens or strip them
  clean = clean.trim().replace(/\s+/g, '');
  
  if (clean.length < 2) {
    clean = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  }
  
  // Match common real-world companies to real domains
  const directMatches: { [key: string]: string } = {
    google: 'google.com',
    microsoft: 'microsoft.com',
    apple: 'apple.com',
    amazon: 'amazon.com',
    nvidia: 'nvidia.com',
    meta: 'meta.com',
    openai: 'openai.com',
    anthropic: 'anthropic.com',
    stripe: 'stripe.com',
    tesla: 'tesla.com',
    spacex: 'spacex.com',
    netflix: 'netflix.com',
    spotify: 'spotify.com',
    airbnb: 'airbnb.com',
    uber: 'uber.com',
    lyft: 'lyft.com',
    zoom: 'zoom.us',
    slack: 'slack.com',
    figma: 'figma.com',
    notion: 'notion.so',
    github: 'github.com',
    amd: 'amd.com',
    intel: 'intel.com',
    tsmc: 'tsmc.com',
    oracle: 'oracle.com',
    salesforce: 'salesforce.com',
    adobe: 'adobe.com',
    shopify: 'shopify.com',
    cloudflare: 'cloudflare.com',
    vercel: 'vercel.com',
    supabase: 'supabase.com',
    cohere: 'cohere.com',
    mistral: 'mistral.ai',
    xai: 'x.ai',
    supermemory: 'supermemory.ai',
    palantir: 'palantir.com',
    databricks: 'databricks.com',
    snowflake: 'snowflake.com',
    clints: 'clints.co',
    brokenpromises: 'brokenpromisesco.com',
    hellstar: 'hellstar.com',
    corteiz: 'crtz.xyz',
    represent: 'representclo.com',
    trapstar: 'trapstarlondon.com',
    synaworld: 'synaworld.co',
    minustwo: 'minustwostore.com',
    jehucal: 'jehucal.com',
    denimtears: 'denimtears.com',
    supreme: 'supreme.com',
    stussy: 'stussy.com',
    palace: 'palaceskateboards.com',
    patta: 'patta.nl',
    bape: 'bape.com',
    acoldwall: 'a-cold-wall.com',
    offwhite: 'off---white.com',
    kith: 'kith.com',
    noah: 'noahny.com',
    aimeleondore: 'aimeleondore.com',
  };

  if (directMatches[clean]) {
    return directMatches[clean];
  }
  
  return `${clean}.com`;
}

export function getMonopolyTheme(index: number): MonopolyColorTheme {
  if (index <= 2) {
    return {
      name: 'Lavender Mist',
      color: '#5B4F73',
      bgGradient: 'from-[#5B4F73]/10 to-[#5B4F73]/5',
      borderStyle: 'border-[#5B4F73]/40 hover:border-[#5B4F73]/90 focus:ring-[#5B4F73]',
      badgeStyle: 'bg-[#5B4F73]/15 text-[#3D3350] border-[#5B4F73]/30',
      subtleBg: 'bg-[#5B4F73]/5'
    };
  }
  if (index <= 5) {
    return {
      name: 'Sky Serenity',
      color: '#9DDAF0',
      bgGradient: 'from-[#9DDAF0]/10 to-[#9DDAF0]/5',
      borderStyle: 'border-[#9DDAF0]/40 hover:border-[#9DDAF0]/90 focus:ring-[#9DDAF0]',
      badgeStyle: 'bg-[#9DDAF0]/15 text-[#2A5E70] border-[#9DDAF0]/30',
      subtleBg: 'bg-[#9DDAF0]/5'
    };
  }
  if (index <= 8) {
    return {
      name: 'Rosy Bloom',
      color: '#D97E9C',
      bgGradient: 'from-[#D97E9C]/10 to-[#D97E9C]/5',
      borderStyle: 'border-[#D97E9C]/40 hover:border-[#D97E9C]/90 focus:ring-[#D97E9C]',
      badgeStyle: 'bg-[#D97E9C]/15 text-[#873F55] border-[#D97E9C]/30',
      subtleBg: 'bg-[#D97E9C]/5'
    };
  }
  if (index <= 11) {
    return {
      name: 'Terracotta Warmth',
      color: '#E38B60',
      bgGradient: 'from-[#E38B60]/10 to-[#E38B60]/5',
      borderStyle: 'border-[#E38B60]/40 hover:border-[#E38B60]/90 focus:ring-[#E38B60]',
      badgeStyle: 'bg-[#E38B60]/15 text-[#8C4625] border-[#E38B60]/30',
      subtleBg: 'bg-[#E38B60]/5'
    };
  }
  if (index <= 14) {
    return {
      name: 'Poppy Crimson',
      color: '#C83C41',
      bgGradient: 'from-[#C83C41]/10 to-[#C83C41]/5',
      borderStyle: 'border-[#C83C41]/40 hover:border-[#C83C41]/90 focus:ring-[#C83C41]',
      badgeStyle: 'bg-[#C83C41]/15 text-[#7E1A1D] border-[#C83C41]/30',
      subtleBg: 'bg-[#C83C41]/5'
    };
  }
  if (index <= 16) {
    return {
      name: 'Golden Sunlight',
      color: '#F2C83F',
      bgGradient: 'from-[#F2C83F]/10 to-[#F2C83F]/5',
      borderStyle: 'border-[#F2C83F]/40 hover:border-[#F2C83F]/90 focus:ring-[#F2C83F]',
      badgeStyle: 'bg-[#F2C83F]/15 text-[#7F640E] border-[#F2C83F]/30',
      subtleBg: 'bg-[#F2C83F]/5'
    };
  }
  if (index <= 18) {
    return {
      name: 'Moss Green',
      color: '#5C8B56',
      bgGradient: 'from-[#5C8B56]/10 to-[#5C8B56]/5',
      borderStyle: 'border-[#5C8B56]/40 hover:border-[#5C8B56]/90 focus:ring-[#5C8B56]',
      badgeStyle: 'bg-[#5C8B56]/15 text-[#2C4F27] border-[#5C8B56]/30',
      subtleBg: 'bg-[#5C8B56]/5'
    };
  }
  // Dominant (19-20)
  return {
    name: 'Midnight Teal',
    color: '#2B5B75',
    bgGradient: 'from-[#2B5B75]/10 to-[#2B5B75]/5',
    borderStyle: 'border-[#2B5B75]/40 hover:border-[#2B5B75]/90 focus:ring-[#2B5B75]',
    badgeStyle: 'bg-[#2B5B75]/15 text-[#133549] border-[#2B5B75]/30',
    subtleBg: 'bg-[#2B5B75]/5'
  };
}

