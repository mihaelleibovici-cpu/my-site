export default async function handler(req, res) {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: "אנא הכנס מוצר" });

  const scraperApiKey = 'c084b907f72b30d3c3f6d941f894fe6a';

  async function fetchWithTimeout(shopName, searchUrl) {
    const controller = new AbortController();
    // 8.5 שניות מקסימום כדי שורסל לא יקריס את השרת
    const timeout = setTimeout(() => controller.abort(), 8500); 

    try {
      const proxyUrl = `http://api.scraperapi.com/?api_key=${scraperApiKey}&url=${encodeURIComponent(searchUrl)}&country_code=il`;
      
      // הזרקת זהות של דפדפן אמיתי כדי למנוע חסימת בוטים מצד אתרי הפארם
      const response = await fetch(proxyUrl, { 
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7'
        }
      });
      clearTimeout(timeout);

      if (!response.ok) return null;
      let html = await response.text();

      // ניקוי סימני שקל נסתרים בקוד HTML
      html = html.replace(/&#8362;/g, '₪').replace(/&nbsp;/g, ' ');

      const priceRegex = /(?:₪|ש"ח)\s*(\d{2,4}(?:\.\d{1,2})?)|(\d{2,4}(?:\.\d{1,2})?)\s*(?:₪|ש"ח)/g;
      let match;
      let prices = [];
      
      while ((match = priceRegex.exec(html)) !== null) {
        const p = parseFloat(match[1] || match[2]);
        if (!isNaN(p) && p >= 140 && p <= 500) {
          prices.push(p);
        }
      }

      if (prices.length > 0) {
        return {
          name: q,
          shop: shopName,
          price: Math.min(...prices).toString(),
          buyUrl: searchUrl
        };
      }
      return null;
    } catch (e) {
      return null; 
    }
  }

  try {
    const results = await Promise.all([
      fetchWithTimeout("פארם ירוק", `https://pharm-yarok.co.il/?s=${encodeURIComponent(q)}&post_type=product`),
      fetchWithTimeout("שור טבצ'ניק", `https://shor.co.il/search?q=${encodeURIComponent(q)}`),
      fetchWithTimeout("מקס פארם", `https://maxpharm.co.il/search?q=${encodeURIComponent(q)}`)
    ]);

    const filteredResults = results.filter(r => r !== null);
    filteredResults.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
    
    return res.status(200).json(filteredResults);
  } catch (error) {
    return res.status(500).json({ error: "שגיאת שרת" });
  }
}
