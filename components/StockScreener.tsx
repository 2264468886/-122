
import React, { useState } from 'react';
import { Search, Loader2, Filter, Zap, AlertTriangle, Check, RefreshCw, Plus, CheckCircle2, ChevronLeft, Sparkles, X } from 'lucide-react';
import { Stock } from '../types';
import { screenStocksByPrompt } from '../services/geminiService';

interface StockScreenerProps {
  stocks: Stock[];
  onSelectStock: (stock: Stock) => void;
  onAddStock?: (stock: Stock) => void;
}

const FILTER_GROUPS = [
  {
    id: 'sector',
    title: '赛道/板块 (Sector)',
    options: ['Layer 1', 'Layer 2', 'DeFi', 'GameFi', 'Meme', 'AI', 'DePin', 'RWA']
  },
  {
    id: 'metrics',
    title: '市场指标 (Metrics)',
    options: ['High Volume', 'Top Gainers', 'New Listing', 'High Volatility', 'Oversold (RSI)']
  },
  {
    id: 'fundamental',
    title: '基本面 (Fundamental)',
    options: ['High TVL', 'Active Developers', 'Low Inflation', 'VC Backed']
  }
];

const StockScreener: React.FC<StockScreenerProps> = ({ stocks, onSelectStock, onAddStock }) => {
  const [prompt, setPrompt] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [results, setResults] = useState<any[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false); 
  
  const [viewState, setViewState] = useState<'CONFIG' | 'RESULTS'>('CONFIG');

  const toggleTag = (tag: string) => {
    const newTags = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag];
    
    setSelectedTags(newTags);
    
    if (newTags.length > 0) {
      setPrompt(`${newTags.join(', ')}`);
    } else {
      setPrompt('');
    }
  };

  const handleSearch = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    setError(null);
    setResults(null);
    setIsFilterOpen(false); 

    try {
      const markets = ['CRYPTO'];
      const matches = await screenStocksByPrompt(prompt, stocks, markets);
      setResults(matches);
      setViewState('RESULTS');
    } catch (err: any) {
      setError("AI Service temporarily unavailable.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToConfig = () => {
      setViewState('CONFIG');
      setResults(null);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0b0e14] text-gray-300 font-sans relative overflow-hidden">
      
      {viewState === 'CONFIG' && (
          <div className="flex flex-col h-full">
              {/* Header */}
              <div className="h-14 border-b border-gray-800 flex items-center px-4 bg-[#131722] shrink-0 justify-between">
                <div className="flex items-center">
                    <div className="p-1.5 bg-blue-600/20 rounded-lg mr-2">
                        <Filter className="w-4 h-4 text-blue-500" />
                    </div>
                    <div>
                        <h2 className="text-sm font-black text-white tracking-wide">Crypto AI Screener</h2>
                    </div>
                </div>
                <button 
                    onClick={() => setIsFilterOpen(true)}
                    className="md:hidden p-2 text-gray-400 hover:text-white"
                >
                    <Filter className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col md:flex-row relative">
                {/* Left: Tags */}
                <div className={`
                    md:w-72 md:border-r md:border-gray-800 md:bg-[#131722]/50 md:flex md:flex-col md:relative
                    fixed inset-0 z-50 bg-[#131722] transition-transform duration-300 transform
                    ${isFilterOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                `}>
                    <div className="p-4 border-b border-gray-800 flex justify-between items-center md:hidden">
                        <h3 className="text-white font-bold">Filters</h3>
                        <button onClick={() => setIsFilterOpen(false)}><X className="w-5 h-5"/></button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
                        {FILTER_GROUPS.map(group => (
                            <div key={group.id} className="space-y-2">
                                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                    {group.title}
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {group.options.map(opt => {
                                        const isActive = selectedTags.includes(opt);
                                        return (
                                            <button
                                                key={opt}
                                                onClick={() => toggleTag(opt)}
                                                className={`
                                                    px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all duration-200 flex items-center gap-1.5 text-left
                                                    ${isActive 
                                                        ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/30' 
                                                        : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200'
                                                    }
                                                `}
                                            >
                                                {isActive && <Check className="w-3 h-3 shrink-0" />}
                                                {opt}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="p-4 border-t border-gray-800 bg-[#131722] md:bg-transparent">
                         <button 
                            onClick={() => { setSelectedTags([]); setPrompt(''); }}
                            className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold text-gray-500 hover:text-white transition-colors"
                         >
                            <RefreshCw className="w-3.5 h-3.5" /> Reset Filters
                         </button>
                    </div>
                </div>

                {/* Right: Input */}
                <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gradient-to-b from-[#131722] to-[#0b0e14] relative overflow-hidden">
                    <div className="w-full max-w-xl relative z-10 space-y-6">
                        <div className="text-center space-y-2">
                            <h3 className="text-xl md:text-2xl font-black text-white flex items-center justify-center gap-2"><Sparkles className="w-5 h-5 text-blue-500"/> AI 选币助手</h3>
                            <p className="text-xs md:text-sm text-gray-500">Use natural language. e.g., "Find high volume Layer 1 tokens with RSI under 30"</p>
                        </div>

                        <div className="bg-[#1e222d] border border-gray-700 rounded-2xl p-2 shadow-2xl transition-all focus-within:border-blue-500/50">
                            <div className="flex items-center px-3 py-2">
                                <Search className="w-4 h-4 text-gray-500 mr-3" />
                                <input 
                                  type="text" 
                                  value={prompt}
                                  onChange={(e) => setPrompt(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                  placeholder="Describe your strategy..."
                                  className="flex-1 bg-transparent border-0 text-white py-2 focus:outline-none placeholder-gray-600 text-sm font-medium"
                                />
                            </div>
                            <div className="px-1 pb-1">
                                <button 
                                  onClick={handleSearch}
                                  disabled={isLoading || !prompt.trim()}
                                  className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 active:scale-[0.99]"
                                >
                                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                                  {isLoading ? 'Scanning...' : 'Start Scan'}
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-wrap justify-center gap-2">
                            {['Meme Coin Breakout', 'Stablecoin Flows', 'Undervalued L1', 'High Yield DeFi'].map(tag => (
                                <button key={tag} onClick={() => setPrompt(tag)} className="text-[10px] bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white px-3 py-1.5 rounded-full border border-gray-700 transition-colors">
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
              </div>
          </div>
      )}

      {viewState === 'RESULTS' && (
          <div className="absolute inset-0 bg-[#0b0e14] z-20 flex flex-col animate-in slide-in-from-right-full duration-300">
              <div className="h-14 border-b border-gray-800 flex items-center px-4 bg-[#131722] shrink-0 justify-between shadow-md">
                <div className="flex items-center gap-3 overflow-hidden">
                    <button 
                        onClick={handleBackToConfig}
                        className="p-1.5 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="flex flex-col overflow-hidden">
                        <h2 className="text-sm font-black text-white tracking-wide flex items-center gap-2">
                            Scan Results <span className="text-[10px] font-normal text-gray-500 bg-gray-800 px-1.5 rounded-full">{results?.length || 0}</span>
                        </h2>
                        <span className="text-[10px] text-gray-500 truncate max-w-[200px]">{prompt}</span>
                    </div>
                </div>
                
                <button 
                    onClick={handleSearch}
                    disabled={isLoading}
                    className="p-2 bg-blue-600/10 text-blue-400 rounded-lg hover:bg-blue-600/20"
                >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : <RefreshCw className="w-4 h-4"/>}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-gradient-to-b from-[#0b0e14] to-[#131722]">
                    <div className="max-w-6xl mx-auto pb-20">
                        {isLoading ? (
                            <div className="py-20 text-center space-y-4 animate-pulse">
                               <div className="w-16 h-16 bg-blue-600/10 rounded-full mx-auto flex items-center justify-center border border-blue-500/20">
                                 <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                               </div>
                               <div>
                                   <p className="text-gray-300 font-bold text-sm">AI Analyzing Market Structure...</p>
                                   <p className="text-gray-600 text-xs mt-1">Checking Volume, On-chain data, and Indicators</p>
                               </div>
                            </div>
                        ) : error ? (
                            <div className="flex flex-col items-center justify-center py-20">
                                <AlertTriangle className="w-8 h-8 text-rose-500 mb-2" />
                                <p className="text-gray-500 text-sm">{error}</p>
                                <button onClick={handleSearch} className="mt-4 text-xs text-white bg-gray-800 px-4 py-2 rounded">Retry</button>
                            </div>
                        ) : results && results.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <Search className="w-8 h-8 text-gray-600 mb-2" />
                                <h3 className="text-gray-400 font-bold text-sm">No matches found</h3>
                                <button onClick={handleBackToConfig} className="mt-4 text-xs text-blue-400 font-bold">Modify Filters</button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {results?.map((item, idx) => {
                                    const realStock = stocks.find(s => s.symbol === item.symbol);
                                    const displayStock = realStock || item;
                                    const isWatched = stocks.some(s => s.symbol === item.symbol);
                                    
                                    return (
                                        <div 
                                            key={idx}
                                            onClick={() => onSelectStock(displayStock)}
                                            className="group bg-[#1e222d] border border-gray-700 hover:border-blue-500/50 rounded-xl p-4 cursor-pointer relative overflow-hidden"
                                        >
                                            <div className="flex justify-between items-start mb-3 relative z-10">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-[#131722] rounded-lg flex items-center justify-center font-black text-gray-500 border border-gray-800">
                                                        {displayStock.symbol.substring(0, 1)}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-white font-bold text-sm leading-none mb-1">{displayStock.name}</h4>
                                                        <span className="text-[10px] text-gray-500 font-mono">{displayStock.symbol}</span>
                                                    </div>
                                                </div>
                                                <span className="text-[9px] font-black px-1.5 py-0.5 rounded border bg-gray-800 border-gray-700 text-gray-400">
                                                    {displayStock.sector}
                                                </span>
                                            </div>

                                            <div className="space-y-2 relative z-10">
                                                <div className="flex justify-between items-end pb-2 border-b border-gray-800">
                                                    <div className="text-sm font-mono font-bold text-white">${displayStock.price?.toLocaleString()}</div>
                                                    <div className={`text-xs font-mono font-bold ${displayStock.changePercent >= 0 ? 'text-brand-up' : 'text-brand-down'}`}>
                                                        {displayStock.changePercent > 0 ? '+' : ''}{displayStock.changePercent?.toFixed(2)}%
                                                    </div>
                                                </div>

                                                <div className="text-[10px] text-gray-400 leading-tight bg-black/20 p-2 rounded border border-gray-800/50 min-h-[2.5rem]">
                                                    <span className="text-blue-500 font-bold mr-1">AI:</span>
                                                    {item.reason || "Matched criteria"}
                                                </div>

                                                <div className="pt-1 flex gap-2">
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (!isWatched && onAddStock) onAddStock(displayStock);
                                                        }}
                                                        disabled={isWatched}
                                                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${isWatched ? 'bg-emerald-900/20 text-emerald-500 border border-emerald-500/30' : 'bg-blue-600 text-white'}`}
                                                    >
                                                        {isWatched ? <><CheckCircle2 className="w-3 h-3"/> Added</> : <><Plus className="w-3 h-3"/> Add to Watchlist</>}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default StockScreener;
