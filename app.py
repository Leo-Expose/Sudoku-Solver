import os
import random
import copy
from flask import Flask, request, jsonify, render_template

app = Flask(__name__)


def is_valid(board, row, col, num):
    for i in range(9):
        if board[row][i] == num or board[i][col] == num:
            return False
    box_r, box_c = 3 * (row // 3), 3 * (col // 3)
    for i in range(box_r, box_r + 3):
        for j in range(box_c, box_c + 3):
            if board[i][j] == num:
                return False
    return True


def solve_sudoku(board):
    empty = None
    for i in range(9):
        for j in range(9):
            if board[i][j] == 0:
                empty = (i, j)
                break
        if empty:
            break
    if not empty:
        return True
    row, col = empty
    for num in range(1, 10):
        if is_valid(board, row, col, num):
            board[row][col] = num
            if solve_sudoku(board):
                return True
            board[row][col] = 0
    return False


def _count_solutions(board, limit=2):
    empty = None
    for i in range(9):
        for j in range(9):
            if board[i][j] == 0:
                empty = (i, j)
                break
        if empty:
            break
    if not empty:
        return 1
    row, col = empty
    count = 0
    for num in range(1, 10):
        if is_valid(board, row, col, num):
            board[row][col] = num
            count += _count_solutions(board, limit - count)
            board[row][col] = 0
            if count >= limit:
                break
    return count


def generate_full_board():
    board = [[0] * 9 for _ in range(9)]

    def fill(b):
        empty = None
        for i in range(9):
            for j in range(9):
                if b[i][j] == 0:
                    empty = (i, j)
                    break
            if empty:
                break
        if not empty:
            return True
        row, col = empty
        nums = list(range(1, 10))
        random.shuffle(nums)
        for num in nums:
            if is_valid(b, row, col, num):
                b[row][col] = num
                if fill(b):
                    return True
                b[row][col] = 0
        return False

    fill(board)
    return board


def generate_puzzle(clues=36):
    full = generate_full_board()
    puzzle = [row[:] for row in full]
    cells = [(i, j) for i in range(9) for j in range(9)]
    random.shuffle(cells)
    removed = 0
    target = 81 - clues

    for row, col in cells:
        if removed >= target:
            break
        backup = puzzle[row][col]
        puzzle[row][col] = 0
        test = [r[:] for r in puzzle]
        if _count_solutions(test) == 1:
            removed += 1
        else:
            puzzle[row][col] = backup

    return puzzle, full


def _validate_grid(data):
    if not data or "grid" not in data:
        return None, (jsonify({"error": "Missing 'grid' field"}), 400)
    board = data["grid"]
    if not isinstance(board, list) or len(board) != 9:
        return None, (jsonify({"error": "Grid must be a 9x9 array"}), 400)
    for row in board:
        if not isinstance(row, list) or len(row) != 9:
            return None, (jsonify({"error": "Grid must be a 9x9 array"}), 400)
    if not all(isinstance(cell, int) and 0 <= cell <= 9 for row in board for cell in row):
        return None, (jsonify({"error": "All cells must be integers 0-9"}), 400)
    return board, None


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/solve", methods=["POST"])
def solve():
    board, err = _validate_grid(request.json)
    if err:
        return err
    test = copy.deepcopy(board)
    if solve_sudoku(test):
        return jsonify({"solution": test})
    return jsonify({"error": "No solution exists for this puzzle"}), 422


@app.route("/generate", methods=["GET"])
def generate():
    difficulty = request.args.get("difficulty", "medium", type=str)
    clue_map = {"easy": 45, "medium": 36, "hard": 28}
    if difficulty not in clue_map:
        return jsonify({"error": f"Invalid difficulty. Choose from: {', '.join(clue_map)}"}), 400
    clues = clue_map[difficulty]
    puzzle, solution = generate_puzzle(clues)
    return jsonify({"puzzle": puzzle, "solution": solution})


@app.route("/hint", methods=["POST"])
def hint():
    board, err = _validate_grid(request.json)
    if err:
        return err
    empty_cells = [(r, c) for r in range(9) for c in range(9) if board[r][c] == 0]
    if not empty_cells:
        return jsonify({"error": "No empty cells to hint"}), 400
    solution = copy.deepcopy(board)
    if not solve_sudoku(solution):
        return jsonify({"error": "No solution exists for this puzzle"}), 422
    r, c = random.choice(empty_cells)
    return jsonify({"row": r, "col": c, "value": solution[r][c]})


if __name__ == "__main__":
    app.run(debug=os.environ.get("FLASK_DEBUG", "false").lower() == "true")
