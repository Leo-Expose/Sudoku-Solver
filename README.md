# Sudoku Solver

A web-based Sudoku solver with a modern dark UI. Generate puzzles, solve them interactively, or enter your own.

## Features

- **Solve** - Enter any valid Sudoku puzzle and solve it with one click
- **Random Puzzle** - Generate a valid Sudoku puzzle with a unique solution
- **Solve Animation** - Watch the solution fill in cell by cell
- **Keyboard Navigation** - Arrow keys to move between cells, auto-advance on input
- **Dark Theme** - Modern purple/dark gradient design

## Quick Start

### Option 1: Run the batch file (Windows)

Double-click `run.cmd` — it will install Flask if needed and open the app in your browser.

### Option 2: Manual setup

```bash
git clone https://github.com/Leo-Expose/Sudoku-Solver.git
cd Sudoku-Solver

python -m venv venv
source venv/bin/activate   # Linux/macOS
venv\Scripts\activate      # Windows

pip install -r requirements.txt
python Solver.py
```

Then open [http://127.0.0.1:5000](http://127.0.0.1:5000) in your browser.

## Tech Stack

- **Backend:** Python, Flask
- **Frontend:** Vanilla JS, CSS Grid
- **Solver:** Backtracking algorithm
- **Generator:** Backtracking fill + uniqueness check per removal
