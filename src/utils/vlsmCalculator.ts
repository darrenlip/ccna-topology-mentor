import { SubnetAllocation } from '../types/network';

// Validate a single IPv4 CIDR string (e.g. 192.168.10.0/24)
export function isValidSingleCidr(cidr: string): boolean {
  const trimmed = cidr.trim();
  const parts = trimmed.split('/');
  if (parts.length !== 2) return false;
  const [ip, prefixStr] = parts;
  const prefix = Number(prefixStr);
  if (!Number.isInteger(prefix) || prefix < 8 || prefix > 31) return false;
  const octets = ip.split('.');
  if (octets.length !== 4) return false;
  return octets.every((o) => {
    const n = Number(o);
    return Number.isInteger(n) && n >= 0 && n <= 255 && String(n) === o.trim();
  });
}

// Split a multi-block CIDR input string primarily by ';' (also tolerating newlines or commas)
export function parseCidrBlocks(cidrInput: string): string[] {
  if (!cidrInput || !cidrInput.trim()) return [];
  return cidrInput
    .split(/[;\n,]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

// Validate single or ';' separated multiple IPv4 CIDR strings
export function isValidCidr(cidrInput: string): boolean {
  const blocks = parseCidrBlocks(cidrInput);
  if (blocks.length === 0) return false;
  return blocks.every((b) => isValidSingleCidr(b));
}

// Convert dotted decimal IP to 32-bit unsigned integer
export function ipToInt(ip: string): number {
  const octets = ip.trim().split('.');
  if (octets.length !== 4) return 0;
  return (
    octets.reduce((acc, octet) => ((acc << 8) + (parseInt(octet, 10) || 0)) >>> 0, 0) >>> 0
  );
}

// Convert 32-bit unsigned integer to dotted decimal IP
export function intToIp(int: number): string {
  return [
    (int >>> 24) & 255,
    (int >>> 16) & 255,
    (int >>> 8) & 255,
    int & 255,
  ].join('.');
}

// Prefix to Subnet Mask (e.g. 24 -> 255.255.255.0)
export function prefixToMask(prefix: number): string {
  if (prefix <= 0) return '0.0.0.0';
  if (prefix >= 32) return '255.255.255.255';
  const mask = (0xffffffff << (32 - prefix)) >>> 0;
  return intToIp(mask);
}

// Prefix to Wildcard Mask (e.g. 24 -> 0.0.0.255)
export function prefixToWildcard(prefix: number): string {
  if (prefix <= 0) return '255.255.255.255';
  if (prefix >= 32) return '0.0.0.0';
  const wildcard = (~((0xffffffff << (32 - prefix)) >>> 0)) >>> 0;
  return intToIp(wildcard);
}

// Calculate the prefix needed for a given number of usable hosts
export function getRequiredPrefix(hostsNeeded: number): number {
  // Usable hosts = 2^(32 - prefix) - 2
  const totalAddressesNeeded = Math.max(1, hostsNeeded) + 2;
  let hostBits = Math.ceil(Math.log2(totalAddressesNeeded));
  if (hostBits < 2) hostBits = 2; // minimum /30 for standard CCNA point-to-point links (2 usable hosts)
  if (hostBits > 24) hostBits = 24;
  return 32 - hostBits;
}

export interface VlsmInputRequest {
  name: string;
  vlanId?: number;
  hostsNeeded: number;
  preferredBlockIndex?: number;
}

export interface ParsedCidrBlockInfo {
  index: number;
  rawInput: string;
  isValid: boolean;
  normalizedCidr: string;
  networkAddress: string;
  prefix: number;
  totalAddresses: number;
  usableHosts: number;
  inferredPurpose: string;
}

export interface ExtendedSubnetAllocation extends SubnetAllocation {
  sourceBlock?: string;
}

export interface VlsmCalculationResult {
  isValidBase: boolean;
  normalizedBaseCidr: string;
  parsedBlocks: ParsedCidrBlockInfo[];
  allocations: ExtendedSubnetAllocation[];
  exhaustedRequirements: VlsmInputRequest[];
  unallocatedBlocks: { network: string; prefix: number; size: number }[];
  totalBaseAddresses: number;
  totalAddressesConsumed: number;
  totalHostsRequested: number;
  totalHostsAllocated: number;
  utilizationPercent: number;
  recommendedPrefix: number;
}

interface InternalBlockTracker {
  index: number;
  rawInput: string;
  isValid: boolean;
  normalizedCidr: string;
  networkInt: number;
  currentIpInt: number;
  endIpInt: number;
  prefix: number;
  totalAddresses: number;
  inferredPurpose: string;
  matchedKeywords: string[];
}

// Analyze scenario text to infer what each CIDR block is intended for
function analyzeScenarioForBlockIntent(
  normalizedCidr: string,
  prefix: number,
  index: number,
  totalBlocks: number,
  scenarioText: string
): { purpose: string; keywords: string[] } {
  const [netIp] = normalizedCidr.split('/');
  const octets = netIp.split('.');
  const firstThreeOctets = `${octets[0]}.${octets[1]}.${octets[2]}.`;
  const firstTwoOctets = `${octets[0]}.${octets[1]}.`;

  if (scenarioText && scenarioText.trim()) {
    // Split scenario into clauses/sentences to see what is mentioned alongside this IP block
    const clauses = scenarioText.split(/[.;\n]+/).map((s) => s.trim()).filter(Boolean);
    for (const clause of clauses) {
      if (
        clause.includes(normalizedCidr) ||
        clause.includes(netIp) ||
        (octets[2] !== '0' && clause.includes(firstThreeOctets))
      ) {
        const lower = clause.toLowerCase();
        const keywords: string[] = [lower];

        // Extract VLAN numbers mentioned in the same clause
        const vlanMatches = [...lower.matchAll(/vlan\s*(\d+)/gi)];
        for (const m of vlanMatches) {
          keywords.push(`vlan ${m[1]}`);
          keywords.push(`vlan_${m[1]}`);
        }

        // Check for WAN / Point-to-point / Serial / Router-to-Router keywords
        if (/(wan|p2p|point-to-point|serial|inter-router|between\s*r\d|r\d\s*(to|-|and)\s*r\d|g0\/0\/0|s0\/)/i.test(clause)) {
          keywords.push('wan', 'p2p', 'link', 'serial');
        }

        // Summarize the clause concisely for the UI badge
        const cleanedPurpose = clause
          .replace(normalizedCidr, '')
          .replace(netIp, '')
          .replace(/^[:\-\s,forusewithon]+/i, '')
          .trim();

        return {
          purpose: cleanedPurpose ? cleanedPurpose.slice(0, 56) : `Scenario-mapped segment`,
          keywords,
        };
      }
    }

    // Also check broader two-octet match if unique (e.g. 10.0.x.x vs 192.168.x.x)
    for (const clause of clauses) {
      if (clause.includes(firstTwoOctets)) {
        const lower = clause.toLowerCase();
        if (/(wan|p2p|point-to-point|serial|between\s*r\d|r\d\s*(to|-|and)\s*r\d)/i.test(clause)) {
          return {
            purpose: 'WAN / Inter-Router Link (from Scenario)',
            keywords: [lower, 'wan', 'p2p', 'link'],
          };
        }
      }
    }
  }

  // Fallback heuristics based on prefix length and block order
  if (prefix >= 30) {
    return {
      purpose: 'Point-to-Point WAN / Routed Link (/30)',
      keywords: ['wan', 'p2p', 'link', 'routed'],
    };
  }
  if (totalBlocks > 1) {
    return {
      purpose: `LAN / VLAN Segment Pool #${index + 1}`,
      keywords: [`pool_${index + 1}`],
    };
  }
  return {
    purpose: 'Primary Base Network Pool',
    keywords: [],
  };
}

// Parse additional segment/interface requirements mentioned in Scenario text for specific CIDR blocks
function augmentRequirementsFromScenario(
  baseRequirements: VlsmInputRequest[],
  blocks: InternalBlockTracker[],
  scenarioText?: string
): VlsmInputRequest[] {
  const result: VlsmInputRequest[] = baseRequirements.map((r) => ({ ...r }));
  const lowerScenario = (scenarioText || '').toLowerCase();

  // First, try to bind existing requirements to specific blocks if scenario or prefix matches
  for (const req of result) {
    const reqNameLower = req.name.toLowerCase();
    const isWanReq =
      req.hostsNeeded <= 2 &&
      (reqNameLower.includes('wan') || reqNameLower.includes('p2p') || reqNameLower.includes('link'));

    // 1. Check explicit scenario keyword match for this VLAN ID or segment name
    for (const blk of blocks) {
      const hasVlanMatch =
        req.vlanId !== undefined &&
        blk.matchedKeywords.some(
          (k) =>
            k.includes(`vlan ${req.vlanId}`) ||
            k.includes(`vlan_${req.vlanId}`) ||
            k.includes(reqNameLower)
        );
      const hasNameMatch =
        reqNameLower.length >= 3 &&
        blk.matchedKeywords.some((k) => k.includes(reqNameLower));

      if (hasVlanMatch || hasNameMatch) {
        req.preferredBlockIndex = blk.index;
        break;
      }
    }

    // 2. If this is a WAN / P2P link requirement and there is a dedicated /30 or /31 block (or WAN-tagged block)
    if (req.preferredBlockIndex === undefined && isWanReq && blocks.length > 1) {
      const wanBlock = blocks.find(
        (b) =>
          b.prefix >= 30 ||
          b.matchedKeywords.includes('wan') ||
          b.matchedKeywords.includes('p2p')
      );
      if (wanBlock) {
        req.preferredBlockIndex = wanBlock.index;
      }
    }
  }

  // Second, if multiple blocks were provided (e.g. 192.168.10.0/24; 192.168.20.0/24; 10.0.0.0/30),
  // ensure any additional user-supplied block that has a clear role in the scenario or is a separate segment
  // is represented if no requirement was bound to it yet.
  if (blocks.length > 1) {
    blocks.forEach((blk) => {
      const alreadyBound = result.some((r) => r.preferredBlockIndex === blk.index);
      if (!alreadyBound && blk.index > 0) {
        if (blk.prefix >= 30) {
          // Check if there's an unbound WAN requirement first
          const unboundWan = result.find(
            (r) =>
              r.preferredBlockIndex === undefined &&
              r.hostsNeeded <= 2 &&
              /wan|p2p|link/i.test(r.name)
          );
          if (unboundWan) {
            unboundWan.preferredBlockIndex = blk.index;
          } else {
            result.push({
              name:
                blk.inferredPurpose && !blk.inferredPurpose.startsWith('Point-to-Point')
                  ? blk.inferredPurpose
                  : `WAN Link #${blk.index} (/30)`,
              hostsNeeded: 2,
              preferredBlockIndex: blk.index,
            });
          }
        } else if (lowerScenario.trim().length > 0) {
          // Try to see if scenario assigns this block to a specific LAN/branch/interface not yet bound
          const unboundVlan = result.find(
            (r) =>
              r.preferredBlockIndex === undefined &&
              r.hostsNeeded > 2 &&
              blk.index < result.length
          );
          if (unboundVlan && blocks.filter((b) => b.prefix < 30).length >= 2) {
            // If user provided multiple LAN blocks and scenario mentions multiple routers/LANs/branches,
            // distribute unbound VLANs/LANs across the provided LAN blocks when appropriate
            if (
              blk.matchedKeywords.length > 0 &&
              !blk.matchedKeywords[0].startsWith('pool_')
            ) {
              result.push({
                name: blk.inferredPurpose,
                hostsNeeded: Math.min(62, Math.max(14, Math.pow(2, 32 - Math.max(26, blk.prefix)) - 2)),
                preferredBlockIndex: blk.index,
              });
            }
          }
        }
      }
    });
  }

  return result;
}

// Perform deterministic VLSM calculation across one or multiple ';'-separated IPv4 CIDR blocks
export function calculateVlsm(
  baseNetworkCidrInput: string,
  requirements: VlsmInputRequest[],
  scenarioText?: string
): VlsmCalculationResult {
  const rawTokens = parseCidrBlocks(baseNetworkCidrInput);
  if (rawTokens.length === 0) {
    return {
      isValidBase: false,
      normalizedBaseCidr: '',
      parsedBlocks: [],
      allocations: [],
      exhaustedRequirements: [],
      unallocatedBlocks: [],
      totalBaseAddresses: 0,
      totalAddressesConsumed: 0,
      totalHostsRequested: 0,
      totalHostsAllocated: 0,
      utilizationPercent: 0,
      recommendedPrefix: 24,
    };
  }
  const effectiveTokens = rawTokens;
  const allValid = rawTokens.every((t) => isValidSingleCidr(t));

  const trackers: InternalBlockTracker[] = effectiveTokens.map((token, idx) => {
    const valid = isValidSingleCidr(token);
    const [rawIp, rawPrefix] = token.trim().split('/');
    const prefix = valid ? parseInt(rawPrefix, 10) : 24;
    const rawIpInt = valid ? ipToInt(rawIp) : ipToInt('192.168.10.0');
    const maskInt = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
    const networkInt = (rawIpInt & maskInt) >>> 0;
    const normalizedCidr = `${intToIp(networkInt)}/${prefix}`;
    const totalAddresses = Math.pow(2, 32 - prefix);
    const intent = analyzeScenarioForBlockIntent(
      normalizedCidr,
      prefix,
      idx,
      effectiveTokens.length,
      scenarioText || ''
    );

    return {
      index: idx,
      rawInput: token,
      isValid: valid,
      normalizedCidr,
      networkInt,
      currentIpInt: networkInt,
      endIpInt: networkInt + totalAddresses,
      prefix,
      totalAddresses,
      inferredPurpose: intent.purpose,
      matchedKeywords: intent.keywords,
    };
  });

  const normalizedBaseCidr = trackers.map((t) => t.normalizedCidr).join('; ');

  const augmentedReqs = augmentRequirementsFromScenario(requirements, trackers, scenarioText);

  // Sort requirements descending by host count (VLSM fundamental CCNA rule)
  const sortedReqs = [...augmentedReqs]
    .filter((r) => r.hostsNeeded > 0)
    .sort((a, b) => b.hostsNeeded - a.hostsNeeded);

  const allocations: ExtendedSubnetAllocation[] = [];
  const exhaustedRequirements: VlsmInputRequest[] = [];
  let totalHostsRequested = 0;
  let totalHostsAllocated = 0;
  let totalAddressesNeededRaw = 0;

  const tryAllocateFromTracker = (
    tracker: InternalBlockTracker,
    req: VlsmInputRequest,
    prefix: number,
    blockSize: number
  ): boolean => {
    let candidateIpInt = tracker.currentIpInt;
    const remainder = (candidateIpInt - tracker.networkInt) % blockSize;
    if (remainder !== 0) {
      candidateIpInt += blockSize - remainder;
    }

    if (candidateIpInt + blockSize > tracker.endIpInt) {
      return false;
    }

    const usableHosts = blockSize - 2;
    const networkAddress = intToIp(candidateIpInt);
    const firstUsable = intToIp(candidateIpInt + 1);
    const lastUsable = intToIp(candidateIpInt + blockSize - 2);
    const broadcastAddress = intToIp(candidateIpInt + blockSize - 1);

    allocations.push({
      name: req.name,
      vlanId: req.vlanId,
      hostsNeeded: req.hostsNeeded,
      hostsAllocated: usableHosts,
      networkAddress,
      prefix,
      subnetMask: prefixToMask(prefix),
      wildcardMask: prefixToWildcard(prefix),
      usableRange: `${firstUsable} - ${lastUsable}`,
      broadcastAddress,
      sourceBlock: tracker.normalizedCidr,
    });

    totalHostsAllocated += usableHosts;
    tracker.currentIpInt = candidateIpInt + blockSize;
    return true;
  };

  for (const req of sortedReqs) {
    totalHostsRequested += req.hostsNeeded;
    const prefix = getRequiredPrefix(req.hostsNeeded);
    const blockSize = Math.pow(2, 32 - prefix);
    totalAddressesNeededRaw += blockSize;

    let allocated = false;

    // 1. Try preferred block first if scenario or prefix mapped it
    if (
      req.preferredBlockIndex !== undefined &&
      trackers[req.preferredBlockIndex]
    ) {
      allocated = tryAllocateFromTracker(
        trackers[req.preferredBlockIndex],
        req,
        prefix,
        blockSize
      );
    }

    // 2. Otherwise iterate through available CIDR blocks in order
    if (!allocated) {
      for (const tracker of trackers) {
        // Avoid putting large LAN subnets into a dedicated /30 block unless no other option
        if (
          req.preferredBlockIndex === undefined &&
          req.hostsNeeded <= 2 &&
          trackers.length > 1
        ) {
          // Prefer /30 blocks for 2-host links if one exists
          const dedicatedWanTracker = trackers.find(
            (t) => t.prefix >= 30 && t.currentIpInt + blockSize <= t.endIpInt
          );
          if (
            dedicatedWanTracker &&
            tryAllocateFromTracker(dedicatedWanTracker, req, prefix, blockSize)
          ) {
            allocated = true;
            break;
          }
        }

        if (tryAllocateFromTracker(tracker, req, prefix, blockSize)) {
          allocated = true;
          break;
        }
      }
    }

    if (!allocated) {
      exhaustedRequirements.push(req);
    }
  }

  const totalBaseAddresses = trackers.reduce((sum, t) => sum + t.totalAddresses, 0);
  const totalAddressesConsumed = trackers.reduce(
    (sum, t) => sum + (t.currentIpInt - t.networkInt),
    0
  );

  const utilizationPercent =
    totalBaseAddresses > 0
      ? Math.min(100, Math.round((totalAddressesConsumed / totalBaseAddresses) * 100))
      : 0;

  const neededBits = Math.max(2, Math.ceil(Math.log2(Math.max(4, totalAddressesNeededRaw))));
  const recommendedPrefix = Math.min(30, Math.max(8, 32 - neededBits));

  const unallocatedBlocks = trackers
    .filter((t) => t.currentIpInt < t.endIpInt)
    .map((t) => ({
      network: intToIp(t.currentIpInt),
      prefix: t.prefix,
      size: t.endIpInt - t.currentIpInt,
    }));

  const parsedBlocks: ParsedCidrBlockInfo[] = trackers.map((t) => ({
    index: t.index,
    rawInput: t.rawInput,
    isValid: t.isValid,
    normalizedCidr: t.normalizedCidr,
    networkAddress: intToIp(t.networkInt),
    prefix: t.prefix,
    totalAddresses: t.totalAddresses,
    usableHosts: Math.max(0, t.totalAddresses - 2),
    inferredPurpose: t.inferredPurpose,
  }));

  return {
    isValidBase: allValid,
    normalizedBaseCidr,
    parsedBlocks,
    allocations,
    exhaustedRequirements,
    unallocatedBlocks,
    totalBaseAddresses,
    totalAddressesConsumed,
    totalHostsRequested,
    totalHostsAllocated,
    utilizationPercent,
    recommendedPrefix,
  };
}
