import React, { useState } from 'react';
import { ShieldCheck, BookOpen, CheckSquare, Copy, Check, Terminal, ExternalLink, Lightbulb, CheckCircle2 } from 'lucide-react';
import { Phase4Rationale } from '../types/network';

interface Phase4RationaleProps {
  rationale: Phase4Rationale;
}

export const Phase4RationaleView: React.FC<Phase4RationaleProps> = ({ rationale }) => {
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});

  const handleCopy = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(cmd);
    setTimeout(() => setCopiedCmd(null), 1500);
  };

  const handleCopyAllVerifications = () => {
    let text = '! =======================================================\n! CCNA 200-301 LAB CLI VERIFICATION SUITE\n! =======================================================\n\n';
    rationale.verifications.forEach((v) => {
      text += `! [${v.device}] ${v.purpose}\n`;
      text += `${v.command}\n\n`;
    });
    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const toggleStep = (stepNum: number) => {
    setCompletedSteps((prev) => ({
      ...prev,
      [stepNum]: !prev[stepNum],
    }));
  };

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2 mb-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 text-xs font-mono font-bold">
            4
          </span>
          PHASE 4 - Technical Rationale & Packet Tracer Verification Plan
        </h3>
        <p className="text-sm text-slate-300 leading-relaxed font-sans">
          This phase provides rigorous CCNA 200-301 technical justifications for every architectural choice
          (addressing, hardening, STP defense, routing), followed by a deterministic testing plan for Packet Tracer.
        </p>
      </div>

      {/* 4 Architectural Justification Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Subnetting Rationale */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm mb-3">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <Lightbulb className="w-4 h-4" />
              </div>
              VLSM Subnetting Architecture & Efficiency
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              {rationale.technicalRationale.subnetting}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] font-mono text-emerald-400/90 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Eliminates IPv4 address exhaustion & fragmentation</span>
          </div>
        </div>

        {/* Device Hardening Rationale */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm mb-3">
              <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <ShieldCheck className="w-4 h-4" />
              </div>
              Device Hardening & Administrative Access Control
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              {rationale.technicalRationale.hardening}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] font-mono text-amber-400/90 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>RFC-compliant password hashing & SSHv2 encryption</span>
          </div>
        </div>

        {/* Layer 2 Security Rationale */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm mb-3">
              <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                <ShieldCheck className="w-4 h-4" />
              </div>
              Layer 2 Security, STP & PortFast / BPDU Guard
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              {rationale.technicalRationale.layer2Security}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] font-mono text-cyan-400/90 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Neutralizes VLAN hopping & rogue bridge takeovers</span>
          </div>
        </div>

        {/* Routing Rationale */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-blue-400 font-semibold text-sm mb-3">
              <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <BookOpen className="w-4 h-4" />
              </div>
              Routing Protocol Convergence & Passive Interfaces
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              {rationale.technicalRationale.routing}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] font-mono text-blue-400/90 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Prevents OSPF hello leaking into user segments</span>
          </div>
        </div>
      </div>

      {/* Verification Commands Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              Packet Tracer / Cisco CLI Verification Commands
            </h4>
            <div className="text-xs text-slate-400 mt-0.5">
              Run these commands to validate interface line status, VLAN trunks, routing tables, and connectivity.
            </div>
          </div>

          <button
            onClick={handleCopyAllVerifications}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-mono font-medium transition cursor-pointer"
          >
            {copiedAll ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedAll ? 'Copied Verification Suite!' : 'Copy Verification Suite'}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4 font-semibold">Device</th>
                <th className="py-3 px-4 font-semibold">Verification Command</th>
                <th className="py-3 px-4 font-semibold">Category</th>
                <th className="py-3 px-4 font-semibold">Diagnostic Purpose</th>
                <th className="py-3 px-4 font-semibold">Expected Cisco IOS Output</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {rationale.verifications.map((v, i) => (
                <tr key={i} className="hover:bg-slate-800/40 transition">
                  <td className="py-3 px-4 font-bold text-slate-200">{v.device}</td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => handleCopy(v.command)}
                      className="flex items-center gap-2 px-2 py-1 bg-slate-950 rounded border border-slate-800 hover:border-emerald-500/50 text-emerald-300 font-bold group cursor-pointer"
                      title="Click to copy command"
                    >
                      <span>{v.command}</span>
                      {copiedCmd === v.command ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3 text-slate-500 group-hover:text-slate-300 transition" />
                      )}
                    </button>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 font-semibold">
                      {v.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-300 font-sans text-[11px]">{v.purpose}</td>
                  <td className="py-3 px-4">
                    <pre className="text-[10px] text-slate-400 bg-slate-950/80 p-2 rounded border border-slate-800/70 whitespace-pre font-mono max-w-xs overflow-x-auto">
                      {v.expectedOutput}
                    </pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Step-by-Step Packet Tracer Lab Checklist */}
      {rationale.testingPlan && rationale.testingPlan.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-emerald-400" />
              Step-by-Step Packet Tracer Lab Verification Plan
            </h4>
            <span className="text-xs font-mono text-slate-400">
              {Object.values(completedSteps).filter(Boolean).length} / {rationale.testingPlan.length} Steps Completed
            </span>
          </div>

          <div className="space-y-3">
            {rationale.testingPlan.map((step) => {
              const isDone = !!completedSteps[step.step];
              return (
                <div
                  key={step.step}
                  onClick={() => toggleStep(step.step)}
                  className={`p-4 rounded-xl border transition cursor-pointer flex items-start gap-3 ${
                    isDone
                      ? 'bg-emerald-950/20 border-emerald-800/50 text-slate-300'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-200'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold transition ${
                        isDone
                          ? 'bg-emerald-500 text-slate-950'
                          : 'border border-slate-600 bg-slate-900 text-slate-400'
                      }`}
                    >
                      {isDone ? '✓' : step.step}
                    </div>
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-semibold ${isDone ? 'line-through text-slate-400' : 'text-slate-100'}`}>
                        {step.title}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed font-sans">
                      {step.description}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1 font-mono text-[11px]">
                      {step.commands.map((cmd) => (
                        <span
                          key={cmd}
                          className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-emerald-400 font-bold"
                        >
                          {cmd}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
