
import React, { useState, useEffect, useRef } from 'react';
import { 
    Cpu, Activity, Shield, Zap, RefreshCw, GitMerge,
    Play, Pause, Network, BookOpen, BarChart3, Terminal,
    Brain, Database, Globe, Search, ArrowUpRight,
    Wallet, TrendingUp, ShieldCheck, Lock, Cloud, CloudLightning, Link, Unlink
} from 'lucide-react';
import { EvoAgent, BeliefState, KnowledgeNode, EVO_AGENTS_CONFIG, simulateEvoCycle } from '../services/evolutionarySimulation';
import { AgentLog, Portfolio } from '../types';
import { MemoryService } from '../services/memoryService';

interface EvolutionaryTradingSystemProps {
    isActive: boolean;
    onToggle: () => void;
    realPortfolio?: Portfolio;
    memorySettings?: any;
    title?: string;
    namespace?: string;
    initialAgents?: EvoAgent[];
    liveStatus?: {
        isConnected: boolean;
        label: string;
    };
}

const AgentNodeCard: React.FC<{ agent: EvoAgent, hasMemory: boolean }> = ({ agent, hasMemory }) => {
    return (
        <div className={`p-2 rounded-lg border flex flex-col gap-1 transition-all duration-300 ${
            agent.status !== 'Idle' 
            ? `bg-opacity-20 border-opacity-50 scale-105 shadow-lg shadow-${agent.color.split('-')[1]}-500/20 bg-${agent.color.split('-')[1]}-900 border-${agent.color.split('-')[1]}-500`
            : 'bg-[#1e222d] border-gray-800 opacity-70'
        }`}>
            <div className="flex justify-between items-center">
                <div className={`text-[9px] font-black uppercase tracking-widest ${agent.color} flex items-center gap-1.5`}>
                    <Cpu className="w-3 h-3" />
                    {agent.name}
                </div>
                <div className="flex items-center gap-1">
                    {hasMemory && (
                        <div className="flex items-center gap-0.5" title="Memory Loaded">
                            <Database className="w-2.5 h-2.5 text-blue-400" />
                            <div className="w-1 h-1 rounded-full bg-blue-400"></div>
                        </div>
                    )}
                    {agent.status !== 'Idle' && (
                        <div className={`w-1.5 h-1.5 rounded-full animate-ping bg-${agent.color.split('-')[1]}-400`}></div>
                    )}
                </div>
            </div>
            <div className="text-[8px] text-gray-500 font-mono truncate">{agent.role}</div>
            <div className="flex flex-wrap gap-1 mt-1">
                {agent.skills.slice(0, 2).map(skill => (
                    <span key={skill} className="text-[7px] px-1 rounded bg-black/40 text-gray-400 border border-gray-700/50">{skill}</span>
                ))}
            </div>
        </div>
    );
};

const AccountCard = ({ type, balance, initial, pnl, active }: { type: 'SIM' | 'REAL', balance: number, initial: number, pnl: number, active: boolean }) => {
    const isProfitable = pnl >= 0;
    return (
        <div className={`flex flex-col p-3 rounded-xl border relative overflow-hidden transition-all ${active ? 'opacity-100' : 'opacity-60 grayscale'} ${type === 'REAL' ? 'bg-rose-900/10 border-rose-500/30' : 'bg-blue-900/10 border-blue-500/30'}`}>
            <div className="flex justify-between items-center mb-2">
                <span className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-1 ${type === 'REAL' ? 'text-rose-400' : 'text-blue-400'}`}>
                    {type === 'REAL' ? <ShieldCheck className="w-3 h-3" /> : <Wallet className="w-3 h-3" />}
                    {type === 'REAL' ? '实体账户 (REAL)' : '模拟账户 (SIM)'}
                </span>
                {type === 'REAL' && <Lock className="w-3 h-3 text-gray-600" />}
            </div>
            
            <div className="flex items-end justify-between">
                <div>
                    <div className="text-xs text-gray-500 font-mono mb-0.5">Total Assets</div>
                    <div className="text-lg font-black text-white tracking-tight">${balance.toLocaleString()}</div>
                </div>
                <div className="text-right">
                    <div className={`text-xs font-bold flex items-center gap-1 ${isProfitable ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isProfitable ? <TrendingUp className="w-3 h-3" /> : <TrendingUp className="w-3 h-3 rotate-180" />}
                        {isProfitable ? '+' : ''}{pnl.toFixed(0)}
                    </div>
                    <div className="text-[9px] text-gray-500">
                        {((pnl / (initial || 1)) * 100).toFixed(2)}%
                    </div>
                </div>
            </div>
            {active && <div className={`absolute bottom-0 left-0 h-0.5 transition-all duration-1000 ${type === 'REAL' ? 'bg-rose-500' : 'bg-blue-500'}`} style={{ width: '100%' }} />}
        </div>
    );
};

const EvolutionaryTradingSystem: React.FC<EvolutionaryTradingSystemProps> = ({ isActive, onToggle, realPortfolio, memorySettings, title, namespace = '', initialAgents, liveStatus }) => {
    const [agents, setAgents] = useState<EvoAgent[]>(initialAgents || EVO_AGENTS_CONFIG);
    const [beliefs, setBeliefs] = useState<BeliefState | null>(null);
    const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeNode[]>([]);
    const [logs, setLogs] = useState<AgentLog[]>([]);
    const [memoryStatus, setMemoryStatus] = useState<Record<string, boolean>>({});
    
    // Sim Account State
    const [simBalance, setSimBalance] = useState(100000);
    const [simInitial] = useState(100000);
    
    const scrollRef = useRef<HTMLDivElement>(null);

    // Initial Load from Cloud/Local Memory (Async)
    useEffect(() => {
        const initMemory = async () => {
            // Restore Bayesian Beliefs
            const keyBayesian = namespace ? `${namespace}_BAYESIAN` : 'BAYESIAN';
            const savedBeliefs = await MemoryService.loadAgentMemory(keyBayesian);
            if (savedBeliefs) {
                setBeliefs(savedBeliefs);
                setMemoryStatus(prev => ({ ...prev, 'BAYESIAN': true }));
                setLogs(prev => [...prev, {
                    id: 'sys-restore-bayes', timestamp: new Date().toLocaleTimeString(), agent: 'System', level: 'SUCCESS',
                    message: `从记忆库恢复贝叶斯信念矩阵 [${namespace || 'Default'}]。`
                }]);
            }
            
            // Restore Knowledge Base
            const keyAutoLearn = namespace ? `${namespace}_AUTO_LEARN` : 'AUTO_LEARN';
            const savedKnowledge = await MemoryService.loadAgentMemory(keyAutoLearn);
            if (savedKnowledge && Array.isArray(savedKnowledge)) {
                setKnowledgeBase(savedKnowledge);
                setMemoryStatus(prev => ({ ...prev, 'AUTO_LEARN': true }));
                setLogs(prev => [...prev, {
                    id: 'sys-restore-know', timestamp: new Date().toLocaleTimeString(), agent: 'System', level: 'SUCCESS',
                    message: `已同步 ${savedKnowledge.length} 条进化策略知识。`
                }]);
            }
        };

        initMemory();
    }, [namespace]);

    // Simulation Loop
    useEffect(() => {
        if (!isActive) return;
        const interval = setInterval(() => {
            const result = simulateEvoCycle(agents, (log) => {
                setLogs(prev => [...prev, log].slice(-100));
            });
            
            setAgents(result.agents);
            setBeliefs(result.beliefs);
            
            // Persist critical state periodically (Async Fire & Forget)
            if (result.newKnowledge) {
                const keyAutoLearn = namespace ? `${namespace}_AUTO_LEARN` : 'AUTO_LEARN';
                setKnowledgeBase(prev => {
                    const next = [result.newKnowledge!, ...prev].slice(0, 50);
                    MemoryService.saveAgentMemory(keyAutoLearn, next); 
                    setMemoryStatus(s => ({ ...s, 'AUTO_LEARN': true }));
                    return next;
                });
            }
            
            // Persist Beliefs on financial event
            if (result.financial) { 
                setSimBalance(prev => prev + result.financial!.pnl);
                const keyBayesian = namespace ? `${namespace}_BAYESIAN` : 'BAYESIAN';
                MemoryService.saveAgentMemory(keyBayesian, result.beliefs); 
                setMemoryStatus(s => ({ ...s, 'BAYESIAN': true }));
            }

        }, 1500);
        return () => clearInterval(interval);
    }, [isActive, agents, namespace]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    return (
        <div className="h-full flex flex-col bg-[#0b0e14] border-l border-gray-800 font-sans">
            {/* Header */}
            <div className="p-4 border-b border-gray-800 bg-[#131722] shrink-0 flex justify-between items-center">
                <div>
                    <h2 className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                        <Network className="w-4 h-4" /> {title || '进化型多智能体系统'}
                    </h2>
                    <div className="flex items-center gap-3 mt-1">
                        {liveStatus && (
                            <span className={`text-[8px] px-1.5 py-0.5 rounded border flex items-center gap-1 font-bold ${liveStatus.isConnected ? 'bg-emerald-900/30 border-emerald-500/50 text-emerald-400' : 'bg-gray-800 border-gray-700 text-gray-500'}`}>
                                {liveStatus.isConnected ? <Link className="w-2.5 h-2.5" /> : <Unlink className="w-2.5 h-2.5" />}
                                API: {liveStatus.label}
                            </span>
                        )}
                    </div>
                </div>
                <button 
                    onClick={onToggle}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${isActive ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/50' : 'bg-gray-800 border-gray-700 text-gray-400'}`}
                >
                    {isActive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                    {isActive ? '系统运行中' : '启动进化'}
                </button>
            </div>

            {/* Main Scrollable Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">
                
                {/* 1. Account Dashboard */}
                <div className="grid grid-cols-2 gap-3">
                    <AccountCard 
                        type="SIM" 
                        balance={simBalance} 
                        initial={simInitial} 
                        pnl={simBalance - simInitial} 
                        active={true} 
                    />
                    <AccountCard 
                        type="REAL" 
                        balance={realPortfolio?.totalValue || 0} 
                        initial={realPortfolio?.initialCapital || 0} 
                        pnl={(realPortfolio?.totalValue || 0) - (realPortfolio?.initialCapital || 0)} 
                        active={!!realPortfolio && (realPortfolio.totalValue > 0)} 
                    />
                </div>

                {/* 2. Agent Grid */}
                <div>
                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                        <Activity className="w-3 h-3" /> 智能体集群 (Swarm Status)
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                        {agents.map(agent => (
                            <AgentNodeCard 
                                key={agent.id} 
                                agent={agent} 
                                hasMemory={memoryStatus['BAYESIAN'] || memoryStatus['AUTO_LEARN']} 
                            />
                        ))}
                    </div>
                </div>

                {/* 3. Knowledge Graph Stream */}
                {knowledgeBase.length > 0 && (
                    <div className="bg-[#1e222d] border border-gray-700 rounded-xl p-3">
                        <div className="flex justify-between items-center mb-2 border-b border-gray-700 pb-2">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase flex items-center gap-2">
                                <BookOpen className="w-3 h-3 text-indigo-400" /> 知识进化图谱
                            </h3>
                            <span className="text-[8px] bg-indigo-900/30 text-indigo-300 px-1.5 rounded">{knowledgeBase.length} Nodes</span>
                        </div>
                        <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
                            {knowledgeBase.map((k) => (
                                <div key={k.id} className="flex gap-2 items-start text-[9px]">
                                    <GitMerge className="w-3 h-3 text-gray-600 mt-0.5 shrink-0" />
                                    <div>
                                        <div className="text-gray-300 font-bold">{k.topic}</div>
                                        <div className="text-gray-500 flex gap-2">
                                            <span>Src: {k.source}</span>
                                            <span>{new Date(k.timestamp).toLocaleTimeString()}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 4. Console Logs */}
                <div className="bg-black border border-gray-800 rounded-xl flex flex-col h-40">
                    <div className="bg-gray-900 px-3 py-1.5 border-b border-gray-800 flex items-center gap-2">
                        <Terminal className="w-3 h-3 text-gray-500" />
                        <span className="text-[9px] font-mono text-gray-400">EVO_KERNEL.log</span>
                    </div>
                    <div className="flex-1 p-2 overflow-y-auto custom-scrollbar font-mono text-[9px] space-y-1" ref={scrollRef}>
                        {logs.map((log, i) => (
                            <div key={i} className={`flex gap-2 leading-relaxed border-l-2 pl-1 transition-colors ${
                                log.level === 'ERROR' ? 'border-red-500 text-red-400' :
                                log.level === 'SUCCESS' ? 'border-emerald-500 text-emerald-400' :
                                log.level === 'WARN' ? 'border-yellow-500 text-yellow-400' :
                                'border-transparent text-gray-400'
                            }`}>
                                <span className="text-gray-600 shrink-0 select-none">[{new Date().toLocaleTimeString()}]</span>
                                <span className="font-bold text-gray-500 shrink-0">[{log.agent}]</span>
                                <span>{log.message}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EvolutionaryTradingSystem;
