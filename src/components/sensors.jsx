import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  Thermometer,
  Sun,
  Sprout,
  ChevronRight,
  RefreshCw,
  BarChart,
  AlertTriangle,
  Clock,
  Check,
} from "lucide-react";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  orderBy,
  limit,
} from "firebase/firestore";

const SensorsPage = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sensors, setSensors] = useState({
    temperature: {
      value: 0,
      unit: "°C",
      status: "normal",
      lastUpdated: new Date(),
    },
    light: {
      value: 0,
      unit: "lux",
      status: "normal",
      lastUpdated: new Date(),
    },
    soilMoisture: {
      value: 0,
      unit: "",
      status: "normal",
      lastUpdated: new Date(),
    },
    airHumidity: {
      value: 0,
      unit: "%",
      status: "normal",
      lastUpdated: new Date(),
    },
    pressure: {
      value: 0,
      unit: "hPa",
      status: "normal",
      lastUpdated: new Date(),
    },
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [alerts, setAlerts] = useState([]);

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
      // If no user is in local storage, we can handle it here
      setLoading(false);
    }
  }, []);

  // Function to determine sensor status based on value
  const determineSensorStatus = (sensorType, value) => {
    switch (sensorType) {
      case "temperature":
        return value > 30 ? "warning" : value > 35 ? "critical" : "normal";
      case "light":
        return value < 200 ? "warning" : value > 1500 ? "critical" : "normal";
      case "soilMoisture":
        return value < 30 ? "critical" : value < 50 ? "warning" : "normal";
      case "airHumidity":
        return value < 30 ? "warning" : value > 75 ? "warning" : "normal";
      case "pressure":
        return value < 980 ? "warning" : value > 1030 ? "warning" : "normal";
      default:
        return "normal";
    }
  };

  // Fetch sensor data from Firestore
  const fetchSensorData = async () => {
    try {
      setIsRefreshing(true);

      // Query the most recent sensor data from Firestore
      const sensorDataRef = collection(db, "sensorData");
      const q = query(sensorDataRef, orderBy("timestamp", "desc"), limit(1));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const latestData = querySnapshot.docs[0].data();

        // Extract and format the data for our UI
        const newSensors = {
          temperature: {
            value: parseFloat(latestData.temperature).toFixed(1),
            unit: "°C",
            status: determineSensorStatus(
              "temperature",
              latestData.temperature
            ),
            lastUpdated: latestData.timestamp || new Date(),
          },
          light: {
            value: Math.floor(latestData.Light),
            unit: "lux",
            status: determineSensorStatus("light", latestData.Light),
            lastUpdated: latestData.timestamp || new Date(),
          },
          soilMoisture: {
            value: Math.floor(latestData["Soil humidity"]),
            unit: "",
            status: determineSensorStatus(
              "soilMoisture",
              latestData["Soil humidity"]
            ),
            lastUpdated: latestData.timestamp || new Date(),
          },
          airHumidity: {
            value: Math.floor(latestData.humidity),
            unit: "%",
            status: determineSensorStatus("airHumidity", latestData.humidity),
            lastUpdated: latestData.timestamp || new Date(),
          },
          pressure: {
            value: Math.floor(latestData.Pressure),
            unit: "hPa",
            status: determineSensorStatus("pressure", latestData.Pressure),
            lastUpdated: latestData.timestamp || new Date(),
          },
        };

        setSensors(newSensors);

        // Generate alerts based on the sensor data
        const newAlerts = [];

        if (latestData.temperature > 30) {
          newAlerts.push({
            type: "warning",
            icon: (
              <AlertTriangle className="h-5 w-5 text-yellow-500 mr-3 mt-0.5" />
            ),
            title: "Temperature warning",
            message: `Temperature is high at ${latestData.temperature}°C.`,
            time: latestData.timestamp || new Date(),
          });
        }

        if (latestData["Soil humidity"] < 50) {
          newAlerts.push({
            type: "warning",
            icon: (
              <AlertTriangle className="h-5 w-5 text-yellow-500 mr-3 mt-0.5" />
            ),
            title: "Soil moisture level warning",
            message: `Soil moisture is below optimal level at ${latestData["Soil humidity"]}.`,
            time: latestData.timestamp || new Date(),
          });
        }

        if (latestData.Light > 1500) {
          newAlerts.push({
            type: "critical",
            icon: (
              <AlertTriangle className="h-5 w-5 text-red-500 mr-3 mt-0.5" />
            ),
            title: "Light intensity alert",
            message: `Light intensity is very high at ${latestData.Light} lux.`,
            time: latestData.timestamp || new Date(),
          });
        }

        if (latestData.humidity < 30) {
          newAlerts.push({
            type: "warning",
            icon: (
              <AlertTriangle className="h-5 w-5 text-yellow-500 mr-3 mt-0.5" />
            ),
            title: "Air humidity warning",
            message: `Air humidity is too low at ${latestData.humidity}%.`,
            time: latestData.timestamp || new Date(),
          });
        }

        if (latestData.humidity > 75) {
          newAlerts.push({
            type: "warning",
            icon: (
              <AlertTriangle className="h-5 w-5 text-yellow-500 mr-3 mt-0.5" />
            ),
            title: "Air humidity warning",
            message: `Air humidity is too high at ${latestData.humidity}%.`,
            time: latestData.timestamp || new Date(),
          });
        }

        if (latestData.Pressure < 980 || latestData.Pressure > 1030) {
          newAlerts.push({
            type: "warning",
            icon: (
              <AlertTriangle className="h-5 w-5 text-yellow-500 mr-3 mt-0.5" />
            ),
            title: "Pressure warning",
            message: `Air pressure is outside normal range at ${latestData.Pressure} hPa.`,
            time: latestData.timestamp || new Date(),
          });
        }

        // If we have new alerts, update them
        if (newAlerts.length > 0) {
          setAlerts(newAlerts);
        }
      }

      setIsRefreshing(false);
    } catch (error) {
      console.error("Error fetching sensor data:", error);
      setIsRefreshing(false);
    }
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "";

    // Convert Firebase timestamp to JS Date if needed
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);

    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Format date for alerts
  const formatAlertDate = (timestamp) => {
    if (!timestamp) return "";

    // Convert Firebase timestamp to JS Date if needed
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);

    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === now.toDateString()) {
      return `Today, ${date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday, ${date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    } else {
      return `${date.toLocaleDateString([], {
        month: "short",
        day: "numeric",
      })}, ${date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    }
  };

  const handleBackClick = () => {
    navigate(-1);
  };

  const handleRefresh = () => {
    fetchSensorData();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "normal":
        return "text-green-600";
      case "warning":
        return "text-yellow-600";
      case "critical":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "normal":
        return <Check className="h-5 w-5 text-green-600" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case "critical":
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      default:
        return null;
    }
  };

  const handleViewSensorDetails = (sensorType) => {
    navigate(`/sensor/${sensorType}`);
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
              Sensors Dashboard
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-end">
          {/* Just the Refresh Button */}
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

        {/* Sensors Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Temperature Sensor Card */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <Thermometer className="h-6 w-6 text-red-500" />
                  <h3 className="font-semibold text-gray-900">Temperature</h3>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(sensors.temperature.status)}
                  <span className={getStatusColor(sensors.temperature.status)}>
                    {sensors.temperature.status.charAt(0).toUpperCase() +
                      sensors.temperature.status.slice(1)}
                  </span>
                </div>
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-end space-x-2 mb-2">
                <span className="text-3xl font-bold">
                  {sensors.temperature.value}
                </span>
                <span className="text-gray-600 text-xl">
                  {sensors.temperature.unit}
                </span>
              </div>
              <div className="text-xs text-gray-500 mb-4">
                Last updated: {formatTimestamp(sensors.temperature.lastUpdated)}
              </div>
              <div className="h-24 bg-gray-50 rounded flex items-center justify-center mb-4">
                <BarChart className="h-16 w-16 text-gray-300" />
              </div>
              <button
                onClick={() => handleViewSensorDetails("temperature")}
                className="w-full flex items-center justify-center space-x-1 py-2 border border-gray-200 rounded-md text-gray-700 hover:bg-gray-50"
              >
                <span>View Details</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Light Sensor Card */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <Sun className="h-6 w-6 text-yellow-500" />
                  <h3 className="font-semibold text-gray-900">Light</h3>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(sensors.light.status)}
                  <span className={getStatusColor(sensors.light.status)}>
                    {sensors.light.status.charAt(0).toUpperCase() +
                      sensors.light.status.slice(1)}
                  </span>
                </div>
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-end space-x-2 mb-2">
                <span className="text-3xl font-bold">
                  {sensors.light.value}
                </span>
                <span className="text-gray-600 text-xl">
                  {sensors.light.unit}
                </span>
              </div>
              <div className="text-xs text-gray-500 mb-4">
                Last updated: {formatTimestamp(sensors.light.lastUpdated)}
              </div>
              <div className="h-24 bg-gray-50 rounded flex items-center justify-center mb-4">
                <BarChart className="h-16 w-16 text-gray-300" />
              </div>
              <button
                onClick={() => handleViewSensorDetails("light")}
                className="w-full flex items-center justify-center space-x-1 py-2 border border-gray-200 rounded-md text-gray-700 hover:bg-gray-50"
              >
                <span>View Details</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Soil Moisture Sensor Card */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <Sprout className="h-6 w-6 text-green-500" />
                  <h3 className="font-semibold text-gray-900">Soil Moisture</h3>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(sensors.soilMoisture.status)}
                  <span className={getStatusColor(sensors.soilMoisture.status)}>
                    {sensors.soilMoisture.status.charAt(0).toUpperCase() +
                      sensors.soilMoisture.status.slice(1)}
                  </span>
                </div>
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-end space-x-2 mb-2">
                <span className="text-3xl font-bold">
                  {sensors.soilMoisture.value}
                </span>
                <span className="text-gray-600 text-xl">
                  {sensors.soilMoisture.unit}
                </span>
              </div>
              <div className="text-xs text-gray-500 mb-4">
                Last updated:{" "}
                {formatTimestamp(sensors.soilMoisture.lastUpdated)}
              </div>
              <div className="h-24 bg-gray-50 rounded flex items-center justify-center mb-4">
                <BarChart className="h-16 w-16 text-gray-300" />
              </div>
              <button
                onClick={() => handleViewSensorDetails("soil-moisture")}
                className="w-full flex items-center justify-center space-x-1 py-2 border border-gray-200 rounded-md text-gray-700 hover:bg-gray-50"
              >
                <span>View Details</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Air Humidity Sensor Card */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <svg
                    className="h-6 w-6 text-blue-500"
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
                  <h3 className="font-semibold text-gray-900">Air Humidity</h3>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(sensors.airHumidity.status)}
                  <span className={getStatusColor(sensors.airHumidity.status)}>
                    {sensors.airHumidity.status.charAt(0).toUpperCase() +
                      sensors.airHumidity.status.slice(1)}
                  </span>
                </div>
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-end space-x-2 mb-2">
                <span className="text-3xl font-bold">
                  {sensors.airHumidity.value}
                </span>
                <span className="text-gray-600 text-xl">
                  {sensors.airHumidity.unit}
                </span>
              </div>
              <div className="text-xs text-gray-500 mb-4">
                Last updated: {formatTimestamp(sensors.airHumidity.lastUpdated)}
              </div>
              <div className="h-24 bg-gray-50 rounded flex items-center justify-center mb-4">
                <BarChart className="h-16 w-16 text-gray-300" />
              </div>
              <button
                onClick={() => handleViewSensorDetails("air-humidity")}
                className="w-full flex items-center justify-center space-x-1 py-2 border border-gray-200 rounded-md text-gray-700 hover:bg-gray-50"
              >
                <span>View Details</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Air Pressure Sensor Card */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <svg
                    className="h-6 w-6 text-purple-500"
                    xmlns="http://www.w3.org/2000/svg"
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
                  <h3 className="font-semibold text-gray-900">Air Pressure</h3>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(sensors.pressure.status)}
                  <span className={getStatusColor(sensors.pressure.status)}>
                    {sensors.pressure.status.charAt(0).toUpperCase() +
                      sensors.pressure.status.slice(1)}
                  </span>
                </div>
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-end space-x-2 mb-2">
                <span className="text-3xl font-bold">
                  {sensors.pressure.value}
                </span>
                <span className="text-gray-600 text-xl">
                  {sensors.pressure.unit}
                </span>
              </div>
              <div className="text-xs text-gray-500 mb-4">
                Last updated: {formatTimestamp(sensors.pressure.lastUpdated)}
              </div>
              <div className="h-24 bg-gray-50 rounded flex items-center justify-center mb-4">
                <BarChart className="h-16 w-16 text-gray-300" />
              </div>
              <button
                onClick={() => handleViewSensorDetails("air-pressure")}
                className="w-full flex items-center justify-center space-x-1 py-2 border border-gray-200 rounded-md text-gray-700 hover:bg-gray-50"
              >
                <span>View Details</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Alerts and Notifications Section */}
        <div className="bg-white rounded-lg shadow-sm p-4 md:p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Recent Alerts
          </h2>
          <div className="divide-y divide-gray-100">
            {alerts.length > 0 ? (
              alerts.map((alert, index) => (
                <div key={index} className="flex items-start py-3">
                  {alert.icon}
                  <div>
                    <p className="text-gray-900 font-medium">{alert.title}</p>
                    <p className="text-gray-600 text-sm">{alert.message}</p>
                    <p className="text-gray-500 text-xs mt-1">
                      {formatAlertDate(alert.time)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <>
                <div className="flex items-start py-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-500 mr-3 mt-0.5" />
                  <div>
                    <p className="text-gray-900 font-medium">
                      Soil moisture level warning
                    </p>
                    <p className="text-gray-600 text-sm">
                      Soil moisture dropped below optimal level in Zone 2.
                    </p>
                    <p className="text-gray-500 text-xs mt-1">
                      Today, 10:24 AM
                    </p>
                  </div>
                </div>
                <div className="flex items-start py-3">
                  <AlertTriangle className="h-5 w-5 text-red-500 mr-3 mt-0.5" />
                  <div>
                    <p className="text-gray-900 font-medium">
                      Temperature alert
                    </p>
                    <p className="text-gray-600 text-sm">
                      Temperature exceeded normal range in Greenhouse 1.
                    </p>
                    <p className="text-gray-500 text-xs mt-1">
                      Yesterday, 4:15 PM
                    </p>
                  </div>
                </div>
                <div className="flex items-start py-3">
                  <Clock className="h-5 w-5 text-blue-500 mr-3 mt-0.5" />
                  <div>
                    <p className="text-gray-900 font-medium">
                      Sensors calibration reminder
                    </p>
                    <p className="text-gray-600 text-sm">
                      Scheduled calibration for soil moisture sensors needed.
                    </p>
                    <p className="text-gray-500 text-xs mt-1">
                      April 8, 9:00 AM
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SensorsPage;
