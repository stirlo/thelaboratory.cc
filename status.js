// Configuration and constants
const CONFIG = {
    REFRESH_INTERVAL: 300000, // 5 minutes in milliseconds
    TIMEOUT: 10000, // 10 seconds timeout for fetch requests
    GITHUB_API_BASE: 'https://api.github.com/repos/',
    STATUS_ENDPOINT: '/status.json'
};

const sites = [
    {
        name: 'thelaboratory.cc',
        url: 'https://thelaboratory.cc',
        github: 'stirlo/thelaboratory.cc',
        type: 'web'
    },
    {
        name: 'stirlo.space',
        url: 'https://stirlo.space',
        github: 'stirlo/stirlo.space',
        type: 'web'
    },
    {
        name: 'tfp.la',
        url: 'https://tfp.la',
        github: 'stirlo/tfp.la',
        type: 'web'
    },
    {
        name: 'oursquadis.top',
        url: 'https://oursquadis.top',
        github: 'stirlo/oursquadis.top',
        type: 'web'
    },
    {
        name: 'infinitereality.cc',
        url: 'https://infinitereality.cc',
        github: 'stirlo/infinitereality.cc',
        type: 'web'
    },
    {
        name: 'stirlo.be',
        url: 'https://stirlo.be',
        github: 'stirlo/stirlo.be',
        type: 'web'
    },
    {
        name: 'JPT-flipperzero',
        url: 'https://github.com/stirlo/JPT-flipperzero/',
        github: 'stirlo/JPT-flipperzero',
        type: 'github'
    },
    {
        name: 'adhan',
        url: 'https://github.com/stirlo/adhan/',
        github: 'stirlo/adhan',
        type: 'github'
    },
    {
        name: 'adhan-swift',
        url: 'https://stirlo.github.io/adhan-swift/',
        github: 'stirlo/adhan-swift',
        type: 'github-pages'
    },
    {
        name: 'txt_to_ICS_Prayer_Times',
        url: 'https://stirlo.github.io/txt_to_ICS_Prayer_Times/',
        github: 'stirlo/txt_to_ICS_Prayer_Times',
        type: 'github-pages'
    }
];

// Utility functions
const formatDate = (date) => {
    return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'medium'
    }).format(date);
};

const formatResponseTime = (ms) => {
    return ms < 1000 ? `${ms}ms` : `${(ms/1000).toFixed(2)}s`;
};

// Status checking functions
async function checkSiteStatus(site) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUT);

    try {
        const startTime = performance.now();
        const response = await fetch(site.url, {
            mode: 'no-cors',
            signal: controller.signal
        });
        const endTime = performance.now();
        clearTimeout(timeoutId);

        return {
            status: 'online',
            responseTime: Math.round(endTime - startTime),
            lastCheck: new Date().toISOString()
        };
    } catch (error) {
        clearTimeout(timeoutId);
        return {
            status: 'offline',
            error: error.message,
            lastCheck: new Date().toISOString()
        };
    }
}

async function checkGitHubStatus(site) {
    try {
        const response = await fetch(`${CONFIG.GITHUB_API_BASE}${site.github}`);
        const data = await response.json();

        return {
            status: 'online',
            lastUpdate: data.updated_at,
            stars: data.stargazers_count,
            forks: data.forks_count
        };
    } catch (error) {
        return {
            status: 'error',
            error: error.message
        };
    }
}

// UI update functions
function createStatusCard(site, status) {
    const card = document.createElement('div');
    card.className = 'status-card';

    const statusColor = status.status === 'online' ? 'var(--success-color)' : 'var(--error-color)';

    let statusDetails = '';
    if (status.status === 'online') {
        statusDetails = `
            <div class="response-time">
                Response time: ${formatResponseTime(status.responseTime)}
            </div>
            ${status.lastUpdate ? `<div class="last-update">Updated: ${formatDate(new Date(status.lastUpdate))}</div>` : ''}
            ${status.stars ? `<div class="github-stats">★ ${status.stars} 🍴 ${status.forks}</div>` : ''}
        `;
    } else {
        statusDetails = `<div class="error-message">${status.error || 'Service unavailable'}</div>`;
    }

    card.innerHTML = `
        <div class="status-indicator" style="background-color: ${statusColor}"></div>
        <div class="status-details">
            <h3>${site.name}</h3>
            ${statusDetails}
        </div>
        <a href="${site.url}" target="_blank" rel="noopener noreferrer" class="site-link">
            Visit
        </a>
    `;

    return card;
}

async function updateStatuses() {
    const statusGrid = document.getElementById('statusGrid');
    statusGrid.innerHTML = ''; // Clear existing cards

    for (const site of sites) {
        const status = site.type === 'github' ? 
            await checkGitHubStatus(site) : 
            await checkSiteStatus(site);

        const card = createStatusCard(site, status);
        statusGrid.appendChild(card);
    }

    document.getElementById('lastUpdate').textContent = formatDate(new Date());
}

// Initialize and set up auto-refresh
document.addEventListener('DOMContentLoaded', () => {
    updateStatuses();
    setInterval(updateStatuses, CONFIG.REFRESH_INTERVAL);
});

// Service Worker registration
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
        .then(registration => {
            console.log('ServiceWorker registration successful');

            // Set up background sync
            if ('sync' in registration) {
                registration.sync.register('status-update');
            }
        })
        .catch(error => {
            console.error('ServiceWorker registration failed:', error);
        });
}

// Handle offline/online events
window.addEventListener('online', updateStatuses);
window.addEventListener('offline', () => {
    document.getElementById('statusGrid').classList.add('offline');
});
