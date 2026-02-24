
import React, { useEffect, useRef, forwardRef, useImperativeHandle, useState, useMemo } from 'react';
import * as echarts from 'echarts';
import { CandleData, ChartStyle, Drawing, DrawingType, DrawingPoint, TradeMarker } from '../types';
import { generateIndicatorSeries, calculateHeikinAshi } from '../services/indicatorService';
import { getDrawingGraphic } from '../services/drawingUtils';

interface StockChartProps {
  data: CandleData[];
  symbol: string;
  interval: string;
  activeTool?: string;
  drawings?: Drawing[];
  tradeMarkers?: TradeMarker[];
  onUpdateDrawings?: (drawings: Drawing[]) => void;
  indicators?: string[];
  id?: string;
  isActive?: boolean;
  onActivate?: () => void;
  customUpColor?: string;
  customDownColor?: string;
  showGrid?: boolean;
  lineThickness?: number;
  style?: ChartStyle;
  layoutPreference?: 'vertical' | 'horizontal';
  syncGroup?: string;
  onOpenIndicatorSettings?: () => void;
}

export interface StockChartRef {
  getChartImage: () => string | null;
  resize: () => void;
  zoomFit: () => void;
}

const formatAxisDate = (dateStr: string, interval: string) => {
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        
        const isIntraday = interval.includes('m') || interval.includes('h');
        
        const M = (date.getMonth() + 1).toString().padStart(2, '0');
        const D = date.getDate().toString().padStart(2, '0');
        
        if (isIntraday) {
            const h = date.getHours().toString().padStart(2, '0');
            const m = date.getMinutes().toString().padStart(2, '0');
            return `${M}-${D} ${h}:${m}`;
        }
        
        const Y = date.getFullYear();
        if (interval === '1M' || interval === '1Y') {
             return `${Y}-${M}`;
        }
        
        return `${Y}-${M}-${D}`;
    } catch (e) {
        return dateStr;
    }
};

const StockChart = forwardRef<StockChartRef, StockChartProps>((props, ref) => {
  const { 
    data, symbol, interval, activeTool = 'select', drawings = [], tradeMarkers = [],
    onUpdateDrawings, indicators = [], id, isActive, onActivate,
    customUpColor = '#089981', customDownColor = '#f23645', showGrid = true,
    lineThickness = 1, style = ChartStyle.CANDLE, layoutPreference, syncGroup, onOpenIndicatorSettings
  } = props;

  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const [tempPoints, setTempPoints] = useState<DrawingPoint[]>([]);
  const prevSymbolRef = useRef<string>(symbol);
  
  // Track resize request to cancel on unmount
  const resizeReqRef = useRef<number | null>(null);

  useImperativeHandle(ref, () => ({
    getChartImage: () => {
        if (!chartInstance.current) return null;
        try {
            return chartInstance.current.getDataURL({
                type: 'png',
                pixelRatio: 2, 
                backgroundColor: '#0b0e14' 
            });
        } catch(e) { return null; }
    },
    resize: () => {
        const chart = chartInstance.current;
        const container = chartRef.current;
        // Strict safety check for offsetWidth/Height
        if (chart && !chart.isDisposed() && container && container.isConnected) {
            if (container.offsetWidth > 0 && container.offsetHeight > 0) {
                try { chart.resize(); } catch(e) { console.warn("Resize failed", e); }
            }
        }
    },
    zoomFit: () => {
        chartInstance.current?.dispatchAction({
            type: 'dataZoom',
            start: 0,
            end: 100
        });
    }
  }));

  const processedData = useMemo(() => {
      if (style === ChartStyle.HEIKIN_ASHI) {
          return calculateHeikinAshi(data);
      }
      return data;
  }, [data, style]);

  const getChartOption = useMemo(() => {
    if (!processedData.length) return null;

    const dates = processedData.map(d => d.date);
    const values = processedData.map(d => [d.open, d.close, d.low, d.high]);
    
    let mainSeries: any = {
        name: symbol,
        type: style === ChartStyle.LINE || style === ChartStyle.AREA ? 'line' : 'candlestick',
        data: style === ChartStyle.LINE || style === ChartStyle.AREA ? processedData.map(d => d.close) : values,
        itemStyle: {
            color: customUpColor,
            color0: customDownColor,
            borderColor: customUpColor,
            borderColor0: customDownColor
        },
        lineStyle: {
            width: lineThickness
        },
        markPoint: {
            data: tradeMarkers.map(m => ({
                name: m.type,
                coord: [m.date, m.price],
                value: m.text || (m.type === 'BUY' ? 'B' : 'S'),
                itemStyle: { color: m.type === 'BUY' ? customUpColor : customDownColor },
                label: { offset: [0, -5] }
            })),
            symbolSize: 30,
            symbol: 'pin' 
        }
    };

    if (style === ChartStyle.AREA) {
        mainSeries.areaStyle = {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: customUpColor + '80' },
                { offset: 1, color: customUpColor + '00' }
            ])
        };
    }

    let indicatorSeries: any[] = [];
    indicators.forEach(indId => {
       try {
           const series = generateIndicatorSeries(indId, processedData);
           indicatorSeries = [...indicatorSeries, ...series];
       } catch(e) {}
    });

    const drawingElements: any[] = [];
    if (chartInstance.current) {
        drawings.forEach(d => {
            const els = getDrawingGraphic(chartInstance.current!, d, processedData, activeTool === 'select');
            drawingElements.push(...els);
        });
        
        if (tempPoints.length > 0 && activeTool && activeTool !== 'select') {
             const tempDrawing: Drawing = {
                 id: 'temp',
                 type: activeTool as DrawingType,
                 points: tempPoints,
                 style: { color: '#ffffff', lineWidth: 2, lineType: 'dashed' },
                 visible: true,
                 locked: false
             };
             const els = getDrawingGraphic(chartInstance.current!, tempDrawing, processedData, false);
             drawingElements.push(...els);
        }
    }

    return {
        backgroundColor: '#0b0e14',
        animation: false,
        grid: { left: 10, right: 60, top: 20, bottom: 20 },
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'cross' },
            backgroundColor: 'rgba(19, 23, 34, 0.9)',
            borderColor: '#2a2e39',
            textStyle: { color: '#d1d4dc' },
            position: (pos: any, params: any, dom: any, rect: any, size: any) => {
                const obj = { top: 10 };
                // @ts-ignore
                obj[['left', 'right'][+(pos[0] < size.viewSize[0] / 2)]] = 5;
                return obj;
            }
        },
        xAxis: {
            type: 'category',
            data: dates,
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: { 
                color: '#888',
                formatter: (val: string) => formatAxisDate(val, interval)
            },
            splitLine: { show: showGrid, lineStyle: { color: '#1f2937', opacity: 0.5 } }
        },
        yAxis: {
            scale: true,
            position: 'right',
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: { color: '#888' },
            splitLine: { show: showGrid, lineStyle: { color: '#1f2937', opacity: 0.5 } }
        },
        dataZoom: [
            { type: 'inside', start: 80, end: 100 },
            { type: 'slider', show: false }
        ],
        series: [mainSeries, ...indicatorSeries],
        graphic: drawingElements
    };
  }, [processedData, symbol, style, customUpColor, customDownColor, showGrid, tradeMarkers, indicators, drawings, tempPoints, activeTool, interval, lineThickness]);

  const getPointFromEvent = (e: any) => {
      if (!chartInstance.current) return null;
      try {
          const pointInPixel = [e.offsetX, e.offsetY];
          const pointInGrid = chartInstance.current.convertFromPixel({ seriesIndex: 0 }, pointInPixel);
          if (!pointInGrid) return null;
          
          const dataIndex = Math.round(pointInGrid[0]);
          const price = pointInGrid[1];
          
          if (dataIndex < 0 || dataIndex >= processedData.length) return null;
          
          return {
              date: processedData[dataIndex].date,
              price,
              seriesIndex: dataIndex,
              timestamp: new Date(processedData[dataIndex].date).getTime()
          };
      } catch(err) {
          // Silent fail if conversion fails (e.g. during resize or data update)
          return null;
      }
  };

  const handleChartClick = (e: any) => {
      if (activeTool === 'select' || !onUpdateDrawings) return;
      
      const point = getPointFromEvent(e);
      if (!point) return;

      const newPoints = [...tempPoints, point];
      
      let isComplete = false;
      if (['trend', 'ray', 'extended', 'rect', 'circle', 'fib_ret', 'fib_ext'].includes(activeTool) && newPoints.length === 2) isComplete = true;
      if (['text', 'arrow', 'vline', 'hline'].includes(activeTool) && newPoints.length === 1) isComplete = true;
      if (['triangle', 'pitchfork'].includes(activeTool) && newPoints.length === 3) isComplete = true;
      if (['channel'].includes(activeTool) && newPoints.length === 3) isComplete = true;

      if (isComplete) {
          const newDrawing: Drawing = {
              id: `${activeTool}_${Date.now()}`,
              type: activeTool as DrawingType,
              points: newPoints,
              style: { color: customUpColor, lineWidth: 2, lineType: 'solid' },
              visible: true,
              locked: false
          };
          onUpdateDrawings([...drawings, newDrawing]);
          setTempPoints([]);
      } else {
          setTempPoints(newPoints);
      }
  };

  const handleMouseMove = (e: any) => {
      // Logic for previewing the next point could go here
  };

  useEffect(() => {
      if (!chartRef.current) return;
      
      const chart = echarts.init(chartRef.current, null, { renderer: 'canvas' });
      chartInstance.current = chart;

      const handleResize = () => {
          const container = chartRef.current;
          const instance = chartInstance.current;
          // Add safety check: only resize if container has valid dimensions and is connected
          if (instance && !instance.isDisposed() && container && container.isConnected) {
              // Using offsetWidth checks to ensure the container has layout
              if (container.offsetWidth > 0 && container.offsetHeight > 0) {
                  try { instance.resize(); } catch(e) {}
              }
          }
      };
      
      const ro = new ResizeObserver(() => {
          if (resizeReqRef.current) cancelAnimationFrame(resizeReqRef.current);
          resizeReqRef.current = requestAnimationFrame(handleResize);
      });
      ro.observe(chartRef.current);

      chart.getZr().on('click', handleChartClick);
      chart.getZr().on('mousemove', handleMouseMove);

      return () => {
          if (resizeReqRef.current) cancelAnimationFrame(resizeReqRef.current);
          ro.disconnect();
          if (chart && !chart.isDisposed()) {
              chart.group = ''; // Prevent zombie sync errors on unmount
              // Hide tip to prevent "innerHTML of null" error if tooltip is active during dispose
              chart.dispatchAction({ type: 'hideTip' });
              chart.dispose();
          }
          chartInstance.current = null;
      };
  }, []);

  useEffect(() => {
      const chart = chartInstance.current;
      if (chart && !chart.isDisposed()) {
          // IMPORTANT: Disconnect group BEFORE updating options to prevent 'getRawIndex' error
          // This error occurs when synchronized charts try to access each other's data during update
          chart.group = ''; 
          
          if (getChartOption) {
              try {
                  const isSymbolChanged = prevSymbolRef.current !== symbol;
                  
                  // Clone option to safely modify
                  const finalOption = { ...getChartOption };

                  // If symbol hasn't changed, try to preserve current zoom state
                  // This prevents the chart from resetting to default zoom on every data update/redraw
                  if (!isSymbolChanged) {
                      const currentOption = chart.getOption() as any;
                      if (currentOption && currentOption.dataZoom && currentOption.dataZoom.length > 0) {
                          const currentStart = currentOption.dataZoom[0].start;
                          const currentEnd = currentOption.dataZoom[0].end;
                          
                          if (finalOption.dataZoom && finalOption.dataZoom.length > 0) {
                              const newZoom = [...finalOption.dataZoom];
                              newZoom[0] = { ...newZoom[0], start: currentStart, end: currentEnd };
                              finalOption.dataZoom = newZoom;
                          }
                      }
                  }

                  // Use notMerge: true to ensure clean state for series
                  // FIX: Set lazyUpdate to false to prevent race conditions with group sync
                  chart.setOption(finalOption, { notMerge: true, lazyUpdate: false });
                  
                  // Only re-bind to sync group if we have valid data
                  // Prevents syncing empty charts which causes crashes
                  if (syncGroup && processedData.length > 0) {
                      chart.group = syncGroup;
                  }
                  
                  prevSymbolRef.current = symbol;
              } catch(e) {
                  console.warn("Chart update failed", e);
              }
          } else {
              chart.clear();
          }
      }
      
      // Cleanup: remove group when unmounting or changing dependencies to prevent phantom listeners
      return () => {
          if (chart && !chart.isDisposed()) {
              chart.group = '';
          }
      };
  }, [getChartOption, syncGroup, symbol]);

  return (
    <div 
        ref={chartRef} 
        className={`w-full h-full ${isActive ? 'ring-1 ring-blue-500/50' : ''}`}
        onClick={onActivate}
    />
  );
});

export default StockChart;