// main.js with simplified card structure and proper linking
const sites = [
    {
        name: 'TheLaboratory.cc',
        url: 'https://thelaboratory.cc',
        github: 'stirlo/thelaboratory.cc',
        logo: '/apple-touch-icon.png'
    },
    {
        name: 'Stirlo.space',
        url: 'https://stirlo.space',
        github: 'stirlo/stirlo.space',
        logo: '/stirlo.space-512x512.png'
    },
    {
        name: 'TFP.la',
        url: 'https://tfp.la',
        github: 'stirlo/tfp.la',
        logo: '/tfp-green-512.png'
    },
    {
        name: 'OurSquadIs.top',
        url: 'https://oursquadis.top',
        github: 'stirlo/oursquadis.top',
        logo: '/oursquadis.top-512x512.png'
    },
    {
        name: 'InfiniteReality.cc',
        url: 'https://infinitereality.cc',
        github: 'stirlo/jailbreaktheuniverse',
        logo: '/infinitereality.cc-384x384.png'
    },
    {
        name: 'Stirlo.be',
        url: 'https://stirlo.be',
        github: 'stirlo/stirlo.be',
        logo: '/stirlo.be-512x512.png'
    },
    {
        name: 'JPT-flipperzero',
        url: 'https://github.com/stirlo/JPT-flipperzero/',
        github: 'stirlo/JPT-flipperzero',
        logo: '/JPT-flipper-512x512.png'
    },
    {
        name: 'Adhan-Flipperzero',
        url: 'https://github.com/stirlo/adhan/',
        github: 'stirlo/adhan',
        logo: '/adhan-flipper-512x512.png'
    },
    {
        name: 'Adhan Swift/Web',
        url: 'https://stirlo.github.io/adhan-swift/',
        github: 'stirlo/adhan-swift',
        logo: '/adhan-swift-512x512.png'
    },
    {
        name: 'Plaintext to ICS Converter',
        url: 'https://stirlo.github.io/txt_to_ICS_Prayer_Times/',
        github: 'stirlo/txt_to_ICS_Prayer_Times',
        logo: '/alarm-clock.svg'
    },
    {
        name: 'The Goss Room',
        url: 'https://thegossroom.com',
        github: 'stirlo/thegossroom',
        logo: '/thegossroom-512x512.png'
    }
];

function createSiteCards() {
    const container = document.getElementById('sitesContainer');
    if (!container) return;

    sites.forEach(site => {
        const card = document.createElement('div');
        card.className = 'website zoom-effect';
        card.innerHTML = `
            <a href="${site.url}" target="_blank" rel="noopener">
                <img src="${site.logo}" alt="${site.name} Logo">
            </a>
            <p>${site.name}</p>
            <div class="badges">
                <a href="https://github.com/${site.github}" target="_blank" rel="noopener">
                    <img class="badge" src="https://img.shields.io/github/last-commit/${site.github}" alt="Last Commit">
                </a>
            </div>
        `;
        container.appendChild(card);
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    createSiteCards();
    // Update year in footer if exists
    const yearElement = document.getElementById('currentYear');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
});

// Service Worker Registration
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
        .then(registration => {
            console.log('ServiceWorker registration successful');
        })
        .catch(error => {
            console.error('ServiceWorker registration failed:', error);
        });
}
