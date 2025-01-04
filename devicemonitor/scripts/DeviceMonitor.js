// Configuration
const GITHUB_TOKEN = "" // Your GitHub Personal Access Token needs to be added here
const GITHUB_REPO = "stirlo/thelaboratory.cc"
const GITHUB_PATH = "devicemonitor/data/devices.json"

async function getGithubFile() {
    console.log("Starting GitHub fetch...")
    const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_PATH}`
    console.log(`Fetching from URL: ${url}`)

    const req = new Request(url)
    req.headers = {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
    }

    try {
        console.log("Sending GitHub request...")
        const response = await req.loadJSON()
        console.log("Got response from GitHub")

        if (!response.content) {
            throw new Error("No content in GitHub response")
        }

        const content = Data.fromBase64String(response.content).toRawString()
        console.log("Current content:", content)
        return { 
            data: JSON.parse(content), 
            sha: response.sha 
        }
    } catch (error) {
        console.error("Detailed GitHub fetch error:", error)
        console.error("Error name:", error.name)
        console.error("Error message:", error.message)
        throw error // Re-throw to handle in main function
    }
}

async function updateGithubFile(content, sha) {
    if (!GITHUB_TOKEN) {
        throw new Error("GitHub token not configured")
    }

    console.log("Starting GitHub update...")
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
        console.log("Sending update request to GitHub...")
        const response = await req.loadJSON()
        console.log("GitHub update response received")
        return true
    } catch (error) {
        console.error("GitHub update error:", error)
        console.error("Error name:", error.name)
        console.error("Error message:", error.message)
        throw error
    }
}

async function updateDeviceStatus() {
    try {
        console.log("Starting device update process...")
        console.log(`Device name: ${Device.name()}`)
        console.log(`Device type: ${Device.isPad() ? "iPad" : "iPhone"}`)
        console.log(`Battery level: ${Math.round(Device.batteryLevel() * 100)}%`)
        console.log(`Charging status: ${Device.isCharging()}`)

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
            console.log("Creating devices structure")
            data.devices = {}
        }

        // Ensure all device type categories exist
        if (!data.devices.macs) data.devices.macs = {}
        if (!data.devices.ipads) data.devices.ipads = {}
        if (!data.devices.iphones) data.devices.iphones = {}

        // Update appropriate category
        const deviceType = Device.isPad() ? "ipads" : "iphones"
        console.log(`Updating ${deviceType} category with device: ${Device.name()}`)
        data.devices[deviceType][Device.name()] = deviceInfo

        // Update timestamp
        data.last_updated = Date.now()

        await updateGithubFile(data, sha)
        console.log("Update completed successfully")

    } catch (error) {
        console.error("Fatal error in updateDeviceStatus:", error)
        notify("Update Error", `Failed to update device status: ${error.message}`, "xmark.circle.fill")
    }
}

// Run update
await updateDeviceStatus()
