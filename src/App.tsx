import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Github, 
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
  Columns,
  Sparkles,
  Wrench,
  Undo2,
  SpellCheck,
  ChevronRight,
  Settings
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
import { DocumentType, Tone, Length, GenRequest, GenResponse } from "./types";
import axios from "axios";
import { NotionExportDialog } from "./components/NotionExportDialog";

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
  const [docType, setDocType] = useState<DocumentType>(DocumentType.Readme);
  const [tone, setTone] = useState<Tone>(Tone.Professional);
  const [length, setLength] = useState<Length>(Length.Medium);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<GenResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);

  // Live Editor & Auto-Save States
  const [editedMarkdown, setEditedMarkdown] = useState<string>("");
  const [originalMarkdown, setOriginalMarkdown] = useState<string>("");
  const [viewMode, setViewMode] = useState<"preview" | "edit" | "split">("preview");
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [confirmGenerate, setConfirmGenerate] = useState(false);
  const [textWrap, setTextWrap] = useState<boolean>(true);

  // AI Refinement & Formatting states
  const [rightActiveTab, setRightActiveTab] = useState<"config" | "refine">("config");
  const [customInstruction, setCustomInstruction] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [placeholderReplacements, setPlaceholderReplacements] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<string[]>([]);

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
            markdown: parsed.markdown
          });
          setEditedMarkdown(parsed.markdown);
          setOriginalMarkdown(parsed.originalMarkdown || parsed.markdown);
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

  // Debounced Auto-Save Mechanism
  useEffect(() => {
    if (!result || !editedMarkdown) return;

    // Direct comparison with existing stored draft to prevent saving duplicate runs
    const savedDraft = localStorage.getItem("void_editor_draft");
    let needsSave = true;
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        if (parsed && parsed.markdown === editedMarkdown) {
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
        length
      }));
      setAutoSaveStatus("saved");

      const statusTimer = setTimeout(() => {
        setAutoSaveStatus("idle");
      }, 2000);
      return () => clearTimeout(statusTimer);
    }, 1000);

    return () => clearTimeout(timer);
  }, [editedMarkdown, originalMarkdown, result, repoUrl, tone, length]);

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
      const response = await axios.post<{ markdown: string }>("/api/refine", {
        markdown: editedMarkdown,
        instruction: finalInstruction,
        tone: tone,
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
  }, [repoUrl, docType, tone, length]);

  const handleGenerate = async () => {
    if (!repoUrl) {
      toast.error("Enter a repo URL, unless you want me to write documentation for your imaginary friends.");
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
      const response = await axios.post<GenResponse>("/api/generate", {
        repoUrl,
        docType,
        tone,
        length,
      } as GenRequest);
      
      setResult(response.data);
      setEditedMarkdown(response.data.markdown);
      setOriginalMarkdown(response.data.markdown);

      // Save new version to local storage instantly
      localStorage.setItem("void_editor_draft", JSON.stringify({
        markdown: response.data.markdown,
        originalMarkdown: response.data.markdown,
        docType: response.data.docType,
        repoUrl,
        tone,
        length
      }));
      setAutoSaveStatus("saved");
      toast.success("I've finished your little document. Try not to break it.");
    } catch (error: any) {
      const message = error.response?.data?.error || "Even I couldn't summarize that mess.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
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

      {/* Sidebar: Navigation & Personality */}
      <AnimatePresence initial={false}>
        {isLeftSidebarOpen && (
          <motion.aside 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 256, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="bg-brand-sidebar border-r border-brand-border flex flex-col shrink-0 overflow-hidden"
          >
            <div className="p-8 w-64">
              <div className="text-3xl font-serif italic text-white tracking-tighter mb-1">VOID.</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-brand-accent font-bold opacity-80">Voice Of Intense Disdain</div>
            </div>
            
            <nav className="flex-1 px-4 space-y-2 mt-4 w-64">
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

            <div className="p-6 border-t border-brand-border w-64">
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
      <main className="flex-1 flex flex-col border-r border-brand-border h-full relative overflow-hidden bg-[#080808]">
        <header className="h-20 border-b border-brand-border flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
              className="text-brand-muted hover:text-brand-accent transition-colors"
            >
              {isLeftSidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
            </Button>
            <h2 className="text-xs font-bold text-brand-muted uppercase tracking-widest">Active Session: {result ? "A Rare Success" : "Waiting for Mediocrity"}</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_#22c55e]"></div>
            <span className="text-[10px] text-brand-muted mono-text uppercase tracking-tighter">Online (Regrettably)</span>
            {!isRightSidebarOpen && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsRightSidebarOpen(true)}
                className="text-brand-muted hover:text-brand-accent transition-colors ml-4"
              >
                <PanelRightOpen className="w-5 h-5" />
              </Button>
            )}
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
                    toast.info("Active draft discarded.");
                  }}
                  className="h-7 px-2 text-[9px] font-mono text-brand-muted hover:text-white hover:bg-white/5 rounded uppercase"
                >
                  DISCARD
                </Button>
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
              ) : (
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
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="bg-brand-config flex flex-col shrink-0 overflow-hidden border-l border-brand-border h-full"
          >
            {/* Header Tabs Block */}
            <div className="h-14 border-b border-brand-border flex items-center justify-between px-6 bg-black/40 shrink-0 select-none">
              <div className="flex items-center gap-1.5 font-mono">
                <button
                  onClick={() => setRightActiveTab("config")}
                  className={`text-[9.5px] font-bold uppercase tracking-widest flex items-center gap-1.5 py-4 border-b-2 transition-all ${rightActiveTab === "config" ? "text-brand-accent border-brand-accent font-black" : "text-brand-muted hover:text-white border-transparent"}`}
                >
                  <Settings className="w-3 h-3" />
                  SETUP
                </button>
                <span className="text-brand-border/40 text-xs px-1">/</span>
                <button
                  onClick={() => {
                    if (!result) {
                      toast.info("Forge a document first to unlock AI Refinement.");
                      return;
                    }
                    setRightActiveTab("refine");
                  }}
                  className={`text-[9.5px] font-bold uppercase tracking-widest flex items-center gap-1.5 py-4 border-b-2 transition-all relative ${rightActiveTab === "refine" ? "text-brand-accent border-brand-accent font-black" : "text-brand-muted hover:text-white border-transparent"} ${!result ? "opacity-30 cursor-not-allowed" : ""}`}
                >
                  <Sparkles className="w-3 h-3" />
                  AI REFINER
                  {result && (
                    <span className="absolute top-3 -right-2 w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse" />
                  )}
                </button>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsRightSidebarOpen(false)}
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

                    {/* Repo Input */}
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-mono tracking-widest text-brand-muted ml-0.5">Repository URL</label>
                      <div className="relative group">
                        <Github className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 opacity-30 group-focus-within:opacity-100 transition-opacity" />
                        <Input 
                          placeholder="Target repository..."
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

                  </div>
                ) : (
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
