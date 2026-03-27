import { useState } from "react";
import { QueryInput } from "./components/QueryInput";
import { AgentCard } from "./components/AgentCard";
import { ReportView } from "./components/ReportView";
import { DebateView } from "./components/DebateView";
import { HumanInput } from "./components/HumanInput";
import { FollowUpInput } from "./components/FollowUpInput";
import { GraphVisualization } from "./components/GraphVisualization";
import { streamResearch, resumeResearch } from "./lib/api";
import type { PlannedAgent, AgentResultData, DebateResultData, CheckpointData } from "./lib/api";

interface AgentState {
  agent: PlannedAgent;
  status: "running" | "done";
  result?: AgentResultData;
}

function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [currentQuery, setCurrentQuery] = useState("");
  const [plannerStatus, setPlannerStatus] = useState<"idle" | "running" | "done">("idle");
  const [agents, setAgents] = useState<AgentState[]>([]);
  
  const [debate, setDebate] = useState<DebateResultData | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [checkpointStatus, setCheckpointStatus] = useState<"none" | "waiting" | "resuming" | "done">("none");
  
  const [report, setReport] = useState("");
  const [synthLoading, setSynthLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (query: string, isFollowUp: boolean = false) => {
    setIsLoading(true);
    setCurrentQuery(query);
    setError("");
    setSynthLoading(false);
    setPlannerStatus("running");
    setCheckpointStatus("none");

    if (!isFollowUp) {
      setAgents([]);
      setDebate(null);
      setThreadId(null);
      setReport("");
    } else {
      // For follow-ups, we keep the old thread ID and report on screen until the new one generates
      setDebate(null);
      // Optional: hide old agents or let the new planner append/overwrite them.
      // We'll clear the agents array so the UI only shows the *new* agents working on this follow-up,
      // but the backend `agent_results` will retain everything.
      setAgents([]);
    }

    const activeThreadId = isFollowUp ? threadId : null;

    streamResearch(
      query,
      activeThreadId,
      (event) => {
        if (event.type === "status" && event.data.stage === "planner") {
          setPlannerStatus("running");
          if (event.data.thread_id) {
            setThreadId(event.data.thread_id as string);
          }
        }

        if (event.type === "planner_result") {
          setPlannerStatus("done");
          const planned = event.data.agents as PlannedAgent[];
          setAgents(planned.map((a) => ({ agent: a, status: "running" as const })));
        }

        if (event.type === "agent_result") {
          const result = event.data as unknown as AgentResultData;
          if (result.agent_name === "synthesizer") {
            setSynthLoading(false);
            setReport(result.content);
            setCheckpointStatus("done");
          } else {
            setAgents((prev) =>
              prev.map((a) =>
                a.agent.name === result.agent_name
                  ? { ...a, status: "done" as const, result }
                  : a
              )
            );
          }
        }

        if (event.type === "debate_result") {
          setDebate(event.data as unknown as DebateResultData);
        }

        if (event.type === "checkpoint") {
          const cp = event.data as unknown as CheckpointData;
          setThreadId(cp.thread_id);
          setCheckpointStatus("waiting");
          setIsLoading(false);
        }
        
        if (event.type === "error") {
            setError(event.data.error as string);
            setIsLoading(false);
        }
      },
      (errorMsg) => {
        setError(errorMsg);
        setIsLoading(false);
      },
      () => {
        if (checkpointStatus !== "waiting") {
           setIsLoading(false);
        }
      }
    );
  };

  const handleResume = (feedback: string) => {
    if (!threadId) return;
    
    setCheckpointStatus("resuming");
    setSynthLoading(true);
    
    resumeResearch(
      threadId,
      feedback,
      (event) => {
        if (event.type === "agent_result") {
          const result = event.data as unknown as AgentResultData;
          if (result.agent_name === "synthesizer") {
            setSynthLoading(false);
            setReport(result.content);
            setCheckpointStatus("done");
          }
        }
        if (event.type === "error") {
            setError(event.data.error as string);
            setSynthLoading(false);
            setCheckpointStatus("waiting");
        }
      },
      (errorMsg) => {
        setError(errorMsg);
        setSynthLoading(false);
        setCheckpointStatus("waiting");
      },
      () => {
        setSynthLoading(false);
        setCheckpointStatus("done");
      }
    );
  };

  const hasStarted = plannerStatus !== "idle";

  return (
    <div className="app-root">
      <div className="app-container">
        {/* Header */}
        <header className="app-header">
         
          <h1 className="title">Multi-Agent Research</h1>
          <p className="subtitle">
            AI planner spawns specialists. A Judge debates them. You steer the final report.
          </p>
        </header>

        {/* Top Search (New Thread) */}
        <QueryInput onSubmit={(q) => handleSubmit(q, false)} isLoading={isLoading && checkpointStatus !== "waiting"} />

        {/* Error */}
        {error && <div className="error-banner">{error}</div>}

        {/* Live Graph Visualization */}
        {hasStarted && (
          <GraphVisualization 
            plannerStatus={plannerStatus} 
            agents={agents} 
            debateStatus={debate ? "done" : (agents.length > 0 && agents.every(a => a.status === "done") ? "running" : "idle")} 
            checkpointStatus={checkpointStatus}
            synthStatus={synthLoading ? "running" : (report ? "done" : "idle")}
          />
        )}

        {/* Planner status block (Hidden once graph loads to save space) */}
        {hasStarted && agents.length === 0 && (
          <div className="section-block">
            <div className="section-header">
              <span className="section-icon">🎯</span>
              <span className="section-title">Planner</span>
              {plannerStatus === "running" && <div className="spinner" />}
              {plannerStatus === "done" && (
                <span className="status-done">
                  Spawned {agents.length} agents
                </span>
              )}
            </div>
          </div>
        )}

        {/* Query label */}
        {currentQuery && hasStarted && agents.length > 0 && (
          <p className="query-label" style={{ marginTop: 24 }}>
            Researching <span className="query-text">"{currentQuery}"</span>
          </p>
        )}

        {/* Agent cards — dynamic count */}
        {agents.length > 0 && (
          <div
            className="agents-grid"
            style={{
              gridTemplateColumns: `repeat(${Math.min(agents.length, 3)}, 1fr)`,
            }}
          >
            {agents.map((a) => (
              <AgentCard
                key={a.agent.name}
                name={a.agent.name}
                icon={a.agent.icon}
                description={a.agent.role}
                focus={a.agent.focus}
                status={a.status}
                result={a.result?.content}
                sources={a.result?.sources}
              />
            ))}
          </div>
        )}

        {/* Debate View */}
        {debate && <DebateView content={debate.content} />}

        {/* Human in the Loop Input */}
        {checkpointStatus === "waiting" && (
          <HumanInput onStatusSubmit={handleResume} isLoading={false} />
        )}
        
        {checkpointStatus === "resuming" && (
          <div className="human-input-block" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="spinner" style={{ width: 14, height: 14 }} />
            <span style={{ fontSize: 13, color: 'var(--color-muted-foreground)' }}>Resuming graph constraints and synthesizing...</span>
          </div>
        )}

        {/* Report Component with Export Buttons */}
        <ReportView report={report} isLoading={synthLoading} />

        {/* Follow Up Component */}
        {report && checkpointStatus === "done" && (
          <FollowUpInput onSubmit={(q) => handleSubmit(q, true)} isLoading={isLoading} />
        )}
      </div>
    </div>
  );
}

export default App;
