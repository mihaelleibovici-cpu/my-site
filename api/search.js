export default async function handler(req, res) {
  const { q, city } = req.query; // השרת מקבל עכשיו גם את העיר שהמשתמש בחר
  if (!q) return res.status(400).json({ error: "אנא הכנס מוצר" });

  const scraperApiKey = 'c084b907f72b30d3c3f6d941f894fe6a';

  // מאגר בתי המרקחת האמיתי עם הכתובות והערים שלהם
  const pharmacies = [
    { name: "פארם ירוק", url: `https://pharm-yarok.co.il/?s=${encodeURIComponent(q)}&post_type=product`, city: "נתניה", address: "האומנות 5, נתניה" },
    { name: "שור טבצ'ניק", url: `https://shor.co.il/?s=${encodeURIComponent(q)}&post_type=product`, city: "תל אביב", address: "המלך ג'ורג' 54, תל אביב" },
    { name: "מקס פארם", url: `https://maxpharm.co.il/?s=${encodeURIComponent(q)}&post_type=product`, city: "חולון", address: "סוקולוב 43, חולון" },
    { name: "מדיקל גליל", url: `https://medical-galil.co.il/?s=${encodeURIComponent(q)}&post_type=product`, city: "נוף הגליל", address: "הגלבוע 1, נוף הגליל" },
    { name: "פארמה צפון", url: `https://pharm-north.co.il/?s=${encodeURIComponent(q)}&post_type=product`, city: "נהריה", address: "הגעתון 20, נהריה" }
  ];

  async function fetchWithTimeout(shop) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8500);

    try {
      const proxyUrl = `http://api.scraperapi.com/?api_key=${scraperApiKey}&url=${encodeURIComponent(shop.url)}&country_code=il&premium=true`;
      
      const response = await fetch(proxyUrl, { 
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'
        }
      });
      clearTimeout(timeout);

      if (!response.ok) return null;
      
      let html = await response.text();
      const cleanText = html.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ');

      // הפתרון לויטמינים: מוודאים שהמוצר באמת קיים בדף. אם לא, זורקים את התוצאה
      const searchTerms = q.split(" ");
      const hasProduct = searchTerms.some(term => cleanText.includes(term));
      if (!hasProduct) return null; 

      const allNumbers = cleanText.match(/\b([1-4][0-9]{2}|500)\b/g);
      let validPrices = [];
      if (allNumbers) {
         validPrices = allNumbers.map(n => parseInt(n)).filter(p => p >= 140 && p <= 500);
      }

      if (validPrices.length > 0) {
        return {
          name: q,
          shop: shop.name,
          city: shop.city,
          address: shop.address,
          price: Math.min(...validPrices).toString(),
          buyUrl: shop.url
        };
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  try {
    // מריצים את החיפוש אך ורק על בתי המרקחת שנמצאים בעיר שנבחרה (אם נבחרה עיר)
    const relevantPharmacies = city ? pharmacies.filter(p => p.city === city) : pharmacies;
    
    // אם אין בתי מרקחת במאגר בעיר הזו, נחזיר מיד תשובה ריקה כדי לא לבזבז זמן
    if (relevantPharmacies.length === 0) {
        return res.status(200).json([]);
    }

    const fetchPromises = relevantPharmacies.map(shop => fetchWithTimeout(shop));
    const results = await Promise.all(fetchPromises);

    const filteredResults = results.filter(r => r !== null);
    filteredResults.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
    
    return res.status(200).json(filteredResults);
  } catch (error) {
    return res.status(500).json({ error: "שגיאת שרת כללית" });
  }
}
