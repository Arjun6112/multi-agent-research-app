"""
Multi-Agent Research System with Dynamic Agent Spawning, Debate, and Human-in-the-Loop.
"""

import os
import json
import time
import operator
from typing import Annotated, TypedDict, Optional
from dotenv import load_dotenv

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage
from langgraph.graph import StateGraph, END
from langgraph.types import Send
from langgraph.checkpoint.memory import MemorySaver

from tools.wikipedia_search import search_wikipedia
from tools.web_search import search_web

load_dotenv()

# --- LLM ---
llm = ChatGoogleGenerativeAI(
    model="gemini-flash-lite-latest",
    google_api_key=os.getenv("GOOGLE_API_KEY"),
)


def invoke_with_retry(messages, max_retries=2):
    """Invoke LLM with light retry logic for rate limits."""
    for attempt in range(max_retries):
        try:
            return llm.invoke(messages)
        except Exception as e:
            if "429" in str(e) and attempt < max_retries - 1:
                wait_time = 3
                print(f"   ⏳ Rate limited, retrying in {wait_time}s...")
                time.sleep(wait_time)
            elif attempt == max_retries - 1:
                print(f"   ❌ Final LLM Failure: {str(e)[:100]}")
                from langchain_core.messages import AIMessage
                return AIMessage(content="[LLM Rate Limit Reached. Using fallback generated response.]")
            else:
                raise


# --- State ---
class AgentTask(TypedDict):
    name: str
    icon: str
    role: str
    focus: str
    tools: list[str]


class AgentResult(TypedDict):
    agent_name: str
    icon: str
    content: str
    sources: list[str]


class ResearchState(TypedDict):
    query: str
    planned_agents: list[AgentTask]
    agent_results: Annotated[list[AgentResult], operator.add]
    debate_notes: str            # New: debate critique
    human_feedback: Optional[str] # New: user instructions from checkpoint
    final_report: str


# --- Planner Node ---
def planner_node(state: ResearchState) -> dict:
    """Analyze the query and decide which specialist agents to spawn."""
    query = state.get("query", "")
    print(f"\n🎯 Planner: Analyzing '{query}'...")

    response = invoke_with_retry([
        HumanMessage(content=f"""You are a research planning expert. Given the topic: "{query}"

Decide which 3-5 specialist research agents to create. Each agent should have a unique perspective.

Return ONLY a JSON array (no markdown, no code fences) with objects containing:
- "name": short agent name (2-3 words)
- "icon": a single emoji that represents this agent
- "role": one-line description of this agent's expertise
- "focus": what specifically this agent should research about the topic
- "tools": array of tools to use - choose from ["wikipedia", "web_search", "none"]

Example format:
[{{"name": "History Expert", "icon": "📜", "role": "Historical research specialist", "focus": "Historical origins and evolution", "tools": ["wikipedia"]}}]
""")
    ])

    try:
        raw = response.content.strip()
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1].rsplit("```", 1)[0]
        agents = json.loads(raw)
    except (json.JSONDecodeError, Exception) as e:
        print(f"   ⚠️ Failed to parse planner output, using defaults: {e}")
        agents = [
            {"name": "Researcher", "icon": "📚", "role": "General researcher",
             "focus": "Key facts and background", "tools": ["wikipedia"]},
            {"name": "Trend Analyst", "icon": "📈", "role": "Trend analysis",
             "focus": "Current trends and developments", "tools": ["web_search"]},
            {"name": "Expert", "icon": "🧠", "role": "Domain expert",
             "focus": "Expert analysis and implications", "tools": ["none"]},
        ]

    print(f"🎯 Planner: Spawning {len(agents)} agents.")
    return {"planned_agents": agents}


# --- Dynamic Agent Fan-Out ---
def spawn_agents(state: ResearchState) -> list[Send]:
    """Fan out to dynamic agents using Send()."""
    sends = []
    for agent_task in state["planned_agents"]:
        sends.append(Send("agent_executor", {
            **state,
            "_current_task": agent_task,
        }))
    return sends


# --- Agent Executor Node ---
def agent_executor(state: dict) -> dict:
    """Execute a single dynamic agent with its assigned task."""
    task: AgentTask = state["_current_task"]
    query = state["query"]
    name = task.get("name", "Agent")
    icon = task.get("icon", "🤖")
    role = task.get("role", "Research agent")
    focus = task.get("focus", "General research")
    tools = task.get("tools", ["none"])

    print(f"\n{icon} {name}: Starting research on '{focus}'...")

    tool_data = ""
    sources = []

    if "wikipedia" in tools:
        wiki_result = search_wikipedia(query + " " + focus)
        tool_data += f"\n\nWikipedia Data:\n{wiki_result}"
        sources.append("Wikipedia")

    if "web_search" in tools:
        web_result = search_web(query + " " + focus)
        tool_data += f"\n\nWeb Search Results:\n{web_result}"
        for line in web_result.split("\n"):
            if line.strip().startswith("Source: http"):
                sources.append(line.strip().replace("Source: ", ""))

    prompt = f"""You are a {role}. Your specific focus is: {focus}

Research topic: "{query}"
{tool_data if tool_data else "Use your expert knowledge to provide analysis."}

Provide a focused, insightful analysis from your unique perspective as a {role}.
Include specific facts, data points, and examples where possible.
Keep your response concise but substantive (200-300 words)."""

    response = invoke_with_retry([HumanMessage(content=prompt)])
    print(f"{icon} {name}: Done!")

    return {
        "agent_results": [{
            "agent_name": name,
            "icon": icon,
            "content": response.content,
            "sources": sources,
        }]
    }


# --- Debate Node ---
def debate_node(state: ResearchState) -> dict:
    """Agents critique each other's findings."""
    print(f"\n⚖️ Debate: Reviewing {len(state['agent_results'])} agent reports...")
    
    agent_reports_text = ""
    for r in state["agent_results"]:
        agent_reports_text += f"\n\n--- {r['icon']} {r['agent_name']} ---\n{r['content']}"

    prompt = f"""You are the Lead Critic. Your job is to review the following research reports gathered by different agents on the topic of '{state["query"]}'.
Identify contradictions, biases, or missing critical perspectives.

Reports:
{agent_reports_text}

Provide a concise, bulleted critique (150 words max) highlighting disagreements or areas that need careful consideration during the final synthesis."""

    response = invoke_with_retry([HumanMessage(content=prompt)])
    print(f"⚖️ Debate: Critique complete!")
    
    return {"debate_notes": response.content}


# --- Synthesizer Node ---
def synthesizer_node(state: ResearchState) -> dict:
    """Combine all results, considering debate critique and human feedback."""
    print(f"\n📝 Synthesizer: Creating final report...")

    agent_sections = ""
    all_sources = []
    for result in state["agent_results"]:
        agent_sections += f"\n\n### {result['icon']} {result['agent_name']}\n{result['content']}"
        all_sources.extend(result.get("sources", []))

    unique_sources = list(dict.fromkeys(all_sources))
    
    debate_critique = state.get("debate_notes", "None")
    feedback = state.get("human_feedback", "None")

    prompt = f"""You are a senior research synthesizer. Combine the following research into ONE cohesive report about '{state["query"]}'.

Agent Reports:
{agent_sections}

Critical Debate Notes (Address these contradictions/biases):
{debate_critique}

Human Directives (MUST FOLLOW if provided):
{feedback}

Create a carefully synthesized final report that:
1. Combines insights without redundancy, addressing the debate notes gracefully.
2. Specifically answers any human directives provided.
3. Is well-organized with Markdown (no individual agent mentions).
4. Ends with a "Sources" section listing: {json.dumps(unique_sources)}"""

    response = invoke_with_retry([HumanMessage(content=prompt)])
    print(f"📝 Synthesizer: Report ready!")
    return {"final_report": response.content}


# --- Build the Graph ---
workflow = StateGraph(ResearchState)

workflow.add_node("planner", planner_node)
workflow.add_node("agent_executor", agent_executor)
workflow.add_node("debate", debate_node)
workflow.add_node("synthesizer", synthesizer_node)

workflow.set_entry_point("planner")
workflow.add_conditional_edges("planner", spawn_agents)
workflow.add_edge("agent_executor", "debate")  # Changed to route through debate
workflow.add_edge("debate", "synthesizer")
workflow.add_edge("synthesizer", END)

# Checkpoint memory
memory = MemorySaver()

# Compile with interrupt before synthesizer
app = workflow.compile(
    checkpointer=memory,
    interrupt_before=["synthesizer"]
)
