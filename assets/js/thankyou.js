// thankyou.js
document.addEventListener('DOMContentLoaded', () => {
    const contributors = [
        {
            name: "CloudFlare",
            url: "https://cloudflare.com",
            description: "DNS, CDN, and DDoS protection"
        },
        {
            name: "GitHub",
            url: "https://github.com",
            description: "Code hosting and deployment"
        },
        {
            name: "Shields.io",
            url: "https://shields.io",
            description: "Repository badges"
        }
        // Add more contributors as needed
    ];

    const contributorsList = document.getElementById('contributorsList');

    if (contributorsList) {
        contributors.forEach(contributor => {
            const item = document.createElement('div');
            item.className = 'contributor-card';
            item.innerHTML = `
                <h3><a href="${contributor.url}" target="_blank" rel="noopener noreferrer">
                    ${contributor.name}
                </a></h3>
                <p>${contributor.description}</p>
            `;
            contributorsList.appendChild(item);
        });
    }

    // Set current year in footer
    const yearElement = document.getElementById('currentYear');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
});
