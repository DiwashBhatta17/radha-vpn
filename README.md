# Radha VPN for Android

A simple React Native VPN client for the public [VPN Gate](https://www.vpngate.net/) volunteer network. Designed for a Redmi Note 9 Pro Max on Android 11. **Android app only; no website.**

## Download

Install the APK from this repository's **Releases**, when available. Until a successful build is published, there is no verified release. The cloud workflow builds a standalone APK with its JavaScript bundled; no Expo Go or Metro server is needed.

1. Download `Radha-VPN-1.0-preview.apk` on your phone.
2. Allow your browser/file manager to install this APK when Android asks.
3. Open Radha VPN, read the public-network notice, select a relay and tap Connect.
4. Accept Android's VPN connection request. To stop, tap Disconnect or use the VPN notification.

## What it does

- Live HTTPS VPN Gate directory, country/IP search, reported speed and ping.
- Real embedded OpenVPN tunnel, Android VPN consent and foreground notification.
- Connection state from the VPN engine, timeout handling, cancel/disconnect.
- No Radha account, ads, analytics or paid backend.
- Relay configurations reconstructed from allowed fields; CA and TLS checks kept enabled. Academic-only relays are excluded.

VPN Gate and its relay operators keep connection logs. Speeds and availability vary. This is **not an anonymity or no-logs service**. Use HTTPS. The app has no independent kill switch; optional Android always-on/block-without-VPN settings should be tested with a working relay first.

## Cloud build and tests

The **Android APK** GitHub Actions workflow generates a pinned React Native 0.76.9 Android project using CLI 15.1.3, installs OpenVPN bridge 2.1.3, applies compatibility configuration, and builds on GitHub's Linux runner. No Android tools are installed on the owner's PC.

`App.js`, `vpn-core.cjs` and `configure-android.cjs` are the app source. `build-cloud.sh` generates the Android host. A complete generated source archive and dependency lockfile are saved with build artifacts. Native OpenVPN binaries are the upstream bridge's v2.0.0 assets, as specified by its installation instructions. This preview uses a development signing certificate; do not treat it as a security-audited production release.

Tests include parsing/validation unit tests, Android lint, APK signature verification and installation/UI tests on an Android 11 emulator. The test report distinguishes emulator UI success from successful live volunteer-relay connections. Emulator tests do not prove behavior on physical Redmi/MIUI hardware or all networks.

For local **small JavaScript tests only**, run `node --test core.test.cjs`. Use Actions → Android APK → Run workflow for cloud builds.

## Privacy

Only the first-use notice choice and last relay's name/address are saved locally. Profiles are downloaded in memory. Android/OpenVPN may keep local diagnostic logs. The app contacts `www.vpngate.net` for the directory and the selected public relay for the tunnel. The directory/relay services see your source IP. See [VPN Gate's policy](https://www.vpngate.net/en/about_abuse.aspx).

## Licensing and credits

GPL-2.0-or-later. See LICENSE. Uses [react-native-simple-openvpn](https://github.com/ccnnde/react-native-simple-openvpn) by Nor Cod and [OpenVPN for Android](https://github.com/schwabe/ics-openvpn) by Arne Schwabe and contributors. React Native is MIT-licensed. Third-party components retain their copyrights and licenses. Upstream OpenVPN bridge source at tag `v2.1.3`, including its pinned OpenVPN submodule, provides corresponding native source/build scripts. Radha VPN is independent and unaffiliated with VPN Gate or the University of Tsukuba.
