document.addEventListener("DOMContentLoaded", () => {
    const solveBtn = document.getElementById("solve-btn");
    const clearBtn = document.getElementById("clear-btn");
    const randomBtn = document.getElementById("random-btn");
    const statusDiv = document.getElementById("status");
    const solveText = solveBtn.querySelector(".btn-text");
    const solveSpinner = solveBtn.querySelector(".spinner");

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

    function setCell(r, c, value, cls) {
        const cell = document.getElementById(`cell-${r}-${c}`);
        cell.value = value || "";
        cell.className = cls || "";
    }

    function clearAllCells() {
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                setCell(r, c, "", "");
            }
        }
    }

    function setStatus(msg, type) {
        statusDiv.textContent = msg;
        statusDiv.className = type || "";
    }

    function setLoading(loading) {
        solveBtn.disabled = loading;
        randomBtn.disabled = loading;
        solveText.hidden = loading;
        solveSpinner.hidden = !loading;
    }

    /* Solve with animation */
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
            setCell(r, c, val, "solved");
            await sleep(18);
        }
    }

    /* Clear */
    clearBtn.addEventListener("click", () => {
        clearAllCells();
        setStatus("Grid cleared", "");
    });

    /* Random puzzle */
    randomBtn.addEventListener("click", async () => {
        setLoading(true);
        setStatus("Generating puzzle...", "");

        try {
            const res = await fetch("/generate?difficulty=medium");
            const data = await res.json();

            if (data.puzzle) {
                clearAllCells();
                for (let r = 0; r < 9; r++) {
                    for (let c = 0; c < 9; c++) {
                        if (data.puzzle[r][c] !== 0) {
                            setCell(r, c, data.puzzle[r][c], "given");
                        }
                    }
                }
                setStatus("Puzzle generated - solve it!", "success");
            } else {
                setStatus("Error generating puzzle", "error");
            }
        } catch {
            setStatus("Network error", "error");
        } finally {
            setLoading(false);
        }
    });

    /* Input validation */
    document.getElementById("grid").addEventListener("input", (e) => {
        const cell = e.target;
        if (cell.tagName !== "INPUT") return;
        cell.value = cell.value.replace(/[^1-9]/g, "").slice(0, 1);
        if (cell.classList.contains("error-cell")) {
            cell.classList.remove("error-cell");
        }
    });

    /* Keyboard navigation */
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
                cell.value = "";
                return;
            default:
                return;
        }

        e.preventDefault();
        document.getElementById(`cell-${nr}-${nc}`).focus();
    });

    /* Auto-advance on single digit input */
    document.getElementById("grid").addEventListener("input", (e) => {
        const cell = e.target;
        if (cell.tagName !== "INPUT") return;
        if (cell.value.length === 1) {
            const r = parseInt(cell.dataset.row, 10);
            const c = parseInt(cell.dataset.col, 10);
            if (c < 8) {
                document.getElementById(`cell-${r}-${c + 1}`).focus();
            } else if (r < 8) {
                document.getElementById(`cell-${r + 1}-0`).focus();
            }
        }
    });
});

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
