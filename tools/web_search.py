from ddgs import DDGS


def search_web(query: str) -> str:
    """Search the web using DuckDuckGo and return top results."""
    try:
        results = DDGS().text(query, max_results=5)

        if not results:
            return f"No web results found for '{query}'."

        formatted = []
        for i, result in enumerate(results, 1):
            title = result.get("title", "No title")
            body = result.get("body", "No description")
            href = result.get("href", "")
            formatted.append(f"{i}. **{title}**\n   {body}\n   Source: {href}")

        return "\n\n".join(formatted)

    except Exception as e:
        return f"Error searching the web: {str(e)}"


if __name__ == "__main__":
    print(search_web("Artificial Intelligence latest news"))
