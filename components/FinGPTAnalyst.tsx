
import React, { useState } from 'react';
import { Newspaper, Send, Loader2, BarChart2, FileText, AlertTriangle, TrendingUp, Globe, Link, ToggleLeft, ToggleRight, Key } from 'lucide-react';
import { runFinGPTAnalysis } from '../services/geminiService';
import { FinGPTAnalysisResult } from '../types';

const FinGPTAnalyst: React.FC = () => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FinGPTAnalysisResult | null>(null);
  
  // New State for Real-Time Search
  const [useLiveSearch, setUseLiveSearch] = useState(false);
  const [apiKey, setApiKey] = useState('');

  const handleAnalyze = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      // Pass apiKey if live search is enabled
      const keyToUse = useLiveSearch ? apiKey : undefined;
      const data = await runFinGPTAnalysis(input, keyToUse);
      setResult(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0b0e14] text-gray-300 font-sans overflow-hidden">
      {/* Header */}
      <div className="h-16 border-b border-gray-800 flex items-center px-6 bg-[#131722] shrink-0 justify-between">
        <div className="flex items-center">
            <div className="p-2 bg-purple-600/20 rounded-lg mr-3">
                <Newspaper className="w-5 h-5 text-purple-500" />
            </div>
            <div>
                <h2 className="text-lg font-black text-white tracking-wide">FinGPT Crypto Analyst</h2>
                <div className="text-[10px] text-gray-500 flex items-center gap-2">
                    <span>Sentiment Analysis</span>
                    <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                    <span>On-chain Insight</span>
                    <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                    <span>Web Grounding</span>
                </div>
            </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        <div className="max-w-4xl mx-auto space-y-6">
            
            {/* Input Section */}
            <div className="bg-[#1e222d] border border-gray-700 rounded-2xl p-6 shadow-xl">
                <div className="flex justify-between items-center mb-3">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                        Analyze Asset / Protocol / Narrative
                    </label>
                    
                    {/* Live Search Toggle */}
                    <div className="flex items-center gap-3">
                        {useLiveSearch && (
                            <div className="flex items-center bg-black/40 border border-gray-600 rounded px-2 py-1">
                                <Key className="w-3 h-3 text-yellow-500 mr-2" />
                                <input 
                                    type="password" 
                                    placeholder="Enter Gemini API Key" 
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    className="bg-transparent text-[10px] text-white focus:outline-none w-32"
                                />
                            </div>
                        )}
                        <button 
                            onClick={() => setUseLiveSearch(!useLiveSearch)}
                            className={`flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded transition-colors ${useLiveSearch ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'bg-gray-800 text-gray-500 border border-gray-700'}`}
                        >
                            {useLiveSearch ? <Globe className="w-3 h-3" /> : <ToggleLeft className="w-3 h-3" />}
                            {useLiveSearch ? 'Live Web Search ON' : 'Offline Mode'}
                        </button>
                    </div>
                </div>

                <div className="relative">
                    <textarea 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="e.g. 'Analyze Ethereum L2 TVL growth' or 'Forecast SOL price based on NFT volume'..."
                        className="w-full h-24 bg-black/40 border border-gray-700 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-purple-500 resize-none leading-relaxed"
                        onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAnalyze(); } }}
                    />
                    <button 
                        onClick={handleAnalyze}
                        disabled={loading || !input.trim() || (useLiveSearch && !apiKey)}
                        className="absolute bottom-3 right-3 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        {loading ? (useLiveSearch ? 'Crawling Web...' : 'Analyzing Local...') : 'Analyze'}
                    </button>
                </div>
                <div className="flex gap-2 mt-3">
                    {['Bitcoin Halving Impact', 'Ethereum Layer 2 Wars', 'Solana DeFi Growth', 'Meme Coin Supercycle'].map(tag => (
                        <button key={tag} onClick={() => setInput(tag)} className="text-[10px] bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded text-gray-400 transition-colors border border-gray-700">
                            {tag}
                        </button>
                    ))}
                </div>
            </div>

            {/* Results Area */}
            {loading && (
                <div className="text-center py-20 animate-pulse">
                    <div className="w-16 h-16 bg-purple-600/10 rounded-full mx-auto flex items-center justify-center mb-4 border border-purple-500/20">
                        <Globe className="w-8 h-8 text-purple-500 animate-spin-slow" />
                    </div>
                    <h3 className="text-white font-bold mb-1">FinGPT {useLiveSearch ? 'Crawling Global Network' : 'Processing Local Data'}</h3>
                    <p className="text-xs text-gray-500">Retrieving data, sentiment, and whitepapers...</p>
                </div>
            )}

            {result && !loading && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-bottom-4 duration-500">
                    
                    {/* Sentiment Card */}
                    <div className="bg-[#1e222d] border border-gray-700 rounded-xl p-5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <BarChart2 className="w-20 h-20 text-purple-500" />
                        </div>
                        <div className="flex items-center gap-2 mb-4">
                            <BarChart2 className="w-4 h-4 text-purple-400" />
                            <h3 className="font-bold text-white">Sentiment Analysis (CT)</h3>
                        </div>
                        
                        <div className="flex items-center gap-4 mb-4">
                            <div className={`text-4xl font-black ${result.sentiment.score > 0 ? 'text-emerald-400' : result.sentiment.score < 0 ? 'text-rose-400' : 'text-yellow-400'}`}>
                                {(result.sentiment.score * 100).toFixed(0)}
                            </div>
                            <div>
                                <div className="text-xs text-gray-400 font-bold uppercase">Score</div>
                                <div className={`text-sm font-bold ${result.sentiment.label === 'Bullish' ? 'text-emerald-400' : result.sentiment.label === 'Bearish' ? 'text-rose-400' : 'text-yellow-400'}`}>
                                    {result.sentiment.label}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            {result.sentiment.sources.map((src, i) => (
                                <div key={i} className="flex justify-between text-xs bg-black/20 p-2 rounded border border-gray-800">
                                    <span className="text-gray-400 flex items-center gap-1"><Globe className="w-3 h-3"/> {src.source}</span>
                                    <span className={src.mood.includes('Optimistic') || src.mood.includes('Bullish') ? 'text-emerald-400' : 'text-gray-400'}>{src.mood.slice(0, 30)}...</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Prediction Card */}
                    <div className="bg-[#1e222d] border border-gray-700 rounded-xl p-5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <TrendingUp className="w-20 h-20 text-blue-500" />
                        </div>
                        <div className="flex items-center gap-2 mb-4">
                            <TrendingUp className="w-4 h-4 text-blue-400" />
                            <h3 className="font-bold text-white">Price Forecast</h3>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <div className="text-[10px] text-gray-500 font-black uppercase mb-1">Short Term</div>
                                <p className="text-sm text-gray-200 leading-relaxed">{result.prediction.shortTerm}</p>
                            </div>
                            <div>
                                <div className="text-[10px] text-gray-500 font-black uppercase mb-1">Long Term</div>
                                <p className="text-sm text-gray-200 leading-relaxed">{result.prediction.longTerm}</p>
                            </div>
                            <div className="w-full bg-gray-800 h-1.5 rounded-full mt-2">
                                <div className="bg-blue-500 h-full rounded-full" style={{width: `${result.prediction.confidence}%`}}></div>
                            </div>
                            <div className="text-[9px] text-right text-blue-400 font-mono">Confidence: {result.prediction.confidence}%</div>
                        </div>
                    </div>

                    {/* Narrative & Summary */}
                    <div className="col-span-1 md:col-span-2 bg-[#1e222d] border border-gray-700 rounded-xl p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <FileText className="w-4 h-4 text-emerald-400" />
                            <h3 className="font-bold text-white">Narrative & Deep Dive</h3>
                        </div>
                        
                        <p className="text-sm text-gray-300 mb-4 leading-relaxed bg-black/20 p-3 rounded border border-gray-800">
                            {result.narrative.summary}
                        </p>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <h4 className="text-[10px] font-black text-gray-500 uppercase mb-2">Key Events</h4>
                                <ul className="space-y-1">
                                    {result.narrative.keyEvents.map((ev, i) => (
                                        <li key={i} className="text-xs text-gray-300 flex items-start gap-1.5">
                                            <span className="text-emerald-500 mt-0.5">•</span> {ev}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div>
                                <h4 className="text-[10px] font-black text-gray-500 uppercase mb-2">Risk Factors</h4>
                                <ul className="space-y-1">
                                    {result.narrative.riskFactors.map((risk, i) => (
                                        <li key={i} className="text-xs text-rose-300 flex items-start gap-1.5">
                                            <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" /> {risk}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {/* Web Sources Grounding (New) */}
                        {result.webSources && result.webSources.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-800">
                                <h4 className="text-[10px] font-black text-blue-400 uppercase mb-2 flex items-center gap-1">
                                    <Globe className="w-3 h-3" /> Grounding Sources (Google Search)
                                </h4>
                                <div className="grid grid-cols-1 gap-1">
                                    {result.webSources.map((src, i) => (
                                        <a key={i} href={src.uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-gray-400 hover:text-blue-400 transition-colors truncate p-1 hover:bg-black/20 rounded">
                                            <Link className="w-3 h-3 shrink-0 opacity-50" />
                                            <span className="truncate">{src.title}</span>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

                        {result.whitepaperAnalysis && !result.webSources && (
                            <div className="mt-4 pt-4 border-t border-gray-800">
                                <div className="flex justify-between items-end mb-2">
                                    <h4 className="text-[10px] font-black text-purple-400 uppercase">Innovation & Tokenomics</h4>
                                    <span className="text-lg font-black text-white">{result.whitepaperAnalysis.innovationScore}/10</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="bg-purple-900/10 border border-purple-500/20 p-2 rounded">
                                        <span className="text-purple-400 font-bold block mb-1">Mechanism / Tech</span>
                                        <span className="text-gray-300">{result.whitepaperAnalysis.techStack}</span>
                                    </div>
                                    <div className="bg-purple-900/10 border border-purple-500/20 p-2 rounded">
                                        <span className="text-purple-400 font-bold block mb-1">Token Utility</span>
                                        <span className="text-gray-300">{result.whitepaperAnalysis.utility}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default FinGPTAnalyst;
