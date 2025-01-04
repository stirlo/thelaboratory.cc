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
                devices: {
                    macs: {},
                    ipads: {},
                    iphones: {}
                },
                last_updated: Date.now()
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

async function updateDeviceStatus() {
    console.log("Starting device update...")
    const deviceInfo = {
        device_name: Device.name(),
        device_type: Device.isPad() ? "ipad" : "iphone",
        system_info: {
            os_version: Device.systemVersion(),
            build_number: Device.buildNumber,
            temperature: 0,
            battery: {
                percentage: Math.round(Device.batteryLevel() * 100),
                charging: Device.isCharging()
            },
            storage: {
                boot_drive: 0
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
        data.last_updated = Date.now()

        if (await updateGithubFile(data, sha)) {
            console.log(`Successfully updated ${deviceType} data for ${Device.name()}`)

            // Schedule next run based on charging status
            const nextInterval = Device.isCharging() ? 
                CHECK_INTERVAL_CHARGING : 
                CHECK_INTERVAL_NORMAL

            // Only notify for important battery events
            if (!deviceInfo.system_info.battery.charging) {
                if (deviceInfo.system_info.battery.percentage <= BATTERY_CRITICAL) {
                    notify("Critical Battery", `${Device.name()} battery at ${deviceInfo.system_info.battery.percentage}%`, "exclamationmark.triangle.fill")
                } else if (deviceInfo.system_info.battery.percentage <= BATTERY_LOW) {
                    notify("Low Battery", `${Device.name()} battery at ${deviceInfo.system_info.battery.percentage}%`, "battery.25")
                }
            } else if (deviceInfo.system_info.battery.charging) {
                if (deviceInfo.system_info.battery.percentage >= BATTERY_FULL) {
                    notify("Battery Full", `${Device.name()} is fully charged`, "battery.100.bolt")
                } else if (deviceInfo.system_info.battery.percentage >= BATTERY_HIGH) {
                    notify("Battery Almost Full", `${Device.name()} at ${deviceInfo.system_info.battery.percentage}%`, "battery.75.bolt")
                }
            }
        }
    } catch (error) {
        console.log(`Update failed: ${error.message}`)
        notify("Update Error", error.message, "xmark.circle.fill")
    }
}

function notify(title, message, symbol = null) {
    let notification = new Notification()
    notification.title = title
    notification.body = message
    if (symbol) {
        notification.addAction(symbol, "", "")
    }
    notification.schedule()
}

// Run update
await updateDeviceStatus()
