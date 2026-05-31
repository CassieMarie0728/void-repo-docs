import { useMemo } from "react";
import { ShieldCheck, ShieldAlert, Sparkles, Scale, Info, CheckCircle2, AlertTriangle, Mail, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AuditRule {
  id: string;
  title: string;
  description: string;
  category: "Legal" | "Privacy" | "Technical";
  severity: "high" | "medium" | "low";
  checkFn: (text: string) => boolean;
  fixPrompt: string;
  missingFailureTip: string;
}

// Comprehensive compliance checklist
const AUDIT_RULES: AuditRule[] = [
  {
    id: "liability",
    title: "Limitation of Liability Caps",
    description: "Inserts statutory limits to protect project authors, contributors, and legal entities from extensive remote or consequential damages.",
    category: "Legal",
    severity: "high",
    checkFn: (text) => {
      const lower = text.toLowerCase();
      return (
        lower.includes("limitation of liability") ||
        lower.includes("limit of liability") ||
        (lower.includes("liable") && lower.includes("consequential") && lower.includes("damages")) ||
        lower.includes("liability cap")
      );
    },
    fixPrompt: "Inject a highly professional corporate-grade LIMITATION OF LIABILITY section. Ensure it disclaims liability for any indirect, incidental, special, exemplary, or consequential damages, and caps total direct liability at a minimal amount (e.g. $0 or fees paid), shielding the author/company comprehensively.",
    missingFailureTip: "Vulnerable to uncapped structural legal claims. Disclaiming liability is essential for open source and technical distribution.",
  },
  {
    id: "disclaimer",
    title: "Disclaimer of Warranties (AS-IS)",
    description: "Disclaims all implied warranties of merchantability, title, quiet enjoyment, and suitability to prevent breach-of-contract or defect claims.",
    category: "Legal",
    severity: "high",
    checkFn: (text) => {
      const lower = text.toLowerCase();
      return (
        lower.includes("warranty disclaimer") ||
        lower.includes("disclaimer of warranties") ||
        lower.includes("as is") ||
        lower.includes("as-is") ||
        lower.includes("without warranty") ||
        lower.includes("merchantability") ||
        lower.includes("implied warranties")
      );
    },
    fixPrompt: "Add a prominent, high-contrast (or uppercase) DISCLAIMER OF WARRANTIES section stating that the software/service is provided on an 'AS-IS' and 'AS-AVAILABLE' basis, disclaiming any express or implied warranties including merchantability, fitness for a particular purpose, non-infringement, or title.",
    missingFailureTip: "Your product carries an implied warranty of specific fitness, exposing you to defect or performance lawsuits.",
  },
  {
    id: "governing_law",
    title: "Governing Law & Jurisdiction",
    description: "Forces users or consumers to resolve disputes only in your preferred courtroom under your selected state/country laws.",
    category: "Legal",
    severity: "high",
    checkFn: (text) => {
      const lower = text.toLowerCase();
      return (
        lower.includes("governing law") ||
        lower.includes("jurisdiction") ||
        lower.includes("dispute resolution") ||
        lower.includes("place of arbitration") ||
        lower.includes("arbitration clause") ||
        lower.includes("choice of law")
      );
    },
    fixPrompt: "Integrate a robust GOVERNING LAW AND JURISDICTION section. Specify that this agreement, document, or license is governed by, and construed in accordance with, the laws of [Governing Country/State] without regard to conflict of law principles, and that any disputes must be settled exclusively in the state/federal courts of [Preferred City/Jurisdiction] or via binding arbitration.",
    missingFailureTip: "Without default jurisdiction guidelines, buyers or users can sue you in foreign courts under external state laws.",
  },
  {
    id: "gdpr_privacy",
    title: "GDPR, CCPA & Privacy Safeguards",
    description: "Ensures legal compliance for data handling protocols, cookie audits, browser profiling, and user access/deletion rights of PII records.",
    category: "Privacy",
    severity: "medium",
    checkFn: (text) => {
      const lower = text.toLowerCase();
      return (
        lower.includes("gdpr") ||
        lower.includes("ccpa") ||
        lower.includes("privacy rights") ||
        lower.includes("cookie") ||
        lower.includes("personal data") ||
        lower.includes("opt-out") ||
        lower.includes("data deletion") ||
        lower.includes("subject rights") ||
        lower.includes("data protection")
      );
    },
    fixPrompt: "Flesh out a comprehensive PRIVACY COMPLIANCE & DATA SUBJECT RIGHTS section. Include specific disclosures for GDPR and CCPA, detailing that users have the right to request access, rectification, portability, deletion of their personal identity information (PII), and can opt-out of cookie trackers or profiling.",
    missingFailureTip: "Exposes project to massive regulatory privacy audits. Collecting emails or tracking IPs without GDPR disclosure carries statutory compliance risks.",
  },
  {
    id: "termination",
    title: "Termination & Access Revocation",
    description: "Authorizes immediate suspension and permanent bans if user abuses, violates guidelines, or breaches code-of-conduct safety thresholds.",
    category: "Legal",
    severity: "medium",
    checkFn: (text) => {
      const lower = text.toLowerCase();
      return (
        lower.includes("terminate") ||
        lower.includes("termination") ||
        lower.includes("revoke access") ||
        lower.includes("suspend") ||
        lower.includes("breach") ||
        lower.includes("permanent ban")
      );
    },
    fixPrompt: "Add a clear TERMINATION clause that defines high-level conditions under which a user's license, access token, or user account can be instantly suspended, revoked, or permanently terminated without notice, due to breach, misconduct, or intellectual property abuse.",
    missingFailureTip: "Lacks revocation terms. Users might challenge account bans, arguing breach of license without valid grounds.",
  },
  {
    id: "email_contact",
    title: "Operational Contact Information",
    description: "Displays clear, designated inquiries pathways for receiving legal notices, security disclosures, or code audits.",
    category: "Technical",
    severity: "low",
    checkFn: (text) => {
      const lower = text.toLowerCase();
      const hasEmailWord = lower.includes("contact") || lower.includes("email") || lower.includes("support") || lower.includes("inquiries");
      const hasEmailSymbol = /[\w.-]+@[\w.-]+\.\w+/.test(text);
      const hasPlaceholder = text.includes("[Contact Email]") || text.includes("[Email Address]");
      return (hasEmailWord && (hasEmailSymbol || hasPlaceholder)) || lower.includes("mailto:");
    },
    fixPrompt: "Securely weave in a designated CONTACT INFORMATION section at the closing of the document, which clearly provides the email address placeholder [Contact Email], or an inquiries physical address, where legal requests, questions, or DMCA compliance alerts must be submitted.",
    missingFailureTip: "No communications point defined. Increases friction for resolving legal or copyright concerns cooperatively.",
  },
  {
    id: "acceptable_conduct",
    title: "Acceptable Conduct Constraints",
    description: "Establishes standard protective boundaries against harassment, abuse, malicious coding, security vulnerabilities, or toxic conduct.",
    category: "Technical",
    severity: "low",
    checkFn: (text) => {
      const lower = text.toLowerCase();
      return (
        lower.includes("harassment") ||
        lower.includes("acceptable use") ||
        lower.includes("conduct") ||
        lower.includes("behavior") ||
        lower.includes("contribution") ||
        lower.includes("respectful") ||
        lower.includes("abuse") ||
        lower.includes("malicious") ||
        lower.includes("vulnerabilit")
      );
    },
    fixPrompt: "Integrate an robust EXPECTED CONDUCT, ETHICAL BEHAVIOR, or ACCEPTABLE USE clause detailing restrictions against toxic conduct, harassment, malicious contributions, or automated misuse.",
    missingFailureTip: "Exposes project communities, packages, or wikis to vandalism, unpoliced harassment, or toxic coding submissions.",
  },
];

interface ComplianceAuditProps {
  markdown: string;
  isRefining: boolean;
  onAutoFix: (prompt: string) => void;
}

export function ComplianceAudit({ markdown, isRefining, onAutoFix }: ComplianceAuditProps) {
  const auditResults = useMemo(() => {
    if (!markdown) {
      return { checks: [], score: 0, passedCount: 0, failedCount: 0 };
    }

    const checks = AUDIT_RULES.map((rule) => {
      const passed = rule.checkFn(markdown);
      return {
        ...rule,
        passed,
      };
    });

    const passedCount = checks.filter((c) => c.passed).length;
    const failedCount = checks.length - passedCount;
    const score = Math.round((passedCount / checks.length) * 100);

    return { checks, score, passedCount, failedCount };
  }, [markdown]);

  const { score, checks, passedCount, failedCount } = auditResults;

  // Render colorful circular rating dial
  const getScoreColor = (val: number) => {
    if (val >= 85) return "text-emerald-500 stroke-emerald-500 shadow-emerald-500/25";
    if (val >= 50) return "text-amber-500 stroke-amber-500 shadow-amber-500/25";
    return "text-rose-600 stroke-rose-600 shadow-rose-600/25";
  };

  const getScoreBg = (val: number) => {
    if (val >= 85) return "bg-emerald-500/10 border-emerald-500/30";
    if (val >= 50) return "bg-amber-500/10 border-amber-500/30";
    return "bg-rose-500/10 border-rose-500/30";
  };

  // SVG parameters
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  if (!markdown) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
        <ShieldAlert className="w-12 h-12 text-brand-muted/20 animate-pulse" />
        <div className="space-y-1">
          <h4 className="serif-text text-sm italic text-brand-muted">The Audit Board is vacant.</h4>
          <p className="text-[9px] font-mono uppercase tracking-widest text-brand-muted/30">
            Generate a document to run compliance scanning.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Visual Ring Header */}
      <div className={`p-5 rounded-lg border flex items-center justify-between gap-5 transition-all duration-300 ${getScoreBg(score)}`}>
        <div className="space-y-1">
          <h4 className="text-[10px] font-mono uppercase tracking-widest text-white font-bold flex items-center gap-1.5">
            <Scale className="w-3.5 h-3.5 text-brand-accent animate-pulse" />
            Compliance Shield Score
          </h4>
          <p className="text-[9px] text-brand-muted/80 leading-normal max-w-[150px]">
            {score === 100 
              ? "Prudent legal coverage. This document is fully fortified." 
              : `Protected and compliant on ${passedCount} of 7 key operational clauses.`}
          </p>
        </div>

        {/* Circular Gauge */}
        <div className="relative w-20 h-20 shrink-0">
          <svg className="w-full h-full transform -rotate-90">
            {/* Track Circle */}
            <circle
              className="text-[#151515] stroke-current"
              strokeWidth="6"
              cx="40"
              cy="40"
              r={radius}
              fill="transparent"
            />
            {/* Active Arc */}
            <circle
              className={`transition-all duration-1000 ease-out fill-transparent stroke-current ${getScoreColor(score)}`}
              strokeWidth="6"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              cx="40"
              cy="40"
              r={radius}
            />
          </svg>
          {/* Inner Content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center font-mono">
            <span className={`text-md font-black leading-none ${getScoreColor(score).split(" ")[0]}`}>
              {score}%
            </span>
            <span className="text-[7px] text-brand-muted/60 uppercase tracking-widest mt-0.5">COVERAGE</span>
          </div>
        </div>
      </div>

      {/* Audit Stats */}
      <div className="grid grid-cols-2 gap-2 text-center text-[10px] font-mono">
        <div className="bg-black/40 border border-brand-border/40 p-2 rounded">
          <span className="text-emerald-400 font-bold block text-sm">{passedCount}</span>
          <span className="text-brand-muted uppercase text-[8px] tracking-wider">Secured Clauses</span>
        </div>
        <div className="bg-black/40 border border-brand-border/40 p-2 rounded">
          <span className={`font-bold block text-sm ${failedCount > 0 ? "text-rose-500 text-shadow" : "text-brand-muted"}`}>
            {failedCount}
          </span>
          <span className="text-brand-muted uppercase text-[8px] tracking-wider">Missing Safeguard{failedCount !== 1 && "s"}</span>
        </div>
      </div>

      {/* Checklist Sections */}
      <div className="space-y-3">
        <label className="text-[10px] uppercase font-mono tracking-widest text-brand-muted ml-0.5 block">Audit Breakdown</label>
        
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
          {checks.map((rule) => (
            <div
              key={rule.id}
              className={`p-3.5 rounded border transition-all duration-300 ${
                rule.passed
                  ? "bg-emerald-950/[0.03] border-emerald-500/10"
                  : rule.severity === "high"
                  ? "bg-rose-950/[0.04] border-rose-500/20"
                  : "bg-amber-950/[0.02] border-amber-500/20"
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  <div className="mt-0.5 shrink-0">
                    {rule.passed ? (
                      <ShieldCheck className="w-4 h-4 text-emerald-400 fill-emerald-950/20" />
                    ) : (
                      <ShieldAlert className={`w-4 h-4 ${rule.severity === "high" ? "text-rose-500 animate-pulse" : "text-amber-500"}`} />
                    )}
                  </div>
                  <div>
                    <h5 className="text-[10.5px] font-bold font-mono text-white flex items-center gap-1.5">
                      {rule.title}
                      {!rule.passed && (
                        <span className={`text-[7px] uppercase tracking-widest px-1 rounded font-normal bg-black/60 border ${
                          rule.severity === "high" 
                            ? "text-rose-500 border-rose-500/30 font-black" 
                            : rule.severity === "medium" 
                            ? "text-amber-500 border-amber-500/30" 
                            : "text-brand-muted border-brand-border/30"
                        }`}>
                          {rule.severity}
                        </span>
                      )}
                    </h5>
                    <p className="text-[9.5px] text-brand-muted font-serif italic leading-normal mt-0.5">
                      {rule.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Status Details */}
              <div className="mt-2.5 pt-2 border-t border-brand-border/10">
                {rule.passed ? (
                  <div className="flex items-center gap-1.5 text-[8.5px] font-mono text-emerald-400/80 uppercase">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    Verified Safe: Compliant clause structures detected.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div className="flex items-start gap-1 text-[8.5px] font-mono text-rose-400 leading-normal uppercase">
                      <AlertTriangle className="w-3" />
                      <span>{rule.missingFailureTip}</span>
                    </div>

                    {/* Gemini Instant Fix Trigger */}
                    <Button
                      size="sm"
                      disabled={isRefining}
                      onClick={() => onAutoFix(rule.fixPrompt)}
                      className="w-full h-7 text-[9px] font-mono uppercase bg-brand-accent hover:bg-brand-accent/90 text-white rounded flex items-center justify-center gap-1.5 tracking-wider active:scale-95"
                    >
                      <Sparkles className="w-3 h-3 text-brand-bg fill-white animate-pulse" />
                      {isRefining ? "FORTIFYING INTEGRITY..." : "AUTO-FIX WITH GEMINI"}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
