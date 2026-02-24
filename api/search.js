export default async function handler(req, res) {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: "אנא הכנס מוצר" });

  const scraperApiKey = 'c084b907f72b30d3c3f6d941f894fe6a';

  async function fetchWithTimeout(shopName, searchUrl) {
    const controller = new AbortController();
    // שינוי 1: הארכת זמן ההמתנה ל-15 שניות. הרינדור לוקח זמן, ו-8 שניות יחתכו את הבקשה מוקדם מדי.
    const timeout = setTimeout(() => controller.abort(), 15000); 

    try {
      // שינוי 2: הוספת render=true כדי שהאתר יטען את ה-JavaScript ויציג את המחירים האמיתיים
      const proxyUrl = `http://api.scraperapi.com/?api_key=${scraperApiKey}&url=${encodeURIComponent(searchUrl)}&country_code=il&render=true`;
      
      const response = await fetch(proxyUrl, { signal: controller.signal });
      clearTimeout(timeout);

      if (!response.ok) return null;
      const html = await response.text();

      // שינוי 3: Regex חכם יותר שצד גם אגורות, גם את המילה "ש"ח" וגם מספרים דו-ספרתיים או ארבע-ספרתיים
      const priceRegex = /(?:₪|ש"ח)\s*(\d{2,4}(?:\.\d{1,2})?)|(\d{2,4}(?:\.\d{1,2})?)\s*(?:₪|ש"ח)/g;
      let match;
      let prices = [];
      
      while ((match = priceRegex.exec(html)) !== null) {
        const p = parseFloat(match[1] || match[2]);
        // השארתי את טווח המחירים שלך כפי שהוא
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
