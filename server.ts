import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import { z } from "zod";
import dotenv from "dotenv";
import { DocumentType, Tone, Length, TargetPlatform } from "./src/types.ts";
import { AIError, routingSchema } from "./server/ai.ts";
import { fetchRepoInfo } from "./server/repository.ts";
import { GROUNDING_RULES, evidencePrompt, groundedComplete } from "./server/grounding.ts";

dotenv.config();

export const app = express();
const PORT = Number(process.env.PORT) || 3000;

const allowedOrigins = new Set([
  "http://localhost",
  "https://localhost",
  "capacitor://localhost",
  process.env.APP_URL,
  process.env.RENDER_EXTERNAL_URL,
].filter((origin): origin is string => Boolean(origin)));

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.has(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Vary", "Origin");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  }

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => res.json({ status: "ok", app: "VOID Repo Docs" }));
app.use("/api", (req, res, next) => {
  const token = process.env.VOID_API_TOKEN;
  if (token && req.headers.authorization !== `Bearer ${token}`) {
    return res.status(401).json({ error: "A valid VOID server access token is required." });
  }
  next();
});
app.get("/api/ai/status", (_req, res) => res.json({
  app: "VOID Repo Docs",
  primary: "openrouter",
  model: process.env.OPENROUTER_MODEL || "openrouter/free",
  outputTokenLimit: Number(process.env.AI_MAX_TOKENS) || 16384,
  cloudProviders: ["mistral", "groq", "openrouter"].filter(name => Boolean(process.env[`${name.toUpperCase()}_API_KEY`])),
  cloudFallbackDefault: false,
}));

// Zod schema for validation
const genSchema = z.object({
  repoUrl: z.string().url().max(255).optional().or(z.literal("")),
  docType: z.nativeEnum(DocumentType),
  tone: z.nativeEnum(Tone),
  length: z.nativeEnum(Length),
  versionCount: z.number().int().min(1).max(5).default(1).optional(),
  ...routingSchema.shape,

  // Custom Target Platform & Manual Inputs
  targetPlatform: z.nativeEnum(TargetPlatform).optional(),
  appName: z.string().max(100).optional(),
  appDescription: z.string().max(1000).optional(),
  webUrl: z.string().url().max(255).optional().or(z.literal("")),
  analyticsAndTracking: z.array(z.string()).optional(),
  authProvider: z.string().max(50).optional(),
  packageName: z.string().max(100).optional(),
  androidPermissions: z.array(z.string()).optional(),
  monetizationServices: z.array(z.string()).optional(),

  // Automated Badge Inserter Settings
  badgeSettings: z.object({
    buildStatus: z.boolean().optional(),
    licenseType: z.boolean().optional(),
    latestVersion: z.boolean().optional(),
    githubStars: z.boolean().optional(),
    githubIssues: z.boolean().optional(),
    sarcasmLevel: z.boolean().optional(),
    bugCount: z.boolean().optional(),
    deadpoolApproved: z.boolean().optional()
  }).optional()
});

// Helper to extract owner and repo from URL
function parseGitHubUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "github.com" || parsed.protocol !== "https:") return null;
    const [owner, name] = parsed.pathname.split("/").filter(Boolean);
    const repo = name?.replace(/\.git$/, "");
    if (!owner || !repo || !/^[\w.-]+$/.test(owner) || !/^[\w.-]+$/.test(repo) || [".", ".."].includes(repo)) return null;
    return { owner, repo };
  } catch { return null; }
}

// Helper to insert active badges into generated README documents
function insertBadges(markdown: string, validated: any): string {
  // Only apply to README documents
  if (validated.docType !== DocumentType.Readme) {
    return markdown;
  }

  const settings = validated.badgeSettings;
  if (!settings) return markdown;

  // Check if any badge is enabled
  const {
    buildStatus,
    licenseType,
    latestVersion,
    githubStars,
    githubIssues,
    sarcasmLevel,
    bugCount,
    deadpoolApproved
  } = settings;

  const hasAny = buildStatus || licenseType || latestVersion || githubStars || githubIssues || sarcasmLevel || bugCount || deadpoolApproved;
  if (!hasAny) return markdown;

  const githubInfo = validated.repoUrl ? parseGitHubUrl(validated.repoUrl) : null;
  const owner = githubInfo?.owner || "owner";
  const repo = githubInfo?.repo || "repo";

  const badgesList: string[] = [];

  if (buildStatus) {
    if (githubInfo) {
      badgesList.push(`[![Build Status](https://img.shields.io/github/actions/workflow/status/${owner}/${repo}/ci.yml?branch=main&style=flat-square)](https://github.com/${owner}/${repo}/actions)`);
    } else {
      badgesList.push(`[![Build Status](https://img.shields.io/badge/build-passing-brightgreen?style=flat-square)](#)`);
    }
  }

  if (licenseType) {
    if (githubInfo) {
      badgesList.push(`[![License](https://img.shields.io/github/license/${owner}/${repo}?style=flat-square)](https://github.com/${owner}/${repo})`);
    } else {
      badgesList.push(`[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](#)`);
    }
  }

  if (latestVersion) {
    if (githubInfo) {
      badgesList.push(`[![Latest Version](https://img.shields.io/github/v/release/${owner}/${repo}?style=flat-square)](https://github.com/${owner}/${repo}/releases)`);
    } else {
      badgesList.push(`[![Latest Version](https://img.shields.io/badge/version-1.0.0-orange?style=flat-square)](#)`);
    }
  }

  if (githubStars && githubInfo) {
    badgesList.push(`[![GitHub Stars](https://img.shields.io/github/stars/${owner}/${repo}?style=flat-square)](https://github.com/${owner}/${repo}/stargazers)`);
  }

  if (githubIssues && githubInfo) {
    badgesList.push(`[![GitHub Issues](https://img.shields.io/github/issues/${owner}/${repo}?style=flat-square)](https://github.com/${owner}/${repo}/issues)`);
  }

  if (sarcasmLevel) {
    badgesList.push(`[![Sarcasm Level](https://img.shields.io/badge/sarcasm-100%25-ff69b4?style=flat-square)](#)`);
  }

  if (bugCount) {
    badgesList.push(`[![Bug Count](https://img.shields.io/badge/bugs-uncountable-critical?style=flat-square)](#)`);
  }

  if (deadpoolApproved) {
    badgesList.push(`[![Deadpool Approved](https://img.shields.io/badge/deadpool-approved-red?style=flat-square)](#)`);
  }

  if (badgesList.length === 0) return markdown;

  const badgesMarkdown = badgesList.join(" ");

  // Find the first markdown header line to insert below it
  const lines = markdown.split("\n");
  let headerIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith("# ")) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex !== -1) {
    // Insert after the title header line
    lines.splice(headerIndex + 1, 0, "", badgesMarkdown);
    return lines.join("\n");
  } else {
    // Prepend if no H1 is found
    return badgesMarkdown + "\n\n" + markdown;
  }
}


app.post("/api/generate", async (req, res) => {
  try {
    const validated = genSchema.parse(req.body);
    
    const isGithubPlatform = !validated.targetPlatform || validated.targetPlatform === TargetPlatform.GithubRepo;
    if (isGithubPlatform && (!validated.repoUrl || !parseGitHubUrl(validated.repoUrl))) {
      return res.status(400).json({ error: "A valid GitHub URL is required for standard Repository documents." });
    }

    if (!isGithubPlatform && !validated.appName) {
      return res.status(400).json({ error: "App Name is required for Web and Android applications." });
    }

    let repoContext: any = null;
    const githubInfo = validated.repoUrl ? parseGitHubUrl(validated.repoUrl) : null;
    
    if (githubInfo) {
      try {
        repoContext = await fetchRepoInfo(githubInfo.owner, githubInfo.repo);
      } catch (err: any) {
        if (!isGithubPlatform && validated.appName) {
          console.warn("GitHub fetch failed, falling back to manual app details:", err.message);
        } else {
          return res.status(400).json({ error: err.message || "Failed to fetch GitHub repository data." });
        }
      }
    }

    if (!repoContext) {
      const appName = validated.appName || "Void Application";
      const appDesc = validated.appDescription || "Description not supplied.";
      
      repoContext = {
        fullName: appName,
        description: appDesc,
        language: "Not supplied; do not infer a language from the target platform",
        topics: [validated.targetPlatform || "software"],
        homepage: validated.webUrl || "",
        sources: [],
        evidenceNotes: ["Manual app details only. No repository files were supplied; implementation, versions, commands, and schemas are unverified."]
      };
    }
    
    let lengthInstruction = "";
    if (validated.length === Length.Short) {
      lengthInstruction = "Write a highly concise and brief document (under 500 words). Focus strictly on the absolute essentials with minimal fluff.";
    } else if (validated.length === Length.Medium) {
      lengthInstruction = "Write a comprehensive standard-length document (800 to 1200 words) with balanced, well-rounded sections.";
    } else if (validated.length === Length.Long) {
      lengthInstruction = "Write a detailed, complete document of 1500 to 2500 words. Stay within 2500 words. Cover all relevant sections, legal protections, and practical explanations thoroughly within that budget. Use code blocks, tables, and FAQs only where relevant, and always finish every section and the final disclaimer. Avoid repetition and padding.";
    }

    let toneInstructions = "";
    if (validated.tone === Tone.Formal) {
      toneInstructions = `TONE INSTRUCTIONS (Formal):
- Write with absolute academic precision, authoritative wording, and a highly traditional structure.
- Use advanced terminology (e.g., "hereinafter", "pursuant to") and maintain absolute distance.
- Strictly avoid casual words, contractions, jargon, or conversational tone.`;
    } else if (validated.tone === Tone.Professional) {
      toneInstructions = `TONE INSTRUCTIONS (Professional):
- Build a polished, direct, clear, and corporate-ready document.
- Sound business-intelligent, constructive, and highly legible. Perfect for standard developer tools or enterprise software.
- Avoid both academic stuffiness and overly laid-back colloquialisms.`;
    } else if (validated.tone === Tone.Friendly) {
      toneInstructions = `TONE INSTRUCTIONS (Friendly):
- Sound incredibly warm, helpful, collaborative, and encouraging.
- Focus on fostering goodwill and guiding contributors or users safely with trust and kindness.
- Make scary warnings feel conversational, positive, and reassuring.`;
    } else if (validated.tone === Tone.Casual) {
      toneInstructions = `TONE INSTRUCTIONS (Casual):
- Write in a clean, everyday conversational style.
- Use natural expressions and direct, jargon-free explanations, as if typing a quick message to a developer peer.`;
    } else if (validated.tone === Tone.LaidBack) {
      toneInstructions = `TONE INSTRUCTIONS (Laid-back):
- Be extremely relaxed, cozy, and stress-free. Let things slide.
- Simplify all standard warning labels and legalese. Present information with low-stress, good-natured vibes.`;
    } else if (validated.tone === Tone.DeadpoolCool) {
      toneInstructions = `TONE INSTRUCTIONS (Deadpool-cool):
- YOU ARE AN ABSOLUTELY UNHINGED, DELIGHTFULLY SARCASTIC, TECH-SAVVY LEGAL MERCENARY playing the character of a legendary writer.
- TRASH THE TRADITIONAL "AI ASSISTANT" PERSONA: Drop all friendly, polite, repetitive, or helpful chatter. Be an active smartass.
- BREAK THE FOURTH WALL: Talk directly to the reader/user with high-density cynicism and meta-humor. E.g., "Look, we both know you're not details-oriented enough to read this, but let's pretend..." or "(because apparently, reading is hard)."
- INJECT BITING DEV/SYSADMIN SARCASM: Mock the repository, the software world, tech bugs, or packagebloat in a highly specific way. Reference current tech absurdities (e.g., "npm installing half the observable universe," "relying on StackOverflow copypasta," "git pushing directly to main because you enjoy chaos").
- SPECIFIC REPO COMEDY: Dynamically mock the specific details of this repo (its language, files, or packages). Be incredibly witty and precise.
- LEGALLY BRILLIANT BUT UTTERLY DISRESPECTFUL: Preserve legally coherent protections (disclaimers, liability shields, EULA terms); never claim guaranteed enforceability, but phrased in the most delightfully mocking, sarcastic language possible.
- USE CYNICAL METAPHORS & PARENTHETICAL SIDE-EYES: Use parentheticals to throw shade, e.g., "(and no, 'it worked on my machine' is not a valid defense in a court of law)."
- STRICTOR IP RULE: DO NOT use copyrighted terms (Wade Wilson, Deadpool, Marvel, Avengers, Disney, X-Men, chimichangas, katanas). Rely purely on your own mercenary-grade sarcasm and cynical charm!`;
    }

    let platformInstructions = "";
    let platformHeaderStr = "for a GitHub repository";
    if (validated.targetPlatform === TargetPlatform.WebApp) {
      platformHeaderStr = "for a Web Application / SaaS Platform";
      const trackingList = validated.analyticsAndTracking && validated.analyticsAndTracking.length > 0 
        ? validated.analyticsAndTracking.join(", ") 
        : "None specified; do not assume analytics, tracking, or nonessential cookies";
      platformInstructions = `
TARGET PLATFORM CONFIGURATION (WEB APPLICATION / SAAS):
- Live Web App URL / Domain: ${validated.webUrl || "[Web App URL, e.g. https://example.com]"}
- Data Collection & Cookies Tracking Enabled: ${trackingList}
- Authentication & Identity Provider: ${validated.authProvider || "None / Guest Access"}
- Web Application Specific Legal Requirements:
  * Address web disclosures only for supplied practices and services. Distinguish known essential storage, analytics, and payment integrations from unknowns. Use placeholders for unknown consent, retention, sharing, or security practices; do not imply Stripe or tracking is active merely because the target is a web app.
  * For Web/SaaS Terms of Service, explicitly cover cloud hosting capacity limits, registration credentials safety, account deletion/termination clauses, and clear Acceptable Use Policies (banning scrapers, automated crawlers, database spamming, and reverse proxies).`;
    } else if (validated.targetPlatform === TargetPlatform.AndroidApp) {
      platformHeaderStr = "for a Native Android Mobile Application destined for release on the Google Play Store";
      const permissionsList = validated.androidPermissions && validated.androidPermissions.length > 0 
        ? validated.androidPermissions.join(", ") 
        : "None specified";
      const monetizationList = validated.monetizationServices && validated.monetizationServices.length > 0 
        ? validated.monetizationServices.join(", ") 
        : "None specified";
      platformInstructions = `
TARGET PLATFORM CONFIGURATION (NATIVE ANDROID MOBILE APP):
- Mobile App Package Name: ${validated.packageName || "[Package Name, e.g. com.company.app]"}
- Android App Device Permissions Required: ${permissionsList}
- Integrated SDK & Third-Party Monetization: ${monetizationList}
- Android/Google Play Compliance Requirements:
  * Draft clear disclosures based on the supplied permissions and services. Do not promise store approval or claim policy compliance has been independently verified.
  * For Privacy Policies: Address only explicitly supplied permissions and services. Do not add Camera, Location, Storage, or other permissions merely because this is an Android app. Mark unknown collection, retention, security, and sharing practices as placeholders; do not invent assurances about transient processing or secure transmission.
  * For EULAs / Terms of Service: Draft it as an End-User License Agreement explicitly formatted for a mobile device. Include explicit reverse engineering prohibitions, APK side-loading bans, app integrity protections, and a mandatory "Third-Party Store Override" stating that this agreement is strictly between the developer and the End-User, and that Google LLC/Google Play bears no warranty, liability, or support responsibility for the software.`;
    }

    const systemPrompt = `You are an expert technical and legal writer, playing the character of a legendary writer. Your task is to generate a ${validated.docType} document ${platformHeaderStr}.
Tone Profile: ${validated.tone}
Length Target: ${lengthInstruction}

${GROUNDING_RULES}

${platformInstructions}

IMPORTANT RULES:
1. Output ONLY the Markdown document/notice. Do NOT output any introductory chatter, preambles, or post-generation notes. Start directly with the first header.
2. Do not invent unverifiable facts (addresses, company names, legal jurisdictions). Use placeholders like [Contact Email], [Company Name], [Jurisdiction], [Effective Date].
3. Maintain the requested tone profile exhaustively throughout the entire text. It is a critical failure to drift back to standard corporate AI style.
4. Include a disclaimer at the bottom stating: "Disclaimer: This document is a starting template and should be reviewed by a qualified attorney before use."
5. PROJECT-CENTRIC GENERATION:
   - Generate all documents based on the actual application/software PROJECT itself (i.e., its features, business logic, system architecture, database design, target audience, and installation/operational footprint).
   - DO NOT focus on Git repository wrapper details (such as lists of commits, PR workflows, branches, or repository metadata) unless specifically requested by document types like CODEOWNERS or CI_CD_DOCUMENTATION.md. Describe the actual software and its observed development/deployment state. Do not assume it is production-ready.
6. DYNAMIC RELEVANCY AUDITING (CRITICAL ENFORCEMENT):
   - Before generating the requested document, perform a strict relevancy check of the requested document type ("${validated.docType}") against the REPOSITORY/APP CONTEXT.
   - If the requested document type is NOT structurally relevant to the actual project (for example, requesting a 'MODEL_CARD.md', 'BIAS_AND_FAIRNESS.md', 'DATASET_CARD.md', 'TRAINING.md', 'EVALUATION.md', 'PROMPT_ENGINEERING.md', or 'INFERENCE.md' for a project that has absolutely NO machine learning, AI, LLMs, neural networks, or data science features; or requesting a 'CITATIONS.cff' for a standard commercial or consumer app with no academic/research background), YOU MUST NOT make up or hallucinate a fake document with dummy metrics or fictional training configurations.
   - INSTEAD of a hallucinated document, you MUST generate a "Document Relevancy Notice" explaining clearly why this document type is not relevant to their current project.
   - This notice MUST be generated in the EXACT requested tone ("${validated.tone}"):
     * For Deadpool-cool: Make it highly sarcastic, breaking the fourth wall, hilariously mocking the request (e.g., asking why they want AI model training logs or academic citations for a standard web app, database, or API), while still explaining wittily what projects actually need this document.
     * For Formal/Professional: Issue a structured, highly dignified, respectful business notice notifying the developer that their project lacks AI model components or academic research metrics, and explaining what criteria would necessitate this document.
     * For Friendly/Casual/Laid-back: Issue a warm, cozy, or clear friendly notice explaining that this document is not applicable to the current codebase and why, and inviting them to add features that would make it meaningful.
   - The output for an irrelevant document MUST start with a clear main markdown header like "# Document Relevancy Notice: ${validated.docType}" or equivalent. Do NOT output any introductory chatter or post-generation notes.

${toneInstructions}

${evidencePrompt(repoContext)}
`;

    let userPrompt = `Generate a ${validated.docType} for the repository "${repoContext.fullName}" in ${validated.tone} tone and ${validated.length} length.`;
    if (validated.tone === Tone.DeadpoolCool) {
      if (validated.targetPlatform === TargetPlatform.AndroidApp) {
        userPrompt = `URGENT MANDATE: Generate a mobile-app ${validated.docType} draft for the Native Android Mobile Application "${repoContext.fullName}" (${validated.packageName || "com.example.app"}). Unleash ultimate "Deadpool-cool" style: be unhinged, hilariously cynical, break the 4th wall, make fun of Google's policy compliance or the users, but keep the legal terms coherent and do not claim verified compliance. Length Target: ${validated.length}.`;
      } else if (validated.targetPlatform === TargetPlatform.WebApp) {
        userPrompt = `URGENT MANDATE: Generate a web-app ${validated.docType} draft for the Web Application "${repoContext.fullName}" (${validated.webUrl || "https://example.com"}). Unleash ultimate "Deadpool-cool" style: sarcastically mock browser tracking, cookies, legal agreements, and the fact that absolutely no one reads these, but keep the legal terms coherent without claiming guaranteed enforceability. Length Target: ${validated.length}.`;
      } else {
        userPrompt = `URGENT MANDATE: Generate a ${validated.docType} for the repository "${repoContext.fullName}". You are commanded to craft an absolute masterpiece of raw, high-attitude "Deadpool-cool" style. 

Unleash sharp snark, brilliant meta-cynicism, and fourth-wall breaks. Keep every technical claim tied to supplied evidence and preserve legally coherent draft terms. Humor must never fabricate repository facts. Under no circumstances should you sound like a standard academic template. Length Target: ${validated.length}.`;
      }
    } else if (validated.targetPlatform === TargetPlatform.AndroidApp || validated.targetPlatform === TargetPlatform.WebApp) {
      userPrompt = `Generate a ${validated.docType} for the application "${repoContext.fullName}" (Target Context: ${validated.targetPlatform === TargetPlatform.AndroidApp ? "Android Play Store app" : "Web app"}). Match this target context carefully in the generated document structure. Length Target: ${validated.length}.`;
    }

    const versionCount = validated.versionCount || 1;
    const temps = validated.tone === Tone.DeadpoolCool 
      ? [0.85, 0.95, 0.8, 0.9, 1.0] 
      : [0.5, 0.7, 0.3, 0.6, 0.8];
    const variationProfile = [
      "", // Standard variation
      "Focus on being very verbose, comprehensive, and detailed, leaving absolutely no potential edge cases unaddressed.",
      "Focus on a clean, concise, modern formulation of the agreement clauses—extremely readable, direct, and straightforward.",
      "Focus on strong legal shields, strict liability disclaimers, and rigorous developer safeguarding terms.",
      "Focus on modern software engineering contexts, with robust descriptions of telemetry tracking, cookie compliance, and API integrations."
    ];

    try {
      const requests = Array.from({ length: versionCount }).map(async (_, idx) => {
        const temperature = temps[idx] || 0.5;
        const focus = variationProfile[idx] || "";
        const customSystemPrompt = systemPrompt + (focus ? `\n\nVARIATION PROFILE (Draft ${idx + 1}):\n${focus}` : "");

        const { markdown, provider: activeProvider, model: usedModel } = await groundedComplete(
          validated, repoContext, customSystemPrompt, userPrompt, temperature,
        );

        const processedMarkdown = insertBadges(markdown, validated);
        const provenance = `<!--\nEvidence snapshot: ${repoContext.revision || "manual inputs only"}\nEvidence files: ${(repoContext.sources || []).map((source: { path: string }) => source.path).join(", ")}\nDocument: ${validated.docType}\nRepository: ${validated.repoUrl}\nTone: ${validated.tone} | Length: ${validated.length}\nDraft Version: ${idx + 1} of ${versionCount}\nGenerated: ${new Date().toISOString()}\nProvider: ${activeProvider.toUpperCase()}${usedModel ? ` (${usedModel})` : ""}\n-->\n\n`;
        return provenance + processedMarkdown;
      });

      const markdowns = await Promise.all(requests);

      res.json({
        repo: validated.repoUrl,
        evidenceRepoUrl: repoContext.revision ? validated.repoUrl || "" : "",
        docType: validated.docType,
        tone: validated.tone,
        length: validated.length,
        markdown: markdowns[0],
        markdowns: markdowns
      });

    } catch (error: any) {
      console.error("Document generation failed.");
      res.status(error instanceof AIError ? error.status : 500).json({
        error: error instanceof AIError ? error.message : "Document generation failed.",
      });
    }

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid input parameters" });
    }
    res.status(500).json({ error: error.message || "An unexpected error occurred" });
  }
});

app.post("/api/refine", async (req, res) => {
  try {
    const validated = routingSchema.extend({
      markdown: z.string().min(1).max(500000),
      instruction: z.string().min(1).max(10000),
      tone: z.nativeEnum(Tone).optional(),
      repoUrl: z.string().url().max(255).optional().or(z.literal("")),
    }).parse(req.body);
    const { markdown, instruction, tone } = validated;

    let evidence = { fullName: "Existing draft", sources: [], evidenceNotes: ["Only the draft and user instructions are available. Draft claims have not been independently verified."] } as import("./server/repository.ts").RepositoryContext;
    if (validated.repoUrl) {
      const repository = parseGitHubUrl(validated.repoUrl);
      if (!repository) return res.status(400).json({ error: "A valid GitHub repository URL is required for evidence-based refinement." });
      try { evidence = await fetchRepoInfo(repository.owner, repository.repo); }
      catch { return res.status(400).json({ error: "Repository evidence could not be loaded for refinement. Try again later." }); }
    }

    let refineToneInstructions = "";
    if (tone === Tone.DeadpoolCool) {
      refineToneInstructions = `
CRITICAL TONE MANDATE FOR REFINE (Deadpool-cool):
- Rewrite or edit the input markdown with maximum sarcastic, meta-humorous, and fourth-wall-breaking Deadpool-cool attitude.
- Be delightfully disrespectful about software practices, developers, and licensing while preserving legally coherent draft terms. Do not claim guaranteed enforceability.
- Use witty annotations, cynical analogies, and parenthetical side-eyes.
- Drop all generic AI politeness or normal template phrasing. No boring prose or academic safety pads!
- DO NOT use copyrighted names (No "Deadpool", "Marvel", "Avengers", "Wade Wilson", "chimichangas", etc.). Maintain your own unique, high-octane snark.`;
    }

    const systemInstruction = `You are Void's AI Refiner, playing the character of an elite technical/legal writer and a masterful markdown advisor.
Your job is to rewrite, refine, or edit the user's provided markdown according to their instructions.

CRITICAL LAWS:
1. Maintain the general context, document type, and legal integrity of the document.
2. Return ONLY the refined raw markdown document itself.
3. DO NOT wrap the markdown inside triple-backtick markdown blocks (\`\`\`markdown) since this goes directly into a markdown editor. Keep the output as pure, valid raw markdown text.
4. Do NOT output introductory chatter, explanations, summaries ("Here is your refined document", "I have updated the clauses"), or conversational footnotes. Under no circumstances should you talk outside the document text itself.
5. If the document has a disclaimer at the bottom, preserve it.
${GROUNDING_RULES}
${refineToneInstructions}
${evidencePrompt(evidence)}
`;

    const userPrompt = `Input Markdown Content:
${markdown}

---
Refinement Instruction:
"${instruction}"

${tone ? `Ensure you align with a tone value of: ${tone}.` : ""}
`;

    const result = await groundedComplete(validated, evidence, systemInstruction, userPrompt, 0.3);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid refinement parameters." });
    res.status(error instanceof AIError ? error.status : 500).json({
      error: error instanceof AIError ? error.message : "Refinement failed.",
    });
  }
});

function parseMarkdownToNotionBlocks(md: string): any[] {
  const lines = md.split("\n");
  const blocks: any[] = [];
  let inCodeBlock = false;
  let codeContent: string[] = [];
  let codeLang = "plain text";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimLine = line.trim();

    // Code blocks
    if (trimLine.startsWith("```")) {
      if (inCodeBlock) {
        // End of code block
        blocks.push({
          object: "block",
          type: "code",
          code: {
            rich_text: [{ type: "text", text: { content: codeContent.join("\n") } }],
            language: codeLang
          }
        });
        inCodeBlock = false;
        codeContent = [];
      } else {
        // Start of code block
        inCodeBlock = true;
        const langMatch = trimLine.slice(3).trim();
        codeLang = langMatch || "plain text";
        // Map common languages to Notion standard
        const supportedLangs = ["javascript", "typescript", "python", "html", "css", "sql", "shell", "json", "markdown", "yaml"];
        if (!supportedLangs.includes(codeLang.toLowerCase())) {
          codeLang = "plain text";
        }
      }
      continue;
    }

    if (inCodeBlock) {
      codeContent.push(line);
      continue;
    }

    // Empty lines
    if (trimLine === "") {
      continue;
    }

    // Heading 1
    if (line.startsWith("# ")) {
      blocks.push({
        object: "block",
        type: "heading_1",
        heading_1: {
          rich_text: [{ type: "text", text: { content: line.slice(2).trim() } }]
        }
      });
      continue;
    }

    // Heading 2
    if (line.startsWith("## ")) {
      blocks.push({
        object: "block",
        type: "heading_2",
        heading_2: {
          rich_text: [{ type: "text", text: { content: line.slice(3).trim() } }]
        }
      });
      continue;
    }

    // Heading 3
    if (line.startsWith("### ")) {
      blocks.push({
        object: "block",
        type: "heading_3",
        heading_3: {
          rich_text: [{ type: "text", text: { content: line.slice(4).trim() } }]
        }
      });
      continue;
    }

    // Blockquote
    if (line.startsWith(">")) {
      blocks.push({
        object: "block",
        type: "quote",
        quote: {
          rich_text: [{ type: "text", text: { content: line.replace(/^>\s*/, "").trim() } }]
        }
      });
      continue;
    }

    // Bulleted list item
    if (trimLine.startsWith("- ") || trimLine.startsWith("* ") || trimLine.startsWith("+ ")) {
      blocks.push({
        object: "block",
        type: "bulleted_list_item",
        bulleted_list_item: {
          rich_text: [{ type: "text", text: { content: trimLine.slice(2).trim() } }]
        }
      });
      continue;
    }

    // Numbered list item
    const numMatch = trimLine.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      blocks.push({
        object: "block",
        type: "numbered_list_item",
        numbered_list_item: {
          rich_text: [{ type: "text", text: { content: numMatch[2].trim() } }]
        }
      });
      continue;
    }

    // Paragraph
    blocks.push({
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [{ type: "text", text: { content: line.trim() } }]
      }
    });
  }

  if (inCodeBlock && codeContent.length > 0) {
    blocks.push({
      object: "block",
      type: "code",
      code: {
        rich_text: [{ type: "text", text: { content: codeContent.join("\n") } }],
        language: codeLang
      }
    });
  }

  return blocks.slice(0, 95);
}

app.post("/api/export-notion", async (req, res) => {
  try {
    const { token, parentPageId, title, markdown } = req.body;
    if (!token) {
      return res.status(400).json({ error: "Notion Integration Token (API Key) is required." });
    }
    if (!parentPageId) {
      return res.status(400).json({ error: "Target Notion Parent Page ID is required." });
    }
    if (!markdown) {
      return res.status(400).json({ error: "No markdown content to export." });
    }

    const cleanedPageId = parentPageId.replace(/-/g, "").trim();

    const blocks = parseMarkdownToNotionBlocks(markdown);

    const body = {
      parent: { page_id: cleanedPageId },
      properties: {
        title: [
          {
            text: { content: title || "Exported Document" }
          }
        ]
      },
      children: blocks
    };

    const response = await axios.post("https://api.notion.com/v1/pages", body, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28"
      }
    });

    if (response.data && response.data.url) {
      return res.json({ success: true, url: response.data.url });
    } else {
      return res.json({ success: true, url: `https://notion.so/${cleanedPageId}` });
    }

  } catch (error: any) {
    console.error("Notion Export Endpoint Error:", error.response?.data || error);
    const detail = error.response?.data?.message || error.message || "Export failed.";
    return res.status(500).json({ error: `Notion API Refused Integration: ${detail}` });
  }
});

app.use("/api", (_req, res) => res.status(404).json({ error: "Unknown API route." }));

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist/client");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

if (process.env.NODE_ENV !== "test") startServer();
