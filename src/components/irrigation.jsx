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

const SmartFarmAdvisor = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sensorData, setSensorData] = useState(null);
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

  // API settings from GeminiSmartFarm
  const API_KEY = "AIzaSyAmcBSSX4S4fTkAhCmegZkDUOmou-dvSIo";
  const API_URL =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

  // Zone state - keeping moisture for calculations
  const [moisture, setMoisture] = useState(undefined);

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

  // Fetch the latest sensor data from Firestore without adding defaults
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

        // Store raw sensor data without modifications
        setSensorData(latestData);

        // Only calculate moisture if Soil humidity exists
        if (latestData["Soil humidity"] !== undefined) {
          // Convert to percentage (assuming 4095 is max value for soil humidity)
          const moisturePercentage = Math.min(
            100,
            Math.round((latestData["Soil humidity"] / 4095) * 100)
          );
          setMoisture(moisturePercentage);
        } else {
          // If soil humidity is not available, set moisture to undefined
          setMoisture(undefined);
        }
      } else {
        // No documents found
        setSensorData(null);
        setMoisture(undefined);
      }
    } catch (error) {
      console.error("Error fetching sensor data:", error);
      setSensorData(null);
      setMoisture(undefined);
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  };

  // Function to get AI advice from Gemini API using only actual sensor data
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

      // Get moisture status for display without modifying values
      const moistureStatus = getMoistureStatus(moisture);

      // Create a more precise prompt for the Gemini API using only actual sensor data
      const prompt = `
        I have the following sensor readings from my smart farm:
        - Light level: ${
          sensorData["Light"] !== undefined ? sensorData["Light"] : "N/A"
        }
        - Air pressure: ${
          sensorData["Pressure"] !== undefined
            ? sensorData["Pressure"] + " hPa"
            : "N/A"
        }
        - Soil humidity raw value: ${
          sensorData["Soil humidity"] !== undefined
            ? sensorData["Soil humidity"]
            : "N/A"
        } 
        - Soil humidity percentage: ${
          moisture !== undefined ? moisture + "%" : "N/A"
        } (converted from raw value)
        - Soil moisture status: ${
          moisture !== undefined ? moistureStatus.message : "N/A"
        }
        - Air humidity: ${
          sensorData["humidity"] !== undefined
            ? sensorData["humidity"] + "%"
            : "N/A"
        }
        - Temperature: ${
          sensorData["temperature"] !== undefined
            ? sensorData["temperature"] + "°C"
            : "N/A"
        }
        - Timestamp: ${
          sensorData["receivedAt"] !== undefined
            ? sensorData["receivedAt"]
            : "N/A"
        }
        
        I'm growing ${plantName}. ${
        additionalDescription
          ? `Additional context: ${additionalDescription}`
          : ""
      }
        
        Based on ONLY these EXACT sensor readings (without adding any assumed values), provide data-driven advice organized into exactly FIVE separate sections. Each section must directly reference the actual sensor readings provided above:
        
        1. "החלטות השקיה חכמות (Smart Irrigation)" - Specific advice on when, how much, and how to irrigate based on the current soil humidity percentage of ${
          moisture !== undefined ? moisture + "%" : "N/A"
        }. If the soil moisture is unavailable, provide general irrigation principles.
        
        2. "זיהוי בעיות בשטח" - Identify potential problems based on these exact sensor readings. Reference specific values like temperature of ${
          sensorData["temperature"] !== undefined
            ? sensorData["temperature"] + "°C"
            : "N/A"
        } and soil humidity of ${
        moisture !== undefined ? moisture + "%" : "N/A"
      }. Only mention issues that can be detected based on the available readings.
        
        3. "תחזיות והמלצות מותאמות אישית" - Personalized recommendations for immediate actions based directly on the available sensor readings. Don't assume values that weren't provided. Your recommendations should cite the actual readings.
        
        4. "חיזוי תנאים עתידיים" - Predictions about upcoming conditions based on the current sensor data. Only make predictions based on the data provided, not assumptions.
        
        5. "מסקנות - מה ניתן להסיק" - High-level conclusions that can be drawn from only the available sensor readings. Provide an honest assessment of what can and cannot be determined from the available data.
        
        Format your response as follows - make sure to include all five sections separately:
        
        [IRRIGATION]
        Your irrigation advice here that MUST reference the current soil moisture without adding default values
        [/IRRIGATION]
        
        [ISSUES]
        Your identified issues here that MUST be based only on provided sensor readings
        [/ISSUES]
        
        [RECOMMENDATIONS]
        Your personalized recommendations here that MUST be tied to actual sensor readings
        [/RECOMMENDATIONS]
        
        [FORECAST]
        Your forecast and preparation advice here that MUST be based on the available sensor data
        [/FORECAST]
        
        [CONCLUSIONS]
        Your key conclusions and insights here based ONLY on the provided readings
        [/CONCLUSIONS]
        
        IMPORTANT: 
        - Respond in Hebrew language only
        - Make the advice practical, specific and actionable
        - Include bullet points where appropriate
        - ONLY reference data that has actually been provided; if a reading is "N/A", acknowledge its absence and provide alternative advice
        - Do NOT make up or assume sensor values that weren't provided
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
          maxOutputTokens: 1024,
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

        // Parse the structured response
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

  // Parse the structured response from Gemini API with improved fallbacks
  const parseStructuredAdvice = (text) => {
    try {
      // Extract each section using regex
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

      // Set the state for each section if found, with more informative fallbacks that reference actual data
      setIrrigationAdvice(
        irrigationMatch
          ? irrigationMatch[1].trim()
          : `לא נמצאו המלצות השקיה. לחות קרקע נוכחית: ${
              moisture !== undefined ? moisture + "%" : "לא זמין"
            }${
              moisture !== undefined
                ? moisture < 30
                  ? " - יש לשקול השקיה בהקדם."
                  : moisture < 50
                  ? " - יש לנטר את לחות הקרקע ולהשקות בהתאם לצורך."
                  : " - רמת הלחות נראית מספקת כרגע."
                : "."
            }`
      );

      setIssuesDetected(
        issuesMatch
          ? issuesMatch[1].trim()
          : `לא זוהו בעיות מהנתונים הקיימים. טמפרטורה: ${
              sensorData.temperature !== undefined
                ? sensorData.temperature + "°C"
                : "לא זמין"
            }, לחות אוויר: ${
              sensorData.humidity !== undefined
                ? sensorData.humidity + "%"
                : "לא זמין"
            }, לחות קרקע: ${
              moisture !== undefined ? moisture + "%" : "לא זמין"
            }.`
      );

      setPersonalizedRecommendations(
        recommendationsMatch
          ? recommendationsMatch[1].trim()
          : `אין המלצות ספציפיות מהנתונים הקיימים. בהתבסס על הקריאות הזמינות: ${
              moisture !== undefined ? "לחות קרקע: " + moisture + "%" : ""
            }${
              sensorData.temperature !== undefined
                ? ", טמפרטורה: " + sensorData.temperature + "°C"
                : ""
            }${
              sensorData.humidity !== undefined
                ? ", לחות אוויר: " + sensorData.humidity + "%"
                : ""
            }.`
      );

      setFutureForecast(
        forecastMatch
          ? forecastMatch[1].trim()
          : `אין תחזית זמינה מהנתונים הקיימים. יש להמשיך לנטר את הערכים: ${
              moisture !== undefined
                ? "לחות קרקע: " + moisture + "%"
                : "לחות קרקע: לא זמין"
            }, ${
              sensorData.temperature !== undefined
                ? "טמפרטורה: " + sensorData.temperature + "°C"
                : "טמפרטורה: לא זמין"
            }.`
      );

      setConclusions(
        conclusionsMatch
          ? conclusionsMatch[1].trim()
          : `לא ניתן להסיק מסקנות ספציפיות מהנתונים הקיימים. ערכי חיישנים זמינים: ${
              moisture !== undefined ? "לחות קרקע: " + moisture + "%" : ""
            }${
              sensorData.temperature !== undefined
                ? ", טמפרטורה: " + sensorData.temperature + "°C"
                : ""
            }${
              sensorData.humidity !== undefined
                ? ", לחות אוויר: " + sensorData.humidity + "%"
                : ""
            }${
              sensorData["Light"] !== undefined
                ? ", רמת אור: " + sensorData["Light"]
                : ""
            }${
              sensorData["Pressure"] !== undefined
                ? ", לחץ אוויר: " + sensorData["Pressure"] + " hPa"
                : ""
            }.`
      );

      // If we couldn't extract the structured format, handle as a fallback
      if (
        !irrigationMatch &&
        !issuesMatch &&
        !recommendationsMatch &&
        !forecastMatch &&
        !conclusionsMatch
      ) {
        // Fallback: try to split the text into parts for each section
        const paragraphs = text
          .split(/\n\s*\n/)
          .filter((p) => p.trim().length > 0);

        if (paragraphs.length >= 5) {
          setIrrigationAdvice(paragraphs[0]);
          setIssuesDetected(paragraphs[1]);
          setPersonalizedRecommendations(paragraphs[2]);
          setFutureForecast(paragraphs[3]);
          setConclusions(paragraphs[4]);
        }
        // The else case is already handled by the default values above
      }
    } catch (error) {
      console.error("Error parsing advice:", error);
      setAdviceError("Failed to parse the AI response");

      // Create basic sensor-based advice as fallback using only available data
      const availableSensorInfo = [
        moisture !== undefined ? `לחות קרקע: ${moisture}%` : null,
        sensorData.temperature !== undefined
          ? `טמפרטורה: ${sensorData.temperature}°C`
          : null,
        sensorData.humidity !== undefined
          ? `לחות אוויר: ${sensorData.humidity}%`
          : null,
        sensorData["Light"] !== undefined
          ? `רמת אור: ${sensorData["Light"]}`
          : null,
        sensorData["Pressure"] !== undefined
          ? `לחץ אוויר: ${sensorData["Pressure"]} hPa`
          : null,
      ]
        .filter(Boolean)
        .join(", ");

      const defaultMessage = availableSensorInfo
        ? `על בסיס הקריאות הזמינות: ${availableSensorInfo}.`
        : "אין נתוני חיישנים זמינים.";

      setIrrigationAdvice(`השקיה: ${defaultMessage}`);
      setIssuesDetected(`בעיות: ${defaultMessage}`);
      setPersonalizedRecommendations(`המלצות: ${defaultMessage}`);
      setFutureForecast(`תחזית: ${defaultMessage}`);
      setConclusions(`מסקנות: ${defaultMessage}`);
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

  // Get status styling based on moisture level with improved edge case handling
  const getMoistureStatus = (level) => {
    if (level === undefined) {
      return {
        color: "text-gray-600",
        bg: "bg-gray-50",
        message: "Unknown",
      };
    }

    if (level < 20)
      return {
        color: "text-red-700",
        bg: "bg-red-100",
        message: "Critically Dry",
      };
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
    if (level < 85)
      return {
        color: "text-blue-600",
        bg: "bg-blue-50",
        message: "Wet",
      };
    return {
      color: "text-blue-700",
      bg: "bg-blue-100",
      message: "Very Wet",
    };
  };

  // Format AI advice for display with bullet points
  const formatAdviceText = (text) => {
    if (!text) return "";

    // Convert bullet points (- item) to proper HTML
    const withBullets = text.replace(/^- (.+)$/gm, "<li>$1</li>");

    // Add formatting for bold text
    const withBold = withBullets.replace(
      /\*\*(.*?)\*\*/g,
      "<strong>$1</strong>"
    );

    // If there are list items, wrap them in a ul
    const withLists = withBold.replace(
      /<li>(.+)<\/li>/g,
      '<ul class="list-disc list-inside my-2"><li>$1</li></ul>'
    );

    // Return as HTML
    return (
      <div
        dangerouslySetInnerHTML={{ __html: withLists.replace(/\n/g, "<br/>") }}
      />
    );
  };

  // Get the display name for the selected plant
  const getSelectedPlantName = () => {
    if (selectedPlant === "custom") {
      return customPlant.trim() === "" ? "Other (specify)" : customPlant;
    } else {
      const plant = commonPlants.find((p) => p.id === selectedPlant);
      return plant ? plant.nameEn : "General Advice";
    }
  };

  // If still loading, show a loading state
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
          <span className="text-gray-700">Loading Smart Farm Advisor...</span>
        </div>
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
                  {sensorData.temperature !== undefined ? (
                    `${sensorData.temperature}°C`
                  ) : (
                    <span className="text-gray-400 text-base italic">
                      No data
                    </span>
                  )}
                </p>
              </div>

              {/* Air Humidity */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Air Humidity</p>
                <p className="text-xl font-bold text-gray-800">
                  {sensorData.humidity !== undefined ? (
                    `${sensorData.humidity}%`
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
                  {sensorData["Soil humidity"] !== undefined ? (
                    <>
                      {sensorData["Soil humidity"]}
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

                {moisture !== undefined ? (
                  <div
                    className={`mt-2 px-2 py-1 text-xs rounded-full text-center ${
                      getMoistureStatus(moisture).bg
                    } ${getMoistureStatus(moisture).color}`}
                  >
                    {moisture}% - {getMoistureStatus(moisture).message}
                  </div>
                ) : (
                  sensorData["Soil humidity"] !== undefined && (
                    <div className="mt-2 px-2 py-1 text-xs rounded-full text-center bg-gray-100 text-gray-600">
                      Conversion error
                    </div>
                  )
                )}
              </div>

              {/* Light Level */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Light Level</p>
                <p className="text-xl font-bold text-gray-800">
                  {sensorData["Light"] !== undefined ? (
                    sensorData["Light"]
                  ) : (
                    <span className="text-gray-400 text-base italic">
                      No data
                    </span>
                  )}
                </p>
              </div>

              {/* Pressure */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Pressure</p>
                <p className="text-xl font-bold text-gray-800">
                  {sensorData["Pressure"] !== undefined ? (
                    `${sensorData["Pressure"]} hPa`
                  ) : (
                    <span className="text-gray-400 text-base italic">
                      No data
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Data Quality Indicator */}
            <div className="mt-4 flex justify-between items-center">
              <div className="flex items-center">
                <span className="text-sm text-gray-600 mr-2">
                  Data quality:
                </span>

                {Object.keys(sensorData).filter(
                  (key) =>
                    [
                      "temperature",
                      "humidity",
                      "Soil humidity",
                      "Light",
                      "Pressure",
                    ].includes(key) && sensorData[key] !== undefined
                ).length >= 4 ? (
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                    Good
                  </span>
                ) : Object.keys(sensorData).filter(
                    (key) =>
                      [
                        "temperature",
                        "humidity",
                        "Soil humidity",
                        "Light",
                        "Pressure",
                      ].includes(key) && sensorData[key] !== undefined
                  ).length >= 2 ? (
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                    Partial
                  </span>
                ) : (
                  <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                    Limited
                  </span>
                )}
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

        {/* No Sensor Data Message */}
        {!sensorData && !loading && (
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <div className="p-6 flex flex-col items-center justify-center">
              <AlertCircle className="h-10 w-10 text-amber-500 mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">
                No Sensor Data Available
              </h3>
              <p className="text-gray-600 mb-4 text-center">
                We couldn't find any sensor readings in the database. Try
                refreshing or check your sensor connections.
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
                  {isRefreshing ? "Checking..." : "Check for Sensor Data"}
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
                  placeholder="Add any additional context about your plants or growing conditions (optional)"
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
                !sensorData
              }
              className={`mt-4 px-4 py-2 rounded-md text-white transition-colors w-full 
                ${
                  isLoadingAdvice ||
                  (isCustomPlant && customPlant.trim() === "") ||
                  !sensorData
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-green-600 hover:bg-green-700"
                }`}
            >
              {!sensorData ? "No Sensor Data Available" : "Get Growing Advice"}
            </button>

            {!sensorData && (
              <p className="mt-2 text-center text-xs text-red-500">
                You need sensor data to get advice. Please refresh data first.
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
                  Getting AI recommendations based on sensor data...
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

            {/* Data Disclaimer */}
            <div className="md:col-span-2 p-3 bg-gray-50 rounded-lg text-sm text-gray-600 mt-2">
              <p className="flex items-start">
                <AlertCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0 text-gray-500" />
                <span>
                  These recommendations are based only on available sensor
                  readings. For more accurate advice, ensure all sensors are
                  providing valid data.
                </span>
              </p>
            </div>

            {/* Refresh Advice Button */}
            <div className="md:col-span-2 flex justify-center mt-2">
              <button
                onClick={handleGetAdvice}
                disabled={!sensorData}
                className={`px-4 py-2 rounded-md text-white flex items-center ${
                  !sensorData
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-green-600 hover:bg-green-700"
                }`}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                <span>Get Updated Advice</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6 text-center">
            <MessageSquare className="h-12 w-12 text-green-600 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Get AI Advice for Your Plants
            </h3>
            <p className="text-gray-600 mb-6">
              Select a plant type and click "Get Growing Advice" to receive
              personalized recommendations based on your sensor data
            </p>
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 flex-wrap">
              <div className="flex items-center gap-2 text-gray-700">
                <Droplet className="h-5 w-5 text-blue-600" />
                <span>Irrigation Advice</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <span>Issue Detection</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <UserCheck className="h-5 w-5 text-green-600" />
                <span>Personalized Recommendations</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <CloudRain className="h-5 w-5 text-purple-600" />
                <span>Future Conditions</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <FileText className="h-5 w-5 text-amber-600" />
                <span>Key Conclusions</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SmartFarmAdvisor;
