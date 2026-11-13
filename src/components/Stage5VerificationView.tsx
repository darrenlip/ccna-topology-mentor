import React, { useState } from 'react';
import { Terminal, Copy, Check, CheckSquare, Layers, Route, ArrowRight, ShieldCheck, Play, Activity, Network, ChevronDown, ChevronUp } from 'lucide-react';
import { Stage5Verification, ArchitectureReport } from '../types/network';
import { OspfTopologyGraph } from './OspfTopologyGraph';

interface Stage5VerificationViewProps {
  verification: Stage5Verification;
  report?: ArchitectureReport;
}

export const Stage5VerificationView: React.FC<Stage5VerificationViewProps> = ({ verification, report }) => {
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});
  const [isOspfGraphExpanded, setIsOspfGraphExpanded] = useState(true);

  const layer2Commands = Array.isArray(verification?.layer2Commands) ? verification.layer2Commands : [];
  const layer3RoutingCommands = Array.isArray(verification?.layer3RoutingCommands) ? verification.layer3RoutingCommands : [];
  const pingTests = Array.isArray(verification?.pingTests) ? verification.pingTests : [];
  const checklist = Array.isArray(verification?.checklist) ? verification.checklist : [];

  const isOspfActive = report?.constraints?.routingProtocol === 'OSPF' || !report;

  const handleCopy = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(cmd);
    setTimeout(() => setCopiedCmd(null), 1500);
  };

  const handleCopyAll = () => {
    let script = '! =======================================================\n! CCNA 200-301 STAGE 5 CLI VERIFICATION SUITE\n! =======================================================\n\n';
    
    script += '! --- SECTION 1: LAYER 2 VERIFICATION ---\n';
    layer2Commands.forEach((c) => {
      script += `! [${c.device || 'Switch'}] ${c.purpose || 'Verification'}\n${c.command || ''}\n`;
    });

    script += '\n! --- SECTION 2: LAYER 3 & ROUTING VERIFICATION ---\n';
    layer3RoutingCommands.forEach((c) => {
      script += `! [${c.device || 'Router'}] ${c.purpose || 'Verification'}\n${c.command || ''}\n`;
    });

    script += '\n! --- SECTION 3: END-TO-END PING TESTS ---\n';
    pingTests.forEach((p) => {
      script += `! [${p.fromDevice || 'PC'} -> ${p.targetDescription || 'Target'} (${p.targetIp || ''})]\nping ${p.targetIp || ''}\n`;
    });

    navigator.clipboard.writeText(script);
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
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 text-xs font-mono font-bold">
              5
            </span>
            STAGE 5: VERIFICATION COMMANDS & TESTING PLAN
          </h3>
          <p className="text-xs text-slate-400 mt-1 font-sans">
            Structured testing checklist for Cisco Packet Tracer or CLI to validate Layer 2 trunks, Layer 3 routing tables, and end-to-end ICMP reachability.
          </p>
        </div>

        <button
          onClick={handleCopyAll}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-mono font-medium transition cursor-pointer"
        >
          {copiedAll ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          <span>{copiedAll ? 'Copied Verification Suite!' : 'Copy Entire Verification Suite'}</span>
        </button>
      </div>

      {/* OSPF TOPOLOGY & ADJACENCY GRAPH (D3 / SVG VISUALIZER) */}
      {isOspfActive && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <div className="text-xs font-mono font-bold text-amber-300 flex items-center gap-2">
              <Network className="w-4 h-4 text-amber-400" />
              <span>DYNAMIC OSPFv2 ADJACENCY & AREA TOPOLOGY GRAPH</span>
            </div>
            <button
              onClick={() => setIsOspfGraphExpanded(!isOspfGraphExpanded)}
              className="text-xs font-mono text-slate-400 hover:text-slate-200 transition cursor-pointer flex items-center gap-1"
            >
              <span>{isOspfGraphExpanded ? 'Collapse Visualizer' : 'Expand Visualizer'}</span>
              {isOspfGraphExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {isOspfGraphExpanded && <OspfTopologyGraph report={report} />}
        </div>
      )}

      {/* SECTION 1: LAYER 2 VERIFICATION COMMANDS */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="px-5 py-3.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            1. Layer 2 Switching & 802.1Q Trunk Verification
          </h4>
          <span className="text-xs font-mono text-slate-500">
            show vlan brief • show interfaces trunk
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase text-[10px]">
              <tr>
                <th className="py-2.5 px-4 font-semibold">Target Device</th>
                <th className="py-2.5 px-4 font-semibold">Verification Command</th>
                <th className="py-2.5 px-4 font-semibold">Diagnostic Purpose</th>
                <th className="py-2.5 px-4 font-semibold">Expected Cisco IOS CLI Output</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {layer2Commands.map((cmd, i) => (
                <tr key={i} className="hover:bg-slate-800/40 transition">
                  <td className="py-3 px-4 font-bold text-slate-200">{cmd.device || 'Switch'}</td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => handleCopy(cmd.command)}
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-950 rounded border border-slate-800 hover:border-cyan-500/50 text-cyan-300 font-bold group cursor-pointer"
                    >
                      <span>{cmd.command}</span>
                      {copiedCmd === cmd.command ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3 text-slate-500 group-hover:text-slate-300 transition" />
                      )}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-slate-300 font-sans text-[11px]">{cmd.purpose}</td>
                  <td className="py-3 px-4">
                    <pre className="text-[10px] text-slate-400 bg-slate-950 p-2 rounded border border-slate-800/80 whitespace-pre font-mono max-w-sm overflow-x-auto">
                      {cmd.expectedOutput}
                    </pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 2: LAYER 3 & ROUTING VERIFICATION COMMANDS */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="px-5 py-3.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Route className="w-4 h-4 text-emerald-400" />
            2. Layer 3 Interfaces & Routing Protocol Verification
          </h4>
          <span className="text-xs font-mono text-slate-500">
            show ip interface brief • show ip route • show ip ospf neighbor
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase text-[10px]">
              <tr>
                <th className="py-2.5 px-4 font-semibold">Target Device</th>
                <th className="py-2.5 px-4 font-semibold">Verification Command</th>
                <th className="py-2.5 px-4 font-semibold">Diagnostic Purpose</th>
                <th className="py-2.5 px-4 font-semibold">Expected Cisco IOS CLI Output</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {layer3RoutingCommands.map((cmd, i) => (
                <tr key={i} className="hover:bg-slate-800/40 transition">
                  <td className="py-3 px-4 font-bold text-slate-200">{cmd.device || 'Router'}</td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => handleCopy(cmd.command)}
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-950 rounded border border-slate-800 hover:border-emerald-500/50 text-emerald-400 font-bold group cursor-pointer"
                    >
                      <span>{cmd.command}</span>
                      {copiedCmd === cmd.command ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3 text-slate-500 group-hover:text-slate-300 transition" />
                      )}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-slate-300 font-sans text-[11px]">{cmd.purpose}</td>
                  <td className="py-3 px-4">
                    <pre className="text-[10px] text-slate-400 bg-slate-950 p-2 rounded border border-slate-800/80 whitespace-pre font-mono max-w-sm overflow-x-auto">
                      {cmd.expectedOutput}
                    </pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 3: KEY END-TO-END PING TESTS */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="px-5 py-3.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-400" />
            3. Key End-to-End ICMP Ping Reachability Tests
          </h4>
          <span className="text-xs font-mono text-slate-500">
            ping &lt;target_ip&gt;
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase text-[10px]">
              <tr>
                <th className="py-2.5 px-4 font-semibold">Origin Device</th>
                <th className="py-2.5 px-4 font-semibold">Target IP</th>
                <th className="py-2.5 px-4 font-semibold">Target Destination</th>
                <th className="py-2.5 px-4 font-semibold">Connectivity Purpose</th>
                <th className="py-2.5 px-4 font-semibold">Expected Reply</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {pingTests.map((p, i) => (
                <tr key={i} className="hover:bg-slate-800/40 transition">
                  <td className="py-3 px-4 font-bold text-slate-200">{p.fromDevice}</td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => handleCopy(`ping ${p.targetIp}`)}
                      className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-950 rounded border border-slate-800 hover:border-amber-500/50 text-amber-300 font-bold group cursor-pointer"
                      title="Click to copy ping command"
                    >
                      <span>ping {p.targetIp}</span>
                      {copiedCmd === `ping ${p.targetIp}` ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3 text-slate-500 group-hover:text-slate-300 transition" />
                      )}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-slate-200 font-medium">{p.targetDescription}</td>
                  <td className="py-3 px-4 text-slate-300 font-sans text-[11px]">{p.purpose}</td>
                  <td className="py-3 px-4 text-emerald-400 text-[11px]">{p.expectedOutput}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 4: STEP-BY-STEP CHECKLIST */}
      {checklist.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-emerald-400" />
              Packet Tracer Step-by-Step Lab Testing Checklist
            </h4>
            <span className="text-xs font-mono text-slate-400">
              {Object.values(completedSteps).filter(Boolean).length} of {checklist.length} Steps Validated
            </span>
          </div>

          <div className="space-y-3">
            {checklist.map((step) => {
              const isDone = !!completedSteps[step.step];
              const cmds = Array.isArray(step.commands) ? step.commands : [];
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
                    {cmds.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1 font-mono text-[11px]">
                        {cmds.map((cmd) => (
                          <span
                            key={cmd}
                            className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-emerald-400 font-bold"
                          >
                            {cmd}
                          </span>
                        ))}
                      </div>
                    )}
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
