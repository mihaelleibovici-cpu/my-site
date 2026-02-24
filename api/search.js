export default async function handler(req, res) {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: "אנא הכנס מוצר" });

  const scraperApiKey = 'c084b907f72b30d3c3f6d941f894fe6a';

  async function fetchWithTimeout(shopName, searchUrl) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8500);

    try {
      const proxyUrl = `http://api.scraperapi.com/?api_key=${scraperApiKey}&url=${encodeURIComponent(searchUrl)}&country_code=il&premium=true`;
      
      const response = await fetch(proxyUrl, { signal: controller.signal });
      clearTimeout(timeout);

      if (!response.ok) {
        return { name: `שגיאת רשת: קוד ${response.status}`, shop: shopName, price: "0", buyUrl: "#" };
      }
      
      let html = await response.text();

      const titleMatch = html.match(/<title>(.*?)<\/title>/i);
      const pageTitle = titleMatch ? titleMatch[1] : "ללא כותרת";

      html = html.replace(/&#8362;/g, '₪').replace(/&nbsp;/g, ' ').replace(/ש"ח/g, '₪');
      const cleanText = html.replace(/<[^>]*>?/gm, ' ');

      // ביטוי רגולרי גמיש בהרבה - מחפש פשוט מספרים בני 3 ספרות שקרובים לסמל המטבע
      const priceRegex = /₪\s*(\d{3})|(\d{3})\s*₪/g;
      let match;
      let prices = [];
      
      while ((match = priceRegex.exec(cleanText)) !== null) {
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

      return {
        name: `לא זוהה מחיר. כותרת: ${pageTitle.substring(0, 35)}...`,
        shop: shopName,
        price: "0",
        buyUrl: searchUrl
      };
    } catch (e) {
      return {
        name: `שגיאת ניתוק השרת`,
        shop: shopName,
        price: "0",
        buyUrl: "#"
      };
    }
  }

  try {
    const results = await Promise.all([
      fetchWithTimeout("פארם ירוק", `https://pharm-yarok.co.il/?s=${encodeURIComponent(q)}&post_type=product`),
      // תיקון כתובות החיפוש למבנה הנכון של האתרים
      fetchWithTimeout("שור טבצ'ניק", `https://shor.co.il/?s=${encodeURIComponent(q)}&post_type=product`),
      fetchWithTimeout("מקס פארם", `https://maxpharm.co.il/?s=${encodeURIComponent(q)}&post_type=product`)
    ]);

    return res.status(200).json(results);
  } catch (error) {
    return res.status(500).json({ error: "שגיאת שרת כללית" });
  }
}
