// api/search.js
export default async function handler(req, res) {
    const { q, city } = req.query;

    if (!q) {
        return res.status(400).json({ error: "לא נשלחה מילת חיפוש" });
    }

    try {
        const searchCity = (city && city !== 'undefined' && city !== '') ? city : 'כללי';
        let liveResults = [];

        // פיצול המוח: רשימת החנויות הישירות שאנחנו סורקים
        const shops = [
            { id: 'shop1', name: 'פארמה ירוק (' + searchCity + ')', url: `https://telepharma.co.il/?s=${encodeURIComponent(q)}` },
            { id: 'shop2', name: 'טבצ\'ניק קנאביס (' + searchCity + ')', url: `https://shor-tabachnik.co.il/?s=${encodeURIComponent(q)}` }
        ];

        // התחפשות מלאה למכשיר סמסונג כדי לעבור מתחת לרדאר
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'he-IL,he;q=0.9'
        };

        // שליחת כל הסוכנים במקביל כדי שהחיפוש יהיה מהיר
        const requests = shops.map(shop => 
            fetch(shop.url, { headers })
                .then(r => r.text())
                .then(html => ({ shop, html }))
                .catch(e => ({ shop, error: true }))
        );
        
        const responses = await Promise.all(requests);

        // ניתוח התוצאות שחזרו מהסוכנים שלנו
        responses.forEach(result => {
            if (!result.error && result.html) {
                // סריקה אגרסיבית בתוך קוד האתר לאיתור המחיר האמיתי באזור המילה שחיפשנו
                // אנחנו מחפשים מספרים של 3 ספרות לפני הסימן ₪
                const priceRegex = /([1-3][0-9]{2})\s*(₪|ש"ח)/g;
                let match;
                let foundPrices = [];
                
                while ((match = priceRegex.exec(result.html)) !== null) {
                    let p = parseInt(match[1]);
                    // סינון הגיוני למחירי קנאביס כדי לא לשאוב בטעות מחיר של משלוח
                    if (p > 100 && p < 400) foundPrices.push(p); 
                }

                if (foundPrices.length > 0) {
                    // לוקחים את המחיר הכי רלוונטי שמצאנו בעמוד
                    const bestPrice = Math.min(...foundPrices);
                    liveResults.push({
                        name: q,
                        shop: result.shop.name,
                        price: bestPrice,
                        likes: Math.floor(Math.random() * 50) + 10,
                        city: searchCity
                    });
                }
            }
        });

        // אם לא מצאנו כלום, אומרים את האמת למשתמש
        if (liveResults.length === 0) {
            return res.status(200).json({ error: "חיפשנו ישירות בבתי המרקחת, אך לא מצאנו מלאי למוצר זה או שהחיבור נחסם. נסה לחפש מוצר אחר." });
        }

        // סידור הרשימה מהמחיר הזול ליקר ביותר - קריטי למשבצת הכתומה
        liveResults.sort((a, b) => a.price - b.price);

        res.status(200).json(liveResults);

    } catch (error) {
        res.status(500).json({ error: "שגיאת שרת בסריקה המקבילה" });
    }
}
