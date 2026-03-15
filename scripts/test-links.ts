import { getLinksForCityPage, getLinksForCityServicePage, formatLinksForPrompt } from '../src/linking/internal-links.js';
import { sites } from '../config/sites.js';

// Test city page links
console.log('=== Links for garage-pia (city page) ===');
const cityLinks = getLinksForCityPage('garage', 'pia');
console.log(formatLinksForPrompt(cityLinks, sites.garage.domain));
console.log(`Total: ${cityLinks.length} links\n`);

// Test city×service page links
console.log('=== Links for vidange-cabestany (city×service page) ===');
const csLinks = getLinksForCityServicePage('garage', 'cabestany', 'vidange');
console.log(formatLinksForPrompt(csLinks, sites.garage.domain));
console.log(`Total: ${csLinks.length} links\n`);

// Test VTC
console.log('=== Links for taxi-vtc-collioure (city page) ===');
const vtcLinks = getLinksForCityPage('vtc', 'collioure');
console.log(formatLinksForPrompt(vtcLinks, sites.vtc.domain));
console.log(`Total: ${vtcLinks.length} links`);
