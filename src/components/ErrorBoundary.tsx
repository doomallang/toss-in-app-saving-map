import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.error != null) {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "32px 24px",
            gap: "12px",
            textAlign: "center",
            color: "#191f28",
          }}
        >
          <strong style={{ fontSize: "18px" }}>앗, 오류가 발생했어요</strong>
          <p style={{ color: "#6b7684", fontSize: "14px", margin: 0 }}>
            페이지를 새로 고침하면 해결될 수 있어요.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              marginTop: "8px",
              padding: "10px 20px",
              background: "#12b886",
              color: "#fff",
              border: 0,
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            새로 고침
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
