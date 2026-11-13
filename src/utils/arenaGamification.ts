import { ArchitectureReport } from '../types/network';

export type SkillDomain =
  | 'L1_L2_SWITCHING'
  | 'VLSM_ADDRESSING'
  | 'IOS_INTERFACE_CLI'
  | 'ROUTING_ARCHITECTURE'
  | 'VERIFICATION_TROUBLESHOOTING';

export type ChallengeMode = 'CLI_DRILL' | 'CONFIG_DOCTOR' | 'ARCHITECT_DECISION';

export interface CcnaChallenge {
  id: string;
  title: string;
  domain: SkillDomain;
  mode: ChallengeMode;
  difficulty: 'Foundation' | 'Intermediate' | 'CCNA Exam Ready';
  xpReward: number;
  isLiveTopology?: boolean;
  scenario: string;
  learningObjective: string;
  taskPrompt: string;
  iosPrompt?: string;
  brokenConfigSnippet?: string;
  acceptedCommands?: string[];
  tokenPool?: string[];
  options?: string[];
  correctOptionIndex?: number;
  hint: string;
  mentorExplanation: string;
  ccnaReference: string;
}

export interface MissionStats {
  attempts: number;
  cleanFirstAttempt?: boolean;
  timesCompleted: number;
  firstSolveAttempts?: number;
  lastAttemptAt?: string;
  hintsUsedCount?: number;
  isHistoricalV1?: boolean;
  // Compatibility aliases
  attemptsSubmitted?: number;
  bestAttemptsToSuccess?: number;
  completionsCount?: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  requirementDescription: string;
  iconName: 'zap' | 'terminal' | 'compass' | 'award' | 'target' | 'network';
  unlocked: boolean;
  unlockedAt?: string;
  progressCurrent: number;
  progressTarget: number;
}

export interface ArenaProgressV2 {
  version: 2;
  xp: number;
  streak: number; // Consecutive correct answers (not days)
  bestStreak: number;
  completedIds: string[];
  domainScores: Record<SkillDomain, { correct: number; attempts: number }>;
  missionStats: Record<string, MissionStats>;
  sessionGoal: 1 | 3 | 5;
  sessionCompletedIds: string[];
  unlockedAchievementIds: string[];
  achievementTimestamps: Record<string, string>;
}

export const STORAGE_KEY_V1 = 'ccna_mentor_arena_progress_v1';
export const STORAGE_KEY_V2 = 'ccna_mentor_arena_progress_v2';

export const CORE_MISSION_IDS = [
  'core-cli-1',
  'core-cli-2',
  'core-doc-1',
  'core-arch-1',
  'core-cli-3',
  'core-doc-2',
  'core-arch-2',
  'core-vlsm-1',
] as const;

export const DOMAIN_META: Record<
  SkillDomain,
  { label: string; shortLabel: string; description: string }
> = {
  IOS_INTERFACE_CLI: {
    label: 'IOS Modes & Interface Provisioning',
    shortLabel: 'IOS Interface CLI',
    description: 'Navigating EXEC/Config modes, assigning IPv4 addresses, and enabling physical ports.',
  },
  VLSM_ADDRESSING: {
    label: 'Multi-Block IPv4 & VLSM Subnetting',
    shortLabel: 'VLSM & IPv4',
    description: 'Calculating subnet masks, usable host ranges, /30 point-to-point links, and default gateways.',
  },
  ROUTING_ARCHITECTURE: {
    label: 'Routing Protocol & Path Selection',
    shortLabel: 'Routing & OSPF',
    description: 'Choosing Connected vs. Static vs. OSPF routing, wildcard masks, and next-hop forwarding.',
  },
  L1_L2_SWITCHING: {
    label: 'Layer 1 Cabling, VLANs & 802.1Q Trunks',
    shortLabel: 'L1/L2 & Trunks',
    description: 'IEEE 802.3 straight-through vs. crossover cabling, access ports, and Router-on-a-Stick subinterfaces.',
  },
  VERIFICATION_TROUBLESHOOTING: {
    label: 'IOS Verification & Config Troubleshooting',
    shortLabel: 'Show & Debug',
    description: 'Diagnosing down/down interfaces, missing routes, and security baselines using show commands.',
  },
};

export const CORE_CHALLENGES: CcnaChallenge[] = [
  {
    id: 'core-cli-1',
    title: 'Bring Up a Routed Gigabit Interface',
    domain: 'IOS_INTERFACE_CLI',
    mode: 'CLI_DRILL',
    difficulty: 'Foundation',
    xpReward: 100,
    scenario:
      'You have just assigned IP address 192.168.0.1 255.255.255.0 to Router R0 interface GigabitEthernet0/0. However, "show ip interface brief" still shows the interface status as "administratively down / down".',
    learningObjective:
      'Execute the Cisco IOS "no shutdown" interface configuration command to transition an administratively disabled router port to Layer 1/2 operational status.',
    taskPrompt:
      'Enter or assemble the exact Cisco IOS interface configuration command required to administratively enable the physical port.',
    iosPrompt: 'R0(config-if)#',
    acceptedCommands: ['no shutdown', 'no shut'],
    tokenPool: ['no', 'shutdown', 'enable', 'interface', 'up', 'switchport', 'exit'],
    hint: 'By default, all Cisco router physical interfaces ship in the "shutdown" state. Negate that state with "no shutdown". Hints never deduct XP.',
    mentorExplanation:
      'Unlike Cisco Catalyst switch ports (which are active by default), Cisco router interfaces are administratively shut down out of the box to prevent accidental routing advertisements. Issuing "no shutdown" (or "no shut") in interface configuration mode transitions Layer 1 to "up".',
    ccnaReference: 'CCNA 200-301 Vol 1 · Configuring Router Interfaces',
  },
  {
    id: 'core-cli-2',
    title: 'Assign an IPv4 Address to a Router Port',
    domain: 'IOS_INTERFACE_CLI',
    mode: 'CLI_DRILL',
    difficulty: 'Foundation',
    xpReward: 120,
    scenario:
      'Router R1 connects to LAN A (192.168.1.0/24) via GigabitEthernet0/0. As the default gateway for PC1, R1 needs the first usable IPv4 address in that /24 block.',
    learningObjective:
      'Configure an IPv4 host address with standard 255.255.255.0 dotted-decimal subnet mask on a router GigabitEthernet interface.',
    taskPrompt:
      'Configure the IPv4 address 192.168.1.1 with its /24 dotted-decimal subnet mask on the interface.',
    iosPrompt: 'R1(config-if)#',
    acceptedCommands: [
      'ip address 192.168.1.1 255.255.255.0',
      'ip add 192.168.1.1 255.255.255.0',
      'ip addr 192.168.1.1 255.255.255.0',
    ],
    tokenPool: [
      'ip',
      'address',
      '192.168.1.1',
      '255.255.255.0',
      '/24',
      '0.0.0.255',
      'default-gateway',
    ],
    hint: 'Cisco IOS does not accept slash notation (/24) in the "ip address" command; use the full dotted-decimal mask 255.255.255.0.',
    mentorExplanation:
      'In Cisco IOS interface mode, the syntax is "ip address <ip-address> <subnet-mask>". Prefix length (/24) must be translated into 255.255.255.0, whereas 0.0.0.255 is an inverse wildcard mask used only in OSPF/ACL statements.',
    ccnaReference: 'CCNA 200-301 Vol 1 · IPv4 Interface Configuration',
  },
  {
    id: 'core-doc-1',
    title: 'Fix the Broken Router-on-a-Stick Subinterface',
    domain: 'L1_L2_SWITCHING',
    mode: 'CONFIG_DOCTOR',
    difficulty: 'Intermediate',
    xpReward: 150,
    scenario:
      'A junior engineer tried to configure inter-VLAN routing on R1 for VLAN 20 (192.168.20.0/24), but Cisco IOS rejected the IP address command with: "% Configuring IP routing on a LAN subinterface is only allowed if that subinterface is already configured as part of an IEEE 802.10, IEEE 802.1Q, or ISL vLAN."',
    learningObjective:
      'Identify and execute the IEEE 802.1Q encapsulation dot1Q binding command required before configuring an IP address on a Router-on-a-Stick subinterface.',
    brokenConfigSnippet: `R1(config)# interface GigabitEthernet0/0/0.20
R1(config-subif)# ip address 192.168.20.1 255.255.255.0
% Configuring IP routing on a LAN subinterface is only allowed if that subinterface is already configured as part of an IEEE 802.1Q vLAN.`,
    taskPrompt:
      'Which command must be executed on R1(config-subif)# BEFORE assigning the IPv4 address?',
    options: [
      'encapsulation dot1Q 20',
      'switchport trunk encapsulation dot1q',
      'switchport access vlan 20',
      'vlan 20',
    ],
    correctOptionIndex: 0,
    hint: 'A router subinterface does not know which VLAN tag to inspect until you bind IEEE 802.1Q encapsulation to the VLAN ID.',
    mentorExplanation:
      'On a router subinterface, Cisco IOS requires "encapsulation dot1Q <vlan-id>" prior to "ip address <ip> <mask>". Without 802.1Q tag binding, the router cannot associate incoming tagged frames with the subinterface.',
    ccnaReference: 'CCNA 200-301 Vol 1 · Chapter 17: Inter-VLAN Routing (ROAS)',
  },
  {
    id: 'core-arch-1',
    title: 'When Do You Actually Need OSPF vs. Connected Routes?',
    domain: 'ROUTING_ARCHITECTURE',
    mode: 'ARCHITECT_DECISION',
    difficulty: 'Intermediate',
    xpReward: 130,
    scenario:
      'You are reviewing a topology with a single Router (R0) connecting PC0 on GigabitEthernet0/0 (192.168.0.0/24) and PC1 on GigabitEthernet0/1 (192.168.1.0/24). There are no other routers in the diagram.',
    learningObjective:
      'Evaluate router routing table population and distinguish directly connected routes (AD 0) from static (AD 1) and dynamic OSPF routes (AD 110).',
    taskPrompt:
      'According to CCNA routing fundamentals, what routing configuration is required on R0 so PC0 can ping PC1?',
    options: [
      'Zero static or dynamic routing commands—R0 automatically installs Directly Connected (C) and Local (L) routes once both interfaces are configured and "no shutdown".',
      'Configure single-area OSPF (router ospf 1) with network statements for both subnets.',
      'Configure two static routes pointing out GigabitEthernet0/0 and GigabitEthernet0/1.',
      'Configure RIPv2 with "no auto-summary" between the two interfaces.',
    ],
    correctOptionIndex: 0,
    hint: 'Check what routes appear automatically in "show ip route" when a single router has two active interfaces.',
    mentorExplanation:
      'A single router already has direct physical visibility into every subnet attached to its active interfaces (Administrative Distance = 0, code "C"). Static routes (AD 1) and OSPF (AD 110) are only needed when packets must traverse a second remote router to reach non-local networks.',
    ccnaReference: 'CCNA 200-301 Vol 1 · IP Routing & Connected Routes',
  },
  {
    id: 'core-cli-3',
    title: 'Verify Interface IP & Layer 1/Layer 2 Status',
    domain: 'VERIFICATION_TROUBLESHOOTING',
    mode: 'CLI_DRILL',
    difficulty: 'Foundation',
    xpReward: 100,
    scenario:
      'After pasting your configuration into R1, you want a concise summary table showing every interface, its assigned IPv4 address, and whether Status (Layer 1) and Protocol (Layer 2) are "up / up".',
    learningObjective:
      'Execute and interpret the Cisco IOS privileged EXEC verification command "show ip interface brief" to diagnose Layer 1 physical and Layer 2 line protocol operational states.',
    taskPrompt:
      'Enter or assemble the standard Cisco IOS privileged EXEC command to display the concise IP interface status summary.',
    iosPrompt: 'R1#',
    acceptedCommands: [
      'show ip interface brief',
      'sh ip int br',
      'show ip int brief',
      'sh ip int brief',
    ],
    tokenPool: ['show', 'ip', 'interface', 'brief', 'route', 'running-config', 'status'],
    hint: 'Network engineers frequently abbreviate this four-word command as "sh ip int br".',
    mentorExplanation:
      '"show ip interface brief" (or "sh ip int br") is the #1 verification command in CCNA troubleshooting. It immediately reveals unconfigured IPs ("unassigned"), missing "no shutdown" commands ("administratively down"), or physical cable/clock-rate issues ("down").',
    ccnaReference: 'CCNA 200-301 Vol 1 · Verifying IPv4 Interfaces',
  },
  {
    id: 'core-doc-2',
    title: 'Diagnose the OSPF Wildcard Mask Error',
    domain: 'ROUTING_ARCHITECTURE',
    mode: 'CONFIG_DOCTOR',
    difficulty: 'CCNA Exam Ready',
    xpReward: 160,
    scenario:
      'A topology has 3 routers (R1, R2, R3). You want R1 to advertise its 192.168.10.0/24 LAN into OSPF Area 0. Which command syntax correctly enables OSPF on interfaces belonging exclusively to 192.168.10.0/24?',
    learningObjective:
      'Calculate and apply an inverse wildcard mask (0.0.0.255) for /24 subnets in single-area OSPF network statements.',
    brokenConfigSnippet: `R1(config)# router ospf 1
R1(config-router)# ! Which network statement belongs here for 192.168.10.0/24?`,
    taskPrompt:
      'Select the valid Cisco IOS OSPF network command for a /24 subnet in Area 0:',
    options: [
      'network 192.168.10.0 0.0.0.255 area 0',
      'network 192.168.10.0 255.255.255.0 area 0',
      'network 192.168.10.0/24 area 0',
      'ip ospf network 192.168.10.0 0.0.0.255',
    ],
    correctOptionIndex: 0,
    hint: 'OSPF network statements require an inverse wildcard mask (255.255.255.255 minus the subnet mask).',
    mentorExplanation:
      'OSPF uses an inverse wildcard mask where 0 bits must match and 1 bits are "don\'t care". Subtracting 255.255.255.0 (/24) from 255.255.255.255 yields 0.0.0.255.',
    ccnaReference: 'CCNA 200-301 Vol 1 · Chapter 20: Implementing Single-Area OSPF',
  },
  {
    id: 'core-arch-2',
    title: 'IEEE 802.3 Cabling: Router-to-PC Direct Connection',
    domain: 'L1_L2_SWITCHING',
    mode: 'ARCHITECT_DECISION',
    difficulty: 'Intermediate',
    xpReward: 130,
    scenario:
      'In a Packet Tracer lab without a switch, a Router (R0) GigabitEthernet0/0 port is wired directly to a PC (PC0) FastEthernet0 NIC. Assume Auto-MDIX is disabled on the lab grading rubric.',
    learningObjective:
      'Differentiate classic IEEE 802.3 Ethernet MDI and MDI-X pinouts and identify when a copper crossover cable is required for direct router-to-host links.',
    taskPrompt:
      'Which Ethernet cable type is required between a Router and a PC, and why?',
    options: [
      'Copper Crossover cable — both Routers and PCs are MDI (Media Dependent Interface) devices that transmit on pins 1 & 2 and receive on pins 3 & 6.',
      'Copper Straight-Through cable — a Router is an MDI-X device while a PC is an MDI device.',
      'Rollover (Console) cable — required whenever a PC connects directly to a router port.',
      'Coaxial cable — required for point-to-point Layer 3 host connections.',
    ],
    correctOptionIndex: 0,
    hint: 'Group A (MDI: Router, PC, Server, Wireless AP) vs. Group B (MDI-X: Switch, Hub). Like-group devices require crossing TX/RX pairs.',
    mentorExplanation:
      'Under classic IEEE 802.3 pinout rules tested on the CCNA and enforced in Cisco Packet Tracer grading, Routers and PCs both transmit on pins 1/2 and listen on pins 3/6. Connecting them directly requires a Copper Crossover cable so TX pins map to RX pins.',
    ccnaReference: 'CCNA 200-301 Vol 1 · Chapter 2: Fundamentals of Ethernet LANs',
  },
  {
    id: 'core-vlsm-1',
    title: 'Point-to-Point WAN Link Subnet Sizing (/30)',
    domain: 'VLSM_ADDRESSING',
    mode: 'ARCHITECT_DECISION',
    difficulty: 'Foundation',
    xpReward: 120,
    scenario:
      'You are given two address blocks separated by a semicolon: "192.168.1.0/24; 10.0.0.0/30". The topology has one 50-host LAN on R1 and one serial WAN link between R1 and R2.',
    learningObjective:
      'Analyze subnet prefix requirements to size a /30 point-to-point WAN link without address wastage under VLSM design principles.',
    taskPrompt:
      'Why should 10.0.0.0/30 be assigned to the R1–R2 WAN link instead of 192.168.1.0/24?',
    options: [
      'A /30 subnet (255.255.255.252) provides exactly 2 usable host IPs (2^2 - 2 = 2) for the two router WAN interfaces, preventing 252 wasted IPv4 addresses.',
      'A /30 subnet provides 30 usable host IPs, which is mandatory for OSPF hello packets.',
      'Cisco Serial interfaces only accept Class A (10.x.x.x) IP addresses.',
      'A /24 subnet cannot be configured on router interfaces.',
    ],
    correctOptionIndex: 0,
    hint: 'With 30 network bits, how many host bits remain out of 32? Calculate 2^h - 2.',
    mentorExplanation:
      'A /30 prefix leaves 32 - 30 = 2 host bits. Using the formula 2^2 - 2 = 2 usable IPv4 addresses (.1 and .2, with .0 as network ID and .3 as broadcast), a /30 is the classic CCNA standard for point-to-point router links.',
    ccnaReference: 'CCNA 200-301 Vol 1 · VLSM & Point-to-Point Subnets',
  },
];

export const DEFAULT_PROGRESS_V2: ArenaProgressV2 = {
  version: 2,
  xp: 0,
  streak: 0,
  bestStreak: 0,
  completedIds: [],
  domainScores: {
    L1_L2_SWITCHING: { correct: 0, attempts: 0 },
    VLSM_ADDRESSING: { correct: 0, attempts: 0 },
    IOS_INTERFACE_CLI: { correct: 0, attempts: 0 },
    ROUTING_ARCHITECTURE: { correct: 0, attempts: 0 },
    VERIFICATION_TROUBLESHOOTING: { correct: 0, attempts: 0 },
  },
  missionStats: {},
  sessionGoal: 3,
  sessionCompletedIds: [],
  unlockedAchievementIds: [],
  achievementTimestamps: {},
};

export interface RankInfo {
  level: number;
  title: string;
  nextXp: number;
  prevXp: number;
  xpNeeded: number;
  isMaxRank: boolean;
  progressPct: number;
}

export function computeRankInfo(xp: number): RankInfo {
  if (xp >= 1400) {
    return {
      level: 5,
      title: 'Lead IOS Topology Architect',
      nextXp: 1400,
      prevXp: 1400,
      xpNeeded: 0,
      isMaxRank: true,
      progressPct: 100,
    };
  }
  if (xp >= 900) {
    const nextXp = 1400;
    const prevXp = 900;
    const span = nextXp - prevXp;
    return {
      level: 4,
      title: 'CCNA Configuration Specialist',
      nextXp,
      prevXp,
      xpNeeded: nextXp - xp,
      isMaxRank: false,
      progressPct: Math.min(100, Math.max(0, Math.round(((xp - prevXp) / span) * 100))),
    };
  }
  if (xp >= 500) {
    const nextXp = 900;
    const prevXp = 500;
    const span = nextXp - prevXp;
    return {
      level: 3,
      title: 'Associate Network Engineer',
      nextXp,
      prevXp,
      xpNeeded: nextXp - xp,
      isMaxRank: false,
      progressPct: Math.min(100, Math.max(0, Math.round(((xp - prevXp) / span) * 100))),
    };
  }
  if (xp >= 200) {
    const nextXp = 500;
    const prevXp = 200;
    const span = nextXp - prevXp;
    return {
      level: 2,
      title: 'Junior Lab Technician',
      nextXp,
      prevXp,
      xpNeeded: nextXp - xp,
      isMaxRank: false,
      progressPct: Math.min(100, Math.max(0, Math.round(((xp - prevXp) / span) * 100))),
    };
  }
  const nextXp = 200;
  const prevXp = 0;
  const span = nextXp - prevXp;
  return {
    level: 1,
    title: 'NOC Apprentice',
    nextXp,
    prevXp,
    xpNeeded: nextXp - xp,
    isMaxRank: false,
    progressPct: Math.min(100, Math.max(0, Math.round(((xp - prevXp) / span) * 100))),
  };
}

export interface DomainMastery {
  domain: SkillDomain;
  label: string;
  shortLabel: string;
  completedCount: number;
  totalCount: number;
  pct: number;
  masteryTier: 'Unstarted' | 'Developing' | 'Proficient' | 'Mastered';
}

export function computeCategoryMastery(
  allChallenges: CcnaChallenge[],
  completedIds: string[]
): DomainMastery[] {
  const completedSet = new Set(completedIds);
  const domains = Object.keys(DOMAIN_META) as SkillDomain[];

  return domains.map((domain) => {
    const meta = DOMAIN_META[domain];
    const inDomain = allChallenges.filter((c) => c.domain === domain);
    const totalCount = inDomain.length;
    const completedCount = inDomain.filter((c) => completedSet.has(c.id)).length;
    const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    let masteryTier: DomainMastery['masteryTier'] = 'Unstarted';
    if (pct === 100 && totalCount > 0) {
      masteryTier = 'Mastered';
    } else if (pct >= 66) {
      masteryTier = 'Proficient';
    } else if (pct > 0) {
      masteryTier = 'Developing';
    }

    return {
      domain,
      label: meta.label,
      shortLabel: meta.shortLabel,
      completedCount,
      totalCount,
      pct,
      masteryTier,
    };
  });
}

export function evaluateAchievements(
  progress: ArenaProgressV2,
  allChallenges: CcnaChallenge[]
): Achievement[] {
  const completedSet = new Set(progress.completedIds);
  const unlockedTimestamps = progress.achievementTimestamps || {};

  // 1. First Fix: first verified mission
  const firstFixUnlocked = completedSet.size >= 1;
  const firstFixCur = Math.min(1, completedSet.size);

  // 2. Interface Operator: both named core interface missions (core-cli-1 and core-cli-2)
  const cli1 = completedSet.has('core-cli-1');
  const cli2 = completedSet.has('core-cli-2');
  const interfaceOperatorUnlocked =
    (cli1 && cli2) || (progress.unlockedAchievementIds || []).includes('interface-operator');
  const interfaceOperatorCur = (cli1 ? 1 : 0) + (cli2 ? 1 : 0);

  // 3. Network Generalist: at least one verified mission per available category (all 5 domains)
  const domains = Object.keys(DOMAIN_META) as SkillDomain[];
  const categoriesCovered = domains.filter((domain) =>
    allChallenges.some((c) => c.domain === domain && completedSet.has(c.id))
  ).length;
  const networkGeneralistUnlocked = categoriesCovered >= domains.length;

  // 4. Arena Graduate: all 8 original core missions completed
  const coreCompletedCount = CORE_MISSION_IDS.filter((id) => completedSet.has(id)).length;
  const arenaGraduateUnlocked = coreCompletedCount >= CORE_MISSION_IDS.length;

  // 5. Command Precision (bonus CCNA achievement): 3 consecutive correct answers without failure
  const precisionUnlocked = progress.bestStreak >= 3 || progress.streak >= 3;
  const precisionCur = Math.min(3, Math.max(progress.bestStreak, progress.streak));

  // 6. Topology Grounded (bonus CCNA achievement): complete 1 mission derived from an uploaded blueprint
  const liveMissionCompleted = allChallenges.some(
    (c) => c.isLiveTopology && completedSet.has(c.id)
  );
  const topologyGroundedCur = liveMissionCompleted ? 1 : 0;

  return [
    {
      id: 'first-fix',
      title: 'First Fix',
      description: 'Completed your first verified CCNA configuration or troubleshooting mission.',
      requirementDescription: '1 verified mission completion',
      iconName: 'zap',
      unlocked: firstFixUnlocked,
      unlockedAt: unlockedTimestamps['first-fix'],
      progressCurrent: firstFixCur,
      progressTarget: 1,
    },
    {
      id: 'interface-operator',
      title: 'Interface Operator',
      description: 'Mastered Cisco IOS interface provisioning and administrative port activation.',
      requirementDescription: 'Complete both Core Interface missions (R0 Enable & R1 IPv4)',
      iconName: 'terminal',
      unlocked: interfaceOperatorUnlocked,
      unlockedAt: unlockedTimestamps['interface-operator'],
      progressCurrent: interfaceOperatorCur,
      progressTarget: 2,
    },
    {
      id: 'network-generalist',
      title: 'Network Generalist',
      description: 'Demonstrated competency across all five CCNA architecture and configuration domains.',
      requirementDescription: 'Complete at least 1 verified mission in all 5 skill categories',
      iconName: 'compass',
      unlocked: networkGeneralistUnlocked,
      unlockedAt: unlockedTimestamps['network-generalist'],
      progressCurrent: categoriesCovered,
      progressTarget: domains.length,
    },
    {
      id: 'arena-graduate',
      title: 'Arena Graduate',
      description: 'Successfully conquered all 8 original CCNA core foundation and exam-ready missions.',
      requirementDescription: 'Complete all 8 original CCNA core curriculum missions',
      iconName: 'award',
      unlocked: arenaGraduateUnlocked,
      unlockedAt: unlockedTimestamps['arena-graduate'],
      progressCurrent: coreCompletedCount,
      progressTarget: CORE_MISSION_IDS.length,
    },
    {
      id: 'command-precision',
      title: 'Command Precision',
      description: 'Maintained a consecutive streak of 3 correct answers without syntax or conceptual errors.',
      requirementDescription: 'Reach a streak of 3 consecutive correct answers',
      iconName: 'target',
      unlocked: precisionUnlocked,
      unlockedAt: unlockedTimestamps['command-precision'],
      progressCurrent: precisionCur,
      progressTarget: 3,
    },
    {
      id: 'topology-grounded',
      title: 'Topology Grounded',
      description: 'Solved a dynamic mission generated directly from your uploaded network diagram.',
      requirementDescription: 'Complete 1 custom mission generated from an uploaded topology',
      iconName: 'network',
      unlocked: liveMissionCompleted,
      unlockedAt: unlockedTimestamps['topology-grounded'],
      progressCurrent: topologyGroundedCur,
      progressTarget: 1,
    },
  ];
}

export function getRecommendedMission(
  allChallenges: CcnaChallenge[],
  completedIds: string[],
  domainScores: Record<SkillDomain, { correct: number; attempts: number }>
): CcnaChallenge {
  if (allChallenges.length === 0) return CORE_CHALLENGES[0];
  const completedSet = new Set(completedIds);

  // 1. Priority to uncompleted live-topology missions if available
  const uncompletedLive = allChallenges.find(
    (c) => c.isLiveTopology && !completedSet.has(c.id)
  );
  if (uncompletedLive) return uncompletedLive;

  // 2. Identify weakest domain (lowest completion ratio) that has uncompleted missions
  const domains = Object.keys(DOMAIN_META) as SkillDomain[];
  let weakestDomain: SkillDomain | null = null;
  let lowestRatio = 2;

  for (const d of domains) {
    const inDomain = allChallenges.filter((c) => c.domain === d);
    if (inDomain.length === 0) continue;
    const completedInDomain = inDomain.filter((c) => completedSet.has(c.id)).length;
    if (completedInDomain < inDomain.length) {
      const ratio = completedInDomain / inDomain.length;
      if (ratio < lowestRatio) {
        lowestRatio = ratio;
        weakestDomain = d;
      }
    }
  }

  if (weakestDomain) {
    const uncompletedInWeakest = allChallenges.find(
      (c) => c.domain === weakestDomain && !completedSet.has(c.id)
    );
    if (uncompletedInWeakest) return uncompletedInWeakest;
  }

  // 3. Next uncompleted mission in list
  const nextUncompleted = allChallenges.find((c) => !completedSet.has(c.id));
  if (nextUncompleted) return nextUncompleted;

  // 4. If all completed, return first mission or highest difficulty for practice
  const examReady = allChallenges.find((c) => c.difficulty === 'CCNA Exam Ready');
  return examReady || allChallenges[0];
}

export type StorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, val: string) => void;
  removeItem?: (key: string) => void;
};

export function getSafeStorage(
  customStorage?: StorageLike | Record<string, string>
): StorageLike | null {
  if (customStorage) {
    if (typeof (customStorage as any).getItem === 'function') {
      return customStorage as StorageLike;
    }
    const record = customStorage as Record<string, string>;
    return {
      getItem: (key: string) => (key in record ? record[key] : null),
      setItem: (key: string, val: string) => {
        record[key] = val;
      },
    };
  }
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  return null;
}

export function loadAndMigrateProgress(
  customStorage?: StorageLike | Record<string, string>
): ArenaProgressV2 {
  const storage = getSafeStorage(customStorage);
  if (!storage) {
    return DEFAULT_PROGRESS_V2;
  }

  try {
    // Check v2 first
    const v2Raw = storage.getItem(STORAGE_KEY_V2);
    if (v2Raw) {
      const parsed = JSON.parse(v2Raw);
      if (parsed && typeof parsed === 'object' && parsed.version === 2) {
        const loaded: ArenaProgressV2 = {
          ...DEFAULT_PROGRESS_V2,
          ...parsed,
          domainScores: {
            ...DEFAULT_PROGRESS_V2.domainScores,
            ...(parsed.domainScores || {}),
          },
          missionStats: parsed.missionStats || {},
          sessionCompletedIds: Array.isArray(parsed.sessionCompletedIds)
            ? parsed.sessionCompletedIds
            : [],
          completedIds: Array.isArray(parsed.completedIds) ? parsed.completedIds : [],
          unlockedAchievementIds: Array.isArray(parsed.unlockedAchievementIds)
            ? parsed.unlockedAchievementIds
            : [],
          achievementTimestamps: parsed.achievementTimestamps || {},
        };

        // Guarantee that any achievements already earned by completedIds are in unlockedAchievementIds
        if (loaded.completedIds.length > 0) {
          const initialAchs = evaluateAchievements(loaded, CORE_CHALLENGES);
          const nowStr = new Date().toISOString();
          let changed = false;
          initialAchs.forEach((ach) => {
            if (ach.unlocked && !loaded.unlockedAchievementIds.includes(ach.id)) {
              loaded.unlockedAchievementIds.push(ach.id);
              if (!loaded.achievementTimestamps[ach.id]) {
                loaded.achievementTimestamps[ach.id] = nowStr;
              }
              changed = true;
            }
          });
          if (changed) {
            storage.setItem(STORAGE_KEY_V2, JSON.stringify(loaded));
          }
        }

        return loaded;
      }
    }

    // Check v1 migration
    const v1Raw = storage.getItem(STORAGE_KEY_V1);
    if (v1Raw) {
      const parsedV1 = JSON.parse(v1Raw);
      if (parsedV1 && typeof parsedV1 === 'object') {
        const migrated: ArenaProgressV2 = {
          version: 2,
          xp: typeof parsedV1.xp === 'number' ? parsedV1.xp : 0,
          streak: typeof parsedV1.streak === 'number' ? parsedV1.streak : 0,
          bestStreak: typeof parsedV1.bestStreak === 'number' ? parsedV1.bestStreak : 0,
          completedIds: Array.isArray(parsedV1.completedIds) ? parsedV1.completedIds : [],
          domainScores: {
            ...DEFAULT_PROGRESS_V2.domainScores,
            ...(parsedV1.domainScores || {}),
          },
          missionStats: {},
          sessionGoal: 3,
          sessionCompletedIds: [],
          unlockedAchievementIds: [],
          achievementTimestamps: {},
        };

        // Populate initial missionStats from completedIds without fabricating unknown historical attempt details
        migrated.completedIds.forEach((id) => {
          migrated.missionStats[id] = {
            attempts: 1,
            cleanFirstAttempt: undefined,
            timesCompleted: 1,
            firstSolveAttempts: undefined,
            hintsUsedCount: undefined,
            isHistoricalV1: true,
          };
        });

        // Pre-populate unlocked achievements for migrated state
        const initialAchs = evaluateAchievements(migrated, CORE_CHALLENGES);
        const nowStr = new Date().toISOString();
        initialAchs.forEach((ach) => {
          if (ach.unlocked) {
            migrated.unlockedAchievementIds.push(ach.id);
            migrated.achievementTimestamps[ach.id] = nowStr;
          }
        });

        // Persist migrated v2
        storage.setItem(STORAGE_KEY_V2, JSON.stringify(migrated));
        return migrated;
      }
    }
  } catch (err) {
    console.warn('[CCNA Arena] Unable to access storage, using in-memory state:', err);
  }

  return DEFAULT_PROGRESS_V2;
}

export function saveProgressSafely(
  progress: ArenaProgressV2,
  customStorage?: StorageLike | Record<string, string>
): void {
  const storage = getSafeStorage(customStorage);
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY_V2, JSON.stringify(progress));
  } catch (err) {
    console.warn('[CCNA Arena] Unable to write progress to storage:', err);
  }
}

export function normalizeCliCommand(cmd: string): string {
  return cmd.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Generates a stable permutation of option indices for a multiple-choice question.
 * Allows custom randomFn for deterministic unit testing.
 */
export function generateOptionPermutation(
  optionCount: number,
  randomFn: () => number = Math.random
): number[] {
  if (optionCount <= 1) return Array.from({ length: optionCount }, (_, i) => i);
  const arr = Array.from({ length: optionCount }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(randomFn() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const STORAGE_KEY_REFLECTIONS = 'ccna_arena_learner_reflections_v1';

export interface LearnerReflection {
  whatLearned: string;
  whatToPractiseNext: string;
  whatToPracticeNext?: string;
  confidenceRating: string; // Unselected default is empty string ""
  confidenceFeedback?: string;
  suggestion: string;
  suggestions?: string;
  savedAt?: string;
}

export const DEFAULT_REFLECTION: LearnerReflection = {
  whatLearned: '',
  whatToPractiseNext: '',
  whatToPracticeNext: '',
  confidenceRating: '',
  confidenceFeedback: '',
  suggestion: '',
  suggestions: '',
};

export function loadLearnerReflection(
  customStorage?: StorageLike | Record<string, string>
): LearnerReflection {
  const storage = getSafeStorage(customStorage);
  if (!storage) return { ...DEFAULT_REFLECTION };

  try {
    const raw = storage.getItem(STORAGE_KEY_REFLECTIONS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        const next =
          typeof parsed.whatToPracticeNext === 'string'
            ? parsed.whatToPracticeNext
            : typeof parsed.whatToPractiseNext === 'string'
            ? parsed.whatToPractiseNext
            : '';
        const rating =
          typeof parsed.confidenceFeedback === 'string'
            ? parsed.confidenceFeedback
            : typeof parsed.confidenceRating === 'string'
            ? parsed.confidenceRating
            : '';
        const sug =
          typeof parsed.suggestions === 'string'
            ? parsed.suggestions
            : typeof parsed.suggestion === 'string'
            ? parsed.suggestion
            : '';

        return {
          whatLearned: typeof parsed.whatLearned === 'string' ? parsed.whatLearned : '',
          whatToPractiseNext: next,
          whatToPracticeNext: next,
          confidenceRating: rating,
          confidenceFeedback: rating,
          suggestion: sug,
          suggestions: sug,
          savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : undefined,
        };
      }
    }
  } catch (err) {
    console.warn('[CCNA Arena] Unable to read learner reflection from storage:', err);
  }
  return { ...DEFAULT_REFLECTION };
}

export function saveLearnerReflection(
  reflection: LearnerReflection,
  customStorage?: StorageLike | Record<string, string>
): void {
  const storage = getSafeStorage(customStorage);
  if (!storage) return;

  try {
    const next = reflection.whatToPracticeNext || reflection.whatToPractiseNext || '';
    const rating = reflection.confidenceFeedback || reflection.confidenceRating || '';
    const sug = reflection.suggestions || reflection.suggestion || '';
    const payload = {
      ...reflection,
      whatToPractiseNext: next,
      whatToPracticeNext: next,
      confidenceRating: rating,
      confidenceFeedback: rating,
      suggestion: sug,
      suggestions: sug,
      savedAt: new Date().toISOString(),
    };
    storage.setItem(STORAGE_KEY_REFLECTIONS, JSON.stringify(payload));
  } catch (err) {
    console.warn('[CCNA Arena] Unable to save learner reflection to storage:', err);
  }
}

export interface EvidenceSummaryMetrics {
  catalogMissionsCleared: number;
  catalogTotalMissions: number;
  coreMissionsCleared: number;
  coreTotalMissions: number;
  submittedAttempts: number;
  correctAttempts: number;
  accuracyLabel: string;
  accuracyPct: number | null;
  missionsUsingHints: number;
  cleanFirstAttemptCompletions: number;
  practiceCoveragePct: number;
  totalAttemptsSubmitted: number;
  totalCorrectCompletions: number;
  missionsWithHints: number;
}

export function computeEvidenceSummary(
  progress: ArenaProgressV2,
  allChallenges: CcnaChallenge[]
): EvidenceSummaryMetrics {
  const currentChallengeIds = new Set(allChallenges.map((c) => c.id));
  const catalogMissionsCleared = progress.completedIds.filter((id) =>
    currentChallengeIds.has(id)
  ).length;
  const catalogTotalMissions = allChallenges.length;

  const coreMissionsCleared = CORE_MISSION_IDS.filter((id) =>
    progress.completedIds.includes(id)
  ).length;
  const coreTotalMissions = CORE_MISSION_IDS.length;

  let submittedAttempts = 0;
  let correctAttempts = 0;
  let missionsUsingHints = 0;
  let cleanFirstAttemptCompletions = 0;

  allChallenges.forEach((challenge) => {
    const stats = progress.missionStats[challenge.id];
    if (stats) {
      submittedAttempts += stats.attempts || 0;
      correctAttempts += stats.timesCompleted || 0;
      if ((stats.hintsUsedCount || 0) > 0) {
        missionsUsingHints++;
      }
      if (stats.cleanFirstAttempt === true) {
        cleanFirstAttemptCompletions++;
      }
    }
  });

  const accuracyPct =
    submittedAttempts > 0 ? Math.round((correctAttempts / submittedAttempts) * 100) : null;
  const accuracyLabel =
    submittedAttempts === 0
      ? 'No attempts yet'
      : `${correctAttempts} / ${submittedAttempts} (${accuracyPct}%)`;

  const practiceCoveragePct =
    catalogTotalMissions > 0 ? Math.round((catalogMissionsCleared / catalogTotalMissions) * 100) : 0;

  return {
    catalogMissionsCleared,
    catalogTotalMissions,
    coreMissionsCleared,
    coreTotalMissions,
    submittedAttempts,
    correctAttempts,
    accuracyLabel,
    accuracyPct,
    missionsUsingHints,
    cleanFirstAttemptCompletions,
    practiceCoveragePct,
    totalAttemptsSubmitted: submittedAttempts,
    totalCorrectCompletions: correctAttempts,
    missionsWithHints: missionsUsingHints,
  };
}


export interface LearningEvidenceExport {
  exportTimestamp: string;
  arenaVersion: number;
  learningContext: {
    teachingChallenge: string;
    intendedLearners: string;
    suggestedActivitySequence: string[];
    formativeScopeDisclaimer: string;
  };
  summaryMetrics: EvidenceSummaryMetrics;
  missionRecords: Array<{
    id: string;
    title: string;
    domain: SkillDomain;
    domainLabel: string;
    difficulty: string;
    status: 'Completed' | 'In Progress' | 'Not Started';
    learningObjective: string;
    submittedAttempts: number;
    bestPerformance: string;
    hintSupportUsed: boolean;
    timesCompleted: number;
  }>;
  learnerReflection?: LearnerReflection;
}

export function buildEvidenceExport(
  progress: ArenaProgressV2,
  allChallenges: CcnaChallenge[],
  reflection?: LearnerReflection
): LearningEvidenceExport {
  const summaryMetrics = computeEvidenceSummary(progress, allChallenges);
  const completedSet = new Set(progress.completedIds);

  const missionRecords = allChallenges.map((c) => {
    const stats = progress.missionStats[c.id];
    const isDone = completedSet.has(c.id);
    const hasAttempts = stats && stats.attempts > 0;
    const status: 'Completed' | 'In Progress' | 'Not Started' = isDone
      ? 'Completed'
      : hasAttempts
      ? 'In Progress'
      : 'Not Started';

    let bestPerformance = '—';
    if (stats) {
      if (stats.isHistoricalV1 || stats.cleanFirstAttempt === undefined) {
        bestPerformance = 'Legacy completion (attempts untracked)';
      } else if (stats.cleanFirstAttempt) {
        bestPerformance = '1st Attempt Clean';
      } else if (stats.attempts > 0) {
        bestPerformance = `${stats.firstSolveAttempts || stats.attempts} Attempts`;
      }
    }

    return {
      id: c.id,
      title: c.title,
      domain: c.domain,
      domainLabel: DOMAIN_META[c.domain].label,
      difficulty: c.difficulty,
      status,
      learningObjective: c.learningObjective,
      submittedAttempts: stats ? stats.attempts : 0,
      bestPerformance,
      hintSupportUsed: stats ? (stats.hintsUsedCount || 0) > 0 : false,
      timesCompleted: stats ? stats.timesCompleted : 0,
    };
  });

  return {
    exportTimestamp: new Date().toISOString(),
    arenaVersion: 2,
    learningContext: {
      teachingChallenge:
        'Addresses low student participation and confidence applying introductory CCNA networking concepts to active Cisco IOS command line configuration and troubleshooting.',
      intendedLearners:
        'Introductory networking students and junior engineers bridging conceptual theory into hands-on Cisco IOS syntax.',
      suggestedActivitySequence: [
        '1. Attempt independently (formulate syntax or architectural choice without immediate aids)',
        '2. Use hints if needed (encouraged formative aid · zero XP penalty)',
        '3. Review mentor explanation (understand the underlying CCNA concept and common misconceptions)',
        '4. Practice again (deliberately re-run the drill to reinforce syntax recall)',
        '5. Reflect and document (record insights and export practice evidence)',
      ],
      formativeScopeDisclaimer:
        'In-app XP, rank titles, and badges track formative in-app practice engagement. They do not claim formal academic credit, class attendance, formal assessment, online SDL programme completion, or official Cisco CCNA certification.',
    },
    summaryMetrics,
    missionRecords,
    learnerReflection: reflection?.whatLearned || reflection?.whatToPractiseNext || reflection?.confidenceRating
      ? reflection
      : undefined,
  };
}

export function buildEvidenceMarkdown(exportData: LearningEvidenceExport): string {
  const { summaryMetrics, learningContext, missionRecords, learnerReflection } = exportData;

  let md = `# CCNA Skill Arena — Formative Learning Evidence & Reflection Log\n\n`;
  md += `**Export Generated:** ${new Date(exportData.exportTimestamp).toUTCString()}\n\n`;

  md += `## 1. Pedagogical Brief & Context\n`;
  md += `- **Teaching Challenge:** ${learningContext.teachingChallenge}\n`;
  md += `- **Intended Learners:** ${learningContext.intendedLearners}\n`;
  md += `- **Suggested Activity Sequence:**\n`;
  learningContext.suggestedActivitySequence.forEach((step) => {
    md += `  - ${step}\n`;
  });
  md += `- **Formative Scope Notice:** ${learningContext.formativeScopeDisclaimer}\n\n`;

  md += `## 2. Practice Summary Indicators\n`;
  md += `- **Current Catalog Coverage:** ${summaryMetrics.catalogMissionsCleared} / ${summaryMetrics.catalogTotalMissions} missions cleared\n`;
  md += `- **Core Curriculum Missions:** ${summaryMetrics.coreMissionsCleared} / ${summaryMetrics.coreTotalMissions} missions cleared\n`;
  md += `- **Submitted Practice Attempts:** ${summaryMetrics.submittedAttempts}\n`;
  md += `- **Practice Accuracy:** ${summaryMetrics.accuracyLabel}\n`;
  md += `- **Missions Supported with Hints:** ${summaryMetrics.missionsUsingHints} (Hints carry zero XP penalty)\n\n`;

  md += `## 3. Per-Mission Formative Practice Log\n\n`;
  md += `| Mission Title | CCNA Domain | Status | Submitted Attempts | Best Performance | Hint Support | Times Completed |\n`;
  md += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;
  missionRecords.forEach((m) => {
    md += `| ${m.title} | ${m.domainLabel} | ${m.status} | ${m.submittedAttempts > 0 ? m.submittedAttempts : 'None'} | ${m.bestPerformance} | ${m.hintSupportUsed ? 'Used' : 'None'} | ${m.timesCompleted} |\n`;
  });
  md += `\n`;

  md += `## 4. Per-Mission Learning Objectives\n\n`;
  missionRecords.forEach((m, idx) => {
    md += `${idx + 1}. **${m.title}** (${m.domainLabel})\n`;
    md += `   - *Objective:* ${m.learningObjective}\n`;
  });
  md += `\n`;

  if (learnerReflection) {
    md += `## 5. Learner Reflection & Engagement Feedback\n\n`;
    if (learnerReflection.whatLearned) {
      md += `### What Concept or Command Was Learned / Clarified\n${learnerReflection.whatLearned}\n\n`;
    }
    if (learnerReflection.whatToPractiseNext) {
      md += `### What Topic or Syntax to Practise Next\n${learnerReflection.whatToPractiseNext}\n\n`;
    }
    if (learnerReflection.confidenceRating) {
      md += `### Confidence Impact\n${learnerReflection.confidenceRating}\n\n`;
    }
    if (learnerReflection.suggestion) {
      md += `### Learner Suggestions / Comments\n${learnerReflection.suggestion}\n\n`;
    }
  }

  md += `---\n`;
  md += `*Notice: This evidence log documents formative self-directed practice. In-app XP, badges, and completion counts reflect practice engagement and do not represent formal academic grading, class attendance, formal assessment, or official Cisco CCNA certification.*\n`;

  return md;
}
