// /js/status.js
const statusGrid = document.getElementById('statusGrid');
const lastUpdateSpan = document.getElementById('lastUpdate');
const statusCache = new Map();

async function checkSiteStatus(site) {
    try {
        const startTime = performance.now();
        const response = await fetch(site.url, {
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
        console.error(`Error checking ${site.url}:`, error);
        return {
            status: 'offline',
            error: error.message || 'Site unreachable',
            lastCheck: new Date().toISOString()
        };
    }
}

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

function createStatusCard(site, status, githubStatus = null) {
    const card = document.createElement('div');
    card.className = 'status-card';

    const statusColor = status.status === 'online' ? '#28a745' : '#dc3545';
    const statusText = status.status === 'online' ? 'Online' : 'Offline';

    card.innerHTML = `
        <div class="status-indicator" style="background-color: ${statusColor}"></div>
        <img src="${site.logo}" 
             alt="${site.name} logo" 
             onerror="this.onerror=null; this.src='apple-touch-icon.png';">
        <div class="status-details">
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

async function updateStatuses() {
    if (!statusGrid) return;

    try {
        statusGrid.innerHTML = '<div class="loading">Checking statuses...</div>';

        const statusPromises = window.sites.map(async site => {
            const cachedStatus = statusCache.get(site.url);
            const now = Date.now();
            if (cachedStatus && (now - new Date(cachedStatus.lastCheck).getTime() < 300000)) {
                const githubStatus = await checkGitHubStatus(site.github);
                return { site, status: cachedStatus, githubStatus };
            }

            const status = await checkSiteStatus(site);
            const githubStatus = await checkGitHubStatus(site.github);
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

        statusGrid.innerHTML = '';
        validResults.forEach(({ site, status, githubStatus }) => {
            statusGrid.appendChild(createStatusCard(site, status, githubStatus));
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

document.addEventListener('DOMContentLoaded', () => {
    updateStatuses();
    setInterval(updateStatuses, 300000);
});

window.addEventListener('online', () => {
    document.body.classList.remove('offline');
    updateStatuses();
});

window.addEventListener('offline', () => {
    document.body.classList.add('offline');
});
