const fs = require('fs');
const root = 'mobile/';
function edit(p,fn){const path=root+p;fs.writeFileSync(path,fn(fs.readFileSync(path,'utf8')));}
edit('android/settings.gradle',s=>s+"\ninclude ':vpnLib'\nproject(':vpnLib').projectDir = new File(rootProject.projectDir, '../node_modules/react-native-simple-openvpn/vpnLib')\n");
edit('android/gradle.properties',s=>s.replace('newArchEnabled=true','newArchEnabled=false')+'\nandroid.nonFinalResIds=false\nandroid.nonTransitiveRClass=false\n');
edit('android/app/build.gradle',s=>s.replace('defaultConfig {','defaultConfig {\n        missingDimensionStrategy "implementation", "ui"').replace('android {','android {\n    packagingOptions { jniLibs { useLegacyPackaging = true } }'));
for(const [folder,namespace] of [['android','com.norcod.rnovpn'],['vpnLib','de.blinkt.openvpn']]){
  edit(`node_modules/react-native-simple-openvpn/${folder}/build.gradle`,s=>s.replace('android {',`android {\n    namespace '${namespace}'\n    buildFeatures { buildConfig = true }\n    kotlinOptions { jvmTarget = '17' }`).replace("    kotlinOptions { jvmTarget = '17' }", folder==='vpnLib'?"    kotlinOptions { jvmTarget = '17' }":'').replaceAll('JavaVersion.VERSION_1_8','JavaVersion.VERSION_17'));
  edit(`node_modules/react-native-simple-openvpn/${folder}/src/main/AndroidManifest.xml`,s=>s.replace(/\s+package="[^"]+"/,''));
}
edit('android/app/src/main/AndroidManifest.xml',s=>s.replace('<application','<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/><application').replace('android:allowBackup="false"','android:allowBackup="false" android:usesCleartextTraffic="false"').replace('@mipmap/ic_launcher_round','@drawable/ic_radha').replace('@mipmap/ic_launcher','@drawable/ic_radha'));
edit('android/app/src/main/res/values/strings.xml',s=>s.replace('RadhaVPN','Radha VPN'));
fs.mkdirSync(root+'android/app/src/main/res/drawable',{recursive:true});
fs.writeFileSync(root+'android/app/src/main/res/drawable/ic_radha.xml',`<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108"><path android:fillColor="#080E20" android:pathData="M0,0h108v108H0z"/><path android:fillColor="#86F0CA" android:pathData="M54,14 L87,27 L84,61 Q79,81 54,96 Q29,81 24,61 L21,27 Z"/><path android:fillColor="#080E20" android:pathData="M40,34h18q17,0 17,15q0,11 -11,14l14,17h-14L51,64v16H40z M51,44v11h7q6,0 6,-6q0,-5 -6,-5z"/></vector>`);
// Capture IPv6 rather than allowing it to bypass the VPN, and use an explicit
// fallback resolver if a volunteer relay does not push DNS settings.
edit('node_modules/react-native-simple-openvpn/android/src/main/java/com/norcod/rnovpn/RNSimpleOpenvpnModule.java',s=>s.replace('vpnProfile.mName = notificationTitle;',`vpnProfile.mName = notificationTitle;
      vpnProfile.mBlockUnusedAddressFamilies = true;
      vpnProfile.mAllowLocalLAN = false;`));
console.log('Configured Radha VPN Android package, native packaging and VPN bridge.');
edit('node_modules/react-native-simple-openvpn/android/src/main/java/com/norcod/rnovpn/RNSimpleOpenvpnModule.java',s=>s.replace('params.putInt("state", getVpnState(level));',`params.putInt("state", getVpnState(level));
    Log.i("RadhaVPN", state + " / " + level + " / " + logmessage);
    if (level == ConnectionStatus.LEVEL_NOTCONNECTED && vpnProfile != null) {
      de.blinkt.openvpn.core.LogItem[] entries = VpnStatus.getlogbuffer();
      for (int i = Math.max(0, entries.length - 60); i < entries.length; i++) {
        Log.i("RadhaVPN", entries[i].getString(reactContext));
      }
    }`));
