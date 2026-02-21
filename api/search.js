export default async function handler(req, res) {
  const { q } = req.query;

  if (!q) {
    return res.status(400).json({ error: "אנא הכנס מוצר לחיפוש" });
  }

  try {
    // כאן אנו מגדירים את כתובות החיפוש האמיתיות לשלושת בתי המרקחת
    const pharmYarokUrl = `https://pharm-yarok.co.il/?s=${encodeURIComponent(q)}&post_type=product`;
    const shorUrl = `https://shor.co.il/search?q=${encodeURIComponent(q)}`;
    const maxPharmUrl = `https://maxpharm.co.il/search?q=${encodeURIComponent(q)}`;

    // בשלב הבא אנחנו נבצע פניות אמיתיות לכתובות הללו כדי למשוך את קוד האתר.
    // מכיוון שאנו חייבים להתאים את סכין המנתחים לקוד המדויק שלהם, אנו מעבירים כרגע תוצאות מובנות
    // המטרה היא לוודא שזול צ'ק מתפקד בצורה חלקה, מציג את החנויות, ושהתקשורת לשרת יציבה.

    const results = [
      {
        name: `${q} - פארם ירוק`,
        shop: "פארם ירוק",
        price: "240",
        likes: 24,
        buyUrl: pharmYarokUrl
      },
      {
        name: `${q} - שור טבצ'ניק`,
        shop: "שור טבצ'ניק",
        price: "255",
        likes: 12,
        buyUrl: shorUrl
      },
      {
        name: `${q} - מקס פארם`,
        shop: "מקס פארם",
        price: "235",
        likes: 41,
        buyUrl: maxPharmUrl
      }
    ];

    // השרת תמיד ימיין את התוצאות מהזול ליקר כדי שהתג של המחיר המשתלם יעבוד אצלך בממשק
    results.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));

    return res.status(200).json(results);

  } catch (error) {
    return res.status(500).json({ error: "שגיאה בתקשורת מול בתי המרקחת." });
  }
}
