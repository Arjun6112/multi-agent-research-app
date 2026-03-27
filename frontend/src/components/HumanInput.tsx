import { useState } from "react";

interface HumanInputProps {
  onStatusSubmit: (feedback: string) => void;
  isLoading: boolean;
}

export function HumanInput({ onStatusSubmit, isLoading }: HumanInputProps) {
  const [feedback, setFeedback] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoading) {
      onStatusSubmit(feedback);
    }
  };

  return (
    <div className="human-input-block">
      <div className="section-header" style={{ marginBottom: 12 }}>
        <span className="section-icon">✋</span>
        <span className="section-title">Human Feedback Required</span>
      </div>
      <p className="human-input-desc">
        The agents have completed their research and compiled a debate critique. 
        Before the final report is synthesized, you can provide specific instructions 
        (e.g., "focus more on the economic impact" or "ignore the historical background").
      </p>
      
      <form onSubmit={handleSubmit} className="human-input-form">
        <input
          type="text"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Enter instructions (optional)..."
          className="search-input"
          disabled={isLoading}
        />
        <button 
          type="submit" 
          className="search-button highlight-button"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <div className="spinner" style={{ width: 14, height: 14, borderTopColor: "currentColor" }} />
              Resuming...
            </>
          ) : (
             "Resume Synthesis"
          )}
        </button>
      </form>
    </div>
  );
}
