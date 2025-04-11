import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  Droplets,
  Calendar,
  Clock,
  Power,
  CheckCircle,
  RefreshCw,
  Settings,
  AlertTriangle,
} from "lucide-react";
import { db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

const IrrigationControl = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Single zone state instead of multiple zones
  const [zone, setZone] = useState({
    id: "main-zone",
    name: "Main Farm Zone",
    status: "off",
    moisture: 68,
    lastWatered: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
    schedule: [
      {
        id: "sch1",
        days: ["Monday", "Wednesday", "Friday"],
        time: "06:00",
        duration: 20,
      },
      {
        id: "sch2",
        days: ["Tuesday", "Thursday"],
        time: "07:00",
        duration: 15,
      },
    ],
  });

  const [waterUsage, setWaterUsage] = useState({
    today: 120,
    thisWeek: 840,
    thisMonth: 3600,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

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

            // Fetch irrigation data (in a real app)
            // fetchIrrigationData();
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

  // Simulated function to fetch irrigation data
  // In a real app, you would get this from Firestore
  const fetchIrrigationData = async () => {
    try {
      setIsRefreshing(true);
      // Simulate API delay
      setTimeout(() => {
        // Randomize the moisture value to simulate real-time data
        setZone((prevZone) => ({
          ...prevZone,
          moisture: Math.floor(prevZone.moisture + (Math.random() * 10 - 5)),
        }));
        setIsRefreshing(false);
      }, 1000);
    } catch (error) {
      console.error("Error fetching irrigation data:", error);
      setIsRefreshing(false);
    }
  };

  const handleBackClick = () => {
    navigate(-1);
  };

  const handleRefresh = () => {
    fetchIrrigationData();
  };

  // Toggle irrigation on/off
  const toggleIrrigation = () => {
    // Update local state
    const newStatus = zone.status === "off" ? "on" : "off";

    // In a real app, you would call your API or update Firestore here
    // updateIrrigationStatus(zone.id, newStatus);

    setZone({
      ...zone,
      status: newStatus,
      lastWatered: newStatus === "on" ? new Date() : zone.lastWatered,
    });
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "";

    // Convert Firebase timestamp to JS Date if needed
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);

    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) {
      return "Just now";
    } else if (diffInSeconds < 3600) {
      return `${Math.floor(diffInSeconds / 60)} min ago`;
    } else if (diffInSeconds < 86400) {
      return `${Math.floor(diffInSeconds / 3600)} hr ago`;
    } else {
      return date.toLocaleDateString();
    }
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
              Irrigation Control
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

        {/* Water Usage Overview */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Water Usage Overview
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Today</p>
                <p className="text-xl font-bold text-blue-700">
                  {waterUsage.today} L
                </p>
              </div>
              <Droplets className="h-8 w-8 text-blue-400" />
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">This Week</p>
                <p className="text-xl font-bold text-blue-700">
                  {waterUsage.thisWeek} L
                </p>
              </div>
              <Droplets className="h-8 w-8 text-blue-400" />
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">This Month</p>
                <p className="text-xl font-bold text-blue-700">
                  {waterUsage.thisMonth} L
                </p>
              </div>
              <Droplets className="h-8 w-8 text-blue-400" />
            </div>
          </div>
        </div>

        {/* Single Irrigation Zone */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">{zone.name}</h2>
          </div>

          <div className="bg-white rounded-lg shadow-sm mb-4 overflow-hidden">
            {/* Zone Header */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <Droplets className="h-5 w-5 text-blue-500" />
                    <h3 className="font-semibold text-gray-900">Zone Status</h3>
                  </div>
                  <div className="flex items-center mt-2 space-x-4">
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">
                        Last watered: {formatTimestamp(zone.lastWatered)}
                      </span>
                    </div>
                    <div
                      className={`flex items-center space-x-1 px-2 py-0.5 text-xs rounded-full ${
                        getMoistureStatus(zone.moisture).bg
                      }`}
                    >
                      <span className={getMoistureStatus(zone.moisture).color}>
                        Soil: {zone.moisture}% (
                        {getMoistureStatus(zone.moisture).message})
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        zone.status === "on"
                          ? "bg-green-100 text-green-800"
                          : zone.status === "scheduled"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {zone.status === "on"
                        ? "Running"
                        : zone.status === "scheduled"
                        ? "Scheduled"
                        : "Off"}
                    </span>
                  </div>
                  <button
                    onClick={toggleIrrigation}
                    className={`p-2 rounded-md ${
                      zone.status === "on"
                        ? "bg-green-100 text-green-600 hover:bg-green-200"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    <Power className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Zone Details */}
            <div className="p-4 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex space-x-2">
                  {zone.moisture < 50 && (
                    <div className="flex items-center space-x-1 text-sm text-yellow-600">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Soil moisture below optimal level</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tips Card */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Tips & Recommendations
          </h2>
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <p className="text-gray-700">
                For optimal growth, maintain soil moisture between 50% and 70%.
              </p>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <p className="text-gray-700">
                Water early in the morning to reduce evaporation and fungal
                problems.
              </p>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <p className="text-gray-700">
                Adjust watering schedules based on weather conditions and
                seasonal changes.
              </p>
            </div>
            <div className="flex items-start space-x-3">
              <Settings className="h-5 w-5 text-blue-500 mt-0.5" />
              <p className="text-gray-700">
                {zone.moisture < 50
                  ? "Current soil moisture is below optimal level. Consider running a manual irrigation cycle."
                  : "Current soil moisture is at a good level for plant growth."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IrrigationControl;
