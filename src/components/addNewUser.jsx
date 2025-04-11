import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  Mail,
  UserCog,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  Camera,
  Phone,
  CheckCircle2,
} from "lucide-react";
import { db } from "../firebase";
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";
import successSound from "../assets/1.mp3";

// Notification Component
const Notification = ({ message, isVisible, onClose }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 flex items-center bg-white border-l-4 border-green-500 py-2 px-3 shadow-md rounded-md transform transition-transform duration-300 ease-in-out animate-slide-in">
      <div className="flex items-center">
        <div className="text-green-500">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <div className="ml-3">
          <p className="text-sm font-medium text-gray-900">{message}</p>
        </div>
      </div>
    </div>
  );
};

const AddNewUser = () => {
  const navigate = useNavigate();
  const [showNotification, setShowNotification] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    numberphone: "",
    role: "",
    password: "",
    confirmPassword: "",
    isactive: "Inactive",
    photo: null,
  });
  const [passwordError, setPasswordError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [showPassword, setShowPassword] = useState({
    password: false,
    confirmPassword: false,
  });
  const [photoPreview, setPhotoPreview] = useState(null);

  // Check localStorage for user data and role
  const storedUser = JSON.parse(localStorage.getItem("user"));
  if (!storedUser || storedUser.role !== "Manager") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600 text-xl font-semibold">
          You do not have permission to view this page.
        </p>
      </div>
    );
  }

  // Password Generation Function
  const generatePassword = () => {
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const numbers = "0123456789";
    const specialChars = "!@#$%^&*()_+-=[]{}|;:,.<>?";

    const getRandomChar = (chars) =>
      chars[Math.floor(Math.random() * chars.length)];

    const password = [
      getRandomChar(lowercase),
      getRandomChar(uppercase),
      getRandomChar(numbers),
      getRandomChar(specialChars),
      ...Array(4)
        .fill()
        .map(() =>
          getRandomChar(lowercase + uppercase + numbers + specialChars)
        ),
    ]
      .sort(() => Math.random() - 0.5)
      .join("");

    setFormData((prev) => ({
      ...prev,
      password: password,
      confirmPassword: password,
    }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Clear email error when the email input changes
    if (name === "email") {
      setEmailError("");
    }

    // For password fields, ensure only English characters
    if (name === "password" || name === "confirmPassword") {
      const englishOnlyValue = value.replace(
        /[^a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/g,
        ""
      );
      setFormData((prevState) => ({
        ...prevState,
        [name]: englishOnlyValue,
      }));
      setPasswordError("");
    } else {
      setFormData((prevState) => ({
        ...prevState,
        [name]: value,
      }));
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData((prev) => ({
        ...prev,
        photo: file,
      }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setFormData((prev) => ({
      ...prev,
      photo: null,
    }));
    setPhotoPreview(null);
  };

  const togglePasswordVisibility = (field) => {
    setShowPassword((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSubmitting) return; // prevent multiple submissions
    setIsSubmitting(true);

    // Validate passwords first
    if (formData.password !== formData.confirmPassword) {
      setPasswordError("Passwords do not match");
      setIsSubmitting(false);
      return;
    }
    if (formData.password.length < 8) {
      setPasswordError("Password must be at least 8 characters long");
      setIsSubmitting(false);
      return;
    }
    const complexityChecks = [
      /[a-z]/.test(formData.password),
      /[A-Z]/.test(formData.password),
      /[0-9]/.test(formData.password),
      /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password),
    ];
    if (complexityChecks.filter(Boolean).length < 3) {
      setPasswordError(
        "Password must include at least 3 of these: lowercase, uppercase, number, special character"
      );
      setIsSubmitting(false);
      return;
    }

    // Check if email already exists in Firestore
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", formData.email));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        setEmailError("Email is already used");
        setIsSubmitting(false);
        return;
      }
    } catch (error) {
      console.error("Error checking email:", error);
      setIsSubmitting(false);
      return;
    }

    const userData = {
      name: formData.name,
      email: formData.email,
      numberphone: formData.numberphone,
      role: formData.role,
      password: formData.password,
      isactive: formData.isactive,
      photo: photoPreview,
      createdAt: new Date(),
    };

    try {
      await addDoc(collection(db, "users"), userData);
      setShowNotification(true);

      // Play the success sound
      const audio = new Audio(successSound);
      audio.play();

      // Wait for 2 seconds before redirecting
      setTimeout(() => {
        navigate("/usersControl");
      }, 2000);
    } catch (error) {
      console.error("Error adding document: ", error);
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    navigate("/usersControl");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Success Notification */}
      <Notification
        message="User created successfully!"
        isVisible={showNotification}
        onClose={() => setShowNotification(false)}
      />

      <div className="w-full mx-auto bg-white rounded-xl shadow-md p-8">
        <div className="flex items-center mb-6">
          <button
            onClick={handleBack}
            className="mr-4 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Add New User</h1>
        </div>
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {/* Left Column */}
          <div className="space-y-6">
            {/* Name Input */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Full Name<span className="text-red-500 ml-0.5">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  className="pl-10 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Enter full name"
                />
              </div>
            </div>

            {/* Email Input */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Email Address<span className="text-red-500 ml-0.5">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="pl-10 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Enter email address"
                />
              </div>
              {emailError && (
                <div className="text-red-500 text-sm mt-1">{emailError}</div>
              )}
            </div>

            {/* Phone Number Input */}
            <div>
              <label
                htmlFor="numberphone"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Phone Number<span className="text-red-500 ml-0.5">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="tel"
                  id="numberphone"
                  name="numberphone"
                  required
                  value={formData.numberphone}
                  onChange={handleInputChange}
                  className="pl-10 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Enter phone number"
                />
              </div>
            </div>

            {/* Role Input */}
            <div>
              <label
                htmlFor="role"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                User Role<span className="text-red-500 ml-0.5">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserCog className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  id="role"
                  name="role"
                  required
                  value={formData.role}
                  onChange={handleInputChange}
                  className="pl-10 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="">Select Role</option>
                  <option value="Manager">Manager</option>
                  <option value="Worker">Worker</option>
                </select>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Photo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Photo (Optional)
              </label>
              <div className="mt-1 flex items-center space-x-4">
                <div className="relative">
                  {photoPreview ? (
                    <div className="relative w-20 h-20">
                      <img
                        src={photoPreview}
                        alt="Preview"
                        className="w-20 h-20 rounded-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={removePhoto}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
                      <Camera className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                </div>
                <div>
                  <input
                    type="file"
                    id="photo"
                    name="photo"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="photo"
                    className="cursor-pointer py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                  >
                    Change Photo
                  </label>
                </div>
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label
                htmlFor="password"
                className="text-sm font-medium text-gray-700 mb-2 flex justify-between items-center"
              >
                <span>
                  Password<span className="text-red-500 ml-0.5">*</span>
                </span>
                <button
                  type="button"
                  onClick={generatePassword}
                  className="text-xs text-green-600 hover:text-green-800"
                >
                  Generate Password
                </button>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showPassword.password ? "text" : "password"}
                  id="password"
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="pl-10 pr-10 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Enter password"
                  minLength="8"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility("password")}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPassword.password ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password Input */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Confirm Password<span className="text-red-500 ml-0.5">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showPassword.confirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  name="confirmPassword"
                  required
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="pl-10 pr-10 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Confirm password"
                  minLength="8"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility("confirmPassword")}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPassword.confirmPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Full-width row for password requirements and error message */}
          <div className="md:col-span-2 space-y-4">
            <div className="text-sm text-gray-600">
              <p>Password must:</p>
              <ul className="list-disc list-inside">
                <li>Be at least 8 characters long</li>
                <li>
                  Include at least 3 of these:
                  <ul className="list-inside list-circle pl-4">
                    <li>Lowercase letters</li>
                    <li>Uppercase letters</li>
                    <li>Numbers</li>
                    <li>Special characters</li>
                  </ul>
                </li>
                <li>Contain only English characters</li>
              </ul>
            </div>
            {passwordError && (
              <div className="text-red-500 text-sm">{passwordError}</div>
            )}
          </div>

          {/* Submit Button */}
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                isSubmitting
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700"
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500`}
            >
              Create User
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddNewUser;
