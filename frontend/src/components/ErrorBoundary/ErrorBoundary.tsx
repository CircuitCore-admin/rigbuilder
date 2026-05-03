import { Component, type ReactNode, type ErrorInfo } from 'react';
import styles from './ErrorBoundary.module.scss';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className={styles.container}>
          <div className={styles.card}>
            <span className={styles.icon}>⚠</span>
            <h1 className={styles.title}>Something went wrong</h1>
            {this.state.error && (
              <p className={styles.message}>{this.state.error.message}</p>
            )}
            <div className={styles.actions}>
              <button className={styles.retryBtn} onClick={this.handleReset}>
                Try Again
              </button>
              <a href="/" className={styles.homeBtn}>
                Go Home
              </a>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
