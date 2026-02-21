export default async function handler(req, res) {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: "אנא הכנס מוצר" });

  const scraperApiKey = 'c084b907f72b30d3c3f6d941f894fe6a';

  async function fetchPharmacyData(shopName, searchUrl) {
    try {
      // שימוש ב-Proxy כדי לעקוף חסימות של בתי מרקחת
      const proxyUrl = `http://api.scraperapi.com/?api_key=${scraperApiKey}&url=${encodeURIComponent(searchUrl)}&country_code=il`;
      const response = await fetch(proxyUrl);
      if (!response.ok) return null;
      const html = await response.text();

      // רג'קס (Regex) משופר - מחפש מחירים בין 120 ל-500 ש"ח ומתעלם מ-100 ש"ח של משלוח
      const priceRegex = /(?:₪\s*([1-4][0-9][0-9]))|(([1-4][0-9][0-9])\s*₪)/g;
      let match;
      let prices = [];
      while ((match = priceRegex.exec(html)) !== null) {
        const p = parseFloat(match[1] || match[2]);
        if (p >= 120 && p <= 500) prices.push(p);
      }

      // חיפוש מבצעים בטקסט (למשל: 3 ב-550)
      const dealRegex = /([2-4]\s*(?:ב-|ב)\s*\d{3})/g;
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
    // חיפוש במקביל בשלושה מוקדים שונים
    const rawResults = await Promise.all([
      fetchPharmacyData("פארם ירוק", `https://pharm-yarok.co.il/?s=${encodeURIComponent(q)}&post_type=product`),
      fetchPharmacyData("שור טבצ'ניק", `https://shor.co.il/search?q=${encodeURIComponent(q)}`),
      fetchPharmacyData("מקס פארם", `https://maxpharm.co.il/search?q=${encodeURIComponent(q)}`)
    ]);

    // סינון תוצאות ריקות
    const results = rawResults.filter(r => r !== null);
    
    // אם לא נמצא כלום, נחזיר הודעה ברורה
    if (results.length === 0) return res.status(200).json([]);

    // מיון מהזול ליקר
    results.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
    return res.status(200).json(results);
  } catch (error) {
    return res.status(500).json({ error: "שגיאת שרת בחיפוש" });
  }
}
