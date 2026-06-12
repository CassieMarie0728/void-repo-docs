import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  GitBranch,
  FileText,
  Type, 
  Ruler, 
  Download, 
  Copy, 
  Check, 
  Loader2, 
  Skull,
  Scroll,
  History,
  Ghost,
  Cpu,
  Terminal,
  ExternalLink,
  ShieldAlert,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Eye,
  EyeOff,
  Columns,
  Sparkles,
  Wrench,
  Undo2,
  SpellCheck,
  ChevronRight,
  Settings,
  ArrowLeftRight,
  ShieldCheck,
  Layers
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast, Toaster } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { DocumentType, Tone, Length, TargetPlatform, GenRequest, GenResponse } from "./types";
import { apiClient } from "./api";
import { NotionExportDialog } from "./components/NotionExportDialog";
import { DiffViewer } from "./components/DiffViewer";
import { ComplianceAudit } from "./components/ComplianceAudit";
import { DocToneGlossary, DOCUMENT_DESCRIPTIONS, TONE_DESCRIPTIONS } from "./components/DocToneGlossary";

const documentTypes = [...Object.values(DocumentType)].sort((a, b) => a.localeCompare(b));
const tones = Object.values(Tone);
const lengths = Object.values(Length);

const getWordCount = (markdown: string): number => {
  if (!markdown) return 0;
  const textWithoutComments = markdown.replace(/<!--[\s\S]*?-->/g, "");
  const words = textWithoutComments
    .replace(/[#*`_~\-[\]()|]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(word => word.length > 0);
  return words.length;
};

const extractPlaceholders = (text: string): string[] => {
  if (!text) return [];
  const regex = /\[([A-Za-z0-9\s_\-@\.]+?)\]/g;
  const matches: string[] = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    const name = match[1].trim();
    if (
      name.length > 2 && 
      name.length < 40 && 
      !matches.includes(name) && 
      !/^[0-9]+$/.test(name)
    ) {
      if (!name.startsWith("http") && !name.startsWith("www") && !name.includes("#")) {
        matches.push(name);
      }
    }
  }
  return matches.sort();
};

const getReplacedMarkdown = (rawMarkdown: string, replacements: Record<string, string>): string => {
  let resultText = rawMarkdown;
  Object.entries(replacements).forEach(([key, val]) => {
    if (val && val.trim() !== "") {
      const escapedKey = key.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`\\[${escapedKey}\\]`, 'g');
      resultText = resultText.replaceAll(regex, val);
    }
  });
  return resultText;
};

const formatMarkdownTables = (text: string): string => {
  const lines = text.split("\n");
  let inTable = false;
  let tableLines: string[] = [];
  const processedLines: string[] = [];

  const flushTable = (linesToFlush: string[]) => {
    if (linesToFlush.length === 0) return;
    const rows = linesToFlush.map(line => {
      const cells = line.split("|").map(c => c.trim());
      if (cells[0] === "") cells.shift();
      if (cells[cells.length - 1] === "") cells.pop();
      return cells;
    });

    if (rows.length < 2) {
      processedLines.push(...linesToFlush);
      return;
    }

    const colCount = Math.max(...rows.map(r => r.length));
    const colWidths = Array(colCount).fill(0);

    const isDelimiterRow = (rowCells: string[]) => {
      return rowCells.every(c => c.replace(/[\s\-:|]/g, '') === '');
    };

    rows.forEach((row, rowIndex) => {
      if (rowIndex === 1 && isDelimiterRow(row)) return;
      row.forEach((cell, colIndex) => {
        if (cell.length > colWidths[colIndex]) {
          colWidths[colIndex] = cell.length;
        }
      });
    });

    for (let c = 0; c < colCount; c++) {
      if (colWidths[c] < 3) colWidths[c] = 3;
    }

    const formatted: string[] = [];
    rows.forEach((row, rowIndex) => {
      if (rowIndex === 1 && isDelimiterRow(row)) {
        const delimCells = colWidths.map((w, colIdx) => {
          const originalDelim = row[colIdx] || "";
          const hasLeft = originalDelim.startsWith(":");
          const hasRight = originalDelim.endsWith(":");
          const middle = "-".repeat(w - (hasLeft ? 1 : 0) - (hasRight ? 1 : 0));
          return (hasLeft ? ":" : "") + middle + (hasRight ? ":" : "");
        });
        formatted.push("| " + delimCells.join(" | ") + " |");
      } else {
        const paddedCells = colWidths.map((w, colIdx) => {
          const cellVal = row[colIdx] || "";
          return cellVal + " ".repeat(w - cellVal.length);
        });
        formatted.push("| " + paddedCells.join(" | ") + " |");
      }
    });

    processedLines.push(...formatted);
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trim = line.trim();
    const isTableRow = trim.startsWith("|") && trim.endsWith("|");

    if (isTableRow) {
      if (!inTable) {
        inTable = true;
      }
      tableLines.push(line);
    } else {
      if (inTable) {
        flushTable(tableLines);
        tableLines = [];
        inTable = false;
      }
      processedLines.push(line);
    }
  }

  if (inTable) {
    flushTable(tableLines);
  }

  return processedLines.join("\n");
};

const cleanMarkdownSpacing = (text: string): string => {
  if (!text) return "";
  let formatted = text;
  formatted = formatted.replace(/\n{3,}/g, "\n\n");
  formatted = formatted.replace(/([^\n])\n*(#{1,6}\s+[^\n]+)/g, "$1\n\n$2");
  const splitted = formatted.split("\n");
  const mapped = splitted.map(l => l.trimEnd());
  return mapped.join("\n");
};

export default function App() {
  const [repoUrl, setRepoUrl] = useState("");
  const [provider, setProvider] = useState<"auto" | "gemini" | "mistral" | "openrouter" | "groq">("auto");
  const [customKeys, setCustomKeys] = useState<{
    gemini: string;
    mistral: string;
    openrouter: string;
    groq: string;
  }>(() => {
    try {
      const stored = localStorage.getItem("void_custom_keys");
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          gemini: parsed.gemini || "",
          mistral: parsed.mistral || "",
          openrouter: parsed.openrouter || "",
          groq: parsed.groq || ""
        };
      }
    } catch (e) {
      console.error(e);
    }
    return { gemini: "", mistral: "", openrouter: "", groq: "" };
  });
  const [showSecretKeys, setShowSecretKeys] = useState<Record<string, boolean>>({});

  useEffect(() => {
    localStorage.setItem("void_custom_keys", JSON.stringify(customKeys));
  }, [customKeys]);

  useEffect(() => {
    const savedProvider = localStorage.getItem("void_selected_provider");
    if (savedProvider) {
      setProvider(savedProvider as any);
    }
  }, []);

  const handleProviderChange = (newProvider: any) => {
    setProvider(newProvider);
    localStorage.setItem("void_selected_provider", newProvider);
  };
  const [docType, setDocType] = useState<DocumentType>(DocumentType.Readme);
  const [targetPlatform, setTargetPlatform] = useState<TargetPlatform>(TargetPlatform.GithubRepo);
  const [appName, setAppName] = useState("");
  const [appDescription, setAppDescription] = useState("");
  const [webUrl, setWebUrl] = useState("");
  const [analyticsAndTracking, setAnalyticsAndTracking] = useState<string[]>([]);
  const [authProvider, setAuthProvider] = useState("none");
  const [packageName, setPackageName] = useState("");
  const [androidPermissions, setAndroidPermissions] = useState<string[]>([]);
  const [monetizationServices, setMonetizationServices] = useState<string[]>([]);
  
  const [tone, setTone] = useState<Tone>(Tone.Professional);
  const [length, setLength] = useState<Length>(Length.Medium);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<GenResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [isMobileLayout, setIsMobileLayout] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches
  );
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(
    () => typeof window === "undefined" || !window.matchMedia("(max-width: 767px)").matches
  );
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(
    () => typeof window === "undefined" || !window.matchMedia("(max-width: 767px)").matches
  );

  // Live Editor & Auto-Save States
  const [editedMarkdown, setEditedMarkdown] = useState<string>("");
  const [originalMarkdown, setOriginalMarkdown] = useState<string>("");
  const [versionCount, setVersionCount] = useState<number>(1);
  const [versions, setVersions] = useState<string[]>([]);
  const [originalVersions, setOriginalVersions] = useState<string[]>([]);
  const [activeVersionIndex, setActiveVersionIndex] = useState<number>(0);
  const [viewMode, setViewMode] = useState<"preview" | "edit" | "split" | "diff">("preview");
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [confirmGenerate, setConfirmGenerate] = useState(false);
  const [textWrap, setTextWrap] = useState<boolean>(true);

  // AI Refinement & Formatting states
  const [rightActiveTab, setRightActiveTab] = useState<"config" | "refine" | "audit">("config");
  const [showGlossary, setShowGlossary] = useState(false);
  const [customInstruction, setCustomInstruction] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [placeholderReplacements, setPlaceholderReplacements] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const handleLayoutChange = (event: MediaQueryListEvent | MediaQueryList) => {
      setIsMobileLayout(event.matches);
      if (event.matches) {
        setIsLeftSidebarOpen(false);
        setIsRightSidebarOpen(false);
      }
    };

    handleLayoutChange(mediaQuery);
    mediaQuery.addEventListener("change", handleLayoutChange);
    return () => mediaQuery.removeEventListener("change", handleLayoutChange);
  }, []);

  const toggleLeftSidebar = () => {
    setIsLeftSidebarOpen((isOpen) => {
      const nextOpen = !isOpen;
      if (nextOpen && isMobileLayout) {
        setIsRightSidebarOpen(false);
      }
      return nextOpen;
    });
  };

  const toggleRightSidebar = () => {
    setIsRightSidebarOpen((isOpen) => {
      const nextOpen = !isOpen;
      if (nextOpen && isMobileLayout) {
        setIsLeftSidebarOpen(false);
      }
      return nextOpen;
    });
  };

  // Load previous draft on initial render
  useEffect(() => {
    const savedDraft = localStorage.getItem("void_editor_draft");
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        if (parsed && parsed.markdown) {
          setResult({
            repo: parsed.repoUrl || "",
            docType: parsed.docType || DocumentType.Readme,
            tone: parsed.tone || Tone.Professional,
            length: parsed.length || Length.Medium,
            markdown: parsed.markdown,
            markdowns: parsed.markdowns
          });
          
          if (parsed.markdowns && Array.isArray(parsed.markdowns)) {
            setVersions(parsed.markdowns);
            setOriginalVersions(parsed.originalVersions || parsed.markdowns);
            const idx = parsed.activeVersionIndex || 0;
            setActiveVersionIndex(idx);
            setEditedMarkdown(parsed.markdowns[idx]);
            setOriginalMarkdown((parsed.originalVersions || parsed.markdowns)[idx]);
          } else {
            setVersions([parsed.markdown]);
            setOriginalVersions([parsed.originalMarkdown || parsed.markdown]);
            setActiveVersionIndex(0);
            setEditedMarkdown(parsed.markdown);
            setOriginalMarkdown(parsed.originalMarkdown || parsed.markdown);
          }

          if (parsed.versionCount) {
            setVersionCount(parsed.versionCount);
          }

          if (parsed.repoUrl) setRepoUrl(parsed.repoUrl);
          if (parsed.docType) setDocType(parsed.docType);
          if (parsed.tone) setTone(parsed.tone);
          if (parsed.length) setLength(parsed.length);
          toast.success("Restored previous session's draft from local storage.");
        }
      } catch (e) {
        console.error("Failed to parse saved draft", e);
      }
    }
  }, []);

  // Synch active draft edited edits back to versions array
  useEffect(() => {
    if (editedMarkdown) {
      setVersions(prev => {
        if (!prev || prev.length === 0) return [editedMarkdown];
        if (prev[activeVersionIndex] === editedMarkdown) return prev;
        const copy = [...prev];
        copy[activeVersionIndex] = editedMarkdown;
        return copy;
      });
    }
  }, [editedMarkdown, activeVersionIndex]);

  // Debounced Auto-Save Mechanism
  useEffect(() => {
    if (!result || !editedMarkdown) return;

    // Direct comparison with existing stored draft to prevent saving duplicate runs
    const savedDraft = localStorage.getItem("void_editor_draft");
    let needsSave = true;
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        if (
          parsed && 
          parsed.markdown === editedMarkdown &&
          parsed.activeVersionIndex === activeVersionIndex &&
          JSON.stringify(parsed.markdowns) === JSON.stringify(versions)
        ) {
          needsSave = false;
        }
      } catch (e) {}
    }

    if (!needsSave) {
      setAutoSaveStatus("idle");
      return;
    }

    setAutoSaveStatus("saving");
    const timer = setTimeout(() => {
      localStorage.setItem("void_editor_draft", JSON.stringify({
        markdown: editedMarkdown,
        originalMarkdown,
        docType: result.docType,
        repoUrl,
        tone,
        length,
        versionCount,
        markdowns: versions,
        originalVersions: originalVersions,
        activeVersionIndex: activeVersionIndex
      }));
      setAutoSaveStatus("saved");

      const statusTimer = setTimeout(() => {
        setAutoSaveStatus("idle");
      }, 2000);
      return () => clearTimeout(statusTimer);
    }, 1000);

    return () => clearTimeout(timer);
  }, [editedMarkdown, originalMarkdown, result, repoUrl, tone, length, versionCount, versions, originalVersions, activeVersionIndex]);

  const pushHistory = (text: string) => {
    setHistory(prev => [...prev.slice(-9), text]); // Limit to last 10 states
  };

  const handleUndo = () => {
    if (history.length > 0) {
      const idx = history.length - 1;
      const previous = history[idx];
      setEditedMarkdown(previous);
      setHistory(prev => prev.slice(0, -1));
      toast.info("Reverted your last text transformation.");
    } else {
      toast.error("Nothing to undo in this session.");
    }
  };

  const handleRefine = async (instruction: string) => {
    if (!editedMarkdown) {
      toast.error("Can't refine empty vacuum. Generate a document first.");
      return;
    }
    const finalInstruction = instruction.trim();
    if (!finalInstruction) {
      toast.error("Instruct me first. I don't read your blank thoughts.");
      return;
    }

    pushHistory(editedMarkdown);
    setIsRefining(true);

    try {
      const response = await apiClient.post<{ markdown: string }>("/api/refine", {
        markdown: editedMarkdown,
        instruction: finalInstruction,
        tone: tone,
        customKeys,
      });

      if (response.data && response.data.markdown) {
        setEditedMarkdown(response.data.markdown);
        toast.success("Document refined successfully.");
      } else {
        toast.error("AI returned an empty response. Shocking, I know.");
      }
    } catch (error: any) {
      console.error(error);
      const message = error.response?.data?.error || "AI refinement suffered a failure. Try again.";
      toast.error(message);
    } finally {
      setIsRefining(false);
    }
  };

  const handleApplyFormatting = (type: "tables" | "spacing") => {
    if (!editedMarkdown) return;
    pushHistory(editedMarkdown);

    if (type === "tables") {
      const formatted = formatMarkdownTables(editedMarkdown);
      setEditedMarkdown(formatted);
      toast.success("Aligned all Markdown tables.");
    } else if (type === "spacing") {
      const formatted = cleanMarkdownSpacing(editedMarkdown);
      setEditedMarkdown(formatted);
      toast.success("Standardized spacing & corrected header layouts.");
    }
  };

  const handleSetPlaceholderValue = (placeholder: string, value: string) => {
    setPlaceholderReplacements(prev => ({
      ...prev,
      [placeholder]: value
    }));
  };

  // Reset overwrite confirmation whenever parameters change
  useEffect(() => {
    setConfirmGenerate(false);
  }, [repoUrl, docType, tone, length, targetPlatform, appName, appDescription, webUrl, analyticsAndTracking, authProvider, packageName, androidPermissions, monetizationServices]);

  const handleGenerate = async () => {
    const isGithubPlatform = targetPlatform === TargetPlatform.GithubRepo;
    if (isGithubPlatform && !repoUrl) {
      toast.error("Enter a repo URL, unless you want me to write documentation for your imaginary friends.");
      return;
    }

    if (!isGithubPlatform && !appName.trim()) {
      toast.error("Enter an App Name to identify your masterwork.");
      return;
    }

    if (result && editedMarkdown !== originalMarkdown && !confirmGenerate) {
      setConfirmGenerate(true);
      toast.warning("Generating a new document will OVERWRITE your local edits. Click FORGE again to proceed anyway.", {
        duration: 5000,
      });
      return;
    }

    setConfirmGenerate(false);
    setIsLoading(true);
    setResult(null);

    try {
      const response = await apiClient.post<GenResponse>("/api/generate", {
        repoUrl,
        docType,
        tone,
        length,
        versionCount,
        provider,
        customKeys,
        targetPlatform,
        appName,
        appDescription,
        webUrl,
        analyticsAndTracking,
        authProvider,
        packageName,
        androidPermissions,
        monetizationServices,
      } as GenRequest);
      
      const resultsArray = response.data.markdowns && Array.isArray(response.data.markdowns)
        ? response.data.markdowns
        : [response.data.markdown];

      setResult(response.data);
      setVersions(resultsArray);
      setOriginalVersions(resultsArray);
      setActiveVersionIndex(0);
      setEditedMarkdown(resultsArray[0]);
      setOriginalMarkdown(resultsArray[0]);

      // Save new version to local storage instantly
      localStorage.setItem("void_editor_draft", JSON.stringify({
        markdown: resultsArray[0],
        originalMarkdown: resultsArray[0],
        docType: response.data.docType,
        repoUrl,
        tone,
        length,
        versionCount,
        markdowns: resultsArray,
        originalVersions: resultsArray,
        activeVersionIndex: 0
      }));
      setAutoSaveStatus("saved");
      toast.success(versionCount > 1 
        ? `Successfully forged ${versionCount} diverse document drafts!` 
        : "I've finished your little document. Try not to break it."
      );
    } catch (error: any) {
      const message = error.response?.data?.error || "Even I couldn't summarize that mess.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchDraft = (newIndex: number) => {
    if (newIndex === activeVersionIndex) return;

    // Switch states
    setEditedMarkdown(versions[newIndex]);
    setOriginalMarkdown(originalVersions[newIndex]);
    setActiveVersionIndex(newIndex);

    // Reset local view history states for clean transition
    setHistory([]);

    toast.info(`Switched interface to Draft ${newIndex + 1}`);
  };

  const handleCopy = () => {
    const textToCopy = displayedMarkdown || (result ? result.markdown : "");
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Copied your edited version. Go spam someone else's repo.");
    }
  };

  const handleDownload = () => {
    const textToDownload = displayedMarkdown || (result ? result.markdown : "");
    if (textToDownload && result) {
      const blob = new Blob([textToDownload], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${result.docType.toLowerCase().replace(/\s+/g, "_")}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleDownloadDocx = () => {
    if (result) {
      const element = document.querySelector(".markdown-body");
      const htmlContent = element ? element.innerHTML : "";
      const docxHtml = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<style>
body { font-family: 'Courier New', Courier, monospace; line-height: 1.5; color: #111111; padding: 40px; }
h1, h2, h3, h4, h5, h6 { font-family: 'Special Elite', Georgia, serif; color: #981518; font-weight: bold; }
h1 { font-size: 20pt; margin-top: 24pt; margin-bottom: 12pt; border-bottom: 2px solid #981518; padding-bottom: 6pt; }
h2 { font-size: 16pt; margin-top: 18pt; margin-bottom: 9pt; }
h3 { font-size: 13pt; margin-top: 14pt; margin-bottom: 6pt; }
p { font-size: 10.5pt; margin-bottom: 10pt; text-align: justify; }
ul, ol { margin-top: 0; margin-bottom: 10pt; padding-left: 20pt; }
li { font-size: 10.5pt; margin-bottom: 4pt; }
blockquote { border-left: 4px solid #981518; padding-left: 12pt; margin: 12pt 0; color: #444444; font-style: italic; background-color: #fcfcfc; }
code { font-family: 'Courier New', monospace; background-color: #f4f4f4; padding: 2px 4px; font-size: 9.5pt; }
pre { font-family: 'Courier New', monospace; background-color: #f4f4f4; padding: 12pt; border: 1px solid #e0e0e0; font-size: 9.5pt; white-space: pre-wrap; margin-bottom: 12pt; }
a { color: #981518; text-decoration: underline; }
</style>
</head>
<body>
<div style="max-width: 600pt; margin: 0 auto;">
${htmlContent}
</div>
</body>
</html>`;
      const blob = new Blob([docxHtml], { type: "application/msword" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${result.docType.toLowerCase().replace(/\s+/g, "_")}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("DOCX package drafted. Try not to sign your life away.");
    }
  };

  const handleDownloadPdf = () => {
    if (!result) return;
    const element = document.querySelector(".markdown-body");
    if (!element) return;

    // 1. Clear any prior instance of the print target to keep DOM pristine
    const existing = document.getElementById("void-instant-print");
    if (existing) {
      existing.remove();
    }

    // 2. Spawn a specialized print container directly under body as a sibling of #root
    const printContainer = document.createElement("div");
    printContainer.id = "void-instant-print";
    printContainer.innerHTML = `
      <div class="markdown-body">
        ${element.innerHTML}
      </div>
    `;
    document.body.appendChild(printContainer);

    // 3. Advise the user about printer setup. If inside frames, tip them about the "open in new tab" flow
    toast.success("Preparing high-contrast document. Select 'Save as PDF' on the print prompt.");
    if (window.self !== window.top) {
      toast.info("Tip: If the print prompt is blocked by the editor sandbox, open this app in a new tab using the URL above.", {
        duration: 8000
      });
    }

    // 4. Trigger print within user interaction frame and prune container when finished
    setTimeout(() => {
      try {
        window.print();
      } catch (err) {
        console.error("Print API Error:", err);
        toast.error("Your browser blocked direct printing. Try opening this app in a new tab.");
      }
      
      // Keep DOM clean after print spool completes
      setTimeout(() => {
        printContainer.remove();
      }, 1000);
    }, 300);
  };

  const displayedMarkdown = getReplacedMarkdown(editedMarkdown, placeholderReplacements);
  const detectedPlaceholders = extractPlaceholders(editedMarkdown);

  return (
    <div className="flex h-screen bg-brand-bg text-brand-text overflow-hidden selection:bg-brand-accent/30 selection:text-white">
      <Toaster position="top-right" theme="dark" />

      <AnimatePresence>
        {isMobileLayout && (isLeftSidebarOpen || isRightSidebarOpen) && (
          <motion.button
            type="button"
            aria-label="Close open menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setIsLeftSidebarOpen(false);
              setIsRightSidebarOpen(false);
            }}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar: Navigation & Personality */}
      <AnimatePresence initial={false}>
        {isLeftSidebarOpen && (
          <motion.aside 
            initial={isMobileLayout ? { x: "-100%", opacity: 0 } : { width: 0, opacity: 0 }}
            animate={isMobileLayout ? { x: 0, opacity: 1 } : { width: 256, opacity: 1 }}
            exit={isMobileLayout ? { x: "-100%", opacity: 0 } : { width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-y-0 left-0 z-50 flex w-[min(20rem,88vw)] shrink-0 flex-col overflow-hidden border-r border-brand-border bg-brand-sidebar shadow-2xl md:relative md:inset-auto md:z-auto md:w-auto md:shadow-none"
          >
            <div className="flex w-full items-start justify-between p-6 md:w-64 md:p-8">
              <div>
                <div className="text-3xl font-serif italic text-white tracking-tighter mb-1">VOID.</div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-brand-accent font-bold opacity-80">Voice Of Intense Disdain</div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsLeftSidebarOpen(false)}
                aria-label="Close navigation menu"
                className="h-9 w-9 text-brand-muted hover:text-brand-accent md:hidden"
              >
                <PanelLeftClose className="h-5 w-5" />
              </Button>
            </div>
            
            <nav className="mt-4 w-full flex-1 space-y-2 px-4 md:w-64">
              <div className="p-3 bg-white/5 rounded text-white flex items-center gap-3 border-l-2 border-brand-accent">
                <span className="text-xs opacity-50 mono-text">01</span>
                <span className="text-sm font-medium">New Disappointment</span>
              </div>
              <div className="p-3 hover:bg-white/5 rounded text-brand-muted flex items-center gap-3 transition-colors cursor-not-allowed group">
                <span className="text-xs opacity-30 mono-text">02</span>
                <span className="text-sm group-hover:text-brand-text/50">Buried Secrets</span>
              </div>
              <div className="p-3 hover:bg-white/5 rounded text-brand-muted flex items-center gap-3 transition-colors cursor-not-allowed group">
                <span className="text-xs opacity-30 mono-text">03</span>
                <span className="text-sm group-hover:text-brand-text/50">Empty Promises</span>
              </div>
            </nav>

            <div className="w-full border-t border-brand-border p-6 md:w-64">
              <div className="bg-black/40 p-4 rounded-lg border border-brand-border">
                <p className="text-[11px] leading-relaxed text-brand-muted italic font-serif">
                  "I'm currently calculating exactly how many lawyers will laugh at your Terms of Service."
                </p>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="relative flex h-full min-w-0 flex-1 flex-col overflow-hidden border-r border-brand-border bg-[#080808]">
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-brand-border px-3 sm:px-5 md:h-20 md:px-8">
          <div className="flex min-w-0 items-center gap-2 md:gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleLeftSidebar}
              aria-label={isLeftSidebarOpen ? "Close navigation menu" : "Open navigation menu"}
              className="shrink-0 text-brand-muted hover:text-brand-accent transition-colors"
            >
              {isLeftSidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
            </Button>
            <h2 className="truncate text-[9px] font-bold uppercase tracking-wider text-brand-muted sm:text-xs sm:tracking-widest">
              Active Session: {result ? "A Rare Success" : "Waiting for Mediocrity"}
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-2 md:gap-4">
            <div className="hidden items-center gap-3 sm:flex">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_#22c55e]"></div>
              <span className="hidden text-[10px] text-brand-muted mono-text uppercase tracking-tighter lg:inline">Online (Regrettably)</span>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleRightSidebar}
              aria-label={isRightSidebarOpen ? "Close configuration menu" : "Open configuration menu"}
              className="shrink-0 text-brand-muted hover:text-brand-accent transition-colors"
            >
              {isRightSidebarOpen ? <PanelRightClose className="w-5 h-5" /> : <PanelRightOpen className="w-5 h-5" />}
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-hidden flex flex-col relative">
          {/* Pinned Toolbar at the Top of the Workspace */}
          {result && (
            <div className="h-14 border-b border-brand-border bg-black/40 flex items-center justify-between px-8 shrink-0">
              <div className="flex bg-transparent items-center gap-1.5 scrollbar-thin scrollbar-none overflow-x-auto">
                <Button 
                  variant={viewMode === 'preview' ? 'default' : 'ghost'} 
                  size="sm"
                  className={`text-[10px] font-mono h-8 uppercase tracking-wider ${viewMode === 'preview' ? 'bg-brand-accent text-white hover:bg-brand-accent/90' : 'text-brand-muted hover:text-brand-accent hover:bg-white/5'}`}
                  onClick={() => setViewMode('preview')}
                >
                  <Eye className="w-3.5 h-3.5 mr-1.5" />
                  PREVIEW
                </Button>
                <Button 
                  variant={viewMode === 'edit' ? 'default' : 'ghost'} 
                  size="sm"
                  className={`text-[10px] font-mono h-8 uppercase tracking-wider ${viewMode === 'edit' ? 'bg-brand-accent text-white hover:bg-brand-accent/90' : 'text-brand-muted hover:text-brand-accent hover:bg-white/5'}`}
                  onClick={() => setViewMode('edit')}
                >
                  <FileText className="w-3.5 h-3.5 mr-1.5" />
                  EDITOR
                </Button>
                <Button 
                  variant={viewMode === 'split' ? 'default' : 'ghost'} 
                  size="sm"
                  className={`text-[10px] font-mono h-8 uppercase tracking-wider hidden md:flex ${viewMode === 'split' ? 'bg-brand-accent text-white hover:bg-brand-accent/90' : 'text-brand-muted hover:text-brand-accent hover:bg-white/5'}`}
                  onClick={() => setViewMode('split')}
                >
                  <Columns className="w-3.5 h-3.5 mr-1.5" />
                  SPLIT SCREEN
                </Button>
                <Button 
                  variant={viewMode === 'diff' ? 'default' : 'ghost'} 
                  size="sm"
                  className={`text-[10px] font-mono h-8 uppercase tracking-wider ${viewMode === 'diff' ? 'bg-brand-accent text-white hover:bg-brand-accent/90' : 'text-brand-muted hover:text-brand-accent hover:bg-white/5'}`}
                  onClick={() => setViewMode('diff')}
                >
                  <ArrowLeftRight className="w-3.5 h-3.5 mr-1.5" />
                  DIFF COMPARISON
                </Button>
              </div>

              <div className="flex items-center gap-3">
                {autoSaveStatus === 'saving' && (
                  <span className="text-[9px] font-mono text-brand-accent animate-pulse uppercase tracking-widest flex items-center gap-1.5 select-none">
                    <Loader2 className="w-3 h-3 animate-spin text-brand-accent" />
                    AUTOSAVING...
                  </span>
                )}
                {autoSaveStatus === 'saved' && (
                  <span className="text-[9px] font-mono text-green-500 uppercase tracking-widest flex items-center gap-1.5 select-none animate-bounce">
                    <Check className="w-3 h-3 text-green-500" />
                    DRAFT SECURED
                  </span>
                )}
                
                {originalMarkdown && editedMarkdown !== originalMarkdown && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditedMarkdown(originalMarkdown);
                      toast.info("Reverted all custom edits back to original AI generation.");
                    }}
                    className="h-7 px-2 text-[9px] font-mono border border-brand-accent/20 text-brand-accent hover:bg-brand-accent/10 hover:text-white rounded uppercase"
                  >
                    REVERT EDITS
                  </Button>
                )}
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    localStorage.removeItem("void_editor_draft");
                    setResult(null);
                    setEditedMarkdown("");
                    setOriginalMarkdown("");
                    setVersions([]);
                    setOriginalVersions([]);
                    setActiveVersionIndex(0);
                    toast.info("Active drafts discarded.");
                  }}
                  className="h-7 px-2 text-[9px] font-mono text-brand-muted hover:text-white hover:bg-white/5 rounded uppercase"
                >
                  DISCARD
                </Button>
              </div>
            </div>
          )}

          {/* Draft Variation Selector Tab Strip */}
          {result && versions && versions.length > 1 && (
            <div className="h-11 border-b border-brand-border/40 bg-black/20 flex items-center justify-between px-8 shrink-0 select-none">
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
                <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-brand-muted/70 flex items-center gap-1.5 shrink-0 select-none">
                  <Sparkles className="w-3.5 h-3.5 text-brand-accent animate-pulse" />
                  Variations:
                </span>
                <div className="flex items-center gap-1.5 py-1">
                  {versions.map((_, idx) => {
                    const isSelected = activeVersionIndex === idx;
                    const isEdited = versions[idx] !== originalVersions[idx];
                    return (
                      <button
                        key={idx}
                        onClick={() => handleSwitchDraft(idx)}
                        className={`h-7 px-3 text-[9.5px] uppercase font-mono tracking-wider rounded border transition-all flex items-center gap-1.5 shrink-0 ${
                          isSelected
                            ? "bg-brand-accent/10 border-brand-accent text-white font-bold select-none"
                            : "bg-transparent border-brand-border/30 text-brand-muted hover:text-white hover:bg-white/5"
                        }`}
                      >
                        <span>Draft {idx + 1}</span>
                        {isEdited && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" title="Has unsaved edits" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="text-[8.5px] font-mono text-brand-muted/50 uppercase select-none hidden sm:block">
                Currently Viewing: <span className="text-white font-bold">Draft {activeVersionIndex + 1}</span> ({versions[activeVersionIndex]?.split(/\s+/).filter(Boolean).length || 0} words)
              </div>
            </div>
          )}

          <div className="flex-1 min-h-0 overflow-hidden flex flex-col relative">
            <AnimatePresence mode="wait">
              {!result ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full flex flex-col items-center justify-center space-y-6 py-32"
                >
                  <div className="relative">
                    <Ghost className="w-16 h-16 text-brand-accent/20 animate-bounce" />
                    <div className="absolute inset-0 bg-brand-accent/5 blur-3xl rounded-full"></div>
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="serif-text text-xl italic text-brand-muted">The document remains unwritten.</h3>
                    <p className="text-[11px] mono-text uppercase tracking-widest opacity-40">Feed the machine on the right.</p>
                  </div>
                </motion.div>
              ) : viewMode === 'preview' ? (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex-1 overflow-hidden flex flex-col min-h-0"
                >
                  <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
                    <div className="p-8 space-y-12 pb-32">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-bold text-brand-accent tracking-widest">Output Package</span>
                          <h3 className="serif-text text-2xl text-white italic">{result.docType}</h3>
                          <div className="flex items-center gap-4 text-[10px] font-mono text-brand-muted uppercase">
                            <span>words: <span className="text-brand-accent font-bold">{getWordCount(displayedMarkdown)}</span></span>
                            <span className="opacity-30">|</span>
                            <span>chars: <span className="text-brand-accent font-bold">{displayedMarkdown.length}</span></span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Dialog>
                            <DialogTrigger render={
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 border-brand-border hover:bg-brand-accent/10 border font-mono text-[10px]"
                              />
                            }>
                              <Eye className="w-3 h-3 mr-2" />
                              PREVIEW_RAW
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[80vh] bg-brand-bg border-brand-border text-brand-text">
                              <DialogHeader>
                                <DialogTitle className="serif-text text-xl italic text-brand-accent font-serif">Raw Markdown Stream (Live)</DialogTitle>
                              </DialogHeader>
                              <ScrollArea className="mt-4 h-[60vh] w-full rounded border border-brand-border/50 bg-black/40 p-6">
                                <pre className="text-xs font-mono whitespace-pre-wrap break-words opacity-70">
                                  {displayedMarkdown}
                                </pre>
                              </ScrollArea>
                            </DialogContent>
                          </Dialog>
                          <NotionExportDialog 
                            markdown={displayedMarkdown} 
                            docType={result.docType} 
                            repoUrl={repoUrl} 
                          />
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleCopy} 
                            className="h-8 border-brand-border hover:bg-brand-accent/10 border font-mono text-[10px]"
                          >
                            {copied ? <Check className="w-3 h-3 mr-2" /> : <Copy className="w-3 h-3 mr-2" />}
                            COPY
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleDownload} 
                            className="h-8 border-brand-border hover:bg-brand-accent/10 border font-mono text-[10px]"
                          >
                            <Download className="w-3 h-3 mr-2" />
                            GET_MD
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleDownloadDocx} 
                            className="h-8 border-brand-border hover:bg-brand-accent/10 border font-mono text-[10px]"
                          >
                            <FileText className="w-3 h-3 mr-2" />
                            GET_DOCX
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleDownloadPdf} 
                            className="h-8 border-brand-border hover:bg-brand-accent/10 border font-mono text-[10px]"
                          >
                            <Scroll className="w-3 h-3 mr-2" />
                            GET_PDF
                          </Button>
                        </div>
                      </div>
                      
                      <Card className="bg-black/65 border-brand-border/50 shadow-2xl">
                        <CardContent className="p-8 md:p-12 overflow-hidden">
                          <div className="markdown-body">
                            <ReactMarkdown>{displayedMarkdown}</ReactMarkdown>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </motion.div>
              ) : viewMode === 'edit' ? (
                <motion.div
                  key="edit"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex-1 flex flex-col min-h-0 bg-[#0a0a0a] overflow-hidden"
                >
                  <div className="bg-[#0f0f0f] px-6 py-2 border-b border-brand-border/40 flex items-center justify-between shrink-0">
                    <span className="text-[9px] font-mono text-brand-muted uppercase tracking-[0.2em] flex items-center gap-1.5">
                      <Terminal className="w-3 h-3 text-brand-accent" />
                      Comprehensive Workspace Editor
                    </span>
                    <span className="text-[9px] font-mono text-brand-muted/50 uppercase">COURIER_NEW.MD — TYPE LIVE WITH AUTO-SAVE</span>
                  </div>
                  <textarea
                    value={editedMarkdown}
                    onChange={(e) => setEditedMarkdown(e.target.value)}
                    wrap={textWrap ? "soft" : "off"}
                    className="flex-1 w-full p-8 bg-transparent text-brand-text font-mono text-[13px] leading-relaxed outline-none resize-none overflow-y-auto pb-28 border-0 focus:ring-0 placeholder:text-brand-muted/20"
                    placeholder="Enter your custom Markdown structures here..."
                    style={{ 
                      fontFamily: '"Courier New", Courier, monospace',
                      whiteSpace: textWrap ? 'pre-wrap' : 'pre',
                      overflowX: textWrap ? 'hidden' : 'auto'
                    }}
                  />
                </motion.div>
              ) : viewMode === 'split' ? (
                <motion.div
                  key="split"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex divide-x divide-brand-border/50 overflow-hidden min-h-0"
                >
                  {/* Left Column: Editor */}
                  <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-[#090909]">
                    <div className="bg-[#0e0e0e] px-6 py-2 border-b border-brand-border/40 flex items-center justify-between shrink-0">
                      <span className="text-[9px] font-mono text-brand-muted uppercase tracking-[0.2em]">Markdown Source</span>
                      <span className="text-[9px] font-mono text-brand-accent/50 uppercase">EDIT LIVE</span>
                    </div>
                    <textarea
                      value={editedMarkdown}
                      onChange={(e) => setEditedMarkdown(e.target.value)}
                      wrap={textWrap ? "soft" : "off"}
                      className="flex-1 w-full p-6 bg-transparent text-brand-text font-mono text-[12px] leading-relaxed outline-none resize-none overflow-y-auto pb-28 placeholder:text-brand-muted/20 border-0 focus:ring-0"
                      placeholder="Start typing markdown here..."
                      style={{ 
                        fontFamily: '"Courier New", Courier, monospace',
                        whiteSpace: textWrap ? 'pre-wrap' : 'pre',
                        overflowX: textWrap ? 'hidden' : 'auto'
                      }}
                    />
                  </div>

                  {/* Right Column: Visualizer */}
                  <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-[#050505]">
                    <div className="bg-[#0e0e0e] px-6 py-2 border-b border-brand-border/40 flex items-center justify-between shrink-0">
                      <span className="text-[9px] font-mono text-brand-muted uppercase tracking-[0.2em]">Pristine Visualizer</span>
                      <div className="flex items-center gap-4 text-[9px] font-mono text-brand-muted/60 uppercase">
                        <span>words: {getWordCount(displayedMarkdown)}</span>
                        <span>chars: {displayedMarkdown.length}</span>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
                      <div className="p-8 pb-32">
                        <div className="markdown-body">
                          <ReactMarkdown>{displayedMarkdown}</ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="diff"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col overflow-hidden min-h-0"
                >
                  <DiffViewer
                    original={originalMarkdown}
                    current={editedMarkdown}
                    onRevert={() => {
                      setEditedMarkdown(originalMarkdown);
                      toast.info("Reverted all custom edits back to original AI generation.");
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Action Button Strip */}
        <div className="absolute bottom-8 left-8 right-8">
           <Button 
            onClick={handleGenerate}
            disabled={isLoading}
            className="w-full h-14 bg-brand-accent hover:bg-brand-accent/90 text-white font-mono text-xs uppercase tracking-[0.3em] rounded-full shadow-lg shadow-brand-accent/20 transition-all active:scale-[0.98]"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-3" />
            ) : (
              <Cpu className="w-4 h-4 mr-3" />
            )}
            {isLoading ? "CALCULATING INFERIORITY..." : "FORGE DOCUMENT"}
          </Button>
        </div>
      </main>

      {/* Sidebar: Configuration */}
      <AnimatePresence initial={false}>
        {isRightSidebarOpen && (
          <motion.aside 
            initial={isMobileLayout ? { x: "100%", opacity: 0 } : { width: 0, opacity: 0 }}
            animate={isMobileLayout ? { x: 0, opacity: 1 } : { width: 320, opacity: 1 }}
            exit={isMobileLayout ? { x: "100%", opacity: 0 } : { width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-y-0 right-0 z-50 flex h-full w-[min(22rem,92vw)] shrink-0 flex-col overflow-hidden border-l border-brand-border bg-brand-config shadow-2xl md:relative md:inset-auto md:z-auto md:w-auto md:shadow-none"
          >
            {/* Header Tabs Block */}
            <div className="h-14 border-b border-brand-border flex items-center justify-between px-6 bg-black/40 shrink-0 select-none">
              <div className="flex items-center gap-1 font-mono overflow-x-auto scrollbar-none max-w-[200px]">
                <button
                  onClick={() => setRightActiveTab("config")}
                  className={`text-[9px] font-bold uppercase tracking-widest flex items-center gap-1 py-4 border-b-2 transition-all shrink-0 ${rightActiveTab === "config" ? "text-brand-accent border-brand-accent font-black" : "text-brand-muted hover:text-white border-transparent"}`}
                >
                  <Settings className="w-3 h-3" />
                  SETUP
                </button>
                <span className="text-brand-border/40 text-xs px-0.5 shrink-0">/</span>
                <button
                  onClick={() => {
                    if (!result) {
                      toast.info("Forge a document first to unlock AI Refinement.");
                      return;
                    }
                    setRightActiveTab("refine");
                  }}
                  className={`text-[9px] font-bold uppercase tracking-widest flex items-center gap-1 py-4 border-b-2 transition-all shrink-0 ${rightActiveTab === "refine" ? "text-brand-accent border-brand-accent font-black" : "text-brand-muted hover:text-white border-transparent"} ${!result ? "opacity-30 cursor-not-allowed" : ""}`}
                >
                  <Sparkles className="w-3 h-3 text-brand-accent" />
                  REFINER
                </button>
                <span className="text-brand-border/40 text-xs px-0.5 shrink-0">/</span>
                <button
                  onClick={() => {
                    if (!result) {
                      toast.info("Forge a document first to unlock Compliance Audit.");
                      return;
                    }
                    setRightActiveTab("audit");
                  }}
                  className={`text-[9px] font-bold uppercase tracking-widest flex items-center gap-1 py-4 border-b-2 transition-all relative shrink-0 ${rightActiveTab === "audit" ? "text-brand-accent border-brand-accent font-black" : "text-brand-muted hover:text-white border-transparent"} ${!result ? "opacity-30 cursor-not-allowed" : ""}`}
                >
                  <ShieldCheck className="w-3 h-3 text-emerald-500" />
                  AUDIT
                  {result && (
                    <span className="absolute top-3 -right-1 w-1 h-1 rounded-full bg-brand-accent animate-pulse" />
                  )}
                </button>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsRightSidebarOpen(false)}
                aria-label="Close configuration menu"
                className="text-brand-muted hover:text-brand-accent transition-colors h-8 w-8"
              >
                <PanelRightClose className="w-4 h-4" />
              </Button>
            </div>

            {/* Scrollable contents container */}
            <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
              <div className="p-6 space-y-6">
                {rightActiveTab === "config" ? (
                  <div className="space-y-6">
                    <div className="space-y-1">
                      <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#981518]">Configuration Matrix</h3>
                      <p className="text-[10px] text-brand-muted/50 italic font-serif">Adjust the parameters of your failure.</p>
                    </div>

                    {/* Target Platform Segmented Tab */}
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-mono tracking-widest text-[#981518] ml-0.5 font-bold">Target Platform Context</label>
                      <div className="grid grid-cols-3 gap-1 p-0.5 bg-[#0f0f11] rounded border border-[#212124]">
                        <button
                          type="button"
                          onClick={() => setTargetPlatform(TargetPlatform.GithubRepo)}
                          className={`py-1.5 px-1 text-[9px] font-mono rounded tracking-wider uppercase transition-all duration-200 ${
                            targetPlatform === TargetPlatform.GithubRepo
                              ? "bg-brand-accent/20 text-white border border-[#981518]/40 shadow-sm"
                              : "text-brand-muted hover:text-white hover:bg-white/5 border border-transparent"
                          }`}
                        >
                          Repo File
                        </button>
                        <button
                          type="button"
                          onClick={() => setTargetPlatform(TargetPlatform.WebApp)}
                          className={`py-1.5 px-1 text-[9px] font-mono rounded tracking-wider uppercase transition-all duration-200 ${
                            targetPlatform === TargetPlatform.WebApp
                              ? "bg-brand-accent/20 text-white border border-[#981518]/40 shadow-sm"
                              : "text-brand-muted hover:text-white hover:bg-white/5 border border-transparent"
                          }`}
                        >
                          Web App
                        </button>
                        <button
                          type="button"
                          onClick={() => setTargetPlatform(TargetPlatform.AndroidApp)}
                          className={`py-1.5 px-1 text-[9px] font-mono rounded tracking-wider uppercase transition-all duration-200 ${
                            targetPlatform === TargetPlatform.AndroidApp
                              ? "bg-brand-accent/20 text-white border border-[#981518]/40 shadow-sm"
                              : "text-brand-muted hover:text-white hover:bg-white/5 border border-transparent"
                          }`}
                        >
                          Android
                        </button>
                      </div>
                    </div>

                    {/* Web Application Configuration Panel */}
                    <AnimatePresence mode="popLayout">
                      {targetPlatform === TargetPlatform.WebApp && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="space-y-4 pt-1 border-t border-brand-border/30 overflow-hidden"
                        >
                          <div className="space-y-2">
                            <label className="text-[10px] uppercase font-mono tracking-widest text-brand-muted ml-0.5">App Name *</label>
                            <Input 
                              placeholder="e.g. Void Matrix SaaS"
                              className="h-10 bg-black/60 border-brand-border focus:border-brand-accent/50 text-xs font-mono rounded"
                              value={appName}
                              onChange={(e) => setAppName(e.target.value)}
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] uppercase font-mono tracking-widest text-brand-muted ml-0.5">App Description</label>
                            <textarea 
                              placeholder="Describe your web application features and functions..."
                              rows={3}
                              className="w-full p-2.5 bg-black/60 border border-brand-border focus:border-brand-accent/50 text-xs font-mono rounded text-brand-text placeholder-brand-muted/40 outline-none resize-none"
                              value={appDescription}
                              onChange={(e) => setAppDescription(e.target.value)}
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] uppercase font-mono tracking-widest text-brand-muted ml-0.5">App Domain / Live URL</label>
                            <Input 
                              placeholder="https://app.example.com"
                              className="h-10 bg-black/60 border-brand-border focus:border-brand-accent/50 text-xs font-mono rounded"
                              value={webUrl}
                              onChange={(e) => setWebUrl(e.target.value)}
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] uppercase font-mono tracking-widest text-brand-muted ml-0.5">Identity Provider</label>
                            <Select value={authProvider} onValueChange={setAuthProvider}>
                              <SelectTrigger className="h-10 bg-black/60 border-brand-border text-xs rounded">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-brand-config border-brand-border text-brand-text">
                                <SelectItem value="none" className="text-xs font-mono">No Auth (Guest Access)</SelectItem>
                                <SelectItem value="firebase" className="text-xs font-mono">Firebase Authentication</SelectItem>
                                <SelectItem value="google" className="text-xs font-mono">Google Sign-In / OAuth 2.0</SelectItem>
                                <SelectItem value="custom" className="text-xs font-mono">Custom Database Auth</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] uppercase font-mono tracking-widest text-brand-muted ml-0.5">Data & Analytics Tracking</label>
                            <div className="flex flex-wrap gap-1.5">
                              {[
                                { id: "cookies", label: "Cookies" },
                                { id: "local_storage", label: "LocalStorage" },
                                { id: "google_analytics", label: "Google Analytics" },
                                { id: "stripe_payments", label: "Stripe Billing" },
                                { id: "user_accounts", label: "User Profiles" }
                              ].map(item => {
                                const selected = analyticsAndTracking.includes(item.id);
                                return (
                                  <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => {
                                      setAnalyticsAndTracking(prev => 
                                        prev.includes(item.id) 
                                          ? prev.filter(x => x !== item.id) 
                                          : [...prev, item.id]
                                      );
                                    }}
                                    className={`py-1 px-2.5 font-mono text-[9px] rounded-full border transition-all duration-150 ${
                                      selected 
                                        ? "bg-brand-accent/15 border-brand-accent/60 text-white" 
                                        : "bg-black/30 border-brand-border/40 text-brand-muted hover:border-brand-muted/70"
                                    }`}
                                  >
                                    {selected ? "✓ " : "+ "} {item.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Native Android App Configuration Panel */}
                    <AnimatePresence mode="popLayout">
                      {targetPlatform === TargetPlatform.AndroidApp && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="space-y-4 pt-1 border-t border-brand-border/30 overflow-hidden"
                        >
                          <div className="space-y-2">
                            <label className="text-[10px] uppercase font-mono tracking-widest text-brand-muted ml-0.5">App Name *</label>
                            <Input 
                              placeholder="e.g. Ghost Terminal Native"
                              className="h-10 bg-black/60 border-brand-border focus:border-brand-accent/50 text-xs font-mono rounded"
                              value={appName}
                              onChange={(e) => setAppName(e.target.value)}
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] uppercase font-mono tracking-widest text-brand-muted ml-0.5">App Description</label>
                            <textarea 
                              placeholder="Describe your Android mobile app features and user roles..."
                              rows={3}
                              className="w-full p-2.5 bg-black/60 border border-brand-border focus:border-brand-accent/50 text-xs font-mono rounded text-brand-text placeholder-brand-muted/40 outline-none resize-none"
                              value={appDescription}
                              onChange={(e) => setAppDescription(e.target.value)}
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] uppercase font-mono tracking-widest text-brand-muted ml-0.5">Package Name</label>
                            <Input 
                              placeholder="e.g. com.voidforge.app"
                              className="h-10 bg-black/60 border-brand-border focus:border-brand-accent/50 text-xs font-mono rounded font-mono"
                              value={packageName}
                              onChange={(e) => setPackageName(e.target.value)}
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] uppercase font-mono tracking-widest text-brand-muted ml-0.5">App Permissions Required</label>
                            <div className="flex flex-wrap gap-1.5">
                              {[
                                { id: "camera", label: "Camera" },
                                { id: "location", label: "Fine Location" },
                                { id: "storage", label: "Media Storage" },
                                { id: "notifications", label: "Notifications" },
                                { id: "bluetooth", label: "Bluetooth" },
                                { id: "microphone", label: "Microphone" }
                              ].map(item => {
                                const selected = androidPermissions.includes(item.id);
                                return (
                                  <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => {
                                      setAndroidPermissions(prev => 
                                        prev.includes(item.id) 
                                          ? prev.filter(x => x !== item.id) 
                                          : [...prev, item.id]
                                      );
                                    }}
                                    className={`py-1 px-2.5 font-mono text-[9px] rounded-full border transition-all duration-150 ${
                                      selected 
                                        ? "bg-brand-accent/15 border-brand-accent/60 text-white" 
                                        : "bg-black/30 border-brand-border/40 text-brand-muted hover:border-brand-muted/70"
                                    }`}
                                  >
                                    {selected ? "✓ " : "+ "} {item.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] uppercase font-mono tracking-widest text-brand-muted ml-0.5">Integrated SDK Services</label>
                            <div className="flex flex-wrap gap-1.5">
                              {[
                                { id: "google_play_billing", label: "Google Play IAP" },
                                { id: "admob", label: "AdMob Monetization" },
                                { id: "firebase_crashlytics", label: "Firebase Logs" }
                              ].map(item => {
                                const selected = monetizationServices.includes(item.id);
                                return (
                                  <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => {
                                      setMonetizationServices(prev => 
                                        prev.includes(item.id) 
                                          ? prev.filter(x => x !== item.id) 
                                          : [...prev, item.id]
                                      );
                                    }}
                                    className={`py-1 px-2.5 font-mono text-[9px] rounded-full border transition-all duration-150 ${
                                      selected 
                                        ? "bg-[#981518]/25 border-brand-accent/60 text-white" 
                                        : "bg-black/30 border-brand-border/40 text-brand-muted hover:border-brand-muted/70"
                                    }`}
                                  >
                                    {selected ? "✓ " : "+ "} {item.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Repo Input */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] uppercase font-mono tracking-widest text-brand-muted ml-0.5">Repository URL</label>
                        {targetPlatform !== TargetPlatform.GithubRepo && (
                          <span className="text-[8px] font-mono text-brand-muted/50 italic mr-0.5">Optional scans</span>
                        )}
                      </div>
                      <div className="relative group">
                        <GitBranch className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 opacity-30 group-focus-within:opacity-100 transition-opacity" />
                        <Input 
                          placeholder={targetPlatform === TargetPlatform.GithubRepo ? "Target repository..." : "Codebase repo for scanning (optional)..."}
                          className="pl-9 h-10 bg-black/60 border-brand-border focus:border-brand-accent/50 text-xs font-mono rounded"
                          value={repoUrl}
                          onChange={(e) => setRepoUrl(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Doc Type */}
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-mono tracking-widest text-brand-muted ml-0.5">Document Class</label>
                      <div className="relative group">
                        <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 opacity-30 z-10" />
                        <Select value={docType} onValueChange={(v) => setDocType(v as DocumentType)}>
                          <SelectTrigger className="pl-9 h-10 bg-black/60 border-brand-border text-xs rounded">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-brand-config border-brand-border text-brand-text">
                            {documentTypes.map(t => (
                              <SelectItem key={t} value={t} className="text-xs font-mono">{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {DOCUMENT_DESCRIPTIONS[docType] && (
                        <div className="mt-1.5 p-2.5 rounded bg-[#0d0d0d]/90 border border-brand-border/30 text-[9.5px] leading-relaxed select-none transition-all duration-300">
                          <div className="flex justify-between items-center text-[8px] font-mono uppercase text-brand-accent/85 tracking-widest font-black mb-1">
                            <span>{DOCUMENT_DESCRIPTIONS[docType].shortDesc}</span>
                            <span className="text-[7.5px] text-brand-muted/40 font-bold px-1 rounded bg-black/40 border border-brand-border/20">{DOCUMENT_DESCRIPTIONS[docType].rating}</span>
                          </div>
                          <p className="font-serif italic text-brand-muted/80">{DOCUMENT_DESCRIPTIONS[docType].scope}</p>
                          <p className="text-[8px] font-mono text-brand-muted/45 mt-1.5 uppercase tracking-wide">Target: <span className="text-white/60">{DOCUMENT_DESCRIPTIONS[docType].bestFor}</span></p>
                        </div>
                      )}
                    </div>

                    {/* Tone */}
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-mono tracking-widest text-brand-muted ml-0.5">Attitude Modulator</label>
                      <div className="relative group">
                        <Type className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 opacity-30 z-10" />
                        <Select value={tone} onValueChange={(v) => setTone(v as Tone)}>
                          <SelectTrigger className="pl-9 h-10 bg-black/60 border-brand-border text-xs rounded">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-brand-config border-brand-border text-brand-text">
                            {tones.map(t => (
                              <SelectItem key={t} value={t} className="text-xs font-mono">
                                <span className="flex items-center gap-2">
                                  {t === Tone.DeadpoolCool && <Skull className="w-3 h-3 text-brand-accent" />}
                                  {t}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {TONE_DESCRIPTIONS[tone] && (
                        <div className="mt-1.5 p-2.5 rounded bg-[#0d0d0d]/90 border border-brand-border/30 text-[9.5px] leading-relaxed select-none transition-all duration-300">
                          <div className="flex justify-between items-center text-[8px] font-mono uppercase text-brand-accent/85 tracking-widest font-black mb-1">
                            <span>{TONE_DESCRIPTIONS[tone].vibe}</span>
                            <span className="text-[9.5px]">{TONE_DESCRIPTIONS[tone].emoji}</span>
                          </div>
                          <p className="font-serif italic text-brand-muted/80">{TONE_DESCRIPTIONS[tone].description}</p>
                          <div className="mt-1.5 bg-black/60 px-2 py-1.5 rounded text-[8.5px] font-mono leading-normal text-brand-muted/70 italic border border-white/5">
                            &ldquo;{TONE_DESCRIPTIONS[tone].sample}&rdquo;
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Length */}
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-mono tracking-widest text-brand-muted ml-0.5">Verbosity Level</label>
                      <div className="relative group">
                        <Terminal className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 opacity-30 z-10" />
                        <Select value={length} onValueChange={(v) => setLength(v as Length)}>
                           <SelectTrigger className="pl-9 h-10 bg-black/60 border-brand-border text-xs rounded">
                             <SelectValue />
                           </SelectTrigger>
                           <SelectContent className="bg-brand-config border-brand-border text-brand-text">
                             {lengths.map(l => (
                               <SelectItem key={l} value={l} className="text-xs font-mono capitalize">{l}</SelectItem>
                             ))}
                           </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Generations Count */}
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-mono tracking-widest text-brand-muted ml-0.5 flex items-center justify-between">
                        <span>Draft Generations</span>
                        <span className="text-[8px] text-brand-accent px-1.5 py-0.5 rounded bg-brand-accent/5 border border-brand-accent/20 font-bold uppercase tracking-wider">Multi-Draft</span>
                      </label>
                      <div className="relative group">
                        <Layers className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 opacity-30 z-10" />
                        <Select value={String(versionCount)} onValueChange={(v) => {
                          const count = Number(v);
                          setVersionCount(count);
                        }}>
                          <SelectTrigger className="pl-9 h-10 bg-black/60 border-brand-border text-xs rounded">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-brand-config border-brand-border text-brand-text font-mono">
                            {[1, 2, 3, 4, 5].map(n => (
                              <SelectItem key={n} value={String(n)} className="text-xs">
                                {n} {n === 1 ? "Version (Standard)" : "Versions (Parallel)"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <p className="text-[8px] font-mono text-brand-muted/40 uppercase tracking-wider leading-relaxed">
                        Forges up to five diverse variations simultaneously using creative variation profiles.
                      </p>
                    </div>

                    {/* LLM Cognitive Engine & Key Vault */}
                    <div className="space-y-4 pt-4 border-t border-brand-border/20">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-mono tracking-widest text-brand-muted ml-0.5 flex items-center justify-between">
                          <span>Cognitive Engine</span>
                          <span className="text-[8px] text-brand-accent px-1.5 py-0.5 rounded bg-brand-accent/5 border border-brand-accent/20 font-bold uppercase tracking-wider select-none">
                            {provider === "auto" ? "AUTO" : provider.toUpperCase()}
                          </span>
                        </label>
                        <div className="relative group">
                          <Cpu className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 opacity-30 z-10" />
                          <Select value={provider} onValueChange={handleProviderChange}>
                            <SelectTrigger className="pl-9 h-10 bg-black/60 border-brand-border text-xs rounded">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-brand-config border-brand-border text-brand-text font-mono">
                              <SelectItem value="auto" className="text-xs">Auto-Pilot (Dynamic Fallback)</SelectItem>
                              <SelectItem value="gemini" className="text-xs">Google Gemini (gemini-3.5-flash)</SelectItem>
                              <SelectItem value="mistral" className="text-xs">Mistral AI (mistral-large)</SelectItem>
                              <SelectItem value="openrouter" className="text-xs">OpenRouter (gemini-2.5-flash)</SelectItem>
                              <SelectItem value="groq" className="text-xs">Groq (llama-3.3-70b-versatile)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <p className="text-[8px] font-mono text-brand-muted/40 uppercase tracking-wider leading-relaxed">
                          Select the backend intelligence engine. "Auto-Pilot" uses platform defaults.
                        </p>
                      </div>

                      {/* Expandable Key Vault Container */}
                      <div className="p-3 bg-[#0d0d0d]/90 border border-brand-border/30 rounded-lg space-y-3">
                        <div className="flex items-center justify-between cursor-pointer select-none" onClick={() => setShowSecretKeys(prev => ({ ...prev, _expanded: !prev._expanded }))}>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-white flex items-center gap-1.5 font-black">
                              🔑 KEY VAULT
                            </span>
                            {Object.values(customKeys).some(Boolean) ? (
                              <span className="text-[7px] font-mono px-1 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase tracking-wider">LOADED</span>
                            ) : (
                              <span className="text-[7px] font-mono px-1 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 font-bold uppercase tracking-wider font-black">EMPTY</span>
                            )}
                          </div>
                          <span className="text-[9px] font-mono text-brand-muted font-black uppercase hover:text-white transition-colors">
                            {showSecretKeys._expanded ? "[ COLLAPSE ]" : "[ MANAGE ]"}
                          </span>
                        </div>

                        {showSecretKeys._expanded && (
                          <div className="space-y-3 pt-2 border-t border-brand-border/10">
                            <p className="text-[8px] font-mono text-brand-muted/55 leading-relaxed uppercase tracking-wider">
                              API credentials are saved purely inside local storage. Bring yours to keep processing uninterrupted.
                            </p>

                            {/* Gemini Input */}
                            <div className="space-y-1.5">
                              <label className="text-[8.5px] font-mono uppercase text-brand-muted flex items-center justify-between">
                                <span>Gemini API Key</span>
                                <span className="text-[7.5px] text-zinc-500 font-mono">Google AI</span>
                              </label>
                              <div className="flex items-center gap-1">
                                <Input
                                  type={showSecretKeys.gemini ? "text" : "password"}
                                  value={customKeys.gemini}
                                  onChange={(e) => setCustomKeys(prev => ({ ...prev, gemini: e.target.value }))}
                                  placeholder="AIzaSy..."
                                  className="h-8 text-[10px] font-mono bg-black/80 border-brand-border/60 focus:border-brand-accent/45 rounded-sm"
                                />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  type="button"
                                  onClick={() => setShowSecretKeys(prev => ({ ...prev, gemini: !prev.gemini }))}
                                  className="h-8 w-8 border border-brand-border/45 bg-black/40 hover:bg-white/5 shrink-0"
                                >
                                  {showSecretKeys.gemini ? <EyeOff className="w-3.5 h-3.5 text-brand-muted" /> : <Eye className="w-3.5 h-3.5 text-brand-muted" />}
                                </Button>
                              </div>
                            </div>

                            {/* Mistral Input */}
                            <div className="space-y-1.5">
                              <label className="text-[8.5px] font-mono uppercase text-brand-muted flex items-center justify-between">
                                <span>Mistral API Key</span>
                                <span className="text-[7.5px] text-zinc-500 font-mono">La Plateforme</span>
                              </label>
                              <div className="flex items-center gap-1">
                                <Input
                                  type={showSecretKeys.mistral ? "text" : "password"}
                                  value={customKeys.mistral}
                                  onChange={(e) => setCustomKeys(prev => ({ ...prev, mistral: e.target.value }))}
                                  placeholder="Mistral key..."
                                  className="h-8 text-[10px] font-mono bg-black/80 border-brand-border/60 focus:border-brand-accent/45 rounded-sm"
                                />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  type="button"
                                  onClick={() => setShowSecretKeys(prev => ({ ...prev, mistral: !prev.mistral }))}
                                  className="h-8 w-8 border border-brand-border/45 bg-black/40 hover:bg-white/5 shrink-0"
                                >
                                  {showSecretKeys.mistral ? <EyeOff className="w-3.5 h-3.5 text-brand-muted" /> : <Eye className="w-3.5 h-3.5 text-brand-muted" />}
                                </Button>
                              </div>
                            </div>

                            {/* OpenRouter Input */}
                            <div className="space-y-1.5">
                              <label className="text-[8.5px] font-mono uppercase text-brand-muted flex items-center justify-between">
                                <span>OpenRouter Key</span>
                                <span className="text-[7.5px] text-zinc-500 font-mono">openrouter.ai</span>
                              </label>
                              <div className="flex items-center gap-1">
                                <Input
                                  type={showSecretKeys.openrouter ? "text" : "password"}
                                  value={customKeys.openrouter}
                                  onChange={(e) => setCustomKeys(prev => ({ ...prev, openrouter: e.target.value }))}
                                  placeholder="sk-or-v1-..."
                                  className="h-8 text-[10px] font-mono bg-black/80 border-brand-border/60 focus:border-brand-accent/45 rounded-sm"
                                />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  type="button"
                                  onClick={() => setShowSecretKeys(prev => ({ ...prev, openrouter: !prev.openrouter }))}
                                  className="h-8 w-8 border border-brand-border/45 bg-black/40 hover:bg-white/5 shrink-0"
                                >
                                  {showSecretKeys.openrouter ? <EyeOff className="w-3.5 h-3.5 text-brand-muted" /> : <Eye className="w-3.5 h-3.5 text-brand-muted" />}
                                </Button>
                              </div>
                            </div>

                            {/* Groq Input */}
                            <div className="space-y-1.5">
                              <label className="text-[8.5px] font-mono uppercase text-brand-muted flex items-center justify-between">
                                <span>Groq API Key</span>
                                <span className="text-[7.5px] text-zinc-500 font-mono">Groq Console</span>
                              </label>
                              <div className="flex items-center gap-1">
                                <Input
                                  type={showSecretKeys.groq ? "text" : "password"}
                                  value={customKeys.groq}
                                  onChange={(e) => setCustomKeys(prev => ({ ...prev, groq: e.target.value }))}
                                  placeholder="gsk_..."
                                  className="h-8 text-[10px] font-mono bg-black/80 border-brand-border/60 focus:border-brand-accent/45 rounded-sm"
                                />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  type="button"
                                  onClick={() => setShowSecretKeys(prev => ({ ...prev, groq: !prev.groq }))}
                                  className="h-8 w-8 border border-brand-border/45 bg-black/40 hover:bg-white/5 shrink-0"
                                >
                                  {showSecretKeys.groq ? <EyeOff className="w-3.5 h-3.5 text-brand-muted" /> : <Eye className="w-3.5 h-3.5 text-brand-muted" />}
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Editor comfort toggles */}
                    <div className="space-y-2 pt-4 border-t border-brand-border/20">
                      <label className="text-[10px] uppercase font-mono tracking-widest text-[#981518] ml-0.5 font-bold">Editor Comfort</label>
                      <div className="flex items-center gap-2">
                        <Button
                          variant={textWrap ? "default" : "outline"}
                          size="sm"
                          onClick={() => setTextWrap(true)}
                          className={`flex-1 text-[9px] font-mono h-7 uppercase tracking-wider ${
                            textWrap 
                              ? "bg-brand-accent text-white hover:bg-brand-accent/90 border-transparent" 
                              : "border-brand-border/60 hover:bg-white/5 text-brand-muted"
                          }`}
                        >
                          Soft Wrap
                        </Button>
                        <Button
                          variant={!textWrap ? "default" : "outline"}
                          size="sm"
                          onClick={() => setTextWrap(false)}
                          className={`flex-1 text-[9px] font-mono h-7 uppercase tracking-wider ${
                            !textWrap 
                              ? "bg-brand-accent text-white hover:bg-brand-accent/90 border-transparent" 
                              : "border-brand-border/60 hover:bg-white/5 text-brand-muted"
                          }`}
                        >
                          No Wrap
                        </Button>
                      </div>
                    </div>

                    {/* Interactive searchable complete Reference Codex */}
                    <div className="space-y-2 pt-4 border-t border-brand-border/20">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] uppercase font-mono tracking-widest text-[#981518] ml-0.5 font-bold flex items-center gap-1.5">
                          <span>📚 Docs & Attitude Codex</span>
                        </label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowGlossary(!showGlossary)}
                          className="h-6 px-2 text-[8.5px] font-mono border border-brand-border hover:bg-white/5 uppercase rounded text-brand-muted hover:text-white"
                        >
                          {showGlossary ? "Hide Index" : "Show Index"}
                        </Button>
                      </div>
                      
                      {showGlossary ? (
                        <div className="p-3 bg-black/50 border border-brand-border/40 rounded-lg space-y-2">
                          <DocToneGlossary 
                            currentDoc={docType}
                            currentTone={tone}
                            onSelectDoc={(d) => {
                              setDocType(d);
                              toast.success(`Configured template to: ${d}`);
                            }}
                            onSelectTone={(t) => {
                              setTone(t);
                              toast.success(`Adjusted attitude tone: ${t}`);
                            }}
                          />
                        </div>
                      ) : (
                        <p className="text-[9px] text-brand-muted/40 font-mono uppercase tracking-wider pl-0.5 select-none">
                          Interactive index of all 15 template classes and 6 attitudes.
                        </p>
                      )}
                    </div>

                  </div>
                ) : rightActiveTab === "refine" ? (
                  <div className="space-y-6">
                    <div className="space-y-1">
                      <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#981518]">AI SMART REFINER</h3>
                      <p className="text-[10px] text-brand-muted/50 italic font-serif">Perfect, expand, or adjust with Gemini.</p>
                    </div>

                    {/* Undo option */}
                    {history.length > 0 && (
                      <div className="p-3 bg-[#981518]/5 border border-[#981518]/20 rounded flex items-center justify-between">
                        <span className="text-[9px] text-brand-muted font-mono uppercase">History Backup</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleUndo}
                          className="h-6 px-2 text-[9px] font-mono border border-brand-accent/20 text-brand-accent hover:bg-brand-accent/10 hover:text-white rounded flex items-center gap-1 uppercase"
                        >
                          <Undo2 className="w-3 h-3 text-brand-accent" />
                          UNDO_EDIT
                        </Button>
                      </div>
                    )}

                    {/* Presets Grid */}
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-mono tracking-widest text-brand-muted ml-0.5">AI Preset Recipes</label>
                      <div className="grid grid-cols-1 gap-2.5">
                        <Button
                          variant="outline"
                          disabled={isRefining || isLoading}
                          onClick={() => handleRefine("Conduct a thorough editorial polish: inspect spelling, rectify grammar, adjust phrasing flow for high clarity and flow, and repair any loose markdown styles.")}
                          className="justify-start text-left h-auto py-2 px-3 border-brand-border/60 hover:border-[#981518]/40 hover:bg-white/5 text-[10px] font-mono"
                        >
                          <span className="text-brand-accent text-xs font-mono mr-2">📝</span>
                          <div className="flex flex-col select-none">
                            <span className="text-white hover:text-brand-accent leading-none font-bold">POLISH & PROOFREAD</span>
                            <span className="text-[8px] text-brand-muted font-mono tracking-widest mt-0.5">Grammar & style flows</span>
                          </div>
                        </Button>

                        <Button
                          variant="outline"
                          disabled={isRefining || isLoading}
                          onClick={() => handleRefine("Analyze and inject professional corporate-grade legal prose: strengthen liability limits, robust indemnification waivers, precise definitions, jurisdiction references, and rigid standard boilerplates.")}
                          className="justify-start text-left h-auto py-2 px-3 border-brand-border/60 hover:border-[#981518]/40 hover:bg-white/5 text-[10px] font-mono"
                        >
                          <span className="text-brand-accent text-xs font-mono mr-2">⚖️</span>
                          <div className="flex flex-col select-none">
                            <span className="text-white hover:text-brand-accent leading-none font-bold">BOOST LEGAL RIGOR</span>
                            <span className="text-[8px] text-brand-muted font-mono tracking-widest mt-0.5">Strengthen legalese clauses</span>
                          </div>
                        </Button>

                        <Button
                          variant="outline"
                          disabled={isRefining || isLoading}
                          onClick={() => handleRefine("Unshackle Deadpool-level cynic energy: rewrite the draft to inject maximum dark sarcasm, corporate satire, and dry witty commentary about user legal agreements.")}
                          className="justify-start text-left h-auto py-2 px-3 border-brand-border/60 hover:border-[#981518]/40 hover:bg-white/5 text-[10px] font-mono"
                        >
                          <span className="text-brand-accent text-xs font-mono mr-2">🤡</span>
                          <div className="flex flex-col select-none">
                            <span className="text-white hover:text-brand-accent leading-none font-bold">CYNICAL OVERLOAD</span>
                            <span className="text-[8px] text-brand-muted font-mono tracking-widest mt-0.5">Maximum witty dry humor</span>
                          </div>
                        </Button>

                        <Button
                          variant="outline"
                          disabled={isRefining || isLoading}
                          onClick={() => handleRefine("Exert absolute compression: synthesize the document down to its lean legal core, discarding conversational filler, while preserving legal and technical structure.")}
                          className="justify-start text-left h-auto py-2 px-3 border-brand-border/60 hover:border-[#981518]/40 hover:bg-white/5 text-[10px] font-mono"
                        >
                          <span className="text-brand-accent text-xs font-mono mr-2">📉</span>
                          <div className="flex flex-col select-none">
                            <span className="text-white hover:text-brand-accent leading-none font-bold">CONDENSE & COMPRESS</span>
                            <span className="text-[8px] text-brand-muted font-mono tracking-widest mt-0.5">Strip down fluff to core</span>
                          </div>
                        </Button>

                        <Button
                          variant="outline"
                          disabled={isRefining || isLoading}
                          onClick={() => handleRefine("Inject deep elaboration: elaborate on every heading, write comprehensive sub-clauses, and detail definitions to turn this into a thick, watertight corporate document.")}
                          className="justify-start text-left h-auto py-2 px-3 border-brand-border/60 hover:border-[#981518]/40 hover:bg-white/5 text-[10px] font-mono"
                        >
                          <span className="text-brand-accent text-xs font-mono mr-2">📈</span>
                          <div className="flex flex-col select-none">
                            <span className="text-white hover:text-brand-accent leading-none font-bold">EXPAND & ELABORATE</span>
                            <span className="text-[8px] text-brand-muted font-mono tracking-widest mt-0.5">Flesh out watertight clauses</span>
                          </div>
                        </Button>
                      </div>
                    </div>

                    {/* Custom instruction prompt */}
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-mono tracking-widest text-brand-muted ml-0.5">Ad-Hoc Directive</label>
                      <textarea
                        placeholder="Instruct Gemini to mutate the text (e.g. 'Add a GDPR clause', 'Translate intro to Spanish', 'Change Acme to Void Inc'...)"
                        value={customInstruction}
                        onChange={(e) => setCustomInstruction(e.target.value)}
                        disabled={isRefining || isLoading}
                        className="w-full h-20 p-2.5 bg-black/60 border border-brand-border focus:border-brand-accent/50 text-xs font-mono rounded placeholder:text-brand-muted/20 outline-none resize-none overflow-y-auto"
                      />
                      <Button
                        disabled={isRefining || isLoading || !customInstruction.trim()}
                        onClick={() => {
                          handleRefine(customInstruction);
                          setCustomInstruction("");
                        }}
                        className="w-full text-[10.5px] font-mono h-9 bg-brand-accent hover:bg-brand-accent/90 text-white rounded-full uppercase tracking-widest"
                      >
                        {isRefining ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
                        {isRefining ? "MUTATING CORPUS..." : "EXECUTE DIRECTIVE"}
                      </Button>
                    </div>

                    {/* Smart Formatting */}
                    <div className="space-y-2 pt-4 border-t border-brand-border/40">
                      <label className="text-[10px] uppercase font-mono tracking-widest text-[#981518] font-bold">Local Smart Formatters</label>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isRefining || isLoading}
                          onClick={() => handleApplyFormatting("tables")}
                          className="text-[9px] font-mono border-brand-border hover:bg-[#981518]/5 hover:border-[#981518]/30 h-8"
                        >
                          ALIGN TABLES
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isRefining || isLoading}
                          onClick={() => handleApplyFormatting("spacing")}
                          className="text-[9px] font-mono border-brand-border hover:bg-[#981518]/5 hover:border-[#981518]/30 h-8"
                        >
                          SPACING_FIX
                        </Button>
                      </div>
                    </div>

                    {/* Interactive variables */}
                    {detectedPlaceholders.length > 0 && (
                      <div className="space-y-3 pt-4 border-t border-brand-border/40">
                        <div className="flex flex-col gap-0.5">
                          <label className="text-[10px] uppercase font-mono tracking-widest text-[#981518] font-bold">Template Variables</label>
                          <span className="text-[8px] text-brand-muted font-mono leading-tight">Brackets fill-in: replaces [PH] values on the fly on copy & download.</span>
                        </div>
                        <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1 bg-black/20 p-2.5 rounded border border-brand-border/30">
                          {detectedPlaceholders.map(ph => (
                            <div key={ph} className="space-y-1">
                              <span className="text-[9px] font-mono text-brand-muted font-bold">[{ph}]</span>
                              <Input
                                type="text"
                                placeholder={`Set value for ${ph}...`}
                                value={placeholderReplacements[ph] || ""}
                                onChange={(e) => handleSetPlaceholderValue(ph, e.target.value)}
                                className="h-8 bg-black/60 border-brand-border focus:border-brand-accent/40 text-[10px] font-mono rounded"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <ComplianceAudit
                    markdown={editedMarkdown}
                    isRefining={isRefining}
                    onAutoFix={(promptText) => {
                      // Trigger AI Refiner securely with the specialized legal prompt
                      handleRefine(promptText);
                    }}
                  />
                )}
              </div>
            </div>

            {/* Pinned Diagnostics Area */}
            <div className="p-6 border-t border-brand-border bg-black/10 shrink-0 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center bg-black/40 p-2 rounded border border-brand-border/30">
                  <span className="text-[10px] text-brand-muted mono-text">429</span>
                  <span className="text-[9px] text-brand-accent font-medium uppercase tracking-tighter">Rate limited? Chill out.</span>
                </div>
                <div className="flex justify-between items-center bg-black/40 p-2 rounded border border-brand-border/30">
                  <span className="text-[10px] text-brand-muted mono-text">402</span>
                  <span className="text-[9px] text-brand-accent font-medium uppercase tracking-tighter">Broke? Add credits.</span>
                </div>
              </div>

              <div className="bg-brand-accent/5 border border-brand-accent/20 p-3 rounded-lg">
                <p className="text-[9px] text-brand-accent/60 leading-normal italic font-serif">
                  "Warning: Every document generated by this machine contains trace amounts of my disappointment."
                </p>
              </div>

              <footer className="text-center font-mono text-[9px] opacity-25 uppercase tracking-widest">
                2026 © C. Crossno
              </footer>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
