const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const cors = require('cors');

puppeteer.use(StealthPlugin());

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Random delay helper
const randomDelay = (min, max) => {
  return new Promise(resolve => {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    setTimeout(resolve, delay);
  });
};

// Random user agents
const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
];

// Health check
app.get('/', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Google Lens API Scraper - Stealth v3.0',
    endpoints: {
      search: 'POST /api/lens-search',
      health: 'GET /'
    }
  });
});

// Main search endpoint
app.post('/api/lens-search', async (req, res) => {
  const { imageUrl } = req.body;

  if (!imageUrl) {
    return res.status(400).json({ error: 'imageUrl is required' });
  }

  console.log('🔍 Searching:', imageUrl);

  try {
    const results = await searchGoogleLensAdvanced(imageUrl);
    res.json({ 
      success: true, 
      count: results.length,
      results: results 
    });
  } catch (error) {
    console.error('❌ Error:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Advanced Google Lens scraper with stealth
async function searchGoogleLensAdvanced(imageUrl) {
  let browser;
  
  try {
    console.log('🚀 Launching stealth browser...');
    
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--window-size=1920,1080',
        '--start-maximized',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ],
      ignoreHTTPSErrors: true
    });

    const page = await browser.newPage();
    
    // Random user agent
    const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
    await page.setUserAgent(userAgent);
    
    await page.setViewport({ 
      width: 1920, 
      height: 1080,
      deviceScaleFactor: 1
    });
    
    // Set realistic headers
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1'
    });

    // Override navigator properties
    await page.evaluateOnNewDocument(() => {
      // Webdriver
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false
      });
      
      // Plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5]
      });
      
      // Languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en']
      });
      
      // Chrome
      window.chrome = {
        runtime: {}
      };
      
      // Permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Cypress.state('denied') }) :
          originalQuery(parameters)
      );
    });

    // Navigate to Google Lens with random delay
    await randomDelay(1000, 2000);
    
    const lensUrl = `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(imageUrl)}&hl=en`;
    console.log('🌐 Navigating to Google Lens...');
    
    await page.goto(lensUrl, { 
      waitUntil: 'domcontentloaded',
      timeout: 60000 
    });

    // Human-like behavior: random mouse movements
    await randomDelay(2000, 3000);
    
    // Scroll a bit
    await page.evaluate(() => {
      window.scrollBy(0, Math.random() * 300 + 100);
    });
    
    await randomDelay(2000, 3000);

    // Wait for content with multiple attempts
    console.log('⏳ Waiting for results...');
    let attempts = 0;
    let hasContent = false;
    
    while (attempts < 5 && !hasContent) {
      hasContent = await page.evaluate(() => {
        const links = document.querySelectorAll('a[href]');
        return links.length > 10;
      });
      
      if (!hasContent) {
        await randomDelay(2000, 3000);
        await page.evaluate(() => window.scrollBy(0, 200));
      }
      attempts++;
    }

    console.log('📊 Extracting products...');

    // Extract with multiple strategies
    const results = await page.evaluate(() => {
      const products = [];
      const seenLinks = new Set();

      // Get all links
      const allLinks = Array.from(document.querySelectorAll('a[href]'));
      
      // Shopping domains
      const shoppingDomains = [
        'amazon', 'walmart', 'ebay', 'target', 'bestbuy', 'etsy', 
        'aliexpress', 'shopify', 'wayfair', 'homedepot', 'lowes',
        'costco', 'samsclub', 'macys', 'nordstrom', 'overstock',
        'chewy', 'petco', 'petsmart', 'zappos', 'newegg'
      ];

      allLinks.forEach(link => {
        try {
          const href = link.href;
          
          // Basic filters
          if (!href || !href.startsWith('http') || seenLinks.has(href)) return;
          if (href.includes('google.com/search') || 
              href.includes('maps.google') || 
              href.includes('support.google') ||
              href.includes('accounts.google') ||
              href.includes('policies.google')) return;

          // Get text
          let title = '';
          
          // Try multiple ways to get title
          if (link.textContent) {
            title = link.textContent.trim();
          } else if (link.getAttribute('aria-label')) {
            title = link.getAttribute('aria-label').trim();
          } else if (link.getAttribute('title')) {
            title = link.getAttribute('title').trim();
          }

          // Clean title
          title = title.replace(/\s+/g, ' ').trim();
          if (title.length < 10 || title.length > 500) return;

          // Check if shopping link
          const lowerHref = href.toLowerCase();
          const isShoppingLink = shoppingDomains.some(domain => lowerHref.includes(domain));
          const hasProductPath = lowerHref.includes('/product') || 
                                 lowerHref.includes('/item') || 
                                 lowerHref.includes('/p/') ||
                                 lowerHref.includes('/dp/');

          if (isShoppingLink || hasProductPath) {
            seenLinks.add(href);

            // Extract source
            let source = 'Store';
            try {
              const url = new URL(href);
              const hostname = url.hostname.replace('www.', '');
              const parts = hostname.split('.');
              source = parts[0];
              source = source.charAt(0).toUpperCase() + source.slice(1);
            } catch (e) {}

            products.push({
              title: title.substring(0, 300),
              link: href,
              source: source
            });
          }
        } catch (e) {
          // Skip error items
        }
      });

      return products;
    });

    console.log(`✅ Found ${results.length} results`);

    // Deduplicate
    const uniqueResults = [];
    const seenUrls = new Set();

    results.forEach(item => {
      if (!seenUrls.has(item.link) && item.title.length >= 15) {
        seenUrls.add(item.link);
        uniqueResults.push(item);
      }
    });

    console.log(`✅ Returning ${uniqueResults.length} unique results`);
    return uniqueResults.slice(0, 25);

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server: http://0.0.0.0:${PORT}`);
  console.log(`🔧 Version: Stealth 3.0 - Enhanced anti-detection`);
});
