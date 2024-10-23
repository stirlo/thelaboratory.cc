// Site configuration
const sites = [
    {
        name: 'thelaboratory.cc',
        url: 'https://thelaboratory.cc',
        github: 'stirlo/thelaboratory.cc',
        description: 'Main Laboratory Site',
        logo: '/apple-touch-icon.png'
    },
    {
        name: 'stirlo.space',
        url: 'https://stirlo.space',
        github: 'stirlo/stirlo.space',
        description: 'Personal Space',
        logo: '/stirlo.space-512x512.png'
    },
    {
        name: 'tfp.la',
        url: 'https://tfp.la',
        github: 'stirlo/tfp.la',
        description: 'TFP Projects',
        logo: '/tfp-green-512.png'
    },
    {
        name: 'oursquadis.top',
        url: 'https://oursquadis.top',
        github: 'stirlo/oursquadis.top',
        description: 'Squad Portal',
        logo: '/oursquadis.top-512x512.png'
    },
    {
        name: 'infinitereality.cc',
        url: 'https://infinitereality.cc',
        github: 'stirlo/infinitereality.cc',
        description: 'Infinite Reality',
        logo: '/infinitereality.cc-384x384.png'
    },
    {
        name: 'stirlo.be',
        url: 'https://stirlo.be',
        github: 'stirlo/stirlo.be',
        description: 'Personal Site',
        logo: '/stirlo.be-512x512.png'
    },
    {
        name: 'JPT-flipperzero',
        url: 'https://github.com/stirlo/JPT-flipperzero/',
        github: 'stirlo/JPT-flipperzero',
        description: 'Flipper Zero JPT',
        logo: '/JPT-flipper-512x512.png'
    },
    {
        name: 'adhan',
        url: 'https://github.com/stirlo/adhan/',
        github: 'stirlo/adhan',
        description: 'Prayer Times',
        logo: '/adhan-flipper-512x512.png'
    },
    {
        name: 'adhan-swift',
        url: 'https://stirlo.github.io/adhan-swift/',
        github: 'stirlo/adhan-swift',
        description: 'Swift Prayer Times',
        logo: '/adhan-swift-512x512.png'
    },
    {
        name: 'txt_to_ICS_Prayer_Times',
        url: 'https://stirlo.github.io/txt_to_ICS_Prayer_Times/',
        github: 'stirlo/txt_to_ICS_Prayer_Times',
        description: 'Prayer Times Calendar',
        logo: '/alarm-clock.svg'
    },
    {
        name: 'thegossroom',
        url: 'https://thegossroom.com',
        github: 'stirlo/thegossroom',
        description: 'The Goss Room',
        logo: '/thegossroom-512x512.png'
    }
];

// Create site cards
function createSiteCards() {
    const container = document.getElementById('sitesContainer');
    if (!container) return; // Guard clause for pages without the container

    sites.forEach(site => {
        const card = document.createElement('div');
        card.className = 'site-card';
        card.innerHTML = `
            <div>
                ${site.logo ? `<img class="site-logo" src="${site.logo}" alt="${site.name} logo" loading="lazy">` : ''}
                <h2 class="site-title">
                    <a href="${site.url}" target="_blank" rel="noopener">${site.name}</a>
                </h2>
                <p class="site-description">${site.description}</p>
                <div class="badges">
                    <a href="https://github.com/${site.github}" target="_blank" rel="noopener">
                        <img class="badge" src="https://img.shields.io/github/last-commit/${site.github}" alt="Last Commit">
                    </a>
                    <a href="${site.url}" target="_blank" rel="noopener">
                        <img class="badge" src="https://img.shields.io/website?url=${encodeURIComponent(site.url)}" alt="Website Status">
                    </a>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

// Update current year in footer
function updateYear() {
    const yearElement = document.getElementById('currentYear');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    createSiteCards();
    updateYear();
});

// Register Service Worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
        .then(registration => {
            console.log('ServiceWorker registration successful');

            // Request notification permission
            if ('Notification' in window) {
                Notification.requestPermission();
            }

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
window.addEventListener('online', () => {
    document.body.classList.remove('offline');
});

window.addEventListener('offline', () => {
    document.body.classList.add('offline');
});

// Export sites array for use in status.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { sites };
}
