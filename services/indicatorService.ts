import { CandleData } from '../types';

/**
 * Core Principle:
 * 1. All functions accept (number | null)[] or CandleData[].
 * 2. Returns (number | null)[] with exact same length as input.
 * 3. Use null for invalid periods. No array filtering that changes length.
 */

export const executeCustomFormula = (formula: string, data: CandleData[]) => {
  try {
    // Prepare easy-access arrays for the custom script
    const open = data.map(d => d.open);
    const high = data.map(d => d.high);
    const low = data.map(d => d.low);
    const close = data.map(d => d.close);
    const volume = data.map(d => d.volume);
    
    let fn;
    const trimmed = formula.trim();

    // Heuristic: If it starts with 'function', assume it's a full function definition.
    // Otherwise, assume it's a legacy or simple script body.
    if (trimmed.startsWith('function') || trimmed.startsWith('const') || trimmed.startsWith('let') || trimmed.startsWith('var')) {
       // Check if 'calculate' is defined in the string
       if (trimmed.includes('function calculate')) {
          // Fix: Add newline to prevent single-line comments // from commenting out the return
          // Wrapping in block to ensure scope isolation
          const setup = `
            ${trimmed}
            return calculate;
          `;
          const factory = new Function(setup);
          const userFunc = factory();
          return userFunc(data, { open, high, low, close, volume });
       } else {
          // Fallback to body execution if no calculate function found but looks like script
          fn = new Function('data', 'utils', formula);
          return fn(data, { open, high, low, close, volume });
       }
    } else {
       // Simple body mode (Legacy support)
       // e.g. "return close.map(c => c * 2)"
       fn = new Function('data', 'open', 'high', 'low', 'close', 'volume', formula);
       return fn(data, open, high, low, close, volume);
    }
  } catch (e) {
    console.error("Custom formula execution failed", e);
    throw e; // Propagate to UI
  }
};

// --- Base Calculations ---

export const calculateSMA = (values: (number | null)[], period: number): (number | null)[] => {
  const result: (number | null)[] = new Array(values.length).fill(null);
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) continue;
    let sum = 0;
    let isValid = true;
    for (let j = 0; j < period; j++) {
      const val = values[i - j];
      if (val === null) { isValid = false; break; }
      sum += val;
    }
    if (isValid) result[i] = sum / period;
  }
  return result;
};

export const calculateEMA = (values: (number | null)[], period: number): (number | null)[] => {
  const result: (number | null)[] = new Array(values.length).fill(null);
  const k = 2 / (period + 1);
  
  let firstValidIdx = -1;
  for (let i = 0; i < values.length; i++) {
    if (values[i] !== null) { firstValidIdx = i; break; }
  }

  if (firstValidIdx === -1 || (values.length - firstValidIdx) < period) return result;

  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += values[firstValidIdx + i] as number;
  }
  result[firstValidIdx + period - 1] = sum / period;

  for (let i = firstValidIdx + period; i < values.length; i++) {
    const prevEMA = result[i - 1];
    const currVal = values[i];
    if (prevEMA !== null && currVal !== null) {
      result[i] = (currVal - prevEMA) * k + prevEMA;
    } else {
      result[i] = null;
    }
  }
  return result;
};

export const calculateWMA = (values: (number | null)[], period: number): (number | null)[] => {
  const result: (number | null)[] = new Array(values.length).fill(null);
  const denominator = (period * (period + 1)) / 2;
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) continue;
    let sum = 0;
    let isValid = true;
    for (let j = 0; j < period; j++) {
      const val = values[i - j];
      if (val === null) { isValid = false; break; }
      sum += val * (period - j);
    }
    if (isValid) result[i] = sum / denominator;
  }
  return result;
};

// --- Technical Indicators ---

export const calculateHeikinAshi = (data: CandleData[]): CandleData[] => {
  if (data.length === 0) return [];
  const result: CandleData[] = [];
  let prevOpen = data[0].open;
  let prevClose = data[0].close;

  for (let i = 0; i < data.length; i++) {
    const d = data[i];
    const haClose = (d.open + d.high + d.low + d.close) / 4;
    let haOpen = (prevOpen + prevClose) / 2;
    if (i === 0) haOpen = (d.open + d.close) / 2;
    const haHigh = Math.max(d.high, haOpen, haClose);
    const haLow = Math.min(d.low, haOpen, haClose);

    result.push({ ...d, open: haOpen, high: haHigh, low: haLow, close: haClose });
    prevOpen = haOpen;
    prevClose = haClose;
  }
  return result;
};

export const calculateBOLL = (data: CandleData[], period = 20, multiplier = 2) => {
  const closes = data.map(d => d.close);
  const ma = calculateSMA(closes, period);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];
  
  for(let i=0; i<closes.length; i++) {
    if (ma[i] === null) {
      upper.push(null); lower.push(null);
      continue;
    }
    let sumSqDiff = 0;
    for(let j=0; j<period; j++) {
      sumSqDiff += Math.pow(closes[i-j]! - ma[i]!, 2);
    }
    const stdDev = Math.sqrt(sumSqDiff / period);
    upper.push(ma[i]! + stdDev * multiplier);
    lower.push(ma[i]! - stdDev * multiplier);
  }
  return { upper, mid: ma, lower };
};

export const calculateMACD = (data: CandleData[], short = 12, long = 26, mid = 9) => {
  const closes = data.map(d => d.close);
  const emaShort = calculateEMA(closes, short);
  const emaLong = calculateEMA(closes, long);
  
  const dif: (number | null)[] = closes.map((_, i) => {
    if (emaShort[i] !== null && emaLong[i] !== null) return emaShort[i]! - emaLong[i]!;
    return null;
  });

  const dea = calculateEMA(dif, mid);
  
  const macd: (number | null)[] = closes.map((_, i) => {
    if (dif[i] !== null && dea[i] !== null) return (dif[i]! - dea[i]!) * 2;
    return null;
  });

  return { dif, dea, macd };
};

export const calculateKDJ = (data: CandleData[], n = 9, m1 = 3, m2 = 3) => {
  const k: (number | null)[] = new Array(data.length).fill(null);
  const d: (number | null)[] = new Array(data.length).fill(null);
  const j: (number | null)[] = new Array(data.length).fill(null);
  let prevK = 50; let prevD = 50;

  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - n + 1);
    const slice = data.slice(start, i + 1);
    let low = Infinity; let high = -Infinity;
    for (const item of slice) {
      if (item.low < low) low = item.low;
      if (item.high > high) high = item.high;
    }
    
    let rsv = 50;
    if (high !== low && high !== -Infinity) rsv = (data[i].close - low) / (high - low) * 100;

    const currK = (1 / m1) * rsv + ((m1 - 1) / m1) * prevK;
    const currD = (1 / m2) * currK + ((m2 - 1) / m2) * prevD;
    const currJ = 3 * currK - 2 * currD;

    k[i] = currK; d[i] = currD; j[i] = currJ;
    prevK = currK; prevD = currD;
  }
  return { k, d, j };
};

export const calculateRSI = (data: CandleData[], period = 14): (number | null)[] => {
  const rsi: (number | null)[] = new Array(data.length).fill(null);
  if (data.length <= period) return rsi;

  let gains = 0; let losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = data[i].close - data[i-1].close;
    if (diff > 0) gains += diff; else losses -= diff;
  }
  let avgGain = gains / period; let avgLoss = losses / period;
  rsi[period] = 100 - (100 / (1 + (avgLoss === 0 ? 100 : avgGain / avgLoss)));

  for (let i = period + 1; i < data.length; i++) {
    const diff = data[i].close - data[i-1].close;
    const currGain = diff > 0 ? diff : 0;
    const currLoss = diff < 0 ? -diff : 0;
    avgGain = ((avgGain * (period - 1)) + currGain) / period;
    avgLoss = ((avgLoss * (period - 1)) + currLoss) / period;
    if (avgLoss === 0) rsi[i] = 100;
    else rsi[i] = 100 - (100 / (1 + avgGain / avgLoss));
  }
  return rsi;
};

export const calculateStochRSI = (data: CandleData[], period = 14) => {
    const rsi = calculateRSI(data, period);
    const k: (number|null)[] = []; 
    const d: (number|null)[] = [];
    
    // Calculate StochRSI K
    const stoch: (number|null)[] = [];
    for(let i=0; i<rsi.length; i++) {
        if(i < period + period - 1) { stoch.push(null); continue; }
        // Lookback on RSI
        const slice = rsi.slice(i-period+1, i+1);
        // Filter nulls just in case
        const validSlice = slice.filter(x => x !== null) as number[];
        if(validSlice.length === 0) { stoch.push(null); continue; }
        
        const max = Math.max(...validSlice);
        const min = Math.min(...validSlice);
        if(max === min) stoch.push(100);
        else stoch.push(((rsi[i]! - min) / (max - min)) * 100);
    }
    
    // Smooth K and D (SMA 3)
    const smoothK = calculateSMA(stoch, 3);
    const smoothD = calculateSMA(smoothK, 3);
    return { k: smoothK, d: smoothD };
};

export const calculateTRIX = (data: CandleData[], n = 12, m = 9) => {
  const closes = data.map(d => d.close);
  const ema1 = calculateEMA(closes, n);
  const ema2 = calculateEMA(ema1, n);
  const ema3 = calculateEMA(ema2, n);
  const trix: (number | null)[] = new Array(data.length).fill(null);
  
  for(let i = 1; i < ema3.length; i++) {
    const curr = ema3[i]; const prev = ema3[i-1];
    if (curr !== null && prev !== null && prev !== 0) trix[i] = (curr - prev) / prev * 100;
  }
  const matrix = calculateSMA(trix, m);
  return { trix, matrix };
};

export const calculateATR = (data: CandleData[], period = 14): (number | null)[] => {
  const tr: (number|null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i === 0) tr.push(data[i].high - data[i].low);
    else {
      const hl = data[i].high - data[i].low;
      const hpc = Math.abs(data[i].high - data[i-1].close);
      const lpc = Math.abs(data[i].low - data[i-1].close);
      tr.push(Math.max(hl, hpc, lpc));
    }
  }
  return calculateSMA(tr, period);
};

export const calculateCCI = (data: CandleData[], period = 20): (number | null)[] => {
  const tp = data.map(d => (d.high + d.low + d.close) / 3);
  const smaTp = calculateSMA(tp, period);
  const cci: (number | null)[] = new Array(data.length).fill(null);

  for(let i=0; i<data.length; i++) {
    if (smaTp[i] !== null) {
      let sumDev = 0;
      for(let j=0; j<period; j++) { sumDev += Math.abs(tp[i-j] - smaTp[i]!); }
      const meanDev = sumDev / period;
      if (meanDev === 0) cci[i] = 0;
      else cci[i] = (tp[i] - smaTp[i]!) / (0.015 * meanDev);
    }
  }
  return cci;
};

export const calculateWR = (data: CandleData[], period = 14): (number | null)[] => {
  const wr: (number | null)[] = new Array(data.length).fill(null);
  for(let i=0; i<data.length; i++) {
    if (i < period - 1) continue;
    const slice = data.slice(i - period + 1, i + 1);
    const highest = Math.max(...slice.map(d => d.high));
    const lowest = Math.min(...slice.map(d => d.low));
    if (highest === lowest) wr[i] = -50;
    else wr[i] = (highest - data[i].close) / (highest - lowest) * -100;
  }
  return wr;
};

export const calculateROC = (data: CandleData[], period = 12): (number | null)[] => {
  const result = new Array(data.length).fill(null);
  for(let i = period; i < data.length; i++) {
    const prev = data[i-period].close;
    if (prev !== 0) result[i] = ((data[i].close - prev) / prev) * 100;
  }
  return result;
};

export const calculateOBV = (data: CandleData[]): number[] => {
    const obv: number[] = new Array(data.length).fill(0);
    let current = 0;
    for(let i=0; i<data.length; i++) {
        if (i > 0) {
            if (data[i].close > data[i-1].close) current += data[i].volume;
            else if (data[i].close < data[i-1].close) current -= data[i].volume;
        }
        obv[i] = current;
    }
    return obv;
};

export const calculateMFI = (data: CandleData[], period = 14): (number|null)[] => {
    const mfi = new Array(data.length).fill(null);
    const tp = data.map(d => (d.high + d.low + d.close) / 3);
    for(let i=period; i<data.length; i++) {
        let pos = 0; let neg = 0;
        for(let j=0; j<period; j++) {
            const rawFlow = tp[i-j] * data[i-j].volume;
            if (tp[i-j] > tp[i-j-1]) pos += rawFlow;
            else if (tp[i-j] < tp[i-j-1]) neg += rawFlow;
        }
        if (neg === 0) mfi[i] = 100;
        else mfi[i] = 100 - (100 / (1 + pos/neg));
    }
    return mfi;
};

export const calculateVWAP = (data: CandleData[]): number[] => {
    const vwap: number[] = [];
    let cumPV = 0;
    let cumV = 0;
    for (let i = 0; i < data.length; i++) {
        const tp = (data[i].high + data[i].low + data[i].close) / 3;
        cumPV += tp * data[i].volume;
        cumV += data[i].volume;
        if (cumV === 0) vwap.push(tp);
        else vwap.push(cumPV / cumV);
    }
    return vwap;
};

export const calculateSAR = (data: CandleData[], start = 0.02, increment = 0.02, max = 0.2): (number | null)[] => {
    const sar = new Array(data.length).fill(null);
    if(data.length === 0) return sar;
    
    let isBull = true; let af = start; 
    let ep = data[0].high; let hp = data[0].high; let lp = data[0].low;
    sar[0] = data[0].low;

    for (let i = 1; i < data.length; i++) {
        const prevSar = sar[i-1]!;
        let newSar = prevSar + af * (ep - prevSar);
        
        if (isBull) {
            if (data[i].low < newSar) { 
                isBull = false; newSar = hp; lp = data[i].low; af = start; ep = lp; 
            } else { 
                if (data[i].high > hp) { hp = data[i].high; af = Math.min(af + increment, max); ep = hp; }
                if (i > 1) newSar = Math.min(newSar, data[i-1].low, data[i-2].low);
            }
        } else {
            if (data[i].high > newSar) { 
                isBull = true; newSar = lp; hp = data[i].high; af = start; ep = hp; 
            } else { 
                if (data[i].low < lp) { lp = data[i].low; af = Math.min(af + increment, max); ep = lp; }
                if (i > 1) newSar = Math.max(newSar, data[i-1].high, data[i-2].high);
            }
        }
        sar[i] = newSar;
    }
    return sar;
};

export const calculateDonchian = (data: CandleData[], period = 20) => {
    const upper: (number|null)[] = []; const mid: (number|null)[] = []; const lower: (number|null)[] = [];
    for (let i = 0; i < data.length; i++) {
        if (i < period - 1) { upper.push(null); mid.push(null); lower.push(null); continue; }
        const slice = data.slice(i - period + 1, i + 1);
        const max = Math.max(...slice.map(d => d.high));
        const min = Math.min(...slice.map(d => d.low));
        upper.push(max); lower.push(min); mid.push((max + min) / 2);
    }
    return { upper, mid, lower };
};

export const calculateIchimoku = (data: CandleData[]) => {
    const getHL = (idx: number, period: number) => {
        if(idx < period-1) return null;
        const slice = data.slice(idx-period+1, idx+1);
        return (Math.max(...slice.map(d=>d.high)) + Math.min(...slice.map(d=>d.low)))/2;
    };
    const tenkan: (number|null)[] = []; const kijun: (number|null)[] = []; 
    const spanA: (number|null)[] = []; const spanB: (number|null)[] = [];
    
    for(let i=0; i<data.length; i++) { tenkan.push(getHL(i, 9)); kijun.push(getHL(i, 26)); }
    for(let i=0; i<data.length; i++) {
        if(i < 26) { spanA.push(null); spanB.push(null); continue; }
        const prev = i - 26;
        if(tenkan[prev] !== null && kijun[prev] !== null) spanA.push((tenkan[prev]! + kijun[prev]!)/2); else spanA.push(null);
        spanB.push(getHL(prev, 52));
    }
    return { tenkan, kijun, spanA, spanB };
};

export const calculateSuperTrend = (data: CandleData[], period = 10, multiplier = 3) => {
    const atr = calculateATR(data, period);
    const st: (number|null)[] = []; const dir: number[] = [];
    let prevUpper = 0; let prevLower = 0; let prevDir = 1;
    
    for(let i=0; i<data.length; i++) {
        if(i < period || atr[i] === null) { st.push(null); dir.push(1); continue; }
        const hl2 = (data[i].high + data[i].low)/2;
        let basicUpper = hl2 + multiplier * atr[i]!;
        let basicLower = hl2 - multiplier * atr[i]!;
        
        let upper = (basicUpper < prevUpper || data[i-1].close > prevUpper) ? basicUpper : prevUpper;
        let lower = (basicLower > prevLower || data[i-1].close < prevLower) ? basicLower : prevLower;
        
        let d = prevDir;
        if(prevDir === 1 && data[i].close < lower) d = -1;
        else if(prevDir === -1 && data[i].close > upper) d = 1;
        
        st.push(d === 1 ? lower : upper);
        dir.push(d);
        prevUpper = upper; prevLower = lower; prevDir = d;
    }
    return { supertrend: st, directions: dir };
};

export const calculateKeltner = (data: CandleData[], length = 20, mult = 2) => {
    const closes = data.map(d => d.close);
    const ema = calculateEMA(closes, length);
    const atr = calculateATR(data, length);
    const upper: (number|null)[] = []; const lower: (number|null)[] = [];
    for(let i=0; i<data.length; i++) {
        if(ema[i]===null || atr[i]===null) { upper.push(null); lower.push(null); }
        else { upper.push(ema[i]! + mult * atr[i]!); lower.push(ema[i]! - mult * atr[i]!); }
    }
    return { mid: ema, upper, lower };
};

export const calculateAlligator = (data: CandleData[]) => {
    const hl2 = data.map(d => (d.high+d.low)/2);
    const j = calculateWMA(hl2, 13); const t = calculateWMA(hl2, 8); const l = calculateWMA(hl2, 5);
    const jaw = new Array(data.length).fill(null);
    const teeth = new Array(data.length).fill(null);
    const lips = new Array(data.length).fill(null);
    
    for(let i=8; i<data.length; i++) jaw[i] = j[i-8];
    for(let i=5; i<data.length; i++) teeth[i] = t[i-5];
    for(let i=3; i<data.length; i++) lips[i] = l[i-3];
    return { jaw, teeth, lips };
};

export const calculateDMI = (data: CandleData[], period = 14) => {
    const plusDM: (number|null)[] = []; const minusDM: (number|null)[] = []; const tr: (number|null)[] = [];
    const plusDI: (number|null)[] = []; const minusDI: (number|null)[] = []; const adx: (number|null)[] = [];
    const dx: (number|null)[] = [];

    const calcRMA = (arr: (number|null)[], p: number) => {
        const res = new Array(arr.length).fill(null);
        let sum = 0; let count = 0;
        for(let i=0; i<arr.length; i++) {
            if(arr[i]===null) continue;
            if(count < p) { sum += arr[i]!; count++; if(count===p) res[i]=sum/p; }
            else { res[i] = (res[i-1]! * (p-1) + arr[i]!) / p; }
        }
        return res;
    };

    for(let i=0; i<data.length; i++) {
        if(i===0) { tr.push(null); plusDM.push(null); minusDM.push(null); continue; }
        const h = data[i].high; const l = data[i].low; const c = data[i].close;
        const ph = data[i-1].high; const pl = data[i-1].low; const pc = data[i-1].close;
        const up = h - ph; const down = pl - l;
        
        plusDM.push((up > down && up > 0) ? up : 0);
        minusDM.push((down > up && down > 0) ? down : 0);
        tr.push(Math.max(h-l, Math.abs(h-pc), Math.abs(l-pc)));
    }
    
    const trSmooth = calcRMA(tr, period);
    const plusDMSmooth = calcRMA(plusDM, period);
    const minusDMSmooth = calcRMA(minusDM, period);
    
    for(let i=0; i<data.length; i++) {
        if(trSmooth[i] && trSmooth[i] !== 0) {
            plusDI.push(100 * plusDMSmooth[i]! / trSmooth[i]!);
            minusDI.push(100 * minusDMSmooth[i]! / trSmooth[i]!);
            const sum = plusDI[i]! + minusDI[i]!;
            dx.push(sum === 0 ? 0 : 100 * Math.abs(plusDI[i]! - minusDI[i]!) / sum);
        } else {
            plusDI.push(null); minusDI.push(null); dx.push(null);
        }
    }
    const adxVals = calcRMA(dx, period);
    return { pdi: plusDI, mdi: minusDI, adx: adxVals };
};

export const calculateAroon = (data: CandleData[], period = 25) => {
    const up: (number|null)[] = []; const down: (number|null)[] = [];
    for(let i=0; i<data.length; i++) {
        if(i < period) { up.push(null); down.push(null); continue; }
        const slice = data.slice(i-period, i+1); 
        let highIdx = 0; let lowIdx = 0;
        let highVal = -Infinity; let lowVal = Infinity;
        
        for(let j=0; j<slice.length; j++) {
             if(slice[j].high >= highVal) { highVal = slice[j].high; highIdx = j; }
             if(slice[j].low <= lowVal) { lowVal = slice[j].low; lowIdx = j; }
        }
        
        const daysSinceHigh = period - highIdx;
        const daysSinceLow = period - lowIdx;
        
        up.push(((period - daysSinceHigh)/period)*100);
        down.push(((period - daysSinceLow)/period)*100);
    }
    return { up, down };
};

export const calculateVR = (data: CandleData[], period = 26) => {
    const vr: (number|null)[] = [];
    for(let i=0; i<data.length; i++) {
        if(i < period) { vr.push(null); continue; }
        let u = 0; let d = 0; let f = 0;
        for(let j=0; j<period; j++) {
            const curr = data[i-j]; const prev = data[i-j-1];
            if(curr.close > prev.close) u += curr.volume;
            else if(curr.close < prev.close) d += curr.volume;
            else f += curr.volume;
        }
        if (d + f/2 === 0) vr.push(0);
        else vr.push(100 * (u + f/2) / (d + f/2));
    }
    return vr;
};

export const calculateDMA = (data: CandleData[], s=10, l=50, m=10) => {
    const closes = data.map(d=>d.close);
    const maShort = calculateSMA(closes, s);
    const maLong = calculateSMA(closes, l);
    const dIF: (number|null)[] = [];
    for(let i=0; i<data.length; i++) {
        if(maShort[i]!==null && maLong[i]!==null) dIF.push(maShort[i]! - maLong[i]!);
        else dIF.push(null);
    }
    const dMA = calculateSMA(dIF, m);
    return { dif: dIF, dma: dMA };
};

export const calculateBIAS = (data: CandleData[], periods = [6, 12, 24]) => {
    const closes = data.map(d=>d.close);
    const result: Record<string, (number|null)[]> = {};
    periods.forEach(p => {
        const ma = calculateSMA(closes, p);
        const bias: (number|null)[] = [];
        for(let i=0; i<data.length; i++) {
            if(ma[i] !== null && ma[i] !== 0) bias.push((closes[i] - ma[i]!) / ma[i]! * 100);
            else bias.push(null);
        }
        result[`bias${p}`] = bias;
    });
    return result;
};

export const calculateMTM = (data: CandleData[], n = 12, m = 6) => {
    const mtm: (number|null)[] = [];
    for(let i=0; i<data.length; i++) {
        if(i < n) { mtm.push(null); continue; }
        mtm.push(data[i].close - data[i-n].close);
    }
    const mtmMa = calculateSMA(mtm, m);
    return { mtm, mtmMa };
};

export const calculatePSY = (data: CandleData[], n = 12, m = 6) => {
    const psy: (number|null)[] = [];
    for(let i=0; i<data.length; i++) {
        if(i < n) { psy.push(null); continue; }
        let upCount = 0;
        for(let j=0; j<n; j++) {
            if(data[i-j].close > data[i-j-1].close) upCount++;
        }
        psy.push((upCount/n)*100);
    }
    const psyMa = calculateSMA(psy, m);
    return { psy, psyMa };
};

export const calculateUO = (data: CandleData[], p1=7, p2=14, p3=28) => {
    const bp: number[] = []; const tr: number[] = [];
    for(let i=0; i<data.length; i++) {
        const c = data[i].close; const l = data[i].low; const h = data[i].high;
        const pc = i>0 ? data[i-1].close : c;
        const tl = Math.min(l, pc);
        bp.push(c - tl);
        tr.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
    }
    const calcAvg = (p: number) => {
        const res: (number|null)[] = [];
        for(let i=0; i<data.length; i++) {
            if(i < p-1) { res.push(null); continue; }
            let sBp=0; let sTr=0;
            for(let j=0; j<p; j++) { sBp+=bp[i-j]; sTr+=tr[i-j]; }
            res.push(sTr===0?0:sBp/sTr);
        }
        return res;
    };
    const avg1 = calcAvg(p1); const avg2 = calcAvg(p2); const avg3 = calcAvg(p3);
    const uo: (number|null)[] = [];
    for(let i=0; i<data.length; i++) {
        if(avg3[i]===null) uo.push(null);
        else uo.push(100 * (4*avg1[i]! + 2*avg2[i]! + avg3[i]!) / 7);
    }
    return uo;
};

export const calculateCR = (data: CandleData[], p=26, p1=10, p2=20, p3=40, p4=62) => {
    const cr: (number|null)[] = [];
    for(let i=0; i<data.length; i++) {
        if(i < p || i < 1) { cr.push(null); continue; }
        let p1Sum = 0; let p2Sum = 0;
        for(let j=0; j<p; j++) {
            const h = data[i-j].high; 
            const l = data[i-j].low;
            const ym = (data[i-j-1].high + data[i-j-1].low)/2; 
            p1Sum += Math.max(0, h - ym);
            p2Sum += Math.max(0, ym - l);
        }
        if (p2Sum === 0) cr.push(0);
        else cr.push((p1Sum / p2Sum) * 100);
    }
    const ma1 = calculateSMA(cr, p1);
    const ma2 = calculateSMA(cr, p2);
    const ma3 = calculateSMA(cr, p3);
    const ma4 = calculateSMA(cr, p4);
    
    return { cr, ma1, ma2, ma3, ma4 };
};

export const calculateEMV = (data: CandleData[], period = 14) => {
    const emv: (number|null)[] = [];
    for(let i=0; i<data.length; i++) {
        if(i === 0) { emv.push(null); continue; }
        const h = data[i].high; const l = data[i].low; const v = data[i].volume;
        const ph = data[i-1].high; const pl = data[i-1].low;
        const hl2 = (h+l)/2; const phl2 = (ph+pl)/2;
        const boxRatio = (v/1000000) / (h-l === 0 ? 0.001 : h-l);
        if(boxRatio === 0) emv.push(0);
        else emv.push((hl2 - phl2) / boxRatio);
    }
    const maEmv = calculateSMA(emv, period);
    return { emv, maEmv };
};

export const calculateWVAD = (data: CandleData[], period = 24) => {
    const wvad: (number|null)[] = [];
    for(let i=0; i<data.length; i++) {
        if(i < period-1) { wvad.push(null); continue; }
        let sum = 0;
        for(let j=0; j<period; j++) {
            const d = data[i-j];
            const range = d.high - d.low;
            if (range === 0) continue;
            sum += ((d.close - d.open) / range) * d.volume;
        }
        wvad.push(sum);
    }
    return wvad;
};

export const calculateCHO = (data: CandleData[], p1=3, p2=10) => {
    const ad: number[] = [];
    let prevAd = 0;
    for(let i=0; i<data.length; i++) {
        const d = data[i];
        const clv = (d.close - d.low) - (d.high - d.close);
        const range = d.high - d.low;
        const adVal = range === 0 ? 0 : (clv / range) * d.volume;
        prevAd += adVal;
        ad.push(prevAd);
    }
    const emaShort = calculateEMA(ad, p1);
    const emaLong = calculateEMA(ad, p2);
    const cho: (number|null)[] = [];
    for(let i=0; i<data.length; i++) {
        if(emaShort[i]!==null && emaLong[i]!==null) cho.push(emaShort[i]! - emaLong[i]!);
        else cho.push(null);
    }
    return cho;
};

// --- Series Generator ---
export const generateIndicatorSeries = (type: string, data: CandleData[]) => {
  const series: any[] = [];
  
  // Explicitly return any to allow dynamic property addition (e.g. areaStyle, lineStyle.type)
  const line = (id: string, name: string, data: (number|null)[], color: string, z=2): any => ({
      id, name, type: 'line', z, data, smooth: true, showSymbol: false, lineStyle: { width: 1.5, color }, itemStyle: { color }
  });

  if (type === 'MACD') {
    const m = calculateMACD(data);
    series.push(line('MACD_DIF', 'DIF', m.dif, '#2196F3'));
    series.push(line('MACD_DEA', 'DEA', m.dea, '#FFA726'));
    series.push({ 
        id: 'MACD_BAR', name: 'MACD', type: 'bar', z: 2, 
        data: m.macd, 
        itemStyle: { color: (p: any) => { const v = p.value; return v >= 0 ? '#089981' : '#f23645'; } } 
    });
  } else if (type === 'KDJ') {
    const k = calculateKDJ(data);
    series.push(line('KDJ_K', 'K', k.k, '#FFFFFF'));
    series.push(line('KDJ_D', 'D', k.d, '#FFFF00'));
    series.push(line('KDJ_J', 'J', k.j, '#E91E63'));
  } else if (type === 'RSI') {
    series.push(line('RSI', 'RSI', calculateRSI(data), '#E91E63'));
  } else if (type === 'StochRSI') {
    const s = calculateStochRSI(data);
    series.push(line('SRSI_K', 'K', s.k, '#2196F3'));
    series.push(line('SRSI_D', 'D', s.d, '#FFA726'));
  } else if (type === 'TRIX') {
    const t = calculateTRIX(data);
    series.push(line('TRIX_T', 'TRIX', t.trix, '#FFFFFF'));
    series.push(line('TRIX_M', 'MATRIX', t.matrix, '#FFFF00'));
  } else if (type === 'CCI') {
    series.push(line('CCI', 'CCI', calculateCCI(data), '#FFFFFF'));
  } else if (type === 'WR') {
    series.push(line('WR', 'WR', calculateWR(data), '#FFA726'));
  } else if (type === 'OBV') {
    series.push(line('OBV', 'OBV', calculateOBV(data), '#FFFFFF'));
  } else if (type === 'ROC') {
    series.push(line('ROC', 'ROC', calculateROC(data), '#2196F3'));
  } else if (type === 'ATR') {
    series.push(line('ATR', 'ATR', calculateATR(data), '#E91E63'));
  } else if (type === 'VOL') {
    series.push({ 
        id: 'VOL', type: 'bar', z: 2, 
        data: data.map(d => d.volume), 
        itemStyle: { color: (p: any) => {
            const i = p.dataIndex;
            return i > 0 && data[i].close >= data[i-1].close ? '#089981' : '#f23645'; 
        }} 
    });
  } else if (type === 'MFI') {
    series.push(line('MFI', 'MFI', calculateMFI(data), '#9C27B0'));
  } else if (type === 'VR') {
     series.push(line('VR', 'VR', calculateVR(data), '#FF5722')); 
  } else if (type === 'DMI') {
      const d = calculateDMI(data);
      series.push(line('DMI_P', '+DI', d.pdi, '#089981'));
      series.push(line('DMI_M', '-DI', d.mdi, '#F23645'));
      series.push(line('DMI_ADX', 'ADX', d.adx, '#FF9800'));
  } else if (type === 'AROON') {
      const a = calculateAroon(data);
      series.push(line('AROON_U', 'Up', a.up, '#089981'));
      series.push(line('AROON_D', 'Down', a.down, '#F23645'));
  } else if (type === 'UO') {
      series.push(line('UO', 'UO', calculateUO(data), '#2962FF'));
  } else if (type === 'DMA') {
      const d = calculateDMA(data);
      series.push(line('DMA_DIF', 'DIF', d.dif, '#FFFFFF'));
      series.push(line('DMA_DMA', 'DMA', d.dma, '#FFFF00'));
  } else if (type === 'BIAS') {
      const b = calculateBIAS(data);
      series.push(line('BIAS6', 'BIAS6', b.bias6, '#FFFFFF'));
      series.push(line('BIAS12', 'BIAS12', b.bias12, '#FFFF00'));
      series.push(line('BIAS24', 'BIAS24', b.bias24, '#E91E63'));
  } else if (type === 'MTM') {
      const m = calculateMTM(data);
      series.push(line('MTM', 'MTM', m.mtm, '#FFFFFF'));
      series.push(line('MTMMA', 'MTMMA', m.mtmMa, '#FFFF00'));
  } else if (type === 'PSY') {
      const p = calculatePSY(data);
      series.push(line('PSY', 'PSY', p.psy, '#FFFFFF'));
      series.push(line('PSYMA', 'PSYMA', p.psyMa, '#FFFF00'));
  } else if (type === 'CR') {
      const c = calculateCR(data);
      series.push(line('CR', 'CR', c.cr, '#FFFFFF', 2));
      series.push(line('CR_MA1', 'MA1', c.ma1, '#FFFF00', 1));
      series.push(line('CR_MA2', 'MA2', c.ma2, '#E91E63', 1));
      series.push(line('CR_MA3', 'MA3', c.ma3, '#089981', 1));
  } else if (type === 'EMV') {
      const e = calculateEMV(data);
      series.push(line('EMV', 'EMV', e.emv, '#FFFFFF'));
      series.push(line('EMV_MA', 'MAEMV', e.maEmv, '#FFFF00'));
  } else if (type === 'WVAD') {
      series.push({ id: 'WVAD', name: 'WVAD', type: 'bar', z: 2, data: calculateWVAD(data), itemStyle: { color: (p:any) => p.value >= 0 ? '#089981' : '#f23645' } });
  } else if (type === 'CHO') {
      series.push(line('CHO', 'CHO', calculateCHO(data), '#2196F3'));
  }
  // Main Chart Overlays
  else if (type.startsWith('MA')) {
      const p = parseInt(type.replace('MA', '')) || 5;
      series.push(line(type, type, calculateSMA(data.map(d=>d.close), p), '#FF9800', 5));
  } else if (type === 'BOLL') {
      const b = calculateBOLL(data);
      const upper = line('BOLL_UP', 'Upper', b.upper, '#FFFFFF', 4);
      upper.lineStyle.type = 'dashed'; upper.lineStyle.opacity = 0.5;
      series.push(upper);
      
      const mid = line('BOLL_MID', 'Mid', b.mid, '#FF9800', 4);
      series.push(mid);
      
      const lower = line('BOLL_LOW', 'Lower', b.lower, '#FFFFFF', 4);
      lower.lineStyle.type = 'dashed'; lower.lineStyle.opacity = 0.5;
      series.push(lower);
  } else if (type === 'SAR') {
      series.push({ id: 'SAR', name: 'SAR', type: 'scatter', z: 5, data: calculateSAR(data), symbolSize: 3, itemStyle: { color: '#fff' } });
  } else if (type === 'ICHIMOKU') {
      const i = calculateIchimoku(data);
      series.push(line('ICHI_T', 'Tenkan', i.tenkan, '#00E5FF', 5));
      series.push(line('ICHI_K', 'Kijun', i.kijun, '#D500F9', 5));
      series.push({ id: 'ICHI_SA', name: 'Span A', type: 'line', z: 4, data: i.spanA, lineStyle:{width:0}, areaStyle:{color:'#00E676', opacity:0.1}, showSymbol: false });
      series.push({ id: 'ICHI_SB', name: 'Span B', type: 'line', z: 4, data: i.spanB, lineStyle:{width:0}, areaStyle:{color:'#FF1744', opacity:0.1}, showSymbol: false });
  } else if (type === 'KELTNER') {
      const k = calculateKeltner(data);
      const upper = line('KC_U', 'Upper', k.upper, '#FFFFFF');
      upper.lineStyle.type='dashed';
      series.push(upper);
      
      const lower = line('KC_L', 'Lower', k.lower, '#FFFFFF');
      lower.lineStyle.type='dashed';
      series.push(lower);
      
      series.push(line('KC_M', 'Mid', k.mid, '#FF9800'));
  } else if (type === 'SUPERTREND') {
      const st = calculateSuperTrend(data);
      series.push({ id: 'ST', name: 'SuperTrend', type: 'line', z: 5, data: st.supertrend, showSymbol: false, lineStyle: {width:2}, itemStyle: { color: (p:any) => st.directions[p.dataIndex] === 1 ? '#089981' : '#f23645' } });
  } else if (type === 'ALLIGATOR') {
      const a = calculateAlligator(data);
      series.push(line('ALL_J', 'Jaw', a.jaw, 'blue', 5));
      series.push(line('ALL_T', 'Teeth', a.teeth, 'red', 5));
      series.push(line('ALL_L', 'Lips', a.lips, 'green', 5));
  } else if (type === 'VWAP') {
      series.push(line('VWAP', 'VWAP', calculateVWAP(data), '#E040FB', 5));
  } else if (type === 'DONCHIAN') {
      const d = calculateDonchian(data);
      const upper = line('DC_U', 'Upper', d.upper, '#FFFFFF');
      upper.areaStyle = { color: '#ffffff', opacity: 0.05 };
      series.push(upper);
      series.push(line('DC_L', 'Lower', d.lower, '#FFFFFF'));
  }
  
  return series;
};