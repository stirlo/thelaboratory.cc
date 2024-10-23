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

function createSiteCards() {
    console.log('Creating site cards...');
    const container = document.getElementById('sitesContainer');

    if (!container) {
        console.error('Site container not found!');
        return;
    }

    container.innerHTML = '';

    sites.forEach(site => {
        const card = document.createElement('div');
        card.className = 'website zoom-effect';

        const cardHTML = `
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
                </a>
            </div>
        `;

        card.innerHTML = cardHTML;
        container.appendChild(card);
    });
}

function updateCopyright() {
    const yearElement = document.getElementById('currentYear');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
}

function init() {
    console.log('Initializing main.js...');
    createSiteCards();
    updateCopyright();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        sites,
        createSiteCards
    };
}
