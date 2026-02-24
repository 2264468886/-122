
import React, { useState, useEffect } from 'react';
import { X, Network, Share2, Globe, Server, Link, Power } from 'lucide-react';
import { WebRTCProxyService } from '../services/webRTCProxyService';

interface WebRTCStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WebRTCStatusModal: React.FC<WebRTCStatusModalProps> = ({ isOpen, onClose }) => {
  const [roomId, setRoomId] = useState('alpha-room-001');
  const [status, setStatus] = useState('Ready to connect');
  const [role, setRole] = useState<'CLIENT' | 'HOST'>('CLIENT');
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (isOpen) {
        const service = WebRTCProxyService.getInstance();
        
        const handleStatus = (msg: string, connected: boolean) => {
            setStatus(msg);
            setIsConnected(connected);
        };

        service.addListener(handleStatus);
        return () => service.removeListener(handleStatus);
    }
  }, [isOpen]);

  const handleConnect = () => {
      WebRTCProxyService.getInstance().connect(roomId, role);
  };

  const handleDisconnect = () => {
      WebRTCProxyService.getInstance().disconnect();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#1e222d] border border-gray-700 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white">
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center mb-6">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 border ${isConnected ? 'bg-emerald-900/20 border-emerald-500/30' : 'bg-blue-900/20 border-blue-500/30'}`}>
            <Network className={`w-8 h-8 ${isConnected ? 'text-emerald-500' : 'text-blue-500'}`} />
          </div>
          <h2 className="text-xl font-bold text-white">P2P Network Proxy</h2>
          <p className="text-sm text-gray-400 mt-1">WebRTC Decentralized Tunnel</p>
        </div>

        <div className="space-y-4">
            {/* Role Selection */}
            <div className="flex bg-black/40 p-1 rounded-lg border border-gray-700">
                <button 
                    onClick={() => setRole('CLIENT')}
                    disabled={isConnected}
                    className={`flex-1 py-2 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-2 ${role === 'CLIENT' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                    <Globe className="w-3.5 h-3.5" /> CLIENT (受限端)
                </button>
                <button 
                    onClick={() => setRole('HOST')}
                    disabled={isConnected}
                    className={`flex-1 py-2 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-2 ${role === 'HOST' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                    <Server className="w-3.5 h-3.5" /> HOST (代理端)
                </button>
            </div>

            <div className="bg-black/30 p-3 rounded-lg border border-gray-700">
                <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Room ID</label>
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={roomId}
                        onChange={(e) => setRoomId(e.target.value)}
                        disabled={isConnected}
                        className="flex-1 bg-black border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
                    />
                    {!isConnected ? (
                        <button onClick={handleConnect} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1">
                            <Link className="w-3 h-3" /> Connect
                        </button>
                    ) : (
                        <button onClick={handleDisconnect} className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1">
                            <Power className="w-3 h-3" /> Stop
                        </button>
                    )}
                </div>
            </div>

            {/* Status Log */}
            <div className="bg-black border border-gray-800 rounded-lg p-3 h-24 flex items-center justify-center text-center">
                <p className={`text-xs font-mono font-bold ${isConnected ? 'text-emerald-400' : 'text-gray-500'}`}>
                    {status}
                </p>
            </div>

            <div className="text-[10px] text-gray-500 leading-relaxed border-t border-gray-800 pt-3">
                <p><strong>Instructions:</strong></p>
                <ul className="list-disc pl-4 space-y-1 mt-1">
                    <li>Requires <code>node signaling-server.js</code> running on localhost:8080.</li>
                    <li><strong>HOST:</strong> Open this app in an unrestricted network environment.</li>
                    <li><strong>CLIENT:</strong> Open this app in the restricted environment.</li>
                    <li>Both must use the exact same <strong>Room ID</strong>.</li>
                </ul>
            </div>
        </div>
      </div>
    </div>
  );
};

export default WebRTCStatusModal;
