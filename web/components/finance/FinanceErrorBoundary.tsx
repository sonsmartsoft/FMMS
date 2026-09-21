'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class FinanceErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('FinanceErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 md:p-10 rounded-2xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 shadow-lg text-center max-w-xl mx-auto my-8">
          <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-4 border border-rose-200 dark:border-rose-800">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
            {this.props.fallbackTitle || 'Đã xảy ra lỗi tải dữ liệu'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
            Hệ thống phát hiện lỗi không mong muốn khi xử lý dữ liệu. Toàn bộ thông tin tài chính của gia đình bạn vẫn được bảo toàn an toàn trên Cloud.
          </p>
          {this.state.error && (
            <div className="p-3 mb-6 rounded-xl bg-slate-50 dark:bg-slate-800/80 text-[11px] font-mono text-rose-600 dark:text-rose-300 text-left overflow-x-auto border border-slate-200 dark:border-slate-700">
              {this.state.error.message}
            </div>
          )}
          <button
            onClick={this.handleReset}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-sky-600 hover:bg-sky-500 shadow-md shadow-sky-600/20 active:scale-95 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Tải lại dữ liệu
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default FinanceErrorBoundary;
