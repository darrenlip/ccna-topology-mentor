import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Upload,
  FileText,
  Sliders,
  Play,
  Check,
  X,
  Shield,
  Layers,
  Network,
  Eye,
  Plus,
  Trash2,
  AlertTriangle,
  Calculator,
  CheckCircle2,
} from 'lucide-react';
import { NetworkConstraints, VlanRequirement } from '../types/network';
import { calculateVlsm } from '../utils/vlsmCalculator';

interface TopologyUploaderProps {
  onAnalyze: (
    fileData: { data: string; mimeType: string; name?: string; previewUrl?: string; size?: number } | null,
    constraints: NetworkConstraints,
    manualText?: string
  ) => Promise<void>;
  isLoading: boolean;
  preloadedFile?: {
    name: string;
    size: number;
    mimeType: string;
    data: string;
    previewUrl?: string;
  } | null;
  initialConstraints?: NetworkConstraints;
  initialScenario?: string;
  onCancel?: () => void;
}

export const TopologyUploader: React.FC<TopologyUploaderProps> = ({
  onAnalyze,
  isLoading,
  preloadedFile,
  initialConstraints,
  initialScenario,
  onCancel,
}) => {
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    size: number;
    mimeType: string;
    data: string;
    previewUrl?: string;
  } | null>(preloadedFile || null);

  const [previewZoomOpen, setPreviewZoomOpen] = useState(false);
  const [manualDescription, setManualDescription] = useState(initialScenario || '');
  const [isDragOver, setIsDragOver] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (preloadedFile) {
      setSelectedFile(preloadedFile);
    }
  }, [preloadedFile]);

  // Constraints State — starts empty until the user keys in their IPv4 block(s) or picks a preset
  const [networkBlock, setNetworkBlock] = useState(
    initialConstraints?.networkBlock || ''
  );
  const [routingProtocol, setRoutingProtocol] = useState<'AUTO' | 'OSPF' | 'STATIC' | 'EIGRP' | 'RIPv2'>(
    (initialConstraints?.routingProtocol as any) || 'AUTO'
  );
  const [ospfProcessId, setOspfProcessId] = useState(initialConstraints?.ospfProcessId ?? 1);
  const [ospfArea, setOspfArea] = useState(initialConstraints?.ospfArea ?? 0);
  const [interVlanMethod, setInterVlanMethod] = useState<'ROUTER_ON_A_STICK' | 'L3_SVI'>(
    initialConstraints?.interVlanMethod || 'ROUTER_ON_A_STICK'
  );
  const [nativeVlan, setNativeVlan] = useState(initialConstraints?.nativeVlan ?? 999);
  const [parkingVlan, setParkingVlan] = useState(initialConstraints?.parkingVlan ?? 888);
  const [domainName, setDomainName] = useState(initialConstraints?.domainName || 'lab.local');
  const [adminUsername, setAdminUsername] = useState(initialConstraints?.adminUsername || 'admin');
  const [adminPassword, setAdminPassword] = useState(
    initialConstraints?.adminPassword || 'LAB_ADMIN_PASSWORD_REPLACE_ME'
  );
  const [enableSecret, setEnableSecret] = useState(
    initialConstraints?.enableSecret || 'LAB_SECRET_REPLACE_ME'
  );
  const [additionalInstructions, setAdditionalInstructions] = useState(
    initialConstraints?.additionalInstructions || ''
  );

  // Start with NO hardcoded VLANs — only create VLANs if specified in the diagram, scenario, or explicitly added by the user
  const [vlans, setVlans] = useState<VlanRequirement[]>(
    initialConstraints?.vlanRequirements && initialConstraints.vlanRequirements.length > 0
      ? initialConstraints.vlanRequirements
      : []
  );

  // Real-time deterministic CIDR block validation & scenario intent mapping
  const liveVlsm = useMemo(() => {
    const reqs = vlans.map((v) => ({
      name: v.name || `VLAN ${v.vlanId}`,
      vlanId: v.vlanId,
      hostsNeeded: Number(v.hostCount) || 2,
    }));
    return calculateVlsm(networkBlock, reqs, manualDescription);
  }, [networkBlock, vlans, manualDescription]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (file: File) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1];
      const mimeType = file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'image/png');

      setSelectedFile({
        name: file.name,
        size: file.size,
        mimeType,
        data: base64Data,
        previewUrl: file.type.startsWith('image/') ? result : undefined,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleAddVlan = () => {
    const nextId = (vlans.length + 1) * 10;
    setVlans([
      ...vlans,
      {
        id: String(Date.now()),
        vlanId: nextId > 900 ? nextId : nextId + 10,
        name: `VLAN_${nextId}`,
        hostCount: 20,
        purpose: 'Department Segment',
      },
    ]);
  };

  const handleRemoveVlan = (id: string) => {
    setVlans(vlans.filter((v) => v.id !== id));
  };

  const handleUpdateVlan = (id: string, field: keyof VlanRequirement, value: any) => {
    setVlans(vlans.map((v) => (v.id === id ? { ...v, [field]: value } : v)));
  };

  const handleTriggerAnalysis = () => {
    const finalBlock = liveVlsm.isValidBase
      ? liveVlsm.normalizedBaseCidr
      : networkBlock.trim() || '192.168.10.0/24';
    const currentConstraints: NetworkConstraints = {
      networkBlock: finalBlock,
      routingProtocol,
      ospfProcessId,
      ospfArea,
      interVlanMethod,
      nativeVlan,
      mgmtVlan: nativeVlan,
      parkingVlan,
      domainName,
      adminUsername,
      adminPassword,
      enableSecret,
      consolePassword: 'LAB_CONSOLE_PASSWORD_REPLACE_ME',
      vlanRequirements: vlans,
      additionalInstructions,
    };

    onAnalyze(
      selectedFile
        ? {
            data: selectedFile.data,
            mimeType: selectedFile.mimeType,
            name: selectedFile.name,
            size: selectedFile.size,
            previewUrl: selectedFile.previewUrl,
          }
        : null,
      currentConstraints,
      manualDescription
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleTriggerAnalysis();
    }
  };

  const applyScenarioStarter = (starterText: string, suggestedBlock: string) => {
    setManualDescription(starterText);
    setNetworkBlock(suggestedBlock);
  };

  const appendCidrBlock = (blockToAppend: string) => {
    const current = networkBlock.trim().replace(/;+\s*$/, '');
    if (!current) {
      setNetworkBlock(blockToAppend);
      return;
    }
    const existing = current.split(';').map((s) => s.trim());
    if (!existing.includes(blockToAppend)) {
      setNetworkBlock(`${current}; ${blockToAppend}`);
    }
  };

  const needsBoundaryNormalization =
    liveVlsm.isValidBase &&
    liveVlsm.parsedBlocks.some((b) => b.rawInput.trim() !== b.normalizedCidr);

  return (
    <div
      onKeyDown={handleKeyDown}
      className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden transition-all"
    >
      {/* Header */}
      <div className="px-6 py-5 bg-slate-950/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-base sm:text-lg font-semibold text-slate-100 tracking-tight">
            Step 0: Topology Diagram &amp; IPv4 Addressing Intake
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            Upload your CCNA lab or network topology diagram (image or PDF), enter one or more IPv4 CIDR blocks separated by <code className="text-emerald-400 font-mono">;</code>, and specify your scenario goals so the engine can guide you through the complete setup.
          </p>
        </div>

        {onCancel && (
          <button
            onClick={onCancel}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition cursor-pointer whitespace-nowrap shrink-0"
          >
            Cancel
          </button>
        )}
      </div>

      <div className="p-6 space-y-6">
        {/* Core Input Grid: 1. Topology Upload & 2. Base IP Block */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* 1. Upload Network Topology (Image or PDF) - 7 cols */}
          <div className="lg:col-span-7 flex flex-col space-y-2">
            <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
              <span>01. Upload Network Topology Diagram (Image or PDF)</span>
              <span className="text-xs text-slate-500 font-mono">PNG · JPG · WEBP · PDF</span>
            </label>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex-1 border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition flex flex-col items-center justify-center min-h-[180px] relative ${
                isDragOver
                  ? 'border-emerald-500 bg-emerald-950/20'
                  : selectedFile
                  ? 'border-emerald-600/70 bg-slate-950/80'
                  : 'border-slate-800 hover:border-slate-700 bg-slate-950/50 hover:bg-slate-950/80'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileChange(e.target.files[0]);
                  }
                }}
              />

              {selectedFile ? (
                <div className="flex flex-col items-center gap-3 w-full">
                  {selectedFile.previewUrl ? (
                    <div className="relative group max-w-full">
                      <img
                        src={selectedFile.previewUrl}
                        alt="Topology Preview"
                        referrerPolicy="no-referrer"
                        className="max-h-32 rounded-lg border border-slate-700 object-contain mx-auto"
                      />
                      <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition rounded-lg flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewZoomOpen(true);
                          }}
                          className="p-1.5 rounded-md bg-slate-800 text-slate-200 hover:bg-slate-700 transition"
                          title="Inspect Full Diagram"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFile(null);
                          }}
                          className="p-1.5 rounded-md bg-red-600/90 text-white hover:bg-red-500 transition"
                          title="Remove File"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800 text-slate-200 w-full max-w-md">
                      <FileText className="w-6 h-6 text-emerald-400 shrink-0" />
                      <div className="overflow-hidden text-left flex-1">
                        <div className="font-mono text-xs font-semibold truncate text-slate-100">
                          {selectedFile.name}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono tabular-nums">
                          PDF Document · {(selectedFile.size / 1024).toFixed(1)} KB
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(null);
                        }}
                        className="p-1 rounded text-slate-400 hover:text-red-400 transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <div className="text-xs font-mono tabular-nums text-emerald-400 font-medium flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" />
                    <span>
                      {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Click or drop another file to replace
                  </span>
                </div>
              ) : (
                <div className="space-y-2 py-2">
                  <div className="w-11 h-11 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto text-emerald-400">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div className="text-sm font-medium text-slate-200">
                    Click to select or drag and drop network diagram
                  </div>
                  <div className="text-xs text-slate-500 max-w-sm mx-auto">
                    Packet Tracer screenshots, Visio exports, GNS3 topologies, or PDF lab sheets
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 2. Base IP Address Block & Live Capacity Meter - 5 cols */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="block text-xs font-medium text-slate-300">
                  02. Base IPv4 Address Block(s) (CIDR)
                </label>
                <span className="text-[11px] font-mono text-emerald-400">
                  Separate multiple blocks with &quot;;&quot;
                </span>
              </div>
              <input
                type="text"
                value={networkBlock}
                onChange={(e) => setNetworkBlock(e.target.value)}
                placeholder="e.g. 192.168.10.0/24; 10.0.0.0/30"
                className={`w-full px-3.5 py-2.5 bg-slate-950 border rounded-lg text-sm font-mono tabular-nums font-semibold placeholder:font-normal placeholder:text-slate-600 focus:outline-none ${
                  !networkBlock.trim()
                    ? 'border-slate-800 text-slate-200 focus:border-emerald-500'
                    : liveVlsm.isValidBase
                    ? 'border-slate-800 text-emerald-400 focus:border-emerald-500'
                    : 'border-amber-600/80 text-amber-300 focus:border-amber-500'
                }`}
              />

              {/* Parsed Multi-Block Breakdown & Scenario Segment Mapping (only shown after user enters CIDR block) */}
              {liveVlsm.parsedBlocks.length > 0 && (
                <div className="p-2.5 rounded-lg bg-slate-950/90 border border-slate-800/90 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-medium text-slate-300">
                      Detected IPv4 Blocks ({liveVlsm.parsedBlocks.length}):
                    </span>
                    <span className="font-mono text-slate-500">
                      Scenario-to-Block Intent
                    </span>
                  </div>
                  <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                    {liveVlsm.parsedBlocks.map((blk) => (
                      <div
                        key={`${blk.index}-${blk.rawInput}`}
                        className="flex items-center justify-between gap-2 px-2 py-1 rounded bg-slate-900/90 border border-slate-800/80 text-[11px] font-mono tabular-nums"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              blk.isValid ? 'bg-emerald-400' : 'bg-red-400'
                            }`}
                          />
                          <span className="text-emerald-300 font-semibold shrink-0">
                            {blk.isValid ? blk.normalizedCidr : blk.rawInput}
                          </span>
                          <span className="text-slate-500 shrink-0">
                            ({blk.usableHosts} hosts)
                          </span>
                        </div>
                        <span
                          className="text-cyan-300 truncate text-right"
                          title={blk.inferredPurpose}
                        >
                          → {blk.inferredPurpose}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Non-zero host bits boundary normalization helper */}
              {needsBoundaryNormalization && (
                <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-amber-950/40 border border-amber-800/60 text-xs text-amber-200">
                  <span className="font-mono tabular-nums truncate">
                    Boundary: {liveVlsm.normalizedBaseCidr}
                  </span>
                  <button
                    type="button"
                    onClick={() => setNetworkBlock(liveVlsm.normalizedBaseCidr)}
                    className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-mono text-[11px] cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Normalize IP(s)
                  </button>
                </div>
              )}

              {/* Quick block presets & multi-block append */}
              <div className="pt-1 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Quick CCNA blocks (click to set, or +; to append another block):</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    '192.168.10.0/24',
                    '192.168.20.0/24',
                    '10.0.0.0/30',
                    '172.16.0.0/22',
                    '192.168.10.0/24; 10.0.0.0/30',
                    '192.168.10.0/24; 192.168.20.0/24; 10.0.0.0/30',
                  ].map((preset) => {
                    const isExact = networkBlock.trim() === preset;
                    const isSingle = !preset.includes(';');
                    return (
                      <div key={preset} className="inline-flex items-center rounded border overflow-hidden border-slate-800 bg-slate-950">
                        <button
                          type="button"
                          onClick={() => setNetworkBlock(preset)}
                          className={`text-[11px] font-mono tabular-nums px-2 py-1 transition cursor-pointer whitespace-nowrap ${
                            isExact
                              ? 'bg-emerald-950/80 text-emerald-300 font-semibold'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                          }`}
                        >
                          {preset}
                        </button>
                        {isSingle && (
                          <button
                            type="button"
                            onClick={() => appendCidrBlock(preset)}
                            title={`Append "; ${preset}"`}
                            className="px-1.5 py-1 text-[11px] font-mono bg-slate-900 hover:bg-emerald-950 text-slate-400 hover:text-emerald-300 border-l border-slate-800 transition cursor-pointer"
                          >
                            +;
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* CIDR Validation Status Box (waits until user enters IPv4 block) */}
            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg space-y-1.5">
              {!networkBlock.trim() ? (
                <div className="text-xs text-slate-400 font-mono leading-relaxed">
                  Key in one or more IPv4 CIDR blocks separated by <span className="text-emerald-400 font-semibold">;</span> above (or leave blank if all subnets are already labeled on your uploaded diagram).
                </div>
              ) : liveVlsm.isValidBase ? (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-emerald-400 font-medium flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>
                      {liveVlsm.parsedBlocks.length} Valid CIDR Block{liveVlsm.parsedBlocks.length > 1 ? 's' : ''} Ready
                    </span>
                  </span>
                  <span className="font-mono tabular-nums text-slate-300">
                    {liveVlsm.totalBaseAddresses} Total IPs
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-amber-300">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Check CIDR syntax (use format e.g. 192.168.10.0/24; 10.0.0.0/30)</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 3. Scenario in Plain Text */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="text-xs font-medium text-slate-300">
              03. Network Scenario & Design Intentions (Plain Text — Specify Which IP Block Maps to Which Segment/Interface)
            </label>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span>Example templates:</span>
              <button
                type="button"
                onClick={() =>
                  applyScenarioStarter(
                    'Use 192.168.1.0/24 for the LAN segment and 192.168.0.0/30 for the point-to-point WAN link between routers. No VLANs required; configure physical router interfaces, switch access ports, and routing based on the uploaded topology.',
                    '192.168.1.0/24; 192.168.0.0/30'
                  )
                }
                className="px-2.5 py-1 rounded bg-emerald-950/80 border border-emerald-700/70 hover:bg-emerald-900/70 text-emerald-300 text-xs transition cursor-pointer whitespace-nowrap shrink-0"
              >
                Flat LAN + WAN (No VLANs)
              </button>
              <button
                type="button"
                onClick={() =>
                  applyScenarioStarter(
                    'Use 192.168.10.0/24 for R1 LAN, use 192.168.20.0/24 for R2 LAN, and use 10.0.0.0/30 for the point-to-point link between R1 and R2. Configure interfaces and routing strictly according to the uploaded diagram.',
                    '192.168.10.0/24; 192.168.20.0/24; 10.0.0.0/30'
                  )
                }
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition cursor-pointer whitespace-nowrap shrink-0"
              >
                Dual-LAN + WAN (;)
              </button>
            </div>
          </div>

          <textarea
            rows={3}
            value={manualDescription}
            onChange={(e) => setManualDescription(e.target.value)}
            placeholder="Describe the exact requirements for your uploaded topology and how each ';' separated IPv4 block should be assigned (e.g., Use 192.168.1.0/24 for the LAN segment and 192.168.0.0/30 for the router-to-router link)..."
            className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 resize-none leading-relaxed"
          />
        </div>

        {/* 4. Architectural & CCNA Security Parameters (Collapsible) */}
        <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950/60">
          <div
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between cursor-pointer hover:bg-slate-900 transition"
          >
            <div className="flex items-center gap-2 text-xs font-medium text-slate-200">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <span>04. CCNA Routing, VLAN Host Sizing & Security Baselines</span>
            </div>
            <span className="text-xs font-mono text-emerald-400">
              {showAdvanced ? 'Collapse' : 'Configure Parameters'}
            </span>
          </div>

          {showAdvanced && (
            <div className="p-5 space-y-5">
              {/* Row 1: Routing Method, OSPF / Static, Inter-VLAN */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Routing Decision Mode (CCNA 200-301):
                  </label>
                  <select
                    value={routingProtocol}
                    onChange={(e) => setRoutingProtocol(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="AUTO">Auto-Detect (1 Rtr=ROAS, Stub=Static, Mesh=OSPF)</option>
                    <option value="OSPF">Force Dynamic: OSPFv2 (router ospf 1)</option>
                    <option value="STATIC">Force Static: Default & Next-Hop Routes</option>
                  </select>
                  {(routingProtocol === 'OSPF' || routingProtocol === 'AUTO') && (
                    <div className="flex items-center gap-2 mt-2 text-xs font-mono tabular-nums text-slate-400">
                      <span>OSPF Proc:</span>
                      <input
                        type="number"
                        value={ospfProcessId}
                        onChange={(e) => setOspfProcessId(Number(e.target.value))}
                        className="w-14 px-2 py-1 bg-slate-900 border border-slate-800 rounded text-slate-200"
                      />
                      <span>Area:</span>
                      <input
                        type="number"
                        value={ospfArea}
                        onChange={(e) => setOspfArea(Number(e.target.value))}
                        className="w-14 px-2 py-1 bg-slate-900 border border-slate-800 rounded text-slate-200"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Inter-VLAN Method:
                  </label>
                  <select
                    value={interVlanMethod}
                    onChange={(e) => setInterVlanMethod(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="ROUTER_ON_A_STICK">Router-on-a-Stick (802.1Q subinterfaces)</option>
                    <option value="L3_SVI">Layer 3 Switch (SVI routing)</option>
                  </select>
                  <div className="flex items-center gap-2 mt-2 text-xs font-mono tabular-nums text-slate-400">
                    <span>Native VLAN:</span>
                    <input
                      type="number"
                      value={nativeVlan}
                      onChange={(e) => setNativeVlan(Number(e.target.value))}
                      className="w-16 px-2 py-1 bg-slate-900 border border-slate-800 rounded text-amber-400 font-semibold"
                    />
                    <span>Parking:</span>
                    <input
                      type="number"
                      value={parkingVlan}
                      onChange={(e) => setParkingVlan(Number(e.target.value))}
                      className="w-16 px-2 py-1 bg-slate-900 border border-slate-800 rounded text-slate-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    SSHv2 RSA Domain Name:
                  </label>
                  <input
                    type="text"
                    value={domainName}
                    onChange={(e) => setDomainName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Row 2: Lab Credential Placeholders */}
              <div className="pt-3 border-t border-slate-800/80">
                <div className="flex items-center gap-2 mb-2 text-xs text-amber-300">
                  <Shield className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Lab Credential Placeholders (never enter production secrets):</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Admin Username:
                    </label>
                    <input
                      type="text"
                      value={adminUsername}
                      onChange={(e) => setAdminUsername(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs font-mono text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Admin Secret Placeholder:
                    </label>
                    <input
                      type="text"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs font-mono text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Enable Secret Placeholder:
                    </label>
                    <input
                      type="text"
                      value={enableSecret}
                      onChange={(e) => setEnableSecret(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs font-mono text-slate-200"
                    />
                  </div>
                </div>
              </div>

              {/* Row 3: Optional Custom VLAN Sizing Requirements */}
              <div className="pt-3 border-t border-slate-800/80">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Optional VLAN &amp; Host Sizing Overrides (Leave empty if topology has no VLANs):</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddVlan}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-mono transition cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add VLAN</span>
                  </button>
                </div>

                {vlans.length === 0 ? (
                  <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 text-xs font-mono text-slate-400">
                    No custom VLANs forced. The engine will strictly follow your uploaded topology diagram and scenario text without inventing arbitrary VLANs.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {vlans.map((vlan) => (
                      <div
                        key={vlan.id}
                        className="flex items-center gap-2 p-2 bg-slate-900 rounded-lg border border-slate-800 text-xs font-mono tabular-nums"
                      >
                        <span className="text-slate-400 text-[11px]">VLAN:</span>
                        <input
                          type="number"
                          value={vlan.vlanId}
                          onChange={(e) => handleUpdateVlan(vlan.id, 'vlanId', Number(e.target.value))}
                          className="w-14 px-1.5 py-1 bg-slate-950 border border-slate-800 rounded text-cyan-300 font-semibold"
                        />
                        <input
                          type="text"
                          value={vlan.name}
                          onChange={(e) => handleUpdateVlan(vlan.id, 'name', e.target.value)}
                          placeholder="Name"
                          className="w-28 px-1.5 py-1 bg-slate-950 border border-slate-800 rounded text-slate-200"
                        />
                        <span className="text-slate-400 text-[11px]">Hosts:</span>
                        <input
                          type="number"
                          value={vlan.hostCount}
                          onChange={(e) => handleUpdateVlan(vlan.id, 'hostCount', Number(e.target.value))}
                          className="w-16 px-1.5 py-1 bg-slate-950 border border-slate-800 rounded text-emerald-400 font-semibold"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveVlan(vlan.id)}
                          className="p-1 rounded text-slate-500 hover:text-red-400 ml-auto cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 5. Analysis Trigger Action */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <div className="text-xs text-slate-400 font-mono tabular-nums">
            {selectedFile ? (
              <span className="text-emerald-400">
                Ready to analyze {selectedFile.name}
                {liveVlsm.normalizedBaseCidr ? ` · Blocks: ${liveVlsm.normalizedBaseCidr}` : ''}
              </span>
            ) : manualDescription.trim() ? (
              <span className="text-cyan-400">
                Ready to analyze scenario
                {liveVlsm.normalizedBaseCidr ? ` · Blocks: ${liveVlsm.normalizedBaseCidr}` : ''}
              </span>
            ) : (
              <span>Upload a topology diagram or enter a network scenario above to begin.</span>
            )}
          </div>

          <button
            onClick={handleTriggerAnalysis}
            disabled={isLoading || (!selectedFile && !manualDescription.trim())}
            className="flex items-center gap-2.5 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-lg text-sm font-semibold transition cursor-pointer whitespace-nowrap shrink-0"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Generating 5-Stage CCNA Architecture...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Analyze Topology & Generate Configurations</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Modal for Zooming Diagram Preview */}
      {previewZoomOpen && selectedFile?.previewUrl && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
              <span className="font-mono text-xs text-slate-200 font-semibold truncate">
                {selectedFile.name}
              </span>
              <button
                onClick={() => setPreviewZoomOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-auto flex-1 flex items-center justify-center bg-slate-950">
              <img
                src={selectedFile.previewUrl}
                alt="Diagram Zoom"
                referrerPolicy="no-referrer"
                className="max-h-[75vh] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
