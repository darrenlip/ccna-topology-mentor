import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="bg-slate-900 border border-red-800/80 rounded-2xl p-8 text-center space-y-4 max-w-xl mx-auto my-8 shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-red-950/80 border border-red-700/60 flex items-center justify-center text-red-400 mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">
              {this.props.fallbackTitle || 'An Unexpected Display Error Occurred'}
            </h3>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              {this.state.error?.message || 'Error rendering component view.'}
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs font-mono transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset & Reload View</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
