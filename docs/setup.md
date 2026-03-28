# Setup Guide

This guide walks you through setting up the GitHub App bootstrap system for your repository.

## Prerequisites

- A GitHub account with permission to create GitHub Apps
- Node.js 18+

## Steps

### 1. Generate a Registration URL

Run the `publish-github-app` workflow and select `generate-registration-url`. This will output a URL you can open in your browser to create the GitHub App using the manifest.

### 2. Create the App

Open the URL generated in step 1. GitHub will pre-fill the app configuration from `manifest/app.yml`. Complete the registration.

### 3. Save Credentials

After creating the app, GitHub will redirect you with a `code` query parameter. Store that code as the `APP_REGISTRATION_CODE` secret, then run the workflow again with `save-credentials`. The app's ID, private key, and installation ID will be printed to the logs.

Store these as repository secrets:

| Secret | Description |
|--------|-------------|
| `GITHUB_APP_ID` | The numeric app ID |
| `GITHUB_APP_PRIVATE_KEY` | The PEM-encoded private key |
| `GITHUB_APP_INSTALLATION_ID` | The installation ID for your org/repo |

### 4. Verify

Run the workflow with `check-status` to confirm authentication is working correctly.

## Fallback Behavior

If GitHub App credentials are not configured, the system automatically falls back to `GITHUB_TOKEN`, which is available in all GitHub Actions runs.
