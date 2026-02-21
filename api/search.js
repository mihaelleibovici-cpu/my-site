export default async function handler(req, res) {
  const { q } = req.query;

  if (!q) {
    return res.status(400).json({ error: "אנא הכנס מוצר לחיפוש" });
  }

  try {
    const results = [];

    // פונקציית מנוע השאיבה המרכזי
    async function fetchPrice(shopName, url) {
      try {
        // התחזות לדפדפן רגיל כדי לעקוף חסימות אבטחה בסיסיות
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'he-IL,he;q=0.9'
          }
        });

        if (!response.ok) return null;

        const html = await response.text();

        // סורק את האתר ומחפש מחירים בסביבת סמל השקל
        const priceRegex = /₪\s*([0-9]{2,4})|([0-9]{2,4})\s*₪/g;
        let match;
        let prices = [];

        while ((match = priceRegex.exec(html)) !== null) {
          if (match[1]) prices.push(parseInt(match[1]));
          if (match[2]) prices.push(parseInt(match[2]));
        }

        // סינון רעשי רקע: לוקח רק מחירים הגיוניים לתפרחות ושמנים
        const validPrices = prices.filter(p => p >= 100 && p <= 450);

        if (validPrices.length > 0) {
          // שולף את המחיר הזול ביותר שנמצא בעמוד (לרוב מחירו של המוצר שחיפשנו)
          const minPrice = Math.min(...validPrices);
          return {
            name: `${q}`,
            shop: shopName,
            price: minPrice.toString(),
            likes: Math.floor(Math.random() * 40) + 10, // מנגנון לייקים זמני
            buyUrl: url
          };
        }

        return null; 
      } catch (error) {
        return null;
      }
    }

    // הפעלת השאיבה במקביל לכל בתי המרקחת לביצועים מהירים
    const [pharmYarok, shor, maxPharm] = await Promise.all([
      fetchPrice("פארם ירוק", `https://pharm-yarok.co.il/?s=${encodeURIComponent(q)}&post_type=product`),
      fetchPrice("שור טבצ'ניק", `https://shor.co.il/search?q=${encodeURIComponent(q)}`),
      fetchPrice("מקס פארם", `https://maxpharm.co.il/search?q=${encodeURIComponent(q)}`)
    ]);

    // הוספת התוצאות התקינות בלבד
    if (pharmYarok) results.push(pharmYarok);
    if (shor) results.push(shor);
    if (maxPharm) results.push(maxPharm);

    // אם אף בית מרקחת לא החזיר מחיר תקין
    if (results.length === 0) {
       return res.status(200).json([{
        name: "לא נמצא במלאי",
        shop: "בבתי המרקחת שנסרקו",
        price: "0",
        likes: 0,
        buyUrl: "#"
      }]);
    }

    // מיון אוטומטי מהזול ליקר עבור זול צ'ק
    results.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));

    return res.status(200).json(results);

  } catch (error) {
    return res.status(500).json({ error: "שגיאה בסריקת בתי המרקחת." });
  }
}
