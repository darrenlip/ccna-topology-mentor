# CCNA Topology Mentor & Cisco IOS Automation Engine

Interactive CCNA Network Architect and Cisco IOS Automation Engine that guides junior network engineers step-by-step through simple-to-intermediate network topologies—covering physical cabling, multi-block VLSM subnetting, annotated Cisco IOS CLI configurations, interactive topology visualization, Path Tracer, live CLI simulation, and a formative CCNA Configuration Dojo & Skill Arena.

## Key Features

- **5-Stage Architecture Pipeline**:
  1. **Stage 1 — Topology Analysis & Connection Map**: Extracts routers, switches, endpoints, physical ports, and link types from uploaded topology diagrams (images/PDF) or text scenarios.
  2. **Stage 2 — VLSM Addressing Table & Multi-Block Mapping**: Deterministic bitwise subnetting and multi-block CIDR allocation (`;` separated blocks) with usable host ranges, masks, and wildcard masks.
  3. **Stage 3 — Annotated Cisco IOS Configurations**: Hardened, Packet Tracer–ready Cisco IOS CLI blocks for routers and switches with section filters and syntax highlighting.
  4. **Stage 4 — Design Rationale**: Architectural justification for subnet sizing, routing selection (Directly Connected, Static/Default, or Single-Area OSPFv2), and security baselines.
  5. **Stage 5 — Verification Labs**: Layer 2/Layer 3 `show` commands, ping test matrices, and step-by-step verification checklists.
- **Interactive Topology Visualizer & Path Tracer**: Visual topology graph with hop-by-hop Path Tracer based on generated routing tables.
- **Live Cisco IOS CLI Simulator & Network Auditor**: Interactive CLI simulator and automated configuration audit checks.
- **CCNA Configuration Dojo & Skill Arena**: Formative practice missions, adaptive recommendations, achievement tracking, shuffled multiple-choice & CLI drills, pedagogical brief, and local Learning Evidence & Reflection export (`.md` / `.json`).

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, D3, Framer Motion
- **Backend**: Node.js, Express (`server.ts`), `@google/genai` (with deterministic fallback synthesis when remote AI endpoints are unavailable)

## Prerequisites

- **Node.js** 20+ (or **Bun**)
- A **Gemini API Key** (optional for deterministic fallback mode, required for AI vision/diagram analysis via `/api/analyze-topology`)

## Getting Started (Local Development)

1. **Clone the repository**
   ```bash
   git clone <your-github-repo-url>
   cd <repo-folder>
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   Copy `.env.example` to `.env` and add your Gemini API key:
   ```bash
   cp .env.example .env
   ```
   Edit `.env`:
   ```env
   GEMINI_API_KEY="your_gemini_api_key_here"
   APP_URL="http://localhost:3000"
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```
   The app and API server will start on `http://localhost:3000`.

## Build & Production

```bash
# Type check
npm run lint

# Build client bundle into dist/
npm run build

# Start production server (serves dist/ and /api/* routes)
NODE_ENV=production npm start
```

## Project Structure

```text
├── .env.example              # Environment variable template (no secrets)
├── .gitignore                # Git ignore rules for node_modules, dist, .env*
├── index.html                # Vite HTML entry point
├── metadata.json             # App metadata and capability declarations
├── package.json              # Scripts and dependencies
├── server.ts                 # Express server, Gemini API proxy & Vite dev middleware
├── tsconfig.json             # TypeScript configuration
├── vite.config.ts            # Vite + Tailwind v4 configuration
└── src/
    ├── App.tsx               # Main application shell and 5-stage workbench
    ├── index.css             # Global Tailwind CSS styles
    ├── main.tsx              # React DOM entry point
    ├── components/           # UI views, visualizer, Path Tracer, CLI & Skill Arena
    ├── data/                 # Sample CCNA topologies
    ├── hooks/                # Custom React hooks
    ├── types/                # TypeScript domain interfaces
    └── utils/                # VLSM calculator, CLI simulator, auditor & arena logic
```

## Lab Safety & Responsible Use

All generated Cisco IOS configurations and credentials (`LAB_SECRET_REPLACE_ME`, `LAB_ADMIN_PASSWORD_REPLACE_ME`) are intended strictly for educational lab simulation (Cisco Packet Tracer, GNS3, EVE-NG) and staging validation—never deploy lab placeholder credentials directly to production infrastructure.
