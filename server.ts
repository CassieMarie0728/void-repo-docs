import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import { z } from "zod";
import dotenv from "dotenv";
import { DocumentType, Tone, Length } from "./src/types.ts";
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

app.post("/api/refine", async (req, res) => {
  try {
    const { markdown, instruction, tone } = req.body;
    if (!markdown) {
      return res.status(400).json({ error: "Markdown content is required" });
    }
    if (!instruction) {
      return res.status(400).json({ error: "Refinement instruction is required" });
    }

    const aiClient = getGeminiClient();

    const systemInstruction = `You are Void's AI Refiner, an elite legal writer, technical writer, and markdown formatting advisor.
Your job is to rewrite, refine, or edit the user's provided markdown according to their instructions.

CRITICAL LAWS:
1. Maintain the general context, document type, and legal integrity of the document.
2. Return ONLY the refined raw markdown document itself.
3. DO NOT wrap the markdown inside triple-backtick markdown blocks (\`\`\`markdown) since this goes directly into a markdown editor. Keep the output as pure, valid raw markdown text.
4. Do NOT output introductory chatter, explanations, summaries ("Here is your refined document", "I have updated the clauses"), or conversational footnotes. Under no circumstances should you talk outside the document text itself.
5. If the document has a disclaimer at the bottom, preserve it.
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
