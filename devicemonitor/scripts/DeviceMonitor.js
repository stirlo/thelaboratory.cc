// Configuration
const GITHUB_TOKEN = "" // Add your PAT when deploying
const GITHUB_REPO = "stirlo/thelaboratory.cc"
const GITHUB_PATH = "devicemonitor/data/devices.json"

// Battery thresholds
const BATTERY_CRITICAL = 20
const BATTERY_LOW = 40
const BATTERY_HIGH = 75
const BATTERY_FULL = 100
const CHECK_INTERVAL_CHARGING = 5 * 60 * 1000  // 5 minutes in ms
const CHECK_INTERVAL_NORMAL = 20 * 60 * 1000   // 20 minutes in ms

// SF Symbols for notifications
const SYMBOLS = {
    CRITICAL: "exclamationmark.triangle.fill",
    LOW: "battery.25",
    HIGH: "battery.75.bolt",
    FULL: "battery.100.bolt",
    ERROR: "xmark.circle.fill"
}

async function getGithubFile() {
    console.log("Fetching device data from GitHub...")
    const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_PATH}`
    const req = new Request(url)
    req.headers = {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
    }

    try {
        const response = await req.loadJSON()
        const content = atob(response.content)
        console.log("GitHub data fetched successfully")
        return {
            data: JSON.parse(content),
            sha: response.sha
        }
    } catch (error) {
        console.log(`GitHub fetch error: ${error.message}`)
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
    console.log("Updating GitHub with new device status...")
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
    try {
        await req.loadJSON()
        console.log("GitHub update successful")
        return true
    } catch (error) {
        console.log(`GitHub update failed: ${error.message}`)
        return false
    }
}

function notify(title, message, symbol = null, critical = false) {
    let notification = new Notification()
    notification.title = title
    notification.body = message
    if (symbol) {
        notification.addAction(symbol, "", "")
    }
    if (critical) {
        notification.sound = 'default'
        notification.threadIdentifier = 'critical-battery'
    }
    notification.schedule()
}

async function updateDeviceStatus() {
    console.log("Starting device update...")
    const deviceInfo = {
        device_name: Device.name(),
        device_type: Device.isPad() ? "ipad" : "iphone",
        system_info: {
            os_version: Device.systemVersion(),
            build_number: Device.buildNumber,
            battery: {
                percentage: Math.round(Device.batteryLevel() * 100),
                charging: Device.isCharging()
            }
        },
        last_updated: new Date().toISOString()
    }

    try {
        const { data, sha } = await getGithubFile()
        const deviceType = Device.isPad() ? "ipads" : "iphones"
        if (!data.devices[deviceType]) {
            data.devices[deviceType] = {}
        }
        data.devices[deviceType][Device.name()] = deviceInfo
        data.last_updated = new Date().toISOString()

        if (await updateGithubFile(data, sha)) {
            // Check all devices' battery levels
            Object.values(data.devices).forEach(category => {
                Object.entries(category).forEach(([name, info]) => {
                    const battery = info.system_info.battery
                    if (!battery.charging && battery.percentage <= BATTERY_CRITICAL) {
                        notify("Critical Battery Alert", 
                              `${name}: ${battery.percentage}%`,
                              SYMBOLS.CRITICAL, true)
                    } else if (!battery.charging && battery.percentage <= BATTERY_LOW) {
                        notify("Low Battery", 
                              `${name}: ${battery.percentage}%`,
                              SYMBOLS.LOW)
                    } else if (battery.charging && battery.percentage >= BATTERY_FULL) {
                        notify("Battery Full", 
                              `${name}: ${battery.percentage}%`,
                              SYMBOLS.FULL)
                    } else if (battery.charging && battery.percentage >= BATTERY_HIGH) {
                        notify("Battery Almost Full", 
                              `${name}: ${battery.percentage}%`,
                              SYMBOLS.HIGH)
                    }
                })
            })
        }

        // Schedule next run
        const nextInterval = Device.isCharging() ? 
            CHECK_INTERVAL_CHARGING : 
            CHECK_INTERVAL_NORMAL

        let scheduleNotification = new Notification()
        scheduleNotification.scriptName = Script.name()
        scheduleNotification.setTriggerDate(new Date(Date.now() + nextInterval))
        scheduleNotification.schedule()

        console.log(`Next check scheduled in ${Device.isCharging() ? '5' : '20'} minutes`)
    } catch (error) {
        console.log(`Update failed: ${error.message}`)
        notify("Update Error", error.message, SYMBOLS.ERROR)
    }
}

// Run update
await updateDeviceStatus()
