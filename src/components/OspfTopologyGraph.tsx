import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import {
  Activity,
  Layers,
  Shield,
  Zap,
  CheckCircle2,
  Terminal,
  Copy,
  Check,
  RefreshCw,
  ArrowRight,
  Sliders,
  HelpCircle,
  Eye,
  Info,
  Network
} from 'lucide-react';
import { ArchitectureReport } from '../types/network';

interface OspfTopologyGraphProps {
  report?: ArchitectureReport;
}

interface SimulatedOspfNode {
  id: string;
  name: string;
  routerId: string;
  role: 'DR' | 'BDR' | 'DROTHER' | 'ABR';
  area: number;
  priority: number;
  ip: string;
  loopback: string;
  model: string;
  x: number;
  y: number;
}

interface SimulatedOspfLink {
  id: string;
  sourceId: string;
  targetId: string;
  area: number;
  cost: number;
  state: 'FULL/DR' | 'FULL/BDR' | 'FULL/DROTHER' | '2-WAY';
  networkType: 'BROADCAST' | 'POINT_TO_POINT';
  helloInterval: number;
  deadInterval: number;
  sourceInterface: string;
  targetInterface: string;
  subnet: string;
}

interface PassiveSubnetStub {
  id: string;
  routerId: string;
  routerName: string;
  interfaceName: string;
  vlanName: string;
  ipSubnet: string;
  cost: number;
  x: number;
  y: number;
}

export const OspfTopologyGraph: React.FC<OspfTopologyGraphProps> = ({ report }) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string>('r1');
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);
  const [showHelloPulse, setShowHelloPulse] = useState(true);
  const [showLinkCosts, setShowLinkCosts] = useState(true);
  const [activeAreaFilter, setActiveAreaFilter] = useState<'all' | '0' | '1'>('all');
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [priorityOverride, setPriorityOverride] = useState<number>(1);
  const [simulatedStateStep, setSimulatedStateStep] = useState<number>(6); // 6 = FULL

  const svgRef = useRef<SVGSVGElement>(null);

  const ospfProcessId = report?.constraints?.ospfProcessId || 1;
  const configuredArea = report?.constraints?.ospfArea ?? 0;
  const mainRouterName = report?.stage1_topology?.routers[0]?.name || 'Router1-Gateway';
  const mainRouterModel = report?.stage1_topology?.routers[0]?.model || 'Cisco 4321 ISR';

  // Build simulated CCNA OSPF Multi-Node / Multi-Area adjacency graph
  const { nodes, links, passiveStubs } = useMemo(() => {
    // Primary Gateway Router (from topology)
    const r1Priority = priorityOverride;
    let r1Role: 'DR' | 'BDR' | 'DROTHER' = 'DR';
    let r2Role: 'DR' | 'BDR' | 'DROTHER' = 'BDR';

    if (r1Priority === 0) {
      r1Role = 'DROTHER';
      r2Role = 'DR';
    } else if (r1Priority < 100) {
      r1Role = 'BDR';
      r2Role = 'DR';
    } else {
      r1Role = 'DR';
      r2Role = 'BDR';
    }

    const nList: SimulatedOspfNode[] = [
      {
        id: 'r1',
        name: mainRouterName,
        routerId: '1.1.1.1',
        role: r1Role,
        area: configuredArea,
        priority: r1Priority,
        ip: '192.168.10.1',
        loopback: '1.1.1.1/32',
        model: mainRouterModel,
        x: 230,
        y: 160,
      },
      {
        id: 'r2',
        name: 'Router2-Distribution',
        routerId: '2.2.2.2',
        role: r2Role,
        area: configuredArea,
        priority: 100,
        ip: '192.168.10.2',
        loopback: '2.2.2.2/32',
        model: 'Cisco ISR 4331',
        x: 480,
        y: 160,
      },
      {
        id: 'r3',
        name: 'Router3-HQ-ABR',
        routerId: '3.3.3.3',
        role: 'ABR',
        area: 0,
        priority: 1,
        ip: '10.0.0.1',
        loopback: '3.3.3.3/32',
        model: 'Cisco Catalyst 8300',
        x: 720,
        y: 160,
      },
    ];

    const lList: SimulatedOspfLink[] = [
      {
        id: 'link-r1-r2',
        sourceId: 'r1',
        targetId: 'r2',
        area: configuredArea,
        cost: 1, // GigabitEthernet
        state: r1Role === 'DR' ? 'FULL/BDR' : 'FULL/DR',
        networkType: 'BROADCAST',
        helloInterval: 10,
        deadInterval: 40,
        sourceInterface: 'GigabitEthernet0/0/0',
        targetInterface: 'GigabitEthernet0/0/1',
        subnet: '192.168.10.0/30',
      },
      {
        id: 'link-r2-r3',
        sourceId: 'r2',
        targetId: 'r3',
        area: 0,
        cost: 1,
        state: 'FULL/DR',
        networkType: 'POINT_TO_POINT',
        helloInterval: 10,
        deadInterval: 40,
        sourceInterface: 'GigabitEthernet0/0/2',
        targetInterface: 'GigabitEthernet0/0/0',
        subnet: '10.0.0.0/30',
      },
    ];

    // Extract passive interface subnets from Stage 2 addressing or defaults
    const subnets = report?.stage2_addressing?.subnetAllocations || [];
    const pStubs: PassiveSubnetStub[] = [
      {
        id: 'stub-vlan10',
        routerId: 'r1',
        routerName: mainRouterName,
        interfaceName: 'G0/0/0.10',
        vlanName: subnets[0]?.name || 'VLAN 10 - Sales',
        ipSubnet: subnets[0]?.networkAddress ? `${subnets[0].networkAddress}/${subnets[0].prefix}` : '192.168.10.0/26',
        cost: 1,
        x: 90,
        y: 80,
      },
      {
        id: 'stub-vlan20',
        routerId: 'r1',
        routerName: mainRouterName,
        interfaceName: 'G0/0/0.20',
        vlanName: subnets[1]?.name || 'VLAN 20 - Engineering',
        ipSubnet: subnets[1]?.networkAddress ? `${subnets[1].networkAddress}/${subnets[1].prefix}` : '192.168.10.64/27',
        cost: 1,
        x: 90,
        y: 160,
      },
      {
        id: 'stub-vlan30',
        routerId: 'r1',
        routerName: mainRouterName,
        interfaceName: 'G0/0/0.30',
        vlanName: subnets[2]?.name || 'VLAN 30 - Servers',
        ipSubnet: subnets[2]?.networkAddress ? `${subnets[2].networkAddress}/${subnets[2].prefix}` : '192.168.10.96/28',
        cost: 1,
        x: 90,
        y: 240,
      },
    ];

    return { nodes: nList, links: lList, passiveStubs: pStubs };
  }, [mainRouterName, mainRouterModel, configuredArea, priorityOverride, report]);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || nodes[0];
  const selectedLink = links.find((l) => l.id === selectedLinkId) || links[0];

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(text);
    setTimeout(() => setCopiedCmd(null), 1600);
  };

  // CCNA 7-State OSPF Adjacency sequence
  const OSPF_STATES = [
    { state: 'DOWN', desc: 'No Hellos received yet from neighbor.' },
    { state: 'INIT', desc: 'Hello received, but local RID not listed in neighbor Hello packet.' },
    { state: '2-WAY', desc: 'Bi-directional communication established. DR/BDR election occurs.' },
    { state: 'EXSTART', desc: 'Master/Slave negotiation and Initial DBD sequence number agreed.' },
    { state: 'EXCHANGE', desc: 'Routers exchange Database Description (DBD) packets.' },
    { state: 'LOADING', desc: 'LSR (Link-State Request) and LSU (Update) packets synchronize LSDB.' },
    { state: 'FULL', desc: 'Complete database adjacency achieved. Routers run Dijkstra SPF algorithm.' },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl space-y-0">
      {/* Visualizer Top Bar */}
      <div className="px-5 py-4 bg-slate-950/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Network className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-slate-100 font-mono tracking-tight">
                OSPFv2 TOPOLOGY & ADJACENCY GRAPH
              </h4>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 font-semibold">
                Process ID: {ospfProcessId} • Area {configuredArea}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-sans">
              Interactive D3 visualizer depicting OSPF neighbor adjacencies, DR/BDR roles, link metrics, and passive client interfaces.
            </p>
          </div>
        </div>

        {/* Graph Controls */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            onClick={() => setShowHelloPulse(!showHelloPulse)}
            className={`px-3 py-1.5 rounded-lg border text-[11px] transition cursor-pointer flex items-center gap-1.5 ${
              showHelloPulse
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Hello Pulses ({showHelloPulse ? 'ON' : 'OFF'})</span>
          </button>

          <button
            onClick={() => setShowLinkCosts(!showLinkCosts)}
            className={`px-3 py-1.5 rounded-lg border text-[11px] transition cursor-pointer flex items-center gap-1.5 ${
              showLinkCosts
                ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Link Cost Badges</span>
          </button>
        </div>
      </div>

      {/* Main Graph & Inspector Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 border-b border-slate-800">
        {/* Left Column: D3 / SVG Visual Canvas (8 cols) */}
        <div className="lg:col-span-8 bg-[#070b14] relative p-4 flex flex-col justify-between min-h-[380px]">
          {/* Legend Overlay */}
          <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-2 text-[10px] font-mono pointer-events-none">
            <span className="px-2 py-0.5 rounded bg-amber-950/80 border border-amber-800/80 text-amber-300">
              Area 0 (Backbone)
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800/80 text-emerald-300">
              Active Neighbor Link (224.0.0.5)
            </span>
            <span className="px-2 py-0.5 rounded bg-purple-950/80 border border-purple-800/80 text-purple-300">
              Passive Stub (Hellos Suppressed)
            </span>
          </div>

          {/* SVG Canvas */}
          <svg
            ref={svgRef}
            viewBox="0 0 840 320"
            className="w-full h-auto select-none overflow-visible"
          >
            <defs>
              {/* Glow filter for active adjacencies */}
              <filter id="ospfGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>

              {/* Area 0 Backdrop Gradient */}
              <radialGradient id="area0Gradient" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.01" />
              </radialGradient>
            </defs>

            {/* Area 0 Backbone Visual Boundary Hull */}
            <rect
              x="160"
              y="40"
              width="640"
              height="240"
              rx="24"
              fill="url(#area0Gradient)"
              stroke="#f59e0b"
              strokeWidth="1.5"
              strokeDasharray="6 4"
              strokeOpacity="0.4"
            />
            <text
              x="180"
              y="68"
              fill="#fbbf24"
              fontSize="11"
              fontFamily="monospace"
              fontWeight="bold"
              letterSpacing="1"
            >
              OSPF AREA 0 (BACKBONE TRANSIT AREA)
            </text>

            {/* Passive Interface Connections from R1 to Subnets */}
            {passiveStubs.map((stub) => {
              const r1 = nodes[0];
              return (
                <g key={stub.id}>
                  {/* Dotted passive stub link */}
                  <line
                    x1={r1.x}
                    y1={r1.y}
                    x2={stub.x}
                    y2={stub.y}
                    stroke="#a855f7"
                    strokeWidth="1.5"
                    strokeDasharray="4 3"
                    strokeOpacity="0.7"
                  />

                  {/* Passive Subnet Box */}
                  <g transform={`translate(${stub.x - 70}, ${stub.y - 18})`}>
                    <rect
                      width="120"
                      height="36"
                      rx="6"
                      fill="#0f172a"
                      stroke="#6b21a8"
                      strokeWidth="1"
                    />
                    <text
                      x="10"
                      y="16"
                      fill="#e9d5ff"
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {stub.vlanName.split(' ')[0]} {stub.vlanName.split(' ')[1] || ''}
                    </text>
                    <text
                      x="10"
                      y="28"
                      fill="#a855f7"
                      fontSize="8.5"
                      fontFamily="monospace"
                    >
                      {stub.ipSubnet} (Passive)
                    </text>
                  </g>
                </g>
              );
            })}

            {/* Active OSPF Links between Routers */}
            {links.map((link) => {
              const src = nodes.find((n) => n.id === link.sourceId)!;
              const tgt = nodes.find((n) => n.id === link.targetId)!;
              const isSelected = selectedLinkId === link.id;
              const midX = (src.x + tgt.x) / 2;
              const midY = (src.y + tgt.y) / 2;

              return (
                <g
                  key={link.id}
                  onClick={() => setSelectedLinkId(link.id)}
                  className="cursor-pointer group"
                >
                  {/* Underlay glow */}
                  <line
                    x1={src.x}
                    y1={src.y}
                    x2={tgt.x}
                    y2={tgt.y}
                    stroke={isSelected ? '#10b981' : '#f59e0b'}
                    strokeWidth={isSelected ? '6' : '3'}
                    strokeOpacity={isSelected ? '0.6' : '0.2'}
                    filter="url(#ospfGlow)"
                  />

                  {/* Main solid link line */}
                  <line
                    x1={src.x}
                    y1={src.y}
                    x2={tgt.x}
                    y2={tgt.y}
                    stroke={isSelected ? '#34d399' : '#10b981'}
                    strokeWidth="2.5"
                  />

                  {/* Animated Hello packet pulse circle */}
                  {showHelloPulse && (
                    <circle r="4" fill="#34d399">
                      <animate
                        attributeName="cx"
                        from={src.x}
                        to={tgt.x}
                        dur="2.5s"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="cy"
                        from={src.y}
                        to={tgt.y}
                        dur="2.5s"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="opacity"
                        values="0.2;1;0.2"
                        dur="2.5s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  )}

                  {/* Link Badges at Center */}
                  <g transform={`translate(${midX}, ${midY})`}>
                    {/* Cost Badge */}
                    {showLinkCosts && (
                      <g transform="translate(0, -14)">
                        <rect
                          x="-32"
                          y="-10"
                          width="64"
                          height="20"
                          rx="4"
                          fill="#020617"
                          stroke={isSelected ? '#10b981' : '#334155'}
                          strokeWidth="1"
                        />
                        <text
                          x="0"
                          y="4"
                          textAnchor="middle"
                          fill="#38bdf8"
                          fontSize="9.5"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          Cost: {link.cost}
                        </text>
                      </g>
                    )}

                    {/* Adjacency State Pill */}
                    <g transform="translate(0, 10)">
                      <rect
                        x="-38"
                        y="-8"
                        width="76"
                        height="16"
                        rx="4"
                        fill="#064e3b"
                        stroke="#059669"
                        strokeWidth="1"
                      />
                      <text
                        x="0"
                        y="4"
                        textAnchor="middle"
                        fill="#a7f3d0"
                        fontSize="8.5"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        {link.state}
                      </text>
                    </g>
                  </g>

                  {/* Interface tags at endpoints */}
                  <text
                    x={src.x + 35}
                    y={src.y - 12}
                    fill="#94a3b8"
                    fontSize="8.5"
                    fontFamily="monospace"
                  >
                    {link.sourceInterface.split('Ethernet')[1] ? `Gi${link.sourceInterface.split('Ethernet')[1]}` : link.sourceInterface}
                  </text>
                  <text
                    x={tgt.x - 65}
                    y={tgt.y - 12}
                    fill="#94a3b8"
                    fontSize="8.5"
                    fontFamily="monospace"
                  >
                    {link.targetInterface.split('Ethernet')[1] ? `Gi${link.targetInterface.split('Ethernet')[1]}` : link.targetInterface}
                  </text>
                </g>
              );
            })}

            {/* OSPF Router Nodes */}
            {nodes.map((node) => {
              const isSelected = selectedNodeId === node.id;
              const roleColors = {
                DR: { bg: '#78350f', border: '#f59e0b', text: '#fde68a' },
                BDR: { bg: '#083344', border: '#06b6d4', text: '#cffafe' },
                DROTHER: { bg: '#1e293b', border: '#64748b', text: '#cbd5e1' },
                ABR: { bg: '#581c87', border: '#a855f7', text: '#f3e8ff' },
              }[node.role];

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onClick={() => setSelectedNodeId(node.id)}
                  className="cursor-pointer group"
                >
                  {/* Selection Ring */}
                  {isSelected && (
                    <circle
                      r="40"
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="2"
                      strokeDasharray="4 2"
                      className="animate-spin-slow"
                    />
                  )}

                  {/* Outer Outer Glow */}
                  <circle
                    r="32"
                    fill={isSelected ? '#0f172a' : '#020617'}
                    stroke={isSelected ? '#f59e0b' : '#334155'}
                    strokeWidth={isSelected ? '2.5' : '1.5'}
                    filter="url(#ospfGlow)"
                  />

                  {/* Inner Node Circle */}
                  <circle
                    r="26"
                    fill="#0f172a"
                    stroke={roleColors.border}
                    strokeWidth="1.5"
                  />

                  {/* Router Icon (Crossed arrows) */}
                  <g transform="translate(-10, -10) scale(0.8)">
                    <path
                      d="M5 12h14M12 5l7 7-7 7"
                      stroke="#94a3b8"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </g>

                  {/* Role Badge above node */}
                  <g transform="translate(0, -36)">
                    <rect
                      x="-22"
                      y="-8"
                      width="44"
                      height="16"
                      rx="4"
                      fill={roleColors.bg}
                      stroke={roleColors.border}
                      strokeWidth="1"
                    />
                    <text
                      x="0"
                      y="4"
                      textAnchor="middle"
                      fill={roleColors.text}
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {node.role}
                    </text>
                  </g>

                  {/* Node Label Below */}
                  <text
                    x="0"
                    y="44"
                    textAnchor="middle"
                    fill={isSelected ? '#fbbf24' : '#f1f5f9'}
                    fontSize="10.5"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {node.name}
                  </text>
                  <text
                    x="0"
                    y="57"
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    RID: {node.routerId}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Quick Guidance Pill Footer */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-[11px] font-mono text-slate-400">
            <div className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-amber-400" />
              <span>Click any router or link to inspect live OSPF neighbor table & Dijkstra cost.</span>
            </div>
            <div className="text-slate-500">
              Metric = Reference BW (100 Mbps) / Interface BW
            </div>
          </div>
        </div>

        {/* Right Column: Interactive OSPF Inspector (4 cols) */}
        <div className="lg:col-span-4 bg-slate-950 p-5 space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            {/* Inspector Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  Node Inspector
                </span>
                <h5 className="text-sm font-bold text-slate-100 font-mono flex items-center gap-2">
                  <span>{selectedNode.name}</span>
                  <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px]">
                    {selectedNode.role}
                  </span>
                </h5>
              </div>
              <div className="text-right font-mono text-xs">
                <span className="text-slate-500 text-[10px] block">Router ID</span>
                <span className="text-emerald-400 font-bold">{selectedNode.routerId}</span>
              </div>
            </div>

            {/* Node Parameter Badges */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">OSPF Priority</span>
                <span className="text-slate-200 font-bold">{selectedNode.priority} (Default: 1)</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">OSPF Area</span>
                <span className="text-amber-400 font-bold">Area {selectedNode.area}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Loopback0 IP</span>
                <span className="text-slate-300">{selectedNode.loopback}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Timers</span>
                <span className="text-slate-300">Hello 10s / Dead 40s</span>
              </div>
            </div>

            {/* Live Simulated CLI Output: show ip ospf neighbor */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-400 flex items-center gap-1.5 font-semibold">
                  <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                  show ip ospf neighbor
                </span>
                <button
                  onClick={() => handleCopy(`show ip ospf neighbor`)}
                  className="text-slate-400 hover:text-slate-200 transition cursor-pointer flex items-center gap-1"
                >
                  {copiedCmd === 'show ip ospf neighbor' ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>Copy</span>
                </button>
              </div>

              <div className="p-3 rounded-lg bg-[#070b14] border border-slate-800 text-[10.5px] font-mono text-slate-300 leading-relaxed overflow-x-auto whitespace-pre">
{selectedNode.id === 'r1' ? (
`Neighbor ID     Pri   State           Dead Time   Address         Interface
2.2.2.2           1   FULL/BDR        00:00:34    192.168.10.2    Gi0/0/0`
) : selectedNode.id === 'r2' ? (
`Neighbor ID     Pri   State           Dead Time   Address         Interface
1.1.1.1           1   FULL/DR         00:00:36    192.168.10.1    Gi0/0/1
3.3.3.3           1   FULL/ -         00:00:32    10.0.0.2        Gi0/0/2`
) : (
`Neighbor ID     Pri   State           Dead Time   Address         Interface
2.2.2.2           1   FULL/ -         00:00:35    10.0.0.1        Gi0/0/0`
)}
              </div>
            </div>

            {/* CCNA 7-State Transition Stepper */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  Adjacency State Machine:
                </span>
                <span className="text-emerald-400 font-bold">STATE: FULL</span>
              </div>

              <div className="flex items-center gap-1">
                {OSPF_STATES.map((s, idx) => (
                  <div
                    key={s.state}
                    title={`${s.state}: ${s.desc}`}
                    className={`flex-1 h-2 rounded-sm transition ${
                      idx <= simulatedStateStep
                        ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50'
                        : 'bg-slate-800'
                    }`}
                  />
                ))}
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                {OSPF_STATES[simulatedStateStep].state}: {OSPF_STATES[simulatedStateStep].desc}
              </div>
            </div>

            {/* What-If DR/BDR Priority Simulator */}
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-semibold text-amber-300 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5" />
                  DR/BDR Priority Simulator:
                </span>
                <span className="text-slate-300 font-bold">Priority: {priorityOverride}</span>
              </div>
              <p className="text-[10.5px] text-slate-400 font-sans leading-tight">
                Change OSPF priority on <code className="text-amber-300 font-mono">R1</code> to observe election outcome. Priority 0 prevents DR election.
              </p>
              <div className="flex items-center gap-2 pt-1 font-mono text-[11px]">
                <button
                  onClick={() => setPriorityOverride(0)}
                  className={`flex-1 py-1 rounded border text-center transition cursor-pointer ${
                    priorityOverride === 0
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Pri 0 (DROTHER)
                </button>
                <button
                  onClick={() => setPriorityOverride(1)}
                  className={`flex-1 py-1 rounded border text-center transition cursor-pointer ${
                    priorityOverride === 1
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Pri 1 (Default)
                </button>
                <button
                  onClick={() => setPriorityOverride(255)}
                  className={`flex-1 py-1 rounded border text-center transition cursor-pointer ${
                    priorityOverride === 255
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Pri 255 (Force DR)
                </button>
              </div>
            </div>
          </div>

          {/* Quick Copy OSPF Verification Command */}
          <button
            onClick={() => handleCopy(`show ip ospf interface brief`)}
            className="w-full py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl text-xs font-mono flex items-center justify-center gap-2 transition cursor-pointer"
          >
            {copiedCmd === 'show ip ospf interface brief' ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>Copy: show ip ospf interface brief</span>
          </button>
        </div>
      </div>
    </div>
  );
};
