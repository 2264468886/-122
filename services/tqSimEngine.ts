
import { Stock, CandleData, QuantOrder, QuantPosition, QuantAccount, BacktestResult, OrderStatus } from '../types';

/**
 * TqSimEngine - A TypeScript implementation inspired by TqSdk architecture.
 * Designed to simulate an Event-Driven Quant Trading System.
 */

export interface RiskConfig {
  enable: boolean;
  maxSingleOrderAmount: number;
  maxDailyDrawdownPercent: number;
}

// --- 1. Risk Manager (风控模块) ---
class RiskManager {
  private account: QuantAccount;
  private config: RiskConfig;
  private initialBalance: number;

  constructor(account: QuantAccount, config: RiskConfig) {
    this.account = account;
    this.config = config;
    this.initialBalance = account.balance;
  }

  // Rule 1: Single Order Value Limit
  checkOrderLimit(price: number, volume: number): boolean {
    if (!this.config.enable) return true;
    
    const orderValue = price * volume;
    if (orderValue > this.config.maxSingleOrderAmount) {
      console.warn(`[Risk] Order Rejected: Value ${orderValue.toFixed(2)} exceeds limit (${this.config.maxSingleOrderAmount})`);
      return false;
    }
    return true;
  }

  // Rule 2: Short Selling Check (Simplified)
  checkShortAvailability(symbol: string, volume: number, positions: Map<string, QuantPosition>): boolean {
    const pos = positions.get(symbol);
    if (!pos || pos.volume_long - pos.volume_long_frozen < volume) {
       console.warn(`[Risk] Order Rejected: Insufficient holdings for sell.`);
       return false;
    }
    return true;
  }

  // Rule 3: Max Daily Drawdown (Simulated based on initial capital for this session)
  checkDrawdown(): boolean {
      if (!this.config.enable) return true;
      const drawdown = (this.initialBalance - this.account.balance) / this.initialBalance * 100;
      if (drawdown > this.config.maxDailyDrawdownPercent) {
          console.warn(`[Risk] Trading Halted: Drawdown ${drawdown.toFixed(2)}% exceeds limit ${this.config.maxDailyDrawdownPercent}%`);
          return false;
      }
      return true;
  }
}

// --- 2. Order Management System (OMS - 订单管理) ---
class OMS {
  public orders: Map<string, QuantOrder> = new Map();
  public positions: Map<string, QuantPosition> = new Map();
  public account: QuantAccount;
  private riskManager: RiskManager;
  private orderCounter = 0;

  constructor(initialCapital: number, riskConfig: RiskConfig) {
    this.account = {
      currency: 'CNY',
      balance: initialCapital,
      available: initialCapital,
      frozen: 0,
      market_value: 0,
      risk_ratio: 0
    };
    this.riskManager = new RiskManager(this.account, riskConfig);
  }

  createOrder(symbol: string, direction: 'BUY' | 'SELL', price: number, volume: number, date: number): QuantOrder | null {
    // 0. Global Risk Check
    if (!this.riskManager.checkDrawdown()) return null;

    // 1. Order Risk Check
    if (direction === 'BUY') {
        if (!this.riskManager.checkOrderLimit(price, volume)) return null;
        // Check availability
        if (this.account.available < price * volume) {
            console.warn(`[OMS] Insufficient funds`);
            return null;
        }
    } else {
        if (!this.riskManager.checkShortAvailability(symbol, volume, this.positions)) return null;
    }

    // 2. Create Order Object
    const orderId = `TQ-${date}-${++this.orderCounter}`;
    const order: QuantOrder = {
      order_id: orderId,
      symbol,
      direction,
      offset: direction === 'BUY' ? 'OPEN' : 'CLOSE',
      limit_price: price,
      volume_original: volume,
      volume_left: volume,
      status: 'ALIVE',
      insert_date_time: date,
      last_msg: 'Submitted'
    };

    // 3. Freeze Funds/Positions
    if (direction === 'BUY') {
        const cost = price * volume;
        this.account.available -= cost;
        this.account.frozen += cost;
    } else {
        const pos = this.positions.get(symbol);
        if (pos) pos.volume_long_frozen += volume;
    }

    this.orders.set(orderId, order);
    return order;
  }

  // Handle Trade Matching (Simulates Exchange)
  processTrade(orderId: string, tradePrice: number, tradeVolume: number) {
    const order = this.orders.get(orderId);
    if (!order || order.status !== 'ALIVE') return;

    // Update Order
    order.volume_left -= tradeVolume;
    if (order.volume_left === 0) order.status = 'FILLED';

    // Update Position
    let pos = this.positions.get(order.symbol);
    if (!pos) {
        pos = {
            symbol: order.symbol, volume_long: 0, volume_short: 0,
            volume_long_frozen: 0, volume_short_frozen: 0,
            avg_price_long: 0, avg_price_short: 0, last_price: tradePrice
        };
        this.positions.set(order.symbol, pos);
    }

    if (order.direction === 'BUY') {
        // Update Avg Price
        const totalVal = pos.volume_long * pos.avg_price_long + tradeVolume * tradePrice;
        pos.volume_long += tradeVolume;
        pos.avg_price_long = totalVal / pos.volume_long;
        
        // Unfreeze Cash, Deduct Cost
        const cost = tradeVolume * order.limit_price!; // Use limit price for freeze calculation
        this.account.frozen -= cost; 
        // Refund diff if bought cheaper than limit
        const actualCost = tradeVolume * tradePrice;
        const diff = cost - actualCost;
        if (diff > 0) this.account.available += diff;
        
        // Update Market Value
        this.account.market_value += tradeVolume * tradePrice;
        
    } else {
        // Sell
        pos.volume_long -= tradeVolume;
        pos.volume_long_frozen -= tradeVolume;
        
        // Calculate PnL for this chunk (simplified FIFO/Average)
        // Here we just increase available cash
        this.account.market_value -= tradeVolume * tradePrice;
        this.account.available += tradeVolume * tradePrice;
        
        if (pos.volume_long === 0) this.positions.delete(order.symbol);
    }
    
    // Recalculate Balance
    this.account.balance = this.account.available + this.account.frozen + this.account.market_value;
  }
  
  updateMarketPrices(prices: Record<string, number>) {
      let mktVal = 0;
      this.positions.forEach(pos => {
          if (prices[pos.symbol]) {
              pos.last_price = prices[pos.symbol];
              mktVal += pos.volume_long * pos.last_price;
          }
      });
      this.account.market_value = mktVal;
      this.account.balance = this.account.available + this.account.frozen + this.account.market_value;
  }
}

// --- 3. Trading Engine (交易核心) ---
export class TqSimEngine {
  private oms: OMS;
  private data: CandleData[];
  private symbol: string;
  private initialCapital: number;

  constructor(
      initialCapital: number, 
      data: CandleData[], 
      symbol: string, 
      riskConfig: RiskConfig = { enable: true, maxSingleOrderAmount: 300000, maxDailyDrawdownPercent: 10 }
  ) {
    this.initialCapital = initialCapital;
    this.oms = new OMS(initialCapital, riskConfig);
    this.data = data;
    this.symbol = symbol;
  }

  /**
   * Run the Backtest Loop
   * @param strategyCode User provided code body
   * @param parameters User defined parameters to inject into context
   */
  async runBacktest(strategyCode: string, parameters: Record<string, any> = {}): Promise<BacktestResult> {
    const equityCurve: { date: string, value: number }[] = [];
    
    // TqSdk-like API injected into strategy scope
    const api = {
        insert_order: (dir: 'BUY'|'SELL', price: number, vol: number) => {
            return this.oms.createOrder(this.symbol, dir, price, vol, currentDateTimestamp);
        },
        get_position: () => this.oms.positions.get(this.symbol),
        get_account: () => this.oms.account,
        cancel_order: (id: string) => {
            const o = this.oms.orders.get(id);
            if(o) o.status = 'CANCELLED';
        }
    };

    let currentDateTimestamp = 0;

    // Safe Eval Wrapper
    // FIX: Use string concatenation instead of template literals for the function body
    // This prevents SyntaxErrors if 'strategyCode' contains backticks or other template delimiters
    const functionBody = strategyCode + "\n\nif (typeof on_bar === 'function') return on_bar;\nreturn null;";
    const createStrategy = new Function('api', 'quote', 'context', functionBody);

    // Merge user parameters into context
    const context: any = { ...parameters }; 
    let on_bar: any = null;

    try {
        // Initialize Strategy
        on_bar = createStrategy(api, {}, context);
    } catch (e) {
        console.error("Strategy Init Error", e);
        throw e;
    }

    // Main Event Loop
    for (const candle of this.data) {
        currentDateTimestamp = new Date(candle.date).getTime();
        
        // 1. Update OMS Market Data
        this.oms.updateMarketPrices({ [this.symbol]: candle.close });

        // 2. Match Existing Orders (Limit Order Logic)
        this.oms.orders.forEach(order => {
            if (order.status === 'ALIVE') {
                // Buy Limit: Low <= Price
                if (order.direction === 'BUY' && candle.low <= (order.limit_price || Infinity)) {
                    this.oms.processTrade(order.order_id, order.limit_price || candle.open, order.volume_left);
                }
                // Sell Limit: High >= Price
                else if (order.direction === 'SELL' && candle.high >= (order.limit_price || 0)) {
                    this.oms.processTrade(order.order_id, order.limit_price || candle.open, order.volume_left);
                }
            }
        });

        // 3. Trigger Strategy 'on_bar'
        if (on_bar) {
            try {
                // Pass candle as current quote
                on_bar(candle, context);
            } catch (e) {
                console.error("Strategy Runtime Error", e);
            }
        }

        // 4. Record Equity
        equityCurve.push({ date: candle.date, value: this.oms.account.balance });
    }

    // Performance Stats
    const total_returns = ((this.oms.account.balance - this.initialCapital) / this.initialCapital) * 100;
    // Simple Max Drawdown
    let maxVal = -Infinity;
    let maxDD = 0;
    equityCurve.forEach(p => {
        if (p.value > maxVal) maxVal = p.value;
        const dd = (maxVal - p.value) / maxVal;
        if (dd > maxDD) maxDD = dd;
    });

    return {
        orders: Array.from(this.oms.orders.values()),
        equity_curve: equityCurve,
        performance: {
            total_returns,
            max_drawdown: maxDD * 100,
            sharpe_ratio: 0, // Placeholder
            win_rate: 0 // Placeholder
        },
        account: this.oms.account
    };
  }
}
