import React, { useState } from 'react';
import { ShieldCheck, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';

export const ResponsibleUseCard: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden transition shadow-sm">
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-4 py-3 bg-slate-950/60 hover:bg-slate-950 flex items-center justify-between cursor-pointer border-b border-slate-800/60 select-none"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold text-slate-200">
            🛡️ Responsible Use & Digital Trust Advisory
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 hidden sm:inline">
            Educational & Simulation Mandate
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <span className="text-[11px]">{isExpanded ? 'Collapse' : 'Read Guidelines'}</span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 sm:p-5 space-y-4 text-xs font-sans text-slate-300 bg-slate-950/40">
          {/* AI-Generated Infrastructure Notice */}
          <div className="p-3.5 rounded-lg bg-amber-950/20 border border-amber-900/40 space-y-1.5">
            <div className="font-semibold text-amber-200 flex items-center gap-1.5 font-mono text-[11px]">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              AI-Generated Infrastructure Notice:
            </div>
            <p className="text-[11px] text-amber-300/90 leading-relaxed">
              This tool leverages Large Language Models (LLMs) to interpret network diagrams and generate Cisco IOS configurations. While designed to adhere to CCNA standards, AI models are subject to <strong>visual misinterpretations (hallucinations)</strong> and edge-case errors.
            </p>
          </div>

          {/* User Guidelines */}
          <div className="space-y-2">
            <div className="font-mono font-bold text-slate-200 text-[11px]">
              User Guidelines:
            </div>
            <ol className="list-decimal list-inside space-y-2 text-[11px] leading-relaxed text-slate-300">
              <li>
                <strong className="text-slate-100">Do Not Push Blindly:</strong> Configurations generated here are for <strong>educational, simulation, and lab validation purposes only</strong> (e.g., Cisco Packet Tracer, GNS3, EVE-NG). Never paste AI output directly into production hardware.
              </li>
              <li>
                <strong className="text-slate-100">Verify Interfaces & Subnets:</strong> Always cross-reference the generated addressing table and port numbers against your visual diagram. The AI may misread blurry or overlapping labels.
              </li>
              <li>
                <strong className="text-slate-100">Sanitize Data Before Upload:</strong> Do <strong>not</strong> upload diagrams containing proprietary infrastructure details, real public IP pools, or confidential network hostnames.
              </li>
              <li>
                <strong className="text-slate-100">Replace Credentials:</strong> Ensure all default passwords (<code className="text-emerald-400 font-mono">enable secret</code>, <code className="text-emerald-400 font-mono">line vty</code>) are updated to organization-approved secrets before testing.
              </li>
            </ol>
          </div>

          <div className="text-[11px] italic text-slate-400 border-t border-slate-800/80 pt-3">
            The engineer operating this tool retains ultimate responsibility for all network configurations and architectural decisions.
          </div>
        </div>
      )}
    </div>
  );
};
