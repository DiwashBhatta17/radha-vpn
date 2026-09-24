#!/usr/bin/env bash
set -euo pipefail
# Run on the GitHub-hosted runner, not on the owner's PC.
npx --yes @react-native-community/cli@15.1.3 init RadhaVPN --version 0.76.9 --directory mobile --skip-install --package-name com.radha.vpn
cp App.js vpn-core.cjs mobile/
rm mobile/App.tsx
cd mobile
npm install --save-exact react-native-simple-openvpn@2.1.3 @react-native-async-storage/async-storage@2.1.2 base-64@1.0.0
cd ..
node configure-android.cjs
mkdir -p mobile/android/app/src/main/jniLibs
for abi in arm64-v8a x86_64; do
  curl --fail --location --retry 3 "https://github.com/ccnnde/react-native-simple-openvpn/releases/download/v2.0.0/$abi.zip" -o "$abi.zip"
  mkdir -p "mobile/android/app/src/main/jniLibs/$abi"
  unzip -q "$abi.zip" -d "mobile/android/app/src/main/jniLibs/$abi"
done
find mobile/android/app/src/main/jniLibs -type f
cd mobile/android
chmod +x gradlew
./gradlew assembleRelease lintRelease --no-daemon -PreactNativeArchitectures=arm64-v8a,x86_64
cd ../..
mkdir -p artifacts
cp mobile/android/app/build/outputs/apk/release/app-release.apk artifacts/Radha-VPN-1.0-preview.apk
"$ANDROID_HOME/build-tools/35.0.0/apksigner" verify --verbose artifacts/Radha-VPN-1.0-preview.apk | tee artifacts/apk-verification.txt
sha256sum artifacts/*.apk > artifacts/SHA256SUMS.txt
cp mobile/package-lock.json artifacts/
tar --exclude=node_modules --exclude=.gradle --exclude=build --exclude=.git -czf artifacts/generated-android-source.tar.gz mobile
