const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetProfile = `    const KNOWN_EXECUTIVES: { [key: string]: any[] } = {
      "anthropic": [
        { name: "Dario Amodei", role: "Chief Executive Officer & Co-Founder", bio: "Former VP of Research at OpenAI.", background: "Princeton University", achievements: "Led the development of Claude and Constitutional AI.", routine: "Focuses on alignment research and strategic scaling.", philosophy: "AI research and products that put safety at the frontier." },
        { name: "Daniela Amodei", role: "President & Co-Founder", bio: "Former VP of Safety and Policy at OpenAI.", background: "UCSC", achievements: "Built Anthropic's organizational and policy structure.", routine: "Oversees daily operations and policy initiatives.", philosophy: "Building reliable, interpretable, and steerable AI systems." },
        { name: "Jack Clark", role: "Co-Founder", bio: "Former Policy Director at OpenAI.", background: "Journalism and AI Policy", achievements: "Co-creator of the AI Index.", routine: "Tracks global AI policy and writes Import AI.", philosophy: "Transparency and rigorous measurement in AI progress." },
        { name: "Jared Kaplan", role: "Co-Founder & Chief Scientist", bio: "Former OpenAI researcher.", background: "Johns Hopkins University", achievements: "Discovered neural scaling laws.", routine: "Directs long-term research on model scaling.", philosophy: "Scaling is the most reliable path to AGI." },
        { name: "Chris Olah", role: "Co-Founder", bio: "Former OpenAI and Google Brain researcher.", background: "University of Toronto", achievements: "Pioneered mechanistic interpretability.", routine: "Leads interpretability research teams.", philosophy: "Understanding neural networks through rigorous visualization." }
      ],
      "openai": [
        { name: "Sam Altman", role: "Chief Executive Officer", bio: "Former President of Y Combinator.", background: "Stanford University (Dropout)", achievements: "Scaled OpenAI from non-profit to commercial giant.", routine: "Focuses on massive capital raising and global policy.", philosophy: "AGI will be the most significant technology in human history." },
        { name: "Greg Brockman", role: "President & Co-Founder", bio: "Former CTO of Stripe.", background: "MIT", achievements: "Architected OpenAI's core infrastructure.", routine: "Hands-on coding and systems engineering.", philosophy: "Iterative deployment is the only way to build safe AI." }
      ],
      "xai": [
        { name: "Elon Musk", role: "Founder", bio: "CEO of Tesla and SpaceX.", background: "UPenn", achievements: "Founded xAI to understand the universe.", routine: "Divides time across multiple massive companies.", philosophy: "Maximum truth-seeking AI is the safest AI." }
      ]
    };`;

code = code.replace(targetProfile, '');

const targetOverride = `      const normalizedName = companyName.toLowerCase().trim();
      const matchedExecKey = Object.keys(KNOWN_EXECUTIVES).find(key => 
        normalizedName === key || normalizedName.includes(key) || key.includes(normalizedName)
      );
      
      if (matchedExecKey) {
        players = KNOWN_EXECUTIVES[matchedExecKey];
      }`;

code = code.replace(targetOverride, '');

fs.writeFileSync('server.ts', code);
