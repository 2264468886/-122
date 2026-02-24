import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Terminal } from 'lucide-react';

interface Props {
  children?: ReactNode;
  scope?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[System Failure] Scope: ${this.props.scope}`, error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-[#0b0e14] border border-red-900/30 p-6 text-center relative overflow-hidden rounded-xl">
          {/* Glitch Effect Background */}
          <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(68,0,0,0.2)_50%,transparent_75%,transparent_100%)] bg-[length:250%_250%] animate-pulse pointer-events-none" />
          
          <div className="relative z-10 bg-[#131722] p-6 rounded-2xl border border-red-500/30 shadow-2xl flex flex-col items-center max-w-sm">
            <div className="w-16 h-16 bg-red-900/20 rounded-full flex items-center justify-center mb-4 border border-red-500/50">
                <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            
            <h2 className="text-lg font-black text-red-500 uppercase tracking-widest mb-2">
              System Malfunction
            </h2>
            
            <div className="bg-black/50 rounded p-2 mb-4 w-full border border-gray-800">
                <div className="flex items-center gap-2 mb-1 border-b border-gray-800 pb-1">
                    <Terminal className="w-3 h-3 text-gray-500" />
                    <span className="text-[10px] text-gray-500 uppercase font-mono">Kernel Panic: {this.props.scope || 'Unknown'}</span>
                </div>
                <p className="text-[10px] text-red-400 font-mono text-left break-all leading-relaxed">
                    {this.state.error?.message || 'Unexpected rendering exception.'}
                </p>
            </div>

            <button
              onClick={this.handleReset}
              className="flex items-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-red-900/30 active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Reboot Module
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;