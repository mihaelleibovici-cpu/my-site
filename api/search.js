// api/search.js
export default async function handler(req, res) {
    const { q } = req.query;

    if (!q) {
        return res.status(400).json({ error: "לא נשלחה מילת חיפוש" });
    }

    try {
        // כאן בהמשך ישב מנוע הסריקה שלנו (Scraper) שישאב מחירים אמיתיים מבתי מרקחת!
        // כרגע השרת שולח תשובה מסודרת כדי שנוודא שהתקשורת מהאתר אליו עובדת חלקה:
        const liveResults = [
            { name: q, shop: 'סופר-פארם (הגיע מהשרת!)', price: 249, likes: 50 },
            { name: q, shop: 'טבע קסטל (הגיע מהשרת!)', price: 230, likes: 110 },
            { name: q, shop: 'מדיקל סנטר (הגיע מהשרת!)', price: 215, likes: 300 }
        ];

        // השרת מסדר את התוצאות מהזול ליקר
        liveResults.sort((a, b) => a.price - b.price);

        // שולח את התוצאות לאתר שלך
        res.status(200).json(liveResults);
    } catch (error) {
        res.status(500).json({ error: "שגיאה פנימית בשרת" });
    }
}
