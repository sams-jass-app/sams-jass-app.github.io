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
    if (confirm('Are you sure you want to reset scores and rounds? Player names will be kept.')) {
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

// Update players list
function updatePlayersList() {
    const playersList = document.getElementById('playersList');

    if (game.players.length === 0) {
        playersList.innerHTML = '<p class="empty-message">No kei Spieler!</p>';
        return;
    }

    playersList.innerHTML = game.players.map(player => `
        <div class="player-tag">
            <span onclick="editPlayerName('${player}')" style="cursor: pointer; flex: 1;">
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
    playerScores.forEach((item, index) => {
        rankings[item.player] = index + 1;
    });

    scoresGrid.innerHTML = game.players.map(player => {
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
                <div class="last-round-score">Last round: ${displayLastRound}</div>
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
        <td>
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
    const history = document.getElementById('roundsHistory');

    if (game.rounds.length === 0 && game.bonuses.length === 0) {
        history.innerHTML = '<p class="empty-message">De Rundeverlauf isch no leer. Füg dini erschte Rundi obe i!</p>';
        return;
    }

    // Create table header
    let tableHtml = '<table class="history-table"><thead><tr><th>Entry</th>';
    for (const player of game.players) {
        tableHtml += `<th>${player}</th>`;
    }
    tableHtml += '<th>Action</th></tr></thead><tbody>';

    // Helper function to display bonuses for a specific round
    function displayBonusesForRound(roundNum) {
        const roundBonuses = game.bonuses.filter(b => b.roundNumber === roundNum);
        if (roundBonuses.length === 0) return '';

        const bonusEditModeId = `bonus-edit-mode-${roundNum}`;
        const isBonusEditMode = document.getElementById(bonusEditModeId) && document.getElementById(bonusEditModeId).value === 'true';

        let bonusHtml = `<tr class="bonus-row"><td class="round-col bonus-label">Wiis</td>`;
        for (const player of game.players) {
            let bonusText = '';
            const playerBonuses = roundBonuses.filter(b => b.player === player);
            if (playerBonuses.length > 0) {
                if (isBonusEditMode) {
                    bonusText = playerBonuses.map((bonus, idx) => {
                        const icon = bonus.type === 'handweis' ? '👋' : '🏓';
                        const value = bonus.value.replace('x2', '0');
                        const numValue = parseInt(value);
                        return `<input type="number" class="edit-bonus-input" data-round="${roundNum}" data-player="${player}" data-bonus-idx="${idx}" value="${numValue}" placeholder="0" /> ${icon}`;
                    }).join(' ');
                } else {
                    bonusText = playerBonuses.map(bonus => {
                        const icon = bonus.type === 'handweis' ? '👋' : '🏓';
                        const value = bonus.value.replace('x2', '0');
                        const numValue = parseInt(value);
                        const displayValue = !isNaN(numValue) ? Math.ceil(numValue / 10) : bonus.value;
                        return `${icon} ${displayValue}`;
                    }).join(', ');
                }
            }
            bonusHtml += `<td class="bonus-cell">${bonusText}</td>`;
        }

        if (isBonusEditMode) {
            bonusHtml += `<td class="action-col"><button onclick="saveBonusEdit(${roundNum})" class="save-btn">Save</button><button onclick="cancelBonusEdit(${roundNum})" class="cancel-btn">Cancel</button><input type="hidden" id="bonus-edit-mode-${roundNum}" value="true" /></td></tr>`;
        } else {
            bonusHtml += `<td class="action-col">${roundBonuses.length > 0 ? `<button onclick="enterBonusEditMode(${roundNum})" class="correct-btn">Edit</button>` : ''}<input type="hidden" id="bonus-edit-mode-${roundNum}" value="false" /></td></tr>`;
        }
        return bonusHtml;
    }

    // If there are rounds, display them with their bonuses
    if (game.rounds.length > 0) {
        for (let i = 0; i < game.rounds.length; i++) {
            const round = game.rounds[i];
            const roundNumber = round.roundNumber;

            // Display bonuses for this round
            tableHtml += displayBonusesForRound(roundNumber);

            // Display the round row
            const { roundNumber: _, ...scores } = round;
            const editModeId = `edit-mode-${roundNumber}`;
            const isEditMode = document.getElementById(editModeId) && document.getElementById(editModeId).value === 'true';

            tableHtml += `<tr id="round-${roundNumber}"><td class="round-col">Rundi ${roundNumber}</td>`;

            for (const player of game.players) {
                const score = scores[player] !== undefined ? scores[player] : 0;
                const roundedScore = Math.ceil(score / 10);

                if (isEditMode) {
                    tableHtml += `<td><input type="number" class="edit-score-input" data-round="${roundNumber}" data-player="${player}" value="${score}" /></td>`;
                } else {
                    tableHtml += `<td>${roundedScore}</td>`;
                }
            }

            if (isEditMode) {
                tableHtml += `<td class="action-col"><button onclick="saveRoundEdit(${roundNumber})" class="save-btn">Save</button><button onclick="cancelRoundEdit(${roundNumber})" class="cancel-btn">Cancel</button><input type="hidden" id="edit-mode-${roundNumber}" value="true" /></td>`;
            } else {
                tableHtml += `<td class="action-col"><button onclick="enterEditMode(${roundNumber})" class="correct-btn">Edit</button><input type="hidden" id="edit-mode-${roundNumber}" value="false" /></td>`;
            }

            tableHtml += '</tr>';
        }

        // Also display bonuses for the current round (even if it hasn't been logged yet)
        tableHtml += displayBonusesForRound(game.currentRound);
    } else if (game.bonuses.length > 0) {
        // No rounds yet, but there are bonuses
        tableHtml += displayBonusesForRound(game.currentRound);
    }

    tableHtml += '</tbody></table>';
    history.innerHTML = tableHtml;
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

// Enter edit mode for bonus row
function enterBonusEditMode(roundNumber) {
    document.getElementById(`bonus-edit-mode-${roundNumber}`).value = 'true';
    updateUI();
    // Focus on first input
    setTimeout(() => {
        const firstInput = document.querySelector(`input[data-round="${roundNumber}"].edit-bonus-input`);
        if (firstInput) firstInput.focus();
    }, 0);
}

// Save bonus edits
function saveBonusEdit(roundNumber) {
    const inputs = document.querySelectorAll(`input[data-round="${roundNumber}"].edit-bonus-input`);
    const bonusChanges = {};

    for (const input of inputs) {
        const player = input.dataset.player;
        const bonusIdx = parseInt(input.dataset.bonusIdx);
        const newValue = parseInt(input.value);

        if (isNaN(newValue)) {
            alert(`Invalid bonus value for ${player}`);
            return;
        }

        const roundBonuses = game.bonuses.filter(b => b.roundNumber === roundNumber && b.player === player);
        if (bonusIdx < roundBonuses.length) {
            const bonus = roundBonuses[bonusIdx];
            const oldValue = parseInt(bonus.value);

            if (oldValue !== newValue) {
                const difference = newValue - oldValue;
                game.scores[player] += difference;
                bonus.value = newValue.toString();
            }
        }
    }

    document.getElementById(`bonus-edit-mode-${roundNumber}`).value = 'false';
    saveGame();
    updateUI();
}

// Cancel bonus edit
function cancelBonusEdit(roundNumber) {
    document.getElementById(`bonus-edit-mode-${roundNumber}`).value = 'false';
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

    const isHidden = section.style.display === 'none';
    section.style.display = isHidden ? 'block' : 'none';
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
    if (remaining === 0) {
        remainingElement.style.color = '#51cf66'; // Green
    } else if (remaining < 0) {
        remainingElement.style.color = '#ff6b6b'; // Red
    } else {
        remainingElement.style.color = '#667eea'; // Blue
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

    const isHidden = dropdown.style.display === 'none';

    if (isHidden) {
        dropdown.style.display = 'block';
        btn.classList.add('active');
        otherDropdown.style.display = 'none';
        otherBtn.classList.remove('active');
    } else {
        dropdown.style.display = 'none';
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

    // Show points buttons
    pointsButtons.style.display = 'flex';
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
    dropdown.style.display = 'none';
    const btn = document.getElementById(`${mode}-btn`);
    btn.classList.remove('active');
    window[`${mode}SelectedPlayer`] = null;
}
