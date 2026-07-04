# 🚀 Guide de Compilation Multi-plateforme & Plein Écran Exclusif

Ce document explique comment lancer l'application en **Plein Écran Exclusif** sur tous vos appareils, et comment l'intégration avec **GitHub Actions** compile automatiquement l'application sous forme de fichier **APK (pour Android)** et d'un fichier **EXE (pour Windows)** dès que vous l'exportez.

---

## 📺 1. Comment Activer le Plein Écran Exclusif

L'application intègre une détection et un contrôle natifs du plein écran pour vous offrir une immersion complète (sans barre d'adresse de navigateur ni fioritures de système).

### Sur Ordinateur (PC / Mac)
1. Ouvrez l'application.
2. Cliquez sur le bouton **"Plein écran"** situé dans le coin supérieur droit de la page d'accueil.
3. Pour quitter le plein écran à tout moment, appuyez sur la touche `Échap` (`Esc`) de votre clavier ou cliquez à nouveau sur le bouton **"Quitter plein écran"**.

### Sur Mobile / Tablette
1. Ouvrez l'application dans votre navigateur mobile (Chrome, Safari, etc.).
2. Cliquez sur **"Plein écran"** en haut à droite.
3. L'application masquera instantanément les barres de navigation du téléphone pour se lancer en plein écran exclusif (comme une application native).

---

## 🛠️ 2. Automatisation des Compilations (GitHub Actions)

Un système d'intégration continue (CI) complet a été configuré dans le dossier `.github/workflows/build-platforms.yml`. Dès que vous exportez ce projet sur votre compte GitHub, chaque modification ou publication déclenchera automatiquement la compilation des applications natives.

### Comment obtenir les fichiers APK et EXE de votre application :

1. **Exportez l'application vers GitHub** (depuis le menu d'export ou via git push).
2. Rendez-vous sur votre dépôt GitHub.
3. Cliquez sur l'onglet **Actions** en haut de la page.
4. Sélectionnez le workflow nommé **"Build Platforms (Android APK & Windows EXE)"** dans la colonne de gauche.
5. Vous verrez la liste des lancements de compilation. Cliquez sur la compilation la plus récente (ou celle correspondant à votre dernier commit).
6. Faites défiler la page vers le bas jusqu'à la section **"Artifacts"** (Artéfacts) :
   - 📦 Cliquez sur **`Android-APK`** pour télécharger l'installateur mobile `.apk`.
   - 📦 Cliquez sur **`Windows-Executable`** pour télécharger l'application PC autonome `.exe`.

---

## ⚙️ 3. Structure des Fichiers de Compilation Native

Pour rendre ce projet 100% prêt à la compilation cross-plateforme, les fichiers de configuration réels suivants ont été ajoutés à la racine de votre projet :

* 📁 **`capacitor.config.json`** : Configuration officielle de Capacitor pour empaqueter l'application web pour Android et iOS.
* 📁 **`main.js`** : Fichier principal d'initialisation pour le wrapper natif de bureau Electron.
* 📁 **`electron-builder.yml`** : Paramétrage de compilation d'Electron Builder pour générer un fichier `.exe` autonome portable sans installation compliquée.
* 📁 **`/.github/workflows/build-platforms.yml`** : Script d'automatisation GitHub Actions qui gère l'installation des outils Android SDK, de Java JDK, et compile le tout de manière sécurisée dans le Cloud.

---

## 📱 4. Installation sur vos appareils

### Sur Android (APK)
1. Téléchargez le fichier `.apk` généré depuis GitHub Actions sur votre téléphone.
2. Ouvrez le fichier. Si votre téléphone vous demande d'autoriser l'installation d'applications provenant de "sources inconnues" (votre navigateur ou explorateur de fichiers), acceptez.
3. Cliquez sur **Installer**. L'application "Notes" sera ajoutée à votre écran d'accueil comme n'importe quelle autre application du Play Store !

### Sur Windows (EXE)
1. Téléchargez le fichier `.exe` portable généré depuis GitHub Actions.
2. Double-cliquez sur le fichier pour lancer l'application immédiatement. Aucun processus d'installation complexe n'est requis !
