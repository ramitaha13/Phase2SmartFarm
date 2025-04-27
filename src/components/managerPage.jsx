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
  Bot,
  Gauge,
  Lightbulb,
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

// Add custom CSS for the new logout button
const logoutButtonStyles = `
  .Btn {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    width: 45px;
    height: 45px;
    border-radius: 50px;
    border: none;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    transition-duration: .3s;
    box-shadow: 2px 2px 10px rgba(0, 0, 0, 0.13);
    background-color: rgb(220 38 38);
  }

  .sign {
    width: 100%;
    transition-duration: .3s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .sign svg {
    width: 17px;
    fill: white;
  }

  .text {
    position: absolute;
    right: 0%;
    width: 0%;
    opacity: 0;
    color: white;
    font-size: 1em;
    font-weight: 500;
    transition-duration: .3s;
  }

  .Btn:hover {
    width: 125px;
    transition-duration: .3s;
  }

  .Btn:hover .sign {
    width: 30%;
    transition-duration: .3s;
  }

  .Btn:hover .text {
    opacity: 1;
    width: 70%;
    transition-duration: .3s;
    padding-right: 15px;
  }

  .Btn:active {
    transform: translate(2px, 2px);
  }
`;

const ManagerPage = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);

  // Add the custom CSS to the document head
  useEffect(() => {
    const styleElement = document.createElement("style");
    styleElement.textContent = logoutButtonStyles;
    document.head.appendChild(styleElement);

    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

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
    setSidebarOpen(false);
  };

  const handleUsersClick = () => {
    navigate("/usersControl");
    setSidebarOpen(false);
  };

  const handleContactClick = () => {
    navigate("/contactUs");
    setSidebarOpen(false);
  };

  const handleWeatherClick = () => {
    navigate("/weatherPage");
    setSidebarOpen(false);
  };

  // Added handler for Tasks button
  const handleTasksClick = () => {
    navigate("/tasks");
    setSidebarOpen(false);
  };

  const handleSensorsClick = () => {
    navigate("/sensors");
    setSidebarOpen(false);
  };

  const handleIrrigationClick = () => {
    navigate("/irrigation");
    setSidebarOpen(false);
  };

  // Added handler for SensorAnalytics button
  const handleSensorAnalyticsClick = () => {
    navigate("/sensorAnalytics");
    setSidebarOpen(false);
  };

  // Add handler for robotController button
  const handleRobotControllerClick = () => {
    navigate("/robotController");
    setSidebarOpen(false);
  };

  // Add handler for Farmer Assistant button
  const handleFarmerAssistantClick = () => {
    navigate("/geminichat");
    setSidebarOpen(false);
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
      {/* Mobile Sidebar - Using fixed position */}
      <div
        className={`fixed md:hidden top-0 left-0 z-40 w-72 bg-white shadow-lg transform h-screen ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } transition-transform duration-300 ease-in-out`}
        style={{ height: "100vh" }}
      >
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-green-50">
          <h2 className="font-bold text-green-800">Smart Farm</h2>
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-gray-600 hover:text-gray-900"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-2">
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
        </div>
      </div>

      {/* Mobile sidebar overlay - Click to close */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Navigation Bar */}
      <nav className="bg-white shadow-sm px-4 py-4 md:px-6">
        <div className="flex justify-between items-center">
          {/* Sidebar Toggle and Smart Farm Text */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden mr-2"
            >
              {sidebarOpen ? (
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
            <button onClick={handleLogout} className="Btn">
              <div className="sign">
                <svg viewBox="0 0 512 512">
                  <path d="M377.9 105.9L500.7 228.7c7.2 7.2 11.3 17.1 11.3 27.3s-4.1 20.1-11.3 27.3L377.9 406.1c-6.4 6.4-15 9.9-24 9.9c-18.7 0-33.9-15.2-33.9-33.9l0-62.1-128 0c-17.7 0-32-14.3-32-32l0-64c0-17.7 14.3-32 32-32l128 0 0-62.1c0-18.7 15.2-33.9 33.9-33.9c9 0 17.6 3.6 24 9.9zM160 96L96 96c-17.7 0-32 14.3-32 32l0 256c0 17.7 14.3 32 32 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-64 0c-53 0-96-43-96-96L0 128C0 75 43 32 96 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32z"></path>
                </svg>
              </div>
              <div className="text">Logout</div>
            </button>
          </div>
        </div>
      </nav>

      <div className="flex flex-col md:flex-row">
        {/* Desktop Sidebar - Unchanged from original */}
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

        {/* Main Content - Unchanged from original */}
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
