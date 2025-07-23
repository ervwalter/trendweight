import { Component } from "react";
import type { ReactNode } from "react";
import { ErrorUI } from "./ErrorUI";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  componentStack?: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    console.error("Error caught by ErrorBoundary:", error, errorInfo);
    // Update state with componentStack
    this.setState({ componentStack: errorInfo.componentStack });
  }

  render() {
    if (this.state.hasError) {
      return <ErrorUI error={this.state.error} componentStack={this.state.componentStack} />;
    }

    return this.props.children;
  }
}
