# QuietZone Run Commands (Windows PowerShell)

This file has the main commands to run the project locally and build Android release artifacts.

## 1) First-time setup

```powershell
cd C:\Users\sraja\coding\quitezone\quitezone-frontend
npm install
```

```powershell
cd C:\Users\sraja\coding\quitezone\QuietZone-backend
npm install
```

## 2) Start backend (API)

Development (auto-restart):

```powershell
cd C:\Users\sraja\coding\quitezone\QuietZone-backend
npm run dev
```

Production-style start:

```powershell
cd C:\Users\sraja\coding\quitezone\QuietZone-backend
npm start
```

## 3) Start frontend (Expo)

Set Java first (Android Studio JBR), then run Android:

```powershell
cd C:\Users\sraja\coding\quitezone\quitezone-frontend
$env:JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'
$env:Path="$env:JAVA_HOME\bin;$env:Path"
npx expo run:android --port 8087
```

Alternative script command:

```powershell
cd C:\Users\sraja\coding\quitezone\quitezone-frontend
npm run android
```

Start Metro only:

```powershell
cd C:\Users\sraja\coding\quitezone\quitezone-frontend
npm start
```

Lint:

```powershell
cd C:\Users\sraja\coding\quitezone\quitezone-frontend
npm run lint
```

## 4) If app is not opening / port issues

Kill common Expo/Metro ports:

```powershell
Get-NetTCPConnection -LocalPort 8081,8082,8083,8084,8085,8086,8087 -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty OwningProcess -Unique |
  ForEach-Object { Stop-Process -Id $_ -Force }
```

Clean Android build:

```powershell
cd C:\Users\sraja\coding\quitezone\quitezone-frontend\android
.\gradlew.bat clean
```

Then run again:

```powershell
cd C:\Users\sraja\coding\quitezone\quitezone-frontend
$env:JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'
$env:Path="$env:JAVA_HOME\bin;$env:Path"
npx expo run:android --port 8087
```

## 5) Android production release commands

From your current config:
- NDK is set in `quitezone-frontend/android/build.gradle`:
  - `ndkVersion = "30.0.14904198"`
- Release type exists and you can build APK/AAB with Gradle.

### Build release APK

```powershell
cd C:\Users\sraja\coding\quitezone\quitezone-frontend\android
.\gradlew.bat assembleRelease
```

Output:
- `C:\Users\sraja\coding\quitezone\quitezone-frontend\android\app\build\outputs\apk\release\app-release.apk`

### Build release AAB (Play Store)

```powershell
cd C:\Users\sraja\coding\quitezone\quitezone-frontend\android
.\gradlew.bat bundleRelease
```

Output:
- `C:\Users\sraja\coding\quitezone\quitezone-frontend\android\app\build\outputs\bundle\release\app-release.aab`

## 6) Important for real production signing

Right now `android/app/build.gradle` uses debug signing for `release`. That is OK for testing, but not for Play Store production.

Create your own keystore:

```powershell
cd C:\Users\sraja\coding\quitezone\quitezone-frontend\android\app
keytool -genkeypair -v -storetype PKCS12 -keystore quietzone-release-key.keystore -alias quietzone-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

Then update `android/gradle.properties` with your release values and switch `release` signingConfig in `android/app/build.gradle` from `debug` to `release`.

After that, rerun:

```powershell
cd C:\Users\sraja\coding\quitezone\quitezone-frontend\android
.\gradlew.bat assembleRelease
.\gradlew.bat bundleRelease
```

