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
        return model || "Unknown Model"
    } catch (error) {
        log("WARN", `Could not get device model: ${error}`)
        return "Unknown Model"
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
        log("DEBUG", `GitHub API Response: ${JSON.stringify(response)}`)

        // Handle 404 or empty response
        if (response.message === "Not Found" || !response) {
            log("INFO", "File not found, creating initial structure")
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

        // If we have content, try to decode and parse it
        if (response.content) {
            try {
                // Remove any newlines from base64 string
                const cleanContent = response.content.replace(/\n/g, '')
                const decodedContent = atob(cleanContent)
                const parsedData = JSON.parse(decodedContent)

                log("INFO", "Successfully parsed existing data")
                log("DEBUG", `Parsed data: ${JSON.stringify(parsedData)}`)

                return {
                    data: parsedData,
                    sha: response.sha
                }
            } catch (parseError) {
                log("ERROR", `Parse error: ${parseError}`)
                // Create new structure if parse fails
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
        } else {
            log("INFO", "No content found, creating initial structure")
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
    } catch (error) {
        log("ERROR", `GitHub fetch error: ${error}`)
        throw error
    }
}

async function updateGithubFile(content, sha) {
    if (!GITHUB_TOKEN) {
        throw new Error("GitHub token not configured")
    }

    log("INFO", "Preparing GitHub update...")
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
        log("DEBUG", `Content to update: ${stringContent}`)

        const body = {
            message: `Update device status: ${Device.name()}`,
            content: btoa(stringContent)
        }

        if (sha) {
            body.sha = sha
            log("DEBUG", `Using SHA: ${sha}`)
        }

        req.body = JSON.stringify(body)
        log("INFO", "Sending update request...")

        const response = await req.loadJSON()

        if (response.content) {
            log("SUCCESS", "GitHub update successful")
            return true
        } else {
            throw new Error("Invalid response from GitHub")
        }
    } catch (error) {
        log("ERROR", `GitHub update error: ${error}`)
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

        // First get existing data
        const { data: existingData, sha } = await getGithubFile()
        log("INFO", "Retrieved existing GitHub data")

        // Create new device info
        const deviceInfo = {
            device_name: deviceName,
            device_type: Device.isPad() ? "ipad" : "iphone",
            device_model: deviceModel,
            system_info: {
                os_version: Device.systemVersion(),
                model: deviceModel,
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

        // Create updated data structure while preserving existing data
        const updatedData = {
            devices: {
                macs: { ...(existingData?.devices?.macs || {}) },
                ipads: { ...(existingData?.devices?.ipads || {}) },
                iphones: { ...(existingData?.devices?.iphones || {}) }
            },
            last_updated: Date.now()
        }

        // Update appropriate category
        const deviceType = Device.isPad() ? "ipads" : "iphones"
        updatedData.devices[deviceType][deviceName] = deviceInfo

        log("INFO", `Updating ${deviceType} category with device: ${deviceName}`)
        log("DEBUG", `Final data structure: ${JSON.stringify(updatedData, null, 2)}`)

        const success = await updateGithubFile(updatedData, sha)
        if (!success) {
            throw new Error("Failed to update GitHub")
        }

        log("SUCCESS", "Update completed successfully")

    } catch (error) {
        log("ERROR", `Update failed: ${error.message}`)
        throw error
    }
}

// Run update
await updateDeviceStatus()
