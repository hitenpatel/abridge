# Firebase Test Lab Setup Guide

One-time manual setup steps required before the CI pipeline can run mobile E2E tests.

## 1. Create Firebase Project

1. Go to https://console.firebase.google.com
2. Create a new project (e.g., `abridge` or `schoolconnect`)
3. Google Analytics is optional — you can skip it

## 2. Enable Test Lab APIs

1. Go to Google Cloud Console → APIs & Services → Enable APIs
2. Search for and enable **Cloud Testing API**
3. Search for and enable **Cloud Tool Results API**

## 3. Create Service Account

1. Go to Google Cloud Console → IAM & Admin → Service Accounts
2. Create a new service account named `firebase-test-lab-ci`
3. Grant these roles:
   - `Firebase Test Lab Admin`
   - `Cloud Test Service Agent`
4. Go to the Keys tab → Add Key → Create new key → JSON
5. Download the JSON key file

## 4. Set Up EAS

```bash
npm install -g eas-cli
cd apps/mobile
eas login
eas build:configure
```

Generate an access token at https://expo.dev/settings/access-tokens

## 5. Add Secrets to Forgejo

Go to your Forgejo repo → Settings → Secrets and add:

| Secret | Value |
|--------|-------|
| `GCLOUD_SERVICE_KEY` | Entire contents of the JSON key file |
| `FIREBASE_PROJECT_ID` | Your Firebase project ID (e.g., `abridge-12345`) |
| `EXPO_TOKEN` | Your EAS access token |
