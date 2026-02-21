export default async function handler(req, res) {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: "אנא הכנס מוצר" });

  const scraperApiKey = 'c084b907f72b30d3c3f6d941f894fe6a';

  async function fetchPharmacyData(shopName, searchUrl) {
    try {
      const proxyUrl = `http://api.scraperapi.com/?api_key=${scraperApiKey}&url=${encodeURIComponent(searchUrl)}&country_code=il`;
      const response = await fetch(proxyUrl);
      if (!response.ok) return null;
      const html = await response.text();

      // חיפוש מחירים בפינצטה - מתעלם מ-100 ש"ח ומחפש מספרים אמיתיים
      const priceRegex = /(?:₪\s*([1-3][1-9][0-9]))|(([1-3][1-9][0-9])\s*₪)/g;
      let match;
      let prices = [];
      while ((match = priceRegex.exec(html)) !== null) {
        const p = parseFloat(match[1] || match[2]);
        if (p > 120 && p <= 450) prices.push(p);
      }

      // חיפוש מבצעים בטקסט (למשל: 2 ב-400)
      const dealRegex = /([2-3]\s*(?:ב-|ב)\s*\d{3})/g;
      const dealMatch = html.match(dealRegex);
      const deal = dealMatch ? dealMatch[0] : null;

      if (prices.length > 0) {
        return {
          name: q,
          shop: shopName,
          price: Math.min(...prices).toString(),
          deal: deal, 
          buyUrl: searchUrl
        };
      }
      return null;
    } catch (e) { return null; }
  }

  try {
    const rawResults = await Promise.all([
      fetchPharmacyData("פארם ירוק", `https://pharm-yarok.co.il/?s=${encodeURIComponent(q)}&post_type=product`),
      fetchPharmacyData("שור טבצ'ניק", `https://shor.co.il/search?q=${encodeURIComponent(q)}`),
      fetchPharmacyData("מקס פארם", `https://maxpharm.co.il/search?q=${encodeURIComponent(q)}`)
    ]);

    const results = rawResults.filter(r => r !== null);
    if (results.length === 0) return res.status(200).json([]);

    results.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
    return res.status(200).json(results);
  } catch (error) {
    return res.status(500).json({ error: "שגיאה בחיפוש" });
  }
}
