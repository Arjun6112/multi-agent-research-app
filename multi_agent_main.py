import sys
from multi_agent import app


def run_research(query: str):
    """Run the multi-agent research system."""
    print("=" * 60)
    print(f"🔬 Multi-Agent Research Assistant")
    print(f"📋 Query: {query}")
    print("=" * 60)

    # Run the graph
    result = app.invoke({"query": query})

    # Print the final report
    print("\n" + "=" * 60)
    print("📊 FINAL RESEARCH REPORT")
    print("=" * 60)
    print(result["final_report"])
    print("=" * 60)


if __name__ == "__main__":
    if len(sys.argv) > 1:
        user_query = " ".join(sys.argv[1:])
    else:
        user_query = "Artificial Intelligence"

    run_research(user_query)
