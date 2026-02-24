
import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, User, Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { streamChatResponse } from '../services/geminiService';
import { AgentSystemState, MultiAgentContext } from '../types';

interface ChatWidgetProps {
  onOpenKeySelector?: () => void;
  hideOnMobile?: boolean;
  agentState?: AgentSystemState;
  agentLogs?: {time: string, msg: string}[];
  multiAgentContext?: MultiAgentContext;
  embedded?: boolean; // New prop to control positioning mode
}

interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

const ChatWidget: React.FC<ChatWidgetProps> = ({ 
  onOpenKeySelector, 
  hideOnMobile = false,
  agentState,
  agentLogs,
  multiAgentContext,
  embedded = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', content: '你好！我是您的专属AI交易助手。作为交易团队的联络员，您可以随时询问团队的持仓逻辑、市场研判或风控状态。' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      setMessages(prev => [...prev, { role: 'model', content: '' }]);
      
      const context = { 
          agentState, 
          logs: agentLogs,
          multiAgent: multiAgentContext
      };
      
      const stream = streamChatResponse(messages, userMsg, context);
      let fullResponse = '';

      for await (const chunk of stream) {
        fullResponse += chunk;
        setMessages(prev => {
          const newHistory = [...prev];
          newHistory[newHistory.length - 1] = { role: 'model', content: fullResponse };
          return newHistory;
        });
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', content: '抱歉，AI 服务暂时不可用，请稍后再试。' }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Determine container classes based on mode
  const containerClasses = embedded 
    ? "h-full flex items-center relative" // Embedded in flex container
    : `fixed z-50 flex flex-col items-end transition-all duration-300 ${isOpen ? 'inset-0 md:inset-auto md:top-20 md:right-16' : 'top-20 right-16'}`;

  // Determine button styling based on mode
  const buttonClasses = embedded
    ? `h-full px-4 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 transition-colors border-l border-gray-800 ${isOpen ? 'bg-white/10 text-white' : ''}`
    : `w-12 h-12 rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/50 items-center justify-center transition-transform hover:scale-105 active:scale-95 ${hideOnMobile && !isOpen ? 'hidden md:flex' : 'flex'}`;

  // Determine window positioning based on mode
  const windowClasses = embedded
    ? "fixed top-16 right-4 z-[100] w-[90vw] md:w-96 h-[550px] rounded-xl shadow-2xl origin-top-right border border-gray-700 bg-gray-900"
    : `bg-gray-900 border border-gray-700 shadow-2xl flex flex-col overflow-hidden animate-fade-in w-full h-full rounded-none md:mt-2 md:w-96 md:h-[550px] md:rounded-xl origin-top-right`;

  return (
    <div className={containerClasses}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={buttonClasses}
        title="交易团队助理"
      >
        {isOpen && !embedded ? <X className="w-6 h-6" /> : (
            embedded ? (
                <div className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-blue-500" />
                    <span className="text-xs font-bold hidden xl:inline">AI 助理</span>
                </div>
            ) : (
                <MessageSquare className="w-6 h-6" />
            )
        )}
      </button>

      {isOpen && (
        <div className={`${windowClasses} flex flex-col animate-in fade-in zoom-in-95 duration-200`}>
          <div className="p-4 bg-gray-800 border-b border-gray-700 flex justify-between items-center shrink-0">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Bot className="w-5 h-5 text-blue-400" /> 交易团队助理
            </h3>
            <div className="flex items-center gap-2">
               <button onClick={() => setIsOpen(false)} className="p-2 -mr-2 text-gray-400 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-900/95 scroll-smooth">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'model' && (
                  <div className="w-8 h-8 rounded-full bg-blue-900/50 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-5 h-5 text-blue-400" />
                  </div>
                )}
                <div className={`max-w-[85%] rounded-lg p-3 text-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-800 text-gray-200 border border-gray-700'
                }`}>
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-gray-300" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && messages[messages.length - 1].content === '' && (
              <div className="flex gap-2 text-gray-500 text-xs ml-12">
                 <span className="animate-pulse">连线交易团队中...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="p-3 bg-gray-800 border-t border-gray-700 flex gap-2 shrink-0 pb-safe">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="问问团队现在在忙什么..."
              className="flex-1 bg-gray-900 text-white text-base md:text-sm rounded-lg px-4 py-3 md:py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 border border-gray-700"
            />
            <button 
              type="submit" 
              disabled={isLoading || !input.trim()}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default ChatWidget;
