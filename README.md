# REST Client

A Postman-like desktop REST client built with Electron, React, and TypeScript.

## Prerequisites

- Node.js 18+ (required for built-in fetch)
- npm

## Installation

```bash
npm install
```

## Development

Run the app in development mode:

```bash
# Terminal 1: Start Vite dev server + TypeScript watch
npm run dev

# Terminal 2: Start Electron (after Terminal 1 shows "ready")
npm start
```

Or run each part separately:

```bash
# Terminal 1: Start the Vite dev server (React UI)
npm run dev:renderer

# Terminal 2: Compile TypeScript for Electron main process
npm run dev:main

# Terminal 3: Start Electron (after the above are running)
npm start
```

## Build for Production

```bash
# Build both renderer and main process
npm run build

# Package as distributable (creates installer in /release)
npm run dist
```

## Project Structure

```
src/
├── core/           # Reusable library (no Electron dependencies)
│   ├── types.ts    # TypeScript interfaces
│   ├── http-client.ts
│   ├── auth-handler.ts
│   └── ...
├── main/           # Electron main process
│   ├── index.ts    # Window creation
│   └── preload.ts  # IPC bridge
└── renderer/       # React UI
    ├── App.tsx
    └── components/
```

## Current Status

See the plan file for implementation progress.
