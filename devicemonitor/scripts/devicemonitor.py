#!/usr/bin/env python3

import urllib.request
import json
import os
from datetime import datetime, UTC
import base64
import sys
import subprocess

# Configuration
GITHUB_TOKEN = os.getenv('GITHUB_TOKEN')
if not GITHUB_TOKEN:
    with open("/Users/DT/Library/Logs/devicemonitor.log", 'a') as f:
        f.write(f"{datetime.now(UTC)}: Error - GITHUB_TOKEN not found in environment\n")
    sys.exit(1)

GITHUB_REPO = "stirlo/thelaboratory.cc"
GITHUB_PATH = "devicemonitor/data/devices.json"
TEMP_FILE = "/tmp/devices.json"
LOG_FILE = "/Users/DT/Library/Logs/devicemonitor.log"

# Battery thresholds
BATTERY_CRITICAL = 20
BATTERY_LOW = 40
BATTERY_HIGH = 75
BATTERY_FULL = 100

def notify(title, message):
    """Send macOS notification"""
    os.system(f'osascript -e \'display notification "{message}" with title "{title}"\'')

def make_github_request(url, method='GET', data=None):
    """Handle GitHub API requests"""
    headers = {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json",
        "Content-Type": "application/json"
    }

    request = urllib.request.Request(
        url,
        data=json.dumps(data).encode('utf-8') if data else None,
        headers=headers,
        method=method
    )

    try:
        with urllib.request.urlopen(request) as response:
            return json.loads(response.read().decode('utf-8'))
    except Exception as e:
        with open(LOG_FILE, 'a') as f:
            f.write(f"{datetime.now(UTC)}: API Error - {str(e)}\n")
        raise

def get_mac_info():
    """Gather Mac system information"""
    name = subprocess.getoutput('scutil --get ComputerName')
    os_ver = subprocess.getoutput('sw_vers -productVersion')
    build_num = subprocess.getoutput('sw_vers -buildVersion')

    try:
        temp = float(subprocess.getoutput('osx-cpu-temp').split()[0])
    except:
        temp = 0

    battery_info = subprocess.getoutput('pmset -g batt')

    if "Smart-UPS" in battery_info:
        try:
            battery_pct = int(next(x for x in battery_info.split() if '%' in x).rstrip('%'))
            charging = "AC attached" in battery_info
        except:
            battery_pct = 100
            charging = True
    else:
        battery_pct = 100
        charging = True

    try:
        boot_used = int(subprocess.getoutput("df -h / | awk 'NR==2 {print $5}' | sed 's/%//'"))
    except:
        boot_used = 0

    return {
        "device_name": name,
        "device_type": "mac",
        "system_info": {
            "os_version": os_ver,
            "build_number": build_num,
            "temperature": temp,
            "battery": {
                "percentage": battery_pct,
                "charging": charging
            },
            "storage": {
                "boot_drive": boot_used
            }
        },
        "last_updated": datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
    }

def update_github():
    """Update device info on GitHub"""
    try:
        # Get current file
        api_url = f"https://api.github.com/repos/{GITHUB_REPO}/contents/{GITHUB_PATH}"
        current_file = make_github_request(api_url)

        # Get current content
        with urllib.request.urlopen(current_file['download_url']) as response:
            current_data = json.loads(response.read().decode())

        # Update with new data
        mac_info = get_mac_info()
        device_name = mac_info['device_name']

        if 'macs' not in current_data['devices']:
            current_data['devices']['macs'] = {}

        current_data['devices']['macs'][device_name] = mac_info
        current_data['last_updated'] = datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")

        # Handle notifications
        battery_level = mac_info['system_info']['battery']['percentage']
        charging = mac_info['system_info']['battery']['charging']

        battery_info = subprocess.getoutput('pmset -g batt')
        if "Smart-UPS" in battery_info:
            if not charging:
                notify("🚨 UPS ON BATTERY!", f"{device_name} UPS is running on battery power")
        else:
            if not charging and battery_level <= BATTERY_CRITICAL:
                notify("🚨 OMG CHARGE NOWWW!", f"{device_name} at {battery_level}%")
            elif not charging and battery_level <= BATTERY_LOW:
                notify("Battery Getting Low", f"{device_name} at {battery_level}%")

        # Push update
        update_data = {
            "message": f"Update {device_name} status",
            "content": base64.b64encode(json.dumps(current_data, indent=2).encode()).decode(),
            "sha": current_file['sha']
        }

        make_github_request(api_url, method='PUT', data=update_data)

        with open(LOG_FILE, 'a') as f:
            f.write(f"{datetime.now(UTC)}: Successfully updated device status\n")

    except Exception as e:
        with open(LOG_FILE, 'a') as f:
            f.write(f"{datetime.now(UTC)}: Error updating status - {str(e)}\n")

if __name__ == "__main__":
    update_github()
