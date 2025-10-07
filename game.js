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
            new Team('a', 'Équipe A'),
            new Team('b', 'Équipe B'),
            new Team('c', 'Équipe C'),
            new Team('d', 'Équipe D')
        ];
        this.grids = {
            'a': new Grid('a'),
            'b': new Grid('b'),
            'c': new Grid('c'),
            'd': new Grid('d')
        };
        this.currentTeam = 'a';
        this.gameState = 'preparation'; // 'preparation', 'playing', 'finished'
        this.timeLeft = 15 * 60; // 15 minutes en secondes
        this.shotHistory = [];
        this.settings = {
            showTimer: true,
            muteSounds: false,
            allowContact: true,
            showBoats: false,
            isPaused: false,
            gameEnding: false
        };
        this.timerInterval = null;
    }

    startGame() {
        console.log('Démarrage du jeu...');
        this.gameState = 'playing';
        this.settings.isPaused = false; // S'assurer que le jeu n'est pas en pause
        this.settings.gameEnding = false; // S'assurer que la partie ne se termine pas
        
        // Démarrer le timer sur tous les onglets
        this.startTimer();
        console.log('Timer démarré sur tous les onglets');
        
        this.updateDisplay();
        this.saveState();
        console.log('Jeu démarré !');
    }

    startTimer() {
        // Arrêter le timer existant s'il y en a un
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        
        console.log('Timer démarré avec', this.timeLeft, 'secondes');
        
        this.timerInterval = setInterval(() => {
            if (this.gameState === 'playing' && this.timeLeft > 0) {
                this.timeLeft--;
                this.updateTimer();
                
                // Sauvegarder toutes les 10 secondes
                if (this.timeLeft % 10 === 0) {
                    this.saveState();
                }
                
                if (this.timeLeft <= 0) {
                    this.endGame();
                }
            }
        }, 1000); // Exactement 1 seconde
    }

    pauseGame() {
        // Pause le timer sur tous les onglets
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        this.settings.isPaused = true;
        this.saveState();
        console.log('Timer mis en pause');
    }

    resumeGame() {
        // Reprendre le timer si le jeu est en cours
        if (this.gameState === 'playing' && this.settings.isPaused) {
            this.settings.isPaused = false;
            this.startTimer();
            this.saveState();
            console.log('Timer repris');
        }
    }

    endGame() {
        this.gameState = 'finished';
        this.pauseGame();
        
        // Déterminer la raison de la fin de partie
        const eliminatedTeams = this.teams.filter(team => team.status === 'eliminated');
        const reason = eliminatedTeams.length >= 3 ? 'elimination' : 'timeout';
        
        console.log(`Fin de partie - Raison: ${reason} (${eliminatedTeams.length} équipes éliminées)`);
        
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

        console.log(`Tir sur ${coord} par l'équipe ${this.currentTeam}`);
        const results = [];
        let totalPoints = 0;
        let hasAnyHit = false;
        let hasAnySunkShip = false;

        // Tirer sur les 3 grilles adverses
        Object.keys(this.grids).forEach(gridId => {
            if (gridId !== this.currentTeam) {
                const result = this.grids[gridId].shoot(coord);
                console.log(`Résultat sur grille ${gridId}:`, result);
                results.push({ gridId, ...result });
                totalPoints += result.points;
                
                // Vérifier s'il y a eu un hit
                if (result.result === 'hit') {
                    hasAnyHit = true;
                }
                
                // Vérifier si un bateau a été coulé
                if (result.sunkShip) {
                    hasAnySunkShip = true;
                }
            }
        });

        // Mettre à jour le score
        const currentTeamObj = this.teams.find(team => team.id === this.currentTeam);
        currentTeamObj.score += totalPoints;
        console.log(`Score mis à jour: ${currentTeamObj.name} = ${currentTeamObj.score} (+${totalPoints})`);

        // Vérifier les éliminations
        this.checkEliminations();

        // Ajouter à l'historique
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
                    console.log(`Équipe ${team.name} éliminée ! (${eliminatedCount}/4)`);
                }
            }
        });
        
        // Vérifier si la partie doit se terminer
        if (hasEliminatedTeam && this.gameState === 'playing') {
            // Si 3 équipes sont éliminées (il ne reste qu'une équipe), terminer la partie
            if (eliminatedCount >= 3) {
                this.settings.gameEnding = true; // Marquer que la partie se termine
                console.log('Toutes les équipes sauf une sont éliminées - Partie se terminera après le son et l\'animation...');
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
        console.log('🔄 Randomisation des bateaux...');
        Object.keys(this.grids).forEach(gridId => {
            console.log(`Création nouvelle grille pour ${gridId}`);
            this.grids[gridId] = new Grid(gridId);
            this.placeRandomShips(gridId);
        });
        console.log('✅ Randomisation terminée');
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
        
        console.log(`✅ Bateaux placés pour ${teamId}:`);
        console.log(`  - Porte-avion (${carrier.orientation}):`, carrier.positions);
        console.log(`  - Corvette (${corvette.orientation}):`, corvette.positions);
        console.log(`Total bateaux dans la grille:`, grid.ships.length);
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
                    console.log(`Grille ${gridId} restaurée - Bateaux:`, this.grids[gridId].ships.length);
                } else {
                    console.warn(`Aucun bateau trouvé pour la grille ${gridId}`);
                }
                // Restaurer les positions touchées
                if (state.grids[gridId].hitPositions) {
                    this.grids[gridId].hitPositions = [...state.grids[gridId].hitPositions];
                }
            });
            
            // Redémarrer le timer si le jeu est en cours et pas en pause
            if (this.gameState === 'playing' && !this.timerInterval && !this.settings.isPaused) {
                this.startTimer();
                console.log('Timer redémarré après chargement de l\'état');
            }
        }
    }

    updateDisplay() {
        this.updatePublicDisplay();
        this.updateAdminDisplay();
        this.updatePauseButton();
    }

    updatePauseButton() {
        const pauseGameBtn = document.getElementById('pause-game');
        if (pauseGameBtn) {
            if (this.settings.isPaused) {
                pauseGameBtn.textContent = 'Reprendre';
            } else {
                pauseGameBtn.textContent = 'Pause';
            }
        }
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
                    console.warn(`Élément .score non trouvé pour l'équipe ${team.id}`);
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
                turnIndicator.textContent = `À ${currentTeam.name.toUpperCase()} DE TIRER`;
            } else if (this.gameState === 'preparation') {
                turnIndicator.textContent = 'PRÉPARATION EN COURS';
            } else if (this.gameState === 'finished') {
                // Déterminer la raison de la fin de partie
                const eliminatedTeams = this.teams.filter(team => team.status === 'eliminated');
                const reason = eliminatedTeams.length >= 3 ? 'elimination' : 'timeout';
                
                if (reason === 'elimination') {
                    // Victoire par élimination
                    const remainingTeam = this.teams.find(team => team.status !== 'eliminated');
                    if (remainingTeam) {
                        turnIndicator.textContent = `VICTOIRE DE ${remainingTeam.name.toUpperCase()} !`;
                    } else {
                        // Fallback
                        const sortedTeams = this.teams.sort((a, b) => b.score - a.score);
                        const highestScore = sortedTeams[0].score;
                        const winners = sortedTeams.filter(team => team.score === highestScore);
                        if (winners.length === 1) {
                            turnIndicator.textContent = `VICTOIRE DE ${winners[0].name.toUpperCase()}`;
                        } else {
                            const winnerNames = winners.map(team => team.name).join(' ET ');
                            turnIndicator.textContent = `ÉGALITÉ ENTRE ${winnerNames.toUpperCase()}`;
                        }
                    }
                } else {
                    // Victoire par score (timer écoulé)
                    const sortedTeams = this.teams.sort((a, b) => b.score - a.score);
                    const highestScore = sortedTeams[0].score;
                    const winners = sortedTeams.filter(team => team.score === highestScore);
                    
                    if (winners.length === 1) {
                        turnIndicator.textContent = `VICTOIRE DE ${winners[0].name.toUpperCase()}`;
                    } else {
                        const winnerNames = winners.map(team => team.name).join(' ET ');
                        turnIndicator.textContent = `ÉGALITÉ ENTRE ${winnerNames.toUpperCase()}`;
                    }
                }
            }
        }

        // Mettre à jour le timer
        this.updateTimer();
        
        // Mettre à jour l'affichage du timer public selon les paramètres
        this.updatePublicTimer();

        // Mettre à jour les grilles
        Object.keys(this.grids).forEach(gridId => {
            this.updateGridDisplay(`grid-${gridId}`, this.grids[gridId]);
        });
    }

    updateAdminDisplay() {
        // Mettre à jour les boutons d'équipe
        document.querySelectorAll('.team-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.team === this.currentTeam);
        });

        // Mettre à jour l'affichage de l'équipe courante
        const currentTeamName = document.getElementById('current-team-name');
        if (currentTeamName) {
            const currentTeam = this.teams.find(t => t.id === this.currentTeam);
            currentTeamName.textContent = currentTeam.name;
        }

        // Mettre à jour les infos des grilles (adverses vs équipe qui tire)
        Object.keys(this.grids).forEach(gridId => {
            const gridInfo = document.getElementById(`grid-${gridId}-info`);
            if (gridInfo) {
                const team = this.teams.find(t => t.id === gridId);
                if (gridId === this.currentTeam) {
                    gridInfo.textContent = `${team.name} (qui tire)`;
                    gridInfo.style.color = '#10b981';
                } else {
                    gridInfo.textContent = `${team.name} (adverse)`;
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
                        // État "touché" - afficher l'image du bateau
                        cellElement.classList.add('hit');
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
                            const ship = grid.ships.find(s => s.positions.includes(coord));
                            if (ship && ship.orientation === 'H') {
                                shipImageElement.style.transform = 'rotate(90deg)';
                                shipImageElement.style.animation = 'hitEffectImageHorizontal 0.5s ease';
                            } else {
                                shipImageElement.style.animation = 'hitEffectImage 0.5s ease';
                            }
                            
                            cellElement.appendChild(shipImageElement);
                        } else {
                            cellElement.textContent = '💥';
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
                    ${team.status === 'eliminated' ? ' (Éliminée)' : ''}
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

    updateTimer() {
        const timerElement = document.getElementById('timer');
        
        if (timerElement) {
            const minutes = Math.floor(this.timeLeft / 60);
            const seconds = this.timeLeft % 60;
            const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            timerElement.textContent = timeString;
        } else {
            console.log('Élément timer non trouvé !');
        }
    }

    updatePublicTimer() {
        // Afficher ou masquer le timer sur l'écran public selon les paramètres
        const publicTimer = document.querySelector('.timer');
        if (publicTimer) {
            if (this.settings.showTimer) {
                publicTimer.style.display = 'block';
            } else {
                publicTimer.style.display = 'none';
            }
        }
    }

    showVictoryScreen() {
        // Trier les équipes par score (décroissant)
        const sortedTeams = this.teams.sort((a, b) => b.score - a.score);
        const highestScore = sortedTeams[0].score;
        
        // Trouver toutes les équipes avec le score le plus élevé
        const winners = sortedTeams.filter(team => team.score === highestScore);
        
        // Déterminer la raison de la fin de partie
        const eliminatedTeams = this.teams.filter(team => team.status === 'eliminated');
        const reason = eliminatedTeams.length >= 3 ? 'elimination' : 'timeout';
        
        let winnerText;
        let titleText;
        
        if (reason === 'elimination') {
            // Victoire par élimination - l'équipe restante gagne
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
        this.timeLeft = 15 * 60;
        this.shotHistory = [];
        this.settings.isPaused = false; // Réinitialiser l'état de pause
        this.settings.gameEnding = false; // Réinitialiser l'état de fin de partie
        this.pauseGame();
        
        // Réinitialiser les grilles
        Object.keys(this.grids).forEach(gridId => {
            this.grids[gridId] = new Grid(gridId);
        });
        
        this.hideVictoryScreen();
        this.updateDisplay();
        this.saveState();
    }
}

// Instance globale du jeu
let game = new Game();

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM chargé, initialisation du jeu...');
    
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
            // C'est un onglet public, synchroniser le timer
            const oldTimeLeft = game.timeLeft;
            game.loadState();
            
            // Si le temps a changé, mettre à jour l'affichage
            if (oldTimeLeft !== game.timeLeft) {
                game.updateDisplay();
            }
        }
    }, 1000); // Toutes les secondes pour synchroniser le timer
    
    console.log('Initialisation terminée !');
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
        console.log('Onglet administrateur détecté');
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
        console.log('Onglet public détecté');
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
                    console.log('Erreur lors de la sortie du mode plein écran:', err);
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
                    console.log('Erreur lors de l\'entrée en mode plein écran:', err);
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
            console.log('Mode plein écran activé');
        } else {
            document.body.classList.remove('fullscreen-mode');
            console.log('Mode plein écran désactivé');
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
    const pauseGameBtn = document.getElementById('pause-game');
    const endGameBtn = document.getElementById('end-game');
    const resetGameBtn = document.getElementById('reset-game');
    
    if (startGameBtn) {
        startGameBtn.addEventListener('click', () => {
            console.log('Bouton Démarrer cliqué !');
            game.startGame();
        });
    } else {
        console.log('Bouton start-game non trouvé !');
    }
    
    if (pauseGameBtn) {
        pauseGameBtn.addEventListener('click', () => {
            if (game.settings.isPaused) {
                // Timer en pause, le reprendre
                game.resumeGame();
                console.log('Timer repris via bouton');
            } else {
                // Timer en cours, le mettre en pause
                game.pauseGame();
                console.log('Timer mis en pause via bouton');
            }
        });
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
    
    // Sélection d'équipe
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
    const showTimerCheckbox = document.getElementById('show-timer');
    if (showTimerCheckbox) {
        showTimerCheckbox.addEventListener('change', (e) => {
            game.settings.showTimer = e.target.checked;
            game.updateDisplay();
        });
    }
    
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
}

// Gestion des raccourcis clavier pour les équipes
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
    
    // Raccourcis pour les équipes (seulement en mode jeu)
    if (game.gameState === 'playing') {
        const teamKeys = { '1': 'a', '2': 'b', '3': 'c', '4': 'd' };
        if (teamKeys[e.key]) {
            game.setCurrentTeam(teamKeys[e.key]);
        }
    }
});
