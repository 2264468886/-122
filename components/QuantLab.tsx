
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Play, Square, RotateCcw, Save, Code, Terminal, AreaChart, Activity, AlertCircle, FileText, Settings2, Box, Volume2, VolumeX, Upload, X, Shield, FileJson, Plus, Trash2, Coins, Wallet, PieChart, TrendingUp, CandlestickChart } from 'lucide-react';
import { Stock, CandleData, BacktestResult, TradeMarker } from '../types';
import { TqSimEngine, RiskConfig } from '../services/tqSimEngine';
import StockChart from './StockChart';
import { Area, AreaChart as ReAreaChart, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface QuantLabProps {
  stock: Stock | null;
  data: CandleData[];
}

const DEFAULT_STRATEGY = `
// TqSim 策略示例: 双均线策略
// 核心函数: on_bar(quote, context)
// 变量 context.ma_short, context.ma_long 可在右侧参数面板配置

function calculateSMA(data, period) {
    if (data.length < period) return null;
    let sum = 0;
    for(let i=1; i<=period; i++) sum += data[data.length-i];
    return sum / period;
}

function on_bar(quote, context) {
    // 默认参数兜底
    const short_p = context.ma_short || 5;
    const long_p = context.ma_long || 20;

    if (!context.history) context.history = [];
    
    // 1. 记录历史收盘价
    context.history.push(quote.close);
    if (context.history.length > 50) context.history.shift();
    
    // 2. 计算均线
    const ma_s = calculateSMA(context.history, short_p);
    const ma_l = calculateSMA(context.history, long_p);
    
    if (!ma_s || !ma_l) return;
    
    // 3. 获取当前持仓
    const pos = api.get_position();
    const long_vol = pos ? pos.volume_long : 0;
    
    // 4. 交易逻辑
    // 金叉买入
    if (ma_s > ma_l && long_vol === 0) {
        const account = api.get_account();
        // 使用 99% 可用资金买入
        const vol = Math.floor(account.available * 0.99 / quote.close / 100) * 100;
        if (vol > 0) api.insert_order('BUY', quote.close, vol);
    }
    // 死叉卖出
    else if (ma_s < ma_l && long_vol > 0) {
        api.insert_order('SELL', quote.close, long_vol);
    }
}
`;

const QuantLab: React.FC<QuantLabProps> = ({ stock: initialStock, data: initialData }) => {
  const [code, setCode] = useState(DEFAULT_STRATEGY);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'CONSOLE'|'TRADES'|'FUNDS'>('CONSOLE');
  const [chartView, setChartView] = useState<'PRICE'|'EQUITY'>('PRICE');
  
  // Strategy Parameters
  const [strategyParams, setStrategyParams] = useState<{key: string, value: number}[]>([
      { key: 'ma_short', value: 5 },
      { key: 'ma_long', value: 20 }
  ]);

  // Initial Capital Configuration
  const [initialCapital, setInitialCapital] = useState(1000000);

  // Custom Data State
  const [customData, setCustomData] = useState<CandleData[] | null>(null);
  const [customStock, setCustomStock] = useState<Stock | null>(null);
  
  // Effective Data
  const currentStock = customStock || initialStock;
  const currentData = customData || initialData;

  // Simulation State
  const [isSimulating, setIsSimulating] = useState(false);
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // Risk Settings
  const [showRiskSettings, setShowRiskSettings] = useState(false);
  const [riskConfig, setRiskConfig] = useState<RiskConfig>({
      enable: true,
      maxSingleOrderAmount: 500000,
      maxDailyDrawdownPercent: 10
  });
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addLog = (msg: string) => setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);

  // Initialize Audio Context
  useEffect(() => {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContext) {
        audioContextRef.current = new AudioContext();
    }
  }, []);

  const playTone = (type: 'BUY' | 'SELL') => {
      if (!soundEnabled || !audioContextRef.current) return;
      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      const now = ctx.currentTime;
      if (type === 'BUY') {
          // Rising Tone (Chirp)
          osc.frequency.setValueAtTime(400, now);
          osc.frequency.linearRampToValueAtTime(800, now + 0.1);
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
          osc.start(now);
          osc.stop(now + 0.3);
      } else {
          // Falling Tone (Thud)
          osc.frequency.setValueAtTime(300, now);
          osc.frequency.linearRampToValueAtTime(100, now + 0.2);
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
          osc.type = 'triangle';
          osc.start(now);
          osc.stop(now + 0.3);
      }
  };

  useEffect(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [logs]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const json = JSON.parse(event.target?.result as string);
              if (Array.isArray(json) && json.length > 0 && json[0].date && json[0].close) {
                  setCustomData(json);
                  setCustomStock({
                      symbol: 'UPLOADED.DATA', name: file.name.split('.')[0], 
                      price: json[json.length-1].close, 
                      change: 0, changePercent: 0, sector: 'Custom', market: 'CN', sparkline: []
                  });
                  addLog(`✅ 成功加载回测数据: ${file.name} (${json.length} 条)`);
              } else {
                  addLog(`❌ 数据格式错误: 必须是包含 {date, open, close, ...} 的数组`);
              }
          } catch (err) {
              addLog(`❌ 文件解析失败: 无效的 JSON`);
          }
      };
      reader.readAsText(file);
  };

  const handleRun = async () => {
    if (!currentStock || currentData.length === 0) {
        addLog("❌ 错误: 无标的数据，请先选择股票或上传数据");
        return;
    }

    setIsSimulating(true);
    setResult(null);
    setLogs([]);
    setPlaybackIndex(0); 
    // Auto switch to price view to watch simulation
    setChartView('PRICE');
    addLog(`🚀 开始回测: ${currentStock.name} (${currentStock.symbol}) - 初始资金: ${initialCapital}`);
    
    // Construct params object
    const paramsObj = strategyParams.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {});
    addLog(`⚙️ 策略参数: ${JSON.stringify(paramsObj)}`);

    try {
        const engine = new TqSimEngine(initialCapital, currentData, currentStock.symbol, riskConfig);
        const res = await engine.runBacktest(code, paramsObj);
        setResult(res);
        addLog(`✅ 策略编译成功，开始模拟回放...`);
    } catch (e: any) {
        addLog(`❌ 运行时错误: ${e.message}`);
        setIsSimulating(false);
    }
  };

  const handleStop = () => {
      setIsSimulating(false);
      addLog(`🛑 用户手动停止模拟`);
  };

  // Playback Loop
  useEffect(() => {
      if (!isSimulating || !result) return;

      const interval = setInterval(() => {
          setPlaybackIndex(prev => {
              const next = prev + 1;
              if (next >= currentData.length) {
                  setIsSimulating(false);
                  addLog(`🏁 模拟回放结束`);
                  addLog(`📊 最终收益: ${result.performance.total_returns.toFixed(2)}% | 最大回撤: ${result.performance.max_drawdown.toFixed(2)}%`);
                  return prev;
              }

              const currentCandle = currentData[next];
              const candleTimestamp = new Date(currentCandle.date).getTime();
              
              const newOrders = result.orders.filter(o => o.insert_date_time === candleTimestamp);
              
              if (newOrders.length > 0) {
                  newOrders.forEach(o => {
                      addLog(`⚡ ${o.direction === 'BUY' ? '买入' : '卖出'} 信号触发: ${o.symbol} @ ${o.limit_price?.toFixed(2)}`);
                      playTone(o.direction);
                  });
                  if (navigator.vibrate) navigator.vibrate(newOrders[0].direction === 'BUY' ? [100, 50, 100] : [300]);
              }

              return next;
          });
      }, 50); // 50ms per candle fast forward

      return () => clearInterval(interval);
  }, [isSimulating, result, currentData, soundEnabled]);

  const displayData = useMemo(() => {
      if (!isSimulating && !result) return []; 
      if (!isSimulating && result) return currentData;
      return currentData.slice(0, playbackIndex + 1);
  }, [currentData, isSimulating, result, playbackIndex]);

  const displayMarkers: TradeMarker[] = useMemo(() => {
      if (!result) return [];
      const cutoffTime = new Date(displayData[displayData.length - 1]?.date || 0).getTime();
      
      return result.orders
        .filter(o => o.status === 'FILLED' && o.insert_date_time <= cutoffTime)
        .map(o => ({
            date: new Date(o.insert_date_time).toISOString().split('T')[0],
            type: o.direction,
            price: o.limit_price || 0,
            text: o.direction === 'BUY' ? `Buy ${o.volume_original}` : `Sell ${o.volume_original}`
        }));
  }, [result, displayData]);

  // Derive current equity curve based on playback
  const displayEquityCurve = useMemo(() => {
      if (!result) return [];
      // During simulation, show up to playbackIndex. If ended, show all.
      const sliceIdx = isSimulating ? playbackIndex + 1 : result.equity_curve.length;
      return result.equity_curve.slice(0, sliceIdx);
  }, [result, isSimulating, playbackIndex]);

  // Account Snapshot Logic
  const accountSnapshot = useMemo(() => {
      if (!result) return null;
      if (!isSimulating) return result.account;
      
      // During simulation, estimate based on last known equity point
      // Note: This is an approximation since we don't store full state history per tick in this lightweight engine
      const currentEquity = result.equity_curve[playbackIndex]?.value || initialCapital;
      return {
          ...result.account,
          balance: currentEquity,
          market_value: currentEquity - (result.account.available || 0) // rough estimate
      };
  }, [result, isSimulating, playbackIndex, initialCapital]);

  const formatMoney = (n: number) => n.toLocaleString('zh-CN', { style: 'currency', currency: 'CNY' });

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0b0e14] text-gray-300 overflow-hidden relative">
        {/* Header */}
        <div className="h-12 border-b border-gray-800 flex items-center justify-between px-4 bg-[#131722]">
            <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-600/20 rounded text-blue-500"><Settings2 className="w-4 h-4" /></div>
                <h2 className="font-bold text-white">Quant Lab <span className="text-xs text-gray-500 font-normal ml-2">TqSim 仿真引擎 v2.1</span></h2>
            </div>
            <div className="flex gap-2 items-center">
                {/* Initial Capital Input */}
                <div className="flex items-center bg-black/40 rounded border border-gray-700 px-2 py-1 gap-2 mr-2">
                    <Wallet className="w-3.5 h-3.5 text-gray-500" />
                    <span className="text-[10px] text-gray-500">初始资金</span>
                    <input 
                        type="number" 
                        value={initialCapital}
                        onChange={e => setInitialCapital(Number(e.target.value))}
                        disabled={isSimulating}
                        className="bg-transparent text-xs text-white w-20 focus:outline-none font-mono text-right"
                    />
                </div>

                <div className="h-4 w-px bg-gray-700 mx-1" />

                <button 
                    onClick={() => setSoundEnabled(!soundEnabled)} 
                    className={`p-2 rounded hover:bg-gray-800 transition-colors ${soundEnabled ? 'text-blue-400' : 'text-gray-600'}`}
                    title={soundEnabled ? "静音" : "开启声音"}
                >
                    {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>
                <button
                    onClick={() => setShowRiskSettings(true)}
                    className="p-2 rounded hover:bg-gray-800 text-gray-400 hover:text-white"
                    title="风控设置"
                >
                    <Shield className="w-4 h-4" />
                </button>
                
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept=".json"
                    onChange={handleFileUpload} 
                />
                <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-gray-400 hover:text-white border border-gray-700 rounded hover:bg-gray-800 transition-colors">
                    <Upload className="w-3.5 h-3.5" /> 上传
                </button>

                <button onClick={() => setCode(DEFAULT_STRATEGY)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-gray-400 hover:text-white border border-gray-700 rounded hover:bg-gray-800 transition-colors">
                    <RotateCcw className="w-3.5 h-3.5" /> 重置
                </button>
                
                {!isSimulating ? (
                    <button 
                        onClick={handleRun} 
                        className="flex items-center gap-1 px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded shadow-lg shadow-emerald-900/20 transition-all active:scale-95"
                    >
                        <Play className="w-3.5 h-3.5" /> 运行回测
                    </button>
                ) : (
                    <button 
                        onClick={handleStop} 
                        className="flex items-center gap-1 px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded shadow-lg shadow-rose-900/20 transition-all active:scale-95"
                    >
                        <Square className="w-3.5 h-3.5 fill-current" /> 停止
                    </button>
                )}
            </div>
        </div>

        {/* Body */}
        <div className="flex-1 flex overflow-hidden">
            {/* Left: Code Editor & Params */}
            <div className="w-[45%] flex flex-col border-r border-gray-800">
                {/* Code Editor */}
                <div className="flex-1 flex flex-col min-h-0">
                    <div className="h-8 bg-[#1e222d] flex items-center px-4 border-b border-gray-800 justify-between">
                        <div className="flex items-center">
                            <Code className="w-3.5 h-3.5 mr-2 text-blue-500" />
                            <span className="text-xs font-mono text-gray-400">strategy.js</span>
                        </div>
                        <span className="text-[10px] text-gray-600">JavaScript Sandbox</span>
                    </div>
                    <div className="flex-1 relative">
                        <textarea 
                            value={code}
                            onChange={e => setCode(e.target.value)}
                            className="w-full h-full bg-[#0d1117] text-gray-300 font-mono text-xs p-4 resize-none focus:outline-none leading-relaxed custom-scrollbar"
                            spellCheck="false"
                            disabled={isSimulating}
                        />
                    </div>
                </div>
                
                {/* Strategy Params Visual Config */}
                <div className="h-40 border-t border-gray-800 bg-[#131722] flex flex-col">
                    <div className="h-8 bg-[#1e222d] flex items-center px-4 border-b border-gray-800 justify-between shrink-0">
                        <span className="text-xs font-bold text-gray-300 flex items-center gap-2"><Settings2 className="w-3.5 h-3.5"/> 策略参数配置</span>
                        <button onClick={() => setStrategyParams([...strategyParams, {key: 'new_param', value: 0}])} className="text-blue-400 hover:text-white"><Plus className="w-3.5 h-3.5" /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2">
                        {strategyParams.map((param, idx) => (
                            <div key={idx} className="flex items-center gap-2 mb-2 bg-black/20 p-1 rounded">
                                <span className="text-xs text-blue-500 font-mono px-2">context.</span>
                                <input 
                                    type="text" 
                                    value={param.key} 
                                    onChange={e => { const n = [...strategyParams]; n[idx].key = e.target.value; setStrategyParams(n); }}
                                    className="w-24 bg-transparent border-b border-gray-700 text-xs text-white focus:outline-none focus:border-blue-500"
                                />
                                <span className="text-gray-500">=</span>
                                <input 
                                    type="number" 
                                    value={param.value} 
                                    onChange={e => { const n = [...strategyParams]; n[idx].value = parseFloat(e.target.value); setStrategyParams(n); }}
                                    className="flex-1 bg-transparent border-b border-gray-700 text-xs text-emerald-400 focus:outline-none focus:border-emerald-500"
                                />
                                <button onClick={() => { const n = [...strategyParams]; n.splice(idx, 1); setStrategyParams(n); }} className="text-gray-600 hover:text-rose-500"><Trash2 className="w-3 h-3" /></button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right: Simulation View */}
            <div className="w-[55%] flex flex-col bg-[#0b0e14]">
                {/* Chart Header Controls */}
                <div className="h-8 bg-[#1e222d] flex items-center px-4 justify-between shrink-0 border-b border-gray-800">
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setChartView('PRICE')}
                            className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded transition-colors ${chartView === 'PRICE' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-white'}`}
                        >
                            <CandlestickChart className="w-3 h-3" /> 行情回放
                        </button>
                        <button 
                            onClick={() => setChartView('EQUITY')}
                            className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded transition-colors ${chartView === 'EQUITY' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-white'}`}
                        >
                            <TrendingUp className="w-3 h-3" /> 资金曲线
                        </button>
                    </div>
                    {result && (
                        <div className="flex gap-3 text-[10px] font-mono">
                            <span className={`${result.performance.total_returns >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                收益: {result.performance.total_returns.toFixed(2)}%
                            </span>
                            <span className="text-orange-400">
                                回撤: {result.performance.max_drawdown.toFixed(2)}%
                            </span>
                        </div>
                    )}
                </div>

                {/* Visual Chart Area */}
                <div className="h-[60%] border-b border-gray-800 flex flex-col relative bg-black">
                    {/* View: Price Chart */}
                    {chartView === 'PRICE' && (
                        <>
                            {(displayData.length > 0 && currentStock) ? (
                                <StockChart 
                                    data={displayData}
                                    symbol={currentStock.symbol}
                                    interval="1D"
                                    indicators={['MA5', 'MA20']}
                                    tradeMarkers={displayMarkers}
                                    showGrid={true}
                                    isActive={false}
                                />
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-700">
                                    <Box className="w-12 h-12 mb-2 opacity-20" />
                                    <p className="text-xs">点击“运行回测”开始模拟</p>
                                </div>
                            )}
                        </>
                    )}

                    {/* View: Equity Curve */}
                    {chartView === 'EQUITY' && (
                        <div className="w-full h-full p-2">
                            {displayEquityCurve.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <ReAreaChart data={displayEquityCurve}>
                                        <defs>
                                            <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#089981" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#089981" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                        <XAxis dataKey="date" hide />
                                        <YAxis domain={['auto', 'auto']} stroke="#555" fontSize={10} tickFormatter={(val) => `¥${(val/10000).toFixed(1)}w`} />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#131722', border: '1px solid #333' }}
                                            itemStyle={{ color: '#fff' }}
                                            labelStyle={{ color: '#888' }}
                                            formatter={(val: number) => [`¥${val.toLocaleString()}`, '总资产']}
                                        />
                                        <Area type="monotone" dataKey="value" stroke="#089981" fillOpacity={1} fill="url(#colorEquity)" strokeWidth={2} />
                                    </ReAreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-700">
                                    <TrendingUp className="w-12 h-12 mb-2 opacity-20" />
                                    <p className="text-xs">暂无资金数据</p>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {/* Simulation Progress Overlay */}
                    {isSimulating && (
                        <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm px-2 py-1 rounded border border-gray-700 text-[10px] font-mono text-emerald-400 flex items-center gap-2 z-10">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            LIVE
                        </div>
                    )}
                </div>

                {/* Bottom: Logs, Trades & Funds */}
                <div className="h-[40%] flex flex-col min-h-0 bg-[#131722]">
                    <div className="h-8 bg-[#1e222d] flex items-center px-2 gap-1 border-b border-gray-800 shrink-0">
                        <button onClick={() => setActiveTab('CONSOLE')} className={`px-3 py-1 text-xs rounded transition-colors ${activeTab === 'CONSOLE' ? 'bg-blue-600/20 text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}>控制台</button>
                        <button onClick={() => setActiveTab('TRADES')} className={`px-3 py-1 text-xs rounded transition-colors ${activeTab === 'TRADES' ? 'bg-blue-600/20 text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}>交易明细 ({result?.orders.length || 0})</button>
                        <button onClick={() => setActiveTab('FUNDS')} className={`px-3 py-1 text-xs rounded transition-colors ${activeTab === 'FUNDS' ? 'bg-blue-600/20 text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}>资金详情</button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-2 custom-scrollbar font-mono text-xs relative" ref={scrollRef}>
                        {activeTab === 'CONSOLE' && (
                            logs.length > 0 ? logs.map((log, i) => (
                                <div key={i} className="mb-1 border-b border-gray-800/50 pb-1 leading-relaxed">
                                    <span className="opacity-40 mr-2">{log.split(']')[0]}]</span>
                                    <span className={log.includes('买入') ? 'text-emerald-400' : log.includes('卖出') ? 'text-rose-400' : log.includes('错误') ? 'text-rose-500' : 'text-gray-300'}>
                                        {log.split(']')[1]}
                                    </span>
                                </div>
                            )) : <span className="text-gray-700 italic px-2">Ready to run...</span>
                        )}

                        {activeTab === 'TRADES' && (
                            <table className="w-full text-left border-collapse">
                                <thead className="text-gray-500 sticky top-0 bg-[#131722] shadow-sm">
                                    <tr>
                                        <th className="py-1">时间</th>
                                        <th className="py-1">方向</th>
                                        <th className="py-1">价格</th>
                                        <th className="py-1">数量</th>
                                        <th className="py-1">状态</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {result?.orders.map(o => (
                                        <tr key={o.order_id} className="border-b border-gray-800/30 hover:bg-gray-800/30">
                                            <td className="py-1 opacity-60">{new Date(o.insert_date_time).toLocaleDateString()}</td>
                                            <td className={`py-1 font-bold ${o.direction==='BUY'?'text-emerald-500':'text-rose-500'}`}>{o.direction}</td>
                                            <td className="py-1">{o.limit_price?.toFixed(2)}</td>
                                            <td className="py-1">{o.volume_original}</td>
                                            <td className="py-1 text-[10px]">{o.status}</td>
                                        </tr>
                                    ))}
                                    {!result && <tr><td colSpan={5} className="text-center py-4 text-gray-700">暂无交易记录</td></tr>}
                                </tbody>
                            </table>
                        )}

                        {activeTab === 'FUNDS' && (
                            <div className="h-full p-2">
                                {accountSnapshot ? (
                                    <div className="grid grid-cols-2 gap-4 h-full">
                                        {/* Card 1: Total Assets */}
                                        <div className="bg-black/30 border border-gray-700 rounded-xl p-4 flex flex-col justify-between">
                                            <div className="text-[10px] text-gray-500 font-bold uppercase flex items-center gap-2"><Wallet className="w-3.5 h-3.5"/> 总资产 (Total Equity)</div>
                                            <div className={`text-2xl font-black font-mono ${accountSnapshot.balance >= initialCapital ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                {formatMoney(accountSnapshot.balance)}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                初始: {formatMoney(initialCapital)} 
                                                <span className={`ml-2 ${accountSnapshot.balance >= initialCapital ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                    ({((accountSnapshot.balance - initialCapital)/initialCapital * 100).toFixed(2)}%)
                                                </span>
                                            </div>
                                        </div>

                                        {/* Card 2: Market Value & Available */}
                                        <div className="bg-black/30 border border-gray-700 rounded-xl p-4 flex flex-col justify-between">
                                            <div className="flex justify-between">
                                                <div>
                                                    <div className="text-[10px] text-gray-500 font-bold uppercase flex items-center gap-1"><PieChart className="w-3 h-3"/> 持仓市值</div>
                                                    <div className="text-lg font-mono text-white">{formatMoney(accountSnapshot.market_value)}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-[10px] text-gray-500 font-bold uppercase flex items-center justify-end gap-1"><Coins className="w-3 h-3"/> 可用资金</div>
                                                    <div className="text-lg font-mono text-blue-400">{formatMoney(accountSnapshot.available)}</div>
                                                </div>
                                            </div>
                                            {/* Progress Bar */}
                                            <div className="w-full bg-gray-800 h-2 rounded-full mt-2 overflow-hidden flex">
                                                <div className="bg-blue-500 h-full" style={{ width: `${(accountSnapshot.available / accountSnapshot.balance) * 100}%` }} title="Cash" />
                                                <div className="bg-purple-500 h-full" style={{ width: `${(accountSnapshot.market_value / accountSnapshot.balance) * 100}%` }} title="Position" />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-600">
                                        <Wallet className="w-8 h-8 opacity-50 mb-2" />
                                        <p className="text-xs">运行回测以查看资金详情</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>

        {/* Risk Settings Modal */}
        {showRiskSettings && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in">
                <div className="bg-[#1e222d] border border-gray-700 rounded-xl w-80 shadow-2xl p-4">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-white flex items-center gap-2"><Shield className="w-4 h-4 text-blue-500" /> 风控参数设置</h3>
                        <button onClick={() => setShowRiskSettings(false)} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
                    </div>
                    
                    <div className="space-y-4">
                        <label className="flex items-center justify-between cursor-pointer bg-black/20 p-2 rounded">
                            <span className="text-xs text-gray-300">启用风控模块</span>
                            <input type="checkbox" checked={riskConfig.enable} onChange={e => setRiskConfig({...riskConfig, enable: e.target.checked})} className="toggle accent-blue-600" />
                        </label>
                        
                        <div>
                            <span className="text-xs text-gray-500 block mb-1">单笔最大委托金额</span>
                            <div className="flex items-center bg-black/40 rounded px-2 border border-gray-700">
                                <span className="text-gray-500 text-xs">¥</span>
                                <input 
                                    type="number" 
                                    value={riskConfig.maxSingleOrderAmount} 
                                    onChange={e => setRiskConfig({...riskConfig, maxSingleOrderAmount: Number(e.target.value)})} 
                                    className="bg-transparent border-0 w-full text-white text-sm p-1.5 focus:outline-none"
                                />
                            </div>
                        </div>

                        <div>
                            <span className="text-xs text-gray-500 block mb-1">单日最大回撤限制 (%)</span>
                            <div className="flex items-center bg-black/40 rounded px-2 border border-gray-700">
                                <input 
                                    type="number" 
                                    value={riskConfig.maxDailyDrawdownPercent} 
                                    onChange={e => setRiskConfig({...riskConfig, maxDailyDrawdownPercent: Number(e.target.value)})} 
                                    className="bg-transparent border-0 w-full text-white text-sm p-1.5 focus:outline-none"
                                />
                                <span className="text-gray-500 text-xs">%</span>
                            </div>
                        </div>
                    </div>

                    <button onClick={() => setShowRiskSettings(false)} className="w-full mt-6 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded text-xs transition-colors">
                        保存并关闭
                    </button>
                </div>
            </div>
        )}
    </div>
  );
};

export default QuantLab;
