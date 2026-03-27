import ReactMarkdown from "react-markdown";

interface ReportViewProps {
  report: string;
  isLoading: boolean;
}

export function ReportView({ report, isLoading }: ReportViewProps) {
  if (isLoading) {
    return (
      <div className="section-block">
        <div className="section-header" style={{ marginBottom: 16 }}>
          <span className="section-icon">📝</span>
          <span className="section-title">Synthesizing Final Report</span>
          <div className="spinner" />
        </div>
        <div className="skeleton-line" style={{ width: "90%" }} />
        <div className="skeleton-line" style={{ width: "80%" }} />
        <div className="skeleton-line" style={{ width: "85%" }} />
        <div className="skeleton-line" style={{ width: "60%" }} />
      </div>
    );
  }

  if (!report) return null;

  const handleDownloadMarkdown = () => {
    const blob = new Blob([report], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "research_report.md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrintPdf = () => {
    window.print();
  };

  return (
    <div className="section-block" style={{ marginTop: 24 }}>
      <div className="section-header" style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span className="section-icon">📝</span>
          <span className="section-title">Research Report</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleDownloadMarkdown} className="search-button" style={{ padding: '6px 12px', fontSize: 12 }}>
            📥 Markdown
          </button>
          <button onClick={handlePrintPdf} className="search-button highlight-button" style={{ padding: '6px 12px', fontSize: 12 }}>
            🖨️ Print PDF
          </button>
        </div>
      </div>
      <div className="prose">
        <ReactMarkdown>{report}</ReactMarkdown>
      </div>
    </div>
  );
}
