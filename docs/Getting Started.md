# Getting Started

<cite>
**Referenced Files in This Document**   
- [package.json](file://package.json)
- [README.md](file://README.md)
- [Cargo.toml](file://src-tauri/Cargo.toml)
- [tauri.conf.json](file://src-tauri/tauri.conf.json)
- [vite.config.js](file://vite.config.js)
- [svelte.config.js](file://svelte.config.js)
- [app.html](file://src/app.html)
- [workspaceStore.ts](file://src/lib/stores/workspaceStore.ts)
- [fileService.ts](file://src/lib/services/fileService.ts)
- [implementation-plan.md](file://doc/implementation-plan.md)
- [frontend-guidelines.md](file://doc/frontend-guidelines.md)
- [plan.md](file://plan.md)
</cite>

## Table of Contents

1. [Introduction](#introduction)
2. [Prerequisites](#prerequisites)
3. [Repository Setup](#repository-setup)
4. [Development Environment Configuration](#development-environment-configuration)
5. [Running the Application](#running-the-application)
6. [Building Production Binaries](#building-production-binaries)
7. [Troubleshooting Common Issues](#troubleshooting-common-issues)
8. [Project Structure Overview](#project-structure-overview)
9. [Basic Usage Guide](#basic-usage-guide)
10. [Platform-Specific Considerations](#platform-specific-considerations)

## Introduction

Nova Code is a modern, lightweight, and high-performance code editor built using cutting-edge web technologies and the Rust ecosystem. The application combines the flexibility of web interfaces with the performance of native applications through Tauri v2, providing a cross-platform desktop experience with minimal resource consumption.

The editor core is powered by Monaco Editor—the same engine used in Visual Studio Code—ensuring robust syntax highlighting, code completion, and editing capabilities. The user interface is built with Svelte 5 for reactivity and speed, styled with Tailwind CSS v4, and bundled with Vite for fast development tooling.

This guide provides comprehensive instructions for setting up the development environment, configuring the project, and getting started with both end-user and developer workflows.

**Section sources**

- [README.md](file://README.md#L1-L66)
- [package.json](file://package.json#L1-L41)

## Prerequisites

Before setting up the NC code editor development environment, ensure you have the following prerequisites installed on your system:

### Node.js

Node.js is required for managing JavaScript dependencies and running the build tools. Install the LTS (Long Term Support) version from [nodejs.org](https://nodejs.org/). Verify installation with:

```bash
node --version
npm --version
```

### Rust and Cargo

Rust is essential for compiling the native Tauri backend. Install Rust and Cargo using [rustup](https://www.rust-lang.org/tools/install), the official Rust installer. After installation, verify with:

```bash
rustc --version
cargo --version
```

### Build Tools

Platform-specific build tools are required for compiling native code:

- **Windows**: Install Visual Studio Build Tools or Visual Studio Community with C++ build tools
- **macOS**: Install Xcode Command Line Tools: `xcode-select --install`
- **Linux**: Install build essentials:
  - Debian/Ubuntu: `sudo apt install build-essential`
  - Fedora: `sudo dnf groupinstall "Development Tools"`
  - Arch: `sudo pacman -S base-devel`

### Tauri CLI

Install the Tauri CLI globally using npm:

```bash
npm install -g @tauri-apps/cli
```

Verify installation:

```bash
tauri --version
```

**Section sources**

- [README.md](file://README.md#L22-L29)
- [package.json](file://package.json#L27)

## Repository Setup

To begin development, clone the repository and install dependencies using pnpm (preferred) or npm.

### Cloning the Repository

```bash
git clone https://github.com/your-username/nova-code.git
cd nova-code
```

### Installing Dependencies

The project supports both pnpm and npm. Using pnpm is recommended for better dependency management.

With pnpm:

```bash
pnpm install
```

With npm:

```bash
npm install
```

This installs all required dependencies listed in `package.json`, including:

- Svelte 5 framework
- Vite development server
- Tauri CLI and plugins
- Monaco Editor and themes
- UI component libraries (bits-ui, lucide-svelte)
- Tailwind CSS and utilities

The installation also pulls in Rust dependencies defined in `Cargo.toml` for the Tauri backend.

**Section sources**

- [README.md](file://README.md#L32-L42)
- [package.json](file://package.json#L15-L39)
- [Cargo.toml](file://src-tauri/Cargo.toml#L1-L33)

## Development Environment Configuration

The development environment is configured through several key files that define build settings, framework configurations, and application behavior.

### Vite Configuration

The `vite.config.js` file configures the Vite development server with Tauri-specific settings:

- Development server runs on port 1420
- HMR (Hot Module Replacement) enabled for fast updates
- File watching ignores the `src-tauri` directory to prevent unnecessary rebuilds
- Integrates SvelteKit and Tailwind CSS plugins

```javascript
// vite.config.js
export default defineConfig(async () => ({
  plugins: [tailwindcss(), sveltekit()],
  server: {
    port: 1420,
    strictPort: true,
    hmr: host ? { protocol: 'ws', host, port: 1421 } : undefined,
    watch: { ignored: ['**/src-tauri/**'] },
  },
}));
```

### SvelteKit Configuration

The `svelte.config.js` file configures SvelteKit for static site generation with SPA fallback, which is required for Tauri applications that don't have a Node.js server:

```javascript
// svelte.config.js
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({ fallback: 'index.html' }),
  },
};
```

### Tauri Configuration

The `tauri.conf.json` file defines application settings:

- Window dimensions (1280×720) with transparent, borderless design
- Development URL pointing to Vite server
- Build commands for dev and production
- Asset protocol configuration for secure file access
- Application icons for different platforms

```json
// tauri.conf.json
{
  "build": {
    "beforeDevCommand": "npm run dev",
    "devUrl": "http://localhost:1420",
    "beforeBuildCommand": "npm run build",
    "frontendDist": "../build"
  },
  "app": {
    "windows": [
      {
        "width": 1280,
        "height": 720,
        "resizable": true,
        "decorations": false,
        "transparent": true
      }
    ]
  }
}
```

**Section sources**

- [vite.config.js](file://vite.config.js#L1-L34)
- [svelte.config.js](file://svelte.config.js#L1-L19)
- [tauri.conf.json](file://src-tauri/tauri.conf.json#L1-L44)

## Running the Application

### Development Mode

To run the application in development mode with hot reloading:

```bash
npm run tauri dev
```

This command:

1. Starts the Vite development server
2. Launches the Tauri application window
3. Enables live reloading for frontend changes
4. Connects to the development URL (http://localhost:1420)

The application window will open with the editor interface, allowing you to immediately begin testing features.

### Alternative Development Commands

The `package.json` defines additional scripts for different development scenarios:

```json
"scripts": {
  "dev": "vite dev",
  "build": "vite build",
  "preview": "vite preview",
  "check": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json",
  "tauri": "tauri"
}
```

For TypeScript checking during development:

```bash
npm run check:watch
```

**Section sources**

- [README.md](file://README.md#L44-L52)
- [package.json](file://package.json#L6-L13)

## Building Production Binaries

To create optimized production binaries for distribution:

```bash
npm run tauri build
```

This command:

1. Runs `npm run build` to create a production build of the frontend
2. Compiles the Rust backend with optimizations
3. Bundles the application with all dependencies
4. Creates platform-specific installers

The built binaries are located in:

```
src-tauri/target/release/bundle/
```

Output formats vary by platform:

- **Windows**: `.msi` and `.exe` installers
- **macOS**: `.dmg` and `.pkg` installers
- **Linux**: `.AppImage`, `.deb`, and `.rpm` packages

The build process automatically handles code minification, tree-shaking, and asset optimization to produce a compact binary.

**Section sources**

- [README.md](file://README.md#L53-L61)
- [tauri.conf.json](file://src-tauri/tauri.conf.json#L6-L11)

## Troubleshooting Common Issues

### Node.js and npm Issues

**Problem**: Dependency installation fails with EACCES errors  
**Solution**: Fix npm permissions or use a Node version manager like nvm

**Problem**: `npm run tauri dev` fails with port conflicts  
**Solution**: Change the port in `vite.config.js` or terminate processes using port 1420

### Rust and Tauri Issues

**Problem**: Cargo build fails with missing dependencies  
**Solution**: Run `cargo clean` and rebuild, or update Rust with `rustup update`

**Problem**: Tauri CLI not found after installation  
**Solution**: Ensure global npm packages are in your PATH, or install with pnpm/yarn

### Platform-Specific Issues

**Windows**: Missing Visual Studio Build Tools  
**Solution**: Install "Desktop development with C++" workload in Visual Studio

**macOS**: Xcode command line tools not installed  
**Solution**: Run `xcode-select --install`

**Linux**: Missing webkit2gtk dependencies  
**Solution**: Install `webkit2gtk-4.1-dev` (Ubuntu/Debian) or equivalent

### Common Error Messages

- `"Cannot find module"`: Run `npm install` or `pnpm install`
- `"Port 1420 is already in use"`: Kill the process or change the port
- `"Failed to spawn Tauri process"`: Check Rust installation and run `cargo build`

**Section sources**

- [README.md](file://README.md#L26-L28)
- [Cargo.toml](file://src-tauri/Cargo.toml#L18-L33)

## Project Structure Overview

Understanding the project structure is essential for new contributors. The repository follows a organized directory layout:

```
├── src/                    # Frontend source code
│   ├── lib/                # Shared libraries and utilities
│   │   ├── components/     # UI components
│   │   ├── editor/         # Monaco editor integration
│   │   ├── services/       # Tauri API wrappers
│   │   ├── stores/         # Svelte stores for state management
│   │   └── utils/          # Helper functions
│   └── routes/             # SvelteKit page routes
├── src-tauri/             # Rust backend and Tauri configuration
│   ├── src/               # Rust source code
│   ├── build.rs           # Build script
│   └── tauri.conf.json    # Tauri configuration
├── static/                # Static assets
├── scripts/               # Utility scripts
└── doc/                   # Documentation files
```

Key files and their purposes:

- `package.json`: Frontend dependencies and scripts
- `Cargo.toml`: Rust dependencies and package metadata
- `vite.config.js`: Development server configuration
- `svelte.config.js`: SvelteKit adapter settings
- `tauri.conf.json`: Application window and build settings

The frontend uses Svelte stores for state management, with key stores located in `src/lib/stores/`:

- `workspaceStore.ts`: Manages workspace files and directory structure
- `editorStore.ts`: Handles editor state and open files
- `settingsStore.ts`: Stores user preferences and themes

**Section sources**

- [project_structure](file://#L1-L100)
- [workspaceStore.ts](file://src/lib/stores/workspaceStore.ts#L1-L130)
- [fileService.ts](file://src/lib/services/fileService.ts#L1-L85)

## Basic Usage Guide

### Opening Files and Directories

To open a file or directory in Nova Code:

1. Launch the application
2. Use **Ctrl+O** (or **Cmd+O** on macOS) to open the file dialog
3. Select a file or folder to open
4. The file will appear in the editor with syntax highlighting

Alternatively, use the **File** menu or drag and drop files into the editor window.

### Navigating the Interface

The editor interface consists of:

- **Sidebar**: File explorer showing workspace structure
- **Editor Area**: Main code editing space with tabs
- **Status Bar**: Information about current file, position, and settings
- **Command Palette**: Access commands with **Ctrl+Shift+P**

Use **Ctrl+P** to quickly open files by name, and **Ctrl+G** to go to a specific line number.

### Performing Edits

The editor supports standard text editing operations:

- Syntax highlighting for multiple languages (JS, TS, Python, Rust, etc.)
- Line numbers, code folding, and bracket matching
- Auto-closing brackets and quotes
- Basic code completion (without LSP)

Changes are tracked with dirty markers on tabs, and files are saved with **Ctrl+S**.

### Key Features

- **File Tree**: Create, delete, rename files with right-click context menu
- **Search**: Find in file (**Ctrl+F**), replace (**Ctrl+H**), project search (**Ctrl+Shift+F**)
- **Command Palette**: Execute commands like theme switching, settings, and navigation
- **Terminal**: Toggle integrated terminal with **Ctrl+`**

**Section sources**

- [frontend-guidelines.md](file://doc/frontend-guidelines.md#L1-L107)
- [implementation-plan.md](file://doc/implementation-plan.md#L1-L41)
- [app.html](file://src/app.html#L1-L49)

## Platform-Specific Considerations

### Windows

- Ensure Visual Studio Build Tools are installed
- Antivirus software may interfere with development server
- Use PowerShell or Command Prompt as administrator if needed
- Window transparency requires Windows 10 or later

### macOS

- Requires macOS 10.15 (Catalina) or later
- Gatekeeper may block unsigned applications
- Use `xattr -d com.apple.quarantine /path/to/app` to remove quarantine attribute
- Command key mappings follow standard macOS conventions

### Linux

- Requires webkit2gtk development packages
- Wayland support may require additional configuration
- Desktop file integration for application menu
- Font rendering may vary by distribution

All platforms support the same core functionality, with Tauri handling platform-specific integrations through its API. The application is designed to provide a consistent user experience across operating systems while respecting platform conventions.

**Section sources**

- [README.md](file://README.md#L28)
- [tauri.conf.json](file://src-tauri/tauri.conf.json#L14-L21)
- [implementation-plan.md](file://doc/implementation-plan.md#L37-L40)
