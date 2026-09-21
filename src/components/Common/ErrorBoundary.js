import React from "react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Dashboard Error Boundary caught an error:", error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: "32px",
            background: "#fff1f2",
            border: "1px solid #fecdd3",
            borderRadius: "12px",
            margin: "24px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "36px", marginBottom: "12px" }}>⚠️</div>
          <h3 style={{ color: "#9f1239", margin: "0 0 8px 0" }}>
            {this.props.title || "Unable to display this analytics section"}
          </h3>
          <p style={{ color: "#4c0519", fontSize: "14px", margin: "0 0 16px 0" }}>
            {this.state.error?.message || "A rendering issue occurred while formatting data."}
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            style={{
              padding: "8px 18px",
              background: "#e11d48",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            🔄 Try Again / Refresh
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
