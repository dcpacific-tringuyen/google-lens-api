const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Google Lens API Scraper - v2.0',
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
    const results = await searchGoogleLens(imageUrl);
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

// Google Lens scraper
async function searchGoogleLens(imageUrl) {
  let browser;
  
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--disable-blink-features=AutomationControlled',
        '--window-size=1920,1080'
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    });

    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    const lensUrl = `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(imageUrl)}`;
    await page.goto(lensUrl, { waitUntil: 'networkidle0', timeout: 45000 });
    await page.waitForTimeout(5000);

    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(2000);

    const results = await page.evaluate(() => {
      const products = [];
      const seenLinks = new Set();
      const allLinks = Array.from(document.querySelectorAll('a[href]'));
      
      allLinks.forEach(link => {
        const href = link.href;
        const isValid = href && 
                       href.startsWith('http') && 
                       !href.includes('google.com/search') &&
                       !href.includes('maps.google') &&
                       !seenLinks.has(href);

        if (!isValid) return;

        let title = link.textContent?.trim() || 
                   link.getAttribute('aria-label') || '';
        title = title.replace(/\s+/g, ' ').trim();

        if (title.length < 10) return;

        const shoppingDomains = ['amazon', 'walmart', 'ebay', 'target', 'bestbuy', 
                                'etsy', 'aliexpress', 'homedepot', 'lowes', 'chewy'];
        
        const isShoppingLink = shoppingDomains.some(d => href.toLowerCase().includes(d));

        if (isShoppingLink || href.includes('/product') || href.includes('/item')) {
          seenLinks.add(href);

          let source = 'Unknown';
          try {
            const url = new URL(href);
            source = url.hostname.replace('www.', '').split('.')[0];
            source = source.charAt(0).toUpperCase() + source.slice(1);
          } catch (e) {}

          products.push({
            title: title.substring(0, 300),
            link: href,
            source: source
          });
        }
      });

      return products;
    });

    console.log(`✅ Found ${results.length} results`);
    return results.slice(0, 20);

  } finally {
    if (browser) await browser.close();
  }
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server: http://0.0.0.0:${PORT}`);
});
