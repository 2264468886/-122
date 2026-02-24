
import React, { useState, useEffect } from 'react';
import { X, Cpu, HardDrive, Zap, Download, CheckCircle2 } from 'lucide-react';
import { getModelStatus, initModel } from '../services/geminiService';

interface KeyInputModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const KeyInputModal: React.FC<KeyInputModalProps> = ({ isOpen, onClose }) => {
  const [status, setStatus] = useState<any>(getModelStatus());
  const [isInitializing, setIsInitializing] = useState(false);

  useEffect(() => {
    if (isOpen) {
        const updateLoop = setInterval(() => {
            setStatus(getModelStatus());
        }, 500);
        return () => clearInterval(updateLoop);
    }
  }, [isOpen]);

  const handleInit = async () => {
      setIsInitializing(true);
      try {
          await initModel((progress: number) => {
              // Progress is handled by polling getModelStatus in useEffect
          });
      } catch (e) {
          console.error(e);
      } finally {
          setIsInitializing(false);
      }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#1e222d] border border-gray-700 rounded-2xl w-full max-w-md p-6 shadow-2xl relative animate-in zoom-in-95">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-emerald-900/50">
            <Cpu className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white">本地 AI 引擎</h2>
          <p className="text-sm text-gray-400 mt-1">Transformers.js / WebGPU Accelerated</p>
        </div>

        <div className="space-y-5">
          {/* Status Card */}
          <div className="bg-black/30 border border-gray-700 rounded-xl p-5">
              <div className="flex justify-between items-center mb-4">
                  <span className="text-sm font-bold text-gray-300 flex items-center gap-2">
                      <HardDrive className="w-4 h-4 text-blue-400" /> 模型状态
                  </span>
                  <span className={`text-[10px] px-2 py-1 rounded border font-mono uppercase ${status.status === 'ready' ? 'bg-emerald-900/30 text-emerald-400 border-emerald-500/20' : 'bg-yellow-900/30 text-yellow-400 border-yellow-500/20'}`}>
                      {status.status}
                  </span>
              </div>
              
              <div className="space-y-3">
                  <div className="flex justify-between text-xs text-gray-400">
                      <span>架构</span>
                      <span className="text-white font-mono">LaMini-Flan-T5 (77M)</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                      <span>运行环境</span>
                      <span className="text-white font-mono">Browser Local (WASM)</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                      <span>数据隐私</span>
                      <span className="text-emerald-400 font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> 100% 本地离线</span>
                  </div>
              </div>

              {/* Progress Bar */}
              {(status.status === 'loading' || (status.progress > 0 && status.progress < 100)) && (
                  <div className="mt-5">
                      <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                          <span>Loading Weights...</span>
                          <span>{status.progress.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-blue-500 h-full transition-all duration-300" style={{ width: `${status.progress}%` }}></div>
                      </div>
                  </div>
              )}
          </div>

          <div className="bg-blue-900/10 border border-blue-500/20 rounded-xl p-3 flex gap-3 items-start">
              <Zap className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-200/80 leading-relaxed">
                  系统已切换至本地量化模型模式。所有股票筛选、分析和策略生成均在您的设备上完成，无需 API Key，完全免费。初次加载约需 150MB 流量。
              </p>
          </div>
        </div>

        <div className="mt-6">
          {status.status !== 'ready' ? (
              <button 
                onClick={handleInit}
                disabled={isInitializing || status.status === 'loading'}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isInitializing || status.status === 'loading' ? <><Download className="w-4 h-4 animate-bounce" /> 正在加载模型...</> : <><Zap className="w-4 h-4" /> 立即加载本地引擎</>}
              </button>
          ) : (
              <button 
                onClick={onClose}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20 transition-all active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" /> 引擎就绪，开始分析
              </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default KeyInputModal;
