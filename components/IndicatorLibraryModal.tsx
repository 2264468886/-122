
import React, { useState, useMemo } from 'react';
import { X, Library, Wand, Plus, Loader2, Code, Play, Search, Layers, Trash2 } from 'lucide-react';
import { generateIndicatorFormula } from '../services/geminiService';
import { SubIndicatorConfig } from '../types';

interface IndicatorLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddIndicator: (type: SubIndicatorConfig['type'], name: string, formula?: string) => void;
  activeIndicators: SubIndicatorConfig[];
  onRemoveIndicator: (id: string) => void;
}

const PREDEFINED_INDICATORS = [
  { type: 'VOL', name: '成交量 (VOL)', category: 'Volume' },
  { type: 'MACD', name: '指数平滑异同平均 (MACD)', category: 'Trend' },
  { type: 'RSI', name: '相对强弱指数 (RSI)', category: 'Momentum' },
  { type: 'StochRSI', name: '随机相对强弱 (StochRSI)', category: 'Momentum' },
  { type: 'KDJ', name: '随机指标 (KDJ)', category: 'Momentum' },
  { type: 'MFI', name: '资金流量指标 (MFI)', category: 'Volume' },
  { type: 'CCI', name: '商品通道指数 (CCI)', category: 'Momentum' },
  { type: 'ROC', name: '变动率指标 (ROC)', category: 'Momentum' },
  { type: 'ATR', name: '平均真实波幅 (ATR)', category: 'Volatility' },
  { type: 'OBV', name: '能量潮 (OBV)', category: 'Volume' },
  { type: 'DMI', name: '动向指标 (DMI/ADX)', category: 'Trend' },
  { type: 'WR', name: '威廉指标 (W%R)', category: 'Momentum' },
  { type: 'AROON', name: '阿隆指标 (Aroon)', category: 'Trend' },
  { type: 'TRIX', name: '三重指数平滑平均 (TRIX)', category: 'Trend' },
  { type: 'UO', name: '终极震荡指标 (UO)', category: 'Momentum' },
  { type: 'VR', name: '成交量比率 (VR)', category: 'Volume' },
  { type: 'DMA', name: '平均线差 (DMA)', category: 'Trend' },
  { type: 'BIAS', name: '乖离率 (BIAS)', category: 'Momentum' },
  { type: 'MTM', name: '动量指标 (MTM)', category: 'Momentum' },
  { type: 'PSY', name: '心理线 (PSY)', category: 'Momentum' },
  { type: 'CR', name: '能量指标 (CR)', category: 'Momentum' },
  { type: 'EMV', name: '简易波动 (EMV)', category: 'Volume' },
  { type: 'WVAD', name: '威廉变异离散量 (WVAD)', category: 'Volume' },
  { type: 'CHO', name: '佳庆指标 (CHO)', category: 'Trend' },
];

const CATEGORIES = ['Trend', 'Momentum', 'Volatility', 'Volume'];

const DEFAULT_CODE_TEMPLATE = `/**
 * 自定义指标脚本
 * @param {Array} data - K线数据对象数组
 * @param {Object} utils - { open, high, low, close, volume } 数据序列(数组)
 * @returns {Array} 指标数值数组 (长度需与 data 一致)
 */
function calculate(data, { close, open, high, low, volume }) {
  // 示例：计算收盘价的 10 周期简单移动平均 (SMA)
  const period = 10;
  const result = [];
  
  for (let i = 0; i < close.length; i++) {
    if (i < period - 1) {
      result.push(null); // 数据不足时填充 null
      continue;
    }
    
    // 计算切片和
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += close[i - j];
    }
    
    result.push(sum / period);
  }
  
  return result;
}`;

const IndicatorLibraryModal: React.FC<IndicatorLibraryModalProps> = ({ isOpen, onClose, onAddIndicator, activeIndicators, onRemoveIndicator }) => {
  const [activeTab, setActiveTab] = useState<'library' | 'ai' | 'code' | 'active'>('library');
  const [searchQuery, setSearchQuery] = useState('');
  const [prompt, setPrompt] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [customCode, setCustomCode] = useState(DEFAULT_CODE_TEMPLATE);
  const [indicatorName, setIndicatorName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const filteredIndicators = useMemo(() => {
    if (!searchQuery) return PREDEFINED_INDICATORS;
    return PREDEFINED_INDICATORS.filter(ind => 
      ind.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      ind.type.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const handleGenerate = async () => {
    if (!prompt) return;
    setIsLoading(true);
    setError('');
    setGeneratedCode('');
    try {
      const code = await generateIndicatorFormula(prompt);
      setGeneratedCode(code);
      setIndicatorName(prompt.slice(0, 15)); // Default name
    } catch (err: any) {
      setError(err.message || 'Failed to generate indicator.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAI = () => {
    if (generatedCode && indicatorName) {
      onAddIndicator('CUSTOM', indicatorName, generatedCode);
      resetState();
      onClose();
    }
  };

  const handleAddCode = () => {
    if (!indicatorName.trim()) {
      setError("请输入指标名称");
      return;
    }
    onAddIndicator('CUSTOM', indicatorName, customCode);
    resetState();
    onClose();
  };

  const resetState = () => {
    setPrompt('');
    setGeneratedCode('');
    setCustomCode(DEFAULT_CODE_TEMPLATE);
    setIndicatorName('');
    setError('');
    setSearchQuery('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#131722] border border-gray-700 rounded-2xl w-[640px] h-[520px] shadow-2xl flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-[#1e222d]/50">
          <h2 className="text-aux font-black text-white tracking-widest uppercase flex items-center gap-2">
            副图指标库
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar Navigation */}
          <div className="w-40 border-r border-gray-800 bg-black/20 p-2 flex flex-col gap-1">
            <button onClick={() => setActiveTab('library')} className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold text-left transition-all ${activeTab === 'library' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-800'}`}>
              <Library className="w-4 h-4" /> 标准指标库
            </button>
            <button onClick={() => setActiveTab('active')} className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold text-left transition-all ${activeTab === 'active' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-800'}`}>
              <Layers className="w-4 h-4" /> 当前已添加 <span className="ml-auto opacity-60 bg-black/20 px-1.5 rounded">{activeIndicators.length}</span>
            </button>
            <div className="h-px bg-gray-800 my-1 mx-2" />
            <button onClick={() => setActiveTab('code')} className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold text-left transition-all ${activeTab === 'code' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-800'}`}>
              <Code className="w-4 h-4" /> 代码编辑器
            </button>
            <button onClick={() => setActiveTab('ai')} className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold text-left transition-all ${activeTab === 'ai' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-800'}`}>
              <Wand className="w-4 h-4" /> AI 生成
            </button>
          </div>
          
          <div className="flex-1 flex flex-col overflow-hidden">
            
            {/* STANDARD LIBRARY TAB */}
            {activeTab === 'library' && (
              <div className="flex-1 flex flex-col p-4 overflow-hidden">
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input 
                        type="text" 
                        placeholder="搜索副图指标..." 
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full bg-black border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                        autoFocus
                    />
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
                  {CATEGORIES.map(category => {
                    const items = filteredIndicators.filter(i => i.category === category);
                    if (items.length === 0) return null;
                    
                    return (
                      <div key={category}>
                        <p className="text-[10px] font-black text-blue-500/60 uppercase tracking-widest mb-2 px-3">{category}</p>
                        <div className="space-y-1">
                          {items.map(ind => (
                            <button
                                key={ind.type}
                                onClick={() => onAddIndicator(ind.type as any, ind.name)}
                                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all hover:bg-gray-800 text-gray-400 hover:text-white group"
                            >
                              <div className="flex flex-col items-start">
                                <span className="text-xs font-bold group-hover:text-blue-400 transition-colors">{ind.name}</span>
                              </div>
                              <Plus className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-blue-500" />
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  
                  {filteredIndicators.length === 0 && (
                      <div className="text-center text-gray-500 text-xs py-10">未找到相关指标</div>
                  )}
                </div>
              </div>
            )}

            {/* ACTIVE INDICATORS TAB */}
            {activeTab === 'active' && (
              <div className="flex-1 flex flex-col p-4 overflow-hidden">
                <p className="text-[10px] text-app-text-muted font-bold uppercase mb-3 px-1">当前已开启的副图指标</p>
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2">
                   {activeIndicators.length === 0 ? (
                      <div className="h-40 flex flex-col items-center justify-center text-gray-600 gap-2 border border-dashed border-gray-800 rounded-xl">
                          <Layers className="w-8 h-8 opacity-50" />
                          <p className="text-xs font-bold">暂无指标</p>
                          <p className="text-[10px]">请从指标库添加</p>
                      </div>
                   ) : (
                      activeIndicators.map(ind => (
                          <div key={ind.id} className="bg-[#1e222d] border border-gray-700 rounded-xl p-3 flex items-center justify-between group hover:border-blue-500/50 transition-all">
                              <div className="flex flex-col">
                                  <div className="flex items-center gap-2">
                                      <span className="text-sm font-bold text-white">{ind.name}</span>
                                      {ind.type === 'CUSTOM' && <span className="text-[9px] bg-blue-900/40 text-blue-300 px-1.5 py-0.5 rounded font-black tracking-wider">SCRIPT</span>}
                                  </div>
                                  <span className="text-[10px] text-gray-500 font-mono mt-0.5 opacity-60">ID: {ind.id}</span>
                              </div>
                              <button 
                                onClick={() => onRemoveIndicator(ind.id)}
                                className="p-2 text-gray-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                                title="移除指标"
                              >
                                  <Trash2 className="w-4 h-4" />
                              </button>
                          </div>
                      ))
                   )}
                </div>
              </div>
            )}

            {/* CODE EDITOR TAB */}
            {activeTab === 'code' && (
              <div className="flex flex-col h-full gap-3 p-4">
                <div className="flex justify-between items-center">
                  <p className="text-[10px] text-app-text-muted font-bold uppercase">编写自定义 JavaScript 脚本</p>
                </div>
                
                <input 
                  type="text" 
                  placeholder="给您的指标起个名字 (如: My SMA)" 
                  value={indicatorName} 
                  onChange={e => { setIndicatorName(e.target.value); setError(''); }}
                  className="w-full bg-app-bg border border-app-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 text-white" 
                />
                
                <div className="flex-1 relative border border-gray-700 rounded-lg overflow-hidden bg-[#0d1117]">
                  <textarea 
                    value={customCode} 
                    onChange={(e) => setCustomCode(e.target.value)} 
                    className="w-full h-full bg-transparent text-gray-300 font-mono text-xs p-3 focus:outline-none resize-none"
                    spellCheck="false"
                  />
                </div>

                {error && <p className="text-xs text-rose-500 bg-rose-500/10 p-2 rounded">{error}</p>}
                
                <button onClick={handleAddCode} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2 transition-all">
                  <Play className="w-4 h-4" /> 保存并应用脚本
                </button>
              </div>
            )}

            {/* AI GENERATOR TAB */}
            {activeTab === 'ai' && (
              <div className="flex flex-col h-full gap-3 p-4">
                <p className="text-[10px] text-app-text-muted font-bold uppercase">用自然语言描述您想要的指标</p>
                <textarea 
                  value={prompt} 
                  onChange={(e) => setPrompt(e.target.value)} 
                  placeholder="例如：请帮我写一个 20 日的加权移动平均线 (WMA)，并在上涨时显示红色，下跌时显示绿色。"
                  className="w-full h-24 bg-app-bg border border-app-border rounded-lg p-3 text-sm focus:outline-none focus:border-blue-500 resize-none" 
                />
                <button onClick={handleGenerate} disabled={isLoading} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 transition-all">
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand className="w-4 h-4" />} {isLoading ? 'AI 正在思考...' : '生成指标代码'}
                </button>
                
                {generatedCode && (
                  <div className="flex-1 flex flex-col gap-2 p-3 bg-app-bg border border-app-border rounded-lg animate-in fade-in overflow-hidden">
                    <div className="flex gap-2">
                       <input type="text" placeholder="指标名称" value={indicatorName} onChange={e => setIndicatorName(e.target.value)} className="flex-1 bg-app-surface border border-app-border rounded px-2 py-1 text-sm focus:outline-none text-white" />
                       <button onClick={handleAddAI} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-1 rounded text-xs transition-all">应用</button>
                    </div>
                    <pre className="text-[9px] bg-black/50 p-2 rounded overflow-auto flex-1 text-emerald-400 font-mono custom-scrollbar">{generatedCode}</pre>
                  </div>
                )}
                {error && <p className="text-xs text-rose-500">{error}</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IndicatorLibraryModal;
