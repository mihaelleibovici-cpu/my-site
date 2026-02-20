// api/search.js
export default async function handler(req, res) {
    const { q, city } = req.query;

    if (!q) {
        return res.status(400).json({ error: "לא נשלחה מילת חיפוש" });
    }

    try {
        // --- כאן יכנס בהמשך מנוע משיכת הנתונים האמיתי! ---
        // כרגע יצרתי נתוני דמה שמכילים גם את הערים כדי לבדוק שהסינון עובד לך:
        let liveResults = [
            { name: q, shop: 'פארם ירוק (שרת)', price: 239, likes: 120, city: 'נוף הגליל' },
            { name: q, shop: 'גליל פארם (שרת)', price: 210, likes: 300, city: 'נוף הגליל' },
            { name: q, shop: 'טבע בית המרקחת (שרת)', price: 299, likes: 45, city: 'עפולה' },
            { name: q, shop: 'מדיקל סנטר (שרת)', price: 219, likes: 205, city: 'תל אביב' },
            { name: q, shop: 'שור טבצ\'ניק (שרת)', price: 250, likes: 150, city: 'תל אביב' },
            { name: q, shop: 'קנאביס טאון (שרת)', price: 275, likes: 88, city: 'באר שבע' }
        ];

        // אם המשתמש בחר עיר, השרת מסנן ומשאיר רק את התוצאות של העיר הזו
        if (city && city !== 'undefined' && city !== '') {
            liveResults = liveResults.filter(item => item.city === city);
        }

        // אם אחרי הסינון אין תוצאות בעיר הזו
        if (liveResults.length === 0) {
            return res.status(200).json({ error: `לא מצאנו את המוצר "${q}" בעיר ${city} כרגע.` });
        }

        // מסדר מהמחיר הזול ליקר ביותר
        liveResults.sort((a, b) => a.price - b.price);

        // מחזיר את התוצאות לאתר
        res.status(200).json(liveResults);
    } catch (error) {
        res.status(500).json({ error: "שגיאה פנימית בשרת" });
    }
}
