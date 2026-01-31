const JASS_TYPES = ['Rose', 'Schelle', 'Schilte', 'Eichle', 'Uneufe ⬆', 'Obeabe ⬇', 'Slalom ⛷', 'Gusti 🐈', 'Wunsch ❔', 'Coiffeur ✂️'];

const CARD_EMOJI = {
    'Rose': '❤️',
    'Schelle': '♦️',
    'Schilte': '♣️',
    'Eichle': '♠️'
};

let editMode = false;

let gameState = {
    team1: {
        name: 'Team 1',
        score: 0,
        games: {}
    },
    team2: {
        name: 'Team 2',
        score: 0,
        games: {}
    },
    selectedGames: new Set(JASS_TYPES), // All selected by default
    gameOrder: [...JASS_TYPES], // Track the order of games
    reorderMode: false, // Toggle for order adjustment mode
    loggingTeam: 'team1', // Current team for logging
    selectedLoggingGame: null, // Currently selected game for logging
    loggingInputTeam1: '', // Store team1 input value
    loggingInputTeam2: '', // Store team2 input value
    cardType: 'german' // Card type: 'german' or 'french'
};

// Initialize the game
function initializeGame() {
    // Load saved state from localStorage if available
    const savedState = localStorage.getItem('coifeurState');
    if (savedState) {
        gameState = JSON.parse(savedState);
        gameState.selectedGames = new Set(gameState.selectedGames);
        // Ensure gameOrder exists for backward compatibility
        if (!gameState.gameOrder) {
            gameState.gameOrder = [...JASS_TYPES];
        }
        // Add any new games from JASS_TYPES that aren't in the saved state
        JASS_TYPES.forEach(game => {
            if (!gameState.team1.games.hasOwnProperty(game)) {
                gameState.team1.games[game] = '';
                gameState.team2.games[game] = '';
                gameState.selectedGames.add(game);
            }
            if (!gameState.gameOrder.includes(game)) {
                gameState.gameOrder.push(game);
            }
        });
    } else {
        // Initialize all games
        JASS_TYPES.forEach(game => {
            gameState.team1.games[game] = '';
            gameState.team2.games[game] = '';
        });
        gameState.gameOrder = [...JASS_TYPES];
    }

    // Update the team name displays with loaded names
    document.getElementById('team1NameDisplay').textContent = gameState.team1.name;
    document.getElementById('team1NameInput').value = gameState.team1.name;
    document.getElementById('team2NameDisplay').textContent = gameState.team2.name;
    document.getElementById('team2NameInput').value = gameState.team2.name;

    renderUI();
}

function renderUI() {
    renderJassOptions();
    renderLoggingSection();
    renderGamesTable();
    updateTeamDisplay();
}

function renderJassOptions() {
    const container = document.getElementById('jassOptions');
    container.innerHTML = '';

    JASS_TYPES.forEach(game => {
        const isSelected = gameState.selectedGames.has(game);
        const div = document.createElement('div');
        div.className = 'jass-checkbox';

        let displayText = game;
        if (['Eichle', 'Rose', 'Schelle', 'Schilte'].includes(game)) {
            if (gameState.cardType === 'french') {
                displayText = CARD_EMOJI[game];
            } else {
                displayText = `<img src="../../common/img/${game}.png" alt="${game}" class="jass-icon">`;
            }
        }

        div.innerHTML = `
            <input type="checkbox" id="game-${game}" ${isSelected ? 'checked' : ''} onchange="toggleGame('${game}')">
            <label for="game-${game}">${displayText}</label>
        `;
        container.appendChild(div);
    });
}

function toggleGame(gameName) {
    if (gameState.selectedGames.has(gameName)) {
        gameState.selectedGames.delete(gameName);
    } else {
        gameState.selectedGames.add(gameName);
        // Initialize the game if it wasn't already there
        if (!gameState.team1.games[gameName]) {
            gameState.team1.games[gameName] = '';
            gameState.team2.games[gameName] = '';
        }
    }
    saveState();
    renderGamesTable();
}

function renderLoggingSection() {
    const loggingContainer = document.getElementById('loggingContainer');
    loggingContainer.innerHTML = '';

    const selectedGames = gameState.gameOrder.filter(game => gameState.selectedGames.has(game));

    // Show games that the CURRENT team hasn't logged yet
    const currentTeam = gameState.loggingTeam;
    const unloggedGames = selectedGames.filter(game => !gameState[currentTeam].games[game]);

    let html = `<div class="team-toggle-buttons">
        <button onclick="switchLoggingTeam('team1')" class="logging-team-btn ${gameState.loggingTeam === 'team1' ? 'active' : ''}">${gameState.team1.name}</button>
        <button onclick="switchLoggingTeam('team2')" class="logging-team-btn ${gameState.loggingTeam === 'team2' ? 'active' : ''}">${gameState.team2.name}</button>
    </div>`;

    // Show unlogged games for the current team
    if (unloggedGames.length === 0) {
        html += `<p class="all-logged-message">Alle Jass Arten sind bereits protokolliert für ${gameState[currentTeam].name}!</p>`;
    } else {
        html += `<div class="logging-games">`;
        unloggedGames.forEach(game => {
            let displayText = game;
            if (['Eichle', 'Rose', 'Schelle', 'Schilte'].includes(game)) {
                if (gameState.cardType === 'french') {
                    displayText = CARD_EMOJI[game];
                } else {
                    displayText = `<img src="../../common/img/${game}.png" alt="${game}" class="jass-icon">`;
                }
            }
            const isSelected = gameState.selectedLoggingGame === game;
            html += `<button onclick="selectLoggingGame('${game}')" class="game-select-btn ${isSelected ? 'active' : ''}">${displayText}</button>`;
        });
        html += `</div>`;
    }

    // Always show score input fields
    html += `<div class="logging-scores">
        <div class="logging-score-row">
            <label>${gameState.team1.name}:</label>
            <input type="number" id="team1-logging-score" class="logging-input" placeholder="0" min="0" max="257" value="${gameState.loggingInputTeam1}" oninput="updateLoggingInput('team1'); updateTeam2ScoreFromTeam1()">
        </div>
        <div class="logging-score-row">
            <label>${gameState.team2.name}:</label>
            <input type="number" id="team2-logging-score" class="logging-input" placeholder="0" min="0" max="257" value="${gameState.loggingInputTeam2}" oninput="updateLoggingInput('team2'); updateTeam1ScoreFromTeam2()">
        </div>
        <button onclick="submitLogging()" class="submit-logging-btn">Rundi Hinzuefüege</button>
    </div>`;

    loggingContainer.innerHTML = html;
}

function updateLoggingInput(team) {
    if (team === 'team1') {
        gameState.loggingInputTeam1 = document.getElementById('team1-logging-score').value;
    } else {
        gameState.loggingInputTeam2 = document.getElementById('team2-logging-score').value;
    }
}

function selectLoggingGame(game) {
    gameState.selectedLoggingGame = game;
    renderLoggingSection();
}

function switchLoggingTeam(team) {
    gameState.loggingTeam = team;
    renderLoggingSection();
}

function submitLogging() {
    if (!gameState.selectedLoggingGame) {
        alert('Bitte wähl e Jass Art us.');
        return;
    }

    const team1Score = parseInt(document.getElementById('team1-logging-score').value) || 0;
    const team2Score = parseInt(document.getElementById('team2-logging-score').value) || 0;
    const totalPoints = team1Score + team2Score;

    if (totalPoints !== 157 && totalPoints !== 257 && totalPoints !== 0) {
        alert(`Pünkt münd total 157 odr 257 si. Momentan: ${totalPoints}`);
        return;
    }

    const game = gameState.selectedLoggingGame;

    // Save score only for the current team
    if (gameState.loggingTeam === 'team1') {
        gameState.team1.games[game] = team1Score;
    } else {
        gameState.team2.games[game] = team2Score;
    }

    gameState.selectedLoggingGame = null;
    gameState.loggingInputTeam1 = '';
    gameState.loggingInputTeam2 = '';
    updateTeamDisplay();
    renderLoggingSection();
    renderGamesTable();
    saveState();
}

function updateTeam2ScoreFromTeam1() {
    const team1Score = parseInt(document.getElementById('team1-logging-score').value) || 0;
    const team2Field = document.getElementById('team2-logging-score');

    if (team1Score === 257) {
        team2Field.value = 0;
    } else if (team1Score === 0) {
        team2Field.value = 157;
    } else {
        team2Field.value = 157 - team1Score;
    }

    gameState.loggingInputTeam2 = team2Field.value;
}

function updateTeam1ScoreFromTeam2() {
    const team2Score = parseInt(document.getElementById('team2-logging-score').value) || 0;
    const team1Field = document.getElementById('team1-logging-score');

    if (team2Score === 257) {
        team1Field.value = 0;
    } else if (team2Score === 0) {
        team1Field.value = 157;
    } else {
        team1Field.value = 157 - team2Score;
    }

    gameState.loggingInputTeam1 = team1Field.value;
}

function renderGamesTable() {
    const tbody = document.getElementById('gamesTableBody');
    tbody.innerHTML = '';

    const table = tbody.parentElement;
    table.className = 'games-table' + (editMode ? ' edit-mode' : '');

    const selectedGames = gameState.gameOrder.filter(game => gameState.selectedGames.has(game));

    selectedGames.forEach((game, index) => {
        const row = document.createElement('tr');
        row.draggable = gameState.reorderMode;
        row.className = 'draggable-row' + (gameState.reorderMode ? ' reorder-enabled' : '');
        row.dataset.game = game;
        row.addEventListener('dragstart', handleDragStart);
        row.addEventListener('dragover', handleDragOver);
        row.addEventListener('drop', handleDrop);
        row.addEventListener('dragend', handleDragEnd);

        const team1Value = gameState.team1.games[game] || '';
        const team2Value = gameState.team2.games[game] || '';
        const multiplier = index + 1;

        let displayText = game;
        if (['Eichle', 'Rose', 'Schelle', 'Schilte'].includes(game)) {
            if (gameState.cardType === 'french') {
                displayText = CARD_EMOJI[game];
            } else {
                displayText = `<img src="../../common/img/${game}.png" alt="${game}" class="jass-icon-table">`;
            }
        }

        const dragHandle = gameState.reorderMode ? '⋮⋮ ' : '';
        const readonlyAttr = editMode ? '' : 'readonly';
        const onchangeHandler = editMode ? `onchange="updateScoreFromEditMode('team1', '${game}', this.value)"` : '';
        const onchangeHandler2 = editMode ? `onchange="updateScoreFromEditMode('team2', '${game}', this.value)"` : '';

        row.innerHTML = `
            <td class="drag-handle"><strong>${dragHandle}${displayText}</strong></td>
            <td>${multiplier}</td>
            <td><input type="number" class="score-input" value="${team1Value}" ${readonlyAttr} placeholder="0" ${onchangeHandler}></td>
            <td><input type="number" class="score-input" value="${team2Value}" ${readonlyAttr} placeholder="0" ${onchangeHandler2}></td>
        `;
        tbody.appendChild(row);
    });
}

function updateScoreFromLogging(team, game, value) {
    const numValue = parseInt(value) || 0;
    gameState[team].games[game] = numValue;
    updateTeamDisplay();
    renderGamesTable();
    saveState();
}

function updateScoreFromEditMode(team, game, value) {
    const numValue = parseInt(value) || 0;
    gameState[team].games[game] = numValue;
    updateTeamDisplay();
    saveState();
}

function updateTeamDisplay() {
    // Calculate team scores with multipliers
    gameState.team1.score = 0;
    gameState.team2.score = 0;

    let team1MaxScore = 0;
    let team2MaxScore = 0;

    const selectedGames = gameState.gameOrder.filter(game => gameState.selectedGames.has(game));

    selectedGames.forEach((game, index) => {
        const multiplier = index + 1;
        const team1Points = parseInt(gameState.team1.games[game]) || 0;
        const team2Points = parseInt(gameState.team2.games[game]) || 0;

        gameState.team1.score += team1Points * multiplier;
        gameState.team2.score += team2Points * multiplier;

        // Calculate max possible score:
        // If logged: use actual score, if not logged: assume 257 (max possible)
        if (gameState.team1.games[game]) {
            team1MaxScore += team1Points * multiplier;
        } else {
            team1MaxScore += 257 * multiplier;
        }

        if (gameState.team2.games[game]) {
            team2MaxScore += team2Points * multiplier;
        } else {
            team2MaxScore += 257 * multiplier;
        }
    });

    // Update display
    const team1ScoreEl = document.getElementById('team1Score');
    const team2ScoreEl = document.getElementById('team2Score');

    team1ScoreEl.textContent = gameState.team1.score;
    team2ScoreEl.textContent = gameState.team2.score;
    document.getElementById('team1Header').textContent = gameState.team1.name;
    document.getElementById('team2Header').textContent = gameState.team2.name;

    // Update max scores
    const team1MaxEl = document.getElementById('team1MaxScore');
    const team2MaxEl = document.getElementById('team2MaxScore');

    team1MaxEl.textContent = team1MaxScore;
    team2MaxEl.textContent = team2MaxScore;

    // Reset classes
    team1ScoreEl.classList.remove('winning', 'losing');
    team2ScoreEl.classList.remove('winning', 'losing');
    team1MaxEl.parentElement.classList.remove('losing');
    team2MaxEl.parentElement.classList.remove('losing');

    // Team 1 losing: opponent's score > their max possible
    if (gameState.team2.score > team1MaxScore) {
        team1MaxEl.parentElement.classList.add('losing');
        team1ScoreEl.classList.add('losing');
        team2ScoreEl.classList.add('winning');
    }

    // Team 2 losing: opponent's score > their max possible
    if (gameState.team1.score > team2MaxScore) {
        team2MaxEl.parentElement.classList.add('losing');
        team2ScoreEl.classList.add('losing');
        team1ScoreEl.classList.add('winning');
    }
}

function updateTeamName(teamNum) {
    const inputId = `team${teamNum}Name`;
    const newName = document.getElementById(inputId).value.trim();

    if (newName) {
        gameState[`team${teamNum}`].name = newName;
    } else {
        // Reset to default if empty
        document.getElementById(inputId).value = gameState[`team${teamNum}`].name;
    }

    updateTeamDisplay();
    saveState();
}

function editTeamName(teamNum) {
    const display = document.getElementById(`team${teamNum}NameDisplay`);
    const input = document.getElementById(`team${teamNum}NameInput`);

    input.classList.remove('hidden');
    input.focus();
    input.select();
    display.classList.add('hidden');
}

function saveTeamName(teamNum) {
    const display = document.getElementById(`team${teamNum}NameDisplay`);
    const input = document.getElementById(`team${teamNum}NameInput`);
    const newName = input.value.trim();

    if (newName) {
        gameState[`team${teamNum}`].name = newName;
        display.textContent = newName;
    } else {
        // Reset to current name if empty
        input.value = gameState[`team${teamNum}`].name;
    }

    input.classList.add('hidden');
    display.classList.remove('hidden');
    updateTeamDisplay();
    renderLoggingSection();
    saveState();
}

function toggleSettings() {
    const settingsContent = document.getElementById('settingsContent');
    settingsContent.classList.toggle('show');
}

function setCardType(type) {
    gameState.cardType = type;
    // Update button states
    document.getElementById('cardType-german').classList.toggle('active', type === 'german');
    document.getElementById('cardType-french').classList.toggle('active', type === 'french');
    // Save and re-render
    saveState();
    renderUI();
}

function toggleReorderMode() {
    gameState.reorderMode = !gameState.reorderMode;
    const btn = document.getElementById('reorderBtn');
    if (btn) {
        btn.classList.toggle('active', gameState.reorderMode);
        btn.textContent = gameState.reorderMode ? '✓ Reihenfolge anpassen' : 'Reihenfolge anpassen';
    }
    renderGamesTable();
    saveState();
}

function toggleEditMode() {
    editMode = !editMode;
    const btn = document.getElementById('editValuesBtn');
    if (btn) {
        btn.classList.toggle('active', editMode);
        btn.textContent = editMode ? '✓ Pünkt ändern' : 'Pünkt ändern';
    }
    renderGamesTable();
}

function resetGame() {
    if (confirm('Pünkt wirklich löschen?')) {
        // Only reset scores, keep team names and game order
        JASS_TYPES.forEach(game => {
            gameState.team1.games[game] = '';
            gameState.team2.games[game] = '';
        });

        saveState();
        renderUI();
    }
}

function resetGameOrder() {
    if (confirm('Reihenfolge wirklich resete?')) {
        // Reset game order to default
        gameState.gameOrder = [...JASS_TYPES];

        saveState();
        renderGamesTable();
    }
}

let draggedElement = null;

function handleDragStart(e) {
    draggedElement = this;
    this.classList.add('dragging');
}

function handleDragOver(e) {
    e.preventDefault();
    return false;
}

function handleDrop(e) {
    e.stopPropagation();

    if (draggedElement !== this && draggedElement && this.dataset.game) {
        const draggedGame = draggedElement.dataset.game;
        const targetGame = this.dataset.game;

        const draggedIndex = gameState.gameOrder.indexOf(draggedGame);
        const targetIndex = gameState.gameOrder.indexOf(targetGame);

        // Swap positions
        [gameState.gameOrder[draggedIndex], gameState.gameOrder[targetIndex]] =
            [gameState.gameOrder[targetIndex], gameState.gameOrder[draggedIndex]];

        saveState();
        renderGamesTable();
    }
    return false;
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
}

function saveState() {
    const stateToSave = {
        ...gameState,
        selectedGames: Array.from(gameState.selectedGames)
    };
    localStorage.setItem('coifeurState', JSON.stringify(stateToSave));
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initializeGame);
