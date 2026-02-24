
import React, { useState } from 'react';
import { Stock, CandleData, Portfolio, UserSettings, AgentSystemState, BayesianAdvice, ExternalSignal, AgentTrade, OrderBook } from '../types';
import StockList from './StockList';
import AIAnalysisPanel from './AIAnalysisPanel';
import BayesianDecisionOfficer from './BayesianDecisionOfficer';
import EvolutionaryTradingSystem from './EvolutionaryTradingSystem';
import OrderBookPanel from './OrderBookPanel';
import ProTradeForm from './ProTradeForm';
import ErrorBoundary from './ErrorBoundary';

interface RightPanelProps {
  mode: 'WATCHLIST' | 'ANALYSIS' | 'AGENT' | 'MULTI_AGENT' | 'DECISION_OFFICER' | 'EVO_TEAM' | 'TRADE';
  stocks: Stock[];
  activeSymbol: string;
  activeChartData: CandleData[];
  orderBook?: OrderBook | null; // Added prop
  
  // State for specific panels
  aiState: {
      isAnalyzing: boolean;
      result: string | null;
      analyzeAction: () => void;
  };
  
  evoState: {
      alpha: boolean;
      beta: boolean;
      gamma: boolean;
      setAlpha: (v: boolean) => void;
      setBeta: (v: boolean) => void;
      setGamma: (v: boolean) => void;
      gammaAgents: any[];
  };

  trading: {
      portfolio: Portfolio;
      realPortfolio: Portfolio;
      settings: UserSettings;
      onTradeConfirm: (type: 'BUY'|'SELL', qty: number) => void;
      onUnifiedTrade: (trade: AgentTrade, teamId: any) => void;
      bayesianAdvice: BayesianAdvice | null;
      setBayesianAdvice: (advice: BayesianAdvice) => void;
      externalSignals: ExternalSignal[];
  };

  actions: {
      setActiveSymbol: (s: string) => void;
      setStocks: (s: Stock[]) => void;
      openKeyInput: () => void;
  };
}

const RightPanel: React.FC<RightPanelProps> = ({ 
    mode, stocks, activeSymbol, activeChartData, orderBook,
    aiState, evoState, trading, actions
}) => {
    
    const activeStock = stocks.find(s => s.symbol === activeSymbol) || null;
    const { settings } = trading;
    const [manualPrice, setManualPrice] = useState<number>(activeStock?.price || 0);

    const getLiveStatus = (teamId: string) => {
        const isConnected = settings.trading.enableRealTrading && settings.trading.activeTradingTeam === teamId;
        return { isConnected, label: isConnected ? 'REAL' : 'SIM' };
    };

    const renderContent = () => {
        switch (mode) {
            case 'WATCHLIST':
                return (
                    <div className="flex flex-col h-full">
                        <div className="p-3 border-b border-gray-800 flex justify-between items-center bg-[#1e222d]">
                            <h3 className="font-black text-xs uppercase tracking-widest text-gray-300 flex items-center gap-2">自选观察</h3>
                        </div>
                        <div className="flex-1 min-h-0">
                            <StockList 
                                stocks={stocks} 
                                selectedStock={activeStock} 
                                onSelect={(s) => actions.setActiveSymbol(s.symbol)} 
                                onTrade={(s, t) => trading.onTradeConfirm(t, 100)} 
                                onDelete={(sym) => actions.setStocks(stocks.filter(s => s.symbol !== sym))} 
                            />
                        </div>
                    </div>
                );
            
            case 'TRADE':
                return (
                    <div className="flex flex-col h-full bg-[#0b0e14]">
                        <div className="flex-1 min-h-0 border-b border-gray-800">
                            <OrderBookPanel 
                                data={orderBook || null} 
                                currentPrice={activeStock?.price || 0}
                                onPriceClick={setManualPrice}
                            />
                        </div>
                        <div className="shrink-0">
                            <ProTradeForm 
                                stock={activeStock}
                                currentPrice={manualPrice || activeStock?.price || 0}
                                settings={settings}
                                onTrade={(type, qty, price) => trading.onUnifiedTrade({ 
                                    symbol: activeSymbol, 
                                    action: type, 
                                    qty, 
                                    price: price || activeStock?.price || 0 
                                }, 'MANUAL')}
                            />
                        </div>
                    </div>
                );

            case 'ANALYSIS':
                return (
                    <AIAnalysisPanel 
                        isLoading={aiState.isAnalyzing} 
                        analysis={aiState.result} 
                        stock={activeStock} 
                        onAnalyze={aiState.analyzeAction} 
                        onOpenKeySelector={actions.openKeyInput} 
                    />
                );

            case 'AGENT':
                return (
                    <EvolutionaryTradingSystem 
                        isActive={evoState.alpha} 
                        onToggle={() => evoState.setAlpha(!evoState.alpha)} 
                        realPortfolio={trading.realPortfolio} 
                        memorySettings={settings.memory}
                        title="进化型多智能体系统 (Alpha Squad)"
                        namespace="EVO_ALPHA"
                        liveStatus={getLiveStatus('BASIC')}
                    />
                );

            case 'MULTI_AGENT':
                return (
                    <EvolutionaryTradingSystem 
                        isActive={evoState.gamma} 
                        onToggle={() => evoState.setGamma(!evoState.gamma)} 
                        realPortfolio={trading.realPortfolio} 
                        memorySettings={settings.memory}
                        title="高级进化型智能体集群 (Gamma Squad)"
                        namespace="EVO_GAMMA"
                        initialAgents={evoState.gammaAgents}
                        liveStatus={getLiveStatus('FINRL')}
                    />
                );

            case 'DECISION_OFFICER':
                return (
                    <BayesianDecisionOfficer 
                        stock={activeStock} 
                        data={activeChartData} 
                        liveModeAllowed={settings.trading.activeTradingTeam === 'BAYESIAN'} 
                        portfolio={settings.trading.activeTradingTeam === 'BAYESIAN' ? trading.realPortfolio : undefined} 
                        onBroadcastAdvice={trading.setBayesianAdvice} 
                        externalSignals={trading.externalSignals} 
                        onOpenKeySelector={actions.openKeyInput} 
                        onTrade={(type, isAuto, qty) => { 
                            if (isAuto && settings.trading.activeTradingTeam !== 'BAYESIAN') return; 
                            const effectiveQty = qty || 100; 
                            if (isAuto) trading.onUnifiedTrade({ symbol: activeSymbol, action: type, price: activeStock?.price || 0, qty: effectiveQty }, 'BAYESIAN'); 
                            else trading.onTradeConfirm(type, effectiveQty); 
                        }} 
                        liveStatus={getLiveStatus('BAYESIAN')} 
                    />
                );

            case 'EVO_TEAM':
                return (
                    <EvolutionaryTradingSystem 
                        isActive={evoState.beta} 
                        onToggle={() => evoState.setBeta(!evoState.beta)} 
                        realPortfolio={trading.realPortfolio} 
                        memorySettings={settings.memory}
                        title="进化型多智能体系统 (Beta Squad)"
                        namespace="EVO_BETA"
                        liveStatus={getLiveStatus('MANUAL')} 
                    />
                );
            
            default:
                return null;
        }
    };

    return (
        <div className="w-full h-full bg-[#131722] flex flex-col overflow-hidden">
            <ErrorBoundary scope={`RightPanel-${mode}`}>
                {renderContent()}
            </ErrorBoundary>
        </div>
    );
};

export default RightPanel;
