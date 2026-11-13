import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Cable,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
} from 'lucide-react';
import { ArchitectureReport } from '../types/network';
import { runNetworkAudit } from '../utils/networkAuditor';

interface NetworkAuditPanelProps {
  report: ArchitectureReport;
}

export const NetworkAuditPanel: React.FC<NetworkAuditPanelProps> = ({ report }) => {
  const audit = useMemo(() => runNetworkAudit(report), [report]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCabling, setShowCabling] = useState(true);
  const [copiedWiring, setCopiedWiring] = useState(false);

  const handleCopyWiringChecklist = () => {
    const lines = audit.cablingGuide.map(
      (row, idx) =>
        `${idx + 1}. [${row.cableType}] ${row.fromDevice} (${row.fromPort}) <--> ${row.toDevice} (${row.toPort}) — ${row.reason}`
    );
    navigator.clipboard.writeText(
      `PACKET TRACER PHYSICAL CABLING & PINOUT GUIDE\n=============================================\n${lines.join('\n')}`
    );
    setCopiedWiring(true);
    setTimeout(() => setCopiedWiring(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Automated CCNA Engineering Sanity & Bitwise Audit */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">
              Deterministic CCNA Bitwise & Configuration Sanity Audit
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Automated mathematical verification of subnet boundaries, IP uniqueness, STP loop guards, and SSHv2 baselines
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono tabular-nums text-slate-300">
            <span>{audit.passedCount} Passed</span>
            <span aria-hidden="true">·</span>
            <span className={audit.warningCount > 0 ? 'text-amber-400' : 'text-slate-400'}>
              {audit.warningCount} Advisories
            </span>
            <span aria-hidden="true">·</span>
            <span className={audit.failedCount > 0 ? 'text-red-400' : 'text-slate-400'}>
              {audit.failedCount} Conflicts
            </span>
          </div>
        </div>

        <div className="divide-y divide-slate-800/80">
          {audit.checks.map((check) => {
            const isExpanded = expandedId === check.id;
            return (
              <div key={check.id} className="px-6 py-3.5 hover:bg-slate-950/40 transition">
                <div
                  onClick={() => setExpandedId(isExpanded ? null : check.id)}
                  className="flex items-center justify-between gap-4 cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {check.status === 'PASS' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : check.status === 'WARN' ? (
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-200">
                        <span>{check.title}</span>
                        <span className="text-slate-500" aria-hidden="true">·</span>
                        <span className="text-slate-400 font-mono">{check.category}</span>
                      </div>
                      <p className="text-xs text-slate-400 truncate mt-0.5">{check.summary}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="text-xs font-mono text-slate-400 hover:text-slate-200 flex items-center gap-1 shrink-0 whitespace-nowrap"
                  >
                    <span>{isExpanded ? 'Hide Details' : 'Inspect'}</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {isExpanded && (
                  <div className="mt-3 pl-7 space-y-2 text-xs font-mono text-slate-300">
                    <ul className="space-y-1 text-slate-400">
                      {check.details.map((d, i) => (
                        <li key={i} className="leading-relaxed">
                          {d}
                        </li>
                      ))}
                    </ul>
                    {check.remediation && (
                      <div className="pt-1 text-amber-300 font-sans">
                        Remediation: {check.remediation}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Packet Tracer Cabling & Pinout Matrix */}
      {audit.cablingGuide.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <Cable className="w-4 h-4 text-emerald-400" />
              <div>
                <h3 className="text-sm font-semibold text-slate-100">
                  Packet Tracer Physical Cabling & Pinout Guide
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Exact Layer 1 media selection (Straight-Through vs. Cross-Over vs. Serial) for wiring the topology
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyWiringChecklist}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition cursor-pointer whitespace-nowrap shrink-0"
              >
                {copiedWiring ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedWiring ? 'Copied Guide' : 'Copy Wiring Guide'}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowCabling(!showCabling)}
                className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs font-mono transition cursor-pointer whitespace-nowrap shrink-0"
              >
                {showCabling ? 'Collapse' : 'Expand'}
              </button>
            </div>
          </div>

          {showCabling && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-mono">
                    <th className="py-2.5 px-4 font-medium">Origin Device</th>
                    <th className="py-2.5 px-4 font-medium">Origin Port</th>
                    <th className="py-2.5 px-4 font-medium">Destination Device</th>
                    <th className="py-2.5 px-4 font-medium">Destination Port</th>
                    <th className="py-2.5 px-4 font-medium">Packet Tracer Cable Type</th>
                    <th className="py-2.5 px-4 font-medium">Layer 1 Engineering Rule</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono tabular-nums">
                  {audit.cablingGuide.map((row) => (
                    <tr key={row.linkId} className="hover:bg-slate-950/40 transition">
                      <td className="py-2.5 px-4 text-slate-200 font-medium">{row.fromDevice}</td>
                      <td className="py-2.5 px-4 text-emerald-400">{row.fromPort}</td>
                      <td className="py-2.5 px-4 text-slate-200 font-medium">{row.toDevice}</td>
                      <td className="py-2.5 px-4 text-cyan-400">{row.toPort}</td>
                      <td className="py-2.5 px-4 text-slate-100 font-semibold">{row.cableType}</td>
                      <td className="py-2.5 px-4 text-slate-400 font-sans">{row.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
