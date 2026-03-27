const API_BASE = "http://localhost:8000";

export interface PlannedAgent {
  name: string;
  icon: string;
  role: string;
  focus: string;
  tools: string[];
}

export interface AgentResultData {
  agent_name: string;
  icon: string;
  content: string;
  sources: string[];
  status: string;
}

export interface DebateResultData {
  content: string;
  status: string;
}

export interface CheckpointData {
  message: string;
  thread_id: string;
}

export interface ResearchEvent {
  type: "status" | "planner_result" | "agent_result" | "debate_result" | "checkpoint" | "done" | "error";
  data: Record<string, unknown>;
}

async function streamResponse(
  response: Response,
  onEvent: (event: ResearchEvent) => void,
  onError: (error: string) => void,
  onDone: () => void
) {
  if (!response.ok) {
    onError(`Server error: ${response.status}`);
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    onError("No response body");
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    let currentEvent = "";

    for (const line of lines) {
      if (line.startsWith("event:")) {
        currentEvent = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        const data = line.slice(5).trim();
        try {
          const parsed = JSON.parse(data);
          onEvent({
            type: currentEvent as ResearchEvent["type"],
            data: parsed,
          });

          if (currentEvent === "done") {
            onDone();
            return;
          }
        } catch {
          // Skip malformed JSON
        }
      }
    }
  }
}

export async function streamResearch(
  query: string,
  threadId: string | null,
  onEvent: (event: ResearchEvent) => void,
  onError: (error: string) => void,
  onDone: () => void
) {
  try {
    const body = threadId ? { query, thread_id: threadId } : { query };
    const response = await fetch(`${API_BASE}/research`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await streamResponse(response, onEvent, onError, onDone);
  } catch (err) {
    onError(err instanceof Error ? err.message : "Connection failed");
  }
}

export async function resumeResearch(
  thread_id: string,
  feedback: string,
  onEvent: (event: ResearchEvent) => void,
  onError: (error: string) => void,
  onDone: () => void
) {
  try {
    const response = await fetch(`${API_BASE}/research/resume`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ thread_id, feedback }),
    });
    await streamResponse(response, onEvent, onError, onDone);
  } catch (err) {
    onError(err instanceof Error ? err.message : "Connection failed");
  }
}
