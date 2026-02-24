
import React, { useState } from 'react';
import { X, Check, ShieldCheck, AlertCircle } from 'lucide-react';
import { Stock } from '../types';

interface TradeConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: any) => void;
  stock: Stock | null;
  type: 'BUY' | 'SELL';
  defaultQty: number;
}

const TradeConfirmModal: React.FC<TradeConfirmModalProps> = ({ isOpen, onClose, onConfirm, stock, type, defaultQty }) => {
  const [qty, setQty] = useState(defaultQty.toString());
  
  if (!isOpen || !stock) return null;

  const isBuy = type === 'BUY';
  const total = parseFloat(qty) * stock.price;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-[#131722] border border-gray-700 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95">
        <div className={`px-6 py-4 flex justify-between items-center ${isBuy ? 'bg-emerald-600' : 'bg-rose-600'}`}>
          <h2 className="text-white font-black text-xs uppercase tracking-widest flex items-center gap-2">
             <ShieldCheck className="w-4 h-4" /> 确认{isBuy ? '买入' : '卖出'}委托
          </h2>
          <button onClick={onClose} className="text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-8 space-y-6">
           <div className="flex justify-between items-end border-b border-gray-800 pb-4">
              <div>
                <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">证券名称</div>
                <div className="text-xl font-black text-white">{stock.name} <span className="text-xs text-gray-500 font-mono ml-2">({stock.symbol})</span></div>
              </div>
              <div className="text-right">
                 <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">当前价格</div>
                 <div className={`text-xl font-mono font-black ${isBuy ? 'text-emerald-500' : 'text-rose-500'}`}>{stock.price.toFixed(2)}</div>
              </div>
           </div>

           <div className="space-y-4">
              <div>
                 <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">委托数量</label>
                 <div className="relative">
                   <input 
                    type="number" value={qty} onChange={e => setQty(e.target.value)}
                    className="w-full bg-black border border-gray-800 rounded-xl px-4 py-3 text-white font-black text-lg focus:outline-none focus:border-blue-500"
                   />
                   <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-gray-500">股</span>
                 </div>
              </div>

              <div className="bg-gray-900/50 rounded-2xl p-4 flex justify-between items-center">
                 <span className="text-xs font-bold text-gray-400">预估总额</span>
                 <span className="text-lg font-mono font-black text-white">¥ {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
           </div>

           <div className="flex gap-4">
              <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-700 text-gray-400 font-black text-xs uppercase tracking-widest hover:bg-gray-800 transition-colors">取消</button>
              <button 
                onClick={() => onConfirm({ symbol: stock.symbol, qty: parseInt(qty), price: stock.price })}
                className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest text-white shadow-xl flex items-center justify-center gap-2 transition-transform active:scale-95 ${isBuy ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20' : 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/20'}`}
              >
                <Check className="w-4 h-4" /> 确认委托
              </button>
           </div>

           <div className="flex items-center gap-2 text-[10px] text-gray-600 font-bold justify-center">
              <AlertCircle className="w-3 h-3" /> 投资有风险，决策需谨慎
           </div>
        </div>
      </div>
    </div>
  );
};

export default TradeConfirmModal;
