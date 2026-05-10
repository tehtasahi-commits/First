# Security Notes

This project is safe to publish as a public static repository if you only include the files in this folder.

## What is public

The source code, UI text, default sample restaurants, and icon are public.

## What is private

Your actual restaurants, notes, links, last-visited dates, and pick history are stored in the browser's `localStorage` on the iPhone. They are not committed to GitHub and are not sent to a server by this app.

## Network behavior

The app has no backend API and does not upload data. The service worker only caches the static app files for offline use.

## Before publishing

- Do not commit screenshots that contain private locations or notes.
- Do not commit any personal data export files.
- Do not add API keys, tokens, passwords, or private map URLs with access tokens.
- Publish only the static app files: `index.html`, `styles.css`, `app.js`, `manifest.webmanifest`, `service-worker.js`, and `icon.svg`.
