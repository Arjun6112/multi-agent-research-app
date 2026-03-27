import ReactMarkdown from "react-markdown";

interface AgentCardProps {
  name: string;
  icon: string;
  description: string;
  focus: string;
  status: "running" | "done";
  result?: string;
  sources?: string[];
}

export function AgentCard({
  name,
  icon,
  description,
  focus,
  status,
  result,
  sources,
}: AgentCardProps) {
  return (
    <div className={`agent-card ${status === "running" ? "running" : ""}`}>
      <div className="agent-card-header">
        <div className="agent-info">
          <span className="agent-icon">{icon}</span>
          <div>
            <p className="agent-name">{name}</p>
            <p className="agent-desc">{description}</p>
          </div>
        </div>
        <div>
          {status === "running" && <div className="spinner" />}
          {status === "done" && <span className="status-done">Done</span>}
        </div>
      </div>

      <p className="agent-focus">Focus: {focus}</p>

      {status === "running" && !result && (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
          <div className="shimmer shimmer-line" style={{ width: "100%" }} />
          <div className="shimmer shimmer-line" style={{ width: "80%" }} />
          <div className="shimmer shimmer-line" style={{ width: "60%" }} />
        </div>
      )}

      {result && (
        <div className="agent-result">
          <div className="prose" style={{ fontSize: 12 }}>
            <ReactMarkdown>
              {result.slice(0, 300) + (result.length > 300 ? "..." : "")}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {sources && sources.length > 0 && (
        <div className="agent-sources">
          {sources.map((src, i) => (
            <a
              key={i}
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              className="source-link"
            >
              {src.startsWith("http") ? new URL(src).hostname : src}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
