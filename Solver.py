import random
from flask import Flask, request, jsonify, render_template
import copy

app = Flask(__name__)

# Sudoku solving algorithm
def is_valid(board, row, col, num):
    for i in range(9):
        if board[row][i] == num or board[i][col] == num or board[row//3*3+i//3][col//3*3+i%3] == num:
            return False
    return True

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

def find_empty(board):
    for i in range(9):
        for j in range(9):
            if board[i][j] == 0:
                return (i, j)
    return None

def generate_random_board():
    board = [[0 for _ in range(9)] for _ in range(9)]
    for _ in range(random.randint(10, 20)):
        row = random.randint(0, 8)
        col = random.randint(0, 8)
        num = random.randint(1, 9)
        while not is_valid(board, row, col, num) or board[row][col] != 0:
            row = random.randint(0, 8)
            col = random.randint(0, 8)
            num = random.randint(1, 9)
        board[row][col] = num
    return board

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/solve', methods=['POST'])
def solve():
    data = request.json
    board = data['grid']
    if not all(0 <= cell <= 9 for row in board for cell in row):
        return jsonify({'error': 'Invalid input'})
    
    original_board = copy.deepcopy(board)
    if solve_sudoku(board):
        return jsonify({'solution': board})
    else:
        return jsonify({'error': 'No solution'})

@app.route('/validate', methods=['POST'])
def validate():
    data = request.json
    board = data['grid']
    if any(not is_valid(board, i, j, board[i][j]) for i in range(9) for j in range(9) if board[i][j] != 0):
        return jsonify({'error': 'Incorrect input'})
    return jsonify({'message': 'Valid input'})

@app.route('/random', methods=['GET'])
def random_puzzle():
    board = generate_random_board()
    return jsonify({'grid': board})

if __name__ == '__main__':
    app.run(debug=True)
