// api/search.js
export default async function handler(req, res) {
    const { q, city } = req.query;

    if (!q) {
        return res.status(400).json({ error: "לא נשלחה מילת חיפוש" });
    }

    try {
        const url = `https://isracann.co.il/?s=${encodeURIComponent(q)}`;
        
        // התחפשות מלאה לטלפון נייד סמסונג כדי לעקוף חסימות רובוטים
        const response = await fetch(url, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
                'Upgrade-Insecure-Requests': '1',
                'Cache-Control': 'max-age=0'
            }
        });
        
        const html = await response.text();
        let liveResults = [];
        
        // מנוע שאיבת מחירים אמיתיים בלבד מקוד האתר
        const priceRegex = /<bdi>([0-9,]+)&nbsp;₪<\/bdi>/g;
        let prices = [];
        let match;

        while ((match = priceRegex.exec(html)) !== null) {
            let priceVal = parseInt(match[1].replace(',', ''));
            if (!isNaN(priceVal)) {
                prices.push(priceVal);
            }
        }

        const searchCity = (city && city !== 'undefined' && city !== '') ? city : 'כללי';

        if (prices.length > 0) {
            // אם פרצנו את ההגנה ומצאנו מחירים חיים, נייצר משבצות אמת
            // הערה מקצועית: כרגע אנחנו שואבים רק את המחיר עצמו ולא את שם החנות מהקוד המורכב שלהם, אז נציג את המחיר האמיתי עם כיתוב המעיד על כך
            for (let i = 0; i < prices.length; i++) {
                liveResults.push({
                    name: q,
                    shop: 'תוצאה אמתית מהרשת (' + searchCity + ')',
                    price: prices[i],
                    likes: 0,
                    city: searchCity
                });
            }
        } else {
            // האמת בפרצוף: אין יותר נתוני דמו. אם נחסמנו או שאין מלאי, הלקוח ידע את האמת.
            return res.status(200).json({ error: "לא מצאנו נתונים חיים כרגע, או שהאתר החיצוני חסם את מנוע הסריקה שלנו." });
        }

        // סידור מהמחיר הזול ליקר ביותר כדי שהמשבצת הכתומה תהיה תמיד למעלה
        liveResults.sort((a, b) => a.price - b.price);

        res.status(200).json(liveResults);
    } catch (error) {
        res.status(500).json({ error: "שגיאת שרת במשיכת הנתונים החיים מהרשת" });
    }
}
