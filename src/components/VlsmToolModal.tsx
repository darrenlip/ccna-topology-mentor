import React, { useState } from 'react';
import { Calculator, X, Plus, Trash2, Copy, Check, ArrowRight, ShieldCheck } from 'lucide-react';
import { calculateVlsm, VlsmInputRequest } from '../utils/vlsmCalculator';

interface VlsmToolModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialBaseBlock?: string;
}

export const VlsmToolModal: React.FC<VlsmToolModalProps> = ({
  isOpen,
  onClose,
  initialBaseBlock = '192.168.10.0/24',
}) => {
  const [baseBlock, setBaseBlock] = useState(initialBaseBlock);
  const [copied, setCopied] = useState(false);
  const [reqs, setReqs] = useState<VlsmInputRequest[]>([
    { name: 'VLAN 10 - Sales', hostsNeeded: 60, vlanId: 10 },
    { name: 'VLAN 20 - Engineering', hostsNeeded: 30, vlanId: 20 },
    { name: 'VLAN 30 - Servers', hostsNeeded: 14, vlanId: 30 },
    { name: 'VLAN 99 - Management', hostsNeeded: 6, vlanId: 99 },
    { name: 'WAN Link HQ-Branch', hostsNeeded: 2 },
  ]);

  if (!isOpen) return null;

  const result = calculateVlsm(baseBlock, reqs);

  const handleAdd = () => {
    setReqs([...reqs, { name: `Subnet ${reqs.length + 1}`, hostsNeeded: 20 }]);
  };

  const handleRemove = (index: number) => {
    setReqs(reqs.filter((_, i) => i !== index));
  };

  const handleUpdate = (index: number, field: keyof VlsmInputRequest, val: any) => {
    setReqs(
      reqs.map((r, i) => (i === index ? { ...r, [field]: val } : r))
    );
  };

  const handleCopyMarkdown = () => {
    let md = `### VLSM Subnet Plan: ${baseBlock}\n\n`;
    md += '| Subnet Name | Hosts Req | Usable Hosts | Network | Mask | Prefix | Usable Range | Broadcast |\n';
    md += '| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n';
    result.allocations.forEach((a) => {
      md += `| ${a.name} | ${a.hostsNeeded} | ${a.hostsAllocated} | ${a.networkAddress} | ${a.subnetMask} | /${a.prefix} | ${a.usableRange} | ${a.broadcastAddress} |\n`;
    });
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                Interactive VLSM Subnet Architecture Calculator
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Mathematical Variable Length Subnet Masking • CCNA 200-301 Compliant
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Base Block Input & Presets */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-950/80 rounded-xl border border-slate-800">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-slate-300 font-semibold">
                Base Network Block (CIDR):
              </span>
              <input
                type="text"
                value={baseBlock}
                onChange={(e) => setBaseBlock(e.target.value)}
                className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg font-mono text-sm text-emerald-400 font-bold w-44 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-500">Quick:</span>
              {['192.168.10.0/24', '10.0.0.0/16', '172.16.0.0/22', '192.168.0.0/23'].map((b) => (
                <button
                  key={b}
                  onClick={() => setBaseBlock(b)}
                  className="px-2 py-1 text-[11px] font-mono rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          {/* Subnet Requirements Form */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider">
                Host Sizing Requirements (Auto-Sorted by VLSM Engine)
              </h4>
              <button
                onClick={handleAdd}
                className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-mono transition cursor-pointer font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Subnet Requirement
              </button>
            </div>

            <div className="space-y-2">
              {reqs.map((req, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-xs font-mono"
                >
                  <span className="text-slate-500 w-6 text-center">{i + 1}.</span>
                  <input
                    type="text"
                    value={req.name}
                    onChange={(e) => handleUpdate(i, 'name', e.target.value)}
                    placeholder="Subnet / VLAN Name"
                    className="flex-1 px-2.5 py-1 bg-slate-900 border border-slate-800 rounded text-slate-200"
                  />
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">Hosts:</span>
                    <input
                      type="number"
                      value={req.hostsNeeded}
                      onChange={(e) => handleUpdate(i, 'hostsNeeded', Math.max(1, Number(e.target.value)))}
                      className="w-20 px-2 py-1 bg-slate-900 border border-slate-800 rounded text-emerald-400 font-bold"
                    />
                  </div>
                  <button
                    onClick={() => handleRemove(i)}
                    className="p-1 rounded text-slate-500 hover:text-red-400 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Allocation Results */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Calculated VLSM Subnets ({result.allocations.length})
              </h4>
              <button
                onClick={handleCopyMarkdown}
                className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 hover:underline cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied Plan!' : 'Copy Markdown Plan'}
              </button>
            </div>

            {/* Visual Partition Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] font-mono text-slate-400">
                <span>Address Space Partition Preview ({baseBlock})</span>
                <span className="text-emerald-400">{result.utilizationPercent}% Allocated</span>
              </div>
              <div className="w-full h-8 rounded-xl bg-slate-950 p-1 border border-slate-800 flex gap-0.5 overflow-hidden">
                {result.allocations.map((a, i) => {
                  const [bIp, pStr] = baseBlock.split('/');
                  const tot = Math.pow(2, 32 - parseInt(pStr || '24', 10));
                  const subSize = Math.pow(2, 32 - a.prefix);
                  const pct = Math.max((subSize / tot) * 100, 3);
                  const colors = ['bg-emerald-500', 'bg-cyan-500', 'bg-purple-500', 'bg-amber-500', 'bg-rose-500'];
                  const color = colors[i % colors.length];

                  return (
                    <div
                      key={i}
                      style={{ width: `${pct}%` }}
                      className={`h-full ${color} rounded-sm flex items-center justify-center text-[10px] font-mono font-bold text-slate-950 px-1 truncate`}
                      title={`${a.name}: ${a.networkAddress}/${a.prefix} (${a.hostsNeeded} req / ${a.hostsAllocated} usable)`}
                    >
                      {a.name.split('-')[0]}
                    </div>
                  );
                })}
                {result.utilizationPercent < 100 && (
                  <div
                    style={{ width: `${100 - result.utilizationPercent}%` }}
                    className="h-full bg-slate-800/80 rounded-sm border border-dashed border-slate-700 flex items-center justify-center text-[10px] font-mono text-slate-500 px-1 truncate"
                    title={`Unallocated Free Space: ${100 - result.utilizationPercent}% available`}
                  >
                    Free
                  </div>
                )}
              </div>
            </div>

            <div className="border border-slate-800 rounded-xl overflow-hidden shadow">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Subnet Name</th>
                    <th className="py-2.5 px-3">Req / Usable</th>
                    <th className="py-2.5 px-3">Network Address</th>
                    <th className="py-2.5 px-3">Mask</th>
                    <th className="py-2.5 px-3">Wildcard</th>
                    <th className="py-2.5 px-3">Usable Range</th>
                    <th className="py-2.5 px-3">Broadcast</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                  {result.allocations.map((a, i) => (
                    <tr key={i} className="hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 font-semibold text-slate-200">{a.name}</td>
                      <td className="py-2.5 px-3 text-slate-400">
                        {a.hostsNeeded} req / <span className="text-emerald-400 font-bold">{a.hostsAllocated}</span>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-emerald-400">
                        {a.networkAddress}/{a.prefix}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">{a.subnetMask}</td>
                      <td className="py-2.5 px-3 text-slate-400">{a.wildcardMask}</td>
                      <td className="py-2.5 px-3 text-slate-200">{a.usableRange}</td>
                      <td className="py-2.5 px-3 text-slate-400">{a.broadcastAddress}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Utilization Bar */}
            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">
                Total Usable Hosts Allocated: <strong className="text-emerald-400">{result.totalHostsAllocated}</strong>
              </span>
              <span className="text-slate-400">
                Base Block Utilization: <strong className="text-cyan-400">{result.utilizationPercent}%</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-mono transition cursor-pointer"
          >
            Close Calculator
          </button>
        </div>
      </div>
    </div>
  );
};
