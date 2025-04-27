import React, { useState, useRef, useEffect } from "react";
import {
  ChevronLeft,
  Tractor,
  Send,
  PlusCircle,
  Leaf,
  RotateCw,
  Sun,
  MessageSquare,
  X,
  Menu,
  Clock,
  Calendar,
  AlertTriangle,
} from "lucide-react";

const GeminiSmartFarm = () => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [typingMessage, setTypingMessage] = useState(null);
  const [typingIndex, setTypingIndex] = useState(0);
  const [typingSpeed] = useState(20); // milliseconds per character
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState(null);
  const chatContainerRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimerRef = useRef(null);
  const API_KEY = "AIzaSyAmcBSSX4S4fTkAhCmegZkDUOmou-dvSIo";
  const API_URL =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

  // Welcome message for all new conversations
  const welcomeMessageText =
    "Welcome to Smart Farm AI Assistant! I'm powered by Google's Gemini AI and ready to help with your farming questions. What would you like to know about today?";

  // Load conversations from localStorage on component mount
  useEffect(() => {
    const storedConversations = localStorage.getItem("farmConversations");
    if (storedConversations) {
      const parsedConversations = JSON.parse(storedConversations);
      setConversations(parsedConversations);

      // If there's an active conversation ID in localStorage, load it
      const activeId = localStorage.getItem("activeFarmConversation");
      if (activeId) {
        const active = parsedConversations.find((c) => c.id === activeId);
        if (active) {
          setActiveConversation(active);
          setMessages(active.messages || []);
          return; // Skip welcome message if we loaded a conversation
        }
      }
    }

    // Initial welcome message if no conversation was loaded
    const welcomeMessage = {
      role: "assistant",
      content: welcomeMessageText,
    };
    setTypingMessage(welcomeMessage);
    setTypingIndex(0);

    // Create a new conversation
    startNewConversation(welcomeMessage);
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
        setMessages((prev) => {
          const newMessages = [...prev, typingMessage];
          updateConversationMessages(newMessages);
          return newMessages;
        });
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

  // Function to save conversations to localStorage
  const saveConversations = (updatedConversations) => {
    localStorage.setItem(
      "farmConversations",
      JSON.stringify(updatedConversations)
    );
  };

  // Function to start a new conversation
  const startNewConversation = (initialMessage = null) => {
    // Stop any ongoing typing before creating a new conversation
    stopAnyOngoingTyping();

    const date = new Date();

    // Create welcome message if not provided
    const welcomeMessage = initialMessage || {
      role: "assistant",
      content: welcomeMessageText,
    };

    const newConversation = {
      id: Date.now().toString(),
      title: "New Conversation",
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      messages: initialMessage ? [initialMessage] : [], // Will be updated after typing animation
    };

    const updatedConversations = [newConversation, ...conversations];
    setConversations(updatedConversations);
    setActiveConversation(newConversation);
    setMessages([]); // Clear messages to show typing animation

    // Save to localStorage
    saveConversations(updatedConversations);
    localStorage.setItem("activeFarmConversation", newConversation.id);

    // Start typing animation for welcome message
    if (!initialMessage) {
      setTimeout(() => {
        setTypingMessage(welcomeMessage);
        setTypingIndex(0);
      }, 300);
    }
  };

  // Function to update the current conversation's messages
  const updateConversationMessages = (updatedMessages) => {
    if (!activeConversation) return;

    // Get the first user message to use as title if it exists
    let title = "New Conversation";
    const firstUserMessage = updatedMessages.find((m) => m.role === "user");
    if (firstUserMessage) {
      title = firstUserMessage.content.substring(0, 30);
      if (firstUserMessage.content.length > 30) title += "...";
    }

    const updatedConversation = {
      ...activeConversation,
      title,
      messages: updatedMessages,
    };

    const updatedConversations = conversations.map((c) =>
      c.id === activeConversation.id ? updatedConversation : c
    );

    setConversations(updatedConversations);
    setActiveConversation(updatedConversation);
    saveConversations(updatedConversations);
  };

  // Function to stop any ongoing typing or loading
  const stopAnyOngoingTyping = () => {
    // Clear any pending typing timer
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }

    // Reset typing states
    setTypingMessage(null);
    setTypingIndex(0);

    // Reset loading state
    setIsLoading(false);

    // Reset error state
    setError(null);
  };

  // Function to load a conversation
  const loadConversation = (conversation) => {
    // Stop any ongoing typing before loading another conversation
    stopAnyOngoingTyping();

    setMessages(conversation.messages || []);
    setActiveConversation(conversation);
    localStorage.setItem("activeFarmConversation", conversation.id);
    setSidebarOpen(false); // Close sidebar on mobile after selection
  };

  // Function to prompt for conversation deletion
  const promptDeleteConversation = (id, e) => {
    e.stopPropagation(); // Prevent triggering loadConversation

    // Find the conversation to be deleted
    const conversationToDelete = conversations.find((c) => c.id === id);
    if (conversationToDelete) {
      setConversationToDelete(conversationToDelete);
      setShowDeleteConfirmation(true);
    }
  };

  // Function to delete a conversation after confirmation
  const confirmDeleteConversation = () => {
    if (!conversationToDelete) return;

    const id = conversationToDelete.id;
    const updatedConversations = conversations.filter((c) => c.id !== id);
    setConversations(updatedConversations);
    saveConversations(updatedConversations);

    // If the deleted conversation was active, load another one or start fresh
    if (activeConversation && activeConversation.id === id) {
      // Stop any ongoing typing before switching
      stopAnyOngoingTyping();

      if (updatedConversations.length > 0) {
        loadConversation(updatedConversations[0]);
      } else {
        startNewConversation();
      }
    }

    // Reset confirmation dialog
    setShowDeleteConfirmation(false);
    setConversationToDelete(null);
  };

  // Function to cancel deletion
  const cancelDeleteConversation = () => {
    setShowDeleteConfirmation(false);
    setConversationToDelete(null);
  };

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
      setMessages((prev) => {
        const newMessages = [...prev, typingMessage];
        updateConversationMessages(newMessages);
        return newMessages;
      });

      // Reset typing state
      setTypingMessage(null);
      setTypingIndex(0);
    }
  };

  const sendMessage = async (text = inputText) => {
    if (!text.trim()) return;

    const userMessage = { role: "user", content: text };
    setMessages((prev) => {
      const newMessages = [...prev, userMessage];
      updateConversationMessages(newMessages);
      return newMessages;
    });
    setInputText("");
    setIsLoading(true);
    setError(null);

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
    // Stop any ongoing typing
    stopAnyOngoingTyping();

    // Start a new conversation
    startNewConversation();

    // Reset states
    setMessages([]);
  };

  // Function to go back to the previous page
  const handleBack = () => {
    window.history.go(-1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-green-100 flex relative">
      {/* Sidebar for chat history - Fixed position */}
      <div
        className={`fixed md:sticky top-0 left-0 z-40 w-72 bg-white shadow-lg transform md:transform-none h-screen ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        } transition-transform duration-300 ease-in-out flex flex-col`}
        style={{ height: "100vh" }}
      >
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-green-50">
          <h2 className="font-bold text-green-800">Chat History</h2>
          <button
            onClick={() => startNewConversation()}
            className="text-green-600 hover:text-green-800"
            title="New conversation"
          >
            <PlusCircle size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="text-center p-4 text-gray-500">
              <p>No conversations yet</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {conversations.map((conv) => (
                <li
                  key={conv.id}
                  className={`hover:bg-green-50 cursor-pointer ${
                    activeConversation?.id === conv.id ? "bg-green-100" : ""
                  }`}
                  onClick={() => loadConversation(conv)}
                >
                  <div className="p-3 flex justify-between">
                    <div className="w-11/12">
                      <div className="font-medium text-gray-800 mb-1 truncate">
                        {conv.title}
                      </div>
                      <div className="flex items-center text-xs text-gray-500">
                        <Calendar size={12} className="mr-1" />
                        <span className="mr-2">{conv.date}</span>
                        <Clock size={12} className="mr-1" />
                        <span>{conv.time}</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => promptDeleteConversation(conv.id, e)}
                      className="text-gray-400 hover:text-red-500"
                      title="Delete conversation"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="p-3 border-t border-gray-200 bg-green-50 text-center text-xs text-gray-500">
          Smart Farm AI conversations
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Updated App Bar - Mobile responsive while keeping the original Back button */}
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <button
                  onClick={handleBack}
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                  <span>Back</span>
                </button>
              </div>

              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 truncate max-w-[40%] sm:max-w-xs md:max-w-md">
                Smart Farm AI
              </h1>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="md:hidden p-2 rounded-full hover:bg-gray-100 transition-colors"
                  aria-label="Menu"
                >
                  <Menu size={18} className="text-gray-600" />
                </button>
                <span className="hidden md:inline text-xs bg-green-100 px-2 py-1 rounded-full text-green-800">
                  Powered by Gemini 2.0
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area - Improved mobile responsiveness */}
        <div className="container mx-auto p-2 sm:p-4 max-w-3xl flex-1 flex flex-col">
          {/* Weather Card - Made more responsive */}
          <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 mb-3 sm:mb-4 flex items-center justify-between">
            <div className="flex items-center">
              <Sun className="text-yellow-500 mr-2" size={24} />
              <div>
                <h3 className="font-medium">Smart Farm Dashboard</h3>
                <p className="text-sm text-gray-500">
                  Ask AI for farming insights & advice
                </p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden bg-green-50 hover:bg-green-100 text-green-800 px-3 py-1 rounded-full flex items-center text-sm transition-colors"
              >
                <MessageSquare size={14} className="mr-1" /> History
              </button>
              <button
                onClick={clearChat}
                className="bg-green-50 hover:bg-green-100 text-green-800 px-3 py-1 rounded-full flex items-center text-sm transition-colors"
              >
                <RotateCw size={14} className="mr-1" /> Reset
              </button>
            </div>
          </div>

          {/* Chat Container */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden mb-4 flex-1 flex flex-col relative">
            {/* Chat Messages Area */}
            <div
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4"
              style={{ maxHeight: "calc(100vh - 280px)" }}
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
                      className={`max-w-[85%] sm:max-w-3/4 px-3 sm:px-4 py-2 sm:py-3 rounded-2xl ${
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
                      <div className="whitespace-pre-wrap text-sm sm:text-base">
                        {message.role === "assistant"
                          ? message.content
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
                    <div className="max-w-[85%] sm:max-w-3/4 bg-gray-100 px-3 sm:px-4 py-2 sm:py-3 rounded-2xl rounded-tl-none">
                      <div className="flex items-center mb-1">
                        <Leaf size={14} className="text-green-600 mr-1" />
                        <span className="text-xs font-medium text-green-600">
                          Smart Farm AI
                        </span>
                      </div>
                      <div className="whitespace-pre-wrap text-sm sm:text-base">
                        {typingMessage.content
                          .substring(0, typingIndex)
                          .split(/(\*\*.*?\*\*)/g)
                          .map((part, i) => {
                            if (part.startsWith("**") && part.endsWith("**")) {
                              return (
                                <strong key={i}>{part.slice(2, -2)}</strong>
                              );
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
                  <div className="max-w-[85%] sm:max-w-3/4 bg-gray-100 px-3 sm:px-4 py-2 sm:py-3 rounded-2xl rounded-tl-none">
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
              <div className="flex justify-end mt-2 px-1">
                <p className="text-xs text-gray-500">
                  Powered by Gemini 2.0 Flash
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal - Made more responsive */}
      {showDeleteConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-xs sm:max-w-md w-full">
            <div className="flex items-center text-red-500 mb-3 sm:mb-4">
              <AlertTriangle className="mr-2" size={24} />
              <h3 className="text-lg font-medium">Delete Conversation</h3>
            </div>
            <p className="mb-4 text-gray-700">
              Are you sure you want to delete{" "}
              <span className="font-medium">{conversationToDelete?.title}</span>
              ? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelDeleteConversation}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteConversation}
                className="px-4 py-2 bg-red-600 rounded-md text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
};

export default GeminiSmartFarm;
