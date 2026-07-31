import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg m-6">
            <h2 className="text-xl font-bold text-red-700 flex items-center mb-4">
                <AlertTriangle className="mr-2" /> Application Crash Detected
            </h2>
            <p className="text-red-600 mb-4">An unexpected error occurred while rendering this page.</p>
            <div className="bg-white p-4 rounded border border-red-100 overflow-auto text-sm font-mono text-gray-800">
                <p className="font-bold mb-2">{this.state.error?.toString()}</p>
                <pre>{this.state.errorInfo?.componentStack}</pre>
            </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
