export default async function handler(req, res) {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: "אנא הכנס מוצר" });

  const scraperApiKey = 'c084b907f72b30d3c3f6d941f894fe6a';

  async function fetchPharmacyData(shopName, searchUrl) {
    try {
      // הוספתי render=true ו-wait_for כדי לוודא שהאתר נטען במלואו לפני הסריקה
      const proxyUrl = `http://api.scraperapi.com/?api_key=${scraperApiKey}&url=${encodeURIComponent(searchUrl)}&country_code=il&render=true&wait_for=1000`;
      
      const response = await fetch(proxyUrl);
      if (!response.ok) return null;
      const html = await response.text();

      // חיפוש מחירים בפינצטה - תופס פורמטים של ₪200, 200₪, וגם מחירים בתוך טקסט
      const priceRegex = /(?:₪\s*(\d{2,3}))|(?:(\d{2,3})\s*₪)/g;
      let match;
      let prices = [];
      while ((match = priceRegex.exec(html)) !== null) {
        const p = parseFloat(match[1] || match[2]);
        // סינון: מוצרי קנאביס הם לרוב בין 140 ל-450 ש"ח
        if (p >= 140 && p <= 480) prices.push(p);
      }

      // חיפוש מבצעים (למשל: 3 ב-550)
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
    // מריץ חיפוש מקביל ב-3 בתי מרקחת שונים
    const rawResults = await Promise.all([
      fetchPharmacyData("פארם ירוק", `https://pharm-yarok.co.il/?s=${encodeURIComponent(q)}&post_type=product`),
      fetchPharmacyData("שור טבצ'ניק", `https://shor.co.il/search?q=${encodeURIComponent(q)}`),
      fetchPharmacyData("מקס פארם", `https://maxpharm.co.il/search?q=${encodeURIComponent(q)}`)
    ]);

    const results = rawResults.filter(r => r !== null);
    
    // מיון מהזול ליקר
    results.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
    
    return res.status(200).json(results);
  } catch (error) {
    return res.status(500).json({ error: "שגיאת שרת פנימית" });
  }
}
