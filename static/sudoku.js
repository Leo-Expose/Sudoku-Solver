// ponytail: inline solver, no backend. 9x9 backtracking is trivial in JS.
// Replaces app.py entirely. ~100 lines vs 173 lines + Flask server.

function isValid(board, row, col, num) {
    for (let i = 0; i < 9; i++) {
        if (board[row][i] === num || board[i][col] === num) return false;
    }
    const boxR = 3 * Math.floor(row / 3), boxC = 3 * Math.floor(col / 3);
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            if (board[boxR + i][boxC + j] === num) return false;
        }
    }
    return true;
}

function solveSudoku(board) {
    let empty = null;
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            if (board[i][j] === 0) { empty = [i, j]; break; }
        }
        if (empty) break;
    }
    if (!empty) return true;
    const [r, c] = empty;
    for (let num = 1; num <= 9; num++) {
        if (isValid(board, r, c, num)) {
            board[r][c] = num;
            if (solveSudoku(board)) return true;
            board[r][c] = 0;
        }
    }
    return false;
}

function countSolutions(board, limit = 2) {
    let empty = null;
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            if (board[i][j] === 0) { empty = [i, j]; break; }
        }
        if (empty) break;
    }
    if (!empty) return 1;
    const [r, c] = empty;
    let count = 0;
    for (let num = 1; num <= 9; num++) {
        if (isValid(board, r, c, num)) {
            board[r][c] = num;
            count += countSolutions(board, limit - count);
            board[r][c] = 0;
            if (count >= limit) break;
        }
    }
    return count;
}

function generateFullBoard() {
    const board = Array.from({ length: 9 }, () => Array(9).fill(0));
    function fill(b) {
        let empty = null;
        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                if (b[i][j] === 0) { empty = [i, j]; break; }
            }
            if (empty) break;
        }
        if (!empty) return true;
        const [r, c] = empty;
        const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
        for (const num of nums) {
            if (isValid(b, r, c, num)) {
                b[r][c] = num;
                if (fill(b)) return true;
                b[r][c] = 0;
            }
        }
        return false;
    }
    fill(board);
    return board;
}

function generatePuzzle(clues = 36) {
    const full = generateFullBoard();
    const puzzle = full.map(row => [...row]);
    const cells = [];
    for (let i = 0; i < 9; i++) for (let j = 0; j < 9; j++) cells.push([i, j]);
    cells.sort(() => Math.random() - 0.5);
    let removed = 0;
    const target = 81 - clues;
    for (const [r, c] of cells) {
        if (removed >= target) break;
        const backup = puzzle[r][c];
        puzzle[r][c] = 0;
        const test = puzzle.map(row => [...row]);
        if (countSolutions(test) === 1) {
            removed++;
        } else {
            puzzle[r][c] = backup;
        }
    }
    return puzzle;
}

// ponytail: single export, consumer calls what it needs
window.Sudoku = { isValid, solveSudoku, countSolutions, generateFullBoard, generatePuzzle };
