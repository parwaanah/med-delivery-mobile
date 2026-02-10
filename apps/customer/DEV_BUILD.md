# Dev build (required for remote push + some native features)

Expo Go **does not support remote push notifications** (SDK 53+). To test real push and any native-only features, use a dev build.

## 1) Prereqs
- Android Studio installed
- Android SDK installed (note your SDK path)
- JDK installed (Android Studio `jbr/` is fine)

Quick helper (PowerShell) to set `JAVA_HOME` for the **current terminal session**:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\\setup-java.ps1

# then copy/paste the printed $env:JAVA_HOME command into the same terminal
```

## 2) Generate `android/local.properties`
From `mobile/apps/customer`:

```powershell
# generate android/ once (if you don't have it)
npx expo prebuild -p android

# write android/local.properties (uses ANDROID_HOME / ANDROID_SDK_ROOT or default SDK path)
powershell -ExecutionPolicy Bypass -File scripts\\setup-android-sdk.ps1
```

## 3) Build + install on emulator/device
```powershell
npx expo run:android -d
```

## 4) Remote push
Backend requires:
- `FCM_SERVER_KEY` in `backend/.env`
- `PUSH_NOTIFICATIONS_ENABLED=true` (optional; defaults to enabled when key exists)

Mobile:
- App will register a native device token and POST it to `POST /notifications/device-token` **only in dev builds**.

### Firebase / FCM config (Android)
Remote push requires Firebase configured in the Android app.

- Create a Firebase project, add an Android app with package: `com.anonymous.customer`
- Download `google-services.json`
- Put it at: `mobile/apps/customer/android/app/google-services.json` (dev build) **or** wire it via EAS secrets/build profiles

After that, rebuild the dev client: `npx expo run:android -d`
