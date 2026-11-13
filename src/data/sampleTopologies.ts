import { ArchitectureReport } from '../types/network';

export const SAMPLE_TOPOLOGIES: ArchitectureReport[] = [
  {
    id: 'topo-roas-ospf',
    title: 'Enterprise Branch Campus: Router-on-a-Stick with OSPFv2',
    summary:
      'Production-grade Cisco enterprise branch topology featuring a Cisco 4321 edge router (Router1-Gateway), Cisco Catalyst 2960 distribution switch (Switch1-Core), and floor access switch (Switch2-Floor1). Inter-VLAN routing is accomplished via 802.1Q subinterfaces (Router-on-a-Stick). Hardened with SSHv2, console login local, dynamic OSPFv2 routing, PortFast, BPDU Guard, Native VLAN 999, and an isolated Parking VLAN.',
    timestamp: '2026-09-24 20:30:00 UTC',
    governanceNotice: {
      noProductionCredentialsWarning:
        'NO PRODUCTION CREDENTIALS: All passwords utilize standardized lab placeholders (LAB_SECRET_REPLACE_ME, LAB_ADMIN_PASSWORD_REPLACE_ME, LAB_CONSOLE_PASSWORD_REPLACE_ME). Never deploy placeholder passwords into live production networks.',
      hallucinationDeclaration:
        'HALLUCINATION & AMBIGUITY DECLARATION: Interface designations and topology connections are strictly derived from visible diagram endpoints; unreadable links are explicitly quarantined in Assumptions & Unverified Connections without silent guessing.',
      labOnlyVerificationMandate:
        'LAB-ONLY VERIFICATION MANDATE: All configurations in this architecture are AI-generated solely for CCNA 200-301 training and simulation. They must be validated in Cisco Packet Tracer, GNS3, or lab staging hardware prior to implementation.',
    },
    constraints: {
      networkBlock: '192.168.10.0/24',
      routingProtocol: 'OSPF',
      ospfProcessId: 1,
      ospfArea: 0,
      interVlanMethod: 'ROUTER_ON_A_STICK',
      nativeVlan: 999,
      mgmtVlan: 99,
      parkingVlan: 888,
      domainName: 'lab.local',
      adminUsername: 'admin',
      adminPassword: 'LAB_ADMIN_PASSWORD_REPLACE_ME',
      enableSecret: 'LAB_SECRET_REPLACE_ME',
      consolePassword: 'LAB_CONSOLE_PASSWORD_REPLACE_ME',
      vlanRequirements: [
        { id: 'v10', vlanId: 10, name: 'Sales', hostCount: 50, purpose: 'Sales Department LAN' },
        { id: 'v20', vlanId: 20, name: 'Engineering', hostCount: 30, purpose: 'Engineering Lab LAN' },
        { id: 'v30', vlanId: 30, name: 'Servers', hostCount: 14, purpose: 'Local Data Center & DMZ' },
        { id: 'v99', vlanId: 99, name: 'Management', hostCount: 6, purpose: 'Switch Management SVI' },
        { id: 'v999', vlanId: 999, name: 'Native_VLAN', hostCount: 2, purpose: '802.1Q Native Trunk VLAN' },
      ],
      additionalInstructions: 'Enforce PortFast and BPDU Guard on all access ports. Change native VLAN away from VLAN 1 to mitigate VLAN hopping attacks. Shut down unused ports into an isolated parking VLAN. End all configs with end and write memory.',
    },
    diagramCoordinates: {
      'Router1-Gateway': { x: 400, y: 80, type: 'router' },
      'Switch1-Core': { x: 400, y: 220, type: 'switch' },
      'Switch2-Floor1': { x: 200, y: 350, type: 'switch' },
      'PC-Sales': { x: 100, y: 470, type: 'pc' },
      'PC-Engineering': { x: 260, y: 470, type: 'pc' },
      'SRV-Internal': { x: 580, y: 350, type: 'server' },
    },
    stage1_topology: {
      summary:
        'Identified 1 Router (Cisco ISR 4321), 2 Layer-2 Switches (Catalyst 2960), and 3 Endpoints (2 Workstations, 1 Server). High-speed Gigabit links connect the router and distribution layer, with FastEthernet access ports connecting user endpoints.',
      routers: [
        {
          name: 'Router1-Gateway',
          model: 'Cisco 4321 ISR',
          role: 'Branch Gateway & Inter-VLAN Router',
          interfaces: ['GigabitEthernet0/0/0', 'GigabitEthernet0/0/1'],
          notes: 'G0/0/0 connects to Switch1 trunk with subinterfaces .10, .20, .30, .99; G0/0/1 uplink to ISP/WAN',
        },
      ],
      switches: [
        {
          name: 'Switch1-Core',
          model: 'Cisco Catalyst 2960-24TT',
          role: 'Core Distribution Switch',
          ports: ['GigabitEthernet0/1', 'GigabitEthernet0/2', 'FastEthernet0/1 - FastEthernet0/24'],
          notes: 'G0/1 trunk to Router1, G0/2 trunk to Switch2. Unused ports quarantined in parking VLAN.',
        },
        {
          name: 'Switch2-Floor1',
          model: 'Cisco Catalyst 2960-24TT',
          role: 'Access Switch (Floor 1)',
          ports: ['GigabitEthernet0/1', 'FastEthernet0/1 - FastEthernet0/24'],
          notes: 'G0/1 trunk uplink to Switch1; F0/1 access VLAN 10 (Sales), F0/2 access VLAN 20 (Engineering).',
        },
      ],
      endpoints: [
        {
          name: 'PC-Sales',
          type: 'Desktop Workstation',
          vlan: 'VLAN 10 (Sales)',
          assignedIp: '192.168.10.10',
          defaultGateway: '192.168.10.1',
        },
        {
          name: 'PC-Engineering',
          type: 'Desktop Workstation',
          vlan: 'VLAN 20 (Engineering)',
          assignedIp: '192.168.10.70',
          defaultGateway: '192.168.10.65',
        },
        {
          name: 'SRV-Internal',
          type: 'Enterprise Server',
          vlan: 'VLAN 30 (Servers)',
          assignedIp: '192.168.10.100',
          defaultGateway: '192.168.10.97',
        },
      ],
      connections: [
        {
          id: 'link-1',
          fromDevice: 'Router1-Gateway',
          fromInterface: 'GigabitEthernet0/0/0',
          toDevice: 'Switch1-Core',
          toInterface: 'GigabitEthernet0/1',
          linkType: 'Trunk',
          vlan: '802.1Q (Native VLAN 999)',
          notes: 'Router1-Gateway G0/0/0 <--> Switch1-Core G0/1 802.1Q ROAS Trunk',
        },
        {
          id: 'link-2',
          fromDevice: 'Switch1-Core',
          fromInterface: 'GigabitEthernet0/2',
          toDevice: 'Switch2-Floor1',
          toInterface: 'GigabitEthernet0/1',
          linkType: 'Trunk',
          vlan: '802.1Q (Native VLAN 999)',
          notes: 'Switch1-Core G0/2 <--> Switch2-Floor1 G0/1 Distribution Trunk',
        },
        {
          id: 'link-3',
          fromDevice: 'Switch2-Floor1',
          fromInterface: 'FastEthernet0/1',
          toDevice: 'PC-Sales',
          toInterface: 'FastEthernet0',
          linkType: 'Access',
          vlan: 'VLAN 10 (Sales)',
          notes: 'Switch2-Floor1 Fa0/1 <--> PC-Sales Fa0 Access Port',
        },
        {
          id: 'link-4',
          fromDevice: 'Switch2-Floor1',
          fromInterface: 'FastEthernet0/2',
          toDevice: 'PC-Engineering',
          toInterface: 'FastEthernet0',
          linkType: 'Access',
          vlan: 'VLAN 20 (Engineering)',
          notes: 'Switch2-Floor1 Fa0/2 <--> PC-Engineering Fa0 Access Port',
        },
        {
          id: 'link-5',
          fromDevice: 'Switch1-Core',
          fromInterface: 'FastEthernet0/10',
          toDevice: 'SRV-Internal',
          toInterface: 'GigabitEthernet0',
          linkType: 'Access',
          vlan: 'VLAN 30 (Servers)',
          notes: 'Switch1-Core Fa0/10 <--> SRV-Internal Gi0 Access Port',
        },
      ],
      assumptions: [
        'ASSUMPTIONS & UNVERIFIED CONNECTIONS: Router interface G0/0/0 acts as the internal 802.1Q trunk connection to Switch1-Core G0/1 based on topology adjacency.',
        'ASSUMPTIONS & UNVERIFIED CONNECTIONS: Port labels for PCs are assigned sequentially (Fa0/1 for PC-Sales, Fa0/2 for PC-Engineering) as diagram tags are unnumbered.',
        'ASSUMPTIONS & UNVERIFIED CONNECTIONS: Default gateway IP is assigned to the first usable host address (.1, .65, .97, .113) in each subnet.',
        'ASSUMPTIONS & UNVERIFIED CONNECTIONS: Unused switchports (Fa0/1-9, Fa0/11-24) are quarantined into Parking VLAN 888 and administratively shut down.',
      ],
    },
    stage2_addressing: {
      networkBlock: '192.168.10.0/24',
      vlsmRationale:
        'Divided the /24 base network block using Variable Length Subnet Masking (VLSM). Sorted requirements strictly descending by required host addresses: VLAN 10 (50 hosts -> /26), VLAN 20 (30 hosts -> /27), VLAN 30 (14 hosts -> /28), VLAN 99 (6 hosts -> /29), and point-to-point /30 subnets. This guarantees zero overlapping subnets and preserves 128 unallocated addresses for future campus expansion.',
      subnetAllocations: [
        {
          name: 'VLAN 10 - Sales',
          vlanId: 10,
          hostsNeeded: 50,
          hostsAllocated: 62,
          networkAddress: '192.168.10.0',
          prefix: 26,
          subnetMask: '255.255.255.192',
          wildcardMask: '0.0.0.63',
          usableRange: '192.168.10.1 - 192.168.10.62',
          broadcastAddress: '192.168.10.63',
        },
        {
          name: 'VLAN 20 - Engineering',
          vlanId: 20,
          hostsNeeded: 30,
          hostsAllocated: 30,
          networkAddress: '192.168.10.64',
          prefix: 27,
          subnetMask: '255.255.255.224',
          wildcardMask: '0.0.0.31',
          usableRange: '192.168.10.65 - 192.168.10.94',
          broadcastAddress: '192.168.10.95',
        },
        {
          name: 'VLAN 30 - Servers',
          vlanId: 30,
          hostsNeeded: 14,
          hostsAllocated: 14,
          networkAddress: '192.168.10.96',
          prefix: 28,
          subnetMask: '255.255.255.240',
          wildcardMask: '0.0.0.15',
          usableRange: '192.168.10.97 - 192.168.10.110',
          broadcastAddress: '192.168.10.111',
        },
        {
          name: 'VLAN 99 - Management',
          vlanId: 99,
          hostsNeeded: 6,
          hostsAllocated: 6,
          networkAddress: '192.168.10.112',
          prefix: 29,
          subnetMask: '255.255.255.248',
          wildcardMask: '0.0.0.7',
          usableRange: '192.168.10.113 - 192.168.10.118',
          broadcastAddress: '192.168.10.119',
        },
      ],
      addressingTable: [
        {
          device: 'Router1-Gateway',
          interface: 'G0/0/0.10',
          vlanPurpose: 'VLAN 10 (Sales Gateway)',
          ipAddress: '192.168.10.1',
          subnetMask: '255.255.255.192',
          prefix: 26,
          usableRange: '192.168.10.1 - 192.168.10.62',
          defaultGateway: 'N/A',
          vlan: '10',
        },
        {
          device: 'Router1-Gateway',
          interface: 'G0/0/0.20',
          vlanPurpose: 'VLAN 20 (Engineering Gateway)',
          ipAddress: '192.168.10.65',
          subnetMask: '255.255.255.224',
          prefix: 27,
          usableRange: '192.168.10.65 - 192.168.10.94',
          defaultGateway: 'N/A',
          vlan: '20',
        },
        {
          device: 'Router1-Gateway',
          interface: 'G0/0/0.30',
          vlanPurpose: 'VLAN 30 (Servers Gateway)',
          ipAddress: '192.168.10.97',
          subnetMask: '255.255.255.240',
          prefix: 28,
          usableRange: '192.168.10.97 - 192.168.10.110',
          defaultGateway: 'N/A',
          vlan: '30',
        },
        {
          device: 'Router1-Gateway',
          interface: 'G0/0/0.99',
          vlanPurpose: 'VLAN 99 (Management Gateway)',
          ipAddress: '192.168.10.113',
          subnetMask: '255.255.255.248',
          prefix: 29,
          usableRange: '192.168.10.113 - 192.168.10.118',
          defaultGateway: 'N/A',
          vlan: '99',
        },
        {
          device: 'Switch1-Core',
          interface: 'Vlan99',
          vlanPurpose: 'VLAN 99 (Management SVI)',
          ipAddress: '192.168.10.114',
          subnetMask: '255.255.255.248',
          prefix: 29,
          usableRange: '192.168.10.113 - 192.168.10.118',
          defaultGateway: '192.168.10.113',
          vlan: '99',
        },
        {
          device: 'Switch2-Floor1',
          interface: 'Vlan99',
          vlanPurpose: 'VLAN 99 (Management SVI)',
          ipAddress: '192.168.10.115',
          subnetMask: '255.255.255.248',
          prefix: 29,
          usableRange: '192.168.10.113 - 192.168.10.118',
          defaultGateway: '192.168.10.113',
          vlan: '99',
        },
        {
          device: 'PC-Sales',
          interface: 'FastEthernet0',
          vlanPurpose: 'VLAN 10 (Sales Workstation)',
          ipAddress: '192.168.10.10',
          subnetMask: '255.255.255.192',
          prefix: 26,
          usableRange: '192.168.10.1 - 192.168.10.62',
          defaultGateway: '192.168.10.1',
          vlan: '10',
        },
        {
          device: 'PC-Engineering',
          interface: 'FastEthernet0',
          vlanPurpose: 'VLAN 20 (Engineering Workstation)',
          ipAddress: '192.168.10.70',
          subnetMask: '255.255.255.224',
          prefix: 27,
          usableRange: '192.168.10.65 - 192.168.10.94',
          defaultGateway: '192.168.10.65',
          vlan: '20',
        },
        {
          device: 'SRV-Internal',
          interface: 'GigabitEthernet0',
          vlanPurpose: 'VLAN 30 (Enterprise Web/File Server)',
          ipAddress: '192.168.10.100',
          subnetMask: '255.255.255.240',
          prefix: 28,
          usableRange: '192.168.10.97 - 192.168.10.110',
          defaultGateway: '192.168.10.97',
          vlan: '30',
        },
      ],
    },
    stage3_configs: [
      {
        deviceName: 'Router1-Gateway',
        deviceType: 'router',
        role: 'Gateway Router & Inter-VLAN ROAS',
        fullConfig: `! =======================================================
! CISCO IOS PRODUCTION CONFIGURATION: Router1-Gateway
! CCNA 200-301 COMPLIANT HARDENING & ROUTING
! NOTICE: LAB PLACEHOLDERS ACTIVE - NEVER USE IN PRODUCTION
! =======================================================
enable
configure terminal

! --- STAGE 3.1: DEVICE HARDENING ---
hostname Router1-Gateway
no ip domain-lookup
service password-encryption
enable secret LAB_SECRET_REPLACE_ME

banner motd # Authorized Access Only! Lab Simulation Environment #

! --- STAGE 3.2: REMOTE MANAGEMENT & CONSOLE HARDENING ---
ip domain-name lab.local
crypto key generate rsa modulus 2048
ip ssh version 2
username admin privilege 15 secret LAB_ADMIN_PASSWORD_REPLACE_ME

line console 0
 login local
 logging synchronous
 exec-timeout 5 0
 exit

line vty 0 4
 transport input ssh
 login local
 exec-timeout 5 0
 logging synchronous
 exit

! --- STAGE 3.3: INTER-VLAN ROUTING (ROUTER-ON-A-STICK) ---
interface GigabitEthernet0/0/0
 description TRUNK LINK TO Switch1-Core G0/1
 no ip address
 no shutdown
 exit

interface GigabitEthernet0/0/0.10
 description DEFAULT GATEWAY FOR VLAN 10 (SALES)
 encapsulation dot1Q 10
 ip address 192.168.10.1 255.255.255.192
 exit

interface GigabitEthernet0/0/0.20
 description DEFAULT GATEWAY FOR VLAN 20 (ENGINEERING)
 encapsulation dot1Q 20
 ip address 192.168.10.65 255.255.255.224
 exit

interface GigabitEthernet0/0/0.30
 description DEFAULT GATEWAY FOR VLAN 30 (SERVERS)
 encapsulation dot1Q 30
 ip address 192.168.10.97 255.255.255.240
 exit

interface GigabitEthernet0/0/0.99
 description DEFAULT GATEWAY FOR MANAGEMENT (VLAN 99)
 encapsulation dot1Q 99
 ip address 192.168.10.113 255.255.255.248
 exit

! --- STAGE 3.4: ROUTING PROTOCOL (OSPFv2) ---
router ospf 1
 router-id 1.1.1.1
 passive-interface GigabitEthernet0/0/0.10
 passive-interface GigabitEthernet0/0/0.20
 passive-interface GigabitEthernet0/0/0.30
 network 192.168.10.0 0.0.0.63 area 0
 network 192.168.10.64 0.0.0.31 area 0
 network 192.168.10.96 0.0.0.15 area 0
 network 192.168.10.112 0.0.0.7 area 0
 exit

! Static default route for Internet / WAN uplink
ip route 0.0.0.0 0.0.0.0 GigabitEthernet0/0/1 203.0.113.1

end
write memory`,
        packetTracerPaste: `enable
configure terminal
hostname Router1-Gateway
no ip domain-lookup
service password-encryption
enable secret LAB_SECRET_REPLACE_ME
banner motd # Authorized Access Only! Lab Simulation Environment #
ip domain-name lab.local
crypto key generate rsa modulus 2048
ip ssh version 2
username admin privilege 15 secret LAB_ADMIN_PASSWORD_REPLACE_ME
line console 0
 login local
 logging synchronous
 exec-timeout 5 0
line vty 0 4
 transport input ssh
 login local
 exec-timeout 5 0
 logging synchronous
interface GigabitEthernet0/0/0
 no ip address
 no shutdown
interface GigabitEthernet0/0/0.10
 encapsulation dot1Q 10
 ip address 192.168.10.1 255.255.255.192
interface GigabitEthernet0/0/0.20
 encapsulation dot1Q 20
 ip address 192.168.10.65 255.255.255.224
interface GigabitEthernet0/0/0.30
 encapsulation dot1Q 30
 ip address 192.168.10.97 255.255.255.240
interface GigabitEthernet0/0/0.99
 encapsulation dot1Q 99
 ip address 192.168.10.113 255.255.255.248
router ospf 1
 router-id 1.1.1.1
 passive-interface GigabitEthernet0/0/0.10
 passive-interface GigabitEthernet0/0/0.20
 passive-interface GigabitEthernet0/0/0.30
 network 192.168.10.0 0.0.0.63 area 0
 network 192.168.10.64 0.0.0.31 area 0
 network 192.168.10.96 0.0.0.15 area 0
 network 192.168.10.112 0.0.0.7 area 0
ip route 0.0.0.0 0.0.0.0 GigabitEthernet0/0/1 203.0.113.1
end
write memory`,
        sections: {
          hardening: `hostname Router1-Gateway\nno ip domain-lookup\nservice password-encryption\nenable secret LAB_SECRET_REPLACE_ME\nbanner motd # Authorized Access Only! Lab Simulation Environment #`,
          remoteManagement: `ip domain-name lab.local\ncrypto key generate rsa modulus 2048\nip ssh version 2\nusername admin privilege 15 secret LAB_ADMIN_PASSWORD_REPLACE_ME\nline console 0\n login local\n logging synchronous\n exec-timeout 5 0\nline vty 0 4\n transport input ssh\n login local\n exec-timeout 5 0`,
          interVlan: `interface GigabitEthernet0/0/0\n no ip address\n no shutdown\ninterface GigabitEthernet0/0/0.10\n encapsulation dot1Q 10\n ip address 192.168.10.1 255.255.255.192\ninterface GigabitEthernet0/0/0.20\n encapsulation dot1Q 20\n ip address 192.168.10.65 255.255.255.224\ninterface GigabitEthernet0/0/0.30\n encapsulation dot1Q 30\n ip address 192.168.10.97 255.255.255.240\ninterface GigabitEthernet0/0/0.99\n encapsulation dot1Q 99\n ip address 192.168.10.113 255.255.255.248`,
          routing: `router ospf 1\n router-id 1.1.1.1\n passive-interface GigabitEthernet0/0/0.10\n passive-interface GigabitEthernet0/0/0.20\n passive-interface GigabitEthernet0/0/0.30\n network 192.168.10.0 0.0.0.63 area 0\n network 192.168.10.64 0.0.0.31 area 0\n network 192.168.10.96 0.0.0.15 area 0\n network 192.168.10.112 0.0.0.7 area 0\nip route 0.0.0.0 0.0.0.0 GigabitEthernet0/0/1 203.0.113.1`,
          interfaces: `interface GigabitEthernet0/0/0\n no shutdown`,
        },
      },
      {
        deviceName: 'Switch1-Core',
        deviceType: 'switch',
        role: 'Distribution Switch',
        fullConfig: `! =======================================================
! CISCO IOS PRODUCTION CONFIGURATION: Switch1-Core
! CCNA 200-301 COMPLIANT HARDENING & SWITCHING
! NOTICE: LAB PLACEHOLDERS ACTIVE - NEVER USE IN PRODUCTION
! =======================================================
enable
configure terminal

! --- STAGE 3.1: DEVICE HARDENING ---
hostname Switch1-Core
no ip domain-lookup
service password-encryption
enable secret LAB_SECRET_REPLACE_ME

banner motd # Authorized Access Only! Lab Simulation Environment #

! --- STAGE 3.2: CONSOLE & VTY HARDENING ---
ip domain-name lab.local
crypto key generate rsa modulus 2048
ip ssh version 2
username admin privilege 15 secret LAB_ADMIN_PASSWORD_REPLACE_ME

line console 0
 login local
 logging synchronous
 exec-timeout 5 0
 exit

line vty 0 4
 transport input ssh
 login local
 exec-timeout 5 0
 logging synchronous
 exit

! --- STAGE 3.3: VLAN DATABASE & PARKING VLAN ---
vlan 10
 name Sales
 exit
vlan 20
 name Engineering
 exit
vlan 30
 name Servers
 exit
vlan 99
 name Management
 exit
vlan 888
 name Parking_VLAN
 exit
vlan 999
 name Native_VLAN
 exit

! --- STAGE 3.4: MANAGEMENT SVI ---
interface Vlan99
 description MANAGEMENT SVI FOR Switch1
 ip address 192.168.10.114 255.255.255.248
 no shutdown
 exit
ip default-gateway 192.168.10.113

! --- STAGE 3.5: 802.1Q TRUNKING & NATIVE VLAN 999 ---
interface GigabitEthernet0/1
 description TRUNK UPLINK TO Router1-Gateway G0/0/0
 switchport mode trunk
 switchport trunk native vlan 999
 switchport trunk allowed vlan 10,20,30,99
 switchport nonegotiate
 no shutdown
 exit

interface GigabitEthernet0/2
 description TRUNK DOWNLINK TO Switch2-Floor1 G0/1
 switchport mode trunk
 switchport trunk native vlan 999
 switchport trunk allowed vlan 10,20,30,99
 switchport nonegotiate
 no shutdown
 exit

! --- STAGE 3.6: ACCESS PORTS (PORTFAST & BPDU GUARD) ---
interface FastEthernet0/10
 description ACCESS PORT TO SRV-Internal
 switchport mode access
 switchport access vlan 30
 spanning-tree portfast
 spanning-tree bpduguard enable
 no shutdown
 exit

! --- STAGE 3.7: PARKING VLAN & UNUSED PORTS SHUTDOWN ---
interface range FastEthernet0/1 - 9, FastEthernet0/11 - 24
 description UNUSED PORTS - MOVED TO PARKING VLAN & SHUTDOWN
 switchport mode access
 switchport access vlan 888
 shutdown
 exit

end
write memory`,
        packetTracerPaste: `enable
configure terminal
hostname Switch1-Core
no ip domain-lookup
service password-encryption
enable secret LAB_SECRET_REPLACE_ME
banner motd # Authorized Access Only! Lab Simulation Environment #
ip domain-name lab.local
crypto key generate rsa modulus 2048
ip ssh version 2
username admin privilege 15 secret LAB_ADMIN_PASSWORD_REPLACE_ME
line console 0
 login local
 logging synchronous
 exec-timeout 5 0
line vty 0 4
 transport input ssh
 login local
 exec-timeout 5 0
logging synchronous
vlan 10
 name Sales
vlan 20
 name Engineering
vlan 30
 name Servers
vlan 99
 name Management
vlan 888
 name Parking_VLAN
vlan 999
 name Native_VLAN
interface Vlan99
 ip address 192.168.10.114 255.255.255.248
 no shutdown
ip default-gateway 192.168.10.113
interface GigabitEthernet0/1
 switchport mode trunk
 switchport trunk native vlan 999
 switchport trunk allowed vlan 10,20,30,99
 switchport nonegotiate
interface GigabitEthernet0/2
 switchport mode trunk
 switchport trunk native vlan 999
 switchport trunk allowed vlan 10,20,30,99
 switchport nonegotiate
interface FastEthernet0/10
 switchport mode access
 switchport access vlan 30
 spanning-tree portfast
 spanning-tree bpduguard enable
interface range FastEthernet0/1 - 9, FastEthernet0/11 - 24
 switchport mode access
 switchport access vlan 888
 shutdown
end
write memory`,
        sections: {
          hardening: `hostname Switch1-Core\nno ip domain-lookup\nservice password-encryption\nenable secret LAB_SECRET_REPLACE_ME\nbanner motd # Authorized Access Only! Lab Simulation Environment #`,
          remoteManagement: `ip domain-name lab.local\ncrypto key generate rsa modulus 2048\nip ssh version 2\nusername admin privilege 15 secret LAB_ADMIN_PASSWORD_REPLACE_ME\nline console 0\n login local\n logging synchronous\n exec-timeout 5 0\nline vty 0 4\n transport input ssh\n login local\n exec-timeout 5 0`,
          layer2Security: `interface range FastEthernet0/1 - 9, FastEthernet0/11 - 24\n switchport mode access\n switchport access vlan 888\n shutdown`,
          switching: `vlan 10\n name Sales\nvlan 20\n name Engineering\nvlan 30\n name Servers\nvlan 99\n name Management\nvlan 888\n name Parking_VLAN\nvlan 999\n name Native_VLAN\ninterface GigabitEthernet0/1\n switchport mode trunk\n switchport trunk native vlan 999\ninterface FastEthernet0/10\n switchport mode access\n switchport access vlan 30\n spanning-tree portfast\n spanning-tree bpduguard enable`,
          interfaces: `interface Vlan99\n ip address 192.168.10.114 255.255.255.248\n no shutdown\nip default-gateway 192.168.10.113`,
        },
      },
      {
        deviceName: 'Switch2-Floor1',
        deviceType: 'switch',
        role: 'Floor 1 Access Switch',
        fullConfig: `! =======================================================
! CISCO IOS PRODUCTION CONFIGURATION: Switch2-Floor1
! CCNA 200-301 COMPLIANT HARDENING & ACCESS PORTS
! NOTICE: LAB PLACEHOLDERS ACTIVE - NEVER USE IN PRODUCTION
! =======================================================
enable
configure terminal

! --- STAGE 3.1: DEVICE HARDENING ---
hostname Switch2-Floor1
no ip domain-lookup
service password-encryption
enable secret LAB_SECRET_REPLACE_ME

banner motd # Authorized Access Only! Lab Simulation Environment #

! --- STAGE 3.2: CONSOLE & VTY HARDENING ---
ip domain-name lab.local
crypto key generate rsa modulus 2048
ip ssh version 2
username admin privilege 15 secret LAB_ADMIN_PASSWORD_REPLACE_ME

line console 0
 login local
 logging synchronous
 exec-timeout 5 0
 exit

line vty 0 4
 transport input ssh
 login local
 exec-timeout 5 0
 logging synchronous
 exit

! --- STAGE 3.3: VLAN DATABASE & PARKING VLAN ---
vlan 10
 name Sales
 exit
vlan 20
 name Engineering
 exit
vlan 30
 name Servers
 exit
vlan 99
 name Management
 exit
vlan 888
 name Parking_VLAN
 exit
vlan 999
 name Native_VLAN
 exit

! --- STAGE 3.4: SVI MANAGEMENT ---
interface Vlan99
 description MANAGEMENT SVI FOR Switch2
 ip address 192.168.10.115 255.255.255.248
 no shutdown
 exit
ip default-gateway 192.168.10.113

! --- STAGE 3.5: TRUNK TO DISTRIBUTION ---
interface GigabitEthernet0/1
 description TRUNK UPLINK TO Switch1-Core G0/2
 switchport mode trunk
 switchport trunk native vlan 999
 switchport trunk allowed vlan 10,20,30,99
 switchport nonegotiate
 no shutdown
 exit

! --- STAGE 3.6: ACCESS PORTS (PORTFAST & BPDU GUARD) ---
interface FastEthernet0/1
 description ACCESS PORT FOR PC-Sales (VLAN 10)
 switchport mode access
 switchport access vlan 10
 spanning-tree portfast
 spanning-tree bpduguard enable
 no shutdown
 exit

interface FastEthernet0/2
 description ACCESS PORT FOR PC-Engineering (VLAN 20)
 switchport mode access
 switchport access vlan 20
 spanning-tree portfast
 spanning-tree bpduguard enable
 no shutdown
 exit

! --- STAGE 3.7: PARKING VLAN & UNUSED PORTS SHUTDOWN ---
interface GigabitEthernet0/2
 description UNUSED UPLINK
 switchport mode access
 switchport access vlan 888
 shutdown
 exit

interface range FastEthernet0/3 - 24
 description UNUSED ACCESS PORTS - QUARANTINE TO PARKING VLAN
 switchport mode access
 switchport access vlan 888
 shutdown
 exit

end
write memory`,
        packetTracerPaste: `enable
configure terminal
hostname Switch2-Floor1
no ip domain-lookup
service password-encryption
enable secret LAB_SECRET_REPLACE_ME
banner motd # Authorized Access Only! Lab Simulation Environment #
ip domain-name lab.local
crypto key generate rsa modulus 2048
ip ssh version 2
username admin privilege 15 secret LAB_ADMIN_PASSWORD_REPLACE_ME
line console 0
 login local
 logging synchronous
 exec-timeout 5 0
line vty 0 4
 transport input ssh
 login local
 exec-timeout 5 0
logging synchronous
vlan 10
 name Sales
vlan 20
 name Engineering
vlan 30
 name Servers
vlan 99
 name Management
vlan 888
 name Parking_VLAN
vlan 999
 name Native_VLAN
interface Vlan99
 ip address 192.168.10.115 255.255.255.248
 no shutdown
ip default-gateway 192.168.10.113
interface GigabitEthernet0/1
 switchport mode trunk
 switchport trunk native vlan 999
 switchport trunk allowed vlan 10,20,30,99
 switchport nonegotiate
interface FastEthernet0/1
 switchport mode access
 switchport access vlan 10
 spanning-tree portfast
 spanning-tree bpduguard enable
interface FastEthernet0/2
 switchport mode access
 switchport access vlan 20
 spanning-tree portfast
 spanning-tree bpduguard enable
interface range FastEthernet0/3 - 24, GigabitEthernet0/2
 switchport mode access
 switchport access vlan 888
 shutdown
end
write memory`,
        sections: {
          hardening: `hostname Switch2-Floor1\nno ip domain-lookup\nservice password-encryption\nenable secret LAB_SECRET_REPLACE_ME\nbanner motd # Authorized Access Only! Lab Simulation Environment #`,
          remoteManagement: `ip domain-name lab.local\ncrypto key generate rsa modulus 2048\nip ssh version 2\nusername admin privilege 15 secret LAB_ADMIN_PASSWORD_REPLACE_ME\nline console 0\n login local\n logging synchronous\n exec-timeout 5 0\nline vty 0 4\n transport input ssh\n login local\n exec-timeout 5 0`,
          layer2Security: `interface FastEthernet0/1\n spanning-tree portfast\n spanning-tree bpduguard enable\ninterface FastEthernet0/2\n spanning-tree portfast\n spanning-tree bpduguard enable\ninterface range FastEthernet0/3 - 24, GigabitEthernet0/2\n switchport mode access\n switchport access vlan 888\n shutdown`,
          switching: `vlan 10\n name Sales\nvlan 20\n name Engineering\nvlan 30\n name Servers\nvlan 99\n name Management\nvlan 888\n name Parking_VLAN\nvlan 999\n name Native_VLAN\ninterface GigabitEthernet0/1\n switchport mode trunk\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,20,30,99`,
          interfaces: `interface Vlan99\n ip address 192.168.10.115 255.255.255.248\n no shutdown\nip default-gateway 192.168.10.113`,
        },
      },
    ],
    stage4_rationale: {
      subnetAllocationRationale:
        'Applied Variable Length Subnet Masking (VLSM) in strict descending order of host requirements: 50 hosts requires 6 host bits (2^6 - 2 = 62 usable, /26); 30 hosts requires 5 host bits (2^5 - 2 = 30 usable, /27); 14 hosts requires 4 host bits (2^4 - 2 = 14 usable, /28); 6 hosts requires 3 host bits (2^3 - 2 = 6 usable, /29). Allocating from largest to smallest prevents fragmented, unusable address gaps and preserves 128 contiguous addresses (192.168.10.128 - .255) for future campus expansion.',
      routingChoiceRationale:
        'Single-area OSPFv2 (Area 0) is configured on Router1-Gateway with an explicit 32-bit router-id (1.1.1.1). Subinterfaces G0/0/0.10, .20, and .30 are configured as "passive-interface" to suppress unnecessary OSPF multicast Hellos (224.0.0.5) from flooding user broadcast domains while continuing to advertise their subnets to adjacent OSPF peers. Route convergence is fast and automatic.',
      securityFeaturesRationale:
        '1) Enabling "enable secret" with SHA-256 and "service password-encryption" protects against cleartext credential exposure in show run. 2) Hardening line console 0 and line vty 0 4 with "login local", "logging synchronous", and "exec-timeout 5 0" prevents unauthorized access from abandoned terminal sessions. 3) Changing Native VLAN from default VLAN 1 to unused VLAN 999 neutralizes 802.1Q double-tagging attacks. 4) Moving all unused switchports into Parking VLAN 888 and administratively shutting them down prevents unauthorized physical network penetration. 5) PortFast and BPDU Guard protect the STP root bridge topology against rogue switch attachment.',
    },
    stage5_verification: {
      layer2Commands: [
        {
          device: 'Switch1-Core',
          command: 'show vlan brief',
          purpose: 'Confirm that VLANs 10, 20, 30, 99, 888, and 999 are active and FastEthernet0/10 is in VLAN 30.',
          expectedOutput: '10   Sales           active    \n20   Engineering     active    \n30   Servers         active    Fa0/10\n99   Management      active    \n888  Parking_VLAN    active    Fa0/1-9, Fa0/11-24\n999  Native_VLAN     active',
        },
        {
          device: 'Switch1-Core',
          command: 'show interfaces trunk',
          purpose: 'Verify 802.1Q encapsulation, trunking status, and Native VLAN 999 on G0/1 and G0/2.',
          expectedOutput: 'Port        Mode             Encapsulation  Status        Native vlan\nGi0/1       on               802.1q         trunking      999\nGi0/2       on               802.1q         trunking      999',
        },
      ],
      layer3RoutingCommands: [
        {
          device: 'Router1-Gateway',
          command: 'show ip interface brief',
          purpose: 'Verify that all physical interfaces and 802.1Q subinterfaces are in "up/up" status with correct IP addresses.',
          expectedOutput: 'GigabitEthernet0/0/0.10 is up, line protocol is up (192.168.10.1)\nGigabitEthernet0/0/0.20 is up, line protocol is up (192.168.10.65)\nGigabitEthernet0/0/0.30 is up, line protocol is up (192.168.10.97)\nGigabitEthernet0/0/0.99 is up, line protocol is up (192.168.10.113)',
        },
        {
          device: 'Router1-Gateway',
          command: 'show ip route',
          purpose: 'Confirm connected subnets and OSPF routes in the routing table.',
          expectedOutput: 'C   192.168.10.0/26 is directly connected, GigabitEthernet0/0/0.10\nC   192.168.10.64/27 is directly connected, GigabitEthernet0/0/0.20\nS*  0.0.0.0/0 [1/0] via 203.0.113.1, GigabitEthernet0/0/1',
        },
        {
          device: 'Router1-Gateway',
          command: 'show ip ospf interface GigabitEthernet0/0/0.10',
          purpose: 'Verify passive interface suppression on client-facing subnets.',
          expectedOutput: 'GigabitEthernet0/0/0.10 is up, line protocol is up\n  No Hellos (Passive interface)',
        },
      ],
      pingTests: [
        {
          fromDevice: 'PC-Sales',
          targetIp: '192.168.10.1',
          targetDescription: 'Default Gateway (Router1)',
          purpose: 'Verify first-hop Layer 3 gateway reachability.',
          expectedOutput: 'Reply from 192.168.10.1: bytes=32 time<1ms TTL=255 (Success 100%)',
        },
        {
          fromDevice: 'PC-Sales',
          targetIp: '192.168.10.70',
          targetDescription: 'PC-Engineering (VLAN 20)',
          purpose: 'Verify Inter-VLAN routing across Router-on-a-Stick subinterfaces.',
          expectedOutput: 'Reply from 192.168.10.70: bytes=32 time<1ms TTL=127 (Success 100%)',
        },
        {
          fromDevice: 'PC-Engineering',
          targetIp: '192.168.10.100',
          targetDescription: 'SRV-Internal (VLAN 30)',
          purpose: 'Verify end-to-end access to enterprise internal server.',
          expectedOutput: 'Reply from 192.168.10.100: bytes=32 time<1ms TTL=127 (Success 100%)',
        },
        {
          fromDevice: 'PC-Sales',
          targetIp: '192.168.10.114',
          targetDescription: 'Switch1-Core Management SVI (VLAN 99)',
          purpose: 'Verify administrative management network connectivity.',
          expectedOutput: 'Reply from 192.168.10.114: bytes=32 time<1ms TTL=254 (Success 100%)',
        },
      ],
      checklist: [
        {
          step: 1,
          title: 'Layer 2 Switching & 802.1Q Trunk Validation',
          description: 'Confirm VLAN creation, port memberships, trunking mode, and Native VLAN 999 on switches.',
          commands: ['show vlan brief', 'show interfaces trunk'],
        },
        {
          step: 2,
          title: 'PortFast & BPDU Guard Access Port Verification',
          description: 'Ensure PortFast is active on edge ports and BPDU Guard shuts down unauthorized bridge connections.',
          commands: ['show spanning-tree summary', 'show spanning-tree interface FastEthernet0/1 detail'],
        },
        {
          step: 3,
          title: 'Layer 3 Subinterfaces & IP Addressing Audit',
          description: 'Verify all physical interfaces and 802.1Q subinterfaces are in up/up status.',
          commands: ['show ip interface brief'],
        },
        {
          step: 4,
          title: 'Routing Convergence & Default Route Inspection',
          description: 'Verify connected subnets and default static route.',
          commands: ['show ip route', 'show ip route ospf'],
        },
        {
          step: 5,
          title: 'End-to-End Inter-VLAN Ping Tests',
          description: 'Execute ICMP ping tests across user VLANs, servers, and management SVIs.',
          commands: ['ping 192.168.10.1', 'ping 192.168.10.70', 'ping 192.168.10.100', 'ping 192.168.10.114'],
        },
      ],
    },
  },
  {
    id: 'topo-hub-spoke-ospf',
    title: 'Multi-Branch Hub & Spoke: Core Router with 3 Branch Routers (OSPFv2)',
    summary:
      'Canonical CCNA multi-router enterprise topology featuring a central Core router interconnected with Branch1, Branch2, and Branch3 over point-to-point /30 WAN links (10.100.200.0/30, 10.100.200.4/30, 10.100.200.8/30) running dynamic OSPFv2 Area 0. Each branch terminates a dedicated /24 user LAN with passive interfaces (192.168.50.0/24, 192.168.51.0/24, 192.168.52.0/24) connecting PC1, PC2, and PC3.',
    timestamp: '2026-09-24 21:00:00 UTC',
    governanceNotice: {
      noProductionCredentialsWarning:
        'NO PRODUCTION CREDENTIALS: All passwords utilize standardized lab placeholders (LAB_SECRET_REPLACE_ME, LAB_ADMIN_PASSWORD_REPLACE_ME). Never deploy placeholder passwords into live production networks.',
      hallucinationDeclaration:
        'HALLUCINATION & AMBIGUITY DECLARATION: Interface designations and topology connections are strictly derived from visible diagram endpoints; unreadable links are explicitly quarantined in Assumptions & Unverified Connections without silent guessing.',
      labOnlyVerificationMandate:
        'LAB-ONLY VERIFICATION MANDATE: All configurations in this architecture are AI-generated solely for CCNA 200-301 training and simulation. They must be validated in Cisco Packet Tracer, GNS3, or lab staging hardware prior to implementation.',
    },
    constraints: {
      networkBlock: '10.100.200.0/24 & 192.168.50.0/22',
      routingProtocol: 'OSPF',
      ospfProcessId: 1,
      ospfArea: 0,
      interVlanMethod: 'ROUTER_ON_A_STICK',
      nativeVlan: 999,
      mgmtVlan: 99,
      parkingVlan: 888,
      domainName: 'enterprise.lab',
      adminUsername: 'admin',
      adminPassword: 'LAB_ADMIN_PASSWORD_REPLACE_ME',
      enableSecret: 'LAB_SECRET_REPLACE_ME',
      consolePassword: 'LAB_CONSOLE_PASSWORD_REPLACE_ME',
      vlanRequirements: [
        { id: 'b1-lan', vlanId: 1, name: 'Branch1_LAN', hostCount: 1, purpose: 'Branch 1 Workstation Subnet' },
        { id: 'b2-lan', vlanId: 1, name: 'Branch2_LAN', hostCount: 1, purpose: 'Branch 2 Workstation Subnet' },
        { id: 'b3-lan', vlanId: 1, name: 'Branch3_LAN', hostCount: 1, purpose: 'Branch 3 Workstation Subnet' },
      ],
      additionalInstructions: 'Configure point-to-point /30 WAN links on Core and Branch routers. Run OSPF Area 0 with router-ids. Suppress OSPF hellos on branch LAN interfaces with passive-interface. End configs with end and write memory.',
    },
    diagramCoordinates: {
      'Core': { x: 400, y: 75, type: 'router' },
      'Branch1': { x: 160, y: 230, type: 'router' },
      'Branch2': { x: 400, y: 260, type: 'router' },
      'Branch3': { x: 640, y: 230, type: 'router' },
      'PC1': { x: 160, y: 430, type: 'pc' },
      'PC2': { x: 400, y: 440, type: 'pc' },
      'PC3': { x: 640, y: 430, type: 'pc' },
    },
    stage1_topology: {
      summary:
        'Identified 4 Routers (1 Core Hub Router, 3 Branch Spoke Routers) and 3 Endpoints (PC1, PC2, PC3). Point-to-point /30 WAN links interconnect the Core to each Branch, and /24 access subnets connect local workstations.',
      routers: [
        {
          name: 'Core',
          model: 'Cisco 4331 ISR',
          role: 'Core WAN Hub Router',
          interfaces: ['GigabitEthernet0/0', 'GigabitEthernet0/1', 'GigabitEthernet0/2'],
          notes: 'G0/1 to Branch1 (.1), G0/2 to Branch2 (.5), G0/0 to Branch3 (.9)',
        },
        {
          name: 'Branch1',
          model: 'Cisco 4321 ISR',
          role: 'Branch 1 Gateway',
          interfaces: ['GigabitEthernet0/1', 'GigabitEthernet0/2'],
          notes: 'G0/1 WAN to Core (.2); G0/2 LAN to PC1 (.1)',
        },
        {
          name: 'Branch2',
          model: 'Cisco 4321 ISR',
          role: 'Branch 2 Gateway',
          interfaces: ['GigabitEthernet0/1', 'GigabitEthernet0/2'],
          notes: 'G0/1 WAN to Core (.6); G0/2 LAN to PC2 (.1)',
        },
        {
          name: 'Branch3',
          model: 'Cisco 4321 ISR',
          role: 'Branch 3 Gateway',
          interfaces: ['GigabitEthernet0/1', 'GigabitEthernet0/2'],
          notes: 'G0/1 WAN to Core (.10); G0/2 LAN to PC3 (.1)',
        },
      ],
      switches: [],
      endpoints: [
        {
          name: 'PC1',
          type: 'Workstation',
          vlan: 'Branch1 LAN',
          assignedIp: '192.168.50.100',
          defaultGateway: '192.168.50.1',
        },
        {
          name: 'PC2',
          type: 'Workstation',
          vlan: 'Branch2 LAN',
          assignedIp: '192.168.51.100',
          defaultGateway: '192.168.51.1',
        },
        {
          name: 'PC3',
          type: 'Workstation',
          vlan: 'Branch3 LAN',
          assignedIp: '192.168.52.100',
          defaultGateway: '192.168.52.1',
        },
      ],
      connections: [
        {
          id: 'link-core-b1',
          fromDevice: 'Core',
          fromInterface: 'GigabitEthernet0/1',
          toDevice: 'Branch1',
          toInterface: 'GigabitEthernet0/1',
          linkType: 'Routed',
          vlan: '10.100.200.0/30 (WAN)',
          notes: 'Core G0/1 (10.100.200.1/30) <--> Branch1 G0/1 (10.100.200.2/30)',
        },
        {
          id: 'link-core-b2',
          fromDevice: 'Core',
          fromInterface: 'GigabitEthernet0/2',
          toDevice: 'Branch2',
          toInterface: 'GigabitEthernet0/1',
          linkType: 'Routed',
          vlan: '10.100.200.4/30 (WAN)',
          notes: 'Core G0/2 (10.100.200.5/30) <--> Branch2 G0/1 (10.100.200.6/30)',
        },
        {
          id: 'link-core-b3',
          fromDevice: 'Core',
          fromInterface: 'GigabitEthernet0/0',
          toDevice: 'Branch3',
          toInterface: 'GigabitEthernet0/1',
          linkType: 'Routed',
          vlan: '10.100.200.8/30 (WAN)',
          notes: 'Core G0/0 (10.100.200.9/30) <--> Branch3 G0/1 (10.100.200.10/30)',
        },
        {
          id: 'link-b1-pc1',
          fromDevice: 'Branch1',
          fromInterface: 'GigabitEthernet0/2',
          toDevice: 'PC1',
          toInterface: 'FastEthernet0',
          linkType: 'Access',
          vlan: '192.168.50.0/24 (LAN)',
          notes: 'Branch1 G0/2 (192.168.50.1/24) <--> PC1 (192.168.50.100/24)',
        },
        {
          id: 'link-b2-pc2',
          fromDevice: 'Branch2',
          fromInterface: 'GigabitEthernet0/2',
          toDevice: 'PC2',
          toInterface: 'FastEthernet0',
          linkType: 'Access',
          vlan: '192.168.51.0/24 (LAN)',
          notes: 'Branch2 G0/2 (192.168.51.1/24) <--> PC2 (192.168.51.100/24)',
        },
        {
          id: 'link-b3-pc3',
          fromDevice: 'Branch3',
          fromInterface: 'GigabitEthernet0/2',
          toDevice: 'PC3',
          toInterface: 'FastEthernet0',
          linkType: 'Access',
          vlan: '192.168.52.0/24 (LAN)',
          notes: 'Branch3 G0/2 (192.168.52.1/24) <--> PC3 (192.168.52.100/24)',
        },
      ],
      assumptions: [
        'WAN point-to-point links utilize /30 subnets (2 usable host IPs per link).',
        'Branch LAN subnets utilize /24 address spaces with .1 assigned to the router gateway and .100 assigned to the PC.',
      ],
    },
    stage2_addressing: {
      networkBlock: '10.100.200.0/24 (WAN) & 192.168.50.0/22 (LAN)',
      vlsmRationale:
        'Point-to-point inter-router links use /30 subnets (2 usable hosts) to conserve IPv4 space. Branch user LANs use /24 subnets providing room for 254 workstations each.',
      subnetAllocations: [
        {
          name: 'Core <-> Branch1 WAN',
          vlanId: 1,
          hostsNeeded: 2,
          hostsAllocated: 2,
          networkAddress: '10.100.200.0',
          prefix: 30,
          subnetMask: '255.255.255.252',
          wildcardMask: '0.0.0.3',
          usableRange: '10.100.200.1 - 10.100.200.2',
          broadcastAddress: '10.100.200.3',
        },
        {
          name: 'Core <-> Branch2 WAN',
          vlanId: 2,
          hostsNeeded: 2,
          hostsAllocated: 2,
          networkAddress: '10.100.200.4',
          prefix: 30,
          subnetMask: '255.255.255.252',
          wildcardMask: '0.0.0.3',
          usableRange: '10.100.200.5 - 10.100.200.6',
          broadcastAddress: '10.100.200.7',
        },
        {
          name: 'Core <-> Branch3 WAN',
          vlanId: 3,
          hostsNeeded: 2,
          hostsAllocated: 2,
          networkAddress: '10.100.200.8',
          prefix: 30,
          subnetMask: '255.255.255.252',
          wildcardMask: '0.0.0.3',
          usableRange: '10.100.200.9 - 10.100.200.10',
          broadcastAddress: '10.100.200.11',
        },
        {
          name: 'Branch1 LAN',
          vlanId: 10,
          hostsNeeded: 1,
          hostsAllocated: 254,
          networkAddress: '192.168.50.0',
          prefix: 24,
          subnetMask: '255.255.255.0',
          wildcardMask: '0.0.0.255',
          usableRange: '192.168.50.1 - 192.168.50.254',
          broadcastAddress: '192.168.50.255',
        },
        {
          name: 'Branch2 LAN',
          vlanId: 20,
          hostsNeeded: 1,
          hostsAllocated: 254,
          networkAddress: '192.168.51.0',
          prefix: 24,
          subnetMask: '255.255.255.0',
          wildcardMask: '0.0.0.255',
          usableRange: '192.168.51.1 - 192.168.51.254',
          broadcastAddress: '192.168.51.255',
        },
        {
          name: 'Branch3 LAN',
          vlanId: 30,
          hostsNeeded: 1,
          hostsAllocated: 254,
          networkAddress: '192.168.52.0',
          prefix: 24,
          subnetMask: '255.255.255.0',
          wildcardMask: '0.0.0.255',
          usableRange: '192.168.52.1 - 192.168.52.254',
          broadcastAddress: '192.168.52.255',
        },
      ],
      addressingTable: [
        {
          device: 'Core',
          interface: 'GigabitEthernet0/1',
          vlanPurpose: 'WAN Link to Branch1',
          ipAddress: '10.100.200.1',
          subnetMask: '255.255.255.252',
          prefix: 30,
          usableRange: '10.100.200.1 - 10.100.200.2',
          defaultGateway: 'N/A',
        },
        {
          device: 'Core',
          interface: 'GigabitEthernet0/2',
          vlanPurpose: 'WAN Link to Branch2',
          ipAddress: '10.100.200.5',
          subnetMask: '255.255.255.252',
          prefix: 30,
          usableRange: '10.100.200.5 - 10.100.200.6',
          defaultGateway: 'N/A',
        },
        {
          device: 'Core',
          interface: 'GigabitEthernet0/0',
          vlanPurpose: 'WAN Link to Branch3',
          ipAddress: '10.100.200.9',
          subnetMask: '255.255.255.252',
          prefix: 30,
          usableRange: '10.100.200.9 - 10.100.200.10',
          defaultGateway: 'N/A',
        },
        {
          device: 'Branch1',
          interface: 'GigabitEthernet0/1',
          vlanPurpose: 'WAN Link to Core',
          ipAddress: '10.100.200.2',
          subnetMask: '255.255.255.252',
          prefix: 30,
          usableRange: '10.100.200.1 - 10.100.200.2',
          defaultGateway: '10.100.200.1',
        },
        {
          device: 'Branch1',
          interface: 'GigabitEthernet0/2',
          vlanPurpose: 'Branch 1 LAN Gateway',
          ipAddress: '192.168.50.1',
          subnetMask: '255.255.255.0',
          prefix: 24,
          usableRange: '192.168.50.1 - 192.168.50.254',
          defaultGateway: 'N/A',
        },
        {
          device: 'Branch2',
          interface: 'GigabitEthernet0/1',
          vlanPurpose: 'WAN Link to Core',
          ipAddress: '10.100.200.6',
          subnetMask: '255.255.255.252',
          prefix: 30,
          usableRange: '10.100.200.5 - 10.100.200.6',
          defaultGateway: '10.100.200.5',
        },
        {
          device: 'Branch2',
          interface: 'GigabitEthernet0/2',
          vlanPurpose: 'Branch 2 LAN Gateway',
          ipAddress: '192.168.51.1',
          subnetMask: '255.255.255.0',
          prefix: 24,
          usableRange: '192.168.51.1 - 192.168.51.254',
          defaultGateway: 'N/A',
        },
        {
          device: 'Branch3',
          interface: 'GigabitEthernet0/1',
          vlanPurpose: 'WAN Link to Core',
          ipAddress: '10.100.200.10',
          subnetMask: '255.255.255.252',
          prefix: 30,
          usableRange: '10.100.200.9 - 10.100.200.10',
          defaultGateway: '10.100.200.9',
        },
        {
          device: 'Branch3',
          interface: 'GigabitEthernet0/2',
          vlanPurpose: 'Branch 3 LAN Gateway',
          ipAddress: '192.168.52.1',
          subnetMask: '255.255.255.0',
          prefix: 24,
          usableRange: '192.168.52.1 - 192.168.52.254',
          defaultGateway: 'N/A',
        },
        {
          device: 'PC1',
          interface: 'FastEthernet0',
          vlanPurpose: 'Branch 1 Host',
          ipAddress: '192.168.50.100',
          subnetMask: '255.255.255.0',
          prefix: 24,
          usableRange: '192.168.50.1 - 192.168.50.254',
          defaultGateway: '192.168.50.1',
        },
        {
          device: 'PC2',
          interface: 'FastEthernet0',
          vlanPurpose: 'Branch 2 Host',
          ipAddress: '192.168.51.100',
          subnetMask: '255.255.255.0',
          prefix: 24,
          usableRange: '192.168.51.1 - 192.168.51.254',
          defaultGateway: '192.168.51.1',
        },
        {
          device: 'PC3',
          interface: 'FastEthernet0',
          vlanPurpose: 'Branch 3 Host',
          ipAddress: '192.168.52.100',
          subnetMask: '255.255.255.0',
          prefix: 24,
          usableRange: '192.168.52.1 - 192.168.52.254',
          defaultGateway: '192.168.52.1',
        },
      ],
    },
    stage3_configs: [
      {
        deviceName: 'Core',
        deviceType: 'router',
        role: 'Core WAN Hub Router',
        fullConfig: `! =======================================================
! CISCO IOS CONFIGURATION: Core
! Role: Core WAN Hub Router
! =======================================================
enable
configure terminal
!
hostname Core
!
enable secret LAB_SECRET_REPLACE_ME
service password-encryption
no ip domain-lookup
ip domain-name enterprise.lab
!
username admin privilege 15 secret LAB_ADMIN_PASSWORD_REPLACE_ME
!
crypto key generate rsa modulus 2048
!
line con 0
 login local
 logging synchronous
 exec-timeout 5 0
 exit
!
line vty 0 4
 transport input ssh
 login local
 exec-timeout 5 0
 exit
!
banner motd #
*************************************************************
* WARNING: AUTHORIZED ACCESS ONLY - CORE WAN HUB ROUTER     *
* UNAPPROVED ACCESS IS PROHIBITED AND MONITORED UNDER LAW.  *
*************************************************************
#
!
! WAN Link to Branch1
interface GigabitEthernet0/1
 description WAN Link to Branch1 G0/1
 ip address 10.100.200.1 255.255.255.252
 no shutdown
 exit
!
! WAN Link to Branch2
interface GigabitEthernet0/2
 description WAN Link to Branch2 G0/1
 ip address 10.100.200.5 255.255.255.252
 no shutdown
 exit
!
! WAN Link to Branch3
interface GigabitEthernet0/0
 description WAN Link to Branch3 G0/1
 ip address 10.100.200.9 255.255.255.252
 no shutdown
 exit
!
! Dynamic Routing: OSPFv2 Single Area 0
router ospf 1
 router-id 1.1.1.1
 network 10.100.200.0 0.0.0.3 area 0
 network 10.100.200.4 0.0.0.3 area 0
 network 10.100.200.8 0.0.0.3 area 0
 exit
!
end
write memory`,
        packetTracerPaste: `configure terminal
hostname Core
enable secret LAB_SECRET_REPLACE_ME
service password-encryption
no ip domain-lookup
ip domain-name enterprise.lab
username admin privilege 15 secret LAB_ADMIN_PASSWORD_REPLACE_ME
crypto key generate rsa modulus 2048
line con 0
login local
logging synchronous
exec-timeout 5 0
exit
line vty 0 4
transport input ssh
login local
exec-timeout 5 0
exit
banner motd # AUTHORIZED ACCESS ONLY #
interface GigabitEthernet0/1
description WAN Link to Branch1
ip address 10.100.200.1 255.255.255.252
no shutdown
exit
interface GigabitEthernet0/2
description WAN Link to Branch2
ip address 10.100.200.5 255.255.255.252
no shutdown
exit
interface GigabitEthernet0/0
description WAN Link to Branch3
ip address 10.100.200.9 255.255.255.252
no shutdown
exit
router ospf 1
router-id 1.1.1.1
network 10.100.200.0 0.0.0.3 area 0
network 10.100.200.4 0.0.0.3 area 0
network 10.100.200.8 0.0.0.3 area 0
exit
end
write memory`,
        sections: {
          hardening: `hostname Core\nenable secret LAB_SECRET_REPLACE_ME\nservice password-encryption\nno ip domain-lookup`,
          remoteManagement: `ip domain-name enterprise.lab\nusername admin privilege 15 secret LAB_ADMIN_PASSWORD_REPLACE_ME\ncrypto key generate rsa modulus 2048\nline con 0\n login local\n logging synchronous\nline vty 0 4\n transport input ssh\n login local`,
          routing: `router ospf 1\n router-id 1.1.1.1\n network 10.100.200.0 0.0.0.3 area 0\n network 10.100.200.4 0.0.0.3 area 0\n network 10.100.200.8 0.0.0.3 area 0`,
          interfaces: `interface GigabitEthernet0/1\n ip address 10.100.200.1 255.255.255.252\n no shutdown\ninterface GigabitEthernet0/2\n ip address 10.100.200.5 255.255.255.252\n no shutdown\ninterface GigabitEthernet0/0\n ip address 10.100.200.9 255.255.255.252\n no shutdown`,
        },
      },
      {
        deviceName: 'Branch1',
        deviceType: 'router',
        role: 'Branch 1 Gateway Router',
        fullConfig: `! =======================================================
! CISCO IOS CONFIGURATION: Branch1
! Role: Branch 1 Gateway Router
! =======================================================
enable
configure terminal
!
hostname Branch1
!
enable secret LAB_SECRET_REPLACE_ME
service password-encryption
no ip domain-lookup
ip domain-name enterprise.lab
!
username admin privilege 15 secret LAB_ADMIN_PASSWORD_REPLACE_ME
!
crypto key generate rsa modulus 2048
!
line con 0
 login local
 logging synchronous
 exec-timeout 5 0
 exit
!
line vty 0 4
 transport input ssh
 login local
 exec-timeout 5 0
 exit
!
banner motd #
*************************************************************
* WARNING: AUTHORIZED ACCESS ONLY - BRANCH 1 ROUTER         *
*************************************************************
#
!
! WAN Link to Core
interface GigabitEthernet0/1
 description WAN Link to Core G0/1
 ip address 10.100.200.2 255.255.255.252
 no shutdown
 exit
!
! LAN Interface to PC1
interface GigabitEthernet0/2
 description Branch 1 User LAN (PC1)
 ip address 192.168.50.1 255.255.255.0
 no shutdown
 exit
!
! Dynamic Routing: OSPFv2 Area 0
router ospf 1
 router-id 2.2.2.2
 passive-interface GigabitEthernet0/2
 network 10.100.200.0 0.0.0.3 area 0
 network 192.168.50.0 0.0.0.255 area 0
 exit
!
end
write memory`,
        packetTracerPaste: `configure terminal
hostname Branch1
enable secret LAB_SECRET_REPLACE_ME
service password-encryption
no ip domain-lookup
ip domain-name enterprise.lab
username admin privilege 15 secret LAB_ADMIN_PASSWORD_REPLACE_ME
crypto key generate rsa modulus 2048
line con 0
login local
logging synchronous
exec-timeout 5 0
exit
line vty 0 4
transport input ssh
login local
exec-timeout 5 0
exit
banner motd # AUTHORIZED ACCESS ONLY #
interface GigabitEthernet0/1
description WAN Link to Core
ip address 10.100.200.2 255.255.255.252
no shutdown
exit
interface GigabitEthernet0/2
description Branch 1 LAN
ip address 192.168.50.1 255.255.255.0
no shutdown
exit
router ospf 1
router-id 2.2.2.2
passive-interface GigabitEthernet0/2
network 10.100.200.0 0.0.0.3 area 0
network 192.168.50.0 0.0.0.255 area 0
exit
end
write memory`,
        sections: {
          hardening: `hostname Branch1\nenable secret LAB_SECRET_REPLACE_ME\nservice password-encryption\nno ip domain-lookup`,
          remoteManagement: `ip domain-name enterprise.lab\nusername admin privilege 15 secret LAB_ADMIN_PASSWORD_REPLACE_ME\ncrypto key generate rsa modulus 2048\nline con 0\n login local\nline vty 0 4\n transport input ssh\n login local`,
          routing: `router ospf 1\n router-id 2.2.2.2\n passive-interface GigabitEthernet0/2\n network 10.100.200.0 0.0.0.3 area 0\n network 192.168.50.0 0.0.0.255 area 0`,
          interfaces: `interface GigabitEthernet0/1\n ip address 10.100.200.2 255.255.255.252\n no shutdown\ninterface GigabitEthernet0/2\n ip address 192.168.50.1 255.255.255.0\n no shutdown`,
        },
      },
      {
        deviceName: 'Branch2',
        deviceType: 'router',
        role: 'Branch 2 Gateway Router',
        fullConfig: `! =======================================================
! CISCO IOS CONFIGURATION: Branch2
! Role: Branch 2 Gateway Router
! =======================================================
enable
configure terminal
!
hostname Branch2
!
enable secret LAB_SECRET_REPLACE_ME
service password-encryption
no ip domain-lookup
ip domain-name enterprise.lab
!
username admin privilege 15 secret LAB_ADMIN_PASSWORD_REPLACE_ME
!
crypto key generate rsa modulus 2048
!
line con 0
 login local
 logging synchronous
 exec-timeout 5 0
 exit
!
line vty 0 4
 transport input ssh
 login local
 exec-timeout 5 0
 exit
!
banner motd #
*************************************************************
* WARNING: AUTHORIZED ACCESS ONLY - BRANCH 2 ROUTER         *
*************************************************************
#
!
! WAN Link to Core
interface GigabitEthernet0/1
 description WAN Link to Core G0/2
 ip address 10.100.200.6 255.255.255.252
 no shutdown
 exit
!
! LAN Interface to PC2
interface GigabitEthernet0/2
 description Branch 2 User LAN (PC2)
 ip address 192.168.51.1 255.255.255.0
 no shutdown
 exit
!
! Dynamic Routing: OSPFv2 Area 0
router ospf 1
 router-id 3.3.3.3
 passive-interface GigabitEthernet0/2
 network 10.100.200.4 0.0.0.3 area 0
 network 192.168.51.0 0.0.0.255 area 0
 exit
!
end
write memory`,
        packetTracerPaste: `configure terminal
hostname Branch2
enable secret LAB_SECRET_REPLACE_ME
service password-encryption
no ip domain-lookup
ip domain-name enterprise.lab
username admin privilege 15 secret LAB_ADMIN_PASSWORD_REPLACE_ME
crypto key generate rsa modulus 2048
line con 0
login local
logging synchronous
exec-timeout 5 0
exit
line vty 0 4
transport input ssh
login local
exec-timeout 5 0
exit
banner motd # AUTHORIZED ACCESS ONLY #
interface GigabitEthernet0/1
description WAN Link to Core
ip address 10.100.200.6 255.255.255.252
no shutdown
exit
interface GigabitEthernet0/2
description Branch 2 LAN
ip address 192.168.51.1 255.255.255.0
no shutdown
exit
router ospf 1
router-id 3.3.3.3
passive-interface GigabitEthernet0/2
network 10.100.200.4 0.0.0.3 area 0
network 192.168.51.0 0.0.0.255 area 0
exit
end
write memory`,
        sections: {
          hardening: `hostname Branch2\nenable secret LAB_SECRET_REPLACE_ME\nservice password-encryption\nno ip domain-lookup`,
          remoteManagement: `ip domain-name enterprise.lab\nusername admin privilege 15 secret LAB_ADMIN_PASSWORD_REPLACE_ME\ncrypto key generate rsa modulus 2048\nline con 0\n login local\nline vty 0 4\n transport input ssh\n login local`,
          routing: `router ospf 1\n router-id 3.3.3.3\n passive-interface GigabitEthernet0/2\n network 10.100.200.4 0.0.0.3 area 0\n network 192.168.51.0 0.0.0.255 area 0`,
          interfaces: `interface GigabitEthernet0/1\n ip address 10.100.200.6 255.255.255.252\n no shutdown\ninterface GigabitEthernet0/2\n ip address 192.168.51.1 255.255.255.0\n no shutdown`,
        },
      },
      {
        deviceName: 'Branch3',
        deviceType: 'router',
        role: 'Branch 3 Gateway Router',
        fullConfig: `! =======================================================
! CISCO IOS CONFIGURATION: Branch3
! Role: Branch 3 Gateway Router
! =======================================================
enable
configure terminal
!
hostname Branch3
!
enable secret LAB_SECRET_REPLACE_ME
service password-encryption
no ip domain-lookup
ip domain-name enterprise.lab
!
username admin privilege 15 secret LAB_ADMIN_PASSWORD_REPLACE_ME
!
crypto key generate rsa modulus 2048
!
line con 0
 login local
 logging synchronous
 exec-timeout 5 0
 exit
!
line vty 0 4
 transport input ssh
 login local
 exec-timeout 5 0
 exit
!
banner motd #
*************************************************************
* WARNING: AUTHORIZED ACCESS ONLY - BRANCH 3 ROUTER         *
*************************************************************
#
!
! WAN Link to Core
interface GigabitEthernet0/1
 description WAN Link to Core G0/0
 ip address 10.100.200.10 255.255.255.252
 no shutdown
 exit
!
! LAN Interface to PC3
interface GigabitEthernet0/2
 description Branch 3 User LAN (PC3)
 ip address 192.168.52.1 255.255.255.0
 no shutdown
 exit
!
! Dynamic Routing: OSPFv2 Area 0
router ospf 1
 router-id 4.4.4.4
 passive-interface GigabitEthernet0/2
 network 10.100.200.8 0.0.0.3 area 0
 network 192.168.52.0 0.0.0.255 area 0
 exit
!
end
write memory`,
        packetTracerPaste: `configure terminal
hostname Branch3
enable secret LAB_SECRET_REPLACE_ME
service password-encryption
no ip domain-lookup
ip domain-name enterprise.lab
username admin privilege 15 secret LAB_ADMIN_PASSWORD_REPLACE_ME
crypto key generate rsa modulus 2048
line con 0
login local
logging synchronous
exec-timeout 5 0
exit
line vty 0 4
transport input ssh
login local
exec-timeout 5 0
exit
banner motd # AUTHORIZED ACCESS ONLY #
interface GigabitEthernet0/1
description WAN Link to Core
ip address 10.100.200.10 255.255.255.252
no shutdown
exit
interface GigabitEthernet0/2
description Branch 3 LAN
ip address 192.168.52.1 255.255.255.0
no shutdown
exit
router ospf 1
router-id 4.4.4.4
passive-interface GigabitEthernet0/2
network 10.100.200.8 0.0.0.3 area 0
network 192.168.52.0 0.0.0.255 area 0
exit
end
write memory`,
        sections: {
          hardening: `hostname Branch3\nenable secret LAB_SECRET_REPLACE_ME\nservice password-encryption\nno ip domain-lookup`,
          remoteManagement: `ip domain-name enterprise.lab\nusername admin privilege 15 secret LAB_ADMIN_PASSWORD_REPLACE_ME\ncrypto key generate rsa modulus 2048\nline con 0\n login local\nline vty 0 4\n transport input ssh\n login local`,
          routing: `router ospf 1\n router-id 4.4.4.4\n passive-interface GigabitEthernet0/2\n network 10.100.200.8 0.0.0.3 area 0\n network 192.168.52.0 0.0.0.255 area 0`,
          interfaces: `interface GigabitEthernet0/1\n ip address 10.100.200.10 255.255.255.252\n no shutdown\ninterface GigabitEthernet0/2\n ip address 192.168.52.1 255.255.255.0\n no shutdown`,
        },
      },
    ],
    stage4_rationale: {
      subnetAllocationRationale:
        'Point-to-point inter-router links strictly employ /30 subnetting to minimize wasted IPv4 addresses (only 2 host addresses required per WAN link). Each branch LAN receives a full /24 block (192.168.50.0/24, 192.168.51.0/24, 192.168.52.0/24), facilitating straightforward route summarization to 192.168.48.0/21 or 192.168.50.0/22 at the Core router.',
      routingChoiceRationale:
        'Single-Area OSPFv2 (Area 0) is deployed across all 4 routers. Static manual Router IDs (1.1.1.1 for Core, 2.2.2.2 for Branch1, 3.3.3.3 for Branch2, 4.4.4.4 for Branch3) prevent router ID flapping. Passive-interfaces are enabled on all user LANs (G0/2 on branches) to prevent rogue OSPF neighbor formation and reduce multicast traffic.',
      securityFeaturesRationale:
        'All 4 routers implement standard CCNA security hardening: encrypted privilege passwords (enable secret), service password-encryption for cleartext passwords, RSA 2048-bit SSHv2 remote management, console & VTY login local with 5-minute inactivity timeouts, and legal MOTD warning banners.',
    },
    stage5_verification: {
      layer2Commands: [
        {
          device: 'Core',
          command: 'show ip interface brief',
          purpose: 'Verify WAN interfaces G0/0, G0/1, G0/2 are in up/up status',
          expectedOutput:
            'GigabitEthernet0/0    10.100.200.9    YES manual up    up\nGigabitEthernet0/1    10.100.200.1    YES manual up    up\nGigabitEthernet0/2    10.100.200.5    YES manual up    up',
        },
        {
          device: 'Branch1',
          command: 'show ip interface brief',
          purpose: 'Verify Branch1 WAN (G0/1) and LAN (G0/2) interfaces up/up',
          expectedOutput:
            'GigabitEthernet0/1    10.100.200.2    YES manual up    up\nGigabitEthernet0/2    192.168.50.1    YES manual up    up',
        },
      ],
      layer3RoutingCommands: [
        {
          device: 'Core',
          command: 'show ip ospf neighbor',
          purpose: 'Verify 3 active OSPF neighbor adjacencies with Branch1, Branch2, and Branch3',
          expectedOutput:
            'Neighbor ID     Pri   State           Dead Time   Address         Interface\n2.2.2.2           1   FULL/BDR        00:00:34    10.100.200.2    GigabitEthernet0/1\n3.3.3.3           1   FULL/BDR        00:00:32    10.100.200.6    GigabitEthernet0/2\n4.4.4.4           1   FULL/BDR        00:00:36    10.100.200.10   GigabitEthernet0/0',
        },
        {
          device: 'Core',
          command: 'show ip route ospf',
          purpose: 'Confirm learned OSPF routes for all 3 branch LAN subnets',
          expectedOutput:
            'O   192.168.50.0/24 [110/2] via 10.100.200.2, GigabitEthernet0/1\nO   192.168.51.0/24 [110/2] via 10.100.200.6, GigabitEthernet0/2\nO   192.168.52.0/24 [110/2] via 10.100.200.10, GigabitEthernet0/0',
        },
        {
          device: 'Branch1',
          command: 'show ip route ospf',
          purpose: 'Confirm Branch1 learns remote branch LANs via Core',
          expectedOutput:
            'O   10.100.200.4/30 [110/2] via 10.100.200.1, GigabitEthernet0/1\nO   10.100.200.8/30 [110/2] via 10.100.200.1, GigabitEthernet0/1\nO   192.168.51.0/24 [110/3] via 10.100.200.1, GigabitEthernet0/1\nO   192.168.52.0/24 [110/3] via 10.100.200.1, GigabitEthernet0/1',
        },
      ],
      pingTests: [
        {
          fromDevice: 'PC1',
          targetIp: '192.168.50.1',
          targetDescription: 'Local Branch 1 Gateway',
          purpose: 'Verify host to local gateway connectivity',
          expectedOutput: 'Reply from 192.168.50.1: bytes=32 time<1ms TTL=255 (100% success)',
        },
        {
          fromDevice: 'PC1',
          targetIp: '10.100.200.1',
          targetDescription: 'Core Router WAN Gateway',
          purpose: 'Verify host routing through Branch1 to Core',
          expectedOutput: 'Reply from 10.100.200.1: bytes=32 time=2ms TTL=254 (100% success)',
        },
        {
          fromDevice: 'PC1',
          targetIp: '192.168.51.100',
          targetDescription: 'PC2 at Branch 2',
          purpose: 'End-to-end branch-to-branch inter-network reachability via OSPF',
          expectedOutput: 'Reply from 192.168.51.100: bytes=32 time=4ms TTL=253 (100% success)',
        },
        {
          fromDevice: 'PC1',
          targetIp: '192.168.52.100',
          targetDescription: 'PC3 at Branch 3',
          purpose: 'End-to-end branch-to-branch inter-network reachability via OSPF',
          expectedOutput: 'Reply from 192.168.52.100: bytes=32 time=4ms TTL=253 (100% success)',
        },
      ],
      checklist: [
        {
          step: 1,
          title: 'Physical & Routed Interface Verification',
          description: 'Run show ip interface brief on Core and all Branch routers to confirm up/up status.',
          commands: ['show ip interface brief'],
        },
        {
          step: 2,
          title: 'OSPF Neighbor Adjacency Verification',
          description: 'Confirm Core has formed FULL adjacency with all 3 branch routers.',
          commands: ['show ip ospf neighbor'],
        },
        {
          step: 3,
          title: 'Routing Table Convergence Audit',
          description: 'Confirm routing tables contain routes to all 3 branch LANs.',
          commands: ['show ip route ospf'],
        },
        {
          step: 4,
          title: 'End-to-End Inter-Branch Ping Tests',
          description: 'Execute ICMP pings from PC1 (Branch 1) to PC2 (Branch 2) and PC3 (Branch 3).',
          commands: ['ping 192.168.50.1', 'ping 10.100.200.1', 'ping 192.168.51.100', 'ping 192.168.52.100'],
        },
      ],
    },
  },
];
