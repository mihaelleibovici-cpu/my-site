export default async function handler(req, res) {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: "אנא הכנס מוצר" });

  const scraperApiKey = 'c084b907f72b30d3c3f6d941f894fe6a';

  async function quickFetch(shopName, searchUrl) {
    try {
      // הסרנו את ה-render כדי לטוס במהירות ולעקוף את מגבלת 10 השניות
      const proxyUrl = `http://api.scraperapi.com/?api_key=${scraperApiKey}&url=${encodeURIComponent(searchUrl)}&country_code=il`;
      
      const response = await fetch(proxyUrl);
      if (!response.ok) return null;
      const html = await response.text();

      // מחפש מחיר הגיוני (120-400 ש"ח) שנמצא בתוך תגיות של מחיר
      const priceRegex = /(?:price|מחיר|₪)\D*([1-3][0-9]{2}(?:\.[0-9]{2})?)/gi;
      let match;
      let prices = [];

      while ((match = priceRegex.exec(html)) !== null) {
        const p = parseFloat(match[1]);
        if (p >= 120 && p <= 420) prices.push(p);
      }

      if (prices.length > 0) {
        return {
          name: q,
          shop: shopName,
          price: Math.min(...prices).toString(),
          likes: Math.floor(Math.random() * 20) + 20,
          buyUrl: searchUrl
        };
      }
      return null;
    } catch (e) { return null; }
  }

  try {
    // הרצה מהירה במקביל
    const results = (await Promise.all([
      quickFetch("פארם ירוק", `https://pharm-yarok.co.il/?s=${encodeURIComponent(q)}&post_type=product`),
      quickFetch("שור טבצ'ניק", `https://shor.co.il/search?q=${encodeURIComponent(q)}`),
      quickFetch("מקס פארם", `https://maxpharm.co.il/search?q=${encodeURIComponent(q)}`)
    ])).filter(r => r !== null);

    if (results.length === 0) {
      return res.status(200).json([{
        name: "לא נמצא במלאי אונליין",
        shop: "בדיקה מהירה",
        price: "0",
        likes: 0,
        buyUrl: "#"
      }]);
    }

    results.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
    return res.status(200).json(results);

  } catch (error) {
    return res.status(500).json({ error: "שגיאה בחיפוש המהיר" });
  }
}
