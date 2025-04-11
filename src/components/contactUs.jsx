import React from "react";
import { Phone, Mail, ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import RamiPhoto from "/src/assets/3.jpeg";
import KareemPhoto from "/src/assets/4.jpeg";

const ContactUs = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <button
              onClick={handleBack}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
              <span>Back</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Project Information Section */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">About Us</h1>
          <p className="text-lg text-gray-600 mb-6 leading-relaxed">
            We are 4th year students at Braude College studying software
            engineering. This is a final project for a bachelor's degree. We are
            always available for help if requested, and for explanation about
            the site and advice.
          </p>
        </div>

        {/* Contact Cards */}
        <div className="space-y-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Contact Us</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Rami Taha Contact Card */}
            <div className="bg-white rounded-lg shadow-sm p-8 hover:shadow-md transition-shadow">
              <div className="flex flex-col items-center mb-6">
                <img
                  src={RamiPhoto}
                  alt="Rami Taha"
                  className="w-32 h-32 rounded-full object-cover mb-4 border-4 border-green-100"
                />
                <h3 className="text-xl font-bold text-gray-900">Rami Taha</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="bg-green-50 p-3 rounded-full">
                    <Phone className="h-6 w-6 text-green-600" />
                  </div>
                  <a
                    href="tel:0537333343"
                    className="text-lg text-gray-600 hover:text-green-600 transition-colors"
                  >
                    053-733-3343
                  </a>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="bg-green-50 p-3 rounded-full">
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
            <div className="bg-white rounded-lg shadow-sm p-8 hover:shadow-md transition-shadow">
              <div className="flex flex-col items-center mb-6">
                <img
                  src={KareemPhoto}
                  alt="Kareem Zeedan"
                  className="w-32 h-32 rounded-full object-cover mb-4 border-4 border-green-100"
                />
                <h3 className="text-xl font-bold text-gray-900">
                  Kareem Zeedan
                </h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="bg-green-50 p-3 rounded-full">
                    <Phone className="h-6 w-6 text-green-600" />
                  </div>
                  <a
                    href="tel:0556657503"
                    className="text-lg text-gray-600 hover:text-green-600 transition-colors"
                  >
                    055-665-7503
                  </a>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="bg-green-50 p-3 rounded-full">
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

        {/* Additional Information */}
        <div className="mt-12 text-center">
          <p className="text-gray-600">
            Feel free to reach out if you need any assistance or have questions
            about our project.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ContactUs;
