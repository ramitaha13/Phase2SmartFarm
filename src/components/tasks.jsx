import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ClipboardList,
  Plus,
  Check,
  Clock,
  AlertCircle,
  Search,
  Filter,
  ChevronLeft,
  X,
  Trash2,
  Layers, // Added Layers icon for task count
} from "lucide-react";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  orderBy,
  Timestamp,
  setDoc,
  writeBatch,
  collectionGroup,
} from "firebase/firestore";

const TasksPage = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    assignedTo: "",
    dueDate: "",
    priority: "medium",
    status: "pending",
  });
  const [availableWorkers, setAvailableWorkers] = useState([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Task statistics
  const [taskStats, setTaskStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
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

            // If user is a manager, fetch all workers
            if (data.role === "Manager") {
              fetchWorkers();
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

  // Fetch tasks when userData is available
  useEffect(() => {
    if (userData) {
      fetchTasks();
    }
  }, [userData]);

  // Update task statistics whenever tasks change
  useEffect(() => {
    if (tasks.length > 0) {
      calculateTaskStats();
    }
  }, [tasks]);

  // Calculate task statistics
  const calculateTaskStats = () => {
    const pendingCount = tasks.filter(
      (task) => task.status === "pending"
    ).length;
    const inProgressCount = tasks.filter(
      (task) => task.status === "in-progress"
    ).length;
    const completedCount = tasks.filter(
      (task) => task.status === "completed"
    ).length;

    setTaskStats({
      total: tasks.length,
      pending: pendingCount,
      inProgress: inProgressCount,
      completed: completedCount,
    });
  };

  // Fetch workers (for manager to assign tasks)
  const fetchWorkers = async () => {
    try {
      const workersRef = collection(db, "users");
      const q = query(workersRef, where("role", "==", "Worker"));
      const querySnapshot = await getDocs(q);
      const workersData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAvailableWorkers(workersData);
    } catch (error) {
      console.error("Error fetching workers:", error);
    }
  };

  // Fetch tasks based on user role
  const fetchTasks = async () => {
    try {
      const tasksRef = collection(db, "tasks");
      let q;

      if (userData.role === "Manager") {
        // Managers can see all tasks
        q = query(tasksRef, orderBy("createdAt", "desc"));
      } else {
        // Workers only see tasks assigned to them
        q = query(
          tasksRef,
          where("assignedTo", "==", userData.id),
          orderBy("createdAt", "desc")
        );
      }

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

  // Create a notification for a worker
  const createWorkerNotification = async (workerId, workerName, message) => {
    try {
      // Create a notification document under the worker's notifications
      const notifRef = doc(
        collection(db, "notificationWorker", workerName, "notifications")
      );
      await setDoc(notifRef, {
        message: message,
        timestamp: Timestamp.now(),
        read: false,
        workerId: workerId,
        // Add task information to help identify related notifications
        relatedTask: taskToDelete ? taskToDelete.id : null,
      });
      console.log("Notification created for worker:", workerName);
    } catch (error) {
      console.error("Error creating worker notification:", error);
    }
  };

  // Save task to worker's task collection
  const saveTaskToWorker = async (taskId, taskData, workerName) => {
    try {
      // Save the task under the taskWorker collection with worker's name
      const taskRef = doc(db, "taskWorker", workerName, "tasks", taskId);
      await setDoc(taskRef, {
        ...taskData,
        taskId: taskId,
      });
      console.log("Task saved to worker collection:", workerName);
    } catch (error) {
      console.error("Error saving task to worker collection:", error);
    }
  };

  // Update task in worker's task collection
  const updateTaskInWorkerCollection = async (
    taskId,
    updatedData,
    workerName
  ) => {
    try {
      const taskRef = doc(db, "taskWorker", workerName, "tasks", taskId);
      await updateDoc(taskRef, updatedData);
      console.log("Task updated in worker collection:", workerName);
    } catch (error) {
      console.error("Error updating task in worker collection:", error);
    }
  };

  // Delete related notifications for a task
  const deleteRelatedNotifications = async (taskId, workerName) => {
    try {
      // We'll need to query for all notifications related to this task
      const notificationsRef = collection(
        db,
        "notificationWorker",
        workerName,
        "notifications"
      );

      // Check if notificationsRef exists
      const notificationsSnapshot = await getDocs(notificationsRef);

      // For each notification, check if it's related to the task
      const batch = writeBatch(db);
      let deletedCount = 0;

      notificationsSnapshot.forEach((notificationDoc) => {
        const notificationData = notificationDoc.data();
        // Check if this notification mentions the task title or is directly related
        if (
          (notificationData.relatedTask &&
            notificationData.relatedTask === taskId) ||
          (notificationData.message &&
            taskToDelete &&
            notificationData.message.includes(taskToDelete.title))
        ) {
          // Add to batch to delete
          batch.delete(notificationDoc.ref);
          deletedCount++;
        }
      });

      if (deletedCount > 0) {
        await batch.commit();
        console.log(
          `Deleted ${deletedCount} related notifications for worker: ${workerName}`
        );
      }
    } catch (error) {
      console.error("Error deleting related notifications:", error);
    }
  };

  // Delete task from all locations (comprehensive deletion)
  const deleteTaskCompletely = async (taskId, taskData) => {
    try {
      const batch = writeBatch(db);

      // 1. Delete from main tasks collection
      const mainTaskRef = doc(db, "tasks", taskId);
      batch.delete(mainTaskRef);

      // 2. If assigned to a worker, delete from their taskWorker collection
      if (taskData.assignedToName) {
        const workerTaskRef = doc(
          db,
          "taskWorker",
          taskData.assignedToName,
          "tasks",
          taskId
        );
        batch.delete(workerTaskRef);

        // Send a notification about deletion
        const notificationMessage = `Task "${taskData.title}" has been deleted by a manager`;
        await createWorkerNotification(
          taskData.assignedTo,
          taskData.assignedToName,
          notificationMessage
        );

        // Delete related notifications
        await deleteRelatedNotifications(taskId, taskData.assignedToName);
      }

      // 3. Check if there are any other workers who might have this task assigned
      // This is a safety measure in case task has been reassigned
      if (availableWorkers.length > 0) {
        for (const worker of availableWorkers) {
          // Skip the current assigned worker as we've already handled them
          if (worker.name !== taskData.assignedToName) {
            // Check if this worker has the task
            const potentialTaskRef = doc(
              db,
              "taskWorker",
              worker.name,
              "tasks",
              taskId
            );
            batch.delete(potentialTaskRef);

            // Also clean up any notifications for this worker related to this task
            await deleteRelatedNotifications(taskId, worker.name);
          }
        }
      }

      // Commit all the delete operations at once
      await batch.commit();

      console.log("Task deleted completely from all locations");

      return true;
    } catch (error) {
      console.error("Error deleting task completely:", error);
      return false;
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    try {
      const taskData = {
        ...newTask,
        createdBy: userData.id,
        createdAt: Timestamp.now(),
        createdByName: userData.name,
      };

      // Add task to Firestore
      const docRef = await addDoc(collection(db, "tasks"), taskData);

      // Save task to worker's task collection
      const selectedWorker = availableWorkers.find(
        (worker) => worker.id === newTask.assignedTo
      );

      if (selectedWorker) {
        // Save to taskWorker collection
        await saveTaskToWorker(docRef.id, taskData, selectedWorker.name);

        // Create notification for the assigned worker
        const notificationMessage = `You have been assigned a new task: "${newTask.title}" by ${userData.name}`;
        await createWorkerNotification(
          selectedWorker.id,
          selectedWorker.name,
          notificationMessage
        );
      }

      setShowAddTaskModal(false);
      setNewTask({
        title: "",
        description: "",
        assignedTo: "",
        dueDate: "",
        priority: "medium",
        status: "pending",
      });

      // Refresh tasks
      fetchTasks();
    } catch (error) {
      console.error("Error adding task:", error);
    }
  };

  const handleUpdateTaskStatus = async (taskId, newStatus) => {
    try {
      // Get the task details before updating
      const taskToUpdate = tasks.find((task) => task.id === taskId);

      // Update the task status
      const taskRef = doc(db, "tasks", taskId);
      await updateDoc(taskRef, { status: newStatus });

      // Update the task in worker's collection
      if (
        taskToUpdate &&
        taskToUpdate.assignedTo &&
        taskToUpdate.assignedToName
      ) {
        await updateTaskInWorkerCollection(
          taskId,
          { status: newStatus },
          taskToUpdate.assignedToName
        );

        // Create a notification for the worker
        let notificationMessage = "";

        if (newStatus === "in-progress") {
          notificationMessage = `Your task "${taskToUpdate.title}" has been marked as in progress`;
        } else if (newStatus === "completed") {
          notificationMessage = `Your task "${taskToUpdate.title}" has been marked as completed`;
        }

        if (notificationMessage) {
          await createWorkerNotification(
            taskToUpdate.assignedTo,
            taskToUpdate.assignedToName,
            notificationMessage
          );
        }
      }

      // Update local state to reflect changes
      setTasks(
        tasks.map((task) =>
          task.id === taskId ? { ...task, status: newStatus } : task
        )
      );
    } catch (error) {
      console.error("Error updating task status:", error);
    }
  };

  const handleDeleteClick = (task) => {
    setTaskToDelete(task);
    setShowDeleteConfirmModal(true);
  };

  const handleDeleteTask = async () => {
    if (!taskToDelete) return;

    try {
      // Delete the task from all locations (main collection, worker collections, and related notifications)
      const success = await deleteTaskCompletely(taskToDelete.id, taskToDelete);

      if (success) {
        // Update local state to remove the deleted task
        setTasks(tasks.filter((task) => task.id !== taskToDelete.id));
      }

      setShowDeleteConfirmModal(false);
      setTaskToDelete(null);
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  const handleBackClick = () => {
    navigate("/managerPage");
  };

  // Filtering functions
  const getFilteredTasks = () => {
    return tasks.filter((task) => {
      // Filter by status
      const statusMatch =
        filterStatus === "all" || task.status === filterStatus;

      // Filter by search query (title or description)
      const searchMatch =
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.description &&
          task.description.toLowerCase().includes(searchQuery.toLowerCase()));

      return statusMatch && searchMatch;
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

  // If still loading, show a loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  // If userData is null or role isn't "Manager" or "Worker", show no-permission message
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

  // Otherwise, render the TasksPage content
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
            {userData.role === "Manager" && (
              <button
                onClick={() => setShowAddTaskModal(true)}
                className="bg-green-600 text-white px-4 py-2.5 rounded-full font-medium hover:bg-green-700 hover:shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 flex items-center justify-center space-x-2"
              >
                <Plus className="h-5 w-5" />
                <span>Add New Task</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Task Management
        </h1>

        {/* Task Count Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {/* Total Tasks Card */}
          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-purple-500">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-full mr-4">
                <Layers className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">
                  Total Tasks
                </h3>
                <p className="text-2xl font-bold text-gray-900">
                  {taskStats.total}
                </p>
              </div>
            </div>
          </div>

          {/* Pending Tasks Card */}
          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-yellow-500">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 rounded-full mr-4">
                <Clock className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Pending</h3>
                <p className="text-2xl font-bold text-gray-900">
                  {taskStats.pending}
                </p>
              </div>
            </div>
          </div>

          {/* In Progress Tasks Card */}
          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-blue-500">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-full mr-4">
                <AlertCircle className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">
                  In Progress
                </h3>
                <p className="text-2xl font-bold text-gray-900">
                  {taskStats.inProgress}
                </p>
              </div>
            </div>
          </div>

          {/* Completed Tasks Card */}
          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-green-500">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-full mr-4">
                <Check className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Completed</h3>
                <p className="text-2xl font-bold text-gray-900">
                  {taskStats.completed}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-center sm:space-x-4 space-y-4 sm:space-y-0">
            {/* Search Box */}
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <Search className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
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
          </div>
        </div>

        {/* Tasks List */}
        <div className="bg-white rounded-lg shadow-sm p-4 md:p-6">
          <div className="mb-4">
            <div className="flex items-center">
              <ClipboardList className="h-6 w-6 text-green-600 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900">Tasks</h2>
            </div>
          </div>

          <div className="space-y-4">
            {getFilteredTasks().length > 0 ? (
              getFilteredTasks().map((task) => (
                <div
                  key={task.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-300"
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
                          <span className="font-medium mr-1">Due:</span>{" "}
                          {formatDate(task.dueDate)}
                        </div>
                        {task.assignedToName && (
                          <div className="flex items-center">
                            <span className="font-medium mr-1">
                              Assigned to:
                            </span>{" "}
                            {task.assignedToName}
                          </div>
                        )}
                        <div className="flex items-center">
                          <span className="font-medium mr-1">Created by:</span>{" "}
                          {task.createdByName}
                        </div>
                      </div>
                    </div>

                    {/* Task Actions */}
                    <div className="mt-4 md:mt-0 space-x-2 flex items-center">
                      {task.status !== "completed" && (
                        <>
                          {task.status === "pending" &&
                            userData.role === "Worker" && (
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
                          {userData.role === "Manager" &&
                            task.status === "pending" && (
                              <button
                                onClick={() =>
                                  handleUpdateTaskStatus(task.id, "in-progress")
                                }
                                className="bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-300"
                              >
                                Mark In Progress
                              </button>
                            )}
                        </>
                      )}

                      {/* Delete Task Button - Only visible to managers */}
                      {userData.role === "Manager" && (
                        <button
                          onClick={() => handleDeleteClick(task)}
                          className="text-red-500 hover:text-red-700 p-1.5 rounded-md hover:bg-red-50"
                          title="Delete Task"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-gray-500">
                No tasks found.{" "}
                {userData.role === "Manager"
                  ? "Create a new task to get started."
                  : "Check back later for assigned tasks."}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Task Modal */}
      {showAddTaskModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Add New Task</h2>
              <button onClick={() => setShowAddTaskModal(false)}>
                <X className="h-6 w-6 text-gray-500 hover:text-gray-700" />
              </button>
            </div>

            <form onSubmit={handleAddTask}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Task Title*
                  </label>
                  <input
                    type="text"
                    value={newTask.title}
                    onChange={(e) =>
                      setNewTask({ ...newTask, title: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newTask.description}
                    onChange={(e) =>
                      setNewTask({ ...newTask, description: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 h-24"
                  ></textarea>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assign To*
                  </label>
                  <select
                    value={newTask.assignedTo}
                    onChange={(e) => {
                      const selectedWorker = availableWorkers.find(
                        (worker) => worker.id === e.target.value
                      );
                      setNewTask({
                        ...newTask,
                        assignedTo: e.target.value,
                        assignedToName: selectedWorker
                          ? selectedWorker.name
                          : "",
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  >
                    <option value="">Select Worker</option>
                    {availableWorkers.map((worker) => (
                      <option key={worker.id} value={worker.id}>
                        {worker.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date*
                  </label>
                  <input
                    type="date"
                    value={newTask.dueDate}
                    onChange={(e) =>
                      setNewTask({ ...newTask, dueDate: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={newTask.priority}
                    onChange={(e) =>
                      setNewTask({ ...newTask, priority: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div className="flex items-center justify-end space-x-4 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowAddTaskModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-green-600 text-white px-4 py-2 rounded-md font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                  >
                    Create Task
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Delete Task</h2>
              <button onClick={() => setShowDeleteConfirmModal(false)}>
                <X className="h-6 w-6 text-gray-500 hover:text-gray-700" />
              </button>
            </div>

            <p className="text-gray-600 mb-6">
              Are you sure you want to delete the task "{taskToDelete?.title}"?
              This action cannot be undone.
            </p>

            <div className="flex items-center justify-end space-x-4">
              <button
                onClick={() => setShowDeleteConfirmModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTask}
                className="bg-red-600 text-white px-4 py-2 rounded-md font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Delete Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TasksPage;
