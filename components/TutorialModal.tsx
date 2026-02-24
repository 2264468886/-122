
import React, { useState, useEffect } from 'react';
import { X, ChevronRight, BarChart2, Search } from 'lucide-react';

interface TutorialModalProps {
  showForce: boolean;
  onHandled: () => void;
}

const TutorialModal: React.FC<TutorialModalProps> = ({ showForce, onHandled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Logic to decide if modal should open, based on prop or first visit
    const hasSeen = localStorage.getItem('hasSeenTutorial');
    if (showForce) {
        setIsOpen(true);
        setStep(0); // Always reset to first step when forced open
    } else if (!hasSeen) {
        setIsOpen(true);
    } else {
        setIsOpen(false);
    }
  }, [showForce]);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem('hasSeenTutorial', 'true');
    onHandled(); // Notify parent that the interaction is handled
  };

  const steps = [
    {
      title: "欢迎使用 AlphaFlow Crypto",
      desc: "这是一款专业的加密货币 AI 投研平台。融合链上数据洞察与 LLM 智能分析，助您在 Crypto 市场快人一步。",
      icon: <div className="text-4xl">🚀</div>
    },
    {
      title: "K线深度分析",
      desc: "在主界面查看 BTC、ETH 等主流币种实时行情。点击 'AI 智能分析'，获取基于技术面与链上数据的深度研判。",
      icon: <BarChart2 className="w-12 h-12 text-blue-400" />
    },
    {
      title: "自然语言选币",
      desc: "切换到 '智能选股' (选币) 模式，输入指令（例如：'选出 TVL 增长最快的 Layer2 代币'），AI 自动为您筛选潜力标的。",
      icon: <Search className="w-12 h-12 text-indigo-400" />
    }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6 shadow-2xl relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-600/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-purple-600/20 rounded-full blur-3xl"></div>
        
        <button 
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mt-4 flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mb-6 shadow-inner border border-gray-700">
             {steps[step].icon}
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-3">{steps[step].title}</h2>
          <p className="text-gray-400 leading-relaxed mb-8 h-20">
            {steps[step].desc}
          </p>

          <div className="flex gap-2 mb-6">
            {steps.map((_, i) => (
              <div 
                key={i} 
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  i === step ? 'bg-blue-500 w-6' : 'bg-gray-700'
                }`} 
              />
            ))}
          </div>

          <button
            onClick={() => {
              if (step < steps.length - 1) {
                setStep(step + 1);
              } else {
                handleClose();
              }
            }}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            {step < steps.length - 1 ? (
              <>
                下一步 <ChevronRight className="w-4 h-4" />
              </>
            ) : (
              '开始探索'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TutorialModal;
