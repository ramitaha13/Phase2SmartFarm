import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import Home from "../src/components/home.jsx";
import Login from "../src/components/login.jsx";
import ManagerPage from "../src/components/managerPage.jsx";
import UsersControl from "../src/components/usersControl.jsx";
import ContactUs from "../src/components/contactUs.jsx";
import WeatherPage from "../src/components/weatherPage.jsx";
import AddNewUser from "../src/components/addNewUser.jsx";
import UserPage from "../src/components/userPage.jsx";
import EditUser from "../src/components/editUser.jsx";
import ProtectedRoute from "../src/components/ProtectedRoute.jsx";
import Tasks from "../src/components/tasks.jsx";
import WorkerTasksPage from "../src/components/workerTasksPage.jsx";
import Sensors from "../src/components/sensors.jsx";
import Irrigation from "../src/components/irrigation.jsx";
import SensorAnalytics from "../src/components/sensorAnalytics.jsx";
import RobotController from "../src/components/robotController.jsx";
import Farmerassistant from "../src/components/farmerassistant.jsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Home />,
  },
  {
    path: "*",
    element: <Home />,
  },
  {
    path: "/home",
    element: <Home />,
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/managerPage",
    element: (
      <ProtectedRoute>
        <ManagerPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/usersControl",
    element: (
      <ProtectedRoute>
        <UsersControl />
      </ProtectedRoute>
    ),
  },
  {
    path: "/contactUs",
    element: (
      <ProtectedRoute>
        <ContactUs />
      </ProtectedRoute>
    ),
  },
  {
    path: "/weatherPage",
    element: (
      <ProtectedRoute>
        <WeatherPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/addNewUser",
    element: (
      <ProtectedRoute>
        <AddNewUser />
      </ProtectedRoute>
    ),
  },
  {
    path: "/userPage",
    element: (
      <ProtectedRoute>
        <UserPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/edituser/:id",
    element: (
      <ProtectedRoute>
        <EditUser />
      </ProtectedRoute>
    ),
  },
  {
    path: "/tasks",
    element: (
      <ProtectedRoute>
        <Tasks />
      </ProtectedRoute>
    ),
  },
  {
    path: "/workerTasksPage",
    element: (
      <ProtectedRoute>
        <WorkerTasksPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/sensors",
    element: (
      <ProtectedRoute>
        <Sensors />
      </ProtectedRoute>
    ),
  },
  {
    path: "/irrigation",
    element: (
      <ProtectedRoute>
        <Irrigation />
      </ProtectedRoute>
    ),
  },
  {
    path: "/sensorAnalytics",
    element: (
      <ProtectedRoute>
        <SensorAnalytics />
      </ProtectedRoute>
    ),
  },
  {
    path: "/robotController",
    element: (
      <ProtectedRoute>
        <RobotController />
      </ProtectedRoute>
    ),
  },
  {
    path: "/farmerassistant",
    element: (
      <ProtectedRoute>
        <Farmerassistant />
      </ProtectedRoute>
    ),
  },
]);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
