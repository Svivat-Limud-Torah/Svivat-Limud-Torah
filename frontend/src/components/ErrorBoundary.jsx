import React, { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error(`[ErrorBoundary/${this.props.name || 'unknown'}]`, error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const sectionName = this.props.name || 'רכיב';

      return (
        <div className="error-boundary-fallback">
          <div className="error-boundary-icon">⚠</div>
          <h3 className="error-boundary-title">שגיאה ב{sectionName}</h3>
          <p className="error-boundary-message">
            משהו השתבש. שאר האפליקציה ממשיכה לעבוד כרגיל.
          </p>
          <button className="error-boundary-retry btn" onClick={this.handleRetry}>
            נסה שוב
          </button>
          {this.props.showDetails && this.state.error && (
            <details className="error-boundary-details">
              <summary>פרטי השגיאה</summary>
              <pre>{this.state.error.toString()}</pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
