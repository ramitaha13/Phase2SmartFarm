import React, { useState, useEffect } from "react";
import { Leaf, Share2, Phone, Mail, X, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import RamiPhoto from "/src/assets/3.jpeg";
import KareemPhoto from "/src/assets/4.jpeg";

// Function to calculate age from birthdate in format DD/MM/YYYY
const calculateAge = (birthdate) => {
  const parts = birthdate.split("/");
  const birthDay = parseInt(parts[0], 10);
  const birthMonth = parseInt(parts[1], 10) - 1; // JavaScript months are 0-indexed
  const birthYear = parseInt(parts[2], 10);

  const birthDate = new Date(birthYear, birthMonth, birthDay);
  const today = new Date();

  let age = today.getFullYear() - birthDate.getFullYear();

  // Check if birthday hasn't occurred yet this year
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
};

// Import images directly to ensure they're properly bundled
// Add these at the top of your file after the other imports
import ramiImage from "../assets/3.jpeg";
import kareemImage from "../assets/4.jpeg";

const Alert = ({ children }) => (
  <div className="fixed top-4 left-4 bg-green-100 border border-green-600 text-green-800 p-4 rounded-lg shadow-lg animate-fade-in">
    {children}
  </div>
);

const ContactCard = ({
  name,
  phone,
  email,
  imagePath,
  birthdate,
  additionalDetails = [],
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [touchTimer, setTouchTimer] = useState(null);

  // Handle touch start - start timer (mobile only)
  const handleTouchStart = () => {
    // Only on mobile devices
    if (window.innerWidth <= 768) {
      const timer = setTimeout(() => {
        setIsExpanded(true);
      }, 500); // 500ms hold to expand

      setTouchTimer(timer);
    }
  };

  // Handle touch end - clear timer if not completed
  const handleTouchEnd = () => {
    if (touchTimer) {
      clearTimeout(touchTimer);
      setTouchTimer(null);
    }
  };

  // Close expanded card
  const handleClose = (e) => {
    e.stopPropagation();
    setIsExpanded(false);
  };

  return (
    <div
      className="relative bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all duration-300 border border-gray-100"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {/* Regular Card Content */}
      <h3 className="text-2xl font-bold text-gray-900 mb-6">{name}</h3>
      <div className="space-y-4">
        <div className="flex items-center space-x-4 group">
          <div className="bg-green-50 p-3 rounded-full group-hover:bg-green-100 transition-colors">
            <Phone className="h-6 w-6 text-green-600" />
          </div>
          <a
            href={`tel:${phone.replace(/-/g, "")}`}
            className="text-lg text-gray-600 hover:text-green-600 transition-colors"
          >
            {phone}
          </a>
        </div>
        <div className="flex items-center space-x-4 group">
          <div className="bg-green-50 p-3 rounded-full group-hover:bg-green-100 transition-colors">
            <Mail className="h-6 w-6 text-green-600" />
          </div>
          <a
            href={`mailto:${email}`}
            className="text-lg text-gray-600 hover:text-green-600 transition-colors"
          >
            {email}
          </a>
        </div>
      </div>

      {/* Mobile-only indicator */}
      <div className="md:hidden mt-4 text-center">
        <div className="text-xs text-green-600 font-medium flex items-center justify-center">
          <span className="inline-block w-3 h-3 bg-green-100 rounded-full mr-1 animate-pulse"></span>
          Hold card to know more about our team member
        </div>
      </div>

      {/* Expanded Card (Mobile Only) */}
      {isExpanded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 md:hidden">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 relative">
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full hover:bg-gray-200"
            >
              <X className="h-5 w-5 text-gray-700" />
            </button>

            <div className="flex flex-col items-center">
              <div className="w-32 h-32 rounded-full overflow-hidden mb-4 border-4 border-green-100">
                {imagePath ? (
                  <img
                    src={imagePath}
                    alt={name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.error("Image failed to load:", imagePath);
                      e.target.onerror = null;
                      // Replace with User icon
                      e.target.parentNode.innerHTML = `<div class="w-full h-full flex items-center justify-center bg-green-50">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-green-600">
                          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                          <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                      </div>`;
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-green-50">
                    <User className="h-12 w-12 text-green-600" />
                  </div>
                )}
              </div>

              <h3 className="text-2xl font-bold text-center text-gray-900 mb-4">
                {name}
              </h3>

              {/* Additional Details */}
              {(additionalDetails.length > 0 || birthdate) && (
                <div className="w-full bg-green-50 rounded-lg p-4 mb-4">
                  <ul className="space-y-2">
                    {birthdate && (
                      <li className="text-gray-700 flex items-start">
                        <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full mt-2 mr-2"></span>
                        Age: {calculateAge(birthdate)}
                      </li>
                    )}
                    {additionalDetails.map((detail, index) => (
                      <li
                        key={index}
                        className="text-gray-700 flex items-start"
                      >
                        <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full mt-2 mr-2"></span>
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="space-y-4 w-full">
                <a
                  href={`tel:${phone.replace(/-/g, "")}`}
                  className="flex items-center justify-center space-x-3 bg-green-50 p-4 rounded-lg text-green-700 font-medium"
                >
                  <Phone className="h-5 w-5" />
                  <span>{phone}</span>
                </a>

                <a
                  href={`mailto:${email}`}
                  className="flex items-center justify-center space-x-3 bg-green-50 p-4 rounded-lg text-green-700 font-medium"
                >
                  <Mail className="h-5 w-5" />
                  <span>{email}</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SmartFarmLanding = () => {
  const navigate = useNavigate();
  const [showShareAlert, setShowShareAlert] = useState(false);

  const handleLoginClick = () => {
    navigate("/login");
  };

  const handleShare = async () => {
    const shareData = {
      title: "Smart Farm",
      text: "Transform Your Farm with Smart Technology",
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setShowShareAlert(true);
        setTimeout(() => setShowShareAlert(false), 3000);
      }
    } catch (err) {}
  };

  // Add CSS keyframes animation for mobile
  React.useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      @keyframes sharePulse {
        0% { height: 0%; opacity: 0; }
        50% { height: 100%; opacity: 1; }
        100% { height: 0%; opacity: 0; }
      }
      
      @media (max-width: 768px) {
        .mobile-animate-share {
          animation: sharePulse 3s infinite;
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Navigation - Updated with gradient and glass effect */}
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-white/90 border-b border-gray-200">
        <div className="max-w-7xl mx-auto py-4 px-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <div className="bg-green-50 p-2 rounded-full">
                <Leaf className="text-green-600 h-6 w-6" />
              </div>
              <span className="text-xl font-bold text-gray-800">
                Smart Farm
              </span>
            </div>
            <div className="flex items-center space-x-6">
              {/* Share Button - Made smaller */}
              <button
                onClick={handleShare}
                className="relative inline-flex items-center justify-center px-5 py-2 overflow-hidden font-medium transition-all bg-white rounded-full hover:bg-white group"
                style={{
                  border: "1px solid green",
                  boxShadow: "0 2px 5px rgba(0, 0, 0, 0.1)",
                }}
              >
                <span className="relative flex items-center text-green-600 transition-all duration-300 group-hover:text-white">
                  Share
                  <Share2 className="h-4 w-4 ml-1.5" />
                </span>
                <div className="absolute flex justify-around top-0 left-0 w-full h-0 transition-all duration-500 border-green-600 group-hover:h-full group-hover:opacity-100 mobile-animate-share rounded-full">
                  <div className="h-full w-full flex justify-center items-center bg-green-600">
                    {/* Twitter/X Icon */}
                    <svg
                      height="20"
                      width="20"
                      xmlns="http://www.w3.org/2000/svg"
                      version="1.1"
                      viewBox="0 0 1024 1024"
                      className="icon mx-1 text-white"
                      style={{ fill: "white" }}
                    >
                      <path d="M962.267429 233.179429q-38.253714 56.027429-92.598857 95.451429 0.585143 7.972571 0.585143 23.990857 0 74.313143-21.723429 148.260571t-65.974857 141.970286-105.398857 120.32-147.456 83.456-184.539429 31.158857q-154.843429 0-283.428571-82.870857 19.968 2.267429 44.544 2.267429 128.585143 0 229.156571-78.848-59.977143-1.170286-107.446857-36.864t-65.170286-91.136q18.870857 2.852571 34.889143 2.852571 24.576 0 48.566857-6.290286-64-13.165714-105.984-63.707429t-41.984-117.394286l0-2.267429q38.838857 21.723429 83.456 23.405714-37.741714-25.161143-59.977143-65.682286t-22.308571-87.990857q0-50.322286 25.161143-93.110857 69.12 85.138286 168.301714 136.265143t212.260571 56.832q-4.534857-21.723429-4.534857-42.276571 0-76.580571 53.979429-130.56t130.56-53.979429q80.018286 0 134.875429 58.294857 62.317714-11.995429 117.174857-44.544-21.138286 65.682286-81.115429 101.741714 53.174857-5.705143 106.276571-28.598857z"></path>
                    </svg>
                    {/* Instagram Icon */}
                    <svg
                      height="20"
                      width="20"
                      xmlns="http://www.w3.org/2000/svg"
                      version="1.1"
                      viewBox="0 0 512 512"
                      className="icon mx-1 text-white"
                      style={{ fill: "white" }}
                    >
                      <path d="M256,49.471c67.266,0,75.233.257,101.8,1.469,24.562,1.121,37.9,5.224,46.778,8.674a78.052,78.052,0,0,1,28.966,18.845,78.052,78.052,0,0,1,18.845,28.966c3.45,8.877,7.554,22.216,8.674,46.778,1.212,26.565,1.469,34.532,1.469,101.8s-0.257,75.233-1.469,101.8c-1.121,24.562-5.225,37.9-8.674,46.778a83.427,83.427,0,0,1-47.811,47.811c-8.877,3.45-22.216,7.554-46.778,8.674-26.56,1.212-34.527,1.469-101.8,1.469s-75.237-.257-101.8-1.469c-24.562-1.121-37.9-5.225-46.778-8.674a78.051,78.051,0,0,1-28.966-18.845,78.053,78.053,0,0,1-18.845-28.966c-3.45-8.877-7.554-22.216-8.674-46.778-1.212-26.564-1.469-34.532-1.469-101.8s0.257-75.233,1.469-101.8c1.121-24.562,5.224-37.9,8.674-46.778A78.052,78.052,0,0,1,78.458,78.458a78.053,78.053,0,0,1,28.966-18.845c8.877-3.45,22.216-7.554,46.778-8.674,26.565-1.212,34.532-1.469,101.8-1.469m0-45.391c-68.418,0-77,.29-103.866,1.516-26.815,1.224-45.127,5.482-61.151,11.71a123.488,123.488,0,0,0-44.62,29.057A123.488,123.488,0,0,0,17.3,90.982C11.077,107.007,6.819,125.319,5.6,152.134,4.369,179,4.079,187.582,4.079,256S4.369,333,5.6,359.866c1.224,26.815,5.482,45.127,11.71,61.151a123.489,123.489,0,0,0,29.057,44.62,123.486,123.486,0,0,0,44.62,29.057c16.025,6.228,34.337,10.486,61.151,11.71,26.87,1.226,35.449,1.516,103.866,1.516s77-.29,103.866-1.516c26.815-1.224,45.127-5.482,61.151-11.71a128.817,128.817,0,0,0,73.677-73.677c6.228-16.025,10.486-34.337,11.71-61.151,1.226-26.87,1.516-35.449,1.516-103.866s-0.29-77-1.516-103.866c-1.224-26.815-5.482-45.127-11.71-61.151a123.486,123.486,0,0,0-29.057-44.62A123.487,123.487,0,0,0,421.018,17.3C404.993,11.077,386.681,6.819,359.866,5.6,333,4.369,324.418,4.079,256,4.079h0Z"></path>
                      <path d="M256,126.635A129.365,129.365,0,1,0,385.365,256,129.365,129.365,0,0,0,256,126.635Zm0,213.338A83.973,83.973,0,1,1,339.974,256,83.974,83.974,0,0,1,256,339.973Z"></path>
                      <circle cx="390.476" cy="121.524" r="30.23"></circle>
                    </svg>
                    {/* GitHub Icon */}
                    <svg
                      height="20"
                      width="20"
                      xmlns="http://www.w3.org/2000/svg"
                      version="1.1"
                      viewBox="0 0 1024 1024"
                      className="icon mx-1 text-white"
                      style={{ fill: "white" }}
                    >
                      <path d="M950.930286 512q0 143.433143-83.748571 257.974857t-216.283429 158.573714q-15.433143 2.852571-22.601143-4.022857t-7.168-17.115429l0-120.539429q0-55.442286-29.696-81.115429 32.548571-3.437714 58.587429-10.313143t53.686857-22.308571 46.299429-38.034286 30.281143-59.977143 11.702857-86.016q0-69.12-45.129143-117.686857 21.138286-52.004571-4.534857-116.589714-16.018286-5.12-46.299429 6.290286t-52.589714 25.161143l-21.723429 13.677714q-53.174857-14.848-109.714286-14.848t-109.714286 14.848q-9.142857-6.290286-24.283429-15.433143t-47.689143-22.016-49.152-7.68q-25.161143 64.585143-4.022857 116.589714-45.129143 48.566857-45.129143 117.686857 0 48.566857 11.702857 85.723429t29.988571 59.977143 46.006857 38.253714 53.686857 22.308571 58.587429 10.313143q-22.820571 20.553143-28.013714 58.88-11.995429 5.705143-25.746286 8.557714t-32.548571 2.852571-37.449143-12.288-31.744-35.693714q-10.825143-18.285714-27.721143-29.696t-28.306286-13.677714l-11.410286-1.682286q-11.995429 0-16.603429 2.56t-2.852571 6.582857 5.12 7.972571 7.460571 6.875429l4.022857 2.852571q12.580571 5.705143 24.868571 21.723429t17.993143 29.110857l5.705143 13.165714q7.460571 21.723429 25.161143 35.108571t38.253714 17.115429 39.716571 4.022857 31.744-1.974857l13.165714-2.267429q0 21.723429 0.292571 50.834286t0.292571 30.866286q0 10.313143-7.460571 17.115429t-22.820571 4.022857q-132.534857-44.032-216.283429-158.573714t-83.748571-257.974857q0-119.442286 58.88-220.306286t159.744-159.744 220.306286-58.88 220.306286 58.88 159.744 159.744 58.88 220.306286z"></path>
                    </svg>
                    {/* WhatsApp Icon */}
                    <svg
                      height="20"
                      width="20"
                      xmlns="http://www.w3.org/2000/svg"
                      version="1.1"
                      viewBox="0 0 1024 1024"
                      className="icon mx-1 text-white"
                      style={{ fill: "white" }}
                    >
                      <path d="M512 0c-282.8 0-512 229.2-512 512 0 112.6 36.4 216.6 98 301.2L42 1024l215.8-55.8c82 53.2 179.6 84 284.2 84 282.8 0 512-229.2 512-512S794.8 0 512 0zM512 928c-96.8 0-186.8-29.4-261.8-79.6l-14.8-8.8-148.6 38.4 39.4-143.6-9.8-15.4c-55.6-88-85.2-190-85.2-296.8 0-229.8 229.2-416 512-416s512 186.2 512 416S794.8 928 512 928zM731.8 579.4c-12.4-6.2-73.6-36.2-85-40.4-11.4-4.2-19.8-6.2-28.2 6.2-8.4 12.4-32.4 40.4-39.8 48.6-7.4 8.4-14.6 9.4-27 3.2-12.4-6.2-52.2-19.2-99.4-61.2-36.8-32.8-61.6-73.2-68.8-85.6-7.4-12.4-0.8-19 5.4-25.2 5.6-5.6 12.4-14.6 18.6-21.8 6.2-7.4 8.2-12.4 12.4-21 4.2-8.4 2.2-15.8-1-22-3.2-6.2-28.2-68-38.6-93-10.2-24.4-20.6-21-28.2-21.4-7.4-0.4-15.8-0.4-24-0.4-8.4 0-21.8 3.2-33.2 15.8-11.4 12.4-43.4 42.4-43.4 103.4s44.4 120 50.6 128.2c6.2 8.4 87 132.8 210.8 186.2 124 53.4 124 35.6 146.4 33.4 22.4-2.2 73.6-30 84-59.2 10.4-29 10.4-54 7.4-59.2-3.2-5.2-11.6-8.4-24-14.4z"></path>
                    </svg>
                  </div>
                </div>
              </button>
              <button
                onClick={handleLoginClick}
                className="bg-green-600 text-white px-8 py-2.5 rounded-full font-medium hover:bg-green-700 hover:shadow-lg transition-all duration-300"
              >
                Login
              </button>
            </div>
          </div>
        </div>
      </nav>

      {showShareAlert && <Alert>Link copied successfully!</Alert>}

      {/* Hero Section - Updated with better typography and spacing */}
      <div className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Transform Your Farm with{" "}
            <span className="text-green-600 inline-block">
              Smart Technology
            </span>
          </h1>
          <p className="text-xl text-gray-600 leading-relaxed">
            Optimize your agricultural operations with our advanced IoT
            solutions. Monitor, control, and improve your farm's efficiency from
            anywhere.
          </p>
        </div>
      </div>

      {/* Contact Section - Updated with modern card design and mobile touch support */}
      <div className="bg-gradient-to-t from-green-50/50 to-transparent py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Contact Us
            </h2>
            <p className="text-xl text-gray-600 mb-4">
              Get in touch with our team
            </p>
            <p className="text-lg text-gray-600 mb-2">
              Need assistance? Our experts are here to help. Feel free to
              contact us by phone or email for any questions about our smart
              farming solutions, technical support, or consultation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Rami Taha Contact Card */}
            <ContactCard
              name="Rami Taha"
              phone="053-733-3343"
              email="taharami14@gmail.com"
              imagePath={RamiPhoto}
              birthdate="13/9/1999"
              additionalDetails={[
                "From Kabul",
                "Software engineering student",
                "Fourth year at Braude College",
              ]}
            />

            {/* Kareem Zeedan Contact Card */}
            <ContactCard
              name="Kareem Zeedan"
              phone="055-665-7503"
              email="Kareemzeedan@gmail.com"
              imagePath={KareemPhoto}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartFarmLanding;
