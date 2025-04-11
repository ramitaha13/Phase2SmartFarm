// ProtectedRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children }) => {
  // Attempt to read the "user" item from localStorage
  const userData = localStorage.getItem("user");

  // If "user" is missing in localStorage, the user is not logged in
  if (!userData) {
    return <Navigate to="/login" replace />;
  }

  // Parse the JSON string into an object
  const user = JSON.parse(userData);

  // If you want both "Manager" and "Worker" to have access:
  const allowedRoles = ["Manager", "Worker"];

  // Check if user's role is in the allowed list
  if (!allowedRoles.includes(user.role)) {
    // You can redirect to a "Not Authorized" page or back to login
    return <Navigate to="/unauthorized" replace />;
  }

  // If everything checks out, render the protected component
  return children;
};

export default ProtectedRoute;
