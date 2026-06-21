export enum DocumentType {
  PrivacyPolicy = "Privacy Policy",
  TermsOfService = "Terms of Service",
  ApiAgreement = "API Agreement",
  SecurityPolicy = "Security Policy",
  CodeOfConduct = "Code of Conduct",
  ContributingGuidelines = "Contributing Guidelines",
  AcceptableUsePolicy = "Acceptable Use Policy",
  License = "LICENSE",
  Readme = "README",
  Eula = "End User License Agreement (EULA)",
  Dpa = "Data Processing Agreement (DPA)",
  Nda = "Non-Disclosure Agreement (NDA)",
  Sla = "Service Level Agreement (SLA)",
  CookiePolicy = "Cookie Policy",
  Disclaimer = "Disclaimer",
  Acknowledgments = "ACKNOWLEDGMENTS.md",
  AiTxt = "ai.txt",
  ApiDocumentation = "API_DOCUMENTATION.md",
  Architecture = "ARCHITECTURE.md",
  Contributors = "AUTHORS / CONTRIBUTORS",
  Benchmarks = "BENCHMARKS.md",
  BiasAndFairness = "BIAS_AND_FAIRNESS.md",
  Changelog = "CHANGELOG.md",
  CiCdDocumentation = "CI_CD_DOCUMENTATION.md",
  Citations = "CITATIONS.cff",
  CodeNav = "codenav.json",
  Codeowners = "CODEOWNERS",
  Configuration = "CONFIGURATION.md",
  Conventions = "CONVENTIONS.md",
  DatasetCard = "DATASET_CARD.md",
  Deployment = "DEPLOYMENT.md",
  Development = "DEVELOPMENT.md",
  EthicsPolicy = "ETHICS_POLICY.md",
  Evaluation = "EVALUATION.md",
  Examples = "EXAMPLES/",
  Faq = "FAQ.md",
  Funding = "FUNDING.yml",
  GettingStarted = "GETTING_STARTED.md",
  Glossary = "GLOSSARY.md",
  Governance = "GOVERNANCE.md",
  Inference = "INFERENCE.md",
  Install = "INSTALL.md",
  LlmsTxt = "llms-txt",
  ModelCard = "MODEL_CARD.md",
  PromptEngineering = "PROMPT_ENGINEERING.md",
  ReleaseProcess = "RELEASE_PROCESS.md",
  Roadmap = "ROADMAP.md",
  Support = "SUPPORT.md",
  Testing = "TESTING.md",
  Training = "TRAINING.md",
  Troubleshooting = "TROUBLESHOOTING.md",
  Tutorials = "TUTORIALS.md",
  TypesSchema = "types.d.ts / schema.graphql",
  Upgrading = "UPGRADING.md"
}

export enum TargetPlatform {
  GithubRepo = "github_repo",
  WebApp = "web_app",
  AndroidApp = "android_app"
}

export enum Tone {
  Formal = "Formal",
  Professional = "Professional",
  Friendly = "Friendly",
  Casual = "Casual",
  LaidBack = "Laid-back",
  DeadpoolCool = "Deadpool-cool"
}

export enum Length {
  Short = "short",
  Medium = "medium",
  Long = "long"
}

export type ProviderType = "auto" | "gemini" | "mistral" | "openrouter" | "groq";

export interface CustomApiKeys {
  gemini?: string;
  mistral?: string;
  openrouter?: string;
  groq?: string;
}

export interface BadgeSettings {
  buildStatus?: boolean;
  licenseType?: boolean;
  latestVersion?: boolean;
  githubStars?: boolean;
  githubIssues?: boolean;
  sarcasmLevel?: boolean;
  bugCount?: boolean;
  deadpoolApproved?: boolean;
}

export interface GenRequest {
  repoUrl?: string;
  docType: DocumentType;
  tone: Tone;
  length: Length;
  versionCount?: number;
  provider?: ProviderType;
  customKeys?: CustomApiKeys;

  // Target Platform Settings
  targetPlatform?: TargetPlatform;
  appName?: string;
  appDescription?: string;

  // Web App specific properties
  webUrl?: string;
  analyticsAndTracking?: string[];
  authProvider?: string;

  // Android App specific properties
  packageName?: string;
  androidPermissions?: string[];
  monetizationServices?: string[];

  // Automated Badge Inserter Settings
  badgeSettings?: BadgeSettings;
}

export interface GenResponse {
  repo: string;
  docType: string;
  tone: string;
  length: string;
  markdown: string;
  markdowns?: string[];
}
