
import React from 'react';
import { Stock, OrderBook, AgentSystemState } from '../types';
import { Heart, ChevronDown, Link2, Link2Off } from 'lucide-react';
import ChatWidget from './ChatWidget';

interface TopTickersProps {
  stocks: Stock[];
  orderBook: OrderBook | null;
  activeSymbol: string;
  // Props for ChatWidget
  agentState?: AgentSystemState;
  agentLogs?: {time: string, msg: string}[];
  onOpenKeySelector?: () => void;
}

const TopTickers: React.FC<TopTickersProps> = ({ 
  stocks, 
  orderBook, 
  activeSymbol,
  agentState,
  agentLogs,
  onOpenKeySelector
}) => {
  const activeStock = stocks.find(s => s.symbol === activeSymbol) || stocks[0];
  const isConnected = stocks.length > 0 && stocks[0].price !== 64200.50; // Check if using mock fallback

  // Increased z-index from 40 to 70 to ensure it sits above Sidebar (z-50) and RightPanel (z-60)
  return (
    <div className="h-16 w-full flex glass border-b border-gray-800 shrink-0 backdrop-blur-xl relative z-[70]">
      {/* Horizontal Watchlist Ticker */}
      <div className="flex-1 flex items-center overflow-x-auto no-scrollbar px-6 gap-8 border-r border-gray-800">
        {stocks.map(stock => (
          <div key={stock.symbol} className="flex flex-col shrink-0 min-w-[80px]">
            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] font-black tracking-tight ${stock.symbol === activeSymbol ? 'text-blue-500' : 'text-gray-400'}`}>
                {stock.symbol.split('.')[0]}
              </span>
              <span className="text-[10px] text-gray-500 font-mono">
                {stock.price.toFixed(1)}
              </span>
            </div>
            <div className={`text-[9px] font-black ${stock.change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {stock.change >= 0 ? '▲' : '▼'}{stock.changePercent.toFixed(2)}%
            </div>
          </div>
        ))}
      </div>

      {/* Depth / Order Book Panel */}
      <div className="hidden lg:flex w-[400px] shrink-0 items-center px-6 gap-6 bg-gray-900/20">
        <div className="flex-1 flex flex-col justify-center">
          <div className="flex justify-between text-[8px] text-gray-500 mb-1 font-bold tracking-widest">
            <span>LIVE DEPTH</span>
            <div className="flex gap-2">
              <span className="text-emerald-500">BIDS</span>
              <span className="text-rose-500">ASKS</span>
            </div>
          </div>
          <div className="flex h-5 gap-0.5">
            {orderBook?.bids.slice(0, 5).reverse().map((b, i) => (
              <div key={`bid-${i}`} className="flex-1 bg-emerald-500/10 border-t border-emerald-500/50" />
            ))}
            <div className="w-1 bg-gray-700 mx-0.5 rounded-full" />
            {orderBook?.asks.slice(0, 5).map((a, i) => (
              <div key={`ask-${i}`} className="flex-1 bg-rose-500/10 border-t border-rose-500/50" />
            ))}
          </div>
        </div>

        <div className="flex flex-col items-end shrink-0">
          <div className="flex items-center gap-1 text-[10px] font-black font-mono text-rose-500">
            <span>{activeStock?.price.toFixed(1)}</span>
            <Heart className="w-2.5 h-2.5 fill-current" />
          </div>
          <div className="text-[8px] text-gray-500 flex items-center gap-0.5 font-bold">
            {isConnected ? (
                <span className="text-emerald-500 flex items-center gap-1"><Link2 className="w-2.5 h-2.5"/> LIVE</span>
            ) : (
                <span className="text-gray-600 flex items-center gap-1"><Link2Off className="w-2.5 h-2.5"/> MOCK</span>
            )}
          </div>
        </div>
      </div>

      {/* Chat Widget Embedded Area */}
      <ChatWidget 
        embedded={true}
        agentState={agentState}
        agentLogs={agentLogs}
        onOpenKeySelector={onOpenKeySelector}
      />
    </div>
  );
};

export default TopTickers;
