// status.js
const statusGrid = document.getElementById('statusGrid');
const lastUpdateSpan = document.getElementById('lastUpdate');
let statusData = null;

// Status indicators
const STATUS_COLORS = {
    online: '#28a745',
    offline: '#dc3545',
    error: '#ffc107'
};

// Format time difference
function timeAgo(date) {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);

    let interval = Math.floor(seconds / 31536000);
    if (interval > 1) return interval + ' years ago';
    if (interval === 1) return 'a year ago';

    interval = Math.floor(seconds / 2592000);
    if (interval > 1) return interval + ' months ago';
    if (interval === 1) return 'a month ago';

    interval = Math.floor(seconds / 86400);
    if (interval > 1) return interval + ' days ago';
    if (interval === 1) return 'yesterday';

    interval = Math.floor(seconds / 3600);
    if (interval > 1) return interval + ' hours ago';
    if (interval === 1) return 'an hour ago';

    interval = Math.floor(seconds / 60);
    if (interval > 1) return interval + ' minutes ago';
    if (interval === 1) return 'a minute ago';

    if (seconds < 10) return 'just now';

    return Math.floor(seconds) + ' seconds ago';
}

// Check site status
async function checkSiteStatus(site) {
    try {
        const startTime = performance.now();
        const response = await fetch(site.url, { mode: 'no-cors' });
        const endTime = performance.now();

        return {
            status: response.ok ? 'online' : 'error',
            responseTime: Math.round(endTime - startTime),
            lastCheck: new Date().toISOString()
        };
    } catch (error) {
        return {
            status: 'offline',
            error: error.message,
            lastCheck: new Date().toISOString()
        };
    }
}

// Create status card
function createStatusCard(site, status) {
    const card = document.createElement('div');
    card.className = 'status-card';

    const indicator = document.createElement('div');
    indicator.className = 'status-indicator';
    indicator.style.backgroundColor = STATUS_COLORS[status.status];

    const details = document.createElement('div');
    details.className = 'status-details';

    const title = document.createElement('h3');
    const link = document.createElement('a');
    link.href = site.url;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = site.name;
    title.appendChild(link);

    const logo = document.createElement('img');
    logo.src = site.logo;
    logo.alt = `${site.name} logo`;
    logo.className = 'status-logo';
    logo.loading = 'lazy';

    details.appendChild(logo);
    details.appendChild(title);

    if (status.responseTime) {
        const responseTime = document.createElement('p');
        responseTime.className = 'response-time';
        responseTime.textContent = `Response time: ${status.responseTime}ms`;
        details.appendChild(responseTime);
    }

    if (status.lastCheck) {
        const lastCheck = document.createElement('p');
        lastCheck.className = 'last-update';
        lastCheck.textContent = `Last checked: ${timeAgo(status.lastCheck)}`;
        details.appendChild(lastCheck);
    }

    if (status.error) {
        const error = document.createElement('p');
        error.className = 'error-message';
        error.textContent = status.error;
        details.appendChild(error);
    }

    card.appendChild(indicator);
    card.appendChild(details);

    return card;
}

// Update status grid
async function updateStatuses() {
    try {
        statusGrid.innerHTML = '<div class="loading">Checking statuses...</div>';

        const statuses = await Promise.all(
            sites.map(async site => {
                const status = await checkSiteStatus(site);
                return { site, status };
            })
        );

        statusGrid.innerHTML = '';
        statuses.forEach(({ site, status }) => {
            statusGrid.appendChild(createStatusCard(site, status));
        });

        lastUpdateSpan.textContent = new Date().toLocaleString();

        // Store status data for offline use
        if ('caches' in window) {
            const cache = await caches.open('status-data');
            await cache.put('/status-data', new Response(JSON.stringify(statuses)));
        }
    } catch (error) {
        console.error('Error updating statuses:', error);
        statusGrid.innerHTML = `
            <div class="error-message">
                Failed to load status data: ${error.message}
            </div>
        `;
    }
}

// Initialize
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

// Export for worker
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { updateStatuses };
}
