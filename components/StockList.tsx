
import React, { useState } from 'react';
import { Stock, AgentAnalysisReport } from '../types';
import { Search, Loader2, Bot, BrainCircuit, Zap, BarChart3, Trash2 } from 'lucide-react';
import { runMultiAgentAnalysis } from '../services/geminiService';
import { getCryptoCandles } from '../services/cryptoService';

interface StockListProps {
  stocks: Stock[];
  selectedStock: Stock | null;
  onSelect: (stock: Stock) => void;
  onTrade: (stock: Stock, type: 'BUY' | 'SELL') => void;
  onDelete?: (symbol: string) => void;
}

const StockList: React.FC<StockListProps> = ({ stocks, selectedStock, onSelect, onTrade, onDelete }) => {
  const [agentResults, setAgentResults] = useState<Record<string, AgentAnalysisReport['decision'] | 'loading'>>({});
  const [isScanningAll, setIsScanningAll] = useState(false);

  const analyzeSingleStock = async (stock: Stock) => {
      setAgentResults(prev => ({ ...prev, [stock.symbol]: 'loading' }));
      try {
          // Use Real Data for Agent Analysis
          const history = await getCryptoCandles(stock.symbol);
          
          const report = await runMultiAgentAnalysis(stock, history);
          setAgentResults(prev => {
              const next = { ...prev };
              if (report) {
                  next[stock.symbol] = report.decision;
              } else {
                  delete next[stock.symbol];
              }
              return next;
          });
      } catch (err) {
          console.error(`Analysis failed for ${stock.symbol}`, err);
          setAgentResults(prev => {
               const next = { ...prev };
               delete next[stock.symbol];
               return next;
          });
      }
  };

  const handleManualAnalyze = async (e: React.MouseEvent, stock: Stock) => {
    e.stopPropagation();
    if (agentResults[stock.symbol] === 'loading') return;
    await analyzeSingleStock(stock);
  };

  const handleAnalyzeAll = async () => {
    if (isScanningAll) return;
    setIsScanningAll(true);

    const stocksToAnalyze = stocks.filter(s => agentResults[s.symbol] !== 'loading');

    for (const stock of stocksToAnalyze) {
        analyzeSingleStock(stock); 
        await new Promise(resolve => setTimeout(resolve, 1500)); 
    }

    setIsScanningAll(false);
  };

  return (
    <div className="w-full h-full flex flex-col bg-app-surface border-l border-app-border relative overflow-hidden">
      {/* Search & Global Actions */}
      <div className="p-3 border-b border-app-border shrink-0 flex flex-col gap-2">
        <div className="relative group">
          <input 
            type="text" 
            placeholder="搜索股票代码/名称..." 
            className="w-full bg-app-bg text-app-text text-aux rounded py-1.5 pl-8 pr-3 border border-app-border focus:border-blue-500 focus:outline-none transition-colors"
          />
          <Search className="w-3.5 h-3.5 text-app-text-muted absolute left-2.5 top-1/2 -translate-y-1/2 group-focus-within:text-blue-500" />
        </div>
        
        {/* 全集扫描按钮 */}
        <button 
            onClick={handleAnalyzeAll}
            disabled={isScanningAll}
            className={`
                flex items-center justify-center gap-2 py-2 rounded-md text-[10px] font-black uppercase tracking-wider transition-all border
                ${isScanningAll 
                    ? 'bg-blue-600/20 border-blue-500/50 text-blue-400 cursor-wait' 
                    : 'bg-brand-up/10 border-brand-up/30 text-brand-up hover:bg-brand-up hover:text-white'}
            `}
        >
            {isScanningAll ? (
                <><Loader2 className="w-3 h-3 animate-spin" /> 智能扫描中...</>
            ) : (
                <><Zap className="w-3 h-3" /> 启动全市场智能监控</>
            )}
        </button>
      </div>
      
      {/* Column Headers */}
      <div className="flex items-center px-3 py-2 bg-app-surface/50 text-[10px] text-app-text-muted font-black tracking-widest border-b border-app-border uppercase shrink-0">
        <div className="w-24">标的</div>
        <div className="flex-1 text-center text-blue-500 flex items-center justify-center gap-1">
            <BrainCircuit className="w-3 h-3" /> AI 信号
        </div>
        <div className="w-20 text-right">最新价</div>
      </div>

      {/* Stock List */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-20">
        {stocks.map((stock) => {
          const isUp = stock.change >= 0;
          const result = agentResults[stock.symbol];
          const isLoading = result === 'loading';
          const hasResult = typeof result === 'object';
          
          return (
            <div
              key={stock.symbol}
              onClick={() => onSelect(stock)}
              className={`px-3 py-3 border-b border-app-border/30 cursor-pointer hover:bg-blue-500/5 transition-all flex items-center gap-2 group
                ${selectedStock?.symbol === stock.symbol ? 'bg-blue-600/5 border-l-2 border-l-blue-500 pl-[10px]' : ''}
              `}
            >
              {/* Left: Name & Symbol */}
              <div className="w-24 shrink-0 min-w-0">
                  <div className="font-black text-app-text text-aux truncate">{stock.name}</div>
                  <div className="text-[10px] text-app-text-muted font-bold truncate flex items-center gap-1">
                      {stock.symbol}
                      <span className="bg-gray-800 text-gray-400 px-1 rounded text-[8px] scale-90 origin-left">{stock.market}</span>
                  </div>
              </div>
              
              {/* Center: AI Action Button or Result */}
              <div className="flex-1 flex justify-center items-center h-full relative">
                 {isLoading ? (
                     <div className="flex items-center gap-1 text-[9px] text-blue-500">
                         <Loader2 className="w-3.5 h-3.5 animate-spin" /> 
                         <span className="animate-pulse">Thinking</span>
                     </div>
                 ) : hasResult ? (
                     // Show Result Badge
                     <div className={`
                        flex flex-col items-center justify-center px-3 py-1 rounded border shadow-sm transition-all animate-in zoom-in cursor-help
                        ${result.action === 'BUY' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 
                          result.action === 'SELL' ? 'bg-rose-500/10 border-rose-500/30 text-rose-500' : 
                          'bg-yellow-500/10 border-yellow-500/30 text-yellow-500'}
                     `} title={result.reason}>
                        <span className="text-[10px] font-black uppercase tracking-wider leading-none mb-0.5">
                            {result.action === 'BUY' ? '看多' : result.action === 'SELL' ? '看空' : '观望'}
                        </span>
                        <div className="flex items-center gap-1">
                            <span className="text-[8px] opacity-80 font-mono">信度: {result.confidence}%</span>
                        </div>
                     </div>
                 ) : (
                     // Show Analyze Button
                     <button 
                        onClick={(e) => handleManualAnalyze(e, stock)}
                        className="group/btn flex items-center gap-1.5 px-2 py-1 rounded-full bg-app-bg border border-app-border hover:border-blue-500 hover:bg-blue-500/10 hover:text-blue-500 text-gray-400 transition-all shadow-sm"
                        title={`对 ${stock.name} 进行多智能体分析`}
                     >
                        <Bot className="w-3.5 h-3.5 group-hover/btn:scale-110 transition-transform" />
                        <span className="text-[10px] font-bold">Agents</span>
                     </button>
                 )}
              </div>

              {/* Right: Price */}
              <div className="w-20 shrink-0 text-right">
                  <div className={`font-mono text-aux font-black ${isUp ? 'text-brand-up' : 'text-brand-down'}`}>
                    {stock.price.toFixed(2)}
                  </div>
                  <div className={`text-[10px] font-bold ${isUp ? 'text-brand-up' : 'text-brand-down'}`}>
                    {isUp ? '+' : ''}{stock.changePercent.toFixed(2)}%
                  </div>
              </div>

              {/* Action Menu (Floating on Hover) */}
              {!isLoading && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all bg-app-surface shadow-xl rounded-lg p-1 border border-app-border z-10 translate-x-4 group-hover:translate-x-0">
                    <button 
                      onClick={(e) => { e.stopPropagation(); onTrade(stock, 'BUY'); }}
                      className="px-2 py-1 bg-brand-up text-white rounded text-[9px] font-bold hover:brightness-110 shadow-sm"
                    >
                      买
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onTrade(stock, 'SELL'); }}
                      className="px-2 py-1 bg-brand-down text-white rounded text-[9px] font-bold hover:brightness-110 shadow-sm"
                    >
                      卖
                    </button>
                    {onDelete && (
                        <div className="w-px h-3 bg-gray-700 mx-0.5"></div>
                    )}
                    {onDelete && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(stock.symbol); }}
                            className="p-1 text-gray-500 hover:text-white hover:bg-rose-500 rounded transition-colors"
                            title="删除自选"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    )}
                  </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StockList;
