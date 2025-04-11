import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ClipboardList,
  Check,
  Clock,
  AlertCircle,
  Search,
  Filter,
  ChevronLeft,
  Calendar,
  Tag,
} from "lucide-react";
import { db } from "../firebase";
import {
  collection,
  query,
  getDocs,
  updateDoc,
  doc,
  orderBy,
  Timestamp,
  where,
} from "firebase/firestore";

const WorkerTasksPage = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState("all");

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

  // Fetch tasks when userData is available
  useEffect(() => {
    if (userData && userData.name) {
      fetchWorkerTasks();
    }
  }, [userData]);

  // Fetch worker's tasks from their taskWorker collection
  const fetchWorkerTasks = async () => {
    try {
      // Get tasks from the worker's specific collection
      const tasksRef = collection(db, "taskWorker", userData.name, "tasks");
      const q = query(tasksRef);
      const querySnapshot = await getDocs(q);

      const tasksData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      console.log("Fetched worker tasks:", tasksData.length);
      setTasks(tasksData);
    } catch (error) {
      console.error("Error fetching worker tasks:", error);
      setTasks([]);
    }
  };

  const handleUpdateTaskStatus = async (taskId, newStatus) => {
    try {
      // Get the task details
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      // Update the task in the main tasks collection
      const mainTaskRef = doc(db, "tasks", taskId);
      await updateDoc(mainTaskRef, { status: newStatus });

      // Update the task in the worker's collection
      const workerTaskRef = doc(
        db,
        "taskWorker",
        userData.name,
        "tasks",
        taskId
      );
      await updateDoc(workerTaskRef, { status: newStatus });

      // Update local state to reflect changes
      setTasks(
        tasks.map((task) =>
          task.id === taskId ? { ...task, status: newStatus } : task
        )
      );

      console.log(`Task ${taskId} updated to status: ${newStatus}`);
    } catch (error) {
      console.error("Error updating task status:", error);
    }
  };

  const handleBackClick = () => {
    navigate("/userPage"); // Adjust this route as needed
  };

  // Filtering functions
  const getFilteredTasks = () => {
    return tasks.filter((task) => {
      // Filter by status
      const statusMatch =
        filterStatus === "all" || task.status === filterStatus;

      // Filter by priority
      const priorityMatch =
        filterPriority === "all" || task.priority === filterPriority;

      // Filter by search query (title or description)
      const searchMatch =
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.description &&
          task.description.toLowerCase().includes(searchQuery.toLowerCase()));

      return statusMatch && priorityMatch && searchMatch;
    });
  };

  // Task status badge color mapping
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in-progress":
        return "bg-blue-100 text-blue-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Priority indicator color mapping
  const getPriorityClass = (priority) => {
    switch (priority) {
      case "high":
        return "text-red-500";
      case "medium":
        return "text-orange-500";
      case "low":
        return "text-green-500";
      default:
        return "text-gray-500";
    }
  };

  // Format date for display
  const formatDate = (timestamp) => {
    if (!timestamp) return "";

    const date =
      timestamp instanceof Timestamp ? timestamp.toDate() : new Date(timestamp);

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Calculate if a task is overdue
  const isTaskOverdue = (task) => {
    if (!task.dueDate || task.status === "completed") return false;

    const dueDate =
      task.dueDate instanceof Timestamp
        ? task.dueDate.toDate()
        : new Date(task.dueDate);

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day for fair comparison

    return dueDate < today;
  };

  // If still loading, show a loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  // If userData is null or role isn't "Worker", show no-permission message
  if (!userData || userData.role !== "Worker") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600 text-xl font-semibold">
          You do not have permission to view this page.
        </div>
      </div>
    );
  }

  // Otherwise, render the WorkerTasksPage content
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
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
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Tasks</h1>

        {/* Stats and Status Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Tasks</p>
              <p className="text-2xl font-bold">{tasks.length}</p>
            </div>
            <ClipboardList className="h-8 w-8 text-gray-400" />
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-2xl font-bold">
                {tasks.filter((task) => task.status === "pending").length}
              </p>
            </div>
            <Clock className="h-8 w-8 text-yellow-400" />
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">In Progress</p>
              <p className="text-2xl font-bold">
                {tasks.filter((task) => task.status === "in-progress").length}
              </p>
            </div>
            <AlertCircle className="h-8 w-8 text-blue-400" />
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Completed</p>
              <p className="text-2xl font-bold">
                {tasks.filter((task) => task.status === "completed").length}
              </p>
            </div>
            <Check className="h-8 w-8 text-green-400" />
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-center sm:space-x-4 space-y-4 sm:space-y-0">
            {/* Search Box */}
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>

            {/* Status Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-gray-500" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div className="flex items-center space-x-2">
              <Tag className="h-5 w-5 text-gray-500" />
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="all">All Priorities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tasks List */}
        <div className="bg-white rounded-lg shadow-sm p-4 md:p-6">
          <div className="mb-4">
            <div className="flex items-center">
              <ClipboardList className="h-6 w-6 text-green-600 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900">
                Assigned Tasks
              </h2>
            </div>
          </div>

          <div className="space-y-4">
            {getFilteredTasks().length > 0 ? (
              getFilteredTasks().map((task) => (
                <div
                  key={task.id}
                  className={`border ${
                    isTaskOverdue(task)
                      ? "border-red-200 bg-red-50"
                      : "border-gray-200"
                  } rounded-lg p-4 hover:shadow-md transition-shadow duration-300`}
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div className="flex-1">
                      <div className="flex items-start space-x-2">
                        <h3 className="font-semibold text-lg">{task.title}</h3>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(
                            task.status
                          )}`}
                        >
                          {task.status === "pending" && (
                            <Clock className="h-3 w-3 mr-1" />
                          )}
                          {task.status === "in-progress" && (
                            <AlertCircle className="h-3 w-3 mr-1" />
                          )}
                          {task.status === "completed" && (
                            <Check className="h-3 w-3 mr-1" />
                          )}
                          {task.status.charAt(0).toUpperCase() +
                            task.status.slice(1).replace("-", " ")}
                        </span>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityClass(
                            task.priority
                          )}`}
                        >
                          {task.priority.charAt(0).toUpperCase() +
                            task.priority.slice(1)}{" "}
                          Priority
                        </span>
                      </div>
                      <p className="text-gray-600 mt-2">{task.description}</p>

                      <div className="flex flex-col md:flex-row md:items-center text-sm text-gray-500 mt-3 space-y-1 md:space-y-0 md:space-x-4">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          <span className="font-medium mr-1">Due:</span>{" "}
                          <span
                            className={
                              isTaskOverdue(task) && task.status !== "completed"
                                ? "text-red-600 font-semibold"
                                : ""
                            }
                          >
                            {formatDate(task.dueDate)}
                            {isTaskOverdue(task) &&
                              task.status !== "completed" &&
                              " (Overdue)"}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <span className="font-medium mr-1">Created by:</span>{" "}
                          {task.createdByName}
                        </div>
                      </div>
                    </div>

                    {/* Task Actions */}
                    <div className="mt-4 md:mt-0 space-x-2 flex items-center">
                      {task.status === "pending" && (
                        <button
                          onClick={() =>
                            handleUpdateTaskStatus(task.id, "in-progress")
                          }
                          className="bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-300"
                        >
                          Start Task
                        </button>
                      )}
                      {task.status === "in-progress" && (
                        <button
                          onClick={() =>
                            handleUpdateTaskStatus(task.id, "completed")
                          }
                          className="bg-green-100 text-green-700 hover:bg-green-200 px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-300"
                        >
                          Complete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-gray-500">
                No tasks found. Check back later for assigned tasks.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkerTasksPage;
