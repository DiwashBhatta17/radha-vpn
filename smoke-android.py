"""Run installed APK on a disposable Android 11 emulator, using actual UI events."""
import subprocess,time,xml.etree.ElementTree as ET,re,json,os
os.makedirs('artifacts',exist_ok=True)
def adb(*args): return subprocess.check_output(['adb',*args],text=True).strip()
def tree():
    adb('shell','uiautomator','dump','/sdcard/ui.xml')
    return ET.fromstring(adb('shell','cat','/sdcard/ui.xml'))
def find(label):
    for n in tree().iter('node'):
        if label in (n.get('text',''),n.get('content-desc','')): return n
    return None
def tap(label,timeout=25):
    until=time.time()+timeout
    while time.time()<until:
        n=find(label)
        if n is not None:
            x1,y1,x2,y2=map(int,re.findall(r'\d+',n.attrib['bounds']))
            adb('shell','input','tap',str((x1+x2)//2),str((y1+y2)//2));time.sleep(1);return
        time.sleep(1)
    raise AssertionError('UI control missing: '+label)
def screenshot(name):
    with open('artifacts/'+name+'.png','wb') as f: subprocess.run(['adb','exec-out','screencap','-p'],stdout=f,check=True)
def wait_text(label,timeout):
    end=time.time()+timeout
    while time.time()<end:
        if find(label) is not None:return True
        time.sleep(2)
    return False
report={'api':adb('shell','getprop','ro.build.version.sdk'),'tests':[],'liveTunnel':'not attempted'}
try:
    adb('shell','wm','size','1080x2400')
    adb('shell','wm','density','420')
    adb('install','-r','artifacts/Radha-VPN-1.0-preview.apk')
    adb('shell','am','start','-n','com.radha.vpn/.MainActivity')
    tap('I understand · Continue');report['tests'].append('launch and consent')
    time.sleep(28)
    screenshot('home-android11')
    tap('Choose server')
    root=tree(); servers=[n.get('content-desc','') for n in root.iter('node') if n.get('content-desc','').startswith('Select ')]
    if not servers:raise AssertionError('Live VPN Gate directory did not populate')
    screenshot('servers-android11');tap(servers[0]);report['tests'].append('HTTPS directory and server selection')
    connected=False;report['attempts']=[]
    for attempt,relay in enumerate(servers[:4]):
        if attempt:
            tap('Choose server');tap(relay)
        adb('logcat','-c')
        tap('Connect VPN')
        if find('OK') is not None:tap('OK')
        connected=wait_text('Connected',55)
        diagnostic=adb('logcat','-d','-s','RadhaVPN:I','AndroidRuntime:E')
        open('artifacts/connection-attempt-'+str(attempt+1)+'.txt','w').write(diagnostic)
        print('RELAY ATTEMPT '+str(attempt+1)+' '+relay+'\n'+diagnostic[-12000:],flush=True)
        report['attempts'].append({'relay':relay,'connected':connected})
        screenshot('connection-attempt-'+str(attempt+1))
        if connected:break
        if find('Cancel connection') is not None:tap('Cancel connection')
        if not wait_text('Disconnected',10):
            adb('shell','am','force-stop','com.radha.vpn');adb('shell','am','start','-n','com.radha.vpn/.MainActivity');time.sleep(28)
    report['liveTunnel']='connected' if connected else 'no public relay connected in four attempts'
    screenshot('connection-android11')
    if connected:
        assert 'com.radha.vpn' in adb('shell','dumpsys','connectivity'),'VPN missing from connectivity service'
        report['tests'].append('native VPN tunnel established')
        tap('Disconnect VPN');assert wait_text('Disconnected',15)
        report['tests'].append('disconnect')
    else:
        # A flaky public relay is recorded separately from installation/UI tests.
        if find('Cancel connection') is not None:tap('Cancel connection')
    adb('shell','am','force-stop','com.radha.vpn');adb('shell','am','start','-n','com.radha.vpn/.MainActivity');time.sleep(5)
    assert find('I understand · Continue') is None,'Consent not persisted'
    tap('About Radha VPN');assert find('Privacy & connection help') is not None
    screenshot('privacy-android11');report['tests'].append('restart, persisted consent, privacy screen')
    logs=adb('logcat','-d','-s','AndroidRuntime:E','ReactNativeJS:E')
    open('artifacts/runtime-log.txt','w').write(logs)
    assert 'FATAL EXCEPTION' not in logs and 'TypeError:' not in logs,logs[-3000:]
    assert connected,'Live VPN connection failed. See connection-attempt logs; do not publish this build.'
    report['result']='passed'
except Exception as e:
    report['result']='failed';report['error']=str(e)
    screenshot('failure-android11')
    open('artifacts/runtime-log.txt','w').write(adb('logcat','-d','-t','1500'))
    raise
finally:
    open('artifacts/android11-test-report.json','w').write(json.dumps(report,indent=2))
    print(json.dumps(report,indent=2))
