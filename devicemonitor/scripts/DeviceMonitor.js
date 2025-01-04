// Configuration
const GITHUB_TOKEN = "" // Add your PAT when deploying
const GITHUB_REPO = "stirlo/thelaboratory.cc"
const GITHUB_PATH = "devicemonitor/data/devices.json"

// Battery thresholds
const BATTERY_CRITICAL_LIMIT = 20
const BATTERY_LOW_LIMIT = 40
const BATTERY_HIGH_LIMIT = 75
const BATTERY_FULL_LIMIT = 100
const CHECK_INTERVAL_CHARGING = 5
const CHECK_INTERVAL_NORMAL = 20

async function getGithubFile() {
    const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_PATH}`
    const req = new Request(url)
    req.headers = {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
    }

    try {
        const response = await req.loadJSON()
        const content = atob(response.content)
        return {
            data: JSON.parse(content),
            sha: response.sha
        }
    } catch (error) {
        // If file doesn't exist, return empty structure
        return {
            data: {
                last_updated: new Date().toISOString(),
                devices: {
                    macs: {},
                    ipads: {},
                    iphones: {}
                }
            },
            sha: null
        }
    }
}

async function updateGithubFile(content, sha) {
    const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_PATH}`
    const req = new Request(url)
    req.headers = {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
    }
    req.method = 'PUT'

    const body = {
        message: `Update device status: ${Device.name()}`,
        content: btoa(JSON.stringify(content, null, 2)),
        sha: sha
    }

    req.body = JSON.stringify(body)
    return await req.loadJSON()
}

function notify(title, message, critical = false) {
    let notification = new Notification()
    notification.title = title
    notification.body = message
    if (critical) {
        notification.sound = 'default'
        notification.threadIdentifier = 'critical-battery'
    }
    notification.schedule()
}

async function updateDeviceStatus() {
    const deviceInfo = {
        device_name: Device.name(),
        device_type: Device.isPad() ? "ipad" : "iphone",
        system_info: {
            os_version: Device.systemVersion(),
            build_number: Device.buildNumber(),
            battery: {
                percentage: Math.round(Device.batteryLevel() * 100),
                charging: Device.isCharging()
            }
        },
        last_updated: new Date().toISOString()
    }

    // Check battery levels
    const batteryLevel = deviceInfo.system_info.battery.percentage
    const isCharging = deviceInfo.system_info.battery.charging

    if (!isCharging && batteryLevel <= BATTERY_CRITICAL_LIMIT) {
        notify("🚨 OMG CHARGE NOWWW!", 
              `${deviceInfo.device_name} at ${batteryLevel}%`, 
              true)
    } else if (!isCharging && batteryLevel <= BATTERY_LOW_LIMIT) {
        notify("Battery Getting Low", 
              `${deviceInfo.device_name} at ${batteryLevel}%`)
    } else if (isCharging && batteryLevel >= BATTERY_FULL_LIMIT) {
        notify("Device is Full now!", 
              `${deviceInfo.device_name} at ${batteryLevel}%`)
    } else if (isCharging && batteryLevel >= BATTERY_HIGH_LIMIT) {
        notify("Battery Almost Full", 
              `${deviceInfo.device_name} at ${batteryLevel}%`)
    }

    // Update GitHub
    try {
        const { data, sha } = await getGithubFile()
        const deviceType = Device.isPad() ? "ipads" : "iphones"
        data.devices[deviceType][Device.name()] = deviceInfo
        data.last_updated = new Date().toISOString()
        await updateGithubFile(data, sha)
    } catch (error) {
        notify("Update Error", error.message)
    }

    // Schedule next run
    const interval = Device.isCharging() ? 
        CHECK_INTERVAL_CHARGING * 60 : 
        CHECK_INTERVAL_NORMAL * 60

    let scheduleNotification = new Notification()
    scheduleNotification.scriptName = Script.name()
    scheduleNotification.setTriggerDate(new Date(Date.now() + interval * 1000))
    scheduleNotification.schedule()
}

// Run update
await updateDeviceStatus()
