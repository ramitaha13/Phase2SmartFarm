import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import {
  ChevronLeft,
  Search,
  Film,
  Image as ImageIcon,
  FileType,
  File,
  FileText,
  Download,
  ExternalLink,
  Calendar,
  Info,
  Trash2,
  AlertCircle,
  CheckCircle,
  Eye,
  X,
  Play,
  File as FileIcon,
} from "lucide-react";

const MediaGallery = () => {
  // Navigation
  const navigate = useNavigate();

  // States
  const [mediaItems, setMediaItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [videoThumbnails, setVideoThumbnails] = useState({});

  // Refs
  const videoRefs = useRef({});

  // Fetch all media items
  useEffect(() => {
    const fetchMediaItems = async () => {
      setLoading(true);
      setError("");

      try {
        // Fetch from all collections
        const collectionsToFetch = [
          "all_media",
          "all_videos",
          "all_images",
          "all_notes",
        ];

        let allItems = [];

        // Fetch from each collection
        for (const collectionName of collectionsToFetch) {
          try {
            const mediaRef = collection(db, collectionName);
            const q = query(mediaRef, orderBy("createdAt", "desc"));
            const querySnapshot = await getDocs(q);

            querySnapshot.forEach((doc) => {
              allItems.push({
                id: doc.id,
                collectionName, // Store the collection name for delete operations
                ...doc.data(),
                // Convert Firestore timestamp to JS Date
                createdAt: doc.data().createdAt
                  ? doc.data().createdAt.toDate()
                  : new Date(),
              });
            });
          } catch (collectionError) {
            console.error(
              `Error fetching from ${collectionName}:`,
              collectionError
            );
            // Continue with other collections even if one fails
          }
        }

        // Remove duplicates (items that might exist in multiple collections)
        const uniqueItems = allItems.filter(
          (item, index, self) =>
            index === self.findIndex((t) => t.id === item.id)
        );

        setMediaItems(uniqueItems);
      } catch (err) {
        console.error("Error fetching media items:", err);
        setError("An error occurred while fetching data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchMediaItems();
  }, [deleteSuccess]);

  // Generate thumbnails for videos after media items are loaded
  useEffect(() => {
    // Process videos to create thumbnails
    const videoItems = mediaItems
      .filter(
        (item) =>
          item.mediaItems &&
          item.mediaItems.some((media) => media.type === "video")
      )
      .flatMap((item) =>
        item.mediaItems
          .filter((media) => media.type === "video")
          .map((media) => ({ id: item.id, mediaUrl: media.url }))
      );

    // Use a thumbnail service or video poster if available
    // For simplicity, we'll just use a placeholder for now
    const newThumbnails = {};
    videoItems.forEach(({ id, mediaUrl }) => {
      // Create a unique key for each video
      const videoKey = `${id}-${mediaUrl}`;

      // We could use a real thumbnail service here
      // For now, we'll just use a generic video thumbnail placeholder
      newThumbnails[videoKey] = "/video-thumbnail-placeholder.jpg";

      // In a real implementation, you might want to generate actual thumbnails:
      // 1. Using a cloud function that generates thumbnails when videos are uploaded
      // 2. Using a video thumbnail service
      // 3. Using the poster attribute of video elements
    });

    setVideoThumbnails(newThumbnails);
  }, [mediaItems]);

  // Filter media items based on search
  const filteredMediaItems = mediaItems.filter((item) => {
    // Search filter
    const matchesSearch =
      !searchQuery ||
      item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description &&
        item.description.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesSearch;
  });

  // Handle back button click
  const handleBackClick = () => {
    navigate(-1);
  };

  // Format date - UPDATED to show date in dd/mm/yyyy hh:mm am/pm format
  const formatDate = (date) => {
    if (!date) return "";

    // Format: dd/mm/yyyy hh:mm am/pm
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();

    // For time, use 12-hour format
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM"; // English AM/PM

    // Convert hours to 12-hour format
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const formattedHours = hours.toString().padStart(2, "0");

    return `${day}/${month}/${year}    ${formattedHours}:${minutes} ${ampm}`;
  };

  // Format file size
  const formatFileSize = (sizeInBytes) => {
    if (!sizeInBytes) return "Unknown size";
    const sizeInMB = sizeInBytes / 1024 / 1024;
    return `${sizeInMB.toFixed(2)} MB`;
  };

  // Detect file type from extension or mime type
  const detectFileType = (media) => {
    // First check if we already have a defined type
    if (media.type && media.type !== "document") {
      return media.type;
    }

    // Check filename for extensions
    if (media.name) {
      const name = media.name.toLowerCase();
      if (name.endsWith(".doc") || name.endsWith(".docx")) {
        return "word";
      } else if (name.endsWith(".pdf")) {
        return "pdf";
      } else if (name.endsWith(".xls") || name.endsWith(".xlsx")) {
        return "excel";
      } else if (name.endsWith(".ppt") || name.endsWith(".pptx")) {
        return "powerpoint";
      } else if (name.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/)) {
        return "image";
      } else if (name.match(/\.(mp4|mov|avi|wmv|flv|webm)$/)) {
        return "video";
      }
    }

    // Check URL for extensions
    if (media.url) {
      const url = media.url.toLowerCase();
      if (url.includes(".doc") || url.includes(".docx")) {
        return "word";
      } else if (url.includes(".pdf")) {
        return "pdf";
      } else if (url.includes(".xls") || url.includes(".xlsx")) {
        return "excel";
      } else if (url.includes(".ppt") || url.includes(".pptx")) {
        return "powerpoint";
      }
    }

    // Check mime type if available
    if (media.mimeType) {
      const mimeType = media.mimeType.toLowerCase();
      if (
        mimeType.includes("word") ||
        mimeType === "application/msword" ||
        mimeType ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        return "word";
      } else if (mimeType === "application/pdf") {
        return "pdf";
      } else if (
        mimeType.includes("excel") ||
        mimeType === "application/vnd.ms-excel" ||
        mimeType ===
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      ) {
        return "excel";
      } else if (
        mimeType.includes("powerpoint") ||
        mimeType === "application/vnd.ms-powerpoint" ||
        mimeType ===
          "application/vnd.openxmlformats-officedocument.presentationml.presentation"
      ) {
        return "powerpoint";
      } else if (mimeType.startsWith("image/")) {
        return "image";
      } else if (mimeType.startsWith("video/")) {
        return "video";
      }
    }

    // Default to the original type or 'document' if it's not specified
    return media.type || "document";
  };

  // Get appropriate icon for media type
  const getMediaTypeIcon = (type) => {
    switch (type) {
      case "video":
        return <Film className="h-5 w-5 text-blue-500" />;
      case "image":
        return <ImageIcon className="h-5 w-5 text-green-500" />;
      case "pdf":
        return <FileType className="h-5 w-5 text-red-500" />;
      case "word":
        return <FileText className="h-5 w-5 text-blue-700" />;
      case "excel":
        return <FileText className="h-5 w-5 text-green-700" />;
      case "powerpoint":
        return <FileText className="h-5 w-5 text-orange-500" />;
      case "document":
        return <FileText className="h-5 w-5 text-purple-500" />;
      default:
        return <File className="h-5 w-5 text-gray-500" />;
    }
  };

  // Get media type name in English
  const getMediaTypeName = (type) => {
    switch (type) {
      case "video":
        return "Video";
      case "image":
        return "Image";
      case "pdf":
        return "PDF File";
      case "word":
        return "Word Document";
      case "excel":
        return "Excel Spreadsheet";
      case "powerpoint":
        return "PowerPoint";
      case "document":
        return "Document";
      default:
        return "note";
    }
  };

  // Get file type background color
  const getFileTypeColor = (fileType) => {
    switch (fileType) {
      case "video":
        return "bg-blue-500";
      case "image":
        return "bg-green-500";
      case "pdf":
        return "bg-red-500";
      case "word":
        return "bg-blue-700";
      case "excel":
        return "bg-green-700";
      case "powerpoint":
        return "bg-orange-500";
      case "document":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  // Get file type text color
  const getFileTypeTextColor = (fileType) => {
    switch (fileType) {
      case "video":
        return "text-blue-500";
      case "image":
        return "text-green-500";
      case "pdf":
        return "text-red-500";
      case "word":
        return "text-blue-700";
      case "excel":
        return "text-green-700";
      case "powerpoint":
        return "text-orange-500";
      case "document":
        return "text-purple-500";
      default:
        return "text-gray-500";
    }
  };

  // Get file type badge color
  const getFileTypeBadgeColor = (fileType) => {
    switch (fileType) {
      case "video":
        return "bg-blue-100 text-blue-700";
      case "image":
        return "bg-green-100 text-green-700";
      case "pdf":
        return "bg-red-100 text-red-700";
      case "word":
        return "bg-blue-50 text-blue-700";
      case "excel":
        return "bg-green-50 text-green-700";
      case "powerpoint":
        return "bg-orange-50 text-orange-700";
      case "document":
        return "bg-purple-100 text-purple-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  // Simplified direct download
  const handleDownload = (url, filename) => {
    if (!url) return;

    // Create a direct download link
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || "download";
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Handle PDF view directly
  const handlePdfView = (url) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // Handle media item click - show preview
  const handleMediaItemClick = (item) => {
    setSelectedMedia(item);
    setSelectedMediaIndex(0);
    setShowPreviewModal(true);
  };

  // Handle delete confirmation
  const handleDeleteConfirm = (item) => {
    setDeleteConfirm(item);
  };

  // Handle delete media
  const handleDeleteMedia = async () => {
    if (!deleteConfirm) return;

    setIsDeleting(true);

    try {
      // Delete from Firestore
      await deleteDoc(doc(db, deleteConfirm.collectionName, deleteConfirm.id));

      // Update state
      setDeleteSuccess(true);
      setDeleteConfirm(null);

      // Close modal if it's open
      if (
        showPreviewModal &&
        selectedMedia &&
        selectedMedia.id === deleteConfirm.id
      ) {
        setShowPreviewModal(false);
        setSelectedMedia(null);
      }

      // Show success message temporarily
      setTimeout(() => {
        setDeleteSuccess(false);
      }, 3000);
    } catch (err) {
      console.error("Error deleting item:", err);
      setError("An error occurred while deleting the item. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Close modal
  const closeModal = () => {
    setShowPreviewModal(false);
    setSelectedMedia(null);
  };

  // Get primary media type for an item (for display purposes)
  const getPrimaryMediaType = (item) => {
    if (!item.mediaItems || item.mediaItems.length === 0) {
      return "other";
    }

    // Check if there are multiple media types
    const types = [
      ...new Set(item.mediaItems.map((media) => detectFileType(media))),
    ];

    if (types.length === 1) {
      return types[0]; // Return the single type
    }

    // Return the first item's type or decide based on some other logic
    return detectFileType(item.mediaItems[0]);
  };

  // Generate a video thumbnail or placeholder
  const getVideoThumbnail = (item, mediaItem) => {
    const videoKey = `${item.id}-${mediaItem.url}`;
    return videoThumbnails[videoKey] || null;
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="ltr">
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
            <h1 className="text-2xl font-bold text-gray-900">Media Gallery</h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Alert Messages */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              <div>{error}</div>
            </div>
          </div>
        )}

        {deleteSuccess && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            <div className="flex">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              <div>Item deleted successfully</div>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              placeholder="Search by title or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredMediaItems.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 flex flex-col items-center justify-center text-center">
            <Info className="h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-xl font-medium text-gray-800 mb-2">
              No Items Found
            </h3>
            <p className="text-gray-500 max-w-md">
              No media items were found. You can add new media using the add
              button.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6">
            {filteredMediaItems.map((item) => {
              const primaryType = getPrimaryMediaType(item);
              return (
                <div
                  key={item.id}
                  className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* Card Header - Media Preview */}
                  <div
                    className="aspect-video bg-gray-100 cursor-pointer relative"
                    onClick={() => handleMediaItemClick(item)}
                  >
                    {item.mediaItems && item.mediaItems.length > 0 ? (
                      detectFileType(item.mediaItems[0]) === "image" ? (
                        <img
                          src={item.mediaItems[0].url}
                          alt={item.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "/image-placeholder.jpg"; // Fallback image
                          }}
                        />
                      ) : detectFileType(item.mediaItems[0]) === "video" ? (
                        <div className="w-full h-full relative">
                          {/* Video thumbnail with overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent z-10"></div>
                          <div className="absolute inset-0 flex items-center justify-center z-20">
                            <div className="w-12 h-12 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center">
                              <Play
                                className="h-6 w-6 text-white"
                                fill="white"
                              />
                            </div>
                          </div>
                          <div className="w-full h-full bg-gray-800 overflow-hidden">
                            <video
                              ref={(el) =>
                                el &&
                                (videoRefs.current[
                                  `${item.id}-${item.mediaItems[0].url}`
                                ] = el)
                              }
                              src={item.mediaItems[0].url}
                              className="w-full h-full object-cover"
                              preload="metadata"
                              muted
                              playsInline
                              onLoadedMetadata={(e) => {
                                // Try to set the current time to get a thumbnail
                                try {
                                  e.target.currentTime = 1;
                                } catch (err) {
                                  console.error(
                                    "Couldn't set video time:",
                                    err
                                  );
                                }
                              }}
                            />
                          </div>
                          <div className="absolute bottom-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-md z-20">
                            {getMediaTypeName(
                              detectFileType(item.mediaItems[0])
                            )}
                          </div>
                        </div>
                      ) : detectFileType(item.mediaItems[0]) === "pdf" ? (
                        <div className="w-full h-full flex flex-col items-center justify-center">
                          <div
                            className={`p-4 rounded-full ${getFileTypeColor(
                              "pdf"
                            )} mb-2`}
                          >
                            <FileType className="h-8 w-8 text-white" />
                          </div>
                          <p className="text-sm font-medium text-gray-700 truncate max-w-[80%]">
                            {item.mediaItems[0].name}
                          </p>
                          <div className="absolute bottom-2 left-2 bg-red-600 text-white text-xs px-2 py-1 rounded-md">
                            PDF
                          </div>
                        </div>
                      ) : detectFileType(item.mediaItems[0]) === "word" ? (
                        <div className="w-full h-full flex flex-col items-center justify-center">
                          <div
                            className={`p-4 rounded-full ${getFileTypeColor(
                              "word"
                            )} mb-2`}
                          >
                            <FileText className="h-8 w-8 text-white" />
                          </div>
                          <p className="text-sm font-medium text-gray-700 truncate max-w-[80%]">
                            {item.mediaItems[0].name}
                          </p>
                          <div className="absolute bottom-2 left-2 bg-blue-700 text-white text-xs px-2 py-1 rounded-md">
                            Word
                          </div>
                        </div>
                      ) : detectFileType(item.mediaItems[0]) === "excel" ? (
                        <div className="w-full h-full flex flex-col items-center justify-center">
                          <div
                            className={`p-4 rounded-full ${getFileTypeColor(
                              "excel"
                            )} mb-2`}
                          >
                            <FileText className="h-8 w-8 text-white" />
                          </div>
                          <p className="text-sm font-medium text-gray-700 truncate max-w-[80%]">
                            {item.mediaItems[0].name}
                          </p>
                          <div className="absolute bottom-2 left-2 bg-green-700 text-white text-xs px-2 py-1 rounded-md">
                            Excel
                          </div>
                        </div>
                      ) : detectFileType(item.mediaItems[0]) ===
                        "powerpoint" ? (
                        <div className="w-full h-full flex flex-col items-center justify-center">
                          <div
                            className={`p-4 rounded-full ${getFileTypeColor(
                              "powerpoint"
                            )} mb-2`}
                          >
                            <FileText className="h-8 w-8 text-white" />
                          </div>
                          <p className="text-sm font-medium text-gray-700 truncate max-w-[80%]">
                            {item.mediaItems[0].name}
                          </p>
                          <div className="absolute bottom-2 left-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-md">
                            PowerPoint
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <div
                            className={`p-4 rounded-full ${getFileTypeColor(
                              detectFileType(item.mediaItems[0])
                            )}`}
                          >
                            {getMediaTypeIcon(
                              detectFileType(item.mediaItems[0])
                            )}
                          </div>
                          <div className="absolute bottom-2 left-2 bg-purple-600 text-white text-xs px-2 py-1 rounded-md">
                            {getMediaTypeName(
                              detectFileType(item.mediaItems[0])
                            )}
                          </div>
                        </div>
                      )
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FileIcon className="h-10 w-10 text-gray-400" />
                      </div>
                    )}

                    {/* Item count badge */}
                    {item.mediaItems && item.mediaItems.length > 1 && (
                      <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-md z-20">
                        {item.mediaItems.length} items
                      </div>
                    )}
                  </div>

                  {/* Card Body - Content */}
                  <div className="p-5">
                    {/* Type Badge */}
                    <div className="flex justify-between items-center mb-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getFileTypeBadgeColor(
                          primaryType
                        )}`}
                      >
                        {getMediaTypeIcon(primaryType)}
                        <span className="ml-1">
                          {getMediaTypeName(primaryType)}
                        </span>
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatDate(item.createdAt)}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {item.title}
                    </h3>

                    {/* Description */}
                    {item.description && (
                      <p className="text-sm text-gray-600 line-clamp-3 mb-4">
                        {item.description}
                      </p>
                    )}

                    {/* Actions */}
                    <div className="flex justify-between items-center mt-4">
                      <button
                        onClick={() => handleMediaItemClick(item)}
                        className="flex items-center text-blue-600 hover:text-blue-800"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        <span>View Details</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteConfirm(item);
                        }}
                        className="flex items-center text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Confirm Deletion
            </h3>
            <p className="text-gray-700">
              Are you sure you want to delete "{deleteConfirm.title}"? This
              action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteMedia}
                className={`px-4 py-2 text-white bg-red-500 rounded-md hover:bg-red-600 flex items-center ${
                  isDeleting ? "opacity-75 cursor-not-allowed" : ""
                }`}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    <span>Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Media Preview Modal - IMPROVED FOR MOBILE */}
      {showPreviewModal && selectedMedia && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[95vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-3 sm:p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                {selectedMedia.title}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700 p-1"
              >
                <X className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-auto p-3 sm:p-4">
              {selectedMedia.mediaItems &&
                selectedMedia.mediaItems.length > 0 && (
                  <div className="mb-4 sm:mb-6">
                    {/* Media Display */}
                    <div className="relative w-full aspect-video bg-gray-50 rounded-lg overflow-hidden mb-4">
                      {detectFileType(
                        selectedMedia.mediaItems[selectedMediaIndex]
                      ) === "video" ? (
                        <video
                          src={selectedMedia.mediaItems[selectedMediaIndex].url}
                          controls
                          autoPlay
                          controlsList="nodownload"
                          className="w-full h-full object-contain"
                        />
                      ) : detectFileType(
                          selectedMedia.mediaItems[selectedMediaIndex]
                        ) === "image" ? (
                        <img
                          src={selectedMedia.mediaItems[selectedMediaIndex].url}
                          alt={selectedMedia.title}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "/image-placeholder.jpg"; // Fallback image
                          }}
                        />
                      ) : detectFileType(
                          selectedMedia.mediaItems[selectedMediaIndex]
                        ) === "pdf" ? (
                        <div className="flex flex-col items-center justify-center h-full w-full">
                          {/* PDF Action Buttons - IMPROVED FOR MOBILE */}
                          <div className="flex flex-col sm:flex-row justify-between w-full mb-4 px-2 sm:px-4 gap-2">
                            <div className="flex items-center">
                              <FileType className="h-5 w-5 sm:h-6 sm:w-6 text-red-500 mr-2 flex-shrink-0" />
                              <p className="text-base sm:text-lg font-medium text-gray-700 truncate">
                                {
                                  selectedMedia.mediaItems[selectedMediaIndex]
                                    .name
                                }
                              </p>
                            </div>
                            {/* Mobile-friendly button layout */}
                            <div className="flex gap-2 w-full sm:w-auto">
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  window.open(
                                    selectedMedia.mediaItems[selectedMediaIndex]
                                      .url,
                                    "_blank"
                                  );
                                }}
                                className="flex-1 sm:flex-initial flex items-center justify-center bg-blue-50 text-blue-700 px-3 py-1.5 rounded-md hover:bg-blue-100 transition-colors"
                              >
                                <ExternalLink className="h-4 w-4 mr-1" />
                                <span>View</span>
                              </button>
                              <a
                                href={
                                  selectedMedia.mediaItems[selectedMediaIndex]
                                    .url
                                }
                                download={
                                  selectedMedia.mediaItems[selectedMediaIndex]
                                    .name || "download.pdf"
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 sm:flex-initial flex items-center justify-center bg-gray-100 text-gray-700 px-3 py-1.5 rounded-md hover:bg-gray-200 transition-colors"
                              >
                                <Download className="h-4 w-4 mr-1" />
                                <span>Download</span>
                              </a>
                            </div>
                          </div>

                          {/* Use Google Docs PDF Viewer for Firebase Storage URLs */}
                          <div className="w-full h-full flex-grow bg-white rounded-md overflow-hidden">
                            {selectedMedia.mediaItems[
                              selectedMediaIndex
                            ].url.includes("firebasestorage.googleapis.com") ? (
                              <iframe
                                src={`https://docs.google.com/viewer?url=${encodeURIComponent(
                                  selectedMedia.mediaItems[selectedMediaIndex]
                                    .url
                                )}&embedded=true`}
                                className="w-full h-[300px] sm:h-[400px]"
                                frameBorder="0"
                                title="PDF Viewer"
                              />
                            ) : (
                              <div className="w-full h-[300px] sm:h-[400px] flex items-center justify-center bg-gray-100">
                                <div className="text-center p-4 sm:p-6">
                                  <div className="p-4 sm:p-6 rounded-full bg-red-500 mx-auto mb-3 sm:mb-4 inline-flex">
                                    <FileType className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                                  </div>
                                  <p className="text-base sm:text-lg font-medium text-gray-700 mb-2 sm:mb-4">
                                    {
                                      selectedMedia.mediaItems[
                                        selectedMediaIndex
                                      ].name
                                    }
                                  </p>
                                  <p className="text-xs sm:text-sm text-gray-600 mb-4">
                                    Preview not available. Please use the
                                    buttons above to view or download the PDF.
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : detectFileType(
                          selectedMedia.mediaItems[selectedMediaIndex]
                        ) === "word" ? (
                        <div className="flex flex-col items-center justify-center h-full p-4 sm:p-8 bg-gray-100">
                          <div className="p-4 sm:p-6 rounded-full bg-blue-700 mb-3 sm:mb-4">
                            <FileText className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                          </div>
                          <p className="text-base sm:text-lg font-medium text-gray-700 mb-1 sm:mb-2 text-center">
                            {selectedMedia.mediaItems[selectedMediaIndex].name}
                          </p>
                          <p className="text-xs sm:text-sm text-gray-500 mb-4 sm:mb-6">
                            {formatFileSize(
                              selectedMedia.mediaItems[selectedMediaIndex].size
                            )}
                          </p>
                          {/* IMPROVED MOBILE BUTTONS */}
                          <div className="flex flex-wrap sm:flex-nowrap gap-2 sm:space-x-4 w-full justify-center">
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                window.open(
                                  selectedMedia.mediaItems[selectedMediaIndex]
                                    .url,
                                  "_blank"
                                );
                              }}
                              className="flex-1 flex items-center justify-center bg-blue-50 text-blue-700 px-3 sm:px-4 py-2 rounded-md hover:bg-blue-100 transition-colors"
                            >
                              <ExternalLink className="h-4 w-4 mr-1 sm:mr-2" />
                              <span>View File</span>
                            </button>
                            <a
                              href={
                                selectedMedia.mediaItems[selectedMediaIndex].url
                              }
                              download={
                                selectedMedia.mediaItems[selectedMediaIndex]
                                  .name || "download"
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 flex items-center justify-center bg-gray-100 text-gray-700 px-3 sm:px-4 py-2 rounded-md hover:bg-gray-200 transition-colors"
                            >
                              <Download className="h-4 w-4 mr-1 sm:mr-2" />
                              <span>Download</span>
                            </a>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full p-4 sm:p-8">
                          <div
                            className={`p-4 sm:p-6 rounded-full ${getFileTypeColor(
                              detectFileType(
                                selectedMedia.mediaItems[selectedMediaIndex]
                              )
                            )} mb-3 sm:mb-4`}
                          >
                            {getMediaTypeIcon(
                              detectFileType(
                                selectedMedia.mediaItems[selectedMediaIndex]
                              )
                            )}
                          </div>
                          <p className="text-base sm:text-lg font-medium text-gray-700 mb-1 sm:mb-2 text-center">
                            {selectedMedia.mediaItems[selectedMediaIndex].name}
                          </p>
                          <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4">
                            {formatFileSize(
                              selectedMedia.mediaItems[selectedMediaIndex].size
                            )}
                          </p>
                          {/* IMPROVED MOBILE BUTTONS */}
                          <div className="flex flex-wrap sm:flex-nowrap gap-2 sm:space-x-4 w-full justify-center">
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                window.open(
                                  selectedMedia.mediaItems[selectedMediaIndex]
                                    .url,
                                  "_blank"
                                );
                              }}
                              className="flex-1 flex items-center justify-center bg-blue-50 text-blue-700 px-3 sm:px-4 py-2 rounded-md hover:bg-blue-100 transition-colors"
                            >
                              <ExternalLink className="h-4 w-4 mr-1 sm:mr-2" />
                              <span>View File</span>
                            </button>
                            <a
                              href={
                                selectedMedia.mediaItems[selectedMediaIndex].url
                              }
                              download={
                                selectedMedia.mediaItems[selectedMediaIndex]
                                  .name || "download"
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 flex items-center justify-center bg-gray-100 text-gray-700 px-3 sm:px-4 py-2 rounded-md hover:bg-gray-200 transition-colors"
                            >
                              <Download className="h-4 w-4 mr-1 sm:mr-2" />
                              <span>Download</span>
                            </a>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Thumbnails for multiple items - IMPROVED FOR MOBILE */}
                    {selectedMedia.mediaItems.length > 1 && (
                      <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 gap-1 sm:gap-2">
                        {selectedMedia.mediaItems.map((media, idx) => (
                          <div
                            key={idx}
                            className={`relative cursor-pointer rounded-md overflow-hidden border ${
                              selectedMediaIndex === idx
                                ? "border-blue-500"
                                : "border-gray-200"
                            }`}
                            onClick={() => setSelectedMediaIndex(idx)}
                          >
                            {detectFileType(media) === "image" ? (
                              <div className="aspect-square">
                                <img
                                  src={media.url}
                                  alt={`Thumbnail ${idx}`}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = "/image-placeholder.jpg"; // Fallback image
                                  }}
                                />
                              </div>
                            ) : detectFileType(media) === "video" ? (
                              <div className="aspect-square bg-gray-800 flex items-center justify-center relative">
                                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                  <Play
                                    className="h-4 w-4 text-white"
                                    fill="white"
                                  />
                                </div>
                                <video
                                  className="w-full h-full object-cover opacity-80"
                                  src={media.url}
                                  preload="metadata"
                                  muted
                                />
                              </div>
                            ) : detectFileType(media) === "pdf" ? (
                              <div className="aspect-square bg-red-100 flex items-center justify-center">
                                <FileType className="h-5 w-5 sm:h-6 sm:w-6 text-red-500" />
                              </div>
                            ) : detectFileType(media) === "word" ? (
                              <div className="aspect-square bg-blue-50 flex items-center justify-center">
                                <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-blue-700" />
                              </div>
                            ) : (
                              <div className="aspect-square bg-gray-100 flex items-center justify-center">
                                {getMediaTypeIcon(detectFileType(media))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              {/* Media Details */}
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                <h3 className="font-medium text-gray-900 mb-2 sm:mb-3">
                  Details
                </h3>
                <dl className="divide-y divide-gray-200">
                  <div className="py-2 grid grid-cols-3 gap-2 sm:gap-4">
                    <dt className="text-xs sm:text-sm font-medium text-gray-500">
                      Title
                    </dt>
                    <dd className="text-xs sm:text-sm text-gray-900 col-span-2">
                      {selectedMedia.title}
                    </dd>
                  </div>

                  {selectedMedia.description && (
                    <div className="py-2 grid grid-cols-3 gap-2 sm:gap-4">
                      <dt className="text-xs sm:text-sm font-medium text-gray-500">
                        Description
                      </dt>
                      <dd className="text-xs sm:text-sm text-gray-900 col-span-2">
                        {selectedMedia.description}
                      </dd>
                    </div>
                  )}

                  <div className="py-2 grid grid-cols-3 gap-2 sm:gap-4">
                    <dt className="text-xs sm:text-sm font-medium text-gray-500">
                      Type
                    </dt>
                    <dd className="text-xs sm:text-sm text-gray-900 col-span-2 flex items-center">
                      {getMediaTypeIcon(getPrimaryMediaType(selectedMedia))}
                      <span className="ml-2">
                        {getMediaTypeName(getPrimaryMediaType(selectedMedia))}
                      </span>
                    </dd>
                  </div>

                  <div className="py-2 grid grid-cols-3 gap-2 sm:gap-4">
                    <dt className="text-xs sm:text-sm font-medium text-gray-500">
                      Created On
                    </dt>
                    <dd className="text-xs sm:text-sm text-gray-900 col-span-2">
                      {formatDate(selectedMedia.createdAt)}
                    </dd>
                  </div>

                  <div className="py-2 grid grid-cols-3 gap-2 sm:gap-4">
                    <dt className="text-xs sm:text-sm font-medium text-gray-500">
                      File Count
                    </dt>
                    <dd className="text-xs sm:text-sm text-gray-900 col-span-2">
                      {selectedMedia.mediaCount ||
                        selectedMedia.mediaItems?.length ||
                        0}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 sm:p-4 border-t border-gray-200 flex justify-between">
              <button
                onClick={closeModal}
                className="px-3 sm:px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaGallery;
