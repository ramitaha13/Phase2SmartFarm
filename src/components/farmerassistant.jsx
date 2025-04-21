import React, { useState, useRef, useEffect } from "react";

const SmartFarmChatAssistant = () => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const chatContainerRef = useRef(null);
  const inputRef = useRef(null); // Reference for the textarea input

  // Define API endpoint - corrected URL based on deployment
  const API_URL = "https://serverchatai.onrender.com/api/chat";

  useEffect(() => {
    // Scroll to bottom when new messages are added
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }

    // Focus on the input field after messages are updated (except during loading)
    if (!isLoading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [messages, isLoading]);

  // Auto-focus on the input field when component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Function to detect if text contains Hebrew characters
  const isHebrew = (text) => {
    const hebrewCharRegex = /[\u0590-\u05FF]/;
    return hebrewCharRegex.test(text);
  };

  // Function to render text with green bold formatting
  const renderTextWithGreenBold = (text) => {
    if (!text) return "";

    // Handle both markdown-style bold (**text**) and asterisk-style bold (*text*)
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);

    return parts.map((part, index) => {
      // Check if this part is bold (surrounded by ** or *)
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={index} className="text-green-600">
            {part.slice(2, -2)}
          </strong>
        );
      } else if (part.startsWith("*") && part.endsWith("*")) {
        return (
          <strong key={index} className="text-green-600">
            {part.slice(1, -1)}
          </strong>
        );
      } else {
        return part;
      }
    });
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
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
      // Auto-focus will be handled by the useEffect that monitors isLoading
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
    setMessages([]);
    setError(null);
    // Focus input after clearing chat
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleBack = () => {
    // You can implement navigation logic here
    // For example: window.history.back() or using React Router
    console.log("Back button clicked");
    // If using React Router, you could do:
    // history.goBack() or navigate(-1)
  };

  return (
    <div className="max-w-4xl mx-auto h-screen flex flex-col p-4">
      <div className="bg-white rounded-lg shadow-lg flex flex-col h-full overflow-hidden border border-green-200">
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center bg-green-50">
          <div className="flex items-center space-x-3">
            <button
              onClick={handleBack}
              className="flex items-center justify-center px-3 py-1.5 text-green-700 hover:text-green-900 bg-green-100 hover:bg-green-200 rounded-lg border border-green-300"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="ml-1">Back</span>
            </button>
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
                <div
                  className={`max-w-2xl px-4 py-2 rounded-lg ${
                    message.role === "user"
                      ? "bg-green-600 text-white"
                      : "bg-white border border-green-200 text-gray-800"
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
              </div>
            );
          })}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white px-4 py-2 rounded-lg border border-green-200">
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
              ref={inputRef} // Add ref to the textarea
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleKeyPress}
              placeholder="Type your message... / הקלד את ההודעה שלך..."
              rows="1"
              className="flex-1 resize-none border border-green-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[42px] max-h-[200px]"
              disabled={isLoading}
              style={{ overflowY: "auto" }}
              dir={isHebrew(inputText) ? "rtl" : "ltr"}
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !inputText.trim()}
              className={`
                px-4 py-2 rounded-lg text-white font-medium
                ${
                  isLoading || !inputText.trim()
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
  );
};

export default SmartFarmChatAssistant;
