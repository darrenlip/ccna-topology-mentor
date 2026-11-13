import React from 'react';
import { ShieldCheck, AlertTriangle, Eye, Lock, ShieldAlert, X, ExternalLink } from 'lucide-react';

interface ResponsibleUseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ResponsibleUseModal: React.FC<ResponsibleUseModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl relative space-y-5 text-slate-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-start gap-3.5 border-b border-slate-800 pb-4">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              🛡️ Responsible Use & Digital Trust Advisory
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              CCNA 200-301 Automated Architecture & Cisco IOS CLI Assistant
            </p>
          </div>
        </div>

        {/* AI-Generated Infrastructure Notice */}
        <div className="bg-amber-950/20 border border-amber-900/40 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            AI-Generated Infrastructure Notice
          </div>
          <p className="text-xs text-amber-200/90 leading-relaxed font-sans">
            This tool leverages Large Language Models (LLMs) to interpret network diagrams and generate Cisco IOS configurations. While designed to adhere to CCNA standards, AI models are subject to <strong>visual misinterpretations (hallucinations)</strong> and edge-case errors.
          </p>
        </div>

        {/* User Guidelines */}
        <div className="space-y-3">
          <h4 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
            User Guidelines:
          </h4>
          
          <div className="space-y-2.5 text-xs font-sans">
            <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 flex items-start gap-3">
              <span className="flex items-center justify-center w-5 h-5 rounded bg-emerald-500/20 text-emerald-400 font-mono font-bold text-[11px] shrink-0 mt-0.5">
                1
              </span>
              <div>
                <strong className="text-slate-100">Do Not Push Blindly:</strong> Configurations generated here are for <strong>educational, simulation, and lab validation purposes only</strong> (e.g., Cisco Packet Tracer, GNS3, EVE-NG). Never paste AI output directly into production hardware.
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 flex items-start gap-3">
              <span className="flex items-center justify-center w-5 h-5 rounded bg-cyan-500/20 text-cyan-400 font-mono font-bold text-[11px] shrink-0 mt-0.5">
                2
              </span>
              <div>
                <strong className="text-slate-100">Verify Interfaces & Subnets:</strong> Always cross-reference the generated addressing table and port numbers against your visual diagram. The AI may misread blurry or overlapping labels.
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 flex items-start gap-3">
              <span className="flex items-center justify-center w-5 h-5 rounded bg-amber-500/20 text-amber-400 font-mono font-bold text-[11px] shrink-0 mt-0.5">
                3
              </span>
              <div>
                <strong className="text-slate-100">Sanitize Data Before Upload:</strong> Do <strong>not</strong> upload diagrams containing proprietary infrastructure details, real public IP pools, or confidential network hostnames.
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 flex items-start gap-3">
              <span className="flex items-center justify-center w-5 h-5 rounded bg-purple-500/20 text-purple-400 font-mono font-bold text-[11px] shrink-0 mt-0.5">
                4
              </span>
              <div>
                <strong className="text-slate-100">Replace Credentials:</strong> Ensure all default passwords (<code className="text-purple-300 font-mono">enable secret</code>, <code className="text-purple-300 font-mono">line vty</code>) are updated to organization-approved secrets before testing.
              </div>
            </div>
          </div>
        </div>

        {/* Disclaimer Footer Note */}
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 italic text-center font-sans">
          The engineer operating this tool retains ultimate responsibility for all network configurations and architectural decisions.
        </div>

        {/* Acknowledge Button */}
        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-mono font-bold transition cursor-pointer shadow-lg shadow-emerald-950/50"
          >
            I Acknowledge & Understand
          </button>
        </div>
      </div>
    </div>
  );
};
