export default async function handler(req, res) {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: "אנא הכנס מוצר" });

  const scraperApiKey = 'c084b907f72b30d3c3f6d941f894fe6a';

  async function fetchWithTimeout(shopName, searchUrl) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8500);

    try {
      const proxyUrl = `http://api.scraperapi.com/?api_key=${scraperApiKey}&url=${encodeURIComponent(searchUrl)}&country_code=il&premium=true`;
      
      const response = await fetch(proxyUrl, { 
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      clearTimeout(timeout);

      if (!response.ok) return null;
      
      let html = await response.text();

      // הופך את כל קוד האתר לגוש טקסט נקי אחד בלי הפרעות
      const cleanText = html.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ');

      // טריק קנאביס: מחפש כל מספר בטווח של 140 עד 500 בכל הדף
      const allNumbers = cleanText.match(/\b([1-4][0-9]{2}|500)\b/g);
      
      let validPrices = [];
      if (allNumbers) {
         validPrices = allNumbers.map(n => parseInt(n)).filter(p => p >= 140 && p <= 500);
      }

      if (validPrices.length > 0) {
        return {
          name: q,
          shop: shopName,
          price: Math.min(...validPrices).toString(), // לוקח את המחיר הזול ביותר
          buyUrl: searchUrl
        };
      }

      // מנגנון הריגול: אם לא מצאנו מחיר, נדפיס למסך את הטקסט שמופיע באתר מיד אחרי שם המוצר
      const searchIndex = cleanText.indexOf(q);
      let debugText = "לא נמצא המוצר בטקסט";
      if(searchIndex !== -1) {
          // חותך 60 תווים אחרי השם כדי שנראה בעיניים מה כתוב שם
          debugText = cleanText.substring(searchIndex, searchIndex + 60);
      }

      return {
        name: `ריגול טקסט: ${debugText}`,
        shop: shopName,
        price: "0",
        buyUrl: searchUrl
      };
    } catch (e) {
      return null;
    }
  }

  try {
    const results = await Promise.all([
      fetchWithTimeout("פארם ירוק", `https://pharm-yarok.co.il/?s=${encodeURIComponent(q)}&post_type=product`),
      fetchWithTimeout("שור טבצ'ניק", `https://shor.co.il/?s=${encodeURIComponent(q)}&post_type=product`),
      fetchWithTimeout("מקס פארם", `https://maxpharm.co.il/?s=${encodeURIComponent(q)}&post_type=product`)
    ]);

    const filteredResults = results.filter(r => r !== null);
    filteredResults.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
    
    return res.status(200).json(filteredResults);
  } catch (error) {
    return res.status(500).json({ error: "שגיאת שרת כללית" });
  }
}
