import React, { useMemo, useState } from 'react';
import { Copy, Check, Search, Palette, Terminal, HelpCircle } from 'lucide-react';
import { formatCiscoCliScript } from '../utils/ciscoCliSimulator';

interface CiscoSyntaxHighlighterProps {
  code: string;
  maxHeight?: string;
  showLineNumbers?: boolean;
  searchable?: boolean;
  theme?: SyntaxTheme;
  onThemeChange?: (theme: SyntaxTheme) => void;
}

export type SyntaxTheme =
  | 'cisco-dark'
  | 'cisco-blue'
  | 'cisco-light'
  | 'cisco-amber'
  | 'cisco-emerald'
  | 'cisco-cyber';

interface Token {
  type:
    | 'comment'
    | 'keyword'
    | 'subcommand'
    | 'negation'
    | 'interface'
    | 'ip'
    | 'mask'
    | 'vlan'
    | 'number'
    | 'security'
    | 'banner'
    | 'punctuation'
    | 'text';
  value: string;
}

// Inline CCNA explanation database for Junior Network Engineers
export function getJuniorCliAnnotation(line: string): string | null {
  const t = line.trim().toLowerCase();
  if (!t || t.startsWith('!')) return null;
  if (t.startsWith('enable secret')) return 'Hashes privileged EXEC password using MD5/scrypt (Type 5/8/9)';
  if (t === 'service password-encryption') return 'Applies Type 7 obfuscation to all plaintext passwords in running-config';
  if (t.startsWith('no ip domain-lookup')) return 'Prevents mistyped CLI commands from triggering slow DNS broadcast lookups';
  if (t.startsWith('ip domain-name')) return 'Sets FQDN suffix required before generating RSA keypairs for SSHv2';
  if (t.startsWith('crypto key generate rsa')) return 'Generates 2048-bit RSA asymmetric keys to enable SSHv2 daemon';
  if (t.startsWith('ip ssh version 2')) return 'Enforces SSHv2 only, disabling vulnerable legacy SSHv1 protocol';
  if (t.startsWith('username ') && t.includes('privilege 15')) return 'Creates local admin account with full Level 15 root privileges';
  if (t.startsWith('line con 0')) return 'Enters physical RS-232/USB Console port configuration mode';
  if (t.startsWith('line vty')) return 'Enters Virtual Teletype (remote SSH/Telnet) session lines';
  if (t === 'transport input ssh') return 'Blocks unencrypted Telnet; permits only encrypted SSHv2 sessions';
  if (t === 'login local') return 'Authenticates session against local username/secret database';
  if (t === 'logging synchronous') return 'Prevents syslog console messages from interrupting typed CLI input';
  if (t.startsWith('exec-timeout ')) return 'Auto-disconnects idle administrative sessions to prevent walk-up hijacking';
  if (t.startsWith('banner motd')) return 'Legal warning banner displayed prior to authentication';
  if (t.startsWith('encapsulation dot1q')) {
    return t.includes('native')
      ? 'Tags subinterface with 802.1Q VLAN ID and marks untagged Native VLAN frames'
      : 'Binds router subinterface to 802.1Q VLAN tag for Router-on-a-Stick inter-VLAN routing';
  }
  if (t === 'switchport mode trunk') return 'Forces permanent 802.1Q trunking on uplink port';
  if (t.startsWith('switchport trunk native vlan')) return 'Moves untagged trunk traffic off default VLAN 1 to mitigate VLAN hopping';
  if (t.startsWith('switchport trunk allowed vlan')) return 'Prunes unnecessary VLAN broadcast traffic from traversing trunk';
  if (t === 'switchport nonegotiate') return 'Disables DTP frame negotiation to prevent dynamic trunk spoofing';
  if (t === 'switchport mode access') return 'Hardcodes port as single-VLAN host access port (disables trunking)';
  if (t.startsWith('switchport access vlan')) return 'Assigns access port to target department or quarantine parking VLAN';
  if (t.startsWith('spanning-tree portfast')) return 'Bypasses STP Listening/Learning delays (30s) for immediate host DHCP';
  if (t.startsWith('spanning-tree bpduguard enable')) return 'Err-disables port immediately if rogue switch/bridge sends STP BPDUs';
  if (t.startsWith('router ospf ')) return 'Initializes OSPFv2 link-state routing process';
  if (t.startsWith('router-id ')) return 'Hardcodes deterministic 32-bit OSPF Router ID for DR/BDR election stability';
  if (t.startsWith('passive-interface ')) return 'Suppresses OSPF Hello packets on LAN interface while still advertising subnet';
  if (t.startsWith('network ') && t.includes('area')) return 'Matches interfaces via wildcard mask to participate in OSPF area';
  if (t.startsWith('ip route 0.0.0.0 0.0.0.0')) return 'Configures Gateway of Last Resort (default static route)';
  if (t.startsWith('ip route ')) return 'Defines static route to remote destination network via next-hop IP';
  if (t === 'ip routing') return 'Enables Layer 3 hardware packet forwarding between SVIs on multilayer switch';
  if (t === 'no shutdown') return 'Administratively enables physical or virtual interface (brings Layer 1 up)';
  if (t === 'shutdown') return 'Administratively disables unused port to prevent unauthorized physical access';
  if (t === 'write memory' || t.startsWith('copy running-config')) return 'Saves active running-config in RAM to non-volatile NVRAM';
  return null;
}

// Compute Cisco IOS CLI prompt hierarchy state machine for every line
export function computeIosPrompts(lines: string[]): string[] {
  let hostname = 'Device';
  let mode = '(config)#';

  return lines.map((rawLine) => {
    const t = rawLine.trim();
    const lower = t.toLowerCase();

    if (!t || t.startsWith('!')) {
      return `${hostname}${mode}`;
    }

    const hostMatch = t.match(/^hostname\s+(\S+)/i);
    if (hostMatch) {
      const currentPrompt = `${hostname}(config)#`;
      hostname = hostMatch[1];
      mode = '(config)#';
      return currentPrompt;
    }

    if (lower === 'enable') {
      mode = '#';
      return `${hostname}>`;
    }
    if (lower === 'configure terminal' || lower === 'conf t') {
      const prev = `${hostname}#`;
      mode = '(config)#';
      return prev;
    }
    if (lower === 'end') {
      const prev = `${hostname}${mode}`;
      mode = '#';
      return prev;
    }
    if (lower === 'write memory' || lower.startsWith('copy running-config') || lower.startsWith('show ')) {
      mode = '#';
      return `${hostname}#`;
    }
    if (lower === 'exit') {
      const prev = `${hostname}${mode}`;
      mode = '(config)#';
      return prev;
    }
    if (lower.startsWith('interface ')) {
      const prev = `${hostname}(config)#`;
      mode = lower.includes('.') ? '(config-subif)#' : lower.includes('range') ? '(config-if-range)#' : '(config-if)#';
      return prev;
    }
    if (lower.startsWith('line ')) {
      const prev = `${hostname}(config)#`;
      mode = '(config-line)#';
      return prev;
    }
    if (lower.startsWith('router ')) {
      const prev = `${hostname}(config)#`;
      mode = '(config-router)#';
      return prev;
    }
    if (/^vlan\s+\d+/i.test(t)) {
      const prev = `${hostname}(config)#`;
      mode = '(config-vlan)#';
      return prev;
    }
    if (
      lower.startsWith('ip route ') ||
      lower.startsWith('ip domain-name') ||
      lower.startsWith('crypto key') ||
      lower.startsWith('username ') ||
      lower.startsWith('enable secret') ||
      lower.startsWith('service ') ||
      lower.startsWith('banner ') ||
      lower.startsWith('ip ssh ') ||
      lower.startsWith('spanning-tree mode')
    ) {
      mode = '(config)#';
      return `${hostname}(config)#`;
    }

    return `${hostname}${mode}`;
  });
}

// Tokenizer for Cisco IOS CLI scripts
export function tokenizeCiscoLine(line: string): Token[] {
  const trimmed = line.trim();

  if (trimmed.startsWith('!')) {
    return [{ type: 'comment', value: line }];
  }

  if (line.includes('banner motd') || line.includes('***') || line.startsWith('*')) {
    return [{ type: 'banner', value: line }];
  }

  const tokens: Token[] = [];
  let remaining = line;

  while (remaining.length > 0) {
    const whitespaceMatch = remaining.match(/^(\s+)/);
    if (whitespaceMatch) {
      tokens.push({ type: 'text', value: whitespaceMatch[1] });
      remaining = remaining.slice(whitespaceMatch[1].length);
      continue;
    }

    if (remaining.startsWith('!')) {
      tokens.push({ type: 'comment', value: remaining });
      break;
    }

    const ipMatch = remaining.match(/^((?:\d{1,3}\.){3}\d{1,3})\b/);
    if (ipMatch) {
      const ip = ipMatch[1];
      const isSubnetMask =
        ip.startsWith('255.') || ip === '0.0.0.0' || ip.startsWith('0.0.0.');
      tokens.push({ type: isSubnetMask ? 'mask' : 'ip', value: ip });
      remaining = remaining.slice(ip.length);
      continue;
    }

    const intMatch = remaining.match(
      /^(?:(?:GigabitEthernet|FastEthernet|TenGigabitEthernet|Ethernet|Serial|Loopback|Vlan|Gi|Fa|Te|Se|Lo)\s*[\d\/\.\-]+(?:\s*-\s*[\d\/\.\-]+)?)\b/i
    );
    if (intMatch) {
      tokens.push({ type: 'interface', value: intMatch[0] });
      remaining = remaining.slice(intMatch[0].length);
      continue;
    }

    const noMatch = remaining.match(/^(no)\s+/i);
    if (noMatch) {
      tokens.push({ type: 'negation', value: 'no' });
      tokens.push({ type: 'text', value: ' ' });
      remaining = remaining.slice(noMatch[0].length);
      continue;
    }

    const topKeyMatch = remaining.match(
      /^(hostname|enable secret|service password-encryption|ip domain-name|crypto key generate rsa|line console|line con|line vty|interface range|interface|router ospf|ip route|vlan|copy running-config startup-config|write memory|ip default-gateway)\b/i
    );
    if (topKeyMatch) {
      tokens.push({ type: 'keyword', value: topKeyMatch[0] });
      remaining = remaining.slice(topKeyMatch[0].length);
      continue;
    }

    const subMatch = remaining.match(
      /^(switchport mode trunk|switchport mode access|switchport access vlan|switchport trunk native vlan|switchport trunk allowed vlan|switchport nonegotiate|encapsulation dot1Q|spanning-tree portfast default|spanning-tree portfast|spanning-tree bpduguard enable|spanning-tree bpduguard default|passive-interface|network|router-id|ip address|ip ssh version|ip ssh time-out|ip ssh authentication-retries|transport input ssh|login local|login|logging synchronous|exec-timeout|privilege|secret|password|modulus|description|area|shutdown|name|exit|end)\b/i
    );
    if (subMatch) {
      tokens.push({ type: 'subcommand', value: subMatch[0] });
      remaining = remaining.slice(subMatch[0].length);
      continue;
    }

    const secMatch = remaining.match(/^(privilege|secret|password|ssh|dot1q|bpduguard|portfast)\b/i);
    if (secMatch) {
      tokens.push({ type: 'security', value: secMatch[0] });
      remaining = remaining.slice(secMatch[0].length);
      continue;
    }

    const numMatch = remaining.match(/^(\d+)\b/);
    if (numMatch) {
      tokens.push({ type: 'number', value: numMatch[1] });
      remaining = remaining.slice(numMatch[1].length);
      continue;
    }

    const bannerDelim = remaining.match(/^(#.*#|#)/);
    if (bannerDelim) {
      tokens.push({ type: 'banner', value: bannerDelim[0] });
      remaining = remaining.slice(bannerDelim[0].length);
      continue;
    }

    const wordMatch = remaining.match(/^([^\s!#,]+)/);
    if (wordMatch) {
      tokens.push({ type: 'text', value: wordMatch[1] });
      remaining = remaining.slice(wordMatch[1].length);
    } else {
      tokens.push({ type: 'text', value: remaining[0] });
      remaining = remaining.slice(1);
    }
  }

  return tokens;
}

export const CiscoSyntaxHighlighter: React.FC<CiscoSyntaxHighlighterProps> = ({
  code,
  maxHeight = '520px',
  showLineNumbers = true,
  searchable = true,
  theme: themeProp,
  onThemeChange,
}) => {
  const [internalTheme, setInternalTheme] = useState<SyntaxTheme>('cisco-dark');
  const theme = themeProp !== undefined ? themeProp : internalTheme;

  const handleThemeChange = (newTheme: SyntaxTheme) => {
    setInternalTheme(newTheme);
    if (onThemeChange) {
      onThemeChange(newTheme);
    }
  };

  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedLine, setCopiedLine] = useState<number | null>(null);
  const [showIosPrompts, setShowIosPrompts] = useState(false);
  const [showAnnotations, setShowAnnotations] = useState(true);

  const normalizedCode = useMemo(() => formatCiscoCliScript(code), [code]);
  const lines = useMemo(() => normalizedCode.split('\n'), [normalizedCode]);
  const iosPrompts = useMemo(() => computeIosPrompts(lines), [lines]);

  const handleCopyAll = () => {
    navigator.clipboard.writeText(normalizedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopySingleLine = (lineText: string, lineIndex: number) => {
    navigator.clipboard.writeText(lineText);
    setCopiedLine(lineIndex);
    setTimeout(() => setCopiedLine(null), 1500);
  };

  const getThemeClasses = (type: Token['type']) => {
    switch (theme) {
      case 'cisco-blue':
        switch (type) {
          case 'comment':
            return 'text-blue-300/50 italic font-mono';
          case 'keyword':
            return 'text-cyan-300 font-bold';
          case 'subcommand':
            return 'text-sky-200 font-semibold';
          case 'negation':
            return 'text-amber-300 font-bold';
          case 'interface':
            return 'text-yellow-300 font-bold';
          case 'ip':
            return 'text-emerald-300 font-bold underline decoration-emerald-400/40';
          case 'mask':
            return 'text-teal-300 font-mono';
          case 'number':
            return 'text-amber-300 font-semibold';
          case 'security':
            return 'text-indigo-200 font-semibold';
          case 'banner':
            return 'text-yellow-300 font-bold';
          default:
            return 'text-cyan-100';
        }

      case 'cisco-light':
        switch (type) {
          case 'comment':
            return 'text-slate-500 italic font-mono';
          case 'keyword':
            return 'text-blue-700 font-bold';
          case 'subcommand':
            return 'text-teal-700 font-semibold';
          case 'negation':
            return 'text-red-600 font-bold';
          case 'interface':
            return 'text-indigo-700 font-bold';
          case 'ip':
            return 'text-emerald-700 font-bold underline decoration-emerald-600/40';
          case 'mask':
            return 'text-cyan-700 font-mono';
          case 'number':
            return 'text-amber-700 font-semibold';
          case 'security':
            return 'text-purple-700 font-semibold';
          case 'banner':
            return 'text-amber-800 font-bold';
          default:
            return 'text-slate-900';
        }

      case 'cisco-amber':
        switch (type) {
          case 'comment':
            return 'text-amber-700/80 italic font-mono';
          case 'keyword':
            return 'text-amber-300 font-bold';
          case 'subcommand':
            return 'text-yellow-400 font-semibold';
          case 'negation':
            return 'text-red-400 font-bold';
          case 'interface':
            return 'text-orange-300 font-bold';
          case 'ip':
            return 'text-amber-200 font-bold underline decoration-amber-500/30';
          case 'mask':
            return 'text-amber-400/90 font-mono';
          case 'number':
            return 'text-orange-400 font-semibold';
          case 'security':
            return 'text-yellow-200 font-semibold';
          case 'banner':
            return 'text-amber-300 font-bold';
          default:
            return 'text-amber-100';
        }

      case 'cisco-emerald':
        switch (type) {
          case 'comment':
            return 'text-emerald-700/80 italic font-mono';
          case 'keyword':
            return 'text-emerald-300 font-bold';
          case 'subcommand':
            return 'text-teal-300 font-semibold';
          case 'negation':
            return 'text-rose-400 font-bold';
          case 'interface':
            return 'text-cyan-300 font-bold';
          case 'ip':
            return 'text-emerald-200 font-bold underline decoration-emerald-500/40';
          case 'mask':
            return 'text-teal-400/90 font-mono';
          case 'number':
            return 'text-lime-400 font-semibold';
          case 'security':
            return 'text-emerald-100 font-semibold';
          case 'banner':
            return 'text-amber-300 font-bold';
          default:
            return 'text-emerald-100';
        }

      case 'cisco-cyber':
        switch (type) {
          case 'comment':
            return 'text-slate-500 italic font-mono';
          case 'keyword':
            return 'text-fuchsia-400 font-bold';
          case 'subcommand':
            return 'text-cyan-300 font-semibold';
          case 'negation':
            return 'text-red-400 font-bold';
          case 'interface':
            return 'text-sky-300 font-bold';
          case 'ip':
            return 'text-emerald-300 font-bold underline decoration-emerald-500/40';
          case 'mask':
            return 'text-indigo-300 font-mono';
          case 'number':
            return 'text-yellow-300 font-semibold';
          case 'security':
            return 'text-violet-300 font-semibold';
          case 'banner':
            return 'text-amber-300 font-bold';
          default:
            return 'text-slate-200';
        }

      case 'cisco-dark':
      default:
        switch (type) {
          case 'comment':
            return 'text-slate-500 italic font-mono';
          case 'keyword':
            return 'text-emerald-400 font-bold';
          case 'subcommand':
            return 'text-cyan-300 font-semibold';
          case 'negation':
            return 'text-rose-400 font-bold';
          case 'interface':
            return 'text-sky-400 font-bold';
          case 'ip':
            return 'text-emerald-300 font-bold underline decoration-emerald-500/30';
          case 'mask':
            return 'text-teal-400 font-mono';
          case 'number':
            return 'text-amber-400 font-semibold';
          case 'security':
            return 'text-purple-300 font-semibold';
          case 'banner':
            return 'text-amber-300 font-bold';
          default:
            return 'text-slate-200';
        }
    }
  };

  const isLight = theme === 'cisco-light';
  const isBlue = theme === 'cisco-blue';

  const containerBg = isLight
    ? 'bg-white border-slate-300 text-slate-900'
    : isBlue
    ? 'bg-[#02132b] border-blue-900/60 text-cyan-100'
    : theme === 'cisco-amber'
    ? 'bg-[#0f0c05] border-amber-900/40'
    : theme === 'cisco-emerald'
    ? 'bg-[#040f0a] border-emerald-950'
    : theme === 'cisco-cyber'
    ? 'bg-[#080718] border-indigo-950'
    : 'bg-[#080c16] border-slate-800';

  const headerBg = isLight
    ? 'bg-slate-100 border-b border-slate-300 text-slate-800'
    : isBlue
    ? 'bg-[#010c1c] border-b border-blue-900/70 text-cyan-200'
    : 'bg-slate-950/80 border-b border-slate-800 text-slate-300';

  const searchInputBg = isLight
    ? 'bg-white border-slate-300 text-slate-800 placeholder-slate-400 focus:border-blue-500'
    : isBlue
    ? 'bg-[#031836] border-blue-800 text-cyan-100 placeholder-cyan-500 focus:border-cyan-400'
    : 'bg-slate-900 border-slate-800 text-slate-200 placeholder-slate-500 focus:border-emerald-500';

  const lineNumberColor = isLight
    ? 'text-slate-400 group-hover:text-slate-700'
    : isBlue
    ? 'text-blue-400/50 group-hover:text-cyan-300'
    : 'text-slate-600 group-hover:text-slate-400';

  const copyBtnBg = isLight
    ? 'bg-slate-200 hover:bg-slate-300 text-slate-800 border-slate-300'
    : isBlue
    ? 'bg-blue-900/60 hover:bg-blue-850 text-cyan-200 border-blue-800'
    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700';

  const footerBg = isLight
    ? 'bg-slate-50 border-t border-slate-200 text-slate-600'
    : isBlue
    ? 'bg-[#010e22] border-t border-blue-900/50 text-blue-300/70'
    : 'bg-slate-950/60 border-t border-slate-800/80 text-slate-500';

  return (
    <div className={`rounded-xl border ${containerBg} overflow-hidden transition-colors duration-200`}>
      {/* Syntax Highlighter Action Header */}
      <div className={`px-4 py-2.5 ${headerBg} flex flex-wrap items-center justify-between gap-3 text-xs font-mono`}>
        {/* Left: Junior Engineer Learning Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowAnnotations(!showAnnotations)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-[11px] transition cursor-pointer whitespace-nowrap shrink-0 ${
              showAnnotations
                ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300 font-semibold'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Show inline CCNA explanations for each Cisco IOS command"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Explain CLI: {showAnnotations ? 'On' : 'Off'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowIosPrompts(!showIosPrompts)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-[11px] transition cursor-pointer whitespace-nowrap shrink-0 ${
              showIosPrompts
                ? 'bg-cyan-950/80 border-cyan-500/50 text-cyan-300 font-semibold'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Display Cisco IOS CLI mode prompts such as Router(config-if)#"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>IOS Mode Prompts: {showIosPrompts ? 'On' : 'Off'}</span>
          </button>
        </div>

        {/* Right: Search, Theme Selector & Copy */}
        <div className="flex items-center gap-2">
          {searchable && (
            <div className="relative">
              <Search className={`w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 ${isLight ? 'text-slate-400' : 'text-slate-500'}`} />
              <input
                type="text"
                placeholder="Find command..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`pl-7 pr-2 py-1 border rounded text-[11px] focus:outline-none w-32 focus:w-44 transition-all ${searchInputBg}`}
              />
            </div>
          )}

          {/* Theme Selector Dropdown */}
          <div className={`flex items-center gap-1 border rounded p-0.5 ${
            isLight ? 'bg-white border-slate-300' : isBlue ? 'bg-[#031836] border-blue-800' : 'bg-slate-900 border-slate-800'
          }`}>
            <Palette className={`w-3 h-3 ml-1 ${isLight ? 'text-slate-600' : isBlue ? 'text-cyan-400' : 'text-slate-500'}`} />
            <select
              value={theme}
              onChange={(e) => handleThemeChange(e.target.value as SyntaxTheme)}
              className={`bg-transparent text-[10px] focus:outline-none cursor-pointer pr-1 ${
                isLight ? 'text-slate-800 font-semibold' : isBlue ? 'text-cyan-200' : 'text-slate-300'
              }`}
            >
              <option value="cisco-dark" className="bg-slate-900 text-slate-200">Dark (Default)</option>
              <option value="cisco-blue" className="bg-[#02132b] text-cyan-200">Cisco CLI Blue</option>
              <option value="cisco-light" className="bg-white text-slate-900">Light / Printable</option>
              <option value="cisco-emerald" className="bg-slate-900 text-slate-200">Matrix Green</option>
              <option value="cisco-amber" className="bg-slate-900 text-slate-200">Amber CRT</option>
              <option value="cisco-cyber" className="bg-slate-900 text-slate-200">Cyber Synth</option>
            </select>
          </div>

          {/* Copy Script */}
          <button
            onClick={handleCopyAll}
            className={`flex items-center gap-1.5 px-2.5 py-1 border rounded text-[11px] transition cursor-pointer whitespace-nowrap shrink-0 ${copyBtnBg}`}
            title="Copy clean CLI script (without mode prompts) for pasting into Packet Tracer"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied!' : 'Copy Script'}</span>
          </button>
        </div>
      </div>

      {/* Code Display Area */}
      <div
        style={{ maxHeight }}
        className={`overflow-y-auto overflow-x-auto p-4 font-mono text-xs leading-relaxed select-text tabular-nums ${
          isLight ? 'bg-white text-slate-900' : isBlue ? 'bg-[#02132b] text-cyan-100' : ''
        }`}
      >
        <pre className="m-0 table w-full">
          {lines.map((line, lineIndex) => {
            const tokens = tokenizeCiscoLine(line);
            const annotation = showAnnotations ? getJuniorCliAnnotation(line) : null;
            const matchesSearch =
              searchQuery && line.toLowerCase().includes(searchQuery.toLowerCase());

            return (
              <div
                key={lineIndex}
                className={`table-row group transition-colors ${
                  matchesSearch
                    ? isLight
                      ? 'bg-amber-100 text-amber-900'
                      : 'bg-amber-500/15'
                    : isLight
                    ? 'hover:bg-slate-100'
                    : isBlue
                    ? 'hover:bg-blue-950/60'
                    : 'hover:bg-slate-800/30'
                }`}
              >
                {/* Line Number Column with 1-click line copy */}
                {showLineNumbers && (
                  <span
                    onClick={() => handleCopySingleLine(line, lineIndex)}
                    title={`Click to copy line ${lineIndex + 1}`}
                    className={`table-cell select-none pr-3 text-right text-[10px] w-9 cursor-pointer font-mono tabular-nums ${lineNumberColor}`}
                  >
                    {copiedLine === lineIndex ? (
                      <Check className="w-3 h-3 text-emerald-500 inline" />
                    ) : (
                      lineIndex + 1
                    )}
                  </span>
                )}

                {/* Optional IOS Mode Prompt Column */}
                {showIosPrompts && (
                  <span className="table-cell select-none pr-3 text-slate-500 text-[11px] whitespace-nowrap font-mono">
                    {iosPrompts[lineIndex]}
                  </span>
                )}

                {/* Tokenized Content Column */}
                <span className="table-cell whitespace-pre pr-6">
                  {tokens.map((token, tokenIdx) => (
                    <span
                      key={tokenIdx}
                      className={getThemeClasses(token.type)}
                    >
                      {token.value}
                    </span>
                  ))}
                </span>

                {/* Inline Junior Engineer Explanation Column */}
                {showAnnotations && (
                  <span className="table-cell whitespace-nowrap text-[11px] text-slate-500 font-sans pl-4 select-none">
                    {annotation ? `— ${annotation}` : ''}
                  </span>
                )}
              </div>
            );
          })}
        </pre>
      </div>

      {/* Footer Info Strip */}
      <div className={`px-4 py-1.5 flex items-center justify-between text-[10px] font-mono tabular-nums ${footerBg}`}>
        <span>{lines.length} lines · Cisco IOS 15.x / XE syntax</span>
        <span>Click any line number to copy single command</span>
      </div>
    </div>
  );
};
