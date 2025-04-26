import React, { useState, useRef, useEffect } from "react";
import {
  ArrowLeft,
  Tractor,
  Send,
  PlusCircle,
  Leaf,
  RotateCw,
  Sun,
} from "lucide-react";

const GeminiSmartFarm = () => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  // State variables for typing effect
  const [typingMessage, setTypingMessage] = useState(null);
  const [typingIndex, setTypingIndex] = useState(0);
  const [typingSpeed] = useState(20); // milliseconds per character
  const chatContainerRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimerRef = useRef(null);
  const API_KEY = "AIzaSyAmcBSSX4S4fTkAhCmegZkDUOmou-dvSIo";
  // Updated API URL for Gemini 2.0 Flash
  const API_URL =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

  // Farming-related quick suggestion buttons
  const suggestions = [
    "Best crops for this season?",
    "How to deal with aphids naturally?",
    "Smart irrigation methods?",
    "Soil health indicators?",
  ];

  // Insert an initial greeting message when component mounts with typing effect
  useEffect(() => {
    const welcomeMessage = {
      role: "assistant",
      content:
        "Welcome to Smart Farm AI Assistant! I'm powered by Google's Gemini AI and ready to help with your farming questions. What would you like to know about today?",
    };
    // Start typing animation for welcome message
    setTypingMessage(welcomeMessage);
    setTypingIndex(0);
  }, []);

  // Typing effect handler
  useEffect(() => {
    if (typingMessage) {
      if (typingIndex < typingMessage.content.length) {
        typingTimerRef.current = setTimeout(() => {
          setTypingIndex((prev) => prev + 1);
        }, typingSpeed);
      } else {
        // Typing finished, add the full message to messages
        setMessages((prev) => [...prev, typingMessage]);
        setTypingMessage(null);
        setTypingIndex(0);
      }
    }
    return () => {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
    };
  }, [typingMessage, typingIndex, typingSpeed]);

  useEffect(() => {
    // Scroll to bottom when new messages are added or typing occurs
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }

    // Focus on the input field after messages are updated (except during loading or typing)
    if (!isLoading && !typingMessage && inputRef.current) {
      inputRef.current.focus();
    }
  }, [messages, isLoading, typingMessage, typingIndex]);

  // Function to detect if text contains Hebrew characters
  const isHebrew = (text) => {
    if (!text) return false;
    const hebrewCharRegex = /[\u0590-\u05FF]/;
    return hebrewCharRegex.test(text);
  };

  // Function to stop typing and show the full answer
  const stopTyping = () => {
    if (typingMessage) {
      // Clear the typing timer
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }

      // Add the full message to the messages array
      setMessages((prev) => [...prev, typingMessage]);

      // Reset typing state
      setTypingMessage(null);
      setTypingIndex(0);
    }
  };

  const sendMessage = async (text = inputText) => {
    if (!text.trim()) return;

    const userMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsLoading(true);
    setError(null);
    setShowSuggestions(false);

    try {
      // Simplified payload structure for Gemini 2.0 Flash
      const payload = {
        contents: [
          {
            parts: [
              {
                text: text,
              },
            ],
          },
        ],
      };

      // If there are previous messages, include them for context
      if (messages.length > 0) {
        payload.contents = [];

        // Add history messages
        messages.forEach((msg) => {
          payload.contents.push({
            role: msg.role === "user" ? "user" : "model",
            parts: [{ text: msg.content }],
          });
        });

        // Add the current user message
        payload.contents.push({
          role: "user",
          parts: [{ text: text }],
        });
      }

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
        const assistantMessage = {
          role: "assistant",
          content: data.candidates[0].content.parts[0].text,
        };
        // Start typing animation instead of immediately showing the message
        setTypingMessage(assistantMessage);
        setTypingIndex(0);
      } else if (data.promptFeedback && data.promptFeedback.blockReason) {
        // Handle content filtering blocks
        setError(`Response blocked: ${data.promptFeedback.blockReason}`);
      } else {
        setError("Received an empty or invalid response from the API");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleInputChange = (e) => {
    setInputText(e.target.value);
  };

  const clearChat = () => {
    // Clear all messages
    setMessages([]);
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }

    // Reset typing state
    setTypingMessage(null);
    setTypingIndex(0);
    setError(null);
    setShowSuggestions(true);

    // Start the welcome message typing animation again
    setTimeout(() => {
      const welcomeMessage = {
        role: "assistant",
        content:
          "Welcome to Smart Farm AI Assistant! I'm powered by Google's Gemini AI and ready to help with your farming questions. What would you like to know about today?",
      };
      setTypingMessage(welcomeMessage);
      setTypingIndex(0);
    }, 300);

    // Focus input after clearing chat
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleSuggestionClick = (suggestion) => {
    sendMessage(suggestion);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-green-100">
      {/* App Bar */}
      <div className="bg-green-800 text-white shadow-lg">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button className="p-2 rounded-full hover:bg-green-700 transition-colors">
                <ArrowLeft size={20} />
              </button>
              <div className="flex items-center space-x-2">
                <Tractor size={24} />
                <h1 className="text-xl font-bold">Smart Farm AI</h1>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs bg-green-700 px-2 py-1 rounded-full">
                Powered by Gemini 2.0
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="container mx-auto p-4 max-w-3xl">
        {/* Weather Card */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-4 flex items-center justify-between">
          <div className="flex items-center">
            <Sun className="text-yellow-500 mr-2" size={24} />
            <div>
              <h3 className="font-medium">Smart Farm Dashboard</h3>
              <p className="text-sm text-gray-500">
                Ask AI for farming insights & advice
              </p>
            </div>
          </div>
          <button
            onClick={clearChat}
            className="bg-green-50 hover:bg-green-100 text-green-800 px-3 py-1 rounded-full flex items-center text-sm transition-colors"
          >
            <RotateCw size={14} className="mr-1" /> Reset
          </button>
        </div>

        {/* Chat Container */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-4">
          {/* Chat Messages Area */}
          <div
            ref={chatContainerRef}
            className="h-[60vh] overflow-y-auto p-4 space-y-4"
          >
            {messages.map((message, index) => {
              const isHebr = isHebrew(message.content);
              return (
                <div
                  key={index}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-3/4 px-4 py-3 rounded-2xl ${
                      message.role === "user"
                        ? "bg-green-700 text-white"
                        : "bg-gray-100 text-gray-800"
                    } ${
                      message.role === "user"
                        ? "rounded-tr-none"
                        : "rounded-tl-none"
                    }`}
                    dir={isHebr ? "rtl" : "ltr"}
                  >
                    {message.role === "assistant" && (
                      <div className="flex items-center mb-1">
                        <Leaf size={14} className="text-green-600 mr-1" />
                        <span className="text-xs font-medium text-green-600">
                          Smart Farm AI
                        </span>
                      </div>
                    )}
                    <div className="whitespace-pre-wrap">
                      {message.role === "assistant"
                        ? // Process the text to properly format bold text
                          message.content
                            .split(/(\*\*.*?\*\*)/g)
                            .map((part, i) => {
                              if (
                                part.startsWith("**") &&
                                part.endsWith("**")
                              ) {
                                return (
                                  <strong key={i}>{part.slice(2, -2)}</strong>
                                );
                              }
                              return <span key={i}>{part}</span>;
                            })
                        : message.content}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Typing indicator when message is being typed */}
            {typingMessage && (
              <div className="flex flex-col">
                <div className="flex justify-start">
                  <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-tl-none">
                    <div className="flex items-center mb-1">
                      <Leaf size={14} className="text-green-600 mr-1" />
                      <span className="text-xs font-medium text-green-600">
                        Smart Farm AI
                      </span>
                    </div>
                    <div className="whitespace-pre-wrap">
                      {typingMessage.content
                        .substring(0, typingIndex)
                        .split(/(\*\*.*?\*\*)/g)
                        .map((part, i) => {
                          if (part.startsWith("**") && part.endsWith("**")) {
                            return <strong key={i}>{part.slice(2, -2)}</strong>;
                          }
                          return <span key={i}>{part}</span>;
                        })}
                      <span className="inline-block w-1 h-4 ml-0.5 bg-green-600 animate-pulse"></span>
                    </div>
                  </div>
                </div>

                {/* Stop typing button */}
                <div className="flex justify-center mt-2">
                  <button
                    onClick={stopTyping}
                    className="px-3 py-1 text-xs text-green-600 bg-white border border-green-300 rounded-full hover:bg-green-50 transition-colors shadow-sm"
                  >
                    Show full answer
                  </button>
                </div>
              </div>
            )}

            {isLoading && !typingMessage && (
              <div className="flex justify-start">
                <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-tl-none">
                  <div className="flex items-center mb-1">
                    <Leaf size={14} className="text-green-600 mr-1" />
                    <span className="text-xs font-medium text-green-600">
                      Smart Farm AI
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-600 rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-green-600 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-green-600 rounded-full animate-bounce"
                      style={{ animationDelay: "0.4s" }}
                    ></div>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="mx-auto max-w-md">
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  <p className="font-medium">Error</p>
                  <p>{error}</p>
                </div>
              </div>
            )}
          </div>

          {/* Quick Suggestions */}
          {showSuggestions && (
            <div className="px-4 pb-3 border-t border-gray-100">
              <p className="text-xs text-gray-500 mt-3 mb-2">Quick Questions</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="bg-green-50 hover:bg-green-100 text-green-800 text-sm px-3 py-2 rounded-full transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="border-t border-gray-200 p-3 bg-gray-50">
            <div className="flex items-center bg-white rounded-full border border-gray-300 pl-4 pr-2 py-1 overflow-hidden">
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={handleKeyPress}
                placeholder="Ask about crops, pests, irrigation..."
                className="flex-1 outline-none text-gray-800 min-h-[40px]"
                disabled={isLoading || typingMessage !== null}
                dir={isHebrew(inputText) ? "rtl" : "ltr"}
              />
              <button
                onClick={() => sendMessage()}
                disabled={
                  isLoading || typingMessage !== null || !inputText.trim()
                }
                className={`
                  p-2 rounded-full ml-1
                  ${
                    isLoading || typingMessage !== null || !inputText.trim()
                      ? "text-gray-400 cursor-not-allowed"
                      : "text-white bg-green-700 hover:bg-green-800"
                  }
                `}
              >
                <Send size={18} />
              </button>
            </div>
            <div className="flex justify-between mt-2 px-1">
              <button
                className="text-xs text-gray-500 hover:text-gray-700 flex items-center"
                onClick={() => setShowSuggestions(!showSuggestions)}
              >
                <PlusCircle size={12} className="mr-1" />
                {showSuggestions ? "Hide suggestions" : "Show suggestions"}
              </button>
              <p className="text-xs text-gray-500">
                Powered by Gemini 2.0 Flash
              </p>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-center text-xs text-gray-500 mt-2">
          Smart Farm AI Assistant provides agricultural insights and advice
        </div>
      </div>
    </div>
  );
};

export default GeminiSmartFarm;
