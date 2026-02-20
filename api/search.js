// api/search.js
export default async function handler(req, res) {
    const { q, city } = req.query;

    if (!q) {
        return res.status(400).json({ error: "לא נשלחה מילת חיפוש" });
    }

    try {
        const searchCity = (city && city !== 'undefined' && city !== '') ? city : 'כללי';
        let liveResults = [];

        // רשימת היעדים
        const shops = [
            { id: 'shop1', name: 'פארמה ירוק (' + searchCity + ')', url: `https://telepharma.co.il/?s=${encodeURIComponent(q)}` },
            { id: 'shop2', name: 'טבצ\'ניק קנאביס (' + searchCity + ')', url: `https://shor-tabachnik.co.il/?s=${encodeURIComponent(q)}` }
        ];

        // שימוש בשרת מתווך (Proxy) כדי לעקוף את חומות האש של בתי המרקחת ולשנות IP
        const requests = shops.map(shop => {
            const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(shop.url)}`;
            return fetch(proxyUrl)
                .then(r => r.json())
                .then(data => ({ shop, html: data.contents }))
                .catch(e => ({ shop, error: true }));
        });
        
        const responses = await Promise.all(requests);

        // סריקה אגרסיבית של הנתונים שחזרו
        responses.forEach(result => {
            if (!result.error && result.html) {
                // קוד שמזהה מספרים בין 100 ל-450 שצמודים למילה ש"ח, ₪ או לקוד המוסתר של השקל
                const priceRegex = /([1-4][0-9]{2})(?:\s*|<[^>]+>)*(?:₪|ש"ח|&#8362;)/g;
                let match;
                let foundPrices = [];
                
                while ((match = priceRegex.exec(result.html)) !== null) {
                    let p = parseInt(match[1]);
                    if (p >= 100 && p <= 450) foundPrices.push(p); 
                }

                if (foundPrices.length > 0) {
                    // לוקחים את המחיר הזול ביותר שמצאנו באותו עמוד
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

        if (liveResults.length === 0) {
            return res.status(200).json({ error: "הפרוקסי נחסם או שלא נמצא מחיר תקין. אתרים אלו חוסמים שאיבת נתונים." });
        }

        // סידור הרשימה מהמחיר הזול ליקר ביותר
        liveResults.sort((a, b) => a.price - b.price);

        res.status(200).json(liveResults);

    } catch (error) {
        res.status(500).json({ error: "שגיאת שרת במערכת הפרוקסי" });
    }
}
