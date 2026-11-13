import React from 'react';
import { BookOpen, Lightbulb, Route, ShieldCheck, CheckCircle2, Lock, Cpu } from 'lucide-react';
import { Stage4Rationale } from '../types/network';

interface Stage4RationaleViewProps {
  rationale: Stage4Rationale;
}

export const Stage4RationaleView: React.FC<Stage4RationaleViewProps> = ({ rationale }) => {
  return (
    <div className="space-y-6">
      {/* Stage Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2 mb-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 text-xs font-mono font-bold">
            4
          </span>
          STAGE 4: DESIGN RATIONALE
        </h3>
        <p className="text-sm text-slate-300 leading-relaxed font-sans">
          Rigorous technical justification explaining the engineering principles behind the subnetting allocations,
          routing protocol convergence, and CCNA security baselines.
        </p>
      </div>

      {/* 3 Dedicated Pillars */}
      <div className="grid grid-cols-1 gap-5">
        {/* 1. VLSM Subnet Allocation & Mask Choice */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition">
          <div className="flex items-center gap-3 text-emerald-400 font-semibold text-base mb-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <Lightbulb className="w-5 h-5" />
            </div>
            <h4>1. VLSM Subnet Allocation & Subnet Mask Sizing</h4>
          </div>
          <div className="space-y-3 text-xs text-slate-300 leading-relaxed font-sans pl-1">
            <p className="whitespace-pre-line">
              {rationale?.subnetAllocationRationale || 'VLSM subnets prioritized descending from largest host requirements to smallest, reserving /30 or /31 subnets for point-to-point links to prevent address exhaustion.'}
            </p>
            <div className="pt-2 flex flex-wrap gap-2 text-[11px] font-mono text-emerald-300">
              <span className="px-2 py-1 rounded bg-slate-950 border border-slate-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Descending Host Requirement Sizing
              </span>
              <span className="px-2 py-1 rounded bg-slate-950 border border-slate-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                /30 & /31 Point-to-Point Conservation
              </span>
              <span className="px-2 py-1 rounded bg-slate-950 border border-slate-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Zero Address Fragmentation
              </span>
            </div>
          </div>
        </div>

        {/* 2. Routing Choice & Convergence */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition">
          <div className="flex items-center gap-3 text-blue-400 font-semibold text-base mb-3">
            <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <Route className="w-5 h-5" />
            </div>
            <h4>2. Routing Architecture & Convergence Handling</h4>
          </div>
          <div className="space-y-3 text-xs text-slate-300 leading-relaxed font-sans pl-1">
            <p className="whitespace-pre-line">
              {rationale?.routingChoiceRationale || 'OSPFv2 dynamic routing with explicit router-id and passive interfaces on access LANs ensures loop-free convergence and optimal metric routing.'}
            </p>
            <div className="pt-2 flex flex-wrap gap-2 text-[11px] font-mono text-blue-300">
              <span className="px-2 py-1 rounded bg-slate-950 border border-slate-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                Fast Convergence & Route Propagation
              </span>
              <span className="px-2 py-1 rounded bg-slate-950 border border-slate-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                Passive-Interface Hello Suppression
              </span>
              <span className="px-2 py-1 rounded bg-slate-950 border border-slate-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                Explicit Router-ID Determinism
              </span>
            </div>
          </div>
        </div>

        {/* 3. CCNA Security Features & Risks Mitigated */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition">
          <div className="flex items-center gap-3 text-amber-400 font-semibold text-base mb-3">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h4>3. CCNA Security Baselines & Threat Mitigation</h4>
          </div>
          <div className="space-y-3 text-xs text-slate-300 leading-relaxed font-sans pl-1">
            <p className="whitespace-pre-line">
              {rationale?.securityFeaturesRationale || 'CCNA security baselines enforce enable secret encryption, SSHv2 remote management, console exec-timeout, Spanning-Tree PortFast & BPDU Guard on access ports, and unused port isolation in a dedicated parking VLAN.'}
            </p>
            <div className="pt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] font-mono text-slate-300">
              <div className="p-2.5 rounded bg-slate-950 border border-slate-800 space-y-1">
                <div className="text-amber-300 font-bold flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  Management & Console Hardening
                </div>
                <div className="text-slate-400 text-[10px]">
                  RSA 2048 modulus, line con 0 login local, 5-min timeout, and service password-encryption mitigate unauthorized CLI hijacking and shoulder-surfing.
                </div>
              </div>
              <div className="p-2.5 rounded bg-slate-950 border border-slate-800 space-y-1">
                <div className="text-cyan-300 font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Layer 2 STP & Parking VLAN Defense
                </div>
                <div className="text-slate-400 text-[10px]">
                  PortFast & BPDU Guard prevent rogue switch root bridge takeovers; non-default Native VLAN & Parking VLAN quarantine eliminate VLAN hopping attacks.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
