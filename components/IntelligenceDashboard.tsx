
import React, { useState, useEffect, useRef } from 'react';
import { 
  Globe, Shield, AlertTriangle, Radio, RefreshCw, 
  Target, Zap, Lock, Key, Activity, Radar, Server,
  Terminal, Search, Play, Pause, FileText, Youtube, Twitter, Github, Newspaper, ExternalLink, Siren, TrendingUp
} from 'lucide-react';
import { Stock, IntelReport, IntelEvent, IntelSourceType } from '../types';
import { fetchGlobalIntelligence } from '../services/geminiService';
import { coindeskService } from '../services/coindeskService';

interface IntelligenceDashboardProps {
  stocks: Stock[];
  onOpenKeySelector?: () => void;
}

// Helper to render source icon
const SourceIcon = ({ type, className }: { type: IntelSourceType, className?: string }) => {
    switch (type) {
        case 'NEWS': return <Newspaper className={className} />;
        case 'SOCIAL': return <Twitter className={className} />;
        case 'VIDEO': return <Youtube className={className} />;
        case 'WHITEPAPER': return <FileText className={className} />;
        case 'ONCHAIN': return <Activity className={className} />;
        default: return <Globe className={className} />;
    }
};

const IntelligenceDashboard: React.FC<IntelligenceDashboardProps> = ({ stocks, onOpenKeySelector }) => {
  const [activeStock, setActiveStock] = useState<Stock>(stocks[0] || null);
  const [report, setReport] = useState<IntelReport | null>(null);
  
  // Real-time Simulation State
  const [isLiveMonitor, setIsLiveMonitor] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState(''); 
  
  // Feed State (Phase 1 Output)
  const [eventStream, setEventStream] = useState<IntelEvent[]>([]);
  
  // Console Logs (System Operations)
  const [logs, setLogs] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [logs]);

  // Auto-scroll feed (smoothly)
  useEffect(() => {
      if (feedRef.current && isLiveMonitor) {
          feedRef.current.scrollTop = 0; // Newest on top
      }
  }, [eventStream, isLiveMonitor]);

  const addLog = (msg: string) => setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 50));

  const addEvent = (evt: IntelEvent) => {
      setEventStream(prev => {
          // Prevent duplicates
          if (prev.some(e => e.id === evt.id)) return prev;
          return [evt, ...prev].slice(0, 100);
      });
  };

  const runIntelScan = async (stock: Stock) => {
    setLoading(true);
    addLog(`正在初始化全球扫描: ${stock.symbol}...`);
    
    // 1. Trigger Real-Time Data Fetch (CoinDesk)
    if (stock.symbol.includes('BTC') || stock.symbol.includes('Bitcoin')) {
        addLog(`[阶段一] 连接 CoinDesk BPI 数据流...`);
        coindeskService.getCurrentPrice().then(realEvent => {
            if (realEvent) {
                addEvent(realEvent);
                addLog(`[数据] CoinDesk 实时价格更新: ${realEvent.title}`);
            }
        });
    }

    addLog(`[阶段一] 爬取新闻、社交媒体及白皮书...`);
    
    try {
      const data = await fetchGlobalIntelligence(stock, apiKey); 
      setReport(data);
      
      // Simulate "Streaming" arrival of events to make it feel real-time
      if (data.events && data.events.length > 0) {
          data.events.forEach((evt, index) => {
              setTimeout(() => {
                  addEvent(evt);
                  addLog(`[数据] 新信号来自 ${evt.sourceName}: ${evt.title.slice(0, 30)}...`);
              }, index * 800); // Stagger events
          });
      }

      setTimeout(() => {
          addLog(`[阶段二] 交叉验证完成。综合情绪指数: ${data.globalSentiment}`);
      }, 1000);

      if (data.riskScore > 60) {
          setTimeout(() => addLog(`[阶段三] 警报: 检测到高风险 (${data.riskScore}/100)`), 2000);
      }

    } catch (e) {
      addLog(`扫描失败: ${stock.symbol}`);
    } finally {
      setLoading(false);
    }
  };

  // Live Monitor Loop
  useEffect(() => {
    if (!isLiveMonitor) return;
    
    // Initial Run
    if (activeStock) runIntelScan(activeStock);

    // Loop
    const interval = setInterval(() => {
        if (activeStock) runIntelScan(activeStock);
    }, 15000); // Every 15s refresh

    return () => clearInterval(interval);
  }, [isLiveMonitor, activeStock]);

  // Initial
  useEffect(() => {
      if (activeStock && !report && !loading) {
          // Just do one scan on load if not live
          runIntelScan(activeStock);
      }
  }, [activeStock]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#050505] text-green-500 font-mono overflow-hidden relative">
        {/* Background Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,50,0,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,50,0,0.1)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />

        {/* Header - Responsive: Stack on mobile, Row on desktop */}
        <div className="h-auto py-3 lg:py-0 lg:h-14 border-b border-green-900/50 flex flex-col lg:flex-row items-start lg:items-center justify-between px-4 lg:px-6 bg-black/80 backdrop-blur shrink-0 z-10 gap-3">
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                <div className="flex items-center gap-2 text-green-400">
                    <Globe className={`w-5 h-5 ${isLiveMonitor ? 'animate-spin-slow' : ''}`} />
                    <h2 className="text-sm lg:text-lg font-black tracking-widest uppercase whitespace-nowrap">全球情报中心</h2>
                </div>
                <div className="hidden lg:block h-6 w-px bg-green-900/50" />
                <div className="flex items-center gap-2 text-xs text-green-600 ml-auto lg:ml-0">
                    <Activity className={`w-3 h-3 ${isLiveMonitor ? 'animate-pulse' : ''}`} />
                    <span>状态: {isLiveMonitor ? 'LIVE' : 'STANDBY'}</span>
                </div>
            </div>

            <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
                <div className="flex items-center bg-black border border-green-900/50 rounded px-3 py-1.5 flex-1 lg:flex-none">
                    <Search className="w-3 h-3 text-green-700 mr-2 shrink-0" />
                    <select 
                        value={activeStock?.symbol}
                        onChange={(e) => {
                            const s = stocks.find(st => st.symbol === e.target.value);
                            if (s) { setActiveStock(s); setEventStream([]); setLogs([]); runIntelScan(s); }
                        }}
                        className="bg-transparent text-green-400 text-xs focus:outline-none uppercase font-bold appearance-none w-full lg:min-w-[100px]"
                    >
                        {stocks.map(s => <option key={s.symbol} value={s.symbol}>{s.symbol}</option>)}
                    </select>
                </div>

                <button 
                    onClick={() => setIsLiveMonitor(!isLiveMonitor)}
                    className={`flex items-center gap-2 px-3 lg:px-4 py-1.5 rounded border text-xs font-bold transition-all whitespace-nowrap ${isLiveMonitor ? 'bg-green-900/20 border-green-500 text-green-400 animate-pulse' : 'border-green-900/50 text-green-700 hover:border-green-500 hover:text-green-400'}`}
                >
                    {isLiveMonitor ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                    {isLiveMonitor ? '停止' : '监控'}
                </button>
            </div>
        </div>

        {/* Main Content - Responsive Grid */}
        {/* Mobile: overflow-y-auto (entire page scrolls), Desktop: overflow-hidden (panels scroll individually) */}
        <div className="flex-1 p-3 lg:p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-y-auto lg:overflow-hidden relative z-10">
            
            {/* COLUMN 1: PHASE 1 - LIVE FEED */}
            <div className="lg:col-span-3 flex flex-col gap-4 bg-black/40 border border-green-900/30 rounded-lg overflow-hidden h-96 lg:h-full lg:min-h-0">
                <div className="p-3 border-b border-green-900/30 bg-green-900/10 flex justify-between items-center shrink-0">
                    <h3 className="text-xs font-black text-green-500 uppercase flex items-center gap-2">
                        <Radio className="w-3 h-3 animate-pulse" /> 实时情报流
                    </h3>
                    <span className="text-[9px] text-green-700">{eventStream.length}</span>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-3" ref={feedRef}>
                    {eventStream.map((evt) => (
                        <div key={evt.id} className="p-3 bg-black/60 border border-green-900/40 rounded hover:border-green-500/50 transition-all group animate-in slide-in-from-left-2 duration-500">
                            <div className="flex justify-between items-start mb-1">
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border flex items-center gap-1 ${evt.impact === 'HIGH' ? 'border-red-500/50 text-red-400 bg-red-900/10' : 'border-green-500/30 text-green-400 bg-green-900/10'}`}>
                                    <SourceIcon type={evt.sourceType} className="w-3 h-3" />
                                    {evt.sourceName}
                                </span>
                                <span className="text-[9px] text-green-800">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                            </div>
                            <h4 className="text-[10px] font-bold text-gray-200 mb-1 leading-tight group-hover:text-green-300 transition-colors">
                                {evt.title}
                            </h4>
                            <p className="text-[9px] text-gray-500 line-clamp-2 leading-relaxed mb-2">
                                {evt.summary}
                            </p>
                            <div className="flex justify-between items-center border-t border-green-900/20 pt-2">
                                <div className="flex gap-2">
                                    <span className="text-[8px] text-gray-600">信度: {evt.reliability}%</span>
                                    <span className={`text-[8px] ${evt.sentiment > 0 ? 'text-green-500' : 'text-red-500'}`}>情绪: {evt.sentiment}</span>
                                </div>
                                {evt.url && (
                                    <a href={evt.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-400">
                                        <ExternalLink className="w-3 h-3" />
                                    </a>
                                )}
                            </div>
                        </div>
                    ))}
                    {eventStream.length === 0 && (
                        <div className="text-center py-10 text-[10px] text-green-900 animate-pulse">
                            等待数据流接入...
                        </div>
                    )}
                </div>
            </div>

            {/* COLUMN 2: PHASE 2 - ANALYSIS CENTER */}
            {/* Mobile: Auto height, Desktop: Full height */}
            <div className="lg:col-span-6 flex flex-col gap-4 lg:h-full lg:min-h-0">
                {/* Header Info */}
                <div className="h-24 bg-green-900/10 border border-green-500/30 rounded-lg p-4 flex justify-between items-center relative overflow-hidden shrink-0">
                    <div className="absolute -right-5 -bottom-5 opacity-10">
                        <Radar className="w-32 h-32 text-green-500 animate-spin-slow" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h1 className="text-2xl font-black text-green-400 tracking-tighter">
                                {activeStock?.symbol} 
                            </h1>
                            <span className="text-[10px] text-green-700 bg-green-900/20 px-2 py-0.5 rounded border border-green-900/30 whitespace-nowrap">
                                深度分析
                            </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-green-600 font-bold">
                            <span>现价: ${activeStock?.price}</span>
                            <span className={activeStock?.change >= 0 ? 'text-green-400' : 'text-red-400'}>
                                {activeStock?.change >= 0 ? '▲' : '▼'} {activeStock?.changePercent}%
                            </span>
                        </div>
                    </div>
                    <div className="text-right z-10">
                        <div className="text-[9px] text-green-600 uppercase tracking-widest mb-1">AI 置信度</div>
                        <div className="text-3xl font-black text-green-400">
                            {report?.pricePrediction7d?.confidence || 0}%
                        </div>
                    </div>
                </div>

                {/* Gauges - Stack on mobile small screens */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1 lg:min-h-0">
                    {/* Sentiment Gauge */}
                    <div className="bg-black/40 border border-green-900/30 rounded-lg p-6 flex flex-col items-center justify-center relative min-h-[200px]">
                        <h3 className="absolute top-3 left-3 text-[10px] font-black text-green-700 uppercase">情绪指数</h3>
                        <div className="relative w-32 h-32 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle cx="50%" cy="50%" r="45%" stroke="#064e3b" strokeWidth="8" fill="transparent" />
                                <circle 
                                    cx="50%" cy="50%" r="45%" 
                                    stroke={report?.globalSentiment > 0 ? '#4ade80' : '#f87171'} 
                                    strokeWidth="8" 
                                    fill="transparent" 
                                    strokeDasharray={251} 
                                    strokeDashoffset={251 - (251 * Math.abs(report?.globalSentiment || 0)) / 100} 
                                    className="transition-all duration-1000"
                                />
                            </svg>
                            <div className="absolute text-center">
                                <div className="text-2xl font-black text-white">{report?.globalSentiment || 0}</div>
                                <div className="text-[8px] text-green-500">INDEX</div>
                            </div>
                        </div>
                        <div className="mt-4 text-[10px] text-gray-400 text-center">
                            样本量: {eventStream.length} 信号
                        </div>
                    </div>

                    {/* Threat Radar */}
                    <div className="bg-black/40 border border-green-900/30 rounded-lg p-6 flex flex-col relative min-h-[200px]">
                        <h3 className="absolute top-3 left-3 text-[10px] font-black text-green-700 uppercase">风险评估</h3>
                        <div className="flex-1 flex flex-col justify-center items-center gap-4">
                            <div className={`text-4xl font-black ${report?.riskScore > 60 ? 'text-red-500 animate-pulse' : 'text-green-400'}`}>
                                {report?.riskScore || 0}
                            </div>
                            <div className="w-full h-2 bg-green-900/30 rounded-full overflow-hidden">
                                <div className={`h-full ${report?.riskScore > 60 ? 'bg-red-500' : 'bg-green-500'}`} style={{width: `${report?.riskScore || 0}%`}} />
                            </div>
                            <div className="flex justify-between w-full text-[9px] text-gray-500">
                                <span>安全 (SAFE)</span>
                                <span>危险 (RISK)</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Prediction */}
                <div className="bg-green-900/10 border border-green-500/20 rounded-lg p-4 flex justify-between items-center shrink-0">
                    <div>
                        <h4 className="text-[10px] font-black text-green-500 uppercase">AI 预测 (7日)</h4>
                        <div className="text-lg font-bold text-white flex items-center gap-2 mt-1">
                            {report?.pricePrediction7d?.trend === 'UP' ? '看涨 (BULLISH)' : '看跌 (BEARISH)'} 
                            <span className="text-sm font-mono text-gray-400">目标: ${report?.pricePrediction7d?.target}</span>
                        </div>
                    </div>
                    {report?.pricePrediction7d?.trend === 'UP' ? <TrendingUp className="w-8 h-8 text-green-500" /> : <TrendingUp className="w-8 h-8 text-red-500 rotate-180" />}
                </div>
            </div>

            {/* COLUMN 3: PHASE 3 - OUTPUT & ALERTS */}
            <div className="lg:col-span-3 flex flex-col gap-4 lg:h-full lg:min-h-0">
                {/* Config Panel */}
                <div className="bg-black/60 border border-green-900/30 rounded-lg p-4 shrink-0">
                    <h3 className="text-xs font-black text-green-600 uppercase mb-3 flex items-center gap-2">
                        <Key className="w-3 h-3" /> 系统接入
                    </h3>
                    <div className="flex gap-2 mb-2">
                        <input 
                            type="password" 
                            placeholder="API_KEY..." 
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            className="flex-1 bg-black border border-green-900 rounded px-2 py-1 text-xs text-green-400 focus:border-green-500 focus:outline-none placeholder-green-900"
                        />
                        <button 
                            onClick={() => onOpenKeySelector?.()}
                            className="px-3 py-1 bg-green-900/20 border border-green-800 text-green-500 text-xs rounded hover:bg-green-900/40"
                        >
                            Auth
                        </button>
                    </div>
                    <p className="text-[8px] text-green-800 leading-tight">
                        * 需配置 Gemini API 以激活实时爬虫。
                    </p>
                </div>

                {/* Whitepaper / Fundamental */}
                <div className="bg-black/60 border border-green-900/30 rounded-lg p-4 shrink-0">
                    <h3 className="text-xs font-black text-green-600 uppercase mb-3 flex items-center gap-2">
                        <FileText className="w-3 h-3" /> 基本面检查
                    </h3>
                    <div className="space-y-3">
                        <div className="p-2 bg-green-900/10 border border-green-900/30 rounded">
                            <div className="text-[9px] text-green-700 uppercase font-bold">团队持仓占比</div>
                            <div className={`text-sm font-mono ${report?.whitepaperAnalysis?.teamAllocation > 20 ? 'text-red-400' : 'text-green-400'}`}>
                                {report?.whitepaperAnalysis?.teamAllocation || 0}% 
                                {report?.whitepaperAnalysis?.teamAllocation > 20 && <span className="ml-2 text-[9px] bg-red-900/20 px-1 rounded">高风险</span>}
                            </div>
                        </div>
                        <div className="text-[10px] text-green-500 leading-relaxed border-l-2 border-green-800 pl-2 line-clamp-4">
                            "{report?.whitepaperAnalysis?.vision || '正在等待数据...'}"
                        </div>
                    </div>
                </div>

                {/* System Logs */}
                <div className="flex-1 bg-black/60 border border-green-900/30 rounded-lg p-4 flex flex-col min-h-[200px] lg:min-h-0 relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-green-500/20 animate-scanline" />
                    <h3 className="text-xs font-black text-green-600 uppercase mb-3 flex items-center gap-2">
                        <Terminal className="w-3 h-3" /> 系统日志
                    </h3>
                    <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar" ref={scrollRef}>
                        {logs.map((log, i) => (
                            <div key={i} className="text-[9px] text-green-500/80 font-mono border-b border-green-900/20 pb-1 break-all leading-relaxed">
                                <span className="opacity-50 mr-2">{log.split(']')[0]}]</span>
                                {log.split(']')[1]}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

        </div>
    </div>
  );
};

export default IntelligenceDashboard;
