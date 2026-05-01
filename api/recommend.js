// Server-side contract recommendation engine
// Receives: { symbol, technicalScore, direction, weights, premarket }
// Fetches options chain, scores each weekly contract, returns top 1-2
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    symbol,
    technicalScore = 50,
    direction = 'neutral',
    weights = {},
    expectedMove = 0,
    underlyingPrice = 0,
  } = req.body || {};

  if (!symbol) return res.status(400).json({ error: 'No symbol' });
  const sym = symbol.toUpperCase();

  const W = {
    technical: weights.technical ?? 1.0,
    delta:     weights.delta     ?? 1.0,
    iv:        weights.iv        ?? 1.0,
    oi:        weights.oi        ?? 1.0,
    volume:    weights.volume    ?? 1.0,
    spread:    weights.spread    ?? 1.0,
    move:      weights.move      ?? 1.0,
  };

  // Fetch options chain
  const h = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/json',
    'Referer': 'https://finance.yahoo.com/',
  };
  let chain = null;
  for (const host of ['https://query1.finance.yahoo.com', 'https://query2.finance.yahoo.com']) {
    try {
      const r = await fetch(`${host}/v7/finance/options/${sym}`, { headers: h });
      if (!r.ok) continue;
      const d = await r.json();
      if (d?.optionChain?.result?.[0]) { chain = d.optionChain.result[0]; break; }
    } catch (e) {}
  }
  if (!chain) return res.status(503).json({ error: 'options chain unavailable' });

  const spot = underlyingPrice || chain.quote?.regularMarketPrice || 0;
  const expDates = (chain.expirationDates || []).map(t => t * 1000);
  // Pick the nearest weekly expiry: <= 10 days out
  const now = Date.now();
  let nearestExp = null;
  for (const t of expDates) {
    const days = (t - now) / 86400000;
    if (days >= 0 && days <= 14) { nearestExp = t; break; }
  }
  if (!nearestExp) nearestExp = expDates[0];

  // If we picked a different expiry than what's loaded, refetch with date param
  const loadedExp = chain.options?.[0]?.expirationDate * 1000;
  let options = chain.options?.[0];
  if (loadedExp !== nearestExp && nearestExp) {
    try {
      const r = await fetch(
        `https://query1.finance.yahoo.com/v7/finance/options/${sym}?date=${Math.floor(nearestExp/1000)}`,
        { headers: h }
      );
      if (r.ok) {
        const d = await r.json();
        if (d?.optionChain?.result?.[0]?.options?.[0]) {
          options = d.optionChain.result[0].options[0];
        }
      }
    } catch (e) {}
  }

  if (!options) return res.status(503).json({ error: 'no options for nearest expiry' });

  // Pick contract type based on direction
  const wantCalls = direction === 'bullish' || direction === 'شراء';
  const wantPuts  = direction === 'bearish' || direction === 'بيع';
  const candidates = [];

  const scoreContract = (c, type) => {
    const strike = c.strike, last = c.lastPrice || c.bid || 0, bid = c.bid || 0, ask = c.ask || 0;
    const oi = c.openInterest || 0, vol = c.volume || 0;
    const iv = c.impliedVolatility || 0;
    const delta = type === 'call'
      ? Math.max(0, Math.min(1, 1 - (strike - spot) / (spot * (iv || 0.3) * 0.4)))
      : Math.max(0, Math.min(1, 1 - (spot - strike) / (spot * (iv || 0.3) * 0.4)));
    // Component scores 0-100
    const s_tech = technicalScore;
    // Delta sweet spot: 0.35-0.55 for swing weekly
    const s_delta = 100 - Math.min(100, Math.abs(delta - 0.45) * 220);
    // IV: lower is cheaper (better entry) but not too low
    const s_iv = iv > 0 ? Math.max(0, 100 - Math.abs(iv - 0.35) * 200) : 50;
    const s_oi = oi > 0 ? Math.min(100, Math.log10(oi + 1) * 25) : 0;
    const s_vol = vol > 0 ? Math.min(100, Math.log10(vol + 1) * 30) : 0;
    // Tight spread is better
    const spread_pct = (ask > 0 && bid > 0) ? (ask - bid) / ((ask + bid) / 2) : 1;
    const s_spread = Math.max(0, 100 - spread_pct * 300);
    // Expected move alignment: how close strike is to expected target
    const target = type === 'call' ? spot * (1 + Math.abs(expectedMove) / 100)
                                   : spot * (1 - Math.abs(expectedMove) / 100);
    const s_move = Math.max(0, 100 - Math.abs(strike - target) / spot * 800);

    const total =
      s_tech   * W.technical +
      s_delta  * W.delta +
      s_iv     * W.iv +
      s_oi     * W.oi +
      s_vol    * W.volume +
      s_spread * W.spread +
      s_move   * W.move;
    const totalW = W.technical + W.delta + W.iv + W.oi + W.volume + W.spread + W.move;
    const score = Math.round(total / totalW);
    return {
      type: type.toUpperCase(),
      strike, lastPrice: last, bid, ask, mid: (bid + ask) / 2,
      openInterest: oi, volume: vol, iv: +iv.toFixed(3),
      delta: +delta.toFixed(3),
      expiry: options.expirationDate * 1000,
      contractSymbol: c.contractSymbol,
      score,
      breakdown: {
        technical: Math.round(s_tech),
        delta:     Math.round(s_delta),
        iv:        Math.round(s_iv),
        oi:        Math.round(s_oi),
        volume:    Math.round(s_vol),
        spread:    Math.round(s_spread),
        move:      Math.round(s_move),
      },
      target: +target.toFixed(2),
      breakeven: type === 'call' ? +(strike + last).toFixed(2) : +(strike - last).toFixed(2),
    };
  };

  if (wantCalls || direction === 'neutral') {
    for (const c of (options.calls || [])) {
      // Filter: roughly within ±10% of spot, has bid/ask
      if (c.strike < spot * 0.92 || c.strike > spot * 1.10) continue;
      if (!c.bid && !c.lastPrice) continue;
      candidates.push(scoreContract(c, 'call'));
    }
  }
  if (wantPuts || direction === 'neutral') {
    for (const p of (options.puts || [])) {
      if (p.strike < spot * 0.90 || p.strike > spot * 1.08) continue;
      if (!p.bid && !p.lastPrice) continue;
      candidates.push(scoreContract(p, 'put'));
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  const top = candidates.slice(0, 2);

  res.setHeader('Cache-Control', 's-maxage=180,stale-while-revalidate=300');
  return res.status(200).json({
    symbol: sym,
    underlying: spot,
    direction,
    technicalScore,
    expectedMove,
    expiry: options.expirationDate * 1000,
    daysToExpiry: Math.round((options.expirationDate * 1000 - now) / 86400000),
    recommendations: top,
    weights: W,
  });
}
