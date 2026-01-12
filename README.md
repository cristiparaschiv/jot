# Jot

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Tauri](https://img.shields.io/badge/Tauri-2.0-24C8DB?logo=tauri&logoColor=white)](https://tauri.app)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)

A simple, fast, and beautiful markdown note-taking app built with Tauri and React.

## Features

- **Markdown Editor** - Write in markdown with syntax highlighting powered by CodeMirror
- **Live Preview** - See your formatted notes in real-time with split or tab view
- **File Tree** - Organize notes in folders with drag-and-drop support
- **Daily Notes** - Quickly create daily journal entries with `Cmd+D`
- **Full-Text Search** - Search across all your notes with `Cmd+P`
- **Dark Mode** - Light, dark, and system theme options
- **Local Storage** - Your notes are stored as plain markdown files on your computer
- **Auto-Save** - Changes are automatically saved as you type
- **Keyboard Shortcuts** - Efficient editing with familiar shortcuts

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+S` | Save note |
| `Cmd+P` | Search notes |
| `Cmd+D` | Open daily note |
| `Cmd+B` | Bold text |
| `Cmd+I` | Italic text |
| `Cmd+K` | Insert link |
| `Cmd+/` | Show shortcuts |
| `Esc` | Close modal |

## Installation

### Pre-built Binaries

Download the latest release for your platform from the [Releases](https://github.com/yourusername/jot/releases) page.

### Build from Source

#### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [Rust](https://www.rust-lang.org/tools/install)
- [Tauri CLI](https://tauri.app/v1/guides/getting-started/prerequisites)

##### Linux (Fedora)

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# Install system dependencies
sudo dnf install gcc make webkit2gtk4.1-devel openssl-devel curl wget file \
  libappindicator-gtk3-devel librsvg2-devel gtk3-devel libsoup3-devel \
  javascriptcoregtk4.1-devel
```

##### Linux (Ubuntu/Debian)

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# Install system dependencies
sudo apt install build-essential libwebkit2gtk-4.1-dev libssl-dev \
  libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
```

#### Steps

```bash
# Clone the repository
git clone https://github.com/cristiparaschiv/jot.git
cd jot

# Install dependencies
npm install

# Run in development mode
npm run tauri dev

# Build for production
npm run tauri build
```

## Tech Stack

- **Framework**: [Tauri 2.0](https://tauri.app) - Rust-based desktop app framework
- **Frontend**: [React 19](https://react.dev) + [TypeScript](https://www.typescriptlang.org)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com)
- **Editor**: [CodeMirror 6](https://codemirror.net)
- **Markdown**: [react-markdown](https://github.com/remarkjs/react-markdown) + [remark-gfm](https://github.com/remarkjs/remark-gfm)
- **State**: [Zustand](https://zustand-demo.pmnd.rs)
- **Build**: [Vite](https://vitejs.dev)

## Project Structure

```
jot/
├── src/                    # React frontend
│   ├── components/         # UI components
│   ├── store/              # Zustand state management
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utility functions
│   └── context/            # React context providers
├── src-tauri/              # Tauri/Rust backend
│   ├── src/                # Rust source code
│   ├── capabilities/       # Permission configurations
│   └── icons/              # App icons
└── package.json
```

## License

MIT License - see [LICENSE](LICENSE) for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
