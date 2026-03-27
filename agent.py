import os
from typing import Annotated, TypedDict, Union
from dotenv import load_dotenv

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import BaseMessage, HumanMessage, ToolMessage
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langchain_core.tools import tool

from tools.weather import get_weather

load_dotenv()

# Define the state for the LangGraph
class GraphState(TypedDict):
    # The `add_messages` function tells LangGraph how to update the state with new messages
    messages: Annotated[list[BaseMessage], add_messages]

# Define the tool for the agent
@tool
def fetch_weather(city: str) -> str:
    """Fetch current weather for a given city."""
    return get_weather(city)

# Initialize the Gemini LLM
llm = ChatGoogleGenerativeAI(model="gemini-flash-lite-latest", google_api_key=os.getenv("GOOGLE_API_KEY"))

# Bind the tool to the LLM
llm_with_tools = llm.bind_tools([fetch_weather])

def chatbot_node(state: GraphState):
    """LLM node that decides whether to use a tool or just respond."""
    return {"messages": [llm_with_tools.invoke(state["messages"])]}

def tool_node(state: GraphState):
    """Node that executes the tool and returns the result."""
    messages = state["messages"]
    last_message = messages[-1]
    
    tool_results = []
    if last_message.tool_calls:
        for tool_call in last_message.tool_calls:
            if tool_call["name"] == "fetch_weather":
                result = fetch_weather.invoke(tool_call["args"])
                tool_results.append(ToolMessage(
                    content=result,
                    tool_call_id=tool_call["id"]
                ))
    return {"messages": tool_results}

def should_continue(state: GraphState):
    """Logic to decide if the agent should call the tool node or finish."""
    messages = state["messages"]
    last_message = messages[-1]
    
    if last_message.tool_calls:
        return "tools"
    return END

# Build the Graph
workflow = StateGraph(GraphState)

# Add nodes
workflow.add_node("chatbot", chatbot_node)
workflow.add_node("tools", tool_node)

# Set entry point
workflow.set_entry_point("chatbot")

# Add edges
workflow.add_conditional_edges(
    "chatbot",
    should_continue,
    {
        "tools": "tools",
        END: END
    }
)

# After tool execution, go back to the chatbot to explain the results
workflow.add_edge("tools", "chatbot")

# Compile the graph
app = workflow.compile()
