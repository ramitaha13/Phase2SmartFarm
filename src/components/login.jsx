import React, { useState } from "react";
import { Leaf, Eye, EyeOff } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); // Clear any previous errors

    try {
      // Query Firestore for the user with the given email
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", email));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError(
          "No account found with this email. Please check your email address."
        );
        return;
      }

      let validUser = false;
      // Use a for...of loop to allow using await for updateDoc
      for (const docSnap of querySnapshot.docs) {
        const userData = docSnap.data();
        if (userData.password === password) {
          validUser = true;
          // Update the isactive field to "Active"
          await updateDoc(doc(db, "users", docSnap.id), { isactive: "Active" });

          // Save the user's name, email, and role to local storage
          localStorage.setItem(
            "user",
            JSON.stringify({
              name: userData.name,
              email: userData.email,
              role: userData.role,
            })
          );

          // Navigate based on the user's role
          if (userData.role === "Manager") {
            navigate("/managerPage");
          } else if (userData.role === "Worker") {
            navigate("/userPage");
          } else {
            setError(
              "Invalid role assigned to this account. Please contact support."
            );
          }
          break;
        }
      }

      if (!validUser) {
        setError("Incorrect password. Please try again.");
      }
    } catch (error) {
      console.error("Error during login:", error);
      setError("Login failed. Please try again later.");
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-6">
            <Leaf className="h-6 w-6 text-green-600" />
            <span className="text-xl font-semibold text-gray-900">
              Smart Farm
            </span>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900">
            Welcome Back!
          </h2>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 text-sm text-red-800 border border-red-300 rounded-lg bg-red-50">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Enter your email"
              required
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-green-600 text-white px-8 py-2.5 rounded-full font-medium hover:bg-green-700 hover:shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            Sign In
          </button>

          <Link
            to="/"
            className="block w-full text-center bg-white text-green-600 px-8 py-2.5 rounded-full font-medium hover:bg-green-50 hover:shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            Back to Home
          </Link>
        </form>
      </div>
    </div>
  );
};

export default Login;
