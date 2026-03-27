import { useState } from "react";

interface FollowUpInputProps {
  onSubmit: (query: string) => void;
  isLoading: boolean;
}

export function FollowUpInput({ onSubmit, isLoading }: FollowUpInputProps) {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isLoading) {
      onSubmit(query.trim());
      setQuery("");
    }
  };

  return (
    <div className="section-block" style={{ marginTop: 24, padding: "16px", background: "var(--color-background)" }}>
      <div className="section-header" style={{ marginBottom: 12 }}>
        <span className="section-icon">💬</span>
        <span className="section-title">Ask a Follow-up Question</span>
      </div>
      <p className="human-input-desc" style={{ marginBottom: 16 }}>
        Want to dive deeper into a specific area? The agents will remember the context of this report.
      </p>
      <form onSubmit={handleSubmit} className="human-input-form" style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. Can you elaborate on the economic impact?"
          className="search-input"
          disabled={isLoading}
        />
        <button 
          type="submit" 
          className="search-button highlight-button"
          disabled={isLoading || !query.trim()}
        >
          {isLoading ? (
            <>
              <div className="spinner" style={{ width: 14, height: 14, borderTopColor: "currentColor" }} />
              Researching...
            </>
          ) : (
             "Research"
          )}
        </button>
      </form>
    </div>
  );
}
