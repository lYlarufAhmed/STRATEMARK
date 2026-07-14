const fs = require('fs');
let content = fs.readFileSync('src/components/ResearchPortal.tsx', 'utf-8');

// Update props interface
content = content.replace(
  '  aiConfig: AIConfig;\n}',
  '  aiConfig: AIConfig;\n  onUpdateCompany: (company: CompanyProfile) => void;\n}'
);

content = content.replace(
  'export default function ResearchPortal({ company, niche, onClose, aiConfig }: ResearchPortalProps) {',
  'export default function ResearchPortal({ company, niche, onClose, aiConfig, onUpdateCompany }: ResearchPortalProps) {'
);

// Add loading state for profile
const loadingState = `
  const [loadingProfile, setLoadingProfile] = useState(!company.team);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    if (!company.team && !loadingProfile && !profileError) {
       setLoadingProfile(true);
    }
  }, [company]);

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

  if (loadingProfile) {
    return (
      <div className="flex flex-col items-center justify-center h-[85vh] bg-[#fdfbf7] text-slate-900 p-8 text-center relative rounded-xl">
        <button onClick={onClose} className="absolute top-6 right-6 p-2 hover:bg-slate-200 rounded transition-colors"><X className="w-6 h-6 text-slate-600" /></button>
        <RefreshCw className="w-12 h-12 animate-spin text-emerald-700 mb-6" />
        <h2 className="text-2xl font-bold font-serif mb-2">Generating Deep Dive</h2>
        <p className="text-slate-600 max-w-md font-sans">Synthesizing comprehensive organizational profile for {company.name} in {niche}...</p>
      </div>
    );
  }

  if (profileError && !company.team) {
    return (
       <div className="flex flex-col items-center justify-center h-[85vh] bg-[#fdfbf7] p-8 text-center relative rounded-xl">
        <button onClick={onClose} className="absolute top-6 right-6 p-2 hover:bg-slate-200 rounded transition-colors"><X className="w-6 h-6 text-slate-600" /></button>
        <AlertTriangle className="w-12 h-12 text-red-600 mb-6" />
        <h2 className="text-2xl font-bold font-serif text-slate-900 mb-2">Generation Failed</h2>
        <p className="text-slate-600 max-w-md font-sans mb-6">{profileError}</p>
        <button onClick={() => setLoadingProfile(true)} className="px-6 py-2 bg-emerald-700 text-white rounded font-bold uppercase tracking-wider text-sm">Retry</button>
      </div>
    );
  }
`;

const insertIndex = content.indexOf('  const handleFetchLiveIntel');
content = content.slice(0, insertIndex) + loadingState + '\n' + content.slice(insertIndex);

// Add null checks for company parts in the render since they could be undefined, though the loader should protect it.
content = content.replace(/company\.mission\.statement/g, 'company.mission?.statement');
content = content.replace(/company\.numbers\.annualRevenue/g, 'company.numbers?.annualRevenue');
content = content.replace(/company\.numbers\.fundingRaised/g, 'company.numbers?.fundingRaised');
content = content.replace(/company\.team\.headcount/g, 'company.team?.headcount');
content = content.replace(/company\.numbers\.burnRate/g, 'company.numbers?.burnRate');
content = content.replace(/company\.team\.keyExecutives\.map/g, '(company.team?.keyExecutives || []).map');
content = content.replace(/company\.team\.culture/g, 'company.team?.culture');
content = content.replace(/company\.team\.hiringTrends/g, 'company.team?.hiringTrends');
content = content.replace(/company\.numbers\.profitability/g, 'company.numbers?.profitability');
content = content.replace(/company\.numbers\.keyAssets/g, 'company.numbers?.keyAssets');
content = content.replace(/company\.mission\.corePhilosophy/g, 'company.mission?.corePhilosophy');
content = content.replace(/company\.mission\.ethicalDilemmas/g, 'company.mission?.ethicalDilemmas');
content = content.replace(/company\.story\.origin/g, 'company.story?.origin');
content = content.replace(/company\.story\.pivots/g, 'company.story?.pivots');
content = content.replace(/company\.story\.challenges/g, 'company.story?.challenges');

fs.writeFileSync('src/components/ResearchPortal.tsx', content);
