document.addEventListener("DOMContentLoaded", () => {
    const solveBtn = document.getElementById("solve-btn");
    const clearBtn = document.getElementById("clear-btn");
    const resetBtn = document.getElementById("reset-btn");
    const newGameBtn = document.getElementById("new-game-btn");
    const statusDiv = document.getElementById("status");
    const solveText = solveBtn.querySelector(".btn-text");
    const solveSpinner = solveBtn.querySelector(".spinner");
    const themeToggle = document.getElementById("theme-toggle");

    let currentDifficulty = "medium";
    let activeCell = null;

    // --- Theme Management ---
    function setTheme(theme) {
        document.documentElement.setAttribute("data-theme", theme);
        const meta = document.getElementById("color-meta");
        if (meta) meta.content = theme;
        localStorage.setItem("theme", theme);
    }

    themeToggle.addEventListener("click", () => {
        const currentTheme = document.documentElement.getAttribute("data-theme") || "light";
        const newTheme = currentTheme === "dark" ? "light" : "dark";
        setTheme(newTheme);
    });

    // Listen for OS theme changes if user hasn't overridden it
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
        if (!localStorage.getItem("theme")) {
            setTheme(e.matches ? "dark" : "light");
        }
    });

    // --- Difficulty Selector ---
    const diffButtons = document.querySelectorAll(".diff-btn");
    diffButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            diffButtons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            currentDifficulty = btn.dataset.diff;
        });
    });

    // --- Utility Functions ---
    function getGrid() {
        const grid = [];
        for (let r = 0; r < 9; r++) {
            const row = [];
            for (let c = 0; c < 9; c++) {
                const val = document.getElementById(`cell-${r}-${c}`).value;
                row.push(val ? parseInt(val, 10) : 0);
            }
            grid.push(row);
        }
        return grid;
    }

    function setStatus(msg, type) {
        statusDiv.textContent = msg;
        statusDiv.className = type || "";
    }

    function setLoading(loading) {
        solveBtn.disabled = loading;
        newGameBtn.disabled = loading;
        clearBtn.disabled = loading;
        resetBtn.disabled = loading;
        solveText.hidden = loading;
        solveSpinner.hidden = !loading;

        // Prevent editing during loading/solving
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const cell = document.getElementById(`cell-${r}-${c}`);
                if (!cell.classList.contains("given")) {
                    cell.readOnly = loading;
                }
            }
        }
    }

    function sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    // --- Conflict Checker (Real-time Validation) ---
    function checkConflicts() {
        // Remove error classes first
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                document.getElementById(`cell-${r}-${c}`).classList.remove("error-cell");
            }
        }

        let hasConflict = false;

        // Check rows
        for (let r = 0; r < 9; r++) {
            const map = {};
            for (let c = 0; c < 9; c++) {
                const cell = document.getElementById(`cell-${r}-${c}`);
                const val = cell.value;
                if (val) {
                    if (!map[val]) map[val] = [];
                    map[val].push(c);
                }
            }
            for (const val in map) {
                if (map[val].length > 1) {
                    hasConflict = true;
                    map[val].forEach(c => {
                        document.getElementById(`cell-${r}-${c}`).classList.add("error-cell");
                    });
                }
            }
        }

        // Check columns
        for (let c = 0; c < 9; c++) {
            const map = {};
            for (let r = 0; r < 9; r++) {
                const cell = document.getElementById(`cell-${r}-${c}`);
                const val = cell.value;
                if (val) {
                    if (!map[val]) map[val] = [];
                    map[val].push(r);
                }
            }
            for (const val in map) {
                if (map[val].length > 1) {
                    hasConflict = true;
                    map[val].forEach(r => {
                        document.getElementById(`cell-${r}-${c}`).classList.add("error-cell");
                    });
                }
            }
        }

        // Check 3x3 boxes
        for (let boxRow = 0; boxRow < 3; boxRow++) {
            for (let boxCol = 0; boxCol < 3; boxCol++) {
                const map = {};
                for (let r = boxRow * 3; r < boxRow * 3 + 3; r++) {
                    for (let c = boxCol * 3; c < boxCol * 3 + 3; c++) {
                        const cell = document.getElementById(`cell-${r}-${c}`);
                        const val = cell.value;
                        if (val) {
                            if (!map[val]) map[val] = [];
                            map[val].push({ r, c });
                        }
                    }
                }
                for (const val in map) {
                    if (map[val].length > 1) {
                        hasConflict = true;
                        map[val].forEach(coord => {
                            document.getElementById(`cell-${coord.r}-${coord.c}`).classList.add("error-cell");
                        });
                    }
                }
            }
        }

        if (hasConflict) {
            setStatus("Rule violation detected!", "error");
        } else {
            // Keep default status if no error
            const errs = document.querySelectorAll(".error-cell");
            if (errs.length === 0 && statusDiv.classList.contains("error")) {
                setStatus("Ready to solve or play!", "");
            }
        }

        return hasConflict;
    }

    // --- Cell Focus Highlighting ---
    function highlightRelatedCells(focusedCell) {
        // Clear previous highlight classes
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                document.getElementById(`cell-${r}-${c}`).classList.remove("highlight-bg");
            }
        }

        if (!focusedCell) return;

        const row = parseInt(focusedCell.dataset.row, 10);
        const col = parseInt(focusedCell.dataset.col, 10);

        const boxR = 3 * Math.floor(row / 3);
        const boxC = 3 * Math.floor(col / 3);

        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const isSameRow = (r === row);
                const isSameCol = (c === col);
                const isSameBox = (r >= boxR && r < boxR + 3 && c >= boxC && c < boxC + 3);

                if ((isSameRow || isSameCol || isSameBox) && !(r === row && c === col)) {
                    document.getElementById(`cell-${r}-${c}`).classList.add("highlight-bg");
                }
            }
        }
    }

    // Focus Tracking
    document.getElementById("grid").addEventListener("focusin", (e) => {
        if (e.target.tagName === "INPUT") {
            activeCell = e.target;
            highlightRelatedCells(activeCell);
        }
    });

    document.getElementById("grid").addEventListener("focusout", (e) => {
        // Delay clearing highlights slightly in case user clicks the keypad
        setTimeout(() => {
            if (!document.activeElement || document.activeElement.tagName !== "INPUT") {
                highlightRelatedCells(null);
            }
        }, 120);
    });

    // --- Input Navigation and Auto-Advance ---
    function advanceFocus(r, c) {
        let nextC = c + 1;
        let nextR = r;
        if (nextC > 8) {
            nextC = 0;
            nextR = r + 1;
        }
        while (nextR < 9) {
            const cell = document.getElementById(`cell-${nextR}-${nextC}`);
            if (cell && !cell.readOnly) {
                cell.focus();
                return;
            }
            nextC++;
            if (nextC > 8) {
                nextC = 0;
                nextR++;
            }
        }
    }

    // Input cleaning & checks
    document.getElementById("grid").addEventListener("input", (e) => {
        const cell = e.target;
        if (cell.tagName !== "INPUT") return;

        cell.value = cell.value.replace(/[^1-9]/g, "").slice(0, 1);
        checkConflicts();

        if (cell.value.length === 1) {
            const r = parseInt(cell.dataset.row, 10);
            const c = parseInt(cell.dataset.col, 10);
            advanceFocus(r, c);
        }
    });

    // Keyboard navigation overrides
    document.getElementById("grid").addEventListener("keydown", (e) => {
        const cell = e.target;
        if (cell.tagName !== "INPUT") return;
        const r = parseInt(cell.dataset.row, 10);
        const c = parseInt(cell.dataset.col, 10);

        let nr = r, nc = c;
        switch (e.key) {
            case "ArrowUp":    nr = Math.max(0, r - 1); break;
            case "ArrowDown":  nr = Math.min(8, r + 1); break;
            case "ArrowLeft":  nc = Math.max(0, c - 1); break;
            case "ArrowRight": nc = Math.min(8, c + 1); break;
            case "Backspace":
            case "Delete":
                if (!cell.readOnly) {
                    cell.value = "";
                    checkConflicts();
                }
                return;
            default:
                return;
        }

        e.preventDefault();
        document.getElementById(`cell-${nr}-${nc}`).focus();
    });


    // --- Action Controllers ---

    // Solve API Request
    solveBtn.addEventListener("click", async () => {
        const grid = getGrid();
        setLoading(true);
        setStatus("Solving...", "");

        try {
            const res = await fetch("/solve", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ grid }),
            });
            const data = await res.json();

            if (data.solution) {
                setStatus("Solved!", "success");
                await animateSolution(grid, data.solution);
            } else {
                setStatus(data.error || "No solution exists", "error");
            }
        } catch {
            setStatus("Network error", "error");
        } finally {
            setLoading(false);
        }
    });

    async function animateSolution(original, solution) {
        const cellsToFill = [];
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (original[r][c] === 0 && solution[r][c] !== 0) {
                    cellsToFill.push({ r, c, val: solution[r][c] });
                }
            }
        }

        for (const { r, c, val } of cellsToFill) {
            const cell = document.getElementById(`cell-${r}-${c}`);
            cell.value = val;
            cell.className = "solved";
            cell.readOnly = false;
            await sleep(15);
        }
    }

    // Reset user-entered numbers
    resetBtn.addEventListener("click", () => {
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const cell = document.getElementById(`cell-${r}-${c}`);
                if (!cell.readOnly) {
                    cell.value = "";
                    cell.className = "";
                }
            }
        }
        checkConflicts();
        setStatus("Progress reset", "");
    });

    // Clear board completely
    clearBtn.addEventListener("click", () => {
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const cell = document.getElementById(`cell-${r}-${c}`);
                cell.value = "";
                cell.className = "";
                cell.readOnly = false;
            }
        }
        checkConflicts();
        setStatus("Grid cleared", "");
    });

    // Generate New Puzzle API Request
    async function generatePuzzle() {
        setLoading(true);
        setStatus("Generating puzzle...", "");

        try {
            const res = await fetch(`/generate?difficulty=${currentDifficulty}`);
            const data = await res.json();

            if (data.puzzle) {
                // Clear grid first
                for (let r = 0; r < 9; r++) {
                    for (let c = 0; c < 9; c++) {
                        const cell = document.getElementById(`cell-${r}-${c}`);
                        cell.value = "";
                        cell.className = "";
                        cell.readOnly = false;
                    }
                }

                // Inject generated givens
                for (let r = 0; r < 9; r++) {
                    for (let c = 0; c < 9; c++) {
                        if (data.puzzle[r][c] !== 0) {
                            const cell = document.getElementById(`cell-${r}-${c}`);
                            cell.value = data.puzzle[r][c];
                            cell.className = "given";
                            cell.readOnly = true;
                        }
                    }
                }
                checkConflicts();
                setStatus(`New ${currentDifficulty} puzzle loaded. Enjoy!`, "success");
            } else {
                setStatus("Error generating puzzle", "error");
            }
        } catch {
            setStatus("Network error", "error");
        } finally {
            setLoading(false);
        }
    }

    newGameBtn.addEventListener("click", generatePuzzle);
});
