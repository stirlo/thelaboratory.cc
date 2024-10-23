// Debug logging
console.log('Script starting...');

const sites = [
    {
        name: 'Adhan-Flipperzero',
        url: 'https://github.com/stirlo/adhan/',
        github: 'stirlo/adhan',
        logo: 'images/adhan-flipper-512x512.png'
    },
    {
        name: 'Adhan Swift/Web',
        url: 'https://stirlo.github.io/adhan-swift/',
        github: 'stirlo/adhan-swift',
        logo: 'images/adhan-swift-512x512.png'
    },
    {
        name: 'InfiniteReality.cc',
        url: 'https://infinitereality.cc',
        github: 'jailbreaktheuniverse/infinitereality.cc',
        logo: 'images/infinitereality.cc-384x384.png'
    },
    {
        name: 'JPT-flipperzero',
        url: 'https://github.com/stirlo/JPT-flipperzero/',
        github: 'stirlo/JPT-flipperzero',
        logo: 'images/JPT-flipper-512x512.png'
    },
    {
        name: 'OurSquadIs.top',
        url: 'https://oursquadis.top',
        github: 'stirlo/oursquadis.top',
        logo: 'images/oursquadis.top-512x512.png'
    },
    {
        name: 'Plaintext to ICS Converter',
        url: 'https://stirlo.github.io/txt_to_ICS_Prayer_Times/',
        github: 'stirlo/txt_to_ICS_Prayer_Times',
        logo: 'images/alarm-clock.svg'
    },
    {
        name: 'Stirlo.be',
        url: 'https://stirlo.be',
        github: 'stirlo/stirlo.be',
        logo: 'images/stirlo.be-512x512.png'
    },
    {
        name: 'Stirlo.space',
        url: 'https://stirlo.space',
        github: 'stirlo/stirlo.space',
        logo: 'images/stirlo.space-512x512.png'
    },
    {
        name: 'TFP.la',
        url: 'https://tfp.la',
        github: 'stirlo/tfp.la',
        logo: 'images/tfp-green-512.png'
    },
    {
        name: 'The Goss Room',
        url: 'https://thegossroom.com',
        github: 'stirlo/thegossroom.com',
        logo: 'images/thegossroom-512x512.png'
    },
    {
        name: 'TheLaboratory.cc',
        url: 'https://thelaboratory.cc',
        github: 'stirlo/thelaboratory.cc',
        logo: 'apple-touch-icon.png'
    }
].sort((a, b) => a.name.localeCompare(b.name)); // Ensure alphabetical order

console.log('Sites array loaded:', sites.length, 'items');

function createSiteCards() {
    console.log('createSiteCards function called');
    const container = document.getElementById('sitesContainer');

    if (!container) {
        console.error('Container not found - sitesContainer is missing');
        return;
    }
    console.log('Container found:', container);

    container.innerHTML = '';

    try {
        sites.forEach((site, index) => {
            console.log(`Creating card ${index + 1} for ${site.name}`);
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
                    </a>
                </div>`;

            container.appendChild(card);
            console.log(`Card ${index + 1} created and appended`);
        });
    } catch (error) {
        console.error('Error in createSiteCards:', error);
    }
}

function updateCopyright() {
    console.log('Updating copyright year');
    const yearElement = document.getElementById('currentYear');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
        console.log('Copyright year updated');
    } else {
        console.error('Copyright year element not found');
    }
}

// Initialize when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded event fired');
    createSiteCards();
    updateCopyright();
});

// Fallback initialization
if (document.readyState === 'complete') {
    console.log('Document already complete, running initialization');
    createSiteCards();
    updateCopyright();
}

// Error handling
window.addEventListener('error', function(e) {
    console.error('Global error caught:', e.message);
    console.error('Error details:', {
        message: e.message,
        filename: e.filename,
        lineno: e.lineno,
        colno: e.colno,
        error: e.error
    });
});

console.log('Script loaded completely');
