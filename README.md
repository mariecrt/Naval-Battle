# Bataille Navale - GMM 2025

Jeu de bataille navale interactif développé pour l'événement GMM 2025 de Stago.

## 🎯 Fonctionnalités

### Interface Publique
- Affichage simultané des 4 grilles de bataille (5×5)
- Scores en temps réel pour chaque équipe
- Indicateur de l'équipe qui joue avec animation
- Timer de 15 minutes (configurable)
- Effets visuels et sonores pour chaque action
- Écran de victoire avec animation

### Interface Administrateur
- Gestion des équipes et placement des bateaux
- Attribution des tirs (équipe la plus rapide)
- Saisie des coordonnées (A-E, 1-5)
- Contrôles de jeu (pause, annulation, fin)
- Historique des tirs et scores
- Paramètres configurables

## 🚀 Installation et Utilisation

### **Option 1 : Pages séparées (Recommandé pour projection)**
1. **Interface administrateur** : Ouvrez `admin.html` dans un navigateur
2. **Interface publique** : Ouvrez `display.html` dans un autre onglet/fenêtre
3. **Projection** : Mettez `display.html` en plein écran sur le projecteur

### **Option 2 : Page unique**
1. **Ouvrir le jeu** : Ouvrez `index.html` dans un navigateur moderne (Chrome/Edge ≥120)
2. **Navigation** : Utilisez les boutons "Écran Public" et "Administrateur"
3. **Plein écran** : Bouton "Plein Écran" pour la projection

## 🎮 Règles du Jeu

### Composition des Flottes
- **1 Porte-avion** : 4 cases (horizontal ou vertical)
- **1 Corvette** : 2 cases (horizontal ou vertical)
- Bateaux rectilignes sans chevauchement
- Contact entre bateaux autorisé par défaut

### Déroulement
1. L'animateur pose une question
2. L'équipe la plus rapide à répondre gagne le droit de tir
3. Elle choisit une coordonnée (ex: "B3")
4. Le tir est répliqué sur les 3 grilles adverses

### Système de Points
- **+1 point** par bateau touché sur grille adverse (0-3 points/tour)
- **0 point** si coordonnée déjà utilisée sur une grille
- **Grand "plouf"** : son spécial si tir à l'eau sur les 3 grilles

### Élimination
- Équipe éliminée quand tous ses bateaux sont coulés
- Grille passe en état "défaite" (overlay sombre + ancre)
- Plus de points possibles sur cette grille

## 🎛️ Contrôles

### Raccourcis Clavier
- **1-4** : Sélectionner l'équipe qui tire
- **Entrée** : Valider le tir

### Boutons Administrateur
- **Démarrer** : Lancer la partie
- **Pause/Reprendre** : Contrôler le timer
- **Terminer** : Finir la partie manuellement
- **Reset** : Réinitialiser complètement
- **Annuler dernier tir** : Undo du dernier coup
- **Randomiser bateaux** : Placement automatique
- **Afficher/Masquer bateaux** : Toggle pour l'admin

## ⚙️ Paramètres

- **Timer public** : Afficher/masquer le timer sur l'écran public
- **Sons** : Activer/désactiver les effets sonores
- **Contact entre bateaux** : Autoriser les bateaux qui se touchent
- **Thème** : Couleurs personnalisables par équipe

## 💾 Sauvegarde et Synchronisation

- **Auto-sauvegarde** : Toutes les 2 secondes pendant le jeu
- **Synchronisation** : Les onglets se synchronisent automatiquement via localStorage
- **Récupération** : État restauré automatiquement après refresh
- **Stockage local** : Aucune donnée envoyée sur serveur

### **Synchronisation entre onglets**
- **Admin → Public** : Les actions de l'admin se répercutent instantanément sur l'écran public
- **Timer synchronisé** : Le timer est identique sur tous les onglets
- **Scores en temps réel** : Les scores se mettent à jour automatiquement

## 🎨 Personnalisation

### Couleurs par Équipe
- **Équipe A** : Rouge (#ef4444)
- **Équipe B** : Bleu (#3b82f6)
- **Équipe C** : Vert (#10b981)
- **Équipe D** : Orange (#f59e0b)

### Effets Visuels
- **Touché** : Explosion persistante (💥)
- **À l'eau** : Ripple bleu temporaire (2s)
- **Défaite** : Overlay sombre + ancre (⚓)
- **Victoire** : Ancre animée + feuilles de laurier

## 🔧 Spécifications Techniques

- **Navigateurs** : Chrome ≥120, Edge ≥120
- **Résolution** : Optimisé 16:9 (1080p/4K)
- **Performance** : Mise à jour UI <150ms
- **Audio** : Sons synthétiques (préchargés)
- **Responsive** : Adaptable à différentes tailles d'écran

## 📱 Utilisation en Live

1. **Préparation** (5 min)
   - Nommer les 4 équipes
   - Placer ou randomiser les bateaux
   - Lancer "Démarrer"

2. **Pendant le jeu** (15 min)
   - Désigner l'équipe qui tire (boutons 1-4)
   - Saisir coordonnée (A-E, 1-5)
   - Valider le tir (bouton ou Entrée)
   - Suivre les scores en temps réel

3. **Fin de partie**
   - Timer à 0:00 ou bouton "Terminer"
   - Écran de victoire automatique
   - Possibilité de relancer

## 🎯 Critères d'Acceptation

- ✅ 4 grilles 5×5 visibles sans défilement en 1080p
- ✅ Tour actif clairement mis en évidence
- ✅ Mise à jour des grilles <150ms
- ✅ Effets visuels persistants (touché) et temporaires (à l'eau)
- ✅ Son "grand plouf" si aucun touché sur les 3 grilles
- ✅ Scoring correct (+1 par bateau touché)
- ✅ Élimination avec overlay "défaite"
- ✅ Écran de victoire à la fin
- ✅ Récupération d'état après refresh

## 🚨 Dépannage

- **Pas de sons** : Vérifier que les sons ne sont pas coupés
- **Grilles vides** : Cliquer sur "Randomiser bateaux"
- **Timer bloqué** : Utiliser "Pause/Reprendre"
- **État perdu** : L'auto-sauvegarde restaure automatiquement

---

**Développé pour Stago GMM 2025** - Version 1.0
