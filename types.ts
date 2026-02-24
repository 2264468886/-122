
export interface Stock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  sector: string;
  market: 'CN' | 'HK' | 'US' | 'CRYPTO';
  sparkline: number[];
}

export interface CandleData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  ma5?: number;
  ma20?: number;
}

export interface OrderBookEntry {
  price: number;
  size: number;
  total: number;
}

export interface OrderBook {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
}

export interface BayesianInputNode {
  name: 'Macro' | 'Fundamental' | 'Technical' | 'Whitepaper' | 'Sentiment' | 'ProjectTeam' | 'Risk' | 'Monitor' | 'Agents';
  score: number; // 0-10
  insight: string;
  trend: 'Positive' | 'Negative' | 'Neutral';
}

export interface StrategyAssessment {
  compatibility: 'High' | 'Medium' | 'Low';
  team_risk_score: number; // 0-100
  broadcast_recommended: boolean;
  reason: string;
}

export interface ExternalSignal {
  source: 'BASIC' | 'FINRL';
  signal: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  timestamp: number;
  isBlocked?: boolean;
  reason?: string;
}

export interface TeamContext {
  alpha_timeframe: string; // '4H/1D'
  beta_timeframe: string; // '15m/1H'
  market_volatility: 'Low' | 'Medium' | 'High';
  portfolio_load: number; // 0-1
  strategic_horizon: 'SCALP' | 'DAY' | 'SWING'; // Added horizon preference
  external_signals?: ExternalSignal[]; // NEW: Signals from other teams
}

export interface BayesianAnalysisResult {
  timestamp: string;
  symbol: string;
  signal: 'BUY' | 'SELL' | 'HOLD';
  
  // Bayesian Probability Data (Standardized Model)
  probabilities: {
    prior: number;      // P(H)
    likelihood: number; // P(E|H)
    evidence: number;   // P(E)
    posterior: number;  // P(H|E)
  };

  // Granular Breakdown for Visualization
  components: {
      prior: {
          history: number; // 40%
          logic: number;   // 30%
          environment: number; // 30%
      };
      likelihood: {
          technical: number; // 30%
          capital: number;   // 20%
          sentiment: number; // 20%
          agents: number;    // 30% (NEW: Consensus)
      };
  };

  // Self-Learning / Evolution Data
  evolution: {
    epoch: number;          // Current generation of the AI model
    knowledge_depth: number; // 0-100 score of absorbed logic
    drift: number;          // How much the model adjusted its weights this session
    status: 'LEARNING' | 'STABLE' | 'EVOLVING';
  };

  // Detailed Inputs
  inputs: BayesianInputNode[];

  learning_updates: string[];
  risk_params: {
    leverage: string;
    stop_loss: string;
    position_size: string; // NEW: Position Sizing Advice
  };

  strategy_assessment?: StrategyAssessment;
}

export interface AgentAnalysisReport {
  decision: { action: 'BUY' | 'SELL' | 'HOLD'; confidence: number; reason: string; entryTarget: number; stopLoss: number; takeProfit: number; };
  technical: { trend: 'Bullish' | 'Bearish' | 'Neutral'; signals: string[]; support: number; resistance: number; };
  research: { score: number; tokenomics: string; projectHealth: string; };
  news: { sentiment: 'Bullish' | 'Bearish' | 'Neutral'; sentimentScore: number; headlines: string[]; };
}

export interface FinGPTAnalysisResult {
  sentiment: { score: number; label: string; sources: { source: string; mood: string }[] };
  prediction: { shortTerm: string; longTerm: string; confidence: number };
  narrative: { summary: string; keyEvents: string[]; riskFactors: string[] };
  whitepaperAnalysis?: { innovationScore: number; techStack: string; utility: string };
  webSources?: { title: string; uri: string }[];
}

// --- NEW INTELLIGENCE SYSTEM TYPES ---

export type IntelSourceType = 'NEWS' | 'WHITEPAPER' | 'SOCIAL' | 'VIDEO' | 'ONCHAIN';

export interface IntelEvent {
  id: string;
  timestamp: number;
  sourceType: IntelSourceType;
  sourceName: string; // e.g., "CoinDesk", "Twitter", "GitHub"
  title: string;
  summary: string;
  url?: string;
  sentiment: number; // -100 to 100
  reliability: number; // 0 to 100
  impact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface IntelReport {
  symbol: string;
  globalSentiment: number; // -100 to 100
  riskScore: number; // 0 to 100
  events: IntelEvent[];
  whitepaperAnalysis?: {
    vision: string;
    teamAllocation: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  };
  pricePrediction7d?: {
    trend: 'UP' | 'DOWN' | 'SIDEWAYS';
    target: number;
    confidence: number;
  };
  lastUpdated: number;
}

// ... Existing Portfolio, etc ...
export interface Portfolio {
  cash: number;
  holdings: Record<string, { qty: number; avgCost: number }>;
  initialCapital: number;
  totalValue: number;
  history: any[];
}

export interface AgentSystemState {
  deepResearch: { status: string; tokenomicsScore: number; narrative: string };
  marketNews: { sentiment: string; hotTopic: string; score: number };
  strategy: { activeStrategy: string; signal: string; confidence: number };
  risk: { level: string; maxDrawdown: number; approved: boolean };
}

export enum ViewMode {
  CHART = 'CHART',
  SCREENER = 'SCREENER',
  FINGPT = 'FINGPT',
  INTEL = 'INTEL' // New View Mode
}

export enum ChartStyle {
  CANDLE = 'candle',
  HOLLOW_CANDLE = 'hollow_candle',
  HEIKIN_ASHI = 'heikin_ashi',
  OHLC = 'ohlc',
  HLC = 'hlc',
  LINE = 'line',
  AREA = 'area',
  STEP = 'step'
}

export type DrawingType = 'trend' | 'ray' | 'extended' | 'arrow' | 'hline' | 'vline' | 'price_range' | 'rect' | 'circle' | 'fib_ret' | 'text' | 'triangle' | 'channel' | 'pitchfork' | 'fib_ext' | 'path';

export interface DrawingPoint {
  date: string;
  price: number;
  seriesIndex?: number;
  timestamp?: number;
}

export interface Drawing {
  id: string;
  type: DrawingType;
  points: DrawingPoint[];
  style: { color: string; lineWidth: number; lineType: 'solid' | 'dashed' | 'dotted'; text?: string; fontSize?: number };
  visible: boolean;
  locked: boolean;
}

export interface ChartWindowConfig {
  id: string;
  symbol: string;
  interval: string;
  style: ChartStyle;
  drawings: Drawing[];
}

export type ChartLayout = '1x1' | '1x2' | '2x1' | '2x2' | '1x3' | '3x1';

export type ExchangeName = 'Binance' | 'OKX' | 'HTX' | 'KuCoin' | 'Gate.io' | 'Bybit' | 'Coinbase' | 'Kraken' | 'Bitget';

export interface UserSettings {
  appearance: { theme: 'dark' | 'light' | 'system'; fontSize: number; lineThickness: number; upColor: string; downColor: string; showGrid: boolean };
  trading: { 
      exchangeName: ExchangeName; 
      exchangeApiKey: string; 
      exchangeApiSecret: string; 
      exchangePassphrase?: string; // Required for OKX, KuCoin, etc.
      realAccountBalanceOverride?: number; 
      simCapital: { BASIC: number; FINRL: number; BAYESIAN: number; MANUAL: number }; 
      activeTradingTeam: 'NONE' | 'BASIC' | 'FINRL' | 'BAYESIAN'; 
      defaultAmount: number; 
      orderType: string;
      // Futures Specific
      accountType: 'SPOT' | 'FUTURES';
      leverage: number; // 1-125
      // Strict Compliance Mode
      enableStrictCompliance: boolean;
      // LIVE TRADING
      enableRealTrading: boolean; // Master switch for live connection
      // PROXY SETTINGS
      puterProxyUrl: string; // URL of the Puter Cloud Proxy
  };
  notifications: { priceAlert: boolean; orderAlert: boolean; newsAlert: boolean; sound: boolean };
  ai: { provider: 'LOCAL' | 'CLOUD'; googleApiKey: string };
  // Agent Memory Configuration
  memory: {
      useCloudSync: boolean; 
      cloudEndpoint: string;
      cloudKey: string;
      localPath: string; 
  };
}

export const DEFAULT_SETTINGS: UserSettings = {
  appearance: { theme: 'dark', fontSize: 12, lineThickness: 1, upColor: '#f23645', downColor: '#089981', showGrid: true },
  trading: { 
      exchangeName: 'Binance', 
      exchangeApiKey: '', 
      exchangeApiSecret: '', 
      exchangePassphrase: '',
      simCapital: { BASIC: 100000, FINRL: 500000, BAYESIAN: 1000000, MANUAL: 200000 }, 
      activeTradingTeam: 'NONE', 
      defaultAmount: 100, 
      orderType: 'market',
      accountType: 'SPOT',
      leverage: 1,
      enableStrictCompliance: false,
      enableRealTrading: false,
      puterProxyUrl: '' // Default empty
  },
  notifications: { priceAlert: true, orderAlert: true, newsAlert: false, sound: true },
  ai: { provider: 'CLOUD', googleApiKey: '' },
  memory: {
      useCloudSync: false,
      cloudEndpoint: '',
      cloudKey: '',
      localPath: 'local_browser_storage'
  }
};

export interface SubIndicatorConfig {
  id: string;
  name: string;
  type: string;
  height: number;
  formula?: string;
}

export interface PriceAlert {
  id: string;
  symbol: string;
  type: 'ABOVE' | 'BELOW';
  value: number;
  active: boolean;
  createdAt: number;
}

export interface IndicatorConfig {
  id: string;
  name: string;
  category: 'Trend' | 'Momentum' | 'Volatility' | 'Volume';
  visible: boolean;
  color: string;
  thickness: number;
  params: Record<string, number>;
}

export interface AgentNode {
  id: string;
  name: string;
  status: 'Idle' | 'Working' | 'Thinking';
  currentTask: string;
  lastUpdate: string;
}

export interface AgentLog {
  id: string;
  timestamp: string;
  agent: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';
  message: string;
}

export interface RLMetrics {
  sharpeRatio: number;
  winRate: number;
  totalReward: number;
  trainingSteps: number;
  driftValue: number;
  mode: 'Train' | 'Trade';
}

export interface AgentTrade {
  symbol: string;
  action: 'BUY' | 'SELL';
  price: number;
  qty: number;
}

export interface BayesianAdvice {
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  rationale: string;
  timestamp: number;
}

export interface MultiAgentContext {
  agents: AgentNode[];
  metrics: RLMetrics;
}

export interface TradeMarker {
  date: string;
  type: 'BUY' | 'SELL';
  price: number;
  text?: string;
}

export interface QuantOrder {
  order_id: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  offset: 'OPEN' | 'CLOSE';
  limit_price: number;
  volume_original: number;
  volume_left: number;
  status: 'ALIVE' | 'FILLED' | 'CANCELLED';
  insert_date_time: number;
  last_msg: string;
}

export interface QuantPosition {
  symbol: string;
  volume_long: number;
  volume_short: number;
  volume_long_frozen: number;
  volume_short_frozen: number;
  avg_price_long: number;
  avg_price_short: number;
  last_price: number;
}

export interface QuantAccount {
  currency: string;
  balance: number;
  available: number;
  frozen: number;
  market_value: number;
  risk_ratio: number;
}

export interface BacktestResult {
  orders: QuantOrder[];
  equity_curve: { date: string; value: number }[];
  performance: { total_returns: number; max_drawdown: number; sharpe_ratio: number; win_rate: number };
  account: QuantAccount;
}

export type OrderStatus = 'ALIVE' | 'FILLED' | 'CANCELLED';
