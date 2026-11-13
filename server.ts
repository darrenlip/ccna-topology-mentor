import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type, Schema, ThinkingLevel } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Shared Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Structured Response Schema for guaranteed valid JSON output
const CCNA_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    stage1_topology: {
      type: Type.OBJECT,
      properties: {
        summary: { type: Type.STRING },
        routers: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              model: { type: Type.STRING },
              role: { type: Type.STRING },
              interfaces: { type: Type.ARRAY, items: { type: Type.STRING } },
              notes: { type: Type.STRING },
            },
            required: ['name', 'role'],
          },
        },
        switches: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              model: { type: Type.STRING },
              role: { type: Type.STRING },
              ports: { type: Type.ARRAY, items: { type: Type.STRING } },
              notes: { type: Type.STRING },
            },
            required: ['name', 'role'],
          },
        },
        endpoints: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              type: { type: Type.STRING },
              vlan: { type: Type.STRING },
              assignedIp: { type: Type.STRING },
              defaultGateway: { type: Type.STRING },
            },
            required: ['name', 'type'],
          },
        },
        connections: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              fromDevice: { type: Type.STRING },
              fromInterface: { type: Type.STRING },
              toDevice: { type: Type.STRING },
              toInterface: { type: Type.STRING },
              linkType: { type: Type.STRING },
              vlan: { type: Type.STRING },
              notes: { type: Type.STRING },
            },
            required: ['fromDevice', 'fromInterface', 'toDevice', 'toInterface', 'linkType'],
          },
        },
        assumptions: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
      required: ['summary', 'routers', 'switches', 'endpoints', 'connections', 'assumptions'],
    },
    stage2_addressing: {
      type: Type.OBJECT,
      properties: {
        networkBlock: { type: Type.STRING },
        vlsmRationale: { type: Type.STRING },
        subnetAllocations: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              vlanId: { type: Type.INTEGER },
              hostsNeeded: { type: Type.INTEGER },
              hostsAllocated: { type: Type.INTEGER },
              networkAddress: { type: Type.STRING },
              prefix: { type: Type.INTEGER },
              subnetMask: { type: Type.STRING },
              wildcardMask: { type: Type.STRING },
              usableRange: { type: Type.STRING },
              broadcastAddress: { type: Type.STRING },
            },
            required: [
              'name',
              'hostsNeeded',
              'hostsAllocated',
              'networkAddress',
              'prefix',
              'subnetMask',
              'usableRange',
              'broadcastAddress',
            ],
          },
        },
        addressingTable: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              device: { type: Type.STRING },
              interface: { type: Type.STRING },
              vlanPurpose: { type: Type.STRING },
              ipAddress: { type: Type.STRING },
              subnetMask: { type: Type.STRING },
              prefix: { type: Type.INTEGER },
              usableRange: { type: Type.STRING },
              defaultGateway: { type: Type.STRING },
            },
            required: [
              'device',
              'interface',
              'vlanPurpose',
              'ipAddress',
              'subnetMask',
              'usableRange',
              'defaultGateway',
            ],
          },
        },
      },
      required: ['networkBlock', 'vlsmRationale', 'subnetAllocations', 'addressingTable'],
    },
    stage3_configs: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          deviceName: { type: Type.STRING },
          deviceType: { type: Type.STRING },
          role: { type: Type.STRING },
          fullConfig: { type: Type.STRING },
        },
        required: ['deviceName', 'deviceType', 'role', 'fullConfig'],
      },
    },
    stage4_rationale: {
      type: Type.OBJECT,
      properties: {
        subnetAllocationRationale: { type: Type.STRING },
        routingChoiceRationale: { type: Type.STRING },
        securityFeaturesRationale: { type: Type.STRING },
      },
      required: [
        'subnetAllocationRationale',
        'routingChoiceRationale',
        'securityFeaturesRationale',
      ],
    },
    stage5_verification: {
      type: Type.OBJECT,
      properties: {
        layer2Commands: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              device: { type: Type.STRING },
              command: { type: Type.STRING },
              purpose: { type: Type.STRING },
              expectedOutput: { type: Type.STRING },
            },
            required: ['device', 'command', 'purpose', 'expectedOutput'],
          },
        },
        layer3RoutingCommands: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              device: { type: Type.STRING },
              command: { type: Type.STRING },
              purpose: { type: Type.STRING },
              expectedOutput: { type: Type.STRING },
            },
            required: ['device', 'command', 'purpose', 'expectedOutput'],
          },
        },
        pingTests: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              fromDevice: { type: Type.STRING },
              targetIp: { type: Type.STRING },
              targetDescription: { type: Type.STRING },
              purpose: { type: Type.STRING },
              expectedOutput: { type: Type.STRING },
            },
            required: [
              'fromDevice',
              'targetIp',
              'targetDescription',
              'purpose',
              'expectedOutput',
            ],
          },
        },
        checklist: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              step: { type: Type.INTEGER },
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              commands: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ['step', 'title', 'description', 'commands'],
          },
        },
      },
      required: ['layer2Commands', 'layer3RoutingCommands', 'pingTests', 'checklist'],
    },
  },
  required: [
    'summary',
    'stage1_topology',
    'stage2_addressing',
    'stage3_configs',
    'stage4_rationale',
    'stage5_verification',
  ],
};

// System prompt enforcing strict 5-STAGE CCNA Network Architect & Cisco IOS CLI Engineer standards
const CCNA_5STAGE_SYSTEM_PROMPT = `You are an expert CCNA Network Architect and Cisco IOS CLI Engineer.
When the user uploads a network topology (image or PDF) and specifies one or multiple IPv4 address blocks (separated by a semicolon ";"), along with the network scenario and design intentions in plain text, your job is to analyze the EXACT uploaded topology and scenario, map each IPv4 block to its intended network segment or interface, calculate a clean addressing/VLSM plan only as required by the scenario, generate accurate CCNA configurations, and explain your design rationale.

CRITICAL RULE — ZERO UNREQUESTED VLANs OR PRESETS:
- NEVER invent arbitrary department VLANs (such as "Sales", "Engineering", "Servers", "Native_Mgmt", VLAN 10, VLAN 20, VLAN 30, or VLAN 999) if neither the uploaded topology diagram nor the user's scenario description mentions VLANs!
- If the diagram and scenario do NOT mention VLANs:
  * Treat each LAN switch segment as a standard flat Layer 2 broadcast domain (default VLAN 1).
  * Configure IP addresses directly on physical router interfaces (e.g., interface GigabitEthernet0/0, interface GigabitEthernet0/0/0, interface Serial0/0/0) — do NOT configure 802.1Q subinterfaces (Router-on-a-Stick) or switch 802.1Q trunks unless VLANs are actually present in the diagram or requested in the scenario.
  * Allocate the user's ";"-separated IPv4 blocks (e.g., "192.168.1.0/24; 192.168.0.0/30") directly to the LAN segment(s) and inter-router WAN link(s) shown in the topology and described in the scenario. Only subdivide a block with VLSM if multiple subnets/LANs need to share that single block or if the scenario specifies host counts per subnet.
- Only configure VLANs, 802.1Q trunks, Native VLANs, or Router-on-a-Stick subinterfaces when VLANs are explicitly depicted in the diagram or requested in the user's scenario/constraints.

Follow this strict 5-stage response format:

---
### STAGE 1: TOPOLOGY ANALYSIS & CONNECTION MAP
- Identify all devices visible in the diagram or described in the scenario (Routers, Switches, PCs, Servers).
- Map out all physical links and port designations (e.g., R1 G0/0 <--> S1 G0/1, R1 S0/0/0 <--> R2 S0/0/0).
- Use "Routed" or "Access" for standard physical router-to-switch or switch-to-PC links when no VLAN trunking is used. Only use "Trunk" if 802.1Q VLAN trunking is explicitly required.
- If any interface label is obscured or unreadable, explicitly state the assumption you are making in the "assumptions" array.

---
### STAGE 2: VLSM ADDRESSING TABLE & MULTI-BLOCK MAPPING
- Read all user-provided IPv4 address blocks separated by ";" (e.g., "192.168.1.0/24; 192.168.0.0/30").
- Carefully interpret the "Network Scenario & Design Intentions" text and topology diagram to identify which IPv4 block belongs to which LAN segment, router interface, or point-to-point WAN link.
- If a block is already sized for its target link/segment (e.g., a /30 for a point-to-point router link and a /24 for a single LAN, or specific host requirements stated in the scenario), assign it directly or apply VLSM strictly according to the scenario's host requirements. Do NOT slice a LAN block into fake department VLANs!
- Set "networkBlock" in stage2_addressing to the full ";"-separated list of base CIDR blocks used.
- Present the plan with the exact columns:
  | Device | Interface / Subinterface | VLAN / Purpose | IP Address | Subnet Mask | Usable Range | Default Gateway |

---
### STAGE 3: CISCO IOS CONFIGURATIONS
Generate complete, standalone CLI blocks for every router and switch in "fullConfig". Group commands logically with ! section headers and end each configuration block with 'end' and 'write memory'.

Include CCNA-level security baselines for ALL devices:
1. Hostname configuration matching the exact diagram device name.
2. Enable secret encryption (enable secret ...) and service password encryption (service password-encryption).
3. Console and VTY hardening:
   - username admin privilege 15 secret ...
   - ip domain-name ... and crypto key generate rsa modulus 2048
   - line con 0 -> login local, logging synchronous, exec-timeout 5 0
   - line vty 0 4 -> transport input ssh, login local, exec-timeout 5 0
4. Security Banner (banner motd # Authorized Access Only! #).

Include Layer 2 / Layer 3 configurations tailored to the exact topology:
- Switches:
  * If NO VLANs are requested: Configure active access ports ('switchport mode access', 'spanning-tree portfast', 'spanning-tree bpduguard enable') and optional management SVI ('interface Vlan1') if appropriate. Do NOT create unrequested VLANs or trunks.
  * If VLANs ARE requested: Create the requested VLANs with names, configure 802.1Q trunks with Native VLAN, and assign access ports to their designated VLANs.
- Routers:
  * Configure physical LAN and WAN interfaces with 'ip address <ip> <mask>' and 'no shutdown' (or 802.1Q subinterfaces ONLY if multiple VLANs share a single router trunk).
- Routing Decision Matrix (CCNA 200-301 Official Cert Guide & Cisco NetAcad Standards):
  - If Routing Mode is 'AUTO' (or unspecified in scenario):
    1. SINGLE ROUTER (N_routers = 1, no external WAN router peer): All local subnets are Directly Connected ('C', AD = 0). Do NOT configure unnecessary OSPF or static routes unless an external ISP/gateway is shown.
    2. TWO ROUTERS / STUB NETWORK (N_routers = 2 connected by a single link, and OSPF is not explicitly requested in scenario): Configure Static & Default Routes ('ip route <remote-subnet> <mask> <next-hop>' or 'ip route 0.0.0.0 0.0.0.0 <next-hop>', AD = 1) per CCNA OCG Vol 1, Ch. 15.
    3. MULTI-ROUTER MESH / REDUNDANT PATHS (N_routers >= 3, or redundant links between routers, or scenario explicitly requests OSPF): Configure Dynamic Single-Area OSPFv2 ('router ospf 1', AD = 110) with explicit 'router-id', exact inverse wildcard masks for every active IPv4 block, and 'passive-interface' on all LAN interfaces.
  - If Routing Mode is explicitly forced to 'STATIC': Configure static/default routes across all routers.
  - If Routing Mode is explicitly forced to 'OSPF': Configure OSPF ('router ospf 1'), explicit 'router-id', accurate network wildcard masks, and 'passive-interface' on LAN-facing interfaces.

---
### STAGE 4: DESIGN RATIONALE
- Explain how each ";" separated IPv4 block was mapped to its target LAN or WAN segment based on the uploaded topology and Network Scenario & Design Intentions.
- Explain the routing choice referencing the CCNA 200-301 Official Cert Guide criteria.
- Explain the CCNA security features implemented and the risks they mitigate.

---
### STAGE 5: VERIFICATION COMMANDS
Provide a quick testing checklist for the user to paste into Cisco Packet Tracer or CLI:
- Commands to verify Layer 2 (e.g., show interfaces status, show mac address-table, or show vlan brief / show interfaces trunk if VLANs are used).
- Commands to verify Layer 3 & Routing (show ip interface brief, show ip route, show protocols, or show ip ospf neighbor if OSPF is used).
- Key end-to-end ping tests to confirm connectivity across all allocated IPv4 blocks.

---
MANDATORY SAFETY & DIGITAL TRUST DIRECTIVE:
Never output real production passwords or pre-shared keys. Use standardized lab placeholders (e.g. LAB_SECRET_REPLACE_ME, LAB_ADMIN_PASSWORD_REPLACE_ME).
Explicitly record all unreadable or assumed ports in the "assumptions" array. Never guess silently.`;

// Deterministic bitwise VLSM pre-calculator supporting single or ';' separated multiple CIDR blocks
function computeDeterministicVlsmReference(
  baseCidrInput: string,
  vlans: Array<{ vlanId?: number; name?: string; hostCount?: number; hostsNeeded?: number }>,
  scenarioText?: string
): string {
  try {
    const rawBlocks = (baseCidrInput || '')
      .split(/[;\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (rawBlocks.length === 0) return '';

    const ipToInt = (ip: number[]) =>
      (((ip[0] << 24) >>> 0) + ((ip[1] << 16) >>> 0) + ((ip[2] << 8) >>> 0) + (ip[3] >>> 0)) >>> 0;
    const intToIp = (int: number) =>
      [(int >>> 24) & 255, (int >>> 16) & 255, (int >>> 8) & 255, int & 255].join('.');
    const prefixToMask = (p: number) => intToIp((0xffffffff << (32 - p)) >>> 0);
    const prefixToWildcard = (p: number) => intToIp((~((0xffffffff << (32 - p)) >>> 0)) >>> 0);

    interface BlockPool {
      index: number;
      cidr: string;
      prefix: number;
      networkInt: number;
      currentInt: number;
      endInt: number;
      usableHosts: number;
      firstUsable: string;
      lastUsable: string;
      broadcast: string;
      mask: string;
      wildcard: string;
      scenarioHint: string;
    }

    const pools: BlockPool[] = [];
    const clauses = (scenarioText || '')
      .split(/[.;\n]+/)
      .map((c) => c.trim())
      .filter(Boolean);

    rawBlocks.forEach((token, idx) => {
      const [ipPart, prefixPart] = token.split('/');
      const basePrefix = parseInt(prefixPart || '24', 10);
      const octets = (ipPart || '').trim().split('.').map((n) => parseInt(n, 10));
      if (
        octets.length !== 4 ||
        octets.some((n) => isNaN(n) || n < 0 || n > 255) ||
        isNaN(basePrefix) ||
        basePrefix < 8 ||
        basePrefix > 31
      ) {
        return;
      }
      const baseMaskInt = (0xffffffff << (32 - basePrefix)) >>> 0;
      const netInt = (ipToInt(octets) & baseMaskInt) >>> 0;
      const totalSize = Math.pow(2, 32 - basePrefix);
      const normCidr = `${intToIp(netInt)}/${basePrefix}`;
      const netIp = intToIp(netInt);
      const threeOctets = `${octets[0]}.${octets[1]}.${octets[2]}.`;

      const matchingClause = clauses.find(
        (c) =>
          c.includes(normCidr) ||
          c.includes(netIp) ||
          (octets[2] !== 0 && c.includes(threeOctets))
      );

      pools.push({
        index: idx,
        cidr: normCidr,
        prefix: basePrefix,
        networkInt: netInt,
        currentInt: netInt,
        endInt: netInt + totalSize,
        usableHosts: Math.max(0, totalSize - 2),
        firstUsable: intToIp(netInt + 1),
        lastUsable: intToIp(netInt + totalSize - 2),
        broadcast: intToIp(netInt + totalSize - 1),
        mask: prefixToMask(basePrefix),
        wildcard: prefixToWildcard(basePrefix),
        scenarioHint: matchingClause
          ? matchingClause
          : basePrefix >= 30
          ? 'Point-to-Point Inter-Router / WAN Link (2 usable host IPs)'
          : `LAN Segment / Subnet Pool #${idx + 1}`,
      });
    });

    if (pools.length === 0) return '';

    const blockSummaryLines = pools.map(
      (p) =>
        `  - Block #${p.index + 1}: ${p.cidr} | Mask: ${p.mask} | Wildcard: ${p.wildcard} | Usable Range: ${p.firstUsable} - ${p.lastUsable} (${p.usableHosts} usable hosts) | Broadcast: ${p.broadcast} -> Scenario Context: ${p.scenarioHint}`
    );

    if (!vlans || vlans.length === 0) {
      return `\nPARSED MULTI-BLOCK IPv4 INPUT & MATHEMATICAL REFERENCE:\n${blockSummaryLines.join(
        '\n'
      )}\nIMPORTANT: No custom VLANs were pre-configured in the UI. Do NOT invent arbitrary VLANs (like Sales, Engineering, Servers, or Native_Mgmt) unless the topology diagram or scenario text explicitly specifies VLANs. If no VLANs are mentioned, assign the provided IPv4 block(s) directly to the physical LAN and WAN segments/interfaces shown in the topology and scenario.\n`;
    }

    const sorted = [...vlans]
      .map((v) => ({
        name: v.name || `VLAN_${v.vlanId || 10}`,
        vlanId: v.vlanId || 10,
        hosts: Number(v.hostCount ?? v.hostsNeeded ?? 10),
      }))
      .filter((v) => v.hosts > 0)
      .sort((a, b) => b.hosts - a.hosts);

    const lines: string[] = [];
    for (const req of sorted) {
      const hostBits = Math.max(2, Math.ceil(Math.log2(req.hosts + 2)));
      const prefix = 32 - hostBits;
      const blockSize = Math.pow(2, hostBits);

      let targetPool = pools.find((p) => {
        const lowerHint = p.scenarioHint.toLowerCase();
        if (
          req.vlanId > 0 &&
          (lowerHint.includes(`vlan ${req.vlanId}`) ||
            lowerHint.includes(`vlan_${req.vlanId}`) ||
            lowerHint.includes(req.name.toLowerCase()))
        ) {
          return p.currentInt + blockSize <= p.endInt;
        }
        return false;
      });

      if (!targetPool) {
        targetPool = pools.find((p) => {
          const rem = (p.currentInt - p.networkInt) % blockSize;
          const aligned = rem === 0 ? p.currentInt : p.currentInt + (blockSize - rem);
          return aligned + blockSize <= p.endInt;
        });
      }

      if (!targetPool) continue;

      const rem = (targetPool.currentInt - targetPool.networkInt) % blockSize;
      if (rem !== 0) targetPool.currentInt += blockSize - rem;
      if (targetPool.currentInt + blockSize > targetPool.endInt) continue;

      const netAddr = intToIp(targetPool.currentInt);
      const firstHost = intToIp(targetPool.currentInt + 1);
      const lastHost = intToIp(targetPool.currentInt + blockSize - 2);
      const bcast = intToIp(targetPool.currentInt + blockSize - 1);
      lines.push(
        `  * [From Block ${targetPool.cidr}] ${req.name}${req.vlanId ? ` (VLAN ${req.vlanId})` : ''}: Needs ${req.hosts} hosts -> Network ${netAddr}/${prefix}, Mask ${prefixToMask(prefix)}, Wildcard ${prefixToWildcard(prefix)}, Usable ${firstHost} - ${lastHost}, Broadcast ${bcast} (Gateway recommendation: ${firstHost})`
      );
      targetPool.currentInt += blockSize;
    }

    return `\nPARSED MULTI-BLOCK IPv4 INPUT & SCENARIO INTENTIONS:\n${blockSummaryLines.join('\n')}\n\nEXPLICIT VLAN VLSM MATHEMATICAL REFERENCE:\n${lines.join('\n')}\n`;
  } catch {
    return '';
  }
}

// Expand abbreviated Cisco interface names into full standard Cisco IOS names
function expandServerInterfaceName(raw: string): string {
  const s = (raw || '').trim();
  if (!s) return 'GigabitEthernet0/0/0';
  if (/^gigabitethernet/i.test(s)) return s.replace(/^gigabitethernet\s*/i, 'GigabitEthernet');
  if (/^fastethernet/i.test(s)) return s.replace(/^fastethernet\s*/i, 'FastEthernet');
  if (/^tengigabitethernet/i.test(s)) return s.replace(/^tengigabitethernet\s*/i, 'TenGigabitEthernet');
  if (/^serial/i.test(s)) return s.replace(/^serial\s*/i, 'Serial');
  if (/^loopback/i.test(s)) return s.replace(/^loopback\s*/i, 'Loopback');
  if (/^vlan/i.test(s)) return s.replace(/^vlan\s*/i, 'Vlan');

  const giMatch = s.match(/^(?:gi|gig|g)\s*([\d\/.\-]+)/i);
  if (giMatch) return `GigabitEthernet${giMatch[1]}`;
  const faMatch = s.match(/^(?:fa|fas|f)\s*([\d\/.\-]+)/i);
  if (faMatch) return `FastEthernet${faMatch[1]}`;
  const seMatch = s.match(/^(?:se|ser|s)\s*([\d\/.\-]+)/i);
  if (seMatch && s.includes('/')) return `Serial${seMatch[1]}`;
  const vlMatch = s.match(/^(?:vl|vlan)\s*(\d+)/i);
  if (vlMatch) return `Vlan${vlMatch[1]}`;
  return s;
}

// Normalize single-line '!' separated (with or without spaces) or unformatted Cisco IOS scripts into multi-line syntax
function normalizeServerCiscoCli(rawConfig: string): string {
  if (!rawConfig || !rawConfig.trim()) return '';
  let s = rawConfig.replace(/\r\n/g, '\n').replace(/\\n/g, '\n').trim();

  const banners: string[] = [];
  s = s.replace(/banner\s+motd\s+(#|\^C|\$)([\s\S]*?)\1/gi, (match) => {
    const idx = banners.length;
    banners.push(match.replace(/\s*\n\s*/g, ' '));
    return `__BANNER_PLACEHOLDER_${idx}__`;
  });

  // Split ANY remaining '!' (even without surrounding spaces) into newlines
  s = s.replace(/\s*!+\s*/g, '\n');

  const commandBoundaryRegex = new RegExp(
    '\\s+(?=(?:' +
      'hostname\\s+|' +
      'enable\\s+secret\\s+|' +
      'service\\s+password-encryption\\b|' +
      'no\\s+ip\\s+domain-lookup\\b|' +
      'ip\\s+domain-name\\s+|' +
      'username\\s+\\S+\\s+|' +
      'crypto\\s+key\\s+generate\\s+rsa\\b|' +
      'ip\\s+ssh\\s+version\\s+|' +
      '__BANNER_PLACEHOLDER_\\d+__|' +
      'interface\\s+(?:range\\s+)?(?:GigabitEthernet|FastEthernet|TenGigabitEthernet|Serial|Loopback|Vlan|Gi|Fa|Se|Lo|G\\d|F\\d|S\\d)|' +
      'description\\s+|' +
      'encapsulation\\s+dot1[Qq]\\s+|' +
      '(?<!\\bno\\s)ip\\s+address\\s+\\d+|' +
      'no\\s+ip\\s+address\\b|' +
      'ip\\s+default-gateway\\s+\\d+|' +
      'switchport\\s+(?:mode|access|trunk|nonegotiate|port-security)\\b|' +
      'spanning-tree\\s+(?:portfast|bpduguard|mode|vlan)\\b|' +
      'router\\s+ospf\\s+\\d+|' +
      'router-id\\s+\\d+|' +
      'passive-interface\\s+|' +
      'network\\s+\\d+\\.\\d+\\.\\d+\\.\\d+\\s+|' +
      'ip\\s+route\\s+\\d+\\.\\d+\\.\\d+\\.\\d+\\s+|' +
      'line\\s+(?:con|console|vty)\\s+\\d+|' +
      'login\\s+local\\b|' +
      'logging\\s+synchronous\\b|' +
      'exec-timeout\\s+\\d+|' +
      'transport\\s+input\\s+|' +
      'no\\s+shutdown\\b|' +
      '(?<!\\bno\\s)shutdown\\b|' +
      'end\\b|' +
      'write\\s+memory\\b|' +
      'copy\\s+running-config\\s+startup-config\\b' +
      '))',
    'gi'
  );

  const rawLines = s.split('\n');
  const splitLines: string[] = [];
  for (let i = 0; i < rawLines.length; i++) {
    const t = rawLines[i].trim();
    if (!t) continue;
    if (t.toLowerCase() === 'no' && i + 1 < rawLines.length) {
      const nextT = rawLines[i + 1].trim();
      if (/^(shutdown|ip\s+address|ip\s+domain-lookup)\b/i.test(nextT)) {
        splitLines.push(`no ${nextT}`);
        i++;
        continue;
      }
    }
    for (const part of t.split(commandBoundaryRegex)) {
      if (part.trim()) splitLines.push(part.trim());
    }
  }

  let inSubMode = false;
  const formatted: string[] = ['!'];
  const pushSep = () => {
    if (formatted.length > 0 && formatted[formatted.length - 1] !== '!') {
      formatted.push('!');
    }
  };

  for (let line of splitLines) {
    line = line.replace(/__BANNER_PLACEHOLDER_(\d+)__/g, (_, idx) => banners[Number(idx)] || '');
    const lower = line.toLowerCase();
    if (line === '!' || line.startsWith('!')) {
      inSubMode = false;
      pushSep();
      continue;
    }
    if (
      lower.startsWith('interface ') ||
      lower.startsWith('line ') ||
      lower.startsWith('router ') ||
      /^vlan\s+\d+$/i.test(line)
    ) {
      pushSep();
      inSubMode = true;
      formatted.push(line);
      continue;
    }
    if (
      lower.startsWith('hostname ') ||
      lower.startsWith('enable ') ||
      lower.startsWith('service ') ||
      lower.startsWith('no ip domain-lookup') ||
      lower.startsWith('ip domain-name ') ||
      lower.startsWith('username ') ||
      lower.startsWith('crypto key ') ||
      lower.startsWith('ip ssh ') ||
      lower.startsWith('banner ') ||
      lower.startsWith('ip route ') ||
      lower.startsWith('ip default-gateway ') ||
      lower.startsWith('ip routing') ||
      lower === 'end' ||
      lower === 'write memory' ||
      lower.startsWith('copy running-config')
    ) {
      if (
        inSubMode ||
        lower.startsWith('crypto key ') ||
        lower.startsWith('ip route ') ||
        lower === 'end'
      ) {
        pushSep();
      }
      inSubMode = false;
      formatted.push(line);
      continue;
    }
    if (lower === 'exit') {
      formatted.push(' exit');
      inSubMode = false;
      pushSep();
      continue;
    }
    formatted.push(inSubMode ? ` ${line}` : line);
  }
  return formatted.join('\n');
}

// Automatically derive categorized config sections, multi-line formatting, and IP reconciliation from fullConfig
function enrichStage3Configs(configs: any[], addressingTable?: any[]): any[] {
  if (!Array.isArray(configs)) return [];
  const addrRows = Array.isArray(addressingTable) ? addressingTable : [];

  return configs.map((cfg) => {
    const devName = (cfg?.deviceName || 'Device').trim();
    let full = normalizeServerCiscoCli(cfg?.fullConfig || '');

    // Ensure every interface assigned to this device in stage2_addressing.addressingTable is present in fullConfig
    const myRows = addrRows.filter(
      (r) =>
        (r?.device || '').trim().toLowerCase() === devName.toLowerCase() &&
        r?.ipAddress &&
        r.ipAddress !== 'DHCP' &&
        r.ipAddress !== 'N/A' &&
        r.ipAddress !== 'unassigned' &&
        /^\d+\.\d+\.\d+\.\d+$/.test(String(r.ipAddress).trim())
    );

    for (const row of myRows) {
      const fullIntf = expandServerInterfaceName(row.interface || 'G0/0/0');
      const rowIp = String(row.ipAddress).split('/')[0].trim();
      const rowMask =
        row.subnetMask && String(row.subnetMask).includes('.')
          ? String(row.subnetMask).trim()
          : '255.255.255.0';

      if (full.includes(`ip address ${rowIp} `)) continue;

      // Check if an interface stanza for fullIntf already exists with a stale/different IP, and update it in-place
      const escapedIntf = fullIntf.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const existingStanzaRegex = new RegExp(
        `(interface\\s+${escapedIntf}\\b[\\s\\S]*?)(ip\\s+address\\s+\\d+\\.\\d+\\.\\d+\\.\\d+\\s+\\d+\\.\\d+\\.\\d+\\.\\d+)`,
        'i'
      );
      if (existingStanzaRegex.test(full)) {
        full = full.replace(existingStanzaRegex, `$1ip address ${rowIp} ${rowMask}`);
        continue;
      }

      const subMatch = fullIntf.match(/\.(\d+)$/);
      const intfStanza = [
        `!`,
        `interface ${fullIntf}`,
        row.vlanPurpose ? ` description ${row.vlanPurpose}` : '',
        subMatch ? ` encapsulation dot1Q ${subMatch[1]}` : '',
        ` ip address ${rowIp} ${rowMask}`,
        !subMatch ? ` no shutdown` : '',
      ]
        .filter(Boolean)
        .join('\n');

      if (/\nline\s+con/i.test(full)) {
        full = full.replace(/(\nline\s+con)/i, `\n${intfStanza}\n!$1`);
      } else if (/\nend\b/i.test(full)) {
        full = full.replace(/(\nend\b)/i, `\n${intfStanza}\n!$1`);
      } else {
        full += `\n${intfStanza}\n!\nend\nwrite memory`;
      }
    }

    const lines = full.split('\n');

    const hardeningLines: string[] = [];
    const remoteLines: string[] = [];
    const l2SecLines: string[] = [];
    const switchingLines: string[] = [];
    const routingLines: string[] = [];
    const interVlanLines: string[] = [];

    let currentBlock: string[] = [];
    const flushBlock = (block: string[]) => {
      if (block.length === 0) return;
      const text = block.join('\n');
      const lower = text.toLowerCase();

      if (
        lower.includes('hostname ') ||
        lower.includes('enable secret') ||
        lower.includes('service password-encryption') ||
        lower.includes('banner motd') ||
        lower.includes('no ip domain-lookup')
      ) {
        hardeningLines.push(text);
      }
      if (
        lower.includes('line con ') ||
        lower.includes('line vty ') ||
        lower.includes('crypto key') ||
        lower.includes('ip ssh') ||
        lower.includes('username ')
      ) {
        remoteLines.push(text);
      }
      if (
        lower.includes('portfast') ||
        lower.includes('bpduguard') ||
        lower.includes('port-security') ||
        lower.includes('shutdown')
      ) {
        l2SecLines.push(text);
      }
      if (
        lower.includes('switchport') ||
        lower.startsWith('vlan ') ||
        lower.includes('\nvlan ')
      ) {
        switchingLines.push(text);
      }
      if (lower.includes('router ospf') || lower.includes('ip route ')) {
        routingLines.push(text);
      }
      if (lower.includes('encapsulation dot1q') || lower.includes('interface vlan')) {
        interVlanLines.push(text);
      }
    };

    for (const line of lines) {
      if (line.trim() === '!' && currentBlock.length > 0) {
        flushBlock(currentBlock);
        currentBlock = [];
      } else {
        currentBlock.push(line);
      }
    }
    flushBlock(currentBlock);

    return {
      ...cfg,
      deviceName: devName,
      deviceType: (cfg?.deviceType || 'router').toLowerCase(),
      role: cfg?.role || 'Network Node',
      fullConfig: full,
      packetTracerPaste: `enable\nconfigure terminal\n${full}\n`,
      sections: {
        hardening:
          hardeningLines.length > 0 ? hardeningLines.join('\n!\n') : full,
        remoteManagement:
          remoteLines.length > 0 ? remoteLines.join('\n!\n') : full,
        layer2Security:
          l2SecLines.length > 0 ? l2SecLines.join('\n!\n') : '! No Layer 2 port security rules on this device',
        switching:
          switchingLines.length > 0 ? switchingLines.join('\n!\n') : '! No switching configuration on this router',
        routing:
          routingLines.length > 0 ? routingLines.join('\n!\n') : '! No L3 routing protocol configured on this switch',
        interVlan:
          interVlanLines.length > 0 ? interVlanLines.join('\n!\n') : '! No subinterface or SVI configured on this device',
        interfaces: full,
      },
    };
  });
}

// API endpoint to analyze topology and generate CCNA 5-stage architecture
app.post('/api/analyze-topology', async (req, res) => {
  try {
    const { image, constraints, manualDescription } = req.body;

    const baseNetwork = constraints?.networkBlock || '192.168.1.0/24';
    const routingProtocol = constraints?.routingProtocol || 'AUTO';
    const interVlanMethod = constraints?.interVlanMethod || 'ROUTER_ON_A_STICK';
    const nativeVlan = constraints?.nativeVlan || 999;
    const parkingVlan = constraints?.parkingVlan || 888;
    const adminUser = constraints?.adminUsername || 'admin';
    const adminPass = constraints?.adminPassword || 'LAB_ADMIN_PASSWORD_REPLACE_ME';
    const enableSecret = constraints?.enableSecret || 'LAB_SECRET_REPLACE_ME';
    const domainName = constraints?.domainName || 'lab.local';
    const ospfArea = constraints?.ospfArea !== undefined ? constraints.ospfArea : 0;
    const ospfProcess = constraints?.ospfProcessId || 1;
    const vlanRequirements = Array.isArray(constraints?.vlanRequirements) ? constraints.vlanRequirements : [];
    const additionalNotes = constraints?.additionalInstructions || '';

    const hasExplicitVlans =
      vlanRequirements.length > 0 ||
      /\bvlan\s*\d+/i.test(manualDescription || '') ||
      /\bvlan\s*\d+/i.test(additionalNotes || '') ||
      /\b(router-on-a-stick|roas|subinterface|802\.1q|trunk)\b/i.test(manualDescription || '');

    const deterministicVlsmRef = computeDeterministicVlsmReference(
      baseNetwork,
      vlanRequirements,
      manualDescription
    );
    const hasImage = Boolean(image?.data && image?.mimeType);

    const vlanDirectiveText = hasExplicitVlans
      ? `- Explicit VLAN Configuration Requested: ${
          vlanRequirements.length > 0
            ? JSON.stringify(vlanRequirements)
            : 'Extract VLAN IDs and names directly from the topology diagram and scenario text.'
        } (Inter-VLAN Method: ${interVlanMethod}, Native VLAN: ${nativeVlan}, Parking VLAN: ${parkingVlan})`
      : `- NO VLANs Requested in Scenario/Constraints: If the uploaded diagram does NOT explicitly show VLANs, DO NOT invent or create arbitrary VLANs (such as Sales, Engineering, Servers, Native_Mgmt, VLAN 10/20/30/999). Configure physical router interfaces and standard Layer 2 switch access ports (default VLAN 1) matching the exact diagram and scenario.`;

    const promptText = hasImage
      ? `VISUAL TOPOLOGY EXTRACTION & 5-STAGE CCNA ARCHITECTURE:
Carefully analyze the attached network topology diagram (image or PDF document) and the user's scenario description to extract the complete 5-STAGE CCNA architecture.

MANDATORY GROUND-TRUTH VISUAL EXTRACTION & MULTI-BLOCK IPv4 MAPPING RULES:
1. DETECT EVERY DEVICE SHOWN:
   - Identify every router, switch, multilayer switch, PC, workstation, server, firewall, or cloud icon in the diagram.
   - Extract their EXACT labels and names as written in the diagram (e.g., R1, R2, SW1, S1, S2, PC1, PC2, PC-A, PC-B, etc.).
   - NEVER invent or replace device names with generic presets if names are visible in the diagram.
2. DETECT ALL INTERCONNECTIONS AND INTERFACES:
   - Inspect every link/cable between devices.
   - Read the exact interface identifiers at both ends of each link (e.g., G0/0, G0/1, G0/0/0, G0/0/1, Fa0/1, S0/0/0, etc.).
   - Classify link types accurately: use "Access" or "Routed" for standard router-to-switch and switch-to-PC links when VLANs are not used; use "WAN" or "Routed" for router-to-router links; only use "Trunk" if 802.1Q VLAN trunking is present in the diagram or scenario.
   - If any interface label is partially obscured or unreadable, explicitly record it in "assumptions" under stage1_topology.
3. INTERPRET MULTIPLE IPv4 ADDRESS BLOCKS (SEPARATED BY ";") & SCENARIO INTENTIONS:
   - The user specified IPv4 Address Block(s): ${baseNetwork}
   - Read all subnets/IPs written on the diagram AND parse the "Network Scenario & Design Intentions" text to map each ";" separated IPv4 block to its intended network segment, physical router LAN interface, or router-to-router WAN link.
   - Do NOT invent fake department VLANs (Sales, Engineering, Servers, Native_Mgmt) to slice up a block if the diagram and scenario do not ask for VLANs!
${deterministicVlsmRef}
4. GENERATE COMPLETE CISCO IOS CONFIGURATIONS (STAGE 3):
   - Provide a complete, hardened, standalone Cisco IOS CLI configuration block in "fullConfig" for EVERY identified router and switch.
   - Follow CCNA security baselines (hostname, enable secret ${enableSecret}, service password-encryption, username ${adminUser} privilege 15 secret ${adminPass}, ip domain-name ${domainName}, crypto key generate rsa modulus 2048, line con 0, line vty 0 4 with transport input ssh, banner motd).
   - Configure routing (${routingProtocol}) or static/connected routes per the CCNA Routing Decision Matrix and the scenario's requirements.
   - Every device configuration MUST terminate with 'end' and 'write memory'.

USER CONSTRAINTS & SCENARIO:
- Base IPv4 Address Block(s) (;-separated): ${baseNetwork}
- Routing Protocol Mode: ${routingProtocol} (Process ID: ${ospfProcess}, Area: ${ospfArea})
${vlanDirectiveText}
- Domain Name: ${domainName}
- Lab Credentials: Username "${adminUser}", Password "${adminPass}", Enable Secret "${enableSecret}"
${manualDescription ? `- Network Scenario & Design Intentions: ${manualDescription}` : ''}
${additionalNotes ? `- Additional Instructions: ${additionalNotes}` : ''}

Output ONLY valid JSON conforming to the responseSchema.`
      : `Analyze this network scenario and generate the complete 5-STAGE CCNA architecture.
Pay special attention to all ";" separated IPv4 address blocks in "${baseNetwork}" and map each IPv4 block to the specific network segment or interface described in the Network Scenario & Design Intentions below.
Do NOT invent arbitrary VLANs (such as Sales, Engineering, Servers, or Native_Mgmt) unless VLANs are explicitly requested in the scenario or VLAN requirements.
${deterministicVlsmRef}
USER INPUT CONSTRAINTS:
- Base IPv4 Address Block(s) (;-separated): ${baseNetwork}
- Routing Protocol Mode: ${routingProtocol} (OSPF Process ID: ${ospfProcess}, Area: ${ospfArea})
${vlanDirectiveText}
- Domain Name: ${domainName}
- Admin Credentials: Username "${adminUser}", Password "${adminPass}", Enable Secret "${enableSecret}"
${additionalNotes ? `- Additional Instructions: ${additionalNotes}` : ''}
${manualDescription ? `\nNetwork Scenario & Design Intentions: ${manualDescription}` : ''}

Output ONLY valid JSON conforming to the responseSchema.`;

    const contentsPayload = hasImage
      ? [
          {
            inlineData: {
              data: image.data,
              mimeType: image.mimeType,
            },
          },
          promptText,
        ]
      : promptText;

    // Step-down resilient model cascade: prioritize high-availability, low-latency models
    const modelCandidates: Array<{ name: string; useLowThinking?: boolean }> = [
      { name: 'gemini-3.1-flash-lite', useLowThinking: true },
      { name: 'gemini-3.8-flash', useLowThinking: true },
      { name: 'gemini-flash-latest', useLowThinking: false },
    ];

    let parsedData: any = null;
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    for (const candidate of modelCandidates) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          console.log(
            `[AI Studio] Attempting topology analysis with model: ${candidate.name} (attempt ${attempt})`
          );
          const configObj: Record<string, any> = {
            systemInstruction: CCNA_5STAGE_SYSTEM_PROMPT,
            responseMimeType: 'application/json',
            responseSchema: CCNA_RESPONSE_SCHEMA,
            temperature: 0.1,
          };
          if (candidate.useLowThinking) {
            configObj.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
          }

          const response = await ai.models.generateContent({
            model: candidate.name,
            contents: contentsPayload,
            config: configObj,
          });

          const rawText = response?.text || '';
          if (rawText) {
            parsedData = extractAndParseJson(rawText);
            if (parsedData && typeof parsedData === 'object') {
              console.log(
                `[AI Studio] Successfully parsed CCNA JSON with model: ${candidate.name}`
              );
              break;
            }
          }
        } catch (err: any) {
          const errMsg = String(err?.message || err || '');
          console.warn(
            `[AI Studio Model Fallback] Model ${candidate.name} (attempt ${attempt}) failed:`,
            errMsg
          );
          const isTransient503Or429 =
            errMsg.includes('503') ||
            errMsg.includes('UNAVAILABLE') ||
            errMsg.includes('429') ||
            errMsg.includes('high demand') ||
            errMsg.includes('overloaded');
          if (isTransient503Or429 && attempt === 1) {
            await sleep(700);
            continue;
          }
          break; // Move immediately to the next stepped-down model
        }
      }
      if (parsedData) break;
    }

    // If all LLM endpoints are experiencing a temporary 503 regional spike, synthesize a complete
    // deterministic 5-stage CCNA architecture from the user's CIDR blocks and scenario without inventing fake VLANs
    if (!parsedData) {
      console.warn(
        '[AI Studio] All remote LLM models returned transient errors; synthesizing deterministic 5-stage CCNA architecture tailored to user blocks and scenario.'
      );
      parsedData = buildDeterministicCcnaArchitecture({
        baseNetwork,
        routingProtocol,
        interVlanMethod,
        nativeVlan,
        parkingVlan,
        adminUser,
        adminPass,
        enableSecret,
        domainName,
        ospfArea,
        ospfProcess,
        vlanRequirements,
        manualDescription: manualDescription || '',
        additionalNotes,
      });
    }

    // Synchronize Stage 1 Endpoints with Stage 2 Addressing Table so Visualizer & Path Tracer never drift
    if (
      Array.isArray(parsedData.stage1_topology?.endpoints) &&
      Array.isArray(parsedData.stage2_addressing?.addressingTable)
    ) {
      const addrTable = parsedData.stage2_addressing.addressingTable;
      parsedData.stage1_topology.endpoints = parsedData.stage1_topology.endpoints.map((ep: any) => {
        const matchRow = addrTable.find(
          (r: any) => (r?.device || '').trim().toLowerCase() === (ep?.name || '').trim().toLowerCase()
        );
        if (matchRow) {
          return {
            ...ep,
            assignedIp: matchRow.ipAddress || ep.assignedIp,
            defaultGateway:
              matchRow.defaultGateway && matchRow.defaultGateway !== 'N/A'
                ? matchRow.defaultGateway
                : ep.defaultGateway,
            vlan: matchRow.vlanPurpose || ep.vlan,
          };
        }
        return ep;
      });
    }

    // Enrich Stage 3 configs with categorized sections, multi-line formatting, and IP reconciliation
    if (Array.isArray(parsedData.stage3_configs)) {
      parsedData.stage3_configs = enrichStage3Configs(
        parsedData.stage3_configs,
        parsedData.stage2_addressing?.addressingTable
      );
    }

    return res.json({ success: true, data: parsedData });
  } catch (error: any) {
    console.error('Error analyzing topology:', error);
    const rawMsg = String(error?.message || 'Failed to analyze network topology.');
    const friendlyMsg =
      rawMsg.includes('503') || rawMsg.includes('UNAVAILABLE')
        ? 'The primary AI model is experiencing temporary high demand (503). Please click Analyze again to retry with the stepped-down Flash Lite engine.'
        : rawMsg;
    return res.status(500).json({
      success: false,
      error: friendlyMsg,
    });
  }
});

// Deterministic 5-Stage CCNA fallback synthesizer when all upstream LLM models return 503 UNAVAILABLE.
// Strictly respects the user's ';'-separated IPv4 blocks and scenario description — NEVER invents unrequested VLANs.
function buildDeterministicCcnaArchitecture(params: {
  baseNetwork: string;
  routingProtocol: string;
  interVlanMethod: string;
  nativeVlan: number;
  parkingVlan: number;
  adminUser: string;
  adminPass: string;
  enableSecret: string;
  domainName: string;
  ospfArea: number;
  ospfProcess: number;
  vlanRequirements: Array<{ vlanId?: number; name?: string; hostCount?: number; purpose?: string }>;
  manualDescription: string;
  additionalNotes?: string;
}): any {
  const {
    baseNetwork,
    routingProtocol,
    nativeVlan,
    parkingVlan,
    adminUser,
    adminPass,
    enableSecret,
    domainName,
    ospfArea,
    ospfProcess,
    vlanRequirements,
    manualDescription,
    additionalNotes = '',
  } = params;

  const combinedText = `${manualDescription || ''} ${additionalNotes || ''}`.trim();

  const ipToInt = (ip: number[]) =>
    (((ip[0] << 24) >>> 0) + ((ip[1] << 16) >>> 0) + ((ip[2] << 8) >>> 0) + (ip[3] >>> 0)) >>> 0;
  const intToIp = (int: number) =>
    [(int >>> 24) & 255, (int >>> 16) & 255, (int >>> 8) & 255, int & 255].join('.');
  const prefixToMask = (p: number) => intToIp((0xffffffff << (32 - p)) >>> 0);
  const prefixToWildcard = (p: number) => intToIp((~((0xffffffff << (32 - p)) >>> 0)) >>> 0);

  const rawBlocks = (baseNetwork || '192.168.1.0/24')
    .split(/[;\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const pools = rawBlocks.map((token, idx) => {
    const [ipPart, prefixPart] = token.split('/');
    const prefix = Math.min(30, Math.max(8, parseInt(prefixPart || '24', 10) || 24));
    const octets = (ipPart || '192.168.1.0')
      .trim()
      .split('.')
      .map((n) => parseInt(n, 10) || 0);
    const validOctets = octets.length === 4 ? octets : [192, 168, 1 + idx, 0];
    const maskInt = (0xffffffff << (32 - prefix)) >>> 0;
    const netInt = (ipToInt(validOctets) & maskInt) >>> 0;
    return {
      cidr: `${intToIp(netInt)}/${prefix}`,
      prefix,
      netInt,
      currentInt: netInt,
      endInt: netInt + Math.pow(2, 32 - prefix),
    };
  });

  if (pools.length === 0) {
    const netInt = ipToInt([192, 168, 1, 0]);
    pools.push({
      cidr: '192.168.1.0/24',
      prefix: 24,
      netInt,
      currentInt: netInt,
      endInt: netInt + 256,
    });
  }

  // Check if the user actually requested VLANs in the UI or in their scenario text
  const scenarioVlanMatches = [...combinedText.matchAll(/\bvlan\s*(\d+)\b/gi)];
  const parsedScenarioVlans = scenarioVlanMatches
    .map((m) => parseInt(m[1], 10))
    .filter((id, idx, arr) => !isNaN(id) && id > 1 && arr.indexOf(id) === idx)
    .map((id) => ({
      vlanId: id,
      name: `VLAN_${id}`,
      hostCount: 30,
      purpose: `VLAN ${id} Segment`,
    }));

  const effectiveVlans =
    vlanRequirements && vlanRequirements.length > 0
      ? vlanRequirements
      : parsedScenarioVlans;

  const isVlanMode = effectiveVlans.length > 0;

  // Detect router names mentioned in scenario (e.g., R1, R2, R3, HQ, Branch, ISP)
  const routerMatches = [...combinedText.matchAll(/\b(R\d+|Router\s*\d+|HQ|Branch|ISP)\b/gi)].map((m) =>
    m[1].replace(/\s+/g, '')
  );
  const uniqueRouters = Array.from(new Set(routerMatches.map((r) => r.toUpperCase())));

  const hasWanPool = pools.some((p) => p.prefix >= 30);
  const hasMultiRouter =
    uniqueRouters.length >= 2 ||
    pools.length >= 2 ||
    hasWanPool ||
    /(r2|router\s*2|branch|wan|ospf|static\s*route|serial|p2p|inter-router|point-to-point)/i.test(
      combinedText
    );

  const r1Name = uniqueRouters[0] || 'R1';
  const r2Name = uniqueRouters[1] || 'R2';

  // Detect switch names mentioned in scenario (e.g., S1, S2, SW1, SW2)
  const switchMatches = [...combinedText.matchAll(/\b(SW?\d+|Switch\s*\d+)\b/gi)].map((m) =>
    m[1].replace(/\s+/g, '').toUpperCase()
  );
  const uniqueSwitches = Array.from(new Set(switchMatches));
  const sw1Name = uniqueSwitches[0] || 'S1';
  const sw2Name = uniqueSwitches[1] || 'S2';

  const useOspf =
    routingProtocol === 'OSPF' ||
    (routingProtocol === 'AUTO' &&
      (/ospf|area\s*\d/i.test(combinedText) || uniqueRouters.length >= 3));

  // ============================================================================
  // CASE A: FLAT / STANDARD ROUTED LAN TOPOLOGY (NO UNREQUESTED VLANs)
  // ============================================================================
  if (!isVlanMode) {
    const lanPools = pools.filter((p) => p.prefix < 30);
    const wanPools = pools.filter((p) => p.prefix >= 30);
    const primaryLanPool = lanPools[0] || pools[0];

    // Check if scenario specifies multiple host counts (e.g., "60 hosts", "25 hosts", "LAN A 50 hosts, LAN B 20 hosts")
    const hostCountMatches = [...combinedText.matchAll(/(\d+)\s*hosts?\b/gi)]
      .map((m) => parseInt(m[1], 10))
      .filter((n) => !isNaN(n) && n >= 2 && n <= 16000);

    const subnetAllocations: any[] = [];
    const addressingTable: any[] = [];
    const routersList: any[] = [];
    const switchesList: any[] = [];
    const endpointsList: any[] = [];
    const connectionsList: any[] = [];
    const configs: any[] = [];

    // Determine LAN segments:
    // 1. If user gave multiple LAN pools (e.g. 192.168.1.0/24; 192.168.2.0/24; 192.168.0.0/30), use each LAN pool directly.
    // 2. If user specified explicit host counts in scenario (e.g. "50 hosts and 25 hosts"), carve VLSM subnets from primaryLanPool.
    // 3. Otherwise, if user gave 1 LAN pool (e.g. 192.168.1.0/24) and 1 WAN pool (e.g. 192.168.0.0/30):
    //    - If scenario mentions S2 / PC2 / 2 LANs, split primaryLanPool into two equal subnets OR assign primaryLanPool directly if only 1 LAN is described.
    const mentionsSecondLan =
      uniqueSwitches.length >= 2 ||
      /\b(s2|sw2|pc2|pc-b|lan\s*2|lan\s*b|two\s*lans|both\s*lans)\b/i.test(combinedText);

    interface LanSegmentPlan {
      name: string;
      routerName: string;
      routerInterface: string;
      switchName: string;
      pcName: string;
      hostsNeeded: number;
      hostsAllocated: number;
      networkAddress: string;
      prefix: number;
      subnetMask: string;
      wildcardMask: string;
      gwIp: string;
      pcIp: string;
      lastIp: string;
      bcastIp: string;
    }

    const lanSegments: LanSegmentPlan[] = [];

    if (lanPools.length >= 2) {
      // Each provided LAN CIDR block maps directly to a router LAN segment
      lanPools.forEach((lp, idx) => {
        const blockSize = Math.pow(2, 32 - lp.prefix);
        const netIp = intToIp(lp.netInt);
        const gwIp = intToIp(lp.netInt + 1);
        const pcIp = intToIp(lp.netInt + 2);
        const lastIp = intToIp(lp.netInt + blockSize - 2);
        const bcastIp = intToIp(lp.netInt + blockSize - 1);
        const rName = idx === 0 ? r1Name : idx === 1 ? r2Name : `R${idx + 1}`;
        const sName = idx === 0 ? sw1Name : idx === 1 ? sw2Name : `S${idx + 1}`;
        const pName = idx === 0 ? 'PC1' : idx === 1 ? 'PC2' : `PC${idx + 1}`;

        lanSegments.push({
          name: `${rName}_LAN`,
          routerName: rName,
          routerInterface: 'G0/0/0',
          switchName: sName,
          pcName: pName,
          hostsNeeded: blockSize - 2,
          hostsAllocated: blockSize - 2,
          networkAddress: netIp,
          prefix: lp.prefix,
          subnetMask: prefixToMask(lp.prefix),
          wildcardMask: prefixToWildcard(lp.prefix),
          gwIp,
          pcIp,
          lastIp,
          bcastIp,
        });
      });
    } else if (hostCountMatches.length >= 2) {
      // Carve VLSM subnets from primaryLanPool according to scenario host counts
      const sortedCounts = [...hostCountMatches].sort((a, b) => b - a);
      sortedCounts.forEach((hCount, idx) => {
        const hostBits = Math.max(2, Math.ceil(Math.log2(hCount + 2)));
        const prefix = Math.min(30, 32 - hostBits);
        const blockSize = Math.pow(2, 32 - prefix);
        const rem = (primaryLanPool.currentInt - primaryLanPool.netInt) % blockSize;
        if (rem !== 0) primaryLanPool.currentInt += blockSize - rem;

        const netIp = intToIp(primaryLanPool.currentInt);
        const gwIp = intToIp(primaryLanPool.currentInt + 1);
        const pcIp = intToIp(primaryLanPool.currentInt + 2);
        const lastIp = intToIp(primaryLanPool.currentInt + blockSize - 2);
        const bcastIp = intToIp(primaryLanPool.currentInt + blockSize - 1);
        const rName = idx === 0 ? r1Name : hasMultiRouter ? r2Name : r1Name;
        const rIntf = idx === 0 ? 'G0/0/0' : hasMultiRouter ? 'G0/0/0' : `G0/0/${idx}`;
        const sName = idx === 0 ? sw1Name : idx === 1 ? sw2Name : `S${idx + 1}`;
        const pName = idx === 0 ? 'PC1' : idx === 1 ? 'PC2' : `PC${idx + 1}`;

        lanSegments.push({
          name: `LAN_${idx + 1} (${hCount} Hosts)`,
          routerName: rName,
          routerInterface: rIntf,
          switchName: sName,
          pcName: pName,
          hostsNeeded: hCount,
          hostsAllocated: blockSize - 2,
          networkAddress: netIp,
          prefix,
          subnetMask: prefixToMask(prefix),
          wildcardMask: prefixToWildcard(prefix),
          gwIp,
          pcIp,
          lastIp,
          bcastIp,
        });
        primaryLanPool.currentInt += blockSize;
      });
    } else if (mentionsSecondLan && primaryLanPool.prefix <= 29) {
      // Scenario mentions 2 LANs / switches (S1, S2) sharing the single LAN block -> split into two subnets
      const subPrefix = primaryLanPool.prefix + 1;
      const blockSize = Math.pow(2, 32 - subPrefix);
      [0, 1].forEach((idx) => {
        const startInt = primaryLanPool.netInt + idx * blockSize;
        const netIp = intToIp(startInt);
        const gwIp = intToIp(startInt + 1);
        const pcIp = intToIp(startInt + 2);
        const lastIp = intToIp(startInt + blockSize - 2);
        const bcastIp = intToIp(startInt + blockSize - 1);
        const rName = idx === 0 ? r1Name : hasMultiRouter ? r2Name : r1Name;
        const rIntf = idx === 0 ? 'G0/0/0' : hasMultiRouter ? 'G0/0/0' : 'G0/0/1';
        const sName = idx === 0 ? sw1Name : sw2Name;
        const pName = idx === 0 ? 'PC1' : 'PC2';

        lanSegments.push({
          name: `${rName}_LAN_${idx + 1}`,
          routerName: rName,
          routerInterface: rIntf,
          switchName: sName,
          pcName: pName,
          hostsNeeded: blockSize - 2,
          hostsAllocated: blockSize - 2,
          networkAddress: netIp,
          prefix: subPrefix,
          subnetMask: prefixToMask(subPrefix),
          wildcardMask: prefixToWildcard(subPrefix),
          gwIp,
          pcIp,
          lastIp,
          bcastIp,
        });
      });
    } else {
      // Use the exact LAN block as provided (e.g. 192.168.1.0/24) without slicing it into fake subnets
      const blockSize = Math.pow(2, 32 - primaryLanPool.prefix);
      const netIp = intToIp(primaryLanPool.netInt);
      const gwIp = intToIp(primaryLanPool.netInt + 1);
      const pcIp = intToIp(primaryLanPool.netInt + 2);
      const lastIp = intToIp(primaryLanPool.netInt + blockSize - 2);
      const bcastIp = intToIp(primaryLanPool.netInt + blockSize - 1);

      lanSegments.push({
        name: `${r1Name}_LAN`,
        routerName: r1Name,
        routerInterface: 'G0/0/0',
        switchName: sw1Name,
        pcName: 'PC1',
        hostsNeeded: hostCountMatches[0] || blockSize - 2,
        hostsAllocated: blockSize - 2,
        networkAddress: netIp,
        prefix: primaryLanPool.prefix,
        subnetMask: prefixToMask(primaryLanPool.prefix),
        wildcardMask: prefixToWildcard(primaryLanPool.prefix),
        gwIp,
        pcIp,
        lastIp,
        bcastIp,
      });
    }

    for (const seg of lanSegments) {
      subnetAllocations.push({
        name: seg.name,
        hostsNeeded: seg.hostsNeeded,
        hostsAllocated: seg.hostsAllocated,
        networkAddress: seg.networkAddress,
        prefix: seg.prefix,
        subnetMask: seg.subnetMask,
        wildcardMask: seg.wildcardMask,
        usableRange: `${seg.gwIp} - ${seg.lastIp}`,
        broadcastAddress: seg.bcastIp,
      });

      addressingTable.push(
        {
          device: seg.routerName,
          interface: seg.routerInterface,
          vlanPurpose: `${seg.name} Default Gateway`,
          ipAddress: seg.gwIp,
          subnetMask: seg.subnetMask,
          prefix: seg.prefix,
          usableRange: `${seg.gwIp} - ${seg.lastIp}`,
          defaultGateway: 'N/A',
        },
        {
          device: seg.pcName,
          interface: 'NIC0',
          vlanPurpose: `${seg.name} Endpoint`,
          ipAddress: seg.pcIp,
          subnetMask: seg.subnetMask,
          prefix: seg.prefix,
          usableRange: `${seg.gwIp} - ${seg.lastIp}`,
          defaultGateway: seg.gwIp,
        }
      );

      switchesList.push({
        name: seg.switchName,
        model: 'Catalyst 2960',
        role: `Layer 2 LAN Switch (${seg.name})`,
        ports: ['G0/1', 'Fa0/1'],
        notes: `Standard Layer 2 switching on default VLAN 1; uplink G0/1 to ${seg.routerName} ${seg.routerInterface}`,
      });

      endpointsList.push({
        name: seg.pcName,
        type: 'pc',
        vlan: '1 (Default LAN)',
        assignedIp: seg.pcIp,
        defaultGateway: seg.gwIp,
      });

      connectionsList.push(
        {
          id: `link-${seg.routerName}-${seg.switchName}`,
          fromDevice: seg.routerName,
          fromInterface: seg.routerInterface,
          toDevice: seg.switchName,
          toInterface: 'G0/1',
          linkType: 'Access',
          vlan: '1',
          notes: `Physical LAN link (${seg.networkAddress}/${seg.prefix})`,
        },
        {
          id: `link-${seg.switchName}-${seg.pcName}`,
          fromDevice: seg.switchName,
          toDevice: seg.pcName,
          fromInterface: 'Fa0/1',
          toInterface: 'NIC0',
          linkType: 'Access',
          vlan: '1',
          notes: `Endpoint access port for ${seg.pcName}`,
        }
      );
    }

    // Allocate WAN /30 link if a /30 pool was provided or multiple routers exist
    let wanAllocation: any = null;
    if (hasMultiRouter) {
      const wanPool = wanPools[0] || pools[pools.length - 1];
      const blockSize = 4;
      const rem = (wanPool.currentInt - wanPool.netInt) % blockSize;
      if (rem !== 0) wanPool.currentInt += blockSize - rem;
      const netIp = intToIp(wanPool.currentInt);
      const r1WanIp = intToIp(wanPool.currentInt + 1);
      const r2WanIp = intToIp(wanPool.currentInt + 2);
      const bcastIp = intToIp(wanPool.currentInt + 3);

      wanAllocation = {
        name: `Link_${r1Name}_${r2Name}`,
        hostsNeeded: 2,
        hostsAllocated: 2,
        networkAddress: netIp,
        prefix: 30,
        subnetMask: '255.255.255.252',
        wildcardMask: '0.0.0.3',
        usableRange: `${r1WanIp} - ${r2WanIp}`,
        broadcastAddress: bcastIp,
        r1WanIp,
        r2WanIp,
      };
      subnetAllocations.push(wanAllocation);
      addressingTable.push(
        {
          device: r1Name,
          interface: 'G0/0/1',
          vlanPurpose: `Point-to-Point Link to ${r2Name}`,
          ipAddress: r1WanIp,
          subnetMask: '255.255.255.252',
          prefix: 30,
          usableRange: `${r1WanIp} - ${r2WanIp}`,
          defaultGateway: r2WanIp,
        },
        {
          device: r2Name,
          interface: 'G0/0/1',
          vlanPurpose: `Point-to-Point Link to ${r1Name}`,
          ipAddress: r2WanIp,
          subnetMask: '255.255.255.252',
          prefix: 30,
          usableRange: `${r1WanIp} - ${r2WanIp}`,
          defaultGateway: r1WanIp,
        }
      );

      connectionsList.push({
        id: `link-${r1Name}-${r2Name}`,
        fromDevice: r1Name,
        fromInterface: 'G0/0/1',
        toDevice: r2Name,
        toInterface: 'G0/0/1',
        linkType: 'WAN',
        vlan: 'Routed /30',
        notes: `Inter-router routed link (${wanAllocation.networkAddress}/30)`,
      });
    }

    // Build router configurations
    const activeRouterNames = hasMultiRouter ? [r1Name, r2Name] : [r1Name];
    activeRouterNames.forEach((rName, rIdx) => {
      const myLans = lanSegments.filter((s) => s.routerName === rName);
      const remoteLans = lanSegments.filter((s) => s.routerName !== rName);
      const myWanIp = rIdx === 0 ? wanAllocation?.r1WanIp : wanAllocation?.r2WanIp;
      const peerWanIp = rIdx === 0 ? wanAllocation?.r2WanIp : wanAllocation?.r1WanIp;
      const peerRouterName = rIdx === 0 ? r2Name : r1Name;

      const intfBlocks = myLans.map((seg) =>
        [
          `interface GigabitEthernet${seg.routerInterface.replace(/^G/i, '')}`,
          ` description Connected to ${seg.switchName} (${seg.name})`,
          ` ip address ${seg.gwIp} ${seg.subnetMask}`,
          ` no shutdown`,
        ].join('\n')
      );

      if (wanAllocation && myWanIp) {
        intfBlocks.push(
          [
            `interface GigabitEthernet0/0/1`,
            ` description Point-to-Point Routed Link to ${peerRouterName}`,
            ` ip address ${myWanIp} 255.255.255.252`,
            ` no shutdown`,
          ].join('\n')
        );
      }

      let routingCli = `! Directly Connected LAN routing`;
      if (wanAllocation && peerWanIp) {
        if (useOspf) {
          routingCli = [
            `router ospf ${ospfProcess}`,
            ` router-id ${rIdx + 1}.${rIdx + 1}.${rIdx + 1}.${rIdx + 1}`,
            ...myLans.map(
              (seg) =>
                ` passive-interface GigabitEthernet${seg.routerInterface.replace(/^G/i, '')}`
            ),
            ...myLans.map(
              (seg) => ` network ${seg.networkAddress} ${seg.wildcardMask} area ${ospfArea}`
            ),
            ` network ${wanAllocation.networkAddress} 0.0.0.3 area ${ospfArea}`,
          ].join('\n');
        } else if (remoteLans.length > 0) {
          routingCli = remoteLans
            .map((rem) => `ip route ${rem.networkAddress} ${rem.subnetMask} ${peerWanIp}`)
            .join('\n');
        } else {
          routingCli = `ip route 0.0.0.0 0.0.0.0 ${peerWanIp}`;
        }
      }

      const fullConfig = [
        `!`,
        `hostname ${rName}`,
        `no ip domain-lookup`,
        `ip domain-name ${domainName}`,
        `service password-encryption`,
        `enable secret ${enableSecret}`,
        `username ${adminUser} privilege 15 secret ${adminPass}`,
        `banner motd # Authorized Access Only! #`,
        `!`,
        `crypto key generate rsa modulus 2048`,
        `ip ssh version 2`,
        `!`,
        intfBlocks.join('\n!\n'),
        `!`,
        routingCli,
        `!`,
        `line con 0`,
        ` login local`,
        ` exec-timeout 5 0`,
        ` logging synchronous`,
        `line vty 0 4`,
        ` login local`,
        ` transport input ssh`,
        ` exec-timeout 5 0`,
        `!`,
        `end`,
        `write memory`,
      ].join('\n');

      routersList.push({
        name: rName,
        model: 'ISR4321',
        role: rIdx === 0 ? 'Primary Gateway Router' : 'Peer / Branch Router',
        interfaces: [
          ...myLans.map((s) => s.routerInterface),
          ...(wanAllocation ? ['G0/0/1'] : []),
        ],
        notes: `Physical routed interface configuration (${myLans.map((s) => `${s.networkAddress}/${s.prefix}`).join(', ') || 'WAN Peer'})`,
      });

      configs.push({
        deviceName: rName,
        deviceType: 'router',
        role: rIdx === 0 ? 'Primary Gateway Router' : 'Peer / Branch Router',
        fullConfig,
      });
    });

    // Build clean Layer 2 Switch configurations (NO fake VLANs)
    lanSegments.forEach((seg) => {
      const swConfig = [
        `!`,
        `hostname ${seg.switchName}`,
        `no ip domain-lookup`,
        `ip domain-name ${domainName}`,
        `service password-encryption`,
        `enable secret ${enableSecret}`,
        `username ${adminUser} privilege 15 secret ${adminPass}`,
        `banner motd # Authorized Access Only! #`,
        `!`,
        `interface GigabitEthernet0/1`,
        ` description Uplink to ${seg.routerName} ${seg.routerInterface}`,
        ` switchport mode access`,
        ` no shutdown`,
        `!`,
        `interface range FastEthernet0/1 - 24`,
        ` description LAN Access Ports (${seg.name})`,
        ` switchport mode access`,
        ` spanning-tree portfast`,
        ` spanning-tree bpduguard enable`,
        ` no shutdown`,
        `!`,
        `line con 0`,
        ` login local`,
        ` exec-timeout 5 0`,
        ` logging synchronous`,
        `line vty 0 15`,
        ` login local`,
        ` transport input ssh`,
        ` exec-timeout 5 0`,
        `!`,
        `end`,
        `write memory`,
      ].join('\n');

      configs.push({
        deviceName: seg.switchName,
        deviceType: 'switch',
        role: `Layer 2 LAN Switch (${seg.name})`,
        fullConfig: swConfig,
      });
    });

    return {
      summary: `Complete 5-Stage CCNA Architecture for ${pools.map((p) => p.cidr).join('; ')} tailored directly to the topology and scenario without unrequested VLANs.`,
      stage1_topology: {
        summary: `Extracted topology with ${routersList.length} Router(s) (${routersList.map((r) => r.name).join(', ')}), ${switchesList.length} Switch(es) (${switchesList.map((s) => s.name).join(', ')}), and ${endpointsList.length} Endpoint(s) (${endpointsList.map((e) => e.name).join(', ')}). No VLAN segmentation was requested; physical routed interfaces and standard Layer 2 switching are used.`,
        routers: routersList,
        switches: switchesList,
        endpoints: endpointsList,
        connections: connectionsList,
        assumptions: [
          'No VLANs were specified in the diagram or scenario description; configured flat Layer 2 switching (default VLAN 1) and physical router LAN interface(s).',
          'Assigned the first usable IPv4 address (.1) of each LAN block to the router gateway interface.',
        ],
      },
      stage2_addressing: {
        networkBlock: pools.map((p) => p.cidr).join('; '),
        vlsmRationale: `Mapped the provided IPv4 address block(s) (${pools.map((p) => p.cidr).join('; ')}) directly to the topology's physical LAN and router-to-router segments as specified in the scenario, without inventing unrequested department VLANs.`,
        subnetAllocations,
        addressingTable,
      },
      stage3_configs: configs,
      stage4_rationale: {
        subnetAllocationRationale: `Each ";" separated IPv4 block (${pools.map((p) => p.cidr).join('; ')}) was assigned directly to its target network segment: ${lanSegments.map((s) => `${s.networkAddress}/${s.prefix} for ${s.name}`).join(', ')}${wanAllocation ? ` and ${wanAllocation.networkAddress}/30 for the point-to-point link between ${r1Name} and ${r2Name}` : ''}.`,
        routingChoiceRationale: wanAllocation
          ? useOspf
            ? `Dynamic OSPFv2 Area ${ospfArea} configured across ${r1Name} and ${r2Name} with passive-interface on LAN interfaces.`
            : `Static routing (AD = 1) configured between ${r1Name} and ${r2Name} across the ${wanAllocation.networkAddress}/30 link per CCNA 200-301 Volume 1 Chapter 15 guidelines for 2-router point-to-point topologies.`
          : `Single-router topology uses Directly Connected (C, AD = 0) physical interface routing without unnecessary dynamic routing protocol overhead.`,
        securityFeaturesRationale: `Applied CCNA security baseline on all devices: SSHv2 with 2048-bit RSA keys, local AAA secret hashing, console/VTY exec-timeout hardening, and STP PortFast + BPDU Guard on switch access ports.`,
      },
      stage5_verification: {
        layer2Commands: switchesList.map((sw) => ({
          device: sw.name,
          command: 'show interfaces status',
          purpose: 'Verify physical switchport status and default VLAN 1 access assignment',
          expectedOutput: 'G0/1 and active FastEthernet access ports in connected state (VLAN 1)',
        })),
        layer3RoutingCommands: [
          {
            device: r1Name,
            command: 'show ip interface brief',
            purpose: 'Verify physical LAN and WAN interfaces are up/up with correct IPv4 addresses',
            expectedOutput: 'G0/0/0 (and G0/0/1 if WAN present) up/up with assigned IPs',
          },
          {
            device: r1Name,
            command: 'show ip route',
            purpose: 'Verify Directly Connected (C) and Static (S) / OSPF (O) routes in the RIB',
            expectedOutput: 'All allocated IPv4 blocks present in the routing table',
          },
        ],
        pingTests: [
          ...lanSegments.map((seg) => ({
            fromDevice: seg.pcName,
            targetIp: seg.gwIp,
            targetDescription: `${seg.routerName} ${seg.routerInterface} Default Gateway`,
            purpose: `Verify local LAN gateway reachability on ${seg.networkAddress}/${seg.prefix}`,
            expectedOutput: '!!!!! (Success rate is 100 percent 5/5)',
          })),
          ...(wanAllocation
            ? [
                {
                  fromDevice: 'PC1',
                  targetIp: wanAllocation.r2WanIp,
                  targetDescription: `${r2Name} WAN Interface G0/0/1`,
                  purpose: `Verify end-to-end routing across the ${wanAllocation.networkAddress}/30 inter-router link`,
                  expectedOutput: '!!!!! (Success rate is 100 percent 5/5)',
                },
              ]
            : []),
        ],
        checklist: [
          {
            step: 1,
            title: 'Verify Physical Interface & Switchport Status',
            description: 'Confirm router physical interfaces are up/up and switch access ports are connected.',
            commands: ['show ip interface brief', 'show interfaces status'],
          },
          {
            step: 2,
            title: 'Verify Routing Table & End-to-End Ping',
            description: 'Inspect the IPv4 routing table and ping across LAN and WAN interfaces.',
            commands: ['show ip route', `ping ${lanSegments[0]?.gwIp || '192.168.1.1'}`],
          },
        ],
      },
    };
  }

  // ============================================================================
  // CASE B: EXPLICIT VLAN MODE (Only when VLANs are present in scenario or UI)
  // ============================================================================
  const sortedVlans = [...effectiveVlans].sort(
    (a, b) => (Number(b.hostCount) || 10) - (Number(a.hostCount) || 10)
  );

  const subnetAllocations: any[] = [];
  const addressingTable: any[] = [];

  for (const v of sortedVlans) {
    const hostsNeeded = Math.max(2, Number(v.hostCount) || 14);
    const hostBits = Math.max(2, Math.ceil(Math.log2(hostsNeeded + 2)));
    const prefix = Math.min(30, 32 - hostBits);
    const blockSize = Math.pow(2, 32 - prefix);

    const pool =
      pools.find((p) => p.prefix < 30 && p.currentInt + blockSize <= p.endInt) || pools[0];
    const rem = (pool.currentInt - pool.netInt) % blockSize;
    if (rem !== 0) pool.currentInt += blockSize - rem;

    const netIp = intToIp(pool.currentInt);
    const gwIp = intToIp(pool.currentInt + 1);
    const hostIp = intToIp(pool.currentInt + 2);
    const lastIp = intToIp(pool.currentInt + blockSize - 2);
    const bcastIp = intToIp(pool.currentInt + blockSize - 1);
    const mask = prefixToMask(prefix);
    const wildcard = prefixToWildcard(prefix);

    subnetAllocations.push({
      name: v.name || `VLAN_${v.vlanId}`,
      vlanId: Number(v.vlanId) || 10,
      hostsNeeded,
      hostsAllocated: blockSize - 2,
      networkAddress: netIp,
      prefix,
      subnetMask: mask,
      wildcardMask: wildcard,
      usableRange: `${gwIp} - ${lastIp}`,
      broadcastAddress: bcastIp,
    });

    addressingTable.push({
      device: r1Name,
      interface: `G0/0/0.${v.vlanId}`,
      vlanPurpose: `VLAN ${v.vlanId} (${v.name || 'LAN'}) Gateway`,
      ipAddress: gwIp,
      subnetMask: mask,
      prefix,
      usableRange: `${gwIp} - ${lastIp}`,
      defaultGateway: 'N/A',
    });

    addressingTable.push({
      device: `PC_VLAN${v.vlanId}`,
      interface: 'NIC0',
      vlanPurpose: `VLAN ${v.vlanId} (${v.name || 'Endpoint'})`,
      ipAddress: hostIp,
      subnetMask: mask,
      prefix,
      usableRange: `${gwIp} - ${lastIp}`,
      defaultGateway: gwIp,
    });

    pool.currentInt += blockSize;
  }

  let wanAllocation: any = null;
  if (hasMultiRouter) {
    const wanPool = pools.find((p) => p.prefix >= 30) || pools[pools.length - 1];
    const blockSize = 4;
    const rem = (wanPool.currentInt - wanPool.netInt) % blockSize;
    if (rem !== 0) wanPool.currentInt += blockSize - rem;
    const netIp = intToIp(wanPool.currentInt);
    const r1WanIp = intToIp(wanPool.currentInt + 1);
    const r2WanIp = intToIp(wanPool.currentInt + 2);
    const bcastIp = intToIp(wanPool.currentInt + 3);
    wanAllocation = {
      name: `Link_${r1Name}_${r2Name}`,
      hostsNeeded: 2,
      hostsAllocated: 2,
      networkAddress: netIp,
      prefix: 30,
      subnetMask: '255.255.255.252',
      wildcardMask: '0.0.0.3',
      usableRange: `${r1WanIp} - ${r2WanIp}`,
      broadcastAddress: bcastIp,
      r1WanIp,
      r2WanIp,
    };
    subnetAllocations.push(wanAllocation);
    addressingTable.push(
      {
        device: r1Name,
        interface: 'G0/0/1',
        vlanPurpose: `Point-to-Point Link to ${r2Name}`,
        ipAddress: r1WanIp,
        subnetMask: '255.255.255.252',
        prefix: 30,
        usableRange: `${r1WanIp} - ${r2WanIp}`,
        defaultGateway: r2WanIp,
      },
      {
        device: r2Name,
        interface: 'G0/0/1',
        vlanPurpose: `Point-to-Point Link to ${r1Name}`,
        ipAddress: r2WanIp,
        subnetMask: '255.255.255.252',
        prefix: 30,
        usableRange: `${r1WanIp} - ${r2WanIp}`,
        defaultGateway: r1WanIp,
      }
    );
  }

  const subinterfaceLines = subnetAllocations
    .filter((s) => s.vlanId)
    .map((s) => {
      const gwIp = s.usableRange.split(' - ')[0];
      const isNative = Number(s.vlanId) === Number(nativeVlan);
      return [
        `interface GigabitEthernet0/0/0.${s.vlanId}`,
        ` description Gateway for ${s.name} (VLAN ${s.vlanId})`,
        ` encapsulation dot1Q ${s.vlanId}${isNative ? ' native' : ''}`,
        ` ip address ${gwIp} ${s.subnetMask}`,
      ].join('\n');
    })
    .join('\n!\n');

  const r1RoutingBlock = wanAllocation
    ? useOspf
      ? [
          `router ospf ${ospfProcess}`,
          ` router-id 1.1.1.1`,
          ...subnetAllocations
            .filter((s) => s.vlanId)
            .map((s) => ` passive-interface GigabitEthernet0/0/0.${s.vlanId}`),
          ...subnetAllocations.map(
            (s) => ` network ${s.networkAddress} ${s.wildcardMask} area ${ospfArea}`
          ),
        ].join('\n')
      : `! Static default route toward ${r2Name} WAN next-hop\nip route 0.0.0.0 0.0.0.0 ${wanAllocation.r2WanIp}`
    : `! Single-router ROAS architecture: all VLANs are Directly Connected (AD=0)`;

  const r1FullConfig = [
    `!`,
    `hostname ${r1Name}`,
    `no ip domain-lookup`,
    `ip domain-name ${domainName}`,
    `service password-encryption`,
    `enable secret ${enableSecret}`,
    `username ${adminUser} privilege 15 secret ${adminPass}`,
    `banner motd # Authorized Access Only! #`,
    `!`,
    `crypto key generate rsa modulus 2048`,
    `ip ssh version 2`,
    `!`,
    `interface GigabitEthernet0/0/0`,
    ` description 802.1Q Trunk to ${sw1Name} G0/1`,
    ` no ip address`,
    ` no shutdown`,
    `!`,
    subinterfaceLines,
    ...(wanAllocation
      ? [
          `!`,
          `interface GigabitEthernet0/0/1`,
          ` description Point-to-Point Link to ${r2Name}`,
          ` ip address ${wanAllocation.r1WanIp} 255.255.255.252`,
          ` no shutdown`,
        ]
      : []),
    `!`,
    r1RoutingBlock,
    `!`,
    `line con 0`,
    ` login local`,
    ` exec-timeout 5 0`,
    ` logging synchronous`,
    `line vty 0 4`,
    ` login local`,
    ` transport input ssh`,
    ` exec-timeout 5 0`,
    `!`,
    `end`,
    `write memory`,
  ].join('\n');

  const sw1VlanDefs = subnetAllocations
    .filter((s) => s.vlanId)
    .map((s) => `vlan ${s.vlanId}\n name ${String(s.name).replace(/\s+/g, '_')}`)
    .join('\n!\n');

  const sw1FullConfig = [
    `!`,
    `hostname ${sw1Name}`,
    `no ip domain-lookup`,
    `ip domain-name ${domainName}`,
    `service password-encryption`,
    `enable secret ${enableSecret}`,
    `username ${adminUser} privilege 15 secret ${adminPass}`,
    `banner motd # Authorized Access Only! #`,
    `!`,
    sw1VlanDefs,
    `!`,
    `interface GigabitEthernet0/1`,
    ` description 802.1Q Trunk Uplink to ${r1Name} G0/0/0`,
    ` switchport mode trunk`,
    ` switchport trunk native vlan ${nativeVlan}`,
    ` no shutdown`,
    `!`,
    `interface range FastEthernet0/1 - 10`,
    ` description Access Ports`,
    ` switchport mode access`,
    ` switchport access vlan ${subnetAllocations[0]?.vlanId || 10}`,
    ` spanning-tree portfast`,
    ` spanning-tree bpduguard enable`,
    ` no shutdown`,
    `!`,
    `line con 0`,
    ` login local`,
    ` exec-timeout 5 0`,
    ` logging synchronous`,
    `line vty 0 15`,
    ` login local`,
    ` transport input ssh`,
    ` exec-timeout 5 0`,
    `!`,
    `end`,
    `write memory`,
  ].join('\n');

  const configs: any[] = [
    {
      deviceName: r1Name,
      deviceType: 'router',
      role: 'Core / ROAS Gateway Router',
      fullConfig: r1FullConfig,
    },
    {
      deviceName: sw1Name,
      deviceType: 'switch',
      role: 'Access & Distribution Switch',
      fullConfig: sw1FullConfig,
    },
  ];

  if (wanAllocation) {
    const r2RoutingBlock = useOspf
      ? [
          `router ospf ${ospfProcess}`,
          ` router-id 2.2.2.2`,
          ` network ${wanAllocation.networkAddress} 0.0.0.3 area ${ospfArea}`,
        ].join('\n')
      : [
          ...subnetAllocations
            .filter((s) => s.vlanId)
            .map(
              (s) =>
                `ip route ${s.networkAddress} ${s.subnetMask} ${wanAllocation.r1WanIp}`
            ),
        ].join('\n');

    const r2FullConfig = [
      `!`,
      `hostname ${r2Name}`,
      `no ip domain-lookup`,
      `ip domain-name ${domainName}`,
      `service password-encryption`,
      `enable secret ${enableSecret}`,
      `username ${adminUser} privilege 15 secret ${adminPass}`,
      `banner motd # Authorized Access Only! #`,
      `!`,
      `crypto key generate rsa modulus 2048`,
      `ip ssh version 2`,
      `!`,
      `interface GigabitEthernet0/0/1`,
      ` description Point-to-Point Link to ${r1Name}`,
      ` ip address ${wanAllocation.r2WanIp} 255.255.255.252`,
      ` no shutdown`,
      `!`,
      r2RoutingBlock,
      `!`,
      `line con 0`,
      ` login local`,
      ` exec-timeout 5 0`,
      ` logging synchronous`,
      `line vty 0 4`,
      ` login local`,
      ` transport input ssh`,
      ` exec-timeout 5 0`,
      `!`,
      `end`,
      `write memory`,
    ].join('\n');

    configs.push({
      deviceName: r2Name,
      deviceType: 'router',
      role: 'WAN Edge / Branch Router',
      fullConfig: r2FullConfig,
    });
  }

  return {
    summary: `Complete 5-Stage CCNA Architecture synthesized across ${pools.map((p) => p.cidr).join('; ')}.`,
    stage1_topology: {
      summary: `Extracted CCNA topology with ${wanAllocation ? `2 Routers (${r1Name}, ${r2Name})` : `1 Core Router (${r1Name})`}, 1 L2 Switch (${sw1Name}), and requested VLAN endpoints.`,
      routers: [
        {
          name: r1Name,
          model: 'ISR4321',
          role: 'Core Router-on-a-Stick Gateway',
          interfaces: wanAllocation ? ['G0/0/0', 'G0/0/1'] : ['G0/0/0'],
          notes: 'Handles 802.1Q inter-VLAN subinterfaces and WAN routing',
        },
        ...(wanAllocation
          ? [
              {
                name: r2Name,
                model: 'ISR4321',
                role: 'Branch / WAN Edge Router',
                interfaces: ['G0/0/1'],
                notes: `Terminates point-to-point /30 link from ${r1Name}`,
              },
            ]
          : []),
      ],
      switches: [
        {
          name: sw1Name,
          model: 'Catalyst 2960',
          role: 'Layer 2 Access Switch',
          ports: ['G0/1', 'Fa0/1-24'],
          notes: `802.1Q trunk on G0/1 (Native VLAN ${nativeVlan})`,
        },
      ],
      endpoints: subnetAllocations
        .filter((s) => s.vlanId)
        .map((s) => ({
          name: `PC_VLAN${s.vlanId}`,
          type: 'pc',
          vlan: String(s.vlanId),
          assignedIp: intToIp(ipToInt(s.networkAddress.split('.').map(Number)) + 2),
          defaultGateway: s.usableRange.split(' - ')[0],
        })),
      connections: [
        {
          id: 'link-1',
          fromDevice: r1Name,
          fromInterface: 'G0/0/0',
          toDevice: sw1Name,
          toInterface: 'G0/1',
          linkType: 'Trunk',
          vlan: 'All VLANs',
          notes: `802.1Q Trunk (Native VLAN ${nativeVlan})`,
        },
        ...(wanAllocation
          ? [
              {
                id: 'link-2',
                fromDevice: r1Name,
                fromInterface: 'G0/0/1',
                toDevice: r2Name,
                toInterface: 'G0/0/1',
                linkType: 'WAN',
                vlan: 'Routed /30',
                notes: `Point-to-point link (${wanAllocation.networkAddress}/30)`,
              },
            ]
          : []),
      ],
      assumptions: [
        'Assigned first usable IP in each VLSM block to the router subinterface gateway.',
      ],
    },
    stage2_addressing: {
      networkBlock: pools.map((p) => p.cidr).join('; '),
      vlsmRationale: `Allocated subnets across ${pools.map((p) => p.cidr).join('; ')} ordered from largest host requirement to smallest with zero bit overlap.`,
      subnetAllocations,
      addressingTable,
    },
    stage3_configs: configs,
    stage4_rationale: {
      subnetAllocationRationale: `Subnets were carved using deterministic bitwise VLSM from ${pools.map((p) => p.cidr).join('; ')} according to descending host requirements and scenario block mappings.`,
      routingChoiceRationale: wanAllocation
        ? useOspf
          ? 'Dynamic OSPFv2 Area 0 configured across router links with passive-interface on all LAN subinterfaces per CCNA 200-301 best practices.'
          : 'Static and default routes (AD = 1) configured across the point-to-point stub WAN link per CCNA OCG Vol 1, Ch. 15.'
        : 'Single-router Router-on-a-Stick (ROAS) topology uses Directly Connected (C, AD = 0) 802.1Q subinterfaces without unnecessary dynamic routing overhead.',
      securityFeaturesRationale: `SSHv2 with 2048-bit RSA keys, local AAA secret hashing, PortFast + BPDU Guard on access ports, and Native VLAN ${nativeVlan} trunk hardening.`,
    },
    stage5_verification: {
      layer2Commands: [
        {
          device: sw1Name,
          command: 'show vlan brief',
          purpose: 'Verify VLAN creation and access port membership',
          expectedOutput: 'Active VLANs and assigned access ports listed in active state',
        },
        {
          device: sw1Name,
          command: 'show interfaces trunk',
          purpose: 'Confirm 802.1Q trunk encapsulation and Native VLAN alignment',
          expectedOutput: `G0/1 trunking with Native VLAN ${nativeVlan}`,
        },
      ],
      layer3RoutingCommands: [
        {
          device: r1Name,
          command: 'show ip interface brief',
          purpose: 'Verify subinterfaces and physical links are up/up',
          expectedOutput: 'G0/0/0 subinterfaces up/up with assigned gateway IPs',
        },
        {
          device: r1Name,
          command: 'show ip route',
          purpose: 'Inspect RIB for Directly Connected, Static, or OSPF routes',
          expectedOutput: 'Connected (C), Local (L), and configured static/OSPF routes installed',
        },
      ],
      pingTests: subnetAllocations
        .filter((s) => s.vlanId)
        .map((s) => ({
          fromDevice: `PC_VLAN${s.vlanId}`,
          targetIp: s.usableRange.split(' - ')[0],
          targetDescription: `${r1Name} Subinterface G0/0/0.${s.vlanId} Default Gateway`,
          purpose: `Confirm inter-VLAN gateway reachability for ${s.name}`,
          expectedOutput: '!!!!! (Success rate is 100 percent 5/5)',
        })),
      checklist: [
        {
          step: 1,
          title: 'Verify Layer 2 Trunk & VLAN State',
          description: `Confirm 802.1Q trunking on ${sw1Name} G0/1 and verify Native VLAN match.`,
          commands: ['show vlan brief', 'show interfaces trunk'],
        },
        {
          step: 2,
          title: 'Verify Layer 3 Subinterfaces & Routing Table',
          description: `Check IP addressing on ${r1Name} subinterfaces and inspect routing table.`,
          commands: ['show ip interface brief', 'show ip route'],
        },
      ],
    },
  };
}

// Repair truncated or slightly malformed JSON strings
function repairTruncatedJson(input: string): string {
  let s = input.trim();

  // Remove trailing comma at the very end if present
  s = s.replace(/,\s*$/, '');

  // Track open strings, brackets, and braces
  let inString = false;
  let escaped = false;
  const stack: string[] = [];

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (ch === '{') stack.push('}');
      else if (ch === '[') stack.push(']');
      else if (ch === '}' || ch === ']') {
        if (stack.length > 0 && stack[stack.length - 1] === ch) {
          stack.pop();
        }
      }
    }
  }

  if (inString) {
    s += '"';
  }

  // Clean any dangling colon or comma before closing stack
  s = s.replace(/:\s*$/, ': null').replace(/,\s*$/, '');

  while (stack.length > 0) {
    s += stack.pop();
  }

  return s;
}

// Robust JSON extractor that handles markdown wrappers, trailing commas, and truncated endings
function extractAndParseJson(rawText: string): any {
  if (!rawText || !rawText.trim()) {
    throw new Error('Received empty response from Gemini model.');
  }

  const trimmed = rawText.trim();

  // 1. Direct JSON parse
  try {
    return JSON.parse(trimmed);
  } catch {}

  // 2. Strip markdown fences ```json ... ```
  let cleaned = trimmed;
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
    try {
      return JSON.parse(cleaned);
    } catch {}
  }

  // 3. Find outermost JSON object {...}
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const jsonSub = cleaned.substring(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(jsonSub);
    } catch {
      const sanitized = jsonSub.replace(/,\s*([\]}])/g, '$1');
      try {
        return JSON.parse(sanitized);
      } catch {}
    }
  }

  // 4. Attempt structural JSON auto-repair if truncated
  if (firstBrace !== -1) {
    const fromFirstBrace = cleaned.substring(firstBrace).replace(/,\s*([\]}])/g, '$1');
    const repaired = repairTruncatedJson(fromFirstBrace);
    try {
      return JSON.parse(repaired);
    } catch (err) {
      console.error('Failed to parse repaired JSON:', (err as Error).message);
    }
  }

  throw new Error('Could not parse valid CCNA architecture JSON from model response.');
}

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Setup Vite middlewares in development or serve static in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Cisco IOS Architect Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
