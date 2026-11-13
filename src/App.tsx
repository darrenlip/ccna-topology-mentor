import React, { useState, useEffect } from 'react';
import {
  Network,
  Terminal,
  ShieldCheck,
  Calculator,
  Download,
  Copy,
  Check,
  Layers,
  FileCode,
  AlertTriangle,
  BookOpen,
  UploadCloud,
  Eye,
  Plus,
  RefreshCw,
  Server,
  Award,
} from 'lucide-react';
import { ArchitectureReport, NetworkConstraints, Stage1Topology, Stage2Addressing } from './types/network';
import { TopologyVisualizer } from './components/TopologyVisualizer';
import { Phase1InventoryView } from './components/Phase1Inventory';
import { Phase2AddressingView } from './components/Phase2Addressing';
import { Phase3ConfigsView } from './components/Phase3Configs';
import { Stage4RationaleView } from './components/Stage4RationaleView';
import { Stage5VerificationView } from './components/Stage5VerificationView';
import { SimulationExportView } from './components/SimulationExportView';
import { TopologyUploader } from './components/TopologyUploader';
import { VlsmToolModal } from './components/VlsmToolModal';
import { ResponsibleUseModal } from './components/ResponsibleUseModal';
import { ResponsibleUseCard } from './components/ResponsibleUseCard';
import { NetworkAuditPanel } from './components/NetworkAuditPanel';
import { CcnaTrainingArena } from './components/CcnaTrainingArena';
import { ErrorBoundary } from './components/ErrorBoundary';
import { motion, AnimatePresence } from 'framer-motion';

export default function App() {
  const [currentReport, setCurrentReport] = useState<ArchitectureReport | null>(null);
  const [topSection, setTopSection] = useState<'workbench' | 'arena'>('workbench');
  const [activeTab, setActiveTab] = useState<
    'visualizer' | 'stage1' | 'stage2' | 'stage3' | 'stage4' | 'stage5' | 'simulationExport' | 'fullReport' | 'arena'
  >('stage1');
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [isVlsmModalOpen, setIsVlsmModalOpen] = useState(false);
  const [isAdvisoryModalOpen, setIsAdvisoryModalOpen] = useState(false);
  const [isEditingConstraints, setIsEditingConstraints] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [copiedReport, setCopiedReport] = useState(false);
  const [showOriginalDiagram, setShowOriginalDiagram] = useState(true);

  // Global drag-and-drop state
  const [isGlobalDragOver, setIsGlobalDragOver] = useState(false);
  const [droppedFile, setDroppedFile] = useState<{
    name: string;
    size: number;
    mimeType: string;
    data: string;
    previewUrl?: string;
  } | null>(null);

  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer?.types?.includes('Files')) {
        setIsGlobalDragOver(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      if (e.relatedTarget === null) {
        setIsGlobalDragOver(false);
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsGlobalDragOver(false);
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64Data = result.split(',')[1];
          const mimeType = file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'image/png');
          setDroppedFile({
            name: file.name,
            size: file.size,
            mimeType,
            data: base64Data,
            previewUrl: file.type.startsWith('image/') ? result : undefined,
          });
          setIsEditingConstraints(true);
        };
        reader.readAsDataURL(file);
      }
    };

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, []);

  const handleSelectDevice = (deviceName: string) => {
    setSelectedDevice(deviceName);
    setActiveTab('stage3');
  };

  const handleAnalyzeTopology = async (
    fileData: { data: string; mimeType: string; name?: string; previewUrl?: string; size?: number } | null,
    constraints: NetworkConstraints,
    manualText?: string
  ) => {
    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const response = await fetch('/api/analyze-topology', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: fileData ? { data: fileData.data, mimeType: fileData.mimeType } : null,
          constraints,
          manualDescription: manualText,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Server error processing topology analysis.');
      }

      const generatedData = result.data;

      const stage1Data = generatedData.stage1_topology || generatedData.phase1_inventory || {};
      const stage1: Stage1Topology = {
        summary: stage1Data.summary || 'Topology hardware inventory and interconnection mapping.',
        routers: Array.isArray(stage1Data.routers) ? stage1Data.routers : [],
        switches: Array.isArray(stage1Data.switches) ? stage1Data.switches : [],
        endpoints: Array.isArray(stage1Data.endpoints) ? stage1Data.endpoints : [],
        connections: Array.isArray(stage1Data.connections) ? stage1Data.connections : [],
        assumptions: Array.isArray(stage1Data.assumptions) ? stage1Data.assumptions : [],
      };

      const stage2Data = generatedData.stage2_addressing || generatedData.phase2_addressing || {};
      const stage2: Stage2Addressing = {
        networkBlock: stage2Data.networkBlock || constraints.networkBlock,
        vlsmRationale:
          stage2Data.vlsmRationale ||
          'VLSM calculation performed with descending host capacity prioritization.',
        subnetAllocations: Array.isArray(stage2Data.subnetAllocations)
          ? stage2Data.subnetAllocations
          : [],
        addressingTable: Array.isArray(stage2Data.addressingTable) ? stage2Data.addressingTable : [],
      };

      const stage3 = Array.isArray(generatedData.stage3_configs)
        ? generatedData.stage3_configs
        : Array.isArray(generatedData.phase3_configs)
        ? generatedData.phase3_configs
        : [];

      const stage4 = generatedData.stage4_rationale || {
        subnetAllocationRationale:
          generatedData.phase4_rationale?.technicalRationale?.subnetting ||
          'VLSM prioritized descending by hosts.',
        routingChoiceRationale:
          generatedData.phase4_rationale?.technicalRationale?.routing ||
          'Routing configured according to architectural specifications.',
        securityFeaturesRationale:
          generatedData.phase4_rationale?.technicalRationale?.layer2Security ||
          'PortFast, BPDU Guard, and Parking VLAN configured.',
      };

      const stage5 = generatedData.stage5_verification || {
        layer2Commands: [
          {
            device: 'Switch1',
            command: 'show vlan brief',
            purpose: 'Verify active VLAN assignments',
            expectedOutput: 'Active VLANs displayed',
          },
          {
            device: 'Switch1',
            command: 'show interfaces trunk',
            purpose: 'Verify 802.1Q trunking',
            expectedOutput: 'Trunking on Native VLAN',
          },
        ],
        layer3RoutingCommands: [
          {
            device: 'Router1',
            command: 'show ip interface brief',
            purpose: 'Verify up/up status',
            expectedOutput: 'Interfaces up up',
          },
          {
            device: 'Router1',
            command: 'show ip route',
            purpose: 'Confirm routing convergence',
            expectedOutput: 'Connected & dynamic routes',
          },
          {
            device: 'Router1',
            command: 'show ip ospf neighbor',
            purpose: 'Verify OSPF adjacency',
            expectedOutput: 'Neighbor state FULL',
          },
        ],
        pingTests: [
          {
            fromDevice: 'Workstation',
            targetIp: '192.168.10.1',
            targetDescription: 'Default Gateway',
            purpose: 'Test gateway reachability',
            expectedOutput: 'Success rate is 100 percent (5/5)',
          },
        ],
        checklist: [
          {
            step: 1,
            title: 'Layer 2 Verification',
            description: 'Run show vlan brief and show interfaces trunk on all switches.',
            commands: ['show vlan brief', 'show interfaces trunk'],
          },
        ],
      };

      const dynamicTitle = fileData?.name
        ? `Topology: ${fileData.name.replace(/\.[^/.]+$/, '')} (${stage2.networkBlock})`
        : manualText
        ? `CCNA Architecture: ${stage2.networkBlock}`
        : `Network Architecture: ${stage2.networkBlock}`;

      const newReport: ArchitectureReport = {
        id: `topo-${Date.now()}`,
        title: dynamicTitle,
        summary:
          generatedData.summary ||
          'Analyzed network topology architecture and Cisco IOS configuration suite.',
        timestamp: new Date().toISOString(),
        constraints: {
          ...constraints,
          networkBlock: stage2.networkBlock,
        },
        stage1_topology: stage1,
        stage2_addressing: stage2,
        stage3_configs: stage3,
        stage4_rationale: stage4,
        stage5_verification: stage5,
        diagramCoordinates: generatedData.diagramCoordinates,
        uploadedFile: fileData
          ? {
              name: fileData.name || 'uploaded-topology',
              mimeType: fileData.mimeType,
              previewUrl: fileData.previewUrl,
              size: fileData.size,
            }
          : undefined,
      };

      setCurrentReport(newReport);
      if (newReport.stage3_configs.length > 0) {
        setSelectedDevice(newReport.stage3_configs[0].deviceName);
      }
      setIsEditingConstraints(false);
      setActiveTab('stage1');
    } catch (err: any) {
      console.error('Topology analysis error:', err);
      setAnalysisError(
        err.message ||
          'Failed to complete AI analysis. Please verify your input parameters or try again.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateFullMarkdownReport = () => {
    if (!currentReport) return '';

    const stage1 = currentReport.stage1_topology || ({} as any);
    const stage2 = currentReport.stage2_addressing || ({} as any);
    const stage4 = currentReport.stage4_rationale || ({} as any);
    const stage5 = currentReport.stage5_verification || ({} as any);
    const constraints = currentReport.constraints || ({} as any);

    const routers = Array.isArray(stage1.routers) ? stage1.routers : [];
    const switches = Array.isArray(stage1.switches) ? stage1.switches : [];
    const endpoints = Array.isArray(stage1.endpoints) ? stage1.endpoints : [];
    const connections = Array.isArray(stage1.connections) ? stage1.connections : [];
    const assumptions = Array.isArray(stage1.assumptions) ? stage1.assumptions : [];
    const addressingTable = Array.isArray(stage2.addressingTable) ? stage2.addressingTable : [];
    const configs = Array.isArray(currentReport.stage3_configs) ? currentReport.stage3_configs : [];
    const l2Cmds = Array.isArray(stage5.layer2Commands) ? stage5.layer2Commands : [];
    const l3Cmds = Array.isArray(stage5.layer3RoutingCommands) ? stage5.layer3RoutingCommands : [];
    const pingTests = Array.isArray(stage5.pingTests) ? stage5.pingTests : [];
    const checklist = Array.isArray(stage5.checklist) ? stage5.checklist : [];

    let md = `# CCNA TOPOLOGY MENTOR & CISCO IOS AUTOMATION ENGINE REPORT\n\n`;
    md += `> ### Synopsis: CCNA Junior Engineer Lab & Automation Guide\n`;
    md += `> Step-by-step CCNA (200-301) architectural blueprint and annotated Cisco IOS configuration guide designed to mentor junior network engineers through topology cabling, multi-block VLSM subnetting, IOS CLI provisioning, and lab verification.\n\n`;
    md += `> ### Responsible Use & Digital Trust Advisory\n`;
    md += `> All configurations generated by this CCNA automation engine are strictly intended for training, lab simulation, and staging validation (Packet Tracer, GNS3, EVE-NG). All credentials utilize lab placeholders.\n\n`;
    md += `**Topology Title:** ${currentReport.title}\n`;
    md += `**Generated Timestamp:** ${currentReport.timestamp}\n`;
    md += `**Base Network Block:** ${constraints.networkBlock || 'N/A'}\n`;
    md += `**Routing Method:** ${constraints.routingProtocol || 'OSPF'}\n`;
    md += `**Inter-VLAN Method:** ${constraints.interVlanMethod || 'ROUTER_ON_A_STICK'}\n`;
    md += `**Native VLAN:** ${constraints.nativeVlan ?? 999} | **Parking VLAN:** ${constraints.parkingVlan || 888}\n\n`;

    md += `---\n### STAGE 1: TOPOLOGY ANALYSIS & CONNECTION MAP\n\n`;
    md += `#### 1.1 Identified Hardware Devices\n`;
    md += `| Device Name | Device Type / Model | Operational Role | Physical Interfaces & Notes |\n`;
    md += `| :--- | :--- | :--- | :--- |\n`;
    routers.forEach((r: any) => {
      const intfs = Array.isArray(r.interfaces) ? r.interfaces.join(', ') : r.interfaces || 'N/A';
      md += `| ${r.name} | Router (${r.model || 'ISR 4321'}) | ${r.role || 'WAN Gateway'} | Interfaces: ${intfs} |\n`;
    });
    switches.forEach((s: any) => {
      const ports = Array.isArray(s.ports) ? s.ports.join(', ') : s.ports || 'N/A';
      md += `| ${s.name} | Switch (${s.model || 'Catalyst 2960'}) | ${s.role || 'Access / Trunk Switch'} | Ports: ${ports} |\n`;
    });
    endpoints.forEach((e: any) => {
      md += `| ${e.name} | ${e.type || 'Endpoint Host'} | Workstation / Server | IP: ${e.assignedIp || 'DHCP'}, Gateway: ${e.defaultGateway || 'N/A'} |\n`;
    });

    md += `\n#### 1.2 Physical Link & Port Interconnection Map\n`;
    md += `| Origin Device | Origin Port | <--> | Destination Device | Destination Port | Link Classification | 802.1Q / Native VLAN |\n`;
    md += `| :--- | :--- | :---: | :--- | :--- | :--- | :--- |\n`;
    connections.forEach((c: any) => {
      md += `| ${c.fromDevice} | ${c.fromInterface} | <--> | ${c.toDevice} | ${c.toInterface} | ${c.linkType || 'Access'} | ${c.vlan || 'VLAN 1'} |\n`;
    });

    if (assumptions.length > 0) {
      md += `\n#### 1.3 Assumptions & Unverified Connections\n`;
      assumptions.forEach((a: string) => {
        md += `- ${a}\n`;
      });
    }

    md += `\n---\n### STAGE 2: VLSM ADDRESSING TABLE\n\n`;
    md += `**Base Subnet Block:** \`${stage2.networkBlock}\`\n\n`;
    md += `| Device | Interface / Subinterface | VLAN / Purpose | IP Address | Subnet Mask | Usable Range | Default Gateway |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;
    addressingTable.forEach((row: any) => {
      const vlanPurpose =
        row.vlanPurpose || (row.vlan ? `VLAN ${row.vlan} (${row.purpose || ''})` : row.purpose || 'LAN');
      md += `| ${row.device || 'N/A'} | ${row.interface || 'N/A'} | ${vlanPurpose} | ${row.ipAddress || 'DHCP'} | ${row.subnetMask || 'N/A'} | ${row.usableRange || 'N/A'} | ${row.defaultGateway || 'N/A'} |\n`;
    });

    md += `\n---\n### STAGE 3: CISCO IOS CONFIGURATIONS\n\n`;
    configs.forEach((cfg: any) => {
      md += `#### Configuration: \`${cfg.deviceName}\` (${cfg.deviceType || 'Cisco IOS'})\n`;
      md += `\`\`\`cisco\n${cfg.fullConfig}\n\`\`\`\n\n`;
    });

    md += `---\n### STAGE 4: DESIGN RATIONALE\n\n`;
    md += `#### 4.1 VLSM Subnet Allocation & Subnet Mask Sizing Rationale\n`;
    md += `${stage4.subnetAllocationRationale || 'Descending host requirements prioritization.'}\n\n`;
    md += `#### 4.2 Routing Architecture & Convergence Handling Rationale\n`;
    md += `${stage4.routingChoiceRationale || 'Dynamic or static routing configured.'}\n\n`;
    md += `#### 4.3 CCNA Security Baselines & Threat Mitigation Rationale\n`;
    md += `${stage4.securityFeaturesRationale || 'Hardened console, SSHv2, PortFast, BPDU Guard, and Parking VLAN.'}\n\n`;

    md += `---\n### STAGE 5: VERIFICATION COMMANDS\n\n`;
    md += `#### 5.1 Layer 2 Switching & Trunk Verification Commands\n`;
    md += `| Target Device | Verification Command | Diagnostic Purpose | Expected Cisco IOS CLI Output |\n`;
    md += `| :--- | :--- | :--- | :--- |\n`;
    l2Cmds.forEach((c: any) => {
      md += `| ${c.device} | \`${c.command}\` | ${c.purpose} | ${(c.expectedOutput || '').replace(/\n/g, ' ')} |\n`;
    });

    md += `\n#### 5.2 Layer 3 & Routing Verification Commands\n`;
    md += `| Target Device | Verification Command | Diagnostic Purpose | Expected Cisco IOS CLI Output |\n`;
    md += `| :--- | :--- | :--- | :--- |\n`;
    l3Cmds.forEach((c: any) => {
      md += `| ${c.device} | \`${c.command}\` | ${c.purpose} | ${(c.expectedOutput || '').replace(/\n/g, ' ')} |\n`;
    });

    md += `\n#### 5.3 Key End-to-End ICMP Ping Reachability Tests\n`;
    md += `| Origin Device | Ping Command | Destination Description | Connectivity Purpose | Expected Reply |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- |\n`;
    pingTests.forEach((p: any) => {
      md += `| ${p.fromDevice} | \`ping ${p.targetIp}\` | ${p.targetDescription} | ${p.purpose} | ${p.expectedOutput} |\n`;
    });

    if (checklist.length > 0) {
      md += `\n#### 5.4 Packet Tracer Step-by-Step Lab Testing Checklist\n`;
      checklist.forEach((step: any) => {
        md += `**Step ${step.step}: ${step.title}**\n`;
        md += `- Description: ${step.description}\n`;
        const cmds = Array.isArray(step.commands) ? step.commands : [];
        md += `- Commands to execute:\n`;
        cmds.forEach((cmd: string) => {
          md += `  \`${cmd}\`\n`;
        });
        md += `\n`;
      });
    }

    return md;
  };

  const handleCopyReport = () => {
    navigator.clipboard.writeText(generateFullMarkdownReport());
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2000);
  };

  const handleDownloadReport = () => {
    if (!currentReport) return;
    const blob = new Blob([generateFullMarkdownReport()], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CCNA-Architecture-Report-${currentReport.id}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleResetToNew = () => {
    setCurrentReport(null);
    setIsEditingConstraints(false);
    setAnalysisError(null);
    setDroppedFile(null);
  };

  return (
    <div className="min-h-screen bg-[#0b1120] text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-white relative max-w-full overflow-x-hidden">
      {/* Global Drag-and-Drop Overlay */}
      {isGlobalDragOver && (
        <div className="fixed inset-0 z-50 bg-emerald-950/85 backdrop-blur-md border-4 border-dashed border-emerald-400 flex flex-col items-center justify-center p-6 text-center pointer-events-none">
          <UploadCloud className="w-16 h-16 text-emerald-400 mb-4 animate-bounce" />
          <h2 className="text-2xl font-bold text-white font-mono">Drop Network Topology Diagram Here</h2>
          <p className="text-sm text-emerald-200 mt-2 font-sans max-w-md">
            Release to ingest your topology diagram (image or PDF), extract hardware components and physical connections, and generate production CCNA Cisco IOS configurations.
          </p>
        </div>
      )}

      {/* Top Bar Contract: 3-Zone Header */}
      <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3 sm:gap-6 lg:gap-8 min-w-0">
          {/* Zone 1: Single text element wordmark */}
          <button
            type="button"
            onClick={() => {
              setTopSection('workbench');
              if (currentReport) handleResetToNew();
            }}
            className="text-sm sm:text-base lg:text-lg font-bold tracking-tight text-slate-100 truncate min-w-0 cursor-pointer text-left shrink"
          >
            CCNA Topology Mentor{' '}
            <span className="text-emerald-400 font-mono text-xs sm:text-sm font-semibold hidden sm:inline">
              &amp; IOS Engine
            </span>
          </button>

          {/* Zone 2: Clean single-line text navigation links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400 shrink-0">
            <button
              type="button"
              onClick={() => setTopSection('workbench')}
              className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                topSection === 'workbench' ? 'text-emerald-400 font-semibold' : 'hover:text-slate-100'
              }`}
            >
              Topology Workbench
            </button>
            <button
              type="button"
              onClick={() => setTopSection('arena')}
              className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                topSection === 'arena' ? 'text-emerald-400 font-semibold' : 'hover:text-slate-100'
              }`}
            >
              CCNA Skill Arena
            </button>
            <button
              type="button"
              onClick={() => setIsVlsmModalOpen(true)}
              className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              VLSM Calculator
            </button>
            <button
              type="button"
              onClick={() => setIsAdvisoryModalOpen(true)}
              className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Trust Advisory
            </button>
            {currentReport && (
              <button
                type="button"
                onClick={() => {
                  setTopSection('workbench');
                  setIsEditingConstraints(true);
                }}
                className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Edit Parameters
              </button>
            )}
          </nav>

          {/* Zone 3: Primary Actions */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <a
              href="/ccna-topology-mentor-github.zip"
              download="ccna-topology-mentor-github.zip"
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
              title="Download GitHub-ready source ZIP"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="hidden sm:inline">GitHub ZIP</span>
              <span className="sm:hidden">ZIP</span>
            </a>
            {currentReport ? (
              <button
                type="button"
                onClick={handleDownloadReport}
                className="px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span className="hidden sm:inline">Export Report (.md)</span>
                <span className="sm:hidden">Export .md</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsVlsmModalOpen(true)}
                className="px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span className="hidden sm:inline">Open Subnet Calculator</span>
                <span className="sm:hidden">VLSM Calc</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full space-y-6 min-w-0">
        {/* Top-Level Mode Switcher Tab Strip (Workbench vs Gamified CCNA Skill Arena) */}
        <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 border-b border-slate-800 pb-3 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 p-1 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono max-w-full">
            <button
              type="button"
              onClick={() => setTopSection('workbench')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-md font-semibold transition cursor-pointer ${
                topSection === 'workbench'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Network className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span>Topology &amp; IOS Workbench</span>
            </button>
            <button
              type="button"
              onClick={() => setTopSection('arena')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-md font-semibold transition cursor-pointer ${
                topSection === 'arena'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span>CCNA Skill Arena</span>
            </button>
          </div>

          <div className="text-xs text-slate-400 font-mono">
            {topSection === 'arena'
              ? 'Gamified CLI drills & troubleshooting missions for Junior Network Engineers'
              : currentReport
              ? `Active Blueprint: ${currentReport.title}`
              : 'Upload a diagram or practice hands-on CLI missions in the Skill Arena'}
          </div>
        </div>

        {/* Error notification if API failed */}
        {analysisError && (
          <div className="bg-red-950/30 border border-red-800/60 rounded-xl p-4 flex items-start gap-3 text-xs text-red-300">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-semibold text-red-200">Topology Analysis Notice</div>
              <div>{analysisError}</div>
              <div className="text-[11px] text-slate-400">
                Ensure your image or PDF diagram is legible, or enter your scenario details in plain text and retry.
              </div>
            </div>
          </div>
        )}

        {topSection === 'arena' ? (
          <CcnaTrainingArena
            report={currentReport}
            onJumpToStage={(stage) => {
              setTopSection('workbench');
              setActiveTab(stage);
            }}
          />
        ) : !currentReport || isEditingConstraints ? (
          <div className="space-y-6">
            {/* App Title & Junior Engineer Synopsis Banner */}
            <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
              <div className="space-y-2">
                <div className="text-xs font-mono uppercase tracking-wider text-emerald-400">
                  CCNA 200-301 Guided Network Engineering Workbench
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
                  CCNA Topology Mentor &amp; Cisco IOS Automation Engine
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-4xl">
                  An interactive architectural mentor built to guide <strong className="text-slate-100">junior network engineers</strong> step-by-step from a raw network diagram to a fully verified Cisco IOS deployment. Upload any simple-to-intermediate CCNA topology (Packet Tracer, GNS3, Visio, or lab PDF) along with your assigned IPv4 CIDR block(s), and the engine breaks down the entire implementation into five structured engineering stages:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
                <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3 space-y-1">
                  <div className="text-[11px] font-mono font-bold text-emerald-400">Stage 1 · Topology &amp; Cabling</div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Identifies routers, switches, and PCs, maps interface connections, and explains IEEE 802.3 straight-through vs. crossover cabling.
                  </p>
                </div>
                <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3 space-y-1">
                  <div className="text-[11px] font-mono font-bold text-emerald-400">Stage 2 · Multi-Block VLSM</div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Parses single or semicolon-separated (<code className="text-slate-200 font-mono">;</code>) IPv4 CIDR blocks and allocates conflict-free LAN and WAN subnets.
                  </p>
                </div>
                <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3 space-y-1">
                  <div className="text-[11px] font-mono font-bold text-emerald-400">Stage 3 · Annotated IOS CLI</div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Generates copy-ready Cisco IOS scripts with line-by-line Junior Engineer explanations and an interactive Live CLI Simulator.
                  </p>
                </div>
                <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3 space-y-1">
                  <div className="text-[11px] font-mono font-bold text-emerald-400">Stage 4 · Routing &amp; Rationale</div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Explains why your topology requires Connected routes, Static routes, Router-on-a-Stick (802.1Q), or multi-router OSPF.
                  </p>
                </div>
                <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3 space-y-1">
                  <div className="text-[11px] font-mono font-bold text-emerald-400">Stage 5 · Verification Plan</div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Provides exact <code className="text-slate-200 font-mono">show</code> and <code className="text-slate-200 font-mono">ping</code> checklists plus hop-by-hop Path Tracer validation before lab deployment.
                  </p>
                </div>
              </div>
            </section>

            <ResponsibleUseCard />

            <TopologyUploader
              onAnalyze={handleAnalyzeTopology}
              isLoading={isAnalyzing}
              preloadedFile={
                droppedFile ||
                (currentReport?.uploadedFile
                  ? {
                      name: currentReport.uploadedFile.name,
                      size: currentReport.uploadedFile.size || 0,
                      mimeType: currentReport.uploadedFile.mimeType,
                      data: '',
                      previewUrl: currentReport.uploadedFile.previewUrl,
                    }
                  : null)
              }
              initialConstraints={currentReport?.constraints}
              onCancel={currentReport ? () => setIsEditingConstraints(false) : undefined}
            />

            {/* 5-Stage Explanatory Workflow Strip */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
              <h3 className="text-sm font-semibold text-slate-200">
                5-Stage CCNA Engineering Pipeline
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-xs">
                <div className="space-y-1">
                  <div className="text-emerald-400 font-mono font-semibold">01. Topology & Wiring</div>
                  <p className="text-slate-400 leading-relaxed">
                    Extracts devices, physical port designations, Packet Tracer cable pinouts, and explicit assumptions.
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="text-emerald-400 font-mono font-semibold">02. Bitwise VLSM Plan</div>
                  <p className="text-slate-400 leading-relaxed">
                    Allocates descending subnets and /30 point-to-point links with bitwise overlap verification.
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="text-emerald-400 font-mono font-semibold">03. Annotated IOS CLI</div>
                  <p className="text-slate-400 leading-relaxed">
                    Generates standalone configs with inline Junior Engineer explanations and IOS mode prompt hierarchy.
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="text-emerald-400 font-mono font-semibold">04. Design Rationale</div>
                  <p className="text-slate-400 leading-relaxed">
                    Explains mask sizing, OSPF/Static convergence mechanics, and Layer 2 threat mitigation.
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="text-emerald-400 font-mono font-semibold">05. Verification Suite</div>
                  <p className="text-slate-400 leading-relaxed">
                    Provides ready-to-paste show commands and end-to-end ICMP ping tests to validate reachability.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ======================================================== */
          /* CASE B: ACTIVE CCNA 5-STAGE ARCHITECTURE WORKSPACE      */
          /* ======================================================== */
          <div className="space-y-6">
            {/* Active Topology Header & Toolbar */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-wrap items-center justify-between gap-6">
              <div className="space-y-1.5 max-w-2xl">
                {/* Unboxed metadata with typographic separators */}
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono tabular-nums text-slate-400">
                  <span className="text-emerald-400 font-medium">
                    Root Block {currentReport.constraints?.networkBlock}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>Routing {currentReport.constraints?.routingProtocol || 'OSPF'}</span>
                  <span aria-hidden="true">·</span>
                  <span>Native VLAN {currentReport.constraints?.nativeVlan ?? 999}</span>
                  <span aria-hidden="true">·</span>
                  <span>{(currentReport.stage1_topology?.routers || []).length} Routers</span>
                  <span aria-hidden="true">·</span>
                  <span>{(currentReport.stage1_topology?.switches || []).length} Switches</span>
                  <span aria-hidden="true">·</span>
                  <span>{(currentReport.stage2_addressing?.subnetAllocations || []).length} Subnets</span>
                </div>

                <h1 className="text-lg sm:text-xl font-bold text-slate-100 tracking-tight">
                  {currentReport.title}
                </h1>
                <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
                  {currentReport.summary}
                </p>
              </div>

              {/* Workspace Action Toolbar */}
              <div className="flex flex-wrap items-center gap-2.5 text-xs">
                {currentReport.uploadedFile?.previewUrl && (
                  <button
                    type="button"
                    onClick={() => setShowOriginalDiagram(!showOriginalDiagram)}
                    className={`flex items-center gap-1.5 px-3 py-2 border rounded-lg font-medium transition cursor-pointer whitespace-nowrap shrink-0 ${
                      showOriginalDiagram
                        ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{showOriginalDiagram ? 'Hide Diagram' : 'Show Diagram'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsEditingConstraints(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-lg font-medium transition cursor-pointer whitespace-nowrap shrink-0"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Edit & Re-run</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyReport}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-lg font-medium transition cursor-pointer whitespace-nowrap shrink-0"
                >
                  {copiedReport ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedReport ? 'Copied Markdown' : 'Copy Full Report'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetToNew}
                  className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-300 border border-emerald-500/30 rounded-lg font-medium transition cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Topology</span>
                </button>
              </div>
            </div>

            {/* Optional Collapsible Original Diagram Preview */}
            {showOriginalDiagram && currentReport.uploadedFile?.previewUrl && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-300 font-medium">
                    Uploaded Topology Reference ({currentReport.uploadedFile.name})
                  </span>
                  <button
                    onClick={() => setShowOriginalDiagram(false)}
                    className="text-slate-400 hover:text-slate-200 transition cursor-pointer"
                  >
                    Hide
                  </button>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg flex items-center justify-center max-h-64 overflow-auto border border-slate-800">
                  <img
                    src={currentReport.uploadedFile.previewUrl}
                    alt="Uploaded Topology Diagram"
                    referrerPolicy="no-referrer"
                    className="max-h-56 object-contain rounded"
                  />
                </div>
              </div>
            )}

            {/* 5-Stage & Simulation Export Navigation Tabs */}
            <div className="flex border-b border-slate-800 overflow-x-auto space-x-1 font-mono text-xs">
              {[
                { id: 'stage1', label: 'Stage 1: Topology & Wiring', icon: Layers },
                { id: 'stage2', label: 'Stage 2: Addressing Table', icon: Calculator },
                { id: 'stage3', label: 'Stage 3: Cisco IOS Configs', icon: Terminal },
                { id: 'stage4', label: 'Stage 4: Design Rationale', icon: BookOpen },
                { id: 'stage5', label: 'Stage 5: Verification Commands', icon: ShieldCheck },
                { id: 'arena', label: 'CCNA Skill Arena', icon: Award },
                { id: 'simulationExport', label: 'Simulation Export', icon: Server },
                { id: 'visualizer', label: 'Interactive Visualizer', icon: Network },
                { id: 'fullReport', label: 'Full Markdown Report', icon: FileCode },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`relative flex items-center gap-2 px-4 py-3 font-medium whitespace-nowrap shrink-0 transition cursor-pointer ${
                      isActive
                        ? 'text-emerald-400 font-semibold bg-slate-900/60'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                    {isActive && (
                      <motion.div
                        layoutId="activeTabUnderline"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500"
                        transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Tab Content Display */}
            <ErrorBoundary
              fallbackTitle="Topology Stage View Notice"
              onReset={() => setActiveTab('stage1')}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-6"
                >
                  {/* Stage 1 Tab: Topology & Connection Map + Deterministic Audit & Cabling Guide */}
                  {activeTab === 'stage1' && (
                    <div className="space-y-6">
                      <NetworkAuditPanel report={currentReport} />
                      <Phase1InventoryView
                        inventory={currentReport.stage1_topology}
                        onSelectDevice={handleSelectDevice}
                        uploadedFile={currentReport.uploadedFile}
                      />
                    </div>
                  )}

                  {/* Stage 2 Tab: VLSM Addressing Table */}
                  {activeTab === 'stage2' && (
                    <Phase2AddressingView addressing={currentReport.stage2_addressing} />
                  )}

                  {/* Stage 3 Tab: Cisco IOS Configurations */}
                  {activeTab === 'stage3' && (
                    <Phase3ConfigsView
                      configs={currentReport.stage3_configs}
                      report={currentReport}
                      activeDeviceName={selectedDevice}
                      onSelectDevice={(d) => setSelectedDevice(d)}
                      onOpenSimulationExport={() => setActiveTab('simulationExport')}
                    />
                  )}

                  {/* Stage 4 Tab: Design Rationale */}
                  {activeTab === 'stage4' && (
                    <Stage4RationaleView rationale={currentReport.stage4_rationale} />
                  )}

                  {/* Stage 5 Tab: Verification Commands */}
                  {activeTab === 'stage5' && (
                    <Stage5VerificationView
                      verification={currentReport.stage5_verification}
                      report={currentReport}
                    />
                  )}

                  {/* Simulation Export Tab: Step-by-Step Guides for GNS3, EVE-NG, & Packet Tracer */}
                  {activeTab === 'simulationExport' && (
                    <SimulationExportView report={currentReport} />
                  )}

                  {/* Gamified CCNA Skill Arena Tab inside Active Topology */}
                  {activeTab === 'arena' && (
                    <CcnaTrainingArena
                      report={currentReport}
                      onJumpToStage={(stage) => setActiveTab(stage)}
                    />
                  )}

                  {/* Interactive Visualizer Tab */}
                  {activeTab === 'visualizer' && (
                    <div className="space-y-6">
                      <TopologyVisualizer
                        report={currentReport}
                        selectedDeviceName={selectedDevice}
                        onSelectDevice={handleSelectDevice}
                        onOpenUploader={() => setIsEditingConstraints(true)}
                      />
                    </div>
                  )}

                  {/* Full Report Tab */}
                  {activeTab === 'fullReport' && (
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
                      <div className="flex flex-wrap items-center justify-between pb-4 border-b border-slate-800 gap-3">
                        <div>
                          <h3 className="text-base font-bold text-slate-100">
                            Unified 5-Stage CCNA Architecture Report
                          </h3>
                          <div className="text-xs text-slate-400 mt-0.5">
                            Complete documentation compliant with CCNA 200-301 standards.
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleCopyReport}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-mono font-medium transition cursor-pointer whitespace-nowrap shrink-0"
                          >
                            {copiedReport ? (
                              <Check className="w-3.5 h-3.5" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                            <span>{copiedReport ? 'Copied Full Report!' : 'Copy Markdown'}</span>
                          </button>
                          <button
                            onClick={handleDownloadReport}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-mono font-medium transition cursor-pointer whitespace-nowrap shrink-0"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Export .md</span>
                          </button>
                        </div>
                      </div>

                      <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 overflow-auto max-h-[600px] text-xs font-mono tabular-nums text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {generateFullMarkdownReport()}
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </ErrorBoundary>
          </div>
        )}
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-4">
          <span>CCNA Topology Mentor &amp; Cisco IOS Automation Engine · CCNA 200-301 Guided Engineering Workspace</span>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setIsVlsmModalOpen(true)}
              className="hover:text-slate-300 transition cursor-pointer"
            >
              VLSM Subnet Calculator
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => setIsAdvisoryModalOpen(true)}
              className="hover:text-slate-300 transition cursor-pointer"
            >
              Responsible Use Advisory
            </button>
          </div>
        </div>
      </footer>

      {/* Standalone Interactive VLSM Modal */}
      <VlsmToolModal
        isOpen={isVlsmModalOpen}
        onClose={() => setIsVlsmModalOpen(false)}
        initialBaseBlock={currentReport?.constraints?.networkBlock || '192.168.10.0/24'}
      />

      {/* Responsible Use & Digital Trust Advisory Modal */}
      <ResponsibleUseModal
        isOpen={isAdvisoryModalOpen}
        onClose={() => setIsAdvisoryModalOpen(false)}
      />
    </div>
  );
}
