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


def find_empty(board):
    for i in range(9):
        for j in range(9):
            if board[i][j] == 0:
                return (i, j)
    return None


def solve_sudoku(board):
    empty = find_empty(board)
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
    empty = find_empty(board)
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
        empty = find_empty(b)
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
    puzzle = copy.deepcopy(full)
    cells = [(i, j) for i in range(9) for j in range(9)]
    random.shuffle(cells)
    removed = 0
    target = 81 - clues

    for row, col in cells:
        if removed >= target:
            break
        backup = puzzle[row][col]
        puzzle[row][col] = 0
        test = copy.deepcopy(puzzle)
        if _count_solutions(test) == 1:
            removed += 1
        else:
            puzzle[row][col] = backup

    return puzzle, full


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/solve", methods=["POST"])
def solve():
    data = request.json
    board = data["grid"]
    if not all(isinstance(cell, int) and 0 <= cell <= 9 for row in board for cell in row):
        return jsonify({"error": "Invalid input"})
    test = copy.deepcopy(board)
    if solve_sudoku(test):
        return jsonify({"solution": test})
    return jsonify({"error": "No solution exists for this puzzle"})


@app.route("/generate", methods=["GET"])
def generate():
    difficulty = request.args.get("difficulty", "medium", type=str)
    clue_map = {"easy": 45, "medium": 36, "hard": 28}
    clues = clue_map.get(difficulty, 36)
    puzzle, solution = generate_puzzle(clues)
    return jsonify({"puzzle": puzzle, "solution": solution})


@app.route("/validate", methods=["POST"])
def validate():
    data = request.json
    board = data["grid"]
    for i in range(9):
        for j in range(9):
            num = board[i][j]
            if num != 0:
                board[i][j] = 0
                if not is_valid(board, i, j, num):
                    board[i][j] = num
                    return jsonify({"error": f"Invalid placement at row {i+1}, col {j+1}"})
                board[i][j] = num
    return jsonify({"message": "All placements are valid"})


if __name__ == "__main__":
    app.run(debug=True)
