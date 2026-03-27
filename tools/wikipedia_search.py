import wikipedia


def search_wikipedia(query: str) -> str:
    """Search Wikipedia for a topic and return a summary."""
    try:
        # Search for the most relevant page
        results = wikipedia.search(query, results=3)
        if not results:
            return f"No Wikipedia articles found for '{query}'."

        # Get the summary of the top result
        try:
            summary = wikipedia.summary(results[0], sentences=5)
            return f"**{results[0]}**\n\n{summary}"
        except wikipedia.DisambiguationError as e:
            # If the result is ambiguous, try the first option
            summary = wikipedia.summary(e.options[0], sentences=5)
            return f"**{e.options[0]}**\n\n{summary}"

    except Exception as e:
        return f"Error searching Wikipedia: {str(e)}"


if __name__ == "__main__":
    print(search_wikipedia("Artificial Intelligence"))
