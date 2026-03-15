import React from 'react';

type State = { hasError: boolean };

export class AppErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('App crashed:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
          <div className="w-full max-w-sm text-center bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <p className="text-3xl mb-2">⚠️</p>
            <h1 className="text-lg font-bold">Something went wrong</h1>
            <p className="text-slate-400 text-sm mt-2">Please refresh the app. If this continues, contact support.</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 w-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold py-2 rounded-xl transition-colors"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
