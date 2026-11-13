# Releasing the Android APK

Everything about building, tagging and publishing the installable `.apk` lives here. The app itself is built by EAS; GitHub Actions only triggers the build and attaches the artifact to a GitHub Release.

- [One-time setup](#one-time-setup)
- [Release checklist](#release-checklist)
- [Manual APK build](#manual-apk-build)
- [Automated release with GitHub Actions](#automated-release-with-github-actions)
- [Rebuilding an existing release tag](#rebuilding-an-existing-release-tag)
- [Installing the APK](#installing-the-apk)
- [Troubleshooting](#troubleshooting)

## One-time setup

1. Run one manual preview build so EAS creates and stores the Android keystore. The workflow runs EAS in `--non-interactive` mode and cannot generate a new keystore.
2. Push the `preview` environment variables to EAS (repeat whenever `.env` changes):

   ```bash
   npx eas-cli@latest env:push preview --path .env
   ```

3. Create an access token at [expo.dev/settings/access-tokens](https://expo.dev/settings/access-tokens).
4. Add it as a repository secret named `EXPO_TOKEN` (GitHub → Settings → Secrets and variables → Actions).
5. Authenticate the GitHub CLI once on your machine: `gh auth login`.

## Release instruction:

### Before tagging

- Finish and push the fix on `main` first.

```bash
git status                 # must be clean
git push origin main
```
### Delete tag, when you wouldn't like create that new

- Delete the GitHub Release and its tag (this also removes the old APK):

```bash
gh release delete v1.0.0 --yes --cleanup-tag
```

- Recreate the local tag on the current commit and push it:

```bash
git tag -d v1.0.0          
git tag v1.0.0             
git push origin v1.0.0     
```

- Verify both ends point at the same commit:

```bash
git rev-list -n1 v1.0.0    # local
git ls-remote --tags origin v1.0.0
```

- Watch the new run and confirm the asset was replaced:

```bash
gh run list --workflow=android-apk.yml --limit 3
gh release view v1.0.0
```

- Typecheck, lint and bundle pass:

```bash
npx tsc --noEmit
npx expo lint
npx expo export --platform android --output-dir /tmp/opencode/export-test
```

- `version` in `app.json` and `package.json` matches the tag you are about to create.

### Tag and push

- Create the tag on the current commit and push it (pushing the tag is what starts CI):

```bash
git tag v1.0.0
git push origin v1.0.0
```

- Confirm the remote tag points at the release commit:

```bash
git rev-list -n1 v1.0.0     # should equal: git rev-parse HEAD
git ls-remote --tags origin v1.0.0
```

### Watch the build

- Find the run that the tag triggered:

```bash
gh run list --workflow=android-apk.yml --limit 3
```

- Follow it until it finishes (usually 15–75 minutes, depending on the EAS queue):

```bash
gh run watch
```

### After the build

- Download new release: `https://github.com/notoxus/IT214274-seminar-project/releases/tag/vX.Y.Z`
- [ ] Uninstall the previous build and install the new APK (see [Installing the APK](#installing-the-apk)).
- [ ] Sign in on the device and check that progress, streak and custom vocabulary/grammar are restored (requires Cloud Firestore to be enabled — see the README section "Where learning data is stored").

## Manual APK build

The `preview` profile in `eas.json` uses internal distribution, so it produces an `.apk` that installs directly on any Android device — no Play Store account needed. Cloud builds do not read the local `.env` file, so push the environment variables to EAS first (only needed once, or again whenever `.env` changes):

```bash
npx eas-cli@latest env:push preview --path .env
npx eas-cli@latest build --platform android --profile preview
```

When the build finishes, EAS prints a download link and QR code. Download the `.apk` from that link (EAS stores the artifact; it is not committed to this repository) and share it — recipients need to allow "install unknown apps" for their browser or file manager.

Do not use `--profile production` for this: that profile produces an `.aab`, which can only be uploaded to Google Play, not installed directly.

### Build locally (no EAS build quota)

To build the APK on your own machine instead of waiting for the EAS cloud queue:

```bash
npx eas-cli@latest build --platform android --profile preview --local
```

- Requires the Android SDK and JDK locally (the same toolchain that `npx expo run:android` uses).
- Builds from the current working tree, so save/commit your changes first.
- Uses the stored EAS credentials, so the APK is signed with the EAS keystore and updates an existing EAS-signed install without uninstalling. A debug build from `npx expo run:android` uses a different key and must be uninstalled first.
- The finished `.apk` path is printed at the end of the run.

### Attach or replace the APK on a GitHub Release

```bash
# attach the APK to a (new) release
gh release upload v1.0.1 LearningEnglishApp.apk

# replace an existing asset in place — same tag, same download URL
gh release upload v1.0.0 LearningEnglishApp.apk --clobber
```

`--clobber` overwrites the asset without creating a new release. Remember that a tag points at a commit, so replacing the APK on an old tag leaves the release source and the APK out of sync — prefer a new tag when the APK contains new commits.

## Automated release with GitHub Actions

`.github/workflows/android-apk.yml` builds a preview APK on EAS whenever a `v*` tag is pushed, waits for the build to finish, downloads the artifact, and attaches it to the GitHub Release as `LearningEnglishApp-<tag>.apk`.

The workflow can also be started manually (GitHub → Actions → **Android APK Release** → *Run workflow*) with:

| Input | Meaning |
| --- | --- |
| `tag` | Release tag to create or update, e.g. `v1.0.1` |
| `build_id` | Optional existing EAS build ID to publish instead of starting a new build — useful after a CI timeout |

Notes:

- Each run consumes one EAS build from the monthly quota.
- The build step does not block: the workflow starts the build with `--no-wait`, records the build ID, then polls every minute for up to 210 minutes. The job itself has a 240-minute limit, so a long EAS queue no longer cancels the run.
- If CI dies anyway, the APK is not lost: copy the EAS build ID from the logs and re-run the workflow with `build_id` to publish that build without spending another EAS build.


## Installing the APK

APKs built by EAS are signed with the EAS keystore, which differs from the local debug key used by `npx expo run:android`. Android refuses to update an app signed with a different key, so uninstall first:

```bash
adb devices                                        # make sure the device is listed
adb uninstall com.notoxus.LearningEnglishApp
adb install LearningEnglishApp-v1.0.0.apk
```

On Waydroid, connect ADB to the container before installing:

```bash
WAYDROID_IP=$(sudo waydroid shell ip route | grep src | awk '{print$NF}')
adb connect $WAYDROID_IP:5555
```

Uninstalling removes on-device data, but the signed-in account's progress is restored from Firestore after signing in again.

## Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| `Error: The operation was canceled.` in CI | The job hit its timeout while EAS was still queued. The workflow now waits with `--no-wait` + polling and has a 240-minute timeout; if it still happens, re-run with the recorded `build_id`. |
| `EAS did not return an APK download URL` | The build did not produce an APK (wrong profile). Check that `eas.json` uses `"buildType": "apk"` for the `preview` profile. |
| Build fails asking for credentials | The EAS keystore was never created. Run one manual preview build first. |
| `INSTALL_FAILED_UPDATE_INCOMPATIBLE` | Different signing key. Run `adb uninstall com.notoxus.LearningEnglishApp` and install again. |
| Release asset unchanged after rebuilding | The run was watching the wrong tag, or the tag was not pushed. Compare `git ls-remote --tags origin v1.0.0` with the commit you built. |
| Cloud restore does nothing | Firestore is not enabled or the rules are not published in the Firebase project. See the README section "Where learning data is stored". |

## Rules of thumb

- Never commit the APK: `*.apk` and `*.aab` are gitignored, and CI attaches the artifact to the release.
- Never move a published tag to a different commit without rebuilding it; the release page and the tag must describe the same code.
- Prefer a new patch tag (`v1.0.1`) for a new fix; rebuilding the same tag is for correcting a broken release, because everyone who already downloaded the old APK keeps an outdated file until they download again.
