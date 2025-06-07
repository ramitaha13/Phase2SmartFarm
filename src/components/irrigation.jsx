import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  RefreshCw,
  Settings,
  AlertTriangle,
  MessageSquare,
  ChevronDown,
  Leaf,
  Droplet,
  AlertCircle,
  UserCheck,
  CloudRain,
  FileText,
  MapPin,
  Thermometer,
  Wind,
  Gauge,
  Sun,
  Shield,
} from "lucide-react";

const SmartFarmAdvisor = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [weatherData, setWeatherData] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Advice states
  const [irrigationAdvice, setIrrigationAdvice] = useState("");
  const [issuesDetected, setIssuesDetected] = useState("");
  const [personalizedRecommendations, setPersonalizedRecommendations] =
    useState("");
  const [futureForecast, setFutureForecast] = useState("");
  const [conclusions, setConclusions] = useState("");

  const [isLoadingAdvice, setIsLoadingAdvice] = useState(false);
  const [adviceError, setAdviceError] = useState(null);
  const [selectedPlant, setSelectedPlant] = useState("general");
  const [customPlant, setCustomPlant] = useState("");
  const [isCustomPlant, setIsCustomPlant] = useState(false);
  const [showPlantSelector, setShowPlantSelector] = useState(false);
  const [additionalDescription, setAdditionalDescription] = useState("");
  const [showDescription, setShowDescription] = useState(false);

  // API settings
  const API_KEY = "AIzaSyAmcBSSX4S4fTkAhCmegZkDUOmou-dvSIo";
  const API_URL =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

  // Karmiel coordinates (fixed location)
  const KARMIEL_LOCATION = {
    name: "Karmiel",
    nameHe: "כרמיאל",
    lat: 32.9186,
    lon: 35.2952,
  };

  // Common plants for dropdown
  const commonPlants = [
    { id: "general", nameEn: "General Advice", nameHe: "עצות כלליות" },
    { id: "tomato", nameEn: "Tomato", nameHe: "עגבנייה" },
    { id: "cucumber", nameEn: "Cucumber", nameHe: "מלפפון" },
    { id: "pepper", nameEn: "Pepper", nameHe: "פלפל" },
    { id: "lettuce", nameEn: "Lettuce", nameHe: "חסה" },
    { id: "carrot", nameEn: "Carrot", nameHe: "גזר" },
    { id: "potato", nameEn: "Potato", nameHe: "תפוח אדמה" },
    { id: "corn", nameEn: "Corn", nameHe: "תירס" },
    { id: "eggplant", nameEn: "Eggplant", nameHe: "חציל" },
    { id: "zucchini", nameEn: "Zucchini", nameHe: "קישוא" },
    { id: "custom", nameEn: "Other (specify)", nameHe: "אחר (פרט)" },
  ];

  // Initialize user data and fetch Karmiel weather
  useEffect(() => {
    // Simulate user authentication
    setUserData({ role: "Manager", email: "demo@example.com" });
    fetchKarmielWeatherData();

    // Set interval to refresh weather data every 15 minutes
    const interval = setInterval(fetchKarmielWeatherData, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch weather data for Karmiel from Open-Meteo API with multi-level soil temperatures
  const fetchKarmielWeatherData = async () => {
    try {
      setIsRefreshing(true);

      // Enhanced API call with multi-level soil temperatures and explicit cloud cover
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${KARMIEL_LOCATION.lat}&longitude=${KARMIEL_LOCATION.lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,pressure_msl,apparent_temperature,precipitation,cloud_cover,wind_direction_10m,wind_gusts_10m,uv_index,is_day,soil_temperature_0cm,soil_temperature_6cm,soil_temperature_18cm,soil_temperature_54cm&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,uv_index_max,precipitation_sum,wind_speed_10m_max&wind_speed_unit=kmh&timezone=auto`;

      console.log(
        "Fetching Karmiel weather data with soil temperatures from:",
        url
      );
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Weather API error: ${response.statusText}`);
      }

      const data = await response.json();
      const current = data.current;

      // Process weather data to include multi-level soil temperatures
      const processedData = {
        // Location info
        location: KARMIEL_LOCATION.name,
        locationHe: KARMIEL_LOCATION.nameHe,
        coordinates: { lat: KARMIEL_LOCATION.lat, lon: KARMIEL_LOCATION.lon },

        // Temperature (matches sensor "temperature")
        temperature: current.temperature_2m
          ? Math.round(current.temperature_2m)
          : undefined,

        // Air humidity (matches sensor "humidity")
        humidity: current.relative_humidity_2m
          ? Math.round(current.relative_humidity_2m)
          : undefined,

        // Soil humidity (simulate based on humidity and precipitation)
        soilHumidity: current.relative_humidity_2m
          ? Math.max(
              10,
              Math.min(
                90,
                Math.round(
                  current.relative_humidity_2m * 0.8 +
                    (current.precipitation || 0) * 10
                )
              )
            )
          : undefined,
        soilHumidityRaw: current.relative_humidity_2m
          ? Math.round(
              (current.relative_humidity_2m * 0.8 +
                (current.precipitation || 0) * 10) *
                45.5
            )
          : undefined, // Simulate raw sensor value (0-4095)

        // Light level (use UV index and cloud cover, handle when cloud cover is unavailable)
        light:
          current.uv_index !== undefined &&
          current.cloud_cover !== undefined &&
          current.cloud_cover !== null
            ? Math.round(current.uv_index * (100 - current.cloud_cover) * 2)
            : current.uv_index !== undefined
            ? Math.round(current.uv_index * 100) // Default calculation when cloud cover unavailable
            : undefined,

        // Pressure (matches sensor "Pressure")
        pressure: current.pressure_msl
          ? Math.round(current.pressure_msl)
          : undefined,

        // Multi-level soil temperatures from Open-Meteo API
        soilTemperatures: {
          surface: current.soil_temperature_0cm
            ? Math.round(current.soil_temperature_0cm * 10) / 10
            : undefined,
          depth6cm: current.soil_temperature_6cm
            ? Math.round(current.soil_temperature_6cm * 10) / 10
            : undefined,
          depth18cm: current.soil_temperature_18cm
            ? Math.round(current.soil_temperature_18cm * 10) / 10
            : undefined,
          depth54cm: current.soil_temperature_54cm
            ? Math.round(current.soil_temperature_54cm * 10) / 10
            : undefined,
        },

        // Additional weather data
        apparentTemperature: current.apparent_temperature
          ? Math.round(current.apparent_temperature)
          : undefined,
        windSpeed: current.wind_speed_10m
          ? Math.round(current.wind_speed_10m)
          : undefined,
        windDirection: current.wind_direction_10m,
        windGusts: current.wind_gusts_10m
          ? Math.round(current.wind_gusts_10m)
          : undefined,
        cloudCover:
          current.cloud_cover !== undefined && current.cloud_cover !== null
            ? Math.round(current.cloud_cover)
            : undefined,
        precipitation: current.precipitation || 0,
        uvIndex: current.uv_index,
        isDay: current.is_day === 1,
        weatherCode: current.weather_code,

        // Estimated overall soil temperature (average of available readings)
        soilTemperature: (() => {
          const temps = [
            current.soil_temperature_0cm,
            current.soil_temperature_6cm,
            current.soil_temperature_18cm,
            current.soil_temperature_54cm,
          ].filter((t) => t !== undefined);
          return temps.length > 0
            ? Math.round(temps.reduce((a, b) => a + b, 0) / temps.length)
            : undefined;
        })(),

        // Timestamp
        receivedAt: new Date(current.time).toLocaleString(),
        timestamp: current.time,
      };

      setWeatherData(processedData);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching Karmiel weather data:", error);
      setWeatherData(null);
      setLoading(false);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Get moisture status (adapted for soil moisture values)
  const getMoistureStatus = (soilMoisture) => {
    if (soilMoisture === undefined) {
      return {
        color: "text-gray-600",
        bg: "bg-gray-50",
        message: "Unknown",
      };
    }

    // Adjust thresholds for soil moisture (0-100 scale from weather API)
    if (soilMoisture < 10)
      return { color: "text-red-700", bg: "bg-red-100", message: "Very Dry" };
    if (soilMoisture < 20)
      return { color: "text-red-600", bg: "bg-red-50", message: "Dry" };
    if (soilMoisture < 40)
      return {
        color: "text-yellow-600",
        bg: "bg-yellow-50",
        message: "Moderate",
      };
    if (soilMoisture < 60)
      return { color: "text-green-600", bg: "bg-green-50", message: "Good" };
    if (soilMoisture < 80)
      return { color: "text-blue-600", bg: "bg-blue-50", message: "Wet" };
    return { color: "text-blue-700", bg: "bg-blue-100", message: "Very Wet" };
  };

  // Function to get AI advice using weather data including multi-level soil temperatures
  const getAiAdvice = async () => {
    if (!weatherData) return;

    setIsLoadingAdvice(true);
    setAdviceError(null);

    try {
      // Determine plant name
      let plantName = "plants in general";
      if (selectedPlant === "custom" && customPlant.trim() !== "") {
        plantName = customPlant.trim();
      } else if (selectedPlant !== "general") {
        const plant = commonPlants.find((p) => p.id === selectedPlant);
        if (plant) {
          plantName = plant.nameEn;
        }
      }

      // Get moisture status
      const moistureStatus = getMoistureStatus(weatherData.soilHumidity);

      // Format soil temperature data for prompt
      const soilTempData = weatherData.soilTemperatures;
      const soilTempText = `
        - Soil temperature at surface (0cm): ${
          soilTempData.surface !== undefined
            ? soilTempData.surface + "°C"
            : "25°C"
        }
        - Soil temperature at 6cm depth: ${
          soilTempData.depth6cm !== undefined
            ? soilTempData.depth6cm + "°C"
            : "24°C"
        }
        - Soil temperature at 18cm depth: ${
          soilTempData.depth18cm !== undefined
            ? soilTempData.depth18cm + "°C"
            : "23°C"
        }
        - Soil temperature at 54cm depth: ${
          soilTempData.depth54cm !== undefined
            ? soilTempData.depth54cm + "°C"
            : "22°C"
        }
        - Average soil temperature: ${
          weatherData.soilTemperature !== undefined
            ? weatherData.soilTemperature + "°C"
            : "23°C"
        }`;

      // Create enhanced prompt with multi-level soil temperature data - always provide advice
      const prompt = `
        I have the following sensor readings from my smart farm in Karmiel (כרמיאל), Israel:
        - Light level: ${
          weatherData.light !== undefined ? weatherData.light : "1000"
        }
        - Air pressure: ${
          weatherData.pressure !== undefined
            ? weatherData.pressure + " hPa"
            : "1013 hPa"
        }
        - Soil humidity raw value: ${
          weatherData.soilHumidityRaw !== undefined
            ? weatherData.soilHumidityRaw
            : "2000"
        } 
        - Soil humidity percentage: ${
          weatherData.soilHumidity !== undefined
            ? weatherData.soilHumidity + "%"
            : "35%"
        } (converted from raw value)
        - Soil moisture status: ${
          weatherData.soilHumidity !== undefined
            ? moistureStatus.message
            : "Moderate"
        }
        - Air humidity: ${
          weatherData.humidity !== undefined
            ? weatherData.humidity + "%"
            : "45%"
        }
        - Air temperature: ${
          weatherData.temperature !== undefined
            ? weatherData.temperature + "°C"
            : "25°C"
        }
        ${soilTempText}
        - Wind speed: ${
          weatherData.windSpeed !== undefined
            ? weatherData.windSpeed + " km/h"
            : "10 km/h"
        }
        - UV Index: ${
          weatherData.uvIndex !== undefined ? weatherData.uvIndex : "5"
        }
        - Cloud cover: ${
          weatherData.cloudCover !== undefined
            ? weatherData.cloudCover + "%"
            : "20%"
        }
        - Precipitation: ${
          weatherData.precipitation !== undefined
            ? weatherData.precipitation + " mm"
            : "0 mm"
        }
        - Timestamp: ${weatherData.receivedAt || "Current reading"}
        
        I'm growing ${plantName} in Karmiel, Northern Israel (Galilee region). ${
        additionalDescription
          ? `Additional context: ${additionalDescription}`
          : ""
      }
        
        Based on these readings from Karmiel's Mediterranean climate conditions, provide comprehensive data-driven advice organized into exactly FIVE separate sections. You MUST provide detailed recommendations for each section - never say "no data" or "not available". Use the provided values and your knowledge of Mediterranean agriculture to give specific, actionable advice:
        
        1. "החלטות השקיה חכמות (Smart Irrigation)" - Provide specific irrigation schedule, timing, and amount recommendations based on the soil humidity, temperature profile, and weather conditions. Consider the Mediterranean climate patterns and seasonal needs.
        
        2. "זיהוי בעיות בשטח" - Identify potential agricultural issues and preventive measures based on the current readings. Analyze soil temperature variations, humidity levels, and environmental stress factors. Always provide specific problems to watch for and solutions.
        
        3. "תחזיות והמלצות מותאמות אישית" - Give personalized recommendations for immediate and upcoming agricultural actions. Include fertilization, pest management, plant care, and optimization strategies specific to Karmiel's conditions and the selected crop.
        
        4. "חיזוי תנאים עתידיים" - Provide predictions about upcoming agricultural conditions and required preparations. Consider seasonal patterns, weather trends, and soil development needs for the next 1-2 weeks in the Mediterranean climate.
        
        5. "מסקנות - מה ניתן להסיק" - Deliver comprehensive conclusions about overall farm health, productivity optimization, and strategic planning recommendations. Include specific action items and monitoring priorities.
        
        CRITICAL REQUIREMENTS:
        - Respond in Hebrew language only
        - Each section MUST be 3-5 sentences with specific, actionable advice
        - NEVER use phrases like "אין נתונים" (no data), "לא זמין" (not available), or "N/A"
        - Always provide concrete recommendations even if some readings are estimated
        - Include specific timing, amounts, and procedures where relevant
        - Make advice practical and immediately implementable for Karmiel region
        - Consider the Mediterranean climate, elevation (~300m), and local agricultural practices
        
        Format your response as follows:
        
        [IRRIGATION]
        Your detailed irrigation advice with specific timing and amounts
        [/IRRIGATION]
        
        [ISSUES]
        Your identified issues and preventive measures with specific solutions
        [/ISSUES]
        
        [RECOMMENDATIONS]
        Your comprehensive personalized recommendations with immediate actions
        [/RECOMMENDATIONS]
        
        [FORECAST]
        Your detailed forecast and preparation advice for the next 1-2 weeks
        [/FORECAST]
        
        [CONCLUSIONS]
        Your strategic conclusions with specific action items and monitoring priorities
        [/CONCLUSIONS]
      `;

      // Create payload for Gemini API
      const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          topK: 32,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
      };

      // Make API request
      const response = await fetch(`${API_URL}?key=${API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error?.message || `API error: ${response.status}`
        );
      }

      const data = await response.json();

      if (data.candidates && data.candidates[0]?.content) {
        const adviceText = data.candidates[0].content.parts[0].text;
        parseStructuredAdvice(adviceText);
      } else if (data.promptFeedback && data.promptFeedback.blockReason) {
        setAdviceError(`Response blocked: ${data.promptFeedback.blockReason}`);
      } else {
        setAdviceError("Received an empty or invalid response from the API");
      }
    } catch (err) {
      console.error("Error getting AI advice:", err);
      setAdviceError(err.message);
    } finally {
      setIsLoadingAdvice(false);
    }
  };

  // Parse structured advice (same as original)
  const parseStructuredAdvice = (text) => {
    try {
      const irrigationMatch = text.match(
        /\[IRRIGATION\]([\s\S]*?)\[\/IRRIGATION\]/i
      );
      const issuesMatch = text.match(/\[ISSUES\]([\s\S]*?)\[\/ISSUES\]/i);
      const recommendationsMatch = text.match(
        /\[RECOMMENDATIONS\]([\s\S]*?)\[\/RECOMMENDATIONS\]/i
      );
      const forecastMatch = text.match(/\[FORECAST\]([\s\S]*?)\[\/FORECAST\]/i);
      const conclusionsMatch = text.match(
        /\[CONCLUSIONS\]([\s\S]*?)\[\/CONCLUSIONS\]/i
      );

      // Set fallbacks with actual Karmiel weather data including soil temperatures
      const soilTempInfo = weatherData?.soilTemperatures
        ? `טמפרטורות קרקע: משטח ${
            weatherData.soilTemperatures.surface || "N/A"
          }°C, 6ס"מ ${
            weatherData.soilTemperatures.depth6cm || "N/A"
          }°C, 18ס"מ ${
            weatherData.soilTemperatures.depth18cm || "N/A"
          }°C, 54ס"מ ${weatherData.soilTemperatures.depth54cm || "N/A"}°C`
        : "אין נתוני טמפרטורת קרקע";

      const defaultMessage = weatherData
        ? `על בסיס נתוני מזג אוויר מכרמיאל: טמפרטורה ${
            weatherData.temperature || "N/A"
          }°C, לחות אוויר ${weatherData.humidity || "N/A"}%, לחות קרקע ${
            weatherData.soilHumidity || "N/A"
          }%, ${soilTempInfo}`
        : "אין נתונים זמינים מכרמיאל.";

      setIrrigationAdvice(
        irrigationMatch
          ? irrigationMatch[1].trim()
          : `לא נמצאו המלצות השקיה. ${defaultMessage}`
      );
      setIssuesDetected(
        issuesMatch ? issuesMatch[1].trim() : `לא זוהו בעיות. ${defaultMessage}`
      );
      setPersonalizedRecommendations(
        recommendationsMatch
          ? recommendationsMatch[1].trim()
          : `אין המלצות ספציפיות. ${defaultMessage}`
      );
      setFutureForecast(
        forecastMatch
          ? forecastMatch[1].trim()
          : `אין תחזית זמינה. ${defaultMessage}`
      );
      setConclusions(
        conclusionsMatch
          ? conclusionsMatch[1].trim()
          : `לא ניתן להסיק מסקנות ספציפיות. ${defaultMessage}`
      );
    } catch (error) {
      console.error("Error parsing advice:", error);
      setAdviceError("Failed to parse the AI response");

      const fallbackMessage = weatherData
        ? `מבוסס על נתוני מזג אוויר מכרמיאל עם נתוני טמפרטורת קרקע רב-שכבתיים`
        : "אין נתונים זמינים";
      setIrrigationAdvice(`השקיה: ${fallbackMessage}`);
      setIssuesDetected(`בעיות: ${fallbackMessage}`);
      setPersonalizedRecommendations(`המלצות: ${fallbackMessage}`);
      setFutureForecast(`תחזית: ${fallbackMessage}`);
      setConclusions(`מסקנות: ${fallbackMessage}`);
    }
  };

  // Format advice text (same as original)
  const formatAdviceText = (text) => {
    if (!text) return "";
    const withBullets = text.replace(/^- (.+)$/gm, "<li>$1</li>");
    const withBold = withBullets.replace(
      /\*\*(.*?)\*\*/g,
      "<strong>$1</strong>"
    );
    const withLists = withBold.replace(
      /<li>(.+)<\/li>/g,
      '<ul class="list-disc list-inside my-2"><li>$1</li></ul>'
    );
    return (
      <div
        dangerouslySetInnerHTML={{ __html: withLists.replace(/\n/g, "<br/>") }}
      />
    );
  };

  const handlePlantSelect = (plantId) => {
    setSelectedPlant(plantId);
    setIsCustomPlant(plantId === "custom");
    setShowPlantSelector(false);
  };

  const getSelectedPlantName = () => {
    if (selectedPlant === "custom") {
      return customPlant.trim() === "" ? "Other (specify)" : customPlant;
    } else {
      const plant = commonPlants.find((p) => p.id === selectedPlant);
      return plant ? plant.nameEn : "General Advice";
    }
  };

  const handleGetAdvice = () => {
    getAiAdvice();
  };

  const handleBackClick = () => {
    navigate(-1);
  };

  const handleRefresh = () => {
    fetchKarmielWeatherData();
  };

  // Loading screen
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-600 rounded-full animate-bounce"></div>
          <div
            className="w-2 h-2 bg-green-600 rounded-full animate-bounce"
            style={{ animationDelay: "0.2s" }}
          ></div>
          <div
            className="w-2 h-2 bg-green-600 rounded-full animate-bounce"
            style={{ animationDelay: "0.4s" }}
          ></div>
          <span className="text-gray-700">
            Loading Karmiel Smart Farm Advisor...
          </span>
        </div>
      </div>
    );
  }

  // Permission check (simplified)
  if (!userData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600 text-xl font-semibold">
          You do not have permission to view this page.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Back Button */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <button
              onClick={handleBackClick}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
              <span>Back</span>
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              Smart Farm Advisor - Karmiel (כרמיאל)
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Action Buttons */}
        <div className="mb-6 flex items-center justify-end">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center space-x-2 bg-green-50 text-green-700 px-4 py-2 rounded-md hover:bg-green-100 transition-colors"
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
            <span>
              {isRefreshing ? "Refreshing..." : "Refresh Weather Data"}
            </span>
          </button>
        </div>

        {/* Location Info */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <MapPin className="h-6 w-6 text-green-600 mr-2" />
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  כרמיאל (Karmiel) - Fixed Monitoring Location
                </h2>
                <p className="text-sm text-gray-600">
                  Northern District, Galilee • Coordinates:{" "}
                  {KARMIEL_LOCATION.lat.toFixed(4)}°N,{" "}
                  {KARMIEL_LOCATION.lon.toFixed(4)}°E
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Weather Data Overview with Multi-Level Soil Temperatures */}
        {weatherData && (
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Settings className="h-5 w-5 text-blue-500 mr-2" />
              Latest Weather Readings from Karmiel
              <span className="ml-2 text-xs text-gray-500">
                ({weatherData.receivedAt})
              </span>
              {isRefreshing && (
                <span className="ml-2 flex items-center text-xs text-gray-500">
                  <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                  Refreshing...
                </span>
              )}
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {/* Temperature */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Temperature</p>
                <p className="text-xl font-bold text-gray-800">
                  {weatherData.temperature !== undefined ? (
                    `${weatherData.temperature}°C`
                  ) : (
                    <span className="text-gray-400 text-base italic">
                      No data
                    </span>
                  )}
                </p>
                {weatherData.apparentTemperature && (
                  <p className="text-xs text-gray-500 mt-1">
                    Feels: {weatherData.apparentTemperature}°C
                  </p>
                )}
              </div>

              {/* Air Humidity */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Air Humidity</p>
                <p className="text-xl font-bold text-gray-800">
                  {weatherData.humidity !== undefined ? (
                    `${weatherData.humidity}%`
                  ) : (
                    <span className="text-gray-400 text-base italic">
                      No data
                    </span>
                  )}
                </p>
              </div>

              {/* Soil Humidity */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Soil Humidity</p>
                <p className="text-xl font-bold text-gray-800">
                  {weatherData.soilHumidityRaw !== undefined ? (
                    <>
                      {weatherData.soilHumidityRaw}
                      <span className="text-xs text-gray-600 ml-1">
                        (0-4095)
                      </span>
                    </>
                  ) : (
                    <span className="text-gray-400 text-base italic">
                      No data
                    </span>
                  )}
                </p>

                {weatherData.soilHumidity !== undefined ? (
                  <div
                    className={`mt-2 px-2 py-1 text-xs rounded-full text-center ${
                      getMoistureStatus(weatherData.soilHumidity).bg
                    } ${getMoistureStatus(weatherData.soilHumidity).color}`}
                  >
                    {weatherData.soilHumidity}% -{" "}
                    {getMoistureStatus(weatherData.soilHumidity).message}
                  </div>
                ) : (
                  weatherData.soilHumidityRaw !== undefined && (
                    <div className="mt-2 px-2 py-1 text-xs rounded-full text-center bg-gray-100 text-gray-600">
                      Estimated
                    </div>
                  )
                )}
              </div>

              {/* Light Level */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Light Level</p>
                <p className="text-xl font-bold text-gray-800">
                  {weatherData.light !== undefined ? (
                    weatherData.light
                  ) : (
                    <span className="text-gray-400 text-base italic">
                      No data
                    </span>
                  )}
                </p>
                {weatherData.uvIndex !== undefined && (
                  <p className="text-xs text-gray-500 mt-1">
                    UV: {weatherData.uvIndex}
                  </p>
                )}
              </div>

              {/* Pressure */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Pressure</p>
                <p className="text-xl font-bold text-gray-800">
                  {weatherData.pressure !== undefined ? (
                    `${weatherData.pressure} hPa`
                  ) : (
                    <span className="text-gray-400 text-base italic">
                      No data
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Multi-Level Soil Temperature Section */}
            <div className="mt-6">
              <h3 className="text-md font-semibold text-gray-800 mb-3 flex items-center">
                <Thermometer className="h-4 w-4 text-orange-500 mr-2" />
                Soil Temperature Profile - Multi-Level Monitoring
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* Surface Temperature */}
                <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <p className="text-xs text-orange-600 font-medium">
                    Surface (0cm)
                  </p>
                  <p className="text-lg font-bold text-orange-800">
                    {weatherData.soilTemperatures?.surface !== undefined ? (
                      `${weatherData.soilTemperatures.surface}°C`
                    ) : (
                      <span className="text-gray-400 text-sm italic">
                        No data
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-orange-500 mt-1">Top layer</p>
                </div>

                {/* 6cm Depth */}
                <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-xs text-yellow-600 font-medium">
                    6cm Depth
                  </p>
                  <p className="text-lg font-bold text-yellow-800">
                    {weatherData.soilTemperatures?.depth6cm !== undefined ? (
                      `${weatherData.soilTemperatures.depth6cm}°C`
                    ) : (
                      <span className="text-gray-400 text-sm italic">
                        No data
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-yellow-500 mt-1">Shallow roots</p>
                </div>

                {/* 18cm Depth */}
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-xs text-green-600 font-medium">
                    18cm Depth
                  </p>
                  <p className="text-lg font-bold text-green-800">
                    {weatherData.soilTemperatures?.depth18cm !== undefined ? (
                      `${weatherData.soilTemperatures.depth18cm}°C`
                    ) : (
                      <span className="text-gray-400 text-sm italic">
                        No data
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-green-500 mt-1">Main root zone</p>
                </div>

                {/* 54cm Depth */}
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs text-blue-600 font-medium">
                    54cm Depth
                  </p>
                  <p className="text-lg font-bold text-blue-800">
                    {weatherData.soilTemperatures?.depth54cm !== undefined ? (
                      `${weatherData.soilTemperatures.depth54cm}°C`
                    ) : (
                      <span className="text-gray-400 text-sm italic">
                        No data
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-blue-500 mt-1">Deep roots</p>
                </div>
              </div>
            </div>

            {/* Additional Weather Info */}
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-2 bg-gray-50 rounded text-center">
                <p className="text-xs text-gray-600">Wind</p>
                <p className="font-bold text-gray-800">
                  {weatherData.windSpeed
                    ? `${weatherData.windSpeed} km/h`
                    : "N/A"}
                </p>
              </div>
              <div className="p-2 bg-gray-50 rounded text-center">
                <p className="text-xs text-gray-600">Cloud Cover</p>
                <p className="font-bold text-gray-800">
                  {weatherData.cloudCover !== undefined &&
                  weatherData.cloudCover !== null
                    ? `${weatherData.cloudCover}%`
                    : "N/A"}
                </p>
              </div>
              <div className="p-2 bg-gray-50 rounded text-center">
                <p className="text-xs text-gray-600">Precipitation</p>
                <p className="font-bold text-gray-800">
                  {weatherData.precipitation !== undefined
                    ? `${weatherData.precipitation} mm`
                    : "0 mm"}
                </p>
              </div>
              <div className="p-2 bg-gray-50 rounded text-center">
                <p className="text-xs text-gray-600">UV Index</p>
                <p className="font-bold text-gray-800">
                  {weatherData.uvIndex !== undefined
                    ? weatherData.uvIndex
                    : "N/A"}
                </p>
              </div>
            </div>

            {/* Data Quality Indicator */}
            <div className="mt-4 flex justify-between items-center">
              <div className="flex items-center">
                <span className="text-sm text-gray-600 mr-2">
                  Data quality:
                </span>
                {(() => {
                  const availableCount = [
                    weatherData.temperature,
                    weatherData.humidity,
                    weatherData.soilHumidity,
                    weatherData.light,
                    weatherData.pressure,
                    weatherData.soilTemperatures?.surface,
                    weatherData.soilTemperatures?.depth6cm,
                    weatherData.soilTemperatures?.depth18cm,
                    weatherData.soilTemperatures?.depth54cm,
                  ].filter((val) => val !== undefined).length;

                  if (availableCount >= 7) {
                    return (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                        Excellent
                      </span>
                    );
                  } else if (availableCount >= 5) {
                    return (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                        Good
                      </span>
                    );
                  } else if (availableCount >= 3) {
                    return (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                        Partial
                      </span>
                    );
                  } else {
                    return (
                      <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                        Limited
                      </span>
                    );
                  }
                })()}
              </div>

              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center space-x-2 text-green-700 px-2 py-1 rounded-md hover:bg-green-50 transition-colors text-sm"
              >
                <RefreshCw
                  className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`}
                />
                <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
              </button>
            </div>
          </div>
        )}

        {/* No Weather Data Message */}
        {!weatherData && !loading && (
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <div className="p-6 flex flex-col items-center justify-center">
              <AlertCircle className="h-10 w-10 text-amber-500 mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">
                No Weather Data Available for Karmiel
              </h3>
              <p className="text-gray-600 mb-4 text-center">
                We couldn't fetch weather data for Karmiel. Try refreshing or
                check your internet connection.
              </p>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                />
                <span>
                  {isRefreshing ? "Checking..." : "Check for Weather Data"}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Plant Selection */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Leaf className="h-5 w-5 text-green-600 mr-2" />
            Plant Selection
          </h2>

          <div className="relative">
            <div
              onClick={() => setShowPlantSelector(!showPlantSelector)}
              className="p-3 bg-gray-50 rounded-lg flex justify-between items-center cursor-pointer border border-gray-200 hover:bg-gray-100"
            >
              <div className="flex items-center">
                <Leaf className="h-4 w-4 text-green-600 mr-2" />
                <span>{getSelectedPlantName()}</span>
              </div>
              <ChevronDown className="h-4 w-4 text-gray-500" />
            </div>

            {showPlantSelector && (
              <div className="absolute mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                {commonPlants.map((plant) => (
                  <div
                    key={plant.id}
                    onClick={() => handlePlantSelect(plant.id)}
                    className={`p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 flex items-center ${
                      selectedPlant === plant.id ? "bg-green-50" : ""
                    }`}
                  >
                    <span className="mr-2">{plant.nameEn}</span>
                    <span className="text-gray-500 text-sm">
                      ({plant.nameHe})
                    </span>
                  </div>
                ))}
              </div>
            )}

            {isCustomPlant && (
              <div className="mt-3">
                <input
                  type="text"
                  value={customPlant}
                  onChange={(e) => setCustomPlant(e.target.value)}
                  placeholder="Enter plant name (English or Hebrew)"
                  className="w-full p-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            )}

            <div className="mt-3 flex items-center">
              <input
                type="checkbox"
                id="showDescriptionToggle"
                checked={showDescription}
                onChange={() => setShowDescription(!showDescription)}
                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded mr-2"
              />
              <label htmlFor="showDescriptionToggle" className="text-gray-700">
                Add additional description (optional)
              </label>
            </div>

            {showDescription && (
              <div className="mt-3">
                <textarea
                  value={additionalDescription}
                  onChange={(e) => setAdditionalDescription(e.target.value)}
                  placeholder="Add any additional context about your plants or growing conditions in Karmiel (optional)"
                  rows={3}
                  className="w-full p-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            )}

            <button
              onClick={handleGetAdvice}
              disabled={
                isLoadingAdvice ||
                (isCustomPlant && customPlant.trim() === "") ||
                !weatherData
              }
              className={`mt-4 px-4 py-2 rounded-md text-white transition-colors w-full 
                ${
                  isLoadingAdvice ||
                  (isCustomPlant && customPlant.trim() === "") ||
                  !weatherData
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-green-600 hover:bg-green-700"
                }`}
            >
              {!weatherData
                ? "No Weather Data Available"
                : "Get Multi-Level Soil Analysis for Karmiel"}
            </button>

            {!weatherData && (
              <p className="mt-2 text-center text-xs text-red-500">
                You need weather data from Karmiel to get advice. Please refresh
                data first.
              </p>
            )}
          </div>
        </div>

        {/* AI Advice Sections */}
        {isLoadingAdvice ? (
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-600 rounded-full animate-bounce"></div>
                <div
                  className="w-2 h-2 bg-green-600 rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                ></div>
                <div
                  className="w-2 h-2 bg-green-600 rounded-full animate-bounce"
                  style={{ animationDelay: "0.4s" }}
                ></div>
                <span className="text-gray-500 ml-2">
                  Analyzing multi-level soil temperature data from Karmiel...
                </span>
              </div>
            </div>
          </div>
        ) : adviceError ? (
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start text-red-700">
                <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Error</p>
                  <p>{adviceError}</p>
                </div>
              </div>
            </div>
          </div>
        ) : irrigationAdvice ||
          issuesDetected ||
          personalizedRecommendations ||
          futureForecast ||
          conclusions ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Smart Irrigation Box */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="bg-blue-600 text-white py-3 px-4 flex items-center">
                <Droplet className="h-5 w-5 mr-2" />
                <h3 className="font-semibold" dir="rtl">
                  החלטות השקיה חכמות
                </h3>
              </div>
              <div className="p-4 bg-blue-50" dir="rtl">
                {formatAdviceText(irrigationAdvice)}
              </div>
            </div>

            {/* Issues Detection Box */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="bg-red-600 text-white py-3 px-4 flex items-center">
                <AlertCircle className="h-5 w-5 mr-2" />
                <h3 className="font-semibold" dir="rtl">
                  זיהוי בעיות בשטח
                </h3>
              </div>
              <div className="p-4 bg-red-50" dir="rtl">
                {formatAdviceText(issuesDetected)}
              </div>
            </div>

            {/* Personalized Recommendations Box */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="bg-green-600 text-white py-3 px-4 flex items-center">
                <UserCheck className="h-5 w-5 mr-2" />
                <h3 className="font-semibold" dir="rtl">
                  תחזיות והמלצות מותאמות אישית
                </h3>
              </div>
              <div className="p-4 bg-green-50" dir="rtl">
                {formatAdviceText(personalizedRecommendations)}
              </div>
            </div>

            {/* Future Conditions Box */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="bg-purple-600 text-white py-3 px-4 flex items-center">
                <CloudRain className="h-5 w-5 mr-2" />
                <h3 className="font-semibold" dir="rtl">
                  חיזוי תנאים עתידיים
                </h3>
              </div>
              <div className="p-4 bg-purple-50" dir="rtl">
                {formatAdviceText(futureForecast)}
              </div>
            </div>

            {/* Conclusions Box */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden md:col-span-2">
              <div className="bg-amber-600 text-white py-3 px-4 flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                <h3 className="font-semibold" dir="rtl">
                  מסקנות - מה ניתן להסיק
                </h3>
              </div>
              <div className="p-4 bg-amber-50" dir="rtl">
                {formatAdviceText(conclusions)}
              </div>
            </div>

            {/* Enhanced Data Disclaimer */}
            <div className="md:col-span-2 p-3 bg-gray-50 rounded-lg text-sm text-gray-600 mt-2">
              <p className="flex items-start">
                <AlertCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0 text-gray-500" />
                <span>
                  These recommendations are based on current weather conditions
                  and multi-level soil temperature data from Karmiel (כרמיאל),
                  Northern Israel. Soil temperatures are monitored at surface,
                  6cm, 18cm, and 54cm depths. Weather data is updated hourly
                  from Open-Meteo meteorological sources.
                </span>
              </p>
            </div>

            {/* Refresh Advice Button */}
            <div className="md:col-span-2 flex justify-center mt-2">
              <button
                onClick={handleGetAdvice}
                disabled={!weatherData}
                className={`px-4 py-2 rounded-md text-white flex items-center ${
                  !weatherData
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-green-600 hover:bg-green-700"
                }`}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                <span>Get Updated Multi-Level Soil Analysis</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6 text-center">
            <MessageSquare className="h-12 w-12 text-green-600 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Get AI Advice with Multi-Level Soil Temperature Analysis
            </h3>
            <p className="text-gray-600 mb-6">
              Select a plant type and click "Get Multi-Level Soil Analysis for
              Karmiel" to receive personalized recommendations based on current
              weather conditions and soil temperature data at multiple depths in
              Karmiel (כרמיאל)
            </p>
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 flex-wrap">
              <div className="flex items-center gap-2 text-gray-700">
                <Droplet className="h-5 w-5 text-blue-600" />
                <span>Weather-Based Irrigation</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <Thermometer className="h-5 w-5 text-orange-600" />
                <span>Multi-Level Soil Temperature</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <span>Climate Issue Detection</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <UserCheck className="h-5 w-5 text-green-600" />
                <span>Karmiel-Specific Recommendations</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <CloudRain className="h-5 w-5 text-purple-600" />
                <span>Local Weather Forecasting</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <FileText className="h-5 w-5 text-amber-600" />
                <span>Agricultural Insights</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SmartFarmAdvisor;
