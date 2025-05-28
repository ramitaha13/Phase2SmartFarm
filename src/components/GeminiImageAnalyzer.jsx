import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; // Import useNavigate hook
import {
  ChevronLeft,
  Upload,
  AlertCircle,
  RefreshCw,
  Image,
  FileText,
  Zap,
} from "lucide-react";

const GeminiPlantAnalyzer = () => {
  const navigate = useNavigate(); // Initialize navigate
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const [additionalPrompt, setAdditionalPrompt] = useState("");
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  // Analysis result sections
  const [plantIdentification, setPlantIdentification] = useState("");
  const [damageAssessment, setDamageAssessment] = useState("");
  const [wateringNeeds, setWateringNeeds] = useState("");
  const [overallHealth, setOverallHealth] = useState("");
  const [recommendations, setRecommendations] = useState("");

  // API settings for Gemini
  const API_KEY = "AIzaSyAmcBSSX4S4fTkAhCmegZkDUOmou-dvSIo"; // You should replace this with your actual API key
  const API_URL =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

  const resetAnalysis = () => {
    setPlantIdentification("");
    setDamageAssessment("");
    setWateringNeeds("");
    setOverallHealth("");
    setRecommendations("");
    setAnalysisError(null);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);

      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);

      // Reset analysis when new image is selected
      resetAnalysis();
    }
  };

  const handleBackClick = () => {
    // Use navigate to go back to the previous page
    navigate(-1);
  };

  // Parse the structured response from Gemini
  const parseStructuredResponse = (text) => {
    try {
      // Extract each section using regex
      const plantTypeMatch = text.match(
        /\[PLANT_TYPE\]([\s\S]*?)\[\/PLANT_TYPE\]/i
      );
      const damageMatch = text.match(/\[DAMAGE\]([\s\S]*?)\[\/DAMAGE\]/i);
      const waterMatch = text.match(/\[WATER\]([\s\S]*?)\[\/WATER\]/i);
      const healthMatch = text.match(/\[HEALTH\]([\s\S]*?)\[\/HEALTH\]/i);
      const recommendationsMatch = text.match(
        /\[RECOMMENDATIONS\]([\s\S]*?)\[\/RECOMMENDATIONS\]/i
      );

      // Set the state for each section if found
      setPlantIdentification(
        plantTypeMatch ? plantTypeMatch[1].trim() : "לא ניתן לזהות את סוג הצמח"
      );
      setDamageAssessment(
        damageMatch ? damageMatch[1].trim() : "אין מידע על נזק"
      );
      setWateringNeeds(
        waterMatch ? waterMatch[1].trim() : "אין מידע על צורכי השקיה"
      );
      setOverallHealth(
        healthMatch ? healthMatch[1].trim() : "אין מידע על מצב בריאותי כללי"
      );
      setRecommendations(
        recommendationsMatch
          ? recommendationsMatch[1].trim()
          : "אין המלצות זמינות"
      );

      // If we couldn't extract the structured format, handle as a fallback
      if (
        !plantTypeMatch &&
        !damageMatch &&
        !waterMatch &&
        !healthMatch &&
        !recommendationsMatch
      ) {
        // Split the text into roughly equal parts for each section
        const paragraphs = text
          .split(/\n\s*\n/)
          .filter((p) => p.trim().length > 0);
        if (paragraphs.length >= 4) {
          setDamageAssessment(paragraphs[0]);
          setWateringNeeds(paragraphs[1]);
          setOverallHealth(paragraphs[2]);
          setRecommendations(paragraphs[3]);
          if (paragraphs.length >= 5) {
            setPlantIdentification(paragraphs[4]);
          }
        }
      }
    } catch (error) {
      console.error("Error parsing response:", error);
      setAnalysisError("Failed to parse the AI response");
    }
  };

  // Format text with bullet points and formatting
  const formatText = (text) => {
    if (!text) return "";

    // Convert bullet points (- item) to proper HTML
    const withBullets = text.replace(/^- (.+)$/gm, "<li>$1</li>");

    // Add formatting for bold text
    const withBold = withBullets.replace(
      /\*\*(.*?)\*\*/g,
      "<strong>$1</strong>"
    );

    // If there are list items, wrap them in a ul
    const withLists = withBold.replace(
      /<li>(.+)<\/li>/g,
      '<ul class="list-disc list-inside my-2"><li>$1</li></ul>'
    );

    // Return as HTML
    return (
      <div
        className="text-right"
        dangerouslySetInnerHTML={{ __html: withLists.replace(/\n/g, "<br/>") }}
      />
    );
  };

  const handleAnalyzeImage = async () => {
    if (!selectedImage) return;

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      // Convert image to base64
      const base64Image = await convertFileToBase64(selectedImage);

      // Create the prompt for Gemini specifically for plant analysis
      let prompt = `Analyze this plant image in detail and respond only in Hebrew. First, try to identify what type of plant this is.
      
Focus specifically on these questions:
1. What type of plant is this? If you can identify it, provide the name in Hebrew and English.
2. Is the plant damaged? If so, what type of damage do you see (pests, disease, physical damage, etc.)?
3. Does the plant need water based on what you can see in the image?
4. What is the overall health status of the plant?
5. What actions should the plant owner take to improve the plant's health?

Organize your analysis in Hebrew with EXACTLY these five sections, using exactly these markers so I can parse the response:

[PLANT_TYPE]
Your plant identification here in Hebrew
[/PLANT_TYPE]

[DAMAGE]
Your damage assessment here in Hebrew
[/DAMAGE]

[WATER]
Your watering needs assessment here in Hebrew
[/WATER]

[HEALTH]
Your overall health assessment here in Hebrew
[/HEALTH]

[RECOMMENDATIONS]
Your recommended actions here in Hebrew
[/RECOMMENDATIONS]`;

      if (additionalPrompt.trim()) {
        prompt += `\n\nAdditional context from the user: ${additionalPrompt.trim()}`;
      }

      // Create payload for Gemini API
      const payload = {
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
              {
                inline_data: {
                  mime_type: selectedImage.type,
                  data: base64Image.split(",")[1], // Remove the data URL prefix
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 32,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
      };

      // Make API request
      const response = await fetch(`${API_URL}?key=${API_KEY}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error?.message || `API error: ${response.status}`
        );
      }

      const data = await response.json();

      if (data.candidates && data.candidates[0]?.content) {
        const responseText = data.candidates[0].content.parts[0].text;
        parseStructuredResponse(responseText);
      } else if (data.promptFeedback && data.promptFeedback.blockReason) {
        setAnalysisError(
          `Response blocked: ${data.promptFeedback.blockReason}`
        );
      } else {
        setAnalysisError("Received an empty or invalid response from the API");
      }
    } catch (err) {
      console.error("Error analyzing image:", err);
      setAnalysisError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const convertFileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Back Button */}
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
            <h1 className="text-2xl font-bold text-gray-900">
              Plant Health Analyzer
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Image Upload Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Image className="h-5 w-5 text-blue-500 mr-2" />
            Upload Plant Photo for Analysis
          </h2>

          {!imagePreview ? (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center justify-center">
              <Image className="h-16 w-16 text-gray-400 mb-4" />
              <p className="text-gray-600 mb-4 text-center">
                Upload a photo of your plant to check for damage and watering
                needs
              </p>
              <label className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors cursor-pointer">
                <Upload className="h-4 w-4" />
                <span>Select Image</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
              <p className="text-xs text-gray-500 mt-2">
                Supported formats: JPG, PNG, GIF (max 20MB)
              </p>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row gap-6">
              <div className="w-full md:w-1/2">
                <div className="rounded-lg overflow-hidden shadow-sm border border-gray-200">
                  <img
                    src={imagePreview}
                    alt="Selected"
                    className="w-full h-auto object-contain max-h-96"
                  />
                </div>
                <div className="mt-4 flex gap-3">
                  <label className="flex items-center space-x-2 bg-blue-600 text-white px-3 py-1.5 text-sm rounded-md hover:bg-blue-700 transition-colors cursor-pointer">
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Change Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                  <p className="text-sm text-gray-500 flex items-center">
                    {selectedImage.name.length > 20
                      ? `${selectedImage.name.substring(0, 20)}...`
                      : selectedImage.name}
                    ({Math.round(selectedImage.size / 1024)} KB)
                  </p>
                </div>
              </div>

              <div className="w-full md:w-1/2">
                <div className="mb-4">
                  <button
                    className="text-sm text-blue-600 hover:text-blue-800 transition-colors flex items-center"
                    onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                  >
                    {showAdvancedOptions ? "Hide" : "Show"} Advanced Options
                  </button>
                </div>

                {showAdvancedOptions && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Additional Instructions (optional)
                    </label>
                    <textarea
                      value={additionalPrompt}
                      onChange={(e) => setAdditionalPrompt(e.target.value)}
                      placeholder="E.g., 'This is a tomato plant grown indoors' or 'The plant has yellow spots on leaves'"
                      rows={3}
                      className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                <button
                  onClick={handleAnalyzeImage}
                  disabled={isAnalyzing || !selectedImage}
                  className={`w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-md text-white transition-colors
                    ${
                      isAnalyzing || !selectedImage
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700"
                    }`}
                >
                  {isAnalyzing ? (
                    <>
                      <RefreshCw className="h-5 w-5 animate-spin" />
                      <span>Analyzing Image...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="h-5 w-5" />
                      <span>Analyze Plant Health</span>
                    </>
                  )}
                </button>

                {analysisError && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start text-red-700">
                      <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                      <p className="text-sm">{analysisError}</p>
                    </div>
                  </div>
                )}

                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start text-blue-700">
                    <FileText className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium mb-1">
                        How Plant Analysis Works
                      </p>
                      <p>
                        Our AI will analyze your plant photo to detect signs of
                        damage, assess watering needs, evaluate overall health,
                        and provide care recommendations - all in Hebrew. The
                        analysis works best with clear, well-lit photos showing
                        the entire plant or affected areas.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Analysis Results Section */}
        {(plantIdentification ||
          damageAssessment ||
          wateringNeeds ||
          overallHealth ||
          recommendations) && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <FileText className="h-5 w-5 text-green-600 mr-2" />
              Plant Health Analysis
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Plant Identification Box */}
              <div className="bg-purple-50 rounded-lg overflow-hidden border border-purple-100">
                <div className="bg-purple-600 text-white py-2 px-4">
                  <h3 className="font-semibold text-right">זיהוי צמח</h3>
                </div>
                <div className="p-4" dir="rtl">
                  {formatText(plantIdentification)}
                </div>
              </div>

              {/* Damage Assessment Box */}
              <div className="bg-red-50 rounded-lg overflow-hidden border border-red-100">
                <div className="bg-red-600 text-white py-2 px-4">
                  <h3 className="font-semibold text-right">הערכת נזק</h3>
                </div>
                <div className="p-4" dir="rtl">
                  {formatText(damageAssessment)}
                </div>
              </div>

              {/* Watering Needs Box */}
              <div className="bg-blue-50 rounded-lg overflow-hidden border border-blue-100">
                <div className="bg-blue-600 text-white py-2 px-4">
                  <h3 className="font-semibold text-right">צרכי השקיה</h3>
                </div>
                <div className="p-4" dir="rtl">
                  {formatText(wateringNeeds)}
                </div>
              </div>

              {/* Overall Health Box */}
              <div className="bg-green-50 rounded-lg overflow-hidden border border-green-100">
                <div className="bg-green-600 text-white py-2 px-4">
                  <h3 className="font-semibold text-right">מצב בריאותי כללי</h3>
                </div>
                <div className="p-4" dir="rtl">
                  {formatText(overallHealth)}
                </div>
              </div>

              {/* Recommendations Box - Full Width */}
              <div className="md:col-span-2 bg-amber-50 rounded-lg overflow-hidden border border-amber-100">
                <div className="bg-amber-600 text-white py-2 px-4">
                  <h3 className="font-semibold text-right">המלצות</h3>
                </div>
                <div className="p-4" dir="rtl">
                  {formatText(recommendations)}
                </div>
              </div>
            </div>

            <div className="mt-4 text-sm text-gray-600 flex items-center">
              <AlertCircle className="h-4 w-4 mr-2 text-gray-500" />
              <span>
                This plant health assessment is generated by AI based on the
                image provided.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GeminiPlantAnalyzer;
