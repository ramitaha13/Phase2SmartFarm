import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  RefreshCw,
  Settings,
  AlertTriangle,
  MessageSquare,
  ChevronDown,
  Leaf,
} from "lucide-react";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";

const IrrigationControl = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sensorData, setSensorData] = useState(null);
  const [aiAdvice, setAiAdvice] = useState("");
  const [isLoadingAdvice, setIsLoadingAdvice] = useState(false);
  const [adviceError, setAdviceError] = useState(null);
  const [selectedPlant, setSelectedPlant] = useState("general");
  const [customPlant, setCustomPlant] = useState("");
  const [isCustomPlant, setIsCustomPlant] = useState(false);
  const [showPlantSelector, setShowPlantSelector] = useState(false);
  const [additionalDescription, setAdditionalDescription] = useState("");
  const [showDescription, setShowDescription] = useState(false);

  // API settings from GeminiSmartFarm
  const API_KEY = "AIzaSyAmcBSSX4S4fTkAhCmegZkDUOmou-dvSIo";
  const API_URL =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

  // Zone state - keeping just the moisture for calculations
  const [moisture, setMoisture] = useState(68);
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  // Fetch user data from local storage and then from Firestore
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser && parsedUser.email) {
          fetchUserData(parsedUser.email);
        } else {
          console.error("Invalid user data in localStorage");
          setLoading(false);
        }
      } catch (error) {
        console.error("Error parsing user data from localStorage:", error);
        setLoading(false);
      }
    } else {
      // If no user is in local storage, handle it here
      setLoading(false);
    }
  }, []);

  const fetchUserData = async (userEmail) => {
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", userEmail));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        // Get the first document snapshot and include its id with the data
        const docSnap = querySnapshot.docs[0];
        const data = { id: docSnap.id, ...docSnap.data() };
        setUserData(data);

        // Fetch sensor data
        fetchLatestSensorData();
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      setLoading(false);
    }
  };

  // Fetch the latest sensor data from Firestore
  const fetchLatestSensorData = async () => {
    try {
      setIsRefreshing(true);

      // Query the sensorData collection for the latest document
      const sensorRef = collection(db, "sensorData");

      // Check if orderBy is available - if not, we'll just fetch without sorting
      let querySnapshot;
      try {
        const q = query(sensorRef, orderBy("timestamp", "desc"), limit(1));
        querySnapshot = await getDocs(q);
      } catch (error) {
        try {
          const q = query(sensorRef, orderBy("receivedAt", "desc"), limit(1));
          querySnapshot = await getDocs(q);
        } catch (error2) {
          const q = query(sensorRef, limit(10));
          querySnapshot = await getDocs(q);
        }
      }

      if (!querySnapshot.empty) {
        // Get the first document (or most recent if orderBy worked)
        const latestDoc = querySnapshot.docs[0];
        const latestData = latestDoc.data();

        setSensorData(latestData);

        // Match the actual field names in Firestore
        // "Soil humidity" instead of "soil_humidity"
        if (latestData["Soil humidity"] !== undefined) {
          // Convert to percentage (assuming 4095 is max value for soil humidity)
          const moisturePercentage = Math.min(
            100,
            Math.round((latestData["Soil humidity"] / 4095) * 100)
          );
          setMoisture(moisturePercentage);

          // Don't automatically get AI advice, wait for plant selection
          // getAiAdvice(latestData);
        }
      }
    } catch (error) {
      console.error("Error fetching sensor data:", error);
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  };

  // Function to get AI advice from Gemini API in Hebrew
  const getAiAdvice = async () => {
    if (!sensorData) return;

    setIsLoadingAdvice(true);
    setAdviceError(null);

    try {
      // Determine which plant to use in the prompt
      let plantName = "plants in general";
      if (selectedPlant === "custom" && customPlant.trim() !== "") {
        plantName = customPlant.trim();
      } else if (selectedPlant !== "general") {
        // Find the selected plant in the list
        const plant = commonPlants.find((p) => p.id === selectedPlant);
        if (plant) {
          plantName = plant.nameEn;
        }
      }

      // Create a prompt for the Gemini API based on sensor data
      // Requesting Hebrew response for advice
      const prompt = `
        I have the following sensor readings from my smart farm:
        - Light level: ${sensorData["Light"] || "N/A"}
        - Air pressure: ${sensorData["Pressure"] || "N/A"} hPa
        - Soil humidity: ${
          sensorData["Soil humidity"] || "N/A"
        } (on a scale from 0-4095)
        - Air humidity: ${sensorData["humidity"] || "N/A"}%
        - Temperature: ${sensorData["temperature"] || "N/A"}°C
        - Timestamp: ${sensorData["receivedAt"] || "N/A"}
        
        I'm growing ${plantName}. ${
        additionalDescription
          ? `Additional context: ${additionalDescription}`
          : ""
      }
        
        Based on these readings, please provide specific advice for optimal growth, focusing on irrigation needs, potential issues, and recommended actions. Keep the advice practical and actionable.
        
        IMPORTANT: Please respond in Hebrew language only.
      `;

      // Create payload for Gemini API
      const payload = {
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 32,
          topP: 0.95,
        },
      };

      // Make API request
      const response = await fetch(`${API_URL}?key=${API_KEY}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
        setAiAdvice(adviceText);
      } else if (data.promptFeedback && data.promptFeedback.blockReason) {
        setAdviceError(`Response blocked: ${data.promptFeedback.blockReason}`);
      } else {
        setAdviceError("Received an empty or invalid response from the API");
      }
    } catch (err) {
      setAdviceError(err.message);
    } finally {
      setIsLoadingAdvice(false);
    }
  };

  const handlePlantSelect = (plantId) => {
    setSelectedPlant(plantId);
    setIsCustomPlant(plantId === "custom");
    setShowPlantSelector(false);
  };

  const handleGetAdvice = () => {
    getAiAdvice();
  };

  const handleBackClick = () => {
    navigate(-1);
  };

  const handleRefresh = () => {
    fetchLatestSensorData();
  };

  // Get status styling based on moisture level
  const getMoistureStatus = (level) => {
    if (level < 30)
      return {
        color: "text-red-600",
        bg: "bg-red-50",
        message: "Very Dry",
      };
    if (level < 50)
      return {
        color: "text-yellow-600",
        bg: "bg-yellow-50",
        message: "Dry",
      };
    if (level < 70)
      return {
        color: "text-green-600",
        bg: "bg-green-50",
        message: "Good",
      };
    return {
      color: "text-blue-600",
      bg: "bg-blue-50",
      message: "Wet",
    };
  };

  // Format AI advice for display with bold text
  const formatAiAdvice = (text) => {
    if (!text) return "";
    return text.split(/(\*\*.*?\*\*)/g).map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  // If still loading, show a loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  // If userData is null or role isn't authorized, show no-permission message
  if (
    !userData ||
    (userData.role !== "Manager" && userData.role !== "Worker")
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600 text-xl font-semibold">
          You do not have permission to view this page.
        </div>
      </div>
    );
  }

  // Get the display name for the selected plant
  const getSelectedPlantName = () => {
    if (selectedPlant === "custom") {
      return customPlant.trim() === "" ? "Other (specify)" : customPlant;
    } else {
      const plant = commonPlants.find((p) => p.id === selectedPlant);
      return plant ? plant.nameEn : "General Advice";
    }
  };

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
              Smart Farm Advisor
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
            <span>{isRefreshing ? "Refreshing..." : "Refresh Data"}</span>
          </button>
        </div>

        {/* Sensor Data Overview */}
        {sensorData && (
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Settings className="h-5 w-5 text-blue-500 mr-2" />
              Latest Sensor Readings
              <span className="ml-2 text-xs text-gray-500">
                {sensorData.receivedAt
                  ? `(${new Date(sensorData.receivedAt).toLocaleString()})`
                  : ""}
              </span>
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Temperature</p>
                <p className="text-xl font-bold text-gray-800">
                  {sensorData.temperature || "N/A"}°C
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Air Humidity</p>
                <p className="text-xl font-bold text-gray-800">
                  {sensorData.humidity || "N/A"}%
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Soil Humidity</p>
                <p className="text-xl font-bold text-gray-800">
                  {sensorData["Soil humidity"] || "N/A"}
                  <span className="text-xs text-gray-600 ml-1">(0-4095)</span>
                </p>
                <div
                  className={`mt-2 px-2 py-1 text-xs rounded-full text-center ${
                    getMoistureStatus(moisture).bg
                  } ${getMoistureStatus(moisture).color}`}
                >
                  {moisture}% - {getMoistureStatus(moisture).message}
                </div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Light Level</p>
                <p className="text-xl font-bold text-gray-800">
                  {sensorData["Light"] || "N/A"}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Pressure</p>
                <p className="text-xl font-bold text-gray-800">
                  {sensorData["Pressure"] || "N/A"} hPa
                </p>
              </div>
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
                  placeholder="Add any additional context about your plants or growing conditions (optional)"
                  rows={3}
                  className="w-full p-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            )}

            <button
              onClick={handleGetAdvice}
              disabled={
                isLoadingAdvice || (isCustomPlant && customPlant.trim() === "")
              }
              className={`mt-4 px-4 py-2 rounded-md text-white transition-colors w-full 
                ${
                  isLoadingAdvice ||
                  (isCustomPlant && customPlant.trim() === "")
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-green-600 hover:bg-green-700"
                }`}
            >
              Get Growing Advice
            </button>
          </div>
        </div>

        {/* AI Advice Card */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <MessageSquare className="h-5 w-5 text-green-600 mr-2" />
            Smart Farm AI Advice (Hebrew)
          </h2>

          {isLoadingAdvice ? (
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
                  Getting AI recommendations...
                </span>
              </div>
            </div>
          ) : adviceError ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start text-red-700">
                <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Error</p>
                  <p>{adviceError}</p>
                </div>
              </div>
            </div>
          ) : aiAdvice ? (
            <div className="p-4 bg-green-50 rounded-lg" dir="rtl">
              <div className="whitespace-pre-wrap text-gray-800">
                {formatAiAdvice(aiAdvice)}
              </div>
              <button
                onClick={handleGetAdvice}
                className="mt-4 text-green-700 text-sm flex items-center hover:text-green-800 justify-end w-full"
              >
                <span>Get updated advice</span>
                <RefreshCw className="h-3 w-3 mr-1 ml-2" />
              </button>
            </div>
          ) : (
            <div className="p-4 bg-gray-50 rounded-lg text-gray-500 flex items-center justify-center">
              <div className="text-center">
                <p>
                  Select a plant above and click "Get Growing Advice" to receive
                  recommendations
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IrrigationControl;
