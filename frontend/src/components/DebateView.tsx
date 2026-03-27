import ReactMarkdown from "react-markdown";

interface DebateViewProps {
  content: string;
}

export function DebateView({ content }: DebateViewProps) {
  return (
    <div className="section-block debate-block">
      <div className="section-header" style={{ marginBottom: 12 }}>
        <span className="section-icon">⚖️</span>
        <span className="section-title">Debate Critique</span>
      </div>
      <div className="prose" style={{ fontSize: 13 }}>
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </div>
  );
}
