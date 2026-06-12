import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { 
  Check, 
  Copy, 
  ExternalLink, 
  FilePlus, 
  HelpCircle, 
  Key, 
  Loader2, 
  Sparkles
} from "lucide-react";
import { apiClient } from "../api";

interface NotionExportDialogProps {
  markdown: string;
  docType: string;
  repoUrl: string;
}

export function NotionExportDialog({ markdown, docType, repoUrl }: NotionExportDialogProps) {
  const [token, setToken] = useState("");
  const [parentPageId, setParentPageId] = useState("");
  const [title, setTitle] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [notionUrl, setNotionUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"api" | "copy">("api");
  const [showGuide, setShowGuide] = useState(false);

  // Load configured Notion API settings
  useEffect(() => {
    const savedToken = localStorage.getItem("void_notion_token") || "";
    const savedPageId = localStorage.getItem("void_notion_page_id") || "";
    setToken(savedToken);
    setParentPageId(savedPageId);
  }, []);

  // Update dynamic title
  useEffect(() => {
    let repoName = "Repository";
    if (repoUrl) {
      const parts = repoUrl.replace(/\/$/, "").split("/");
      if (parts.length > 0) {
        repoName = parts[parts.length - 1];
      }
    }
    setTitle(`${docType} - ${repoName}`);
  }, [docType, repoUrl]);

  const handleExport = async () => {
    const cleanToken = token.trim();
    const cleanPageId = parentPageId.replace(/-/g, "").trim();

    if (!cleanToken) {
      toast.error("Please enter a valid Notion Integration Token.");
      return;
    }
    if (!cleanPageId || cleanPageId.length !== 32) {
      toast.error("Invalid page ID format. Notion page ID must be exactly a 32-character hexadecimal string.");
      return;
    }

    setIsLoading(true);
    setNotionUrl(null);

    // Persist variables in local storage
    localStorage.setItem("void_notion_token", cleanToken);
    localStorage.setItem("void_notion_page_id", cleanPageId);

    try {
      const response = await apiClient.post<{ success: boolean; url: string }>("/api/export-notion", {
        token: cleanToken,
        parentPageId: cleanPageId,
        title: title.trim(),
        markdown: markdown,
      });

      if (response.data && response.data.success) {
        setNotionUrl(response.data.url);
        toast.success("Document exported to Notion successfully!");
      } else {
        toast.error("Export failed. Notion did not return an access URL.");
      }
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.error || "Failed to push page content to Notion API.";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClipboardCopy = () => {
    navigator.clipboard.writeText(markdown);
    setCopied(true);
    toast.success("Markdown copied! Ready to paste directly into Notion.");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog>
      <DialogTrigger render={
        <Button 
          variant="outline" 
          size="sm" 
          className="h-8 border-brand-border hover:bg-[#981518]/10 hover:border-[#981518]/30 border font-mono text-[10px]"
        />
      }>
        <Sparkles className="w-3 h-3 mr-2 text-brand-accent animate-pulse" />
        EXPORT_NOTION
      </DialogTrigger>
      
      <DialogContent className="max-w-lg bg-brand-bg border-brand-border text-brand-text">
        <DialogHeader>
          <DialogTitle className="serif-text text-xl italic text-white flex items-center gap-2">
            <span className="notion-icon font-sans text-xs bg-white text-black px-1.5 py-0.5 rounded font-black leading-none">N</span>
            Export Document to Notion
          </DialogTitle>
        </DialogHeader>

        {/* Tab Headers */}
        <div className="flex border-b border-brand-border/40 font-mono text-[10px] select-none mt-2">
          <button
            onClick={() => setActiveTab("api")}
            className={`flex-1 py-2 text-center uppercase tracking-widest border-b-2 transition-colors ${activeTab === "api" ? "text-brand-accent border-brand-accent font-bold" : "text-brand-muted hover:text-white border-transparent"}`}
          >
            🔌 API Cloud Sync
          </button>
          <button
            onClick={() => setActiveTab("copy")}
            className={`flex-1 py-2 text-center uppercase tracking-widest border-b-2 transition-colors ${activeTab === "copy" ? "text-brand-accent border-brand-accent font-bold" : "text-brand-muted hover:text-white border-transparent"}`}
          >
            📋 Markdown Paste
          </button>
        </div>

        {activeTab === "api" ? (
          <div className="space-y-4 pt-3">
            {/* Page Title */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-mono tracking-widest text-brand-muted block">Target Page Title</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter page title..."
                className="h-9 bg-black/60 border-brand-border focus:border-[#981518]/40 text-xs font-mono rounded text-white"
              />
            </div>

            {/* Secret Token */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] uppercase font-mono tracking-widest text-brand-muted flex items-center gap-1.5">
                  <Key className="w-3 h-3 text-brand-accent" />
                  Notion Integration Token
                </label>
                <button
                  type="button"
                  onClick={() => setShowGuide(!showGuide)}
                  className="text-[9px] font-mono text-brand-accent hover:underline flex items-center gap-1"
                >
                  <HelpCircle className="w-3 h-3" />
                  Help Config
                </button>
              </div>
              <Input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="secret_xxxxxxxxxxxxxxxxxxxxxxxxxxx..."
                className="h-9 bg-black/60 border-brand-border focus:border-[#981518]/40 text-xs font-mono rounded text-white placeholder:text-brand-muted/20"
              />
            </div>

            {/* Parent Page ID */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-mono tracking-widest text-brand-muted flex items-center gap-1.5 block">
                <FilePlus className="w-3 h-3 text-brand-accent" />
                Target Parent Page ID
              </label>
              <Input
                value={parentPageId}
                onChange={(e) => setParentPageId(e.target.value)}
                placeholder="e.g. 5d5cb21f8a7e4bce96beee3d865cffa2"
                className="h-9 bg-black/60 border-brand-border focus:border-[#981518]/40 text-xs font-mono rounded text-white placeholder:text-brand-muted/20"
              />
            </div>

            {/* Config Tutorial Block */}
            {showGuide && (
              <div className="p-3 bg-black/50 border border-brand-border/40 rounded space-y-2 text-[10px] font-mono text-brand-muted leading-relaxed">
                <p className="text-white font-bold uppercase tracking-wider text-[9px] border-b border-brand-border/20 pb-1">Configuring Notion (3 Steps):</p>
                <ol className="list-decimal pl-4 space-y-1 text-left">
                  <li>Visit <a href="https://notion.so/my-integrations" target="_blank" rel="noopener noreferrer" className="text-brand-accent hover:underline inline-flex items-center gap-0.5">notion.so/my-integrations <ExternalLink className="w-2.5 h-2.5" /></a> and create an <strong>Internal Integration</strong> for your workspace, then copy the Secret Token.</li>
                  <li>Open the target parent page in your browser. Copy the 32-character ID from the URL (the hexadecimal string at the end of the URL before the query params).</li>
                  <li>In Notion, click top-right <span className="text-white font-bold">•••</span>, scroll down to <strong>Connections</strong>, click <strong>Add connection</strong>, and search for/select your newly created integration so it has permission to read and write.</li>
                </ol>
              </div>
            )}

            {/* Success URL block */}
            {notionUrl && (
              <div className="p-3 bg-black/40 border border-emerald-500/30 rounded flex flex-col justify-between items-center gap-2">
                <div className="flex items-center gap-2 text-[10px] font-mono text-emerald-400">
                  <span className="animate-pulse">🟢</span> Export completed! Ready to review inside Notion.
                </div>
                <a
                  href={notionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full text-center h-8 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded flex items-center justify-center gap-1.5 font-mono text-[10px] uppercase font-bold"
                >
                  OPEN IN NOTION <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}

            {/* Export trigger */}
            <Button
              onClick={handleExport}
              disabled={isLoading || !token.trim() || !parentPageId.trim()}
              className="w-full h-10 bg-brand-accent hover:bg-[#981518]/90 text-white font-mono text-xs uppercase tracking-widest rounded-full flex items-center justify-center gap-1.5 shrink-0"
            >
              {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Sparkles className="w-3.5 h-3.5 mr-1 text-brand-bg fill-white animate-pulse" />}
              {isLoading ? "PUSHING CLOUD BLOCKS..." : "EXPORT TO NOTION CLOUD"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 pt-3">
            <div className="p-4 bg-black/40 border border-brand-border/40 rounded space-y-3">
              <div className="flex items-center justify-between border-b border-brand-border/20 pb-2">
                <span className="text-[10px] font-mono text-brand-muted uppercase">Zero Config Fallback</span>
                <span className="text-[8px] bg-brand-accent/15 text-brand-accent px-1.5 py-0.5 rounded uppercase font-bold tracking-widest">Safe & Offline</span>
              </div>
              <p className="text-[11px] font-serif text-brand-muted italic leading-relaxed">
                "Notion natively parses formatted Markdown when pasted. Copy the document raw body, open any Notion block, and paste directly."
              </p>
              <div className="space-y-2 text-[10px] font-mono text-brand-muted/70 pl-1 list-disc text-left">
                <div>🔹 Retains all headers, lists, code samples, and italic formats perfectly.</div>
                <div>🔹 No API secrets, credentials, or network permissions required.</div>
              </div>
            </div>

            <Button
              onClick={handleClipboardCopy}
              className="w-full h-10 bg-white/5 hover:bg-white/10 text-white border border-brand-border font-mono text-xs uppercase tracking-widest rounded-full flex items-center justify-center gap-1.5 shrink-0"
            >
              {copied ? <Check className="w-4 h-4 text-brand-accent mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
              {copied ? "COPIED TO CLIPBOARD!" : "COPY NOTION-READY RAW MARKDOWN"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
