# Learning English App - Seminar Project For Mobile Programming Subject

## Scope of MVP

### Main Functions:

- Auth (Login, Register): Using Firebase Auth.

- Statistics: Tracking your process: Number of completed assignments, academic results

- Learn New Lessons: View the list of topics, vocabulary tags, and grammar points (meanings, examples, and transcriptions).

- Practice & Quiz: Actual test kinda mutiple choices, fill the blanks,... that may entertain just feeling.

### Repository structure

```text
LearningEnglishApp/
├── assets/                           # App icons and splash artwork
├── src/
│   ├── app/                          # Expo Router screens
│   │   ├── _layout.tsx               # Root layout
│   │   ├── (auth)/                   # Login and registration flow
│   │   │   ├── _layout.tsx
│   │   │   ├── login.tsx
│   │   │   └── register.tsx
│   │   ├── (main)/                   # Learn, practice, stats, and profile tabs
│   │   │   ├── _layout.tsx
│   │   │   ├── index.tsx
│   │   │   ├── learn/[id].tsx
│   │   │   ├── practice/index.tsx
│   │   │   ├── statistic/index.tsx
│   │   │   └── profile/{index,edit}.tsx
│   │   └── index.tsx                 # Redirects to login or main tabs
│   ├── components/
│   │   ├── ui/                       # Shared controls, tabs, and themed views
│   │   ├── auth/                     # Auth form and profile card
│   │   ├── learn/                    # Lesson, vocabulary, and grammar cards
│   │   ├── practice/                 # Multiple choice and fill in the blank
│   │   └── statistic/                # Progress chart and stat card
│   ├── config/firebase.ts            # Firebase app and Auth initialization
│   ├── context/auth-context.tsx      # Auth session and actions
│   ├── hooks/                        # Auth, theme, and color scheme hooks
│   ├── services/                     # Firebase auth, local progress, lesson data
│   ├── types/                        # Auth, lesson, and quiz models
│   └── constants/                    # Theme, app constants, and formatters
├── .env.example                      # Firebase environment variable names
├── app.json
├── package.json
├── tsconfig.json
└── README.md
```

Firebase settings are read from `EXPO_PUBLIC_FIREBASE_API_KEY`, `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`, `EXPO_PUBLIC_FIREBASE_PROJECT_ID`, `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`, `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, and `EXPO_PUBLIC_FIREBASE_APP_ID`. Add these to a local `.env` file after creating a Firebase web app and enabling Email/Password sign-in. Progress is stored on-device with AsyncStorage; lesson examples and quiz questions are local seed data.


## Build and Run:

### 1. Prerequisites

Make sure you have [Node.js](https://nodejs.org/) (v24 or higher) installed on your machine.

### Clone my repo and go to project's dir

```bash
git clone <https://github.com/notoxus/IT214274-seminar-project>
cd LearningEnglishApp
```

### Installing dependency:

```bash
npm install
```
### Run with Expo / React Native

Start the Metro Bundler:
```bash
npx expo start
```

- Scan the generated QR code/import link manually using the Expo Go app on your iOS or Android device.

#### Option A: Physical Device (Recommended for Windows & macOS)

- Install the Expo Go app from the App Store (iOS) or Google Play Store (Android).

- Ensure your phone and PC are connected to the same Wi-Fi network.

- Scan the QR code displayed in your terminal using:

    + Android: Expo Go app's built-in QR scanner.

    + iOS: Default Camera app.

- And if want to other people test this app, using: `npx expo start --tunnel`

- Or website: `npx expo start --web`

#### Option B: Android Studio Emulator (Windows / macOS / Linux)

- Open Android Studio and launch an Android Virtual Device (AVD).

- With Metro running (npx expo start), press a in your terminal to automatically install Expo Go and launch the app inside the emulator.

#### Option C: Waydroid Container (Linux Users)

- If you are running Waydroid on Linux, connect it via ADB before launching:

- Connect ADB to Waydroid:

```bash
waydroid status
adb connect <waydroid-ip-u-saw>:5555
```
- Or:

```bash
WAYDROID_IP=$(sudo waydroid shell ip route | grep src | awk '{print$NF}')
adb connect $WAYDROID_IP:5555
```

- Fix ADB Permission (If unauthenticated):

```bash
cat ~/.android/adbkey.pub | sudo waydroid shell -- sh -c 'cat >> /data/misc/adb/adb_keys'
adb kill-server
adb connect $WAYDROID_IP:5555
```

**Launch**: Run npx expo start and press a in your terminal.

## Development Build

To create a development build:

```bash
npx expo run:android   # Android device or emulator (Waydroid, Bluestack, Nox,...)
npx expo run:ios       # iOS simulator, or a physical device from a Mac
```

After that, run `npx expo start` and open the installed app instead of Expo Go. Re-run if the native dependencies or `app.json` plugins change.

#### Build an installable APK (share with Android users)

The `preview` profile in `eas.json` uses internal distribution, so it produces an `.apk` that installs directly on any Android device — no Play Store account needed. Cloud builds do not read the local `.env` file, so push the environment variables to EAS first (only needed once, or again whenever `.env` changes):

```bash
npx eas-cli@latest env:push preview --path .env
npx eas-cli@latest build --platform android --profile preview
```

When the build finishes, EAS prints a download link and QR code. Download the `.apk` from that link (EAS stores the artifact; it is not committed to this repository) and share it — recipients need to allow "install unknown apps" for their browser/file manager.

Do not use `--profile production` for this: that profile produces an `.aab`, which can only be uploaded to Google Play, not installed directly.

#### Automated APK releases with GitHub Actions

`.github/workflows/android-apk.yml` builds a preview APK on EAS whenever a `v*` tag is pushed and attaches the `.apk` to the GitHub Release.

One-time setup:

1. Run the manual preview build above once, so EAS creates and stores the Android keystore. The workflow runs EAS in `--non-interactive` mode and cannot generate a new keystore.
2. Make sure the `preview` environment variables exist on EAS (`npx eas-cli@latest env:push preview --path .env`).
3. Create an access token at [expo.dev/settings/access-tokens](https://expo.dev/settings/access-tokens).
4. Add it as a repository secret named `EXPO_TOKEN` (GitHub → Settings → Secrets and variables → Actions).

Then publish a release:

```bash
git tag v1.0.0
git push origin v1.0.0
```

GitHub Actions builds the APK (this uses one EAS build from the monthly quota) and uploads it to the release page, where it can be downloaded or shared as a direct link.

## Where learning data is stored

Learning data is device-first and backed up to Firestore for the signed-in account:

| Data | Local (AsyncStorage) | Cloud (Firestore) |
| --- | --- | --- |
| Completed lessons, quiz history, wrong answers, stars, streak | `@learning-english/progress:<uid>` | `users/{uid}/appData/progress` |
| Vocabulary/grammar added from a lesson screen | `@learning-english/custom-lessons` | `users/{uid}/appData/lessonContent` |

On sign-in the newest progress copy wins, and custom lesson content is merged (it only grows). This means reinstalling the app or signing in on another device restores the account's data — as long as Cloud Firestore is enabled in the Firebase project and the security rules allow it. Paste this into **Firebase Console → Firestore → Rules** (or deploy `firestore.rules`):

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid}/appData/{document} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

Installing an APK signed with a different key still requires uninstalling the previous app; the cloud backup is restored on the next sign-in.
