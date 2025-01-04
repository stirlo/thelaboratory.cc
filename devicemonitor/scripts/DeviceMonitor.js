// Configuration
const GITHUB_TOKEN = "" // Add your PAT when deploying
const GITHUB_REPO = "stirlo/thelaboratory.cc"
const GITHUB_PATH = "devicemonitor/data/devices.json"

// Battery thresholds
const BATTERY_ALERTS = {
    CRITICAL: {
        threshold: 20,
        requiresNotCharging: true,
        symbol: "exclamationmark.triangle.fill",
        title: "Critical Battery"
    },
    LOW: {
        threshold: 40,
        requiresNotCharging: true,
        symbol: "battery.25",
        title: "Low Battery"
    },
    HIGH: {
        threshold: 75,
        requiresCharging: true,
        symbol: "battery.75.bolt",
        title: "Battery Almost Full"
    },
    FULL: {
        threshold: 100,
        requiresCharging: true,
        symbol: "battery.100.bolt",
        title: "Battery Full"
    }
}

async function getGithubFile() {
    console.log("Fetching current JSON from GitHub...")
    const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_PATH}`
    const req = new Request(url)
    req.headers = {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
    }

    try {
        const response = await req.loadJSON()
        const content = Data.fromBase64String(response.content).toRawString()
        console.log("Current JSON structure:", content)
        return { 
            data: JSON.parse(content), 
            sha: response.sha 
        }
    } catch (error) {
        console.error("GitHub fetch error:", error)
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
    console.log("Preparing GitHub update...")
    const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_PATH}`
    const req = new Request(url)
    req.method = 'PUT'
    req.headers = {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
    }

    const body = {
        message: `Update device status: ${Device.name()}`,
        content: Data.fromString(JSON.stringify(content, null, 2)).toBase64String(),
        sha: sha
    }

    req.body = JSON.stringify(body)
    console.log("Sending update to GitHub...")

    try {
        const response = await req.loadJSON()
        console.log("GitHub update successful")
        return true
    } catch (error) {
        console.error("GitHub update failed:", error)
        return false
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
    console.log(`Notification sent: ${title} - ${message}`)
}

async function updateDeviceStatus() {
    console.log(`Starting update for device: ${Device.name()} (${Device.isPad() ? "iPad" : "iPhone"})`)
    console.log(`Battery level: ${Math.round(Device.batteryLevel() * 100)}%, Charging: ${Device.isCharging()}`)

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

        // Ensure structure exists
        if (!data.devices) {
            console.log("Creating devices structure")
            data.devices = {}
        }

        // Ensure device categories exist
        if (!data.devices.macs) data.devices.macs = {}
        if (!data.devices.ipads) data.devices.ipads = {}
        if (!data.devices.iphones) data.devices.iphones = {}

        // Update appropriate category
        const deviceType = Device.isPad() ? "ipads" : "iphones"
        console.log(`Updating ${deviceType} category with device: ${Device.name()}`)
        data.devices[deviceType][Device.name()] = deviceInfo

        // Update timestamp
        data.last_updated = Date.now()

        console.log("Prepared update:", JSON.stringify(data, null, 2))

        if (await updateGithubFile(data, sha)) {
            console.log("GitHub update successful")

            // Check battery status and send notifications
            const battery = deviceInfo.system_info.battery
            if (!battery.charging && battery.percentage <= BATTERY_ALERTS.CRITICAL.threshold) {
                notify(BATTERY_ALERTS.CRITICAL.title,
                      `${Device.name()}: ${battery.percentage}%`,
                      BATTERY_ALERTS.CRITICAL.symbol)
            } else if (!battery.charging && battery.percentage <= BATTERY_ALERTS.LOW.threshold) {
                notify(BATTERY_ALERTS.LOW.title,
                      `${Device.name()}: ${battery.percentage}%`,
                      BATTERY_ALERTS.LOW.symbol)
            } else if (battery.charging && battery.percentage >= BATTERY_ALERTS.FULL.threshold) {
                notify(BATTERY_ALERTS.FULL.title,
                      `${Device.name()}: ${battery.percentage}%`,
                      BATTERY_ALERTS.FULL.symbol)
            } else if (battery.charging && battery.percentage >= BATTERY_ALERTS.HIGH.threshold) {
                notify(BATTERY_ALERTS.HIGH.title,
                      `${Device.name()}: ${battery.percentage}%`,
                      BATTERY_ALERTS.HIGH.symbol)
            }
        } else {
            throw new Error("Failed to update GitHub")
        }
    } catch (error) {
        console.error("Update failed:", error)
        notify("Update Error", `Failed to update device status: ${error.message}`, "xmark.circle.fill")
    }
}

// Run update
await updateDeviceStatus()
