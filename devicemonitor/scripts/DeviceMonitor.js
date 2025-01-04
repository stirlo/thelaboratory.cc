// Configuration
const GITHUB_TOKEN = "" // Add your PAT when deploying
const GITHUB_REPO = "stirlo/thelaboratory.cc"
const GITHUB_PATH = "devicemonitor/data/devices.json"

// Notification helper function
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
        if (error.message.includes("token")) {
            throw new Error("GitHub authentication failed - check your token")
        }
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

        // Check GitHub token first
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

        console.log("
