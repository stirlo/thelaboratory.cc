// /js/main.js
async function sortSitesByLastUpdate() {
    try {
        const sitesWithDates = await Promise.all(window.sites.map(async (site) => {
            try {
                const response = await fetch(`https://api.github.com/repos/${site.github}`);
                const data = await response.json();
                return {
                    ...site,
                    lastUpdate: new Date(data.updated_at)
                };
            } catch (error) {
                return {
                    ...site,
                    lastUpdate: new Date(0) // Default to oldest date if error
                };
            }
        }));

        return sitesWithDates.sort((a, b) => b.lastUpdate - a.lastUpdate);
    } catch (error) {
        console.error('Error sorting sites:', error);
        return window.sites.sort((a, b) => a.name.localeCompare(b.name)); // Fallback to alphabetical
    }
}

async function createSiteCards() {
    const container = document.getElementById('sitesContainer');
    if (!container) return;

    container.innerHTML = '<div class="loading">Loading sites...</div>';

    try {
        const sortedSites = await sortSitesByLastUpdate();
        container.innerHTML = '';

        sortedSites.forEach((site) => {
            const card = document.createElement('div');
            card.className = 'website zoom-effect';

            card.innerHTML = `
                <a href="${site.url}" target="_blank" rel="noopener noreferrer" class="site-link">
                    <img src="${site.logo}" 
                         alt="${site.name} Logo"
                         class="site-logo"
                         onerror="this.onerror=null; this.src='apple-touch-icon.png';">
                    <h2 class="site-name">${site.name}</h2>
                </a>
                <div class="badges">
                    <a href="https://github.com/${site.github}" 
                       target="_blank" 
                       rel="noopener noreferrer" 
                       class="github-link">
                        <img class="badge" 
                             src="https://img.shields.io/github/last-commit/${site.github}" 
                             alt="Last Commit">
                        <img class="badge"
                             src="https://img.shields.io/github/languages/top/${site.github}"
                             alt="Primary Language">
                        <img class="badge"
                             src="https://img.shields.io/github/languages/count/${site.github}"
                             alt="Language Count">
                    </a>
                </div>`;

            container.appendChild(card);
        });
    } catch (error) {
        console.error('Error creating site cards:', error);
        container.innerHTML = '<div class="error">Error loading sites</div>';
    }
}

function updateCopyright() {
    const yearElement = document.getElementById('currentYear');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
}

function initializeMainPage() {
    const container = document.getElementById('sitesContainer');
    if (container) {  // Only run site cards creation if we're on the main page
        createSiteCards();
    }
    updateCopyright();  // This runs on both pages
}

document.addEventListener('DOMContentLoaded', initializeMainPage);

if (document.readyState === 'complete') {
    initializeMainPage();
}
