// Status page functionality
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

    if (status.stars !== undefined && status.forks !== undefined) {
        const githubStats = document.createElement('p');
        githubStats.className = 'github-stats';
        githubStats.textContent = `★ ${status.stars} | 🍴 ${status.forks}`;
        details.appendChild(githubStats);
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
        const response = await fetch('/status.json');
        if (!response.ok) throw new Error('Failed to fetch status data');

        statusData = await response.json();
        statusGrid.innerHTML = '';

        for (const [siteName, status] of Object.entries(statusData)) {
            const site = sites.find(s => s.name === siteName);
            if (site) {
                statusGrid.appendChild(createStatusCard(site, status));
            }
        }

        lastUpdateSpan.textContent = new Date().toLocaleString();
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

// Register for background sync if available
if ('serviceWorker' in navigator && 'SyncManager' in window) {
    navigator.serviceWorker.ready.then(registration => {
        registration.sync.register('status-update');
    });
}
