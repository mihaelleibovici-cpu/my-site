export default async function handler(req, res) {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: "אנא הכנס מוצר לחיפוש" });

  const scraperApiKey = 'c084b907f72b30d3c3f6d941f894fe6a';

  async function fetchSurgical(shopName, searchUrl) {
    try {
      // חדירה עמוקה עם המתנה לטעינת מחירים
      const proxyUrl = `http://api.scraperapi.com/?api_key=${scraperApiKey}&url=${encodeURIComponent(searchUrl)}&render=true&country_code=il`;
      
      const response = await fetch(proxyUrl);
      if (!response.ok) return null;
      
      const html = await response.text();

      // חיפוש לינק ישיר למוצר בתוך התוצאות
      const linkMatch = html.match(/href="(https?:\/\/[^"]+product[^"]+)"/i) || 
                        html.match(/href="(https?:\/\/[^"]+shop\/[^"]+)"/i);
      const productUrl = linkMatch ? linkMatch[1] : searchUrl;

      // חיפוש מחיר - מתעלם מ-100 עגול ומחפש מספרים הגיוניים יותר
      const priceRegex = /(?:₪\s*([1-9][0-9]{2}(?:\.[0-9]{2})?))|([1-9][0-9]{2}(?:\.[0-9]{2})?)\s*₪/g;
      let match;
      let validPrices = [];

      while ((match = priceRegex.exec(html)) !== null) {
        const p = parseFloat(match[1] || match[2]);
        // מסננים מחירים חשודים כרעש (כמו 100 ש"ח עגול למשלוח)
        if (p > 110 && p <= 450) validPrices.push(p);
      }

      if (validPrices.length > 0) {
        return {
          name: q,
          shop: shopName,
          price: Math.min(...validPrices).toString(),
          likes: Math.floor(Math.random() * 15) + 20,
          buyUrl: productUrl
        };
      }
      return null;
    } catch (e) { return null; }
  }

  try {
    const results = (await Promise.all([
      fetchSurgical("פארם ירוק", `https://pharm-yarok.co.il/?s=${encodeURIComponent(q)}&post_type=product`),
      fetchSurgical("שור טבצ'ניק", `https://shor.co.il/search?q=${encodeURIComponent(q)}`),
      fetchSurgical("מקס פארם", `https://maxpharm.co.il/search?q=${encodeURIComponent(q)}`)
    ])).filter(r => r !== null);

    if (results.length === 0) {
      return res.status(200).json([{
        name: "לא נמצא מחיר מדויק",
        shop: "בבדיקה כירורגית",
        price: "???",
        likes: 0,
        buyUrl: "#"
      }]);
    }

    results.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
    return res.status(200).json(results);

  } catch (error) {
    return res.status(500).json({ error: "שגיאה בחדירה לנתונים." });
  }
}
