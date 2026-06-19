import { useState, useMemo } from "react";
import { Search, FileText, Type, Sparkles, BookOpen, ShieldCheck, Scale, ArrowRight, X, ChevronDown, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DocumentType, Tone } from "../types";

export interface DocInfo {
  type: DocumentType;
  shortDesc: string;
  scope: string;
  bestFor: string;
  rating: "High Importance" | "Standard Safeguard" | "Operational Guide" | "Critical Shield";
  colorClass: string;
}

export interface ToneInfo {
  tone: Tone;
  vibe: string;
  description: string;
  sample: string;
  emoji: string;
}

export const DOCUMENT_DESCRIPTIONS: Record<DocumentType, DocInfo> = {
  [DocumentType.PrivacyPolicy]: {
    type: DocumentType.PrivacyPolicy,
    shortDesc: "PII & Cookie Compliance",
    scope: "Governs personal information collection, cookies, and regulatory rights under GDPR/CCPA thresholds.",
    bestFor: "Web clients, applications tracking telemetry, cloud databases.",
    rating: "Critical Shield",
    colorClass: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  },
  [DocumentType.TermsOfService]: {
    type: DocumentType.TermsOfService,
    shortDesc: "Agreement on Conditions",
    scope: "Establishes standard code/app usage rules, limits of liability, and generic jurisdiction choice.",
    bestFor: "SaaS projects, browser networks, direct end-user distributions.",
    rating: "Critical Shield",
    colorClass: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  },
  [DocumentType.ApiAgreement]: {
    type: DocumentType.ApiAgreement,
    shortDesc: "Developer Gateway Terms",
    scope: "Controls bearer code access, rate limits, request security, and API integrity parameters.",
    bestFor: "Web gateways, backend developer platform builders, open APIs.",
    rating: "High Importance",
    colorClass: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  },
  [DocumentType.SecurityPolicy]: {
    type: DocumentType.SecurityPolicy,
    shortDesc: "Vulnerability Disclosure",
    scope: "Outlines reporting pathways, response schedules, PGPs, and security audit schedules.",
    bestFor: "Open source modules, package managers, network integrations.",
    rating: "High Importance",
    colorClass: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  },
  [DocumentType.CodeOfConduct]: {
    type: DocumentType.CodeOfConduct,
    shortDesc: "Contributor Conduct System",
    scope: "Defines positive interaction bounds, harassment disclaimers, and enforcement panels.",
    bestFor: "FOSS projects with dynamic developer groups, repositories, wikis.",
    rating: "Operational Guide",
    colorClass: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  },
  [DocumentType.ContributingGuidelines]: {
    type: DocumentType.ContributingGuidelines,
    shortDesc: "Commit & Merging Workflows",
    scope: "Assists contributors with CI flows, PR styling, commit tags, and testing rules.",
    bestFor: "Public project collaboration, team repositories, monorepos.",
    rating: "Operational Guide",
    colorClass: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  },
  [DocumentType.AcceptableUsePolicy]: {
    type: DocumentType.AcceptableUsePolicy,
    shortDesc: "Harassment & Tool Protections",
    scope: "Prohibits penetration scanning, system spamming, illegal loads, and workspace vandalism.",
    bestFor: "Compute hosting, dynamic database hubs, shared remote clients.",
    rating: "High Importance",
    colorClass: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  },
  [DocumentType.License]: {
    type: DocumentType.License,
    shortDesc: "Distribution Permissions",
    scope: "Defines rights to clone, modify, distribute, and restrict liability under open source licenses.",
    bestFor: "Any active software codebase distributed on VCS networks.",
    rating: "Critical Shield",
    colorClass: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  },
  [DocumentType.Readme]: {
    type: DocumentType.Readme,
    shortDesc: "Overview & Quickstart Setup",
    scope: "An elegant, comprehensive presentation of feature metrics, install states, and configurations.",
    bestFor: "Root folder of every repository or workspace online.",
    rating: "Operational Guide",
    colorClass: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  },
  [DocumentType.Eula]: {
    type: DocumentType.Eula,
    shortDesc: "Decompilation & Copy Controls",
    scope: "Strict, proprietary license prohibiting code reverse engineering, unpacking, or redistribution.",
    bestFor: "Desktop executables, proprietary services, binary package systems.",
    rating: "Critical Shield",
    colorClass: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  },
  [DocumentType.Dpa]: {
    type: DocumentType.Dpa,
    shortDesc: "Subprocessor Agreements",
    scope: "Sets standards for raw telemetry transfer, subprocessor reviews, and privacy data leaks.",
    bestFor: "B2B sales teams, GDPR-compliant vendor review boards.",
    rating: "Standard Safeguard",
    colorClass: "text-neutral-400 bg-neutral-500/10 border-neutral-500/20",
  },
  [DocumentType.Nda]: {
    type: DocumentType.Nda,
    shortDesc: "Proprietary IP Secrecy",
    scope: "Imposes strict confidentiality on design tokens, private algorithms, and trade secrets.",
    bestFor: "Independent consultants, startup builders, contract reviews.",
    rating: "High Importance",
    colorClass: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  },
  [DocumentType.Sla]: {
    type: DocumentType.Sla,
    shortDesc: "Service Uptime Warranties",
    scope: "Garantees specific uptime percentage (e.g. 99.9%), credits formulas, and response tiers.",
    bestFor: "Hosted databases, corporate cloud suppliers, infrastructure API suites.",
    rating: "Standard Safeguard",
    colorClass: "text-neutral-400 bg-neutral-500/10 border-neutral-500/20",
  },
  [DocumentType.CookiePolicy]: {
    type: DocumentType.CookiePolicy,
    shortDesc: "Tracker Pixels Classification",
    scope: "Details tracking variables, session states, and browser database elements under EU Laws.",
    bestFor: "Client-side web servers tracking performance counters or ads.",
    rating: "Standard Safeguard",
    colorClass: "text-neutral-400 bg-neutral-500/10 border-neutral-500/20",
  },
  [DocumentType.Disclaimer]: {
    type: DocumentType.Disclaimer,
    shortDesc: "Warranty & Fit Disclaimer",
    scope: "Drives back implied assurances of medical, legal, financial, or exact technical accuracy.",
    bestFor: "Beta utilities, calculation libraries, test suites, diagnostic scripts.",
    rating: "High Importance",
    colorClass: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  },
  [DocumentType.Acknowledgments]: {
    type: DocumentType.Acknowledgments,
    shortDesc: "External Credits & Sponsors",
    scope: "Formally acknowledges open source dependencies, researchers, developers, sponsors, and third-party tools that powered the project.",
    bestFor: "Public FOSS repositories, credited libraries, and community frameworks.",
    rating: "Operational Guide",
    colorClass: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  },
  [DocumentType.AiTxt]: {
    type: DocumentType.AiTxt,
    shortDesc: "AI Agent Project Manifest",
    scope: "Specially designed text matrix guiding LLMs and AI coding agents on codebase crawling, entrypoints, and configurations.",
    bestFor: "Active AI-native developer codebases, agentic systems, and next-gen repos.",
    rating: "Operational Guide",
    colorClass: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  },
  [DocumentType.ApiDocumentation]: {
    type: DocumentType.ApiDocumentation,
    shortDesc: "Technical Interface Reference",
    scope: "Exhaustively maps public functions, variables, classes, REST endpoints, schema structures, inputs, and outputs.",
    bestFor: "Web APIs, developer SDKs, public packages, and microservices.",
    rating: "High Importance",
    colorClass: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  },
  [DocumentType.Architecture]: {
    type: DocumentType.Architecture,
    shortDesc: "System Design Blueprint",
    scope: "Deep overview of module interactions, structural design patterns, data flow patterns, and deployment architectures.",
    bestFor: "Complex developer codebases, enterprise SaaS systems, and system monorepos.",
    rating: "High Importance",
    colorClass: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  },
  [DocumentType.Contributors]: {
    type: DocumentType.Contributors,
    shortDesc: "Recognition List",
    scope: "Logs the names, roles, and community contributions of authors and creators to preserve social credit.",
    bestFor: "Collaborative FOSS systems, community-focused projects, and collective works.",
    rating: "Operational Guide",
    colorClass: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  },
  [DocumentType.Benchmarks]: {
    type: DocumentType.Benchmarks,
    shortDesc: "Performance Metrics Log",
    scope: "Tracks speed limits, response latencies, memory footprint, load capacities, and benchmarks replica commands.",
    bestFor: "Databases, compilers, compute frameworks, and high-frequency systems.",
    rating: "Standard Safeguard",
    colorClass: "text-neutral-400 bg-neutral-500/10 border-neutral-500/20",
  },
  [DocumentType.BiasAndFairness]: {
    type: DocumentType.BiasAndFairness,
    shortDesc: "AI Equity Diagnostics",
    scope: "Documents testing standards, demographic parity metrics, mitigations of bias across users, and model ethics reviews.",
    bestFor: "AI models, machine learning projects, automated decisioning tools.",
    rating: "High Importance",
    colorClass: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  },
  [DocumentType.Changelog]: {
    type: DocumentType.Changelog,
    shortDesc: "Chronological Version Updates",
    scope: "Clear, time-series logs of notable features, bug updates, breaking changes, and version release logs.",
    bestFor: "Production frameworks, packages, user applications, and public software.",
    rating: "Operational Guide",
    colorClass: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  },
  [DocumentType.CiCdDocumentation]: {
    type: DocumentType.CiCdDocumentation,
    shortDesc: "Pipeline Automation Manual",
    scope: "Explains CI runner actions, automated builds, test assertions, staging registries, and container configurations.",
    bestFor: "Enterprise DevOps platforms, containerized services, and integrated projects.",
    rating: "Operational Guide",
    colorClass: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  },
  [DocumentType.Citations]: {
    type: DocumentType.Citations,
    shortDesc: "Academic Citation Metadata",
    scope: "Specifies standardized citation format (CFF) for researchers seeking to reference software in academia.",
    bestFor: "Scientific modules, data science wrappers, academic papers, and foundational research.",
    rating: "Standard Safeguard",
    colorClass: "text-neutral-400 bg-neutral-500/10 border-neutral-500/20",
  },
  [DocumentType.CodeNav]: {
    type: DocumentType.CodeNav,
    shortDesc: "VCS Structural Navigator",
    scope: "Mapping of files, class dependencies, and operational flows to accelerate AI scanning without reading all code.",
    bestFor: "Large repositories scanned by external context engines or LLM coders.",
    rating: "Operational Guide",
    colorClass: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  },
  [DocumentType.Codeowners]: {
    type: DocumentType.Codeowners,
    shortDesc: "PR Review Responsibility",
    scope: "Defines specific review roles per directory to auto-assign PRs depending on file ownership criteria.",
    bestFor: "Large scale multi-developer codebases, monorepos, and split workspaces.",
    rating: "Standard Safeguard",
    colorClass: "text-neutral-400 bg-neutral-500/10 border-neutral-500/20",
  },
  [DocumentType.Configuration]: {
    type: DocumentType.Configuration,
    shortDesc: "Advanced Customization Guide",
    scope: "Deep list of active environmental parameters, flag settings, configuration matrices, and initialization vectors.",
    bestFor: "SaaS projects, backend databases, container networks, and client programs.",
    rating: "High Importance",
    colorClass: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  },
  [DocumentType.Conventions]: {
    type: DocumentType.Conventions,
    shortDesc: "LLM Code Generation Guard",
    scope: "Strict engineering directives, language restrictions, and testing rules to keep LLM creations compliant.",
    bestFor: "AI-assisted developer teams, coding agents, and strict architecture projects.",
    rating: "Operational Guide",
    colorClass: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  },
  [DocumentType.DatasetCard]: {
    type: DocumentType.DatasetCard,
    shortDesc: "Data Feed Summary Card",
    scope: "Specifies raw sources, collection pipelines, label standards, and content biases in raw ML training materials.",
    bestFor: "Data modeling wrappers, database hubs, public repositories with training datasets.",
    rating: "High Importance",
    colorClass: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  },
  [DocumentType.Deployment]: {
    type: DocumentType.Deployment,
    shortDesc: "Server Hosting Instructions",
    scope: "Deploy steps to push code live, secure endpoints, setup TLS/SSL, configure reverse proxies, and handle state.",
    bestFor: "SaaS websites, web environments, container systems, and active applications.",
    rating: "High Importance",
    colorClass: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  },
  [DocumentType.Development]: {
    type: DocumentType.Development,
    shortDesc: "Developer Machine Sandbox",
    scope: "Onboarding flow for devs to pull source, provision dev services, and run local testing hooks.",
    bestFor: "Multi-developer frameworks, internal team files, open repositories.",
    rating: "Operational Guide",
    colorClass: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  },
  [DocumentType.EthicsPolicy]: {
    type: DocumentType.EthicsPolicy,
    shortDesc: "Human Safety Directives",
    scope: "Highlights forbidden code uses, safety commitments, user privacy protocols, and ethical guardrails.",
    bestFor: "Generative AI, biometric setups, medical files, surveillance projects.",
    rating: "Critical Shield",
    colorClass: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  },
  [DocumentType.Evaluation]: {
    type: DocumentType.Evaluation,
    shortDesc: "Accuracy Benchmarking Manual",
    scope: "Details standardization tests (e.g., MMLU, GSM8K) to audit AI model regressions.",
    bestFor: "AI integrations, model hubs, LLM fine-tune tests.",
    rating: "Standard Safeguard",
    colorClass: "text-neutral-400 bg-neutral-500/10 border-neutral-500/20",
  },
  [DocumentType.Examples]: {
    type: DocumentType.Examples,
    shortDesc: "Functional Code Cookbooks",
    scope: "Direct code snippets, scripting flows, and sample projects demonstrating framework integration.",
    bestFor: "Developer interfaces, open SDK libraries, packages, and clients.",
    rating: "Operational Guide",
    colorClass: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  },
  [DocumentType.Faq]: {
    type: DocumentType.Faq,
    shortDesc: "Frequent Conceptual Inquiry",
    scope: "Friendly guides addressing pricing models, updates, system access, and user operations.",
    bestFor: "Active customer SaaS, community tools, public modules.",
    rating: "Operational Guide",
    colorClass: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  },
  [DocumentType.Funding]: {
    type: DocumentType.Funding,
    shortDesc: "Financial Support Setup",
    scope: "Specifies GitHub Sponsors, Patreon, Open Collective, and crowdfunding channels, formatted for sponsoring.",
    bestFor: "FOSS packages, community libraries, open web utilities.",
    rating: "Standard Safeguard",
    colorClass: "text-neutral-400 bg-neutral-500/10 border-neutral-500/20",
  },
  [DocumentType.GettingStarted]: {
    type: DocumentType.GettingStarted,
    shortDesc: "Five-Minute Task Workflow",
    scope: "Direct walk-through helping devs compile clean runs, complete basic actions, and deploy inside five minutes.",
    bestFor: "New user libraries, client portals, system setups.",
    rating: "Operational Guide",
    colorClass: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  },
  [DocumentType.Glossary]: {
    type: DocumentType.Glossary,
    shortDesc: "Architecture & Industry Dictionary",
    scope: "Defines proprietary names, domain specific code acronyms, and product mechanics to keep developer teams cohesive.",
    bestFor: "Niche ecosystems, complex enterprise tools, multi-team projects.",
    rating: "Operational Guide",
    colorClass: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  },
  [DocumentType.Governance]: {
    type: DocumentType.Governance,
    shortDesc: "Decision Rules Hierarchy",
    scope: "Outlines project manager selections, code review boards, advisory groups, and FOSS voting schemas.",
    bestFor: "Vast community frameworks, foundation managed utilities, multi-stakeholder work.",
    rating: "Standard Safeguard",
    colorClass: "text-neutral-400 bg-neutral-500/10 border-neutral-500/20",
  },
  [DocumentType.Inference]: {
    type: DocumentType.Inference,
    shortDesc: "Local Hardware Execution",
    scope: "Explains computer requirements (VRAM/RAM), quantization maps (GGUF, EXL2), and model starting commands.",
    bestFor: "AI models, prompt packages, weights repositories, local LLMs.",
    rating: "High Importance",
    colorClass: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  },
  [DocumentType.Install]: {
    type: DocumentType.Install,
    shortDesc: "Step-by-Step Installation",
    scope: "Hardware prerequisites, dependency compilers, package managers, and setup flows for diverse OS targets.",
    bestFor: "Low level programs, enterprise servers, multi-system installations.",
    rating: "Operational Guide",
    colorClass: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  },
  [DocumentType.LlmsTxt]: {
    type: DocumentType.LlmsTxt,
    shortDesc: "Discovery Index for LLMs",
    scope: "Highly compressed project outline mapped specifically for automated agents to identify key components.",
    bestFor: "Public developer programs, active SaaS tools, complex repositories.",
    rating: "Operational Guide",
    colorClass: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  },
  [DocumentType.ModelCard]: {
    type: DocumentType.ModelCard,
    shortDesc: "AI Model Capabilities Profile",
    scope: "Defines model performance parameters, training overview, benchmarks validation, and known limitations.",
    bestFor: "Machine learning repositories, neural weights, specialized fine-tunes.",
    rating: "Critical Shield",
    colorClass: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  },
  [DocumentType.PromptEngineering]: {
    type: DocumentType.PromptEngineering,
    shortDesc: "Optimized LLM Prompts",
    scope: "Standard prompt structures, custom prompts, meta-instructions, and examples to optimize LLM accuracy.",
    bestFor: "Generative integrations, chatbots, prompt hubs, AI pipelines.",
    rating: "Operational Guide",
    colorClass: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  },
  [DocumentType.ReleaseProcess]: {
    type: DocumentType.ReleaseProcess,
    shortDesc: "Publishing Matrix & Checklist",
    scope: "Maintains standard tags, security binaries signing, version metrics bump guides, and deployment workflows.",
    bestFor: "Enterprise library packages, core software distributions.",
    rating: "Standard Safeguard",
    colorClass: "text-neutral-400 bg-neutral-500/10 border-neutral-500/20",
  },
  [DocumentType.Roadmap]: {
    type: DocumentType.Roadmap,
    shortDesc: "Technical Future Vision",
    scope: "Maps out upcoming releases, projected optimizations, future extensions, and long-term targets.",
    bestFor: "Collaborative tools, enterprise plans, dynamic FOSS projects.",
    rating: "Operational Guide",
    colorClass: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  },
  [DocumentType.Support]: {
    type: DocumentType.Support,
    shortDesc: "Help Pathways Map",
    scope: "Refers client bugs directly to custom chat support rooms, community networks, or priority emails.",
    bestFor: "User-facing services, active merchant tools, complex systems.",
    rating: "Operational Guide",
    colorClass: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  },
  [DocumentType.Testing]: {
    type: DocumentType.Testing,
    shortDesc: "Testing Framework Protocols",
    scope: "Instructs developers, runs unit, system end to end, or browser mock test scripts under set coverage thresholds.",
    bestFor: "Production programs, standard repositories, multi-component engines.",
    rating: "Operational Guide",
    colorClass: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  },
  [DocumentType.Training]: {
    type: DocumentType.Training,
    shortDesc: "Model Replication Hyperparameters",
    scope: "Compiles exact training rates, tokenizers configs, custom deep weights configurations, and dataset feeds.",
    bestFor: "Deep learning centers, AI developers, research hubs.",
    rating: "Operational Guide",
    colorClass: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  },
  [DocumentType.Troubleshooting]: {
    type: DocumentType.Troubleshooting,
    shortDesc: "Common Technical Resolutions",
    scope: "Index listing specific crashes, container runtime errors, setup warnings, and exact resolve procedures.",
    bestFor: "Web containers, network frameworks, client software.",
    rating: "Operational Guide",
    colorClass: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  },
  [DocumentType.Tutorials]: {
    type: DocumentType.Tutorials,
    shortDesc: "Practical Learning Paths",
    scope: "Interactive end-to-end user exercises walking developers through creating their first production products.",
    bestFor: "Comprehensive developer systems, APIs, code SDK folders.",
    rating: "Operational Guide",
    colorClass: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  },
  [DocumentType.TypesSchema]: {
    type: DocumentType.TypesSchema,
    shortDesc: "Type Schema Interfaces",
    scope: "Comprehensive TypeScript descriptions, database layouts, and GraphQL schema parameters defining accurate records.",
    bestFor: "Strongly typed schemas, API databases, GraphQL gateways.",
    rating: "High Importance",
    colorClass: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  },
  [DocumentType.Upgrading]: {
    type: DocumentType.Upgrading,
    shortDesc: "Migration & Version Upgrades",
    scope: "Outlines breaking changes, deprecated functions, database modifications, and clean migrate vectors.",
    bestFor: "Evolving API environments, packages, critical operations databases.",
    rating: "Standard Safeguard",
    colorClass: "text-neutral-400 bg-neutral-500/10 border-neutral-500/20",
  },
};

export const TONE_DESCRIPTIONS: Record<Tone, ToneInfo> = {
  [Tone.Formal]: {
    tone: Tone.Formal,
    emoji: "⚖️",
    vibe: "Statutory & Comprehensive",
    description: "Classic high-level legal architecture utilizing traditional vocabulary, passive structures, and thorough conditions definitions.",
    sample: "The User herein covenants and agrees that under no circumstances shall the Project Creator be deemed liable for any loss.",
  },
  [Tone.Professional]: {
    tone: Tone.Professional,
    emoji: "💼",
    vibe: "Polished Corporate Business",
    description: "Elegant, crisp business language that is highly readable but completely protective. Avoids stuffy words without losing legal authority.",
    sample: "Our team takes care to protect your repository data. We do not transfer personal metadata to external subprocessors without explicit consent.",
  },
  [Tone.Friendly]: {
    tone: Tone.Friendly,
    emoji: "👋",
    vibe: "Warm & Caring Welcome",
    description: "Accessible, encouraging paragraphs that reassure users and guide developers. Perfect for building community-led repositories.",
    sample: "We're super excited to build with you! Please help us maintain a friendly community by respecting code safety guidelines.",
  },
  [Tone.Casual]: {
    tone: Tone.Casual,
    emoji: "☕",
    vibe: "Easygoing & Direct Dialogue",
    description: "Conversational, direct style that reads like a quick chat. Extremely helpful for projects trying to cut down on visual stuffiness.",
    sample: "Essentially, you own your contributions but give us a license to run them. Just play nice and don't break anything on the server.",
  },
  [Tone.LaidBack]: {
    tone: Tone.LaidBack,
    emoji: "🪵",
    vibe: "Cozy & Untroubled Vibe",
    description: "Simplest possible explanations. No dramatic alerts of high risks. Best suited for indie tools and creative portfolios.",
    sample: "Hey, we designed this code to save everyone time. Keep in mind there are no guarantees, and we're not liable if something falls over.",
  },
  [Tone.DeadpoolCool]: {
    tone: Tone.DeadpoolCool,
    emoji: "💀",
    vibe: "Snarky legally-oriented cool",
    description: "Sarcastic, fourth-wall breaking and self-aware smartass tone. Retains total legal correctness but is delightfully disrespectful and direct.",
    sample: "We aren't liable if your code catches fire. Standard warranty disclaimer rules apply here—don't count on us to fix your server or your life.",
  },
};

interface DocToneGlossaryProps {
  onSelectDoc?: (doc: DocumentType) => void;
  onSelectTone?: (tone: Tone) => void;
  currentDoc?: DocumentType;
  currentTone?: Tone;
}

export function DocToneGlossary({ onSelectDoc, onSelectTone, currentDoc, currentTone }: DocToneGlossaryProps) {
  const [activeTab, setActiveTab] = useState<"docs" | "tones">("docs");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredDocs = useMemo(() => {
    const list = Object.values(DOCUMENT_DESCRIPTIONS);
    if (!searchQuery) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (d) =>
        d.type.toLowerCase().includes(q) ||
        d.shortDesc.toLowerCase().includes(q) ||
        d.scope.toLowerCase().includes(q) ||
        d.bestFor.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const filteredTones = useMemo(() => {
    const list = Object.values(TONE_DESCRIPTIONS);
    if (!searchQuery) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (t) =>
        t.tone.toLowerCase().includes(q) ||
        t.vibe.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  return (
    <div className="space-y-4">
      {/* Header Tabs */}
      <div className="flex items-center justify-between border-b border-brand-border/20 pb-2">
        <div className="flex gap-4">
          <button
            onClick={() => {
              setActiveTab("docs");
              setSearchQuery("");
            }}
            className={`text-[9.5px] font-mono font-bold uppercase tracking-widest pb-1 border-b-2 transition-all ${
              activeTab === "docs"
                ? "text-brand-accent border-brand-accent"
                : "text-brand-muted hover:text-white border-transparent"
            }`}
          >
            DOCUMENT ATLAS ({Object.keys(DOCUMENT_DESCRIPTIONS).length})
          </button>
          <button
            onClick={() => {
              setActiveTab("tones");
              setSearchQuery("");
            }}
            className={`text-[9.5px] font-mono font-bold uppercase tracking-widest pb-1 border-b-2 transition-all ${
              activeTab === "tones"
                ? "text-brand-accent border-brand-accent"
                : "text-brand-muted hover:text-white border-transparent"
            }`}
          >
            ATTITUDE MODES ({Object.keys(TONE_DESCRIPTIONS).length})
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-brand-muted/40" />
        <Input
          placeholder={activeTab === "docs" ? "Search legal classes..." : "Search behavior vibes..."}
          className="pl-8 h-8 bg-black/40 border-brand-border text-[10px] font-mono rounded placeholder:text-brand-muted/30 focus-visible:ring-1 focus-visible:ring-brand-accent/30"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-brand-muted/60 hover:text-white"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Scrollable grid info cards */}
      <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin custom-scrollbar">
        {activeTab === "docs" ? (
          filteredDocs.length === 0 ? (
            <div className="text-[9.5px] font-mono text-brand-muted/40 p-4 text-center">
              No matching document classes found.
            </div>
          ) : (
            filteredDocs.map((item) => {
              const isSelected = currentDoc === item.type;
              return (
                <div
                  key={item.type}
                  className={`p-3 rounded border transition-all duration-300 text-left cursor-pointer ${
                    isSelected
                      ? "bg-brand-accent/5 border-brand-accent"
                      : "bg-black/30 border-brand-border/40 hover:border-brand-border"
                  }`}
                  onClick={() => onSelectDoc?.(item.type)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[10px] font-bold font-mono text-white flex items-center gap-1.5">
                      <FileText className={`w-3.5 h-3.5 ${isSelected ? "text-brand-accent" : "text-brand-muted"}`} />
                      {item.type}
                    </span>
                    <span className={`text-[7px] uppercase font-mono tracking-widest px-1.5 py-0.5 rounded border ${item.colorClass}`}>
                      {item.rating}
                    </span>
                  </div>
                  <p className="text-[9px] font-serif italic text-brand-muted/60 mt-1 leading-normal">
                    {item.shortDesc} — {item.scope}
                  </p>
                  <p className="text-[8px] font-mono text-brand-muted/30 uppercase mt-2">
                    DEPLOY: <span className="text-white/60">{item.bestFor}</span>
                  </p>
                  {onSelectDoc && (
                    <div className="mt-2 flex justify-end">
                      <span className={`text-[8px] font-mono uppercase tracking-wider flex items-center gap-1 ${
                        isSelected ? "text-brand-accent font-bold" : "text-brand-muted/40 hover:text-white/60"
                      }`}>
                        {isSelected ? (
                          <>
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            Active Model
                          </>
                        ) : (
                          <>
                            Deploy Parameter
                            <ArrowRight className="w-2.5 h-2.5" />
                          </>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          )
        ) : filteredTones.length === 0 ? (
          <div className="text-[9.5px] font-mono text-brand-muted/40 p-4 text-center">
            No matching behavior vibes found.
          </div>
        ) : (
          filteredTones.map((item) => {
            const isSelected = currentTone === item.tone;
            return (
              <div
                key={item.tone}
                className={`p-3 rounded border transition-all duration-300 text-left cursor-pointer ${
                  isSelected
                    ? "bg-brand-accent/5 border-brand-accent"
                    : "bg-black/30 border-brand-border/40 hover:border-brand-border"
                }`}
                onClick={() => onSelectTone?.(item.tone)}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] font-bold font-mono text-white flex items-center gap-1.5">
                    <span className="text-sm leading-none shrink-0">{item.emoji}</span>
                    {item.tone}
                  </span>
                  <span className="text-[8px] font-mono text-brand-accent uppercase tracking-widest bg-brand-accent/10 border border-brand-accent/20 px-1.5 py-0.5 rounded">
                    {item.vibe}
                  </span>
                </div>
                <p className="text-[9px] font-serif italic text-brand-muted/60 mt-1 leading-normal">
                  {item.description}
                </p>
                <div className="p-2 rounded bg-black/60 border border-brand-border/20 mt-2">
                  <p className="text-[8px] font-mono uppercase tracking-widest text-brand-muted/30">SAMPLE CLAUSE OUTPUT:</p>
                  <p className="text-[9px] font-mono text-brand-muted/80 mt-1 italic tracking-normal">
                    &ldquo;{item.sample}&rdquo;
                  </p>
                </div>
                {onSelectTone && (
                  <div className="mt-2 flex justify-end">
                    <span className={`text-[8px] font-mono uppercase tracking-wider flex items-center gap-1 ${
                      isSelected ? "text-brand-accent font-bold" : "text-brand-muted/40 hover:text-white/60"
                    }`}>
                      {isSelected ? (
                        <>
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          Selected Tone
                        </>
                      ) : (
                        <>
                          Apply Tone Mode
                          <ArrowRight className="w-2.5 h-2.5" />
                        </>
                      )}
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
