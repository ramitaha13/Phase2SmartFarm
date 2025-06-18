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
  Sunrise,
  Sunset,
  Thermometer,
  ArrowUp,
  ArrowDown,
  Shield,
  Gauge,
  AlertTriangle,
  Info,
  Activity,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const WeatherPage = () => {
  const navigate = useNavigate();

  // Default city is Karmiel
  const [cities, setCities] = useState([
    { name: "Karmiel", lat: 32.9186, lon: 35.2952 },
  ]);

  // Add common locations from around the world
  const commonLocations = [
    { name: "Karmiel", lat: 32.9186, lon: 35.2952 },
    { name: "Tel Aviv", lat: 32.0853, lon: 34.7818 },
    { name: "Jerusalem", lat: 31.7683, lon: 35.2137 },
  ];

  const [weatherData, setWeatherData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Search state
  const [searchTerm, setSearchTerm] = useState("");
  const [searchError, setSearchError] = useState("");

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

  // Convert time format from API
  const formatTime = (timeString) => {
    if (!timeString) return "";
    const date = new Date(timeString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Fetch weather data for an array of city objects
  const fetchWeatherDataForCities = async (citiesArray) => {
    try {
      setIsRefreshing(true);
      const weatherPromises = citiesArray.map(async (city) => {
        // Enhanced API call with more parameters
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,pressure_msl,apparent_temperature,precipitation,cloud_cover,wind_direction_10m,wind_gusts_10m,uv_index,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,uv_index_max,precipitation_sum,wind_speed_10m_max&hourly=temperature_2m&wind_speed_unit=kmh&timezone=auto`;
        console.log("Fetching weather data from:", url);
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`Weather API error: ${response.statusText}`);
        }

        const data = await response.json();
        const current = data.current;
        const daily = data.daily;
        const hourly = data.hourly;

        // Process daily forecast data
        const weeklyForecast = Array.from({ length: 7 }, (_, i) => ({
          date: new Date(daily.time[i]).toLocaleDateString("en-US", {
            weekday: "short",
          }),
          maxTemp: `${Math.round(daily.temperature_2m_max[i])}°C`,
          minTemp: `${Math.round(daily.temperature_2m_min[i])}°C`,
          icon: getWeatherIcon(daily.weather_code[i]),
          rainChance: `${daily.precipitation_probability_max[i]}%`,
          precipitation: `${daily.precipitation_sum[i]} mm`,
          windSpeed: `${Math.round(daily.wind_speed_10m_max[i])} km/h`,
          sunrise: formatTime(daily.sunrise[i]),
          sunset: formatTime(daily.sunset[i]),
          uvIndex: daily.uv_index_max[i],
        }));

        // Simplified hourly forecast
        let hourlyForecast = [];

        if (hourly && hourly.time) {
          // Just take the first 24 hours
          for (let i = 0; i < 24 && i < hourly.time.length; i++) {
            hourlyForecast.push({
              time: new Date(hourly.time[i]).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
              temperature: `${Math.round(hourly.temperature_2m[i])}°C`,
              rainChance: "N/A", // Simplified since we're having issues with this data
            });
          }
        }

        return {
          name: city.name,
          country: city.country || "", // Add country information
          lat: city.lat,
          lon: city.lon,
          temperature: `${Math.round(current.temperature_2m)}°C`,
          feelsLike: `${Math.round(current.apparent_temperature)}°C`,
          humidity: `${current.relative_humidity_2m}%`,
          windSpeed: `${Math.round(current.wind_speed_10m)} km/h`,
          windDirection: current.wind_direction_10m,
          windGusts: `${Math.round(current.wind_gusts_10m)} km/h`,
          pressure: `${Math.round(current.pressure_msl)} hPa`,
          uvIndex: current.uv_index,
          cloudCover: `${current.cloud_cover}%`,
          precipitation: `${current.precipitation} mm`,
          condition: getWeatherCondition(current.weather_code),
          icon: getWeatherIcon(current.weather_code),
          isDay: current.is_day === 1,
          lastUpdated: new Date(current.time).toLocaleString(),
          forecast: weeklyForecast,
          hourlyForecast: hourlyForecast,
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

  // Input handler - allow letters, symbols, and spaces
  const handleInputChange = (e) => {
    // Accept all letters, numbers, spaces, and common symbols
    setSearchTerm(e.target.value);
    setSearchError("");
  };

  // Check common locations first, then use OpenStreetMap Nominatim API for worldwide search
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    // First check our predefined common locations
    const searchTermLower = searchTerm.toLowerCase().trim();
    const matchedLocation = commonLocations.find(
      (location) => location.name.toLowerCase() === searchTermLower
    );

    if (matchedLocation) {
      setCities([matchedLocation]);
      setLoading(true);
      fetchWeatherDataForCities([matchedLocation]);
      return;
    }

    try {
      setLoading(true);
      setSearchError("");

      // Use OpenStreetMap's Nominatim API for worldwide geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          searchTerm
        )}&format=json&addressdetails=1&limit=10&accept-language=en`
      );

      if (!response.ok) {
        throw new Error(`Nominatim API error: ${response.statusText}`);
      }

      const data = await response.json();

      if (data && data.length > 0) {
        // Filter to prioritize significant places (cities, towns, villages)
        const significantLocations = data.filter((location) => {
          // Prioritize cities, towns, villages, and other administrative areas
          const isSignificantPlace =
            location.class === "place" &&
            [
              "city",
              "town",
              "village",
              "suburb",
              "neighbourhood",
              "hamlet",
              "county",
              "state",
            ].includes(location.type);

          // Also include administrative boundaries and some landuse
          const isAdministrative =
            location.class === "boundary" && location.type === "administrative";
          const isLanduse =
            location.class === "landuse" &&
            ["residential", "commercial", "industrial"].includes(location.type);

          return isSignificantPlace || isAdministrative || isLanduse;
        });

        // If no significant places found, use all results
        const locationsToUse =
          significantLocations.length > 0 ? significantLocations : data;

        if (locationsToUse.length > 0) {
          const result = locationsToUse[0];

          // Extract the display name and country
          let locationName = searchTerm;
          let country = "";

          if (result.address) {
            // Prioritize city, town, village names
            locationName =
              result.address.city ||
              result.address.town ||
              result.address.village ||
              result.address.suburb ||
              result.address.neighbourhood ||
              result.address.county ||
              result.address.state ||
              result.display_name.split(",")[0];

            // Get country information
            country = result.address.country || "";
          }

          const newCity = {
            name: locationName,
            country: country,
            lat: parseFloat(result.lat),
            lon: parseFloat(result.lon),
          };

          console.log("Found location:", newCity);

          // Update cities state with the new city
          setCities([newCity]);
          // Fetch weather data for the new city
          fetchWeatherDataForCities([newCity]);
        } else {
          setSearchError(
            "No matching location found. Please try a different search term."
          );
          setLoading(false);
        }
      } else {
        setSearchError(
          "No matching location found. Please try a different search term."
        );
        setLoading(false);
      }
    } catch (err) {
      console.error("Geocoding error:", err);
      setSearchError("Error fetching location data. Please try again.");
      setLoading(false);
    }
  };

  // Enhanced: Function to get wind direction as a cardinal point with more details
  const getWindDirection = (degrees) => {
    if (degrees === undefined) return "N/A";

    const directions = [
      "N",
      "NNE",
      "NE",
      "ENE",
      "E",
      "ESE",
      "SE",
      "SSE",
      "S",
      "SSW",
      "SW",
      "WSW",
      "W",
      "WNW",
      "NW",
      "NNW",
    ];

    // Calculate the index (16 directions)
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
  };

  // Function to translate wind speed to Beaufort scale
  const getBeaufortScale = (speedKmh) => {
    if (speedKmh < 1) return { force: 0, description: "Calm" };
    if (speedKmh < 6) return { force: 1, description: "Light air" };
    if (speedKmh < 12) return { force: 2, description: "Light breeze" };
    if (speedKmh < 20) return { force: 3, description: "Gentle breeze" };
    if (speedKmh < 29) return { force: 4, description: "Moderate breeze" };
    if (speedKmh < 39) return { force: 5, description: "Fresh breeze" };
    if (speedKmh < 50) return { force: 6, description: "Strong breeze" };
    if (speedKmh < 62) return { force: 7, description: "High wind" };
    if (speedKmh < 75) return { force: 8, description: "Gale" };
    if (speedKmh < 89) return { force: 9, description: "Strong gale" };
    if (speedKmh < 103) return { force: 10, description: "Storm" };
    if (speedKmh < 118) return { force: 11, description: "Violent storm" };
    return { force: 12, description: "Hurricane" };
  };

  // NEW COMPONENT: Enhanced Wind Details
  const EnhancedWindDetails = ({ city }) => {
    const beaufort = getBeaufortScale(parseInt(city.windSpeed));

    // Parse wind speed for calculations
    const windSpeedNum = parseInt(city.windSpeed);
    const windGustsNum = parseInt(city.windGusts);

    // Calculate gust factor (how much stronger the gusts are compared to average)
    const gustFactor = windGustsNum / windSpeedNum;

    // Determine color and description based on wind speed
    const getWindSpeedColor = (speed) => {
      if (speed < 10) return { color: "#22c55e", text: "Light" }; // green
      if (speed < 20) return { color: "#60a5fa", text: "Moderate" }; // blue
      if (speed < 40) return { color: "#facc15", text: "Strong" }; // yellow
      if (speed < 60) return { color: "#f97316", text: "Very Strong" }; // orange
      return { color: "#ef4444", text: "Extreme" }; // red
    };

    const windInfo = getWindSpeedColor(windSpeedNum);

    // Get wind effect description
    const getWindEffect = (force) => {
      const effects = [
        "Calm. Smoke rises vertically.",
        "Wind barely noticeable. Smoke drifts slowly.",
        "Light breeze felt on face. Leaves rustle.",
        "Leaves and small twigs in constant motion.",
        "Dust and loose paper raised. Small branches move.",
        "Small trees sway. Waves form on inland waters.",
        "Large branches move. Whistling heard in wires.",
        "Whole trees move. Difficult to walk against wind.",
        "Twigs break off trees. Progress impeded when walking.",
        "Slight structural damage occurs. Roofing damaged.",
        "Trees uprooted. Considerable structural damage.",
        "Widespread damage. Very rare on land.",
        "Severe widespread damage to structures.",
      ];

      return effects[Math.min(force, effects.length - 1)];
    };

    // Helper function for wind impact tags
    const getWindImpactTags = (force) => {
      const impacts = [];

      // Add impacts based on force
      if (force <= 2) {
        impacts.push({ text: "Pleasant", color: "#22c55e" });
        impacts.push({ text: "Good for walking", color: "#22c55e" });
      }

      if (force >= 3 && force <= 4) {
        impacts.push({ text: "Good for sailing", color: "#3b82f6" });
        impacts.push({ text: "Moderate cycling conditions", color: "#3b82f6" });
      }

      if (force >= 5 && force <= 6) {
        impacts.push({ text: "Difficult cycling", color: "#f59e0b" });
        impacts.push({ text: "Good for windsurfing", color: "#3b82f6" });
        impacts.push({ text: "Small craft advisory", color: "#f59e0b" });
      }

      if (force >= 7) {
        impacts.push({ text: "Dangerous for small boats", color: "#ef4444" });
        impacts.push({ text: "Wind damage possible", color: "#ef4444" });
        impacts.push({ text: "Difficult to walk", color: "#f59e0b" });
      }

      // Add wind chill impact if cold
      if (force >= 4) {
        impacts.push({ text: "Wind chill effect", color: "#60a5fa" });
      }

      return impacts;
    };

    return (
      <div className="mt-8 bg-gradient-to-r from-sky-50 to-indigo-50 p-6 rounded-xl shadow">
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
          <Wind className="h-6 w-6 mr-2 text-blue-600" />
          Wind Conditions
        </h3>

        {/* Main Wind Info Dashboard */}
        <div className="bg-white rounded-lg p-5 shadow-sm mb-6">
          <div className="flex flex-wrap items-center justify-between">
            {/* Current Wind Overview */}
            <div className="flex items-center space-x-3">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: `${windInfo.color}20`,
                  borderColor: windInfo.color,
                  borderWidth: "2px",
                }}
              >
                <Wind className="h-8 w-8" style={{ color: windInfo.color }} />
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-800">
                  {city.windSpeed}
                </div>
                <div className="text-gray-500">{windInfo.text} Wind</div>
              </div>
            </div>

            {/* Direction Indicator */}
            <div className="flex flex-col items-center">
              <div className="text-sm text-gray-500 mb-1">Direction</div>
              <div className="relative w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border border-gray-200"></div>
                <div className="z-10 absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 text-xs">
                  N
                </div>
                <div className="z-10 absolute right-0 top-1/2 translate-x-1 -translate-y-1/2 text-xs">
                  E
                </div>
                <div className="z-10 absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1 text-xs">
                  S
                </div>
                <div className="z-10 absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 text-xs">
                  W
                </div>

                <ArrowUp
                  className="h-10 w-10 text-blue-600 transform"
                  style={{ transform: `rotate(${city.windDirection}deg)` }}
                />
              </div>
              <div className="mt-1 text-sm font-medium">
                {getWindDirection(city.windDirection)}
              </div>
            </div>

            {/* Beaufort Scale */}
            <div className="flex flex-col">
              <div className="text-sm text-gray-500 mb-1">Beaufort Scale</div>
              <div className="flex items-end space-x-1 h-10">
                {Array(12)
                  .fill(0)
                  .map((_, i) => {
                    const isActive = i < beaufort.force;

                    // Color varies by strength
                    const getBoxColor = (index) => {
                      if (index < 3) return "bg-green-500"; // Light
                      if (index < 7) return "bg-yellow-500"; // Moderate
                      if (index < 10) return "bg-orange-500"; // Strong
                      return "bg-red-500"; // Extreme
                    };

                    return (
                      <div
                        key={i}
                        className={`w-3 rounded-sm transition-all ${
                          isActive ? getBoxColor(i) : "bg-gray-200"
                        }`}
                        style={{ height: `${(i + 1) * 2 + 4}px` }}
                      ></div>
                    );
                  })}
              </div>
              <div className="mt-1 text-sm font-medium">
                Force {beaufort.force}
              </div>
            </div>
          </div>
        </div>

        {/* Wind Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Wind Description */}
          <div className="bg-white rounded-lg p-4 shadow-sm h-full">
            <div className="flex items-center mb-2">
              <Info className="h-4 w-4 mr-2 text-blue-500" />
              <div className="font-medium">Wind Characteristics</div>
            </div>
            <p className="text-gray-700 text-sm">
              {beaufort.description} - {getWindEffect(beaufort.force)}
            </p>
          </div>

          {/* Wind Gusts */}
          <div className="bg-white rounded-lg p-4 shadow-sm h-full">
            <div className="flex items-center mb-2">
              <CloudFog className="h-4 w-4 mr-2 text-purple-500" />
              <div className="font-medium">Wind Gusts</div>
            </div>

            {/* Gust meter */}
            <div className="flex items-center justify-between">
              <div className="text-gray-700 font-medium">{city.windSpeed}</div>
              <div className="relative flex-grow mx-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="absolute top-0 left-0 h-full bg-purple-500"
                  style={{ width: `${100 * gustFactor - 100}%` }}
                ></div>
              </div>
              <div className="text-purple-700 font-medium">
                {city.windGusts}
              </div>
            </div>

            <div className="mt-2 text-xs text-gray-600">
              {gustFactor > 1.5 ? (
                <span className="flex items-center text-amber-600">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Strong gusts: {Math.round((gustFactor - 1) * 100)}% above
                  average wind speed
                </span>
              ) : (
                `Gusts are ${Math.round(
                  (gustFactor - 1) * 100
                )}% above average wind speed`
              )}
            </div>
          </div>
        </div>

        {/* Wind Impact */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <h4 className="font-medium mb-2 flex items-center">
            <Activity className="h-4 w-4 mr-2 text-blue-500" />
            Wind Impact
          </h4>
          <div className="flex flex-wrap gap-2">
            {getWindImpactTags(beaufort.force).map((tag, i) => (
              <span
                key={i}
                className="px-2 py-1 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: tag.color + "20",
                  color: tag.color,
                  border: `1px solid ${tag.color}`,
                }}
              >
                {tag.text}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
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
              Global Weather Forecast
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
        <form onSubmit={handleSearch} className="mb-6 flex flex-col">
          <div className="flex">
            <input
              type="text"
              placeholder="Search for any city worldwide..."
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
          </div>
          {searchError && (
            <div className="mt-2 text-red-500 flex items-center">
              <AlertTriangle className="h-4 w-4 mr-1" />
              <span className="text-sm">{searchError}</span>
            </div>
          )}
        </form>

        {/* Common locations quick access */}
        <div className="mb-6">
          <p className="text-sm text-gray-600 mb-2">Common locations:</p>
          <div className="flex flex-wrap gap-2">
            {commonLocations.map((location) => (
              <button
                key={location.name}
                onClick={() => {
                  setCities([location]);
                  setLoading(true);
                  fetchWeatherDataForCities([location]);
                }}
                className="bg-gray-100 hover:bg-gray-200 text-sm px-3 py-1 rounded-full text-gray-700"
              >
                {location.name}
              </button>
            ))}
          </div>
        </div>

        {/* Instruction under the search bar */}
        <div className="mb-8 flex items-center space-x-2">
          <span className="text-xl font-bold text-green-500">&bull;</span>
          <p className="text-gray-600 text-sm italic">
            Enter any city name worldwide. Try clicking one of the common
            locations above.
          </p>
        </div>

        {/* Weather Cards */}
        {weatherData.map((city) => {
          const Icon = city.icon;
          const beaufort = getBeaufortScale(parseInt(city.windSpeed));

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
                    {city.country ? `, ${city.country}` : ""}
                  </h2>
                </div>
                <div className="text-sm text-gray-500">{city.lastUpdated}</div>
              </div>

              {/* Weather Details */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Current Conditions - Left Column */}
                <div className="flex flex-col">
                  <div className="flex items-center space-x-4">
                    <Icon
                      className={`h-16 w-16 ${
                        city.isDay ? "text-yellow-500" : "text-gray-600"
                      }`}
                    />
                    <div>
                      <div className="text-4xl font-bold text-gray-800">
                        {city.temperature}
                      </div>
                      <div className="text-lg text-gray-500">
                        {city.condition}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        Feels like {city.feelsLike}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Weather Metrics - Middle Column */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center space-x-2 bg-gray-100 p-2 rounded-lg">
                    <Droplets className="h-5 w-5 text-blue-600" />
                    <div>
                      <div className="text-xs text-gray-500">Humidity</div>
                      <div className="font-semibold text-gray-700">
                        {city.humidity}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 bg-gray-100 p-2 rounded-lg">
                    <Wind className="h-5 w-5 text-gray-600" />
                    <div>
                      <div className="text-xs text-gray-500">Wind</div>
                      <div className="font-semibold text-gray-700">
                        {city.windSpeed} {getWindDirection(city.windDirection)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 bg-gray-100 p-2 rounded-lg">
                    <CloudRain className="h-5 w-5 text-blue-500" />
                    <div>
                      <div className="text-xs text-gray-500">Precipitation</div>
                      <div className="font-semibold text-gray-700">
                        {city.precipitation}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 bg-gray-100 p-2 rounded-lg">
                    <Gauge className="h-5 w-5 text-purple-600" />
                    <div>
                      <div className="text-xs text-gray-500">Pressure</div>
                      <div className="font-semibold text-gray-700">
                        {city.pressure}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 bg-gray-100 p-2 rounded-lg">
                    <Shield className="h-5 w-5 text-orange-500" />
                    <div>
                      <div className="text-xs text-gray-500">UV Index</div>
                      <div className="font-semibold text-gray-700">
                        {city.uvIndex}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 bg-gray-100 p-2 rounded-lg">
                    <Cloud className="h-5 w-5 text-gray-500" />
                    <div>
                      <div className="text-xs text-gray-500">Cloud Cover</div>
                      <div className="font-semibold text-gray-700">
                        {city.cloudCover}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Map Section - Right Column */}
                <div className="h-full rounded-lg overflow-hidden shadow-md">
                  <iframe
                    title={`Map of ${city.name}`}
                    width="100%"
                    height="100%"
                    style={{ border: 0, minHeight: "200px" }}
                    loading="lazy"
                    allowFullScreen
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${
                      city.lon - 0.05
                    }%2C${city.lat - 0.05}%2C${city.lon + 0.05}%2C${
                      city.lat + 0.05
                    }&layer=mapnik&marker=${city.lat}%2C${city.lon}`}
                  ></iframe>
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${city.lat}&mlon=${city.lon}#map=12/${city.lat}/${city.lon}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline mt-1 block text-right pr-2"
                  >
                    View larger map
                  </a>
                </div>
              </div>

              {/* Enhanced Wind Details Section */}
              <EnhancedWindDetails city={{ ...city, beaufort }} />

              {/* Sunrise and Sunset */}
              <div className="mt-6 grid grid-cols-2 gap-4 max-w-md">
                <div className="flex items-center space-x-3 bg-gradient-to-r from-yellow-100 to-orange-100 p-3 rounded-lg">
                  <Sunrise className="h-8 w-8 text-orange-500" />
                  <div>
                    <div className="text-sm text-gray-600">Sunrise</div>
                    <div className="font-semibold text-gray-800">
                      {city.forecast[0].sunrise}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3 bg-gradient-to-r from-blue-100 to-purple-100 p-3 rounded-lg">
                  <Sunset className="h-8 w-8 text-purple-500" />
                  <div>
                    <div className="text-sm text-gray-600">Sunset</div>
                    <div className="font-semibold text-gray-800">
                      {city.forecast[0].sunset}
                    </div>
                  </div>
                </div>
              </div>

              {/* Hourly Forecast */}
              <div className="mt-8">
                <h3 className="text-lg font-bold text-gray-700 mb-4 flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  Hourly Forecast
                </h3>
                <div className="overflow-x-auto pb-2">
                  <div
                    className="flex space-x-4"
                    style={{ minWidth: "max-content" }}
                  >
                    {city.hourlyForecast && city.hourlyForecast.length > 0 ? (
                      city.hourlyForecast.map((hour, index) => (
                        <div
                          key={index}
                          className="flex flex-col items-center bg-white border border-gray-200 rounded-lg p-3 min-w-[90px]"
                        >
                          <span className="text-sm font-medium text-gray-700">
                            {hour.time}
                          </span>
                          <div className="my-2 text-xl font-bold">
                            {hour.temperature}
                          </div>
                          <div className="flex items-center space-x-1">
                            <CloudRain className="h-4 w-4 text-blue-500" />
                            <span className="text-xs text-gray-600">
                              {hour.rainChance}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-gray-500 italic">
                        Hourly forecast data unavailable
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Weekly Forecast */}
              <div className="mt-8">
                <h3 className="text-lg font-bold text-gray-700 mb-4 flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  7-Day Forecast
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                  {city.forecast.map((day, index) => {
                    const DayIcon = day.icon;
                    return (
                      <div
                        key={day.date}
                        className="flex flex-col bg-white border border-gray-200 p-3 rounded-lg hover:shadow-md transition-shadow"
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium text-gray-800">
                            {index === 0 ? "Today" : day.date}
                          </span>
                          {day.uvIndex > 5 && (
                            <Shield
                              className="h-4 w-4 text-orange-500"
                              title={`UV Index: ${day.uvIndex}`}
                            />
                          )}
                        </div>

                        <div className="flex justify-center my-2">
                          <DayIcon className="h-10 w-10 text-gray-600" />
                        </div>

                        <div className="flex justify-between items-center mt-1">
                          <div className="flex items-center">
                            <ArrowUp className="h-4 w-4 text-red-500 mr-1" />
                            <span className="text-sm font-semibold">
                              {day.maxTemp}
                            </span>
                          </div>
                          <div className="flex items-center">
                            <ArrowDown className="h-4 w-4 text-blue-500 mr-1" />
                            <span className="text-sm">{day.minTemp}</span>
                          </div>
                        </div>

                        <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-600">
                          <div className="flex items-center mb-1">
                            <CloudRain className="h-3 w-3 mr-1 text-blue-500" />
                            <span>{day.rainChance}</span>
                          </div>
                          <div className="flex items-center">
                            <Wind className="h-3 w-3 mr-1 text-gray-500" />
                            <span>{day.windSpeed}</span>
                          </div>
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
