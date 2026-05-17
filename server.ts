import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import { z } from "zod";
import dotenv from "dotenv";
import { DocumentType, Tone, Length } from "./src/types.ts";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Zod schema for validation
const genSchema = z.object({
  repoUrl: z.string().url().max(255),
  docType: z.nativeEnum(DocumentType),
  tone: z.nativeEnum(Tone),
  length: z.nativeEnum(Length),
});

// Helper to extract owner and repo from URL
function parseGitHubUrl(url: string) {
  const regex = /github\.com\/([^/]+)\/([^/.]+)(\.git)?/;
  const match = url.match(regex);
  if (!match) return null;
  return { owner: match[1], repo: match[2] };
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
    const githubInfo = parseGitHubUrl(validated.repoUrl);
    if (!githubInfo) {
      return res.status(400).json({ error: "Invalid GitHub URL" });
    }

    const repoContext = await fetchRepoInfo(githubInfo.owner, githubInfo.repo);
    
    if (!process.env.MISTRAL_API_KEY) {
      return res.status(500).json({ error: "Mistral API key not configured" });
    }

    const systemPrompt = `You are an expert technical and legal writer. Your task is to generate a ${validated.docType} document for a GitHub repository.
Tone: ${validated.tone}
Length: ${validated.length}

IMPORTANT RULES:
1. Output ONLY the Markdown document.
2. Do not invent unverifiable facts (addresses, company names, legal jurisdictions). Use placeholders like [Contact Email], [Company Name], [Jurisdiction], [Effective Date].
3. Maintain the requested tone. 
4. Include a disclaimer at the bottom stating: "Disclaimer: This document is a starting template and should be reviewed by a qualified attorney before use."

TONE INSTRUCTIONS (Deadpool-cool):
- Be snarky, fourth-wall-aware, sarcastic, and irreverent.
- Sharp dry humor.
- NO mention of Deadpool, Wade Wilson, Marvel, Avengers, X-Men, chimichangas, katanas, or any copyrighted IP.
- Be a legally competent smartass.

REPOSITORY CONTEXT:
Full Name: ${repoContext.fullName}
Description: ${repoContext.description}
Primary Language: ${repoContext.language}
Topics: ${repoContext.topics?.join(", ")}
Homepage: ${repoContext.homepage}
README Excerpt: ${repoContext.readme}
LICENSE Excerpt: ${repoContext.license}
package.json: ${repoContext.packageJson}
`;

    const userPrompt = `Generate a ${validated.docType} for the repository "${repoContext.fullName}" in ${validated.tone} tone and ${validated.length} length.`;

    try {
      const mistralResponse = await axios.post(
        "https://api.mistral.ai/v1/chat/completions",
        {
          model: "mistral-large-latest",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          temperature: 0.5,
        },
        {
          headers: {
            "Authorization": `Bearer ${process.env.MISTRAL_API_KEY}`,
            "Content-Type": "application/json"
          }
        }
      );

      const markdown = mistralResponse.data.choices[0].message.content;
      const provenance = `<!--\nDocument: ${validated.docType}\nRepository: ${validated.repoUrl}\nTone: ${validated.tone} | Length: ${validated.length}\nGenerated: ${new Date().toISOString()}\n-->\n\n`;

      res.json({
        repo: validated.repoUrl,
        docType: validated.docType,
        tone: validated.tone,
        length: validated.length,
        markdown: provenance + markdown
      });

    } catch (error: any) {
      if (error.response?.status === 429) return res.status(429).json({ error: "AI rate limit reached" });
      if (error.response?.status === 402) return res.status(402).json({ error: "AI credits exhausted, add credits in Workspace -> Usage" });
      res.status(500).json({ error: "Document generation failed" });
    }

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid input parameters" });
    }
    res.status(500).json({ error: error.message || "An unexpected error occurred" });
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
