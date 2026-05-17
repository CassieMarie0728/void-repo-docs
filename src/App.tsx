import { useState } from "react";
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
  ShieldAlert
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
import { DocumentType, Tone, Length, GenRequest, GenResponse } from "./types";
import axios from "axios";

const documentTypes = Object.values(DocumentType);
const tones = Object.values(Tone);
const lengths = Object.values(Length);

export default function App() {
  const [repoUrl, setRepoUrl] = useState("");
  const [docType, setDocType] = useState<DocumentType>(DocumentType.Readme);
  const [tone, setTone] = useState<Tone>(Tone.Professional);
  const [length, setLength] = useState<Length>(Length.Medium);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<GenResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!repoUrl) {
      toast.error("Enter a repo URL, unless you want me to write documentation for your imaginary friends.");
      return;
    }

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
      toast.success("I've finished your little document. Try not to break it.");
    } catch (error: any) {
      const message = error.response?.data?.error || "Even I couldn't summarize that mess.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result.markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Copied. Go spam someone else's repo.");
    }
  };

  const handleDownload = () => {
    if (result) {
      const blob = new Blob([result.markdown], { type: "text/markdown" });
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

  return (
    <div className="flex h-screen bg-brand-bg text-brand-text overflow-hidden selection:bg-brand-accent/30 selection:text-white">
      <Toaster position="top-right" theme="dark" />

      {/* Sidebar: Navigation & Personality */}
      <aside className="w-64 bg-brand-sidebar border-r border-brand-border flex flex-col shrink-0">
        <div className="p-8">
          <div className="text-3xl font-serif italic text-white tracking-tighter mb-1">VOID.</div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-brand-accent font-bold opacity-80">Voice Of Intense Disdain</div>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4">
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

        <div className="p-6 border-t border-brand-border">
          <div className="bg-black/40 p-4 rounded-lg border border-brand-border">
            <p className="text-[11px] leading-relaxed text-brand-muted italic font-serif">
              "I'm currently calculating exactly how many lawyers will laugh at your Terms of Service."
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col border-r border-brand-border h-full relative overflow-hidden bg-[#080808]">
        <header className="h-20 border-b border-brand-border flex items-center justify-between px-8 shrink-0">
          <div>
            <h2 className="text-xs font-bold text-brand-muted uppercase tracking-widest">Active Session: {result ? "A Rare Success" : "Waiting for Mediocrity"}</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_#22c55e]"></div>
            <span className="text-[10px] text-brand-muted mono-text uppercase tracking-tighter">Online (Regrettably)</span>
          </div>
        </header>

        <div className="flex-1 overflow-hidden flex flex-col">
          <ScrollArea className="flex-1">
            <div className="p-8 space-y-12 pb-24">
              <AnimatePresence mode="wait">
                {result ? (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-brand-accent tracking-widest">Output Package</span>
                        <h3 className="serif-text text-2xl text-white italic">{result.docType}</h3>
                      </div>
                      <div className="flex gap-2">
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
                      </div>
                    </div>
                    
                    <Card className="bg-black/60 border-brand-border/50">
                      <CardContent className="p-8 md:p-12 overflow-hidden">
                        <div className="markdown-body">
                          <ReactMarkdown>{result.markdown}</ReactMarkdown>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
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
                )}
              </AnimatePresence>
            </div>
          </ScrollArea>
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
      <aside className="w-80 bg-brand-config p-8 flex flex-col gap-8 shrink-0 overflow-y-auto border-l border-brand-border">
        <div className="space-y-1">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-muted">Configuration Matrix</h3>
          <p className="text-[10px] text-brand-muted/50 italic font-serif">Adjust the parameters of your failure.</p>
        </div>

        <div className="space-y-6">
          {/* Repo Input */}
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-mono tracking-widest text-brand-muted ml-1">Repository URL</label>
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
            <label className="text-[10px] uppercase font-mono tracking-widest text-brand-muted ml-1">Document Class</label>
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
            <label className="text-[10px] uppercase font-mono tracking-widest text-brand-muted ml-1">Attitude Modulator</label>
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
            <label className="text-[10px] uppercase font-mono tracking-widest text-brand-muted ml-1">Verbosity Level</label>
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
        </div>

        <div className="mt-auto space-y-4">
           {/* Diagnostics */}
           <div className="pt-6 border-t border-brand-border">
              <div className="text-[10px] uppercase font-bold text-brand-muted mb-3 flex items-center gap-2">
                <ShieldAlert className="w-3 h-3" />
                Diagnostics
              </div>
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
           </div>

           <div className="bg-brand-accent/5 border border-brand-accent/20 p-4 rounded-lg">
              <p className="text-[10px] text-brand-accent/60 leading-relaxed italic font-serif">
                "Warning: Every document generated by this machine contains trace amounts of my disappointment."
              </p>
           </div>

           <footer className="text-center">
            <p className="text-[9px] mono-text opacity-20 uppercase tracking-[0.3em]">
              2026 © C. Crossno
            </p>
          </footer>
        </div>
      </aside>
    </div>
  );
}
