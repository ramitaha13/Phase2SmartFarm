import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  RefreshCw,
  Info,
  Droplet,
  Thermometer,
} from "lucide-react";
import { db } from "../firebase";
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  where,
} from "firebase/firestore";
import Plot from "react-plotly.js";

const SpatialModelDashboard = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [plotData, setPlotData] = useState([]);
  const [plotLayout, setPlotLayout] = useState({});
  const [timeRange, setTimeRange] = useState("24h");
  const [latestReadings, setLatestReadings] = useState({
    temperature: 0,
    humidity: 0,
    recommendation: "neutral",
  });
  const [sensorData, setSensorData] = useState([]);

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

            // Fetch sensor data after user data is loaded
            if (data.role === "Manager" || data.role === "Worker") {
              fetchSensorData();
            }
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchUserData();
    } else {
      setLoading(false);
    }
  }, []);

  // Fetch sensor data from Firestore
  const fetchSensorData = async () => {
    setIsRefreshing(true);
    try {
      // Determine how many records to fetch based on timeRange
      let recordsLimit = 24; // Default for 24h
      if (timeRange === "7d") recordsLimit = 168; // 24 * 7
      if (timeRange === "30d") recordsLimit = 720; // 24 * 30

      // Query the sensor data from Firestore
      const sensorDataRef = collection(db, "sensorData");
      const q = query(
        sensorDataRef,
        orderBy("timestamp", "desc"),
        limit(recordsLimit)
      );
      const querySnapshot = await getDocs(q);

      const data = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });

      // Reverse to get chronological order
      data.reverse();
      setSensorData(data);

      // Update latest readings if we have data
      if (data.length > 0) {
        const latest = data[data.length - 1];
        const temp = parseFloat(latest.temperature);
        const humidity = parseFloat(latest.humidity);

        // Determine irrigation recommendation based on temperature and humidity
        let recommendation = "neutral";
        if (temp > 28 && humidity < 50) {
          recommendation = "irrigate"; // Hot and dry - irrigate
        } else if (temp < 20 && humidity > 70) {
          recommendation = "dont-irrigate"; // Cool and humid - don't irrigate
        } else if (temp > 32) {
          recommendation = "irrigate"; // Very hot - irrigate regardless of humidity
        } else if (humidity > 85) {
          recommendation = "dont-irrigate"; // Very humid - don't irrigate
        }

        setLatestReadings({
          temperature: temp.toFixed(1),
          humidity: Math.floor(humidity),
          recommendation,
        });
      }

      // Generate heatmap data
      generateHeatmapData(data);
    } catch (error) {
      console.error("Error fetching sensor data:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Generate heatmap data based on fetched sensor data
  const generateHeatmapData = (data) => {
    // Define the temperature and humidity ranges for our grid
    const tempMin = 15;
    const tempMax = 40;
    const humidityMin = 20;
    const humidityMax = 95;
    const tempStep = 1;
    const humidityStep = 5;

    // Create arrays for our axes
    const xValues = Array.from(
      { length: Math.ceil((tempMax - tempMin) / tempStep) + 1 },
      (_, i) => tempMin + i * tempStep
    );

    const yValues = Array.from(
      { length: Math.ceil((humidityMax - humidityMin) / humidityStep) + 1 },
      (_, i) => humidityMin + i * humidityStep
    );

    // Initialize the z-value grid (irrigation recommendation score)
    const zValues = Array(yValues.length)
      .fill()
      .map(() => Array(xValues.length).fill(0));

    // Fill the grid with irrigation recommendation values (0-10 scale)
    // Higher values (green) mean "irrigate", lower values (red) mean "don't irrigate"
    for (let i = 0; i < yValues.length; i++) {
      const humidity = yValues[i];
      for (let j = 0; j < xValues.length; j++) {
        const temp = xValues[j];

        // Base score
        let score = 5;

        // Adjust score based on temperature
        if (temp > 30) score += 2; // Hot weather increases irrigation need
        else if (temp > 25) score += 1; // Warm weather slightly increases need
        else if (temp < 18) score -= 2; // Cold weather decreases need

        // Adjust score based on humidity
        if (humidity < 40) score += 2; // Dry air increases irrigation need
        else if (humidity < 55)
          score += 1; // Moderately dry slightly increases need
        else if (humidity > 75) score -= 2; // High humidity decreases need
        else if (humidity > 65) score -= 1; // Moderately humid slightly decreases need

        // Very hot and dry conditions (emergency irrigation needed)
        if (temp > 35 && humidity < 30) score = 10;

        // Very humid and cool conditions (definitely don't irrigate)
        if (temp < 20 && humidity > 80) score = 0;

        // Clamp score to 0-10 range
        zValues[i][j] = Math.max(0, Math.min(10, score));
      }
    }

    // Overlay actual data points from sensor readings if we have them
    const actualDataX = [];
    const actualDataY = [];
    const actualDataText = [];

    data.slice(-48).forEach((reading) => {
      // Only plot the most recent 48 readings to avoid clutter
      const temp = parseFloat(reading.temperature);
      const humidity = parseFloat(reading.humidity);
      if (!isNaN(temp) && !isNaN(humidity)) {
        actualDataX.push(temp);
        actualDataY.push(humidity);

        // Format the timestamp
        const timestamp = reading.timestamp.toDate
          ? reading.timestamp.toDate()
          : new Date(reading.timestamp);
        const timeStr = timestamp.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
        const dateStr = timestamp.toLocaleDateString([], {
          month: "short",
          day: "numeric",
        });

        actualDataText.push(
          `${dateStr}, ${timeStr}<br>Temp: ${temp.toFixed(
            1
          )}°C<br>Humidity: ${Math.floor(humidity)}%`
        );
      }
    });

    // Create the heatmap
    const heatmap = {
      z: zValues,
      x: xValues,
      y: yValues,
      type: "heatmap",
      colorscale: [
        [0, "rgb(178, 24, 43)"], // Don't irrigate (red)
        [0.3, "rgb(239, 138, 98)"], // Probably don't irrigate (light red)
        [0.5, "rgb(253, 219, 199)"], // Neutral (light orange)
        [0.7, "rgb(161, 217, 155)"], // Probably irrigate (light green)
        [1, "rgb(49, 163, 84)"], // Irrigate (green)
      ],
      showscale: true,
      colorbar: {
        title: "Irrigation Need",
        titleside: "right",
        tickvals: [0, 5, 10],
        ticktext: ["Don't Irrigate", "Neutral", "Irrigate"],
        tickmode: "array",
        ticks: "outside",
      },
      hoverongaps: false,
      zsmooth: "best",
    };

    // Create scatter plot for actual readings
    const scatterPlot = {
      x: actualDataX,
      y: actualDataY,
      mode: "markers",
      type: "scatter",
      marker: {
        size: 10,
        color: "rgba(255, 255, 255, 0.8)",
        line: {
          color: "rgba(0, 0, 0, 0.8)",
          width: 2,
        },
      },
      text: actualDataText,
      hoverinfo: "text",
      name: "Actual Readings",
    };

    // Current reading point (larger and highlighted)
    const currentReading = {
      x: [parseFloat(latestReadings.temperature)],
      y: [parseFloat(latestReadings.humidity)],
      mode: "markers",
      type: "scatter",
      marker: {
        size: 15,
        color: "rgb(255, 255, 255)",
        line: {
          color: "rgb(0, 0, 0)",
          width: 3,
        },
        symbol: "circle-open",
      },
      text: ["Current Reading"],
      hoverinfo: "text",
      name: "Current",
    };

    // Set plot data and layout
    setPlotData([heatmap, scatterPlot, currentReading]);
    setPlotLayout({
      title: "Smart Irrigation Recommendation Heatmap",
      xaxis: {
        title: "Temperature (°C)",
        range: [tempMin, tempMax],
      },
      yaxis: {
        title: "Air Humidity (%)",
        range: [humidityMin, humidityMax],
      },
      margin: { l: 70, r: 50, b: 70, t: 90, pad: 5 },
      annotations: [
        {
          x: 0.02,
          y: 0.98,
          xref: "paper",
          yref: "paper",
          text: "Irrigation Decision Guide",
          showarrow: false,
          font: {
            size: 14,
            color: "#555",
          },
        },
      ],
      legend: {
        x: 0.02,
        y: 0.02,
        traceorder: "normal",
        font: {
          family: "sans-serif",
          size: 12,
          color: "#000",
        },
        bgcolor: "rgba(255, 255, 255, 0.5)",
        bordercolor: "rgba(0, 0, 0, 0.1)",
        borderwidth: 1,
      },
      shapes: [
        // Box around current conditions
        {
          type: "rect",
          xref: "x",
          yref: "y",
          x0: parseFloat(latestReadings.temperature) - 1,
          y0: parseFloat(latestReadings.humidity) - 5,
          x1: parseFloat(latestReadings.temperature) + 1,
          y1: parseFloat(latestReadings.humidity) + 5,
          line: {
            color: "black",
            width: 2,
            dash: "dot",
          },
          fillcolor: "rgba(0, 0, 0, 0)",
        },
      ],
      width: undefined, // Let it be responsive
      height: 650,
      autosize: true,
      plot_bgcolor: "rgb(250, 250, 250)",
      paper_bgcolor: "rgb(255, 255, 255)",
    });
  };

  const handleBackClick = () => {
    navigate(-1);
  };

  const handleRefresh = () => {
    fetchSensorData();
  };

  const handleTimeRangeChange = (range) => {
    setTimeRange(range);
    fetchSensorData();
  };

  // Helper function to get recommendation text and color
  const getRecommendationInfo = (rec) => {
    switch (rec) {
      case "irrigate":
        return {
          text: "Irrigation Recommended",
          color: "bg-green-500",
          icon: <Droplet className="h-6 w-6 text-white" />,
        };
      case "dont-irrigate":
        return {
          text: "No Irrigation Needed",
          color: "bg-red-500",
          icon: <Droplet className="h-6 w-6 text-white" />,
        };
      default:
        return {
          text: "Neutral Conditions",
          color: "bg-yellow-500",
          icon: <Info className="h-6 w-6 text-white" />,
        };
    }
  };

  // If still loading, show a loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-lg text-gray-600">Loading...</div>
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

  const recInfo = getRecommendationInfo(latestReadings.recommendation);

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
              Smart Irrigation Dashboard
            </h1>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <RefreshCw
                className={`h-5 w-5 ${isRefreshing ? "animate-spin" : ""}`}
              />
              <span className="sr-only">Refresh</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Current Conditions Card */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Current Conditions
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Temperature Card */}
            <div className="bg-gray-50 rounded-lg p-4 flex items-center">
              <div className="bg-blue-500 rounded-full p-3 mr-4">
                <Thermometer className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Temperature</p>
                <p className="text-2xl font-bold text-gray-800">
                  {latestReadings.temperature}°C
                </p>
              </div>
            </div>

            {/* Humidity Card */}
            <div className="bg-gray-50 rounded-lg p-4 flex items-center">
              <div className="bg-blue-500 rounded-full p-3 mr-4">
                <svg
                  className="h-6 w-6 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 2v6M12 22v-6M4.93 10.93l4.24 4.24M14.83 8.83l4.24 4.24M2 16h6M22 16h-6M10.93 19.07l4.24-4.24M8.83 5.17l4.24 4.24" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500">Air Humidity</p>
                <p className="text-2xl font-bold text-gray-800">
                  {latestReadings.humidity}%
                </p>
              </div>
            </div>

            {/* Recommendation Card */}
            <div className="bg-gray-50 rounded-lg p-4 flex items-center">
              <div className={`${recInfo.color} rounded-full p-3 mr-4`}>
                {recInfo.icon}
              </div>
              <div>
                <p className="text-sm text-gray-500">Recommendation</p>
                <p className="text-xl font-bold text-gray-800">
                  {recInfo.text}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="flex justify-end mb-4">
          <div className="inline-flex rounded-md shadow-sm" role="group">
            <button
              type="button"
              onClick={() => handleTimeRangeChange("24h")}
              className={`px-4 py-2 text-sm font-medium ${
                timeRange === "24h"
                  ? "bg-green-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              } border border-gray-200 rounded-l-lg`}
            >
              24h
            </button>
            <button
              type="button"
              onClick={() => handleTimeRangeChange("7d")}
              className={`px-4 py-2 text-sm font-medium ${
                timeRange === "7d"
                  ? "bg-green-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              } border-t border-b border-gray-200`}
            >
              7d
            </button>
            <button
              type="button"
              onClick={() => handleTimeRangeChange("30d")}
              className={`px-4 py-2 text-sm font-medium ${
                timeRange === "30d"
                  ? "bg-green-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              } border border-gray-200 rounded-r-lg`}
            >
              30d
            </button>
          </div>
        </div>

        {/* Heatmap Visualization */}
        <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 mb-6">
          <div className="w-full h-full">
            {plotData.length > 0 ? (
              <Plot
                data={plotData}
                layout={plotLayout}
                config={{
                  responsive: true,
                  displayModeBar: true,
                  modeBarButtonsToRemove: [
                    "lasso2d",
                    "select2d",
                    "toggleSpikelines",
                  ],
                  displaylogo: false,
                }}
                style={{ width: "100%", height: "100%" }}
              />
            ) : (
              <div className="flex items-center justify-center h-64">
                <p className="text-gray-500">Loading heatmap data...</p>
              </div>
            )}
          </div>
        </div>

        {/* Legend/Explanation Card */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            How to Use This Dashboard
          </h2>
          <div className="text-gray-700 space-y-3">
            <p>
              This heatmap shows the relationship between air temperature and
              humidity, and helps you decide when to irrigate your crops:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>
                <span className="inline-block w-4 h-4 bg-red-600 rounded-sm mr-2"></span>
                <strong>Red areas</strong>: Don't irrigate - conditions are cool
                and/or humid enough
              </li>
              <li>
                <span className="inline-block w-4 h-4 bg-yellow-400 rounded-sm mr-2"></span>
                <strong>Yellow areas</strong>: Neutral conditions - use other
                factors to decide
              </li>
              <li>
                <span className="inline-block w-4 h-4 bg-green-600 rounded-sm mr-2"></span>
                <strong>Green areas</strong>: Irrigate - conditions are hot
                and/or dry
              </li>
            </ul>
            <p>
              White dots show your recent sensor readings, while the outlined
              circle shows your current conditions. Use this visualization to
              plan your irrigation schedule efficiently.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpatialModelDashboard;
