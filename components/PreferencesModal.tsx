
import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Palette, Zap, Bell, RotateCcw, Save, BrainCircuit, Cloud, Database, 
  HardDrive, Download, Upload, Trash2, CheckCircle2, CloudLightning, 
  Gavel, Lock, AlertTriangle, Eye, EyeOff, Server, Globe, Shield, 
  Cpu, Microchip, Box, Power, Unlock, Smartphone, Volume2
} from 'lucide-react';
import { UserSettings, DEFAULT_SETTINGS, ExchangeName } from '../types';
import { MemoryService, MemoryStats } from '../services/memoryService';
import { ExchangeService } from '../services/exchangeService';
import { SecurityService } from '../services/securityService';

interface PreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: UserSettings) => void;
  initialSettings: UserSettings;
}

const EXCHANGE_OPTIONS: ExchangeName[] = ['Binance', 'OKX', 'Bybit', 'HTX', 'KuCoin', 'Gate.io', 'Coinbase', 'Kraken', 'Bitget'];

export default function PreferencesModal({ isOpen, onClose, onSave, initialSettings }: PreferencesModalProps) {
  // Merged categories for better UX
  const [activeTab, setActiveTab] = useState<'GENERAL' | 'TRADING' | 'INTELLIGENCE'>('GENERAL');
  
  const [currentSettings, setCurrentSettings] = useState<UserSettings>(initialSettings);
  const [isDirty, setIsDirty] = useState(false);
  
  // Security State
  const [masterPassword, setMasterPassword] = useState('');
  const [isKeysEncrypted, setIsKeysEncrypted] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [showPassphrase, setShowPassphrase] = useState(false);
  
  // Connection Test
  const [testStatus, setTestStatus] = useState<'IDLE' | 'TESTING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [testMessage, setTestMessage] = useState('');
  
  // Memory State
  const [memoryStats, setMemoryStats] = useState<MemoryStats[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrentSettings(initialSettings);
    setIsDirty(false);
    setTestStatus('IDLE');
    setTestMessage('');
    // Check if keys seem encrypted
    const key = initialSettings.trading.exchangeApiKey;
    if (key && key.length > 60 && !key.startsWith('ak_')) { // Heuristic
        setIsKeysEncrypted(true);
    }
  }, [initialSettings, isOpen]);

  useEffect(() => {
      if (activeTab === 'INTELLIGENCE') {
          setLoadingStats(true);
          MemoryService.getStats().then(stats => { setMemoryStats(stats); setLoadingStats(false); });
      }
  }, [activeTab]);

  const handleUpdate = (path: string, value: any) => {
    setCurrentSettings(prev => {
      const keys = path.split('.');
      const updateDeep = (obj: any, keyPath: string[]): any => {
        const [currentKey, ...remainingKeys] = keyPath;
        const copy = Array.isArray(obj) ? [...obj] : { ...obj };
        if (remainingKeys.length === 0) copy[currentKey] = value;
        else copy[currentKey] = updateDeep(obj[currentKey], remainingKeys);
        return copy;
      };
      return updateDeep(prev, keys);
    });
    setIsDirty(true);
  };

  const handleEncryptAndSave = async () => {
      if (!masterPassword) {
          alert("请设置主控密码 (Master Password) 以加密敏感信息");
          return;
      }
      
      try {
          const { exchangeApiKey, exchangeApiSecret, exchangePassphrase } = currentSettings.trading;
          
          // Only encrypt if raw
          const encKey = await SecurityService.encrypt(exchangeApiKey, masterPassword);
          const encSecret = await SecurityService.encrypt(exchangeApiSecret, masterPassword);
          const encPass = exchangePassphrase ? await SecurityService.encrypt(exchangePassphrase, masterPassword) : '';
          
          handleUpdate('trading.exchangeApiKey', encKey);
          handleUpdate('trading.exchangeApiSecret', encSecret);
          if(exchangePassphrase) handleUpdate('trading.exchangePassphrase', encPass);
          
          setIsKeysEncrypted(true);
          alert("密钥加密成功！请务必牢记主控密码。");
      } catch (e) {
          alert("加密失败");
      }
  };

  const handleTestConnection = async () => {
      setTestStatus('TESTING');
      setTestMessage('Connecting...');
      const res = await ExchangeService.validateConnection(currentSettings, masterPassword);
      setTestStatus(res.success ? 'SUCCESS' : 'ERROR');
      setTestMessage(res.message);
  };

  const handleClose = () => {
    if (isDirty && window.confirm('您有未保存的更改，确定要关闭吗？')) onClose();
    else if (!isDirty) onClose();
  };

  const resetToDefault = () => {
    if (window.confirm('确定重置所有设置？')) {
      setCurrentSettings(DEFAULT_SETTINGS);
      setIsDirty(true);
    }
  };

  // --- Memory Handlers ---
  const handleExportMemory = () => {
      const json = MemoryService.exportAllMemories();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `alphaflow_memory_${new Date().toISOString().slice(0,10)}.json`; document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const handleImportMemory = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = async (event) => {
          try {
              const text = event.target?.result as string;
              const { success, errors } = await MemoryService.importMemories(text);
              alert(`导入完成: 成功 ${success}, 失败 ${errors}`);
              setLoadingStats(true);
              MemoryService.getStats().then(stats => { setMemoryStats(stats); setLoadingStats(false); });
          } catch (err) {
              alert('导入失败: 文件格式错误');
          }
      };
      reader.readAsText(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClearAgent = async (id: string) => {
      if (window.confirm(`确定要清除智能体 [${id}] 的所有记忆吗？`)) {
          await MemoryService.clearAgentMemory(id);
          setMemoryStats(prev => prev.filter(s => s.id !== id));
      }
  };

  const TEAM_CONFIGS = [
      { id: 'BASIC', name: 'Alpha Squad', desc: '基础趋势/均线策略', risk: 'Low' },
      { id: 'MANUAL', name: 'Beta Squad', desc: '人工/半自动进化', risk: 'High' },
      { id: 'FINRL', name: 'Gamma Squad', desc: '深度强化学习集群', risk: 'Medium' },
      { id: 'BAYESIAN', name: 'Bayesian HQ', desc: '贝叶斯最高决策层', risk: 'Dynamic' },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in p-0 md:p-4">
      <div className="bg-[#1e222d] border border-gray-700 w-full h-full md:rounded-2xl md:max-w-5xl md:h-[85vh] shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-4 py-3 md:px-6 md:py-4 border-b border-gray-800 flex justify-between items-center bg-[#131722] shrink-0">
          <h2 className="text-base md:text-lg font-black text-white tracking-widest uppercase flex items-center gap-3">
            <Zap className="w-5 h-5 text-blue-500 fill-current" /> 设置 (Settings)
          </h2>
          <button onClick={handleClose} className="p-2 bg-gray-800 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Responsive Content Container */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Navigation - Mobile Top Bar / Desktop Sidebar */}
          <div className="w-full md:w-56 bg-[#131722]/80 border-b md:border-b-0 md:border-r border-gray-800 flex md:flex-col overflow-x-auto no-scrollbar shrink-0">
            {[
              { id: 'GENERAL', label: '通用设置', icon: Palette },
              { id: 'TRADING', label: '交易接入', icon: Server },
              { id: 'INTELLIGENCE', label: '智能与记忆', icon: BrainCircuit },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  flex items-center justify-center md:justify-start gap-2 md:gap-3 px-4 py-3 md:px-5 md:py-4 text-xs md:text-sm font-bold transition-all whitespace-nowrap flex-1 md:flex-none
                  ${activeTab === tab.id 
                    ? 'bg-blue-600/10 text-blue-400 border-b-2 md:border-b-0 md:border-l-4 border-blue-500' 
                    : 'text-gray-500 hover:bg-gray-800 hover:text-gray-300 border-b-2 md:border-b-0 md:border-l-4 border-transparent'}
                `}
              >
                <tab.icon className={`w-4 h-4 md:w-5 md:h-5 ${activeTab === tab.id ? 'text-blue-400' : 'text-gray-500'}`} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#0b0e14] custom-scrollbar">
            
            {/* --- TAB: GENERAL --- */}
            {activeTab === 'GENERAL' && (
              <div className="space-y-6 max-w-2xl mx-auto">
                {/* Theme Section */}
                <section className="bg-[#1e222d] border border-gray-700 rounded-xl p-5">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Palette className="w-4 h-4" /> 界面外观
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                        <label className="text-xs text-gray-400 mb-2 block">主题模式</label>
                        <div className="grid grid-cols-3 gap-2 bg-black/30 p-1 rounded-lg">
                            {['dark', 'light', 'system'].map(t => (
                            <button 
                                key={t} 
                                onClick={() => handleUpdate('appearance.theme', t)} 
                                className={`py-2.5 rounded-md text-xs font-bold uppercase transition-all ${currentSettings.appearance.theme === t ? 'bg-blue-600 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                {t}
                            </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                          <label className="text-xs text-gray-400 mb-2 block">涨 (Bull Color)</label>
                          <div className="flex items-center gap-2 bg-black/30 p-2 rounded-lg border border-gray-700">
                              <input type="color" value={currentSettings.appearance.upColor} onChange={e => handleUpdate('appearance.upColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer bg-transparent border-none p-0" />
                              <span className="text-xs font-mono">{currentSettings.appearance.upColor}</span>
                          </div>
                      </div>
                      <div>
                          <label className="text-xs text-gray-400 mb-2 block">跌 (Bear Color)</label>
                          <div className="flex items-center gap-2 bg-black/30 p-2 rounded-lg border border-gray-700">
                              <input type="color" value={currentSettings.appearance.downColor} onChange={e => handleUpdate('appearance.downColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer bg-transparent border-none p-0" />
                              <span className="text-xs font-mono">{currentSettings.appearance.downColor}</span>
                          </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Notifications & System */}
                <section className="bg-[#1e222d] border border-gray-700 rounded-xl p-5">
                   <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Smartphone className="w-4 h-4" /> 交互与提醒
                   </h3>
                   
                   <div className="space-y-3">
                       <label className="flex items-center justify-between p-3 bg-black/20 rounded-lg cursor-pointer hover:bg-black/40 transition-colors">
                           <div className="flex items-center gap-3">
                               <Volume2 className="w-4 h-4 text-gray-400" />
                               <span className="text-sm font-medium text-gray-200">交易音效</span>
                           </div>
                           <input type="checkbox" checked={currentSettings.notifications.sound} onChange={e => handleUpdate('notifications.sound', e.target.checked)} className="w-5 h-5 accent-blue-600 rounded" />
                       </label>

                       <label className="flex items-center justify-between p-3 bg-black/20 rounded-lg cursor-pointer hover:bg-black/40 transition-colors">
                           <div className="flex items-center gap-3">
                               <Bell className="w-4 h-4 text-gray-400" />
                               <span className="text-sm font-medium text-gray-200">价格预警通知</span>
                           </div>
                           <input type="checkbox" checked={currentSettings.notifications.priceAlert} onChange={e => handleUpdate('notifications.priceAlert', e.target.checked)} className="w-5 h-5 accent-blue-600 rounded" />
                       </label>
                   </div>
                </section>
              </div>
            )}

            {/* --- TAB: TRADING --- */}
            {activeTab === 'TRADING' && (
              <div className="space-y-6 max-w-3xl mx-auto">
                 {/* 1. API Configuration */}
                 <div className="bg-[#181c25] border border-gray-700 rounded-xl p-5 md:p-6 shadow-lg">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-2">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-900/20 rounded-lg text-emerald-500 border border-emerald-500/20">
                                <Shield className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-white">交易所接入 (API Access)</h3>
                                <p className="text-[10px] text-gray-500">Encrypted Vault Storage</p>
                            </div>
                        </div>
                        {isKeysEncrypted && (
                            <span className="text-[10px] bg-emerald-900/30 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1 font-bold">
                                <Lock className="w-3 h-3" /> SECURE
                            </span>
                        )}
                    </div>
                    
                    <div className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1.5">目标交易所</label>
                                <select 
                                    value={currentSettings.trading.exchangeName}
                                    onChange={(e) => handleUpdate('trading.exchangeName', e.target.value)}
                                    className="w-full bg-black/40 border border-gray-700 rounded-lg px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none appearance-none"
                                >
                                    {EXCHANGE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1.5">主控密码 (Session Key)</label>
                                <input 
                                    type="password" 
                                    value={masterPassword}
                                    onChange={(e) => setMasterPassword(e.target.value)}
                                    className="w-full bg-black/40 border border-gray-700 rounded-lg px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none"
                                    placeholder="用于加密/解密的本地密码"
                                />
                            </div>
                        </div>

                        <div className="space-y-4 pt-2">
                            <div>
                                <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1.5">API Key</label>
                                <input 
                                    type="text" 
                                    value={currentSettings.trading.exchangeApiKey}
                                    onChange={(e) => { handleUpdate('trading.exchangeApiKey', e.target.value.trim()); setIsKeysEncrypted(false); }}
                                    className={`w-full bg-black/40 border border-gray-700 rounded-lg px-4 py-3 text-sm font-mono text-white focus:border-emerald-500 outline-none ${isKeysEncrypted ? 'text-emerald-500' : ''}`}
                                    placeholder={isKeysEncrypted ? "ENCRYPTED_DATA_..." : "Enter Exchange API Key"}
                                    readOnly={isKeysEncrypted}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1.5">Secret Key</label>
                                <div className="relative">
                                    <input 
                                        type={showSecret ? "text" : "password"}
                                        value={currentSettings.trading.exchangeApiSecret}
                                        onChange={(e) => { handleUpdate('trading.exchangeApiSecret', e.target.value.trim()); setIsKeysEncrypted(false); }}
                                        className={`w-full bg-black/40 border border-gray-700 rounded-lg px-4 py-3 text-sm font-mono text-white focus:border-emerald-500 outline-none ${isKeysEncrypted ? 'text-emerald-500' : ''}`}
                                        placeholder={isKeysEncrypted ? "ENCRYPTED_DATA_..." : "Enter Exchange Secret"}
                                        readOnly={isKeysEncrypted}
                                    />
                                    <button 
                                        onClick={() => setShowSecret(!showSecret)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white p-1"
                                    >
                                        {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                            
                            {/* Optional Passphrase */}
                            {['OKX', 'KuCoin', 'Gate.io', 'Bitget'].includes(currentSettings.trading.exchangeName) && (
                                <div>
                                    <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1.5">Passphrase</label>
                                    <div className="relative">
                                        <input 
                                            type={showPassphrase ? "text" : "password"}
                                            value={currentSettings.trading.exchangePassphrase || ''}
                                            onChange={(e) => { handleUpdate('trading.exchangePassphrase', e.target.value.trim()); setIsKeysEncrypted(false); }}
                                            className={`w-full bg-black/40 border border-gray-700 rounded-lg px-4 py-3 text-sm font-mono text-white focus:border-emerald-500 outline-none ${isKeysEncrypted ? 'text-emerald-500' : ''}`}
                                            placeholder="Enter API Passphrase"
                                            readOnly={isKeysEncrypted}
                                        />
                                        <button 
                                            onClick={() => setShowPassphrase(!showPassphrase)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white p-1"
                                        >
                                            {showPassphrase ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-2">
                             <button 
                                onClick={handleEncryptAndSave}
                                disabled={isKeysEncrypted || !currentSettings.trading.exchangeApiKey}
                                className="w-full md:w-auto text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                             >
                                <Lock className="w-3.5 h-3.5" /> 加密并保存
                             </button>

                             <div className="w-full md:w-auto flex items-center justify-between md:justify-end gap-3 bg-black/20 p-2 rounded-lg border border-gray-700">
                                <div className="text-[10px] px-2 truncate flex-1 min-w-0" title={testMessage}>
                                    {testStatus === 'TESTING' && <span className="text-yellow-500 flex items-center gap-1"><Zap className="w-3 h-3 animate-spin"/> Testing...</span>}
                                    {testStatus === 'SUCCESS' && <span className="text-emerald-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> {testMessage}</span>}
                                    {testStatus === 'ERROR' && <span className="text-rose-500 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> {testMessage || 'Failed'}</span>}
                                    {testStatus === 'IDLE' && <span className="text-gray-600">未测试</span>}
                                </div>
                                <button onClick={handleTestConnection} className="text-xs font-bold border border-gray-600 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded transition-colors whitespace-nowrap shrink-0">
                                    连接测试
                                </button>
                             </div>
                        </div>
                    </div>
                 </div>

                 {/* 2. Authorization Matrix */}
                 <div className="bg-[#181c25] border border-gray-700 rounded-xl p-5 md:p-6 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 opacity-5 pointer-events-none">
                        <Gavel className="w-24 h-24 text-indigo-500" />
                    </div>
                    
                    <div className="flex flex-col gap-4">
                        {/* Master Switch */}
                        <div className="flex items-center justify-between bg-indigo-900/10 p-4 rounded-xl border border-indigo-500/20">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${currentSettings.trading.enableRealTrading ? 'bg-indigo-500 text-white' : 'bg-gray-700 text-gray-400'}`}>
                                    {currentSettings.trading.enableRealTrading ? <Unlock className="w-5 h-5"/> : <Lock className="w-5 h-5"/>}
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-gray-200">实盘交易总开关 (Master Switch)</h4>
                                    <p className="text-[10px] text-gray-500">开启后，授权团队将执行真实资金操作</p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    className="sr-only peer" 
                                    checked={currentSettings.trading.enableRealTrading}
                                    onChange={(e) => {
                                        handleUpdate('trading.enableRealTrading', e.target.checked);
                                        if(!e.target.checked) handleUpdate('trading.activeTradingTeam', 'NONE');
                                    }}
                                />
                                <div className="w-12 h-7 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                        </div>

                        {/* Team Grid */}
                        <div className="pt-2">
                            <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">团队 API 授权 (Team Auth)</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {TEAM_CONFIGS.map(team => {
                                    const isSelected = currentSettings.trading.activeTradingTeam === team.id;
                                    const isLive = isSelected && currentSettings.trading.enableRealTrading;
                                    const isDisabled = !currentSettings.trading.enableRealTrading;

                                    return (
                                        <div 
                                            key={team.id}
                                            onClick={() => {
                                                if (isDisabled) return;
                                                const newVal = isSelected ? 'NONE' : team.id;
                                                handleUpdate('trading.activeTradingTeam', newVal);
                                            }}
                                            className={`
                                                relative p-4 rounded-xl border transition-all cursor-pointer overflow-hidden group
                                                ${isDisabled ? 'opacity-50 cursor-not-allowed border-gray-800 bg-gray-900' : 
                                                  isLive ? 'border-rose-500 bg-rose-900/10 shadow-[0_0_15px_rgba(244,63,94,0.2)]' : 
                                                  'border-gray-700 bg-gray-800/30 hover:bg-gray-800 hover:border-gray-600'}
                                            `}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex flex-col">
                                                    <span className={`text-sm font-bold ${isLive ? 'text-rose-400' : 'text-gray-300'}`}>{team.name}</span>
                                                    <span className="text-[10px] text-gray-500">{team.desc}</span>
                                                </div>
                                                {isLive ? (
                                                    <div className="p-1 bg-rose-500/20 rounded-full animate-pulse"><Power className="w-4 h-4 text-rose-500" /></div>
                                                ) : (
                                                    <div className={`w-4 h-4 rounded-full border-2 mt-1 ${isSelected ? 'border-rose-500' : 'border-gray-600'}`}></div>
                                                )}
                                            </div>
                                            <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-700/50">
                                                <span className="text-[10px] text-gray-500 font-mono">Risk: {team.risk}</span>
                                                <span className={`text-[9px] font-black px-2 py-0.5 rounded ${isLive ? 'bg-rose-500 text-white' : 'bg-gray-700 text-gray-400'}`}>
                                                    {isLive ? 'ACTIVE' : 'SIMULATION'}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                 </div>
              </div>
            )}

            {/* --- TAB: INTELLIGENCE --- */}
            {activeTab === 'INTELLIGENCE' && (
                <div className="space-y-6 max-w-4xl mx-auto h-full flex flex-col">
                    {/* AI Config */}
                    <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border border-indigo-500/30 rounded-xl p-5 relative overflow-hidden shrink-0">
                        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                            <BrainCircuit className="w-24 h-24 text-indigo-400" />
                        </div>
                        <h3 className="text-sm font-black text-white mb-4 flex items-center gap-2">
                            <Microchip className="w-5 h-5 text-indigo-400" /> AI 核心配置
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div 
                                className={`p-4 rounded-xl border cursor-pointer transition-all ${currentSettings.ai.provider === 'CLOUD' ? 'bg-indigo-600/20 border-indigo-500 shadow-lg shadow-indigo-900/20' : 'bg-gray-800/30 border-gray-700 hover:bg-gray-800/50'}`}
                                onClick={() => handleUpdate('ai.provider', 'CLOUD')}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <CloudLightning className={`w-5 h-5 ${currentSettings.ai.provider === 'CLOUD' ? 'text-indigo-400' : 'text-gray-500'}`} />
                                        <span className="font-bold text-white text-sm">云端 AI (Cloud)</span>
                                    </div>
                                    {currentSettings.ai.provider === 'CLOUD' && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
                                </div>
                                <p className="text-[10px] text-gray-400 leading-relaxed pl-7">
                                    Google Gemini. 高级推理，联网搜索能力。
                                </p>
                            </div>

                            <div 
                                className={`p-4 rounded-xl border cursor-pointer transition-all ${currentSettings.ai.provider === 'LOCAL' ? 'bg-emerald-600/20 border-emerald-500 shadow-lg shadow-emerald-900/20' : 'bg-gray-800/30 border-gray-700 hover:bg-gray-800/50'}`}
                                onClick={() => handleUpdate('ai.provider', 'LOCAL')}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <Cpu className={`w-5 h-5 ${currentSettings.ai.provider === 'LOCAL' ? 'text-emerald-400' : 'text-gray-500'}`} />
                                        <span className="font-bold text-white text-sm">本地核心 (Local)</span>
                                    </div>
                                    {currentSettings.ai.provider === 'LOCAL' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                                </div>
                                <p className="text-[10px] text-gray-400 leading-relaxed pl-7">
                                    WebGPU / WASM. 零延迟，隐私保护，无网络依赖。
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Memory Matrix */}
                    <div className="flex-1 flex flex-col bg-[#1e222d] border border-gray-700 rounded-xl overflow-hidden min-h-[300px]">
                        <div className="p-4 border-b border-gray-700 bg-black/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                            <div>
                                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                    <Database className="w-4 h-4 text-blue-400" /> 记忆矩阵 (Memory Matrix)
                                </h3>
                                <p className="text-[10px] text-gray-500">智能体长期记忆管理</p>
                            </div>
                            <div className="flex gap-2 w-full sm:w-auto">
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    accept=".json"
                                    onChange={handleImportMemory}
                                />
                                <button onClick={() => fileInputRef.current?.click()} className="flex-1 sm:flex-none px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold rounded-lg border border-gray-600 flex items-center justify-center gap-1 transition-colors">
                                    <Upload className="w-3 h-3" /> 导入
                                </button>
                                <button onClick={handleExportMemory} className="flex-1 sm:flex-none px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg border border-blue-500 flex items-center justify-center gap-1 transition-colors">
                                    <Download className="w-3 h-3" /> 导出备份
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar relative bg-black/40">
                            {loadingStats && (
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10 backdrop-blur-sm">
                                    <Box className="w-8 h-8 text-blue-500 animate-spin" />
                                </div>
                            )}
                            
                            {memoryStats.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-600">
                                    <Database className="w-12 h-12 mb-3 opacity-20" />
                                    <p className="text-xs">暂无记忆数据</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-800">
                                    {memoryStats.map(stat => (
                                        <div key={stat.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors group">
                                            <div>
                                                <div className="text-xs font-bold text-blue-300 font-mono mb-1">{stat.id}</div>
                                                <div className="flex gap-3 text-[10px] text-gray-500">
                                                    <span>Size: {(stat.sizeBytes / 1024).toFixed(2)} KB</span>
                                                    <span>Items: {stat.itemCount}</span>
                                                    <span>Updated: {new Date(stat.lastModified).toLocaleTimeString()}</span>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => handleClearAgent(stat.id)}
                                                className="p-2 text-gray-600 hover:text-rose-500 bg-gray-800/50 hover:bg-rose-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-4 py-3 md:px-6 md:py-4 border-t border-gray-800 flex justify-between items-center bg-[#131722] shrink-0">
          <button onClick={resetToDefault} className="hidden md:flex items-center gap-2 text-[10px] font-black uppercase text-gray-500 hover:text-white transition-colors">
            <RotateCcw className="w-3.5 h-3.5" /> 重置默认
          </button>
          <div className="flex gap-3 w-full md:w-auto">
            <button onClick={handleClose} className="flex-1 md:flex-none px-6 py-3 rounded-xl text-xs font-bold text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 transition-colors">取消</button>
            <button onClick={() => { onSave(currentSettings); onClose(); }} className="flex-1 md:flex-none px-8 py-3 rounded-xl text-xs font-black bg-blue-600 text-white shadow-lg hover:bg-blue-500 transition-all flex items-center justify-center gap-2">
                <Save className="w-4 h-4" /> 保存设置
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
