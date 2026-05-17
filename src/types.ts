export enum DocumentType {
  PrivacyPolicy = "Privacy Policy",
  TermsOfService = "Terms of Service",
  ApiAgreement = "API Agreement",
  SecurityPolicy = "Security Policy",
  CodeOfConduct = "Code of Conduct",
  ContributingGuidelines = "Contributing Guidelines",
  AcceptableUsePolicy = "Acceptable Use Policy",
  License = "LICENSE",
  Readme = "README"
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

export interface GenRequest {
  repoUrl: string;
  docType: DocumentType;
  tone: Tone;
  length: Length;
}

export interface GenResponse {
  repo: string;
  docType: string;
  tone: string;
  length: string;
  markdown: string;
}
