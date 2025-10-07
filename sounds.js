// Gestionnaire de sons pour le jeu de bataille navale
class SoundManager {
    constructor() {
        this.sounds = {};
        this.muted = false;
        this.volume = 0.7;
        this.initSounds();
    }

    initSounds() {
        // Charger vos fichiers audio personnalisés
        this.sounds = {
            miss: this.createAudioFile('sounds/Miss.mp3'), // Son d'à l'eau
            hit: this.createAudioFile('sounds/Hit.mp3'), // Son de touché
            bigSplash: this.createAudioFile('sounds/BigSplash.mp3'), // Son de bateau qui coule
        };
    }

    createAudioFile(src) {
        return () => {
            if (this.muted) return Promise.resolve();
            
            return new Promise((resolve, reject) => {
                try {
                    const audio = new Audio(src);
                    audio.volume = this.volume;
                    
                    audio.addEventListener('ended', () => {
                        resolve();
                    });
                    
                    audio.addEventListener('error', (e) => {
                        console.log('Erreur de lecture audio:', e);
                        resolve(); // Résoudre quand même pour ne pas bloquer
                    });
                    
                    audio.play().catch(e => {
                        console.log('Erreur de lecture audio:', e);
                        resolve(); // Résoudre quand même pour ne pas bloquer
                    });
                } catch (e) {
                    console.log('Erreur de chargement audio:', e);
                    resolve(); // Résoudre quand même pour ne pas bloquer
                }
            });
        };
    }


    play(soundName) {
        console.log('🔊 Son joué:', soundName);
        if (this.sounds[soundName]) {
            return this.sounds[soundName]();
        } else {
            console.warn('⚠️ Son non trouvé:', soundName);
            return Promise.resolve();
        }
    }

    setMuted(muted) {
        this.muted = muted;
    }

    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
    }
}

// Instance globale du gestionnaire de sons
const soundManager = new SoundManager();

// Intégrer le gestionnaire de sons dans le jeu
if (typeof game !== 'undefined') {
    // Remplacer la méthode playShotSound dans la classe Game
    const originalPlayShotSound = game.playShotSound;
    game.playShotSound = function(results, hasAnyHit, hasAnySunkShip) {
        if (this.settings.muteSounds) return;

        // Priorité 1: BigSplash si au moins un bateau entier est coulé
        if (hasAnySunkShip) {
            soundManager.play('bigSplash');
        }
        // Priorité 2: Hit si au moins une case est touchée (mais pas de bateau coulé)
        else if (hasAnyHit) {
            soundManager.play('hit');
        }
        // Priorité 3: Miss si aucune case n'a été touchée sur les 3 grilles
        else {
            soundManager.play('miss');
        }
    };
}
