---
description: How to set up Firebase Cloud Functions and Admin SDK
---

# Setup Firebase Cloud Functions

This workflow guides you through installing the Firebase CLI, logging in, and initializing Cloud Functions for your project.

## 1. Install Firebase CLI
If you haven't installed the Firebase CLI yet, run:
```bash
npm install -g firebase-tools
```

## 2. Login to Firebase
Authenticate with your Google account:
```bash
firebase login
```
This will open your browser. Log in with the account that owns the Firebase project.

## 3. Initialize Cloud Functions
Run the initialization command in your project root (`d:\COSMOS`):
```bash
firebase init functions
```

### Interactive Setup Guide:
1.  **Are you ready to proceed?**: Type `Y` and press Enter.
2.  **Select a default Firebase project**: Choose `Use an existing project`.
3.  **Select project**: Select your project (`omkarpatil3903-hub` / `PmAdmin` or similar).
4.  **What language would you like to use?**: Select `JavaScript`.
5.  **Do you want to use ESLint?**: Type `N` (to keep it simple for now) or `Y` if you prefer strict linting.
6.  **Do you want to install dependencies with npm now?**: Type `Y`.

## 4. Verify Setup
After initialization, you should see a `functions` folder in your project root.
The `functions/index.js` file is where we will write our backend code.

## 5. Admin SDK
The Admin SDK is automatically available in Cloud Functions. You don't need to manually log in to the Admin SDK; it uses the project's default service account credentials automatically when running in the Cloud Functions environment.

In `functions/index.js`, we will use it like this:
```javascript
const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
```
