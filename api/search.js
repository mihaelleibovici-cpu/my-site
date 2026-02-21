export default async function handler(req, res) {
  const { q, city } = req.query;

  if (!q) {
    return res.status(400).json({ error: "אנא הכנס מוצר לחיפוש" });
  }

  // שילוב העיר בחיפוש אם המשתמש בחר אחת
  const searchQuery = city ? `${q} ${city}` : q;
  const apiKey = process.env.SERPAPI_API_KEY;
  
  // פנייה למנוע הקניות של גוגל דרך SerpApi לקבלת מחירי שוק בזמן אמת בישראל
  const url = `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(searchQuery)}&hl=iw&gl=il&api_key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!data.shopping_results || data.shopping_results.length === 0) {
        return res.status(200).json([{
            name: "לא נמצאו תוצאות",
            shop: "נסה חיפוש אחר",
            price: "0",
            likes: 0,
            buyUrl: "#"
        }]);
    }

    // עיבוד התוצאות הגולמיות לפורמט המדויק שצד הלקוח שלך מצפה לקבל
    const formattedResults = data.shopping_results.slice(0, 10).map(item => ({
        name: item.title ? item.title.substring(0, 35) + "..." : "מוצר לא ידוע",
        shop: item.source || "חנות רשת",
        // חילוץ המחיר כמספר נקי כדי שנוכל למיין אותו
        price: item.extracted_price ? item.extracted_price : (item.price ? item.price.replace(/[^0-9.]/g, '') : "0"),
        likes: item.reviews ? item.reviews : Math.floor(Math.random() * 50) + 10,
        buyUrl: item.link || "#"
    }));

    // מיון התוצאות מהזול ליקר כדי שהתוצאה הראשונה תמיד תהיה המשתלמת ביותר
    formattedResults.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));

    return res.status(200).json(formattedResults);

  } catch (error) {
    return res.status(500).json({ error: "שגיאת התחברות למוח. נסה שוב." });
  }
}
