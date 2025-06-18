import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Leaf,
  Bell,
  LogOut,
  LayoutDashboard,
  Cloud,
  MessageSquare,
  Menu,
  X,
  Thermometer,
  Droplets,
  Sun,
  Sprout,
  ClipboardList,
  Check,
  ArrowRight,
  Clock,
  AlertCircle,
  BarChart, // Added for SensorAnalytics
  Bot, // Added for RobotController
  Gauge, // Added for Air Pressure
  Lightbulb, // Added for Farmer Assistant
  Flower, // Added for Plant Health Analyzer
  Map, // Added Map icon for Heatmap
} from "lucide-react";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  orderBy,
  limit,
  Timestamp,
} from "firebase/firestore";

const UserPage = () => {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userData, setUserData] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Retrieve user data from local storage and then fetch from Firestore
  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser && storedUser.email) {
      const fetchUserData = async () => {
        try {
          const usersRef = collection(db, "users");
          const q = query(usersRef, where("email", "==", storedUser.email));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            const docSnap = querySnapshot.docs[0];
            // Combine the document ID with its data
            const data = { id: docSnap.id, ...docSnap.data() };
            setUserData(data);

            // After getting user data, fetch notifications and tasks if worker
            if (data.name && data.role === "Worker") {
              fetchNotifications(data.name);
              fetchWorkerTasks(data.name);
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

  // Fetch tasks for worker
  const fetchWorkerTasks = async (userName) => {
    try {
      // Fetch worker's tasks from the taskWorker collection
      const tasksRef = collection(db, "taskWorker", userName, "tasks");
      const tasksQuery = query(tasksRef);
      const querySnapshot = await getDocs(tasksQuery);

      const tasksData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setTasks(tasksData);
    } catch (error) {
      console.error("Error fetching worker tasks:", error);
    }
  };

  // Fetch notifications for the user
  const fetchNotifications = async (userName) => {
    try {
      const notificationsRef = collection(
        db,
        "notificationWorker",
        userName,
        "notifications"
      );
      const q = query(
        notificationsRef,
        orderBy("timestamp", "desc"),
        limit(10) // Limit to last 10 notifications
      );

      const querySnapshot = await getDocs(q);
      const notificationData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        // Convert Firestore timestamp to JS Date
        timestamp:
          doc.data().timestamp instanceof Timestamp
            ? doc.data().timestamp.toDate()
            : new Date(doc.data().timestamp),
      }));

      setNotifications(notificationData);

      // Count unread notifications
      const unreadCount = notificationData.filter(
        (notif) => !notif.read
      ).length;
      setNotificationCount(unreadCount);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  // Mark a notification as read
  const markNotificationAsRead = async (notificationId) => {
    try {
      if (!userData || !userData.name) return;

      const notificationRef = doc(
        db,
        "notificationWorker",
        userData.name,
        "notifications",
        notificationId
      );
      await updateDoc(notificationRef, { read: true });

      // Update local state
      setNotifications(
        notifications.map((notif) =>
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );

      // Update unread count
      setNotificationCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  // Mark all notifications as read
  const markAllNotificationsAsRead = async () => {
    try {
      if (!userData || !userData.name) return;

      const unreadNotifications = notifications.filter((notif) => !notif.read);

      // Update each notification in Firestore
      for (const notif of unreadNotifications) {
        const notificationRef = doc(
          db,
          "notificationWorker",
          userData.name,
          "notifications",
          notif.id
        );
        await updateDoc(notificationRef, { read: true });
      }

      // Update local state
      setNotifications(
        notifications.map((notif) => ({ ...notif, read: true }))
      );
      setNotificationCount(0);
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  // Format notification time
  const formatNotificationTime = (timestamp) => {
    if (!timestamp) return "";

    const now = new Date();
    const diff = (now - timestamp) / 1000; // difference in seconds

    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;

    return timestamp.toLocaleDateString();
  };

  // Navigate to task details
  const navigateToTasks = () => {
    navigate("/workerTasksPage");
    setShowNotifications(false);
  };

  // When logging out, update Firestore (set isactive to "Inactive") then clear local storage and navigate home.
  const handleLogout = async () => {
    try {
      if (userData && userData.id) {
        const userDocRef = doc(db, "users", userData.id);
        await updateDoc(userDocRef, { isactive: "Inactive" });
        console.log("User status set to Inactive in Firestore");

        // Optionally update local storage to reflect the change
        const updatedUser = { ...userData, isactive: "Inactive" };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        console.log("Local storage updated with Inactive status");
      }
    } catch (error) {
      console.error("Error updating isactive field:", error);
    }

    localStorage.removeItem("user");
    navigate("/");
  };

  const handleDashboardClick = () => {
    navigate("/userPage");
    setIsMobileMenuOpen(false);
  };

  const handleContactClick = () => {
    navigate("/contactUs");
    setIsMobileMenuOpen(false);
  };

  const handleWeatherClick = () => {
    navigate("/weatherPage");
    setIsMobileMenuOpen(false);
  };

  const handleTasksClick = () => {
    navigate("/workerTasksPage");
    setIsMobileMenuOpen(false);
  };

  // New handlers for additional navigation options
  const handleSensorsClick = () => {
    navigate("/sensors");
    setIsMobileMenuOpen(false);
  };

  const handleSensorAnalyticsClick = () => {
    navigate("/sensorAnalytics");
    setIsMobileMenuOpen(false);
  };

  const handleRobotControllerClick = () => {
    navigate("/robotController");
    setIsMobileMenuOpen(false);
  };

  const handleFarmerAssistantClick = () => {
    navigate("/geminichat");
    setIsMobileMenuOpen(false);
  };

  // Add handlers for Smart Farm Advisor and Plant Health Analyzer
  const handleIrrigationClick = () => {
    navigate("/irrigation");
    setIsMobileMenuOpen(false);
  };

  const handlePlantAnalyzerClick = () => {
    navigate("/GeminiImageAnalyzer");
    setIsMobileMenuOpen(false);
  };

  // Add handler for Heatmap button
  const handleHeatmapClick = () => {
    navigate("/SpatialModelDashboard");
    setIsMobileMenuOpen(false);
  };

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
  };

  // Get task counts by status
  const pendingTasks = tasks.filter((task) => task.status === "pending").length;
  const inProgressTasks = tasks.filter(
    (task) => task.status === "in-progress"
  ).length;
  const completedTasks = tasks.filter(
    (task) => task.status === "completed"
  ).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-sm px-4 py-4 md:px-6">
        <div className="flex justify-between items-center">
          {/* Sidebar Toggle and Smart Farm Text */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden mr-2"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
            <Leaf className="text-green-600 h-6 w-6" />
            <span className="text-xl font-semibold">Smart Farm</span>
          </div>

          {/* Notification and Logout */}
          <div className="flex items-center space-x-4">
            {userData && userData.role === "Worker" && (
              <div className="relative md:mr-4">
                <button
                  onClick={toggleNotifications}
                  className="relative focus:outline-none"
                >
                  <Bell className="h-6 w-6 text-gray-600 hover:text-gray-900" />
                  {notificationCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                      {notificationCount > 9 ? "9+" : notificationCount}
                    </span>
                  )}
                </button>

                {/* Notification Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg z-50">
                    <div className="p-3 border-b border-gray-200 flex items-center justify-between">
                      <h3 className="text-sm font-semibold">Notifications</h3>
                      {notificationCount > 0 && (
                        <button
                          onClick={markAllNotificationsAsRead}
                          className="text-xs text-green-600 hover:text-green-800"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length > 0 ? (
                        notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                              !notification.read ? "bg-green-50" : ""
                            }`}
                            onClick={() => {
                              if (!notification.read) {
                                markNotificationAsRead(notification.id);
                              }
                              if (notification.message.includes("task")) {
                                navigateToTasks();
                              }
                            }}
                          >
                            <div className="flex items-start">
                              <div className="flex-shrink-0 mr-2">
                                <ClipboardList className="h-5 w-5 text-green-600" />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm text-gray-800">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {formatNotificationTime(
                                    notification.timestamp
                                  )}
                                </p>
                              </div>
                              {!notification.read && (
                                <div className="flex-shrink-0 ml-2">
                                  <div className="h-2 w-2 bg-green-600 rounded-full"></div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center text-gray-500">
                          No notifications
                        </div>
                      )}
                    </div>
                    <div className="p-2 border-t border-gray-200">
                      <button
                        onClick={navigateToTasks}
                        className="w-full text-center text-xs text-green-600 hover:text-green-800 py-1"
                      >
                        View all tasks
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* Desktop Logout Button */}
            <button
              onClick={handleLogout}
              className="hidden md:flex items-center justify-center space-x-2 bg-green-600 text-white px-8 py-2.5 rounded-full font-medium hover:bg-green-700 hover:shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div
            className="bg-white w-3/4 h-full shadow-lg absolute left-0 top-0 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <div className="flex justify-end mb-6">
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-gray-600 hover:text-gray-900"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <nav className="space-y-2">
              <button
                onClick={handleDashboardClick}
                className="w-full flex items-center space-x-2 text-green-600 bg-green-50 px-4 py-2 rounded-md"
              >
                <LayoutDashboard className="h-5 w-5" />
                <span>Dashboard</span>
              </button>
              {userData && userData.role === "Worker" && (
                <button
                  onClick={handleTasksClick}
                  className="w-full flex items-center space-x-2 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-md"
                >
                  <ClipboardList className="h-5 w-5" />
                  <span>Tasks</span>
                </button>
              )}
              {/* New buttons for mobile menu */}
              <button
                onClick={handleSensorsClick}
                className="w-full flex items-center space-x-2 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-md"
              >
                <Thermometer className="h-5 w-5" />
                <span>Sensors</span>
              </button>
              <button
                onClick={handleSensorAnalyticsClick}
                className="w-full flex items-center space-x-2 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-md"
              >
                <BarChart className="h-5 w-5" />
                <span>Sensor Analytics</span>
              </button>
              <button
                onClick={handleHeatmapClick}
                className="w-full flex items-center space-x-2 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-md"
              >
                <Map className="h-5 w-5" />
                <span>Heatmap</span>
              </button>
              <button
                onClick={handleIrrigationClick}
                className="w-full flex items-center space-x-2 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-md"
              >
                <Droplets className="h-5 w-5" />
                <span>Smart Farm Advisor</span>
              </button>
              <button
                onClick={handleRobotControllerClick}
                className="w-full flex items-center space-x-2 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-md"
              >
                <Bot className="h-5 w-5" />
                <span>Robot Controller</span>
              </button>
              <button
                onClick={handleFarmerAssistantClick}
                className="w-full flex items-center space-x-2 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-md"
              >
                <Lightbulb className="h-5 w-5" />
                <span>Farmer Assistant</span>
              </button>
              <button
                onClick={handlePlantAnalyzerClick}
                className="w-full flex items-center space-x-2 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-md"
              >
                <Flower className="h-5 w-5" />
                <span className="whitespace-nowrap">Plant Health Analyzer</span>
              </button>
              <button
                onClick={handleWeatherClick}
                className="w-full flex items-center space-x-2 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-md"
              >
                <Cloud className="h-5 w-5" />
                <span>Weather</span>
              </button>
              <button
                onClick={handleContactClick}
                className="w-full flex items-center space-x-2 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-md"
              >
                <MessageSquare className="h-5 w-5" />
                <span>Contact Us</span>
              </button>
              {/* Mobile Logout Button */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center space-x-2 bg-green-600 text-white px-8 py-2.5 rounded-full font-medium hover:bg-green-700 hover:shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </nav>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row">
        {/* Sidebar - Hidden on mobile, visible on md screens and up */}
        <aside className="hidden md:block w-64 bg-white h-screen shadow-sm p-6">
          <div className="text-sm text-gray-500 mb-4">NAVIGATION</div>
          <nav className="space-y-2">
            <button
              onClick={handleDashboardClick}
              className="w-full flex items-center space-x-2 text-green-600 bg-green-50 px-4 py-2 rounded-md"
            >
              <LayoutDashboard className="h-5 w-5" />
              <span>Dashboard</span>
            </button>
            {userData && userData.role === "Worker" && (
              <button
                onClick={handleTasksClick}
                className="w-full flex items-center space-x-2 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-md"
              >
                <ClipboardList className="h-5 w-5" />
                <span>Tasks</span>
              </button>
            )}
            {/* New buttons for desktop sidebar */}
            <button
              onClick={handleSensorsClick}
              className="w-full flex items-center space-x-2 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-md"
            >
              <Thermometer className="h-5 w-5" />
              <span>Sensors</span>
            </button>
            <button
              onClick={handleSensorAnalyticsClick}
              className="w-full flex items-center space-x-2 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-md"
            >
              <BarChart className="h-5 w-5" />
              <span>Sensor Analytics</span>
            </button>
            <button
              onClick={handleHeatmapClick}
              className="w-full flex items-center space-x-2 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-md"
            >
              <Map className="h-5 w-5" />
              <span>Heatmap</span>
            </button>
            <button
              onClick={handleIrrigationClick}
              className="w-full flex items-center space-x-2 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-md"
            >
              <Droplets className="h-5 w-5" />
              <span>Smart Farm Advisor</span>
            </button>
            <button
              onClick={handleRobotControllerClick}
              className="w-full flex items-center space-x-2 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-md"
            >
              <Bot className="h-5 w-5" />
              <span>Robot Controller</span>
            </button>
            <button
              onClick={handleFarmerAssistantClick}
              className="w-full flex items-center space-x-2 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-md"
            >
              <Lightbulb className="h-5 w-5" />
              <span>Farmer Assistant</span>
            </button>
            <button
              onClick={handlePlantAnalyzerClick}
              className="w-full flex items-center space-x-2 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-md"
            >
              <Flower className="h-5 w-5" />
              <span className="whitespace-nowrap">Plant Health Analyzer</span>
            </button>
            <button
              onClick={handleWeatherClick}
              className="w-full flex items-center space-x-2 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-md"
            >
              <Cloud className="h-5 w-5" />
              <span>Weather</span>
            </button>
            <button
              onClick={handleContactClick}
              className="w-full flex items-center space-x-2 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-md"
            >
              <MessageSquare className="h-5 w-5" />
              <span>Contact Us</span>
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6">
          {/* Profile Section */}
          <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 mb-6">
            <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-x-6">
              {/* Profile Image */}
              <div className="relative">
                {userData && userData.photo ? (
                  <img
                    src={userData.photo}
                    alt="Profile"
                    className="w-32 h-32 rounded-full object-cover border-4 border-green-100"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-gray-100 border-4 border-green-100 flex items-center justify-center">
                    <span className="text-4xl text-green-600">
                      {userData && userData.name ? userData.name[0] : "U"}
                    </span>
                  </div>
                )}
                <div className="absolute bottom-0 right-0 w-5 h-5 bg-green-500 rounded-full border-2 border-white"></div>
              </div>
              {/* User Details */}
              <div className="text-center md:text-left">
                <h1 className="text-2xl font-bold text-gray-900">
                  {userData ? userData.name : "Loading..."}
                </h1>
                <p className="text-gray-600 mb-4">
                  {userData ? userData.role : ""}
                </p>
                <div className="flex flex-col md:flex-row items-center space-y-2 md:space-x-6 text-gray-600">
                  <span>{userData ? userData.email : ""}</span>
                  <span>{userData ? userData.numberphone : ""}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Environment Monitoring Section */}
          <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Environment Monitoring
              </h2>
              <button
                onClick={() => navigate("/sensors")}
                className="text-green-600 text-sm hover:text-green-800 flex items-center"
              >
                View Details <ArrowRight className="h-4 w-4 ml-1" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {/* Temperature */}
              <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                <Thermometer className="h-8 w-8 text-red-500" />
                <div className="text-lg font-medium text-gray-800">
                  Temperature
                </div>
              </div>

              {/* Light */}
              <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                <Sun className="h-8 w-8 text-yellow-500" />
                <div className="text-lg font-medium text-gray-800">Light</div>
              </div>

              {/* Soil Moisture */}
              <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                <Sprout className="h-8 w-8 text-green-500" />
                <div className="text-lg font-medium text-gray-800">
                  Soil Moisture
                </div>
              </div>

              {/* Air Humidity */}
              <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                <Droplets className="h-8 w-8 text-blue-500" />
                <div className="text-lg font-medium text-gray-800">
                  Air Humidity
                </div>
              </div>

              {/* Air Pressure */}
              <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                <Gauge className="h-8 w-8 text-purple-500" />
                <div className="text-lg font-medium text-gray-800">
                  Air Pressure
                </div>
              </div>
            </div>
          </div>

          {/* Plant Health Tools Section - NEW SECTION ADDED */}
          <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Plant Health Tools
              </h2>
              <button
                onClick={handlePlantAnalyzerClick}
                className="text-green-600 text-sm hover:text-green-800 flex items-center"
              >
                Open Analyzer <ArrowRight className="h-4 w-4 ml-1" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Plant Health Analyzer Card */}
              <div
                onClick={handlePlantAnalyzerClick}
                className="bg-green-50 rounded-lg p-4 flex items-start space-x-4 cursor-pointer hover:bg-green-100 transition-colors"
              >
                <Flower className="h-10 w-10 text-green-600 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">
                    Plant Health Analyzer
                  </h3>
                  <p className="text-sm text-gray-600">
                    Upload plant photos to diagnose issues, assess watering
                    needs, and get care recommendations
                  </p>
                </div>
              </div>

              {/* Smart Farm Advisor Card */}
              <div
                onClick={handleIrrigationClick}
                className="bg-blue-50 rounded-lg p-4 flex items-start space-x-4 cursor-pointer hover:bg-blue-100 transition-colors"
              >
                <Droplets className="h-10 w-10 text-blue-600 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">
                    Smart Farm Advisor
                  </h3>
                  <p className="text-sm text-gray-600">
                    Get AI-powered recommendations based on sensor data for
                    optimal plant care
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Task Summary Section - Only for Workers */}
          {userData && userData.role === "Worker" && (
            <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  Task Summary
                </h2>
                <button
                  onClick={handleTasksClick}
                  className="text-green-600 text-sm hover:text-green-800 flex items-center"
                >
                  View All Tasks <ArrowRight className="h-4 w-4 ml-1" />
                </button>
              </div>

              {/* Task Count Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* Pending Tasks Box */}
                <div className="bg-yellow-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-700 font-medium">
                        Pending Tasks
                      </p>
                      <p className="text-4xl font-bold text-yellow-700">
                        {pendingTasks}
                      </p>
                    </div>
                    <Clock className="h-12 w-12 text-yellow-300" />
                  </div>
                </div>

                {/* In Progress Box */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-700 font-medium">
                        In Progress
                      </p>
                      <p className="text-4xl font-bold text-blue-700">
                        {inProgressTasks}
                      </p>
                    </div>
                    <AlertCircle className="h-12 w-12 text-blue-300" />
                  </div>
                </div>

                {/* Completed Box */}
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-700 font-medium">
                        Completed
                      </p>
                      <p className="text-4xl font-bold text-green-700">
                        {completedTasks}
                      </p>
                    </div>
                    <Check className="h-12 w-12 text-green-300" />
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="mt-6">
                <h3 className="text-md font-semibold text-gray-800 mb-3">
                  Recent Activity
                </h3>
                <div className="space-y-2">
                  {loading ? (
                    <p className="text-gray-500 text-sm">
                      Loading recent activity...
                    </p>
                  ) : notifications.length > 0 ? (
                    notifications.slice(0, 5).map((notification) => (
                      <div
                        key={notification.id}
                        className="flex items-start p-2 rounded-md hover:bg-gray-50 cursor-pointer"
                        onClick={() => {
                          if (!notification.read) {
                            markNotificationAsRead(notification.id);
                          }
                          navigateToTasks();
                        }}
                      >
                        <ClipboardList className="h-5 w-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-800">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatNotificationTime(notification.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">No recent activity</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default UserPage;
