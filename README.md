# AI Amana

AI Amana is an Expo React Native lost-and-found app for campuses. It runs on iOS, Android, and web from one codebase, stores data in Firebase, and uses Cloud Functions with OpenAI to suggest likely matches between lost and found reports.

## What Is Implemented

- Expo Router app with auth, report, matches, chats, my items, profile, and admin routes.
- Firebase Authentication profile creation with standard email validation.
- Firestore data APIs for reports, matches, chats, and admin views.
- Firebase Storage upload flow for report photos.
- Cloud Functions for AI match processing, masked chat creation, match dismissal, report resolution, and admin status changes.
- Firestore and Storage rules for owner/admin access boundaries.
- OpenAI embedding and multimodal match ranking pipeline with a deterministic local fallback when `OPENAI_API_KEY` is not set.
- Jest tests for validation and matching helpers.

## Setup

1. Install dependencies:

   ```sh
   npm install
   npm --prefix functions install
   ```

2. Copy `.env.example` to `.env` and fill the Expo Firebase values.

3. Copy `functions/.env.example` to `functions/.env` and add `OPENAI_API_KEY`.

4. Run the app:

   ```sh
   npm run web
   ```

5. Build Functions:

   ```sh
   npm --prefix functions run build
   ```

## Firebase Notes

- Assign admin users manually by setting `users/{uid}.role` to `admin` or adding a Firebase Auth custom claim named `admin`.
- Deploy web with an Expo export into `dist`, then Firebase Hosting can serve the app.
- The OpenAI key belongs only in Functions. Do not expose it through `EXPO_PUBLIC_*`.
