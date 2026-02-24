
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Stock, CandleData, Portfolio, ViewMode, 
  ChartWindowConfig, ChartStyle, UserSettings, DEFAULT_SETTINGS, 
  SubIndicatorConfig, OrderBook, IndicatorConfig,
  AgentTrade, BayesianAdvice, ExternalSignal
} from './types';
import Sidebar from './components/Sidebar';
import ChartGrid from './components/ChartGrid';
import TopTickers from './components/TopTickers';
import PreferencesModal from './components/PreferencesModal';
import KeyInputModal from './components/KeyInputModal';
import IndicatorArea from './components/IndicatorArea';
import TradeConfirmModal from './components/TradeConfirmModal';
import IndicatorModal from './components/IndicatorModal';
import IndicatorLibraryModal from './components/IndicatorLibraryModal';
import StockScreener from './components/StockScreener';
import FinGPTAnalyst from './components/FinGPTAnalyst';
import SystemMonitor from './components/SystemMonitor';
import IntelligenceDashboard from './components/IntelligenceDashboard';
import ErrorBoundary from './components/ErrorBoundary';
import RightPanel from './components/RightPanel';
import StockList from './components/StockList';
import OrderBookPanel from './components/OrderBookPanel';
import ProTradeForm from './components/ProTradeForm';
import BayesianDecisionOfficer from './components/BayesianDecisionOfficer';
import EvolutionaryTradingSystem from './components/EvolutionaryTradingSystem';
import { ChevronRight, ChevronLeft, List, Sparkles, Bot, BrainCircuit, Gavel, Network, Activity, LineChart, Filter, Globe, ArrowLeftRight, LayoutDashboard, Users, Trophy } from 'lucide-react';

import { getTopCryptos, subscribeToCryptoTicker, getCryptoCandles, getOrderBook } from './services/cryptoService';
import { analyzeStockChart } from './services/geminiService';
import { complianceService } from './services/complianceService';
import { EVO_AGENTS_CONFIG } from './services/evolutionarySimulation';
import { ExchangeService } from './services/exchangeService';

export default function App() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [activeSymbol, setActiveSymbol] = useState<string>('');
  const [dataCache, setDataCache] = useState<Record<string, CandleData[]>>({});
  const [orderBook, setOrderBook] = useState<OrderBook | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.CHART);
  const [mainChartHeight, setMainChartHeight] = useState(window.innerHeight * 0.6);
  const [showRightPanel, setShowRightPanel] = useState(true);
  
  const [rightPanelMode, setRightPanelMode] = useState<'WATCHLIST' | 'ANALYSIS' | 'AGENT' | 'MULTI_AGENT' | 'DECISION_OFFICER' | 'EVO_TEAM' | 'TRADE'>('WATCHLIST');
  
  // Mobile Tab State
  const [mobileTab, setMobileTab] = useState<'CHART' | 'WATCHLIST' | 'TRADE' | 'SCREENER' | 'AGENTS'>('CHART');
  const [mobileAgentView, setMobileAgentView] = useState<'MENU' | 'ALPHA' | 'BETA' | 'GAMMA' | 'BAYESIAN'>('MENU');

  const [charts, setCharts] = useState<ChartWindowConfig[]>([{ id: 'main', symbol: '', interval: '1D', style: ChartStyle.CANDLE, drawings: [] }]);
  const [activeChartId, setActiveChartId] = useState('main');
  const [maximizedChartId, setMaximizedChartId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState('select');
  const [indicators, setIndicators] = useState<IndicatorConfig[]>([
    { id: 'MA5', name: 'MA5', category: 'Trend', visible: true, color: '#FF9800', thickness: 1, params: {} },
    { id: 'MA20', name: 'MA20', category: 'Trend', visible: true, color: '#2196F3', thickness: 1, params: {} }
  ]);
  // Clean start: No default sub-indicators
  const [subIndicators, setSubIndicators] = useState<SubIndicatorConfig[]>([]);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);

  // Settings Persistence
  useEffect(() => {
    const saved = localStorage.getItem('alphaflow_user_settings');
    if (saved) {
      try {
        setSettings(prev => ({ ...prev, ...JSON.parse(saved) }));
      } catch(e) { console.error("Failed to load settings", e); }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('alphaflow_user_settings', JSON.stringify(settings));
  }, [settings]);

  const createInitialPortfolio = (capital: number): Portfolio => ({ cash: capital, holdings: {}, initialCapital: capital, totalValue: capital, history: [] });
  const [simPortfolios, setSimPortfolios] = useState<Record<string, Portfolio>>({
      'BASIC': createInitialPortfolio(DEFAULT_SETTINGS.trading.simCapital.BASIC),
      'FINRL': createInitialPortfolio(DEFAULT_SETTINGS.trading.simCapital.FINRL),
      'BAYESIAN': createInitialPortfolio(DEFAULT_SETTINGS.trading.simCapital.BAYESIAN),
      'MANUAL': createInitialPortfolio(DEFAULT_SETTINGS.trading.simCapital.MANUAL),
  });
  const [realPortfolio, setRealPortfolio] = useState<Portfolio>({ cash: 0, holdings: {}, initialCapital: 0, totalValue: 0, history: [] });

  // Evolutionary Teams State
  const [isEvoTeamAlphaRunning, setIsEvoTeamAlphaRunning] = useState(false); 
  const [isEvoTeamBetaRunning, setIsEvoTeamBetaRunning] = useState(false);   
  const [isEvoTeamGammaRunning, setIsEvoTeamGammaRunning] = useState(false); 

  const [showMonitor, setShowMonitor] = useState(false);
  
  const [bayesianAdvice, setBayesianAdvice] = useState<BayesianAdvice | null>(null);
  const [externalSignals, setExternalSignals] = useState<ExternalSignal[]>([]);

  const [showPreferences, setShowPreferences] = useState(false);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [showMainIndicators, setShowMainIndicators] = useState(false); 
  const [showIndicatorLibrary, setShowIndicatorLibrary] = useState(false); // Sub-indicator Library Modal

  const [tradeConfirm, setTradeConfirm] = useState<{ isOpen: boolean, type: 'BUY'|'SELL', qty: number } | null>(null);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<string | null>(null);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);

  const gammaAgents = useMemo(() => EVO_AGENTS_CONFIG.map(a => ({
      ...a,
      name: `[高阶] ${a.name}`,
      color: a.color.replace('blue', 'indigo').replace('emerald', 'teal').replace('yellow', 'amber')
  })), []);

  const holdingTimesRef = useRef<Record<string, number>>({}); 
  const stocksRef = useRef(stocks);
  const settingsRef = useRef(settings);

  // Computed active chart data
  const activeChart = charts.find(c => c.id === activeChartId) || charts[0];
  const activeChartData = useMemo(() => {
      if (!activeChart) return [];
      const key = `${activeChart.symbol}_${activeChart.interval}`;
      return dataCache[key] || [];
  }, [dataCache, activeChart]);

  useEffect(() => {
      stocksRef.current = stocks;
      settingsRef.current = settings;
  }, [stocks, settings]);

  const handleUnifiedTrade = (trade: AgentTrade, teamId: 'BASIC' | 'FINRL' | 'BAYESIAN' | 'MANUAL') => {
      const currentSettings = settingsRef.current;
      const targetType = currentSettings.trading.activeTradingTeam === teamId && currentSettings.trading.enableRealTrading ? 'REAL' : 'SIM';
      
      const updatePortfolio = (updater: (prev: Portfolio) => Portfolio) => {
          if (targetType === 'REAL') setRealPortfolio(updater);
          else setSimPortfolios(prev => ({ ...prev, [teamId]: updater(prev[teamId]) }));
      };
      
      updatePortfolio(prev => {
          const next = { ...prev, holdings: { ...prev.holdings } };
          const s = stocksRef.current.find(st => st.symbol === trade.symbol);
          const executionPrice = s?.price || trade.price;
          const totalCost = executionPrice * trade.qty;
          const currentQty = next.holdings[trade.symbol]?.qty || 0;

          if (trade.action === 'BUY') {
              if (next.cash >= totalCost) {
                  next.cash -= totalCost;
                  const existing = next.holdings[trade.symbol] || { qty: 0, avgCost: 0 };
                  const newQty = existing.qty + trade.qty;
                  next.holdings[trade.symbol] = { qty: newQty, avgCost: ((existing.qty * existing.avgCost) + totalCost) / newQty };
              }
          } else {
              if (currentQty >= trade.qty) {
                  const sellQty = trade.qty;
                  next.cash += sellQty * executionPrice;
                  const newQty = currentQty - sellQty;
                  if (newQty === 0) delete next.holdings[trade.symbol];
                  else next.holdings[trade.symbol].qty = newQty;
              }
          }
          next.totalValue = next.cash + Object.values(next.holdings).reduce((sum, h) => sum + h.qty * (stocksRef.current.find(st => true)?.price || 0), 0);
          return next;
      });
  };

  // --- DATA INITIALIZATION ---
  useEffect(() => { 
      const init = async () => { 
          const cryptos = await getTopCryptos(); 
          setStocks(cryptos); 
          if (cryptos.length > 0) { 
              setActiveSymbol(cryptos[0].symbol); 
              setCharts(prev => prev.map(c => ({ ...c, symbol: cryptos[0].symbol }))); 
          } 
      }; 
      init(); 
  }, []);

  // --- WEBSOCKET ---
  useEffect(() => {
      if (stocks.length === 0) return;
      const unsubCrypto = subscribeToCryptoTicker(stocks, (updated) => {
          setStocks(prev => {
              const map = new Map(prev.map(s => [s.symbol, s]));
              updated.forEach(u => map.set(u.symbol, u));
              return Array.from(map.values());
          });
      });
      return () => unsubCrypto();
  }, [stocks.length]);

  // --- LOAD CANDLES ---
  useEffect(() => { 
      const loadAllChartsData = async () => {
          const newCache: Record<string, CandleData[]> = {};
          let hasNewData = false;

          for (const chart of charts) {
              if (!chart.symbol) continue;
              const cacheKey = `${chart.symbol}_${chart.interval}`;
              if (!dataCache[cacheKey]) {
                  const candles = await getCryptoCandles(chart.symbol, chart.interval);
                  newCache[cacheKey] = candles;
                  hasNewData = true;
              }
          }

          if (hasNewData) {
              setDataCache(prev => ({ ...prev, ...newCache }));
          }
          
          if (activeSymbol) {
              const book = await getOrderBook(activeSymbol);
              setOrderBook(book);
          }
      };
      loadAllChartsData();
  }, [charts, activeSymbol, stocks.length]);

  const toggleRightPanel = (mode: typeof rightPanelMode) => { 
      if (showRightPanel && rightPanelMode === mode) {
          setShowRightPanel(false); 
      } else { 
          setRightPanelMode(mode); 
          setShowRightPanel(true); 
      } 
  };

  const getLiveStatus = (teamId: string) => {
      const isConnected = settings.trading.enableRealTrading && settings.trading.activeTradingTeam === teamId;
      return { isConnected, label: isConnected ? 'REAL' : 'SIM' };
  };

  const handleAddSubIndicator = (type: string, name: string, formula?: string) => {
      setSubIndicators(prev => [...prev, {
          id: `${type}_${Date.now()}`,
          name,
          type,
          height: 160,
          formula
      }]);
      setShowIndicatorLibrary(false);
  };

  return (
    <div className="flex h-screen w-screen bg-[#000] text-[#d1d4dc] overflow-hidden font-sans select-none flex-col md:flex-row">
       
       {/* Desktop Top Ticker */}
       <div className="hidden md:flex flex-col min-w-0 relative flex-1">
          <ErrorBoundary scope="TopTickers">
            <TopTickers 
                stocks={stocks} 
                orderBook={orderBook} 
                activeSymbol={activeSymbol} 
                onOpenKeySelector={() => setShowKeyInput(true)}
            />
          </ErrorBoundary>
          
          <div className="flex-1 flex min-h-0 relative">
              <Sidebar currentView={viewMode} onViewChange={setViewMode} onOpenPreferences={() => setShowPreferences(true)} onOpenMonitor={() => setShowMonitor(true)} activeTool={activeTool} onToolChange={setActiveTool} />
              
              <div className="flex-1 flex flex-col min-w-0 bg-[#0b0e14] relative">
                 <ErrorBoundary scope="MainWorkspace">
                    {viewMode === ViewMode.SCREENER ? <StockScreener stocks={stocks} onSelectStock={(s) => setActiveSymbol(s.symbol)} /> : 
                     viewMode === ViewMode.FINGPT ? <FinGPTAnalyst /> : 
                     viewMode === ViewMode.INTEL ? <IntelligenceDashboard stocks={stocks} onOpenKeySelector={() => setShowKeyInput(true)} /> : (
                      <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#0b0e14] relative flex flex-col">
                        <div className="w-full shrink-0 border-b border-[#1e222d] bg-[#0b0e14]" style={{ height: mainChartHeight }}>
                            <ChartGrid 
                                layout={'1x1'} 
                                charts={charts} 
                                activeChartId={activeChartId} 
                                maximizedChartId={maximizedChartId} 
                                chartDataMap={dataCache} 
                                activeTool={activeTool} 
                                indicators={indicators.filter(i => i.visible).map(i => i.id)} 
                                onActivateChart={setActiveChartId} 
                                onToggleMaximize={id => setMaximizedChartId(maximizedChartId === id ? null : id)} 
                                onDeleteChart={() => {}} 
                                onUpdateChartConfig={(id, cfg) => setCharts(prev => prev.map(c => c.id === id ? { ...c, ...cfg } : c))} 
                                showGrid={settings.appearance.showGrid} 
                                customUpColor={settings.appearance.upColor} 
                                customDownColor={settings.appearance.downColor} 
                                onOpenIndicatorSettings={() => setShowMainIndicators(true)} 
                            />
                        </div>
                        <div 
                            className="h-3 w-full bg-[#0b0e14] border-b border-[#1e222d] cursor-ns-resize flex items-center justify-center group hover:bg-[#131722] active:bg-blue-500/10 z-20 shrink-0 touch-none" 
                            style={{ touchAction: 'none' }}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                const startY = e.clientY;
                                const startH = mainChartHeight;
                                const move = (me: MouseEvent) => setMainChartHeight(Math.min(Math.max(startH + (me.clientY - startY), 150), window.innerHeight * 0.85));
                                const up = () => { 
                                    window.removeEventListener('mousemove', move); 
                                    window.removeEventListener('mouseup', up); 
                                    window.dispatchEvent(new Event('resize-all-charts')); 
                                }; 
                                window.addEventListener('mousemove', move); 
                                window.addEventListener('mouseup', up);
                            }}
                        > 
                            <div className="w-12 h-1.5 bg-gray-800 rounded-full group-hover:bg-blue-500 transition-colors" /> 
                        </div>
                        <div className="w-full shrink-0 bg-[#0b0e14]">
                            <IndicatorArea 
                                indicators={subIndicators} 
                                data={activeChartData} 
                                onUpdateIndicators={setSubIndicators} 
                                onOpenLibrary={() => setShowIndicatorLibrary(true)} 
                            />
                        </div>
                      </div>
                 )}
                 </ErrorBoundary>
              </div>

              {/* Desktop Right Panel */}
              <div className="w-[44px] bg-[#131722] border-l border-gray-800 flex flex-col items-center py-2 gap-1 z-30 shrink-0 relative">
                  <button onClick={() => toggleRightPanel('TRADE')} className={`p-2.5 rounded-lg mb-1 transition-all ${rightPanelMode === 'TRADE' && showRightPanel ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/50' : 'text-gray-500 hover:text-white hover:bg-gray-800'}`} title="交易终端"><Activity className="w-5 h-5" /></button>
                  <button onClick={() => toggleRightPanel('WATCHLIST')} className={`p-2.5 rounded-lg mb-1 transition-all ${rightPanelMode === 'WATCHLIST' && showRightPanel ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-gray-500 hover:text-white hover:bg-gray-800'}`} title="自选观察"><List className="w-5 h-5" /></button>
                  <button onClick={() => toggleRightPanel('ANALYSIS')} className={`p-2.5 rounded-lg mb-1 transition-all ${rightPanelMode === 'ANALYSIS' && showRightPanel ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/50' : 'text-gray-500 hover:text-white hover:bg-gray-800'}`} title="AI 分析"><Sparkles className="w-5 h-5" /></button>
                  <div className="h-px w-6 bg-gray-800 my-1"></div>
                  <button onClick={() => toggleRightPanel('AGENT')} className={`p-2.5 rounded-lg mb-1 transition-all ${rightPanelMode === 'AGENT' && showRightPanel ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-900/50' : 'text-gray-500 hover:text-white hover:bg-gray-800'}`} title="基础智能体 (Alpha)"><Network className="w-5 h-5" /></button>
                  <button onClick={() => toggleRightPanel('MULTI_AGENT')} className={`p-2.5 rounded-lg mb-1 transition-all ${rightPanelMode === 'MULTI_AGENT' && showRightPanel ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/50' : 'text-gray-500 hover:text-white hover:bg-gray-800'}`} title="高级智能体集群 (Gamma)"><BrainCircuit className="w-5 h-5" /></button>
                  <button onClick={() => toggleRightPanel('DECISION_OFFICER')} className={`p-2.5 rounded-lg mb-1 transition-all ${rightPanelMode === 'DECISION_OFFICER' && showRightPanel ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/50' : 'text-gray-500 hover:text-white hover:bg-gray-800'}`} title="贝叶斯决策官"><Gavel className="w-5 h-5" /></button>
                  <button onClick={() => toggleRightPanel('EVO_TEAM')} className={`p-2.5 rounded-lg mb-1 transition-all ${rightPanelMode === 'EVO_TEAM' && showRightPanel ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-gray-500 hover:text-white hover:bg-gray-800'}`} title="进化团队 (Beta)"><Bot className="w-5 h-5" /></button>
                  
                  <div className="flex-1" />
                  <button onClick={() => setShowRightPanel(!showRightPanel)} className="p-2 text-gray-600 hover:text-white transition-colors">{showRightPanel ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}</button>
              </div>
              
              <div 
                className={`
                    border-l border-gray-800 flex flex-col bg-[#131722] shrink-0 z-[60] shadow-2xl transition-all duration-300 ease-in-out
                    absolute top-0 bottom-0 right-0 max-w-none shadow-none z-auto
                    ${showRightPanel ? 'w-[320px] opacity-100' : 'w-0 opacity-0 pointer-events-none'}
                `}
              >
                  <RightPanel 
                      mode={rightPanelMode}
                      stocks={stocks}
                      activeSymbol={activeSymbol}
                      activeChartData={activeChartData}
                      orderBook={orderBook}
                      aiState={{
                          isAnalyzing: isAiAnalyzing,
                          result: aiAnalysisResult,
                          analyzeAction: async () => { if (!activeSymbol) return; setIsAiAnalyzing(true); setAiAnalysisResult(await analyzeStockChart(stocks.find(s => s.symbol === activeSymbol)!, activeChartData)); setIsAiAnalyzing(false); }
                      }}
                      evoState={{
                          alpha: isEvoTeamAlphaRunning,
                          beta: isEvoTeamBetaRunning,
                          gamma: isEvoTeamGammaRunning,
                          setAlpha: setIsEvoTeamAlphaRunning,
                          setBeta: setIsEvoTeamBetaRunning,
                          setGamma: setIsEvoTeamGammaRunning,
                          gammaAgents
                      }}
                      trading={{
                          portfolio: settings.trading.activeTradingTeam === 'BAYESIAN' ? realPortfolio : simPortfolios['BAYESIAN'],
                          realPortfolio,
                          settings,
                          onTradeConfirm: (t, q) => setTradeConfirm({ isOpen: true, type: t, qty: q }),
                          onUnifiedTrade: handleUnifiedTrade,
                          bayesianAdvice,
                          setBayesianAdvice: setBayesianAdvice,
                          externalSignals
                      }}
                      actions={{
                          setActiveSymbol,
                          setStocks,
                          openKeyInput: () => setShowKeyInput(true)
                      }}
                  />
              </div>
          </div>
       </div>

       {/* Mobile Layout */}
       <div className="md:hidden flex flex-col w-full h-full pb-safe">
          {/* Mobile Top Bar */}
          {mobileAgentView === 'MENU' && (
              <div className="h-14 bg-[#131722] flex items-center px-4 justify-between border-b border-gray-800 shrink-0">
                 <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-black text-white">AF</div>
                    <div>
                        <div className="text-sm font-black text-white">{activeSymbol.replace('USDT', '')}</div>
                        <div className="text-[10px] text-gray-400">
                            {stocks.find(s => s.symbol === activeSymbol)?.price.toFixed(2)} 
                            <span className={`ml-1 ${stocks.find(s => s.symbol === activeSymbol)?.changePercent! >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {stocks.find(s => s.symbol === activeSymbol)?.changePercent.toFixed(2)}%
                            </span>
                        </div>
                    </div>
                 </div>
                 <div className="flex items-center gap-3">
                    <button onClick={() => setShowMonitor(true)} title="V86 Kernel">
                        <Activity className="w-5 h-5 text-indigo-400" />
                    </button>
                    <button onClick={() => setShowPreferences(true)}>
                        <LayoutDashboard className="w-5 h-5 text-gray-400" />
                    </button>
                 </div>
              </div>
          )}

          {/* Mobile Content Area */}
          <div className="flex-1 overflow-hidden relative">
             <ErrorBoundary scope={`Mobile-${mobileTab}`}>
                 {mobileTab === 'CHART' && (
                     <div className="flex flex-col h-full">
                        <ChartGrid 
                            layout={'1x1'} 
                            charts={charts} 
                            activeChartId={activeChartId} 
                            maximizedChartId={null}
                            chartDataMap={dataCache} 
                            activeTool={activeTool} 
                            indicators={indicators.filter(i => i.visible).map(i => i.id)} 
                            onActivateChart={setActiveChartId} 
                            onToggleMaximize={() => {}} 
                            onDeleteChart={() => {}} 
                            onUpdateChartConfig={(id, cfg) => setCharts(prev => prev.map(c => c.id === id ? { ...c, ...cfg } : c))} 
                            showGrid={settings.appearance.showGrid} 
                            customUpColor={settings.appearance.upColor} 
                            customDownColor={settings.appearance.downColor} 
                            onOpenIndicatorSettings={() => setShowMainIndicators(true)} 
                        />
                        <div className="w-full shrink-0 bg-[#0b0e14]">
                            <IndicatorArea 
                                indicators={subIndicators} 
                                data={activeChartData} 
                                onUpdateIndicators={setSubIndicators} 
                                onOpenLibrary={() => setShowIndicatorLibrary(true)} 
                            />
                        </div>
                     </div>
                 )}
                 {mobileTab === 'WATCHLIST' && (
                     <StockList 
                        stocks={stocks} 
                        selectedStock={stocks.find(s => s.symbol === activeSymbol) || null} 
                        onSelect={(s) => { setActiveSymbol(s.symbol); setMobileTab('CHART'); }} 
                        onTrade={(s, t) => { setActiveSymbol(s.symbol); setMobileTab('TRADE'); }} 
                     />
                 )}
                 {mobileTab === 'TRADE' && (
                     <div className="flex flex-col h-full bg-[#0b0e14]">
                        <div className="flex-1 border-b border-gray-800 min-h-0">
                            <OrderBookPanel 
                                data={orderBook} 
                                currentPrice={stocks.find(s => s.symbol === activeSymbol)?.price || 0}
                                onPriceClick={() => {}} 
                            />
                        </div>
                        <div className="shrink-0 p-2 pb-0">
                            <ProTradeForm 
                                stock={stocks.find(s => s.symbol === activeSymbol) || null}
                                currentPrice={stocks.find(s => s.symbol === activeSymbol)?.price || 0}
                                settings={settings}
                                onTrade={(type, qty, price) => handleUnifiedTrade({ 
                                    symbol: activeSymbol, 
                                    action: type, 
                                    qty, 
                                    price: price || stocks.find(s => s.symbol === activeSymbol)?.price || 0 
                                }, 'MANUAL')}
                            />
                        </div>
                     </div>
                 )}
                 {mobileTab === 'AGENTS' && (
                     <div className="flex flex-col h-full bg-[#0b0e14]">
                        {mobileAgentView === 'MENU' && (
                            <div className="flex-1 p-4 overflow-y-auto space-y-4">
                               <div className="text-center py-6">
                                   <div className="w-16 h-16 bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-500/30">
                                       <Bot className="w-8 h-8 text-blue-400" />
                                   </div>
                                   <h2 className="text-xl font-black text-white">多智能体指挥中心</h2>
                                   <p className="text-xs text-gray-500">Multi-Agent Command Center</p>
                               </div>
                               
                               {/* Team Cards */}
                               <button onClick={() => setMobileAgentView('ALPHA')} className="w-full bg-[#1e222d] border border-gray-700 p-4 rounded-xl flex items-center gap-4 hover:border-blue-500 transition-all">
                                   <div className="p-3 bg-blue-900/20 rounded-lg text-blue-400"><Network className="w-6 h-6"/></div>
                                   <div className="text-left flex-1">
                                       <h3 className="font-bold text-white text-sm">Alpha Squad (基础)</h3>
                                       <p className="text-xs text-gray-500">均线/趋势策略进化</p>
                                   </div>
                                   <div className={`w-2 h-2 rounded-full ${isEvoTeamAlphaRunning ? 'bg-emerald-500 animate-pulse' : 'bg-gray-700'}`} />
                               </button>

                               <button onClick={() => setMobileAgentView('BETA')} className="w-full bg-[#1e222d] border border-gray-700 p-4 rounded-xl flex items-center gap-4 hover:border-purple-500 transition-all">
                                   <div className="p-3 bg-purple-900/20 rounded-lg text-purple-400"><Bot className="w-6 h-6"/></div>
                                   <div className="text-left flex-1">
                                       <h3 className="font-bold text-white text-sm">Beta Squad (进化)</h3>
                                       <p className="text-xs text-gray-500">遗传算法策略迭代</p>
                                   </div>
                                   <div className={`w-2 h-2 rounded-full ${isEvoTeamBetaRunning ? 'bg-emerald-500 animate-pulse' : 'bg-gray-700'}`} />
                               </button>

                               <button onClick={() => setMobileAgentView('GAMMA')} className="w-full bg-[#1e222d] border border-gray-700 p-4 rounded-xl flex items-center gap-4 hover:border-indigo-500 transition-all">
                                   <div className="p-3 bg-indigo-900/20 rounded-lg text-indigo-400"><BrainCircuit className="w-6 h-6"/></div>
                                   <div className="text-left flex-1">
                                       <h3 className="font-bold text-white text-sm">Gamma Squad (高阶)</h3>
                                       <p className="text-xs text-gray-500">深度强化学习集群</p>
                                   </div>
                                   <div className={`w-2 h-2 rounded-full ${isEvoTeamGammaRunning ? 'bg-emerald-500 animate-pulse' : 'bg-gray-700'}`} />
                               </button>

                               <button onClick={() => setMobileAgentView('BAYESIAN')} className="w-full bg-[#1e222d] border border-gray-700 p-4 rounded-xl flex items-center gap-4 hover:border-emerald-500 transition-all">
                                   <div className="p-3 bg-emerald-900/20 rounded-lg text-emerald-400"><Gavel className="w-6 h-6"/></div>
                                   <div className="text-left flex-1">
                                       <h3 className="font-bold text-white text-sm">Bayesian Officer</h3>
                                       <p className="text-xs text-gray-500">贝叶斯概率决策官</p>
                                   </div>
                                   <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                               </button>
                            </div>
                        )}

                        {mobileAgentView !== 'MENU' && (
                            <div className="flex-1 flex flex-col h-full">
                                <div className="h-12 bg-[#1e222d] border-b border-gray-800 flex items-center px-4 gap-3 shrink-0">
                                    <button onClick={() => setMobileAgentView('MENU')} className="p-1 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white">
                                        <ChevronLeft className="w-5 h-5"/>
                                    </button>
                                    <span className="font-bold text-sm text-white">
                                        {mobileAgentView === 'ALPHA' ? 'Alpha Squad' : mobileAgentView === 'BETA' ? 'Beta Squad' : mobileAgentView === 'GAMMA' ? 'Gamma Squad' : 'Bayesian Officer'}
                                    </span>
                                </div>
                                <div className="flex-1 overflow-hidden relative">
                                    <ErrorBoundary scope={`MobileAgent-${mobileAgentView}`}>
                                        {mobileAgentView === 'ALPHA' && (
                                            <EvolutionaryTradingSystem 
                                                isActive={isEvoTeamAlphaRunning} 
                                                onToggle={() => setIsEvoTeamAlphaRunning(!isEvoTeamAlphaRunning)} 
                                                realPortfolio={realPortfolio} 
                                                memorySettings={settings.memory}
                                                title="Alpha Squad"
                                                namespace="EVO_ALPHA"
                                                liveStatus={getLiveStatus('BASIC')}
                                            />
                                        )}
                                        {mobileAgentView === 'BETA' && (
                                            <EvolutionaryTradingSystem 
                                                isActive={isEvoTeamBetaRunning} 
                                                onToggle={() => setIsEvoTeamBetaRunning(!isEvoTeamBetaRunning)} 
                                                realPortfolio={realPortfolio} 
                                                memorySettings={settings.memory}
                                                title="Beta Squad"
                                                namespace="EVO_BETA"
                                                liveStatus={getLiveStatus('MANUAL')} 
                                            />
                                        )}
                                        {mobileAgentView === 'GAMMA' && (
                                            <EvolutionaryTradingSystem 
                                                isActive={isEvoTeamGammaRunning} 
                                                onToggle={() => setIsEvoTeamGammaRunning(!isEvoTeamGammaRunning)} 
                                                realPortfolio={realPortfolio} 
                                                memorySettings={settings.memory}
                                                title="Gamma Squad"
                                                namespace="EVO_GAMMA"
                                                initialAgents={gammaAgents}
                                                liveStatus={getLiveStatus('FINRL')}
                                            />
                                        )}
                                        {mobileAgentView === 'BAYESIAN' && (
                                            <BayesianDecisionOfficer 
                                                stock={stocks.find(s => s.symbol === activeSymbol) || null} 
                                                data={activeChartData} 
                                                liveModeAllowed={settings.trading.activeTradingTeam === 'BAYESIAN'} 
                                                portfolio={settings.trading.activeTradingTeam === 'BAYESIAN' ? realPortfolio : undefined} 
                                                onBroadcastAdvice={setBayesianAdvice} 
                                                externalSignals={externalSignals} 
                                                onOpenKeySelector={() => setShowKeyInput(true)} 
                                                onTrade={(type, isAuto, qty) => { 
                                                    if (isAuto && settings.trading.activeTradingTeam !== 'BAYESIAN') return; 
                                                    const effectiveQty = qty || 100; 
                                                    if (isAuto) handleUnifiedTrade({ symbol: activeSymbol, action: type, price: stocks.find(s => s.symbol === activeSymbol)?.price || 0, qty: effectiveQty }, 'BAYESIAN'); 
                                                    else setTradeConfirm({ isOpen: true, type, qty: effectiveQty }); 
                                                }} 
                                                liveStatus={getLiveStatus('BAYESIAN')} 
                                            />
                                        )}
                                    </ErrorBoundary>
                                </div>
                            </div>
                        )}
                     </div>
                 )}
                 {mobileTab === 'SCREENER' && (
                     <StockScreener 
                        stocks={stocks} 
                        onSelectStock={(s) => { setActiveSymbol(s.symbol); setMobileTab('CHART'); }} 
                     />
                 )}
             </ErrorBoundary>
          </div>

          {/* Mobile Bottom Nav */}
          <div className="h-16 bg-[#131722] border-t border-gray-800 flex items-center justify-around shrink-0 pb-1">
              {[
                  { id: 'WATCHLIST', icon: List, label: '自选' },
                  { id: 'CHART', icon: LineChart, label: '行情' },
                  { id: 'TRADE', icon: ArrowLeftRight, label: '交易' },
                  { id: 'AGENTS', icon: Users, label: '团队' }, // New Agent Hub
                  { id: 'SCREENER', icon: Filter, label: '选币' },
              ].map(item => (
                  <button 
                    key={item.id}
                    onClick={() => {
                        setMobileTab(item.id as any);
                        if (item.id === 'AGENTS') setMobileAgentView('MENU'); // Reset agent view
                    }}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${mobileTab === item.id ? 'text-blue-500 bg-blue-500/10' : 'text-gray-500'}`}
                  >
                      <item.icon className={`w-5 h-5 ${mobileTab === item.id ? 'fill-current' : ''}`} />
                      <span className="text-[10px] font-bold">{item.label}</span>
                  </button>
              ))}
          </div>
       </div>

       {/* Modals */}
       <KeyInputModal isOpen={showKeyInput} onClose={() => setShowKeyInput(false)} />
       <PreferencesModal isOpen={showPreferences} onClose={() => setShowPreferences(false)} onSave={(s) => { setSettings(s); setShowPreferences(false); }} initialSettings={settings} />
       <SystemMonitor isOpen={showMonitor} onClose={() => setShowMonitor(false)} portfolios={{real: realPortfolio, sim: simPortfolios}} />
       
       <TradeConfirmModal isOpen={!!tradeConfirm} onClose={() => setTradeConfirm(null)} onConfirm={(d) => { handleUnifiedTrade({ symbol: d.symbol, action: d.type || tradeConfirm?.type, price: d.price, qty: d.qty }, 'MANUAL'); setTradeConfirm(null); }} stock={stocks.find(s => s.symbol === activeSymbol) || null} type={tradeConfirm?.type || 'BUY'} defaultQty={tradeConfirm?.qty || 100} />
       <IndicatorModal 
          isOpen={showMainIndicators} 
          onClose={() => setShowMainIndicators(false)}
          activeIndicators={indicators}
          onToggle={(id) => {
              const exists = indicators.find(i => i.id === id);
              if (exists) {
                  setIndicators(prev => prev.map(i => i.id === id ? {...i, visible: !i.visible} : i));
              } else {
                  const newInd: IndicatorConfig = { id, name: id, category: 'Trend', visible: true, color: '#FFFFFF', thickness: 1, params: {} };
                  setIndicators(prev => [...prev, newInd]);
              }
          }}
          onUpdate={(cfg) => setIndicators(prev => prev.map(i => i.id === cfg.id ? cfg : i))}
          onRemove={(id) => setIndicators(prev => prev.filter(i => i.id !== id))}
          recentIndicators={['MA5', 'MA10', 'MA20', 'BOLL', 'SAR', 'EMA20']}
       />
       <IndicatorLibraryModal 
          isOpen={showIndicatorLibrary}
          onClose={() => setShowIndicatorLibrary(false)}
          onAddIndicator={handleAddSubIndicator}
          activeIndicators={subIndicators}
          onRemoveIndicator={(id) => setSubIndicators(prev => prev.filter(i => i.id !== id))}
       />
    </div>
  );
}