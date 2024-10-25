// main.js
const sites = [
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
        logo: 'alarm-clock.svg'
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

async function sortSitesByLastUpdate() {
    try {
        const sitesWithDates = await Promise.all(sites.map(async (site) => {
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
        return sites.sort((a, b) => a.name.localeCompare(b.name)); // Fallback to alphabetical
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

document.addEventListener('DOMContentLoaded', () => {
    createSiteCards();
    updateCopyright();
});

if (document.readyState === 'complete') {
    createSiteCards();
    updateCopyright();
}
