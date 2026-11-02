"""Stuka w element ekranu Androida po jego tekście lub opisie (uiautomator). Użycie: python3 tap_text.py "Profil"."""
import re
import subprocess
import sys
import time
import xml.etree.ElementTree as ET

target = sys.argv[1]
for attempt in range(5):
    subprocess.run(['adb', 'shell', 'uiautomator', 'dump', '/sdcard/ui.xml'], capture_output=True)
    xml = subprocess.run(['adb', 'shell', 'cat', '/sdcard/ui.xml'], capture_output=True, text=True).stdout
    try:
        root = ET.fromstring(xml[xml.find('<?xml'):] if '<?xml' in xml else xml)
    except ET.ParseError:
        time.sleep(2)
        continue
    for node in root.iter('node'):
        if target in (node.get('text', ''), node.get('content-desc', '')):
            x1, y1, x2, y2 = map(int, re.findall(r'\d+', node.get('bounds', '')))
            subprocess.run(['adb', 'shell', 'input', 'tap', str((x1 + x2) // 2), str((y1 + y2) // 2)])
            print(f'tap "{target}"')
            sys.exit(0)
    time.sleep(2)
print(f'NIE ZNALEZIONO "{target}"')
sys.exit(1)
