
import React, { useState, useEffect } from 'react';
import { Stock, UserSettings } from '../types';
import { Percent, Wallet, Settings2, Info } from 'lucide-react';

interface ProTradeFormProps {
  stock: Stock | null;
  onTrade: (type: 'BUY' | 'SELL', qty: number, price?: number) => void;
  settings: UserSettings;
  currentPrice: number;
}

const ProTradeForm: React.FC<ProTradeFormProps> = ({ stock, onTrade, settings, currentPrice }) => {
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [orderType, setOrderType] = useState<'LIMIT' | 'MARKET'>('LIMIT');
  const [price, setPrice] = useState<string>(currentPrice.toString());
  const [amount, setAmount] = useState<string>('');
  const [leverage, setLeverage] = useState<number>(20);
  
  // Sync price when stock changes or if explicitly zero (init)
  useEffect(() => {
      if (orderType === 'LIMIT' && !price) setPrice(currentPrice.toString());
  }, [currentPrice, orderType]);

  const balance = side === 'BUY' 
    ? (settings.trading.realAccountBalanceOverride || settings.trading.simCapital.MANUAL) 
    : 0; // Simplified for UI

  const handlePercentage = (pct: number) => {
      const p = parseFloat(price) || currentPrice;
      const maxAmt = (balance * leverage * pct) / p; 
      setAmount(maxAmt.toFixed(4));
  };

  const total = (parseFloat(amount) || 0) * (parseFloat(price) || currentPrice);
  const margin = total / leverage;

  return (
    <div className="flex flex-col gap-3 p-3 bg-[#131722] text-gray-300">
        {/* Leverage Header */}
        <div className="flex justify-between items-center mb-1">
            <div className="flex bg-black/40 rounded p-0.5 border border-gray-700">
                <button 
                    onClick={() => setSide('BUY')}
                    className={`px-4 py-1.5 rounded text-[10px] font-black uppercase transition-all ${side === 'BUY' ? 'bg-emerald-600 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    Buy / Long
                </button>
                <button 
                    onClick={() => setSide('SELL')}
                    className={`px-4 py-1.5 rounded text-[10px] font-black uppercase transition-all ${side === 'SELL' ? 'bg-rose-600 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    Sell / Short
                </button>
            </div>
            <div className="flex items-center gap-1 bg-gray-800/50 px-2 py-1 rounded text-[9px] border border-gray-700 font-mono text-yellow-500 cursor-pointer hover:bg-gray-800">
                <span className="font-black">{leverage}x</span>
                <span className="text-gray-500">Cross</span>
            </div>
        </div>

        {/* Order Type */}
        <div className="flex gap-2 text-[10px] font-bold text-gray-500 mb-1">
            <button onClick={() => setOrderType('LIMIT')} className={orderType === 'LIMIT' ? 'text-blue-400' : 'hover:text-white'}>Limit</button>
            <button onClick={() => setOrderType('MARKET')} className={orderType === 'MARKET' ? 'text-blue-400' : 'hover:text-white'}>Market</button>
            <button className="hover:text-white">Stop Limit</button>
        </div>

        {/* Inputs */}
        <div className="space-y-2">
            {orderType === 'LIMIT' && (
                <div className="flex items-center bg-[#0b0e14] border border-gray-700 rounded-lg px-3 hover:border-gray-500 transition-colors">
                    <span className="text-[10px] text-gray-500 w-12">Price</span>
                    <input 
                        type="number" 
                        value={price}
                        onChange={e => setPrice(e.target.value)}
                        className="flex-1 bg-transparent py-2 text-xs font-mono text-white text-right focus:outline-none"
                    />
                    <span className="text-[10px] text-gray-500 ml-2">USDT</span>
                </div>
            )}

            <div className="flex items-center bg-[#0b0e14] border border-gray-700 rounded-lg px-3 hover:border-gray-500 transition-colors">
                <span className="text-[10px] text-gray-500 w-12">Amount</span>
                <input 
                    type="number" 
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="Qty"
                    className="flex-1 bg-transparent py-2 text-xs font-mono text-white text-right focus:outline-none"
                />
                <span className="text-[10px] text-gray-500 ml-2">{stock?.symbol.replace('USDT', '')}</span>
            </div>

            {/* Percentage Slider / Buttons */}
            <div className="flex justify-between gap-1">
                {[0.25, 0.50, 0.75, 1.0].map(pct => (
                    <button 
                        key={pct}
                        onClick={() => handlePercentage(pct)}
                        className="flex-1 bg-gray-800 hover:bg-gray-700 text-[9px] py-1 rounded text-gray-400 border border-gray-700"
                    >
                        {pct * 100}%
                    </button>
                ))}
            </div>

            {/* TP / SL Advanced (Visual only for now) */}
            <div className="flex gap-2">
                <div className="flex items-center bg-[#0b0e14] border border-gray-700 rounded px-2 py-1.5 flex-1 opacity-60 hover:opacity-100 transition-opacity">
                    <span className="text-[9px] text-emerald-500 mr-2">TP</span>
                    <input type="number" placeholder="Take Profit" className="w-full bg-transparent text-[10px] focus:outline-none text-right" />
                </div>
                <div className="flex items-center bg-[#0b0e14] border border-gray-700 rounded px-2 py-1.5 flex-1 opacity-60 hover:opacity-100 transition-opacity">
                    <span className="text-[9px] text-rose-500 mr-2">SL</span>
                    <input type="number" placeholder="Stop Loss" className="w-full bg-transparent text-[10px] focus:outline-none text-right" />
                </div>
            </div>
        </div>

        {/* Summary Info */}
        <div className="mt-1 space-y-1">
            <div className="flex justify-between text-[9px] text-gray-500">
                <span>Avail Bal</span>
                <span className="font-mono text-white">{balance.toLocaleString()} USDT</span>
            </div>
            <div className="flex justify-between text-[9px] text-gray-500">
                <span>Margin Cost</span>
                <span className="font-mono text-white">{margin > 0 ? margin.toFixed(2) : '0.00'} USDT</span>
            </div>
        </div>

        {/* Action Button */}
        <button 
            onClick={() => onTrade(side, parseFloat(amount), orderType === 'LIMIT' ? parseFloat(price) : undefined)}
            className={`w-full py-3 rounded-lg font-black text-sm uppercase tracking-wider text-white shadow-lg transition-all active:scale-95 ${side === 'BUY' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20' : 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/20'}`}
        >
            {side === 'BUY' ? 'Buy / Long' : 'Sell / Short'}
        </button>
    </div>
  );
};

export default ProTradeForm;
