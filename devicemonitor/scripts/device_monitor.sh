#!/bin/bash

# Configuration
GITHUB_TOKEN="" # Add your PAT when deploying
GITHUB_REPO="stirlo/thelaboratory.cc"
GITHUB_PATH="devicemonitor/data/devices.json"
TEMP_FILE="/tmp/devices.json"

# Battery thresholds
BATTERY_CRITICAL=20
BATTERY_LOW=40
BATTERY_HIGH=75
BATTERY_FULL=100

function notify() {
    local title="$1"
    local message="$2"
    osascript -e "display notification \"$message\" with title \"$title\""
}

function get_mac_info() {
    local name=$(scutil --get ComputerName)
    local os_ver=$(sw_vers -productVersion)
    local build_num=$(sw_vers -buildVersion)
    local temp=$(osx-cpu-temp 2>/dev/null || echo "0")

    # Get battery info if available
    if system_profiler SPPowerDataType | grep -q "Battery Information"; then
        local battery_info=$(pmset -g batt)
        local battery_pct=$(echo "$battery_info" | grep -o "[0-9]*%" | cut -d% -f1)
        local charging=$(echo "$battery_info" | grep -q "charging" && echo "true" || echo "false")
    else
        local battery_pct="100"
        local charging="true"
    fi

    # Get storage info
    local boot_used=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')

    cat << EOF
    {
        "device_name": "$name",
        "device_type": "mac",
        "system_info": {
            "os_version": "$os_ver",
            "build_number": "$build_num",
            "temperature": $temp,
            "battery": {
                "percentage": $battery_pct,
                "charging": $charging
            },
            "storage": {
                "boot_drive": $boot_used
            }
        },
        "last_updated": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
    }
EOF
}

function get_github_file() {
    local api_url="https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_PATH}"
    local response=$(curl -s -H "Authorization: token ${GITHUB_TOKEN}" "$api_url")

    if [[ $(echo "$response" | jq -r '.message') == "Not Found" ]]; then
        echo '{
            "last_updated": "",
            "devices": {
                "macs": {},
                "ipads": {},
                "iphones": {}
            }
        }'
    else
        echo "$response" | jq -r '.content' | base64 --decode
    fi
}

function update_github_file() {
    local content="$1"
    local api_url="https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_PATH}"

    # Get current file's SHA if it exists
    local current_sha=$(curl -s -H "Authorization: token ${GITHUB_TOKEN}" "$api_url" | jq -r '.sha // empty')

    # Prepare the update payload
    local payload=$(jq -n \
        --arg content "$(echo "$content" | base64)" \
        --arg message "Update device status" \
        --arg sha "$current_sha" \
        '{
            message: $message,
            content: $content,
            sha: $sha
        }')

    # Update the file
    curl -s -X PUT \
        -H "Authorization: token ${GITHUB_TOKEN}" \
        -H "Content-Type: application/json" \
        -d "$payload" \
        "$api_url"
}

# Main execution
mac_info=$(get_mac_info)
current_data=$(get_github_file)

# Update the data structure
updated_data=$(echo "$current_data" | jq --arg name "$(echo "$mac_info" | jq -r '.device_name')" \
    --argjson info "$mac_info" \
    '.devices.macs[$name] = $info | .last_updated = now')

# Update GitHub
update_github_file "$updated_data"

# Check battery levels and notify
battery_level=$(echo "$mac_info" | jq -r '.system_info.battery.percentage')
charging=$(echo "$mac_info" | jq -r '.system_info.battery.charging')
device_name=$(echo "$mac_info" | jq -r '.device_name')

if [ "$charging" = "false" ] && [ "$battery_level" -le $BATTERY_CRITICAL ]; then
    notify "🚨 OMG CHARGE NOWWW!" "${device_name} at ${battery_level}%"
elif [ "$charging" = "false" ] && [ "$battery_level" -le $BATTERY_LOW ]; then
    notify "Battery Getting Low" "${device_name} at ${battery_level}%"
elif [ "$charging" = "true" ] && [ "$battery_level" -ge $BATTERY_FULL ]; then
    notify "Device is Full now!" "${device_name} at ${battery_level}%"
elif [ "$charging" = "true" ] && [ "$battery_level" -ge $BATTERY_HIGH ]; then
    notify "Battery Almost Full" "${device_name} at ${battery_level}%"
fi
