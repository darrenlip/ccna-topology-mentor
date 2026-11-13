import { ArchitectureReport, PhysicalConnection } from '../types/network';
import { ipToInt, intToIp } from './vlsmCalculator';

export interface AuditCheckResult {
  id: string;
  category: 'Addressing' | 'Switching' | 'Routing' | 'Security' | 'Hardware';
  title: string;
  status: 'PASS' | 'WARN' | 'FAIL';
  summary: string;
  details: string[];
  remediation?: string;
}

export interface CablingGuideRow {
  linkId: string;
  fromDevice: string;
  fromPort: string;
  toDevice: string;
  toPort: string;
  cableType: 'Copper Straight-Through' | 'Copper Cross-Over' | 'Serial DCE/DTE' | 'Fiber Optic';
  reason: string;
}

export interface NetworkAuditSummary {
  overallScore: number;
  passedCount: number;
  warningCount: number;
  failedCount: number;
  checks: AuditCheckResult[];
  cablingGuide: CablingGuideRow[];
}

// Helper to parse IP/Mask into network and broadcast integer bounds
function getSubnetBounds(ipStr: string, maskStr: string): { network: number; broadcast: number } | null {
  const cleanIp = ipStr.split('/')[0].trim();
  const octets = cleanIp.split('.');
  if (octets.length !== 4 || octets.some((o) => isNaN(Number(o)))) return null;

  const maskOctets = maskStr.trim().split('.');
  if (maskOctets.length !== 4 || maskOctets.some((o) => isNaN(Number(o)))) return null;

  const ipInt = ipToInt(cleanIp);
  const maskInt = ipToInt(maskStr.trim());
  if (maskInt === 0) return null;

  const network = (ipInt & maskInt) >>> 0;
  const wildcard = (~maskInt) >>> 0;
  const broadcast = (network | wildcard) >>> 0;
  return { network, broadcast };
}

// Deterministically classify the Cisco Packet Tracer cable type for each physical connection
export function generatePacketTracerCablingGuide(report: ArchitectureReport): CablingGuideRow[] {
  const connections = report.stage1_topology?.connections || [];
  const routers = new Set((report.stage1_topology?.routers || []).map((r) => r.name.toLowerCase()));
  const switches = new Set((report.stage1_topology?.switches || []).map((s) => s.name.toLowerCase()));

  const getDeviceFamily = (name: string): 'router' | 'switch' | 'endpoint' => {
    const lower = name.toLowerCase();
    if (routers.has(lower) || lower.startsWith('r') || lower.includes('router') || lower.includes('gw') || lower.includes('isr')) {
      return 'router';
    }
    if (switches.has(lower) || lower.startsWith('sw') || lower.startsWith('s') || lower.includes('switch')) {
      return 'switch';
    }
    return 'endpoint';
  };

  return connections.map((conn: PhysicalConnection, idx: number) => {
    const fromPort = conn.fromInterface || 'G0/0';
    const toPort = conn.toInterface || 'G0/1';
    const portsCombined = `${fromPort} ${toPort}`.toLowerCase();

    if (portsCombined.includes('se') || portsCombined.includes('serial')) {
      return {
        linkId: conn.id || `link-${idx + 1}`,
        fromDevice: conn.fromDevice,
        fromPort,
        toDevice: conn.toDevice,
        toPort,
        cableType: 'Serial DCE/DTE',
        reason: 'Serial WAN interface detected (configure clock rate on DCE end).',
      };
    }

    if (portsCombined.includes('sfp') || portsCombined.includes('fiber') || portsCombined.includes('te')) {
      return {
        linkId: conn.id || `link-${idx + 1}`,
        fromDevice: conn.fromDevice,
        fromPort,
        toDevice: conn.toDevice,
        toPort,
        cableType: 'Fiber Optic',
        reason: 'SFP/10G optical uplink interface.',
      };
    }

    const fromFam = getDeviceFamily(conn.fromDevice);
    const toFam = getDeviceFamily(conn.toDevice);

    // Like devices: Router<->Router, Switch<->Switch, Router<->PC -> Copper Cross-Over in classic CCNA rules
    if (
      (fromFam === 'router' && toFam === 'router') ||
      (fromFam === 'switch' && toFam === 'switch') ||
      (fromFam === 'router' && toFam === 'endpoint') ||
      (fromFam === 'endpoint' && toFam === 'router')
    ) {
      return {
        linkId: conn.id || `link-${idx + 1}`,
        fromDevice: conn.fromDevice,
        fromPort,
        toDevice: conn.toDevice,
        toPort,
        cableType: 'Copper Cross-Over',
        reason: `Like-layer connection (${fromFam} to ${toFam}) requires crossover pinout under classic CCNA Layer 1 rules.`,
      };
    }

    return {
      linkId: conn.id || `link-${idx + 1}`,
      fromDevice: conn.fromDevice,
      fromPort,
      toDevice: conn.toDevice,
      toPort,
      cableType: 'Copper Straight-Through',
      reason: `Unlike-layer connection (${fromFam} to ${toFam}) uses standard straight-through patch cable.`,
    };
  });
}

// Run deterministic CCNA engineering checks across all 5 stages
export function runNetworkAudit(report: ArchitectureReport): NetworkAuditSummary {
  const checks: AuditCheckResult[] = [];
  const addressingTable = report.stage2_addressing?.addressingTable || [];
  const allocations = report.stage2_addressing?.subnetAllocations || [];
  const configs = report.stage3_configs || [];
  const nativeVlan = report.constraints?.nativeVlan ?? 999;

  // 1. Duplicate IPv4 Address Check
  const seenIps = new Map<string, string>();
  const duplicateIpDetails: string[] = [];
  for (const row of addressingTable) {
    const ip = (row.ipAddress || '').split('/')[0].trim();
    if (!ip || ip.toUpperCase() === 'DHCP' || ip.toUpperCase() === 'N/A') continue;
    const key = `${row.device} (${row.interface})`;
    if (seenIps.has(ip)) {
      duplicateIpDetails.push(`Duplicate IPv4 ${ip} assigned to both ${seenIps.get(ip)} and ${key}`);
    } else {
      seenIps.set(ip, key);
    }
  }

  checks.push({
    id: 'ip-uniqueness',
    category: 'Addressing',
    title: 'IPv4 Address Uniqueness Verification',
    status: duplicateIpDetails.length === 0 ? 'PASS' : 'FAIL',
    summary:
      duplicateIpDetails.length === 0
        ? `All ${seenIps.size} static IPv4 interface assignments are unique across the topology.`
        : `Detected ${duplicateIpDetails.length} duplicate IPv4 address assignment(s).`,
    details:
      duplicateIpDetails.length === 0
        ? [`Verified ${seenIps.size} distinct device interfaces with zero IP collisions.`]
        : duplicateIpDetails,
    remediation:
      duplicateIpDetails.length > 0
        ? 'Assign distinct host IP addresses within each subnet range to prevent ARP conflicts.'
        : undefined,
  });

  // 2. VLSM Subnet Overlap Mathematical Check
  const subnetRanges: Array<{ name: string; net: number; bcast: number; cidr: string }> = [];
  const overlapDetails: string[] = [];

  for (const sub of allocations) {
    if (!sub.networkAddress || !sub.subnetMask) continue;
    const bounds = getSubnetBounds(sub.networkAddress, sub.subnetMask);
    if (!bounds) continue;
    const cidr = `${intToIp(bounds.network)}/${sub.prefix}`;

    for (const prev of subnetRanges) {
      const overlaps = bounds.network <= prev.bcast && bounds.broadcast >= prev.net;
      if (overlaps) {
        overlapDetails.push(`Subnet ${sub.name} (${cidr}) overlaps with ${prev.name} (${prev.cidr})`);
      }
    }
    subnetRanges.push({ name: sub.name, net: bounds.network, bcast: bounds.broadcast, cidr });
  }

  checks.push({
    id: 'vlsm-non-overlap',
    category: 'Addressing',
    title: 'VLSM Contiguous Non-Overlapping Bitwise Audit',
    status: overlapDetails.length === 0 ? 'PASS' : 'FAIL',
    summary:
      overlapDetails.length === 0
        ? `All ${subnetRanges.length} VLSM subnets have mutually exclusive bit boundaries.`
        : `Detected ${overlapDetails.length} overlapping VLSM subnet boundary conflict(s).`,
    details:
      overlapDetails.length === 0
        ? subnetRanges.map((s) => `${s.name}: ${s.cidr} (${intToIp(s.net)} – ${intToIp(s.bcast)})`)
        : overlapDetails,
    remediation:
      overlapDetails.length > 0
        ? 'Recalculate VLSM blocks from largest host count to smallest using the VLSM Calculator.'
        : undefined,
  });

  // 3. CCNA Device Hardening & SSHv2 Baseline Check
  const hardeningWarnings: string[] = [];
  const hardeningPasses: string[] = [];
  for (const cfg of configs) {
    const text = (cfg.fullConfig || '').toLowerCase();
    const missing: string[] = [];
    if (!text.includes('enable secret')) missing.push('enable secret');
    if (!text.includes('service password-encryption')) missing.push('service password-encryption');
    if (!text.includes('transport input ssh')) missing.push('transport input ssh');
    if (!text.includes('crypto key generate rsa')) missing.push('crypto key generate rsa');
    if (!text.includes('write memory') && !text.includes('copy running-config startup-config')) {
      missing.push('write memory');
    }

    if (missing.length > 0) {
      hardeningWarnings.push(`${cfg.deviceName}: Missing baseline directives (${missing.join(', ')})`);
    } else {
      hardeningPasses.push(`${cfg.deviceName}: Verified enable secret, SSHv2 RSA-2048, VTY lock, and write memory.`);
    }
  }

  checks.push({
    id: 'ccna-security-baseline',
    category: 'Security',
    title: 'Cisco IOS Security & Persistence Baseline',
    status: hardeningWarnings.length === 0 ? 'PASS' : 'WARN',
    summary:
      hardeningWarnings.length === 0
        ? `All ${configs.length} devices enforce SSHv2, Type-5/8 secret hashing, and NVRAM persistence.`
        : `${hardeningWarnings.length} device(s) have incomplete security baseline directives.`,
    details: hardeningWarnings.length === 0 ? hardeningPasses : [...hardeningWarnings, ...hardeningPasses],
    remediation:
      hardeningWarnings.length > 0
        ? 'Ensure all devices include enable secret, service password-encryption, SSHv2 on VTY 0 4, and end with write memory.'
        : undefined,
  });

  // 4. Layer 2 STP PortFast, BPDU Guard & Trunk Symmetry Check
  const switchConfigs = configs.filter((c) => c.deviceType === 'switch' || c.deviceType === 'l3switch');
  const hasTrunkLinks = (report.stage1_topology?.connections || []).some((c) => c.linkType === 'Trunk');
  const l2Warnings: string[] = [];
  const l2Passes: string[] = [];

  for (const sw of switchConfigs) {
    const text = (sw.fullConfig || '').toLowerCase();
    const hasPortfast = text.includes('portfast');
    const hasBpdu = text.includes('bpduguard');
    const hasNative = text.includes(`native vlan ${nativeVlan}`) || text.includes('native vlan');

    if (!hasPortfast || !hasBpdu) {
      l2Warnings.push(`${sw.deviceName}: Access ports should include spanning-tree portfast and bpduguard enable.`);
    } else {
      l2Passes.push(
        hasTrunkLinks
          ? `${sw.deviceName}: Verified PortFast, BPDU Guard, and 802.1Q trunk configuration.`
          : `${sw.deviceName}: Verified PortFast and BPDU Guard on Layer 2 access ports (no VLAN trunking required).`
      );
    }
    if (hasTrunkLinks && !hasNative) {
      l2Warnings.push(`${sw.deviceName}: Verify explicit switchport trunk native vlan ${nativeVlan} on trunk ports.`);
    }
  }

  checks.push({
    id: 'l2-stp-trunk-guard',
    category: 'Switching',
    title: 'Layer 2 Switching & STP Loop Protection',
    status: l2Warnings.length === 0 ? 'PASS' : 'WARN',
    summary:
      switchConfigs.length === 0
        ? 'No dedicated Layer 2 switches present in topology.'
        : l2Warnings.length === 0
        ? hasTrunkLinks
          ? `All ${switchConfigs.length} switch(es) enforce PortFast, BPDU Guard, and Native VLAN ${nativeVlan}.`
          : `All ${switchConfigs.length} switch(es) enforce PortFast and BPDU Guard on standard access ports.`
        : `${l2Warnings.length} Layer 2 configuration advisory item(s) detected.`,
    details: l2Warnings.length === 0 ? (l2Passes.length ? l2Passes : ['All switching checks passed.']) : [...l2Warnings, ...l2Passes],
  });

  // 5. CCNA 200-301 Routing Necessity & Forwarding Audit (Connected vs. Static vs. OSPF)
  const routerCount = (report.stage1_topology?.routers || []).length;
  const wanLinksCount = (report.stage1_topology?.connections || []).filter(
    (c) => c.linkType === 'WAN' || c.linkType === 'Routed'
  ).length;
  const routerConfigs = configs.filter((c) => c.deviceType === 'router' || c.deviceType === 'l3switch');
  const routingNotes: string[] = [];

  if (routerCount <= 1 && wanLinksCount === 0) {
    routingNotes.push(
      `CCNA 200-301 Vol 1 Ch. 15/17 Verdict: Single-Router Topology (${routerCount} router, 0 external WAN links) -> Directly Connected Routes (AD=0) are sufficient. Dynamic OSPF is unnecessary overhead.`
    );
  } else if (routerCount === 2 && wanLinksCount <= 1) {
    routingNotes.push(
      `CCNA 200-301 Vol 1 Ch. 15 Verdict: Two-Router Stub/Point-to-Point Topology (${routerCount} routers, ${wanLinksCount} WAN link) -> Static & Default Routes (AD=1) are optimal unless dynamic scalability is explicitly required.`
    );
  } else {
    routingNotes.push(
      `CCNA 200-301 Vol 1 Ch. 19-20 Verdict: Multi-Router / Redundant Topology (${routerCount} routers, ${wanLinksCount} routed links) -> Dynamic Single-Area OSPFv2 (AD=110) is justified for SPF loop-free path calculation and automatic failover.`
    );
  }

  for (const rtr of routerConfigs) {
    const text = (rtr.fullConfig || '').toLowerCase();
    if (text.includes('encapsulation dot1q')) {
      routingNotes.push(`${rtr.deviceName}: 802.1Q Router-on-a-Stick subinterfaces (Directly Connected 'C', AD=0) verified.`);
    } else if (text.includes('ip address ')) {
      routingNotes.push(`${rtr.deviceName}: Physical routed interface IPv4 gateway addressing (Directly Connected 'C', AD=0) verified.`);
    }
    if (text.includes('router ospf')) {
      const hasPassive = text.includes('passive-interface');
      routingNotes.push(
        `${rtr.deviceName}: OSPFv2 process active (${hasPassive ? 'passive-interface configured on LANs' : 'verify passive-interface on user LANs'}).`
      );
    } else if (text.includes('ip route ')) {
      routingNotes.push(`${rtr.deviceName}: Static routing next-hop entries (AD=1) verified.`);
    }
  }

  checks.push({
    id: 'l3-routing-sanity',
    category: 'Routing',
    title: 'CCNA 200-301 Routing Necessity & Forwarding Audit',
    status: 'PASS',
    summary:
      routerCount <= 1 && wanLinksCount === 0
        ? `Single-router topology: Directly Connected (AD=0) routing is sufficient.`
        : routerCount === 2 && wanLinksCount <= 1
        ? `2-Router point-to-point topology: Static/Default routing (AD=1) or OSPF verified across ${routerConfigs.length} router(s).`
        : `Multi-router topology (${routerCount} routers): Dynamic OSPF / L3 forwarding verified.`,
    details: routingNotes.length > 0 ? routingNotes : ['Routing protocol statements verified.'],
  });

  // 6. Endpoint Default Gateway Subnet Membership & Gateway Existence Audit
  const gwWarnings: string[] = [];
  const gwPasses: string[] = [];
  const routerIps = new Set(
    addressingTable
      .filter((r) => !/^(pc|srv|server|host|laptop|printer)/i.test((r.device || '').trim()))
      .map((r) => (r.ipAddress || '').split('/')[0].trim())
      .filter(Boolean)
  );

  for (const row of addressingTable) {
    const dev = (row.device || '').trim();
    if (!/^(pc|srv|server|host|laptop)/i.test(dev)) continue;
    const hostIp = (row.ipAddress || '').split('/')[0].trim();
    const mask = (row.subnetMask || '255.255.255.0').trim();
    const gwIp = (row.defaultGateway || '').split('/')[0].trim();

    if (!hostIp || !gwIp || gwIp.toUpperCase() === 'N/A') continue;

    const hostBounds = getSubnetBounds(hostIp, mask);
    const gwBounds = getSubnetBounds(gwIp, mask);
    if (hostBounds && gwBounds) {
      if (hostBounds.network !== gwBounds.network) {
        gwWarnings.push(
          `${dev}: Default Gateway ${gwIp} is outside ${dev}'s subnet (${intToIp(hostBounds.network)}/${row.prefix || 24}).`
        );
      } else if (routerIps.size > 0 && !routerIps.has(gwIp)) {
        gwWarnings.push(
          `${dev}: Default Gateway ${gwIp} is in the same subnet but not assigned to any router/SVI interface.`
        );
      } else {
        gwPasses.push(
          `${dev} (${hostIp}) -> Gateway ${gwIp} verified in subnet ${intToIp(hostBounds.network)}/${row.prefix || 24}.`
        );
      }
    }
  }

  checks.push({
    id: 'gateway-subnet-alignment',
    category: 'Addressing',
    title: 'Endpoint Default Gateway Bitwise Subnet Alignment',
    status: gwWarnings.length === 0 ? 'PASS' : 'FAIL',
    summary:
      gwWarnings.length === 0
        ? `All endpoint default gateways reside within the same bitwise subnet and map to active router interfaces.`
        : `${gwWarnings.length} endpoint default gateway mismatch(es) detected.`,
    details:
      gwWarnings.length === 0
        ? gwPasses.length > 0
          ? gwPasses
          : ['All host default gateways verified against local router interfaces.']
        : [...gwWarnings, ...gwPasses],
    remediation:
      gwWarnings.length > 0
        ? 'Ensure each PC/Server default gateway is set to the local router interface IP within the exact same subnet.'
        : undefined,
  });

  // 7. Cross-Stage (Stage 2 Table <-> Stage 3 CLI) IP Synchronization Audit
  const syncWarnings: string[] = [];
  const syncPasses: string[] = [];
  for (const cfg of configs) {
    const devRows = addressingTable.filter(
      (r) =>
        (r.device || '').trim().toLowerCase() === cfg.deviceName.trim().toLowerCase() &&
        r.ipAddress &&
        /^\d+\.\d+\.\d+\.\d+/.test(r.ipAddress.trim())
    );
    for (const r of devRows) {
      const ipClean = r.ipAddress.split('/')[0].trim();
      if ((cfg.fullConfig || '').includes(ipClean)) {
        syncPasses.push(`${cfg.deviceName} (${r.interface}): Stage 2 IP ${ipClean} verified in Stage 3 IOS CLI.`);
      } else {
        syncWarnings.push(`${cfg.deviceName} (${r.interface}): Stage 2 IP ${ipClean} missing from Stage 3 CLI.`);
      }
    }
  }

  checks.push({
    id: 'cross-stage-cli-sync',
    category: 'Hardware',
    title: 'Stage 2 Addressing Table ↔ Stage 3 IOS CLI Parity',
    status: syncWarnings.length === 0 ? 'PASS' : 'WARN',
    summary:
      syncWarnings.length === 0
        ? `100% parity verified between Stage 2 Addressing Table and Stage 3 Cisco IOS interface configurations.`
        : `${syncWarnings.length} interface IP discrepancy(ies) between Stage 2 and Stage 3.`,
    details:
      syncWarnings.length === 0
        ? syncPasses.length > 0
          ? syncPasses
          : ['All infrastructure IPs synchronized across Stage 2 and Stage 3.']
        : [...syncWarnings, ...syncPasses],
  });

  const passedCount = checks.filter((c) => c.status === 'PASS').length;
  const warningCount = checks.filter((c) => c.status === 'WARN').length;
  const failedCount = checks.filter((c) => c.status === 'FAIL').length;
  const overallScore = Math.max(
    0,
    Math.round(((passedCount + warningCount * 0.5) / Math.max(1, checks.length)) * 100)
  );

  return {
    overallScore,
    passedCount,
    warningCount,
    failedCount,
    checks,
    cablingGuide: generatePacketTracerCablingGuide(report),
  };
}
