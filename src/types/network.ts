export type RoutingProtocol = 'AUTO' | 'OSPF' | 'STATIC' | 'EIGRP' | 'RIPv2';
export type InterVlanMethod = 'ROUTER_ON_A_STICK' | 'L3_SVI';

export interface VlanRequirement {
  id: string;
  vlanId: number;
  name: string;
  hostCount: number;
  purpose: string;
}

export interface NetworkConstraints {
  networkBlock: string;
  routingProtocol: RoutingProtocol;
  ospfProcessId: number;
  ospfArea: number;
  interVlanMethod: InterVlanMethod;
  nativeVlan: number;
  mgmtVlan: number;
  parkingVlan?: number;
  domainName: string;
  adminUsername: string;
  adminPassword: string;
  enableSecret: string;
  consolePassword: string;
  vlanRequirements: VlanRequirement[];
  additionalInstructions: string;
}

export interface RouterDevice {
  name: string;
  model: string;
  role: string;
  interfaces: string[];
  notes?: string;
}

export interface SwitchDevice {
  name: string;
  model: string;
  role: string;
  ports: string[];
  notes?: string;
}

export interface EndpointDevice {
  name: string;
  type: string;
  vlan: string;
  assignedIp?: string;
  defaultGateway?: string;
}

export interface PhysicalConnection {
  id: string;
  fromDevice: string;
  fromInterface: string;
  toDevice: string;
  toInterface: string;
  linkType: 'Trunk' | 'Access' | 'WAN' | 'Routed';
  vlan?: string;
  notes?: string;
}

export interface Stage1Topology {
  summary: string;
  routers: RouterDevice[];
  switches: SwitchDevice[];
  endpoints: EndpointDevice[];
  connections: PhysicalConnection[];
  assumptions: string[];
}

export interface SubnetAllocation {
  name: string;
  vlanId?: number;
  hostsNeeded: number;
  hostsAllocated: number;
  networkAddress: string;
  prefix: number;
  subnetMask: string;
  wildcardMask: string;
  usableRange: string;
  broadcastAddress: string;
}

export interface AddressingEntry {
  device: string;
  interface: string; // Interface / Subinterface (e.g. G0/0/0.10)
  vlanPurpose: string; // VLAN / Purpose
  ipAddress: string;
  subnetMask: string;
  prefix: number;
  usableRange: string;
  defaultGateway: string;
  purpose?: string;
  vlan?: string;
}

export interface Stage2Addressing {
  networkBlock: string;
  vlsmRationale: string;
  subnetAllocations: SubnetAllocation[];
  addressingTable: AddressingEntry[];
}

export interface DeviceConfigSections {
  hardening: string;
  remoteManagement: string;
  layer2Security?: string;
  switching?: string;
  routing?: string;
  interVlan?: string;
  interfaces: string;
}

export interface DeviceConfig {
  deviceName: string;
  deviceType: 'router' | 'switch' | 'l3switch';
  role: string;
  fullConfig: string;
  packetTracerPaste: string;
  sections: DeviceConfigSections;
}

export interface Stage4Rationale {
  subnetAllocationRationale: string;
  routingChoiceRationale: string;
  securityFeaturesRationale: string;
}

export interface VerificationItem {
  device: string;
  command: string;
  purpose: string;
  expectedOutput: string;
  category?: string;
}

export interface PingTest {
  fromDevice: string;
  targetIp: string;
  targetDescription: string;
  purpose: string;
  expectedOutput: string;
}

export interface Stage5Verification {
  layer2Commands: VerificationItem[];
  layer3RoutingCommands: VerificationItem[];
  pingTests: PingTest[];
  checklist: Array<{
    step: number;
    title: string;
    description: string;
    commands: string[];
  }>;
}

export interface GovernanceNotice {
  noProductionCredentialsWarning: string;
  hallucinationDeclaration: string;
  labOnlyVerificationMandate: string;
}

export interface ArchitectureReport {
  id: string;
  title: string;
  summary: string;
  timestamp: string;
  constraints: NetworkConstraints;
  governanceNotice?: GovernanceNotice;
  stage1_topology: Stage1Topology;
  stage2_addressing: Stage2Addressing;
  stage3_configs: DeviceConfig[];
  stage4_rationale: Stage4Rationale;
  stage5_verification: Stage5Verification;
  diagramCoordinates?: {
    [deviceName: string]: { x: number; y: number; type: 'router' | 'switch' | 'pc' | 'server' };
  };
  uploadedFile?: {
    name: string;
    mimeType: string;
    previewUrl?: string;
    size?: number;
  };
}

// Aliases for backwards compatibility
export type Phase1Inventory = Stage1Topology;
export type Phase2Addressing = Stage2Addressing;
export type Phase4Rationale = {
  technicalRationale: {
    subnetting: string;
    hardening: string;
    layer2Security: string;
    routing: string;
  };
  verifications: Array<{
    device: string;
    command: string;
    purpose: string;
    expectedOutput: string;
    category: 'Interface' | 'VLAN' | 'Routing' | 'Security' | 'Connectivity';
  }>;
  testingPlan: Array<{
    step: number;
    title: string;
    description: string;
    commands: string[];
  }>;
};
