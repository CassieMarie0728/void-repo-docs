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
  Disclaimer = "Disclaimer"
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
}

export interface GenResponse {
  repo: string;
  docType: string;
  tone: string;
  length: string;
  markdown: string;
  markdowns?: string[];
}
