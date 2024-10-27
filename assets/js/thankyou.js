// /assets/js/thankyou.js
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

    // Handle contributors list
    const contributorsList = document.getElementById('contributorsList');
    if (contributorsList) {
        contributors.forEach(contributor => {
            const item = document.createElement('div');
            item.className = 'contributor-card';
            item.innerHTML = `
                <h3>
                    <a href="${contributor.url}" 
                       target="_blank" 
                       rel="noopener noreferrer">
                        ${contributor.name}
                    </a>
                </h3>
                <p>${contributor.description}</p>
            `;
            contributorsList.appendChild(item);
        });
    }

    // Handle thank you list from txt file
    const thankYouList = document.getElementById('thankYouList');
    if (thankYouList) {
        fetch('/assets/data/thankyou.txt')
            .then(response => response.text())
            .then(data => {
                const items = data.split('\n').filter(line => line.trim() !== '');
                items.forEach(item => {
                    const li = document.createElement('li');
                    const match = item.match(/(.*) by \[(.*)\]\((.*)\)/);

                    if (match) {
                        const [, product, company, url] = match;
                        const a = document.createElement('a');
                        a.href = url;
                        a.textContent = company;
                        a.target = '_blank';
                        a.rel = 'noopener noreferrer';
                        li.textContent = `${product} by `;
                        li.appendChild(a);
                    } else {
                        li.textContent = item;
                    }

                    thankYouList.appendChild(li);
                });
            })
            .catch(error => {
                console.error('Error fetching thank you list:', error);
                thankYouList.innerHTML = 
                    '<li>Unable to load thank you list. Please try again later.</li>';
            });
    }

    // Set current year in footer
    const yearElement = document.getElementById('currentYear');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
});
