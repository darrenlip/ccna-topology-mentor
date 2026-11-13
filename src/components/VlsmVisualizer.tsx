import React, { useState } from 'react';
import {
  BarChart3,
  LayoutGrid,
  Percent,
  CheckCircle2,
  HardDrive,
  Info,
  Maximize2,
  PieChart,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { Phase2Addressing, SubnetAllocation } from '../types/network';
import { ipToInt, intToIp } from '../utils/vlsmCalculator';

interface VlsmVisualizerProps {
  addressing: Phase2Addressing;
  onFilterVlan?: (vlanId?: number) => void;
  selectedVlan?: number | null;
}

const PALETTE = [
  { bg: 'bg-emerald-500', border: 'border-emerald-400', text: 'text-emerald-300', fill: '#10b981', light: 'bg-emerald-950/60' },
  { bg: 'bg-cyan-500', border: 'border-cyan-400', text: 'text-cyan-300', fill: '#06b6d4', light: 'bg-cyan-950/60' },
  { bg: 'bg-purple-500', border: 'border-purple-400', text: 'text-purple-300', fill: '#a855f7', light: 'bg-purple-950/60' },
  { bg: 'bg-amber-500', border: 'border-amber-400', text: 'text-amber-300', fill: '#f59e0b', light: 'bg-amber-950/60' },
  { bg: 'bg-rose-500', border: 'border-rose-400', text: 'text-rose-300', fill: '#f43f5e', light: 'bg-rose-950/60' },
  { bg: 'bg-blue-500', border: 'border-blue-400', text: 'text-blue-300', fill: '#3b82f6', light: 'bg-blue-950/60' },
  { bg: 'bg-teal-500', border: 'border-teal-400', text: 'text-teal-300', fill: '#14b8a6', light: 'bg-teal-950/60' },
];

export const VlsmVisualizer: React.FC<VlsmVisualizerProps> = ({
  addressing,
  onFilterVlan,
  selectedVlan,
}) => {
  const [viewMode, setViewMode] = useState<'bar' | 'treemap' | 'comparison'>('bar');
  const [hoveredSubnet, setHoveredSubnet] = useState<SubnetAllocation | null>(null);

  // Parse total parent block capacity
  const netBlock = addressing?.networkBlock || '192.168.10.0/24';
  const prefixMatch = netBlock.match(/\/(\d+)/);
  const basePrefix = prefixMatch ? parseInt(prefixMatch[1], 10) : 24;
  const safePrefix = Math.min(30, Math.max(8, isNaN(basePrefix) ? 24 : basePrefix));
  const totalParentIps = Math.pow(2, 32 - safePrefix);

  const subnetAllocations = Array.isArray(addressing?.subnetAllocations) ? addressing.subnetAllocations : [];

  // Calculate allocated IP sum
  let totalAllocatedIps = 0;
  let totalHostsRequired = 0;
  let totalUsableHosts = 0;

  const enrichedSubnets = subnetAllocations.map((sub, idx) => {
    const subPrefix = typeof sub.prefix === 'number' && !isNaN(sub.prefix) ? sub.prefix : 24;
    const totalSubnetIps = Math.pow(2, 32 - subPrefix);
    const needed = sub.hostsNeeded || 0;
    const allocated = sub.hostsAllocated || Math.max(1, totalSubnetIps - 2);

    totalAllocatedIps += totalSubnetIps;
    totalHostsRequired += needed;
    totalUsableHosts += allocated;
    const percentageOfParent = (totalSubnetIps / totalParentIps) * 100;
    const hostEfficiency = allocated > 0 ? (needed / allocated) * 100 : 0;

    return {
      ...sub,
      totalSubnetIps,
      percentageOfParent,
      hostEfficiency,
      palette: PALETTE[idx % PALETTE.length],
    };
  });

  const unallocatedIps = Math.max(0, totalParentIps - totalAllocatedIps);
  const unallocatedPercentage = (unallocatedIps / totalParentIps) * 100;
  const overallAllocationPercent = Math.min(100, Math.round((totalAllocatedIps / totalParentIps) * 100));
  const overallHostEfficiency = totalUsableHosts > 0 ? Math.round((totalHostsRequired / totalUsableHosts) * 100) : 0;

  // Unallocated network address calculation
  let unallocatedNet = 'N/A';
  if (unallocatedIps > 0 && subnetAllocations.length > 0) {
    const lastSubnet = subnetAllocations[subnetAllocations.length - 1];
    if (lastSubnet?.broadcastAddress) {
      try {
        const lastBroadcastInt = ipToInt(lastSubnet.broadcastAddress);
        if (!isNaN(lastBroadcastInt)) {
          unallocatedNet = intToIp(lastBroadcastInt + 1);
        }
      } catch {}
    }
  }

  const activeSubnetDetail = hoveredSubnet || enrichedSubnets[0] || null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl space-y-0">
      {/* Top Header & Visual View Mode Switcher */}
      <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-400" />
              VLSM Address Space Allocation Visualizer
            </h3>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-800 text-emerald-300 font-semibold">
              {addressing.networkBlock}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-sans">
            Proportional visualization of parent address space partitioning relative to required vs allocated host capacities.
          </p>
        </div>

        {/* View Switcher Pills */}
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 font-mono text-xs">
          <button
            onClick={() => setViewMode('bar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
              viewMode === 'bar'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Percent className="w-3.5 h-3.5" />
            <span>Partition Bar</span>
          </button>
          <button
            onClick={() => setViewMode('treemap')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
              viewMode === 'treemap'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>2D Treemap</span>
          </button>
          <button
            onClick={() => setViewMode('comparison')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
              viewMode === 'comparison'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Host Sizing Delta</span>
          </button>
        </div>
      </div>

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-800 bg-slate-950/50 border-b border-slate-800 text-xs font-mono">
        <div className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300">
            <HardDrive className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-slate-400 text-[11px]">Total Pool Capacity</div>
            <div className="text-sm font-bold text-slate-100">
              {totalParentIps} <span className="text-xs font-normal text-slate-500">IPs (/{basePrefix})</span>
            </div>
          </div>
        </div>

        <div className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300">
            <Layers className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="text-slate-400 text-[11px]">Allocated Address Space</div>
            <div className="text-sm font-bold text-cyan-400">
              {totalAllocatedIps} <span className="text-xs font-normal text-slate-400">IPs ({overallAllocationPercent}%)</span>
            </div>
          </div>
        </div>

        <div className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="text-slate-400 text-[11px]">Unallocated / Reserve Space</div>
            <div className="text-sm font-bold text-amber-300">
              {unallocatedIps} <span className="text-xs font-normal text-slate-400">IPs ({Math.round(unallocatedPercentage)}%)</span>
            </div>
          </div>
        </div>

        <div className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300">
            <Percent className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <div className="text-slate-400 text-[11px]">Host Fill Efficiency</div>
            <div className="text-sm font-bold text-purple-300">
              {overallHostEfficiency}% <span className="text-[10px] font-normal text-slate-400">({totalHostsRequired}/{totalUsableHosts} hosts)</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* VIEW 1: Partition Bar Chart */}
        {viewMode === 'bar' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-300 font-semibold flex items-center gap-2">
                <span>0.0.0.0 (Base Start)</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-emerald-400 font-bold">{addressing.networkBlock}</span>
              </span>
              <span className="text-slate-400">
                100% Parent Pool ({totalParentIps} Total Addresses)
              </span>
            </div>

            {/* The Continuous Segmented Bar */}
            <div className="w-full h-20 rounded-2xl bg-slate-950 p-1.5 border border-slate-800 flex gap-1 shadow-inner overflow-hidden select-none">
              {enrichedSubnets.map((sub, idx) => {
                const isSelected = selectedVlan !== undefined && selectedVlan === sub.vlanId;
                const isHovered = hoveredSubnet?.networkAddress === sub.networkAddress;

                return (
                  <div
                    key={idx}
                    style={{ width: `${Math.max(sub.percentageOfParent, 4)}%` }}
                    onMouseEnter={() => setHoveredSubnet(sub)}
                    onClick={() => onFilterVlan?.(sub.vlanId)}
                    className={`relative rounded-xl transition-all duration-200 cursor-pointer flex flex-col justify-between p-2.5 overflow-hidden group ${
                      sub.palette.light
                    } border ${
                      isSelected || isHovered
                        ? `${sub.palette.border} ring-2 ring-emerald-500/50 scale-[1.01] z-10 shadow-lg`
                        : 'border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between gap-1">
                      <span className={`text-[11px] font-mono font-bold truncate ${sub.palette.text}`}>
                        {sub.name}
                      </span>
                      {sub.vlanId && (
                        <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-black/40 text-slate-300 shrink-0">
                          VLAN {sub.vlanId}
                        </span>
                      )}
                    </div>

                    {/* CIDR & Address */}
                    <div className="font-mono text-[10px] text-slate-200 font-medium truncate">
                      /{sub.prefix} ({sub.totalSubnetIps} IPs)
                    </div>

                    {/* Mini internal host requirement fill bar */}
                    <div className="space-y-1">
                      <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden flex">
                        <div
                          style={{ width: `${Math.min(100, sub.hostEfficiency)}%` }}
                          className={`${sub.palette.bg} h-full rounded-full`}
                          title={`${sub.hostsNeeded} req / ${sub.hostsAllocated} usable (${Math.round(sub.hostEfficiency)}%)`}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
                        <span>{sub.percentageOfParent.toFixed(1)}% of block</span>
                        <span className="font-semibold text-slate-300">{sub.hostsNeeded} hosts</span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Unallocated Space Segment */}
              {unallocatedIps > 0 && (
                <div
                  style={{ width: `${unallocatedPercentage}%` }}
                  onMouseEnter={() => setHoveredSubnet(null)}
                  className="rounded-xl border border-dashed border-slate-700 bg-slate-950/80 flex flex-col justify-between p-2.5 text-slate-500 transition hover:border-slate-600 select-none"
                >
                  <div className="flex items-center justify-between text-[11px] font-mono font-semibold text-slate-400">
                    <span>Unallocated Space</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 text-amber-300 border border-slate-800">
                      Free Pool
                    </span>
                  </div>
                  <div className="font-mono text-[10px] text-slate-400">
                    {unallocatedNet} ({unallocatedIps} IPs Available)
                  </div>
                  <div className="text-[9px] font-mono text-slate-500">
                    {unallocatedPercentage.toFixed(1)}% Available for Expansion
                  </div>
                </div>
              )}
            </div>

            {/* Address Line Marker Ticks */}
            <div className="flex justify-between items-center px-1 text-[10px] font-mono text-slate-500">
              <span>{addressing.subnetAllocations[0]?.networkAddress || '192.168.10.0'} (Offset 0)</span>
              <span>Offset {Math.round(totalAllocatedIps)}</span>
              <span>Offset {totalParentIps} (End)</span>
            </div>
          </div>
        )}

        {/* VIEW 2: 2D Treemap Grid */}
        {viewMode === 'treemap' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {enrichedSubnets.map((sub, idx) => {
                const isSelected = selectedVlan !== undefined && selectedVlan === sub.vlanId;
                const isHovered = hoveredSubnet?.networkAddress === sub.networkAddress;

                return (
                  <div
                    key={idx}
                    onMouseEnter={() => setHoveredSubnet(sub)}
                    onClick={() => onFilterVlan?.(sub.vlanId)}
                    className={`p-4 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                      sub.palette.light
                    } ${
                      isSelected || isHovered
                        ? `${sub.palette.border} ring-2 ring-emerald-500/50 shadow-xl`
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs font-mono font-bold ${sub.palette.text}`}>
                          {sub.name}
                        </span>
                        {sub.vlanId && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/50 text-slate-300">
                            VLAN {sub.vlanId}
                          </span>
                        )}
                      </div>

                      <div className="font-mono text-sm font-bold text-slate-100 mb-1">
                        {sub.networkAddress}/{sub.prefix}
                      </div>

                      <div className="text-xs font-mono text-slate-400 space-y-0.5">
                        <div>Mask: {sub.subnetMask}</div>
                        <div>Range: {sub.usableRange}</div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-400">Total Block Size:</span>
                        <span className="text-slate-200 font-bold">{sub.totalSubnetIps} IPs ({sub.percentageOfParent.toFixed(1)}%)</span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-400">Host Sizing Ratio:</span>
                        <span className="text-emerald-400 font-bold">
                          {sub.hostsNeeded} req / {sub.hostsAllocated} usable
                        </span>
                      </div>

                      {/* Efficiency Progress Bar */}
                      <div className="w-full bg-black/40 h-2 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${Math.min(100, sub.hostEfficiency)}%` }}
                          className={`${sub.palette.bg} h-full rounded-full transition-all duration-300`}
                        />
                      </div>
                      <div className="text-right text-[10px] font-mono text-slate-400">
                        {sub.hostEfficiency.toFixed(1)}% Host Sizing Efficiency
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Unallocated Treemap Card */}
              {unallocatedIps > 0 && (
                <div className="p-4 rounded-xl border border-dashed border-slate-700 bg-slate-950/60 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono font-bold text-slate-400">
                        Unallocated Reserve Block
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-amber-300">
                        Available
                      </span>
                    </div>

                    <div className="font-mono text-sm font-bold text-slate-400 mb-1">
                      {unallocatedNet}
                    </div>

                    <div className="text-xs font-mono text-slate-500">
                      Reserved for future VLANs or point-to-point router links.
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800 text-xs font-mono text-slate-400 flex items-center justify-between">
                    <span>Free Capacity:</span>
                    <span className="text-amber-300 font-bold">{unallocatedIps} IPs ({unallocatedPercentage.toFixed(1)}%)</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 3: Host Requirement vs Allocated Sizing Comparison Bar Chart */}
        {viewMode === 'comparison' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span>Subnet & VLAN Host Delta Analysis</span>
              <div className="flex items-center gap-4 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-blue-500"></span>
                  <span className="text-slate-300">Hosts Required</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-emerald-500"></span>
                  <span className="text-slate-300">Usable Hosts Allocated</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-slate-700"></span>
                  <span className="text-slate-300">Network & Broadcast (2 IPs)</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {enrichedSubnets.map((sub, idx) => {
                const maxVal = Math.max(...enrichedSubnets.map((s) => s.totalSubnetIps));
                const reqWidth = (sub.hostsNeeded / maxVal) * 100;
                const allocatedWidth = (sub.hostsAllocated / maxVal) * 100;

                return (
                  <div
                    key={idx}
                    onMouseEnter={() => setHoveredSubnet(sub)}
                    onClick={() => onFilterVlan?.(sub.vlanId)}
                    className="p-3 bg-slate-950/70 border border-slate-800 hover:border-slate-700 rounded-xl transition cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-xs font-mono mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-200">{sub.name}</span>
                        {sub.vlanId && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-cyan-300">
                            VLAN {sub.vlanId}
                          </span>
                        )}
                        <span className="text-slate-500">({sub.networkAddress}/{sub.prefix})</span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px]">
                        <span className="text-blue-400 font-semibold">{sub.hostsNeeded} req</span>
                        <span className="text-slate-500">/</span>
                        <span className="text-emerald-400 font-semibold">{sub.hostsAllocated} usable</span>
                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 text-[10px]">
                          {sub.hostEfficiency.toFixed(1)}% eff
                        </span>
                      </div>
                    </div>

                    {/* Bar comparison container */}
                    <div className="space-y-1.5">
                      {/* Required Hosts Bar */}
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-slate-500 w-16 text-right">Required:</span>
                        <div className="flex-1 bg-slate-900 h-2.5 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${reqWidth}%` }}
                            className="bg-blue-500 h-full rounded-full transition-all duration-300"
                          />
                        </div>
                      </div>

                      {/* Allocated Usable Capacity Bar */}
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-slate-500 w-16 text-right">Capacity:</span>
                        <div className="flex-1 bg-slate-900 h-2.5 rounded-full overflow-hidden flex">
                          <div
                            style={{ width: `${allocatedWidth}%` }}
                            className="bg-emerald-500 h-full transition-all duration-300"
                          />
                          <div
                            style={{ width: `${(2 / maxVal) * 100}%` }}
                            className="bg-slate-700 h-full"
                            title="2 IPs reserved for Subnet ID and Broadcast"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Selected Subnet In-Depth Inspection Card */}
        {activeSubnetDetail && (
          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-[11px]">Inspecting Subnet:</span>
                <span className="font-bold text-slate-100 text-sm">{activeSubnetDetail.name}</span>
                {activeSubnetDetail.vlanId && (
                  <span className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-300 text-[10px]">
                    VLAN {activeSubnetDetail.vlanId}
                  </span>
                )}
              </div>
              <div className="text-slate-400 text-[11px] flex flex-wrap gap-4">
                <span>Network: <strong className="text-emerald-400">{activeSubnetDetail.networkAddress}/{activeSubnetDetail.prefix}</strong></span>
                <span>Mask: <strong className="text-slate-300">{activeSubnetDetail.subnetMask}</strong></span>
                <span>Usable: <strong className="text-slate-200">{activeSubnetDetail.usableRange}</strong></span>
                <span>Broadcast: <strong className="text-slate-400">{activeSubnetDetail.broadcastAddress}</strong></span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-[11px] text-slate-400">Host Sizing Requirement</div>
                <div className="font-bold text-emerald-400 text-sm">
                  {activeSubnetDetail.hostsNeeded} <span className="text-xs font-normal text-slate-400">needed of</span> {activeSubnetDetail.hostsAllocated} <span className="text-xs font-normal text-slate-400">usable</span>
                </div>
              </div>
              {onFilterVlan && activeSubnetDetail.vlanId && (
                <button
                  onClick={() => onFilterVlan(activeSubnetDetail.vlanId)}
                  className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg transition font-medium cursor-pointer"
                >
                  Filter Table
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
