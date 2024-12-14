// Variables used by Scriptable.
// These must be at the very top of the file.
// @ts-ignore
// icon-color: deep-gray; icon-glyph: signal;

// Configuration constants
const CACHE_KEY_PREFIX = 'site_status_'
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes in milliseconds
const BACKGROUND_REFRESH_KEY = 'last_background_refresh'
const NOTIFICATION_CACHE_KEY = 'site_status_notifications'
const NOTIFICATION_COOLDOWN = 30 * 60 * 1000 // 30 minutes in milliseconds

// Battery-optimized check intervals
const CHECK_INTERVAL_BATTERY = 20 * 60 // 20 minutes when on battery
const CHECK_INTERVAL_CHARGING = 10 * 60 // 10 minutes when charging
const ACTIVE_HOURS_START = 7
const ACTIVE_HOURS_END = 23
const BATTERY_THRESHOLD = 0.4 // 40% battery threshold

const sites = [
    {
        name: 'Zmanim, Calendar and ICS',
        url: 'https://stirlo.github.io/zmanim_ICS/',
        github: 'stirlo/zmanim_ICS',
        logo: 'zmanim_ICS.png'
    },
    {
        name: 'Adhan-Flipperzero',
        url: 'https://github.com/stirlo/adhan/',
        github: 'stirlo/adhan',
        logo: 'adhan-flipper-512x512.png'
    },
    {
        name: 'Adhan Swift/Web',
        url: 'https://stirlo.github.io/adhan-swift/',
        github: 'stirlo/adhan-swift',
        logo: 'adhan-swift-512x512.png'
    },
    {
        name: 'InfiniteReality.cc',
        url: 'https://infinitereality.cc',
        github: 'jailbreaktheuniverse/infinitereality.cc',
        logo: 'infinitereality.cc-384x384.png'
    },
    {
        name: 'JPT-flipperzero',
        url: 'https://github.com/stirlo/JPT-flipperzero/',
        github: 'stirlo/JPT-flipperzero',
        logo: 'JPT-flipper-512x512.png'
    },
    {
        name: 'OurSquadIs.top',
        url: 'https://oursquadis.top',
        github: 'stirlo/oursquadis.top',
        logo: 'oursquadis.top-512x512.png'
    },
    {
        name: 'Plaintext to ICS Converter',
        url: 'https://stirlo.github.io/txt_to_ICS_Prayer_Times/',
        github: 'stirlo/txt_to_ICS_Prayer_Times',
        logo: '23F0_color.png'
    },
    {
        name: 'Stirlo.be',
        url: 'https://stirlo.be',
        github: 'stirlo/stirlo.be',
        logo: 'stirlo.be-512x512.png'
    },
    {
        name: 'Stirlo.space',
        url: 'https://stirlo.space',
        github: 'stirlo/stirlo.space',
        logo: 'stirlo.space-512x512.png'
    },
    {
        name: 'TFP.la',
        url: 'https://tfp.la',
        github: 'stirlo/tfp.la',
        logo: 'tfp-green-512.png'
    },
    {
        name: 'The Goss Room',
        url: 'https://thegossroom.com',
        github: 'stirlo/thegossroom.com',
        logo: 'thegossroom-512x512.png'
    },
    {
        name: 'TheLaboratory.cc',
        url: 'https://thelaboratory.cc',
        github: 'stirlo/thelaboratory.cc',
        logo: 'apple-touch-icon.png'
    }
];

class StatusWidget {
    constructor() {
        this.widget = new ListWidget()
        this.widget.backgroundColor = Color.dynamic(
            new Color("#ffffff"),
            new Color("#1a1a1a")
        )

        const sizeConfig = this.getSizeConfig()
        this.maxSitesToShow = sizeConfig.maxSites
        this.imageSize = sizeConfig.imageSize

        const padding = config.widgetFamily === 'extraLarge' ? 20 : 16
        this.widget.setPadding(padding, padding, padding, padding)

        this.widget.refreshAfterDate = new Date(Date.now() + CACHE_DURATION)
    }

    getSizeConfig() {
        switch (config.widgetFamily) {
            case 'accessoryCircular':
                return { maxSites: 1, imageSize: 12 }
            case 'accessoryRectangular':
                return { maxSites: 2, imageSize: 14 }
            case 'accessoryInline':
                return { maxSites: 1, imageSize: 12 }
            case 'small':
                return { maxSites: 3, imageSize: 16 }
            case 'medium':
                return { maxSites: 5, imageSize: 20 }
            case 'large':
                return { maxSites: 8, imageSize: 24 }
            case 'extraLarge':
                return { maxSites: 12, imageSize: 32 }
            default:
                return { maxSites: 5, imageSize: 20 }
        }
    }

    async loadImage(site) {
        try {
            const cacheKey = `${CACHE_KEY_PREFIX}image_${site.logo}`
            const cached = this.getCachedData(cacheKey)
            if (cached) return Image.fromData(cached)

            const cdnImageUrl = `https://cdn.jsdelivr.net/gh/stirlo/thelaboratory.cc/${site.logo}`

            const backupUrls = [
                cdnImageUrl,
                `https://raw.githubusercontent.com/stirlo/thelaboratory.cc/main/${site.logo}`,
                `${site.url}/apple-touch-icon.png`
            ]

            for (const url of backupUrls) {
                try {
                    const req = new Request(url)
                    req.timeoutInterval = 5
                    const img = await req.loadImage()
                    if (img) {
                        const imgData = await req.load()
                        this.cacheData(cacheKey, imgData)
                        return img
                    }
                } catch (e) {
                    continue
                }
            }
            return null
        } catch (error) {
            return null
        }
    }

    getCachedData(key) {
        try {
            const cache = Keychain.get(key)
            if (!cache) return null

            const { timestamp, data } = JSON.parse(cache)
            if (Date.now() - timestamp > CACHE_DURATION) {
                Keychain.remove(key)
                return null
            }
            return Data.fromBase64String(data)
        } catch {
            return null
        }
    }

    cacheData(key, data) {
        try {
            const cache = {
                timestamp: Date.now(),
                data: data.toBase64String()
            }
            Keychain.set(key, JSON.stringify(cache))
        } catch (e) {
            console.log(`Caching error: ${e}`)
        }
    }

    async checkSiteStatus(url) {
        const cacheKey = `${CACHE_KEY_PREFIX}status_${url}`
        const cached = this.getCachedData(cacheKey)
        const previousStatus = cached ? JSON.parse(cached.toRawString()) : null

        try {
            const request = new Request(url)
            request.timeoutInterval = 5
            const startTime = new Date()
            await request.load()
            const responseTime = new Date() - startTime

            const status = {
                status: 'online',
                responseTime: Math.round(responseTime),
                lastCheck: new Date().toISOString()
            }

            this.cacheData(cacheKey, Data.fromString(JSON.stringify(status)))

            if (previousStatus?.status === 'offline') {
                await this.clearNotificationState(url)
            }

            return status
        } catch (error) {
            const status = {
                status: 'offline',
                error: error.message,
                lastCheck: new Date().toISOString()
            }

            this.cacheData(cacheKey, Data.fromString(JSON.stringify(status)))

            if (previousStatus?.status === 'online') {
                await this.notifySiteOffline(url)
            }

            return status
        }
    }

    async shouldPerformCheck() {
        // Always check if charging
        if (Device.isCharging()) {
            return true
        }

        const hour = new Date().getHours()

        // Check active hours when on battery
        if (hour < ACTIVE_HOURS_START || hour > ACTIVE_HOURS_END) {
            return false
        }

        try {
            const battery = Device.batteryLevel()
            if (battery <= BATTERY_THRESHOLD) {
                await this.sendStatusNotification(`Checks paused - battery at ${Math.round(battery * 100)}%`)
                return false
            }
            return true
        } catch (e) {
            return true
        }
    }

    async getGitHubStatus(github) {
        const cacheKey = `${CACHE_KEY_PREFIX}github_${github}`
        const cached = this.getCachedData(cacheKey)
        if (cached) return JSON.parse(cached.toRawString())

        try {
            const request = new Request(`https://api.github.com/repos/${github}`)
            const data = await request.loadJSON()
            const status = {
                stars: data.stargazers_count,
                lastUpdate: data.updated_at
            }
            this.cacheData(cacheKey, Data.fromString(JSON.stringify(status)))
            return status
        } catch {
            return null
        }
    }

    async createSiteRow(site, status, githubStatus) {
        const row = this.widget.addStack()
        row.layoutHorizontally()
        row.centerAlignContent()
        row.spacing = 8

        const logoImage = await this.loadImage(site)
        if (logoImage) {
            const imgStack = row.addStack()
            const img = imgStack.addImage(logoImage)
            img.imageSize = new Size(this.imageSize, this.imageSize)
            img.cornerRadius = this.imageSize / 4
        } else {
            const indicator = row.addText("●")
            indicator.font = Font.mediumSystemFont(12)
            indicator.textColor = status.status === 'online' 
                ? new Color("#28a745") 
                : new Color("#dc3545")
        }

        const infoStack = row.addStack()
        infoStack.layoutVertically()
        infoStack.spacing = 2

        const nameText = infoStack.addText(site.name)
        nameText.font = Font.mediumSystemFont(12)
        nameText.textColor = Color.dynamic(
            new Color("#000000"),
            new Color("#ffffff")
        )
        nameText.lineLimit = 1

        if (status.status === 'online') {
            const responseText = infoStack.addText(`${status.responseTime}ms`)
            responseText.font = Font.systemFont(10)
            responseText.textColor = Color.gray()
        } else {
            const errorText = infoStack.addText("Offline")
            errorText.font = Font.systemFont(10)
            errorText.textColor = new Color("#dc3545")
        }

        if (githubStatus) {
            const updateText = infoStack.addText(
                `Updated: ${new Date(githubStatus.lastUpdate).toLocaleDateString()}`
            )
            updateText.font = Font.systemFont(9)
            updateText.textColor = Color.gray()
        }

        return row
    }

    async createWidget() {
        const headerStack = this.widget.addStack()
        const title = headerStack.addText("Site Status")
        title.font = Font.boldSystemFont(16)
        title.textColor = Color.dynamic(new Color("#000000"), new Color("#ffffff"))

        this.widget.addSpacer(8)

        const results = await Promise.all(
            sites.slice(0, this.maxSitesToShow).map(async site => {
                const status = await this.checkSiteStatus(site.url)
                const githubStatus = await this.getGitHubStatus(site.github)
                return { site, status, githubStatus }
            })
        )

        const sortedResults = results.sort((a, b) => {
            if (a.status.status !== b.status.status) {
                return a.status.status === 'offline' ? -1 : 1
            }
            if (a.status.responseTime && b.status.responseTime) {
                return b.status.responseTime - a.status.responseTime
            }
            return 0
        })

        for (const result of sortedResults) {
            await this.createSiteRow(result.site, result.status, result.githubStatus)
            this.widget.addSpacer(4)
        }

        this.widget.addSpacer(4)
        const footer = this.widget.addText(
            `Last check: ${new Date().toLocaleTimeString()}`
        )
        footer.font = Font.systemFont(9)
        footer.textColor = Color.gray()
        footer.centerAlignText()

        return this.widget
    }

    async notifySiteOffline(url) {
        const site = sites.find(s => s.url === url)
        if (!site) return

        const notificationState = await this.getNotificationState()
        const now = Date.now()

        if (notificationState[url] && 
            (now - notificationState[url]) < NOTIFICATION_COOLDOWN) {
            return
        }

        notificationState[url] = now
        await this.saveNotificationState(notificationState)

        const notification = new Notification()
        notification.title = "⚠️ Site Down Alert"
        notification.subtitle = site.name
        notification.body = `${site.url} is currently unreachable`
        notification.sound = "default"
        notification.threadIdentifier = "site-status"

        await notification.schedule()
    }

    async sendStatusNotification(message) {
        const notification = new Notification()
        notification.title = "Site Status Monitor"
        notification.body = message
        notification.sound = "default"
        await notification.schedule()
    }

    async getNotificationState() {
        try {
            const state = Keychain.get(NOTIFICATION_CACHE_KEY)
            return state ? JSON.parse(state) : {}
        } catch {
            return {}
        }
    }

    async saveNotificationState(state) {
        Keychain.set(NOTIFICATION_CACHE_KEY, JSON.stringify(state))
    }

    async clearNotificationState(url) {
        const state = await this.getNotificationState()
        delete state[url]
        await this.saveNotificationState(state)
    }
}

async function setupAutomation() {
    let currentSchedule = null

    async function scheduleCheck() {
        const isCharging = Device.isCharging()
        const interval = isCharging ? CHECK_INTERVAL_CHARGING : CHECK_INTERVAL_BATTERY

        if (currentSchedule) {
            currentSchedule.invalidate()
        }

        currentSchedule = new Timer()
        currentSchedule.timeInterval = interval
        currentSchedule.repeats = true

        currentSchedule.schedule(async () => {
            try {
                const widget = new StatusWidget()
                const shouldRun = await widget.shouldPerformCheck()

                if (shouldRun) {
                    await widget.createWidget()
                    Script.setWidget(widget.widget)
                }

                // Reschedule if charging state changed
                if (isCharging !== Device.isCharging()) {
                    await scheduleCheck()
                }
            } catch (error) {
                console.error("Check failed:", error)
            }
        })
    }

    await scheduleCheck()

    const widget = new StatusWidget()
    await widget.sendStatusNotification(
        `Monitoring started - checking every ${Device.isCharging() ? '10' : '20'} minutes`
    )
}

async function run() {
    const widget = new StatusWidget()

    if (args.queryParameters.source === "shortcut") {
        // Called from Shortcuts automation
        await setupAutomation()
    } else if (config.runsInWidget) {
        Script.setWidget(await widget.createWidget())
    } else {
        // Manual run from app
        await setupAutomation()
        await widget.createWidget()
        await widget.widget.presentMedium()
    }

    Script.complete()
}

// Choose which run mode to use
if (config.runsInDebug) {
    await debugRun()
} else {
    await run()
}
