// User configuration - edit these if automatic detection fails
const USER_DEVICE_NAME = "" // Leave empty to use automatic detection
const USER_DEVICE_MODEL = "" // Leave empty to use automatic detection

// Configuration
const GITHUB_TOKEN = "" // Add your PAT when deploying
const GITHUB_REPO = "stirlo/thelaboratory.cc"
const GITHUB_PATH = "devicemonitor/data/devices.json"

function log(type, message) {
    const timestamp = new Date().toISOString()
    console.log(`${timestamp}: [${type}] ${message}`)
}

// Get device model info
function getDeviceModel() {
    if (USER_DEVICE_MODEL) return USER_DEVICE_MODEL

    try {
        const model = Device.model()
        const identifier = Device.identifier()
        return `${model} (${identifier})`
    } catch (error) {
        log("WARN", `Could not get device model: ${error}`)
        return "Unknown"
    }
}

// Get device name
function getDeviceName() {
    if (USER_DEVICE_NAME) return USER_DEVICE_NAME

    try {
        const name = Device.name()
        return name || "Unknown Device"
    } catch (error) {
        log("WARN", `Could not get device name: ${error}`)
        return "Unknown Device"
    }
}

async function getGithubFile() {
    log("INFO", "Starting GitHub fetch...")

    if (!GITHUB_TOKEN) {
        throw new Error("GitHub token not configured")
    }

    const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_PATH}`
    log("INFO", `Fetching from URL: ${url}`)

    const req = new Request(url)
    req.headers = {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
    }

    try {
        const response = await req.loadJSON()

        // If file doesn't exist or is empty
        if (!response || !response.content) {
            log("INFO", "Creating new data structure")
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

        // Try to parse existing data
        try {
            const content = Data.fromBase64String(response.content)
            const jsonStr = content.toRawString()
            const parsedData = JSON.parse(jsonStr)
            log("INFO", "Successfully parsed existing data")
            return { 
                data: parsedData, 
                sha: response.sha 
            }
        } catch (parseError) {
            log("ERROR", `Parse error: ${parseError}`)
            // Return initial structure if parsing fails
            return {
                data: {
                    devices: {
                        macs: {},
                        ipads: {},
                        iphones: {}
                    },
                    last_updated: Date.now()
                },
                sha: response.sha
            }
        }
    } catch (error) {
        log("ERROR", `GitHub fetch error: ${error}`)
        throw error
    }
}

async function updateDeviceStatus() {
    try {
        log("INFO", "Starting device update process...")
        const deviceName = getDeviceName()
        const deviceModel = getDeviceModel()

        log("INFO", `Device: ${deviceName} (${deviceModel})`)
        log("INFO", `Battery: ${Math.round(Device.batteryLevel() * 100)}%, Charging: ${Device.isCharging()}`)

        const deviceInfo = {
            device_name: deviceName,
            device_type: Device.isPad() ? "ipad" : "iphone",
            device_model: deviceModel,
            system_info: {
                os_version: Device.systemVersion(),
                build_number: Device.buildNumber,
                model_identifier: Device.identifier(),
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

        const { data, sha } = await getGithubFile()
        log("INFO", "Got existing GitHub data")

        // Ensure structure exists but preserve existing data
        if (!data.devices) {
            data.devices = {}
        }
        if (!data.devices.macs) data.devices.macs = {}
        if (!data.devices.ipads) data.devices.ipads = {}
        if (!data.devices.iphones) data.devices.iphones = {}

        // Update appropriate category
        const deviceType = Device.isPad() ? "ipads" : "iphones"
        log("INFO", `Updating ${deviceType} category with device: ${deviceName}`)
        data.devices[deviceType][deviceName] = deviceInfo

        // Update timestamp
        data.last_updated = Date.now()

        const success = await updateGithubFile(data, sha)
        if (!success) {
            throw new Error("Failed to update GitHub")
        }

        log("SUCCESS", "Update completed successfully")

    } catch (error) {
        log("ERROR", `Update failed: ${error.message}`)
    }
}

// Rest of the code remains the same...

// Run update
await updateDeviceStatus()
