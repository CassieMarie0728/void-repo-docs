import { useState, useMemo } from "react";
import { Copy, Columns, Rows, ArrowLeftRight, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface DiffViewerProps {
  original: string;
  current: string;
  onRevert: () => void;
}

interface DiffItem {
  type: "added" | "removed" | "unchanged";
  text: string;
  originalLineNum?: number;
  currentLineNum?: number;
}

// Highly efficient Longest Common Subsequence line diff algorithm
function computeLineDiff(original: string, current: string): DiffItem[] {
  const oLines = original.split("\n");
  const cLines = current.split("\n");

  const m = oLines.length;
  const n = cLines.length;

  // Initialize DP Matrix
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oLines[i - 1] === cLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to build the diff
  const diff: DiffItem[] = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oLines[i - 1] === cLines[j - 1]) {
      diff.unshift({
        type: "unchanged",
        text: oLines[i - 1],
        originalLineNum: i,
        currentLineNum: j,
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      diff.unshift({
        type: "added",
        text: cLines[j - 1],
        currentLineNum: j,
      });
      j--;
    } else {
      diff.unshift({
        type: "removed",
        text: oLines[i - 1],
        originalLineNum: i,
      });
      i--;
    }
  }

  return diff;
}

export function DiffViewer({ original, current, onRevert }: DiffViewerProps) {
  const [viewType, setViewType] = useState<"unified" | "split">("unified");

  const diffItems = useMemo(() => {
    return computeLineDiff(original, current);
  }, [original, current]);

  // Statistics
  const stats = useMemo(() => {
    let added = 0;
    let removed = 0;
    let unchanged = 0;

    diffItems.forEach((item) => {
      if (item.type === "added") added++;
      else if (item.type === "removed") removed++;
      else unchanged++;
    });

    return { added, removed, unchanged };
  }, [diffItems]);

  const handleCopyCurrent = () => {
    navigator.clipboard.writeText(current);
    toast.success("Current version copied to clipboard.");
  };

  return (
    <div className="flex flex-col h-full bg-[#050505]">
      {/* Diff Controls Header */}
      <div className="bg-[#0c0c0c] px-6 py-3 border-b border-brand-border/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-brand-muted uppercase tracking-[0.2em] flex items-center gap-1.5 font-bold">
            <ArrowLeftRight className="w-3.5 h-3.5 text-brand-accent" />
            Comparison Ledger
          </span>
          <div className="flex gap-2 text-[9px] font-mono">
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              +{stats.added} Additions
            </span>
            <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
              -{stats.removed} Deletions
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <div className="flex items-center bg-black/40 border border-brand-border/40 rounded p-0.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewType("unified")}
              className={`text-[9px] font-mono h-6 px-2 uppercase tracking-wider ${
                viewType === "unified"
                  ? "bg-brand-accent text-white"
                  : "text-brand-muted hover:text-white"
              }`}
            >
              <Rows className="w-3 h-3 mr-1" />
              Unified
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewType("split")}
              className={`text-[9px] font-mono h-6 px-2 uppercase tracking-wider ${
                viewType === "split"
                  ? "bg-brand-accent text-white"
                  : "text-brand-muted hover:text-white"
              }`}
            >
              <Columns className="w-3 h-3 mr-1" />
              Side-by-Side
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onRevert}
            className="text-[9px] font-mono h-7 px-2 border.5 border-brand-accent/20 text-brand-accent hover:bg-brand-accent/10 hover:text-white rounded uppercase"
          >
            Revert to Original
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyCurrent}
            className="text-[9px] font-mono h-7 px-2 border.5 border-brand-border text-brand-muted hover:text-white hover:bg-white/5 rounded uppercase"
          >
            <Copy className="w-3 h-3 mr-1" />
            Copy Current
          </Button>
        </div>
      </div>

      {stats.added === 0 && stats.removed === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-brand-muted/40 animate-pulse" />
          <div className="space-y-1">
            <h4 className="serif-text text-md italic text-brand-muted">No alterations detected.</h4>
            <p className="text-[10px] font-mono uppercase tracking-widest text-brand-muted/30">
              The workspace matches the original draft perfectly.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto min-h-0 custom-scrollbar p-6">
          {viewType === "unified" ? (
            /* Unified Diff View */
            <div className="rounded-lg border border-brand-border/40 overflow-hidden bg-[#070707] font-mono text-[11px] leading-relaxed select-none">
              <table className="w-full border-collapse">
                <tbody>
                  {diffItems.map((item, index) => {
                    let rowBg = "bg-transparent";
                    let textClass = "text-brand-text/80";
                    let sign = " ";
                    let signClass = "text-brand-muted/40";

                    if (item.type === "added") {
                      rowBg = "bg-emerald-950/15 border-l-2 border-emerald-500/80";
                      textClass = "text-emerald-300 font-medium";
                      sign = "+";
                      signClass = "text-emerald-500 font-bold bg-emerald-950/25";
                    } else if (item.type === "removed") {
                      rowBg = "bg-rose-950/15 border-l-2 border-rose-500/80 line-through decoration-rose-500/50";
                      textClass = "text-rose-300/75";
                      sign = "-";
                      signClass = "text-rose-500 font-bold bg-rose-950/25";
                    }

                    return (
                      <tr key={index} className={`${rowBg} hover:bg-white/[0.02] group`}>
                        {/* Line number Columns */}
                        <td className="w-12 text-right pr-2 text-[9px] text-brand-muted/30 select-none py-0.5 border-r border-brand-border/10 bg-black/20">
                          {item.originalLineNum || ""}
                        </td>
                        <td className="w-12 text-right pr-2 text-[9px] text-brand-muted/30 select-none py-0.5 border-r border-brand-border/10 bg-black/20">
                          {item.currentLineNum || ""}
                        </td>
                        {/* Sign Column */}
                        <td className={`w-6 text-center select-none py-0.5 text-[10px] ${signClass}`}>
                          {sign}
                        </td>
                        {/* Text content */}
                        <td className={`pl-4 py-0.5 text-left whitespace-pre-wrap break-all ${textClass}`}>
                          {item.text || " "}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            /* Split Diff View */
            <div className="grid grid-cols-2 gap-4 h-full min-h-[400px]">
              {/* Left Panel: Original Draft */}
              <div className="flex flex-col rounded-lg border border-brand-border/40 overflow-hidden bg-[#070707] font-mono text-[11px] leading-relaxed select-none">
                <div className="bg-black/40 px-4 py-1.5 border-b border-brand-border/30 text-[9px] text-brand-muted uppercase tracking-widest font-black flex justify-between select-none shrink-0">
                  <span>ORIGINAL AI GENERATION</span>
                  <span className="text-rose-500/60 font-bold">DELETIONS HIGHLIGHTED</span>
                </div>
                <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar p-3 space-y-0.5">
                  {diffItems
                    .filter((item) => item.type !== "added")
                    .map((item, index) => {
                      const isRemoved = item.type === "removed";
                      return (
                        <div
                          key={index}
                          className={`flex items-start rounded ${
                            isRemoved
                              ? "bg-rose-950/20 text-rose-300/70 border-l border-rose-500/50 line-through decoration-rose-500/30"
                              : "text-brand-text/50"
                          }`}
                        >
                          <span className="w-8 text-right pr-2 text-[8px] text-brand-muted/20 shrink-0 select-none user-select-none">
                            {item.originalLineNum}
                          </span>
                          <span className="pl-2 whitespace-pre-wrap break-all leading-normal">
                            {item.text || " "}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Right Panel: Current Workspace */}
              <div className="flex flex-col rounded-lg border border-brand-border/40 overflow-hidden bg-[#070707] font-mono text-[11px] leading-relaxed select-none">
                <div className="bg-black/40 px-4 py-1.5 border-b border-brand-border/30 text-[9px] text-brand-muted uppercase tracking-widest font-black flex justify-between select-none shrink-0">
                  <span>YOUR WORKSPACE EDITS</span>
                  <span className="text-emerald-500/70 font-bold">ADDITIONS HIGHLIGHTED</span>
                </div>
                <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar p-3 space-y-0.5">
                  {diffItems
                    .filter((item) => item.type !== "removed")
                    .map((item, index) => {
                      const isAdded = item.type === "added";
                      return (
                        <div
                          key={index}
                          className={`flex items-start rounded ${
                            isAdded
                              ? "bg-emerald-950/20 text-emerald-300 font-medium border-l border-emerald-500/50"
                              : "text-brand-text/80"
                          }`}
                        >
                          <span className="w-8 text-right pr-2 text-[8px] text-brand-muted/20 shrink-0 select-none user-select-none">
                            {item.currentLineNum}
                          </span>
                          <span className="pl-2 whitespace-pre-wrap break-all leading-normal">
                            {item.text || " "}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
