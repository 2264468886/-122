
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { X, CandlestickChart, BarChart2, LineChart, Activity, Layers, Camera, ChevronDown } from 'lucide-react';
import StockChart, { StockChartRef } from './StockChart';
import { ChartLayout, ChartWindowConfig, CandleData, ChartStyle, Drawing } from '../types';

interface ChartGridProps {
  layout: ChartLayout;
  charts: ChartWindowConfig[];
  activeChartId: string;
  maximizedChartId: string | null;
  chartDataMap: Record<string, CandleData[]>;
  activeTool?: string;
  indicators?: string[];
  onActivateChart: (id: string) => void;
  onToggleMaximize: (id: string) => void;
  onDeleteChart: (id: string) => void;
  customUpColor?: string;
  customDownColor?: string;
  showGrid?: boolean;
  lineThickness?: number;
  chartLayoutPreference?: 'vertical' | 'horizontal';
  onUpdateChartConfig: (id: string, config: Partial<ChartWindowConfig>) => void;
  onOpenIndicatorSettings: () => void;
}

const CHART_STYLE_OPTIONS = [
  { id: ChartStyle.CANDLE, label: 'K 线 (Candle)', icon: CandlestickChart },
  { id: ChartStyle.HOLLOW_CANDLE, label: '空心 K 线 (Hollow)', icon: BarChart2 },
  { id: ChartStyle.HEIKIN_ASHI, label: '平均 K 线 (Heikin)', icon: Activity },
  { id: ChartStyle.OHLC, label: '美国线 (OHLC)', icon: BarChart2 },
  { id: ChartStyle.LINE, label: '收盘线 (Line)', icon: LineChart },
  { id: ChartStyle.AREA, label: '山峰图 (Area)', icon: Layers },
];

const INTERVAL_OPTIONS = ['1m', '5m', '15m', '30m', '1h', '4h', '1D', '1W', '1M'];

const ChartControls: React.FC<{
  chart: ChartWindowConfig;
  isOpen: boolean;
  onToggleMenu: (e: React.MouseEvent) => void;
  onUpdateStyle: (style: any) => void;
  onExport: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  showDelete: boolean;
}> = ({ chart, isOpen, onToggleMenu, onUpdateStyle, onExport, onDelete, showDelete }) => {
  return (
    <div className={`absolute top-2 right-2 z-20 flex items-center gap-1 transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
        <div className="relative">
            <button 
                onClick={onToggleMenu}
                className={`p-1.5 rounded-md bg-[#1e222d]/90 text-gray-400 hover:text-white hover:bg-blue-600 transition-all shadow-lg border border-gray-700/50 ${isOpen ? 'bg-blue-600 text-white' : ''}`}
                title="图表样式"
            >
                <CandlestickChart className="w-3.5 h-3.5" />
            </button>
            {isOpen && (
                <div className="absolute top-full right-0 mt-1 w-40 bg-[#1e222d] border border-gray-700 rounded-lg shadow-xl overflow-hidden flex flex-col py-1 animate-in fade-in zoom-in-95 z-50">
                    {CHART_STYLE_OPTIONS.map(opt => (
                        <button
                            key={opt.id}
                            onClick={(e) => { e.stopPropagation(); onUpdateStyle(opt.id); }}
                            className={`text-[10px] text-left px-3 py-2 hover:bg-gray-700/50 transition-colors flex items-center gap-2 ${chart.style === opt.id ? 'text-blue-400 font-bold bg-blue-500/10' : 'text-gray-300'}`}
                        >
                            <opt.icon className="w-3 h-3 opacity-70" />
                            {opt.label}
                        </button>
                    ))}
                </div>
            )}
        </div>

        <button 
            onClick={onExport}
            className="p-1.5 rounded-md bg-[#1e222d]/90 text-gray-400 hover:text-white hover:bg-blue-600 transition-all shadow-lg border border-gray-700/50"
            title="导出快照"
        >
            <Camera className="w-3.5 h-3.5" />
        </button>

        {showDelete && (
            <button onClick={onDelete} className="p-1.5 rounded-md bg-[#1e222d]/90 text-gray-400 hover:text-white hover:bg-rose-600 transition-all shadow-lg border border-gray-700/50">
                <X className="w-3.5 h-3.5" />
            </button>
        )}
    </div>
  );
};

const ChartLeftControls: React.FC<{
  symbol: string;
  interval: string;
  onIntervalChange: (newInterval: string) => void;
  onOpenIndicators: (e: React.MouseEvent) => void;
}> = ({ symbol, interval, onIntervalChange, onOpenIndicators }) => {
  const [isIntervalOpen, setIsIntervalOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsIntervalOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="absolute top-2 left-2 z-20 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
       <div className="flex items-center gap-0 bg-[#1e222d]/90 rounded-md border border-gray-700/50 shadow-lg backdrop-blur-md overflow-visible" ref={containerRef}>
          <div className="px-2.5 py-1.5 border-r border-gray-700/50">
             <span className="text-xs font-black text-gray-100 tracking-tight">{symbol}</span>
          </div>
          
          <div className="relative">
              <button 
                onClick={() => setIsIntervalOpen(!isIntervalOpen)}
                className={`px-2 py-1.5 flex items-center gap-1 hover:bg-gray-700/50 transition-colors ${isIntervalOpen ? 'text-blue-400' : 'text-gray-400'}`}
              >
                  <span className="text-[10px] font-mono font-bold">{interval}</span>
                  <ChevronDown className="w-2.5 h-2.5 opacity-70" />
              </button>

              {isIntervalOpen && (
                  <div className="absolute top-full left-0 mt-1 w-16 bg-[#1e222d] border border-gray-700 rounded shadow-xl overflow-hidden flex flex-col z-50 max-h-64 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95">
                      {INTERVAL_OPTIONS.map(opt => (
                          <button
                              key={opt}
                              onClick={() => { onIntervalChange(opt); setIsIntervalOpen(false); }}
                              className={`text-[10px] py-1.5 text-center hover:bg-blue-600 hover:text-white transition-colors ${opt === interval ? 'text-blue-400 font-bold bg-blue-500/10' : 'text-gray-400'}`}
                          >
                              {opt}
                          </button>
                      ))}
                  </div>
              )}
          </div>
       </div>
       
       <button 
          onClick={onOpenIndicators} 
          className="flex items-center justify-center p-1.5 rounded-md bg-[#1e222d]/90 border border-gray-700/50 text-gray-400 hover:text-blue-400 hover:border-blue-500/30 transition-all shadow-lg backdrop-blur-md group/btn"
          title="技术指标 (Indicators)"
       >
          <Layers className="w-3.5 h-3.5 group-hover/btn:scale-110 transition-transform" />
       </button>
    </div>
  );
};

const ChartGridComponent: React.FC<ChartGridProps> = ({ 
  charts, 
  activeChartId, 
  maximizedChartId,
  chartDataMap,
  activeTool,
  indicators,
  onActivateChart,
  onDeleteChart,
  customUpColor,
  customDownColor,
  showGrid,
  lineThickness,
  chartLayoutPreference,
  onUpdateChartConfig,
  onOpenIndicatorSettings
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRefs = useRef<Record<string, StockChartRef | null>>({});
  const [colRatio, setColRatio] = useState(50);
  const [rowRatio, setRowRatio] = useState(50);
  const [isResizing, setIsResizing] = useState<'col' | 'row' | 'both' | null>(null);
  
  const [activeStyleMenuId, setActiveStyleMenuId] = useState<string | null>(null);
  const ACTIVE_GROUP_ID = "ACTIVE_SYNC_GROUP";

  useEffect(() => {
    const handleClickOutside = () => setActiveStyleMenuId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleResize = () => { 
        Object.keys(chartRefs.current).forEach(key => {
            if (chartRefs.current[key]) {
                try { chartRefs.current[key]?.resize(); } catch(e) {}
            }
        });
    };
    const handleZoomFit = () => { 
        Object.keys(chartRefs.current).forEach(key => {
            if (chartRefs.current[key]) chartRefs.current[key]?.zoomFit();
        }); 
    }
    window.addEventListener('resize-all-charts', handleResize);
    window.addEventListener('zoom-fit-all-charts', handleZoomFit);
    return () => {
        window.removeEventListener('resize-all-charts', handleResize);
        window.removeEventListener('zoom-fit-all-charts', handleZoomFit);
    };
  }, []);

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!isResizing || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;
      if (isResizing === 'col' || isResizing === 'both') setColRatio(Math.min(Math.max(((clientX - rect.left) / rect.width) * 100, 15), 85));
      if (isResizing === 'row' || isResizing === 'both') setRowRatio(Math.min(Math.max(((clientY - rect.top) / rect.height) * 100, 15), 85));
    };
    const handleEnd = () => setIsResizing(null);
    if (isResizing) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleMove);
      window.addEventListener('touchend', handleEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isResizing]);

  const count = charts.length;
  const gridConfig = useMemo(() => {
      let cols = '100%', rows = '100%', showResize = false;
      if (count <= 1) { cols = '100%'; rows = '100%'; } 
      else if (count === 2) { cols = `${colRatio}% ${100 - colRatio}%`; rows = '100%'; showResize = true; } 
      else if (count <= 4) { cols = `${colRatio}% ${100 - colRatio}%`; rows = `${rowRatio}% ${100 - rowRatio}%`; showResize = true; } 
      else { cols = 'repeat(3, 1fr)'; rows = 'repeat(auto-fit, minmax(200px, 1fr))'; }
      return { cols, rows, showResize };
  }, [count, colRatio, rowRatio]);

  const handleExport = (chartId: string, symbol: string) => {
      const ref = chartRefs.current[chartId];
      if (ref) {
          const url = ref.getChartImage();
          if (url) {
              const a = document.createElement('a');
              a.href = url;
              a.download = `${symbol}_Snapshot_${new Date().toISOString().slice(0,10)}.png`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
          }
      }
  };

  const renderChart = (chart: ChartWindowConfig) => (
      <StockChart 
        ref={el => { 
            if (el) chartRefs.current[chart.id] = el;
            else delete chartRefs.current[chart.id];
        }}
        id={chart.id}
        symbol={chart.symbol}
        interval={chart.interval}
        style={chart.style || ChartStyle.CANDLE}
        data={chartDataMap[`${chart.symbol}_${chart.interval}`] || []}
        activeTool={activeChartId === chart.id ? activeTool : undefined}
        drawings={chart.drawings}
        onUpdateDrawings={(drawings) => onUpdateChartConfig(chart.id, { drawings })}
        indicators={indicators}
        isActive={activeChartId === chart.id}
        onActivate={() => onActivateChart(chart.id)}
        customUpColor={customUpColor}
        customDownColor={customDownColor}
        showGrid={showGrid}
        lineThickness={lineThickness}
        layoutPreference={chartLayoutPreference}
        // ONLY sync the active chart. Prevents "getRawIndex" error by isolating disparate charts.
        syncGroup={activeChartId === chart.id ? ACTIVE_GROUP_ID : undefined}
        onOpenIndicatorSettings={onOpenIndicatorSettings}
      />
  );

  const renderLeftControls = (chart: ChartWindowConfig) => (
      <ChartLeftControls 
          symbol={chart.symbol}
          interval={chart.interval}
          onIntervalChange={(newInterval) => onUpdateChartConfig(chart.id, { interval: newInterval })}
          onOpenIndicators={(e) => { 
              e.preventDefault(); 
              e.stopPropagation(); 
              onOpenIndicatorSettings(); 
          }}
      />
  );

  const renderControls = (chart: ChartWindowConfig) => (
      <ChartControls 
          chart={chart}
          isOpen={activeStyleMenuId === chart.id}
          onToggleMenu={(e) => { e.preventDefault(); e.stopPropagation(); setActiveStyleMenuId(activeStyleMenuId === chart.id ? null : chart.id); }}
          onUpdateStyle={(style) => { onUpdateChartConfig(chart.id, { style }); setActiveStyleMenuId(null); }}
          onExport={(e) => { e.preventDefault(); e.stopPropagation(); handleExport(chart.id, chart.symbol); }}
          onDelete={(e) => { e.preventDefault(); e.stopPropagation(); onDeleteChart(chart.id); }}
          showDelete={count > 1}
      />
  );

  if (maximizedChartId) {
    const chart = charts.find(c => c.id === maximizedChartId);
    return chart ? (
      <div className="w-full h-full p-1 bg-black animate-in fade-in zoom-in-95 duration-300">
        <div className="w-full h-full relative group">
            {renderChart(chart)}
            {renderLeftControls(chart)}
            {renderControls(chart)}
        </div>
      </div>
    ) : null;
  }

  return (
    <div ref={containerRef} style={{ display: 'grid', width: '100%', height: '100%', gap: '2px', backgroundColor: '#000', gridTemplateColumns: gridConfig.cols, gridTemplateRows: gridConfig.rows }} className="relative overflow-hidden select-none">
      {charts.map((chart) => (
        <div key={chart.id} className="w-full h-full min-h-0 min-w-0 relative group border border-[#1e222d] hover:border-blue-500/30 transition-colors">
          {renderChart(chart)}
          {renderLeftControls(chart)}
          {renderControls(chart)}
        </div>
      ))}
      {gridConfig.showResize && count > 1 && (
        <div className="absolute top-0 bottom-0 z-30 group cursor-col-resize flex items-center justify-center" style={{ left: `calc(${colRatio}% - 12px)`, width: '24px', touchAction: 'none' }} onMouseDown={() => setIsResizing('col')} onTouchStart={() => setIsResizing('col')}>
          <div className="w-[1px] h-full bg-gray-800 group-hover:bg-blue-500 transition-colors" />
        </div>
      )}
      {gridConfig.showResize && count > 2 && (
        <div className="absolute left-0 right-0 z-30 group cursor-row-resize flex items-center justify-center" style={{ top: `calc(${rowRatio}% - 12px)`, height: '24px', touchAction: 'none' }} onMouseDown={() => setIsResizing('row')} onTouchStart={() => setIsResizing('row')}>
          <div className="h-[1px] w-full bg-gray-800 group-hover:bg-blue-500 transition-colors" />
        </div>
      )}
    </div>
  );
};

const ChartGrid = React.memo(ChartGridComponent);
export default ChartGrid;
