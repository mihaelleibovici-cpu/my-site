export default async function handler(req, res) {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: "אנא הכנס מוצר" });

  const scraperApiKey = 'c084b907f72b30d3c3f6d941f894fe6a';

  async function fetchPharmacyData(shopName, searchUrl) {
    try {
      // ביטלתי את ה-render כדי שזה יהיה מהיר בטיל. הוספתי הגדרות חדירה ישירות לשרת.
      const proxyUrl = `http://api.scraperapi.com/?api_key=${scraperApiKey}&url=${encodeURIComponent(searchUrl)}&country_code=il&keep_headers=true`;
      
      const response = await fetch(proxyUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
      });

      if (!response.ok) return null;
      const html = await response.text();

      //Regex מקצועי שמוצא מחירים בפורמט של 180, 250.00, או ₪320
      const priceRegex = /(?:₪|ILS|price|מחיר)\s*[:=]?\s*(\d{2,3}(?:\.\d{2})?)/gi;
      let match;
      let prices = [];
      while ((match = priceRegex.exec(html)) !== null) {
        const p = parseFloat(match[1]);
        if (p >= 130 && p <= 500) prices.push(p);
      }

      // אם לא מצאנו מחיר ספציפי, נחפש כל מספר 3-ספרתי שמופיע ליד סימן שקל
      if (prices.length === 0) {
        const fallbackRegex = /(\d{3})\s*₪|₪\s*(\d{3})/g;
        while ((match = fallbackRegex.exec(html)) !== null) {
          const p = parseFloat(match[1] || match[2]);
          if (p >= 130 && p <= 500) prices.push(p);
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
    } catch (e) { return null; }
  }

  try {
    // מריץ חיפוש מקביל ב-4 מקורות שונים כדי להבטיח תוצאה
    const rawResults = await Promise.all([
      fetchPharmacyData("פארם ירוק", `https://pharm-yarok.co.il/?s=${encodeURIComponent(q)}&post_type=product`),
      fetchPharmacyData("שור טבצ'ניק", `https://shor.co.il/search?q=${encodeURIComponent(q)}`),
      fetchPharmacyData("מקס פארם", `https://maxpharm.co.il/search?q=${encodeURIComponent(q)}`),
      fetchPharmacyData("טלפארם", `https://www.telepharm.co.il/catalogsearch/result/?q=${encodeURIComponent(q)}`)
    ]);

    const results = rawResults.filter(r => r !== null);
    
    // אם באמת אין תוצאות בבתי המרקחת האלו כרגע
    if (results.length === 0) return res.status(200).json([]);

    results.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
    return res.status(200).json(results);
  } catch (error) {
    return res.status(500).json({ error: "שגיאת שרת" });
  }
}
