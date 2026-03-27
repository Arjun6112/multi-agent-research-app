import sys
from agent import app
from langchain_core.messages import HumanMessage

def run_agent(query: str):
    """Run the LangGraph agent with a query."""
    print(f"User Tool Query: {query}")
    print("-" * 20)
    
    # Run the graph
    for event in app.stream({"messages": [HumanMessage(content=query)]}):
        for node, output in event.items():
            print(f"Node: {node}")
            # print(output) # Debug output
            
            # Print the text from the last message in the LLM response
            if node == "chatbot":
                last_message = output["messages"][-1]
                if last_message.content:
                    print(f"Agent: {last_message.content}")
                if last_message.tool_calls:
                    print(f"Calling tool: {last_message.tool_calls[0]['name']}...")
            elif node == "tools":
                print(f"Tool Result: {output['messages'][-1].content}")
        print("-" * 20)

if __name__ == "__main__":
    if len(sys.argv) > 1:
        user_query = " ".join(sys.argv[1:])
    else:
        user_query = "What is the weather in Delhi right now?"
    
    run_agent(user_query)
