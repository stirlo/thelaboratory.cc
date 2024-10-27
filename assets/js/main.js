// main.js
async function fetchGithubData(github) {
    if (!github) return null;
    try {
        const response = await fetch(`https://api.github.com/repos/${github}`, {
            headers: {
                'Accept': 'application/vnd.github.v3+json'
            },
            cache: 'force-cache'
        });
        if (!response.ok) throw new Error(`GitHub API error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.warn(`GitHub fetch failed for ${github}:`, error);
        return null;
    }
}

async function sortSitesByLastUpdate() {
    try {
        const sitesWithDates = await Promise.all(
            window.laboratorySites.sites.map(async (site) => {
                const githubData = await fetchGithubData(site.github);
                return {
                    ...site,
                    lastUpdate: githubData ? new Date(githubData.updated_at) : new Date(0)
                };
            })
        );
        return sitesWithDates.sort((a, b) => b.lastUpdate - a.lastUpdate);
    } catch (error) {
        console.error('Error sorting sites:', error);
        return window.laboratorySites.sites.sort((a, b) => a.name.localeCompare(b.name));
    }
}

function createSiteCard(site, githubData) {
    const card = document.createElement('div');
    card.className = 'website zoom-effect';

    const badges = site.github ? `
        <div class="badges">
            <a href="https://github.com/${site.github}" 
               target="_blank" 
               rel="noopener noreferrer" 
               class="github-link">
                <img class="badge" 
                     src="https://img.shields.io/github/last-commit/${site.github}" 
                     alt="Last Commit"
                     loading="lazy">
                <img class="badge"
                     src="https://img.shields.io/github/languages/top/${site.github}"
                     alt="Primary Language"
                     loading="lazy">
                <img class="badge"
                     src="https://img.shields.io/github/languages/count/${site.github}"
                     alt="Language Count"
                     loading="lazy">
            </a>
        </div>` : '';

    card.innerHTML = `
        <a href="${site.url}" target="_blank" rel="noopener noreferrer" class="site-link">
            <img src="${site.logo}" 
                 alt="${site.name} Logo"
                 class="site-logo"
                 loading="lazy"
                 onerror="this.onerror=null; this.src='/assets/images/icons/apple-touch-icon.png';">
            <h2 class="site-name">${site.name}</h2>
            ${site.description ? `<p class="site-description">${site.description}</p>` : ''}
        </a>
        ${badges}`;

    return card;
}

async function createSiteCards() {
    const container = document.getElementById('sitesContainer');
    if (!container) return;

    try {
        container.innerHTML = '<div class="loading">Loading sites...</div>';

        const sortedSites = await sortSitesByLastUpdate();

        // Clear loading message
        container.innerHTML = '';

        // Create document fragment for better performance
        const fragment = document.createDocumentFragment();

        sortedSites.forEach(site => {
            const card = createSiteCard(site);
            fragment.appendChild(card);
        });

        container.appendChild(fragment);
    } catch (error) {
        console.error('Error creating site cards:', error);
        container.innerHTML = '<div class="error">Error loading sites. Please refresh the page.</div>';
    }
}

function updateCopyright() {
    const yearElement = document.getElementById('currentYear');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
}

function initializeMainPage() {
    if (document.getElementById('sitesContainer')) {
        createSiteCards().catch(error => {
            console.error('Site cards initialization failed:', error);
        });
    }
    updateCopyright();

    // Register Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => console.log('SW registered:', registration.scope))
            .catch(error => console.error('SW registration failed:', error));
    }
}

// Initialize on DOM content loaded or if already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeMainPage);
} else {
    initializeMainPage();
}

// Error handling for uncaught errors
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});
