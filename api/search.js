export default async function handler(req, res) {
  const { q, city } = req.query;
  if (!q) return res.status(400).json({ error: "אנא הכנס מוצר" });

  const scraperApiKey = 'c084b907f72b30d3c3f6d941f894fe6a';

  // מאגר האתרים. עבור נוף הגליל, נשתמש בקישור המרוכז שאתה הבאת
  const pharmacies = [
    { name: "פארם ירוק", url: `https://pharm-yarok.co.il/?s=${encodeURIComponent(q)}&post_type=product`, city: "נתניה", address: "האומנות 5, נתניה" },
    { name: "שור טבצ'ניק", url: `https://shor.co.il/?s=${encodeURIComponent(q)}&post_type=product`, city: "תל אביב", address: "המלך ג'ורג' 54, תל אביב" },
    { name: "מקס פארם", url: `https://maxpharm.co.il/?s=${encodeURIComponent(q)}&post_type=product`, city: "חולון", address: "סוקולוב 43, חולון" },
    
    // החיבור החדש והאגרסיבי לאתר קנאביז לפי הקישור ששלחת
    { name: "בתי מרקחת נוף הגליל", url: `https://cannabiz.co.il/חנויות-קנאביס-בנוף-הגליל-מלאי-בתי-מרקח/`, city: "נוף הגליל", address: "נוף הגליל (המיקום המדויק יופיע בעת הרכישה)" }
  ];

  async function fetchWithTimeout(shop) {
    const controller = new AbortController();
    // מגבלת זמן קשיחה של 8.5 שניות כדי ש-Vercel לא יקריס אותנו
    const timeout = setTimeout(() => controller.abort(), 8500);

    try {
      // אנחנו לא מבקשים render=true, אנחנו שואבים את הקוד הגולמי והמהיר
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
      
      // מנקים לחלוטין את כל הקוד העיצובי של האתר ומשאירים רק טקסט נקי ברצף
      const cleanText = html.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ');

      // מוודאים שהמוצר בכלל מופיע בדף
      const searchIndex = cleanText.indexOf(q);
      if (searchIndex === -1) return null; 

      // אם אנחנו סורקים את קנאביז (נוף הגליל), נבצע חיפוש ממוקד סביב אזור המוצר
      let validPrices = [];
      
      if (shop.url.includes('cannabiz')) {
        // לוקחים רדיוס טקסט מסביב לשם המוצר כדי למצוא את המחירים שלו בכל בתי המרקחת שברשימה
        const productArea = cleanText.substring(Math.max(0, searchIndex - 50), searchIndex + 400);
        // מחפשים מספרים הגיוניים לקנאביס בטווח המחירים הסטנדרטי
        const pricesInArea = productArea.match(/\b([1-4][0-9]{2}|500)\b/g);
        
        if (pricesInArea) {
           validPrices = pricesInArea.map(n => parseInt(n)).filter(p => p >= 130 && p <= 450);
        }
      } else {
        // חיפוש רגיל לאתרים בודדים
        const allNumbers = cleanText.match(/\b([1-4][0-9]{2}|500)\b/g);
        if (allNumbers) {
           validPrices = allNumbers.map(n => parseInt(n)).filter(p => p >= 130 && p <= 450);
        }
      }

      // מחזירים רק את התוצאה עם המחיר הכי זול שמצאנו
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
    const relevantPharmacies = city ? pharmacies.filter(p => p.city === city) : pharmacies;
    if (relevantPharmacies.length === 0) return res.status(200).json([]);

    const fetchPromises = relevantPharmacies.map(shop => fetchWithTimeout(shop));
    const results = await Promise.all(fetchPromises);

    const filteredResults = results.filter(r => r !== null);
    filteredResults.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
    
    return res.status(200).json(filteredResults);
  } catch (error) {
    return res.status(500).json({ error: "שגיאת שרת כללית" });
  }
}
