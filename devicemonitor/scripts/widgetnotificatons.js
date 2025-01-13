// Device Monitor Widget
// Shows battery levels and handles notifications

const BATTERY_LOW = 40
const BATTERY_CRITICAL = 20
const BATTERY_READY = 75
const BATTERY_FULL = 100
const STORAGE_WARNING = 90
const UPDATE_INTERVAL = 20 * 60 * 1000 // 20 minutes in milliseconds

// Store last notification times in Scriptable's persistent storage
let fm = FileManager.local()
let notificationCachePath = fm.joinPath(fm.documentsDirectory(), "deviceMonitorCache.json")

function loadNotificationCache() {
    try {
        if (fm.fileExists(notificationCachePath)) {
            return JSON.parse(fm.readString(notificationCachePath))
        }
    } catch (e) {}
    return {
        lastCheck: 0,
        lastNotifications: {},
        lastJsonUpdate: 0
    }
}

function saveNotificationCache(cache) {
    fm.writeString(notificationCachePath, JSON.stringify(cache))
}

async function fetchDeviceData() {
    const url = "https://raw.githubusercontent.com/stirlo/thelaboratory.cc/main/devicemonitor/data/devices.json"
    const req = new Request(url)
    return await req.loadJSON()
}

function isUPSDevice(device) {
    return device.device_type === 'mac' && device.device_name.includes('M1 TFPSERVER')
}

async function sendNotification(deviceId, type, title, body, critical = false) {
    const cache = loadNotificationCache()
    const now = Date.now()
    const lastNotif = cache.lastNotifications[`${deviceId}-${type}`] || 0

    // Don't repeat notifications within 1 hour
    if (now - lastNotif < 60 * 60 * 1000) {
        return false
    }

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

    await notification.schedule()

    // Update notification cache
    cache.lastNotifications[`${deviceId}-${type}`] = now
    saveNotificationCache(cache)
    return true
}

async function checkDevicesAndNotify(devices, jsonLastUpdated) {
    const cache = loadNotificationCache()

    // If JSON hasn't been updated since our last check, skip notifications
    if (jsonLastUpdated <= cache.lastJsonUpdate) {
        console.log("No new data since last check, skipping notifications")
        return
    }

    for (let device of devices) {
        const battery = device.system_info?.battery
        if (!battery) continue

        if (isUPSDevice(device)) {
            // UPS-specific notifications
            if (!battery.on_ac) {
                await sendNotification(
                    device.device_name,
                    'ups-battery',
                    "bolt.slash.circle UPS on Battery",
                    `${device.device_name} is running on UPS power!`,
                    true
                )
            }
            if (battery.percentage < BATTERY_FULL) {
                await sendNotification(
                    device.device_name,
                    'ups-warning',
                    "bolt.circle UPS Not at Full",
                    `${device.device_name} UPS at ${battery.percentage}%`,
                    battery.percentage < 95
                )
            }
        } else {
            // Regular device notifications
            if (!battery.charging) {
                if (battery.percentage <= BATTERY_CRITICAL) {
                    await sendNotification(
                        device.device_name,
                        'critical-battery',
                        "battery.0 Critical Battery",
                        `${device.device_name} battery critically low at ${battery.percentage}%!`,
                        true
                    )
                } else if (battery.percentage <= BATTERY_LOW) {
                    await sendNotification(
                        device.device_name,
                        'low-battery',
                        "battery.25 Low Battery",
                        `${device.device_name} battery at ${battery.percentage}%`
                    )
                }
            }

            if (battery.charging) {
                if (battery.percentage >= BATTERY_FULL) {
                    await sendNotification(
                        device.device_name,
                        'full-battery',
                        "battery.100.bolt Fully Charged",
                        `${device.device_name} is fully charged`
                    )
                } else if (battery.percentage >= BATTERY_READY) {
                    await sendNotification(
                        device.device_name,
                        'ready-battery',
                        "battery.75.bolt Ready to Unplug",
                        `${device.device_name} is charged enough (${battery.percentage}%)`
                    )
                }
            }
        }

        if (device.system_info?.storage?.boot_drive >= STORAGE_WARNING) {
            await sendNotification(
                device.device_name,
                'storage-warning',
                "externaldrive.badge.exclamationmark Storage Alert",
                `${device.device_name} storage is ${device.system_info.storage.boot_drive}% full`
            )
        }
    }

    // Update cache with latest JSON update time
    cache.lastJsonUpdate = jsonLastUpdated
    cache.lastCheck = Date.now()
    saveNotificationCache(cache)
}

function getDeviceSymbol(type, deviceName) {
    switch(type) {
        case 'mac':
            return deviceName.includes('M1 TFPSERVER') ? 'macmini' : 'laptopcomputer'
        case 'ipad':
            return deviceName.includes('m4eleven') ? 'ipad.landscape' : 'ipad'
        case 'iphone':
            return deviceName.includes('MiniProductRed13') ? 'iphone.gen2' : 
                   deviceName.includes('A18p tfp.la/stirling') ? 'iphone.gen3' : 'iphone'
        case 'android':
            return deviceName.includes('Boox_Palma') ? 'candybarphone' : 'smartphone'
        default:
            return 'questionmark'
    }
}

function getBatterySymbol(percentage, charging, device) {
    if (isUPSDevice(device)) {
        return charging ? 'bolt.circle' : 'bolt.slash.circle'
    }

    if (charging) {
        return 'battery.100percent.bolt'
    }

    if (percentage <= 10) return 'battery.0percent'
    if (percentage <= 25) return 'battery.25percent'
    if (percentage <= 50) return 'battery.50percent'
    if (percentage <= 75) return 'battery.75percent'
    return 'battery.100percent'
}

// Create Widget
let widget = new ListWidget()
widget.backgroundColor = new Color("#1a1a1a")
widget.setPadding(16, 16, 16, 16)

// Main execution
let data = await fetchDeviceData()
let jsonLastUpdated = new Date(data.last_updated).getTime()

let devices = []
Object.keys(data.devices).forEach(category => {
    Object.values(data.devices[category]).forEach(device => {
        devices.push(device)
    })
})

// Sort by battery percentage
devices.sort((a, b) => 
    a.system_info.battery.percentage - b.system_info.battery.percentage
)

// Check notifications only if JSON has been updated
await checkDevicesAndNotify(devices, jsonLastUpdated)

// Add title to widget
let titleText = widget.addText("Device Battery Levels")
titleText.font = Font.boldSystemFont(14)
titleText.textColor = Color.white()
widget.addSpacer(8)

// Create widget UI for each device
for (let device of devices) {
    let row = widget.addStack()
    row.centerAlignContent()
    row.spacing = 8

    // Device icon and name (left side)
    let leftStack = row.addStack()
    leftStack.centerAlignContent()
    leftStack.spacing = 4

    let deviceSymbol = SFSymbol.named(getDeviceSymbol(device.device_type, device.device_name))

    if (deviceSymbol) {
        let deviceIcon = leftStack.addImage(deviceSymbol.image)
        deviceIcon.imageSize = new Size(16, 16)
        deviceIcon.tintColor = Color.white()
    }

    let nameText = leftStack.addText(`${device.device_name} (${device.system_info.os_version})`)
    nameText.font = Font.systemFont(12)
    nameText.textColor = Color.white()

    row.addSpacer()

    // Battery info (right side)
    let rightStack = row.addStack()
    rightStack.centerAlignContent()
    rightStack.spacing = 6

    let batterySymbol = SFSymbol.named(getBatterySymbol(
        device.system_info.battery.percentage,
        device.system_info.battery.charging,
        device
    ))

    if (batterySymbol) {
        let batteryIcon = rightStack.addImage(batterySymbol.image)
        batteryIcon.imageSize = new Size(20, 12)

        // Color based on battery level and charging status
        if (isUPSDevice(device)) {
            if (!device.system_info.battery.on_ac) {
                batteryIcon.tintColor = new Color("#FF3B30")  // Red for UPS on battery
            } else if (device.system_info.battery.percentage < 100) {
                batteryIcon.tintColor = new Color("#FFD60A")  // Yellow for not full
            } else {
                batteryIcon.tintColor = new Color("#30D158")  // Green for full on AC
            }
        } else {
            if (device.system_info.battery.percentage <= 20) {
                batteryIcon.tintColor = new Color("#FF3B30")  // Red for low battery
            } else if (device.system_info.battery.charging) {
                batteryIcon.tintColor = new Color("#30D158")  // Green for charging
            } else if (device.system_info.battery.percentage <= 50) {
                batteryIcon.tintColor = new Color("#FFD60A")  // Yellow for medium battery
            } else {
                batteryIcon.tintColor = Color.white()  // White for good battery
            }
        }
    }

    let percentText = rightStack.addText(`${device.system_info.battery.percentage}%`)
    percentText.font = Font.systemFont(12)
    percentText.textColor = Color.white()

    widget.addSpacer(4)
}

// Set widget refresh interval (20 minutes)
widget.refreshAfterDate = new Date(Date.now() + UPDATE_INTERVAL)

if (config.runsInWidget) {
    Script.setWidget(widget)
} else {
    widget.presentMedium()
}

Script.complete()
