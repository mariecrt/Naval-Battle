// Modèles de données
class Team {
    constructor(id, name) {
        this.id = id;
        this.name = name;
        this.score = 0;
        this.status = 'active'; // 'active' ou 'eliminated'
        this.color = this.getTeamColor(id);
    }

    getTeamColor(id) {
        const colors = {
            'a': '#ef4444',
            'b': '#3b82f6', 
            'c': '#10b981',
            'd': '#f59e0b'
        };
        return colors[id] || '#6b7280';
    }
}

class Ship {
    constructor(type, size, orientation, positions) {
        this.type = type;
        this.size = size;
        this.orientation = orientation; // 'H' ou 'V'
        this.positions = positions; // Array de coordonnées
        this.isSunk = false;
    }

    checkSunk(hitPositions) {
        this.isSunk = this.positions.every(pos => hitPositions.includes(pos));
        return this.isSunk;
    }
}

class Grid {
    constructor(teamId) {
        this.teamId = teamId;
        this.cells = this.initializeCells();
        this.ships = [];
        this.hitPositions = [];
    }

    initializeCells() {
        const cells = {};
        for (let x = 0; x < 5; x++) {
            for (let y = 0; y < 5; y++) {
                const coord = String.fromCharCode(65 + x) + (y + 1);
                cells[coord] = {
                    x: String.fromCharCode(65 + x),
                    y: y + 1,
                    containsShip: false,
                    alreadyAimed: false,
                    state: 'neutral' // 'neutral', 'hit', 'water'
                };
            }
        }
        return cells;
    }

    placeShip(ship) {
        // Vérifier que le placement est valide
        if (this.isValidPlacement(ship)) {
            ship.positions.forEach(pos => {
                this.cells[pos].containsShip = true;
            });
            this.ships.push(ship);
            return true;
        }
        return false;
    }

    isValidPlacement(ship) {
        // Vérifier que le bateau est dans la grille
        const validPositions = ship.positions.every(pos => {
            const x = pos.charCodeAt(0) - 65;
            const y = parseInt(pos.slice(1)) - 1;
            return x >= 0 && x < 5 && y >= 0 && y < 5;
        });

        if (!validPositions) return false;

        // Vérifier qu'il n'y a pas de chevauchement
        const noOverlap = ship.positions.every(pos => !this.cells[pos].containsShip);
        if (!noOverlap) return false;

        // Si le contact entre bateaux n'est pas autorisé, vérifier les cases adjacentes
        if (!game.settings.allowContact) {
            for (const pos of ship.positions) {
                const x = pos.charCodeAt(0) - 65;
                const y = parseInt(pos.slice(1)) - 1;
                
                // Vérifier les 8 cases adjacentes
                for (let dx = -1; dx <= 1; dx++) {
                    for (let dy = -1; dy <= 1; dy++) {
                        if (dx === 0 && dy === 0) continue; // Skip la case elle-même
                        
                        const adjX = x + dx;
                        const adjY = y + dy;
                        
                        // Vérifier si la case adjacente est dans la grille
                        if (adjX >= 0 && adjX < 5 && adjY >= 0 && adjY < 5) {
                            const adjPos = String.fromCharCode(65 + adjX) + (adjY + 1);
                            if (this.cells[adjPos].containsShip) {
                                return false; // Bateau adjacent trouvé
                            }
                        }
                    }
                }
            }
        }
        
        return true;
    }

    shoot(coord) {
        if (this.cells[coord].alreadyAimed) {
            return { result: 'already', points: 0 };
        }

        this.cells[coord].alreadyAimed = true;
        
        if (this.cells[coord].containsShip) {
            this.cells[coord].state = 'hit';
            this.hitPositions.push(coord);
            
            // Vérifier si un bateau est coulé
            const sunkShip = this.ships.find(ship => 
                ship.positions.includes(coord) && ship.checkSunk(this.hitPositions)
            );
            
            return { result: 'hit', points: 1, sunkShip };
        } else {
            this.cells[coord].state = 'water';
            return { result: 'miss', points: 0 };
        }
    }

    isEliminated() {
        return this.ships.every(ship => ship.isSunk);
    }
}

class Game {
    constructor() {
        this.teams = [
            new Team('a', 'Team A'),
            new Team('b', 'Team B'),
            new Team('c', 'Team C'),
            new Team('d', 'Team D')
        ];
        this.grids = {
            'a': new Grid('a'),
            'b': new Grid('b'),
            'c': new Grid('c'),
            'd': new Grid('d')
        };
        this.currentTeam = 'a';
        this.gameState = 'preparation'; // 'preparation', 'playing', 'finished'
        this.shotHistory = [];
        this.settings = {
            muteSounds: false,
            allowContact: true,
            showBoats: false,
            gameEnding: false
        };
        
        // Variables pour le placement par drag & drop
        this.placementMode = false;
        this.draggedShip = null;
        this.dragStartPos = null;
    }

    startGame() {
        console.log('Starting game...');
        this.gameState = 'playing';
        this.settings.gameEnding = false; // S'assurer que la partie ne se termine pas
        
        console.log('Game started');
        
        this.updateDisplay();
        this.saveState();
        console.log('Game started!');
    }



    endGame() {
        this.gameState = 'finished';
        
        // Déterminer la raison de la fin de partie
        const eliminatedTeams = this.teams.filter(team => team.status === 'eliminated');
        const reason = eliminatedTeams.length >= 3 ? 'elimination' : 'manual';
        
        console.log(`Game ended - Reason: ${reason} (${eliminatedTeams.length} teams eliminated)`);
        
        this.showVictoryScreen();
        this.saveState();
    }

    setCurrentTeam(teamId) {
        this.currentTeam = teamId;
        this.updateDisplay();
        this.saveState();
    }

    async shoot(coord) {
        if (this.gameState !== 'playing') return;

        console.log(`Shot at ${coord} by team ${this.currentTeam}`);
        const results = [];
        let totalPoints = 0;
        let hasAnyHit = false;
        let hasAnySunkShip = false;

        // Shoot at the 3 opponent grids
        Object.keys(this.grids).forEach(gridId => {
            if (gridId !== this.currentTeam) {
                const result = this.grids[gridId].shoot(coord);
                console.log(`Result on grid ${gridId}:`, result);
                results.push({ gridId, ...result });
                totalPoints += result.points;
                
                // Check if there was a hit
                if (result.result === 'hit') {
                    hasAnyHit = true;
                }
                
                // Check if a boat was sunk
                if (result.sunkShip) {
                    hasAnySunkShip = true;
                }
            }
        });

        // Update score
        const currentTeamObj = this.teams.find(team => team.id === this.currentTeam);
        currentTeamObj.score += totalPoints;
        console.log(`Score updated: ${currentTeamObj.name} = ${currentTeamObj.score} (+${totalPoints})`);

        // Check eliminations
        this.checkEliminations();

        // Add to history
        this.shotHistory.push({
            teamId: this.currentTeam,
            coord,
            results,
            pointsGained: totalPoints,
            timestamp: new Date()
        });

        // Mise à jour immédiate pour montrer l'état "en attente"
        this.updateDisplay();
        this.saveState();

        // Effets sonores et attente de la fin du son
        await this.playShotSound(results, hasAnyHit, hasAnySunkShip);

        // Mise à jour finale de l'affichage après la fin du son
        this.updateDisplay();
        this.saveState();

        return { results, totalPoints, hasAnyHit, hasAnySunkShip };
    }

    checkEliminations() {
        let hasEliminatedTeam = false;
        let eliminatedCount = 0;
        
        Object.keys(this.grids).forEach(gridId => {
            if (this.grids[gridId].isEliminated()) {
                const team = this.teams.find(t => t.id === gridId);
                if (team.status !== 'eliminated') {
                    team.status = 'eliminated';
                    hasEliminatedTeam = true;
                    eliminatedCount++;
                    console.log(`Team ${team.name} eliminated! (${eliminatedCount}/4)`);
                }
            }
        });
        
        // Vérifier si la partie doit se terminer
        if (hasEliminatedTeam && this.gameState === 'playing') {
            // Si 3 teams sont éliminées (il ne reste qu'une team), terminer la partie
            if (eliminatedCount >= 3) {
                this.settings.gameEnding = true; // Marquer que la partie se termine
                console.log('All teams except one are eliminated - Game will end after sound and animation...');
            }
        }
    }

    async playShotSound(results, hasAnyHit, hasAnySunkShip) {
        if (this.settings.muteSounds) return Promise.resolve();

        // Vérifier que le gestionnaire de sons est disponible
        if (typeof soundManager !== 'undefined') {
            let soundPromise;
            
            // Priorité 1: BigSplash si au moins un bateau entier est coulé
            if (hasAnySunkShip) {
                soundPromise = soundManager.play('bigSplash');
            }
            // Priorité 2: Hit si au moins une case est touchée (mais pas de bateau coulé)
            else if (hasAnyHit) {
                soundPromise = soundManager.play('hit');
            }
            // Priorité 3: Miss si aucune case n'a été touchée sur les 3 grilles
            else {
                soundPromise = soundManager.play('miss');
            }
            
            // Attendre la fin du son
            await soundPromise;
            
            // Si la partie doit se terminer, le faire maintenant
            if (this.settings.gameEnding) {
                console.log('Fin du son - affichage de la victoire...');
                this.endGame();
            }
            
            return soundPromise;
        } else {
            console.log('Gestionnaire de sons non disponible');
            // Si pas de son et que la partie doit se terminer, le faire immédiatement
            if (this.settings.gameEnding) {
                this.endGame();
            }
            return Promise.resolve();
        }
    }

    randomizeBoats() {
        console.log('🔄 Randomizing boats...');
        Object.keys(this.grids).forEach(gridId => {
            console.log(`Creating new grid for ${gridId}`);
            this.grids[gridId] = new Grid(gridId);
            this.placeRandomShips(gridId);
        });
        console.log('✅ Randomization completed');
        this.updateDisplay();
        this.saveState();
    }

    placeRandomShips(teamId) {
        const grid = this.grids[teamId];
        console.log(`Placement des bateaux pour ${teamId}...`);
        
        // Porte-avion (4 cases)
        let carrier;
        let attempts = 0;
        do {
            carrier = this.generateRandomShip('porte-avion', 4);
            attempts++;
            if (attempts > 100) {
                console.error(`Impossible de placer le porte-avion pour ${teamId} après 100 tentatives`);
                break;
            }
        } while (!grid.placeShip(carrier));
        
        // Corvette (2 cases)
        let corvette;
        attempts = 0;
        do {
            corvette = this.generateRandomShip('corvette', 2);
            attempts++;
            if (attempts > 100) {
                console.error(`Impossible de placer la corvette pour ${teamId} après 100 tentatives`);
                break;
            }
        } while (!grid.placeShip(corvette));
        
        console.log(`✅ Boats placed for ${teamId}:`);
        console.log(`  - Carrier (${carrier.orientation}):`, carrier.positions);
        console.log(`  - Corvette (${corvette.orientation}):`, corvette.positions);
        console.log(`Total boats in grid:`, grid.ships.length);
    }

    generateRandomShip(type, size) {
        const orientation = Math.random() < 0.5 ? 'H' : 'V';
        let positions = [];
        
        // Générer des positions valides
        const maxX = orientation === 'H' ? 5 - size : 4; // 0-4 pour horizontal, 0-4 pour vertical
        const maxY = orientation === 'V' ? 5 - size : 4; // 0-4 pour vertical, 0-4 pour horizontal
        
        const startX = Math.floor(Math.random() * (maxX + 1));
        const startY = Math.floor(Math.random() * (maxY + 1));
        
        positions = [];
        for (let i = 0; i < size; i++) {
            const x = String.fromCharCode(65 + startX + (orientation === 'H' ? i : 0));
            const y = startY + (orientation === 'V' ? i : 0) + 1;
            positions.push(x + y);
        }
        
        return new Ship(type, size, orientation, positions);
    }

    isValidShipPosition(positions) {
        // Vérifier que toutes les positions sont dans la grille
        return positions.every(pos => {
            const x = pos.charCodeAt(0) - 65;
            const y = parseInt(pos.slice(1)) - 1;
            return x >= 0 && x < 5 && y >= 0 && y < 5;
        });
    }

    undoLastShot() {
        if (this.shotHistory.length === 0) return;

        const lastShot = this.shotHistory.pop();
        
        // Restaurer les scores
        this.teams.find(team => team.id === lastShot.teamId).score -= lastShot.pointsGained;
        
        // Restaurer les grilles
        lastShot.results.forEach(result => {
            const cell = this.grids[result.gridId].cells[lastShot.coord];
            cell.alreadyAimed = false;
            cell.state = 'neutral';
            
            if (result.result === 'hit') {
                const hitIndex = this.grids[result.gridId].hitPositions.indexOf(lastShot.coord);
                if (hitIndex > -1) {
                    this.grids[result.gridId].hitPositions.splice(hitIndex, 1);
                }
            }
        });

        this.updateDisplay();
        this.saveState();
    }

    saveState() {
        const state = {
            teams: this.teams,
            grids: this.grids,
            currentTeam: this.currentTeam,
            gameState: this.gameState,
            timeLeft: this.timeLeft,
            shotHistory: this.shotHistory,
            settings: this.settings,
            lastUpdate: Date.now() // Timestamp pour forcer la synchronisation
        };
        
        // Debug: vérifier les bateaux
        Object.keys(this.grids).forEach(gridId => {
            console.log(`Grille ${gridId} - Bateaux:`, this.grids[gridId].ships.length);
        });
        
        localStorage.setItem('battleshipGame', JSON.stringify(state));
        
        // Déclencher un événement personnalisé pour la synchronisation
        window.dispatchEvent(new CustomEvent('battleshipUpdate'));
    }

    loadState() {
        const saved = localStorage.getItem('battleshipGame');
        if (saved) {
            const state = JSON.parse(saved);
            this.teams = state.teams.map(teamData => {
                const team = new Team(teamData.id, teamData.name);
                team.score = teamData.score || 0;
                team.status = teamData.status || 'active';
                return team;
            });
            this.currentTeam = state.currentTeam;
            this.gameState = state.gameState;
            this.timeLeft = state.timeLeft;
            this.shotHistory = state.shotHistory || [];
            this.settings = { ...this.settings, ...state.settings };
            
            // Reconstruire les grilles
            Object.keys(state.grids).forEach(gridId => {
                this.grids[gridId] = new Grid(gridId);
                // Restaurer les états des cellules
                Object.keys(state.grids[gridId].cells).forEach(coord => {
                    const cellData = state.grids[gridId].cells[coord];
                    this.grids[gridId].cells[coord] = { ...cellData };
                });
                // Restaurer les bateaux
                if (state.grids[gridId].ships) {
                    state.grids[gridId].ships.forEach(shipData => {
                        const ship = new Ship(shipData.type, shipData.size, shipData.orientation, shipData.positions);
                        ship.isSunk = shipData.isSunk || false;
                        this.grids[gridId].ships.push(ship);
                    });
                    console.log(`Grid ${gridId} restored - Boats:`, this.grids[gridId].ships.length);
                } else {
                    console.warn(`Aucun bateau trouvé pour la grille ${gridId}`);
                }
                // Restaurer les positions touchées
                if (state.grids[gridId].hitPositions) {
                    this.grids[gridId].hitPositions = [...state.grids[gridId].hitPositions];
                }
            });
            
            // Le jeu est chargé
            console.log('Game state loaded');
        }
    }

    updateDisplay() {
        this.updatePublicDisplay();
        this.updateAdminDisplay();
    }


    updatePublicDisplay() {
        // Mettre à jour les scores
        this.teams.forEach(team => {
            const scoreElement = document.getElementById(`team-${team.id}-score`);
            if (scoreElement) {
                const scoreSpan = scoreElement.querySelector('.score');
                if (scoreSpan) {
                    scoreSpan.textContent = team.score;
                    console.log(`Score mis à jour pour ${team.name}: ${team.score}`);
                } else {
                    console.warn(`Élément .score non trouvé pour l'team ${team.id}`);
                }
                scoreElement.classList.toggle('eliminated', team.status === 'eliminated');
                scoreElement.classList.toggle('active', team.id === this.currentTeam && this.gameState === 'playing');
            } else {
                console.warn(`Élément team-${team.id}-score non trouvé`);
            }
        });

        // Mettre à jour l'indicateur de tour
        const turnIndicator = document.getElementById('turn-indicator');
        if (turnIndicator) {
            if (this.gameState === 'playing') {
                const currentTeam = this.teams.find(t => t.id === this.currentTeam);
                turnIndicator.textContent = `${currentTeam.name.toUpperCase()}'S TURN TO SHOOT`;
            } else if (this.gameState === 'preparation') {
                turnIndicator.textContent = 'PREPARATION IN PROGRESS';
            } else if (this.gameState === 'finished') {
                // Determine the reason for game end
                const eliminatedTeams = this.teams.filter(team => team.status === 'eliminated');
                const reason = eliminatedTeams.length >= 3 ? 'elimination' : 'manual';
                
                if (reason === 'elimination') {
                    // Victory by elimination
                    const remainingTeam = this.teams.find(team => team.status !== 'eliminated');
                    if (remainingTeam) {
                        turnIndicator.textContent = `${remainingTeam.name.toUpperCase()} WINS!`;
                    } else {
                        // Fallback
                        const sortedTeams = this.teams.sort((a, b) => b.score - a.score);
                        const highestScore = sortedTeams[0].score;
                        const winners = sortedTeams.filter(team => team.score === highestScore);
                        if (winners.length === 1) {
                            turnIndicator.textContent = `${winners[0].name.toUpperCase()} WINS!`;
                        } else {
                            const winnerNames = winners.map(team => team.name).join(' ET ');
                            turnIndicator.textContent = `TIE BETWEEN ${winnerNames.toUpperCase()}`;
                        }
                    }
                } else {
                    // Victory by score (manual end)
                    const sortedTeams = this.teams.sort((a, b) => b.score - a.score);
                    const highestScore = sortedTeams[0].score;
                    const winners = sortedTeams.filter(team => team.score === highestScore);
                    
                    if (winners.length === 1) {
                        turnIndicator.textContent = `${winners[0].name.toUpperCase()} WINS!`;
                    } else {
                        const winnerNames = winners.map(team => team.name).join(' ET ');
                        turnIndicator.textContent = `TIE BETWEEN ${winnerNames.toUpperCase()}`;
                    }
                }
            }
        }

        // Mettre à jour l'affichage

        // Mettre à jour les grilles
        Object.keys(this.grids).forEach(gridId => {
            this.updateGridDisplay(`grid-${gridId}`, this.grids[gridId]);
        });
    }

    updateAdminDisplay() {
        // Mettre à jour les boutons d'team
        document.querySelectorAll('.team-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.team === this.currentTeam);
        });

        // Mettre à jour l'affichage de l'team courante
        const currentTeamName = document.getElementById('current-team-name');
        if (currentTeamName) {
            const currentTeam = this.teams.find(t => t.id === this.currentTeam);
            currentTeamName.textContent = currentTeam.name;
        }

        // Mettre à jour les infos des grilles (adverses vs team qui tire)
        Object.keys(this.grids).forEach(gridId => {
            const gridInfo = document.getElementById(`grid-${gridId}-info`);
            if (gridInfo) {
                const team = this.teams.find(t => t.id === gridId);
                if (gridId === this.currentTeam) {
                    gridInfo.textContent = `${team.name} (shooting)`;
                    gridInfo.style.color = '#10b981';
                } else {
                    gridInfo.textContent = `${team.name} (opponent)`;
                    gridInfo.style.color = '#ef4444';
                }
            }
        });

        // Mettre à jour les grilles admin
        Object.keys(this.grids).forEach(gridId => {
            this.updateGridDisplay(`admin-grid-${gridId}`, this.grids[gridId]);
        });

        // Mettre à jour la liste des scores
        this.updateScoreList();
        this.updateHistoryList();
    }

    getShipImageForCell(coord, grid) {
        // Trouver le bateau qui contient cette coordonnée
        const ship = grid.ships.find(s => s.positions.includes(coord));
        if (!ship) return null;

        const positionIndex = ship.positions.indexOf(coord);
        const isHorizontal = ship.orientation === 'H';
        const isBigShip = ship.size === 4; // Porte-avion
        const isLittleShip = ship.size === 2; // Corvette

        if (isBigShip) {
            // Porte-avion (4 cases)
            if (isHorizontal) {
                // Horizontal : devant -> milieu-devant -> milieu-derrière -> derrière
                switch (positionIndex) {
                    case 0: return 'img/Big-ship-devant.png';
                    case 1: return 'img/Big-ship-milieu-derriere.png'; // Les noms sont inversés
                    case 2: return 'img/Big-ship-milieu-devant.png';  // Les noms sont inversés
                    case 3: return 'img/Big-ship-derriere.png';
                }
            } else {
                // Vertical : derrière (haut) -> milieu-derrière -> milieu-devant -> devant (bas)
                switch (positionIndex) {
                    case 0: return 'img/Big-ship-derriere.png';
                    case 1: return 'img/Big-ship-milieu-derriere.png';
                    case 2: return 'img/Big-ship-milieu-devant.png';
                    case 3: return 'img/Big-ship-devant.png';
                }
            }
        } else if (isLittleShip) {
            // Corvette (2 cases)
            if (isHorizontal) {
                // Horizontal : devant -> derrière
                return positionIndex === 0 ? 'img/Little-ship-devant.png' : 'img/Little-ship-derriere.png';
            } else {
                // Vertical : derrière (haut) -> devant (bas)
                return positionIndex === 0 ? 'img/Little-ship-derriere.png' : 'img/Little-ship-devant.png';
            }
        }

        return null;
    }

    updateGridDisplay(gridId, grid) {
        const gridElement = document.getElementById(gridId);
        if (!gridElement) return;

        // Vider la grille
        gridElement.innerHTML = '';

        // Créer la cellule vide en haut à gauche
        const emptyCell = document.createElement('div');
        emptyCell.className = 'coord-label';
        gridElement.appendChild(emptyCell);

        // Créer les labels des colonnes (A, B, C, D, E)
        for (let x = 0; x < 5; x++) {
            const columnLabel = document.createElement('div');
            columnLabel.className = 'coord-label column';
            columnLabel.textContent = String.fromCharCode(65 + x);
            gridElement.appendChild(columnLabel);
        }

        // Créer les cellules avec les labels des lignes
        for (let y = 1; y <= 5; y++) {
            // Label de la ligne (1, 2, 3, 4, 5)
            const rowLabel = document.createElement('div');
            rowLabel.className = 'coord-label row';
            rowLabel.textContent = y;
            gridElement.appendChild(rowLabel);

            // Cellules de la ligne
            for (let x = 0; x < 5; x++) {
                const coord = String.fromCharCode(65 + x) + y;
                const cell = grid.cells[coord];
                const cellElement = document.createElement('div');
                cellElement.className = 'grid-cell';
                cellElement.dataset.coord = coord;
                
                // Gestion des clics en mode placement
                if (gridId.startsWith('admin-') && game.placementMode) {
                    const teamId = gridId.replace('admin-grid-', '');
                    
                    // Clic simple pour sélectionner un bateau
                    cellElement.addEventListener('click', (e) => {
                        if (cell.containsShip) {
                            const ship = grid.ships.find(s => s.positions.includes(coord));
                            if (ship) {
                                game.selectShipForAction(ship, teamId, coord);
                            }
                        }
                    });
                }

                // Appliquer les états
                if (cell.state === 'hit') {
                    // Vérifier si c'est un tir récent (en attente de révélation)
                    const recentShot = this.shotHistory[this.shotHistory.length - 1];
                    const isRecentShot = recentShot && recentShot.coord === coord && 
                                       (Date.now() - new Date(recentShot.timestamp).getTime()) < 3000; // 3 secondes
                    
                    if (isRecentShot) {
                        // État "en attente" - case normale (pas de changement visuel)
                        // La case reste comme elle était
                    } else {
                        // État "touché" - afficher l'image du bateau seulement s'il est coulé
                        cellElement.classList.add('hit');
                        
                        // Vérifier si le bateau est complètement coulé
                        const ship = grid.ships.find(s => s.positions.includes(coord));
                        const isShipSunk = ship && ship.isSunk;
                        
                        if (isShipSunk) {
                            // Afficher l'image du bateau seulement s'il est coulé
                            const shipImage = this.getShipImageForCell(coord, grid);
                            if (shipImage) {
                                // Créer un élément pour l'image du bateau
                                const shipImageElement = document.createElement('div');
                                shipImageElement.className = 'ship-image';
                                shipImageElement.style.backgroundImage = `url('${shipImage}')`;
                                shipImageElement.style.backgroundSize = 'contain';
                                shipImageElement.style.backgroundRepeat = 'no-repeat';
                                shipImageElement.style.backgroundPosition = 'center';
                                shipImageElement.style.width = '100%';
                                shipImageElement.style.height = '100%';
                                shipImageElement.style.position = 'absolute';
                                shipImageElement.style.top = '0';
                                shipImageElement.style.left = '0';
                                shipImageElement.style.zIndex = '2';
                                
                                // Rotation et animation pour les bateaux horizontaux
                                if (ship && ship.orientation === 'H') {
                                    shipImageElement.style.transform = 'rotate(90deg)';
                                    shipImageElement.style.animation = 'hitEffectImageHorizontal 0.5s ease';
                                } else {
                                    shipImageElement.style.animation = 'hitEffectImage 0.5s ease';
                                }
                                
                                cellElement.appendChild(shipImageElement);
                            } else {
                                cellElement.textContent = '';
                            }
                        } else {
                            // Bateau touché mais pas coulé - afficher seulement une case rouge
                            cellElement.textContent = '';
                        }
                    }
                } else if (cell.state === 'water') {
                    // Vérifier si c'est un tir récent (en attente de révélation)
                    const recentShot = this.shotHistory[this.shotHistory.length - 1];
                    const isRecentShot = recentShot && recentShot.coord === coord && 
                                       (Date.now() - new Date(recentShot.timestamp).getTime()) < 3000; // 3 secondes
                    
                    if (isRecentShot) {
                        // État "en attente" - case normale (pas de changement visuel)
                        // La case reste comme elle était
                    } else {
                        // État "à l'eau" - afficher normalement
                        cellElement.classList.add('miss');
                    }
                }

                if (grid.isEliminated()) {
                    cellElement.classList.add('defeat');
                }

                // Afficher les bateaux en mode admin seulement
                if (this.settings.showBoats && cell.containsShip && cell.state !== 'hit' && gridId.startsWith('admin-')) {
                    const shipImage = this.getShipImageForCell(coord, grid);
                    if (shipImage) {
                        cellElement.style.backgroundImage = `url('${shipImage}')`;
                        cellElement.style.backgroundSize = 'contain';
                        cellElement.style.backgroundRepeat = 'no-repeat';
                        cellElement.style.backgroundPosition = 'center';
                        
                        // Rotation pour les bateaux horizontaux
                        const ship = grid.ships.find(s => s.positions.includes(coord));
                        if (ship && ship.orientation === 'H') {
                            cellElement.style.transform = 'rotate(90deg)';
                        }
                    } else {
                        cellElement.style.background = 'rgba(255, 255, 255, 0.3)';
                    }
                }

                gridElement.appendChild(cellElement);
            }
        }
    }

    updateScoreList() {
        const scoreList = document.getElementById('score-list');
        if (!scoreList) return;

        scoreList.innerHTML = '';
        this.teams
            .sort((a, b) => b.score - a.score)
            .forEach(team => {
                const scoreItem = document.createElement('div');
                scoreItem.className = 'score-item';
                scoreItem.innerHTML = `
                    <strong>${team.name}</strong>: ${team.score} pts
                    ${team.status === 'eliminated' ? ' (Eliminated)' : ''}
                `;
                scoreList.appendChild(scoreItem);
            });
    }

    updateHistoryList() {
        const historyList = document.getElementById('history-list');
        if (!historyList) return;

        historyList.innerHTML = '';
        this.shotHistory
            .slice(-10) // Derniers 10 tirs
            .reverse()
            .forEach(shot => {
                const historyItem = document.createElement('div');
                historyItem.className = 'history-item';
                const team = this.teams.find(t => t.id === shot.teamId);
                historyItem.textContent = `${team.name} → ${shot.coord}: +${shot.pointsGained} pts`;
                historyList.appendChild(historyItem);
            });
    }



    showVictoryScreen() {
        // Trier les teams par score (décroissant)
        const sortedTeams = this.teams.sort((a, b) => b.score - a.score);
        const highestScore = sortedTeams[0].score;
        
        // Trouver toutes les teams avec le score le plus élevé
        const winners = sortedTeams.filter(team => team.score === highestScore);
        
        // Déterminer la raison de la fin de partie
        const eliminatedTeams = this.teams.filter(team => team.status === 'eliminated');
        const reason = eliminatedTeams.length >= 3 ? 'elimination' : 'manual';
        
        let winnerText;
        let titleText;
        
        if (reason === 'elimination') {
            // Victoire par élimination - l'team restante gagne
            const remainingTeam = this.teams.find(team => team.status !== 'eliminated');
            if (remainingTeam) {
                titleText = 'VICTOIRE PAR ÉLIMINATION !';
                winnerText = `${remainingTeam.name.toUpperCase()} EST LA DERNIÈRE SURVIVANTE !`;
            } else {
                // Fallback au cas où il y aurait un problème
                titleText = 'VICTOIRE !';
                if (winners.length === 1) {
                    winnerText = `VICTOIRE DE ${winners[0].name.toUpperCase()}`;
                } else {
                    const winnerNames = winners.map(team => team.name).join(' ET ');
                    winnerText = `ÉGALITÉ ENTRE ${winnerNames.toUpperCase()}`;
                }
            }
        } else {
            // Victoire par score (timer écoulé)
            titleText = 'VICTOIRE PAR SCORE !';
            if (winners.length === 1) {
                winnerText = `${winners[0].name.toUpperCase()} REMPORTE LA VICTOIRE !`;
            } else {
                const winnerNames = winners.map(team => team.name).join(' ET ');
                winnerText = `ÉGALITÉ ENTRE ${winnerNames.toUpperCase()}`;
            }
        }
        
        // Mettre à jour l'écran de victoire
        const victoryTitle = document.querySelector('.victory-content h1');
        if (victoryTitle) {
            victoryTitle.textContent = titleText;
        }
        
        document.getElementById('winner-team').textContent = winnerText;
        document.getElementById('victory-screen').classList.remove('hidden');
        
        console.log('Fin de partie !', titleText, winnerText);
        console.log('Scores finaux:', this.teams.map(t => `${t.name}: ${t.score} pts (${t.status})`));
    }

    hideVictoryScreen() {
        document.getElementById('victory-screen').classList.add('hidden');
    }

    resetGame() {
        this.teams.forEach(team => {
            team.score = 0;
            team.status = 'active';
        });
        this.currentTeam = 'a';
        this.gameState = 'preparation';
        this.shotHistory = [];
        this.settings.gameEnding = false; // Réinitialiser l'état de fin de partie
        
        // Réinitialiser les grilles
        Object.keys(this.grids).forEach(gridId => {
            this.grids[gridId] = new Grid(gridId);
        });
        
        // Sortir du mode placement
        this.exitPlacementMode();
        
        this.hideVictoryScreen();
        this.updateDisplay();
        this.saveState();
    }

    // Système de placement par drag & drop
    startPlacementMode() {
        this.placementMode = true;
        
        // Afficher le panneau de placement
        const panel = document.getElementById('manual-placement-panel');
        if (panel) {
            panel.classList.remove('hidden');
        }
        
        // Activer le mode placement sur les grilles
        document.body.classList.add('placement-mode');
        
        // D'abord randomiser les bateaux pour avoir une base
        this.randomizeBoats();
        
        this.updatePlacementInterface();
        console.log('Placement mode activated - Boats randomized');
    }

    exitPlacementMode() {
        this.placementMode = false;
        this.draggedShip = null;
        this.dragStartPos = null;
        
        // Masquer le panneau de placement
        const panel = document.getElementById('manual-placement-panel');
        if (panel) {
            panel.classList.add('hidden');
        }
        
        // Désactiver le mode placement sur les grilles
        document.body.classList.remove('placement-mode');
        
        console.log('Placement mode deactivated');
    }

    updatePlacementInterface() {
        this.updatePlacementInstructions();
        this.updateDisplay();
    }

    // Système de placement simplifié
    moveShip(ship, teamId, newStartPos) {
        if (!this.placementMode) return false;
        
        const grid = this.grids[teamId];
        const newOrientation = ship.orientation;
        
        // Calculer les nouvelles positions
        const startX = newStartPos.charCodeAt(0) - 65;
        const startY = parseInt(newStartPos.slice(1)) - 1;
        
        const newPositions = [];
        for (let i = 0; i < ship.size; i++) {
            const x = String.fromCharCode(65 + startX + (newOrientation === 'H' ? i : 0));
            const y = startY + (newOrientation === 'V' ? i : 0) + 1;
            newPositions.push(x + y);
        }
        
        // Vérifier si les nouvelles positions sont valides
        const tempShip = new Ship(ship.type, ship.size, newOrientation, newPositions);
        if (this.isValidShipPlacement(tempShip, grid)) {
            // Retirer l'ancien bateau
            ship.positions.forEach(pos => {
                grid.cells[pos].containsShip = false;
            });
            
            // Ajouter le nouveau bateau
            ship.positions = newPositions;
            tempShip.positions.forEach(pos => {
                grid.cells[pos].containsShip = true;
            });
            
            console.log(`Boat ${ship.type} moved to ${newStartPos}`);
            this.showNotification('success', 'Move Successful', `${ship.type} moved to ${newStartPos}`);
            this.updateDisplay();
            this.saveState();
            return true;
        } else {
            console.log('Cannot move boat here');
            this.showNotification('error', 'Move Impossible', 'Invalid position or overlap detected');
            return false;
        }
    }

    rotateShip(ship, teamId) {
        if (!this.placementMode) return false;
        
        const grid = this.grids[teamId];
        const newOrientation = ship.orientation === 'H' ? 'V' : 'H';
        
        console.log(`Tentative de rotation du ${ship.type} de ${ship.orientation} vers ${newOrientation}`);
        
        // Retirer temporairement le bateau de la grille pour vérifier les nouvelles positions
        ship.positions.forEach(pos => {
            grid.cells[pos].containsShip = false;
        });
        
        // Calculer les nouvelles positions
        const startPos = ship.positions[0];
        const startX = startPos.charCodeAt(0) - 65;
        const startY = parseInt(startPos.slice(1)) - 1;
        
        const newPositions = [];
        for (let i = 0; i < ship.size; i++) {
            const x = String.fromCharCode(65 + startX + (newOrientation === 'H' ? i : 0));
            const y = startY + (newOrientation === 'V' ? i : 0) + 1;
            newPositions.push(x + y);
        }
        
        console.log('New positions calculated:', newPositions);
        
        // Vérifier si les nouvelles positions sont dans la grille
        const validPositions = newPositions.every(pos => {
            const x = pos.charCodeAt(0) - 65;
            const y = parseInt(pos.slice(1)) - 1;
            const isValid = x >= 0 && x < 5 && y >= 0 && y < 5;
            console.log(`Position ${pos}: x=${x}, y=${y}, valide=${isValid}`);
            return isValid;
        });
        
        if (!validPositions) {
            console.log('Nouvelles positions hors grille');
            // Remettre le bateau à sa place
            ship.positions.forEach(pos => {
                grid.cells[pos].containsShip = true;
            });
            this.showNotification('error', 'Rotation Impossible', 'Boat would go out of grid if rotated here');
            return false;
        }
        
        // Vérifier qu'il n'y a pas de chevauchement
        const noOverlap = newPositions.every(pos => !grid.cells[pos].containsShip);
        console.log('Pas de chevauchement:', noOverlap);
        
        if (noOverlap) {
            // Mettre à jour le bateau
            ship.orientation = newOrientation;
            ship.positions = newPositions;
            newPositions.forEach(pos => {
                grid.cells[pos].containsShip = true;
            });
            
            console.log(`Boat ${ship.type} rotated to ${newOrientation}`);
            this.showNotification('success', 'Rotation Successful', `${ship.type} rotated to ${newOrientation === 'H' ? 'horizontal' : 'vertical'}`);
            this.updateDisplay();
            this.saveState();
            return true;
        } else {
            console.log('Overlap detected');
            // Remettre le bateau à sa place
            ship.positions.forEach(pos => {
                grid.cells[pos].containsShip = true;
            });
            this.showNotification('error', 'Rotation Impossible', 'Boat cannot be rotated here (overlap or out of grid)');
            return false;
        }
    }

    isValidShipPlacement(ship, grid) {
        // Vérifier que le bateau est dans la grille
        const validPositions = ship.positions.every(pos => {
            const x = pos.charCodeAt(0) - 65;
            const y = parseInt(pos.slice(1)) - 1;
            return x >= 0 && x < 5 && y >= 0 && y < 5;
        });

        if (!validPositions) return false;

        // Vérifier qu'il n'y a pas de chevauchement
        const noOverlap = ship.positions.every(pos => !grid.cells[pos].containsShip);
        return noOverlap;
    }

    selectShipForAction(ship, teamId, coord) {
        // Nettoyer les sélections précédentes
        document.querySelectorAll('.ship-selected').forEach(el => {
            el.classList.remove('ship-selected');
        });
        document.querySelectorAll('.ship-actions').forEach(el => {
            el.remove();
        });
        
        // Marquer le bateau comme sélectionné
        const cell = document.querySelector(`#admin-grid-${teamId} .grid-cell[data-coord="${coord}"]`);
        if (cell) {
            cell.classList.add('ship-selected');
            
            // Créer les boutons d'action
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'ship-actions';
            actionsDiv.innerHTML = `
                <div class="ship-action-buttons">
                       <button class="btn btn-small" onclick="game.moveShipPrompt('${ship.type}', '${teamId}', '${coord}')">
                           📍 Move
                       </button>
                       <button class="btn btn-small" onclick="game.rotateShipFromAction('${ship.type}', '${teamId}')">
                           🔄 Rotate
                       </button>
                </div>
            `;
            
            // Positionner les boutons près du bateau
            const gridContainer = document.querySelector(`#admin-grid-${teamId}`).parentElement;
            gridContainer.appendChild(actionsDiv);
            
            // Positionner les boutons
            const rect = cell.getBoundingClientRect();
            const gridRect = gridContainer.getBoundingClientRect();
            actionsDiv.style.position = 'absolute';
            actionsDiv.style.left = (rect.left - gridRect.left + rect.width/2 - 50) + 'px';
            actionsDiv.style.top = (rect.top - gridRect.top - 40) + 'px';
            actionsDiv.style.zIndex = '1000';
        }
    }
    
    moveShipPrompt(shipType, teamId, currentCoord) {
        const newPos = prompt(`Move ${shipType} to which position? (ex: A1, B2, etc.)`);
        if (newPos && newPos.match(/^[A-E][1-5]$/)) {
            const grid = this.grids[teamId];
            const ship = grid.ships.find(s => s.positions.includes(currentCoord));
            if (ship) {
                this.moveShip(ship, teamId, newPos);
            }
        } else if (newPos) {
            // Position invalide
            this.showNotification('error', 'Invalid Position', 'Expected format: A1, B2, C3, D4, E5');
        }
        this.clearShipSelection();
    }
    
    rotateShipFromAction(shipType, teamId) {
        const grid = this.grids[teamId];
        const ship = grid.ships.find(s => s.type === shipType);
        if (ship) {
            this.rotateShip(ship, teamId);
        }
        this.clearShipSelection();
    }
    
    clearShipSelection() {
        document.querySelectorAll('.ship-selected').forEach(el => {
            el.classList.remove('ship-selected');
        });
        document.querySelectorAll('.ship-actions').forEach(el => {
            el.remove();
        });
    }

    // Système de notifications
    showNotification(type, title, message, duration = 4000) {
        const container = document.getElementById('notification-container');
        if (!container) return;

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const icon = this.getNotificationIcon(type);
        
        notification.innerHTML = `
            <div class="notification-header">
                <span class="notification-icon">${icon}</span>
                <span class="notification-title">${title}</span>
            </div>
            <div class="notification-message">${message}</div>
            <button class="notification-close" onclick="this.parentElement.remove()">×</button>
        `;

        container.appendChild(notification);

        // Animation d'apparition
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        // Auto-suppression
        if (duration > 0) {
            setTimeout(() => {
                this.hideNotification(notification);
            }, duration);
        }
    }

    hideNotification(notification) {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 300);
    }

    getNotificationIcon(type) {
        const icons = {
            success: '✅',
            warning: '⚠️',
            error: '❌',
            info: 'ℹ️'
        };
        return icons[type] || icons.info;
    }

    updatePlacementInstructions() {
        const instructions = document.querySelector('.placement-instructions');
        if (!instructions) return;
        
        instructions.innerHTML = `
            <p><strong>Instructions :</strong></p>
            <p>1. Les bateaux sont placés aléatoirement</p>
            <p>2. <strong>Clic</strong> sur un bateau pour voir les actions</p>
            <p>3. Utilisez les boutons "Déplacer" et "Pivoter"</p>
            <p>4. Cliquez sur "Valider" quand terminé</p>
        `;
    }

    clearTeamGrid(teamId) {
        this.grids[teamId] = new Grid(teamId);
        this.updateDisplay();
        this.saveState();
        console.log(`Grid for team ${teamId} cleared`);
    }

    validateAllPlacements() {
        const allTeamsPlaced = Object.keys(this.grids).every(teamId => {
            const grid = this.grids[teamId];
            return grid.ships.length === 2; // Porte-avion + Corvette
        });
        
        if (allTeamsPlaced) {
            console.log('All boats are placed!');
            this.exitPlacementMode();
            return true;
        } else {
            const missingTeams = Object.keys(this.grids).filter(teamId => {
                const grid = this.grids[teamId];
                return grid.ships.length < 2;
            });
            console.log('Missing teams:', missingTeams);
            alert(`There are not enough boats for the teams: ${missingTeams.join(', ')}`);
            return false;
        }
    }
}

// Instance globale du jeu
let game = new Game();

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing game...');
    
    // Charger l'état sauvegardé
    game.loadState();
    
    // Initialiser l'affichage
    game.updateDisplay();
    
    // Événements de navigation
    setupNavigation();
    
    // Événements de l'interface administrateur
    setupAdminEvents();
    
    // Synchronisation entre onglets
    setupCrossTabSync();
    
    // Auto-sauvegarde toutes les 2 secondes
    setInterval(() => {
        if (game.gameState === 'playing') {
            game.saveState();
        }
    }, 2000);
    
    // Synchronisation pour les onglets publics
    setInterval(() => {
        if (!window.location.pathname.includes('admin.html')) {
            // C'est un onglet public, synchroniser l'affichage
            game.loadState();
            game.updateDisplay();
        }
    }, 1000); // Toutes les secondes pour synchroniser l'affichage
    
    console.log('Initialization completed!');
});

function setupCrossTabSync() {
    // Écouter les changements dans le localStorage
    window.addEventListener('storage', (e) => {
        if (e.key === 'battleshipGame') {
            // Recharger l'état depuis le localStorage
            game.loadState();
            game.updateDisplay();
        }
    });
    
    // Écouter les événements personnalisés pour la synchronisation
    window.addEventListener('battleshipUpdate', () => {
        game.loadState();
        game.updateDisplay();
    });
    
    // Synchronisation forcée pour les onglets publics
    if (!window.location.pathname.includes('admin.html')) {
        // Forcer une synchronisation immédiate
        setInterval(() => {
            if (game.gameState === 'playing') {
                game.loadState();
                game.updateDisplay();
            }
        }, 2000); // Toutes les 2 secondes
    }
    
    // Détecter si c'est un onglet admin ou public
    const isAdminTab = window.location.pathname.includes('admin.html') || 
                      document.getElementById('admin-panel') !== null;
    
    if (isAdminTab) {
        // C'est un onglet admin - on peut contrôler le jeu
        console.log('Admin tab detected');
        // Masquer la navigation si elle existe
        const nav = document.querySelector('.app-nav');
        if (nav) {
            nav.style.display = 'none';
        }
        // Afficher seulement l'interface admin
        const adminPanel = document.getElementById('admin-panel');
        const publicDisplay = document.getElementById('public-display');
        if (adminPanel) adminPanel.classList.remove('hidden');
        if (publicDisplay) publicDisplay.classList.add('hidden');
    } else {
        // C'est un onglet public - on affiche seulement
        console.log('Public tab detected');
        // Masquer la navigation pour l'onglet public
        const nav = document.querySelector('.app-nav');
        if (nav) {
            nav.style.display = 'none';
        }
        // Afficher seulement l'interface publique
        const publicDisplay = document.getElementById('public-display');
        const adminPanel = document.getElementById('admin-panel');
        if (publicDisplay) publicDisplay.classList.remove('hidden');
        if (adminPanel) adminPanel.classList.add('hidden');
    }
}

function setupNavigation() {
    // Navigation entre les interfaces (seulement si les éléments existent)
    const showPublicBtn = document.getElementById('show-public');
    const showAdminBtn = document.getElementById('show-admin');
    const toggleFullscreenBtn = document.getElementById('toggle-fullscreen');
    
    if (showPublicBtn) {
        showPublicBtn.addEventListener('click', () => {
            document.getElementById('public-display').classList.remove('hidden');
            document.getElementById('admin-panel').classList.add('hidden');
            document.getElementById('show-public').classList.add('active');
            document.getElementById('show-admin').classList.remove('active');
        });
    }
    
    if (showAdminBtn) {
        showAdminBtn.addEventListener('click', () => {
            document.getElementById('public-display').classList.add('hidden');
            document.getElementById('admin-panel').classList.remove('hidden');
            document.getElementById('show-public').classList.remove('active');
            document.getElementById('show-admin').classList.add('active');
        });
    }
    
    // Mode plein écran
    if (toggleFullscreenBtn) {
        toggleFullscreenBtn.addEventListener('click', () => {
            toggleFullscreen();
        });
    }
    
    function toggleFullscreen() {
        const isFullscreen = !!(document.fullscreenElement || 
                               document.webkitFullscreenElement || 
                               document.mozFullScreenElement || 
                               document.msFullscreenElement);
        
        if (isFullscreen) {
            // Sortir du mode plein écran
            if (document.exitFullscreen) {
                document.exitFullscreen().catch(err => {
                    console.log('Error exiting fullscreen mode:', err);
                });
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        } else {
            // Entrer en mode plein écran
            const element = document.documentElement;
            if (element.requestFullscreen) {
                element.requestFullscreen().catch(err => {
                    console.log('Error entering fullscreen mode:', err);
                });
            } else if (element.webkitRequestFullscreen) {
                element.webkitRequestFullscreen();
            } else if (element.mozRequestFullScreen) {
                element.mozRequestFullScreen();
            } else if (element.msRequestFullscreen) {
                element.msRequestFullscreen();
            }
        }
    }
    
    // Détecter les changements de mode plein écran
    document.addEventListener('fullscreenchange', () => {
        updateFullscreenMode();
    });
    
    // Détecter les changements de mode plein écran (compatibilité navigateurs)
    document.addEventListener('webkitfullscreenchange', updateFullscreenMode);
    document.addEventListener('mozfullscreenchange', updateFullscreenMode);
    document.addEventListener('MSFullscreenChange', updateFullscreenMode);
    
    function updateFullscreenMode() {
        const isFullscreen = !!(document.fullscreenElement || 
                               document.webkitFullscreenElement || 
                               document.mozFullScreenElement || 
                               document.msFullscreenElement);
        
        if (isFullscreen) {
            document.body.classList.add('fullscreen-mode');
            console.log('Fullscreen mode activated');
        } else {
            document.body.classList.remove('fullscreen-mode');
            console.log('Fullscreen mode deactivated');
        }
        
        // Mettre à jour le texte du bouton
        const toggleFullscreenBtn = document.getElementById('toggle-fullscreen');
        if (toggleFullscreenBtn) {
            toggleFullscreenBtn.textContent = isFullscreen ? '⛶ Sortir' : '⛶ Plein écran';
        }
    }
}

function setupAdminEvents() {
    // Boutons de contrôle du jeu (seulement si les éléments existent)
    const startGameBtn = document.getElementById('start-game');
    const endGameBtn = document.getElementById('end-game');
    const resetGameBtn = document.getElementById('reset-game');
    
    if (startGameBtn) {
        startGameBtn.addEventListener('click', () => {
            console.log('Start button clicked!');
            game.startGame();
        });
    } else {
        console.log('Start button not found!');
    }
    
    
    if (endGameBtn) {
        endGameBtn.addEventListener('click', () => {
            game.endGame();
        });
    }
    
    if (resetGameBtn) {
        resetGameBtn.addEventListener('click', () => {
            if (confirm('Êtes-vous sûr de vouloir réinitialiser la partie ?')) {
                game.resetGame();
            }
        });
    }
    
    // Sélection d'team
    document.querySelectorAll('.team-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            game.setCurrentTeam(btn.dataset.team);
        });
    });
    
    // Tir
    const fireShotBtn = document.getElementById('fire-shot');
    if (fireShotBtn) {
        fireShotBtn.addEventListener('click', () => {
            const coordX = document.getElementById('coord-x').value;
            const coordY = document.getElementById('coord-y').value;
            
            if (coordX && coordY) {
                const coord = coordX + coordY;
                game.shoot(coord).catch(e => {
                    console.error('Erreur lors du tir:', e);
                });
                
                // Réinitialiser les sélecteurs
                document.getElementById('coord-x').value = '';
                document.getElementById('coord-y').value = '';
            } else {
                alert('Veuillez sélectionner une coordonnée valide');
            }
        });
    }
    
    // Raccourci clavier pour tirer
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && game.gameState === 'playing') {
            const fireShotBtn = document.getElementById('fire-shot');
            if (fireShotBtn) {
                fireShotBtn.click();
            }
        }
    });
    
    // Actions du jeu
    const undoLastBtn = document.getElementById('undo-last');
    if (undoLastBtn) {
        undoLastBtn.addEventListener('click', () => {
            game.undoLastShot();
        });
    }
    
    const randomizeBoatsBtn = document.getElementById('randomize-boats');
    if (randomizeBoatsBtn) {
        randomizeBoatsBtn.addEventListener('click', () => {
            if (confirm('Voulez-vous randomiser le placement des bateaux ?')) {
                game.randomizeBoats();
            }
        });
    }
    
    const toggleBoatsBtn = document.getElementById('toggle-boats');
    if (toggleBoatsBtn) {
        toggleBoatsBtn.addEventListener('click', () => {
            game.settings.showBoats = !game.settings.showBoats;
            game.updateDisplay();
        });
    }
    
    // Paramètres
    
    const muteSoundsCheckbox = document.getElementById('mute-sounds');
    if (muteSoundsCheckbox) {
        muteSoundsCheckbox.addEventListener('change', (e) => {
            game.settings.muteSounds = e.target.checked;
        });
    }
    
    const allowContactCheckbox = document.getElementById('allow-contact');
    if (allowContactCheckbox) {
        allowContactCheckbox.addEventListener('change', (e) => {
            game.settings.allowContact = e.target.checked;
        });
    }
    
    // Nouvelle partie
    const newGameBtn = document.getElementById('new-game');
    if (newGameBtn) {
        newGameBtn.addEventListener('click', () => {
            game.resetGame();
        });
    }
    
    // Événements pour le placement manuel
    const manualPlacementBtn = document.getElementById('manual-placement');
    if (manualPlacementBtn) {
        manualPlacementBtn.addEventListener('click', () => {
            game.startPlacementMode();
        });
    }
    
    const clearPlacementBtn = document.getElementById('clear-placement');
    if (clearPlacementBtn) {
        clearPlacementBtn.addEventListener('click', () => {
            const teamId = document.getElementById('placement-team').value;
            if (confirm(`Clear all boats for team ${teamId.toUpperCase()} ?`)) {
                game.clearTeamGrid(teamId);
            }
        });
    }
    
    const validatePlacementBtn = document.getElementById('validate-placement');
    if (validatePlacementBtn) {
        validatePlacementBtn.addEventListener('click', () => {
            game.validateAllPlacements();
        });
    }
    
    const cancelPlacementBtn = document.getElementById('cancel-placement');
    if (cancelPlacementBtn) {
        cancelPlacementBtn.addEventListener('click', () => {
            game.exitPlacementMode();
        });
    }
}

// Gestion des raccourcis clavier pour les teams
document.addEventListener('keydown', (e) => {
    // Raccourci F11 pour le mode plein écran
    if (e.key === 'F11') {
        e.preventDefault();
        const toggleFullscreenBtn = document.getElementById('toggle-fullscreen');
        if (toggleFullscreenBtn) {
            toggleFullscreenBtn.click();
        }
        return;
    }
    
    // Raccourcis pour les teams (seulement en mode jeu)
    if (game.gameState === 'playing') {
        const teamKeys = { '1': 'a', '2': 'b', '3': 'c', '4': 'd' };
        if (teamKeys[e.key]) {
            game.setCurrentTeam(teamKeys[e.key]);
        }
    }
});
