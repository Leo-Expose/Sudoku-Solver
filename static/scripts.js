document.addEventListener('DOMContentLoaded', () => {
    const solveButton = document.getElementById('solve-button');
    const clearButton = document.getElementById('clear-button');
    const randomButton = document.getElementById('random-button');
    const statusDiv = document.getElementById('status');

    solveButton.addEventListener('click', async () => {
        let grid = [];
        for (let i = 0; i < 9; i++) {
            let row = [];
            for (let j = 0; j < 9; j++) {
                let value = document.getElementById(`cell-${i}-${j}`).value;
                row.push(value ? parseInt(value) : 0);
            }
            grid.push(row);
        }

        let response = await fetch('/solve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ grid })
        });

        let result = await response.json();
        if (result.solution) {
            let solvedGrid = result.solution;
            for (let i = 0; i < 9; i++) {
                for (let j = 0; j < 9; j++) {
                    document.getElementById(`cell-${i}-${j}`).value = solvedGrid[i][j];
                }
            }
            statusDiv.textContent = 'Solved!';
            disableInputs(true);
        } else {
            statusDiv.textContent = result.error || 'Error solving the puzzle!';
        }
    });

    clearButton.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear the puzzle?')) {
            for (let i = 0; i < 9; i++) {
                for (let j = 0; j < 9; j++) {
                    document.getElementById(`cell-${i}-${j}`).value = '';
                }
            }
            statusDiv.textContent = 'Grid cleared.';
            disableInputs(false);
        }
    });

    randomButton.addEventListener('click', async () => {
        let response = await fetch('/random', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        let result = await response.json();
        if (result.grid) {
            let randomGrid = result.grid;
            for (let i = 0; i < 9; i++) {
                for (let j = 0; j < 9; j++) {
                    document.getElementById(`cell-${i}-${j}`).value = randomGrid[i][j] || '';
                }
            }
            statusDiv.textContent = 'Random puzzle generated.';
        } else {
            statusDiv.textContent = 'Error generating random puzzle!';
        }
    });

    function disableInputs(disable) {
        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                document.getElementById(`cell-${i}-${j}`).disabled = disable;
            }
        }
    }
});

function validateInput(input) {
    const value = input.value;
    if (!/^[1-9]$/.test(value)) {
        input.value = '';
    }
}
