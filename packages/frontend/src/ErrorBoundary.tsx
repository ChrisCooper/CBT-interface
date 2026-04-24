import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

const isDev = import.meta.env.DEV;

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, errorInfo: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-8">
        <div className="w-full max-w-xl rounded-lg border border-red-200 bg-white p-6 shadow-md">
          <div className="mb-4 flex items-center gap-2 text-red-600">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h1 className="text-xl font-bold">Something went wrong</h1>
          </div>

          {isDev ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-700">Error</h2>
                <pre className="mt-1 overflow-auto rounded bg-red-50 p-3 text-sm text-red-800">
                  {this.state.error.message}
                </pre>
              </div>
              {this.state.error.stack && (
                <div>
                  <h2 className="text-sm font-semibold text-gray-700">
                    Stack trace
                  </h2>
                  <pre className="mt-1 max-h-64 overflow-auto rounded bg-gray-100 p-3 text-xs text-gray-700">
                    {this.state.error.stack}
                  </pre>
                </div>
              )}
              {this.state.errorInfo?.componentStack && (
                <div>
                  <h2 className="text-sm font-semibold text-gray-700">
                    Component stack
                  </h2>
                  <pre className="mt-1 max-h-48 overflow-auto rounded bg-gray-100 p-3 text-xs text-gray-700">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-600">
              An unexpected error occurred. Please try refreshing the page. If
              the problem persists, contact support.
            </p>
          )}

          <button
            onClick={() => window.location.reload()}
            className="mt-6 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Reload page
          </button>
        </div>
      </div>
    );
  }
}

export function QueryErrorDisplay({ error }: { error: unknown }) {
  const message =
    error instanceof Error ? error.message : "An unknown error occurred";

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
      <p className="text-sm font-medium text-red-800">
        Failed to load data
        {isDev && (
          <span className="mt-1 block font-normal text-red-600">
            {message}
          </span>
        )}
      </p>
      <button
        onClick={() => window.location.reload()}
        className="mt-2 text-sm font-medium text-red-700 underline hover:text-red-900"
      >
        Retry
      </button>
    </div>
  );
}
