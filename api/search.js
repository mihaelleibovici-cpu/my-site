export default async function handler(req, res) {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: "אנא הכנס מוצר" });

  const scraperApiKey = 'c084b907f72b30d3c3f6d941f894fe6a';

  async function fetchWithTimeout(shopName, searchUrl) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // מקסימום 8 שניות לאתר

    try {
      // שימוש ב-ScraperAPI ללא render כדי להבטיח מהירות מקסימלית
      const proxyUrl = `http://api.scraperapi.com/?api_key=${scraperApiKey}&url=${encodeURIComponent(searchUrl)}&country_code=il`;
      
      const response = await fetch(proxyUrl, { signal: controller.signal });
      clearTimeout(timeout);

      if (!response.ok) return null;
      const html = await response.text();

      // חיפוש מחירים ממוקד - מחפש מספרים של 3 ספרות שצמודים לסימן שקל
      const priceRegex = /(\d{3})\s*₪|₪\s*(\d{3})/g;
      let match;
      let prices = [];
      while ((match = priceRegex.exec(html)) !== null) {
        const p = parseFloat(match[1] || match[2]);
        if (p >= 140 && p <= 500) prices.push(p);
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
    // מריץ את כולם במקביל - מי שלא עונה מהר, נשאר בחוץ
    const results = await Promise.all([
      fetchWithTimeout("פארם ירוק", `https://pharm-yarok.co.il/?s=${encodeURIComponent(q)}&post_type=product`),
      fetchWithTimeout("שור טבצ'ניק", `https://shor.co.il/search?q=${encodeURIComponent(q)}`),
      fetchWithTimeout("מקס פארם", `https://maxpharm.co.il/search?q=${encodeURIComponent(q)}`)
    ]);

    const filteredResults = results.filter(r => r !== null);
    
    // מיון מהזול ליקר
    filteredResults.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
    
    return res.status(200).json(filteredResults);
  } catch (error) {
    return res.status(500).json({ error: "שגיאת שרת" });
  }
}
