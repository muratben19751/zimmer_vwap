// Zimmer VWAP — Sentetik Veri + Dynamic Swing Anchored VWAP + Backtest Motoru
export function rng(seed) {
  let a = 0;
  for (const c of seed) a = (a * 31 + c.charCodeAt(0)) >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const SYMBOLS = {
  BTCUSDT: { base: 64000, vol: 0.012, dec: 1, type: "crypto" },
  ETHUSDT: { base: 3450, vol: 0.015, dec: 2, type: "crypto" },
  SOLUSDT: { base: 148, vol: 0.02, dec: 2, type: "crypto" },
  XAUUSD: { base: 2410, vol: 0.007, dec: 2, type: "forex" },
  EURUSD: { base: 1.085, vol: 0.003, dec: 5, type: "forex" },
};

export const TFS = { "5m": 5, "15m": 15, "1h": 60, "4h": 240, "1D": 1440 };

export function genData(symbol, tf, bars = 420) {
  const cfg = SYMBOLS[symbol] || { base: 100, vol: 0.015, dec: 2 };
  const r = rng(symbol + "|" + tf);
  const stepMs = (TFS[tf] || 60) * 60000;
  const end = Date.now();
  let price = cfg.base * (0.9 + 0.2 * r());
  let drift = 0;
  const out = [];
  for (let i = 0; i < bars; i++) {
    if (r() < 0.045) drift = (r() - 0.48) * cfg.vol * 0.9;
    const o = price;
    const shock = (r() - 0.5) * 2 * cfg.vol * price;
    let c = o + drift * price + shock;
    c = Math.max(c, o * 0.9);
    const range = Math.abs(c - o) + r() * cfg.vol * price * 0.8;
    const h = Math.max(o, c) + r() * range * 0.5;
    const l = Math.min(o, c) - r() * range * 0.5;
    const v = (0.4 + r() + (3 * Math.abs(c - o)) / (cfg.vol * price)) * 1000;
    out.push({ t: end - (bars - 1 - i) * stepMs, o, h, l, c, v });
    price = c;
  }
  return out;
}

export function computeSwings(data, len) {
  const sw = [];
  let lastH = null,
    lastL = null;
  for (let i = len; i < data.length - len; i++) {
    let isH = true,
      isL = true;
    for (let j = i - len; j <= i + len; j++) {
      if (data[j].h > data[i].h) isH = false;
      if (data[j].l < data[i].l) isL = false;
      if (!isH && !isL) break;
    }
    if (isH) {
      const price = data[i].h;
      const label = lastH === null ? "HH" : price >= lastH ? "HH" : "LH";
      lastH = price;
      sw.push({ i, type: "H", price, conf: i + len, label });
    } else if (isL) {
      const price = data[i].l;
      const label = lastL === null ? "LL" : price <= lastL ? "LL" : "HL";
      lastL = price;
      sw.push({ i, type: "L", price, conf: i + len, label });
    }
  }
  return sw;
}

export function computeVWAP(data, swings, m1 = 1, m2 = 2) {
  const out = new Array(data.length).fill(null);
  let sIdx = 0,
    anchor = null,
    sumPV = 0,
    sumV = 0,
    sumP2V = 0;
  for (let i = 0; i < data.length; i++) {
    while (sIdx < swings.length && swings[sIdx].conf <= i) {
      anchor = {
        i: swings[sIdx].i,
        type: swings[sIdx].type,
        label: swings[sIdx].label || (swings[sIdx].type === "H" ? "HH" : "LL"),
      };
      sIdx++;
      sumPV = 0;
      sumV = 0;
      sumP2V = 0;
      for (let j = anchor.i; j < i; j++) {
        const tp = (data[j].h + data[j].l + data[j].c) / 3;
        sumPV += tp * data[j].v;
        sumV += data[j].v;
        sumP2V += tp * tp * data[j].v;
      }
    }
    if (!anchor) continue;
    const tp = (data[i].h + data[i].l + data[i].c) / 3;
    sumPV += tp * data[i].v;
    sumV += data[i].v;
    sumP2V += tp * tp * data[i].v;
    const v = sumV > 0 ? sumPV / sumV : tp;
    const sd = sumV > 0 ? Math.sqrt(Math.max(0, sumP2V / sumV - v * v)) : 0;
    out[i] = {
      v,
      u1: v + sd * m1,
      l1: v - sd * m1,
      u2: v + sd * m2,
      l2: v - sd * m2,
      aType: anchor.type,
      aI: anchor.i,
      aLabel: anchor.label,
      sd,
    };
  }
  return out;
}

export function backtest(data, vw, p) {
  const trades = [],
    equity = [];
  let cash = p.capital,
    pos = null,
    commTotal = 0;
  const fee = (n) => (n * p.commPct) / 100;
  const triggers = p.triggers || { HH: true, HL: true, LH: true, LL: true };

  for (let i = 0; i < data.length; i++) {
    const b = data[i],
      w = vw[i],
      pw = i > 0 ? vw[i - 1] : null;
    if (w && pw) {
      const pc = data[i - 1].c,
        c = b.c;
      if (pos) {
        let exit = null,
          reason = "";
        if (pos.side === "L") {
          if (c >= w.u2) {
            exit = c;
            reason = "Hedef (+2σ)";
          } else if (c <= w.l1 && c < pos.entry) {
            exit = c;
            reason = "Stop (−1σ)";
          } else if (w.aType === "H" && c < w.v) {
            exit = c;
            reason = "Ters sinyal";
          }
        } else {
          if (c <= w.l2) {
            exit = c;
            reason = "Hedef (−2σ)";
          } else if (c >= w.u1 && c > pos.entry) {
            exit = c;
            reason = "Stop (+1σ)";
          } else if (w.aType === "L" && c > w.v) {
            exit = c;
            reason = "Ters sinyal";
          }
        }
        if (exit != null) {
          const gross =
            pos.side === "L"
              ? pos.qty * (exit - pos.entry)
              : pos.qty * (pos.entry - exit);
          const f = fee(pos.qty * exit);
          commTotal += f;
          const pnl = gross - f - pos.fee;
          cash += pnl;
          trades.push({
            side: pos.side,
            ei: pos.ei,
            entry: pos.entry,
            qty: pos.qty,
            xi: i,
            exit,
            pnl,
            pnlPct:
              (pos.side === "L"
                ? (exit - pos.entry) / pos.entry
                : (pos.entry - exit) / pos.entry) * 100,
            reason,
          });
          pos = null;
        }
      }
      if (!pos) {
        const activeLabel = w.aLabel || (w.aType === "L" ? "LL" : "HH");
        const isTriggerAllowed = triggers[activeLabel] !== false;

        const longSig =
          isTriggerAllowed &&
          p.dir !== "short" &&
          w.aType === "L" &&
          pc <= pw.v &&
          c > w.v;
        const shortSig =
          isTriggerAllowed &&
          p.dir !== "long" &&
          w.aType === "H" &&
          pc >= pw.v &&
          c < w.v;

        if (longSig || shortSig) {
          const qty = (cash * p.sizePct) / 100 / c;
          const f = fee(qty * c);
          commTotal += f;
          pos = { side: longSig ? "L" : "S", ei: i, entry: c, qty, fee: f };
        }
      }
    }
    const mtm = pos
      ? (pos.side === "L"
          ? pos.qty * (b.c - pos.entry)
          : pos.qty * (pos.entry - b.c)) - pos.fee
      : 0;
    equity.push({ t: b.t, v: cash + mtm });
  }
  if (pos) {
    const last = data[data.length - 1].c;
    trades.push({
      side: pos.side,
      ei: pos.ei,
      entry: pos.entry,
      qty: pos.qty,
      xi: null,
      exit: null,
      pnl:
        (pos.side === "L"
          ? pos.qty * (last - pos.entry)
          : pos.qty * (pos.entry - last)) - pos.fee,
      pnlPct: null,
      reason: "Açık",
    });
  }
  return { trades, equity, commTotal };
}

export function metrics(trades, equity, capital, tf, data = []) {
  const closed = trades.filter((t) => t.xi != null);
  const wins = closed.filter((t) => t.pnl > 0),
    losses = closed.filter((t) => t.pnl <= 0);
  const gp = wins.reduce((s, t) => s + t.pnl, 0),
    gl = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
  let peak = -1e18,
    mdd = 0,
    mddPct = 0;
  for (const e of equity) {
    if (e.v > peak) peak = e.v;
    const dd = peak - e.v;
    if (dd > mdd) {
      mdd = dd;
      mddPct = peak > 0 ? (dd / peak) * 100 : 0;
    }
  }
  const rets = [];
  for (let i = 1; i < equity.length; i++)
    rets.push(equity[i].v / equity[i - 1].v - 1);
  const mean = rets.length ? rets.reduce((a, b) => a + b, 0) / rets.length : 0;
  const sd =
    Math.sqrt(
      rets.length
        ? rets.reduce((s, r) => s + (r - mean) * (r - mean), 0) / rets.length
        : 0
    ) || 1e-9;
  const bpy =
    { "5m": 105120, "15m": 35040, "1h": 8760, "4h": 2190, "1D": 365 }[tf] ||
    365;
  const net = equity.length ? equity[equity.length - 1].v - capital : 0;
  const longs = closed.filter((t) => t.side === "L").length;

  let buyHold = 0,
    buyHoldPct = 0;
  if (data && data.length > 1) {
    const firstPrice = data[0].c || data[0].close || 1;
    const lastPrice =
      data[data.length - 1].c || data[data.length - 1].close || firstPrice;
    buyHoldPct = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;
    buyHold = capital * (buyHoldPct / 100);
  }

  return {
    net,
    netPct: (net / capital) * 100,
    total: closed.length,
    wins: wins.length,
    losses: losses.length,
    winRate: closed.length ? (wins.length / closed.length) * 100 : 0,
    pf: gl > 0 ? gp / gl : gp > 0 ? Infinity : 0,
    mdd,
    mddPct,
    sharpe: (mean / sd) * Math.sqrt(bpy),
    avg: closed.length ? (gp - gl) / closed.length : 0,
    gp,
    gl,
    longs,
    shorts: closed.length - longs,
    buyHold,
    buyHoldPct,
  };
}
