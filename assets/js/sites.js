// sites.js
const sites = [
    {
        name: "The Laboratory",
        url: "https://thelaboratory.cc",
        logo: "/assets/images/icons/apple-touch-icon.png",
        github: "stirlo/thelaboratory.cc",
        description: "Project Hub"
    },
    {
        name: "Adhan",
        url: "https://adhan.thelaboratory.cc",
        logo: "/assets/images/projects/adhan-swift-512x512.png",
        github: "stirlo/adhan",
        description: "Prayer Times"
    },
    {
        name: "Adhan Swift",
        url: "https://adhan-swift.thelaboratory.cc",
        logo: "/assets/images/projects/adhan-swift-512x512.png",
        github: "stirlo/adhan-swift",
        description: "Swift Prayer Times"
    },
    {
        name: "JPT Flipper Zero",
        url: "https://jpt-flipper.thelaboratory.cc",
        logo: "/assets/images/projects/JPT-flipper-512x512.png",
        github: "stirlo/JPT-flipperzero",
        description: "Flipper Zero Tools"
    },
    {
        name: "Infinite Reality",
        url: "https://infinitereality.cc",
        logo: "/assets/images/projects/infinitereality.cc-384x384.png",
        description: "Virtual Reality Hub"
    },
    {
        name: "Our Squad Is Top",
        url: "https://oursquadis.top",
        logo: "/assets/images/projects/oursquadis.top-512x512.png",
        description: "Gaming Community"
    },
    {
        name: "Stirlo.be",
        url: "https://stirlo.be",
        logo: "/assets/images/projects/stirlo.be-512x512.png",
        description: "Personal Site"
    },
    {
        name: "Stirlo.space",
        url: "https://stirlo.space",
        logo: "/assets/images/projects/stirlo.space-512x512.png",
        description: "Project Space"
    },
    {
        name: "The Goss Room",
        url: "https://thegossroom.com",
        logo: "/assets/images/projects/thegossroom-512x512.png",
        description: "News Aggregator"
    },
    {
        name: "Zmanim",
        url: "https://zmanim.thelaboratory.cc",
        logo: "/assets/images/projects/alarm-clock.svg",
        github: "stirlo/zmanim",
        description: "Jewish Prayer Times"
    }
];

// Helper function to get site by URL
function getSiteByUrl(url) {
    return sites.find(site => site.url === url);
}

// Helper function to get site by name
function getSiteByName(name) {
    return sites.find(site => site.name === name);
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { sites, getSiteByUrl, getSiteByName };
} else {
    window.laboratorySites = { sites, getSiteByUrl, getSiteByName };
}
