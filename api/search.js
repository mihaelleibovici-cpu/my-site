export default async function handler(req, res) {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: "אנא הכנס מוצר" });

  const scraperApiKey = 'c084b907f72b30d3c3f6d941f894fe6a';

  async function fetchWithTimeout(shopName, searchUrl) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8500);

    try {
      // שימוש ב-premium=true כדי לנסות לעקוף חסימות אבטחה של האתרים
      const proxyUrl = `http://api.scraperapi.com/?api_key=${scraperApiKey}&url=${encodeURIComponent(searchUrl)}&country_code=il&premium=true`;
      
      const response = await fetch(proxyUrl, { signal: controller.signal });
      clearTimeout(timeout);

      if (!response.ok) {
        return { name: `שגיאת רשת: קוד ${response.status}`, shop: shopName, price: "0", buyUrl: "#" };
      }
      
      let html = await response.text();

      // שולפים את כותרת הדף כדי לדעת איזה דף השרת באמת קיבל
      const titleMatch = html.match(/<title>(.*?)<\/title>/i);
      const pageTitle = titleMatch ? titleMatch[1] : "ללא כותרת";

      html = html.replace(/&#8362;/g, '₪').replace(/&nbsp;/g, ' ');
      const cleanText = html.replace(/<[^>]*>?/gm, ' ');

      const priceRegex = /(?:₪|ש"ח)\s*(\d{2,4}(?:\.\d{1,2})?)|(\d{2,4}(?:\.\d{1,2})?)\s*(?:₪|ש"ח)/g;
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

      // אם לא מצאנו מחיר, השרת יזרוק למסך את כותרת האתר כדי שנראה מה חסם אותנו
      return {
        name: `לא זוהה מחיר. תשובת האתר: ${pageTitle.substring(0, 35)}...`,
        shop: shopName,
        price: "0",
        buyUrl: searchUrl
      };
    } catch (e) {
      return {
        name: `שגיאת קריסה או ניתוק השרת (Timeout)`,
        shop: shopName,
        price: "0",
        buyUrl: "#"
      };
    }
  }

  try {
    const results = await Promise.all([
      fetchWithTimeout("פארם ירוק", `https://pharm-yarok.co.il/?s=${encodeURIComponent(q)}&post_type=product`),
      fetchWithTimeout("שור טבצ'ניק", `https://shor.co.il/search?q=${encodeURIComponent(q)}`),
      fetchWithTimeout("מקס פארם", `https://maxpharm.co.il/search?q=${encodeURIComponent(q)}`)
    ]);

    return res.status(200).json(results);
  } catch (error) {
    return res.status(500).json({ error: "שגיאת שרת כללית" });
  }
}
