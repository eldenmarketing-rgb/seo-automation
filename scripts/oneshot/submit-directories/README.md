# Directory Submitter — Ideal Transport

Script semi-automatique pour soumettre Ideal Transport sur 13 annuaires français.
Le script **pré-remplit les formulaires automatiquement** ; tu fais juste : CAPTCHA + clic Submit + valider l'email.

---

## ⚠️ Important

- **À lancer depuis ta machine LOCALE** (Mac / Windows / Linux avec interface graphique), **pas depuis le VPS**.
- Le navigateur Chromium doit être visible pour que tu résolves les CAPTCHAs.

---

## 🚀 Installation (une seule fois)

```bash
# Sur ta machine locale, dans le dossier submit-directories :
cd scripts/submit-directories

# Installe Playwright
npm install

# Télécharge Chromium (~150 Mo)
npm run install:browsers
```

---

## ▶️ Lancement

```bash
npm run submit
```

Ou pour reprendre à partir de l'annuaire N° 5 :
```bash
npm run submit:from -- 4   # index 0-based, donc 4 = 5e annuaire
```

---

## 🎮 Pendant la session

Pour chaque annuaire, le script :

1. Ouvre l'URL d'inscription
2. Pré-remplit automatiquement tous les champs détectés (nom, email, tél, adresse, descriptions, tags, etc.)
3. Affiche dans le terminal ce qui a été rempli + ce qui n'a pas été reconnu
4. Attend ton input

**Ce qu'il te reste à faire :**
- Vérifier le formulaire (corriger un champ si besoin)
- Résoudre le CAPTCHA
- Cliquer "Submit" / "Envoyer"
- Aller dans `contact@ideal-transport.fr` pour valider l'email de confirmation

**Commandes terminal pendant la session :**
| Touche | Action |
|--------|--------|
| `Entrée` | Passer à l'annuaire suivant |
| `r` | Re-remplir la page (utile si une nouvelle étape s'affiche) |
| `s` | Skip cet annuaire |
| `q` | Quitter |

---

## 📁 Fichiers

| Fichier | Rôle |
|---------|------|
| `submit.mjs` | Script principal Playwright |
| `business-data.json` | Toutes les infos NAP + descriptions Ideal Transport |
| `directories.json` | Liste des 13 annuaires à soumettre |
| `package.json` | Dépendances Playwright |

---

## 🔧 Modifier les données

Si tu veux changer une description, un numéro, une adresse :
1. Édite `business-data.json`
2. Relance `npm run submit`

Si tu veux ajouter un annuaire :
1. Édite `directories.json` — ajoute un objet `{id, name, url, tier, notes}`
2. Relance le script

---

## 🐛 Dépannage

**Le script ne remplit rien sur tel annuaire**
- L'annuaire utilise des composants React custom (champs sans attribut name/id classique)
- Solution : remplis manuellement, le copier-coller depuis `business-data.json` reste rapide.

**Chromium se ferme tout seul**
- Tu as appuyé sur Ctrl+C → relance avec `npm run submit:from -- N` pour reprendre.

**CAPTCHA permanent**
- Certains sites détectent Playwright via fingerprinting. Tu peux désactiver le mode automation en ajoutant `args: ['--disable-blink-features=AutomationControlled']` dans `submit.mjs` (ligne `chromium.launch`).

---

## 📊 Tracker

Une fois la soumission validée pour un annuaire, va cocher la case dans :
`reports/vtc-backlinks-tracker.md`
