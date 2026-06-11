# Sudoku Solver

A web-based Sudoku solver with a modern dark-mode UI. Generate puzzles, solve them interactively, or enter your own.

## Features

- **Solve** — Enter any valid Sudoku puzzle and solve it with one click
- **Generate** — Random puzzle with configurable difficulty (Easy / Medium / Hard)
- **Solve Animation** — Watch the solution fill in cell by cell
- **Pencil Notes** — Toggle notes mode and annotate candidates per cell
- **Undo / Redo** — Full move history with keyboard shortcuts
- **Keyboard Navigation** — Arrow/WASD keys, auto-advance on input
- **Digit Filter** — Click a digit in the sidebar to highlight all its placements
- **Conflict Detection** — Real-time rule violation highlighting
- **Timer & Pause** — Built-in stopwatch with pause overlay
- **Dark / Light Theme** — System-aware toggle with persistent preference

## Quick Start

### Option 1: Docker (recommended)

```bash
git clone https://github.com/Leo-Expose/Sudoku-Solver.git
cd Sudoku-Solver
docker compose up --build
```

Open [http://localhost:5000](http://localhost:5000).

### Option 2: Manual setup

```bash
git clone https://github.com/Leo-Expose/Sudoku-Solver.git
cd Sudoku-Solver

python -m venv venv
source venv/bin/activate      # Linux/macOS
venv\Scripts\activate         # Windows

pip install -r requirements.txt
flask run
```

Open [http://127.0.0.1:5000](http://127.0.0.1:5000).

## Tech Stack

- **Backend:** Python, Flask, Gunicorn
- **Frontend:** Vanilla JS, CSS Grid
- **Infrastructure:** Docker, Docker Compose
- **Solver:** Backtracking algorithm (DFS with constraint propagation)
- **Generator:** Backtracking fill + uniqueness check per removal
