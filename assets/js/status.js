// status.js
const statusGrid = document.getElementById('statusGrid');
const lastUpdateSpan = document.getElementById('lastUpdate');
const statusCache = new Map();
const githubRateLimit = new Map();

const CONFIG = {
    GITHUB_CACHE_TIME: 600000,    // 10 minutes
    STATUS_CACHE_TIME: 300000,    // 5 minutes
    FETCH_TIMEOUT: 5000,          // 5 seconds
    UPDATE_INTERVAL: 300000       // 5 minutes
};

async function checkGitHubStatus(github) {
    if (!github) return null;

    const now = Date.now();
    const cacheKey = `github_${github}`;
    const lastCheck = githubRateLimit.get(github);

    if (lastCheck && (now - lastCheck < CONFIG.GITHUB_CACHE_TIME)) {
        return statusCache.get(cacheKey);
    }

    try {
        const response = await fetch(`https://api.github.com/repos/${github}`, {
            headers: {
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!response.ok) throw new Error(`GitHub API: ${response.status}`);

        const data = await response.json();
        const result = {
            stars: data.stargazers_count,
            lastUpdate: data.updated_at
        };

        githubRateLimit.set(github, now);
        statusCache.set(cacheKey, result);
        return result;
    } catch (error) {
        console.warn(`GitHub API error for ${github}:`, error);
        return null;
    }
}

async function checkSiteStatus(site) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.FETCH_TIMEOUT);

    try {
        const startTime = performance.now();
        const response = await fetch(site.url, {
            mode: 'no-cors',
            cache: 'no-cache',
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        const endTime = performance.now();

        return {
            status: 'online',
            responseTime: Math.round(endTime - startTime),
            lastCheck: new Date().toISOString()
        };
    } catch (error) {
        clearTimeout(timeoutId);
        return {
            status: 'offline',
            error: error.name === 'AbortError' ? 'Site timeout' : 'Site unreachable',
            lastCheck: new Date().toISOString()
        };
    }
}

function createStatusCard(site, status, githubStatus = null) {
    const card = document.createElement('div');
    card.className = 'status-card';

    const statusColor = status.status === 'online' ? '#28a745' : '#dc3545';
    const statusText = status.status === 'online' ? 'Online' : 'Offline';

    const githubStatsHtml = githubStatus ? `
        <p class="github-stats">
            ⭐ ${githubStatus.stars} · 
            Last updated: ${new Date(githubStatus.lastUpdate).toLocaleDateString()}
        </p>
    ` : '';

    const githubBadgesHtml = site.github ? `
        <div class="badges">
            <a href="https://github.com/${site.github}" target="_blank" rel="noopener">
                <img class="badge" 
                     src="https://img.shields.io/github/last-commit/${site.github}" 
                     alt="Last Commit"
                     loading="lazy">
            </a>
        </div>
    ` : '';

    card.innerHTML = `
        <div class="status-indicator" style="background-color: ${statusColor}"></div>
        <img src="${site.logo}" 
             alt="${site.name} logo" 
             loading="lazy"
             onerror="this.onerror=null; this.src='/assets/images/icons/apple-touch-icon.png';">
        <div class="status-details">
            <h3>
                <a href="${site.url}" target="_blank" rel="noopener noreferrer">${site.name}</a>
            </h3>
            <p class="status-text">${statusText}</p>
            ${status.responseTime ? `<p class="response-time">Response: ${status.responseTime}ms</p>` : ''}
            <p class="last-update">Last check: ${new Date(status.lastCheck).toLocaleString()}</p>
            ${githubStatsHtml}
            ${status.error ? `<p class="error-message">${status.error}</p>` : ''}
            ${githubBadgesHtml}
        </div>
    `;

    return card;
}

async function updateStatuses() {
    if (!statusGrid) return;

    try {
        statusGrid.innerHTML = '<div class="loading">Checking statuses...</div>';

        const statusPromises = window.laboratorySites.sites.map(async site => {
            const cachedStatus = statusCache.get(site.url);
            const now = Date.now();

            if (cachedStatus && (now - new Date(cachedStatus.lastCheck).getTime() < CONFIG.STATUS_CACHE_TIME)) {
                const githubStatus = site.github ? await checkGitHubStatus(site.github) : null;
                return { site, status: cachedStatus, githubStatus };
            }

            const [status, githubStatus] = await Promise.all([
                checkSiteStatus(site),
                site.github ? checkGitHubStatus(site.github) : null
            ]);

            statusCache.set(site.url, status);
            return { site, status, githubStatus };
        });

        const results = await Promise.allSettled(statusPromises);
        const validResults = results
            .filter(result => result.status === 'fulfilled')
            .map(result => result.value)
            .sort((a, b) => {
                if (a.githubStatus && b.githubStatus) {
                    return new Date(b.githubStatus.lastUpdate) - new Date(a.githubStatus.lastUpdate);
                }
                return 0;
            });

        const fragment = document.createDocumentFragment();
        validResults.forEach(({ site, status, githubStatus }) => {
            fragment.appendChild(createStatusCard(site, status, githubStatus));
        });

        statusGrid.innerHTML = '';
        statusGrid.appendChild(fragment);

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

// Initialize and set up event listeners
function initialize() {
    updateStatuses();
    setInterval(updateStatuses, CONFIG.UPDATE_INTERVAL);

    window.addEventListener('online', () => {
        document.body.classList.remove('offline');
        updateStatuses();
    });

    window.addEventListener('offline', () => {
        document.body.classList.add('offline');
    });
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}

// Error boundaries
window.addEventListener('error', (event) => {
    if (event.error?.message?.includes('status')) {
        console.error('Status page error:', event.error);
    }
});

window.addEventListener('unhandledrejection', (event) => {
    if (event.reason?.message?.includes('status')) {
        console.error('Status promise rejection:', event.reason);
    }
});
