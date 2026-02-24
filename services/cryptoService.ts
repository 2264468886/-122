
import { Stock, CandleData, OrderBook } from '../types';
import { generateCandleData, generateOrderBook as generateMockOrderBook, getStocks, subscribeToQuotes } from './mockDataService';

/**
 * Market Service (Formerly CryptoService)
 * now serving Mock A-Share and HK Stocks data.
 */

export const getTopCryptos = async (limit = 100): Promise<Stock[]> => {
  // Redirect to stock mock data
  return getStocks();
};

export const getOrderBook = async (symbol: string, limit = 10): Promise<OrderBook | null> => {
    // Generate mock order book for stock
    const stocks = await getStocks();
    const stock = stocks.find(s => s.symbol === symbol);
    const price = stock ? stock.price : 100;
    return generateMockOrderBook(price);
};

export const getCryptoCandles = async (symbol: string, interval = '1D'): Promise<CandleData[]> => {
    // Generate mock candle data for stock
    const stocks = await getStocks();
    const stock = stocks.find(s => s.symbol === symbol);
    const price = stock ? stock.price : 100;
    return generateCandleData(365, price); 
};

export const subscribeToCryptoTicker = (stocks: Stock[], callback: (updatedStocks: Stock[]) => void) => {
    // Use the mock subscription from mockDataService
    return subscribeToQuotes(callback);
};
