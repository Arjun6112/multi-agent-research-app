import os
import requests
from dotenv import load_dotenv

load_dotenv()

def get_weather(city: str) -> str:
    """Fetch current weather for a given city using OpenWeatherMap API."""
    api_key = os.getenv("OPENWEATHERMAP_API_KEY")
    if not api_key:
        return "Error: OPENWEATHERMAP_API_KEY not found in environment variables."
    
    url = f"http://api.openweathermap.org/data/2.5/weather?q={city}&appid={api_key}&units=metric"
    
    try:
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
        
        main = data["main"]
        weather = data["weather"][0]["description"]
        temp = main["temp"]
        humidity = main["humidity"]
        
        return f"The current weather in {city} is {weather} with a temperature of {temp}°C and {humidity}% humidity."
    except Exception as e:
        return f"Error fetching weather for {city}: {str(e)}"

if __name__ == "__main__":
    # Test the tool
    print(get_weather("London"))
