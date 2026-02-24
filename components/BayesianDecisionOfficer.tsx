
// ... imports unchanged
import React, { useState, useEffect, useRef } from 'react';
import { 
    BrainCircuit, Activity, ShieldCheck, RefreshCw, Layers, 
    Zap, Globe, MessageCircle, Eye, Terminal, Wifi, Power, Cpu, Play, Key, Lock, Wallet, ArrowRight, PieChart, Coins, Radio,
    Database, Gauge, Clock, Users, Scale, History, BarChart3, TrendingUp, Search, Cloud, BookOpen, GitBranch, Sparkles, Microscope,
    Link, Unlink
} from 'lucide-react';
import { Stock, CandleData, BayesianAnalysisResult, BayesianInputNode, Portfolio, BayesianAdvice, TeamContext, ExternalSignal } from '../types';
import { runBayesianTradingAgent, isAuthError } from '../services/geminiService';
import { calculateRSI } from '../services/indicatorService';
import { MemoryService } from '../services/memoryService';

// ... interface unchanged ...
interface BayesianDecisionOfficerProps {
  stock: Stock | null;
  data: CandleData[];
  onTrade?: (action: 'BUY' | 'SELL', isAuto?: boolean, qty?: number) => void;
  liveModeAllowed?: boolean;
  portfolio?: Portfolio;
  onBroadcastAdvice?: (advice: BayesianAdvice) => void;
  onOpenKeySelector?: () => void;
  externalSignals?: ExternalSignal[];
  liveStatus?: {
      isConnected: boolean;
      label: string;
  };
}

// ... internal types & helper components unchanged (BayesianNode, EvolutionEvent, calculateVolatility, BayesianAgentCard, EvolutionPanel, ExecutionTrader) ...
// ... (Assuming helper components logic remains identical, omitting for brevity in XML unless changed. Since I need to output full file or replacement, I will include full content but modifying the specific log line.)

// --- Internal Types for Visualization ---
interface BayesianNode {
    id: string;
    name: string;
    role: string;
    probability: number; // 0-1
    originalProb: number; // For drift calculation
    status: 'Idle' | 'Analyzing' | 'ConfidenceHigh' | 'ConfidenceLow';
    color: string;
    icon: any;
}

interface EvolutionEvent {
    id: string;
    timestamp: number;
    source: string; // e.g., "arXiv", "Bloomberg", "OnChain"
    topic: string;
    impact: number; // -0.1 to 0.1 (Probability Drift)
    affectedNodeId: string;
}

// --- Helper Components ---

const calculateVolatility = (data: CandleData[]): 'Low' | 'Medium' | 'High' => {
    if (data.length < 20) return 'Low';
    let sumChange = 0;
    const period = Math.min(data.length, 20);
    for (let i = data.length - period; i < data.length; i++) {
        if (i === 0) continue;
        const prev = data[i-1].close;
        const curr = data[i].close;
        sumChange += Math.abs((curr - prev) / prev);
    }
    const avgChange = sumChange / period;
    if (avgChange > 0.05) return 'High';
    if (avgChange > 0.02) return 'Medium';
    return 'Low';
};

const BayesianAgentCard: React.FC<{ node: BayesianNode }> = ({ node }) => {
    // Determine color intensity based on probability
    let borderColor = 'border-gray-700';
    let bgColor = 'bg-[#1e222d]';
    let textColor = 'text-gray-400';
    
    if (node.probability >= 0.7) {
        bgColor = `bg-${node.color.split('-')[1]}-900/20`;
        borderColor = `border-${node.color.split('-')[1]}-500/50`;
        textColor = node.color;
    } else if (node.probability <= 0.3) {
        bgColor = 'bg-rose-900/10';
        borderColor = 'border-rose-500/20';
        textColor = 'text-rose-400';
    }

    const drift = node.probability - node.originalProb;
    const hasDrift = Math.abs(drift) > 0.001;

    return (
        <div className={`p-3 rounded-lg border flex flex-col gap-2 transition-all duration-500 ${bgColor} ${borderColor} ${node.status === 'Analyzing' ? 'animate-pulse' : ''} hover:scale-[1.02] relative overflow-hidden`}>
            {/* Drift Indicator */}
            {hasDrift && (
                <div className={`absolute top-0 right-0 p-1 text-[8px] font-mono font-bold ${drift > 0 ? 'text-emerald-400 bg-emerald-900/20' : 'text-rose-400 bg-rose-900/20'}`}>
                    {drift > 0 ? '+' : ''}{(drift * 100).toFixed(1)}%
                </div>
            )}

            <div className="flex justify-between items-center">
                <div className={`text-[9px] font-black uppercase tracking-widest ${textColor} flex items-center gap-1.5`}>
                    <node.icon className="w-3 h-3" />
                    {node.name}
                </div>
                <div className="flex items-center gap-1">
                    {node.status === 'Analyzing' && (
                        <div className={`w-1.5 h-1.5 rounded-full animate-ping ${textColor.replace('text-', 'bg-')}`}></div>
                    )}
                    <span className="text-[10px] font-mono font-bold text-white">{(node.probability * 100).toFixed(0)}%</span>
                </div>
            </div>
            
            <div className="flex flex-col gap-1">
                <div className="text-[8px] text-gray-500 font-mono truncate">{node.role}</div>
                {/* Visual Bar */}
                <div className="w-full bg-gray-800 h-1 rounded-full overflow-hidden">
                    <div 
                        className={`h-full transition-all duration-700 ${textColor.replace('text-', 'bg-')}`} 
                        style={{ width: `${node.probability * 100}%` }}
                    />
                </div>
            </div>
        </div>
    );
};

const EvolutionPanel = ({ events, epoch, learningRate }: { events: EvolutionEvent[], epoch: number, learningRate: number }) => {
    return (
        <div className="bg-[#1e222d] border border-gray-700 rounded-xl p-3 mb-4 animate-in slide-in-from-top-2">
            <div className="flex justify-between items-center mb-3 border-b border-gray-700/50 pb-2">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-indigo-500/20 rounded text-indigo-400">
                        <Microscope className="w-3.5 h-3.5 animate-pulse" />
                    </div>
                    <div>
                        <h3 className="text-[10px] font-black uppercase text-indigo-300 tracking-widest">全网认知进化 (Cognitive Evolution)</h3>
                        <div className="text-[8px] text-gray-500 flex items-center gap-2">
                            <span>Epoch: {epoch}</span>
                            <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                            <span>Learning Rate: {learningRate.toFixed(3)}</span>
                        </div>
                    </div>
                </div>
                <span className="text-[8px] bg-indigo-900/30 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30 flex items-center gap-1">
                    <Globe className="w-2.5 h-2.5" /> 24H ACTIVE
                </span>
            </div>

            <div className="space-y-1.5 max-h-24 overflow-y-auto custom-scrollbar">
                {events.length === 0 ? (
                    <div className="text-center text-[9px] text-gray-600 py-2">正在扫描全网数据源...</div>
                ) : (
                    events.map(evt => (
                        <div key={evt.id} className="flex items-start gap-2 text-[9px] group">
                            <span className="text-gray-600 font-mono shrink-0">{new Date(evt.timestamp).toLocaleTimeString([], {hour12:false, hour:'2-digit', minute:'2-digit', second:'2-digit'})}</span>
                            <div className="flex-1 text-gray-300 leading-tight">
                                <span className="text-indigo-400 font-bold">[{evt.source}]</span> {evt.topic}
                            </div>
                            <span className={`font-mono font-bold ${evt.impact > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {evt.impact > 0 ? '↑' : '↓'}{(Math.abs(evt.impact)*100).toFixed(1)}%
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

const ExecutionTrader = ({ 
    result, 
    posteriorProb, // Dynamic posterior
    onExecute, 
    disabled,
    autoTrade,
    onToggleAuto,
    liveAccess,
    onBroadcast,
    autoBroadcast,
    onToggleAutoBroadcast,
    isFutures = false,
    portfolio,
    stock
}: { 
    result: BayesianAnalysisResult;
    posteriorProb: number;
    onExecute: (qty: number) => void;
    disabled: boolean;
    autoTrade: boolean;
    onToggleAuto: () => void;
    liveAccess: boolean;
    onBroadcast: () => void;
    autoBroadcast: boolean;
    onToggleAutoBroadcast: () => void;
    isFutures?: boolean;
    portfolio?: Portfolio;
    stock?: Stock | null;
}) => {
    const { signal, risk_params } = result;
    // UI Logic based on DYNAMIC posterior
    let dynamicSignal = signal;
    if (posteriorProb > 0.65) dynamicSignal = 'BUY';
    else if (posteriorProb < 0.35) dynamicSignal = 'SELL';
    else dynamicSignal = 'HOLD';

    const isBuy = dynamicSignal === 'BUY';
    const isSell = dynamicSignal === 'SELL';
    const isHold = dynamicSignal === 'HOLD';
    
    const bgClass = isBuy ? 'bg-emerald-600' : isSell ? 'bg-rose-600' : 'bg-gray-700';
    const textClass = isBuy ? 'text-emerald-400' : isSell ? 'text-rose-400' : 'text-gray-400';

    return (
        <div className="bg-[#1e222d] border border-gray-700 rounded-xl p-3 flex flex-col gap-3 shadow-lg">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Zap className={`w-4 h-4 ${autoTrade ? 'text-yellow-400 animate-pulse' : 'text-gray-500'}`} />
                    <span className="text-xs font-bold text-gray-200">决策执行面板 (Execution)</span>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={onToggleAuto} className={`text-[9px] px-2 py-1 rounded font-bold uppercase transition-all ${autoTrade ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-gray-500'}`}>
                        {autoTrade ? 'Auto-Pilot ON' : 'Manual'}
                    </button>
                    {!liveAccess && <Lock className="w-3 h-3 text-gray-500" />}
                </div>
            </div>

            {/* Signal & Advice */}
            <div className="bg-black/30 p-2 rounded border border-gray-800">
                <div className="flex justify-between items-center mb-1">
                    <span className={`text-xs font-black uppercase ${textClass}`}>SIGNAL: {dynamicSignal}</span>
                    <span className="text-[10px] text-gray-500 font-mono">后验概率 P(H|E) = {posteriorProb.toFixed(2)}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[9px] text-gray-400 font-mono">
                    <div>Size: <span className="text-white">{risk_params.position_size}</span></div>
                    <div>Lev: <span className="text-white">{risk_params.leverage}</span></div>
                    <div>Stop: <span className="text-white">{risk_params.stop_loss}</span></div>
                </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-2">
                <button 
                    onClick={() => onExecute(100)} 
                    disabled={disabled || isHold || autoTrade}
                    className={`flex-1 py-3 rounded-lg font-black text-xs uppercase tracking-widest text-white shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${bgClass} ${(disabled || isHold || autoTrade) ? 'opacity-50 cursor-not-allowed' : 'hover:brightness-110'}`}
                >
                    {autoTrade ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> 托管中</> : isHold ? '观望中' : (isSell && isFutures) ? '开空 (OPEN SHORT)' : isSell ? '卖出 (SELL)' : '买入 (BUY)'}
                </button>
                {!isHold && (
                    <button onClick={onBroadcast} className="px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-lg flex items-center justify-center" title="广播策略">
                        <Radio className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    );
};

const BayesianDecisionOfficer = ({ stock, data, onTrade, liveModeAllowed = false, portfolio, onBroadcastAdvice, onOpenKeySelector, externalSignals = [], liveStatus }: BayesianDecisionOfficerProps) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BayesianAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Evolution State
  const [dynamicProbabilities, setDynamicProbabilities] = useState<Record<string, number>>({}); // id -> newProb
  const [evolutionEvents, setEvolutionEvents] = useState<EvolutionEvent[]>([]);
  const [epoch, setEpoch] = useState(142); // Simulated starting epoch
  
  const [isLiveMonitor, setIsLiveMonitor] = useState(false);
  const [isAutoTrade, setIsAutoTrade] = useState(false);
  const [isAutoBroadcast, setIsAutoBroadcast] = useState(true);
  const [timeLeft, setTimeLeft] = useState(8);
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('4H');
  const [learningLogs, setLearningLogs] = useState<string[]>([]);

  // Refs
  const stockRef = useRef(stock);
  const dataRef = useRef(data);
  const portfolioRef = useRef(portfolio);
  const signalsRef = useRef(externalSignals);
  const lastBroadcastTime = useRef<number>(0);
  const lastSignal = useRef<string>('HOLD');
  const lastTickRef = useRef<number>(Date.now());
  const monitorRef = useRef<boolean>(isLiveMonitor);

  const TIMEFRAMES = ['15m', '30m', '1H', '4H'];
  const MEMORY_ID = 'BAYESIAN_OFFICER_LOGS';

  // Load Memory
  useEffect(() => {
      const load = async () => {
          const mem = await MemoryService.loadAgentMemory(MEMORY_ID);
          if (mem) {
              if (mem.logs) setLearningLogs(mem.logs);
              console.log("[BayesianOfficer] Memory restored.");
          }
      };
      load();
  }, []);

  useEffect(() => {
      stockRef.current = stock;
      dataRef.current = data;
      portfolioRef.current = portfolio;
      signalsRef.current = externalSignals;
  }, [stock, data, portfolio, externalSignals]);

  useEffect(() => {
      monitorRef.current = isLiveMonitor;
      if (!isLiveMonitor) {
          setTimeLeft(8);
      }
  }, [isLiveMonitor]);

  useEffect(() => {
      if (isAutoTrade && !liveModeAllowed) setIsAutoTrade(false);
  }, [liveModeAllowed]);

  // --- EVOLUTION SIMULATION LOOP ---
  useEffect(() => {
      if (!result || !isLiveMonitor) return;

      const evolutionInterval = setInterval(() => {
          // 15% chance to trigger an evolution event every tick (approx 3s)
          if (Math.random() > 0.85) {
              const topics = [
                  { s: 'Bloomberg', t: '美联储会议纪要鹰派暗示', n: 'History', drift: -0.05 },
                  { s: 'OnChain', t: '交易所稳定币净流入激增', n: 'Capital', drift: 0.08 },
                  { s: 'Twitter/X', t: '关键 KOL 看多情绪指数上升', n: 'Sentiment', drift: 0.04 },
                  { s: 'GitHub', t: '核心协议代码重大更新', n: 'Logic', drift: 0.03 },
                  { s: 'DefiLlama', t: 'TVL 数据突破月度新高', n: 'Tech', drift: 0.05 },
                  { s: 'SEC', t: '监管政策不确定性增加', n: 'Env', drift: -0.06 }
              ];
              const event = topics[Math.floor(Math.random() * topics.length)];
              
              // Only affect if node exists
              const currentNodeProb = dynamicProbabilities[event.n] ?? (result.components.prior[event.n as keyof typeof result.components.prior] || result.components.likelihood[event.n as keyof typeof result.components.likelihood] || 0.5);
              
              // Apply drift with decay
              const newProb = Math.min(0.99, Math.max(0.01, currentNodeProb + event.drift));
              
              setDynamicProbabilities(prev => ({ ...prev, [event.n]: newProb }));
              setEvolutionEvents(prev => [{
                  id: Date.now().toString(),
                  timestamp: Date.now(),
                  source: event.s,
                  topic: event.t,
                  impact: event.drift,
                  affectedNodeId: event.n
              }, ...prev].slice(0, 50));
              
              setEpoch(prev => prev + 1);
          }
      }, 3000);

      return () => clearInterval(evolutionInterval);
  }, [result, isLiveMonitor, dynamicProbabilities]);

  // Main Analysis
  const handleRunAnalysis = async () => {
    const currentStock = stockRef.current;
    const currentData = dataRef.current;
    const currentPortfolio = portfolioRef.current;
    const currentSignals = signalsRef.current;
    if (!currentStock || !currentData.length) return;
    
    setLoading(true);
    setError(null);
    try {
        const volatility = calculateVolatility(currentData);
        const load = currentPortfolio ? (currentPortfolio.totalValue - currentPortfolio.cash) / currentPortfolio.totalValue : 0;
        
        const teamContext: TeamContext = {
            alpha_timeframe: selectedTimeframe,
            beta_timeframe: '1m/5m',
            market_volatility: volatility as 'Low' | 'Medium' | 'High',
            portfolio_load: parseFloat(load.toFixed(2)),
            strategic_horizon: 'SWING',
            external_signals: currentSignals
        };

        const res = await runBayesianTradingAgent(currentStock, currentData, teamContext);
        setResult(res);
        setDynamicProbabilities({}); // Reset dynamic probs on new manual run
        
        if (res.learning_updates) {
            setLearningLogs(prev => {
                const nextLogs = [...res.learning_updates, ...prev].slice(0, 50);
                MemoryService.saveAgentMemory(MEMORY_ID, { logs: nextLogs, timestamp: Date.now() });
                return nextLogs;
            });
        }
        
    } catch (e: any) {
        console.error(e);
        setError("Analysis Failed");
        setLearningLogs(prev => [`[ERROR] ${e.message}`, ...prev].slice(0, 50));
    } finally {
        setLoading(false);
    }
  };

  // Robust Timer
  useEffect(() => {
      const interval = setInterval(() => {
          if (!monitorRef.current) return;
          if (loading) return; 

          const now = Date.now();
          const delta = (now - lastTickRef.current) / 1000;
          lastTickRef.current = now;

          setTimeLeft((prev) => {
              const nextVal = prev - delta;
              if (nextVal <= 0) {
                  handleRunAnalysis();
                  return 8; 
              }
              return nextVal;
          });
      }, 1000);

      return () => clearInterval(interval);
  }, [loading]);

  // Recalculate Posterior based on Dynamic Probabilities
  let dynamicPosterior = 0;
  if (result) {
      // 1. Get current probs (base + drift)
      const getP = (cat: 'prior'|'likelihood', key: string) => {
          return dynamicProbabilities[key] ?? (result.components[cat] as any)[key.toLowerCase()] ?? 0.5;
      };

      const p_history = getP('prior', 'History');
      const p_logic = getP('prior', 'Logic');
      const p_env = getP('prior', 'Env');
      
      const p_tech = getP('likelihood', 'Tech');
      const p_cap = getP('likelihood', 'Capital');
      const p_sent = getP('likelihood', 'Sentiment');
      const p_agents = getP('likelihood', 'Agents');

      // 2. Re-run Bayesian Formula (Simplified)
      const prior = (0.4 * p_history) + (0.3 * p_logic) + (0.3 * p_env);
      const likelihood = (0.3 * p_tech) + (0.2 * p_cap) + (0.2 * p_sent) + (0.3 * p_agents);
      
      const p_false_positive = 0.45;
      const p_not_h = 1 - prior;
      const evidence = (likelihood * prior) + (p_false_positive * p_not_h);
      dynamicPosterior = (likelihood * prior) / (evidence || 1);
  }

  const handleBroadcast = () => {
      if (result && stock && onBroadcastAdvice) {
          onBroadcastAdvice({
              symbol: stock.symbol,
              action: dynamicPosterior > 0.6 ? 'BUY' : dynamicPosterior < 0.4 ? 'SELL' : 'HOLD',
              confidence: dynamicPosterior,
              rationale: `[${selectedTimeframe}] Manual Broadcast (Evolved): ` + result.strategy_assessment?.reason,
              timestamp: Date.now()
          });
      }
  };

  // --- Transform Result to Nodes for Grid ---
  const bayesianNodes: BayesianNode[] = [];
  if (result) {
      const createNode = (id: string, name: string, role: string, baseProb: number, color: string, icon: any): BayesianNode => ({
          id, name, role,
          originalProb: baseProb,
          probability: dynamicProbabilities[id] ?? baseProb,
          status: loading ? 'Analyzing' : (dynamicProbabilities[id] !== undefined ? 'ConfidenceHigh' : 'Idle'),
          color, icon
      });

      // Prior Nodes
      bayesianNodes.push(createNode('History', '宏观历史', 'Prior Distribution', result.components.prior.history, 'text-blue-400', History));
      bayesianNodes.push(createNode('Logic', '策略逻辑', 'Strategy Validity', result.components.prior.logic, 'text-blue-300', Scale));
      bayesianNodes.push(createNode('Env', '市场环境', 'Risk Regimen', result.components.prior.environment, 'text-blue-200', Cloud));
      
      // Likelihood Nodes
      bayesianNodes.push(createNode('Tech', '技术形态', 'Trend & Momentum', result.components.likelihood.technical, 'text-purple-400', BarChart3));
      bayesianNodes.push(createNode('Capital', '资金流向', 'Volume Profile', result.components.likelihood.capital, 'text-purple-300', Coins));
      bayesianNodes.push(createNode('Sentiment', '舆情情绪', 'Market Sentiment', result.components.likelihood.sentiment, 'text-purple-200', MessageCircle));
      bayesianNodes.push(createNode('Agents', '集群共识', 'Swarm Consensus', result.components.likelihood.agents, 'text-emerald-400', Users));
  }

  if (!stock) return <div className="h-full flex items-center justify-center text-gray-500">System Offline</div>;

  return (
    <div className="h-full flex flex-col bg-[#0b0e14] border-l border-gray-800 font-sans">
        {/* Header */}
        <div className="p-4 border-b border-gray-800 bg-[#131722] shrink-0 flex flex-col gap-3">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <BrainCircuit className="w-5 h-5 text-blue-400" />
                    <div>
                        <h2 className="text-xs font-black text-blue-100 uppercase tracking-widest">贝叶斯决策矩阵 (Bayesian Matrix)</h2>
                        {liveStatus && (
                            <div className="flex items-center gap-1 mt-0.5">
                                <span className={`text-[8px] px-1.5 py-0.5 rounded border flex items-center gap-1 font-bold ${liveStatus.isConnected ? 'bg-emerald-900/30 border-emerald-500/50 text-emerald-400' : 'bg-gray-800 border-gray-700 text-gray-500'}`}>
                                    {liveStatus.isConnected ? <Link className="w-2.5 h-2.5" /> : <Unlink className="w-2.5 h-2.5" />}
                                    API: {liveStatus.label}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
                
                <button 
                    onClick={() => {
                        const nextState = !isLiveMonitor;
                        setIsLiveMonitor(nextState);
                        if(nextState) lastTickRef.current = Date.now();
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded text-[10px] font-bold border transition-all ${isLiveMonitor ? 'bg-emerald-900/30 border-emerald-500/50 text-emerald-400' : 'bg-gray-800 border-gray-700 text-gray-500'}`}
                >
                    {isLiveMonitor ? <Wifi className="w-3 h-3 animate-pulse"/> : <Power className="w-3 h-3"/>}
                    {isLiveMonitor ? `LIVE (${Math.ceil(Math.max(0, timeLeft))}s)` : 'OFFLINE'}
                </button>
            </div>

            {/* Timeframe Selector */}
            <div className="flex bg-black/40 p-1 rounded-lg border border-gray-700 self-start">
                {TIMEFRAMES.map((tf) => (
                    <button
                        key={tf}
                        onClick={() => setSelectedTimeframe(tf)}
                        className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${selectedTimeframe === tf ? 'bg-blue-600 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        {tf}
                    </button>
                ))}
            </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
            
            {!result && !loading && (
                <div className="flex flex-col items-center justify-center py-20 opacity-50">
                    <Database className="w-12 h-12 mb-4 text-gray-700" />
                    <div className="text-sm font-bold text-gray-400 mb-2">Ready to Analyze</div>
                    <button onClick={handleRunAnalysis} className="px-6 py-2 bg-blue-600 text-white rounded font-bold text-xs hover:bg-blue-500 shadow-lg">Initialize Engine ({selectedTimeframe})</button>
                </div>
            )}

            {loading && !result && (
                <div className="flex flex-col items-center justify-center py-20 text-blue-400 animate-pulse">
                    <RefreshCw className="w-8 h-8 mb-2 animate-spin" />
                    <span className="text-xs font-bold">Constructing Bayesian Network...</span>
                </div>
            )}

            {result && (
                <>
                    {/* Evolution Panel (NEW) */}
                    <EvolutionPanel events={evolutionEvents} epoch={epoch} learningRate={0.05 + (evolutionEvents.length * 0.001)} />

                    {/* 1. Network Grid (Replaces old bars) */}
                    <div>
                        <div className="flex items-center gap-2 mb-2 px-1 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                            <Layers className="w-3 h-3" /> 概率因子网络 (Factor Network)
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                            {bayesianNodes.map(node => (
                                <BayesianAgentCard key={node.id} node={node} />
                            ))}
                        </div>
                    </div>

                    {/* 2. Synthesis Core (Posterior) */}
                    <div className="bg-[#1e222d] border border-gray-700 rounded-xl p-4 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-2 opacity-10"><BrainCircuit className="w-32 h-32" /></div>
                        
                        <div className="flex justify-between items-center relative z-10 mb-3">
                            <h3 className="text-[10px] font-black uppercase text-gray-300 flex items-center gap-2">
                                <Activity className="w-3 h-3 text-blue-400"/> 核心后验概率 (Posterior)
                            </h3>
                            <div className="text-[9px] text-gray-500 font-mono">P(H|E) = (Likelihood × Prior) / Evidence</div>
                        </div>

                        <div className="flex items-center justify-between text-center relative z-10 bg-black/40 p-3 rounded-lg border border-gray-700/50">
                            <div>
                                <div className="text-[9px] text-gray-500 uppercase">Prior P(H)</div>
                                {/* Calc dynamic Prior for display */}
                                <div className="text-sm font-mono text-blue-400 font-bold">
                                    {(bayesianNodes.slice(0,3).reduce((acc, n)=>acc+n.probability, 0)/3 * 100).toFixed(1)}%
                                </div>
                            </div>
                            <div className="text-gray-600 font-black">×</div>
                            <div>
                                <div className="text-[9px] text-gray-500 uppercase">Likelihood P(E|H)</div>
                                <div className="text-sm font-mono text-purple-400 font-bold">
                                    {(bayesianNodes.slice(3).reduce((acc, n)=>acc+n.probability, 0)/4 * 100).toFixed(1)}%
                                </div>
                            </div>
                            <div className="text-gray-500">=</div>
                            <div className="text-right">
                                <div className="text-[9px] text-gray-400 uppercase font-black mb-0.5">置信度 (Confidence)</div>
                                <div className={`text-2xl font-black ${dynamicPosterior >= 0.8 ? 'text-emerald-400' : dynamicPosterior <= 0.39 ? 'text-rose-400' : 'text-yellow-400'}`}>
                                    {(dynamicPosterior * 100).toFixed(1)}%
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 3. Execution Panel */}
                    <ExecutionTrader 
                        result={result}
                        posteriorProb={dynamicPosterior}
                        onExecute={(qty) => {
                            if (onTrade) {
                                // Logic handled in App.tsx based on signal string
                                const act = dynamicPosterior > 0.6 ? 'BUY' : dynamicPosterior < 0.4 ? 'SELL' : 'HOLD';
                                if (act !== 'HOLD') onTrade(act, false, qty);
                            }
                        }}
                        disabled={dynamicPosterior > 0.4 && dynamicPosterior < 0.6}
                        autoTrade={isAutoTrade}
                        onToggleAuto={() => {
                            if (!isLiveMonitor && !isAutoTrade) { alert("Please enable LIVE monitor first."); return; }
                            if (!isAutoTrade && !liveModeAllowed) { alert("Authorization required in settings."); return; }
                            setIsAutoTrade(!isAutoTrade);
                        }}
                        liveAccess={liveModeAllowed}
                        portfolio={portfolio}
                        stock={stock}
                        onBroadcast={handleBroadcast}
                        autoBroadcast={isAutoBroadcast}
                        onToggleAutoBroadcast={() => setIsAutoBroadcast(!isAutoBroadcast)}
                        isFutures={true}
                    />

                    {/* 4. Terminal / Logs */}
                    <div className="bg-black border border-gray-800 rounded-xl overflow-hidden flex flex-col h-40">
                        <div className="bg-gray-900 px-3 py-1.5 border-b border-gray-800 flex items-center gap-2">
                            <Terminal className="w-3 h-3 text-gray-500" />
                            <span className="text-[9px] font-mono text-gray-400">BAYESIAN_KERNEL.log</span>
                        </div>
                        <div className="flex-1 p-2 overflow-y-auto custom-scrollbar font-mono text-[9px] space-y-1">
                            {learningLogs.map((log, i) => (
                                <div key={i} className="flex gap-2 leading-relaxed opacity-90 border-l-2 border-transparent hover:border-gray-700 pl-1 transition-colors">
                                    <span className="text-gray-600 shrink-0 select-none">[{i}]</span>
                                    <span className="text-gray-400">{log}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    </div>
  );
};

export default BayesianDecisionOfficer;
