const JASS_TYPES = ['Rose', 'Eichle', 'Schelle', 'Schilte', 'Uneufe ⬆', 'Obeabe ⬇', 'Slalom ⛷', 'Gusti 🐈', 'Wunsch ❔', 'Coiffeur ✂️'];

const CARD_EMOJI = {
    'Rose': '🌹',
    'Schelle': '♦️',
    'Schilte': '♣️',
    'Eichle': '♠️'
};

// Game state
let game = {
    team1: {
        name: 'Team 1',
        score: 0
    },
    team2: {
        name: 'Team 2',
        score: 0
    },
    rounds: [],
    currentRound: 1,
    selectedGames: new Set(['Rose', 'Eichle', 'Schelle', 'Schilte', 'Uneufe ⬆', 'Obeabe ⬇']),
    selectedGameType: null,
    cardType: 'german',
    targetPoints: 2500,
    selectedHandwiis: [], // Track handwiis for current round
    gameWeights: { // Weight multiplier for each game
        'Rose': 1,
        'Eichle': 2,
        'Schelle': 3,
        'Schilte': 4,
        'Uneufe ⬆': 5,
        'Obeabe ⬇': 6,
        'Slalom ⛷': 7,
        'Gusti 🐈': 8,
        'Wunsch ❔': 9,
        'Coiffeur ✂️': 10
    }
};

// Global state for handwiis selection
let handwiisState = {
    selectedTeam: null,
    selectedSuit: null,
    x2Active: false // Simple toggle for x2
};

// Load game from localStorage
function loadGame() {
    const saved = localStorage.getItem('schiebierGame');
    if (saved) {
        game = JSON.parse(saved);
        game.selectedGames = new Set(game.selectedGames || JASS_TYPES);
        game.selectedGameType = game.selectedGameType || null;
        game.cardType = game.cardType || 'german';
    }
    updateUI();
}

// Save game to localStorage
function saveGame() {
    const gameToSave = {
        ...game,
        selectedGames: Array.from(game.selectedGames)
    };
    localStorage.setItem('schiebierGame', JSON.stringify(gameToSave));
}

// Edit team name
function editTeamName(teamNum) {
    const teamKey = teamNum === 1 ? 'team1' : 'team2';
    const displayEl = document.getElementById(`team${teamNum}NameDisplay`);
    const inputEl = document.getElementById(`team${teamNum}NameInput`);

    displayEl.classList.add('hidden');
    inputEl.classList.remove('hidden');
    inputEl.focus();
}

// Save team name
function saveTeamName(teamNum) {
    const teamKey = teamNum === 1 ? 'team1' : 'team2';
    const displayEl = document.getElementById(`team${teamNum}NameDisplay`);
    const inputEl = document.getElementById(`team${teamNum}NameInput`);

    const newName = inputEl.value.trim();
    if (newName) {
        game[teamKey].name = newName;
    }

    displayEl.textContent = game[teamKey].name;
    displayEl.classList.remove('hidden');
    inputEl.classList.add('hidden');

    saveGame();
    updateUI();
}

// Add a round
function addRound() {
    const team1Input = document.getElementById('team1-score');
    const team2Input = document.getElementById('team2-score');

    const team1Score = parseInt(team1Input.value) || 0;
    const team2Score = parseInt(team2Input.value) || 0;

    if (team1Score === 0 && team2Score === 0) {
        alert('Bitte gib d pünkt i');
        return;
    }

    if (!game.selectedGameType) {
        alert('Bitte wähle e Jass us');
        return;
    }

    // Get the weight multiplier for the selected game type
    const gameWeight = game.gameWeights[game.selectedGameType] || 1;
    const weightedTeam1Score = team1Score * gameWeight;
    const weightedTeam2Score = team2Score * gameWeight;

    // Add round to history
    game.rounds.push({
        roundNumber: game.currentRound,
        team1Score: team1Score,
        team2Score: team2Score,
        weightedTeam1Score: weightedTeam1Score,
        weightedTeam2Score: weightedTeam2Score,
        gameType: game.selectedGameType,
        gameWeight: gameWeight,
        handwiis: game.selectedHandwiis.filter(h => typeof h === 'object') // Only add handwii objects from addHandwiis()
    });

    // Update total scores with weighted multiplier (handwiis already added to team scores)
    game.team1.score += weightedTeam1Score;
    game.team2.score += weightedTeam2Score;

    // Clear inputs
    team1Input.value = '';
    team2Input.value = '';
    game.selectedHandwiis = [];
    game.selectedGameType = null; // Reset game selection
    game.currentRound++;

    saveGame();
    updateUI();
    renderHandwiisButtons();
}

// Calculate Team 2 score automatically
function calculateTeam2Score() {
    const team1Input = document.getElementById('team1-score');
    const team2Input = document.getElementById('team2-score');

    const team1Score = parseInt(team1Input.value) || 0;

    if (team1Score === 257) {
        team2Input.value = 0;
    } else if (team1Score > 0) {
        team2Input.value = 157 - team1Score;
    } else {
        team2Input.value = '';
    }
}

// Calculate Team 1 score automatically
function calculateTeam1Score() {
    const team1Input = document.getElementById('team1-score');
    const team2Input = document.getElementById('team2-score');

    const team2Score = parseInt(team2Input.value) || 0;

    if (team2Score === 257) {
        team1Input.value = 0;
    } else if (team2Score > 0) {
        team1Input.value = 157 - team2Score;
    } else {
        team1Input.value = '';
    }
}

// Toggle handwiis selection
function toggleHandwiis(value) {
    const index = game.selectedHandwiis.indexOf(value);
    if (index > -1) {
        game.selectedHandwiis.splice(index, 1);
    } else {
        game.selectedHandwiis.push(value);
    }
    renderHandwiisButtons();
}

// Render handwiis buttons with active state (legacy - no longer used)
function renderHandwiisButtons() {
    // This function is no longer needed as handwiis are added immediately
    // when clicking value buttons in the modal
}

// Select team for handwiis (show suit selector first)
function openWiisForTeam(teamNum) {
    // Store selected team and reset x2
    handwiisState.selectedTeam = teamNum;
    handwiisState.selectedSuit = game.selectedGameType; // Use the currently selected game type
    handwiisState.x2Active = false;
    updateX2ButtonState();

    // Update active state of team buttons
    const buttons = document.querySelectorAll('.team-wiis-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    const selectedButton = document.querySelector(`.team-wiis-btn:nth-of-type(${teamNum})`);
    if (selectedButton) {
        selectedButton.classList.add('active');
    }

    // Show the Wiis entry section
    const wiisSection = document.getElementById('wiisEntrySection');
    if (wiisSection) {
        wiisSection.classList.remove('hidden');
    }
}

// Get display text for a game type
function getGameDisplay(gameType) {
    if (CARD_EMOJI[gameType]) {
        return `${CARD_EMOJI[gameType]} ${gameType}`;
    }
    // For non-suit games, extract emoji from the game type string
    const match = gameType.match(/[^\w\s]/g);
    if (match && match.length > 0) {
        return gameType; // Already has emoji
    }
    return gameType;
}

// Toggle x2 multiplier for next value
function toggleHandwiisMultiplier() {
    handwiisState.x2Active = !handwiisState.x2Active;
    updateX2ButtonState();
}

// Update x2 button visual state
function updateX2ButtonState() {
    const btn = document.getElementById('x2ToggleBtn');
    if (btn) {
        if (handwiisState.x2Active) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    }
}

// Set handwiis multiplier (deprecated, kept for compatibility)
function setHandwiisMultiplier(teamNum, multiplier) {
    // No longer used - kept to avoid errors
}

// Add handwiis to team
function addHandwiis(value) {
    const teamNum = handwiisState.selectedTeam;
    if (!teamNum) return;

    if (!game.selectedGameType) {
        alert('Bitte wähle e Jass us bevor du e Wii uselösch');
        return;
    }

    const gameWeight = game.gameWeights[handwiisState.selectedSuit] || 1;
    const x2Multiplier = handwiisState.x2Active ? 2 : 1;
    const finalValue = value * gameWeight * x2Multiplier;

    const teamKey = teamNum === 1 ? 'team1' : 'team2';
    game[teamKey].score += finalValue;

    // Track in round
    if (!game.selectedHandwiis) {
        game.selectedHandwiis = [];
    }
    game.selectedHandwiis.push({
        team: teamNum,
        suit: handwiisState.selectedSuit,
        value: value,
        gameWeight: gameWeight,
        x2Multiplier: x2Multiplier,
        finalValue: finalValue
    });

    // Reset state
    handwiisState.selectedTeam = null;
    handwiisState.x2Active = false;
    updateX2ButtonState();

    // Remove active state from team buttons
    const buttons = document.querySelectorAll('.team-wiis-btn');
    buttons.forEach(btn => btn.classList.remove('active'));

    // Hide the Wiis entry section
    const wiisSection = document.getElementById('wiisEntrySection');
    if (wiisSection) {
        wiisSection.classList.add('hidden');
    }

    // Update UI
    saveGame();
    updateUI();
}

function cancelHandwiisSelection() {
    // Reset handwiis state
    handwiisState.selectedTeam = null;
    handwiisState.selectedSuit = null;
    handwiisState.x2Active = false;
    updateX2ButtonState();

    // Remove active state from team buttons
    const buttons = document.querySelectorAll('.team-wiis-btn');
    buttons.forEach(btn => btn.classList.remove('active'));

    // Hide the Wiis entry section
    const wiisSection = document.getElementById('wiisEntrySection');
    if (wiisSection) {
        wiisSection.classList.add('hidden');
    }
}

// Undo last round
function undoRound(roundNum) {
    const roundIndex = game.rounds.findIndex(r => r.roundNumber === roundNum);
    if (roundIndex !== -1) {
        const round = game.rounds[roundIndex];
        // Use weighted scores if available, otherwise fall back to original scores for backwards compatibility
        const team1ToSubtract = round.weightedTeam1Score || round.team1Score;
        const team2ToSubtract = round.weightedTeam2Score || round.team2Score;

        game.team1.score -= team1ToSubtract;
        game.team2.score -= team2ToSubtract;
        game.rounds.splice(roundIndex, 1);

        saveGame();
        updateUI();
    }
}

// Toggle settings
function toggleSettings() {
    const settingsContent = document.getElementById('settingsContent');
    settingsContent.classList.toggle('show');
    if (settingsContent.classList.contains('show')) {
        renderGameTypeOptions();
    }
}

// Render game type options (checkboxes)
function renderGameTypeOptions() {
    const container = document.getElementById('gameTypeOptions');
    if (!container) return;

    container.innerHTML = '';
    JASS_TYPES.forEach((gameType, index) => {
        const isSelected = game.selectedGames.has(gameType);
        const div = document.createElement('div');
        div.className = 'game-checkbox';

        let displayText = gameType;
        if (['Eichle', 'Rose', 'Schelle', 'Schilte'].includes(gameType)) {
            if (game.cardType === 'french') {
                displayText = CARD_EMOJI[gameType];
            } else {
                displayText = `<img src="../../common/img/${gameType}.png" alt="${gameType}" class="game-icon">`;
            }
        }

        const weight = game.gameWeights[gameType] || 1;

        // Create checkbox
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `game-${index}`;
        checkbox.checked = isSelected;
        checkbox.onchange = () => toggleGameType(gameType);

        // Create label
        const label = document.createElement('label');
        label.htmlFor = `game-${index}`;
        label.innerHTML = displayText;

        // Create weight input
        const weightInput = document.createElement('input');
        weightInput.type = 'number';
        weightInput.className = 'game-weight-input';
        weightInput.value = weight;
        weightInput.min = 1;
        weightInput.max = 20;
        weightInput.placeholder = 'Weight';
        weightInput.onchange = () => updateGameWeight(gameType, weightInput.value);

        div.appendChild(checkbox);
        div.appendChild(label);
        div.appendChild(weightInput);
        container.appendChild(div);
    });
}

// Toggle game type
function toggleGameType(gameType) {
    if (game.selectedGames.has(gameType)) {
        game.selectedGames.delete(gameType);
    } else {
        game.selectedGames.add(gameType);
    }
    saveGame();
    renderGameTypeOptions();
}

// Update game weight
function updateGameWeight(gameType, weight) {
    game.gameWeights[gameType] = parseInt(weight) || 1;
    saveGame();
}

// Set card type
function setCardType(type) {
    game.cardType = type;
    document.getElementById('cardType-german').classList.toggle('active', type === 'german');
    document.getElementById('cardType-french').classList.toggle('active', type === 'french');
    saveGame();
    renderGameTypeOptions();
    updateUI();
}

// Reset game
function resetGame() {
    if (confirm('Wetsch würkli alli pünkt lösche?')) {
        game = {
            team1: {
                name: game.team1.name,
                score: 0
            },
            team2: {
                name: game.team2.name,
                score: 0
            },
            rounds: [],
            currentRound: 1
        };

        saveGame();
        updateUI();
    }
}

// Render history table
function renderHistoryTable() {
    const container = document.getElementById('historyTableContainer');

    // Check if there are any pending Wiis even if no rounds are locked yet
    const hasPendingWiis = game.selectedHandwiis && game.selectedHandwiis.length > 0;

    if (game.rounds.length === 0 && !hasPendingWiis) {
        container.innerHTML = '<p style="text-align: center; color: #999;">Kein Rundi yet...</p>';
        return;
    }

    let html = `
        <table class="history-table">
            <thead>
                <tr>
                    <th>Rundi</th>
    `;

    // Add header for each round
    game.rounds.forEach(round => {
        html += `<th>#${round.roundNumber}</th>`;
    });

    // Add current round column
    html += `<th>Dia Rundi</th>`;

    html += `
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td class="field-label">Jass</td>
    `;

    // Check if we're in edit mode for current Wiis
    const isEditingCurrent = localStorage.getItem('edit-current') === 'true';

    // Game row
    game.rounds.forEach(round => {
        const editModeKey = `edit-round-${round.roundNumber}`;
        const isEditing = localStorage.getItem(editModeKey) === 'true';

        let gameDisplay = round.gameType || JASS_TYPES[0];
        if (['Eichle', 'Rose', 'Schelle', 'Schilte'].includes(gameDisplay)) {
            if (game.cardType === 'french') {
                gameDisplay = CARD_EMOJI[gameDisplay];
            } else {
                gameDisplay = `<img src="../../common/img/${gameDisplay}.png" alt="${gameDisplay}" style="height: 20px;">`;
            }
        }

        if (isEditing) {
            const gameOptions = Array.from(game.selectedGames).map(g =>
                `<option value="${g}" ${g === round.gameType ? 'selected' : ''}>${g}</option>`
            ).join('');
            html += `<td><select id="game-${round.roundNumber}" class="edit-select">${gameOptions}</select></td>`;
        } else {
            html += `<td>${gameDisplay}</td>`;
        }
    });

    // Add current column for game type
    let currentGameDisplay = '-';
    if (isEditingCurrent) {
        // Show dropdown when editing current Wiis
        const gameOptions = Array.from(game.selectedGames).map(g =>
            `<option value="${g}" ${g === game.selectedGameType ? 'selected' : ''}>${g}</option>`
        ).join('');
        currentGameDisplay = `<select id="current-game" class="edit-select">${gameOptions}</select>`;
    } else if (game.selectedGameType) {
        // Show image for German cards, otherwise show game display
        if (['Eichle', 'Rose', 'Schelle', 'Schilte'].includes(game.selectedGameType)) {
            if (game.cardType === 'french') {
                currentGameDisplay = CARD_EMOJI[game.selectedGameType];
            } else {
                currentGameDisplay = `<img src="../../common/img/${game.selectedGameType}.png" alt="${game.selectedGameType}" style="height: 20px;">`;
            }
        } else {
            currentGameDisplay = getGameDisplay(game.selectedGameType);
        }
    }
    html += `<td class="current-column">${currentGameDisplay}</td>`;

    html += `
                </tr>
                <tr>
                    <td class="field-label">${game.team1.name}</td>
    `;

    // Team 1 row
    game.rounds.forEach(round => {
        const editModeKey = `edit-round-${round.roundNumber}`;
        const isEditing = localStorage.getItem(editModeKey) === 'true';

        let cellContent = '';
        if (isEditing) {
            const team1Wiis = round.handwiis ? round.handwiis.filter(w => w.team === 1) : [];
            const team1WiisTotal = team1Wiis.reduce((sum, w) => sum + w.finalValue, 0);
            cellContent = `
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    <div style="display: flex; gap: 5px; align-items: center;">
                        <label style="font-size: 0.8em; width: 40px;">Wiis:</label>
                        <input type="number" id="wiis1-${round.roundNumber}" class="edit-input" value="${team1WiisTotal}" min="0" style="flex: 1;">
                    </div>
                    <div style="display: flex; gap: 5px; align-items: center;">
                        <label style="font-size: 0.8em; width: 40px;">Score:</label>
                        <input type="number" id="team1-${round.roundNumber}" class="edit-input" value="${round.team1Score}" oninput="updateTeam2InEdit(${round.roundNumber})" style="flex: 1;">
                    </div>
                </div>
            `;
        } else {
            // Show wiis (if any) higher and score lower
            const team1Wiis = round.handwiis ? round.handwiis.filter(w => w.team === 1) : [];
            const wiisTotal = team1Wiis.reduce((sum, w) => sum + w.finalValue, 0);

            if (wiisTotal > 0) {
                cellContent = `<div class="team-cell"><div class="wiis-value">${wiisTotal}</div><div class="score-value">${round.team1Score}</div></div>`;
            } else {
                cellContent = round.team1Score;
            }
        }
        html += `<td>${cellContent}</td>`;
    });

    // Current column for Team 1
    const currentTeam1Wiis = game.selectedHandwiis ? game.selectedHandwiis.filter(w => w.team === 1) : [];
    const currentTeam1WiisTotal = currentTeam1Wiis.reduce((sum, w) => sum + w.finalValue, 0);
    let currentTeam1Content = '';
    if (isEditingCurrent) {
        currentTeam1Content = `<input type="number" id="current-wiis1" class="edit-input" value="${currentTeam1WiisTotal}" min="0">`;
    } else if (currentTeam1WiisTotal > 0) {
        currentTeam1Content = `<div class="team-cell"><div class="wiis-value">${currentTeam1WiisTotal}</div></div>`;
    }
    html += `<td class="current-column">${currentTeam1Content}</td>`;

    html += `
                </tr>
                <tr>
                    <td class="field-label">${game.team2.name}</td>
    `;

    // Team 2 row
    game.rounds.forEach(round => {
        const editModeKey = `edit-round-${round.roundNumber}`;
        const isEditing = localStorage.getItem(editModeKey) === 'true';

        let cellContent = '';
        if (isEditing) {
            const team2Wiis = round.handwiis ? round.handwiis.filter(w => w.team === 2) : [];
            const team2WiisTotal = team2Wiis.reduce((sum, w) => sum + w.finalValue, 0);
            cellContent = `
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    <div style="display: flex; gap: 5px; align-items: center;">
                        <label style="font-size: 0.8em; width: 40px;">Wiis:</label>
                        <input type="number" id="wiis2-${round.roundNumber}" class="edit-input" value="${team2WiisTotal}" min="0" style="flex: 1;">
                    </div>
                    <div style="display: flex; gap: 5px; align-items: center;">
                        <label style="font-size: 0.8em; width: 40px;">Score:</label>
                        <input type="number" id="team2-${round.roundNumber}" class="edit-input" value="${round.team2Score}" oninput="updateTeam1InEdit(${round.roundNumber})" style="flex: 1;">
                    </div>
                </div>
            `;
        } else {
            // Show wiis (if any) higher and score lower
            const team2Wiis = round.handwiis ? round.handwiis.filter(w => w.team === 2) : [];
            const wiisTotal = team2Wiis.reduce((sum, w) => sum + w.finalValue, 0);

            if (wiisTotal > 0) {
                cellContent = `<div class="team-cell"><div class="wiis-value">${wiisTotal}</div><div class="score-value">${round.team2Score}</div></div>`;
            } else {
                cellContent = round.team2Score;
            }
        }
        html += `<td>${cellContent}</td>`;
    });

    // Current column for Team 2
    const currentTeam2Wiis = game.selectedHandwiis ? game.selectedHandwiis.filter(w => w.team === 2) : [];
    const currentTeam2WiisTotal = currentTeam2Wiis.reduce((sum, w) => sum + w.finalValue, 0);
    let currentTeam2Content = '';
    if (isEditingCurrent) {
        currentTeam2Content = `<input type="number" id="current-wiis2" class="edit-input" value="${currentTeam2WiisTotal}" min="0">`;
    } else if (currentTeam2WiisTotal > 0) {
        currentTeam2Content = `<div class="team-cell"><div class="wiis-value">${currentTeam2WiisTotal}</div></div>`;
    }
    html += `<td class="current-column">${currentTeam2Content}</td>`;

    html += `
                </tr>
                <tr>
                    <td class="field-label"></td>
    `;

    // Action row
    game.rounds.forEach(round => {
        const editModeKey = `edit-round-${round.roundNumber}`;
        const isEditing = localStorage.getItem(editModeKey) === 'true';

        if (isEditing) {
            html += `
                <td>
                    <button class="save-btn" onclick="saveRoundEdit(${round.roundNumber})">Speichere</button>
                    <button class="cancel-btn" onclick="cancelRoundEdit(${round.roundNumber})">Abbruch</button>
                </td>
            `;
        } else {
            html += `<td><button class="edit-btn" onclick="enterRoundEditMode(${round.roundNumber})">Korrigiere</button></td>`;
        }
    });

    // Current column action
    if (isEditingCurrent) {
        html += `
            <td class="current-column">
                <button class="save-btn" onclick="saveCurrentWiisEdit()">Speichere</button>
                <button class="cancel-btn" onclick="cancelCurrentWiisEdit()">Abbruch</button>
            </td>
        `;
    } else {
        const hasPendingWiis = (currentTeam1WiisTotal > 0 || currentTeam2WiisTotal > 0);
        if (hasPendingWiis) {
            html += `<td class="current-column"><button class="edit-btn" onclick="enterCurrentEditMode()">Korrigiere</button></td>`;
        } else {
            html += `<td class="current-column"></td>`;
        }
    }

    html += `
                </tr>
            </tbody>
        </table>
`;

    container.innerHTML = html;

    // Add scroll sync for sticky first column
    const wrapper = document.querySelector('.table-scroll-wrapper');
    if (wrapper) {
        wrapper.addEventListener('scroll', syncFirstColumnScroll);
    }
}

function syncFirstColumnScroll() {
    // This is a backup sync in case sticky doesn't work
    // The sticky CSS should handle most cases
}

// Enter edit mode for current pending Wiis
function enterCurrentEditMode() {
    localStorage.setItem('edit-current', 'true');
    renderHistoryTable();
}

// Cancel edit mode for current pending Wiis
function cancelCurrentWiisEdit() {
    localStorage.removeItem('edit-current');
    renderHistoryTable();
}

// Save current pending Wiis
function saveCurrentWiisEdit() {
    const currentWiis1 = parseInt(document.getElementById('current-wiis1').value) || 0;
    const currentWiis2 = parseInt(document.getElementById('current-wiis2').value) || 0;
    const currentGameSelect = document.getElementById('current-game');
    const newGameType = currentGameSelect ? currentGameSelect.value : game.selectedGameType;

    // Clear existing pending Wiis
    game.selectedHandwiis = [];

    // Update game type if changed
    game.selectedGameType = newGameType;

    // Add updated Wiis
    if (currentWiis1 > 0) {
        game.selectedHandwiis.push({
            team: 1,
            value: currentWiis1,
            finalValue: currentWiis1
        });
        game.team1.score = (game.team1.score || 0) + currentWiis1;
    }
    if (currentWiis2 > 0) {
        game.selectedHandwiis.push({
            team: 2,
            value: currentWiis2,
            finalValue: currentWiis2
        });
        game.team2.score = (game.team2.score || 0) + currentWiis2;
    }

    localStorage.removeItem('edit-current');
    saveGame();
    updateUI();
}

// Enter edit mode for a round
function enterRoundEditMode(roundNum) {
    localStorage.setItem(`edit-round-${roundNum}`, 'true');
    renderHistoryTable();
}

// Cancel edit mode
function cancelRoundEdit(roundNum) {
    localStorage.removeItem(`edit-round-${roundNum}`);
    renderHistoryTable();
}

// Update Team 2 score in edit mode
function updateTeam2InEdit(roundNum) {
    const team1Input = document.getElementById(`team1-${roundNum}`);
    const team2Input = document.getElementById(`team2-${roundNum}`);

    const team1Score = parseInt(team1Input.value) || 0;

    if (team1Score === 257) {
        team2Input.value = 0;
    } else if (team1Score > 0) {
        team2Input.value = 157 - team1Score;
    } else {
        team2Input.value = '';
    }
}

// Update Team 1 score in edit mode
function updateTeam1InEdit(roundNum) {
    const team1Input = document.getElementById(`team1-${roundNum}`);
    const team2Input = document.getElementById(`team2-${roundNum}`);

    const team2Score = parseInt(team2Input.value) || 0;

    if (team2Score === 257) {
        team1Input.value = 0;
    } else if (team2Score > 0) {
        team1Input.value = 157 - team2Score;
    } else {
        team1Input.value = '';
    }
}

// Save round edit
function saveRoundEdit(roundNum) {
    const team1Input = document.getElementById(`team1-${roundNum}`);
    const team2Input = document.getElementById(`team2-${roundNum}`);
    const gameSelect = document.getElementById(`game-${roundNum}`);
    const wiis1Input = document.getElementById(`wiis1-${roundNum}`);
    const wiis2Input = document.getElementById(`wiis2-${roundNum}`);

    const round = game.rounds.find(r => r.roundNumber === roundNum);
    if (!round) return;

    const newTeam1Score = parseInt(team1Input.value) || 0;
    const newTeam2Score = parseInt(team2Input.value) || 0;
    const newGameType = gameSelect ? gameSelect.value : round.gameType;
    const newGameWeight = game.gameWeights[newGameType] || 1;
    const newWiis1 = parseInt(wiis1Input.value) || 0;
    const newWiis2 = parseInt(wiis2Input.value) || 0;

    // Subtract old weighted scores
    const oldTeam1ToSubtract = round.weightedTeam1Score || round.team1Score;
    const oldTeam2ToSubtract = round.weightedTeam2Score || round.team2Score;
    game.team1.score -= oldTeam1ToSubtract;
    game.team2.score -= oldTeam2ToSubtract;

    // Subtract old Wiis
    const oldTeam1Wiis = round.handwiis ? round.handwiis.filter(w => w.team === 1) : [];
    const oldTeam2Wiis = round.handwiis ? round.handwiis.filter(w => w.team === 2) : [];
    oldTeam1Wiis.forEach(w => game.team1.score -= w.finalValue);
    oldTeam2Wiis.forEach(w => game.team2.score -= w.finalValue);

    // Update round with new values
    round.team1Score = newTeam1Score;
    round.team2Score = newTeam2Score;
    round.gameType = newGameType;
    round.gameWeight = newGameWeight;
    round.weightedTeam1Score = newTeam1Score * newGameWeight;
    round.weightedTeam2Score = newTeam2Score * newGameWeight;

    // Add new weighted scores
    game.team1.score += round.weightedTeam1Score;
    game.team2.score += round.weightedTeam2Score;

    // Update Wiis
    round.handwiis = [];
    if (newWiis1 > 0) {
        round.handwiis.push({
            team: 1,
            value: newWiis1,
            finalValue: newWiis1
        });
        game.team1.score += newWiis1;
    }
    if (newWiis2 > 0) {
        round.handwiis.push({
            team: 2,
            value: newWiis2,
            finalValue: newWiis2
        });
        game.team2.score += newWiis2;
    }

    localStorage.removeItem(`edit-round-${roundNum}`);
    saveGame();
    updateUI();
}

// Update target points
function updateTargetPoints(value) {
    game.targetPoints = parseInt(value) || 2500;
    saveGame();
    updateUI();
}

// Update UI
function updateUI() {
    // Update team names and scores
    document.getElementById('team1NameDisplay').textContent = game.team1.name;
    document.getElementById('team1NameInput').value = game.team1.name;
    document.getElementById('team1Score').textContent = game.team1.score;

    document.getElementById('team2NameDisplay').textContent = game.team2.name;
    document.getElementById('team2NameInput').value = game.team2.name;
    document.getElementById('team2Score').textContent = game.team2.score;

    // Update Wiis button team labels
    const team1WiisLabel = document.getElementById('team1-label-wiis');
    const team2WiisLabel = document.getElementById('team2-label-wiis');
    if (team1WiisLabel) team1WiisLabel.textContent = game.team1.name;
    if (team2WiisLabel) team2WiisLabel.textContent = game.team2.name;

    // Update target points and difference
    const diff1 = Math.max(0, game.targetPoints - game.team1.score);
    const diff2 = Math.max(0, game.targetPoints - game.team2.score);

    const targetScoreValueEl = document.getElementById('targetScoreValue');
    const team1DiffEl = document.getElementById('team1Diff');
    const team2DiffEl = document.getElementById('team2Diff');

    if (targetScoreValueEl) targetScoreValueEl.textContent = game.targetPoints;
    if (team1DiffEl) team1DiffEl.textContent = diff1;
    if (team2DiffEl) team2DiffEl.textContent = diff2;

    // Update target points input in settings
    const targetInput = document.getElementById('targetPoints');
    if (targetInput) targetInput.value = game.targetPoints;

    // Update round number
    document.getElementById('roundNumber').textContent = game.currentRound;

    // Render game type buttons
    renderGameTypeButtons();

    // Render history table
    renderHistoryTable();
}

// Render game type buttons
function renderGameTypeButtons() {
    const container = document.getElementById('game-type-buttons');
    if (!container) return;

    container.innerHTML = '';

    // Ensure selectedGames is a Set
    if (!(game.selectedGames instanceof Set)) {
        game.selectedGames = new Set(game.selectedGames || JASS_TYPES);
    }

    const availableGames = Array.from(game.selectedGames);

    availableGames.forEach(gameType => {
        const button = document.createElement('button');
        button.className = `game-type-btn ${gameType === game.selectedGameType ? 'active' : ''}`;
        button.onclick = () => selectGameType(gameType);

        let displayText = gameType;
        if (['Eichle', 'Rose', 'Schelle', 'Schilte'].includes(gameType)) {
            if (game.cardType === 'french') {
                displayText = CARD_EMOJI[gameType];
            } else {
                displayText = `<img src="../../common/img/${gameType}.png" alt="${gameType}" style="height: 20px;">`;
            }
        }

        button.innerHTML = displayText;
        container.appendChild(button);
    });
}

// Select game type
function selectGameType(gameType) {
    game.selectedGameType = gameType;
    saveGame();
    renderGameTypeButtons();
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', loadGame);