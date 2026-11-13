import React, { useState, useMemo } from 'react';
import {
  Download,
  Copy,
  Check,
  Server,
  HardDrive,
  FileCode,
  Cable,
  Laptop,
  Sliders,
} from 'lucide-react';
import { ArchitectureReport, DeviceConfig } from '../types/network';
import { generatePacketTracerCablingGuide } from '../utils/networkAuditor';
import { CiscoSyntaxHighlighter } from './CiscoSyntaxHighlighter';

interface SimulationExportViewProps {
  report: ArchitectureReport;
}

type SimulatorPlatform = 'PACKET_TRACER' | 'GNS3' | 'EVE_NG';
type InterfaceMappingProfile = 'ORIGINAL' | 'GNS3_VIOS' | 'EVE_IOL';

// Translate Cisco interface designations if user selects a virtual appliance profile (vIOS or IOL)
function remapConfigInterfaces(
  rawConfig: string,
  profile: InterfaceMappingProfile,
  deviceType: 'router' | 'switch' | 'l3switch'
): string {
  if (profile === 'ORIGINAL') return rawConfig;

  let transformed = rawConfig;

  if (profile === 'GNS3_VIOS') {
    // Convert ISR 3-tier GigabitEthernet0/0/X -> GigabitEthernet0/X for Cisco IOSv / IOSvL2
    transformed = transformed.replace(
      /\b(GigabitEthernet|Gi)\s*0\/0\/(\d+)/gi,
      'GigabitEthernet0/$2'
    );
    if (deviceType === 'switch' || deviceType === 'l3switch') {
      // Map FastEthernet0/1..4 -> GigabitEthernet0/1..3,1/0..3 on IOSvL2
      transformed = transformed.replace(
        /\b(FastEthernet|Fa)\s*0\/(\d+)/gi,
        (_match, _prefix, portStr) => {
          const p = parseInt(portStr, 10);
          const slot = Math.floor(p / 4);
          const port = p % 4;
          return `GigabitEthernet${slot}/${port}`;
        }
      );
    }
  } else if (profile === 'EVE_IOL') {
    // Convert GigabitEthernet0/0/X or Gi0/X or Fa0/X to IOL EthernetX/Y format
    transformed = transformed.replace(
      /\b(GigabitEthernet|FastEthernet|Gi|Fa)\s*0\/(?:0\/)?(\d+)/gi,
      (_match, _prefix, portStr) => {
        const p = parseInt(portStr, 10);
        const slot = Math.floor(p / 4);
        const port = p % 4;
        return `Ethernet${slot}/${port}`;
      }
    );
  }

  return transformed;
}

// Wrap a device config in a clean simulator-ready paste block
function buildSimulatorPasteBlock(
  cfg: DeviceConfig,
  platform: SimulatorPlatform,
  profile: InterfaceMappingProfile
): string {
  const mappedBody = remapConfigInterfaces(cfg.fullConfig || '', profile, cfg.deviceType);
  const lines = mappedBody.trim().split('\n');
  const firstNonComment = lines.find((l) => l.trim() && !l.trim().startsWith('!'))?.toLowerCase() || '';

  const needsEnableWrapper =
    !firstNonComment.startsWith('enable') && !firstNonComment.startsWith('configure terminal');

  const headerComment =
    platform === 'PACKET_TRACER'
      ? `! ===================================================================\n! CISCO PACKET TRACER CLI PASTE SCRIPT: ${cfg.deviceName}\n! Target Role: ${cfg.role || cfg.deviceType.toUpperCase()}\n! Instructions: Open ${cfg.deviceName} -> CLI Tab -> Paste Entire Block\n! ===================================================================`
      : platform === 'GNS3'
      ? `! ===================================================================\n! GNS3 STARTUP-CONFIG / CONSOLE SCRIPT: ${cfg.deviceName}\n! Interface Profile: ${profile === 'GNS3_VIOS' ? 'Cisco vIOS / IOSvL2' : profile === 'EVE_IOL' ? 'Cisco IOU / IOL' : 'Diagram Native'}\n! ===================================================================`
      : `! ===================================================================\n! EVE-NG STARTUP-CONFIG / UNL SCRIPT: ${cfg.deviceName}\n! Interface Profile: ${profile === 'EVE_IOL' ? 'Cisco IOL (EthernetX/Y)' : profile === 'GNS3_VIOS' ? 'Cisco vIOS (Gi0/X)' : 'Diagram Native'}\n! ===================================================================`;

  const prefixCommands = needsEnableWrapper
    ? `enable\nconfigure terminal\nno ip domain-lookup\n`
    : '';

  const hasEnd = mappedBody.toLowerCase().includes('\nend') || mappedBody.toLowerCase().endsWith('end');
  const hasWrite =
    mappedBody.toLowerCase().includes('write memory') ||
    mappedBody.toLowerCase().includes('copy running-config startup-config');

  let suffixCommands = '';
  if (!hasEnd) suffixCommands += '\nend';
  if (!hasWrite) suffixCommands += '\nwrite memory';

  return `${headerComment}\n${prefixCommands}${mappedBody.trim()}${suffixCommands}\n`;
}

export const SimulationExportView: React.FC<SimulationExportViewProps> = ({ report }) => {
  const [platform, setPlatform] = useState<SimulatorPlatform>('PACKET_TRACER');
  const [mappingProfile, setMappingProfile] = useState<InterfaceMappingProfile>('ORIGINAL');
  const [selectedDeviceIdx, setSelectedDeviceIdx] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const configs = Array.isArray(report.stage3_configs) ? report.stage3_configs : [];
  const routers = Array.isArray(report.stage1_topology?.routers) ? report.stage1_topology.routers : [];
  const switches = Array.isArray(report.stage1_topology?.switches) ? report.stage1_topology.switches : [];
  const endpoints = Array.isArray(report.stage1_topology?.endpoints) ? report.stage1_topology.endpoints : [];
  const addressingTable = Array.isArray(report.stage2_addressing?.addressingTable)
    ? report.stage2_addressing.addressingTable
    : [];

  const cablingGuide = useMemo(() => generatePacketTracerCablingGuide(report), [report]);

  const activeConfig = configs[selectedDeviceIdx] || configs[0] || null;

  const activeSimulatorScript = useMemo(() => {
    if (!activeConfig) return '! No device configuration available.';
    return buildSimulatorPasteBlock(activeConfig, platform, mappingProfile);
  }, [activeConfig, platform, mappingProfile]);

  // Generate VPCS (Virtual PC Simulator) commands for GNS3 and EVE-NG endpoints
  const vpcsCommands = useMemo(() => {
    if (endpoints.length === 0) return [];
    return endpoints.map((ep) => {
      const ip = ep.assignedIp || '192.168.10.10';
      const gw = ep.defaultGateway || '192.168.10.1';
      // Match subnet mask or prefix from Stage 2 addressing table
      const matchingRow = addressingTable.find(
        (r) =>
          r.device?.toLowerCase() === ep.name?.toLowerCase() ||
          (r.defaultGateway && r.defaultGateway === gw)
      );
      const mask = matchingRow?.subnetMask || '255.255.255.0';
      const prefix = matchingRow?.prefix || 24;

      return {
        name: ep.name,
        vlan: ep.vlan || 'Access VLAN',
        ip,
        mask,
        prefix,
        gateway: gw,
        vpcsCli: `set pcname ${ep.name}\nip ${ip} ${mask} ${gw}\nsave`,
      };
    });
  }, [endpoints, addressingTable]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadAllBundle = () => {
    const simName =
      platform === 'PACKET_TRACER'
        ? 'Cisco-Packet-Tracer'
        : platform === 'GNS3'
        ? 'GNS3'
        : 'EVE-NG';

    let bundle = `! =====================================================================\n`;
    bundle += `! ${simName.toUpperCase()} COMPLETE SIMULATION CONFIG BUNDLE\n`;
    bundle += `! Topology: ${report.title}\n`;
    bundle += `! Base Network Block: ${report.stage2_addressing?.networkBlock}\n`;
    bundle += `! Generated Timestamp: ${new Date().toISOString()}\n`;
    bundle += `! =====================================================================\n\n`;

    configs.forEach((cfg) => {
      bundle += buildSimulatorPasteBlock(cfg, platform, mappingProfile) + '\n\n';
    });

    if (vpcsCommands.length > 0) {
      bundle += `! =====================================================================\n`;
      bundle += `! ENDPOINT HOST / VPCS CONFIGURATION COMMANDS\n`;
      bundle += `! =====================================================================\n\n`;
      vpcsCommands.forEach((v) => {
        bundle += `# Host: ${v.name} (${v.vlan})\n${v.vpcsCli}\n\n`;
      });
    }

    handleDownloadFile(`${simName}-Bundle-${report.id}.cfg`, bundle);
  };

  const generateSimulatorMarkdownGuide = () => {
    const simTitle =
      platform === 'PACKET_TRACER'
        ? 'Cisco Packet Tracer'
        : platform === 'GNS3'
        ? 'GNS3 (vIOS / Dynamips)'
        : 'EVE-NG (IOL / QEMU)';

    let md = `# ${simTitle} — Step-by-Step Deployment & Config Import Playbook\n\n`;
    md += `**Topology:** ${report.title}\n`;
    md += `**Base Network Block:** \`${report.stage2_addressing?.networkBlock}\`\n`;
    md += `**Interface Naming Profile:** \`${mappingProfile}\`\n\n`;

    md += `---\n## 1. Step-by-Step Import Instructions (${simTitle})\n\n`;
    if (platform === 'PACKET_TRACER') {
      md += `1. **Place Hardware Nodes:** Drag ${routers.length} Router(s) (ISR 4321 or 2911), ${switches.length} Switch(es) (Catalyst 2960 or 3650), and ${endpoints.length} PC/Server endpoint(s) onto the Logical Workspace.\n`;
      md += `2. **Enable Port Labels:** Go to \`Options > Preferences\` and check **Always Show Port Labels in Logical Workspace**.\n`;
      md += `3. **Wire Physical Interfaces:** Connect each device port exactly as specified in Section 2 below.\n`;
      md += `4. **Method A — Direct CLI Tab Paste (Fastest):** Click a router/switch, open the **CLI** tab, type \`no\` if prompted by the initial configuration dialog, and paste the device's script from Section 3.\n`;
      md += `5. **Method B — NVRAM Startup-Config Load:** Save each device block as a \`.cfg\` file, open the device's **Config** tab > **Global Settings**, click **Load** next to Startup Config, and power-cycle the node.\n`;
      md += `6. **Configure PC Endpoints:** Open each PC > **Desktop > IP Configuration**, select **Static**, and enter the IP, Mask, and Default Gateway from Section 4.\n\n`;
    } else if (platform === 'GNS3') {
      md += `1. **Select Appliance & Interface Mapping:** When using Cisco IOSv / IOSvL2 appliances, set the Interface Profile to \`GNS3_VIOS\` so 3-tier ISR ports (\`Gi0/0/0\`) translate to \`Gi0/0\`.\n`;
      md += `2. **Method A — Pre-Boot Edit Config Injection:** While nodes are stopped in GNS3, right-click each router/switch, click **Edit config**, paste the startup-config block, click **Save**, and start the node.\n`;
      md += `3. **Method B — Live Console Paste (Solar-PuTTY / SuperPutty):** Boot all nodes, open the console terminal, wait for the \`Router#\` prompt, and paste the complete script. It automatically executes \`end\` and \`write memory\`.\n`;
      md += `4. **Configure VPCS Endpoints:** Open each VPCS console and paste the \`ip <address> <mask> <gateway>\` and \`save\` commands from Section 4.\n\n`;
    } else {
      md += `1. **Match EVE-NG Image Naming:** When using Cisco IOL / IOU images, set the Interface Profile to \`EVE_IOL\` so ports automatically map to \`EthernetX/Y\` bay/port notation.\n`;
      md += `2. **Method A — EVE-NG Startup-Configs Sidebar:** Open **Startup-configs** in the left sidebar, select each node, paste its configuration block, click **Save**, toggle the startup switch to **ON**, and run **More Actions > Wipe All** before booting.\n`;
      md += `3. **Method B — HTML5 / Telnet Console Paste:** Start the nodes, open each console session, and paste the script directly into the terminal.\n`;
      md += `4. **Configure VPCS Nodes:** Open each VPCS terminal and paste the host IP command block from Section 4.\n\n`;
    }

    if (cablingGuide.length > 0) {
      md += `---\n## 2. Simulator Canvas Wiring Checklist\n\n`;
      md += `| Node A | Interface A | Node B | Interface B | Media Type |\n`;
      md += `| :--- | :--- | :--- | :--- | :--- |\n`;
      cablingGuide.forEach((row) => {
        const portA = remapConfigInterfaces(row.fromPort, mappingProfile, 'router');
        const portB = remapConfigInterfaces(row.toPort, mappingProfile, 'switch');
        md += `| ${row.fromDevice} | \`${portA}\` | ${row.toDevice} | \`${portB}\` | ${row.cableType} |\n`;
      });
      md += `\n`;
    }

    md += `---\n## 3. Simulator-Ready Cisco IOS Configurations\n\n`;
    configs.forEach((cfg) => {
      md += `### Device: \`${cfg.deviceName}\` (${cfg.role || cfg.deviceType})\n`;
      md += `\`\`\`cisco\n${buildSimulatorPasteBlock(cfg, platform, mappingProfile)}\`\`\`\n\n`;
    });

    if (vpcsCommands.length > 0) {
      md += `---\n## 4. Endpoint Host & VPCS Configuration Scripts\n\n`;
      vpcsCommands.forEach((v) => {
        md += `### Endpoint: \`${v.name}\` (${v.vlan})\n`;
        md += `- **IPv4 Address:** \`${v.ip}\`\n- **Subnet Mask:** \`${v.mask}\`\n- **Default Gateway:** \`${v.gateway}\`\n`;
        md += `\`\`\`bash\n${v.vpcsCli}\n\`\`\`\n\n`;
      });
    }

    return md;
  };

  // Switch platform handler with sensible default interface mapping profile
  const handleSelectPlatform = (target: SimulatorPlatform) => {
    setPlatform(target);
    if (target === 'PACKET_TRACER') {
      setMappingProfile('ORIGINAL');
    } else if (target === 'GNS3') {
      setMappingProfile('GNS3_VIOS');
    } else if (target === 'EVE_NG') {
      setMappingProfile('EVE_IOL');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Simulator Selector Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <h3 className="text-base font-semibold text-slate-100">
              Network Simulator Export & Step-by-Step Deployment Guide
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Select your target simulation environment (Cisco Packet Tracer, GNS3, or EVE-NG) for step-by-step config import instructions, automatic virtual appliance interface remapping, VPCS host scripts, and startup-config files.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                const simSlug =
                  platform === 'PACKET_TRACER'
                    ? 'Packet-Tracer'
                    : platform === 'GNS3'
                    ? 'GNS3'
                    : 'EVE-NG';
                handleDownloadFile(
                  `${simSlug}-StepByStep-Playbook-${report.id}.md`,
                  generateSimulatorMarkdownGuide()
                );
              }}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap shrink-0"
            >
              <FileCode className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export Step-by-Step Guide (.md)</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadAllBundle}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>
                Download All {platform === 'PACKET_TRACER' ? 'Packet Tracer' : platform === 'GNS3' ? 'GNS3' : 'EVE-NG'} Configs (.cfg)
              </span>
            </button>
          </div>
        </div>

        {/* Platform Selector & Interface Translation Bar */}
        <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
          {/* Segmented Simulator Selector */}
          <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg">
            {[
              { id: 'PACKET_TRACER', label: 'Cisco Packet Tracer', icon: Laptop },
              { id: 'GNS3', label: 'GNS3 (vIOS / Dynamips)', icon: Server },
              { id: 'EVE_NG', label: 'EVE-NG (IOL / QEMU)', icon: HardDrive },
            ].map((sim) => {
              const Icon = sim.icon;
              const active = platform === sim.id;
              return (
                <button
                  key={sim.id}
                  type="button"
                  onClick={() => handleSelectPlatform(sim.id as SimulatorPlatform)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-medium transition cursor-pointer whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-emerald-600 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{sim.label}</span>
                </button>
              );
            })}
          </div>

          {/* Appliance Interface Remapper Control */}
          <div className="flex items-center gap-2.5 text-xs">
            <span className="text-slate-400 flex items-center gap-1.5 whitespace-nowrap">
              <Sliders className="w-3.5 h-3.5 text-emerald-400" />
              <span>Interface Naming Profile:</span>
            </span>
            <select
              value={mappingProfile}
              onChange={(e) => setMappingProfile(e.target.value as InterfaceMappingProfile)}
              className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="ORIGINAL">Diagram Native (Gi0/0/0, Fa0/1)</option>
              <option value="GNS3_VIOS">Cisco vIOS / IOSvL2 (Gi0/0, Gi0/1)</option>
              <option value="EVE_IOL">Cisco IOL / IOU (Ethernet0/0, Et0/1)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Step-by-Step Simulator Import Guide */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Step-by-Step Workflow for Selected Simulator (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h4 className="text-sm font-semibold text-slate-100">
                {platform === 'PACKET_TRACER'
                  ? 'Cisco Packet Tracer Import Steps'
                  : platform === 'GNS3'
                  ? 'GNS3 Project & Startup-Config Import Steps'
                  : 'EVE-NG Lab & Startup-Config Import Steps'}
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Follow these steps in order to deploy all {configs.length} devices without CLI syntax errors
              </p>
            </div>

            {platform === 'PACKET_TRACER' && (
              <ol className="space-y-4 text-xs text-slate-300">
                <li className="space-y-1">
                  <div className="font-semibold text-slate-100 font-mono">
                    01. Place Hardware Nodes on Workspace
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    Add <span className="text-slate-200 font-mono tabular-nums">{routers.length}</span> router(s) (Cisco ISR 4321 or 2911),{' '}
                    <span className="text-slate-200 font-mono tabular-nums">{switches.length}</span> switch(es) (Catalyst 2960 or 3650), and{' '}
                    <span className="text-slate-200 font-mono tabular-nums">{endpoints.length}</span> endpoint PC(s)/Server(s).
                  </p>
                </li>

                <li className="space-y-1">
                  <div className="font-semibold text-slate-100 font-mono">
                    02. Wire Exact Physical Interfaces
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    In <span className="text-slate-200">Options &gt; Preferences</span>, enable{' '}
                    <span className="text-emerald-400 font-mono">Always Show Port Labels in Logical Workspace</span>.
                    Connect each cable to the exact port numbers listed in the Cabling Checklist on the right.
                  </p>
                </li>

                <li className="space-y-1">
                  <div className="font-semibold text-slate-100 font-mono">
                    03. Method A: Direct CLI Tab Paste (Fastest)
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    Click a device, open the <span className="text-slate-200 font-mono">CLI</span> tab. If prompted{' '}
                    <code className="text-amber-300">Would you like to enter the initial configuration dialog? [yes/no]:</code>, type{' '}
                    <code className="text-emerald-400">no</code> and press Enter. Click <span className="text-slate-200">Copy Simulator Script</span> on the right and click{' '}
                    <span className="text-slate-200 font-mono">Paste</span> in the Packet Tracer terminal.
                  </p>
                </li>

                <li className="space-y-1">
                  <div className="font-semibold text-slate-100 font-mono">
                    04. Method B: NVRAM Startup-Config File Load
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    Download the individual <code className="text-cyan-300">.cfg</code> file for the device. In Packet Tracer, open the device&apos;s{' '}
                    <span className="text-slate-200 font-mono">Config</span> tab &gt; <span className="text-slate-200">Global Settings</span>, click{' '}
                    <span className="text-emerald-400 font-mono">Load</span> next to Startup Config, select the downloaded{' '}
                    <code className="text-cyan-300">.cfg</code> file, and reboot the device.
                  </p>
                </li>

                <li className="space-y-1">
                  <div className="font-semibold text-slate-100 font-mono">
                    05. Configure PC Desktop IPv4 Settings
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    Open each PC &gt; <span className="text-slate-200 font-mono">Desktop &gt; IP Configuration</span>, select{' '}
                    <span className="text-slate-200">Static</span>, and enter the IPv4 Address, Subnet Mask, and Default Gateway from the Endpoint table below.
                  </p>
                </li>
              </ol>
            )}

            {platform === 'GNS3' && (
              <ol className="space-y-4 text-xs text-slate-300">
                <li className="space-y-1">
                  <div className="font-semibold text-slate-100 font-mono">
                    01. Select GNS3 Appliance & Interface Profile
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    When deploying <span className="text-slate-200 font-mono">Cisco IOSv / IOSvL2</span> QEMU appliances, the{' '}
                    <code className="text-emerald-300">Cisco vIOS (Gi0/0, Gi0/1)</code> profile is automatically selected so 3-tier ISR interfaces (<code className="text-slate-300">Gi0/0/0</code>) remap cleanly to <code className="text-emerald-300">Gi0/0</code>.
                  </p>
                </li>

                <li className="space-y-1">
                  <div className="font-semibold text-slate-100 font-mono">
                    02. Method A: GNS3 Edit Config (Pre-Boot Injection)
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    Before starting the nodes (or while stopped), right-click the router/switch in GNS3 and select{' '}
                    <span className="text-emerald-400 font-mono">Edit config</span>. Paste the generated script into the startup-config editor, click Save, and start the node.
                  </p>
                </li>

                <li className="space-y-1">
                  <div className="font-semibold text-slate-100 font-mono">
                    03. Method B: Solar-PuTTY / SuperPutty Console Paste
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    Start all nodes and open the console terminal. Once the device reaches the <code className="text-slate-200">Router#</code> prompt, right-click to paste the full script. The script includes <code className="text-emerald-400">end</code> and <code className="text-emerald-400">write memory</code> to persist to NVRAM.
                  </p>
                </li>

                <li className="space-y-1">
                  <div className="font-semibold text-slate-100 font-mono">
                    04. Import Startup-Config File from Disk
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    Alternatively, click <span className="text-slate-200 font-mono">Download .cfg</span> on the right, then in GNS3 right-click the stopped node &gt;{' '}
                    <span className="text-emerald-400 font-mono">Import config</span> and select the downloaded <code className="text-cyan-300">.cfg</code> file.
                  </p>
                </li>

                <li className="space-y-1">
                  <div className="font-semibold text-slate-100 font-mono">
                    05. Configure VPCS Endpoints
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    Open the console for each <span className="text-slate-200 font-mono">VPCS</span> node and paste the generated{' '}
                    <code className="text-cyan-300">ip &lt;address&gt; &lt;mask&gt; &lt;gateway&gt;</code> and <code className="text-cyan-300">save</code> commands from the Endpoint VPCS section below.
                  </p>
                </li>
              </ol>
            )}

            {platform === 'EVE_NG' && (
              <ol className="space-y-4 text-xs text-slate-300">
                <li className="space-y-1">
                  <div className="font-semibold text-slate-100 font-mono">
                    01. Match EVE-NG Image Interface Naming
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    When deploying <span className="text-slate-200 font-mono">Cisco IOL / IOU</span> images in EVE-NG, the{' '}
                    <code className="text-emerald-300">Cisco IOL / IOU (Ethernet0/0)</code> profile is automatically active to translate Gigabit/FastEthernet ports into modular <code className="text-emerald-300">EthernetX/Y</code> bay notation.
                  </p>
                </li>

                <li className="space-y-1">
                  <div className="font-semibold text-slate-100 font-mono">
                    02. Method A: EVE-NG Startup-Configs Sidebar
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    In the EVE-NG left-hand toolbar, click <span className="text-emerald-400 font-mono">Startup-configs</span>. Select the target node, paste the Cisco IOS configuration block, click <span className="text-slate-200">Save</span>, toggle the node startup switch to <span className="text-emerald-400">ON</span>, and select <span className="text-slate-200">More Actions &gt; Wipe All</span> before starting.
                  </p>
                </li>

                <li className="space-y-1">
                  <div className="font-semibold text-slate-100 font-mono">
                    03. Method B: HTML5 / Telnet Console Paste
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    Boot the nodes, click each node to open the HTML5 or native Telnet console, and paste the generated configuration script directly into the terminal.
                  </p>
                </li>

                <li className="space-y-1">
                  <div className="font-semibold text-slate-100 font-mono">
                    04. Configure EVE-NG VPCS Nodes
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    Open each VPCS terminal and paste the generated <code className="text-cyan-300">ip &lt;address&gt; &lt;mask&gt; &lt;gateway&gt;</code> command block below.
                  </p>
                </li>
              </ol>
            )}
          </div>

          {/* Endpoint / VPCS Quick-Config Card */}
          {vpcsCommands.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h4 className="text-sm font-semibold text-slate-100">
                    Endpoint IPv4 & VPCS Scripts
                  </h4>
                  <p className="text-xs text-slate-400">
                    Host IP assignments for Packet Tracer Desktop or GNS3/EVE-NG VPCS
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleCopy(
                      vpcsCommands.map((v) => `# ${v.name}\n${v.vpcsCli}`).join('\n\n'),
                      'vpcs-all'
                    )
                  }
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-mono transition cursor-pointer whitespace-nowrap shrink-0"
                >
                  {copiedId === 'vpcs-all' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedId === 'vpcs-all' ? 'Copied VPCS' : 'Copy All VPCS'}</span>
                </button>
              </div>

              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {vpcsCommands.map((vpcs, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1.5 font-mono text-xs tabular-nums"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-slate-100 font-semibold">{vpcs.name}</span>
                      <span className="text-slate-400 text-[11px]">{vpcs.vlan}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex flex-wrap gap-x-3 gap-y-1">
                      <span>
                        IP: <strong className="text-emerald-400">{vpcs.ip}</strong>
                      </span>
                      <span>
                        Mask: <strong className="text-slate-300">{vpcs.mask}</strong>
                      </span>
                      <span>
                        GW: <strong className="text-cyan-400">{vpcs.gateway}</strong>
                      </span>
                    </div>
                    {platform !== 'PACKET_TRACER' && (
                      <div className="pt-1.5 mt-1.5 border-t border-slate-800/80 flex items-center justify-between gap-2">
                        <code className="text-[11px] text-amber-300 truncate">
                          ip {vpcs.ip} {vpcs.mask} {vpcs.gateway}
                        </code>
                        <button
                          type="button"
                          onClick={() => handleCopy(vpcs.vpcsCli, `vpcs-${idx}`)}
                          className="text-[11px] text-slate-400 hover:text-slate-200 shrink-0 cursor-pointer"
                        >
                          {copiedId === `vpcs-${idx}` ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Simulator-Ready Device Config Viewer & Downloader (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            {/* Device Selector & Single-Device Export Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-1.5 flex-wrap">
                {configs.map((cfg, idx) => {
                  const isSelected = idx === selectedDeviceIdx;
                  return (
                    <button
                      key={cfg.deviceName || idx}
                      type="button"
                      onClick={() => setSelectedDeviceIdx(idx)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono transition cursor-pointer whitespace-nowrap shrink-0 ${
                        isSelected
                          ? 'bg-emerald-600 text-white font-semibold'
                          : 'bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {cfg.deviceName}
                    </button>
                  );
                })}
              </div>

              {activeConfig && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopy(activeSimulatorScript, 'active-sim-script')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-lg text-xs font-mono transition cursor-pointer whitespace-nowrap shrink-0"
                  >
                    {copiedId === 'active-sim-script' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {copiedId === 'active-sim-script' ? 'Copied Paste Script!' : 'Copy Simulator Script'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleDownloadFile(
                        `${activeConfig.deviceName}-${platform.toLowerCase()}-startup.cfg`,
                        activeSimulatorScript
                      )
                    }
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-emerald-400 border border-slate-800 rounded-lg text-xs font-mono transition cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .cfg</span>
                  </button>
                </div>
              )}
            </div>

            {/* Simulator Script Preview with Syntax Highlighting */}
            <CiscoSyntaxHighlighter code={activeSimulatorScript} maxHeight="480px" />
          </div>

          {/* Quick Cabling & Port Reference for Building the Simulator Canvas */}
          {cablingGuide.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                  <Cable className="w-4 h-4 text-emerald-400" />
                  <span>Simulator Canvas Wiring Checklist ({cablingGuide.length} Links)</span>
                </div>
                <span className="text-xs font-mono text-slate-400">
                  Profile: {mappingProfile === 'ORIGINAL' ? 'Native' : mappingProfile === 'GNS3_VIOS' ? 'vIOS Gi0/X' : 'IOL EtX/Y'}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-mono tabular-nums">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400">
                      <th className="py-2 px-4 font-medium">Node A</th>
                      <th className="py-2 px-4 font-medium">Interface A</th>
                      <th className="py-2 px-4 font-medium">Node B</th>
                      <th className="py-2 px-4 font-medium">Interface B</th>
                      <th className="py-2 px-4 font-medium">Media Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {cablingGuide.map((row) => (
                      <tr key={row.linkId} className="hover:bg-slate-950/40">
                        <td className="py-2 px-4 text-slate-200">{row.fromDevice}</td>
                        <td className="py-2 px-4 text-emerald-400">
                          {remapConfigInterfaces(row.fromPort, mappingProfile, 'router')}
                        </td>
                        <td className="py-2 px-4 text-slate-200">{row.toDevice}</td>
                        <td className="py-2 px-4 text-cyan-400">
                          {remapConfigInterfaces(row.toPort, mappingProfile, 'switch')}
                        </td>
                        <td className="py-2 px-4 text-slate-300 font-sans">{row.cableType}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
