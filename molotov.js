// Game state
let game = {
    players: [],
    scores: {},
    roundScores: {},
    rounds: [],
    bonuses: [], // Store all bonuses as separate entries (not tied to rounds)
    currentRound: 1
};

// Load game from localStorage
function loadGame() {
    const saved = localStorage.getItem('jassGame');
    if (saved) {
        game = JSON.parse(saved);
        // Initialize roundScores if it doesn't exist
        if (!game.roundScores) {
            game.roundScores = {};
            game.players.forEach(player => {
                game.roundScores[player] = 0;
            });
        }
        // Initialize bonuses array if it doesn't exist
        if (!game.bonuses) {
            game.bonuses = [];
        }
        updateUI();
    }
}

// Save game to localStorage
function saveGame() {
    localStorage.setItem('jassGame', JSON.stringify(game));
}

// Add a new player
function addPlayer() {
    const input = document.getElementById('playerInput');
    const name = input.value.trim();

    if (!name) {
        alert('Please enter a player name');
        return;
    }

    if (game.players.includes(name)) {
        alert('Player already exists!');
        return;
    }

    game.players.push(name);
    game.scores[name] = 0;
    game.roundScores = game.roundScores || {};
    game.roundScores[name] = 0;
    input.value = '';

    saveGame();
    updateUI();
}

// Remove a player
function removePlayer(name) {
    if (confirm(`${name} vom Spiel entferne?`)) {
        game.players = game.players.filter(p => p !== name);
        delete game.scores[name];
        delete game.roundScores[name];
        game.rounds = game.rounds.map(round => {
            const { [name]: _, ...rest } = round;
            return rest;
        });

        saveGame();
        updateUI();
    }
}

// Edit player name
function editPlayerName(oldName) {
    const newName = prompt(`Gib en neue Name für ${oldName} i:`, oldName);

    if (newName && newName.trim() && newName !== oldName) {
        const newNameTrimmed = newName.trim();

        if (game.players.includes(newNameTrimmed)) {
            alert('De Name wird scho verwendet!');
            return;
        }

        // Update in players array
        const index = game.players.indexOf(oldName);
        game.players[index] = newNameTrimmed;

        // Update scores
        game.scores[newNameTrimmed] = game.scores[oldName];
        delete game.scores[oldName];
        game.roundScores[newNameTrimmed] = game.roundScores[oldName];
        delete game.roundScores[oldName];

        // Update rounds
        game.rounds = game.rounds.map(round => {
            if (oldName in round) {
                round[newNameTrimmed] = round[oldName];
                delete round[oldName];
            }
            return round;
        });

        saveGame();
        updateUI();
    }
}

// Submit a round
function submitRound() {
    if (game.players.length === 0) {
        alert('Bitte füeg zerscht Spieler hinzue!');
        return;
    }

    const roundData = {};
    let totalPoints = 0;
    let hasValidInput = false;

    for (const player of game.players) {
        const input = document.getElementById(`score-${player}`);
        const value = input.value.trim();

        // Default to 0 if empty
        let score = 0;
        if (value !== '') {
            score = parseInt(value);
            if (isNaN(score)) {
                alert(`Invalid score for ${player}`);
                return;
            }
        }

        roundData[player] = score;
        totalPoints += score;
        game.scores[player] += score;
        game.roundScores[player] = score;
        hasValidInput = true;
    }

    // If total is not 157, ask for confirmation
    if (totalPoints !== 157) {
        const confirmSubmit = confirm(
            `Rundi total het ${totalPoints} vo 157 pünkt.\n Wotsch si trotzdem speichere?`
        );
        if (!confirmSubmit) {
            return;
        }
    }

    if (hasValidInput) {
        const roundWithoutBonuses = {
            ...roundData,
            roundNumber: game.currentRound
        };
        game.rounds.push(roundWithoutBonuses);
        game.currentRound++;

        // Clear inputs
        for (const player of game.players) {
            document.getElementById(`score-${player}`).value = '';
        }

        // Reset bonus selections
        window.handweisSelectedPlayer = null;
        window.tischweisSelectedPlayer = null;

        saveGame();
        updateUI();
    }
}

// Reset the entire game (keeps player names, resets scores and rounds)
function resetGame() {
    if (confirm('Bisch der sicher das spiel neu starte wetsch? D Spielername bliebe erhalte, aber alli pünkt werdend glöscht.')) {
        // Keep players but reset scores and rounds
        const playersToKeep = game.players;
        game = {
            players: playersToKeep,
            scores: {},
            roundScores: {},
            rounds: [],
            bonuses: [],
            currentRound: 1
        };

        // Reset scores to 0
        playersToKeep.forEach(player => {
            game.scores[player] = 0;
            game.roundScores[player] = 0;
        });

        saveGame();
        updateUI();
    }
}

// Update all UI elements
function updateUI() {
    updatePlayersList();
    updateScoresDisplay();
    updateRoundEntry();
    updateRoundsHistory();
}

// Recalculate cumulative scores from all rounds and bonuses
function recalculateScores() {
    // Reset scores
    game.players.forEach(player => {
        game.scores[player] = 0;
    });

    // Add scores from all rounds
    game.rounds.forEach(round => {
        game.players.forEach(player => {
            if (round[player] !== undefined) {
                game.scores[player] += round[player];
            }
        });
    });

    // Add bonuses to scores
    game.bonuses.forEach(bonus => {
        const value = bonus.value.replace(/[^0-9-]/g, ''); // Extract number
        const numValue = parseInt(value);
        if (!isNaN(numValue)) {
            game.scores[bonus.player] += numValue;
        }
    });
}

// Update players list
function updatePlayersList() {
    const playersList = document.getElementById('playersList');

    if (game.players.length === 0) {
        playersList.innerHTML = '<p class="empty-message">No kei Spieler!</p>';
        return;
    }

    playersList.innerHTML = game.players.map(player => `
        <div class="player-tag">
            <span onclick="editPlayerName('${player}')" class="player-name-editable">
                ${player}
            </span>
            <button onclick="removePlayer('${player}')">Entferne</button>
        </div>
    `).join('');
}

// Update scores display
function updateScoresDisplay() {
    const scoresGrid = document.getElementById('scoresGrid');

    if (game.players.length === 0) {
        scoresGrid.innerHTML = '<p class="empty-message">Füeg Spieler i de Istellige hinzue zum ihri pünkt z gseh.</p>';
        return;
    }

    // Calculate rankings - lowest score is 1st place
    const playerScores = game.players.map(p => ({
        player: p,
        score: game.scores[p]
    })).sort((a, b) => a.score - b.score);

    const rankings = {};
    let currentRank = 1;
    let previousScore = null;

    playerScores.forEach((item, index) => {
        // If score is different from previous, update rank to current position
        if (item.score !== previousScore) {
            currentRank = index + 1;
            previousScore = item.score;
        }
        rankings[item.player] = currentRank;
    });

    // Sort players by rank
    const sortedPlayers = game.players.sort((a, b) => rankings[a] - rankings[b]);

    scoresGrid.innerHTML = sortedPlayers.map(player => {
        const cumulativeScore = game.scores[player];
        const displayScore = Math.ceil(cumulativeScore / 10);
        const lastRoundScore = game.roundScores && game.roundScores[player] ? game.roundScores[player] : 0;
        const displayLastRound = Math.ceil(lastRoundScore / 10);
        const rank = rankings[player];

        // Sum handweis and tischweis values from bonuses array
        let handweisTotal = 0;
        let tischweisTotal = 0;

        for (const bonus of game.bonuses) {
            if (bonus.player === player) {
                const value = bonus.value.replace(/[^0-9-]/g, ''); // Extract number
                const numValue = parseInt(value);
                if (!isNaN(numValue)) {
                    if (bonus.type === 'handweis') {
                        handweisTotal += numValue;
                    } else {
                        tischweisTotal += numValue;
                    }
                }
            }
        }

        // Apply rounding to match score display format
        const displayHandweis = Math.ceil(handweisTotal / 10);
        const displayTischweis = Math.ceil(tischweisTotal / 10);

        return `
            <div class="score-card">
                <div class="rank-badge">${rank}</div>
                <div class="player-name" onclick="editPlayerName('${player}')">
                    ${player}
                </div>
                <div class="score-value">${displayScore}</div>
                <div class="last-round-score">lest rundi es ${displayLastRound} gschribe</div>
                <div class="bonus-stats">
                    <span class="handweis-stat">👋 ${displayHandweis}</span>
                    <span class="tischweis-stat">🏓 ${displayTischweis}</span>
                </div>
            </div>
        `;
    }).join('');
}

// Update round entry table
function updateRoundEntry() {
    const playerHeaders = document.getElementById('playerHeaders');
    const scoreInputs = document.getElementById('scoreInputs');
    const roundNumber = document.getElementById('roundNumber');
    const handweisPlayers = document.getElementById('handweis-players');
    const tischweisPlayers = document.getElementById('tischweis-players');

    roundNumber.textContent = game.currentRound;

    if (game.players.length === 0) {
        playerHeaders.innerHTML = '';
        scoreInputs.innerHTML = '';
        if (handweisPlayers) handweisPlayers.innerHTML = '';
        if (tischweisPlayers) tischweisPlayers.innerHTML = '';
        return;
    }

    playerHeaders.innerHTML = game.players.map(player => `
        <th>${player}</th>
    `).join('');

    scoreInputs.innerHTML = game.players.map(player => `
        <td data-player="${player}">
            <input 
                type="number" 
                id="score-${player}" 
                placeholder="0"
                min="-500"
                max="500"
                oninput="updateRemainingPoints()"
            />
        </td>
    `).join('');

    // Update player buttons for bonuses
    const playerButtons = game.players.map(p => `<button class="player-btn" onclick="selectBonusPlayer('handweis', '${p}');" data-player="${p}">${p}</button>`).join('');
    if (handweisPlayers) handweisPlayers.innerHTML = playerButtons;

    const playerButtons2 = game.players.map(p => `<button class="player-btn" onclick="selectBonusPlayer('tischweis', '${p}');" data-player="${p}">${p}</button>`).join('');
    if (tischweisPlayers) tischweisPlayers.innerHTML = playerButtons2;
}

// Update rounds history
function updateRoundsHistory() {
    const historyWrapper = document.getElementById('roundsHistoryWrapper');

    if (game.rounds.length === 0 && game.bonuses.length === 0) {
        historyWrapper.innerHTML = '<p class="empty-message">De Rundeverlauf isch no leer. Füg dini erschte Rundi obe i!</p>';
        return;
    }

    // Get all unique round numbers that have either bonuses or submitted rounds
    const roundNumbers = new Set();
    game.rounds.forEach(r => roundNumbers.add(r.roundNumber));
    game.bonuses.forEach(b => roundNumbers.add(b.roundNumber));
    const sortedRounds = Array.from(roundNumbers).sort((a, b) => a - b);

    // Get only submitted rounds
    const submittedRounds = new Set();
    game.rounds.forEach(r => submittedRounds.add(r.roundNumber));

    // Check which rounds have bonuses
    const roundsWithBonuses = new Set();
    game.bonuses.forEach(b => roundsWithBonuses.add(b.roundNumber));

    // Check which columns are in edit mode
    const editBonusMode = new Set();
    const editScoreMode = new Set();
    sortedRounds.forEach(roundNum => {
        if (localStorage.getItem(`bonus-edit-${roundNum}`) === 'true') {
            editBonusMode.add(roundNum);
        }
        if (localStorage.getItem(`score-edit-${roundNum}`) === 'true') {
            editScoreMode.add(roundNum);
        }
    });

    // Create table header with bonuses and rounds as alternating columns
    let tableHtml = '<table class="history-table"><thead><tr><th class="player-col"></th>';

    // Add bonus and round headers (only show bonus header if there are bonuses for that round)
    sortedRounds.forEach(roundNum => {
        if (roundsWithBonuses.has(roundNum)) {
            tableHtml += `<th class="bonus-col">Wiis ${roundNum}</th>`;
        }
        if (submittedRounds.has(roundNum)) {
            tableHtml += `<th class="round-col">Rundi ${roundNum}</th>`;
        }
    });

    tableHtml += '</tr></thead><tbody>';

    // Display each player as a row
    for (const player of game.players) {
        tableHtml += `<tr><td class="player-col">${player}</td>`;

        // For each round, show the bonus and score (if submitted)
        sortedRounds.forEach(roundNum => {
            // Bonus column (only if this round has bonuses)
            if (roundsWithBonuses.has(roundNum)) {
                const roundBonuses = game.bonuses.filter(b => b.roundNumber === roundNum && b.player === player);
                let cellContent = '';

                if (editBonusMode.has(roundNum)) {
                    // Edit mode: show input fields
                    let bonusValue = '';
                    if (roundBonuses.length > 0) {
                        const bonus = roundBonuses[0];
                        const value = bonus.value.replace('x2', '0');
                        const numValue = parseInt(value);
                        bonusValue = !isNaN(numValue) ? numValue : 0;
                    }
                    cellContent = `<input type="number" class="edit-input" data-round="${roundNum}" data-player="${player}" data-type="bonus" value="${bonusValue}" />`;
                } else {
                    // Display mode
                    let bonusText = '';
                    if (roundBonuses.length > 0) {
                        bonusText = roundBonuses.map(bonus => {
                            const icon = bonus.type === 'handweis' ? '👋' : '🏓';
                            const value = bonus.value.replace('x2', '0');
                            const numValue = parseInt(value);
                            const displayValue = !isNaN(numValue) ? Math.ceil(numValue / 10) : bonus.value;
                            return `${icon} ${displayValue}`;
                        }).join(', ');
                    }
                    cellContent = bonusText;
                }
                tableHtml += `<td class="bonus-cell">${cellContent}</td>`;
            }

            // Score column (only if round is submitted)
            if (submittedRounds.has(roundNum)) {
                const round = game.rounds.find(r => r.roundNumber === roundNum);
                const score = round && round[player] !== undefined ? round[player] : 0;
                const roundedScore = Math.ceil(score / 10);

                let cellContent = '';
                if (editScoreMode.has(roundNum)) {
                    // Edit mode: show input field
                    cellContent = `<input type="number" class="edit-input" data-round="${roundNum}" data-player="${player}" data-type="score" value="${score}" />`;
                } else {
                    // Display mode
                    cellContent = roundedScore.toString();
                }
                tableHtml += `<td>${cellContent}</td>`;
            }
        });

        tableHtml += '</tr>';
    }

    // Add footer row with edit/save buttons
    tableHtml += `<tr class="edit-footer-row"><td class="player-col"></td>`;
    sortedRounds.forEach(roundNum => {
        if (roundsWithBonuses.has(roundNum)) {
            if (editBonusMode.has(roundNum)) {
                tableHtml += `<td class="bonus-cell"><button onclick="saveBonusColumn(${roundNum})" class="save-btn">Speichere</button><button onclick="cancelBonusColumn(${roundNum})" class="cancel-btn">Abbruch</button></td>`;
            } else {
                tableHtml += `<td class="bonus-cell"><button onclick="enterBonusEditMode(${roundNum})" class="edit-btn">Korrigiere</button></td>`;
            }
        }
        if (submittedRounds.has(roundNum)) {
            if (editScoreMode.has(roundNum)) {
                tableHtml += `<td><button onclick="saveScoreColumn(${roundNum})" class="save-btn">Speichere</button><button onclick="cancelScoreColumn(${roundNum})" class="cancel-btn">Abbruch</button></td>`;
            } else {
                tableHtml += `<td><button onclick="enterScoreEditMode(${roundNum})" class="edit-btn">Korrigiere</button></td>`;
            }
        }
    });
    tableHtml += '</tr>';

    tableHtml += '</tbody></table>';
    historyWrapper.innerHTML = tableHtml;
}

// Enter edit mode for a round
function enterEditMode(roundNumber) {
    document.getElementById(`edit-mode-${roundNumber}`).value = 'true';
    updateUI();
    // Focus on first input
    setTimeout(() => {
        const firstInput = document.querySelector(`input[data-round="${roundNumber}"]`);
        if (firstInput) firstInput.focus();
    }, 0);
}

// Save round edits
function saveRoundEdit(roundNumber) {
    const roundIndex = game.rounds.findIndex(r => r.roundNumber === roundNumber);
    if (roundIndex === -1) return;

    const round = game.rounds[roundIndex];
    const inputs = document.querySelectorAll(`input[data-round="${roundNumber}"].edit-score-input`);

    for (const input of inputs) {
        const player = input.dataset.player;
        const newScore = parseInt(input.value);

        if (isNaN(newScore)) {
            alert(`Invalid score for ${player}`);
            return;
        }

        const oldScore = round[player] !== undefined ? round[player] : 0;
        const difference = newScore - oldScore;

        // Update cumulative score
        game.scores[player] += difference;

        // Update round data
        round[player] = newScore;
    }

    document.getElementById(`edit-mode-${roundNumber}`).value = 'false';
    saveGame();
    updateUI();
}

// Cancel round edit
function cancelRoundEdit(roundNumber) {
    document.getElementById(`edit-mode-${roundNumber}`).value = 'false';
    updateUI();
}



// Keyboard navigation - Submit on Enter
document.addEventListener('DOMContentLoaded', function () {
    loadGame();
    updateUI(); // Always update UI on page load

    document.getElementById('playerInput').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            addPlayer();
        }
    });
});

// Toggle players section visibility
function togglePlayersSection() {
    const section = document.getElementById('playersSetup');
    if (!section) {
        console.error('playersSetup element not found');
        return;
    }

    section.classList.toggle('hidden');
}
// Update remaining points display
function updateRemainingPoints() {
    let totalPoints = 0;

    for (const player of game.players) {
        const input = document.getElementById(`score-${player}`);
        const value = input.value.trim();

        if (value !== '') {
            const score = parseInt(value);
            if (!isNaN(score)) {
                totalPoints += score;
            }
        }
    }

    const remaining = 157 - totalPoints;
    const remainingElement = document.getElementById('pointsRemaining');
    remainingElement.textContent = remaining;

    // Change color based on remaining points
    remainingElement.classList.remove('remaining-green', 'remaining-red', 'remaining-blue');
    if (remaining === 0) {
        remainingElement.classList.add('remaining-green');
    } else if (remaining < 0) {
        remainingElement.classList.add('remaining-red');
    } else {
        remainingElement.classList.add('remaining-blue');
    }
}

// Toggle bonus mode dropdown
function toggleBonusMode(mode) {
    const btn = document.getElementById(`${mode}-btn`);
    const dropdown = document.getElementById(`${mode}-dropdown`);
    const otherMode = mode === 'handweis' ? 'tischweis' : 'handweis';
    const otherBtn = document.getElementById(`${otherMode}-btn`);
    const otherDropdown = document.getElementById(`${otherMode}-dropdown`);

    if (!btn || !dropdown || !otherBtn || !otherDropdown) {
        console.error(`Could not find bonus mode elements for ${mode}`);
        return;
    }

    const isHidden = dropdown.classList.contains('hidden');

    if (isHidden) {
        dropdown.classList.remove('hidden');
        btn.classList.add('active');
        otherDropdown.classList.add('hidden');
        otherBtn.classList.remove('active');
    } else {
        dropdown.classList.add('hidden');
        btn.classList.remove('active');
    }
}

// Select a player for bonus and show points buttons
function selectBonusPlayer(mode, player) {
    const pointsButtons = document.getElementById(`${mode}-points`);
    const playerButtons = document.querySelectorAll(`#${mode}-players .player-btn`);

    // Remove active class from all buttons
    playerButtons.forEach(btn => btn.classList.remove('active'));

    // Add active class to selected player
    event.target.classList.add('active');

    // Store the selected player
    window[`${mode}SelectedPlayer`] = player;

    // Show points buttons by removing hidden class
    pointsButtons.classList.remove('hidden');
}

// Toggle double mode for bonus
function toggleDoubleMode(mode) {
    const btn = document.querySelector(`#${mode}-dropdown .double-btn`);
    if (btn.classList.contains('active')) {
        btn.classList.remove('active');
        window[`${mode}DoubleMode`] = false;
    } else {
        btn.classList.add('active');
        window[`${mode}DoubleMode`] = true;
    }
}

// Apply bonus or penalty to a player's score
function applyBonus(mode, points) {
    const selectedPlayer = window[`${mode}SelectedPlayer`];

    if (!selectedPlayer) {
        alert('Zerst en Spieler uswähle!');
        return;
    }

    let bonusValue = points;

    // Double the value if 2x is enabled
    if (window[`${mode}DoubleMode`] === true) {
        bonusValue = points * 2;
    }

    // Apply directly to cumulative score
    if (mode === 'handweis') {
        game.scores[selectedPlayer] -= bonusValue;
    } else {
        game.scores[selectedPlayer] += bonusValue;
    }

    // Store the bonus for display in history
    // Store the actual bonus value applied (including doubling)
    const displayValue = mode === 'handweis' ? `-${bonusValue}` : `+${bonusValue}`;

    // Add bonus tied to the current round
    game.bonuses.push({
        type: mode,
        player: selectedPlayer,
        value: displayValue,
        roundNumber: game.currentRound
    });

    saveGame();
    updateUI();

    // Toggle off 2x button after applying bonus
    const doubleBtn = document.querySelector(`#${mode}-dropdown .double-btn`);
    if (doubleBtn && doubleBtn.classList.contains('active')) {
        doubleBtn.classList.remove('active');
        window[`${mode}DoubleMode`] = false;
    }

    // Close dropdown and reset
    const dropdown = document.getElementById(`${mode}-dropdown`);
    dropdown.classList.add('hidden');
    const btn = document.getElementById(`${mode}-btn`);
    btn.classList.remove('active');
    window[`${mode}SelectedPlayer`] = null;
}

// Enter edit mode for bonus column
function enterBonusEditMode(roundNumber) {
    // Store edit mode state for bonus column
    const editModeId = `bonus-edit-${roundNumber}`;
    localStorage.setItem(editModeId, 'true');
    updateUI();
}

// Enter edit mode for score column
function enterScoreEditMode(roundNumber) {
    // Store edit mode state for score column
    const editModeId = `score-edit-${roundNumber}`;
    localStorage.setItem(editModeId, 'true');
    updateUI();
}

// Save bonus column edits
function saveBonusColumn(roundNumber) {
    const inputs = document.querySelectorAll(`input[data-round="${roundNumber}"][data-type="bonus"]`);

    inputs.forEach(input => {
        const player = input.dataset.player;
        const value = parseInt(input.value);

        if (!isNaN(value) && value !== 0) {
            // Remove old bonuses for this player and round
            game.bonuses = game.bonuses.filter(b => !(b.roundNumber === roundNumber && b.player === player));

            // Add new bonus
            const displayValue = value > 0 ? `+${value}` : `${value}`;
            game.bonuses.push({
                type: value > 0 ? 'tischweis' : 'handweis',
                player: player,
                value: displayValue,
                roundNumber: roundNumber
            });
        }
    });

    localStorage.removeItem(`bonus-edit-${roundNumber}`);
    recalculateScores();
    saveGame();
    updateUI();
}

// Cancel bonus column edits
function cancelBonusColumn(roundNumber) {
    localStorage.removeItem(`bonus-edit-${roundNumber}`);
    updateUI();
}

// Save score column edits
function saveScoreColumn(roundNumber) {
    const inputs = document.querySelectorAll(`input[data-round="${roundNumber}"][data-type="score"]`);

    inputs.forEach(input => {
        const player = input.dataset.player;
        const value = parseInt(input.value);

        const roundIndex = game.rounds.findIndex(r => r.roundNumber === roundNumber);
        if (roundIndex !== -1 && !isNaN(value)) {
            game.rounds[roundIndex][player] = value;
        }
    });

    localStorage.removeItem(`score-edit-${roundNumber}`);
    recalculateScores();
    saveGame();
    updateUI();
}

// Cancel score column edits
function cancelScoreColumn(roundNumber) {
    localStorage.removeItem(`score-edit-${roundNumber}`);
    updateUI();
}
