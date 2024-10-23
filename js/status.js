// status.js - Complete version with all functionality
const statusGrid = document.getElementById('statusGrid');
const lastUpdateSpan = document.getElementById('lastUpdate');

// Import sites from main.js if not already available
if (typeof sites === 'undefined') {
    const sites = [
        {
            name: 'TheLaboratory.cc',
            url: 'https://thelaboratory.cc',
            github: 'stirlo/thelaboratory.cc',
            logo: 'apple-touch-icon.png'
        },
        {
            name: 'stirlo.space',
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
            name: 'OurSquadIs.top',
            url: 'https://oursquadis.top',
            github: 'stirlo/oursquadis.top',
            logo: 'oursquadis.top-512x512.png'
        },
        {
            name: 'InfiniteReality.cc',
            url: 'https://infinitereality.cc',
            github: 'https://github.com/jailbreaktheuniverse',
            logo: 'infinitereality.cc-384x384.png'
        },
        {
            name: 'Stirlo.be',
            url: 'https://stirlo.be',
            github: 'stirlo/stirlo.be',
            logo: 'stirlo.be-512x512.png'
        },
        {
            name: 'JPT-flipperzero',
            url: 'https://github.com/stirlo/JPT-flipperzero/',
            github: 'stirlo/JPT-flipperzero',
            logo: 'JPT-flipper-512x512.png'
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
            name: 'Plaintext to ICS Converter',
            url: 'https://stirlo.github.io/txt_to_ICS_Prayer_Times/',
            github: 'stirlo/txt_to_ICS_Prayer_Times',
            logo: 'alarm-clock.svg'
        },
        {
            name: 'The Goss Room',
            url: 'https://thegossroom.com',
            github: 'stirlo/thegossroom.com',
            logo: 'thegossroom-512x512.png'
        }
    ];
}

// Cache for storing status results
const statusCache = new Map();

// Function to check if a site is reachable
async function checkSiteStatus(site) {
    try {
        const startTime = performance.now();

        // Try to fetch the favicon first as it's typically allowed by CORS
        const faviconUrl = new URL('/favicon.ico', site.url).href;
        const response = await fetch(faviconUrl, {
            mode: 'no-cors',
            cache: 'no-cache',
            timeout: 5000
        });

        const endTime = performance.now();
        const responseTime = Math.round(endTime - startTime);

        return {
            status: 'online',
            responseTime: responseTime,
            lastCheck: new Date().toISOString()
        };
    } catch (error) {
        return {
            status: 'offline',
            error: 'Site unreachable',
            lastCheck: new Date().toISOString()
        };
    }
}

// Function to check GitHub repository status
async function checkGitHubStatus(github) {
    try {
        const response = await fetch(`https://api.github.com/repos/${github}`);
        const data = await response.json();
        return {
            stars: data.stargazers_count,
            lastUpdate: data.updated_at
        };
    } catch (error) {
        return null;
    }
}

// Function to create a status card for each site
function createStatusCard(site, status, githubStatus = null) {
    const card = document.createElement('div');
    card.className = 'status-card';

    const statusColor = status.status === 'online' ? '#28a745' : '#dc3545';
    const statusText = status.status === 'online' ? 'Online' : 'Offline';

    card.innerHTML = `
        <div class="status-indicator" style="background-color: ${statusColor}"></div>
        <div class="status-details">
            <img src="${site.logo}" 
                 alt="${site.name} logo" 
                 class="status-logo"
                 onerror="this.onerror=null; this.src='apple-touch-icon.png';">
            <h3>
                <a href="${site.url}" target="_blank" rel="noopener">${site.name}</a>
            </h3>
            <p class="status-text">${statusText}</p>
            ${status.responseTime ? `
                <p class="response-time">Response: ${status.responseTime}ms</p>
            ` : ''}
            <p class="last-update">Last check: ${new Date(status.lastCheck).toLocaleString()}</p>
            ${githubStatus ? `
                <p class="github-stats">
                    ⭐ ${githubStatus.stars} · 
                    Last updated: ${new Date(githubStatus.lastUpdate).toLocaleDateString()}
                </p>
            ` : ''}
            ${status.error ? `<p class="error-message">${status.error}</p>` : ''}
            <div class="badges">
                <a href="https://github.com/${site.github}" target="_blank" rel="noopener">
                    <img class="badge" 
                         src="https://img.shields.io/github/last-commit/${site.github}" 
                         alt="Last Commit">
                </a>
            </div>
        </div>
    `;

    return card;
}

// Function to update all statuses
async function updateStatuses() {
    if (!statusGrid) return;

    try {
        statusGrid.innerHTML = '<div class="loading">Checking statuses...</div>';

        const statusPromises = sites.map(async site => {
            // Check if we have a recent cached status (less than 5 minutes old)
            const cachedStatus = statusCache.get(site.url);
            const now = Date.now();
            if (cachedStatus && (now - new Date(cachedStatus.lastCheck).getTime() < 300000)) {
                return { site, status: cachedStatus };
            }

            const status = await checkSiteStatus(site);
            const githubStatus = await checkGitHubStatus(site.github);

            // Cache the result
            statusCache.set(site.url, status);

            return { site, status, githubStatus };
        });

        const results = await Promise.allSettled(statusPromises);

        statusGrid.innerHTML = '';
        results.forEach(result => {
            if (result.status === 'fulfilled') {
                const { site, status, githubStatus } = result.value;
                statusGrid.appendChild(createStatusCard(site, status, githubStatus));
            }
        });

        if (lastUpdateSpan) {
            lastUpdateSpan.textContent = new Date().toLocaleString();
        }
    } catch (error) {
        console.error('Error updating statuses:', error);
        statusGrid.innerHTML = `
            <div class="error-message">
                Failed to check statuses. Please try again later.
                <br>
                Error: ${error.message}
            </div>
        `;
    }
}

// Initialize status checks
document.addEventListener('DOMContentLoaded', () => {
    updateStatuses();
    // Update every 5 minutes
    setInterval(updateStatuses, 300000);
});

// Handle offline/online events
window.addEventListener('online', () => {
    document.body.classList.remove('offline');
    updateStatuses();
});

window.addEventListener('offline', () => {
    document.body.classList.add('offline');
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        checkSiteStatus,
        updateStatuses
    };
}
