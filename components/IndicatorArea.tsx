
import React, { useEffect } from 'react';
import { Plus, Wand } from 'lucide-react';
import * as echarts from 'echarts';
import { SubIndicatorConfig, CandleData } from '../types';
import IndicatorWindow from './IndicatorWindow';

interface IndicatorAreaProps {
  indicators: SubIndicatorConfig[];
  onUpdateIndicators: (indicators: SubIndicatorConfig[]) => void;
  onOpenLibrary: () => void;
  data: CandleData[];
  syncGroup?: string; 
}

const IndicatorArea: React.FC<IndicatorAreaProps> = ({ 
  indicators, onUpdateIndicators, onOpenLibrary, data
}) => {
  // Always use the active group ID for indicators in this area
  const ACTIVE_GROUP_ID = "ACTIVE_SYNC_GROUP";

  // Ensure charts are connected whenever indicators change or mount
  useEffect(() => {
      // Connect the group to ensure synchronization between main chart and sub-indicators
      // Use a small timeout to ensure all chart instances have mounted and set their group id
      const timer = setTimeout(() => {
          try {
             echarts.connect(ACTIVE_GROUP_ID);
          } catch (e) {
             console.warn("ECharts connect failed", e);
          }
      }, 100);
      return () => clearTimeout(timer);
  }, [indicators.length]);

  const handleRemove = (id: string) => {
    onUpdateIndicators(indicators.filter(i => i.id !== id));
  };

  const handleHeightChange = (id: string, newHeight: number) => {
    onUpdateIndicators(indicators.map(i => i.id === id ? { ...i, height: newHeight } : i));
  };

  return (
    <div className="w-full flex flex-col bg-[#0b0e14]">
      {/* Seamless Toolbar: No border-top, matches main chart bg */}
      <div className="shrink-0 h-8 flex items-center px-2 bg-[#0b0e14] border-b border-[#1e222d] group transition-colors hover:bg-[#131722]/50">
        <button onClick={onOpenLibrary} className="p-1 text-gray-500 hover:text-white transition-colors" title="打开指标库">
          <Plus className="w-4 h-4" />
        </button>
        <button onClick={onOpenLibrary} className="p-1 text-gray-500 hover:text-white transition-colors" title="AI 生成指标">
          <Wand className="w-4 h-4" />
        </button>
        <span className="ml-2 text-[10px] text-gray-600 uppercase font-bold tracking-wider">
            副图 ({indicators.length})
        </span>
      </div>
      
      <div className="flex flex-col w-full">
        {indicators.map((indicator, index) => (
          <IndicatorWindow
            key={indicator.id}
            config={indicator}
            data={data}
            onRemove={() => handleRemove(indicator.id)}
            onHeightChange={(h) => handleHeightChange(indicator.id, h)}
            isLast={index === indicators.length - 1}
            syncGroup={ACTIVE_GROUP_ID}
          />
        ))}
      </div>
    </div>
  );
};

export default IndicatorArea;