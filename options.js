// Yahoo Finance options chain proxy
// Returns: { expirationDates: [...], options: [{ calls: [...], puts: [...] }] }
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const { symbol = 'AAPL', date } = req.query;
  const sym = symbol.toUpperCase();
  const h = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/json',
    'Referer': 'https://finance.yahoo.com/',
  };
  const qs = date ? `?date=${date}` : '';
  for (const host of ['https://query1.finance.yahoo.com', 'https://query2.finance.yahoo.com']) {
    try {
      const r = await fetch(`${host}/v7/finance/options/${sym}${qs}`, { headers: h });
      if (!r.ok) continue;
      const d = await r.json();
      const result = d?.optionChain?.result?.[0];
      if (!result) continue;
      // Cache for 5 minutes - options data updates during market hours
      res.setHeader('Cache-Control', 's-maxage=300,stale-while-revalidate=600');
      return res.status(200).json({
        underlying: result.quote?.regularMarketPrice || null,
        expirationDates: result.expirationDates || [],
        strikes: result.strikes || [],
        calls: result.options?.[0]?.calls || [],
        puts: result.options?.[0]?.puts || [],
        meta: {
          symbol: result.underlyingSymbol,
          name: result.quote?.shortName || result.quote?.longName,
          price: result.quote?.regularMarketPrice,
          preMarket: result.quote?.preMarketPrice,
          postMarket: result.quote?.postMarketPrice,
          impliedVolatility: result.options?.[0]?.calls?.[0]?.impliedVolatility,
        }
      });
    } catch (e) { continue; }
  }
  return res.status(503).json({ error: 'options unavailable' });
}
