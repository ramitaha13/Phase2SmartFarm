import React, { useState, useEffect } from "react";
import {
  Cloud,
  Droplets,
  Wind,
  Sun,
  CloudRain,
  Umbrella,
  ChevronLeft,
  Loader,
  CloudFog,
  CloudDrizzle,
  CloudLightning,
  MapPin,
  Calendar,
  RefreshCw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const WeatherPage = () => {
  const navigate = useNavigate();

  // Default city is Karmiel
  const [cities, setCities] = useState([
    { name: "Karmiel", lat: 32.9186, lon: 35.2952 },
  ]);
  const [weatherData, setWeatherData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Search state
  const [searchTerm, setSearchTerm] = useState("");

  const getWeatherIcon = (code) => {
    if (code >= 0 && code <= 1) return Sun;
    if (code >= 2 && code <= 3) return Cloud;
    if (code >= 45 && code <= 48) return CloudFog;
    if ((code >= 51 && code <= 55) || (code >= 80 && code <= 82))
      return CloudDrizzle;
    if (code >= 61 && code <= 65) return CloudRain;
    if (code >= 95 && code <= 99) return CloudLightning;
    return Cloud;
  };

  const getWeatherCondition = (code) => {
    if (code === 0) return "Clear sky";
    if (code === 1) return "Mainly clear";
    if (code === 2) return "Partly cloudy";
    if (code === 3) return "Overcast";
    if (code === 45 || code === 48) return "Foggy";
    if (code >= 51 && code <= 55) return "Drizzle";
    if (code >= 61 && code <= 65) return "Rain";
    if (code >= 71 && code <= 77) return "Snow";
    if (code >= 80 && code <= 82) return "Rain showers";
    if (code >= 95 && code <= 99) return "Thunderstorm";
    return "Unknown";
  };

  // Fetch weather data for an array of city objects
  const fetchWeatherDataForCities = async (citiesArray) => {
    try {
      setIsRefreshing(true);
      const weatherPromises = citiesArray.map(async (city) => {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&wind_speed_unit=kmh&timezone=IST`;
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`Weather API error: ${response.statusText}`);
        }

        const data = await response.json();
        const current = data.current;
        const daily = data.daily;

        const weeklyForecast = Array.from({ length: 7 }, (_, i) => ({
          date: new Date(daily.time[i]).toLocaleDateString("en-US", {
            weekday: "short",
          }),
          maxTemp: `${Math.round(daily.temperature_2m_max[i])}°C`,
          minTemp: `${Math.round(daily.temperature_2m_min[i])}°C`,
          icon: getWeatherIcon(daily.weather_code[i]),
          rainChance: `${daily.precipitation_probability_max[i]}%`,
        }));

        return {
          name: city.name,
          temperature: `${Math.round(current.temperature_2m)}°C`,
          humidity: `${current.relative_humidity_2m}%`,
          windSpeed: `${Math.round(current.wind_speed_10m)} km/h`,
          condition: getWeatherCondition(current.weather_code),
          icon: getWeatherIcon(current.weather_code),
          lastUpdated: new Date(current.time).toLocaleString(),
          forecast: weeklyForecast,
        };
      });

      const results = await Promise.all(weatherPromises);
      setWeatherData(results);
      setLoading(false);
      setIsRefreshing(false);
    } catch (err) {
      setError(`Failed to fetch weather data: ${err.message}`);
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Fetch initial weather data and set an interval to refresh
  useEffect(() => {
    fetchWeatherDataForCities(cities);
    const interval = setInterval(() => {
      fetchWeatherDataForCities(cities);
    }, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [cities]);

  const handleBack = () => {
    navigate(-1);
  };

  // Prevent non-English letters in the search field
  const handleInputChange = (e) => {
    const onlyEnglish = e.target.value.replace(/[^a-zA-Z\s]+/g, "");
    setSearchTerm(onlyEnglish);
  };

  // Handle search form submission
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    try {
      setLoading(true);
      // Use Open-Meteo's free geocoding API
      const response = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          searchTerm
        )}`
      );
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        const newCity = {
          name: result.name,
          lat: result.latitude,
          lon: result.longitude,
        };

        // Update cities state with the new city
        setCities([newCity]);
        // Fetch weather data for the new city
        fetchWeatherDataForCities([newCity]);
      } else {
        setError("No matching location found.");
        setLoading(false);
      }
    } catch (err) {
      setError("Error fetching location data.");
      setLoading(false);
    }
  };

  // Loading screen
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="flex items-center space-x-4 bg-white rounded-xl shadow-md p-6">
          <Loader className="h-8 w-8 animate-spin text-green-600" />
          <span className="text-gray-700 text-lg font-semibold">
            Loading weather data...
          </span>
        </div>
      </div>
    );
  }

  // Error screen
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-md p-6 text-center">
          <div className="text-red-600 font-bold text-xl mb-4">
            Weather Data Error
          </div>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={handleBack}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  // Main UI
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with back and refresh buttons */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <button
              onClick={handleBack}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
              <span>Back</span>
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              Weather Forecast
            </h1>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex justify-between items-center">
          {/* Refresh Button */}
          <button
            onClick={() => fetchWeatherDataForCities(cities)}
            disabled={isRefreshing}
            className="flex items-center space-x-2 bg-green-50 text-green-700 px-4 py-2 rounded-md hover:bg-green-100 transition-colors"
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
            <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="mb-6 flex">
          <input
            type="text"
            placeholder="Search for an area..."
            className="flex-grow border border-gray-300 rounded-l-lg px-4 py-2 focus:outline-none"
            value={searchTerm}
            onChange={handleInputChange}
          />
          <button
            type="submit"
            className="bg-green-600 text-white px-4 py-2 rounded-r-lg hover:bg-green-700"
          >
            Search
          </button>
        </form>

        {/* Instruction under the search bar */}
        <div className="mb-8 flex items-center space-x-2">
          <span className="text-xl font-bold text-green-500">&bull;</span>
          <p className="text-gray-600 text-sm italic">
            Just write the area in English.
          </p>
        </div>

        {/* Weather Cards */}
        {weatherData.map((city) => {
          const Icon = city.icon;
          return (
            <div
              key={city.name}
              className="mb-8 border border-gray-200 rounded-xl p-6"
            >
              {/* City Header */}
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <MapPin className="h-6 w-6 text-gray-600" />
                  <h2 className="text-xl font-bold text-gray-900">
                    {city.name}
                  </h2>
                </div>
                <div className="text-sm text-gray-500">{city.lastUpdated}</div>
              </div>

              {/* Weather Details */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Current Conditions */}
                <div className="flex items-center space-x-4">
                  <Icon className="h-16 w-16 text-gray-600" />
                  <div>
                    <div className="text-4xl font-bold text-gray-800">
                      {city.temperature}
                    </div>
                    <div className="text-lg text-gray-500">
                      {city.condition}
                    </div>
                  </div>
                </div>

                {/* Humidity and Wind */}
                <div className="flex space-x-4">
                  <div className="flex items-center space-x-2 bg-gray-100 p-3 rounded-lg">
                    <Droplets className="h-6 w-6 text-gray-600" />
                    <div>
                      <div className="text-sm text-gray-500">Humidity</div>
                      <div className="font-semibold text-gray-700">
                        {city.humidity}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 bg-gray-100 p-3 rounded-lg">
                    <Wind className="h-6 w-6 text-gray-600" />
                    <div>
                      <div className="text-sm text-gray-500">Wind Speed</div>
                      <div className="font-semibold text-gray-700">
                        {city.windSpeed}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Weekly Forecast */}
              <div className="mt-6">
                <h3 className="text-lg font-bold text-gray-700 mb-4">
                  7-Day Forecast
                </h3>
                <div className="grid grid-cols-3 md:grid-cols-7 gap-4">
                  {city.forecast.map((day) => {
                    const DayIcon = day.icon;
                    return (
                      <div
                        key={day.date}
                        className="flex flex-col items-center space-y-1 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <span className="text-xs font-medium text-gray-600">
                          {day.date}
                        </span>
                        <DayIcon className="h-8 w-8 text-gray-600" />
                        <div className="text-center">
                          <div className="text-xs font-semibold text-gray-800">
                            {day.maxTemp}
                          </div>
                          <div className="text-xs text-gray-500">
                            {day.minTemp}
                          </div>
                        </div>
                        <div className="text-xs text-gray-700">
                          {day.rainChance}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WeatherPage;
