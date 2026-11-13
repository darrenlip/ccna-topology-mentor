import React, { useState } from 'react';
import { Network, Copy, Check, Download, Search, Filter, Hash, ArrowDownNarrowWide, X, RefreshCw } from 'lucide-react';
import { Phase2Addressing } from '../types/network';
import { VlsmVisualizer } from './VlsmVisualizer';

interface Phase2AddressingProps {
  addressing: Phase2Addressing;
}

export const Phase2AddressingView: React.FC<Phase2AddressingProps> = ({ addressing }) => {
  const [copiedMd, setCopiedMd] = useState(false);
  const [copiedIp, setCopiedIp] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDevice, setSelectedDevice] = useState<string>('ALL');
  const [selectedVlanFilter, setSelectedVlanFilter] = useState<number | null>(null);

  const addressingTable = Array.isArray(addressing?.addressingTable) ? addressing.addressingTable : [];

  // Unique devices in addressing table
  const devices = ['ALL', ...Array.from(new Set(addressingTable.map((e) => e?.device).filter(Boolean)))];

  // Filtered table rows
  const filteredTable = addressingTable.filter((entry) => {
    if (!entry) return false;
    const matchesDevice = selectedDevice === 'ALL' || entry.device === selectedDevice;
    const matchesVlan =
      selectedVlanFilter === null ||
      (entry.vlan && (entry.vlan === String(selectedVlanFilter) || entry.vlan.includes(String(selectedVlanFilter))));
    const query = searchQuery.toLowerCase();
    const dev = (entry.device || '').toLowerCase();
    const intf = (entry.interface || '').toLowerCase();
    const ip = (entry.ipAddress || '').toLowerCase();
    const purp = (entry.vlanPurpose || entry.purpose || '').toLowerCase();

    const matchesSearch =
      !query ||
      dev.includes(query) ||
      intf.includes(query) ||
      ip.includes(query) ||
      purp.includes(query);

    return matchesDevice && matchesVlan && matchesSearch;
  });

  // Generate formatted Markdown table with exact 7 columns
  const generateMarkdownTable = () => {
    let md = '| Device | Interface / Subinterface | VLAN / Purpose | IP Address | Subnet Mask | Usable Range | Default Gateway |\n';
    md += '| :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n';
    addressingTable.forEach((row) => {
      if (!row) return;
      const vlanPurpose = row.vlanPurpose || (row.vlan ? `VLAN ${row.vlan} (${row.purpose || ''})` : row.purpose || 'LAN');
      md += `| ${row.device || 'N/A'} | ${row.interface || 'N/A'} | ${vlanPurpose} | ${row.ipAddress || 'DHCP'} | ${row.subnetMask || 'N/A'} | ${row.usableRange || 'N/A'} | ${row.defaultGateway || 'N/A'} |\n`;
    });
    return md;
  };

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(generateMarkdownTable());
    setCopiedMd(true);
    setTimeout(() => setCopiedMd(false), 2000);
  };

  const handleCopyIp = (ip: string) => {
    navigator.clipboard.writeText(ip);
    setCopiedIp(ip);
    setTimeout(() => setCopiedIp(null), 1500);
  };

  const handleExportCsv = () => {
    let csv = 'Device,Interface / Subinterface,VLAN / Purpose,IP Address,Subnet Mask,Prefix,Usable Range,Default Gateway\n';
    addressingTable.forEach((row) => {
      if (!row) return;
      const vlanPurpose = row.vlanPurpose || (row.vlan ? `VLAN ${row.vlan} (${row.purpose || ''})` : row.purpose || 'LAN');
      csv += `"${row.device || ''}","${row.interface || ''}","${vlanPurpose}","${row.ipAddress || ''}","${row.subnetMask || ''}","/${row.prefix || 24}","${row.usableRange || ''}","${row.defaultGateway || ''}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const netBlockStr = (addressing?.networkBlock || '192.168.10.0-24').replace(/[^a-zA-Z0-9.-]/g, '_');
    a.download = `CCNA-Addressing-Table-${netBlockStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Overview & Rationale */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 text-xs font-mono font-bold">
              2
            </span>
            STAGE 2: VLSM ADDRESSING TABLE
          </h3>
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-slate-400">Base Network Block:</span>
            <span className="px-2.5 py-1 rounded-md bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 font-bold">
              {addressing.networkBlock}
            </span>
          </div>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed font-sans">
          {addressing.vlsmRationale}
        </p>
      </div>

      {/* Visual Representation of VLSM Address Space (Partition Bar & Treemap) */}
      <VlsmVisualizer
        addressing={addressing}
        selectedVlan={selectedVlanFilter}
        onFilterVlan={(vlanId) => setSelectedVlanFilter((prev) => (prev === vlanId ? null : vlanId ?? null))}
      />

      {/* VLSM Subnet Allocations Breakdown */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <ArrowDownNarrowWide className="w-4 h-4 text-emerald-400" />
            VLSM Subnet Allocations (Sorted Descending by Host Requirements)
          </h4>
          <span className="text-xs font-mono text-slate-400">
            {addressing.subnetAllocations.length} Subnets Formulated
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {addressing.subnetAllocations.map((sub, idx) => {
            const isVlanSelected = selectedVlanFilter !== null && selectedVlanFilter === sub.vlanId;
            return (
              <div
                key={sub.name + idx}
                onClick={() => setSelectedVlanFilter((prev) => (prev === sub.vlanId ? null : sub.vlanId ?? null))}
                className={`bg-slate-900/90 border rounded-xl p-4 flex flex-col justify-between transition cursor-pointer ${
                  isVlanSelected
                    ? 'border-emerald-500 ring-2 ring-emerald-500/40 bg-emerald-950/20 shadow-lg'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-100 font-mono">
                      {sub.name}
                    </span>
                    {sub.vlanId && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-300">
                        VLAN {sub.vlanId}
                      </span>
                    )}
                  </div>

                  <div className="mt-2.5 font-mono text-xs">
                    <div className="text-emerald-400 font-bold text-sm">
                      {sub.networkAddress}/{sub.prefix}
                    </div>
                    <div className="text-slate-400 text-[11px] mt-0.5">
                      Mask: {sub.subnetMask}
                    </div>
                    <div className="text-slate-500 text-[11px]">
                      Wildcard: {sub.wildcardMask}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] font-mono space-y-1">
                  <div className="flex justify-between text-slate-300">
                    <span>Usable Range:</span>
                    <span className="text-slate-200 text-right">{sub.usableRange}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Broadcast:</span>
                    <span className="text-slate-400">{sub.broadcastAddress}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1 text-[10px]">
                    <span className="text-slate-400">Capacity:</span>
                    <span className="px-1.5 py-0.2 rounded bg-slate-800 text-emerald-300 font-bold">
                      {sub.hostsNeeded} req / {sub.hostsAllocated} usable
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Addressing Table with Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div>
              <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <Hash className="w-4 h-4 text-emerald-400" />
                Production Addressing Table
              </h4>
              <div className="text-xs text-slate-400 mt-0.5">
                Device | Interface | IP Address | Subnet Mask | Default Gateway | Purpose
              </div>
            </div>

            {/* Active VLAN Filter Chip */}
            {selectedVlanFilter !== null && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-700/80 text-emerald-300 text-xs font-mono font-medium">
                <span>VLAN {selectedVlanFilter} Active</span>
                <button
                  onClick={() => setSelectedVlanFilter(null)}
                  className="p-0.5 hover:bg-emerald-900 rounded text-emerald-400 cursor-pointer"
                  title="Clear VLAN filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Search, Filter & Export buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search device, IP, interface..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-52"
              />
            </div>

            {/* Device Filter Dropdown */}
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={selectedDevice}
                onChange={(e) => setSelectedDevice(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                {devices.map((d) => (
                  <option key={d} value={d}>
                    {d === 'ALL' ? 'All Devices' : d}
                  </option>
                ))}
              </select>
            </div>

            {/* Copy Markdown Table */}
            <button
              onClick={handleCopyMarkdown}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-mono font-medium transition cursor-pointer"
              title="Copy table formatted in Markdown for Packet Tracer docs"
            >
              {copiedMd ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedMd ? 'Copied Markdown!' : 'Copy Markdown'}
            </button>

            {/* Export CSV */}
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-mono font-medium transition cursor-pointer"
              title="Export Addressing Table as CSV"
            >
              <Download className="w-3.5 h-3.5" />
              CSV
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4 font-semibold">Device</th>
                <th className="py-3 px-4 font-semibold">Interface / Subinterface</th>
                <th className="py-3 px-4 font-semibold">VLAN / Purpose</th>
                <th className="py-3 px-4 font-semibold">IP Address</th>
                <th className="py-3 px-4 font-semibold">Subnet Mask</th>
                <th className="py-3 px-4 font-semibold">Usable Range</th>
                <th className="py-3 px-4 font-semibold">Default Gateway</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredTable.length > 0 ? (
                filteredTable.map((entry, idx) => {
                  const vlanPurpose = entry.vlanPurpose || (entry.vlan ? `VLAN ${entry.vlan} (${entry.purpose || ''})` : entry.purpose || 'Data LAN');
                  return (
                    <tr key={idx} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 font-bold text-slate-200">
                        {entry.device}
                      </td>
                      <td className="py-3 px-4 text-cyan-400 font-medium">
                        {entry.interface}
                      </td>
                      <td className="py-3 px-4 text-slate-300 font-sans text-[11px]">
                        {vlanPurpose}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleCopyIp(entry.ipAddress)}
                          className="flex items-center gap-1.5 text-emerald-400 font-bold hover:underline cursor-pointer group"
                          title="Click to copy IP"
                        >
                          <span>{entry.ipAddress}</span>
                          {copiedIp === entry.ipAddress ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 text-slate-400 transition" />
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {entry.subnetMask} <span className="text-slate-500 text-[10px]">/{entry.prefix}</span>
                      </td>
                      <td className="py-3 px-4 text-emerald-300/90 font-mono text-[11px]">
                        {entry.usableRange || '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {entry.defaultGateway}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No addressing entries found matching "{searchQuery}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
