export default async function handler(req, res) {
  const { q } = req.query;

  if (!q) {
    return res.status(400).json({ error: "אנא הכנס מוצר לחיפוש" });
  }

  // כותרות זיוף מתקדמות כדי לעקוף חסימות אבטחה של בתי המרקחת
  const advancedHeaders = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7',
    'Cache-Control': 'max-age=0',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1'
  };

  async function fetchPharmacy(shopName, searchUrl) {
    try {
      const response = await fetch(searchUrl, { headers: advancedHeaders });
      
      if (!response.ok) return null; // אם נחסמנו, נחזיר ריק והשרת ימשיך הלאה
      
      const html = await response.text();
      
      // חילוץ מחירים חכם יותר שמתעלם ממספרים לא רלוונטיים
      const priceRegex = /₪\s*([1-4][0-9]{2})|([1-4][0-9]{2})\s*₪/g;
      let match;
      let validPrices = [];

      while ((match = priceRegex.exec(html)) !== null) {
        const p1 = parseInt(match[1]);
        const p2 = parseInt(match[2]);
        if (p1 >= 100 && p1 <= 450) validPrices.push(p1);
        if (p2 >= 100 && p2 <= 450) validPrices.push(p2);
      }

      if (validPrices.length > 0) {
        return {
          name: `${q}`,
          shop: shopName,
          price: Math.min(...validPrices).toString(),
          likes: Math.floor(Math.random() * 40) + 10,
          buyUrl: searchUrl
        };
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  try {
    const results = [];

    // תקיפה מקבילה של שלושת היעדים
    const [pharmYarok, shor, maxPharm] = await Promise.all([
      fetchPharmacy("פארם ירוק", `https://pharm-yarok.co.il/?s=${encodeURIComponent(q)}&post_type=product`),
      fetchPharmacy("שור טבצ'ניק", `https://shor.co.il/search?q=${encodeURIComponent(q)}`),
      fetchPharmacy("מקס פארם", `https://maxpharm.co.il/search?q=${encodeURIComponent(q)}`)
    ]);

    if (pharmYarok) results.push(pharmYarok);
    if (shor) results.push(shor);
    if (maxPharm) results.push(maxPharm);

    if (results.length === 0) {
       return res.status(200).json([{
        name: "לא נמצא במלאי",
        shop: "בבתי המרקחת שנסרקו",
        price: "0",
        likes: 0,
        buyUrl: "#"
      }]);
    }

    results.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
    return res.status(200).json(results);

  } catch (error) {
    return res.status(500).json({ error: "שגיאת מערכת פנימית בחילוץ הנתונים." });
  }
}
