
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Bot, Loader2, RefreshCw, Key, TrendingUp, Activity, AlertTriangle, Target, BrainCircuit, Globe, Zap, FileText, Newspaper } from 'lucide-react';
import { Stock, AgentAnalysisReport } from '../types';

interface AIAnalysisPanelProps {
  isLoading: boolean;
  analysis: string | null;
  agentReport?: AgentAnalysisReport | null;
  stock: Stock | null;
  onAnalyze: () => void;
  onOpenKeySelector?: () => void;
}

const ScoreRing = ({ score, color, label }: { score: number, color: string, label?: string }) => (
  <div className="flex flex-col items-center gap-1">
    <div className="relative w-14 h-14 flex items-center justify-center">
      <svg className="w-full h-full transform -rotate-90">
        <circle cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-gray-800" />
        <circle cx="28" cy="28" r="24" stroke={color} strokeWidth="4" fill="transparent" strokeDasharray={150} strokeDashoffset={150 - (150 * Math.max(0, Math.min(100, score))) / 100} className="transition-all duration-1000" />
      </svg>
      <span className="absolute text-xs font-black">{typeof score === 'number' ? score.toFixed(0) : '0'}</span>
    </div>
    {label && <span className="text-[9px] text-gray-500 uppercase font-bold">{label}</span>}
  </div>
);

const AIAnalysisPanel: React.FC<AIAnalysisPanelProps> = ({ isLoading, analysis, agentReport, stock, onAnalyze, onOpenKeySelector }) => {
  const [activeTab, setActiveTab] = useState<'TRADER' | 'AGENTS'>('TRADER');

  if (!stock) return <div className="p-6 text-gray-500 text-center flex flex-col items-center justify-center h-full"><Bot className="w-12 h-12 mb-4 opacity-20"/>请选择一只股票或加密货币进行分析</div>;

  const isError = analysis && analysis.includes("AI 服务暂时不可用");

  // If we have an Agent Report, render the Agent View
  if (agentReport && agentReport.decision) {
    const { technical, research, news, decision } = agentReport;
    
    return (
      <div className="h-full flex flex-col bg-gray-900 border-l border-gray-800">
        {/* Header */}
        <div className="p-3 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
          <h3 className="text-xs font-black text-blue-400 flex items-center gap-2 uppercase tracking-widest">
            <BrainCircuit className="w-4 h-4" /> ValueCell Engine
          </h3>
          <button 
            onClick={onAnalyze}
            disabled={isLoading}
            className="text-[10px] bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded flex items-center gap-1 transition-colors disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            重新研判
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800 bg-black/20">
          {[
            { id: 'TRADER', icon: Target, label: 'StrategyAgent' },
            { id: 'AGENTS', icon: Bot, label: 'Research Agents' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-2 flex items-center justify-center gap-1.5 text-[10px] font-bold transition-all border-b-2 ${activeTab === tab.id ? 'border-blue-500 text-blue-400 bg-blue-500/5' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
            >
              <tab.icon className="w-3 h-3" /> {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar pb-20">
          
          {/* TRADER VIEW */}
          {activeTab === 'TRADER' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              {/* Decision Card */}
              <div className={`p-5 rounded-2xl border flex flex-col items-center text-center relative overflow-hidden ${decision.action === 'BUY' ? 'bg-emerald-900/20 border-emerald-500/50' : decision.action === 'SELL' ? 'bg-rose-900/20 border-rose-500/50' : 'bg-yellow-900/20 border-yellow-500/50'}`}>
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                <div className="text-[10px] font-black uppercase text-gray-400 mb-2 flex items-center gap-1"><Zap className="w-3 h-3"/> 最终决策</div>
                <div className={`text-3xl font-black mb-3 ${decision.action === 'BUY' ? 'text-emerald-500 drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]' : decision.action === 'SELL' ? 'text-rose-500 drop-shadow-[0_0_10px_rgba(244,63,94,0.3)]' : 'text-yellow-500'}`}>
                  {decision.action === 'BUY' ? '强力买入' : decision.action === 'SELL' ? '强力卖出' : '观望持有'}
                </div>
                <div className="text-xs text-gray-300 px-2 leading-relaxed italic opacity-90">"{decision.reason}"</div>
              </div>

              {/* Trade Params */}
              <div className="grid grid-cols-2 gap-2">
                 <div className="bg-gray-800/50 p-2.5 rounded-lg border border-gray-700 flex flex-col items-center">
                    <span className="text-[9px] text-gray-500 uppercase font-bold">信心指数</span>
                    <span className="text-xl font-mono font-black text-white">{decision.confidence}%</span>
                 </div>
                 <div className="bg-gray-800/50 p-2.5 rounded-lg border border-gray-700 flex flex-col items-center">
                    <span className="text-[9px] text-gray-500 uppercase font-bold">目标价</span>
                    <span className="text-xl font-mono font-black text-blue-400">{decision.entryTarget}</span>
                 </div>
                 <div className="bg-gray-800/50 p-2.5 rounded-lg border border-gray-700 flex flex-col items-center relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500"/>
                    <span className="text-[9px] text-gray-500 uppercase font-bold">止损位</span>
                    <span className="text-xl font-mono font-black text-rose-400">{decision.stopLoss}</span>
                 </div>
                 <div className="bg-gray-800/50 p-2.5 rounded-lg border border-gray-700 flex flex-col items-center relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500"/>
                    <span className="text-[9px] text-gray-500 uppercase font-bold">止盈位</span>
                    <span className="text-xl font-mono font-black text-emerald-400">{decision.takeProfit}</span>
                 </div>
              </div>
            </div>
          )}

          {/* AGENTS VIEW */}
          {activeTab === 'AGENTS' && (
             <div className="space-y-4 animate-in fade-in slide-in-from-right-2">
                {/* Agent Scores Row */}
                <div className="flex justify-between px-4 bg-black/20 py-3 rounded-xl border border-gray-800">
                   <ScoreRing score={research?.score || 0} color="#8B5CF6" label="基本面 (Research)" />
                   <ScoreRing score={Math.min(100, Math.max(0, (news?.sentimentScore || 0) + 50))} color="#3B82F6" label="舆情 (News)" />
                   <ScoreRing score={technical?.trend === 'Bullish' ? 80 : technical?.trend === 'Bearish' ? 20 : 50} color="#10B981" label="趋势 (Tech)" />
                </div>

                <div className="bg-gray-800/30 border border-purple-500/20 rounded-xl p-3">
                   <h4 className="text-[10px] font-black text-purple-400 uppercase mb-2 flex items-center gap-1"><FileText className="w-3 h-3"/> DeepResearch Agent</h4>
                   <div className="text-[10px] text-gray-300 mb-2 leading-relaxed">
                      <span className="font-bold text-purple-300">Tokenomics:</span> {research?.tokenomics}
                   </div>
                   <div className="text-[10px] text-gray-400">
                      <span className="font-bold text-gray-500">Project Health:</span> {research?.projectHealth}
                   </div>
                </div>

                <div className="bg-gray-800/30 border border-blue-500/20 rounded-xl p-3">
                   <div className="flex justify-between items-center mb-2">
                       <h4 className="text-[10px] font-black text-blue-400 uppercase flex items-center gap-1"><Newspaper className="w-3 h-3"/> NewsRetrieval Agent</h4>
                       <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${news?.sentiment === 'Bullish' ? 'bg-emerald-900/30 text-emerald-400' : news?.sentiment === 'Bearish' ? 'bg-rose-900/30 text-rose-400' : 'bg-gray-700 text-gray-300'}`}>
                           {news?.sentiment}
                       </span>
                   </div>
                   <ul className="space-y-1.5">
                      {news?.headlines?.map((h, i) => (
                         <li key={i} className="text-[10px] text-gray-300 flex items-start gap-1.5 leading-tight">
                            <span className="text-blue-500 mt-0.5">•</span> {h}
                         </li>
                      ))}
                   </ul>
                </div>

                <div className="bg-gray-800/30 border border-emerald-500/20 rounded-xl p-3">
                   <h4 className="text-[10px] font-black text-emerald-400 uppercase mb-2 flex items-center gap-1"><Activity className="w-3 h-3"/> TechnicalAnalyst Agent</h4>
                   <div className="flex flex-wrap gap-1 mb-2">
                      {technical?.signals?.map((s, i) => (
                         <span key={i} className="text-[9px] bg-emerald-900/30 text-emerald-200 px-1.5 py-0.5 rounded border border-emerald-500/20">{s}</span>
                      ))}
                   </div>
                   <div className="flex justify-between text-[10px] text-gray-400 font-mono bg-black/20 p-1.5 rounded">
                      <span>支撑位: {technical?.support || 0}</span>
                      <span>压力位: {technical?.resistance || 0}</span>
                   </div>
                </div>

             </div>
          )}

        </div>
      </div>
    );
  }

  // Fallback View
  return (
    <div className="h-full flex flex-col bg-gray-900 border-l border-gray-800">
      <div className="p-3 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
        <h3 className="text-xs font-black text-blue-400 flex items-center gap-2">
          <BrainCircuit className="w-4 h-4" /> ValueCell System
        </h3>
        <div className="flex gap-2">
          <button 
            onClick={onAnalyze}
            disabled={isLoading}
            className="text-[10px] bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded flex items-center gap-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            {isLoading ? '多智能体协作中...' : '启动分析'}
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 custom-markdown pb-20">
        {isError ? (
           <div className="h-full flex flex-col items-center justify-center text-center p-4">
              <div className="w-12 h-12 bg-rose-900/20 rounded-full flex items-center justify-center mb-4 border border-rose-500/30">
                 <AlertTriangle className="w-6 h-6 text-rose-500" />
              </div>
              <p className="text-rose-400 font-bold mb-2">服务暂时不可用</p>
              <p className="text-xs text-gray-500 mb-4 max-w-[200px]">AI 服务响应超时或服务中断，请稍后重试。</p>
              <button onClick={onAnalyze} className="text-xs bg-rose-600 text-white px-4 py-2 rounded-lg font-bold">重试</button>
           </div>
        ) : analysis ? (
          <div className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown>{analysis}</ReactMarkdown>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-3">
             <div className="relative">
                <BrainCircuit className="w-12 h-12 text-gray-700" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-ping"/>
             </div>
             <p className="text-xs text-center max-w-[200px] leading-relaxed">
               <span className="font-bold text-gray-400">ValueCell Agent 系统就绪</span><br/>
               AI Core Online<br/>无需 API Key
             </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIAnalysisPanel;
