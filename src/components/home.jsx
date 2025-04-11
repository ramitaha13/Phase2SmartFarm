import React, { useState } from "react";
import { Leaf, Share2, Phone, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Alert = ({ children }) => (
  <div className="fixed top-4 left-4 bg-green-100 border border-green-600 text-green-800 p-4 rounded-lg shadow-lg animate-fade-in">
    {children}
  </div>
);

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
              <button
                onClick={handleShare}
                className="p-2 hover:bg-green-50 rounded-full transition-all duration-300"
              >
                <Share2 className="h-5 w-5 text-gray-600" />
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

      {/* Contact Section - Updated with modern card design */}
      <div className="bg-gradient-to-t from-green-50/50 to-transparent py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Contact Us
            </h2>
            <p className="text-xl text-gray-600 mb-4">
              Get in touch with our team
            </p>
            <p className="text-lg text-gray-600">
              Need assistance? Our experts are here to help. Feel free to
              contact us by phone or email for any questions about our smart
              farming solutions, technical support, or consultation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Rami Taha Contact Card */}
            <div className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all duration-300 border border-gray-100">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                Rami Taha
              </h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-4 group">
                  <div className="bg-green-50 p-3 rounded-full group-hover:bg-green-100 transition-colors">
                    <Phone className="h-6 w-6 text-green-600" />
                  </div>
                  <a
                    href="tel:0537333343"
                    className="text-lg text-gray-600 hover:text-green-600 transition-colors"
                  >
                    053-733-3343
                  </a>
                </div>
                <div className="flex items-center space-x-4 group">
                  <div className="bg-green-50 p-3 rounded-full group-hover:bg-green-100 transition-colors">
                    <Mail className="h-6 w-6 text-green-600" />
                  </div>
                  <a
                    href="mailto:taharami14@gmail.com"
                    className="text-lg text-gray-600 hover:text-green-600 transition-colors"
                  >
                    taharami14@gmail.com
                  </a>
                </div>
              </div>
            </div>

            {/* Kareem Zeedan Contact Card */}
            <div className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all duration-300 border border-gray-100">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                Kareem Zeedan
              </h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-4 group">
                  <div className="bg-green-50 p-3 rounded-full group-hover:bg-green-100 transition-colors">
                    <Phone className="h-6 w-6 text-green-600" />
                  </div>
                  <a
                    href="tel:0556657503"
                    className="text-lg text-gray-600 hover:text-green-600 transition-colors"
                  >
                    055-665-7503
                  </a>
                </div>
                <div className="flex items-center space-x-4 group">
                  <div className="bg-green-50 p-3 rounded-full group-hover:bg-green-100 transition-colors">
                    <Mail className="h-6 w-6 text-green-600" />
                  </div>
                  <a
                    href="mailto:Kareem.zeedan@gmail.com"
                    className="text-lg text-gray-600 hover:text-green-600 transition-colors"
                  >
                    Kareemzeedan@gmail.com
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartFarmLanding;
