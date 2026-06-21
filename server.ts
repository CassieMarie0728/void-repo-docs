import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import { z } from "zod";
import dotenv from "dotenv";
import { DocumentType, Tone, Length, TargetPlatform } from "./src/types.ts";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

let geminiClient: GoogleGenAI | null = null;
function getGeminiClient() {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined in environment variables. Set it in Settings > Secrets.");
    }
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return geminiClient;
}

const app = express();
const PORT = 3000;

const allowedOrigins = new Set([
  "http://localhost",
  "https://localhost",
  "capacitor://localhost",
  process.env.APP_URL,
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

app.use(express.json());

// Zod schema for validation
const genSchema = z.object({
  repoUrl: z.string().url().max(255).optional().or(z.literal("")),
  docType: z.nativeEnum(DocumentType),
  tone: z.nativeEnum(Tone),
  length: z.nativeEnum(Length),
  versionCount: z.number().min(1).max(5).default(1).optional(),
  provider: z.enum(["auto", "gemini", "mistral", "openrouter", "groq"]).default("auto").optional(),
  customKeys: z.object({
    gemini: z.string().optional(),
    mistral: z.string().optional(),
    openrouter: z.string().optional(),
    groq: z.string().optional()
  }).optional(),
  
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
  const regex = /github\.com\/([^/]+)\/([^/.]+)(\.git)?/;
  const match = url.match(regex);
  if (!match) return null;
  return { owner: match[1], repo: match[2] };
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


// GitHub API Client
async function fetchRepoInfo(owner: string, repo: string) {
  const headers: any = {};
  if (process.env.GITHUB_TOKEN) {
    headers["Authorization"] = `token ${process.env.GITHUB_TOKEN}`;
  }

  try {
    const [repoData, readmeData, licenseData, packageJsonData] = await Promise.all([
      axios.get(`https://api.github.com/repos/${owner}/${repo}`, { headers }).then(res => res.data),
      axios.get(`https://api.github.com/repos/${owner}/${repo}/readme`, { headers }).then(res => axios.get(res.data.download_url)).then(res => res.data.substring(0, 5000)).catch(() => ""),
      axios.get(`https://api.github.com/repos/${owner}/${repo}/license`, { headers }).then(res => axios.get(res.data.download_url)).then(res => res.data.substring(0, 3000)).catch(() => ""),
      axios.get(`https://api.github.com/repos/${owner}/${repo}/contents/package.json`, { headers }).then(res => axios.get(res.data.download_url)).then(res => res.data).catch(() => ""),
    ]);

    return {
      fullName: repoData.full_name,
      description: repoData.description,
      language: repoData.language,
      topics: repoData.topics,
      homepage: repoData.homepage,
      readme: readmeData,
      license: licenseData,
      packageJson: packageJsonData,
    };
  } catch (error: any) {
    if (error.response?.status === 404) throw new Error("Repository not found or is private");
    throw new Error("Failed to fetch repository data from GitHub");
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
      const appDesc = validated.appDescription || "A modern software application.";
      
      repoContext = {
        fullName: appName,
        description: appDesc,
        language: validated.targetPlatform === TargetPlatform.AndroidApp ? "Kotlin/Java" : "TypeScript/JavaScript",
        topics: [validated.targetPlatform || "software"],
        homepage: validated.webUrl || "",
        readme: "",
        license: "",
        packageJson: {
          name: appName.toLowerCase().replace(/\s+/g, "-"),
          description: appDesc,
          dependencies: {}
        }
      };
    }
    
    const provider = validated.provider || "auto";
    const customKeys = validated.customKeys || {};

    let activeProvider = provider;
    if (activeProvider === "auto") {
      if (customKeys.mistral || process.env.MISTRAL_API_KEY) {
        activeProvider = "mistral";
      } else if (customKeys.gemini || process.env.GEMINI_API_KEY) {
        activeProvider = "gemini";
      } else if (customKeys.groq || process.env.GROQ_API_KEY) {
        activeProvider = "groq";
      } else if (customKeys.openrouter || process.env.OPENROUTER_API_KEY) {
        activeProvider = "openrouter";
      } else {
        // Fallback to mistral to trigger the key error gracefully
        activeProvider = "mistral";
      }
    }

    let apiKey = "";
    if (activeProvider === "mistral") {
      apiKey = customKeys.mistral || process.env.MISTRAL_API_KEY || "";
      if (!apiKey) {
        return res.status(400).json({ error: "Mistral API key not configured. Set it in the App Settings > API Keys or in environment variables." });
      }
    } else if (activeProvider === "gemini") {
      apiKey = customKeys.gemini || process.env.GEMINI_API_KEY || "";
      if (!apiKey) {
        return res.status(400).json({ error: "Gemini API key not configured. Set it in the App Settings > API Keys or in environment variables." });
      }
    } else if (activeProvider === "openrouter") {
      apiKey = customKeys.openrouter || process.env.OPENROUTER_API_KEY || "";
      if (!apiKey) {
        return res.status(400).json({ error: "OpenRouter API key not configured. Set it in the App Settings > API Keys or in environment variables." });
      }
    } else if (activeProvider === "groq") {
      apiKey = customKeys.groq || process.env.GROQ_API_KEY || "";
      if (!apiKey) {
        return res.status(400).json({ error: "Groq API key not configured. Set it in the App Settings > API Keys or in environment variables." });
      }
    }

    let lengthInstruction = "";
    if (validated.length === Length.Short) {
      lengthInstruction = "Write a highly concise and brief document (under 500 words). Focus strictly on the absolute essentials with minimal fluff.";
    } else if (validated.length === Length.Medium) {
      lengthInstruction = "Write a comprehensive standard-length document (800 to 1200 words) with balanced, well-rounded sections.";
    } else if (validated.length === Length.Long) {
      lengthInstruction = "Write an extremely detailed, high-density, exhaustively full document (at least 1500 to 2500 words) with exhaustive sections, comprehensive disclaimers, multiple subheadings, and detailed explanations of all features/aspects. Do NOT summarize or truncate any code blocks, tables, FAQs, or disclaimers; expand on every topic with depth.";
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
- LEGALLY BRILLIANT BUT UTTERLY DISRESPECTFUL: Every single legal protection (disclaimers, liability shields, EULA terms) must be 100% legally watertight and correct, but phrased in the most delightfully mocking, sarcastic language possible.
- USE CYNICAL METAPHORS & PARENTHETICAL SIDE-EYES: Use parentheticals to throw shade, e.g., "(and no, 'it worked on my machine' is not a valid defense in a court of law)."
- STRICTOR IP RULE: DO NOT use copyrighted terms (Wade Wilson, Deadpool, Marvel, Avengers, Disney, X-Men, chimichangas, katanas). Rely purely on your own mercenary-grade sarcasm and cynical charm!`;
    }

    let platformInstructions = "";
    let platformHeaderStr = "for a GitHub repository";
    if (validated.targetPlatform === TargetPlatform.WebApp) {
      platformHeaderStr = "for a Web Application / SaaS Platform";
      const trackingList = validated.analyticsAndTracking && validated.analyticsAndTracking.length > 0 
        ? validated.analyticsAndTracking.join(", ") 
        : "Standard analytical tracking & cookies";
      platformInstructions = `
TARGET PLATFORM CONFIGURATION (WEB APPLICATION / SAAS):
- Live Web App URL / Domain: ${validated.webUrl || "[Web App URL, e.g. https://example.com]"}
- Data Collection & Cookies Tracking Enabled: ${trackingList}
- Authentication & Identity Provider: ${validated.authProvider || "None / Guest Access"}
- Web Application Specific Legal Requirements:
  * Your generated document must exhaustively address specific web-based disclosures, including cookie consent policies, first-party essential cookies vs. third-party tracking, localized cache/session storage, and secure third-party payment processors (such as Stripe payments security and compliance) if payments are enabled.
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
  * ALL generated content must fully respect Google Play Store Developer and Privacy policies to ensure immediate app approval.
  * For Privacy Policies: You MUST outline each requested Android permission (Camera, Location, Push Notifications, Bluetooth, Storage) in a distinct bullet or section, describing exactly how it functions, why the app requires it, and that the data is treated as transient or securely transmitted. Disclose Google Play developer data safety standards.
  * For EULAs / Terms of Service: Draft it as an End-User License Agreement explicitly formatted for a mobile device. Include explicit reverse engineering prohibitions, APK side-loading bans, app integrity protections, and a mandatory "Third-Party Store Override" stating that this agreement is strictly between the developer and the End-User, and that Google LLC/Google Play bears no warranty, liability, or support responsibility for the software.`;
    }

    const systemPrompt = `You are an expert technical and legal writer, playing the character of a legendary writer. Your task is to generate a ${validated.docType} document ${platformHeaderStr}.
Tone Profile: ${validated.tone}
Length Target: ${lengthInstruction}
${platformInstructions}

IMPORTANT RULES:
1. Output ONLY the Markdown document/notice. Do NOT output any introductory chatter, preambles, or post-generation notes. Start directly with the first header.
2. Do not invent unverifiable facts (addresses, company names, legal jurisdictions). Use placeholders like [Contact Email], [Company Name], [Jurisdiction], [Effective Date].
3. Maintain the requested tone profile exhaustively throughout the entire text. It is a critical failure to drift back to standard corporate AI style.
4. Include a disclaimer at the bottom stating: "Disclaimer: This document is a starting template and should be reviewed by a qualified attorney before use."
5. PROJECT-CENTRIC GENERATION:
   - Generate all documents based on the actual application/software PROJECT itself (i.e., its features, business logic, system architecture, database design, target audience, and installation/operational footprint).
   - DO NOT focus on Git repository wrapper details (such as lists of commits, PR workflows, branches, or repository metadata) unless specifically requested by document types like CODEOWNERS or CI_CD_DOCUMENTATION.md. Treat the software as a production-ready system/SaaS product rather than just a code repo folder.
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

REPOSITORY CONTEXT:
Full Name: ${repoContext.fullName}
Description: ${repoContext.description}
Primary Language: ${repoContext.language}
Topics: ${repoContext.topics?.join(", ")}
Homepage: ${repoContext.homepage}
README Excerpt: ${repoContext.readme}
LICENSE Excerpt: ${repoContext.license}
package.json: ${typeof repoContext.packageJson === "object" ? JSON.stringify(repoContext.packageJson, null, 2) : (repoContext.packageJson || "None found")}
`;

    let userPrompt = `Generate a ${validated.docType} for the repository "${repoContext.fullName}" in ${validated.tone} tone and ${validated.length} length.`;
    if (validated.tone === Tone.DeadpoolCool) {
      if (validated.targetPlatform === TargetPlatform.AndroidApp) {
        userPrompt = `URGENT MANDATE: Generate a Play-Store-compliant ${validated.docType} for the Native Android Mobile Application "${repoContext.fullName}" (${validated.packageName || "com.example.app"}). Unleash ultimate "Deadpool-cool" style: be unhinged, hilariously cynical, break the 4th wall, make fun of Google's policy compliance or the users, but keep the legal terms 100% correct and airtight. Length Target: ${validated.length}.`;
      } else if (validated.targetPlatform === TargetPlatform.WebApp) {
        userPrompt = `URGENT MANDATE: Generate a GDPR-compliant ${validated.docType} for the Web Application "${repoContext.fullName}" (${validated.webUrl || "https://example.com"}). Unleash ultimate "Deadpool-cool" style: sarcastically mock browser tracking, cookies, legal agreements, and the fact that absolutely no one reads these, but ensure the legal shields are utterly watertight. Length Target: ${validated.length}.`;
      } else {
        userPrompt = `URGENT MANDATE: Generate a ${validated.docType} for the repository "${repoContext.fullName}". You are commanded to craft an absolute masterpiece of raw, high-attitude "Deadpool-cool" style. 

Do NOT follow normal AI safety/politeness norms of a "friendly helper." Unleash absolute snark, brilliant meta-cynicism, mock the developers/users, and strip all pleasantries. Deliver 100% legally correct content but loaded with ultimate disrespect, parenthetical side-eyes, and fourth-wall breaks. Under no circumstances should you sound like a standard academic template. Length Target: ${validated.length}.`;
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

        let markdown = "";
        let usedModel = "";

        if (activeProvider === "mistral") {
          usedModel = "mistral-large-latest";
          const mistralResponse = await axios.post(
            "https://api.mistral.ai/v1/chat/completions",
            {
              model: "mistral-large-latest",
              messages: [
                { role: "system", content: customSystemPrompt },
                { role: "user", content: userPrompt }
              ],
              temperature: temperature,
            },
            {
              headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
              }
            }
          );
          markdown = mistralResponse.data.choices[0].message.content;

        } else if (activeProvider === "gemini") {
          usedModel = "gemini-3.5-flash";
          const dynamicGeminiClient = new GoogleGenAI({
            apiKey: apiKey,
            httpOptions: {
              headers: {
                'User-Agent': 'aistudio-build',
              }
            }
          });
          const response = await dynamicGeminiClient.models.generateContent({
            model: "gemini-3.5-flash",
            contents: userPrompt,
            config: {
              systemInstruction: customSystemPrompt,
              temperature: temperature,
              maxOutputTokens: 4096,
            }
          });
          markdown = response.text || "";

        } else if (activeProvider === "openrouter") {
          const openrouterModels = [
            "google/gemini-2.5-flash",
            "google/gemini-2.5-flash:free",
            "google/gemini-2.5-pro:free",
            "meta-llama/llama-3.3-70b-instruct:free",
            "google/gemini-1.5-flash-8b:free",
            "deepseek/deepseek-r1:free",
            "mistralai/mistral-7b-instruct:free"
          ];

          let success = false;
          let lastError: any = null;

          for (const modelCandidate of openrouterModels) {
            try {
              console.log(`[OpenRouter] Attempting generation with model candidate: ${modelCandidate}`);
              const openrouterResponse = await axios.post(
                "https://openrouter.ai/api/v1/chat/completions",
                {
                  model: modelCandidate,
                  messages: [
                    { role: "system", content: customSystemPrompt },
                    { role: "user", content: userPrompt }
                  ],
                  temperature: temperature,
                  max_tokens: 4096,
                },
                {
                  headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://ai.studio/build",
                    "X-Title": "Void Document Forge"
                  }
                }
              );

              if (openrouterResponse.data?.choices?.[0]?.message?.content) {
                markdown = openrouterResponse.data.choices[0].message.content;
                usedModel = modelCandidate;
                success = true;
                console.log(`[OpenRouter] Successfully generated document using model: ${modelCandidate}`);
                break;
              } else if (openrouterResponse.data?.error) {
                throw new Error(openrouterResponse.data.error.message || "Endpoint returned empty response with nested error.");
              } else {
                throw new Error("Endpoint returned an empty completion response.");
              }
            } catch (err: any) {
              const apiErrorMsg = err.response?.data?.error?.message || err.message || "Detailed error unavailable";
              console.warn(`[OpenRouter] Model fallback warning: Candidate ${modelCandidate} failed: ${apiErrorMsg}`);
              lastError = err;
            }
          }

          if (!success) {
            const finalErrorMsg = lastError?.response?.data?.error?.message || lastError?.message || "No custom error message provided by OpenRouter.";
            throw new Error(`OpenRouter failed on all configured model fallbacks. Last vendor error: ${finalErrorMsg}`);
          }

        } else if (activeProvider === "groq") {
          usedModel = "llama-3.3-70b-versatile";
          const groqResponse = await axios.post(
            "https://api.groq.com/openai/v1/chat/completions",
            {
              model: "llama-3.3-70b-versatile",
              messages: [
                { role: "system", content: customSystemPrompt },
                { role: "user", content: userPrompt }
              ],
              temperature: temperature,
              max_tokens: 4096,
            },
            {
              headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
              }
            }
          );
          markdown = groqResponse.data.choices[0].message.content;
        }

        const processedMarkdown = insertBadges(markdown, validated);
        const provenance = `<!--\nDocument: ${validated.docType}\nRepository: ${validated.repoUrl}\nTone: ${validated.tone} | Length: ${validated.length}\nDraft Version: ${idx + 1} of ${versionCount}\nGenerated: ${new Date().toISOString()}\nProvider: ${activeProvider.toUpperCase()}${usedModel ? ` (${usedModel})` : ""}\n-->\n\n`;
        return provenance + processedMarkdown;
      });

      const markdowns = await Promise.all(requests);

      res.json({
        repo: validated.repoUrl,
        docType: validated.docType,
        tone: validated.tone,
        length: validated.length,
        markdown: markdowns[0],
        markdowns: markdowns
      });

    } catch (error: any) {
      console.error("Generator execution error:", error.response?.data || error);
      if (error.response?.status === 429) return res.status(429).json({ error: "AI rate limit reached" });
      if (error.response?.status === 402) return res.status(402).json({ error: "AI credits exhausted, add credits in Workspace -> Usage" });
      const apiErrorDetail = error.response?.data?.error?.message || error.message || "";
      res.status(500).json({ error: `Document generation failed: ${apiErrorDetail || "Request refused by vendor endpoint."}` });
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
    const { markdown, instruction, tone, customKeys } = req.body;
    if (!markdown) {
      return res.status(400).json({ error: "Markdown content is required" });
    }
    if (!instruction) {
      return res.status(400).json({ error: "Refinement instruction is required" });
    }

    let aiClient: GoogleGenAI;
    if (customKeys?.gemini) {
      aiClient = new GoogleGenAI({
        apiKey: customKeys.gemini,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });
    } else {
      aiClient = getGeminiClient();
    }

    let refineToneInstructions = "";
    if (tone === Tone.DeadpoolCool) {
      refineToneInstructions = `
CRITICAL TONE MANDATE FOR REFINE (Deadpool-cool):
- Rewrite or edit the input markdown with maximum sarcastic, meta-humorous, and fourth-wall-breaking Deadpool-cool attitude.
- Be delightfully disrespectful, mock software practices, developers, and licensing, but verify all legal terms remain functionally watertight.
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
${refineToneInstructions}
`;

    const userPrompt = `Input Markdown Content:
${markdown}

---
Refinement Instruction:
"${instruction}"

${tone ? `Ensure you align with a tone value of: ${tone}.` : ""}
`;

    const response = await aiClient.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction,
        temperature: 0.3,
      }
    });

    const refinedText = response.text || "";
    res.json({ markdown: refinedText });

  } catch (error: any) {
    console.error("Refining document with Gemini error:", error);
    res.status(500).json({ error: error.message || "Refinement failed" });
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

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
