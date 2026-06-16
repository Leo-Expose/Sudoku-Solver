document.addEventListener("DOMContentLoaded", () => {
    const solveBtn = document.getElementById("solve-btn");
    const clearBtn = document.getElementById("clear-btn");
    const resetBtn = document.getElementById("reset-btn");
    const newGameBtn = document.getElementById("new-game-btn");
    const statusDiv = document.getElementById("status");
    const solveText = solveBtn.querySelector(".btn-text");
    const solveSpinner = solveBtn.querySelector(".spinner");
    const themeToggle = document.getElementById("theme-toggle");
    const diffFlyout = document.getElementById("difficulty-flyout");
    const gridWrapper = document.getElementById("grid-wrapper");
    
    // --- Keyboard Shortcuts Modal ---
    const shortcutsModal = document.getElementById("shortcuts-modal");
    const closeModalBtn = document.getElementById("close-modal-btn");

    let modalTimerPaused = false; // tracks if WE paused the timer on modal open

    function openShortcutsModal() {
        if (!shortcutsModal) return;
        shortcutsModal.hidden = false;
        // Silently pause the timer while help is open (no overlay)
        if (gameActive && !isPaused && timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
            modalTimerPaused = true;
        }
    }

    function closeShortcutsModal() {
        if (!shortcutsModal) return;
        shortcutsModal.hidden = true;
        // Resume the timer if we paused it
        if (modalTimerPaused) {
            modalTimerPaused = false;
            timerInterval = setInterval(() => {
                timerSeconds++;
                updateTimerDisplay();
            }, 1000);
        }
    }

    function toggleShortcutsModal() {
        if (!shortcutsModal) return;
        if (shortcutsModal.hidden) {
            openShortcutsModal();
        } else {
            closeShortcutsModal();
        }
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener("click", () => {
            closeShortcutsModal();
        });
    }

    if (shortcutsModal) {
        shortcutsModal.addEventListener("click", (e) => {
            if (e.target === shortcutsModal) {
                closeShortcutsModal();
            }
        });
    }

    let activeCell = null;
    let notesMode = false;
    let gameActive = false;
    let activeFilterDigit = null;

    // --- Pencil Notes & Undo/Redo Storage ---
    let cellNotes = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set()));
    let historyStack = [];
    let historyIndex = -1;

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

    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
        if (!localStorage.getItem("theme")) {
            setTheme(e.matches ? "dark" : "light");
        }
    });

    // --- Stopwatch & Timer Logic ---
    let timerSeconds = 0;
    let timerInterval = null;
    let isPaused = false;

    function formatTime(secs) {
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    }

    function updateTimerDisplay() {
        document.getElementById("timer-val").textContent = formatTime(timerSeconds);
    }

    function startTimer() {
        if (timerInterval) clearInterval(timerInterval);
        isPaused = false;
        timerInterval = setInterval(() => {
            timerSeconds++;
            updateTimerDisplay();
        }, 1000);
        updateTimerControlsUI();
    }

    function pauseTimer() {
        if (!gameActive) return;
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        isPaused = true;
        document.getElementById("pause-overlay").hidden = false;
        updateTimerControlsUI();
    }

    function resumeTimer() {
        isPaused = false;
        document.getElementById("pause-overlay").hidden = true;
        timerInterval = setInterval(() => {
            timerSeconds++;
            updateTimerDisplay();
        }, 1000);
        updateTimerControlsUI();
    }

    function togglePause() {
        if (!gameActive) return;
        if (isPaused) {
            resumeTimer();
        } else {
            pauseTimer();
        }
    }

    function resetTimer() {
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = null;
        timerSeconds = 0;
        isPaused = false;
        updateTimerDisplay();
        document.getElementById("pause-overlay").hidden = true;
        updateTimerControlsUI();
    }

    function updateTimerControlsUI() {
        const toggleBtn = document.getElementById("timer-toggle-btn");
        const toggleText = document.getElementById("timer-toggle-text");
        const playIcon = toggleBtn.querySelector(".play-icon");
        const pauseIcon = toggleBtn.querySelector(".pause-icon");

        if (isPaused) {
            toggleText.textContent = "Resume";
            playIcon.style.display = "inline";
            pauseIcon.style.display = "none";
        } else {
            toggleText.textContent = "Pause";
            playIcon.style.display = "none";
            pauseIcon.style.display = "inline";
        }
    }

    document.getElementById("timer-toggle-btn").addEventListener("click", () => {
        togglePause();
    });

    document.getElementById("timer-reset-btn").addEventListener("click", () => {
        resetTimer();
    });

    document.getElementById("resume-btn").addEventListener("click", () => {
        resumeTimer();
    });

    // --- Difficulty Badge ---
    function setDifficultyBadge(difficulty) {
        const badge = document.getElementById("game-difficulty-badge");
        if (!difficulty) {
            badge.textContent = "No game";
            badge.className = "badge badge-neutral";
            return;
        }
        badge.textContent = difficulty.toUpperCase();
        badge.className = "badge";
        if (difficulty === "easy") {
            badge.classList.add("badge-easy");
        } else if (difficulty === "medium") {
            badge.classList.add("badge-medium");
        } else if (difficulty === "hard") {
            badge.classList.add("badge-hard");
        } else {
            badge.classList.add("badge-neutral");
        }
    }

    // --- Notes Mode Logic ---
    const normalBtn = document.getElementById("mode-normal-btn");
    const notesBtn = document.getElementById("mode-notes-btn");
    
    function setNotesMode(value) {
        notesMode = value;
        if (notesMode) {
            if (normalBtn) normalBtn.classList.remove("active");
            if (notesBtn) notesBtn.classList.add("active");
        } else {
            if (normalBtn) normalBtn.classList.add("active");
            if (notesBtn) notesBtn.classList.remove("active");
        }
    }

    function toggleNotesMode() {
        setNotesMode(!notesMode);
    }

    if (normalBtn) {
        normalBtn.addEventListener("click", () => {
            setNotesMode(false);
        });
    }
    if (notesBtn) {
        notesBtn.addEventListener("click", () => {
            setNotesMode(true);
        });
    }

    function updateNotesUI(r, c) {
        const container = document.getElementById(`notes-${r}-${c}`);
        if (!container) return;
        const spans = container.querySelectorAll("span");
        const activeNotes = cellNotes[r][c];

        spans.forEach(span => {
            const val = parseInt(span.textContent, 10);
            if (activeNotes.has(val)) {
                span.classList.add("active");
            } else {
                span.classList.remove("active");
            }
        });
    }

    // --- Undo/Redo Engine ---
    function getGridSnapshot() {
        const grid = [];
        const notesSnapshot = [];
        for (let r = 0; r < 9; r++) {
            const row = [];
            const notesRow = [];
            for (let c = 0; c < 9; c++) {
                const val = document.getElementById(`cell-${r}-${c}`).value;
                row.push(val ? parseInt(val, 10) : 0);
                notesRow.push(new Set(cellNotes[r][c]));
            }
            grid.push(row);
            notesSnapshot.push(notesRow);
        }
        return { grid, notes: notesSnapshot };
    }

    function restoreGridSnapshot(snapshot) {
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const cell = document.getElementById(`cell-${r}-${c}`);
                const val = snapshot.grid[r][c];
                cell.value = val ? val : "";
                if (val) {
                    cell.classList.add("has-value");
                } else {
                    cell.classList.remove("has-value");
                }
                cellNotes[r][c] = new Set(snapshot.notes[r][c]);
                updateNotesUI(r, c);
            }
        }
        clearCompletion();
        checkConflicts();
        updateRemainingTracker();
        // Re-apply same-number highlights after undo/redo
        if (activeCell) {
            highlightSameNumbers(activeCell);
        } else {
            highlightSameNumbers(null);
        }
    }

    function saveHistory() {
        if (historyIndex < historyStack.length - 1) {
            historyStack = historyStack.slice(0, historyIndex + 1);
        }
        historyStack.push(getGridSnapshot());
        historyIndex++;
        updateHistoryButtons();
    }

    function undo() {
        if (historyIndex > 0) {
            historyIndex--;
            restoreGridSnapshot(historyStack[historyIndex]);
            updateHistoryButtons();
            setStatus("Undo", "");
        }
    }

    function redo() {
        if (historyIndex < historyStack.length - 1) {
            historyIndex++;
            restoreGridSnapshot(historyStack[historyIndex]);
            updateHistoryButtons();
            setStatus("Redo", "");
        }
    }

    function updateHistoryButtons() {
        const undoBtn = document.getElementById("undo-btn");
        const redoBtn = document.getElementById("redo-btn");
        undoBtn.disabled = historyIndex <= 0;
        redoBtn.disabled = historyIndex >= historyStack.length - 1;
    }

    document.getElementById("undo-btn").addEventListener("click", () => undo());
    document.getElementById("redo-btn").addEventListener("click", () => redo());

    // --- Difficulty Flyout ---
    newGameBtn.addEventListener("click", () => {
        const isOpen = !diffFlyout.hidden;
        if (isOpen) {
            closeFlyout();
        } else {
            diffFlyout.hidden = false;
            diffFlyout.style.animation = "none";
            diffFlyout.offsetHeight;
            diffFlyout.style.animation = "";
        }
    });

    function closeFlyout() {
        diffFlyout.hidden = true;
    }

    document.addEventListener("click", (e) => {
        if (!diffFlyout.hidden &&
            !diffFlyout.contains(e.target) &&
            !newGameBtn.contains(e.target)) {
            closeFlyout();
        }
    });

    const diffButtons = document.querySelectorAll(".diff-btn");
    diffButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const difficulty = btn.dataset.diff;
            closeFlyout();
            generatePuzzle(difficulty);
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
        if (type === "error" && msg === "Rule violation!") {
            statusDiv.className = "error rule-violation";
        } else {
            statusDiv.className = type || "";
        }
    }

    function setLoading(loading) {
        solveBtn.disabled = loading;
        newGameBtn.disabled = loading;
        clearBtn.disabled = loading;
        resetBtn.disabled = loading;
        if (normalBtn) normalBtn.disabled = loading;
        if (notesBtn) notesBtn.disabled = loading;
        solveText.hidden = loading;
        solveSpinner.hidden = !loading;

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

    // --- Completion Detection ---
    function checkCompletion() {
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (!document.getElementById(`cell-${r}-${c}`).value) return false;
            }
        }

        const hasConflict = checkConflicts();
        if (!hasConflict) {
            gridWrapper.classList.add("grid-complete");
            setStatus("Puzzle complete!", "success");
            if (timerInterval) {
                clearInterval(timerInterval);
                timerInterval = null;
            }
            return true;
        }
        return false;
    }

    function clearCompletion() {
        gridWrapper.classList.remove("grid-complete");
    }

    // --- Conflict Checker ---
    function checkConflicts() {
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                document.getElementById(`cell-${r}-${c}`).classList.remove("error-cell");
            }
        }

        let hasConflict = false;

        for (let r = 0; r < 9; r++) {
            const map = {};
            for (let c = 0; c < 9; c++) {
                const val = document.getElementById(`cell-${r}-${c}`).value;
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

        for (let c = 0; c < 9; c++) {
            const map = {};
            for (let r = 0; r < 9; r++) {
                const val = document.getElementById(`cell-${r}-${c}`).value;
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

        for (let boxRow = 0; boxRow < 3; boxRow++) {
            for (let boxCol = 0; boxCol < 3; boxCol++) {
                const map = {};
                for (let r = boxRow * 3; r < boxRow * 3 + 3; r++) {
                    for (let c = boxCol * 3; c < boxCol * 3 + 3; c++) {
                        const val = document.getElementById(`cell-${r}-${c}`).value;
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
            setStatus("Rule violation!", "error");
        } else if (statusDiv.classList.contains("error")) {
            setStatus("Ready", "");
        }

        return hasConflict;
    }

    // --- Same-Number & Related Cells Highlighting ---
    function highlightSameNumbers(cell) {
        document.querySelectorAll("input.highlight-same").forEach(el => {
            el.classList.remove("highlight-same");
        });

        let val = null;
        if (cell && cell.value) {
            val = cell.value;
        } else if (activeFilterDigit) {
            val = activeFilterDigit.toString();
        }

        if (!val) return;

        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const other = document.getElementById(`cell-${r}-${c}`);
                if (other.value === val) {
                    other.classList.add("highlight-same");
                }
            }
        }
    }

    function highlightRelatedCells(focusRow, focusCol) {
        // Axis/crosshair highlighting removed — use tracker for same-number selection
    }


    // --- Remaining Placements Tracker Engine ---
    function updateRemainingTracker() {
        const counts = Array(10).fill(0);
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const val = document.getElementById(`cell-${r}-${c}`).value;
                if (val) {
                    const digit = parseInt(val, 10);
                    if (digit >= 1 && digit <= 9) {
                        counts[digit]++;
                    }
                }
            }
        }

        for (let d = 1; d <= 9; d++) {
            const countEl = document.getElementById(`digit-count-${d}`);
            const btn = countEl.closest(".tracker-digit-btn");
            const remaining = Math.max(0, 9 - counts[d]);
            if (remaining === 0) {
                btn.classList.add("digit-complete");
                countEl.textContent = "✓";
            } else {
                btn.classList.remove("digit-complete");
                countEl.textContent = remaining;
            }
        }
    }

    document.querySelectorAll(".tracker-digit-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const digit = parseInt(btn.dataset.digit, 10);
            if (activeFilterDigit === digit) {
                activeFilterDigit = null;
                btn.classList.remove("active-filter");
            } else {
                document.querySelectorAll(".tracker-digit-btn.active-filter").forEach(b => {
                    b.classList.remove("active-filter");
                });
                activeFilterDigit = digit;
                btn.classList.add("active-filter");
            }
            highlightSameNumbers(document.activeElement.tagName === "INPUT" ? document.activeElement : null);
        });
    });

    // --- Focus Tracking ---
    document.getElementById("grid").addEventListener("focusin", (e) => {
        if (e.target.tagName === "INPUT") {
            activeCell = e.target;
            highlightSameNumbers(activeCell);
        }
    });

    document.getElementById("grid").addEventListener("focusout", () => {
        setTimeout(() => {
            if (!document.activeElement || document.activeElement.tagName !== "INPUT") {
                // Only clear highlights if no tracker filter is active
                if (!activeFilterDigit) {
                    highlightSameNumbers(null);
                }
            }
        }, 120);
    });

    // --- Input Navigation ---
    function advanceFocus(r, c) {
        let nextC = c + 1;
        let nextR = r;
        if (nextC > 8) { nextC = 0; nextR++; }
        while (nextR < 9) {
            const cell = document.getElementById(`cell-${nextR}-${nextC}`);
            if (cell && !cell.readOnly) { cell.focus(); return; }
            nextC++;
            if (nextC > 8) { nextC = 0; nextR++; }
        }
    }

    // --- Grid Interaction Event Listeners ---
    document.getElementById("grid").addEventListener("input", (e) => {
        const cell = e.target;
        if (cell.tagName !== "INPUT") return;
        const r = parseInt(cell.dataset.row, 10);
        const c = parseInt(cell.dataset.col, 10);

        cell.value = cell.value.replace(/[^1-9]/g, "").slice(0, 1);
        
        if (!gameActive) {
            gameActive = true;
            startTimer();
        }

        if (cell.value) {
            cell.classList.add("has-value");
            cellNotes[r][c].clear();
            updateNotesUI(r, c);
        } else {
            cell.classList.remove("has-value");
        }

        clearCompletion();
        checkConflicts();
        updateRemainingTracker();
        highlightSameNumbers(cell);
        saveHistory();

        if (cell.value.length === 1) {
            advanceFocus(r, c);
        }

        setTimeout(() => checkCompletion(), 50);
    });

    document.getElementById("grid").addEventListener("keydown", (e) => {
        const cell = e.target;
        if (cell.tagName !== "INPUT") return;
        const r = parseInt(cell.dataset.row, 10);
        const c = parseInt(cell.dataset.col, 10);

        // Pencil Mode Note Input
        const isNoteInput = (notesMode || e.shiftKey) && !cell.readOnly;
        if (isNoteInput && e.key >= "1" && e.key <= "9") {
            e.preventDefault();
            
            if (!gameActive) {
                gameActive = true;
                startTimer();
            }
            
            const num = parseInt(e.key, 10);
            if (cellNotes[r][c].has(num)) {
                cellNotes[r][c].delete(num);
            } else {
                cellNotes[r][c].add(num);
            }
            
            cell.value = "";
            cell.classList.remove("has-value");
            updateNotesUI(r, c);
            
            clearCompletion();
            checkConflicts();
            saveHistory();
            return;
        }

        // Catch Ctrl+Z / Ctrl+Y
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
            e.preventDefault();
            if (e.shiftKey) {
                redo();
            } else {
                undo();
            }
            return;
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
            e.preventDefault();
            redo();
            return;
        }

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
                    cell.classList.remove("has-value");
                    cellNotes[r][c].clear();
                    updateNotesUI(r, c);
                    
                    clearCompletion();
                    checkConflicts();
                    updateRemainingTracker();
                    saveHistory();
                }
                return;
            default:
                return;
        }

        e.preventDefault();
        document.getElementById(`cell-${nr}-${nc}`).focus();
    });

    // Global keyboard shortcuts
    document.addEventListener("keydown", (e) => {
        // Close modal on Escape even when typing
        if (e.key === "Escape") {
            if (shortcutsModal && !shortcutsModal.hidden) {
                closeShortcutsModal();
                return;
            }
        }

        // Toggle shortcuts modal with '?' key when not typing in input
        if (e.key === "?") {
            if (document.activeElement.tagName !== "INPUT") {
                e.preventDefault();
                toggleShortcutsModal();
                return;
            }
        }

        if (document.activeElement.tagName !== "INPUT") {
            if (e.code === "Space") {
                e.preventDefault();
                togglePause();
            } else if (e.key.toLowerCase() === "u") {
                undo();
            } else if (e.key.toLowerCase() === "r") {
                redo();
            } else if (e.key.toLowerCase() === "n") {
                toggleNotesMode();
            }
        }
    });

    // --- Solve ---
    solveBtn.addEventListener("click", async () => {
        const grid = getGrid();
        setLoading(true);
        setStatus("Solving…", "");

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
                checkCompletion();
            } else {
                setStatus(data.error || "No solution", "error");
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
            cell.classList.add("has-value");
            cell.className = "cell-input solved has-value";
            cell.readOnly = false;
            
            cellNotes[r][c].clear();
            updateNotesUI(r, c);
            await sleep(15);
        }
        updateRemainingTracker();
        saveHistory();
    }

    // --- Reset ---
    resetBtn.addEventListener("click", () => {
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const cell = document.getElementById(`cell-${r}-${c}`);
                if (!cell.readOnly) {
                    cell.value = "";
                    cell.className = "cell-input";
                    cellNotes[r][c].clear();
                    updateNotesUI(r, c);
                }
            }
        }
        clearCompletion();
        checkConflicts();
        updateRemainingTracker();
        highlightSameNumbers(null);
        
        if (gameActive) {
            timerSeconds = 0;
            updateTimerDisplay();
        }
        
        saveHistory();
        setStatus("Progress reset", "");
    });

    // --- Clear ---
    clearBtn.addEventListener("click", () => {
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const cell = document.getElementById(`cell-${r}-${c}`);
                cell.value = "";
                cell.className = "cell-input";
                cell.readOnly = false;
                cellNotes[r][c].clear();
                updateNotesUI(r, c);
            }
        }
        clearCompletion();
        checkConflicts();
        updateRemainingTracker();
        highlightSameNumbers(null);
        setDifficultyBadge(null);
        
        gameActive = false;
        resetTimer();
        
        saveHistory();
        setStatus("Grid cleared", "");
    });

    // --- Generate ---
    async function generatePuzzle(difficulty) {
        setLoading(true);
        setStatus("Generating…", "");
        resetTimer();

        try {
            const res = await fetch(`/generate?difficulty=${difficulty}`);
            const data = await res.json();

            if (data.puzzle) {
                for (let r = 0; r < 9; r++) {
                    for (let c = 0; c < 9; c++) {
                        const cell = document.getElementById(`cell-${r}-${c}`);
                        cell.value = "";
                        cell.className = "cell-input";
                        cell.readOnly = false;
                        cellNotes[r][c].clear();
                        updateNotesUI(r, c);
                    }
                }

                for (let r = 0; r < 9; r++) {
                    for (let c = 0; c < 9; c++) {
                        if (data.puzzle[r][c] !== 0) {
                            const cell = document.getElementById(`cell-${r}-${c}`);
                            cell.value = data.puzzle[r][c];
                            cell.className = "cell-input given has-value";
                            cell.readOnly = true;
                        }
                    }
                }
                clearCompletion();
                checkConflicts();
                updateRemainingTracker();
                highlightSameNumbers(null);
                
                setDifficultyBadge(difficulty);
                
                // Initialize new history for this board
                historyStack = [];
                historyIndex = -1;
                saveHistory();
                
                gameActive = true;
                startTimer();
                setStatus(`${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} puzzle`, "success");
            } else {
                setStatus("Generation error", "error");
            }
        } catch {
            setStatus("Network error", "error");
        } finally {
            setLoading(false);
        }
    }

    // --- Initial Setup ---
    saveHistory();
    updateRemainingTracker();
    setDifficultyBadge(null);
});
