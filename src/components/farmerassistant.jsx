import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Leaf } from "lucide-react";

const FarmerAssistant = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [typingMessage, setTypingMessage] = useState(null);
  const [typingIndex, setTypingIndex] = useState(0);
  const [typingSpeed] = useState(20); // milliseconds per character
  const chatContainerRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimerRef = useRef(null);

  // Define API endpoint
  const API_URL = "https://serverchatai.onrender.com/api/chat";

  // Insert an initial greeting message when component mounts
  useEffect(() => {
    const welcomeMessage = {
      role: "assistant",
      content:
        "Welcome to Smart Farm Assistant! I'm here to help with all your farming needs. You can ask me questions about crops, irrigation, pest control, equipment, or any other agricultural topics. How can I assist you today?",
    };
    // Start typing animation for welcome message
    setTypingMessage(welcomeMessage);
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

    // Focus on the input field after messages are updated (except during loading)
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

  // Function to render text with green bold formatting
  const renderTextWithGreenBold = (text) => {
    if (!text) return "";

    // Process the text to convert **text** to bold but without showing the asterisks
    const parts = text.split(/(\*\*.*?\*\*)/g);

    return parts.map((part, index) => {
      // Check if this part is bold (surrounded by **)
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={index} className="text-green-600">
            {part.slice(2, -2)}
          </strong>
        );
      } else {
        return part;
      }
    });
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

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage = { role: "user", content: inputText };
    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "meta-llama/llama-3.1-8b-instruct/fp-8",
          messages: [...messages, userMessage],
          stream: false,
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const assistantMessage = {
        role: "assistant",
        content: data.choices[0].message.content,
      };

      // Start typing animation instead of immediately showing the message
      setTypingMessage(assistantMessage);
      setTypingIndex(0);
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
    // Auto-resize textarea
    e.target.style.height = "auto";
    e.target.style.height = e.target.scrollHeight + "px";
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

    // Start the welcome message typing animation again
    setTimeout(() => {
      const welcomeMessage = {
        role: "assistant",
        content:
          "Welcome to Smart Farm Assistant! I'm here to help with all your farming needs. You can ask me questions about crops, irrigation, pest control, equipment, or any other agricultural topics. How can I assist you today?",
      };
      setTypingMessage(welcomeMessage);
    }, 300);

    // Focus input after clearing chat
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleBackClick = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Keep the original styling */}
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
            <h1 className="text-xl font-bold text-gray-900">
              Farmer Assistant
            </h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-4 h-[calc(100vh-80px)]">
        <div className="bg-white rounded-lg shadow-lg flex flex-col h-full overflow-hidden border border-green-200">
          {/* Chat Header */}
          <div className="p-4 border-b flex justify-between items-center bg-green-50">
            <div className="flex items-center space-x-3">
              <div className="bg-green-600 rounded-full p-1.5">
                <Leaf className="h-4 w-4 text-white" />
              </div>
              <h1 className="text-xl font-bold text-green-800">
                Smart Farm Assistant / עוזר חווה חכמה
              </h1>
            </div>
            <button
              onClick={clearChat}
              className="px-3 py-1.5 text-sm text-red-600 hover:text-red-800 border border-red-300 hover:border-red-500 rounded"
            >
              Clear Chat / נקה צ'אט
            </button>
          </div>

          {/* Chat messages container */}
          <div
            ref={chatContainerRef}
            className="flex-1 p-4 overflow-y-auto space-y-4 bg-green-50/30"
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
                  {/* Avatar for assistant messages */}
                  {message.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center mr-2 flex-shrink-0">
                      <Leaf className="h-5 w-5 text-white" />
                    </div>
                  )}

                  <div
                    className={`max-w-2xl px-4 py-3 rounded-lg ${
                      message.role === "user"
                        ? "bg-green-600 text-white rounded-tr-none shadow-sm"
                        : "bg-white border border-green-200 text-gray-800 rounded-tl-none shadow-sm"
                    }`}
                    dir={isHebr ? "rtl" : "ltr"}
                  >
                    <div
                      className={`whitespace-pre-wrap font-sans ${
                        isHebr ? "text-right" : "text-left"
                      }`}
                    >
                      {renderTextWithGreenBold(message.content)}
                    </div>
                  </div>

                  {/* Avatar for user messages */}
                  {message.role === "user" && (
                    <div className="w-8 h-8 rounded-full bg-green-700 flex items-center justify-center ml-2 flex-shrink-0">
                      <span className="text-white font-medium">U</span>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Typing indicator when message is being typed */}
            {typingMessage && (
              <div className="flex flex-col">
                <div className="flex justify-start">
                  <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center mr-2 flex-shrink-0">
                    <Leaf className="h-5 w-5 text-white" />
                  </div>
                  <div className="bg-white px-4 py-3 rounded-lg border border-green-200 text-gray-800 rounded-tl-none shadow-sm">
                    <div className="whitespace-pre-wrap font-sans">
                      {renderTextWithGreenBold(
                        typingMessage.content.substring(0, typingIndex)
                      )}
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
                <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center mr-2 flex-shrink-0">
                  <Leaf className="h-5 w-5 text-white" />
                </div>
                <div className="bg-white px-4 py-2 rounded-lg border border-green-200 rounded-tl-none shadow-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-green-500 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-green-500 rounded-full animate-bounce"
                      style={{ animationDelay: "0.4s" }}
                    ></div>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="flex justify-center">
                <div className="text-red-600 bg-red-50 px-4 py-2 rounded-lg border border-red-200">
                  Error: {error}
                </div>
              </div>
            )}
          </div>

          {/* Input area */}
          <div className="p-4 border-t border-green-200 bg-green-50/50">
            <div className="flex space-x-2">
              <textarea
                ref={inputRef}
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={handleKeyPress}
                placeholder="Ask about crops, irrigation, pests, or other farming questions..."
                rows="1"
                className="flex-1 resize-none border border-green-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[42px] max-h-[200px]"
                disabled={isLoading || typingMessage !== null}
                style={{ overflowY: "auto" }}
                dir={isHebrew(inputText) ? "rtl" : "ltr"}
              />
              <button
                onClick={sendMessage}
                disabled={
                  isLoading || typingMessage !== null || !inputText.trim()
                }
                className={`
                  px-4 py-2 rounded-lg text-white font-medium
                  ${
                    isLoading || typingMessage !== null || !inputText.trim()
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-green-600 hover:bg-green-700"
                  }
                `}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FarmerAssistant;
