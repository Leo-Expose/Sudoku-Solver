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

    let activeCell = null;
    let notesMode = false;
    let gameActive = false;
    let activeFilterDigit = null;

    // --- Pencil Notes & Undo/Redo Storage ---
    let cellNotes = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set()));
    let historyStack = [];
    let historyIndex = -1;
    let mistakes = 0;
    let hintCount = 3;
    let currentDifficulty = null;
    let lastConflictState = false;

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
        const overlay = document.getElementById("pause-overlay");
        overlay.hidden = false;
        overlay._previousFocus = document.activeElement;
        document.getElementById("resume-btn").focus();
        updateTimerControlsUI();
    }

    function resumeTimer() {
        isPaused = false;
        const overlay = document.getElementById("pause-overlay");
        overlay.hidden = true;
        if (overlay._previousFocus) {
            overlay._previousFocus.focus();
            overlay._previousFocus = null;
        }
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
        debouncedSaveGameState();
    }

    // --- Game State Persistence ---
    let saveGameStateTimer = null;
    function debouncedSaveGameState() {
        if (saveGameStateTimer) clearTimeout(saveGameStateTimer);
        saveGameStateTimer = setTimeout(saveGameState, 300);
    }

    function saveGameState() {
        const grid = [];
        const given = [];
        for (let r = 0; r < 9; r++) {
            const row = [];
            const givenRow = [];
            for (let c = 0; c < 9; c++) {
                const cell = document.getElementById(`cell-${r}-${c}`);
                row.push(cell.value ? parseInt(cell.value, 10) : 0);
                givenRow.push(cell.classList.contains("given"));
            }
            grid.push(row);
            given.push(givenRow);
        }
        const notes = cellNotes.map(row => row.map(s => [...s]));
        const state = {
            grid, given, notes,
            timer: timerSeconds,
            difficulty: currentDifficulty,
            gameActive, isPaused, notesMode,
            hintCount, mistakes
        };
        try { localStorage.setItem("sudoku-save", JSON.stringify(state)); } catch {}
    }

    function restoreGameState() {
        try {
            const raw = localStorage.getItem("sudoku-save");
            if (!raw) return false;
            const state = JSON.parse(raw);
            if (!state.grid || !state.given) return false;
            for (let r = 0; r < 9; r++) {
                for (let c = 0; c < 9; c++) {
                    const cell = document.getElementById(`cell-${r}-${c}`);
                    if (state.given[r][c]) {
                        cell.value = state.grid[r][c] || "";
                        cell.className = state.grid[r][c] ? "cell-input given has-value" : "cell-input";
                        cell.readOnly = true;
                    } else if (state.grid[r][c]) {
                        cell.value = state.grid[r][c];
                        cell.className = "cell-input has-value";
                        cell.readOnly = false;
                    } else {
                        cell.value = "";
                        cell.className = "cell-input";
                        cell.readOnly = false;
                    }
                    if (state.notes && state.notes[r] && state.notes[r][c]) {
                        cellNotes[r][c] = new Set(state.notes[r][c]);
                        updateNotesUI(r, c);
                    }
                }
            }
            timerSeconds = state.timer || 0;
            currentDifficulty = state.difficulty || null;
            gameActive = state.gameActive || false;
            isPaused = state.isPaused || false;
            notesMode = state.notesMode || false;
            hintCount = state.hintCount ?? 3;
            mistakes = state.mistakes || 0;
            updateTimerDisplay();
            setDifficultyBadge(currentDifficulty);
            setNotesMode(notesMode);
            updateMistakeDisplay();
            updateHintDisplay();
            if (gameActive && !isPaused) startTimer();
            checkConflicts();
            updateRemainingTracker();
            return true;
        } catch { return false; }
    }

    function clearSave() {
        try { localStorage.removeItem("sudoku-save"); } catch {}
    }

    // --- Mistake Tracking ---
    function trackMistakes() {
        const hasConflict = checkConflicts();
        if (hasConflict && !lastConflictState) {
            mistakes++;
            updateMistakeDisplay();
        }
        lastConflictState = hasConflict;
    }

    function updateMistakeDisplay() {
        const el = document.getElementById("mistake-val");
        if (el) el.textContent = mistakes;
    }

    // --- Hint Display ---
    function updateHintDisplay() {
        const hintCountEl = document.getElementById("hint-count");
        const hintText = document.getElementById("hint-text");
        const hintBtn = document.getElementById("hint-btn");
        if (hintCountEl) hintCountEl.textContent = hintCount;
        if (hintBtn) hintBtn.disabled = hintCount <= 0;
        if (hintText) hintText.textContent = hintCount <= 0 ? "No hints" : "Hint";
    }

    // --- Statistics ---
    function getStats() {
        try {
            return JSON.parse(localStorage.getItem("sudoku-stats")) || {
                gamesPlayed: 0, gamesWon: 0, bestTimes: {},
                totalTime: 0, totalHints: 0, totalMistakes: 0
            };
        } catch {
            return { gamesPlayed: 0, gamesWon: 0, bestTimes: {}, totalTime: 0, totalHints: 0, totalMistakes: 0 };
        }
    }

    function saveStats(stats) {
        try { localStorage.setItem("sudoku-stats", JSON.stringify(stats)); } catch {}
    }

    function recordGameEnd(won) {
        const stats = getStats();
        stats.gamesPlayed++;
        if (won) {
            stats.gamesWon++;
            stats.totalTime += timerSeconds;
            stats.totalHints += (3 - hintCount);
            stats.totalMistakes += mistakes;
            if (currentDifficulty) {
                const prev = stats.bestTimes[currentDifficulty];
                if (!prev || timerSeconds < prev) {
                    stats.bestTimes[currentDifficulty] = timerSeconds;
                }
            }
        }
        saveStats(stats);
    }

    function openStatsModal() {
        const stats = getStats();
        const winRate = stats.gamesPlayed ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0;
        const avgTime = stats.gamesWon ? formatTime(Math.round(stats.totalTime / stats.gamesWon)) : "\u2014";
        const bestEasy = stats.bestTimes.easy != null ? formatTime(stats.bestTimes.easy) : "\u2014";
        const bestMedium = stats.bestTimes.medium != null ? formatTime(stats.bestTimes.medium) : "\u2014";
        const bestHard = stats.bestTimes.hard != null ? formatTime(stats.bestTimes.hard) : "\u2014";

        const statsModal = document.getElementById("stats-modal");
        document.getElementById("stats-content").innerHTML = `
            <div class="stat-row"><span class="stat-label">Games Played</span><span class="stat-value">${stats.gamesPlayed}</span></div>
            <div class="stat-row"><span class="stat-label">Games Won</span><span class="stat-value">${stats.gamesWon}</span></div>
            <div class="stat-row"><span class="stat-label">Win Rate</span><span class="stat-value">${winRate}%</span></div>
            <div class="stat-row"><span class="stat-label">Best Time (Easy)</span><span class="stat-value">${bestEasy}</span></div>
            <div class="stat-row"><span class="stat-label">Best Time (Medium)</span><span class="stat-value">${bestMedium}</span></div>
            <div class="stat-row"><span class="stat-label">Best Time (Hard)</span><span class="stat-value">${bestHard}</span></div>
            <div class="stat-row"><span class="stat-label">Avg Completion Time</span><span class="stat-value">${avgTime}</span></div>
            <div class="stat-row"><span class="stat-label">Total Hints Used</span><span class="stat-value">${stats.totalHints}</span></div>
            <div class="stat-row"><span class="stat-label">Total Mistakes</span><span class="stat-value">${stats.totalMistakes}</span></div>
        `;
        statsModal.hidden = false;
        statsModal._previousFocus = document.activeElement;
        document.getElementById("close-stats-btn").focus();
    }

    function closeStatsModal() {
        const statsModal = document.getElementById("stats-modal");
        statsModal.hidden = true;
        if (statsModal._previousFocus) {
            statsModal._previousFocus.focus();
            statsModal._previousFocus = null;
        }
    }

    // --- Generic Modal Helpers ---
    function openModal(id) {
        const modal = document.getElementById(id);
        if (!modal) return;
        modal.hidden = false;
        modal._previousFocus = document.activeElement;
        const closeBtn = document.getElementById(`close-${id.replace("-modal", "")}-btn`);
        if (closeBtn) closeBtn.focus();
        if (gameActive && !isPaused && timerInterval && id !== "shortcuts-modal") {
            clearInterval(timerInterval);
            timerInterval = null;
            modal._pausedTimer = true;
        }
    }

    function closeModal(id) {
        const modal = document.getElementById(id);
        if (!modal) return;
        modal.hidden = true;
        if (modal._previousFocus) {
            modal._previousFocus.focus();
            modal._previousFocus = null;
        }
        if (modal._pausedTimer) {
            modal._pausedTimer = false;
            if (timerInterval) clearInterval(timerInterval);
            timerInterval = setInterval(() => {
                timerSeconds++;
                updateTimerDisplay();
            }, 1000);
        }
    }

    // --- Rules / How to Play Modal ---
    function openRulesModal() {
        openModal("rules-modal");
    }

    function closeRulesModal() {
        closeModal("rules-modal");
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
            generatePuzzleUI(difficulty);
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
            recordGameEnd(true);
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
    function checkConflicts(targetR, targetC) {
        document.querySelectorAll("input.error-cell").forEach(el => {
            el.classList.remove("error-cell");
        });

        let hasConflict = false;

        function checkGroup(cells) {
            const map = {};
            cells.forEach(({ r, c }) => {
                const val = document.getElementById(`cell-${r}-${c}`).value;
                if (val) {
                    if (!map[val]) map[val] = [];
                    map[val].push({ r, c });
                }
            });
            for (const val in map) {
                if (map[val].length > 1) {
                    hasConflict = true;
                    map[val].forEach(({ r, c }) => {
                        document.getElementById(`cell-${r}-${c}`).classList.add("error-cell");
                    });
                }
            }
        }

        if (targetR !== undefined && targetC !== undefined) {
            const rowCells = [];
            for (let c = 0; c < 9; c++) rowCells.push({ r: targetR, c });
            checkGroup(rowCells);

            const colCells = [];
            for (let r = 0; r < 9; r++) colCells.push({ r, c: targetC });
            checkGroup(colCells);

            const boxRow = Math.floor(targetR / 3) * 3;
            const boxCol = Math.floor(targetC / 3) * 3;
            const boxCells = [];
            for (let r = boxRow; r < boxRow + 3; r++) {
                for (let c = boxCol; c < boxCol + 3; c++) {
                    boxCells.push({ r, c });
                }
            }
            checkGroup(boxCells);
        } else {
            for (let r = 0; r < 9; r++) {
                const cells = [];
                for (let c = 0; c < 9; c++) cells.push({ r, c });
                checkGroup(cells);
            }

            for (let c = 0; c < 9; c++) {
                const cells = [];
                for (let r = 0; r < 9; r++) cells.push({ r, c });
                checkGroup(cells);
            }

            for (let boxRow = 0; boxRow < 3; boxRow++) {
                for (let boxCol = 0; boxCol < 3; boxCol++) {
                    const cells = [];
                    for (let r = boxRow * 3; r < boxRow * 3 + 3; r++) {
                        for (let c = boxCol * 3; c < boxCol * 3 + 3; c++) {
                            cells.push({ r, c });
                        }
                    }
                    checkGroup(cells);
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
        trackMistakes();
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
            trackMistakes();
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
            case "w": case "W": nr = Math.max(0, r - 1); break;
            case "s": case "S": nr = Math.min(8, r + 1); break;
            case "a": case "A": nc = Math.max(0, c - 1); break;
            case "d": case "D": nc = Math.min(8, c + 1); break;
            case "Backspace":
            case "Delete":
                if (!cell.readOnly) {
                    cell.value = "";
                    cell.classList.remove("has-value");
                    cellNotes[r][c].clear();
                    updateNotesUI(r, c);

                    clearCompletion();
                    trackMistakes();
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
            if (statsModal && !statsModal.hidden) { closeStatsModal(); return; }
            if (rulesModal && !rulesModal.hidden) { closeRulesModal(); return; }
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

        // ponytail: client-side solver, no fetch needed
        const board = grid.map(row => [...row]);
        if (Sudoku.solveSudoku(board)) {
            setStatus("Solved!", "success");
            await animateSolution(grid, board);
            checkCompletion();
        } else {
            setStatus("No solution exists for this puzzle", "error");
        }
        setLoading(false);
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
        currentDifficulty = null;
        mistakes = 0;
        hintCount = 3;
        lastConflictState = false;
        updateMistakeDisplay();
        updateHintDisplay();
        resetTimer();
        clearSave();

        saveHistory();
        setStatus("Grid cleared", "");
    });

    // --- Generate ---
    async function generatePuzzleUI(difficulty) {
        setLoading(true);
        setStatus("Generating…", "");
        resetTimer();
        currentDifficulty = difficulty;
        mistakes = 0;
        hintCount = 3;
        lastConflictState = false;
        updateMistakeDisplay();
        updateHintDisplay();

        // ponytail: client-side generation, no fetch needed
        const clueMap = { easy: 45, medium: 36, hard: 28 };
        const puzzle = Sudoku.generatePuzzle(clueMap[difficulty]);

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
                if (puzzle[r][c] !== 0) {
                    const cell = document.getElementById(`cell-${r}-${c}`);
                    cell.value = puzzle[r][c];
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
        
        historyStack = [];
        historyIndex = -1;
        saveHistory();
        
        gameActive = true;
        startTimer();
        setStatus(`${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} puzzle`, "success");
        setLoading(false);
    }

    // --- Hint Handler ---
    const hintBtn = document.getElementById("hint-btn");
    hintBtn?.addEventListener("click", async () => {
        if (hintCount <= 0) return;
        const grid = getGrid();
        setLoading(true);
        
        // ponytail: client-side hint, no fetch needed
        const board = grid.map(row => [...row]);
        if (!Sudoku.solveSudoku(board)) {
            setStatus("No solution exists for this puzzle", "error");
            setLoading(false);
            return;
        }
        const emptyCells = [];
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (grid[r][c] === 0) emptyCells.push([r, c]);
            }
        }
        if (!emptyCells.length) {
            setStatus("No empty cells to hint", "error");
            setLoading(false);
            return;
        }
        const [r, c] = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        const cell = document.getElementById(`cell-${r}-${c}`);
        cell.value = board[r][c];
        cell.className = "cell-input hinted has-value";
        cell.readOnly = false;
        cellNotes[r][c].clear();
        updateNotesUI(r, c);
        updateRemainingTracker();
        highlightSameNumbers(cell);
        hintCount--;
        updateHintDisplay();
        saveHistory();
        setStatus("Hint revealed!", "success");
        setLoading(false);
    });

    // --- Number Pad for Touch Devices ---
    const numberPad = document.getElementById("number-pad");
    const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (isTouchDevice && numberPad) {
        numberPad.hidden = false;
    }
    numberPad?.addEventListener("click", (e) => {
        const btn = e.target.closest(".num-btn");
        if (!btn || !activeCell || activeCell.readOnly) return;
        const num = parseInt(btn.dataset.num, 10);
        const r = parseInt(activeCell.dataset.row, 10);
        const c = parseInt(activeCell.dataset.col, 10);
        if (num === 0) {
            activeCell.value = "";
            activeCell.classList.remove("has-value");
            cellNotes[r][c].clear();
            updateNotesUI(r, c);
            clearCompletion();
            trackMistakes();
            updateRemainingTracker();
            saveHistory();
            return;
        }
        if (notesMode || activeCell.shiftKey) {
            if (cellNotes[r][c].has(num)) cellNotes[r][c].delete(num);
            else cellNotes[r][c].add(num);
            activeCell.value = "";
            activeCell.classList.remove("has-value");
            updateNotesUI(r, c);
        } else {
            activeCell.value = num;
            activeCell.classList.add("has-value");
            cellNotes[r][c].clear();
            updateNotesUI(r, c);
            if (!gameActive) { gameActive = true; startTimer(); }
        }
        clearCompletion();
        trackMistakes();
        updateRemainingTracker();
        highlightSameNumbers(activeCell);
        saveHistory();
        setTimeout(() => checkCompletion(), 50);
    });

    // --- Statistics Modal ---
    const statsBtn = document.getElementById("stats-btn");
    const statsModal = document.getElementById("stats-modal");
    const closeStatsBtn = document.getElementById("close-stats-btn");
    const resetStatsBtn = document.getElementById("reset-stats-btn");

    statsBtn?.addEventListener("click", openStatsModal);
    closeStatsBtn?.addEventListener("click", closeStatsModal);
    statsModal?.addEventListener("click", (e) => { if (e.target === statsModal) closeStatsModal(); });
    resetStatsBtn?.addEventListener("click", () => {
        try { localStorage.removeItem("sudoku-stats"); } catch {}
        closeStatsModal();
        setStatus("Statistics reset", "");
    });

    // --- Rules Modal ---
    const rulesBtn = document.getElementById("rules-btn");
    const rulesModal = document.getElementById("rules-modal");
    const closeRulesBtn = document.getElementById("close-rules-btn");

    rulesBtn?.addEventListener("click", openRulesModal);
    closeRulesBtn?.addEventListener("click", closeRulesModal);
    rulesModal?.addEventListener("click", (e) => { if (e.target === rulesModal) closeRulesModal(); });

    // --- Timer auto-save (every 5 seconds while game is active) ---
    setInterval(() => {
        if (gameActive && !isPaused) saveGameState();
    }, 5000);

    // --- Initial Setup ---
    if (!restoreGameState()) {
        saveHistory();
        updateRemainingTracker();
        setDifficultyBadge(null);
    }
});
