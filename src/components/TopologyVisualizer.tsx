import React, { useState, useMemo, useEffect } from 'react';
import {
  Router,
  Server,
  Laptop,
  Network,
  Layers,
  ShieldCheck,
  Info,
  Columns,
  FileImage,
} from 'lucide-react';
import { ArchitectureReport } from '../types/network';
import { PathTracer, RibEntry, RouteHop, TracedPathResult } from './PathTracer';

interface TopologyVisualizerProps {
  report: ArchitectureReport;
  selectedDeviceName?: string;
  onSelectDevice?: (deviceName: string) => void;
  onOpenUploader?: () => void;
}

// Helper to parse IPv4 to 32-bit unsigned integer
function ipToInt(ip?: string): number | null {
  if (!ip) return null;
  const clean = ip.trim().split('/')[0];
  const parts = clean.split('.');
  if (parts.length !== 4) return null;
  let num = 0;
  for (let i = 0; i < 4; i++) {
    const octet = parseInt(parts[i], 10);
    if (isNaN(octet) || octet < 0 || octet > 255) return null;
    num = ((num << 8) | octet) >>> 0;
  }
  return num >>> 0;
}

function intToIp(intVal: number): string {
  return [
    (intVal >>> 24) & 255,
    (intVal >>> 16) & 255,
    (intVal >>> 8) & 255,
    intVal & 255,
  ].join('.');
}

function maskToPrefixLen(maskStr?: string): number {
  const m = ipToInt(maskStr);
  if (m === null) return 24;
  let bits = 0;
  let temp = m >>> 0;
  while (temp & 0x80000000) {
    bits++;
    temp = (temp << 1) >>> 0;
  }
  return bits;
}

function sameSubnet(ipA?: string, ipB?: string, maskStr?: string): boolean {
  const a = ipToInt(ipA);
  const b = ipToInt(ipB);
  const m = ipToInt(maskStr || '255.255.255.0');
  if (a === null || b === null || m === null) return false;
  return ((a & m) >>> 0) === ((b & m) >>> 0);
}

export const TopologyVisualizer: React.FC<TopologyVisualizerProps> = ({
  report,
  selectedDeviceName,
  onSelectDevice,
  onOpenUploader,
}) => {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'interactive' | 'split' | 'source'>('interactive');

  const stage1 = report?.stage1_topology || (report as any)?.phase1_inventory || {};
  const stage2 = report?.stage2_addressing || (report as any)?.phase2_addressing || {};
  const stage3 = Array.isArray(report?.stage3_configs) ? report.stage3_configs : [];

  const connections = Array.isArray(stage1.connections) ? stage1.connections : [];
  const routers = Array.isArray(stage1.routers) ? stage1.routers : [];
  const switches = Array.isArray(stage1.switches) ? stage1.switches : [];
  const endpoints = Array.isArray(stage1.endpoints) ? stage1.endpoints : [];
  const addressingTable = Array.isArray(stage2.addressingTable) ? stage2.addressingTable : [];
  const subnetAllocations = Array.isArray(stage2.subnetAllocations)
    ? stage2.subnetAllocations
    : [];

  const uploadedFile = report?.uploadedFile;
  const hasUploadedSource = Boolean(uploadedFile?.previewUrl);

  // Helper to format short interface names safely
  const formatShortInt = (val: any) => {
    if (!val || typeof val !== 'string') return '';
    return val
      .replace(/GigabitEthernet/gi, 'Gi')
      .replace(/FastEthernet/gi, 'Fa')
      .replace(/Ethernet/gi, 'Eth')
      .replace(/Serial/gi, 'Se');
  };

  // Intelligent hierarchical coordinate calculation
  const computedCoords = React.useMemo(() => {
    const coords: Record<string, { x: number; y: number; type: 'router' | 'switch' | 'server' | 'pc' }> = {};

    if (report?.diagramCoordinates && typeof report.diagramCoordinates === 'object') {
      Object.entries(report.diagramCoordinates).forEach(([k, v]) => {
        if (v && typeof v.x === 'number' && typeof v.y === 'number') {
          coords[k] = v;
        }
      });
    }

    const isMultiRouter = routers.length > 1;
    let coreRouter = routers.find((r: any) => {
      const name = (r?.name || '').toLowerCase();
      const role = (r?.role || '').toLowerCase();
      return name.includes('core') || role.includes('core') || role.includes('hub');
    });

    if (!coreRouter && isMultiRouter) {
      let maxConns = -1;
      routers.forEach((r: any) => {
        const count = connections.filter(
          (c: any) => c?.fromDevice === r?.name || c?.toDevice === r?.name
        ).length;
        if (count > maxConns) {
          maxConns = count;
          coreRouter = r;
        }
      });
    }

    if (isMultiRouter && coreRouter) {
      if (!coords[coreRouter.name]) {
        coords[coreRouter.name] = { x: 400, y: 75, type: 'router' };
      }

      const spokeRouters = routers.filter((r: any) => r?.name !== coreRouter!.name);
      const spokeCount = spokeRouters.length;
      spokeRouters.forEach((r: any, idx: number) => {
        if (!coords[r.name]) {
          const step = 680 / (spokeCount + 1);
          const x = Math.round(60 + (idx + 1) * step);
          const y = spokeCount === 3 && idx === 1 ? 260 : 230;
          coords[r.name] = { x, y, type: 'router' };
        }
      });

      switches.forEach((s: any, idx: number) => {
        if (!coords[s.name]) {
          const step = 640 / (switches.length + 1);
          coords[s.name] = { x: Math.round(80 + (idx + 1) * step), y: 330, type: 'switch' };
        }
      });

      endpoints.forEach((ep: any, idx: number) => {
        if (!coords[ep.name]) {
          const conn = connections.find(
            (c: any) => c?.fromDevice === ep.name || c?.toDevice === ep.name
          );
          const parentName = conn
            ? conn.fromDevice === ep.name
              ? conn.toDevice
              : conn.fromDevice
            : null;
          const parentCoord = parentName ? coords[parentName] : null;

          const typeStr = (ep?.type || '').toLowerCase();
          const isServer =
            typeStr.includes('server') || (ep?.name || '').toLowerCase().includes('srv');

          if (parentCoord) {
            coords[ep.name] = {
              x: parentCoord.x,
              y: 445,
              type: isServer ? 'server' : 'pc',
            };
          } else {
            const step = 680 / (endpoints.length + 1);
            coords[ep.name] = {
              x: Math.round(60 + (idx + 1) * step),
              y: 445,
              type: isServer ? 'server' : 'pc',
            };
          }
        }
      });
    } else {
      routers.forEach((r: any, idx: number) => {
        if (!coords[r.name]) {
          const step = 600 / (routers.length + 1);
          coords[r.name] = { x: Math.round(100 + (idx + 1) * step), y: 80, type: 'router' };
        }
      });

      switches.forEach((s: any, idx: number) => {
        if (!coords[s.name]) {
          const step = 600 / (switches.length + 1);
          coords[s.name] = { x: Math.round(100 + (idx + 1) * step), y: 240, type: 'switch' };
        }
      });

      endpoints.forEach((e: any, idx: number) => {
        if (!coords[e.name]) {
          const typeStr = (e?.type || '').toLowerCase();
          const isServer =
            typeStr.includes('server') || (e?.name || '').toLowerCase().includes('srv');
          const step = 650 / (endpoints.length + 1);
          coords[e.name] = {
            x: Math.round(75 + (idx + 1) * step),
            y: isServer ? 360 : 440,
            type: isServer ? 'server' : 'pc',
          };
        }
      });
    }

    return coords;
  }, [report, stage1, connections, routers, switches, endpoints]);

  // Compile all nodes safely
  const allNodes = useMemo(() => {
    const list: Array<{
      name: string;
      type: 'router' | 'switch' | 'server' | 'pc';
      role: string;
      model?: string;
      ip?: string;
      defaultGateway?: string;
      vlan?: string;
      coords: { x: number; y: number };
    }> = [];

    routers.forEach((r: any) => {
      if (!r?.name) return;
      const addrRow = addressingTable.find(
        (row: any) => row.device?.toLowerCase() === r.name.toLowerCase() && row.ipAddress
      );
      list.push({
        name: r.name,
        type: 'router',
        role: r.role || 'Router',
        model: r.model || 'Cisco ISR',
        ip: addrRow?.ipAddress,
        coords: computedCoords[r.name] || { x: 400, y: 80 },
      });
    });

    switches.forEach((s: any) => {
      if (!s?.name) return;
      const addrRow = addressingTable.find(
        (row: any) => row.device?.toLowerCase() === s.name.toLowerCase() && row.ipAddress
      );
      list.push({
        name: s.name,
        type: 'switch',
        role: s.role || 'Switch',
        model: s.model || 'Catalyst 2960',
        ip: addrRow?.ipAddress,
        coords: computedCoords[s.name] || { x: 400, y: 240 },
      });
    });

    endpoints.forEach((e: any) => {
      if (!e?.name) return;
      const typeStr = (e.type || '').toLowerCase();
      const isServer = typeStr.includes('server') || (e.name || '').toLowerCase().includes('srv');
      list.push({
        name: e.name,
        type: isServer ? 'server' : 'pc',
        role: e.type || 'Host',
        ip: e.assignedIp,
        defaultGateway: e.defaultGateway,
        vlan: e.vlan,
        coords: computedCoords[e.name] || { x: 400, y: 420 },
      });
    });

    return list;
  }, [routers, switches, endpoints, addressingTable, computedCoords]);

  const nodeMap = useMemo(() => new Map(allNodes.map((n) => [n.name, n])), [allNodes]);

  // Selectable endpoints (prioritize PCs/Servers, fallback to all nodes if <2 endpoints exist)
  const selectableEndpoints = useMemo(() => {
    const hostNodes = allNodes.filter((n) => n.type === 'pc' || n.type === 'server');
    if (hostNodes.length >= 2) return hostNodes;
    return allNodes;
  }, [allNodes]);

  // Path Tracer State
  const [sourceEndpoint, setSourceEndpoint] = useState<string>('');
  const [destEndpoint, setDestEndpoint] = useState<string>('');
  const [isTraceActive, setIsTraceActive] = useState<boolean>(true);
  const [focusedHopIndex, setFocusedHopIndex] = useState<number | null>(null);

  useEffect(() => {
    if (selectableEndpoints.length >= 2) {
      setSourceEndpoint(selectableEndpoints[0].name);
      setDestEndpoint(selectableEndpoints[selectableEndpoints.length - 1].name);
      setIsTraceActive(true);
      setFocusedHopIndex(null);
    } else if (selectableEndpoints.length === 1) {
      setSourceEndpoint(selectableEndpoints[0].name);
      setDestEndpoint(selectableEndpoints[0].name);
    }
  }, [selectableEndpoints]);

  // Track whether next endpoint click on canvas sets Source or Destination
  const [nextCanvasPickMode, setNextCanvasPickMode] = useState<'src' | 'dst'>('dst');

  // Helper to generate deterministic Cisco-style MAC address per device
  const getDeviceMac = (deviceName: string, intfName = 'Eth0'): string => {
    const seedStr = `${deviceName}-${intfName}`;
    let hash = 0;
    for (let i = 0; i < seedStr.length; i++) {
      hash = (hash * 31 + seedStr.charCodeAt(i)) >>> 0;
    }
    const h1 = ((hash >>> 16) & 0xff).toString(16).padStart(2, '0');
    const h2 = ((hash >>> 8) & 0xff).toString(16).padStart(2, '0');
    const h3 = (hash & 0xff).toString(16).padStart(2, '0');
    return `0050.79${h1}.${h2}${h3}`;
  };

  // Compute deterministic hop-by-hop route + per-router RIB tables with Longest-Prefix Match
  const tracedPath: TracedPathResult | null = useMemo(() => {
    if (!isTraceActive || !sourceEndpoint || !destEndpoint || sourceEndpoint === destEndpoint) {
      return null;
    }

    const srcNode = nodeMap.get(sourceEndpoint);
    const dstNode = nodeMap.get(destEndpoint);
    if (!srcNode || !dstNode) return null;

    interface GraphEdge {
      connKey: string;
      neighbor: string;
      localInterface: string;
      remoteInterface: string;
      linkType: string;
      vlan?: string;
    }

    const adj = new Map<string, GraphEdge[]>();
    allNodes.forEach((n) => adj.set(n.name, []));

    connections.forEach((conn: any, idx: number) => {
      if (!conn?.fromDevice || !conn?.toDevice) return;
      const connKey = conn.id || `conn-${conn.fromDevice}-${conn.toDevice}-${idx}`;
      const fromList = adj.get(conn.fromDevice) || [];
      fromList.push({
        connKey,
        neighbor: conn.toDevice,
        localInterface: conn.fromInterface || 'Eth0',
        remoteInterface: conn.toInterface || 'Eth0',
        linkType: conn.linkType || 'Access',
        vlan: conn.vlan,
      });
      adj.set(conn.fromDevice, fromList);

      const toList = adj.get(conn.toDevice) || [];
      toList.push({
        connKey,
        neighbor: conn.fromDevice,
        localInterface: conn.toInterface || 'Eth0',
        remoteInterface: conn.fromInterface || 'Eth0',
        linkType: conn.linkType || 'Access',
        vlan: conn.vlan,
      });
      adj.set(conn.toDevice, toList);
    });

    const srcAddrRow = addressingTable.find(
      (r: any) => r.device?.toLowerCase() === srcNode.name.toLowerCase()
    );
    const dstAddrRow = addressingTable.find(
      (r: any) => r.device?.toLowerCase() === dstNode.name.toLowerCase()
    );

    const srcIp = (srcAddrRow?.ipAddress || srcNode.ip || '192.168.0.2').split('/')[0].trim();
    const dstIp = (dstAddrRow?.ipAddress || dstNode.ip || '192.168.1.2').split('/')[0].trim();
    const srcMask = srcAddrRow?.subnetMask || '255.255.255.0';
    const srcGw = (srcAddrRow?.defaultGateway || srcNode.defaultGateway || '192.168.0.1').split('/')[0].trim();
    const dstGw = (dstAddrRow?.defaultGateway || dstNode.defaultGateway || '192.168.1.1').split('/')[0].trim();

    const isSame =
      sameSubnet(srcIp, dstIp, srcMask) &&
      (srcNode.vlan || 'VLAN1') === (dstNode.vlan || 'VLAN1');

    const routingProto = report.constraints?.routingProtocol || 'OSPF';

    // Helper to build a Router's Routing Information Base (RIB) and mark the Longest-Prefix Match (LPM)
    const buildRouterRib = (
      routerName: string,
      targetIpStr: string,
      outInterfaceFallback: string,
      nextHopIpFallback: string
    ): { rib: RibEntry[]; winningEntry?: RibEntry } => {
      const entries: RibEntry[] = [];
      const devAddrRows = addressingTable.filter(
        (r: any) => r.device?.toLowerCase() === routerName.toLowerCase()
      );
      const devCfg = stage3.find(
        (c) => c.deviceName?.toLowerCase() === routerName.toLowerCase()
      );

      // 1. Connected ('C') routes from Stage 2 Addressing Table
      devAddrRows.forEach((row: any) => {
        const ipInt = ipToInt(row.ipAddress);
        const maskInt = ipToInt(row.subnetMask || '255.255.255.0');
        if (ipInt !== null && maskInt !== null) {
          const netAddr = intToIp((ipInt & maskInt) >>> 0);
          const pfx = row.prefix || maskToPrefixLen(row.subnetMask);
          entries.push({
            code: 'C',
            network: netAddr,
            mask: row.subnetMask || '255.255.255.0',
            prefixLen: pfx,
            nextHop: 'Directly connected',
            egressInterface: formatShortInt(row.interface || outInterfaceFallback),
            adminDistance: 0,
            metric: 0,
          });
        }
      });

      // 2. Static ('S' / 'S*') routes parsed from Stage 3 CLI configuration
      if (devCfg?.fullConfig) {
        devCfg.fullConfig.split('\n').forEach((line) => {
          const trimmed = line.trim();
          const match = trimmed.match(
            /^ip\s+route\s+(\d+\.\d+\.\d+\.\d+)\s+(\d+\.\d+\.\d+\.\d+)\s+(\S+)/i
          );
          if (match) {
            const [, net, mask, nh] = match;
            const pfx = maskToPrefixLen(mask);
            // Resolve egress interface from next-hop IP if possible
            let resolvedEgress = outInterfaceFallback;
            const nhInt = ipToInt(nh);
            if (nhInt !== null) {
              const matchingConn = devAddrRows.find((r: any) =>
                sameSubnet(r.ipAddress, nh, r.subnetMask || '255.255.255.0')
              );
              if (matchingConn?.interface) {
                resolvedEgress = formatShortInt(matchingConn.interface);
              }
            } else {
              resolvedEgress = formatShortInt(nh);
            }
            entries.push({
              code: net === '0.0.0.0' ? 'S*' : 'S',
              network: net,
              mask,
              prefixLen: pfx,
              nextHop: nh,
              egressInterface: resolvedEgress,
              adminDistance: 1,
              metric: 0,
            });
          }
        });
      }

      // 3. Remote subnets learned via OSPF ('O') or Static from Stage 2 Subnet Allocations
      subnetAllocations.forEach((sub: any) => {
        const subNet = (sub.networkAddress || sub.subnet || '').split('/')[0];
        const subMask = sub.subnetMask || '255.255.255.0';
        const pfx = sub.prefix || maskToPrefixLen(subMask);
        if (!subNet) return;

        const alreadyPresent = entries.some(
          (e) => e.network === subNet && e.prefixLen === pfx
        );
        if (!alreadyPresent) {
          entries.push({
            code: routingProto === 'STATIC' ? 'S' : 'O',
            network: subNet,
            mask: subMask,
            prefixLen: pfx,
            nextHop: nextHopIpFallback,
            egressInterface: outInterfaceFallback,
            adminDistance: routingProto === 'STATIC' ? 1 : 110,
            metric: routingProto === 'STATIC' ? 0 : 2,
          });
        }
      });

      // Perform Longest-Prefix Match (LPM) against targetIpStr, breaking ties by lowest Admin Distance
      const dstInt = ipToInt(targetIpStr);
      let bestIdx = -1;
      let bestPfx = -1;
      let bestAd = 999;

      if (dstInt !== null) {
        entries.forEach((entry, idx) => {
          const netInt = ipToInt(entry.network);
          const maskInt = ipToInt(entry.mask);
          if (netInt !== null && maskInt !== null) {
            if (((dstInt & maskInt) >>> 0) === ((netInt & maskInt) >>> 0)) {
              if (
                entry.prefixLen > bestPfx ||
                (entry.prefixLen === bestPfx && entry.adminDistance < bestAd)
              ) {
                bestPfx = entry.prefixLen;
                bestAd = entry.adminDistance;
                bestIdx = idx;
              }
            }
          }
        });
      }

      if (bestIdx === -1 && entries.length > 0) {
        bestIdx = 0;
      }

      const marked = entries.map((e, idx) => ({
        ...e,
        isMatched: idx === bestIdx,
      }));

      return {
        rib: marked,
        winningEntry: bestIdx >= 0 ? marked[bestIdx] : undefined,
      };
    };

    const findNodePath = (start: string, goal: string, avoidRouters = false): string[] | null => {
      const queue: string[][] = [[start]];
      const visited = new Set<string>([start]);

      while (queue.length > 0) {
        const path = queue.shift()!;
        const curr = path[path.length - 1];
        if (curr === goal) return path;

        const edges = adj.get(curr) || [];
        for (const edge of edges) {
          if (visited.has(edge.neighbor)) continue;
          const neighborNode = nodeMap.get(edge.neighbor);
          if (avoidRouters && neighborNode?.type === 'router' && edge.neighbor !== goal) {
            continue;
          }
          visited.add(edge.neighbor);
          queue.push([...path, edge.neighbor]);
        }
      }
      return null;
    };

    let finalNodeSequence: string[] | null = null;

    if (isSame) {
      finalNodeSequence = findNodePath(srcNode.name, dstNode.name, true);
    }

    if (!finalNodeSequence) {
      // Find ingress gateway router from srcGw or subnet match
      let gatewayRouter = routers.find((r: any) =>
        addressingTable.some(
          (row: any) =>
            row.device?.toLowerCase() === r.name.toLowerCase() &&
            ((row.ipAddress || '').split('/')[0].trim() === srcGw ||
              sameSubnet(row.ipAddress, srcIp, row.subnetMask || srcMask))
        )
      );
      if (!gatewayRouter && routers.length > 0) {
        gatewayRouter = routers[0];
      }

      // Find egress router owning dstGw or dstIp's subnet
      let egressRouter = routers.find((r: any) =>
        addressingTable.some(
          (row: any) =>
            row.device?.toLowerCase() === r.name.toLowerCase() &&
            ((row.ipAddress || '').split('/')[0].trim() === dstGw ||
              sameSubnet(row.ipAddress, dstIp, row.subnetMask || '255.255.255.0'))
        )
      );

      if (gatewayRouter && routers.length === 1) {
        const toRouter = findNodePath(srcNode.name, gatewayRouter.name, false);
        const fromRouter = findNodePath(gatewayRouter.name, dstNode.name, false);
        if (toRouter && fromRouter) {
          finalNodeSequence = [...toRouter, ...fromRouter.slice(1)];
        }
      } else if (gatewayRouter && egressRouter && gatewayRouter.name !== egressRouter.name) {
        // Check if gatewayRouter has a static route pointing to a specific intermediate router IP
        const { winningEntry } = buildRouterRib(gatewayRouter.name, dstIp, 'Gi0/0', dstGw);
        const intermediateRouter = winningEntry?.nextHop
          ? routers.find((r: any) =>
              addressingTable.some(
                (row: any) =>
                  row.device?.toLowerCase() === r.name.toLowerCase() &&
                  (row.ipAddress || '').split('/')[0].trim() === winningEntry.nextHop
              )
            )
          : undefined;

        const seg1 = findNodePath(srcNode.name, gatewayRouter.name, false);
        if (intermediateRouter && intermediateRouter.name !== egressRouter.name) {
          const segMid1 = findNodePath(gatewayRouter.name, intermediateRouter.name, false);
          const segMid2 = findNodePath(intermediateRouter.name, egressRouter.name, false);
          const segEnd = findNodePath(egressRouter.name, dstNode.name, false);
          if (seg1 && segMid1 && segMid2 && segEnd) {
            finalNodeSequence = [
              ...seg1,
              ...segMid1.slice(1),
              ...segMid2.slice(1),
              ...segEnd.slice(1),
            ];
          }
        }
        if (!finalNodeSequence) {
          const seg2 = findNodePath(gatewayRouter.name, egressRouter.name, false);
          const seg3 = findNodePath(egressRouter.name, dstNode.name, false);
          if (seg1 && seg2 && seg3) {
            finalNodeSequence = [...seg1, ...seg2.slice(1), ...seg3.slice(1)];
          }
        }
      }

      if (!finalNodeSequence) {
        finalNodeSequence = findNodePath(srcNode.name, dstNode.name, false);
      }
    }

    if (!finalNodeSequence || finalNodeSequence.length < 2) {
      finalNodeSequence = [srcNode.name];
      if (switches.length > 0) finalNodeSequence.push(switches[0].name);
      if (!isSame && routers.length > 0) finalNodeSequence.push(routers[0].name);
      if (routers.length > 1) finalNodeSequence.push(routers[routers.length - 1].name);
      if (switches.length > 1) finalNodeSequence.push(switches[switches.length - 1].name);
      else if (!isSame && switches.length === 1 && routers.length === 1) {
        finalNodeSequence.push(switches[0].name);
      }
      finalNodeSequence.push(dstNode.name);
    }

    const activeLinkKeys = new Set<string>();
    const linkOrderMap = new Map<string, number>();
    const hops: RouteHop[] = [];
    let currentTtl = 255;

    // Track current L2 MAC frame addresses across L2 segments (rewritten at every L3 router hop)
    let currentL2SrcMac = getDeviceMac(srcNode.name, 'NIC');
    const firstL3RouterInPath = finalNodeSequence.find(
      (nName) => nodeMap.get(nName)?.type === 'router'
    );
    let currentL2DstMac = isSame
      ? getDeviceMac(dstNode.name, 'NIC')
      : firstL3RouterInPath
      ? getDeviceMac(firstL3RouterInPath, 'GW')
      : getDeviceMac(dstNode.name, 'NIC');

    for (let i = 0; i < finalNodeSequence.length; i++) {
      const currName = finalNodeSequence[i];
      const prevName = i > 0 ? finalNodeSequence[i - 1] : null;
      const nextName = i < finalNodeSequence.length - 1 ? finalNodeSequence[i + 1] : null;
      const currNode = nodeMap.get(currName);
      const currType = currNode?.type || 'router';

      const inEdge = prevName
        ? (adj.get(currName) || []).find((e) => e.neighbor === prevName)
        : undefined;
      const outEdge = nextName
        ? (adj.get(currName) || []).find((e) => e.neighbor === nextName)
        : undefined;

      if (outEdge) {
        activeLinkKeys.add(outEdge.connKey);
        if (!linkOrderMap.has(outEdge.connKey)) {
          linkOrderMap.set(outEdge.connKey, i + 1);
        }
      }

      const devAddrRows = addressingTable.filter(
        (r: any) => r.device?.toLowerCase() === currName.toLowerCase()
      );

      let layerAction: RouteHop['layerAction'] = 'L2_SWITCHING';
      let routingTableMatch = 'L2 MAC Address Table Forwarding';
      let encapsulationNote = '802.3 Ethernet Frame';
      let nextHopIp: string | undefined;
      let vlanTag: string | undefined = outEdge?.vlan || srcNode.vlan;
      let deviceRib: RibEntry[] | undefined;
      let matchedRibEntry: RibEntry | undefined;

      if (i === 0) {
        layerAction = 'ENDPOINT_ORIGIN';
        routingTableMatch = isSame
          ? `Connected ARP Lookup: ${dstIp} is on local subnet (${srcMask})`
          : `Default Gateway Route: 0.0.0.0/0 -> via ${srcGw}`;
        encapsulationNote = isSame
          ? `ARP resolves ${dstIp} -> ${currentL2DstMac} (${srcNode.vlan || 'Access Port'})`
          : `Dst IP ${dstIp} is remote; ARP resolves Gateway ${srcGw} -> ${currentL2DstMac}`;
      } else if (i === finalNodeSequence.length - 1) {
        layerAction = 'ENDPOINT_DESTINATION';
        routingTableMatch = `Local NIC Delivery (${dstIp})`;
        encapsulationNote = `Destination host verifies Dst MAC (${currentL2DstMac}) & Dst IP (${dstIp}); replies with ICMP Echo Reply`;
      } else if (currType === 'router') {
        layerAction = 'L3_ROUTING';
        currentTtl = Math.max(1, currentTtl - 1);
        const nextNode = nextName ? nodeMap.get(nextName) : undefined;
        const outShort = formatShortInt(outEdge?.localInterface || 'Gi0/0');

        // Find next L3 router down the remaining path if any
        const nextL3RouterName = finalNodeSequence
          .slice(i + 1)
          .find((nName) => nodeMap.get(nName)?.type === 'router');

        const nextRouterRows = nextL3RouterName
          ? addressingTable.filter(
              (r: any) => r.device?.toLowerCase() === nextL3RouterName.toLowerCase()
            )
          : [];
        const transitRow =
          nextRouterRows.find(
            (r: any) =>
              (r.vlanPurpose || '').toLowerCase().includes('wan') ||
              (r.vlanPurpose || '').toLowerCase().includes('link') ||
              (r.subnetMask || '').includes('252')
          ) || nextRouterRows[0];
        nextHopIp = (transitRow?.ipAddress || srcGw).split('/')[0].trim();

        const { rib, winningEntry } = buildRouterRib(
          currName,
          dstIp,
          outShort,
          nextHopIp || '10.0.0.2'
        );
        deviceRib = rib;
        matchedRibEntry = winningEntry;

        // Rewrite L2 Source & Destination MACs on router egress!
        currentL2SrcMac = getDeviceMac(currName, outShort);
        currentL2DstMac = nextL3RouterName
          ? getDeviceMac(nextL3RouterName, 'INGRESS')
          : getDeviceMac(dstNode.name, 'NIC');

        if (nextNode?.type === 'router' || nextL3RouterName) {
          if (winningEntry) {
            routingTableMatch = `${winningEntry.code} ${winningEntry.network}/${winningEntry.prefixLen} [${winningEntry.adminDistance}/${winningEntry.metric}] via ${winningEntry.nextHop}, ${winningEntry.egressInterface}`;
          } else {
            routingTableMatch = `O ${dstIp} [110/2] via ${nextHopIp}, ${outShort}`;
          }
          encapsulationNote = `LPM FIB Match -> Decrement TTL to ${currentTtl}, rewrite L2 Src/Dst MAC for next hop (${outShort})`;
          vlanTag = 'L3 Routed';
        } else {
          const matchingSub = devAddrRows.find(
            (r: any) =>
              (r.ipAddress || '').split('/')[0].trim() === dstGw ||
              sameSubnet(r.ipAddress, dstIp, r.subnetMask || '255.255.255.0') ||
              (dstNode.vlan && (r.vlanPurpose || '').includes(dstNode.vlan))
          );
          const subIntf = formatShortInt(
            matchingSub?.interface || outEdge?.localInterface || 'Gi0/0'
          );
          routingTableMatch = winningEntry
            ? `${winningEntry.code} ${winningEntry.network}/${winningEntry.prefixLen} is directly connected, ${subIntf}`
            : `C ${dstIp} subnet is directly connected, ${subIntf} (GW ${dstGw})`;
          encapsulationNote = subIntf.includes('.')
            ? `802.1Q dot1Q re-encapsulation on ${subIntf} (${dstNode.vlan || 'Target VLAN'}), rewrite MAC -> ${currentL2DstMac}, TTL=${currentTtl}`
            : `ARP lookup for ${dstIp} on ${subIntf} -> rewrites Dst MAC to ${currentL2DstMac}, TTL=${currentTtl}`;
          vlanTag = dstNode.vlan || 'Untagged L2';
        }
      } else {
        layerAction = 'L2_SWITCHING';
        const isToRouter = nextName && nodeMap.get(nextName)?.type === 'router';
        const isFromRouter = prevName && nodeMap.get(prevName)?.type === 'router';
        const outShort = formatShortInt(outEdge?.localInterface || 'Fa0/1');
        const linkIsTrunk = (outEdge?.linkType || '').toLowerCase() === 'trunk';

        if (isToRouter && linkIsTrunk) {
          routingTableMatch = `CAM Lookup (${currentL2DstMac}) -> 802.1Q Trunk (${outShort})`;
          encapsulationNote = `Preserves L2 MACs; tags frame with ${srcNode.vlan || 'VLAN'} over trunk`;
          vlanTag = `802.1Q (${srcNode.vlan || 'Trunk'})`;
        } else if (isFromRouter) {
          routingTableMatch = `CAM Lookup (${currentL2DstMac}) -> Egress Port (${outShort})`;
          encapsulationNote = `Switches frame to ${dstNode.name} (${currentL2DstMac}) without modifying L3 TTL`;
          vlanTag = dstNode.vlan || 'Access';
        } else {
          routingTableMatch = `CAM Lookup (${currentL2DstMac}) -> Port ${outShort}`;
          encapsulationNote = `L2 hardware switching via ${outShort}; L2 MAC & L3 TTL (${currentTtl}) unchanged`;
        }
      }

      hops.push({
        hopNumber: i + 1,
        deviceName: currName,
        deviceType: currType,
        ingressInterface: inEdge ? formatShortInt(inEdge.localInterface) : 'Local Stack',
        egressInterface: outEdge ? formatShortInt(outEdge.localInterface) : 'Local Delivery',
        nextHopDevice: nextName || undefined,
        nextHopIp,
        ttl: currentTtl,
        vlanTag,
        srcMac: currentL2SrcMac,
        dstMac: currentL2DstMac,
        layerAction,
        routingTableMatch,
        encapsulationNote,
        deviceRib,
        matchedRibEntry,
      });
    }

    return {
      sourceName: srcNode.name,
      sourceIp: srcIp,
      destinationName: dstNode.name,
      destinationIp: dstIp,
      orderedNodeNames: finalNodeSequence,
      activeLinkKeys,
      linkOrderMap,
      hops,
      protocolUsed: isSame ? 'Layer 2 Switching (Intra-VLAN)' : `${routingProto} / Connected FIB`,
      isSameSubnet: isSame,
      reachabilityStatus: 'REACHABLE',
    };
  }, [
    isTraceActive,
    sourceEndpoint,
    destEndpoint,
    nodeMap,
    allNodes,
    connections,
    addressingTable,
    subnetAllocations,
    routers,
    switches,
    stage3,
    report.constraints,
  ]);

  const handleSwapEndpoints = () => {
    setSourceEndpoint(destEndpoint);
    setDestEndpoint(sourceEndpoint);
    setFocusedHopIndex(null);
  };

  const handleCanvasEndpointClick = (endpointName: string) => {
    setIsTraceActive(true);
    setFocusedHopIndex(null);
    if (endpointName === sourceEndpoint) {
      setNextCanvasPickMode('dst');
      return;
    }
    if (endpointName === destEndpoint) {
      setNextCanvasPickMode('src');
      return;
    }
    if (nextCanvasPickMode === 'src') {
      setSourceEndpoint(endpointName);
      setNextCanvasPickMode('dst');
    } else {
      setDestEndpoint(endpointName);
      setNextCanvasPickMode('src');
    }
  };

  return (
    <div className="space-y-6">
      {/* =================================================================== */}
      {/* INTERACTIVE TOPOLOGY CANVAS                                         */}
      {/* =================================================================== */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        {/* Visualizer Header Bar */}
        <div className="px-5 py-3.5 bg-slate-950/80 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <span>Physical & Logical Topology Model</span>
                {tracedPath && (
                  <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-700/60 text-emerald-300">
                    Active Route: {tracedPath.sourceName} → {tracedPath.destinationName}
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-400">
                Interactive Cisco network diagram • Click any router or switch to inspect its IOS configuration
              </div>
            </div>
          </div>

          {/* View Mode Switcher if uploaded image exists */}
          <div className="flex items-center gap-2">
            {hasUploadedSource && (
              <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 font-mono text-xs">
                <button
                  onClick={() => setViewMode('interactive')}
                  className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                    viewMode === 'interactive'
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Model View
                </button>
                <button
                  onClick={() => setViewMode('split')}
                  className={`px-2.5 py-1 rounded-md transition cursor-pointer flex items-center gap-1 ${
                    viewMode === 'split'
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Compare uploaded diagram side-by-side with interactive model"
                >
                  <Columns className="w-3 h-3" />
                  <span>Split View</span>
                </button>
                <button
                  onClick={() => setViewMode('source')}
                  className={`px-2.5 py-1 rounded-md transition cursor-pointer flex items-center gap-1 ${
                    viewMode === 'source'
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileImage className="w-3 h-3" />
                  <span>Uploaded Source</span>
                </button>
              </div>
            )}

            {/* Legend */}
            <div className="hidden lg:flex items-center gap-3 text-xs font-mono pl-2">
              {tracedPath && (
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <span className="w-3 h-1 bg-emerald-400 rounded-sm"></span>
                  <span>Traced Path</span>
                </div>
              )}
              <div className="flex items-center gap-1 text-amber-400">
                <span className="w-2.5 h-1 bg-amber-400 rounded-sm"></span>
                <span>Trunk</span>
              </div>
              <div className="flex items-center gap-1 text-cyan-400">
                <span className="w-2.5 h-1 bg-cyan-400 rounded-sm"></span>
                <span>Access</span>
              </div>
              <div className="flex items-center gap-1 text-red-400">
                <span className="w-2.5 h-1 border-b-2 border-dashed border-red-400"></span>
                <span>WAN P2P</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Visualizer Content Area */}
        <div className="relative">
          {/* Source Diagram Only View */}
          {viewMode === 'source' && uploadedFile?.previewUrl && (
            <div className="w-full h-[500px] bg-slate-950 flex flex-col items-center justify-center p-4 overflow-auto">
              <div className="text-xs font-mono text-emerald-400 mb-2 flex items-center gap-1.5">
                <FileImage className="w-4 h-4" />
                <span>Original Uploaded Topology: {uploadedFile.name}</span>
              </div>
              <img
                src={uploadedFile.previewUrl}
                alt="Original Diagram"
                className="max-h-[440px] max-w-full object-contain rounded-lg border border-slate-800 shadow-2xl"
              />
            </div>
          )}

          {/* Split View: Left Source Image, Right Interactive SVG */}
          {viewMode === 'split' && uploadedFile?.previewUrl && (
            <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-800 h-[520px]">
              {/* Left: Source Diagram */}
              <div className="bg-slate-950 p-4 flex flex-col items-center justify-center overflow-auto">
                <div className="w-full flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs font-mono">
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <FileImage className="w-3.5 h-3.5" />
                    GROUND TRUTH (UPLOADED)
                  </span>
                  <span className="text-slate-500 text-[10px]">{uploadedFile.name}</span>
                </div>
                <img
                  src={uploadedFile.previewUrl}
                  alt="Original Topology"
                  className="max-h-[430px] max-w-full object-contain rounded border border-slate-800"
                />
              </div>

              {/* Right: Interactive SVG */}
              <div className="relative bg-radial from-slate-900 to-slate-950 flex items-center justify-center overflow-auto p-2">
                <svg viewBox="0 0 800 520" className="w-full h-full select-none">
                  {renderSvgContent()}
                </svg>
              </div>
            </div>
          )}

          {/* Full Interactive SVG Canvas View */}
          {(viewMode === 'interactive' || !uploadedFile?.previewUrl) && (
            <div className="relative w-full h-[520px] bg-radial from-slate-900 to-slate-950 flex items-center justify-center overflow-auto p-4">
              {/* Subtle grid background */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
                <defs>
                  <pattern id="grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#475569" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid-pattern)" />
              </svg>

              {allNodes.length === 0 ? (
                <div className="text-center font-mono space-y-3 z-10">
                  <Network className="w-12 h-12 text-slate-600 mx-auto" />
                  <div className="text-slate-300 font-semibold text-sm">No Topology Loaded Yet</div>
                  <div className="text-slate-500 text-xs">
                    Upload a topology image or PDF to analyze devices and generate Cisco IOS configs.
                  </div>
                  {onOpenUploader && (
                    <button
                      onClick={onOpenUploader}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs transition cursor-pointer"
                    >
                      Upload Topology Image / PDF
                    </button>
                  )}
                </div>
              ) : (
                <svg viewBox="0 0 800 520" className="w-full h-full max-w-4xl select-none">
                  {renderSvgContent()}
                </svg>
              )}
            </div>
          )}
        </div>

        {/* Footer Info & Quick Action Bar */}
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              {selectedDeviceName
                ? `Currently highlighting ${selectedDeviceName}. Switch to Stage 3 tab to inspect complete hardened Cisco CLI commands.`
                : 'Click any router or switch in the diagram to inspect its dedicated Cisco IOS configuration, or use the Path Tracer below.'}
            </span>
          </div>
          {selectedDeviceName && onSelectDevice && (
            <button
              onClick={() => onSelectDevice(selectedDeviceName)}
              className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-md transition font-medium cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Inspect {selectedDeviceName} Config
            </button>
          )}
        </div>
      </div>

      {/* =================================================================== */}
      {/* DEDICATED VISUAL PATH TRACER COMPONENT                              */}
      {/* =================================================================== */}
      <PathTracer
        report={report}
        selectableEndpoints={selectableEndpoints}
        sourceEndpoint={sourceEndpoint}
        destEndpoint={destEndpoint}
        isTraceActive={isTraceActive}
        focusedHopIndex={focusedHopIndex}
        tracedPath={tracedPath}
        onSelectSource={setSourceEndpoint}
        onSelectDest={setDestEndpoint}
        onSwapEndpoints={handleSwapEndpoints}
        onToggleTrace={setIsTraceActive}
        onFocusHop={setFocusedHopIndex}
        onSelectDeviceConfig={onSelectDevice}
      />
    </div>
  );

  // Modular SVG rendering function with Hop-by-Hop Path Tracer overlay
  function renderSvgContent() {
    const activeNodesSet = tracedPath ? new Set(tracedPath.orderedNodeNames) : null;
    const focusedHop =
      tracedPath && focusedHopIndex !== null ? tracedPath.hops[focusedHopIndex] : null;

    return (
      <>
        <defs>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Render Connections */}
        {connections.map((conn: any, idx: number) => {
          if (!conn) return null;
          const fromName = conn.fromDevice;
          const toName = conn.toDevice;
          const src = nodeMap.get(fromName);
          const dst = nodeMap.get(toName);
          if (!src || !dst || !src.coords || !dst.coords) return null;

          const connKey = conn.id || `conn-${fromName}-${toName}-${idx}`;
          const isHovered = hoveredLink === connKey;
          const isTrunk = conn.linkType === 'Trunk';
          const isWAN = conn.linkType === 'WAN' || conn.linkType === 'Routed';

          const isLinkInTracedPath = tracedPath ? tracedPath.activeLinkKeys.has(connKey) : false;
          const linkStepOrder = tracedPath ? tracedPath.linkOrderMap.get(connKey) : undefined;

          const isFocusedLink =
            focusedHop &&
            ((focusedHop.deviceName === fromName && focusedHop.nextHopDevice === toName) ||
              (focusedHop.deviceName === toName && focusedHop.nextHopDevice === fromName));

          const baseStrokeColor = isWAN ? '#f87171' : isTrunk ? '#fbbf24' : '#38bdf8';
          const strokeColor = isFocusedLink
            ? '#34d399'
            : isLinkInTracedPath
            ? '#10b981'
            : baseStrokeColor;

          const strokeDash = isWAN && !isLinkInTracedPath ? '5,5' : 'none';
          const linkOpacity = tracedPath && !isLinkInTracedPath ? 0.25 : 1;

          const midX = (src.coords.x + dst.coords.x) / 2;
          const midY = (src.coords.y + dst.coords.y) / 2;

          const fromLabel = formatShortInt(conn.fromInterface);
          const toLabel = formatShortInt(conn.toInterface);

          return (
            <g
              key={connKey}
              style={{ opacity: linkOpacity }}
              className="cursor-pointer transition-all duration-200"
              onMouseEnter={() => setHoveredLink(connKey)}
              onMouseLeave={() => setHoveredLink(null)}
            >
              {isLinkInTracedPath && (
                <line
                  x1={src.coords.x}
                  y1={src.coords.y}
                  x2={dst.coords.x}
                  y2={dst.coords.y}
                  stroke={isFocusedLink ? '#6ee7b7' : '#10b981'}
                  strokeWidth={isFocusedLink ? 9 : 6}
                  strokeOpacity={isFocusedLink ? 0.35 : 0.2}
                  strokeLinecap="round"
                />
              )}

              <line
                x1={src.coords.x}
                y1={src.coords.y}
                x2={dst.coords.x}
                y2={dst.coords.y}
                stroke={strokeColor}
                strokeWidth={
                  isFocusedLink
                    ? 4.5
                    : isLinkInTracedPath
                    ? 3.5
                    : isHovered
                    ? 4
                    : isTrunk
                    ? 3
                    : 2
                }
                strokeDasharray={strokeDash}
                filter={isHovered || isLinkInTracedPath ? 'url(#glow)' : undefined}
                className="transition-all duration-150"
              />

              {isLinkInTracedPath && (
                <line
                  x1={src.coords.x}
                  y1={src.coords.y}
                  x2={dst.coords.x}
                  y2={dst.coords.y}
                  stroke="#a7f3d0"
                  strokeWidth={2}
                  strokeDasharray="6,8"
                  className="animate-pulse"
                />
              )}

              {isLinkInTracedPath && linkStepOrder !== undefined ? (
                <g transform={`translate(${midX}, ${midY})`}>
                  <circle r="10" fill="#064e3b" stroke="#34d399" strokeWidth="1.5" />
                  <text
                    x="0"
                    y="3.5"
                    textAnchor="middle"
                    fill="#ecfdf5"
                    className="font-mono text-[9px] font-bold"
                  >
                    #{linkStepOrder}
                  </text>
                </g>
              ) : (
                <circle
                  cx={midX}
                  cy={midY}
                  r={isHovered ? 5 : 3.5}
                  fill={strokeColor}
                  className="animate-pulse"
                />
              )}

              {/* Interface Port Badges */}
              <g className="font-mono text-[10px]">
                {fromLabel && (
                  <>
                    <rect
                      x={src.coords.x + (dst.coords.x - src.coords.x) * 0.28 - 26}
                      y={src.coords.y + (dst.coords.y - src.coords.y) * 0.28 - 9}
                      width="52"
                      height="17"
                      rx="4"
                      fill="#090d16"
                      stroke={isLinkInTracedPath ? '#10b981' : '#334155'}
                      strokeWidth="1"
                    />
                    <text
                      x={src.coords.x + (dst.coords.x - src.coords.x) * 0.28}
                      y={src.coords.y + (dst.coords.y - src.coords.y) * 0.28 + 3}
                      textAnchor="middle"
                      fill={isLinkInTracedPath ? '#a7f3d0' : '#94a3b8'}
                      className="font-medium"
                    >
                      {fromLabel}
                    </text>
                  </>
                )}

                {toLabel && (
                  <>
                    <rect
                      x={dst.coords.x - (dst.coords.x - src.coords.x) * 0.28 - 26}
                      y={dst.coords.y - (dst.coords.y - src.coords.y) * 0.28 - 9}
                      width="52"
                      height="17"
                      rx="4"
                      fill="#090d16"
                      stroke={isLinkInTracedPath ? '#10b981' : '#334155'}
                      strokeWidth="1"
                    />
                    <text
                      x={dst.coords.x - (dst.coords.x - src.coords.x) * 0.28}
                      y={dst.coords.y - (dst.coords.y - src.coords.y) * 0.28 + 3}
                      textAnchor="middle"
                      fill={isLinkInTracedPath ? '#a7f3d0' : '#94a3b8'}
                      className="font-medium"
                    >
                      {toLabel}
                    </text>
                  </>
                )}
              </g>

              {isHovered && (
                <g>
                  <rect
                    x={midX - 75}
                    y={midY - 32}
                    width="150"
                    height="24"
                    rx="6"
                    fill="#0f172a"
                    stroke={strokeColor}
                    strokeWidth="1.5"
                  />
                  <text
                    x={midX}
                    y={midY - 16}
                    textAnchor="middle"
                    fill="#f8fafc"
                    className="text-[11px] font-mono font-semibold"
                  >
                    {conn.linkType || 'Link'}: {conn.vlan || 'Data Link'}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* Render Nodes */}
        {allNodes.map((node) => {
          const isSelected = selectedDeviceName === node.name;
          const isHovered = hoveredNode === node.name;
          const isClickable = node.type === 'router' || node.type === 'switch';

          const isNodeInPath = activeNodesSet ? activeNodesSet.has(node.name) : false;
          const isSourceNode = tracedPath?.sourceName === node.name;
          const isDestNode = tracedPath?.destinationName === node.name;
          const isFocusedNode = focusedHop?.deviceName === node.name;
          const hopIndicesForNode = tracedPath
            ? tracedPath.hops
                .filter((h) => h.deviceName === node.name)
                .map((h) => h.hopNumber)
            : [];

          let nodeColor = '#3b82f6';
          if (node.type === 'router') nodeColor = '#10b981';
          if (node.type === 'switch') nodeColor = '#06b6d4';
          if (node.type === 'server') nodeColor = '#a855f7';
          if (node.type === 'pc') nodeColor = '#3b82f6';

          const cx = node.coords?.x ?? 400;
          const cy = node.coords?.y ?? 200;
          const nodeOpacity = tracedPath && !isNodeInPath ? 0.35 : 1;

          return (
            <g
              key={node.name}
              transform={`translate(${cx}, ${cy})`}
              style={{ opacity: nodeOpacity }}
              className={`cursor-pointer transition-transform duration-200 ${
                isHovered || isFocusedNode ? 'scale-110' : ''
              }`}
              onClick={() => {
                if (isClickable && onSelectDevice) {
                  onSelectDevice(node.name);
                } else if (node.type === 'pc' || node.type === 'server') {
                  handleCanvasEndpointClick(node.name);
                }
              }}
              onMouseEnter={() => setHoveredNode(node.name)}
              onMouseLeave={() => setHoveredNode(null)}
            >
              {(isSelected || isFocusedNode || isSourceNode || isDestNode) && (
                <circle
                  r="34"
                  fill="none"
                  stroke={isDestNode ? '#38bdf8' : '#10b981'}
                  strokeWidth="2"
                  strokeDasharray="4,4"
                  className="animate-spin"
                />
              )}

              <circle
                r="26"
                fill="#0b1120"
                stroke={
                  isFocusedNode || isSourceNode
                    ? '#10b981'
                    : isDestNode
                    ? '#38bdf8'
                    : isNodeInPath
                    ? '#34d399'
                    : isSelected
                    ? '#10b981'
                    : isHovered
                    ? nodeColor
                    : '#334155'
                }
                strokeWidth={
                  isFocusedNode ||
                  isSourceNode ||
                  isDestNode ||
                  isNodeInPath ||
                  isSelected ||
                  isHovered
                    ? 2.5
                    : 1.5
                }
                filter={isHovered || isNodeInPath ? 'url(#glow)' : undefined}
              />

              <circle r="19" fill={nodeColor} fillOpacity="0.18" />

              <g transform="translate(-10, -10)" color={nodeColor}>
                {node.type === 'router' && <Router className="w-5 h-5 text-emerald-400" />}
                {node.type === 'switch' && <Layers className="w-5 h-5 text-cyan-400" />}
                {node.type === 'server' && <Server className="w-5 h-5 text-purple-400" />}
                {node.type === 'pc' && <Laptop className="w-5 h-5 text-blue-400" />}
              </g>

              {isNodeInPath && hopIndicesForNode.length > 0 && (
                <g transform="translate(0, -38)">
                  <rect
                    x="-34"
                    y="-9"
                    width="68"
                    height="16"
                    rx="4"
                    fill={isSourceNode ? '#065f46' : isDestNode ? '#0c4a6e' : '#0f172a'}
                    stroke={isSourceNode ? '#34d399' : isDestNode ? '#38bdf8' : '#10b981'}
                    strokeWidth="1"
                  />
                  <text
                    x="0"
                    y="2"
                    textAnchor="middle"
                    fill="#f8fafc"
                    className="font-mono text-[9px] font-bold"
                  >
                    {isSourceNode
                      ? 'SOURCE'
                      : isDestNode
                      ? 'DEST'
                      : `HOP ${hopIndicesForNode.join(',')}`}
                  </text>
                </g>
              )}

              <rect
                x="-55"
                y="30"
                width="110"
                height="20"
                rx="5"
                fill="#090d16"
                stroke={isNodeInPath || isSelected ? '#10b981' : '#1e293b'}
                strokeWidth="1"
              />
              <text
                x="0"
                y="44"
                textAnchor="middle"
                fill={isNodeInPath || isSelected ? '#34d399' : '#f1f5f9'}
                className="font-mono text-[11px] font-bold"
              >
                {node.name}
              </text>

              <text
                x="0"
                y="62"
                textAnchor="middle"
                fill="#64748b"
                className="font-mono text-[9px]"
              >
                {node.ip ? node.ip : node.model || node.role}
              </text>
            </g>
          );
        })}
      </>
    );
  }
};
