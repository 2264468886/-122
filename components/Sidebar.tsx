
import React, { useState } from 'react';
import { 
  LineChart, Filter, Settings, 
  ChevronLeft, ChevronRight, Activity,
  MousePointer2, PenLine, Minus, GripVertical, Square, Circle, Type, Eraser,
  PenTool, ChevronDown, ChevronUp, Newspaper, Globe
} from 'lucide-react';
import { ViewMode } from '../types';

interface SidebarProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  onOpenPreferences: () => void;
  onOpenMonitor: () => void;
  activeTool?: string;
  onToolChange?: (tool: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  currentView, 
  onViewChange, 
  onOpenPreferences, 
  onOpenMonitor,
  activeTool,
  onToolChange
}) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isDrawToolsExpanded, setIsDrawToolsExpanded] = useState(false);

  const navItems = [
    { id: ViewMode.CHART, icon: LineChart, label: '交易终端 (Terminal)' },
    { id: ViewMode.SCREENER, icon: Filter, label: '智能选股 (Screener)' },
    { id: ViewMode.FINGPT, icon: Newspaper, label: 'FinGPT 舆情' },
    { id: ViewMode.INTEL, icon: Globe, label: '全球情报 (Intel)' },
  ];

  const drawingTools = [
    { id: 'select', icon: MousePointer2, label: '选择 (Select)' },
    { id: 'trend', icon: PenLine, label: '趋势线 (Trend)' },
    { id: 'hline', icon: Minus, label: '水平线 (Horz)' },
    { id: 'vline', icon: GripVertical, label: '垂直线 (Vert)' },
    { id: 'rect', icon: Square, label: '矩形 (Rect)' },
    { id: 'circle', icon: Circle, label: '圆形 (Circle)' },
    { id: 'text', icon: Type, label: '文本 (Text)' },
    { id: 'eraser', icon: Eraser, label: '清除 (Eraser)' },
  ];

  return (
    <div 
      className={`h-full bg-[#131722] border-r border-gray-800 flex flex-col transition-all duration-300 ease-in-out shrink-0 z-50 py-2 relative shadow-2xl ${isCollapsed ? 'w-[44px]' : 'w-[240px]'}`}
    >
      {/* Navigation Items */}
      <div className="flex flex-col items-center gap-2 px-0 relative shrink-0 w-full">
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`
                flex items-center rounded-lg transition-all duration-300 group relative overflow-hidden
                ${isCollapsed ? 'justify-center w-9 h-9' : 'px-3 py-2.5 gap-3 w-[220px] mx-auto'}
                ${isActive 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                  : 'text-gray-500 hover:bg-gray-800 hover:text-gray-300'}
                active:scale-95
              `}
              title={isCollapsed ? item.label : ''}
            >
              <item.icon className={`w-5 h-5 shrink-0 transition-transform ${isActive ? '' : 'group-hover:scale-110'}`} />
              {!isCollapsed && (
                <span className="text-xs font-bold tracking-wide whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-300">{item.label}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Drawing Tools (Only in Chart Mode) */}
      {currentView === ViewMode.CHART && onToolChange && (
        <div className={`flex-1 flex flex-col mt-4 overflow-y-auto no-scrollbar ${isCollapsed ? 'items-center px-0' : 'px-2'}`}>
           <div className={`w-full h-px bg-gray-800 mb-2 ${isCollapsed ? 'mx-auto w-6' : ''}`} />
           {/* Tools Accordion Toggle */}
           <button
              onClick={() => setIsDrawToolsExpanded(!isDrawToolsExpanded)}
              className={`
                flex items-center rounded-lg transition-all duration-200 group
                ${isCollapsed ? 'justify-center w-9 h-9' : 'px-3 py-2 gap-3 w-full'}
                ${isDrawToolsExpanded || activeTool !== 'select'
                  ? 'text-blue-400' 
                  : 'text-gray-500 hover:bg-gray-800/30 hover:text-gray-300'}
              `}
              title="绘图工具箱"
           >
              <PenTool className={`w-4 h-4 shrink-0 transition-colors ${activeTool !== 'select' ? 'text-blue-500' : ''}`} />
              {!isCollapsed && (
                <>
                  <span className="text-xs font-bold tracking-wide whitespace-nowrap flex-1 text-left">绘图工具</span>
                  {isDrawToolsExpanded ? <ChevronUp className="w-3 h-3 text-gray-500" /> : <ChevronDown className="w-3 h-3 text-gray-500" />}
                </>
              )}
           </button>

           {/* Expanded List */}
           {isDrawToolsExpanded && (
             <div className={`flex flex-col gap-1 mt-2 transition-all animate-in slide-in-from-top-2 fade-in duration-300 ${isCollapsed ? 'items-center w-full' : 'pl-2'}`}>
               {drawingTools.map((tool) => {
                 const isActive = activeTool === tool.id;
                 return (
                   <button
                     key={tool.id}
                     onClick={() => onToolChange(tool.id)}
                     className={`
                       flex items-center rounded-lg transition-all duration-200 group
                       ${isCollapsed ? 'justify-center p-2 w-[30px] h-[30px]' : 'px-3 py-2 gap-3 w-full'}
                       ${isActive 
                         ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30' 
                         : 'text-gray-500 hover:bg-gray-800 hover:text-gray-300'}
                     `}
                     title={tool.label}
                   >
                     <tool.icon className={`w-3.5 h-3.5 shrink-0 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                     {!isCollapsed && (
                       <span className="text-[10px] font-medium tracking-wide whitespace-nowrap">{tool.label}</span>
                     )}
                   </button>
                 );
               })}
             </div>
           )}
        </div>
      )}

      <div className="flex-1" />

      {/* Footer Tools */}
      <div className="py-2 flex flex-col gap-2 shrink-0 items-center w-full border-t border-gray-800/50 pt-3">
        <button 
          onClick={onOpenMonitor}
          className={`flex items-center rounded-lg transition-all active:scale-95 ${isCollapsed ? 'justify-center w-9 h-9' : 'px-3 py-2 gap-3 w-[220px] hover:bg-gray-800'}`}
          title="系统监控"
        >
          <Activity className="w-4 h-4 text-emerald-500" />
          {!isCollapsed && <span className="text-xs font-bold tracking-wider text-emerald-500">系统状态</span>}
        </button>

        <button 
          onClick={onOpenPreferences}
          className={`flex items-center rounded-lg transition-all active:scale-95 ${isCollapsed ? 'justify-center w-9 h-9' : 'px-3 py-2 gap-3 w-[220px] hover:bg-gray-800'}`}
          title="偏好设置"
        >
          <Settings className="w-4 h-4 text-gray-500 group-hover:rotate-45 transition-transform" />
          {!isCollapsed && <span className="text-xs font-bold tracking-wider text-gray-400">偏好设置</span>}
        </button>
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`flex items-center rounded-lg transition-all active:scale-95 ${isCollapsed ? 'justify-center w-9 h-9' : 'px-3 py-2 gap-3 w-[220px] hover:bg-gray-800'}`}
          title={isCollapsed ? "展开" : "收起"}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4 text-gray-500" /> : <ChevronLeft className="w-4 h-4 text-gray-500" />}
          {!isCollapsed && <span className="text-xs font-bold tracking-wider text-gray-400">收起侧栏</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
