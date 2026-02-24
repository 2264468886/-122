
import React, { useState, useEffect, useRef } from 'react';
import { Bell, BellRing, Plus, X, Trash2, Volume2, VolumeX, AlertTriangle } from 'lucide-react';
import { PriceAlert, Stock } from '../types';

interface AlertManagerProps {
  isOpen: boolean;
  onClose: () => void;
  stocks: Stock[];
  alerts: PriceAlert[];
  onAdd: (alert: PriceAlert) => void;
  onRemove: (id: string) => void;
  soundEnabled: boolean;
}

const AlertManager: React.FC<AlertManagerProps> = ({ 
  isOpen, onClose, stocks, alerts, onAdd, onRemove, soundEnabled 
}) => {
  const [newSymbol, setNewSymbol] = useState('');
  const [newValue, setNewValue] = useState<string>('');
  const [newType, setNewType] = useState<'ABOVE' | 'BELOW'>('ABOVE');
  const [activeNotifications, setActiveNotifications] = useState<any[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
  }, []);

  // Monitor loop
  useEffect(() => {
    const interval = setInterval(() => {
      alerts.forEach(alert => {
        if (!alert.active) return;
        const stock = stocks.find(s => s.symbol === alert.symbol);
        if (!stock) return;

        let triggered = false;
        if (alert.type === 'ABOVE' && stock.price >= alert.value) triggered = true;
        if (alert.type === 'BELOW' && stock.price <= alert.value) triggered = true;

        if (triggered) {
          if (soundEnabled && audioRef.current) {
            audioRef.current.play().catch(() => {});
          }
          
          setActiveNotifications(prev => [...prev, {
            id: Date.now(),
            stock: stock.name,
            symbol: stock.symbol,
            type: alert.type,
            value: alert.value,
            current: stock.price,
            time: new Date().toLocaleTimeString()
          }]);
          
          onRemove(alert.id);
        }
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [alerts, stocks, soundEnabled, onRemove]);

  if (!isOpen && activeNotifications.length === 0) return null;

  return (
    <>
      {isOpen && (
        <div className="fixed top-12 right-12 w-80 bg-[#131722] border border-gray-700 rounded-2xl shadow-2xl z-[160] overflow-hidden flex flex-col animate-in slide-in-from-right-4">
          <div className="p-3 bg-gray-900 border-b border-gray-800 flex justify-between items-center">
            <h3 className="text-[10px] font-black text-white tracking-widest uppercase flex items-center gap-2">
              <Bell className="w-3.5 h-3.5 text-blue-500" /> 价格预警
            </h3>
            <button onClick={onClose}><X className="w-4 h-4 text-gray-500" /></button>
          </div>

          <div className="p-4 bg-black/40 border-b border-gray-800 space-y-3">
             <div className="flex gap-2">
               <input 
                type="text" placeholder="代码" 
                value={newSymbol} onChange={e => setNewSymbol(e.target.value.toUpperCase())}
                className="w-1/3 bg-black border border-gray-800 rounded px-2 py-1.5 text-xs text-white uppercase"
               />
               <input 
                type="number" placeholder="目标价格" 
                value={newValue} onChange={e => setNewValue(e.target.value)}
                className="flex-1 bg-black border border-gray-800 rounded px-2 py-1.5 text-xs text-white"
               />
             </div>
             <div className="flex gap-2">
               <select 
                value={newType} onChange={e => setNewType(e.target.value as any)}
                className="flex-1 bg-black border border-gray-800 rounded px-2 py-1.5 text-xs text-white appearance-none"
               >
                 <option value="ABOVE">向上突破</option>
                 <option value="BELOW">向下突破</option>
               </select>
               <button 
                onClick={() => {
                  if (newSymbol && newValue) {
                    onAdd({
                      id: `alert-${Date.now()}`,
                      symbol: newSymbol,
                      type: newType,
                      value: parseFloat(newValue),
                      active: true,
                      createdAt: Date.now()
                    });
                    setNewSymbol('');
                    setNewValue('');
                  }
                }}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded text-xs font-bold transition-all active:scale-95"
               >
                 添加
               </button>
             </div>
          </div>

          <div className="max-h-64 overflow-y-auto p-2 space-y-2 custom-scrollbar">
             {alerts.length === 0 ? (
               <div className="py-10 text-center text-gray-600 text-[10px] font-black uppercase tracking-widest">暂无活跃预警</div>
             ) : (
               alerts.map(a => (
                 <div key={a.id} className="bg-black/20 border border-gray-800 rounded-lg p-2.5 flex justify-between items-center group">
                   <div>
                     <div className="text-[10px] font-black text-white">{a.symbol}</div>
                     <div className="text-[9px] text-gray-500 font-bold flex items-center gap-1">
                       {a.type === 'ABOVE' ? '≥' : '≤'} <span className="text-gray-300">{a.value.toFixed(2)}</span>
                     </div>
                   </div>
                   <button onClick={() => onRemove(a.id)} className="text-gray-600 hover:text-rose-500 transition-colors">
                     <Trash2 className="w-3.5 h-3.5" />
                   </button>
                 </div>
               ))
             )}
          </div>
        </div>
      )}

      {/* Triggered notifications */}
      <div className="fixed top-6 right-6 z-[200] flex flex-col gap-3">
        {activeNotifications.map(n => (
          <div key={n.id} className="bg-blue-600 text-white rounded-xl p-4 shadow-2xl border border-blue-400/30 min-w-[300px] animate-in slide-in-from-right-full duration-300">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <BellRing className="w-5 h-5 animate-bounce" />
                <span className="font-black text-xs uppercase tracking-widest">价格预警触发</span>
              </div>
              <button onClick={() => setActiveNotifications(prev => prev.filter(x => x.id !== n.id))} className="hover:rotate-90 transition-transform">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1">
              <div className="text-lg font-black">{n.stock} <span className="text-[10px] opacity-70">({n.symbol})</span></div>
              <div className="text-sm font-medium">股价已{n.type === 'ABOVE' ? '突破' : '跌破'}预警位 <span className="font-mono bg-white/20 px-1.5 rounded">{n.value}</span></div>
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/10">
                <span className="text-[10px] font-mono opacity-60">触发时间: {n.time}</span>
                <span className="text-xs font-black">现价: {n.current.toFixed(2)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default AlertManager;
