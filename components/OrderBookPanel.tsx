import React, { useMemo } from 'react';
import { OrderBook, OrderBookEntry } from '../types';
import { ArrowDown, ArrowUp } from 'lucide-react';

interface OrderBookPanelProps {
  data: OrderBook | null;
  currentPrice: number;
  onPriceClick: (price: number) => void;
}

interface DepthRowProps {
    entry: OrderBookEntry;
    type: 'BID' | 'ASK';
    maxTotal: number;
    onClick: (p: number) => void;
}

const DepthRow: React.FC<DepthRowProps> = ({ 
    entry, 
    type, 
    maxTotal, 
    onClick 
}) => {
    const percent = Math.min((entry.total / maxTotal) * 100, 100);
    
    return (
        <div 
            className="flex justify-between items-center text-[10px] font-mono py-0.5 cursor-pointer hover:bg-white/5 relative group"
            onClick={() => onClick(entry.price)}
        >
            {/* Depth Bar Background */}
            <div 
                className={`absolute top-0 bottom-0 right-0 opacity-10 transition-all duration-500 ${type === 'BID' ? 'bg-emerald-500' : 'bg-rose-500'}`}
                style={{ width: `${percent}%` }}
            />
            
            <span className={`z-10 pl-2 ${type === 'BID' ? 'text-emerald-400' : 'text-rose-400'}`}>
                {entry.price.toFixed(2)}
            </span>
            <span className="z-10 text-gray-400 text-right w-16">
                {entry.size.toFixed(4)}
            </span>
            <span className="z-10 text-gray-600 text-right pr-2 w-16 group-hover:text-gray-300">
                {entry.total.toFixed(2)}
            </span>
        </div>
    );
};

const OrderBookPanel: React.FC<OrderBookPanelProps> = ({ data, currentPrice, onPriceClick }) => {
    const { bids, asks, maxTotal } = useMemo(() => {
        if (!data) return { bids: [], asks: [], maxTotal: 1 };
        // Limit to 12 rows for UI fit
        const b = data.bids.slice(0, 12); 
        const a = data.asks.slice(0, 12).reverse(); // Show lowest ask at bottom
        const max = Math.max(
            b[b.length-1]?.total || 0, 
            a[0]?.total || 0
        );
        return { bids: b, asks: a, maxTotal: max || 1 };
    }, [data]);

    const spread = asks.length > 0 && bids.length > 0 ? asks[asks.length-1].price - bids[0].price : 0;
    const spreadPercent = asks.length > 0 ? (spread / asks[asks.length-1].price) * 100 : 0;

    return (
        <div className="flex flex-col h-full bg-[#131722] select-none">
            {/* Header */}
            <div className="flex justify-between px-2 py-1.5 text-[9px] text-gray-500 font-bold uppercase tracking-wider border-b border-gray-800">
                <span>Price (USDT)</span>
                <span className="text-right pr-2">Amount</span>
                <span className="text-right">Total</span>
            </div>

            {/* Asks (Sell Orders) - Red */}
            <div className="flex-1 overflow-hidden flex flex-col justify-end">
                {asks.map((ask, i) => (
                    <DepthRow key={`ask-${i}`} entry={ask} type="ASK" maxTotal={maxTotal} onClick={onPriceClick} />
                ))}
            </div>

            {/* Spread / Current Price */}
            <div className="py-1.5 border-y border-gray-800 bg-[#1e222d] flex items-center justify-center gap-2 my-0.5">
                <span className={`text-sm font-black tracking-tight ${spread >= 0 ? 'text-white' : 'text-gray-400'}`}>
                    {currentPrice.toFixed(2)}
                </span>
                <div className="flex items-center text-[9px] text-gray-500 gap-1">
                    {currentPrice > bids[0]?.price ? <ArrowUp className="w-2.5 h-2.5 text-emerald-500"/> : <ArrowDown className="w-2.5 h-2.5 text-rose-500"/>}
                    <span>Spread: {spread.toFixed(2)} ({spreadPercent.toFixed(2)}%)</span>
                </div>
            </div>

            {/* Bids (Buy Orders) - Green */}
            <div className="flex-1 overflow-hidden">
                {bids.map((bid, i) => (
                    <DepthRow key={`bid-${i}`} entry={bid} type="BID" maxTotal={maxTotal} onClick={onPriceClick} />
                ))}
            </div>
        </div>
    );
};

export default OrderBookPanel;