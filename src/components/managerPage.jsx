import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Leaf,
  LogOut,
  LayoutDashboard,
  Users,
  Thermometer,
  Droplets,
  Sun,
  Sprout,
  MessageSquare,
  Cloud,
  Menu,
  X,
  ClipboardList,
  Check,
  Clock,
  AlertCircle,
  ArrowRight,
  BarChart,
  Bot, // Changed Robot to Bot which is available in lucide-react
  Gauge,
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
} from "firebase/firestore";

const ManagerPage = () => {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);

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

            // Fetch tasks after user data is loaded
            if (data.role === "Manager") {
              fetchTasks();
              fetchRecentActivities();
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

  // Fetch all tasks for the manager
  const fetchTasks = async () => {
    try {
      const tasksRef = collection(db, "tasks");
      const q = query(tasksRef, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);

      const tasksData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setTasks(tasksData);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }
  };

  // Fetch recent activity across all workers
  const fetchRecentActivities = async () => {
    try {
      // First get all workers
      const workersRef = collection(db, "users");
      const workersQuery = query(workersRef, where("role", "==", "Worker"));
      const workersSnapshot = await getDocs(workersQuery);

      const workers = workersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // For each worker, get their recent notifications
      let allActivities = [];

      for (const worker of workers) {
        if (worker.name) {
          const notificationsRef = collection(
            db,
            "notificationWorker",
            worker.name,
            "notifications"
          );
          const q = query(
            notificationsRef,
            orderBy("timestamp", "desc"),
            limit(3)
          );
          const notificationsSnapshot = await getDocs(q);

          const workerActivities = notificationsSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            workerName: worker.name,
          }));

          allActivities = [...allActivities, ...workerActivities];
        }
      }

      // Sort by timestamp (most recent first) and limit to 6
      allActivities.sort((a, b) => {
        const timeA = a.timestamp
          ? a.timestamp.toDate?.() || new Date(a.timestamp)
          : new Date(0);
        const timeB = b.timestamp
          ? b.timestamp.toDate?.() || new Date(b.timestamp)
          : new Date(0);
        return timeB - timeA;
      });

      setRecentActivities(allActivities.slice(0, 6));
    } catch (error) {
      console.error("Error fetching recent activities:", error);
    }
  };

  // When logging out, update the Firestore document to set isactive to "Inactive"
  // then remove the user from local storage and navigate to home.
  const handleLogout = async () => {
    try {
      if (userData && userData.id) {
        const userDocRef = doc(db, "users", userData.id);
        await updateDoc(userDocRef, { isactive: "Inactive" });
        console.log("User status set to Inactive in Firestore");

        // Optionally update local storage
        const updatedUser = { ...userData, isactive: "Inactive" };
        localStorage.setItem("user", JSON.stringify(updatedUser));
      }
    } catch (error) {
      console.error("Error updating isactive field:", error);
    }
    localStorage.removeItem("user");
    navigate("/");
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

  const handleDashboardClick = () => {
    navigate("/managerPage");
    setIsMobileMenuOpen(false);
  };

  const handleUsersClick = () => {
    navigate("/usersControl");
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

  // Added handler for Tasks button
  const handleTasksClick = () => {
    navigate("/tasks");
    setIsMobileMenuOpen(false);
  };

  const handleSensorsClick = () => {
    navigate("/sensors");
    setIsMobileMenuOpen(false);
  };

  const handleIrrigationClick = () => {
    navigate("/irrigation");
    setIsMobileMenuOpen(false);
  };

  // Added handler for SensorAnalytics button
  const handleSensorAnalyticsClick = () => {
    navigate("/sensorAnalytics");
    setIsMobileMenuOpen(false);
  };

  // Add handler for robotController button
  const handleRobotControllerClick = () => {
    navigate("/robotController");
    setIsMobileMenuOpen(false);
  };

  // 1) If still loading, show a loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  // 2) If userData is null or role isn't "Manager", show no-permission message
  if (!userData || userData.role !== "Manager") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600 text-xl font-semibold">
          You do not have permission to view this page.
        </div>
      </div>
    );
  }

  // Calculate task statistics
  const pendingTasks = tasks.filter((task) => task.status === "pending").length;
  const inProgressTasks = tasks.filter(
    (task) => task.status === "in-progress"
  ).length;
  const completedTasks = tasks.filter(
    (task) => task.status === "completed"
  ).length;

  // 3) Otherwise, render the ManagerPage content
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

          {/* Logout Button */}
          <div>
            {/* Desktop Logout Button */}
            <button
              onClick={handleLogout}
              className="flex items-center justify-center space-x-2 bg-green-600 text-white px-8 py-2.5 rounded-full font-medium hover:bg-green-700 hover:shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
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
              <button
                onClick={handleUsersClick}
                className="w-full flex items-center space-x-2 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-md"
              >
                <Users className="h-5 w-5" />
                <span>Users</span>
              </button>
              {/* Added Tasks button to mobile menu */}
              <button
                onClick={handleTasksClick}
                className="w-full flex items-center space-x-2 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-md"
              >
                <ClipboardList className="h-5 w-5" />
                <span>Tasks</span>
              </button>
              <button
                onClick={handleSensorsClick}
                className="w-full flex items-center space-x-2 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-md"
              >
                <Thermometer className="h-5 w-5" />
                <span>Sensors</span>
              </button>
              {/* New SensorAnalytics button for mobile menu */}
              <button
                onClick={handleSensorAnalyticsClick}
                className="w-full flex items-center space-x-2 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-md"
              >
                <BarChart className="h-5 w-5" />
                <span>Sensor Analytics</span>
              </button>
              <button
                onClick={handleIrrigationClick}
                className="w-full flex items-center space-x-2 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-md"
              >
                <Droplets className="h-5 w-5" />
                <span>Irrigation Control</span>
              </button>
              {/* New Robot Controller button for mobile menu */}
              <button
                onClick={handleRobotControllerClick}
                className="w-full flex items-center space-x-2 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-md"
              >
                <Bot className="h-5 w-5" />
                <span>Robot Controller</span>
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
            <button
              onClick={handleUsersClick}
              className="w-full flex items-center space-x-2 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-md"
            >
              <Users className="h-5 w-5" />
              <span>Users</span>
            </button>
            {/* Added Tasks button to desktop sidebar */}
            <button
              onClick={handleTasksClick}
              className="w-full flex items-center space-x-2 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-md"
            >
              <ClipboardList className="h-5 w-5" />
              <span>Tasks</span>
            </button>
            <button
              onClick={handleSensorsClick}
              className="w-full flex items-center space-x-2 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-md"
            >
              <Thermometer className="h-5 w-5" />
              <span>Sensors</span>
            </button>
            {/* New SensorAnalytics button for desktop sidebar */}
            <button
              onClick={handleSensorAnalyticsClick}
              className="w-full flex items-center space-x-2 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-md"
            >
              <BarChart className="h-5 w-5" />
              <span>Sensor Analytics</span>
            </button>
            <button
              onClick={handleIrrigationClick}
              className="w-full flex items-center space-x-2 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-md"
            >
              <Droplets className="h-5 w-5" />
              <span>Irrigation Control</span>
            </button>
            {/* New Robot Controller button for desktop sidebar */}
            <button
              onClick={handleRobotControllerClick}
              className="w-full flex items-center space-x-2 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-md"
            >
              <Bot className="h-5 w-5" />
              <span>Robot Controller</span>
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

          {/* Environment Monitoring Section - UPDATED with Air Humidity and Pressure */}
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

              {/* Air Humidity - ADDED */}
              <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                <Droplets className="h-8 w-8 text-blue-500" />
                <div className="text-lg font-medium text-gray-800">
                  Air Humidity
                </div>
              </div>

              {/* Air Pressure - ADDED */}
              <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                <Gauge className="h-8 w-8 text-purple-500" />
                <div className="text-lg font-medium text-gray-800">
                  Air Pressure
                </div>
              </div>
            </div>
          </div>

          {/* Task Summary Section */}
          <div className="bg-white rounded-lg shadow-sm p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Task Summary</h2>
              <button
                onClick={handleTasksClick}
                className="text-green-600 text-sm hover:text-green-800 flex items-center"
              >
                Manage Tasks <ArrowRight className="h-4 w-4 ml-1" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Pending Tasks */}
              <div className="bg-yellow-50 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-yellow-700">
                    {loading ? "..." : pendingTasks}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-yellow-400" />
              </div>

              {/* In Progress */}
              <div className="bg-blue-50 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">In Progress</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {loading ? "..." : inProgressTasks}
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-blue-400" />
              </div>

              {/* Completed */}
              <div className="bg-green-50 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-green-700">
                    {loading ? "..." : completedTasks}
                  </p>
                </div>
                <Check className="h-8 w-8 text-green-400" />
              </div>
            </div>

            {/* Recent Worker Activities */}
            {recentActivities.length > 0 && (
              <div className="mt-6">
                <h3 className="text-md font-semibold text-gray-800 mb-3">
                  Recent Worker Activity
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {recentActivities.slice(0, 6).map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start p-2 rounded-md hover:bg-gray-50"
                    >
                      <ClipboardList className="h-5 w-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-800">
                          <span className="font-medium">
                            {activity.workerName || "Worker"}:{" "}
                          </span>
                          {activity.message}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatTimestamp(activity.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-center">
                  <button
                    onClick={handleTasksClick}
                    className="text-green-600 text-sm hover:text-green-800 transition-colors"
                  >
                    View All Tasks & Activities
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default ManagerPage;
