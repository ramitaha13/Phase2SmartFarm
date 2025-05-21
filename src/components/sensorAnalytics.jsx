import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  Calendar,
  Download,
  RefreshCw,
  Filter,
  Thermometer,
  Sun,
  Sprout,
  Info,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  startAfter,
  Timestamp,
} from "firebase/firestore";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const SensorAnalytics = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("24h"); // "24h", "7d", "30d", "custom"
  const [selectedSensors, setSelectedSensors] = useState([
    "temperature",
    "light",
    "soil",
    "humidity",
    "pressure",
  ]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [customDateRange, setCustomDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Combined data for the unified chart
  const [combinedData, setCombinedData] = useState([]);

  // Individual sensor data for stats
  const [temperatureData, setTemperatureData] = useState([]);
  const [lightData, setLightData] = useState([]);
  const [soilData, setSoilData] = useState([]);
  const [humidityData, setHumidityData] = useState([]);
  const [pressureData, setPressureData] = useState([]);

  // Statistics
  const [stats, setStats] = useState({
    temperature: {
      current: 0,
      min: 0,
      max: 0,
      avg: 0,
      trend: "stable",
    },
    light: {
      current: 0,
      min: 0,
      max: 0,
      avg: 0,
      trend: "stable",
    },
    soil: {
      current: 0,
      min: 0,
      max: 0,
      avg: 0,
      trend: "stable",
    },
    humidity: {
      current: 0,
      min: 0,
      max: 0,
      avg: 0,
      trend: "stable",
    },
    pressure: {
      current: 0,
      min: 0,
      max: 0,
      avg: 0,
      trend: "stable",
    },
  });

  // Fetch user data from local storage and then from Firestore
  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser && storedUser.email) {
      const fetchUserData = async () => {
        try {
          const usersRef = collection(db, "users");
          const q = query(usersRef, where("email", "==", storedUser.email));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            // Get the first document snapshot and include its id with the data
            const docSnap = querySnapshot.docs[0];
            const data = { id: docSnap.id, ...docSnap.data() };
            setUserData(data);

            // Fetch sensor data for analytics
            fetchSensorData(timeRange);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchUserData();
    } else {
      // If no user is in local storage, handle it here
      setLoading(false);
    }
  }, []);

  // Process the data for combined chart
  const processCombinedData = (
    tempData,
    lightData,
    soilData,
    humidData,
    pressData
  ) => {
    // Create a map of timestamps to readings
    const timeMap = new Map();

    // Helper function to add data points to the map
    const addToMap = (dataArray, sensorName, unit = "") => {
      dataArray.forEach((item) => {
        const timeKey = item.timestamp.getTime(); // Use timestamp as a unique key

        if (!timeMap.has(timeKey)) {
          timeMap.set(timeKey, {
            time: item.time,
            timestamp: item.timestamp,
          });
        }

        // Add sensor data to the time point
        const mapItem = timeMap.get(timeKey);
        mapItem[sensorName] = parseFloat(item.value);
      });
    };

    // Add each sensor dataset to the map
    if (tempData.length) addToMap(tempData, "temperature");
    if (lightData.length) addToMap(lightData, "light");
    if (soilData.length) addToMap(soilData, "soil");
    if (humidData.length) addToMap(humidData, "humidity");
    if (pressData.length) addToMap(pressData, "pressure");

    // Convert map to array and sort by timestamp
    const combinedArray = Array.from(timeMap.values()).sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );

    return combinedArray;
  };

  // Fetch sensor data for different time ranges
  const fetchSensorData = async (range) => {
    try {
      setIsRefreshing(true);

      // Get the time range for the query
      let startTime;
      const now = new Date();

      if (range === "24h") {
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      } else if (range === "7d") {
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (range === "30d") {
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      } else if (range === "custom") {
        startTime = new Date(customDateRange.start);
        now.setHours(23, 59, 59, 999); // Set to end of the day
      }

      // Query Firestore for sensor data within the time range
      const sensorDataRef = collection(db, "sensorData");
      const q = query(
        sensorDataRef,
        where("timestamp", ">=", Timestamp.fromDate(startTime)),
        where("timestamp", "<=", Timestamp.fromDate(now)),
        orderBy("timestamp", "asc")
      );

      const querySnapshot = await getDocs(q);

      // Process the data
      const tempData = [];
      const lightData = [];
      const soilData = [];
      const humidData = [];
      const pressData = [];

      // If we have data
      if (!querySnapshot.empty) {
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const timestamp = data.timestamp.toDate();

          const timeLabel =
            range === "24h"
              ? timestamp.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : timestamp.toLocaleDateString([], {
                  month: "short",
                  day: "numeric",
                });

          if (data.temperature !== undefined) {
            tempData.push({
              time: timeLabel,
              timestamp: timestamp,
              value: parseFloat(data.temperature).toFixed(1),
            });
          }

          if (data.Light !== undefined) {
            lightData.push({
              time: timeLabel,
              timestamp: timestamp,
              value: Math.floor(data.Light),
            });
          }

          if (data["Soil humidity"] !== undefined) {
            soilData.push({
              time: timeLabel,
              timestamp: timestamp,
              value: Math.floor(data["Soil humidity"]),
            });
          }

          if (data.humidity !== undefined) {
            humidData.push({
              time: timeLabel,
              timestamp: timestamp,
              value: Math.floor(data.humidity),
            });
          }

          if (data.Pressure !== undefined) {
            pressData.push({
              time: timeLabel,
              timestamp: timestamp,
              value: Math.floor(data.Pressure),
            });
          }
        });

        // Create combined data for the unified chart
        const combined = processCombinedData(
          tempData,
          lightData,
          soilData,
          humidData,
          pressData
        );
        setCombinedData(combined);

        // Update individual charts data
        setTemperatureData(tempData);
        setLightData(lightData);
        setSoilData(soilData);
        setHumidityData(humidData);
        setPressureData(pressData);

        // Calculate and update statistics
        const calculateStats = (data) => {
          if (data.length === 0)
            return {
              current: 0,
              min: 0,
              max: 0,
              avg: 0,
              trend: "stable",
            };

          const values = data.map((item) => parseFloat(item.value));
          const trend = calculateTrend(values);

          return {
            current: parseFloat(data[data.length - 1].value),
            min: Math.min(...values).toFixed(1),
            max: Math.max(...values).toFixed(1),
            avg: (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1),
            trend:
              trend > 0.5
                ? "increasing"
                : trend < -0.5
                ? "decreasing"
                : "stable",
          };
        };

        setStats({
          temperature: calculateStats(tempData),
          light: calculateStats(lightData),
          soil: calculateStats(soilData),
          humidity: calculateStats(humidData),
          pressure: calculateStats(pressData),
        });
      } else {
        // If no data, set empty charts
        setCombinedData([]);
        setTemperatureData([]);
        setLightData([]);
        setSoilData([]);
        setHumidityData([]);
        setPressureData([]);

        // Reset stats
        setStats({
          temperature: { current: 0, min: 0, max: 0, avg: 0, trend: "stable" },
          light: { current: 0, min: 0, max: 0, avg: 0, trend: "stable" },
          soil: { current: 0, min: 0, max: 0, avg: 0, trend: "stable" },
          humidity: { current: 0, min: 0, max: 0, avg: 0, trend: "stable" },
          pressure: { current: 0, min: 0, max: 0, avg: 0, trend: "stable" },
        });
      }

      setIsRefreshing(false);
    } catch (error) {
      console.error("Error fetching sensor data:", error);
      setIsRefreshing(false);
    }
  };

  // Helper function to calculate trend
  const calculateTrend = (values) => {
    if (values.length < 2) return 0;

    // Simple linear regression slope
    const n = values.length;
    const indices = Array.from({ length: n }, (_, i) => i);

    const sumX = indices.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = indices.reduce((sum, x, i) => sum + x * values[i], 0);
    const sumXX = indices.reduce((sum, x) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

    // Normalize slope
    return (slope * n) / sumY;
  };

  // Handler functions
  const handleBackClick = () => {
    navigate(-1);
  };

  const handleRefresh = () => {
    fetchSensorData(timeRange);
  };

  const handleTimeRangeChange = (range) => {
    setTimeRange(range);
    fetchSensorData(range);
  };

  const handleSensorToggle = (sensor) => {
    if (selectedSensors.includes(sensor)) {
      if (selectedSensors.length > 1) {
        setSelectedSensors(selectedSensors.filter((s) => s !== sensor));
      }
    } else {
      setSelectedSensors([...selectedSensors, sensor]);
    }
  };

  const handleCustomDateSubmit = () => {
    setTimeRange("custom");
    setShowDatePicker(false);
    fetchSensorData("custom");
  };

  const exportData = () => {
    // Combine all data
    const combinedData = [];

    // Find the longest array
    const maxLength = Math.max(
      temperatureData.length,
      lightData.length,
      soilData.length,
      humidityData.length,
      pressureData.length
    );

    for (let i = 0; i < maxLength; i++) {
      const dataPoint = {
        Timestamp:
          i < temperatureData.length
            ? new Date(temperatureData[i].timestamp).toISOString()
            : "",
        Time: i < temperatureData.length ? temperatureData[i].time : "",
        Temperature: i < temperatureData.length ? temperatureData[i].value : "",
        Light: i < lightData.length ? lightData[i].value : "",
        "Soil Moisture": i < soilData.length ? soilData[i].value : "",
        "Air Humidity": i < humidityData.length ? humidityData[i].value : "",
        "Air Pressure": i < pressureData.length ? pressureData[i].value : "",
      };

      combinedData.push(dataPoint);
    }

    // Convert to CSV
    const headers = Object.keys(combinedData[0]);
    const csvContent = [
      headers.join(","),
      ...combinedData.map((row) =>
        headers.map((header) => row[header]).join(",")
      ),
    ].join("\n");

    // Download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `sensor_data_${timeRange}_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Get color based on trend
  const getTrendColor = (trend) => {
    switch (trend) {
      case "increasing":
        return "text-green-600";
      case "decreasing":
        return "text-red-600";
      default:
        return "text-blue-600";
    }
  };

  // Get icon based on trend
  const getTrendIcon = (trend) => {
    switch (trend) {
      case "increasing":
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case "decreasing":
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <ChevronLeft className="h-4 w-4 text-blue-600" />;
    }
  };

  // Get color for each sensor line
  const getSensorColor = (sensor) => {
    switch (sensor) {
      case "temperature":
        return "#ef4444";
      case "light":
        return "#f59e0b";
      case "soil":
        return "#22c55e";
      case "humidity":
        return "#3b82f6";
      case "pressure":
        return "#8b5cf6";
      default:
        return "#000000";
    }
  };

  // Get unit for each sensor
  const getSensorUnit = (sensor) => {
    switch (sensor) {
      case "temperature":
        return "°C";
      case "light":
        return "lux";
      case "soil":
        return "";
      case "humidity":
        return "%";
      case "pressure":
        return "hPa";
      default:
        return "";
    }
  };

  // Get label for each sensor
  const getSensorLabel = (sensor) => {
    switch (sensor) {
      case "temperature":
        return "Temperature";
      case "light":
        return "Light";
      case "soil":
        return "Soil Moisture";
      case "humidity":
        return "Air Humidity";
      case "pressure":
        return "Air Pressure";
      default:
        return sensor;
    }
  };

  // Custom Tooltip content component for normalized values
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-md shadow-sm">
          <p className="text-sm font-medium mb-2">{label}</p>
          {payload.map((entry, index) => {
            const sensorName = entry.dataKey.split("_")[0];
            const unit = getSensorUnit(sensorName);
            return (
              <div
                key={`item-${index}`}
                className="flex items-center justify-between gap-3 mb-1"
              >
                <span className="text-xs flex items-center">
                  <span
                    className="h-2 w-2 rounded-full mr-1"
                    style={{ backgroundColor: entry.color }}
                  ></span>
                  {getSensorLabel(sensorName)}:
                </span>
                <span className="text-xs font-medium">
                  {entry.value}
                  {unit}
                </span>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  // Permission check
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
              Sensor Analytics
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Action Buttons */}
        <div className="mb-6 flex justify-end">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => exportData()}
              className="flex items-center space-x-2 bg-white text-gray-700 px-3 py-2 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Export Data</span>
            </button>

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
        </div>

        {/* Filters and Time Range */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            {/* Time Range Selector */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Time Range
              </h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleTimeRangeChange("24h")}
                  className={`px-3 py-1.5 rounded-md text-sm ${
                    timeRange === "24h"
                      ? "bg-blue-100 text-blue-700 border-blue-300"
                      : "bg-gray-100 text-gray-700 border-gray-300"
                  } border`}
                >
                  24 Hours
                </button>
                <button
                  onClick={() => handleTimeRangeChange("7d")}
                  className={`px-3 py-1.5 rounded-md text-sm ${
                    timeRange === "7d"
                      ? "bg-blue-100 text-blue-700 border-blue-300"
                      : "bg-gray-100 text-gray-700 border-gray-300"
                  } border`}
                >
                  7 Days
                </button>
                <button
                  onClick={() => handleTimeRangeChange("30d")}
                  className={`px-3 py-1.5 rounded-md text-sm ${
                    timeRange === "30d"
                      ? "bg-blue-100 text-blue-700 border-blue-300"
                      : "bg-gray-100 text-gray-700 border-gray-300"
                  } border`}
                >
                  30 Days
                </button>
                <button
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className={`px-3 py-1.5 rounded-md text-sm flex items-center ${
                    timeRange === "custom"
                      ? "bg-blue-100 text-blue-700 border-blue-300"
                      : "bg-gray-100 text-gray-700 border-gray-300"
                  } border`}
                >
                  <Calendar className="h-4 w-4 mr-1" />
                  Custom
                </button>
              </div>

              {/* Custom Date Range Picker */}
              {showDatePicker && (
                <div className="mt-3 p-3 border border-gray-200 rounded-md bg-gray-50">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        Start Date
                      </label>
                      <input
                        type="date"
                        className="w-full p-1.5 text-sm border border-gray-300 rounded-md"
                        value={customDateRange.start}
                        onChange={(e) =>
                          setCustomDateRange({
                            ...customDateRange,
                            start: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        End Date
                      </label>
                      <input
                        type="date"
                        className="w-full p-1.5 text-sm border border-gray-300 rounded-md"
                        value={customDateRange.end}
                        onChange={(e) =>
                          setCustomDateRange({
                            ...customDateRange,
                            end: e.target.value,
                          })
                        }
                        max={new Date().toISOString().split("T")[0]}
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={handleCustomDateSubmit}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sensor Filter */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Sensors
              </h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleSensorToggle("temperature")}
                  className={`px-3 py-1.5 rounded-md text-sm flex items-center ${
                    selectedSensors.includes("temperature")
                      ? "bg-red-100 text-red-700 border-red-300"
                      : "bg-gray-100 text-gray-700 border-gray-300"
                  } border`}
                >
                  <Thermometer className="h-4 w-4 mr-1" />
                  Temperature
                </button>
                <button
                  onClick={() => handleSensorToggle("light")}
                  className={`px-3 py-1.5 rounded-md text-sm flex items-center ${
                    selectedSensors.includes("light")
                      ? "bg-yellow-100 text-yellow-700 border-yellow-300"
                      : "bg-gray-100 text-gray-700 border-gray-300"
                  } border`}
                >
                  <Sun className="h-4 w-4 mr-1" />
                  Light
                </button>
                <button
                  onClick={() => handleSensorToggle("soil")}
                  className={`px-3 py-1.5 rounded-md text-sm flex items-center ${
                    selectedSensors.includes("soil")
                      ? "bg-green-100 text-green-700 border-green-300"
                      : "bg-gray-100 text-gray-700 border-gray-300"
                  } border`}
                >
                  <Sprout className="h-4 w-4 mr-1" />
                  Soil Moisture
                </button>
                <button
                  onClick={() => handleSensorToggle("humidity")}
                  className={`px-3 py-1.5 rounded-md text-sm flex items-center ${
                    selectedSensors.includes("humidity")
                      ? "bg-blue-100 text-blue-700 border-blue-300"
                      : "bg-gray-100 text-gray-700 border-gray-300"
                  } border`}
                >
                  <svg
                    className="h-4 w-4 mr-1"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 2v6M12 22v-6M4.93 10.93l4.24 4.24M14.83 8.83l4.24 4.24M2 16h6M22 16h-6M10.93 19.07l4.24-4.24M8.83 5.17l4.24 4.24" />
                  </svg>
                  Humidity
                </button>
                <button
                  onClick={() => handleSensorToggle("pressure")}
                  className={`px-3 py-1.5 rounded-md text-sm flex items-center ${
                    selectedSensors.includes("pressure")
                      ? "bg-purple-100 text-purple-700 border-purple-300"
                      : "bg-gray-100 text-gray-700 border-gray-300"
                  } border`}
                >
                  <svg
                    className="h-4 w-4 mr-1"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M8 12h8M12 8v8" />
                  </svg>
                  Pressure
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sensor Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {selectedSensors.includes("temperature") && (
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center">
                  <Thermometer className="h-5 w-5 text-red-500 mr-2" />
                  <h3 className="font-medium text-gray-900">Temperature</h3>
                </div>
                <div className="flex items-center">
                  {getTrendIcon(stats.temperature.trend)}
                  <span
                    className={`text-sm ml-1 ${getTrendColor(
                      stats.temperature.trend
                    )}`}
                  >
                    {stats.temperature.trend.charAt(0).toUpperCase() +
                      stats.temperature.trend.slice(1)}
                  </span>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-500">Current</p>
                  <p className="text-xl font-bold">
                    {stats.temperature.current}°C
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Average</p>
                  <p className="text-lg font-semibold">
                    {stats.temperature.avg}°C
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Min</p>
                  <p className="text-sm font-medium">
                    {stats.temperature.min}°C
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Max</p>
                  <p className="text-sm font-medium">
                    {stats.temperature.max}°C
                  </p>
                </div>
              </div>
            </div>
          )}

          {selectedSensors.includes("light") && (
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center">
                  <Sun className="h-5 w-5 text-yellow-500 mr-2" />
                  <h3 className="font-medium text-gray-900">Light</h3>
                </div>
                <div className="flex items-center">
                  {getTrendIcon(stats.light.trend)}
                  <span
                    className={`text-sm ml-1 ${getTrendColor(
                      stats.light.trend
                    )}`}
                  >
                    {stats.light.trend.charAt(0).toUpperCase() +
                      stats.light.trend.slice(1)}
                  </span>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-500">Current</p>
                  <p className="text-xl font-bold">{stats.light.current} lux</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Average</p>
                  <p className="text-lg font-semibold">{stats.light.avg} lux</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Min</p>
                  <p className="text-sm font-medium">{stats.light.min} lux</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Max</p>
                  <p className="text-sm font-medium">{stats.light.max} lux</p>
                </div>
              </div>
            </div>
          )}

          {selectedSensors.includes("soil") && (
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center">
                  <Sprout className="h-5 w-5 text-green-500 mr-2" />
                  <h3 className="font-medium text-gray-900">Soil Moisture</h3>
                </div>
                <div className="flex items-center">
                  {getTrendIcon(stats.soil.trend)}
                  <span
                    className={`text-sm ml-1 ${getTrendColor(
                      stats.soil.trend
                    )}`}
                  >
                    {stats.soil.trend.charAt(0).toUpperCase() +
                      stats.soil.trend.slice(1)}
                  </span>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-500">Current</p>
                  <p className="text-xl font-bold">{stats.soil.current}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Average</p>
                  <p className="text-lg font-semibold">{stats.soil.avg}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Min</p>
                  <p className="text-sm font-medium">{stats.soil.min}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Max</p>
                  <p className="text-sm font-medium">{stats.soil.max}</p>
                </div>
              </div>
            </div>
          )}

          {selectedSensors.includes("humidity") && (
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center">
                  <svg
                    className="h-5 w-5 text-blue-500 mr-2"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 2v6M12 22v-6M4.93 10.93l4.24 4.24M14.83 8.83l4.24 4.24M2 16h6M22 16h-6M10.93 19.07l4.24-4.24M8.83 5.17l4.24 4.24" />
                  </svg>
                  <h3 className="font-medium text-gray-900">Air Humidity</h3>
                </div>
                <div className="flex items-center">
                  {getTrendIcon(stats.humidity.trend)}
                  <span
                    className={`text-sm ml-1 ${getTrendColor(
                      stats.humidity.trend
                    )}`}
                  >
                    {stats.humidity.trend.charAt(0).toUpperCase() +
                      stats.humidity.trend.slice(1)}
                  </span>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-500">Current</p>
                  <p className="text-xl font-bold">{stats.humidity.current}%</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Average</p>
                  <p className="text-lg font-semibold">{stats.humidity.avg}%</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Min</p>
                  <p className="text-sm font-medium">{stats.humidity.min}%</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Max</p>
                  <p className="text-sm font-medium">{stats.humidity.max}%</p>
                </div>
              </div>
            </div>
          )}

          {selectedSensors.includes("pressure") && (
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center">
                  <svg
                    className="h-5 w-5 text-purple-500 mr-2"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M8 12h8M12 8v8" />
                  </svg>
                  <h3 className="font-medium text-gray-900">Air Pressure</h3>
                </div>
                <div className="flex items-center">
                  {getTrendIcon(stats.pressure.trend)}
                  <span
                    className={`text-sm ml-1 ${getTrendColor(
                      stats.pressure.trend
                    )}`}
                  >
                    {stats.pressure.trend.charAt(0).toUpperCase() +
                      stats.pressure.trend.slice(1)}
                  </span>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-500">Current</p>
                  <p className="text-xl font-bold">
                    {stats.pressure.current} hPa
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Average</p>
                  <p className="text-lg font-semibold">
                    {stats.pressure.avg} hPa
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Min</p>
                  <p className="text-sm font-medium">
                    {stats.pressure.min} hPa
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Max</p>
                  <p className="text-sm font-medium">
                    {stats.pressure.max} hPa
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Combined Chart */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Combined Sensor Data
          </h3>

          {combinedData.length > 0 ? (
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={combinedData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 25 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f0f0f0"
                  />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 12 }}
                    tickMargin={10}
                    height={40}
                  />
                  <YAxis
                    yAxisId="temp"
                    orientation="left"
                    domain={["auto", "auto"]}
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `${value}°C`}
                    stroke={getSensorColor("temperature")}
                    hide={!selectedSensors.includes("temperature")}
                  />
                  <YAxis
                    yAxisId="light"
                    orientation="right"
                    domain={["auto", "auto"]}
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `${value}`}
                    stroke={getSensorColor("light")}
                    hide={!selectedSensors.includes("light")}
                  />
                  <YAxis
                    yAxisId="soil"
                    orientation="right"
                    domain={[0, 100]}
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `${value}`}
                    stroke={getSensorColor("soil")}
                    hide={!selectedSensors.includes("soil")}
                  />
                  <YAxis
                    yAxisId="humidity"
                    orientation="right"
                    domain={[0, 100]}
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `${value}%`}
                    stroke={getSensorColor("humidity")}
                    hide={!selectedSensors.includes("humidity")}
                  />
                  <YAxis
                    yAxisId="pressure"
                    orientation="right"
                    domain={["auto", "auto"]}
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `${value}`}
                    stroke={getSensorColor("pressure")}
                    hide={!selectedSensors.includes("pressure")}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />

                  {selectedSensors.includes("temperature") && (
                    <Line
                      type="monotone"
                      dataKey="temperature"
                      name="Temperature"
                      stroke={getSensorColor("temperature")}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 6 }}
                      yAxisId="temp"
                    />
                  )}

                  {selectedSensors.includes("light") && (
                    <Line
                      type="monotone"
                      dataKey="light"
                      name="Light"
                      stroke={getSensorColor("light")}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 6 }}
                      yAxisId="light"
                    />
                  )}

                  {selectedSensors.includes("soil") && (
                    <Line
                      type="monotone"
                      dataKey="soil"
                      name="Soil Moisture"
                      stroke={getSensorColor("soil")}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 6 }}
                      yAxisId="soil"
                    />
                  )}

                  {selectedSensors.includes("humidity") && (
                    <Line
                      type="monotone"
                      dataKey="humidity"
                      name="Humidity"
                      stroke={getSensorColor("humidity")}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 6 }}
                      yAxisId="humidity"
                    />
                  )}

                  {selectedSensors.includes("pressure") && (
                    <Line
                      type="monotone"
                      dataKey="pressure"
                      name="Pressure"
                      stroke={getSensorColor("pressure")}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 6 }}
                      yAxisId="pressure"
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center">
                <p className="text-gray-500">
                  No data available for the selected time range
                </p>
                <button
                  onClick={handleRefresh}
                  className="mt-4 px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                >
                  Refresh Data
                </button>
              </div>
            </div>
          )}

          <div className="mt-4 bg-blue-50 p-3 rounded-md">
            <div className="flex items-start text-sm text-blue-700">
              <Info className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
              <p>
                This chart combines all selected sensor data in a single view.
                Each sensor has its own Y-axis for optimal visualization. Toggle
                sensors using the controls above.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SensorAnalytics;
