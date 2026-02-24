
import { Stock, CandleData, OrderBook, OrderBookEntry } from '../types';

const generateSparkline = (basePrice: number): number[] => {
  const data: number[] = [basePrice];
  for (let i = 0; i < 20; i++) {
    const prev = data[data.length - 1];
    const change = (Math.random() - 0.5) * (basePrice * 0.05); 
    data.push(prev + change);
  }
  return data;
};

// Global Crypto Data Population
const rawStocks: Stock[] = [
  { symbol: 'BTCUSDT', name: 'Bitcoin', price: 64230.50, change: 1250.20, changePercent: 1.98, sector: 'Layer 1', market: 'CRYPTO', sparkline: [] },
  { symbol: 'ETHUSDT', name: 'Ethereum', price: 3450.80, change: -45.60, changePercent: -1.30, sector: 'Layer 1', market: 'CRYPTO', sparkline: [] },
  { symbol: 'SOLUSDT', name: 'Solana', price: 148.50, change: 8.20, changePercent: 5.85, sector: 'Layer 1', market: 'CRYPTO', sparkline: [] },
  { symbol: 'BNBUSDT', name: 'BNB', price: 590.20, change: 2.10, changePercent: 0.36, sector: 'Exchange', market: 'CRYPTO', sparkline: [] },
  { symbol: 'XRPUSDT', name: 'Ripple', price: 0.62, change: 0.01, changePercent: 1.64, sector: 'Payment', market: 'CRYPTO', sparkline: [] },
  { symbol: 'DOGEUSDT', name: 'Dogecoin', price: 0.16, change: -0.01, changePercent: -5.88, sector: 'Meme', market: 'CRYPTO', sparkline: [] },
  { symbol: 'ADAUSDT', name: 'Cardano', price: 0.45, change: 0.00, changePercent: 0.00, sector: 'Layer 1', market: 'CRYPTO', sparkline: [] },
  { symbol: 'AVAXUSDT', name: 'Avalanche', price: 35.40, change: 1.20, changePercent: 3.51, sector: 'Layer 1', market: 'CRYPTO', sparkline: [] },
  { symbol: 'LINKUSDT', name: 'Chainlink', price: 18.50, change: -0.30, changePercent: -1.60, sector: 'Oracle', market: 'CRYPTO', sparkline: [] },
  { symbol: 'PEPEUSDT', name: 'Pepe', price: 0.0000078, change: 0.0000005, changePercent: 6.84, sector: 'Meme', market: 'CRYPTO', sparkline: [] },
  { symbol: 'NEARUSDT', name: 'NEAR Protocol', price: 7.20, change: 0.40, changePercent: 5.88, sector: 'AI/L1', market: 'CRYPTO', sparkline: [] },
  { symbol: 'RNDRUSDT', name: 'Render', price: 10.50, change: -0.20, changePercent: -1.87, sector: 'AI/DePin', market: 'CRYPTO', sparkline: [] },
];

let currentStocks: Stock[] = rawStocks.map(s => ({ 
  ...s, 
  sparkline: generateSparkline(s.price) 
}));

let intervalId: any = null;
const subscribers: ((stocks: Stock[]) => void)[] = [];

const startSimulation = () => {
  if (intervalId) return;
  intervalId = setInterval(() => {
    currentStocks = currentStocks.map(stock => {
      // Simulate market movement (High volatility for crypto)
      const volatility = 0.005; 
      const move = 1 + (Math.random() * volatility * 2 - volatility);
      const newPrice = Number((stock.price * move).toPrecision(8)); 
      
      const prevClose = stock.price / (1 + stock.changePercent / 100); 
      const newChange = Number((newPrice - prevClose).toPrecision(4));
      const newChangePercent = Number(((newChange / prevClose) * 100).toFixed(2));
      const newSparkline = [...stock.sparkline.slice(1), newPrice];
      return { ...stock, price: newPrice, change: newChange, changePercent: newChangePercent, sparkline: newSparkline };
    });
    notifySubscribers();
  }, 1000); // Faster updates for Crypto
};

const notifySubscribers = () => {
  const stocksCopy = [...currentStocks];
  subscribers.forEach(cb => cb(stocksCopy));
};

export const getStocks = (): Promise<Stock[]> => {
  return new Promise((resolve) => {
    setTimeout(() => resolve([...currentStocks]), 200);
  });
};

export const subscribeToQuotes = (callback: (stocks: Stock[]) => void) => {
  subscribers.push(callback);
  if (!intervalId) startSimulation();
  return () => {
    const idx = subscribers.indexOf(callback);
    if (idx > -1) subscribers.splice(idx, 1);
  };
};

export const generateOrderBook = (basePrice: number): OrderBook => {
  const bids: OrderBookEntry[] = [];
  const asks: OrderBookEntry[] = [];
  let totalBid = 0;
  let totalAsk = 0;
  
  const spread = basePrice * 0.0001; 

  for (let i = 0; i < 5; i++) {
    const bidPrice = basePrice - (i + 1) * spread;
    const bidSize = Math.random() * 2 + 0.1; 
    totalBid += bidSize;
    bids.push({ price: parseFloat(bidPrice.toPrecision(6)), size: bidSize, total: totalBid });

    const askPrice = basePrice + (i + 1) * spread;
    const askSize = Math.random() * 2 + 0.1;
    totalAsk += askSize;
    asks.push({ price: parseFloat(askPrice.toPrecision(6)), size: askSize, total: totalAsk });
  }

  return { bids, asks };
};

export const generateCandleData = (days: number = 365, basePrice: number): CandleData[] => {
  const data: CandleData[] = [];
  let currentPrice = basePrice;
  const now = new Date();

  for (let i = days; i > 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    // Crypto Volatility
    const volatility = basePrice * 0.05; 
    const change = (Math.random() - 0.5) * volatility;
    const open = currentPrice;
    const close = currentPrice + change;
    const high = Math.max(open, close) + Math.random() * (volatility * 0.5);
    const low = Math.min(open, close) - Math.random() * (volatility * 0.5);
    const volume = Math.floor(Math.random() * 5000000) + 100000;
    currentPrice = close;
    data.push({
      date: date.toISOString().split('T')[0],
      open: parseFloat(open.toPrecision(6)),
      high: parseFloat(high.toPrecision(6)),
      low: parseFloat(low.toPrecision(6)),
      close: parseFloat(close.toPrecision(6)),
      volume
    });
  }

  return data.map((item, index, array) => {
    const ma5 = index >= 4 
      ? array.slice(index - 4, index + 1).reduce((sum, d) => sum + d.close, 0) / 5 
      : undefined;
    const ma20 = index >= 19 
      ? array.slice(index - 19, index + 1).reduce((sum, d) => sum + d.close, 0) / 20 
      : undefined;
    return { ...item, ma5, ma20 };
  });
};
