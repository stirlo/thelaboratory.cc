// Configuration
const GITHUB_TOKEN = "" // Add your PAT when deploying
const GITHUB_REPO = "stirlo/thelaboratory.cc"
const GITHUB_PATH = "devicemonitor/data/devices.json"

// Battery thresholds
const BATTERY_THRESHOLDS = {
    CRITICAL: 20,
    LOW: 40,
    HIGH: 75,
    FULL: 100
}
const CHECK_INTERVALS = {
    CHARGING: 5 * 60 * 1000,  // 5 minutes
    NORMAL: 20 * 60 * 1000    // 20 minutes
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
        const content = Data.fromBase64String(response.content).toRawString()
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
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
    }
    req.method = 'PUT'

    const body = {
        message: `Update device status: ${Device.name()}`,
        content: Data.fromString(JSON.stringify(content, null, 2)).toBase64String(),
        sha: sha
    }

    req.body = JSON.stringify(body)
    try {
        const response = await req.loadJSON()
        console.log("GitHub update successful")
        return true
    } catch (error) {
        console.log(`GitHub update error: ${error.message}`)
        return false
    }
}

async function updateDeviceStatus() {
    console.log("Starting device update...")

    // Match the Mac format for consistency
    const deviceInfo = {
        device_name: Device.name(),
        device_type: Device.isPad() ? "ipad" : "iphone",
        system_info: {
            os_version: Device.systemVersion(),
            build_number: Device.buildNumber, // Fixed: removed parentheses
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

        // Ensure all device type categories exist
        if (!data.devices) data.devices = {}
        if (!data.devices.macs) data.devices.macs = {}
        if (!data.devices.ipads) data.devices.ipads = {}
        if (!data.devices.iphones) data.devices.iphones = {}

        // Update the appropriate category based on device type
        const deviceType = Device.isPad() ? "ipads" : "iphones"
        data.devices[deviceType][Device.name()] = deviceInfo

        // Update the last_updated timestamp
        data.last_updated = Date.now()

        if (await updateGithubFile(data, sha)) {
            console.log(`Successfully updated ${deviceType} data for ${Device.name()}`)

            // Check battery levels and notify if needed
            const battery = deviceInfo.system_info.battery
            if (!battery.charging && battery.percentage <= BATTERY_THRESHOLDS.CRITICAL) {
                notify("Critical Battery", 
                      `${Device.name()}: ${battery.percentage}%`,
                      "exclamationmark.triangle.fill")
            } else if (!battery.charging && battery.percentage <= BATTERY_THRESHOLDS.LOW) {
                notify("Low Battery",
                      `${Device.name()}: ${battery.percentage}%`,
                      "battery.25")
            } else if (battery.charging && battery.percentage >= BATTERY_THRESHOLDS.FULL) {
                notify("Battery Full",
                      `${Device.name()}: ${battery.percentage}%`,
                      "battery.100.bolt")
            } else if (battery.charging && battery.percentage >= BATTERY_THRESHOLDS.HIGH) {
                notify("Battery Almost Full",
                      `${Device.name()}: ${battery.percentage}%`,
                      "battery.75.bolt")
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
