
import React, { useState, useEffect, useRef } from 'react';
import { X, Activity, Terminal, Wallet, HardDrive, Globe, Save, RefreshCw, Database, CheckCircle2, Play, Package, Cpu, Layers, GitMerge, ShieldCheck, Settings, Power } from 'lucide-react';
import { Portfolio } from '../types';
import { hyperStorage } from '../services/hyperStorage';
import { nexusProxy } from '../services/nexusProxy';

interface SystemMonitorProps {
  isOpen: boolean;
  onClose: () => void;
  portfolios?: {
      real: Portfolio;
      sim: Record<string, Portfolio>;
  };
}

const SystemMonitor: React.FC<SystemMonitorProps> = ({ isOpen, onClose, portfolios }) => {
  const [activeTab, setActiveTab] = useState<'KERNEL' | 'BUILD' | 'ACCOUNTS'>('KERNEL');
  const [logs, setLogs] = useState<string[]>([]);
  
  // Kernel State
  const [vaultMounted, setVaultMounted] = useState(false);
  const [proxyEnabled, setProxyEnabled] = useState(false);
  
  // Build Server State
  const [buildStatus, setBuildStatus] = useState<'IDLE' | 'COMPILING' | 'TESTING' | 'PACKAGING' | 'SUCCESS' | 'FAILED'>('IDLE');
  const [buildProgress, setBuildProgress] = useState(0);
  const [kernelVersion, setKernelVersion] = useState('3.2.0-rc1');

  const scrollRef = useRef<HTMLDivElement>(null);
  const initRef = useRef(false);

  // Auto-Start System on Mount (Simulate BIOS/Boot)
  useEffect(() => {
      if (initRef.current) return;
      initRef.current = true;
      
      const bootSequence = async () => {
          // Silent boot logs
          addLog("[BIOS] System Power On. Checking Hardware...");
          setTimeout(() => addLog("[BIOS] Memory OK. CPU OK."), 300);
          setTimeout(() => {
              handleMountVault(true); // Auto mount
          }, 800);
      };
      bootSequence();
  }, []);

  // Log scrolling
  useEffect(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [logs, isOpen]);

  // Proxy Heartbeat
  useEffect(() => {
    const logInterval = setInterval(() => {
        if(proxyEnabled) {
            addLog(`[PROXY] Tunnel active. Heartbeat: ${Date.now().toString().slice(-6)} | Latency: ${Math.floor(Math.random() * 50 + 20)}ms`);
        }
    }, 3000);
    return () => clearInterval(logInterval);
  }, [proxyEnabled]);

  const addLog = (msg: string) => {
      setLogs(prev => [...prev, msg].slice(-100));
  };

  const handleMountVault = async (autoStart = false) => {
      if (autoStart) {
          addLog("[KERNEL] Auto-mounting Virtual Filesystem (VFS)...");
      } else {
          addLog("[STORAGE] Requesting File System Access...");
      }
      
      // In auto-start mode, we default to virtual to avoid blocking prompts unless user explicitly clicked
      const success = await hyperStorage.mountLocalVault(); 
      
      if (success) {
          setVaultMounted(true);
          addLog("[STORAGE] Mount Successful: /dev/vda1 mounted on /alphaflow-data");
          addLog(`[STORAGE] V86 Disk Image loaded. Capacity: 512GB (${autoStart ? 'Virtual' : 'Physical'})`);
      } else {
          addLog("[STORAGE] Mount Failed or Permission Denied.");
      }
  };

  const toggleProxy = async () => {
      if (!proxyEnabled) {
          addLog("[PROXY] Initializing WASM Network Stack...");
          await nexusProxy.enable();
          setProxyEnabled(true);
          addLog("[PROXY] NexusProxy Active. Traffic routed via WebRTC Tunnel.");
      } else {
          await nexusProxy.disable();
          setProxyEnabled(false);
          addLog("[PROXY] NexusProxy Disabled.");
      }
  };

  const startBuildProcess = () => {
      if (buildStatus !== 'IDLE' && buildStatus !== 'SUCCESS' && buildStatus !== 'FAILED') return;
      
      setBuildStatus('COMPILING');
      setBuildProgress(0);
      addLog("[BUILD] Starting AlphaFlow Strategy Compiler...");
      
      let progress = 0;
      const interval = setInterval(() => {
          progress += Math.floor(Math.random() * 10) + 5;
          if (progress > 100) progress = 100;
          setBuildProgress(progress);

          if (progress < 30) {
              if (Math.random() > 0.7) addLog(`[COMPILER] Compiling strategy_v${Date.now().toString().slice(-4)}.ts ... OK`);
          } else if (progress < 60) {
              if (buildStatus !== 'TESTING') {
                  setBuildStatus('TESTING');
                  addLog("[TEST] Running Unit Tests (Backtest Validation)...");
              }
              if (Math.random() > 0.7) addLog(`[TEST] Test case #${Math.floor(Math.random()*100)} passed.`);
          } else if (progress < 90) {
              if (buildStatus !== 'PACKAGING') {
                  setBuildStatus('PACKAGING');
                  addLog("[LINKER] Linking modules and packing V86 Snapshot...");
              }
          } else {
              setBuildStatus('SUCCESS');
              addLog("[BUILD] Build Successful. Artifact: kernel_image.bin");
              setKernelVersion(`3.2.${Math.floor(Math.random()*10)}`);
              clearInterval(interval);
          }
      }, 200);
  };

  const handleSaveSnapshot = async () => {
      if (!vaultMounted) {
          addLog("[ERROR] Cannot save: No vault mounted.");
          return;
      }
      addLog("[SNAPSHOT] Dumping memory to disk...");
      try {
          const blob = await hyperStorage.createSnapshot({
              settings: {} as any,
              portfolios: portfolios || { real: {} as any, sim: {} },
              agentMemory: {}
          });
          await hyperStorage.saveToDisk(`snapshot_${Date.now()}.bin`, blob);
          addLog(`[SNAPSHOT] State saved (${(blob.size/1024).toFixed(2)} KB). Integrity Verified.`);
      } catch(e: any) {
          addLog(`[SNAPSHOT] Error: ${e.message}`);
      }
  };

  const formatMoney = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

  const renderAccountCard = (title: string, p: Portfolio | undefined, type: 'REAL' | 'SIM', colorClass: string) => {
      if (!p) return null;
      const pnl = p.totalValue - p.initialCapital;
      return (
          <div className="bg-[#1e222d] border border-gray-700 rounded-xl p-4 flex flex-col gap-3 relative overflow-hidden group">
              <div className={`absolute top-0 right-0 p-2 opacity-10 ${colorClass} pointer-events-none`}>
                  <Wallet className="w-16 h-16" />
              </div>
              <div className="flex justify-between items-center z-10">
                  <h4 className="text-xs font-black uppercase text-gray-300 tracking-wider">{title}</h4>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded border ${type === 'REAL' ? 'border-rose-500/30 text-rose-400 bg-rose-900/20' : 'border-blue-500/30 text-blue-400 bg-blue-900/20'}`}>{type}</span>
              </div>
              <div className="z-10">
                  <div className="text-2xl font-black font-mono text-white tracking-tight">{formatMoney(p.totalValue)}</div>
                  <div className={`text-xs font-mono font-bold flex items-center gap-1 ${pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {pnl >= 0 ? '+' : ''}{formatMoney(pnl)}
                  </div>
              </div>
          </div>
      );
  };

  return (
    <div className={`fixed inset-0 z-[300] items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in ${isOpen ? 'flex' : 'hidden'}`}>
      <div className="bg-[#0b0e14] border border-gray-800 w-full h-full md:w-[900px] md:h-[650px] md:rounded-xl shadow-2xl flex flex-col overflow-hidden relative">
        {/* Header */}
        <div className="p-4 border-b border-gray-800 bg-[#131722] shrink-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-900/30 rounded-lg text-indigo-400 border border-indigo-500/30">
                    <Terminal className="w-5 h-5" />
                </div>
                <div>
                    <h2 className="text-sm font-black text-white uppercase tracking-widest">AlphaFlow V86</h2>
                    <div className="text-[10px] text-gray-500 font-mono flex items-center gap-2">
                        <span>Kernel v{kernelVersion}</span>
                        <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                        <span>Hypervisor Active</span>
                    </div>
                </div>
            </div>
            <button onClick={onClose} className="md:hidden text-gray-500 hover:text-white p-1"><X className="w-6 h-6" /></button>
          </div>
          
          <div className="flex bg-black/40 rounded-lg p-1 border border-gray-700 w-full md:w-auto overflow-x-auto no-scrollbar">
                <button onClick={() => setActiveTab('KERNEL')} className={`flex-1 md:flex-none px-4 py-1.5 rounded text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'KERNEL' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}>
                    <Cpu className="w-3 h-3" /> 内核
                </button>
                <button onClick={() => setActiveTab('BUILD')} className={`flex-1 md:flex-none px-4 py-1.5 rounded text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'BUILD' ? 'bg-amber-600 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}>
                    <Package className="w-3 h-3" /> 构建
                </button>
                <button onClick={() => setActiveTab('ACCOUNTS')} className={`flex-1 md:flex-none px-4 py-1.5 rounded text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'ACCOUNTS' ? 'bg-blue-600 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}>
                    <Activity className="w-3 h-3" /> 状态
                </button>
          </div>
          <button onClick={onClose} className="hidden md:block text-gray-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col bg-[#0b0e14]">
            
            {activeTab === 'KERNEL' && (
                <div className="flex-1 overflow-y-auto p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 custom-scrollbar pb-24 md:pb-6">
                    {/* Module 1: HyperStorage (V86) */}
                    <div className="bg-[#1e222d] border border-gray-700 rounded-xl p-5 relative overflow-hidden group flex flex-col justify-between min-h-[220px]">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none z-0">
                            <HardDrive className="w-32 h-32 text-emerald-500" />
                        </div>
                        
                        <div className="relative z-10">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-xs font-black text-gray-300 uppercase tracking-widest flex items-center gap-2">
                                    <HardDrive className="w-4 h-4 text-emerald-500" /> HyperStorage
                                </h3>
                                {vaultMounted ? <span className="text-[9px] bg-emerald-900/30 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30 font-bold animate-in zoom-in">MOUNTED</span> : <span className="text-[9px] bg-red-900/30 text-red-400 px-2 py-0.5 rounded border border-red-500/30 font-bold">UNMOUNTED</span>}
                            </div>
                            <p className="text-[10px] text-gray-500 leading-relaxed pr-2">
                                V86 虚拟化存储层。支持直接挂载本地物理磁盘，将全量应用状态保存为二进制快照 (Snapshot)。
                            </p>
                        </div>

                        <div className="space-y-3 relative z-20 mt-4">
                            <button 
                                onClick={() => handleMountVault(false)}
                                disabled={vaultMounted}
                                className={`w-full py-2 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-2 ${vaultMounted ? 'bg-emerald-900/10 border-emerald-500/30 text-emerald-500 opacity-50 cursor-default' : 'bg-gray-800 border-gray-600 hover:bg-gray-700 text-gray-300'}`}
                            >
                                {vaultMounted ? <CheckCircle2 className="w-3.5 h-3.5"/> : <Database className="w-3.5 h-3.5"/>}
                                {vaultMounted ? 'Local Vault Active' : 'Mount Local Drive'}
                            </button>
                            <button 
                                onClick={handleSaveSnapshot}
                                disabled={!vaultMounted}
                                className="w-full py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-emerald-900/20 active:scale-95"
                            >
                                <Save className="w-3.5 h-3.5"/>
                                Save System Snapshot
                            </button>
                        </div>
                    </div>

                    {/* Module 2: NexusProxy */}
                    <div className="bg-[#1e222d] border border-gray-700 rounded-xl p-5 relative overflow-hidden group flex flex-col justify-between min-h-[220px]">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none z-0">
                            <Globe className="w-32 h-32 text-blue-500" />
                        </div>
                        
                        <div className="relative z-10">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-xs font-black text-gray-300 uppercase tracking-widest flex items-center gap-2">
                                    <Globe className="w-4 h-4 text-blue-500" /> NexusProxy
                                </h3>
                                {proxyEnabled ? <span className="text-[9px] bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded border border-blue-500/30 font-bold animate-in zoom-in">ACTIVE</span> : <span className="text-[9px] bg-gray-800 text-gray-500 px-2 py-0.5 rounded border border-gray-700 font-bold">DISABLED</span>}
                            </div>
                            <p className="text-[10px] text-gray-500 leading-relaxed pr-2">
                                WASM 加速的本地网络拦截层。通过 Service Worker + WebRTC 建立去中心化隧道，绕过 CORS 限制。
                            </p>
                        </div>

                        <div className="relative z-20 mt-4">
                            <button 
                                onClick={toggleProxy}
                                className={`w-full py-3 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-2 active:scale-95 ${proxyEnabled ? 'bg-blue-600 text-white border-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.3)]' : 'bg-gray-800 border-gray-600 text-gray-400 hover:text-white'}`}
                            >
                                <Activity className={`w-3.5 h-3.5 ${proxyEnabled ? 'animate-pulse' : ''}`}/>
                                {proxyEnabled ? 'Tunnel Active (Routing)' : 'Enable Network Tunnel'}
                            </button>
                        </div>
                    </div>

                    {/* Terminal */}
                    <div className="md:col-span-2 bg-black border border-gray-800 rounded-xl p-3 flex flex-col h-[200px] md:h-[240px]">
                        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-800">
                            <Terminal className="w-3 h-3 text-gray-500" />
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">System Logs</span>
                        </div>
                        <div className="flex-1 overflow-y-auto font-mono text-[10px] space-y-1 custom-scrollbar" ref={scrollRef}>
                            {logs.map((log, i) => (
                                <div key={i} className="text-gray-400 border-l-2 border-transparent hover:border-indigo-500 pl-2 transition-colors flex gap-2 break-all">
                                    <span className="text-indigo-600 shrink-0">$</span>
                                    <span>{log}</span>
                                </div>
                            ))}
                            <div className="animate-pulse text-indigo-500">_</div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'BUILD' && (
                <div className="flex-1 p-4 md:p-6 flex flex-col gap-4 md:gap-6 bg-[#0b0e14] overflow-y-auto custom-scrollbar pb-24 md:pb-6">
                    <div className="bg-[#1e222d] border border-gray-700 rounded-xl p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                            <Layers className="w-32 h-32 text-amber-500" />
                        </div>
                        
                        <div className="flex flex-col md:flex-row justify-between items-start mb-6 relative z-10 gap-4">
                            <div>
                                <h3 className="text-sm font-black text-white uppercase tracking-widest mb-1 flex items-center gap-2">
                                    <Package className="w-4 h-4 text-amber-500" /> Build Server (Local)
                                </h3>
                                <p className="text-xs text-gray-500">Local CI/CD Pipeline. Compile strategies into V86-compatible snapshots.</p>
                            </div>
                            <button 
                                onClick={startBuildProcess}
                                disabled={buildStatus !== 'IDLE' && buildStatus !== 'SUCCESS' && buildStatus !== 'FAILED'}
                                className={`w-full md:w-auto px-5 py-2 rounded-lg text-xs font-black uppercase flex items-center justify-center gap-2 transition-all ${buildStatus === 'COMPILING' ? 'bg-amber-900/20 text-amber-500 border border-amber-500/30' : 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-900/20'}`}
                            >
                                {buildStatus === 'COMPILING' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                                {buildStatus === 'COMPILING' ? 'Building...' : 'Start Build'}
                            </button>
                        </div>

                        {/* Build Pipeline Viz */}
                        <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
                            {[
                                { id: 'COMPILING', label: '1. Compile', icon: Settings },
                                { id: 'TESTING', label: '2. Unit Tests', icon: ShieldCheck },
                                { id: 'PACKAGING', label: '3. Package', icon: Package },
                                { id: 'SUCCESS', label: '4. Deploy', icon: CheckCircle2 }
                            ].map((step, idx) => {
                                const isActive = buildStatus === step.id;
                                const isDone = ['SUCCESS', 'PACKAGING', 'TESTING'].includes(buildStatus) && idx < ['COMPILING', 'TESTING', 'PACKAGING', 'SUCCESS'].indexOf(buildStatus);
                                const isSuccessStep = step.id === 'SUCCESS' && buildStatus === 'SUCCESS';
                                
                                return (
                                    <div key={step.id} className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all duration-300 ${isActive || isSuccessStep ? 'bg-amber-900/10 border-amber-500 text-amber-400 scale-105 shadow-lg' : isDone ? 'bg-gray-800 border-gray-600 text-gray-400 opacity-70' : 'bg-[#131722] border-gray-800 text-gray-600'}`}>
                                        <step.icon className={`w-5 h-5 ${isActive ? 'animate-bounce' : ''}`} />
                                        <span className="text-[10px] font-black uppercase">{step.label}</span>
                                        {isActive && <div className="w-full bg-gray-700 h-1 rounded-full overflow-hidden mt-1"><div className="h-full bg-amber-500 animate-progress"></div></div>}
                                    </div>
                                )
                            })}
                        </div>

                        {/* Progress Bar */}
                        <div className="relative z-10">
                            <div className="flex justify-between text-[10px] text-gray-500 mb-1 font-mono">
                                <span>Progress</span>
                                <span>{buildProgress}%</span>
                            </div>
                            <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden border border-gray-700">
                                <div 
                                    className={`h-full transition-all duration-300 ${buildStatus === 'FAILED' ? 'bg-red-500' : buildStatus === 'SUCCESS' ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                                    style={{ width: `${buildProgress}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Artifacts List */}
                    <div className="flex-1 bg-black border border-gray-800 rounded-xl p-4 overflow-y-auto custom-scrollbar min-h-[150px]">
                        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-800 text-gray-500">
                            <GitMerge className="w-4 h-4" />
                            <span className="text-xs font-black uppercase">Build Artifacts</span>
                        </div>
                        <table className="w-full text-left text-[10px] text-gray-400">
                            <thead>
                                <tr className="uppercase text-gray-600">
                                    <th className="pb-2">Artifact</th>
                                    <th className="pb-2">Size</th>
                                    <th className="pb-2 text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="font-mono">
                                {buildStatus === 'SUCCESS' && (
                                    <tr className="border-b border-gray-800/50">
                                        <td className="py-2 text-white">snapshot.bin</td>
                                        <td className="py-2">45 MB</td>
                                        <td className="py-2 text-right text-emerald-500 font-bold">READY</td>
                                    </tr>
                                )}
                                <tr className="border-b border-gray-800/50 opacity-50">
                                    <td className="py-2">core.wasm</td>
                                    <td className="py-2">2.1 MB</td>
                                    <td className="py-2 text-right text-gray-500">ARCHIVED</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'ACCOUNTS' && portfolios && (
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar pb-24 md:pb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {renderAccountCard('基础智能体', portfolios.sim['BASIC'], 'SIM', 'text-emerald-500')}
                        {renderAccountCard('FinRL 集群', portfolios.sim['FINRL'], 'SIM', 'text-purple-500')}
                        {renderAccountCard('贝叶斯决策', portfolios.sim['BAYESIAN'], 'SIM', 'text-blue-500')}
                        {renderAccountCard('手动账户', portfolios.sim['MANUAL'], 'SIM', 'text-orange-500')}
                    </div>
                    {portfolios.real.totalValue > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-800">
                            {renderAccountCard('实盘 API 账户', portfolios.real, 'REAL', 'text-rose-600')}
                        </div>
                    )}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default SystemMonitor;
