
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as echarts from 'echarts';
import { SubIndicatorConfig, CandleData } from '../types';
import { generateIndicatorSeries, executeCustomFormula } from '../services/indicatorService';
import { X, Loader2, AlertTriangle } from 'lucide-react';

interface IndicatorWindowProps {
  config: SubIndicatorConfig;
  data: CandleData[];
  onRemove: () => void;
  onHeightChange: (height: number) => void;
  isLast: boolean;
  syncGroup?: string;
}

const IndicatorWindow: React.FC<IndicatorWindowProps> = ({ 
  config, 
  data, 
  onRemove, 
  onHeightChange, 
  isLast, 
  syncGroup 
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Track resize request to cancel on unmount
  const resizeReqRef = useRef<number | null>(null);

  // --- Resize Handler ---
  const handleResizeStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (e.cancelable && !('touches' in e)) e.preventDefault();
    e.stopPropagation();

    const startY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const startHeight = config.height;
    
    const handleMouseMove = (moveEvent: MouseEvent | TouchEvent) => {
      const clientY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;
      const delta = clientY - startY;
      const newHeight = Math.min(Math.max(startHeight + delta, 60), 600);
      onHeightChange(newHeight);
    };
    
    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove as any);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove as any);
      window.removeEventListener('touchend', handleMouseUp);
      
      const instance = chartInstance.current;
      const container = chartRef.current;
      if (
          instance && 
          !instance.isDisposed() && 
          container && 
          container.isConnected
      ) {
        if (container.offsetWidth > 0 && container.offsetHeight > 0) {
            try {
                instance.resize({
                    width: container.clientWidth,
                    height: container.clientHeight
                });
            } catch(e) {}
        }
      }
    };
    
    window.addEventListener('mousemove', handleMouseMove as any);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleMouseMove as any);
    window.addEventListener('touchend', handleMouseUp);
  }, [config.height, onHeightChange]);

  const getChartOption = useMemo(() => {
    if (!data.length) return null;
    
    let seriesData: any[] = [];
    setError(null);

    try {
      if (config.type === 'CUSTOM' && config.formula) {
        const result = executeCustomFormula(config.formula, data);
        if (Array.isArray(result)) {
           if (result.length > 0 && (typeof result[0] === 'number' || result[0] === null)) {
             seriesData.push({
               type: 'line', data: result, smooth: true, showSymbol: false,
               lineStyle: { width: 1.5, color: '#2962FF' }, name: config.name
             });
           } else {
             seriesData.push({
               type: 'line', data: result, smooth: true, name: config.name
             });
           }
        } else {
           setError("脚本必须返回一个数组");
           return null;
        }
      } else {
        seriesData = generateIndicatorSeries(config.type, data);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "指标计算错误");
      return null;
    }

    if (seriesData.length === 0) return null;

    return {
      backgroundColor: 'transparent',
      animation: false,
      grid: { left: 5, right: 60, top: 20, bottom: 5, containLabel: false },
      xAxis: { 
        type: 'category', 
        data: data.map(d => d.date), 
        axisLine: { show: false }, 
        axisLabel: { show: false }, 
        axisTick: { show: false },
        splitLine: { show: false }
      },
      yAxis: { 
        type: 'value', scale: true, position: 'right', 
        axisLabel: { color: '#666', fontSize: 10, formatter: (val: number) => val.toFixed(2) },
        splitLine: { show: true, lineStyle: { color: '#333', opacity: 0.2 } },
        splitNumber: 3
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross', label: { show: false } },
        backgroundColor: 'rgba(19, 23, 34, 0.9)', 
        borderColor: '#2a2e39',
        borderWidth: 1,
        padding: 4,
        textStyle: { color: '#d1d4dc', fontSize: 11 },
        position: function (pos: any, params: any, dom: any, rect: any, size: any) {
            return { left: 10, top: 0 };
        },
        extraCssText: 'backdrop-filter: blur(4px); pointer-events: none; z-index: 100; box-shadow: none; border-radius: 4px;',
        formatter: (params: any) => {
            if (!Array.isArray(params) || params.length === 0) return '';
            let html = `<div style="display: flex; gap: 10px; align-items: center; font-family: monospace;">`;
            html += `<span style="font-weight:bold; color:#888;">${config.name}</span>`;
            params.forEach((p: any) => {
                const val = Array.isArray(p.value) ? p.value[1] : p.value;
                if (typeof val === 'number') {
                    html += `<span>${p.seriesName}: <span style="color:${p.color}">${val.toFixed(2)}</span></span>`;
                }
            });
            html += `</div>`;
            return html;
        }
      },
      dataZoom: [{ type: 'inside', disabled: false, xAxisIndex: 0 }],
      series: seriesData
    };
  }, [config, data]);

  useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current, null, { renderer: 'canvas' });
    chartInstance.current = chart;
    
    const handleResize = () => {
        const instance = chartInstance.current;
        const container = chartRef.current;
        if (
            instance && 
            !instance.isDisposed() && 
            container && 
            container.isConnected
        ) {
          if (container.offsetWidth > 0 && container.offsetHeight > 0) {
              try {
                instance.resize({
                    width: container.clientWidth,
                    height: container.clientHeight
                });
              } catch (e) {}
          }
        }
    };

    const resizeObserver = new ResizeObserver(() => {
      if (resizeReqRef.current) cancelAnimationFrame(resizeReqRef.current);
      resizeReqRef.current = requestAnimationFrame(handleResize);
    });
    
    resizeObserver.observe(chartRef.current);

    // Initial resize trigger
    if (resizeReqRef.current) cancelAnimationFrame(resizeReqRef.current);
    resizeReqRef.current = requestAnimationFrame(handleResize);

    return () => {
      if (resizeReqRef.current) cancelAnimationFrame(resizeReqRef.current);
      resizeObserver.disconnect();
      const chart = chartInstance.current;
      if (chart && !chart.isDisposed()) {
          try {
              chart.group = '';
              // Hide tip to prevent "innerHTML of null"
              chart.dispatchAction({ type: 'hideTip' });
              chart.clear(); 
              chart.dispose();
          } catch(e) {}
      }
      chartInstance.current = null;
    };
  }, []);

  useEffect(() => {
    const chart = chartInstance.current;
    if (!chart || chart.isDisposed() || !chartRef.current) return;

    // Safety: Reset group to empty string before updating. 
    // This prevents the 'getRawIndex' error caused by connected charts trying to sync on stale/empty data.
    chart.group = '';

    if (getChartOption) {
      try {
          // Clone option to preserve zoom
          const finalOption = { ...getChartOption };
          
          // Preserve Zoom State from current chart instance
          const currentOption = chart.getOption() as any;
          if (currentOption && currentOption.dataZoom && currentOption.dataZoom.length > 0) {
              const currentStart = currentOption.dataZoom[0].start;
              const currentEnd = currentOption.dataZoom[0].end;
              
              if (finalOption.dataZoom && finalOption.dataZoom.length > 0) {
                  finalOption.dataZoom[0].start = currentStart;
                  finalOption.dataZoom[0].end = currentEnd;
              }
          }

          // Use notMerge: true (consistent with StockChart) to avoid stale internal model issues
          // Use lazyUpdate: false to ensure synchronous updates before reconnecting group
          chart.setOption(finalOption, { notMerge: true, lazyUpdate: false });
          
          // Only re-attach to sync group if data is valid and option set successfully
          // CRITICAL: Ensure data length is > 0 to prevent getRawIndex error
          if (syncGroup && data.length > 0) {
            chart.group = syncGroup;
          }
      } catch (e) {
          console.error("Indicator setOption failed", e);
      }
    } else {
      try {
          chart.clear();
      } catch(e) {}
    }
    
    // Cleanup: Remove group binding when unmounting or effect re-runs
    return () => {
        if (chart && !chart.isDisposed()) {
            chart.group = '';
        }
    };
  }, [getChartOption, syncGroup, data.length]);

  return (
    <div 
      className="w-full relative border-b border-[#1e222d] bg-[#0b0e14] group" 
      style={{ height: config.height }}
    >
      <div ref={chartRef} className="w-full h-full" />
      
      {data.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
           <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-[1px] z-10">
          <div className="bg-rose-900/80 border border-rose-500/50 text-white px-3 py-2 rounded-lg flex items-center gap-2 text-xs shadow-xl">
             <AlertTriangle className="w-4 h-4 text-rose-300" />
             <span>{error}</span>
          </div>
        </div>
      )}

      <div className="absolute top-0 left-0 p-1 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
         {config.type === 'CUSTOM' && <span className="text-[9px] bg-blue-900/80 text-blue-300 px-1.5 rounded font-black tracking-wider">SCRIPT</span>}
      </div>

      <button 
        onClick={onRemove}
        className="absolute top-1 right-1 p-1 text-gray-500 hover:text-rose-500 hover:bg-rose-500/10 rounded transition-all opacity-0 group-hover:opacity-100 z-20"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      <div 
        className="absolute bottom-0 left-0 right-0 h-1.5 cursor-ns-resize hover:bg-blue-500/50 z-30 flex justify-center items-center group/handle"
        onMouseDown={handleResizeStart}
        onTouchStart={handleResizeStart}
      >
         <div className="w-8 h-1 rounded-full bg-gray-700 opacity-0 group-hover/handle:opacity-100 transition-opacity" />
      </div>
    </div>
  );
};

export default IndicatorWindow;