
import React, { useState, useMemo } from 'react';
import { X, Search, Settings2, Trash2, Eye, EyeOff, GripVertical, History } from 'lucide-react';
import { IndicatorConfig } from '../types';

interface IndicatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeIndicators: IndicatorConfig[];
  onToggle: (id: string) => void;
  onUpdate: (config: IndicatorConfig) => void;
  onRemove: (id: string) => void;
  recentIndicators: string[];
}

const ALL_INDICATORS: { id: string, name: string, category: IndicatorConfig['category'] }[] = [
  { id: 'MA5', name: '均线 MA5', category: 'Trend' },
  { id: 'MA10', name: '均线 MA10', category: 'Trend' },
  { id: 'MA20', name: '均线 MA20', category: 'Trend' },
  { id: 'MA60', name: '均线 MA60', category: 'Trend' },
  { id: 'WMA20', name: '加权均线 WMA20', category: 'Trend' },
  { id: 'BOLL', name: '布林带 BOLL', category: 'Volatility' },
  { id: 'KELTNER', name: '肯特纳通道 Keltner', category: 'Volatility' },
  { id: 'ICHIMOKU', name: '一目均衡表 Ichimoku', category: 'Trend' },
  { id: 'SUPERTREND', name: '超级趋势 SuperTrend', category: 'Trend' },
  { id: 'ALLIGATOR', name: '鳄鱼线 Alligator', category: 'Trend' },
  { id: 'SAR', name: '抛物线转向 SAR', category: 'Trend' },
  { id: 'DONCHIAN', name: '唐奇安通道 DC', category: 'Volatility' },
  { id: 'VWAP', name: '成交量加权均价 VWAP', category: 'Volume' },
];

const IndicatorModal: React.FC<IndicatorModalProps> = ({ 
  isOpen, onClose, activeIndicators, onToggle, onUpdate, onRemove, recentIndicators 
}) => {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'Search' | 'Active'>('Search');

  const filtered = useMemo(() => {
    return ALL_INDICATORS.filter(i => 
      i.name.toLowerCase().includes(search.toLowerCase()) || 
      i.id.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#131722] border border-gray-700 rounded-2xl w-[640px] h-[520px] shadow-2xl flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-[#1e222d]/50">
          <h2 className="text-aux font-black text-white tracking-widest uppercase flex items-center gap-2">
            指标管理器
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Tabs Sidebar */}
          <div className="w-36 border-r border-gray-800 bg-black/20 p-2 flex flex-col gap-1">
            <button 
              onClick={() => setActiveTab('Search')}
              className={`px-3 py-2.5 rounded-lg text-xs font-bold text-left transition-all ${activeTab === 'Search' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-800'}`}
            >
              查找指标
            </button>
            <button 
              onClick={() => setActiveTab('Active')}
              className={`px-3 py-2.5 rounded-lg text-xs font-bold text-left transition-all ${activeTab === 'Active' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-800'}`}
            >
              当前已选 ({activeIndicators.length})
            </button>
          </div>

          {/* Main Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {activeTab === 'Search' ? (
              <div className="flex-1 flex flex-col p-4 overflow-hidden">
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input 
                    type="text" 
                    placeholder="搜索指标 (例如: Ichimoku, SuperTrend...)" 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-black border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                    autoFocus
                  />
                </div>

                {recentIndicators.length > 0 && !search && (
                  <div className="mb-4">
                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2 flex items-center gap-1.5"><History className="w-3 h-3" /> 最近使用</p>
                    <div className="flex flex-wrap gap-2">
                      {recentIndicators.map(id => (
                        <button 
                          key={id}
                          onClick={() => onToggle(id)}
                          className={`px-2 py-1 text-xs rounded border transition-all ${activeIndicators.some(ai => ai.id === id) ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'}`}
                        >
                          {id}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex-1 overflow-y-auto pr-2 space-y-1 custom-scrollbar">
                  {['Trend', 'Momentum', 'Volatility', 'Volume'].map(cat => {
                    const items = filtered.filter(f => f.category === cat);
                    if (items.length === 0) return null;
                    return (
                      <div key={cat} className="mb-4">
                        <p className="text-[10px] font-black text-blue-500/60 uppercase tracking-widest mb-2 px-2">{cat}</p>
                        {items.map(i => {
                          const isActive = activeIndicators.some(ai => ai.id === i.id);
                          return (
                            <button 
                              key={i.id}
                              onClick={() => onToggle(i.id)}
                              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${isActive ? 'bg-blue-600/10 border border-blue-500/20' : 'hover:bg-gray-800 text-gray-400 hover:text-white'}`}
                            >
                              <span className="text-xs font-bold">{i.name}</span>
                              {isActive && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
                {activeIndicators.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-600">
                    <p className="text-xs font-bold uppercase tracking-widest">暂未添加指标</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeIndicators.map((config, index) => (
                      <div key={config.id} className="bg-black/40 border border-gray-800 rounded-xl p-3 flex items-center gap-3 animate-in slide-in-from-left-2">
                        <div className="text-gray-700"><GripVertical className="w-4 h-4" /></div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-white flex items-center gap-2">
                              <span className="text-[10px] opacity-40 font-mono">#{index + 1}</span>
                              {config.id}
                            </span>
                            <div className="flex items-center gap-2">
                              <button onClick={() => onUpdate({ ...config, visible: !config.visible })} className="p-1 hover:text-blue-500 transition-colors">
                                {config.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4 text-gray-600" />}
                              </button>
                              <button onClick={() => onRemove(config.id)} className="p-1 hover:text-rose-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                             <div className="flex items-center gap-2">
                               <input 
                                  type="color" value={config.color} 
                                  onChange={(e) => onUpdate({ ...config, color: e.target.value })}
                                  className="w-5 h-5 bg-transparent border-0 p-0 cursor-pointer rounded overflow-hidden"
                                />
                                <span className="text-[10px] text-gray-500 uppercase font-black">颜色</span>
                             </div>
                             <div className="flex items-center gap-2 flex-1">
                                <input 
                                  type="range" min="1" max="5" step="1" 
                                  value={config.thickness}
                                  onChange={(e) => onUpdate({ ...config, thickness: parseInt(e.target.value) })}
                                  className="h-1 flex-1 bg-gray-800 rounded appearance-none cursor-pointer accent-blue-600"
                                />
                                <span className="text-[10px] text-gray-500 uppercase font-black">粗细 {config.thickness}</span>
                             </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IndicatorModal;
