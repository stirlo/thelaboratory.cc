// Configuration
const GITHUB_TOKEN = "" // Add your PAT when deploying
const GITHUB_REPO = "stirlo/thelaboratory.cc"
const GITHUB_PATH = "devicemonitor/data/devices.json"

// Device Configuration - Set this for each device
const DEVICE_NAME = "MiniProductRed13" // Set unique device name here
const DEVICE_MODEL = "iPhone 13 mini"   // Set specific model here

// Thresholds and Intervals
const BATTERY_LOW = 40
const BATTERY_CRITICAL = 20
const BATTERY_READY = 75
const BATTERY_FULL = 100
const STORAGE_WARNING = 90
const CHECK_INTERVAL_CHARGING = 5 * 60 // 5 minutes in seconds
const CHECK_INTERVAL_BATTERY = 20 * 60 // 20 minutes in seconds

function log(type, message) {
    if (['INFO', 'WARN', 'ERROR', 'SUCCESS'].includes(type.toUpperCase())) {
        const timestamp = new Date().toISOString()
        console.log(`${timestamp}: [${type}] ${message}`)
    }
}

async function sendNotification(title, body, critical = false) {
    try {
        log("INFO", `Scheduling notification: ${title} - ${body}`)
        let notification = new Notification()
        notification.title = title
        notification.body = body
        notification.sound = critical ? "alert" : "default"
        notification.threadIdentifier = "DeviceMonitor"

        if (title.includes("battery.0") || title.includes("battery.25")) {
            notification.addAction("battery.circle Settings", "prefs:root=BATTERY_USAGE")
        }
        if (title.includes("externaldrive")) {
            notification.addAction("folder.circle Settings", "prefs:root=STORAGE")
        }

        // Set next check interval based on charging state
        notification.trigger = {
            timeInterval: Device.isCharging() ? CHECK_INTERVAL_CHARGING : CHECK_INTERVAL_BATTERY,
            repeats: false
        }

        await notification.schedule()
        log("SUCCESS", "Notification scheduled successfully")
    } catch (error) {
        log("ERROR", `Failed to schedule notification: ${error}`)
    }
}

async function getGithubFile() {
    if (!GITHUB_TOKEN) {
        throw new Error("GitHub token not configured")
    }

    const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_PATH}`
    const req = new Request(url)
    req.headers = {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
    }

    try {
        const response = await req.loadJSON()

        if (response.message === "Not Found" || !response) {
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

        if (response.content) {
            const cleanContent = response.content.replace(/\n/g, '')
            const decodedContent = atob(cleanContent)
            const parsedData = JSON.parse(decodedContent)

            return {
                data: parsedData,
                sha: response.sha
            }
        }

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
    } catch (error) {
        log("ERROR", `GitHub fetch error: ${error}`)
        throw error
    }
}

async function updateGithubFile(content, sha) {
    if (!GITHUB_TOKEN) {
        throw new Error("GitHub token not configured")
    }

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
        const body = {
            message: `Update device status: ${DEVICE_NAME}`,
            content: btoa(stringContent)
        }

        if (sha) {
            body.sha = sha
        }

        req.body = JSON.stringify(body)
        const response = await req.loadJSON()

        return response.content ? true : false
    } catch (error) {
        log("ERROR", `GitHub update error: ${error}`)
        throw error
    }
}

async function checkAllDevicesAndNotify(existingData) {
    try {
        log("INFO", "Starting notification check")
        const allDevices = [
            ...Object.values(existingData?.devices?.iphones || {}),
            ...Object.values(existingData?.devices?.ipads || {}),
            ...Object.values(existingData?.devices?.macs || {})
        ]

        for (const device of allDevices) {
            const battery = device.system_info?.battery
            if (!battery) continue

            log("INFO", `Checking ${device.device_name}: ${battery.percentage}%, charging: ${battery.charging}`)

            if (!battery.charging) {
                if (battery.percentage <= BATTERY_CRITICAL) {
                    await sendNotification(
                        "battery.0 Critical Battery",
                        `${device.device_name} battery critically low at ${battery.percentage}%!`,
                        true
                    )
                } else if (battery.percentage <= BATTERY_LOW) {
                    await sendNotification(
                        "battery.25 Low Battery",
                        `${device.device_name} battery at ${battery.percentage}%`
                    )
                }
            }

            if (battery.charging) {
                if (battery.percentage >= BATTERY_FULL) {
                    await sendNotification(
                        "battery.100.bolt Fully Charged",
                        `${device.device_name} is fully charged`
                    )
                } else if (battery.percentage >= BATTERY_READY) {
                    await sendNotification(
                        "battery.75.bolt Ready to Unplug",
                        `${device.device_name} is charged enough (${battery.percentage}%)`
                    )
                }
            }

            if (device.system_info?.storage?.boot_drive >= STORAGE_WARNING) {
                await sendNotification(
                    "externaldrive.badge.exclamationmark Storage Alert",
                    `${device.device_name} storage is ${device.system_info.storage.boot_drive}% full`
                )
            }
        }
    } catch (error) {
        log("ERROR", `Notification check failed: ${error}`)
    }
}

async function updateDeviceStatus() {
    try {
        const { data: existingData, sha } = await getGithubFile()

        await checkAllDevicesAndNotify(existingData)

        const deviceInfo = {
            device_name: DEVICE_NAME,
            device_type: Device.isPad() ? "ipad" : "iphone",
            device_model: DEVICE_MODEL,
            system_info: {
                os_version: Device.systemVersion(),
                model: DEVICE_MODEL,
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

        const updatedData = {
            devices: {
                macs: { ...(existingData?.devices?.macs || {}) },
                ipads: { ...(existingData?.devices?.ipads || {}) },
                iphones: { ...(existingData?.devices?.iphones || {}) }
            },
            last_updated: Date.now()
        }

        const deviceType = Device.isPad() ? "ipads" : "iphones"
        updatedData.devices[deviceType][DEVICE_NAME] = deviceInfo

        const success = await updateGithubFile(updatedData, sha)
        if (!success) {
            throw new Error("Failed to update GitHub")
        }

        log("SUCCESS", `Update completed successfully for ${DEVICE_NAME}`)

    } catch (error) {
        log("ERROR", `Update failed: ${error}`)
        throw error
    }
}

// Run update and schedule next notification
await updateDeviceStatus()
