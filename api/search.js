export default async function handler(req, res) {
  const { q } = req.query;
  const apiKey = process.env.SERPAPI_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "Missing API Key" });
  }

  try {
    const response = await fetch(`https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(q)}&hl=iw&gl=il&api_key=${apiKey}`);
    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch data" });
  }
}
