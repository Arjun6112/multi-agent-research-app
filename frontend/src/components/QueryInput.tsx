import { useState, type FormEvent } from "react";

interface QueryInputProps {
  onSubmit: (query: string) => void;
  isLoading: boolean;
}

export function QueryInput({ onSubmit, isLoading }: QueryInputProps) {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isLoading) {
      onSubmit(query.trim());
    }
  };

  const suggestions = [
    "Artificial Intelligence",
    "Climate Change",
    "Quantum Computing",
    "Space Exploration",
  ];

  return (
    <div>
      <form onSubmit={handleSubmit} className="search-form">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter a research topic..."
          disabled={isLoading}
          id="query-input"
          className="search-input"
        />
        <button
          type="submit"
          disabled={isLoading || !query.trim()}
          id="submit-button"
          className="search-button"
        >
          {isLoading ? (
            <>
              <div className="spinner" />
              <span>Researching</span>
            </>
          ) : (
            "Research"
          )}
        </button>
      </form>

      {!isLoading && (
        <div className="suggestions">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => { setQuery(s); onSubmit(s); }}
              className="suggestion-chip"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
