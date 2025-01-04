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

async function getGithubFile() {
    console.log("Starting GitHub fetch...")
    const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_PATH}`
    console.log(`Fetching from URL: ${url}`)

    if (!GITHUB_TOKEN) {
        throw new Error("GitHub token not configured")
    }

    const req = new Request(url)
    req.headers = {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
    }

    try {
        console.log("Sending GitHub request...")
        const response = await req.loadJSON()

        if (!response || !response.content) {
            throw new Error("Invalid GitHub response")
        }

        const content = Data.fromBase64String(response.content).toRawString()
        console.log("Received content:", content)
        return { 
            data: JSON.parse(content), 
            sha: response.sha 
        }
    } catch (error) {
        console.error(`GitHub fetch error: ${error.message}`)
        throw error
    }
}

async function updateGithubFile(content, sha) {
    if (!GITHUB_TOKEN) {
        throw new Error("GitHub token not configured")
    }

    console.log("Preparing GitHub update...")
    const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_PATH}`
    const req = new Request(url)
    req.method = 'PUT'
    req.headers = {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
    }

    try {
        const stringContent = JSON.stringify(content, null, 2)
        console.log("Content to update:", stringContent)

        const body = {
            message: `Update device status: ${Device.name()}`,
            content: Data.fromString(stringContent).toBase64String(),
            sha: sha
        }

        req.body = JSON.stringify(body)
        console.log("Sending update request...")
        const response = await req.loadJSON()
        console.log("Update successful")
        return true
    } catch (error) {
        console.error(`GitHub update error: ${error.message}`)
        return false
    }
}

async function updateDeviceStatus() {
    try {
        console.log("Starting device update process...")

        if (!GITHUB_TOKEN) {
            throw new Error("Please configure your GitHub token at the top of the script")
        }

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

        console.log("Device info prepared:", JSON.stringify(deviceInfo, null, 2))

        const { data, sha } = await getGithubFile()
        console.log("Got existing GitHub data")

        // Ensure structure exists
        if (!data.devices) {
            data.devices = {}
        }
        if (!data.devices.macs) data.devices.macs = {}
        if (!data.devices.ipads) data.devices.ipads = {}
        if (!data.devices.iphones) data.devices.iphones = {}

        // Update appropriate category
        const deviceType = Device.isPad() ? "ipads" : "iphones"
        console.log(`Updating ${deviceType} category with device: ${Device.name()}`)
        data.devices[deviceType][Device.name()] = deviceInfo

        // Update timestamp
        data.last_updated = Date.now()

        const success = await updateGithubFile(data, sha)
        if (!success) {
            throw new Error("Failed to update GitHub")
        }

        console.log("Update completed successfully")

    } catch (error) {
        console.error("Update failed:", error.message)
        notify("Update Error", error.message, "xmark.circle.fill")
    }
}

// Run update
await updateDeviceStatus()
