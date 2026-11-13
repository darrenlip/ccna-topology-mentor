import { ArchitectureReport, DeviceConfig } from '../types/network';

export interface ParsedDeviceInterface {
  name: string; // Full Cisco name e.g. GigabitEthernet0/0/0
  shortName: string; // Short name e.g. Gi0/0/0
  ipAddress: string; // e.g. 192.168.1.1 or 'unassigned'
  subnetMask: string; // e.g. 255.255.255.0 or ''
  prefix: number; // e.g. 24
  status: 'up' | 'administratively down';
  protocol: 'up' | 'down';
  method: 'manual' | 'unset' | 'NVRAM';
  description?: string;
  vlanId?: number;
  isTrunk?: boolean;
  isSubinterface?: boolean;
  connectedTo?: string;
}

const ipToInt = (ipStr: string): number | null => {
  const parts = (ipStr || '').trim().split('.').map((n) => parseInt(n, 10));
  if (parts.length !== 4 || parts.some((n) => isNaN(n) || n < 0 || n > 255)) return null;
  return (((parts[0] << 24) >>> 0) + ((parts[1] << 16) >>> 0) + ((parts[2] << 8) >>> 0) + (parts[3] >>> 0)) >>> 0;
};

const intToIp = (int: number): string =>
  [(int >>> 24) & 255, (int >>> 16) & 255, (int >>> 8) & 255, int & 255].join('.');

const maskToPrefix = (maskStr: string): number => {
  const maskInt = ipToInt(maskStr);
  if (maskInt === null) return 24;
  let bits = 0;
  let m = maskInt;
  while (m & 0x80000000) {
    bits++;
    m = (m << 1) >>> 0;
  }
  return bits || 24;
};

const prefixToMask = (prefix: number): string => {
  const p = Math.min(32, Math.max(0, prefix));
  if (p === 0) return '0.0.0.0';
  return intToIp((0xffffffff << (32 - p)) >>> 0);
};

const computeNetworkAddress = (ipStr: string, prefix: number): string => {
  const ipInt = ipToInt(ipStr);
  if (ipInt === null) return ipStr;
  const maskInt = pToMaskInt(prefix);
  return intToIp((ipInt & maskInt) >>> 0);
};

const pToMaskInt = (prefix: number): number => {
  const p = Math.min(32, Math.max(0, prefix));
  return p === 0 ? 0 : (0xffffffff << (32 - p)) >>> 0;
};

/**
 * Expands abbreviated Cisco interface names (e.g. G0/0/0, Gi0/1, Fa0/1, S0/0/0)
 * into full standard Cisco IOS interface names (e.g. GigabitEthernet0/0/0).
 */
export function expandCiscoInterfaceName(raw: string): string {
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

  const teMatch = s.match(/^(?:te|ten)\s*([\d\/.\-]+)/i);
  if (teMatch) return `TenGigabitEthernet${teMatch[1]}`;

  const seMatch = s.match(/^(?:se|ser|s)\s*([\d\/.\-]+)/i);
  if (seMatch && s.includes('/')) return `Serial${seMatch[1]}`;

  const loMatch = s.match(/^(?:lo|loop)\s*(\d+)/i);
  if (loMatch) return `Loopback${loMatch[1]}`;

  const vlMatch = s.match(/^(?:vl|vlan)\s*(\d+)/i);
  if (vlMatch) return `Vlan${vlMatch[1]}`;

  return s;
}

/**
 * Converts a full Cisco interface name into compact CLI form (e.g. Gi0/1, Fa0/1)
 */
export function abbreviateCiscoInterfaceName(raw: string): string {
  const full = expandCiscoInterfaceName(raw);
  return full
    .replace(/^GigabitEthernet/i, 'Gi')
    .replace(/^FastEthernet/i, 'Fa')
    .replace(/^TenGigabitEthernet/i, 'Te')
    .replace(/^Serial/i, 'Se')
    .replace(/^Loopback/i, 'Lo');
}

/**
 * Normalizes single-line '!' separated (with or without spaces) or unformatted Cisco IOS scripts
 * into clean, properly indented multi-line Cisco IOS configuration syntax.
 */
export function formatCiscoCliScript(rawConfig: string): string {
  if (!rawConfig || !rawConfig.trim()) return '';

  // 1. Normalize line endings and unescape literal \n
  let s = rawConfig
    .replace(/\r\n/g, '\n')
    .replace(/\\n/g, '\n')
    .trim();

  // 2. Protect banner motd delimiters (#...# or ^C...^C) so '!' inside banners is never split
  const banners: string[] = [];
  s = s.replace(/banner\s+motd\s+(#|\^C|\$)([\s\S]*?)\1/gi, (match) => {
    const idx = banners.length;
    banners.push(match.replace(/\s*\n\s*/g, ' '));
    return `__BANNER_PLACEHOLDER_${idx}__`;
  });

  // Protect full-line descriptive comments like "! Hardening Section"
  const commentHeaders: string[] = [];
  s = s.replace(/^\s*!\s+([A-Za-z0-9][^\n!]*)$/gm, (_, text) => {
    const idx = commentHeaders.length;
    commentHeaders.push(`! ${text.trim()}`);
    return `\n__COMMENT_PLACEHOLDER_${idx}__\n`;
  });

  // 3. Split ANY remaining '!' (even without spaces like "hostname R1!service password-encryption!no shutdown!interface...")
  s = s.replace(/\s*!+\s*/g, '\n');

  // 4. Split concatenated top-level and sub-mode IOS commands if multiple commands share a line.
  // Use negative lookbehind (?<!\bno) before 'shutdown' and 'ip address' so 'no shutdown' and 'no ip address' NEVER split!
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
      '__COMMENT_PLACEHOLDER_\\d+__|' +
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
    const trimmed = rawLines[i].trim();
    if (!trimmed) continue;

    // Repair if an earlier pass ever split "no" and "shutdown" across adjacent lines
    if (trimmed.toLowerCase() === 'no' && i + 1 < rawLines.length) {
      const nextTrimmed = rawLines[i + 1].trim();
      if (/^(shutdown|ip\s+address|ip\s+domain-lookup)\b/i.test(nextTrimmed)) {
        splitLines.push(`no ${nextTrimmed}`);
        i++;
        continue;
      }
    }

    const parts = trimmed.split(commandBoundaryRegex);
    for (const p of parts) {
      const cleanPart = p.trim();
      if (cleanPart) splitLines.push(cleanPart);
    }
  }

  // 5. Restore banners/comments, insert clean '!' separators at logical section boundaries, and indent sub-mode commands
  let inSubMode = false;
  const formatted: string[] = ['!'];

  const pushSeparator = () => {
    if (formatted.length > 0 && formatted[formatted.length - 1] !== '!') {
      formatted.push('!');
    }
  };

  for (let line of splitLines) {
    line = line
      .replace(/__BANNER_PLACEHOLDER_(\d+)__/g, (_, idx) => banners[Number(idx)] || '')
      .replace(/__COMMENT_PLACEHOLDER_(\d+)__/g, (_, idx) => commentHeaders[Number(idx)] || '!');

    const lower = line.toLowerCase();

    if (line === '!' || line.startsWith('!')) {
      inSubMode = false;
      if (line === '!') {
        pushSeparator();
      } else {
        formatted.push(line);
      }
      continue;
    }

    if (
      lower.startsWith('interface ') ||
      lower.startsWith('line ') ||
      lower.startsWith('router ') ||
      /^vlan\s+\d+$/i.test(line)
    ) {
      pushSeparator();
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
        pushSeparator();
      }
      inSubMode = false;
      formatted.push(line);
      continue;
    }

    if (lower === 'exit') {
      formatted.push(' exit');
      inSubMode = false;
      pushSeparator();
      continue;
    }

    formatted.push(inSubMode ? ` ${line}` : line);
  }

  return formatted.join('\n');
}

/**
 * Dynamically extracts a specific configuration category/section from a normalized Cisco IOS script
 * so clicking any Section Filter pill in Stage 3 immediately updates the displayed CLI commands.
 */
export function extractCiscoConfigSection(
  reconciledScript: string,
  sectionId: string,
  deviceName = 'Device',
  deviceType = 'router'
): string {
  const normalized = formatCiscoCliScript(reconciledScript);
  if (!normalized || sectionId === 'ALL') return normalized;

  // Group normalized lines into logical stanzas (either a single global line or a parent block + indented children)
  const lines = normalized.split('\n');
  const stanzas: string[][] = [];
  let currentStanza: string[] = [];

  const flushStanza = () => {
    if (currentStanza.length > 0) {
      stanzas.push(currentStanza);
      currentStanza = [];
    }
  };

  for (const line of lines) {
    if (line.trim() === '!') {
      flushStanza();
      continue;
    }
    if (line.startsWith(' ') && currentStanza.length > 0) {
      currentStanza.push(line);
    } else {
      flushStanza();
      currentStanza.push(line);
    }
  }
  flushStanza();

  const hardeningStanzas: string[] = [];
  const sshStanzas: string[] = [];
  const interfaceStanzas: string[] = [];
  const l2SecStanzas: string[] = [];
  const switchingStanzas: string[] = [];
  const routingStanzas: string[] = [];
  const interVlanStanzas: string[] = [];

  for (const stanza of stanzas) {
    const text = stanza.join('\n');
    const lower = text.toLowerCase();
    const firstLine = stanza[0].trim().toLowerCase();

    // 1. Global Hardening & Passwords
    if (
      firstLine.startsWith('hostname ') ||
      firstLine.startsWith('enable secret') ||
      firstLine.startsWith('service password-encryption') ||
      firstLine.startsWith('no ip domain-lookup') ||
      firstLine.startsWith('banner motd') ||
      firstLine.startsWith('security passwords') ||
      firstLine.startsWith('login block-for')
    ) {
      hardeningStanzas.push(text);
    }

    // 2. Remote SSHv2, AAA & Console/VTY Lines
    if (
      firstLine.startsWith('ip domain-name ') ||
      firstLine.startsWith('username ') ||
      firstLine.startsWith('crypto key ') ||
      firstLine.startsWith('ip ssh ') ||
      firstLine.startsWith('line con') ||
      firstLine.startsWith('line vty')
    ) {
      sshStanzas.push(text);
    }

    // 3. Interfaces (All L2/L3 interfaces)
    if (firstLine.startsWith('interface ')) {
      interfaceStanzas.push(text);
    }

    // 4. L2 Security & STP Protection
    if (
      lower.includes('portfast') ||
      lower.includes('bpduguard') ||
      lower.includes('port-security') ||
      (firstLine.startsWith('interface ') && /\n\s*shutdown\b/i.test(text)) ||
      firstLine.startsWith('spanning-tree ')
    ) {
      l2SecStanzas.push(text);
    }

    // 5. VLANs & 802.1Q Trunks / Access Switching
    if (
      firstLine.startsWith('vlan ') ||
      lower.includes('switchport')
    ) {
      switchingStanzas.push(text);
    }

    // 6. Routing (OSPF / Static / Default Gateway)
    if (
      firstLine.startsWith('router ospf') ||
      firstLine.startsWith('ip route ') ||
      firstLine.startsWith('ip default-gateway ') ||
      firstLine === 'ip routing'
    ) {
      routingStanzas.push(text);
    }

    // 7. Inter-VLAN (ROAS 802.1Q Subinterfaces / L3 SVIs)
    if (
      lower.includes('encapsulation dot1q') ||
      firstLine.startsWith('interface vlan') ||
      /^interface\s+\S+\.\d+/i.test(firstLine)
    ) {
      interVlanStanzas.push(text);
    }
  }

  const isSwitch = deviceType.toLowerCase().includes('switch');

  switch (sectionId) {
    case 'HARDENING':
      return hardeningStanzas.length > 0
        ? `! === HARDENING & PASSWORD ENCRYPTION (${deviceName}) ===\n!\n${hardeningStanzas.join('\n!\n')}\n!`
        : `! No global hardening directives found on ${deviceName}`;

    case 'SSH':
      return sshStanzas.length > 0
        ? `! === REMOTE SSHv2, AAA & CONSOLE/VTY LINES (${deviceName}) ===\n!\n${sshStanzas.join('\n!\n')}\n!`
        : `! No SSHv2 or VTY line configuration found on ${deviceName}`;

    case 'INTERFACES':
      return interfaceStanzas.length > 0
        ? `! === PHYSICAL & VIRTUAL INTERFACES (${deviceName}) ===\n!\n${interfaceStanzas.join('\n!\n')}\n!`
        : `! No interface stanzas found on ${deviceName}`;

    case 'L2_SEC':
      if (l2SecStanzas.length > 0) {
        return `! === LAYER 2 STP LOOP GUARD & PORT SECURITY (${deviceName}) ===\n!\n${l2SecStanzas.join('\n!\n')}\n!`;
      }
      return isSwitch
        ? `! No Layer 2 portfast/bpduguard rules found on ${deviceName}`
        : [
            `! === LAYER 2 PORT SECURITY & INTERFACES (${deviceName}) ===`,
            `! Note: STP PortFast and BPDU Guard apply to Layer 2 switch access ports.`,
            `! On Router ${deviceName}, interfaces operate as Layer 3 routed ports with 'no shutdown':`,
            `!`,
            ...(interfaceStanzas.length > 0 ? [interfaceStanzas.join('\n!\n')] : ['! No routed interfaces configured']),
          ].join('\n');

    case 'SWITCHING':
      if (switchingStanzas.length > 0) {
        return `! === LAYER 2 SWITCHING, VLANs & 802.1Q TRUNKS (${deviceName}) ===\n!\n${switchingStanzas.join('\n!\n')}\n!`;
      }
      return [
        `! === LAYER 2 VLAN & SWITCHPORT FILTER (${deviceName}) ===`,
        `! ${deviceName} is a Layer 3 Router (no Layer 2 switchport or VLAN database stanzas).`,
        `! Select a Switch device tab above (e.g., S1 / SW1) to inspect switchport access/trunk configurations.`,
      ].join('\n');

    case 'ROUTING':
      if (routingStanzas.length > 0) {
        return `! === LAYER 3 ROUTING PROTOCOL & STATIC ROUTES (${deviceName}) ===\n!\n${routingStanzas.join('\n!\n')}\n!`;
      }
      if (!isSwitch && interfaceStanzas.length > 0) {
        return [
          `! === LAYER 3 ROUTING ARCHITECTURE (${deviceName}) ===`,
          `! Single-Router / Directly Connected Mode (Administrative Distance = 0):`,
          `! All attached IPv4 subnets are directly connected to ${deviceName}'s active interfaces.`,
          `! Per CCNA 200-301 guidelines, no static routes or OSPF process are required for directly connected networks:`,
          `!`,
          interfaceStanzas.join('\n!\n'),
          `!`,
        ].join('\n');
      }
      return `! === LAYER 3 ROUTING (${deviceName}) ===\n! ${deviceName} operates at Layer 2 (switching); Layer 3 routing is handled by the default gateway router.`;

    case 'INTER_VLAN':
      if (interVlanStanzas.length > 0) {
        return `! === INTER-VLAN ROUTING: 802.1Q SUBINTERFACES / SVIs (${deviceName}) ===\n!\n${interVlanStanzas.join('\n!\n')}\n!`;
      }
      return [
        `! === INTER-VLAN ROUTING (ROAS / SVI) (${deviceName}) ===`,
        `! No 802.1Q subinterfaces or VLAN SVIs are configured on ${deviceName}.`,
        `! Because the topology and scenario do not require multiple VLANs, ${deviceName} uses native physical routed LAN interfaces:`,
        `!`,
        ...(interfaceStanzas.length > 0 ? [interfaceStanzas.join('\n!\n')] : []),
      ].join('\n');

    default:
      return normalized;
  }
}

/**
 * Checks whether an IPv4 address belongs to any of the user's allocated CIDR blocks.
 */
function isIpInUserPools(ipStr: string, networkBlockStr: string): boolean {
  const ipInt = ipToInt(ipStr);
  if (ipInt === null) return false;

  const rawBlocks = (networkBlockStr || '')
    .split(/[;\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (rawBlocks.length === 0) return true;

  for (const token of rawBlocks) {
    const [ipPart, prefixPart] = token.split('/');
    const prefix = parseInt(prefixPart || '24', 10);
    const netInt = ipToInt(ipPart || '');
    if (netInt === null || isNaN(prefix) || prefix < 8 || prefix > 32) continue;
    const maskInt = pToMaskInt(prefix);
    if (((ipInt & maskInt) >>> 0) === ((netInt & maskInt) >>> 0)) {
      return true;
    }
  }
  return false;
}

/**
 * Reconciles a device's configuration script with the Stage 2 Addressing Table and Stage 1 Topology
 * so that if the LLM omitted interface IP blocks or used a mismatched IP, the device's configuration
 * and CLI simulator reflect the exact allocated IP addresses.
 */
export function reconcileDeviceConfigWithReport(
  config: DeviceConfig,
  report?: ArchitectureReport | null
): string {
  const formatted = formatCiscoCliScript(config?.fullConfig || '');
  if (!report) return formatted;

  const devName = (config?.deviceName || '').trim();
  const addressingTable = Array.isArray(report.stage2_addressing?.addressingTable)
    ? report.stage2_addressing.addressingTable
    : [];
  const networkBlock =
    report.stage2_addressing?.networkBlock || report.constraints?.networkBlock || '';

  const deviceRows = addressingTable.filter(
    (r) =>
      (r.device || '').trim().toLowerCase() === devName.toLowerCase() &&
      r.ipAddress &&
      r.ipAddress !== 'DHCP' &&
      r.ipAddress !== 'N/A' &&
      r.ipAddress !== 'unassigned'
  );

  if (deviceRows.length === 0) return formatted;

  let updatedScript = formatted;

  for (const row of deviceRows) {
    const fullIntf = expandCiscoInterfaceName(row.interface || 'G0/0/0');
    const rowIp = (row.ipAddress || '').trim();
    const rowMask =
      row.subnetMask && row.subnetMask.includes('.')
        ? row.subnetMask.trim()
        : prefixToMask(row.prefix || 24);

    if (!ipToInt(rowIp)) continue;

    // Check if this exact IP is already present in updatedScript
    if (updatedScript.includes(`ip address ${rowIp} `)) {
      continue;
    }

    // Check if the interface block already exists in updatedScript
    const escapedIntf = fullIntf.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const intfRegex = new RegExp(
      `(^interface\\s+${escapedIntf}\\b[\\s\\S]*?)(?=\\n!|\\ninterface\\s|\\nrouter\\s|\\nline\\s|\\nip\\s+route\\s|\\nend\\b|$)`,
      'im'
    );

    const match = updatedScript.match(intfRegex);
    if (match) {
      const existingBlock = match[1];
      if (/ip\s+address\s+\d+\.\d+\.\d+\.\d+\s+\d+\.\d+\.\d+\.\d+/i.test(existingBlock)) {
        // Replace stale/mismatched IP if it's not in user pools
        const ipMatch = existingBlock.match(
          /ip\s+address\s+(\d+\.\d+\.\d+\.\d+)\s+(\d+\.\d+\.\d+\.\d+)/i
        );
        if (ipMatch && !isIpInUserPools(ipMatch[1], networkBlock)) {
          const fixedBlock = existingBlock.replace(
            /ip\s+address\s+\d+\.\d+\.\d+\.\d+\s+\d+\.\d+\.\d+\.\d+/i,
            `ip address ${rowIp} ${rowMask}`
          );
          updatedScript = updatedScript.replace(existingBlock, fixedBlock);
        }
      } else if (!fullIntf.includes('.') && updatedScript.includes(`interface ${fullIntf}.`)) {
        // Parent of subinterface should remain no ip address
      } else {
        const injectedBlock = `${existingBlock}\n ip address ${rowIp} ${rowMask}\n no shutdown`;
        updatedScript = updatedScript.replace(existingBlock, injectedBlock);
      }
    } else {
      // Interface block is completely missing from fullConfig -> inject before line con 0 or end
      const subMatch = fullIntf.match(/\.(\d+)$/);
      const newIntfBlock = [
        `!`,
        `interface ${fullIntf}`,
        row.vlanPurpose ? ` description ${row.vlanPurpose}` : '',
        subMatch ? ` encapsulation dot1Q ${subMatch[1]}` : '',
        ` ip address ${rowIp} ${rowMask}`,
        !subMatch ? ` no shutdown` : '',
      ]
        .filter(Boolean)
        .join('\n');

      if (/\nline\s+con/i.test(updatedScript)) {
        updatedScript = updatedScript.replace(/(\nline\s+con)/i, `\n${newIntfBlock}\n!$1`);
      } else if (/\nend\b/i.test(updatedScript)) {
        updatedScript = updatedScript.replace(/(\nend\b)/i, `\n${newIntfBlock}\n!$1`);
      } else {
        updatedScript += `\n${newIntfBlock}\n!\nend\nwrite memory`;
      }
    }
  }

  return updatedScript;
}

/**
 * Extracts all interfaces, IP addresses, masks, and operational status for a device
 * by combining Stage 2 Addressing Table, Stage 3 Running Config, and Stage 1 Topology Connections.
 */
export function extractDeviceInterfaces(
  config: DeviceConfig,
  report?: ArchitectureReport | null
): ParsedDeviceInterface[] {
  const devName = (config?.deviceName || 'R1').trim();
  const isSwitch = config?.deviceType === 'switch';
  const script = reconcileDeviceConfigWithReport(config, report);
  const lines = script.split('\n');

  const interfaceMap = new Map<string, ParsedDeviceInterface>();

  const ensureInterface = (rawName: string): ParsedDeviceInterface => {
    const fullName = expandCiscoInterfaceName(rawName);
    const key = fullName.toLowerCase();
    let existing = interfaceMap.get(key);
    if (!existing) {
      existing = {
        name: fullName,
        shortName: abbreviateCiscoInterfaceName(fullName),
        ipAddress: 'unassigned',
        subnetMask: '',
        prefix: 24,
        status: 'up',
        protocol: 'up',
        method: 'unset',
        isSubinterface: fullName.includes('.'),
      };
      interfaceMap.set(key, existing);
    }
    return existing;
  };

  // 1. Parse interfaces from the reconciled CLI script
  let currentIntf: ParsedDeviceInterface | null = null;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    const lower = line.toLowerCase();

    if (line === '!' || lower === 'end' || lower === 'exit') {
      currentIntf = null;
      continue;
    }

    const intfMatch = line.match(/^interface\s+(?!range\b)(\S+)/i);
    if (intfMatch) {
      currentIntf = ensureInterface(intfMatch[1]);
      continue;
    }

    if (lower.startsWith('interface range ')) {
      currentIntf = null;
      continue;
    }

    if (currentIntf) {
      const ipMatch = line.match(/^ip\s+address\s+(\d+\.\d+\.\d+\.\d+)\s+(\d+\.\d+\.\d+\.\d+)/i);
      if (ipMatch) {
        currentIntf.ipAddress = ipMatch[1];
        currentIntf.subnetMask = ipMatch[2];
        currentIntf.prefix = maskToPrefix(ipMatch[2]);
        currentIntf.method = 'manual';
      }
      if (lower === 'no ip address') {
        currentIntf.ipAddress = 'unassigned';
        currentIntf.method = 'unset';
      }
      if (lower === 'shutdown') {
        currentIntf.status = 'administratively down';
        currentIntf.protocol = 'down';
      }
      if (lower === 'no shutdown') {
        currentIntf.status = 'up';
        currentIntf.protocol = 'up';
      }
      const descMatch = line.match(/^description\s+(.+)$/i);
      if (descMatch) {
        currentIntf.description = descMatch[1].trim();
      }
      const dot1qMatch = line.match(/^encapsulation\s+dot1q\s+(\d+)/i);
      if (dot1qMatch) {
        currentIntf.vlanId = parseInt(dot1qMatch[1], 10);
      }
      const accessVlanMatch = line.match(/^switchport\s+access\s+vlan\s+(\d+)/i);
      if (accessVlanMatch) {
        currentIntf.vlanId = parseInt(accessVlanMatch[1], 10);
      }
      if (lower === 'switchport mode trunk') {
        currentIntf.isTrunk = true;
      }
    }
  }

  // 2. Overlay ground-truth IP assignments from Stage 2 Addressing Table
  const addressingTable = Array.isArray(report?.stage2_addressing?.addressingTable)
    ? report!.stage2_addressing.addressingTable
    : [];

  for (const row of addressingTable) {
    if ((row.device || '').trim().toLowerCase() !== devName.toLowerCase()) continue;
    if (!row.interface) continue;
    const intf = ensureInterface(row.interface);
    if (
      row.ipAddress &&
      row.ipAddress !== 'DHCP' &&
      row.ipAddress !== 'N/A' &&
      row.ipAddress !== 'unassigned' &&
      ipToInt(row.ipAddress) !== null
    ) {
      intf.ipAddress = row.ipAddress.trim();
      intf.subnetMask =
        row.subnetMask && row.subnetMask.includes('.')
          ? row.subnetMask.trim()
          : prefixToMask(row.prefix || 24);
      intf.prefix = row.prefix || maskToPrefix(intf.subnetMask);
      intf.method = 'manual';
      intf.status = 'up';
      intf.protocol = 'up';
    }
    if (row.vlanPurpose && !intf.description) {
      intf.description = row.vlanPurpose;
    }
  }

  // 3. Overlay physical connections from Stage 1 Topology so connected ports always appear
  const connections = Array.isArray(report?.stage1_topology?.connections)
    ? report!.stage1_topology.connections
    : [];

  for (const conn of connections) {
    if ((conn.fromDevice || '').trim().toLowerCase() === devName.toLowerCase() && conn.fromInterface) {
      const intf = ensureInterface(conn.fromInterface);
      intf.connectedTo = `${conn.toDevice} (${conn.toInterface})`;
      if (conn.linkType === 'Trunk') intf.isTrunk = true;
    } else if ((conn.toDevice || '').trim().toLowerCase() === devName.toLowerCase() && conn.toInterface) {
      const intf = ensureInterface(conn.toInterface);
      intf.connectedTo = `${conn.fromDevice} (${conn.fromInterface})`;
      if (conn.linkType === 'Trunk') intf.isTrunk = true;
    }
  }

  // 4. Fallback if still empty: synthesize from report.stage2_addressing.subnetAllocations or constraints.networkBlock
  if (interfaceMap.size === 0) {
    const allocations = Array.isArray(report?.stage2_addressing?.subnetAllocations)
      ? report!.stage2_addressing.subnetAllocations
      : [];
    if (!isSwitch && allocations.length > 0) {
      allocations.forEach((alloc, idx) => {
        const firstUsable = (alloc.usableRange || '').split(' - ')[0]?.trim() || alloc.networkAddress;
        const intfName = alloc.vlanId
          ? `GigabitEthernet0/0/0.${alloc.vlanId}`
          : `GigabitEthernet0/0/${idx}`;
        if (alloc.vlanId) {
          ensureInterface('GigabitEthernet0/0/0');
        }
        const intf = ensureInterface(intfName);
        intf.ipAddress = firstUsable;
        intf.subnetMask = alloc.subnetMask || prefixToMask(alloc.prefix || 24);
        intf.prefix = alloc.prefix || 24;
        intf.method = 'manual';
      });
    } else if (isSwitch) {
      ensureInterface('GigabitEthernet0/1');
      ensureInterface('FastEthernet0/1');
      ensureInterface('Vlan1');
    }
  }

  if (isSwitch && !interfaceMap.has('vlan1') && ![...interfaceMap.keys()].some((k) => k.startsWith('vlan'))) {
    ensureInterface('Vlan1');
  }

  return Array.from(interfaceMap.values()).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
}

/**
 * Generates authentic, context-aware Cisco IOS 15.x / XE CLI output for any command run
 * inside the Stage 3 Live Cisco IOS CLI Simulator.
 */
export function simulateCiscoCliCommand(
  rawCmd: string,
  config: DeviceConfig,
  report?: ArchitectureReport | null
): string {
  const cleanCmd = rawCmd
    .trim()
    .replace(/^do\s+/i, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();

  const host = config?.deviceName || 'Device';
  const isSwitch = config?.deviceType === 'switch';
  const script = reconcileDeviceConfigWithReport(config, report);
  const interfaces = extractDeviceInterfaces(config, report);
  const connections = Array.isArray(report?.stage1_topology?.connections)
    ? report!.stage1_topology.connections
    : [];
  const allocations = Array.isArray(report?.stage2_addressing?.subnetAllocations)
    ? report!.stage2_addressing.subnetAllocations
    : [];
  const addressingTable = Array.isArray(report?.stage2_addressing?.addressingTable)
    ? report!.stage2_addressing.addressingTable
    : [];

  // 1. show running-config / sh run
  if (
    cleanCmd === 'show running-config' ||
    cleanCmd === 'sh run' ||
    cleanCmd === 'show run' ||
    cleanCmd === 'show startup-config' ||
    cleanCmd === 'sh start'
  ) {
    return `Building configuration...\n\nCurrent configuration : ${script.length} bytes\n!\n${script}`;
  }

  // 2. show ip interface brief / sh ip int br
  if (
    cleanCmd === 'show ip interface brief' ||
    cleanCmd === 'sh ip int br' ||
    cleanCmd === 'show ip int br' ||
    cleanCmd === 'sh ip interface brief'
  ) {
    const header = `${'Interface'.padEnd(27)}${'IP-Address'.padEnd(16)}OK? Method ${'Status'.padEnd(22)}Protocol`;
    const rows = interfaces.map((intf) => {
      const colIntf = intf.name.padEnd(27);
      const colIp = (intf.ipAddress || 'unassigned').padEnd(16);
      const colMethod = (intf.ipAddress !== 'unassigned' ? 'manual' : 'unset').padEnd(6);
      const colStatus = intf.status.padEnd(22);
      const colProto = intf.protocol;
      return `${colIntf}${colIp}YES ${colMethod} ${colStatus}${colProto}`;
    });
    return [header, ...rows].join('\n');
  }

  // 3. show ip route / sh ip route
  if (cleanCmd === 'show ip route' || cleanCmd === 'sh ip route') {
    if (isSwitch && !script.toLowerCase().includes('ip routing')) {
      const gwMatch = script.match(/ip\s+default-gateway\s+(\d+\.\d+\.\d+\.\d+)/i);
      return gwMatch
        ? `Default gateway is ${gwMatch[1]}\n\nHost               Gateway           Last Use    Total Uses  Interface\nICMP redirect cache is empty`
        : `Default gateway is not set\n\nHost               Gateway           Last Use    Total Uses  Interface\nICMP redirect cache is empty`;
    }

    const header = [
      `Codes: L - local, C - connected, S - static, R - RIP, M - mobile, B - BGP`,
      `       D - EIGRP, EX - EIGRP external, O - OSPF, IA - OSPF inter area`,
      `       N1 - OSPF NSSA external type 1, N2 - OSPF NSSA external type 2`,
      `       E1 - OSPF external type 1, E2 - OSPF external type 2`,
      `       * - candidate default, U - per-user static route`,
    ];

    // Check for static routes in script
    const staticRoutes: Array<{ net: string; mask: string; prefix: number; nextHop: string; isDefault: boolean }> = [];
    for (const line of script.split('\n')) {
      const m = line.trim().match(/^ip\s+route\s+(\d+\.\d+\.\d+\.\d+)\s+(\d+\.\d+\.\d+\.\d+)\s+(\S+)/i);
      if (m) {
        const net = m[1];
        const mask = m[2];
        const nextHop = m[3];
        const prefix = net === '0.0.0.0' && mask === '0.0.0.0' ? 0 : maskToPrefix(mask);
        staticRoutes.push({
          net,
          mask,
          prefix,
          nextHop,
          isDefault: net === '0.0.0.0' && mask === '0.0.0.0',
        });
      }
    }

    const defaultStatic = staticRoutes.find((r) => r.isDefault);
    header.push(
      defaultStatic
        ? `\nGateway of last resort is ${defaultStatic.nextHop} to network 0.0.0.0\n`
        : `\nGateway of last resort is not set\n`
    );

    const routeLines: string[] = [];
    const connectedNets = new Set<string>();

    // Connected (C) and Local (L) routes from active L3 interfaces
    const l3Interfaces = interfaces.filter(
      (i) => i.ipAddress && i.ipAddress !== 'unassigned' && ipToInt(i.ipAddress) !== null
    );

    for (const intf of l3Interfaces) {
      const netAddr = computeNetworkAddress(intf.ipAddress, intf.prefix);
      const cidr = `${netAddr}/${intf.prefix}`;
      connectedNets.add(netAddr);

      routeLines.push(`      ${netAddr}/${intf.prefix} is variably subnetted, 2 subnets, 2 masks`);
      routeLines.push(`C        ${cidr} is directly connected, ${intf.name}`);
      routeLines.push(`L        ${intf.ipAddress}/32 is directly connected, ${intf.name}`);
    }

    // Explicit static routes from config
    for (const sr of staticRoutes) {
      if (sr.isDefault) {
        routeLines.push(`S*    0.0.0.0/0 [1/0] via ${sr.nextHop}`);
      } else {
        routeLines.push(`S        ${sr.net}/${sr.prefix} [1/0] via ${sr.nextHop}`);
        connectedNets.add(sr.net);
      }
    }

    // OSPF or remote subnet routes from Stage 2 Subnet Allocations
    const hasOspf = /router\s+ospf/i.test(script) || report?.constraints?.routingProtocol === 'OSPF';
    // Find peer WAN IP if any
    const wanRow = addressingTable.find(
      (r) =>
        (r.device || '').toLowerCase() !== host.toLowerCase() &&
        (r.prefix === 30 || /wan|link|p2p|serial/i.test(r.vlanPurpose || ''))
    );
    const wanIntf =
      l3Interfaces.find((i) => i.prefix === 30 || /wan|p2p|link/i.test(i.description || '')) ||
      l3Interfaces[l3Interfaces.length - 1];

    for (const alloc of allocations) {
      if (!alloc.networkAddress || connectedNets.has(alloc.networkAddress)) continue;
      const peerIp = wanRow?.ipAddress || '192.168.0.2';
      const outIntf = wanIntf?.name || 'GigabitEthernet0/0/1';
      if (hasOspf) {
        routeLines.push(
          `O        ${alloc.networkAddress}/${alloc.prefix} [110/2] via ${peerIp}, 00:08:42, ${outIntf}`
        );
      } else if (!defaultStatic && l3Interfaces.length > 0 && wanRow) {
        routeLines.push(`S        ${alloc.networkAddress}/${alloc.prefix} [1/0] via ${peerIp}`);
      }
    }

    return [...header, ...routeLines].join('\n');
  }

  // 4. show vlan brief / sh vlan br
  if (
    cleanCmd === 'show vlan brief' ||
    cleanCmd === 'sh vlan br' ||
    cleanCmd === 'show vlan br' ||
    cleanCmd === 'sh vlan'
  ) {
    if (!isSwitch) {
      return `% Ambiguous command: "show vlan brief" is a Layer 2 switch command. On router ${host}, use 'show ip interface brief' to inspect interfaces/subinterfaces.`;
    }

    // Parse VLAN definitions and port assignments from switch config
    const vlanNames = new Map<number, string>();
    vlanNames.set(1, 'default');

    let curVlan: number | null = null;
    for (const rawLine of script.split('\n')) {
      const line = rawLine.trim();
      const vMatch = line.match(/^vlan\s+(\d+)$/i);
      if (vMatch) {
        curVlan = parseInt(vMatch[1], 10);
        if (!vlanNames.has(curVlan)) vlanNames.set(curVlan, `VLAN${String(curVlan).padStart(4, '0')}`);
        continue;
      }
      if (curVlan !== null) {
        const nameMatch = line.match(/^name\s+(\S+)/i);
        if (nameMatch) {
          vlanNames.set(curVlan, nameMatch[1]);
        }
        if (line === '!' || line.toLowerCase().startsWith('interface ')) {
          curVlan = null;
        }
      }
    }

    // Map ports to VLANs
    const vlanPorts = new Map<number, string[]>();
    vlanPorts.set(1, []);

    for (const intf of interfaces) {
      if (intf.name.toLowerCase().startsWith('vlan') || intf.isTrunk) continue;
      const vId = intf.vlanId || 1;
      if (!vlanNames.has(vId)) vlanNames.set(vId, `VLAN${String(vId).padStart(4, '0')}`);
      const list = vlanPorts.get(vId) || [];
      list.push(intf.shortName);
      vlanPorts.set(vId, list);
    }

    if ((vlanPorts.get(1) || []).length === 0 && vlanNames.size === 1) {
      vlanPorts.set(1, ['Gi0/1', 'Fa0/1', 'Fa0/2', 'Fa0/3', 'Fa0/4']);
    }

    const header = [
      `VLAN Name                             Status    Ports`,
      `---- -------------------------------- --------- -------------------------------`,
    ];

    const sortedVlanIds = Array.from(vlanNames.keys()).sort((a, b) => a - b);
    const rows = sortedVlanIds.map((id) => {
      const name = (vlanNames.get(id) || `VLAN${id}`).slice(0, 32).padEnd(32);
      const ports = (vlanPorts.get(id) || []).join(', ');
      return `${String(id).padEnd(4)} ${name} active    ${ports}`;
    });

    rows.push(
      `1002 fddi-default                     act/unsup `,
      `1003 token-ring-default               act/unsup `,
      `1004 fddinet-default                  act/unsup `,
      `1005 trnet-default                    act/unsup `
    );

    return [...header, ...rows].join('\n');
  }

  // 5. show interfaces trunk / sh int trunk
  if (cleanCmd === 'show interfaces trunk' || cleanCmd === 'sh int trunk' || cleanCmd === 'show int trunk') {
    if (!isSwitch) {
      return `% Command 'show interfaces trunk' is only supported on Layer 2/3 switch platforms.`;
    }

    const trunkIntfs = interfaces.filter((i) => i.isTrunk);
    if (trunkIntfs.length === 0) {
      return `No 802.1Q trunk ports are active on ${host} (all switchports are operating in standard Layer 2 access mode on VLAN 1).`;
    }

    const nativeMatch = script.match(/switchport\s+trunk\s+native\s+vlan\s+(\d+)/i);
    const nativeVlan = nativeMatch ? nativeMatch[1] : String(report?.constraints?.nativeVlan || 1);

    const allowedVlans = allocations
      .filter((a) => a.vlanId)
      .map((a) => a.vlanId)
      .join(',') || '1-4094';

    const lines1 = trunkIntfs.map(
      (t) => `${t.shortName.padEnd(12)}on               802.1q         trunking      ${nativeVlan}`
    );
    const lines2 = trunkIntfs.map((t) => `${t.shortName.padEnd(12)}${allowedVlans}`);

    return [
      `Port        Mode             Encapsulation  Status        Native vlan`,
      ...lines1,
      ``,
      `Port        Vlans allowed on trunk`,
      ...lines2,
    ].join('\n');
  }

  // 6. show interfaces status / sh int status
  if (cleanCmd === 'show interfaces status' || cleanCmd === 'sh int status' || cleanCmd === 'show int status') {
    const header = `Port      Name               Status       Vlan       Duplex  Speed Type`;
    const rows = interfaces
      .filter((i) => !i.isSubinterface && !i.name.toLowerCase().startsWith('vlan'))
      .map((i) => {
        const port = i.shortName.padEnd(9);
        const name = (i.description || i.connectedTo || '').slice(0, 18).padEnd(18);
        const status = (i.status === 'up' ? 'connected' : 'disabled').padEnd(12);
        const vlan = (i.isTrunk ? 'trunk' : !isSwitch ? 'routed' : String(i.vlanId || 1)).padEnd(10);
        const speed = i.shortName.startsWith('Gi') ? 'a-1000' : 'a-100 ';
        const media = i.shortName.startsWith('Gi') ? '10/100/1000BaseTX' : '10/100BaseTX';
        return `${port} ${name} ${status} ${vlan} a-full  ${speed} ${media}`;
      });
    return [header, ...rows].join('\n');
  }

  // 7. show ip ospf neighbor / sh ip ospf ne
  if (cleanCmd.includes('ospf neighbor') || cleanCmd === 'sh ip ospf ne') {
    const hasOspf = /router\s+ospf/i.test(script) || report?.constraints?.routingProtocol === 'OSPF';
    if (!hasOspf) {
      return `% OSPF: Process not enabled on ${host} (Topology uses Directly Connected / Static routing).`;
    }

    const peerRouters = addressingTable.filter(
      (r) =>
        (r.device || '').toLowerCase() !== host.toLowerCase() &&
        /^r\d+|router|hq|branch|isp/i.test(r.device || '') &&
        r.ipAddress &&
        ipToInt(r.ipAddress) !== null
    );

    if (peerRouters.length === 0) {
      return `Neighbor ID     Pri   State           Dead Time   Address         Interface\n! No external OSPF router neighbors detected on single-router topology`;
    }

    const header = `Neighbor ID     Pri   State           Dead Time   Address         Interface`;
    const rows = peerRouters.slice(0, 4).map((peer, idx) => {
      const rId = `${idx + 2}.${idx + 2}.${idx + 2}.${idx + 2}`.padEnd(15);
      const addr = peer.ipAddress.padEnd(15);
      const localWanIntf =
        interfaces.find((i) => i.prefix === 30)?.name || expandCiscoInterfaceName(peer.interface || 'G0/0/1');
      return `${rId}   1   FULL/DR         00:00:36    ${addr} ${localWanIntf}`;
    });
    return [header, ...rows].join('\n');
  }

  // 8. show ip protocols / sh ip protocols
  if (cleanCmd === 'show ip protocols' || cleanCmd === 'sh ip protocols') {
    const ospfMatch = script.match(/router\s+ospf\s+(\d+)/i);
    if (!ospfMatch) {
      return `*** IP Routing is NSF aware ***\nNo dynamic routing protocol (OSPF/EIGRP/BGP) is configured on ${host}.\nForwarding relies on Directly Connected (AD=0) and Static (AD=1) routes.`;
    }
    const pid = ospfMatch[1];
    const ridMatch = script.match(/router-id\s+(\d+\.\d+\.\d+\.\d+)/i);
    const nets = [...script.matchAll(/network\s+(\d+\.\d+\.\d+\.\d+)\s+(\d+\.\d+\.\d+\.\d+)\s+area\s+(\S+)/gi)].map(
      (m) => `    ${m[1]} ${m[2]} area ${m[3]}`
    );
    const passives = [...script.matchAll(/passive-interface\s+(\S+)/gi)].map((m) => `    ${m[1]}`);

    return [
      `*** IP Routing is NSF aware ***`,
      `Routing Protocol is "ospf ${pid}"`,
      `  Outgoing update filter list for all interfaces is not set`,
      `  Incoming update filter list for all interfaces is not set`,
      `  Router ID ${ridMatch ? ridMatch[1] : '1.1.1.1'}`,
      `  Number of areas in this router is 1. 1 normal 0 stub 0 nssa`,
      `  Routing for Networks:`,
      ...(nets.length > 0 ? nets : ['    Configured via interface/network statements']),
      `  Passive Interface(s):`,
      ...(passives.length > 0 ? passives : ['    None']),
      `  Routing Information Sources:`,
      `    Gateway         Distance      Last Update`,
      `  Distance: (default is 110)`,
    ].join('\n');
  }

  // 9. show cdp neighbors / sh cdp ne
  if (cleanCmd.startsWith('show cdp neighbor') || cleanCmd.startsWith('sh cdp ne')) {
    const myConns = connections.filter(
      (c) =>
        (c.fromDevice || '').toLowerCase() === host.toLowerCase() ||
        (c.toDevice || '').toLowerCase() === host.toLowerCase()
    );

    const header = [
      `Capability Codes: R - Router, T - Trans Bridge, B - Source Route Bridge`,
      `                  S - Switch, H - Host, I - IGMP, r - Repeater, P - Phone`,
      ``,
      `Device ID        Local Intrfce     Holdtme    Capability  Platform  Port ID`,
    ];

    const rows = myConns.map((c) => {
      const isFrom = (c.fromDevice || '').toLowerCase() === host.toLowerCase();
      const peerDev = isFrom ? c.toDevice : c.fromDevice;
      const localPort = abbreviateCiscoInterfaceName(isFrom ? c.fromInterface : c.toInterface).padEnd(17);
      const remotePort = abbreviateCiscoInterfaceName(isFrom ? c.toInterface : c.fromInterface);
      const isPeerRouter = /^r\d+|router|hq|branch|isp/i.test(peerDev || '');
      const isPeerSwitch = /^s\d+|sw\d+|switch/i.test(peerDev || '');
      const cap = (isPeerRouter ? 'R S I' : isPeerSwitch ? 'S I' : 'H').padEnd(11);
      const platform = (isPeerRouter ? 'ISR4321' : isPeerSwitch ? 'WS-C2960' : 'NIC').padEnd(9);
      return `${(peerDev || 'Peer').padEnd(16)} ${localPort} 154        ${cap} ${platform} ${remotePort}`;
    });

    return [...header, ...(rows.length > 0 ? rows : ['No CDP neighbors detected'])].join('\n');
  }

  // 10. show ip arp / show arp
  if (cleanCmd === 'show ip arp' || cleanCmd === 'sh ip arp' || cleanCmd === 'show arp' || cleanCmd === 'sh arp') {
    const header = `Protocol  Address          Age (min)  Hardware Addr   Type   Interface`;
    const rows: string[] = [];
    const l3Intfs = interfaces.filter((i) => i.ipAddress && i.ipAddress !== 'unassigned');

    l3Intfs.forEach((intf, idx) => {
      const mac = `00d0.ba81.${String(1000 + idx * 11)}`;
      rows.push(`Internet  ${intf.ipAddress.padEnd(16)}         -  ${mac}  ARPA   ${intf.name}`);
      // Also find matching endpoints or peers in same subnet
      const myNet = computeNetworkAddress(intf.ipAddress, intf.prefix);
      addressingTable.forEach((row, rIdx) => {
        if (row.ipAddress && row.ipAddress !== intf.ipAddress && ipToInt(row.ipAddress)) {
          const otherNet = computeNetworkAddress(row.ipAddress, intf.prefix);
          if (otherNet === myNet) {
            const peerMac = `0060.47c2.${String(2010 + rIdx * 13)}`;
            rows.push(`Internet  ${row.ipAddress.padEnd(16)}         2  ${peerMac}  ARPA   ${intf.name}`);
          }
        }
      });
    });

    return [header, ...rows].join('\n');
  }

  // 11. Interactive ping <ip>
  if (cleanCmd.startsWith('ping ')) {
    const targetIp = cleanCmd.replace(/^ping\s+/i, '').trim();
    if (!ipToInt(targetIp)) {
      return `% Unrecognized host or address: "${targetIp}". Usage: ping <ip-address>`;
    }

    // Check if targetIp matches a known device or falls within an allocated subnet
    const matchedRow = addressingTable.find((r) => r.ipAddress === targetIp);
    const inSubnet = allocations.find((a) => {
      const netInt = ipToInt(a.networkAddress);
      const targetInt = ipToInt(targetIp);
      if (netInt === null || targetInt === null) return false;
      const maskInt = pToMaskInt(a.prefix || 24);
      return ((targetInt & maskInt) >>> 0) === ((netInt & maskInt) >>> 0);
    });

    if (matchedRow || inSubnet) {
      const desc = matchedRow
        ? ` (${matchedRow.device} ${matchedRow.interface})`
        : inSubnet
        ? ` (Subnet ${inSubnet.networkAddress}/${inSubnet.prefix})`
        : '';
      return [
        `Type escape sequence to abort.`,
        `Sending 5, 100-byte ICMP Echos to ${targetIp}${desc}, timeout is 2 seconds:`,
        `!!!!!`,
        `Success rate is 100 percent (5/5), round-trip min/avg/max = 1/2/4 ms`,
      ].join('\n');
    }

    return [
      `Type escape sequence to abort.`,
      `Sending 5, 100-byte ICMP Echos to ${targetIp}, timeout is 2 seconds:`,
      `.....`,
      `Success rate is 0 percent (0/5) — Destination ${targetIp} is outside allocated topology subnets (${report?.stage2_addressing?.networkBlock || 'N/A'}).`,
    ].join('\n');
  }

  // 12. show version / sh ver
  if (cleanCmd === 'show version' || cleanCmd === 'sh ver' || cleanCmd === 'show ver') {
    return [
      `Cisco IOS XE Software, Version 16.09.04 (${isSwitch ? 'Catalyst L2 Switch' : 'ISR4321/K9'})`,
      `Technical Support: http://www.cisco.com/techsupport`,
      `Copyright (c) 1986-2026 by Cisco Systems, Inc.`,
      ``,
      `${host} uptime is 2 hours, 18 minutes`,
      `Active Address Block(s): ${report?.stage2_addressing?.networkBlock || report?.constraints?.networkBlock || 'Configured'}`,
      `Configuration register is 0x2102`,
    ].join('\n');
  }

  // 13. Help / ?
  if (cleanCmd === '?' || cleanCmd === 'help') {
    return [
      `Supported Live Cisco IOS CLI Simulator Commands for ${host}:`,
      `  show ip interface brief   (sh ip int br)   - Display real interface IP assignments & status`,
      `  show ip route             (sh ip route)    - Display Connected, Local, Static & OSPF routes`,
      `  show running-config       (sh run)         - Display active multi-line IOS configuration`,
      `  show interfaces status    (sh int status)  - Display physical port status & descriptions`,
      `  show vlan brief           (sh vlan br)     - Display active VLANs and switchport membership`,
      `  show interfaces trunk     (sh int trunk)   - Display 802.1Q trunk ports & Native VLAN`,
      `  show cdp neighbors        (sh cdp ne)      - Display connected Cisco neighbor devices`,
      `  show ip ospf neighbor     (sh ip ospf ne)  - Display OSPF neighbor adjacencies`,
      `  show ip protocols         (sh ip protocols)- Display active routing protocol parameters`,
      `  show ip arp               (sh ip arp)      - Display IPv4 ARP table entries`,
      `  ping <ip-address>                          - Send 5 ICMP echo requests to any topology IP`,
      `  clear / cls                                - Clear simulator terminal history`,
    ].join('\n');
  }

  return `% Unrecognized command "${rawCmd}". Type 'help' or '?' to see supported Cisco IOS verification commands (e.g. 'show ip interface brief', 'show ip route', 'show running-config', 'show cdp neighbors', 'ping <ip>').`;
}
