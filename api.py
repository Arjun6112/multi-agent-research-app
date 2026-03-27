"""
FastAPI server for the Multi-Agent Research System.
Streams results via Server-Sent Events as each agent completes.
Supports Human-in-the-Loop checkpointing.
"""

import asyncio
import json
import uuid
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

from multi_agent import app as langgraph_app

api = FastAPI(title="Multi-Agent Research API")

api.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


from typing import Optional

class ResearchRequest(BaseModel):
    query: str
    thread_id: Optional[str] = None

class ResumeRequest(BaseModel):
    thread_id: str
    feedback: str


@api.post("/research")
async def research(request: ResearchRequest):
    """Stream research results via SSE until checkpoint."""

    async def event_generator():
        query = request.query
        # Use existing thread_id if provided (for follow-ups), or generate a new one
        thread_id = request.thread_id if request.thread_id else str(uuid.uuid4())
        config = {"configurable": {"thread_id": thread_id}}

        yield {
            "event": "status",
            "data": json.dumps({
                "stage": "planner", 
                "status": "running",
                "thread_id": thread_id
            }),
        }

        queue = asyncio.Queue()
        
        def run_graph():
            try:
                for event in langgraph_app.stream(
                    {"query": query, "agent_results": []},
                    config=config,
                    stream_mode="updates",
                ):
                    asyncio.run_coroutine_threadsafe(queue.put(event), loop)
            except Exception as e:
                asyncio.run_coroutine_threadsafe(queue.put({"error": str(e)}), loop)
            finally:
                asyncio.run_coroutine_threadsafe(queue.put("DONE"), loop)

        loop = asyncio.get_event_loop()
        loop.run_in_executor(None, run_graph)

        has_hit_checkpoint = False

        while True:
            event = await queue.get()
            
            if event == "DONE":
                break
                
            if isinstance(event, dict) and "error" in event:
                yield {
                    "event": "error",
                    "data": json.dumps({"error": event["error"]})
                }
                break

            for node_name, node_output in event.items():
                if node_name == "planner":
                    agents = node_output.get("planned_agents", [])
                    yield {
                        "event": "planner_result",
                        "data": json.dumps({
                            "agents": agents,
                            "status": "done",
                        }),
                    }

                elif node_name == "agent_executor":
                    agent_results = node_output.get("agent_results", [])
                    for result in agent_results:
                        yield {
                            "event": "agent_result",
                            "data": json.dumps({
                                "agent_name": result["agent_name"],
                                "icon": result["icon"],
                                "content": result["content"],
                                "sources": result.get("sources", []),
                                "status": "done",
                            }),
                        }

                elif node_name == "debate":
                    notes = node_output.get("debate_notes", "")
                    has_hit_checkpoint = True
                    yield {
                        "event": "debate_result",
                        "data": json.dumps({
                            "content": notes,
                            "status": "done"
                        })
                    }

        if has_hit_checkpoint:
            yield {
                "event": "checkpoint",
                "data": json.dumps({
                    "message": "Waiting for human feedback.",
                    "thread_id": thread_id
                })
            }
        else:
            yield {"event": "done", "data": json.dumps({"status": "complete"})}

    return EventSourceResponse(event_generator())


@api.post("/research/resume")
async def resume_research(request: ResumeRequest):
    """Resume a checkpointed graph with human feedback."""
    
    async def event_generator():
        config = {"configurable": {"thread_id": request.thread_id}}
        
        # Update the state with user's feedback
        langgraph_app.update_state(config, {"human_feedback": request.feedback})

        yield {
            "event": "status",
            "data": json.dumps({"stage": "synthesizer", "status": "running"}),
        }

        queue = asyncio.Queue()
        
        def run_graph():
            try:
                # stream with None triggers resume from checkpoint
                for event in langgraph_app.stream(None, config=config, stream_mode="updates"):
                    asyncio.run_coroutine_threadsafe(queue.put(event), loop)
            except Exception as e:
                asyncio.run_coroutine_threadsafe(queue.put({"error": str(e)}), loop)
            finally:
                asyncio.run_coroutine_threadsafe(queue.put("DONE"), loop)

        loop = asyncio.get_event_loop()
        loop.run_in_executor(None, run_graph)

        while True:
            event = await queue.get()
            
            if event == "DONE":
                break
                
            if isinstance(event, dict) and "error" in event:
                yield {
                    "event": "error",
                    "data": json.dumps({"error": event["error"]})
                }
                break

            for node_name, node_output in event.items():
                if node_name == "synthesizer":
                    yield {
                        "event": "agent_result",
                        "data": json.dumps({
                            "agent_name": "synthesizer",
                            "icon": "📝",
                            "content": node_output.get("final_report", ""),
                            "sources": [],
                            "status": "done",
                        }),
                    }

        yield {"event": "done", "data": json.dumps({"status": "complete"})}

    return EventSourceResponse(event_generator())


@api.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(api, host="0.0.0.0", port=8000)
