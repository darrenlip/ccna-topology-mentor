import React, { useState, useEffect } from 'react';
import {
  Route,
  ArrowLeftRight,
  Play,
  Pause,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Router,
  Layers,
  Laptop,
  Server,
  Copy,
  Check,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { ArchitectureReport } from '../types/network';

export interface RibEntry {
  code: 'C' | 'L' | 'S' | 'S*' | 'O';
  network: string;
  mask: string;
  prefixLen: number;
  nextHop: string;
  egressInterface: string;
  adminDistance: number;
  metric: number;
  isMatched?: boolean;
  matchReason?: string;
}

export interface RouteHop {
  hopNumber: number;
  deviceName: string;
  deviceType: 'router' | 'switch' | 'server' | 'pc';
  ingressInterface: string;
  egressInterface: string;
  nextHopDevice?: string;
  nextHopIp?: string;
  ttl: number;
  vlanTag?: string;
  srcMac: string;
  dstMac: string;
  layerAction: 'L2_SWITCHING' | 'L3_ROUTING' | 'ENDPOINT_ORIGIN' | 'ENDPOINT_DESTINATION';
  routingTableMatch: string;
  encapsulationNote: string;
  deviceRib?: RibEntry[];
  matchedRibEntry?: RibEntry;
}

export interface TracedPathResult {
  sourceName: string;
  sourceIp: string;
  destinationName: string;
  destinationIp: string;
  orderedNodeNames: string[];
  activeLinkKeys: Set<string>;
  linkOrderMap: Map<string, number>;
  hops: RouteHop[];
  protocolUsed: string;
  isSameSubnet: boolean;
  reachabilityStatus: 'REACHABLE' | 'PARTIAL_PATH';
}

interface PathTracerProps {
  report: ArchitectureReport;
  selectableEndpoints: Array<{
    name: string;
    type: 'router' | 'switch' | 'server' | 'pc';
    ip?: string;
    vlan?: string;
  }>;
  sourceEndpoint: string;
  destEndpoint: string;
  isTraceActive: boolean;
  focusedHopIndex: number | null;
  tracedPath: TracedPathResult | null;
  onSelectSource: (name: string) => void;
  onSelectDest: (name: string) => void;
  onSwapEndpoints: () => void;
  onToggleTrace: (active: boolean) => void;
  onFocusHop: (index: number | null) => void;
  onSelectDeviceConfig?: (deviceName: string) => void;
}

export const PathTracer: React.FC<PathTracerProps> = ({
  selectableEndpoints,
  sourceEndpoint,
  destEndpoint,
  isTraceActive,
  focusedHopIndex,
  tracedPath,
  onSelectSource,
  onSelectDest,
  onSwapEndpoints,
  onToggleTrace,
  onFocusHop,
  onSelectDeviceConfig,
}) => {
  const [activeView, setActiveView] = useState<'pipeline' | 'rib' | 'cli'>('pipeline');
  const [copiedCli, setCopiedCli] = useState(false);
  const [isAutoStepping, setIsAutoStepping] = useState(false);

  const focusedHop =
    tracedPath && focusedHopIndex !== null ? tracedPath.hops[focusedHopIndex] : null;

  // Find routers in the traced path that have RIB tables
  const routerHops = tracedPath
    ? tracedPath.hops.filter(
        (h) => h.deviceType === 'router' && h.deviceRib && h.deviceRib.length > 0
      )
    : [];

  // Build quick-select endpoint pairs (e.g. PC1 -> Server1, PC1 -> PC2)
  const quickPairs = React.useMemo(() => {
    const pairs: Array<{ src: string; dst: string; label: string }> = [];
    if (selectableEndpoints.length < 2) return pairs;

    const first = selectableEndpoints[0];
    const last = selectableEndpoints[selectableEndpoints.length - 1];
    pairs.push({
      src: first.name,
      dst: last.name,
      label: `${first.name} → ${last.name}`,
    });

    for (let i = 0; i < selectableEndpoints.length; i++) {
      for (let j = i + 1; j < selectableEndpoints.length; j++) {
        const a = selectableEndpoints[i];
        const b = selectableEndpoints[j];
        if (a.name === first.name && b.name === last.name) continue;
        if (pairs.length < 4) {
          pairs.push({
            src: a.name,
            dst: b.name,
            label: `${a.name} → ${b.name}`,
          });
        }
      }
    }
    return pairs;
  }, [selectableEndpoints]);

  // Auto-stepping animation effect
  useEffect(() => {
    if (!isAutoStepping || !tracedPath || tracedPath.hops.length === 0) {
      return;
    }
    const timer = window.setInterval(() => {
      if (focusedHopIndex === null) {
        onFocusHop(0);
      } else if (focusedHopIndex < tracedPath.hops.length - 1) {
        onFocusHop(focusedHopIndex + 1);
      } else {
        setIsAutoStepping(false);
      }
    }, 1400);

    return () => window.clearInterval(timer);
  }, [isAutoStepping, focusedHopIndex, tracedPath, onFocusHop]);

  const handleToggleAutoStep = () => {
    if (!tracedPath) {
      onToggleTrace(true);
      onFocusHop(0);
      setIsAutoStepping(true);
      return;
    }
    if (isAutoStepping) {
      setIsAutoStepping(false);
    } else {
      if (focusedHopIndex === null || focusedHopIndex >= tracedPath.hops.length - 1) {
        onFocusHop(0);
      }
      setIsAutoStepping(true);
    }
  };

  const generateTracerouteCli = () => {
    if (!tracedPath) return '';
    const lines: string[] = [];
    lines.push(`${tracedPath.sourceName}> traceroute ${tracedPath.destinationIp}`);
    lines.push(`Type escape sequence to abort.`);
    lines.push(
      `Tracing the route to ${tracedPath.destinationName} (${tracedPath.destinationIp}), 30 hops max:`
    );
    lines.push('');

    let l3Counter = 1;
    tracedPath.hops.forEach((hop) => {
      if (hop.deviceType === 'router' || hop.layerAction === 'ENDPOINT_DESTINATION') {
        const hopIp =
          hop.layerAction === 'ENDPOINT_DESTINATION'
            ? tracedPath.destinationIp
            : hop.nextHopIp || '192.168.10.1';
        const rtt1 = l3Counter * 2;
        const rtt2 = l3Counter * 2 + 1;
        const rtt3 = l3Counter * 2;
        lines.push(
          `  ${l3Counter}   ${hopIp} (${hop.deviceName})   ${rtt1} msec   ${rtt2} msec   ${rtt3} msec`
        );
        l3Counter++;
      }
    });

    if (routerHops.length > 0) {
      lines.push('');
      lines.push(`! =================================================================`);
      lines.push(`! ROUTING TABLE (CEF / RIB) LOOKUP VERIFICATION ALONG PATH`);
      lines.push(`! =================================================================`);
      routerHops.forEach((rHop) => {
        lines.push(`${rHop.deviceName}# show ip route ${tracedPath.destinationIp}`);
        lines.push(`Routing entry for ${tracedPath.destinationIp}/32`);
        lines.push(`  Known via "${rHop.routingTableMatch}"`);
        lines.push(`  Forwarding via ${rHop.egressInterface}, TTL=${rHop.ttl}`);
        lines.push('');
      });
    }

    return lines.join('\n');
  };

  const handleCopyCli = () => {
    navigator.clipboard.writeText(generateTracerouteCli());
    setCopiedCli(true);
    setTimeout(() => setCopiedCli(false), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden space-y-0">
      {/* Top Control Header */}
      <div className="p-5 border-b border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400">
              <Route className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-sm font-semibold text-slate-100">
                  Path Tracer &amp; Hop-by-Hop Routing Table Inspector
                </h3>
                {tracedPath && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950/90 border border-emerald-700/60 text-emerald-300">
                    {tracedPath.reachabilityStatus === 'REACHABLE' ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-3 h-3 text-amber-400" />
                    )}
                    {tracedPath.protocolUsed}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Select two endpoints (or click hosts on the topology canvas) to trace L2 VLAN switching and L3 Longest-Prefix Match (LPM) routing decisions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {tracedPath && (
              <button
                type="button"
                onClick={handleToggleAutoStep}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 border ${
                  isAutoStepping
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                    : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25'
                }`}
              >
                {isAutoStepping ? (
                  <>
                    <Pause className="w-3.5 h-3.5" />
                    <span>Pause Packet Walk</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Animate Hop-by-Hop</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setIsAutoStepping(false);
                onToggleTrace(!isTraceActive);
                onFocusHop(null);
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
                isTraceActive
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Play className="w-3.5 h-3.5" />
              <span>{isTraceActive ? 'Tracing Active' : 'Enable Path Tracer'}</span>
            </button>

            {isTraceActive && (
              <button
                type="button"
                onClick={() => {
                  setIsAutoStepping(false);
                  onToggleTrace(false);
                  onFocusHop(null);
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 rounded-lg text-xs font-mono transition cursor-pointer whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Source & Destination Selector Bar + Hop Stepper */}
        <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono">
            {/* Source Endpoint Picker */}
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5">
              <span className="text-emerald-400 font-semibold">SOURCE:</span>
              <select
                value={sourceEndpoint}
                onChange={(e) => {
                  setIsAutoStepping(false);
                  onSelectSource(e.target.value);
                  onToggleTrace(true);
                  onFocusHop(null);
                }}
                className="bg-transparent text-slate-100 focus:outline-none cursor-pointer"
              >
                {selectableEndpoints.map((ep) => (
                  <option
                    key={`src-${ep.name}`}
                    value={ep.name}
                    className="bg-slate-950 text-slate-100"
                  >
                    {ep.name} {ep.ip ? `(${ep.ip})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Swap Button */}
            <button
              type="button"
              onClick={() => {
                setIsAutoStepping(false);
                onSwapEndpoints();
              }}
              title="Reverse Source and Destination Endpoints"
              className="p-2 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg transition cursor-pointer"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-emerald-400" />
            </button>

            {/* Destination Endpoint Picker */}
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5">
              <span className="text-cyan-400 font-semibold">DESTINATION:</span>
              <select
                value={destEndpoint}
                onChange={(e) => {
                  setIsAutoStepping(false);
                  onSelectDest(e.target.value);
                  onToggleTrace(true);
                  onFocusHop(null);
                }}
                className="bg-transparent text-slate-100 focus:outline-none cursor-pointer"
              >
                {selectableEndpoints.map((ep) => (
                  <option
                    key={`dst-${ep.name}`}
                    value={ep.name}
                    className="bg-slate-950 text-slate-100"
                  >
                    {ep.name} {ep.ip ? `(${ep.ip})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick-Pick Endpoint Pairs */}
            {quickPairs.length > 1 && (
              <div className="hidden xl:flex items-center gap-1.5 pl-2 border-l border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase">Quick Pairs:</span>
                {quickPairs.map((pair) => {
                  const isActivePair =
                    sourceEndpoint === pair.src && destEndpoint === pair.dst && isTraceActive;
                  return (
                    <button
                      key={`${pair.src}-${pair.dst}`}
                      type="button"
                      onClick={() => {
                        setIsAutoStepping(false);
                        onSelectSource(pair.src);
                        onSelectDest(pair.dst);
                        onToggleTrace(true);
                        onFocusHop(null);
                      }}
                      className={`px-2 py-1 rounded text-[11px] font-mono transition cursor-pointer border ${
                        isActivePair
                          ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300 font-semibold'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      {pair.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sub-View Switcher & Hop Scrubber */}
          {tracedPath && (
            <div className="flex flex-wrap items-center gap-3 text-xs font-mono tabular-nums">
              {/* View mode tabs inside Path Tracer */}
              <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-1">
                {[
                  { id: 'pipeline', label: 'Hop Pipeline' },
                  { id: 'rib', label: `Router RIBs (${routerHops.length})` },
                  { id: 'cli', label: 'Traceroute CLI' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveView(tab.id as any)}
                    className={`px-2.5 py-1 rounded text-xs transition cursor-pointer whitespace-nowrap ${
                      activeView === tab.id
                        ? 'bg-slate-800 text-emerald-400 font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Hop Stepper */}
              <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsAutoStepping(false);
                    onFocusHop(null);
                  }}
                  className={`px-2.5 py-1 rounded text-xs transition cursor-pointer ${
                    focusedHopIndex === null
                      ? 'bg-emerald-600 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All Hops
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAutoStepping(false);
                    onFocusHop(
                      focusedHopIndex === null ? 0 : Math.max(0, focusedHopIndex - 1)
                    );
                  }}
                  className="p-1 text-slate-400 hover:text-slate-100 transition cursor-pointer"
                  title="Previous Hop"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="px-2 text-emerald-400 font-semibold">
                  {focusedHopIndex === null
                    ? `${tracedPath.hops.length} Hops`
                    : `Hop ${focusedHopIndex + 1}/${tracedPath.hops.length}`}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsAutoStepping(false);
                    onFocusHop(
                      focusedHopIndex === null
                        ? 0
                        : Math.min(tracedPath.hops.length - 1, focusedHopIndex + 1)
                    );
                  }}
                  className="p-1 text-slate-400 hover:text-slate-100 transition cursor-pointer"
                  title="Next Hop"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Same Endpoint Warning */}
        {isTraceActive && sourceEndpoint === destEndpoint && (
          <div className="text-xs font-mono text-amber-300 bg-amber-950/30 border border-amber-800/50 rounded-lg px-3.5 py-2">
            Select two distinct endpoints above to compute and visualize the hop-by-hop routing path.
          </div>
        )}
      </div>

      {/* Visual Hop Chain Strip (Always visible when trace is active) */}
      {tracedPath && (
        <div className="px-5 py-4 bg-slate-950/70 border-b border-slate-800 overflow-x-auto">
          <div className="flex items-center gap-2 min-w-max">
            {tracedPath.hops.map((hop, idx) => {
              const isFocused = focusedHopIndex === idx;
              const isOrigin = hop.layerAction === 'ENDPOINT_ORIGIN';
              const isDest = hop.layerAction === 'ENDPOINT_DESTINATION';
              const isL3 = hop.layerAction === 'L3_ROUTING';

              return (
                <React.Fragment key={`chain-${hop.deviceName}-${idx}`}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAutoStepping(false);
                      onFocusHop(focusedHopIndex === idx ? null : idx);
                    }}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left transition cursor-pointer font-mono text-xs tabular-nums ${
                      isFocused
                        ? 'bg-emerald-950/80 border-emerald-400 text-slate-100 ring-1 ring-emerald-400/50'
                        : isOrigin
                        ? 'bg-slate-900 border-emerald-500/40 text-slate-200 hover:border-emerald-400'
                        : isDest
                        ? 'bg-slate-900 border-cyan-500/40 text-slate-200 hover:border-cyan-400'
                        : isL3
                        ? 'bg-slate-900 border-amber-500/40 text-slate-200 hover:border-amber-400'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-center w-6 h-6 rounded bg-slate-950 border border-slate-800 shrink-0">
                      {hop.deviceType === 'router' && (
                        <Router className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                      {hop.deviceType === 'switch' && (
                        <Layers className="w-3.5 h-3.5 text-cyan-400" />
                      )}
                      {hop.deviceType === 'server' && (
                        <Server className="w-3.5 h-3.5 text-purple-400" />
                      )}
                      {hop.deviceType === 'pc' && (
                        <Laptop className="w-3.5 h-3.5 text-blue-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400">#{hop.hopNumber}</span>
                        <span className="font-bold text-slate-100">{hop.deviceName}</span>
                        <span className="text-[10px] text-slate-400">TTL:{hop.ttl}</span>
                      </div>
                      <div className="text-[10px] text-emerald-400">
                        {hop.ingressInterface === 'Local Stack'
                          ? `Out: ${hop.egressInterface}`
                          : hop.egressInterface === 'Local Delivery'
                          ? `In: ${hop.ingressInterface}`
                          : `${hop.ingressInterface} → ${hop.egressInterface}`}
                      </div>
                    </div>
                  </button>

                  {idx < tracedPath.hops.length - 1 && (
                    <div className="flex flex-col items-center px-1 text-slate-500 font-mono text-[10px]">
                      <ArrowRight className="w-4 h-4 text-emerald-400" />
                      {hop.vlanTag && (
                        <span className="text-[9px] text-slate-400">{hop.vlanTag}</span>
                      )}
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {/* Focused Hop Deep Packet & RIB Inspector Card */}
      {tracedPath && focusedHop && (
        <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 grid grid-cols-1 lg:grid-cols-3 gap-4 font-mono text-xs tabular-nums">
          {/* Column 1: Layer 2 Frame Header */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3.5 space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <span className="text-[11px] font-bold text-cyan-400">
                OSI LAYER 2 · ETHERNET FRAME
              </span>
              <span className="text-[10px] text-slate-400">
                {focusedHop.vlanTag || 'Untagged 802.3'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <div className="text-slate-500 text-[10px]">SOURCE MAC</div>
                <div className="text-slate-200 font-semibold">{focusedHop.srcMac}</div>
              </div>
              <div>
                <div className="text-slate-500 text-[10px]">DEST MAC (NEXT HOP)</div>
                <div className="text-cyan-300 font-semibold">{focusedHop.dstMac}</div>
              </div>
            </div>
            <div className="text-[11px] text-slate-400 font-sans pt-1">
              {focusedHop.encapsulationNote}
            </div>
          </div>

          {/* Column 2: Layer 3 IPv4 Packet Header */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3.5 space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <span className="text-[11px] font-bold text-emerald-400">
                OSI LAYER 3 · IPv4 PACKET
              </span>
              <span className="text-[10px] text-amber-300 font-semibold">
                TTL: {focusedHop.ttl}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <div className="text-slate-500 text-[10px]">SOURCE IP (IMMUTABLE)</div>
                <div className="text-emerald-300 font-semibold">{tracedPath.sourceIp}</div>
              </div>
              <div>
                <div className="text-slate-500 text-[10px]">DESTINATION IP</div>
                <div className="text-emerald-300 font-semibold">{tracedPath.destinationIp}</div>
              </div>
            </div>
            <div className="text-[11px] text-slate-400 font-sans pt-1">
              Hop #{focusedHop.hopNumber} on <strong className="text-slate-200">{focusedHop.deviceName}</strong> ({focusedHop.ingressInterface} → {focusedHop.egressInterface})
            </div>
          </div>

          {/* Column 3: Routing Table / CAM Decision */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3.5 space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <span className="text-[11px] font-bold text-amber-400">
                {focusedHop.layerAction === 'L3_ROUTING'
                  ? 'CEF / RIB LONGEST-PREFIX MATCH'
                  : 'FORWARDING ENGINE DECISION'}
              </span>
              {focusedHop.matchedRibEntry && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                  /{focusedHop.matchedRibEntry.prefixLen} Match
                </span>
              )}
            </div>
            <div className="text-[11px] text-amber-300 font-semibold break-words">
              {focusedHop.routingTableMatch}
            </div>
            {focusedHop.matchedRibEntry ? (
              <div className="text-[10px] text-slate-400">
                Protocol Code: <span className="text-slate-200">{focusedHop.matchedRibEntry.code}</span> · AD/Metric: <span className="text-slate-200">[{focusedHop.matchedRibEntry.adminDistance}/{focusedHop.matchedRibEntry.metric}]</span> · Egress: <span className="text-cyan-300">{focusedHop.matchedRibEntry.egressInterface}</span>
              </div>
            ) : (
              <div className="text-[10px] text-slate-400">
                Click any hop in the chain above or use the arrow buttons to inspect each stage.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sub-View 1: Hop-by-Hop Forwarding Table */}
      {tracedPath && activeView === 'pipeline' && (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono tabular-nums">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400">
                <th className="py-2.5 px-4 font-medium">Hop</th>
                <th className="py-2.5 px-4 font-medium">Device &amp; TTL</th>
                <th className="py-2.5 px-4 font-medium">Ingress → Egress</th>
                <th className="py-2.5 px-4 font-medium">Matched Routing Table / CAM Entry</th>
                <th className="py-2.5 px-4 font-medium">Encapsulation &amp; Forwarding Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {tracedPath.hops.map((hop, idx) => {
                const isFocused = focusedHopIndex === idx;
                const isL3 = hop.layerAction === 'L3_ROUTING';
                const isOrigin = hop.layerAction === 'ENDPOINT_ORIGIN';
                const isDest = hop.layerAction === 'ENDPOINT_DESTINATION';

                return (
                  <tr
                    key={`${hop.deviceName}-${idx}`}
                    onClick={() => {
                      setIsAutoStepping(false);
                      onFocusHop(focusedHopIndex === idx ? null : idx);
                    }}
                    className={`transition cursor-pointer ${
                      isFocused ? 'bg-emerald-950/35' : 'hover:bg-slate-950/50'
                    }`}
                  >
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold ${
                          isOrigin
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : isDest
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                            : isL3
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {hop.hopNumber}
                      </span>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-100">{hop.deviceName}</span>
                        {(hop.deviceType === 'router' || hop.deviceType === 'switch') &&
                          onSelectDeviceConfig && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectDeviceConfig(hop.deviceName);
                              }}
                              className="text-[10px] text-emerald-400 hover:underline cursor-pointer"
                            >
                              [CLI]
                            </button>
                          )}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {hop.deviceType.toUpperCase()} · TTL {hop.ttl}
                      </div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="text-slate-300">{hop.ingressInterface}</span>
                      <span className="text-slate-500 mx-1.5">→</span>
                      <span className="text-emerald-400 font-semibold">
                        {hop.egressInterface}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <code
                        className={`text-xs ${
                          isL3
                            ? 'text-amber-300 font-semibold'
                            : isOrigin || isDest
                            ? 'text-emerald-300'
                            : 'text-cyan-300'
                        }`}
                      >
                        {hop.routingTableMatch}
                      </code>
                    </td>

                    <td className="py-3 px-4 font-sans text-slate-300">
                      {hop.encapsulationNote}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Sub-View 2: Router RIB Tables with Highlighted Longest-Prefix Match */}
      {tracedPath && activeView === 'rib' && (
        <div className="p-5 space-y-4">
          {routerHops.length === 0 ? (
            <div className="text-xs font-mono text-slate-400 p-4 bg-slate-950 border border-slate-800 rounded-lg">
              This path is switched entirely at Layer 2 within the same VLAN/Subnet without traversing a Layer 3 Router.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {routerHops.map((rHop, rIdx) => (
                <div
                  key={`rib-${rHop.deviceName}-${rIdx}`}
                  className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden"
                >
                  <div className="px-4 py-2.5 border-b border-slate-800 flex items-center justify-between text-xs font-mono">
                    <span className="font-semibold text-slate-100">
                      {rHop.deviceName}# show ip route (Hop #{rHop.hopNumber})
                    </span>
                    <span className="text-emerald-400">
                      Target Dst: {tracedPath.destinationIp}
                    </span>
                  </div>
                  <div className="p-3 space-y-1.5 font-mono text-xs tabular-nums">
                    {(rHop.deviceRib || []).map((entry, eIdx) => (
                      <div
                        key={eIdx}
                        className={`px-2.5 py-1.5 rounded flex items-center justify-between gap-2 ${
                          entry.isMatched
                            ? 'bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 font-semibold'
                            : 'text-slate-400'
                        }`}
                      >
                        <div className="truncate">
                          <span className="inline-block w-5 text-amber-300 font-bold">
                            {entry.code}
                          </span>
                          <span>
                            {entry.network}/{entry.prefixLen}
                          </span>
                          {entry.code !== 'C' && entry.code !== 'L' && (
                            <span className="text-slate-400 ml-1.5">
                              [{entry.adminDistance}/{entry.metric}] via {entry.nextHop}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-cyan-400">{entry.egressInterface}</span>
                          {entry.isMatched && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                              LPM MATCH
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sub-View 3: Simulated Cisco IOS Traceroute & RIB CLI Output */}
      {tracedPath && activeView === 'cli' && (
        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400">
              Simulated Cisco IOS <code className="text-emerald-400">traceroute</code> &amp;{' '}
              <code className="text-emerald-400">show ip route</code> verification output
            </span>
            <button
              type="button"
              onClick={handleCopyCli}
              className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-mono transition cursor-pointer"
            >
              {copiedCli ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copiedCli ? 'Copied Output' : 'Copy CLI Output'}</span>
            </button>
          </div>
          <pre className="p-4 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono tabular-nums text-slate-200 overflow-x-auto leading-relaxed">
            {generateTracerouteCli()}
          </pre>
        </div>
      )}
    </div>
  );
};

