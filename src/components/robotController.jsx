import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { ChevronLeft } from "lucide-react";
import "leaflet/dist/leaflet.css";
import { useNavigate } from "react-router-dom";

// Leaflet default icon fix
import L from "leaflet";
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const RobotController = () => {
  const navigate = useNavigate();
  const [gps, setGps] = useState({ latitude: 32.9171, longitude: 35.305 }); // Karmiel coordinates
  const [distance, setDistance] = useState(100); // Initial distance in cm
  const [status, setStatus] = useState("Idle");

  // Simulate fetching GPS data
  const getGPSData = () => {
    return {
      latitude: gps.latitude + (Math.random() - 0.5) * 0.001,
      longitude: gps.longitude + (Math.random() - 0.5) * 0.001,
    }; // Simulated GPS movement
  };

  // Simulate fetching Distance Sensor data
  const getDistanceData = () => {
    return Math.floor(Math.random() * 200); // Random distance in cm
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setGps(getGPSData());
      setDistance(getDistanceData());
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (distance < 30) {
      setStatus("Obstacle detected! Stopping movement.");
    } else {
      setStatus("Moving to target location.");
    }
  }, [distance]);

  // Handle back button click to navigate to previous page
  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Back Button */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <button
              onClick={handleGoBack}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
              <span>Back</span>
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              Robot Controller
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Much larger map container */}
        <div
          className="w-full h-screen mb-6 rounded-lg overflow-hidden border border-gray-300 bg-white"
          style={{ maxHeight: "70vh" }}
        >
          <MapContainer
            center={[gps.latitude, gps.longitude]}
            zoom={15}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <Marker position={[gps.latitude, gps.longitude]}>
              <Popup>
                Robot Location: {gps.latitude.toFixed(5)},{" "}
                {gps.longitude.toFixed(5)}
              </Popup>
            </Marker>
          </MapContainer>
        </div>

        {/* Status and sensor data in a more compact layout */}
        <div className="bg-white shadow-sm rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="bg-gray-50 p-3 rounded">
              <h3 className="text-sm font-semibold text-gray-500">
                GPS LOCATION
              </h3>
              <p className="text-lg">
                {gps.latitude.toFixed(5)}, {gps.longitude.toFixed(5)}
              </p>
            </div>

            <div className="bg-gray-50 p-3 rounded">
              <h3 className="text-sm font-semibold text-gray-500">
                DISTANCE SENSOR
              </h3>
              <p className="text-lg">{distance} cm</p>
            </div>
          </div>

          <div
            className={`p-3 rounded-lg text-white text-center font-medium ${
              status.includes("Obstacle") ? "bg-red-500" : "bg-green-500"
            }`}
          >
            {status}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RobotController;
