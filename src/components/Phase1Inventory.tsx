import React, { useState } from 'react';
import {
  Router,
  Layers,
  Laptop,
  AlertCircle,
  ArrowRightLeft,
  ShieldAlert,
  Terminal,
  ExternalLink,
  Eye,
  FileText,
  Search,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { Phase1Inventory } from '../types/network';

interface Phase1InventoryProps {
  inventory: Phase1Inventory;
  onSelectDevice?: (deviceName: string) => void;
  uploadedFile?: {
    name: string;
    mimeType: string;
    previewUrl?: string;
    size?: number;
  };
}

export const Phase1InventoryView: React.FC<Phase1InventoryProps> = ({
  inventory,
  onSelectDevice,
  uploadedFile,
}) => {
  const [showDiagramPreview, setShowDiagramPreview] = useState(Boolean(uploadedFile?.previewUrl));
  const [connectionSearch, setConnectionSearch] = useState('');
  const [selectedDeviceFilter, setSelectedDeviceFilter] = useState<string>('ALL');

  const routers = inventory?.routers || [];
  const switches = inventory?.switches || [];
  const endpoints = inventory?.endpoints || [];
  const connections = inventory?.connections || [];
  const assumptions = inventory?.assumptions || [];

  // Filter connections by search or device
  const filteredConnections = connections.filter((conn) => {
    const fromDev = conn.fromDevice || '';
    const toDev = conn.toDevice || '';
    const fromInt = conn.fromInterface || '';
    const toInt = conn.toInterface || '';
    const notes = conn.notes || '';
    const vlan = conn.vlan || '';

    const matchesDevice =
      selectedDeviceFilter === 'ALL' ||
      fromDev === selectedDeviceFilter ||
      toDev === selectedDeviceFilter;

    const term = connectionSearch.toLowerCase();
    const matchesSearch =
      !term ||
      fromDev.toLowerCase().includes(term) ||
      toDev.toLowerCase().includes(term) ||
      fromInt.toLowerCase().includes(term) ||
      toInt.toLowerCase().includes(term) ||
      notes.toLowerCase().includes(term) ||
      vlan.toLowerCase().includes(term);

    return matchesDevice && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 text-xs font-mono font-bold">
              1
            </span>
            STAGE 1: TOPOLOGY ANALYSIS & CONNECTION MAP
          </h3>
          {uploadedFile && (
            <button
              onClick={() => setShowDiagramPreview(!showDiagramPreview)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-mono transition cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{showDiagramPreview ? 'Hide Source Diagram' : 'View Source Diagram'}</span>
            </button>
          )}
        </div>
        <p className="text-sm text-slate-300 leading-relaxed font-sans">
          {inventory?.summary || 'Network hardware inventory and physical link mapping extracted from topology.'}
        </p>
      </div>

      {/* Uploaded Diagram Source Comparison Panel */}
      {uploadedFile && showDiagramPreview && (
        <div className="bg-slate-900 border border-emerald-500/40 rounded-xl p-4 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="font-semibold">INGESTED TOPOLOGY SOURCE (GROUND TRUTH):</span>
              <span className="text-slate-400">{uploadedFile.name}</span>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800 text-emerald-300">
              Fidelity Grounding Active
            </span>
          </div>

          <div className="bg-slate-950 rounded-lg p-2 flex items-center justify-center border border-slate-800 max-h-[420px] overflow-auto">
            {uploadedFile.previewUrl ? (
              <img
                src={uploadedFile.previewUrl}
                alt="Uploaded Network Topology"
                className="max-h-[380px] w-auto object-contain rounded border border-slate-800/80"
              />
            ) : (
              <div className="p-8 text-center text-slate-400 space-y-2 font-mono text-xs">
                <FileText className="w-8 h-8 text-emerald-400 mx-auto" />
                <div>Document Ingested: {uploadedFile.name} ({uploadedFile.mimeType})</div>
                <div className="text-slate-500 text-[11px]">
                  PDF content processed directly via Gemini Vision API.
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Device Cards: Routers, Switches, Endpoints */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Routers */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800 text-emerald-400">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <Router className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-100">Routers ({routers.length})</h4>
              <span className="text-xs text-slate-400 font-mono">Layer 3 Gateways & ROAS</span>
            </div>
          </div>
          <div className="mt-3 space-y-3 flex-1">
            {routers.length === 0 ? (
              <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-400 font-mono">
                No standalone routers detected in this segment.
              </div>
            ) : (
              routers.map((router) => {
                const intfs = router.interfaces || [];
                return (
                  <div
                    key={router.name}
                    className="p-3 bg-slate-950/70 border border-slate-800/80 hover:border-emerald-500/50 rounded-lg transition group"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        onClick={() => onSelectDevice?.(router.name)}
                        className="font-mono text-xs font-bold text-emerald-400 hover:underline cursor-pointer"
                      >
                        {router.name}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {router.model || 'Cisco ISR'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-300 mt-1 font-medium">{router.role || 'Layer 3 Router'}</div>
                    <div className="text-[11px] font-mono text-slate-400 mt-2 flex flex-wrap gap-1">
                      {intfs.map((intf) => (
                        <span key={intf} className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                          {intf}
                        </span>
                      ))}
                    </div>
                    {router.notes && (
                      <div className="text-[11px] text-slate-400 mt-2 italic border-t border-slate-900 pt-1.5">
                        {router.notes}
                      </div>
                    )}
                    <div className="mt-2.5 pt-2 border-t border-slate-900/80 flex items-center justify-between">
                      <button
                        onClick={() => onSelectDevice?.(router.name)}
                        className="text-[11px] font-mono text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                      >
                        <Terminal className="w-3 h-3" />
                        <span>View Cisco IOS CLI Config →</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Switches */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800 text-cyan-400">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-100">Switches ({switches.length})</h4>
              <span className="text-xs text-slate-400 font-mono">Distribution & Access Layers</span>
            </div>
          </div>
          <div className="mt-3 space-y-3 flex-1">
            {switches.length === 0 ? (
              <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-400 font-mono">
                No Layer 2 switches (pure routed or P2P WAN layout).
              </div>
            ) : (
              switches.map((sw) => {
                const ports = sw.ports || (sw as any).interfaces || [];
                return (
                  <div
                    key={sw.name}
                    className="p-3 bg-slate-950/70 border border-slate-800/80 hover:border-cyan-500/50 rounded-lg transition group"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        onClick={() => onSelectDevice?.(sw.name)}
                        className="font-mono text-xs font-bold text-cyan-400 hover:underline cursor-pointer"
                      >
                        {sw.name}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {sw.model || 'Catalyst 2960'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-300 mt-1 font-medium">{sw.role || 'Switch'}</div>
                    <div className="text-[11px] font-mono text-slate-400 mt-2 flex flex-wrap gap-1">
                      {ports.map((p: string) => (
                        <span key={p} className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                          {p}
                        </span>
                      ))}
                    </div>
                    {sw.notes && (
                      <div className="text-[11px] text-slate-400 mt-2 italic border-t border-slate-900 pt-1.5">
                        {sw.notes}
                      </div>
                    )}
                    <div className="mt-2.5 pt-2 border-t border-slate-900/80 flex items-center justify-between">
                      <button
                        onClick={() => onSelectDevice?.(sw.name)}
                        className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                      >
                        <Terminal className="w-3 h-3" />
                        <span>View Cisco IOS CLI Config →</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Endpoints */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800 text-blue-400">
            <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-100">Endpoints ({endpoints.length})</h4>
              <span className="text-xs text-slate-400 font-mono">Workstations & Servers</span>
            </div>
          </div>
          <div className="mt-3 space-y-2 flex-1 overflow-y-auto max-h-[300px]">
            {endpoints.length === 0 ? (
              <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-400 font-mono">
                No host endpoints modeled.
              </div>
            ) : (
              endpoints.map((ep) => (
                <div
                  key={ep.name}
                  className="p-2.5 bg-slate-950/70 border border-slate-800/80 rounded-lg text-xs"
                >
                  <div className="flex items-center justify-between font-mono font-medium">
                    <span className="text-slate-200">{ep.name}</span>
                    <span className="px-2 py-0.5 rounded bg-blue-950/60 border border-blue-800/50 text-blue-300 text-[10px]">
                      {ep.vlan || 'LAN'}
                    </span>
                  </div>
                  <div className="text-slate-400 text-[11px] mt-1">{ep.type || 'Host'}</div>
                  {ep.assignedIp && (
                    <div className="mt-1.5 font-mono text-[10px] text-slate-300 flex items-center justify-between">
                      <span>IP: {ep.assignedIp}</span>
                      <span className="text-slate-500">GW: {ep.defaultGateway || 'N/A'}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Physical Interconnections Table with Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="px-5 py-3.5 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-emerald-400" />
            <h4 className="text-sm font-semibold text-slate-100">
              Physical Interface Interconnections Mapping
            </h4>
            <span className="text-xs font-mono text-slate-400">
              ({filteredConnections.length} / {connections.length} Links)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Filter links..."
                value={connectionSearch}
                onChange={(e) => setConnectionSearch(e.target.value)}
                className="pl-8 pr-3 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-36 font-mono"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4 font-semibold">Source Device</th>
                <th className="py-3 px-4 font-semibold">Source Interface</th>
                <th className="py-3 px-4 font-semibold text-center">Direction</th>
                <th className="py-3 px-4 font-semibold">Target Interface</th>
                <th className="py-3 px-4 font-semibold">Target Device</th>
                <th className="py-3 px-4 font-semibold">Link Type / 802.1Q</th>
                <th className="py-3 px-4 font-semibold">Design Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredConnections.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-500 font-mono">
                    No physical connections matching the current criteria.
                  </td>
                </tr>
              ) : (
                filteredConnections.map((conn) => (
                  <tr key={conn.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-bold text-slate-200">{conn.fromDevice}</td>
                    <td className="py-3 px-4 text-emerald-400 font-medium">{conn.fromInterface}</td>
                    <td className="py-3 px-4 text-center text-slate-500 font-sans">──►</td>
                    <td className="py-3 px-4 text-cyan-400 font-medium">{conn.toInterface}</td>
                    <td className="py-3 px-4 font-bold text-slate-200">{conn.toDevice}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          conn.linkType === 'Trunk'
                            ? 'bg-amber-950/70 border border-amber-800/60 text-amber-300'
                            : conn.linkType === 'WAN' || conn.linkType === 'Routed'
                            ? 'bg-red-950/70 border border-red-800/60 text-red-300'
                            : 'bg-cyan-950/70 border border-cyan-800/60 text-cyan-300'
                        }`}
                      >
                        {conn.linkType || 'Routed'} {conn.vlan ? `(${conn.vlan})` : ''}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px] font-sans">{conn.notes || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hallucination & Ambiguity Declaration: ASSUMPTIONS & UNVERIFIED CONNECTIONS */}
      <div className="bg-amber-950/25 border border-amber-900/60 rounded-xl p-5 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0 mt-0.5">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div className="space-y-2 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-bold text-amber-200 flex items-center gap-2">
                ASSUMPTIONS & UNVERIFIED CONNECTIONS
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-900/80 border border-amber-700/60 text-amber-300 font-semibold">
                  Zero Silent Guessing Policy
                </span>
              </h4>
              <span className="text-[10px] font-mono text-amber-400/80">
                Governance Rule #2 Enforced
              </span>
            </div>
            <p className="text-xs text-amber-300/90 leading-relaxed font-sans">
              All indistinct port labels, inferred interconnections, and unverified interface parameters are explicitly declared below.
              No connection or IP binding is guessed silently:
            </p>
            <div className="space-y-1.5 pt-1">
              {assumptions.length === 0 ? (
                <div className="p-2.5 rounded-lg bg-slate-950/70 border border-amber-900/40 text-xs text-slate-400 font-mono">
                  All interface numbers, labels, and topology connections were cleanly verified without ambiguities.
                </div>
              ) : (
                assumptions.map((assumption, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-lg bg-slate-950/70 border border-amber-900/40 text-xs text-amber-200/90 font-mono flex items-start gap-2"
                  >
                    <span className="text-amber-500 font-bold shrink-0">#{i + 1}</span>
                    <span>{assumption}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

