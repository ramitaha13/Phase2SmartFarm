import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase"; // Adjust path as needed
import {
  ChevronLeft,
  Upload,
  Download,
  Film,
  Image as ImageIcon,
  X,
  Check,
  File,
  FileText,
  RefreshCw,
  AlertTriangle,
  BarChart2,
  PresentationIcon,
} from "lucide-react";

const NoteMediaUploader = () => {
  const navigate = useNavigate();

  const [mediaFiles, setMediaFiles] = useState([]);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [dragActive, setDragActive] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [error, setError] = useState("");

  const fileInputRef = useRef(null);
  const dropAreaRef = useRef(null);
  const multipleFileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.length) {
      // Filter out PDF files
      const filteredFiles = Array.from(e.dataTransfer.files).filter((file) => {
        if (
          file.type === "application/pdf" ||
          file.name.toLowerCase().endsWith(".pdf")
        ) {
          setError("PDF files are not allowed");
          return false;
        }
        return true;
      });

      if (filteredFiles.length > 0) {
        handleFiles(filteredFiles);
      }
    }
  };

  const handleFiles = (files) => {
    const newMedia = [...mediaFiles];
    let pdfDetected = false;

    files.forEach((file) => {
      // Skip PDF files
      if (
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf")
      ) {
        pdfDetected = true;
        return;
      }

      let fileType = "other";
      if (file.type.startsWith("video/")) fileType = "video";
      else if (file.type.startsWith("image/")) fileType = "image";
      else if (file.type.includes("text/") || file.type.includes("document"))
        fileType = "document";

      // Handle Excel files
      if (
        file.type === "application/vnd.ms-excel" ||
        file.type ===
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        file.name.toLowerCase().endsWith(".xls") ||
        file.name.toLowerCase().endsWith(".xlsx")
      ) {
        fileType = "excel";
      }

      // Handle PowerPoint files
      if (
        file.type === "application/vnd.ms-powerpoint" ||
        file.type ===
          "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
        file.name.toLowerCase().endsWith(".ppt") ||
        file.name.toLowerCase().endsWith(".pptx")
      ) {
        fileType = "powerpoint";
      }

      // Handle Word files by extension
      if (
        file.name.toLowerCase().endsWith(".doc") ||
        file.name.toLowerCase().endsWith(".docx")
      ) {
        fileType = "word";
      }

      if (fileType) {
        newMedia.push({
          file,
          type: fileType,
          preview:
            fileType === "image" || fileType === "video"
              ? URL.createObjectURL(file)
              : null,
          name: file.name,
          size: file.size,
        });
      }
    });

    if (pdfDetected) {
      setError("PDF files are not allowed");
    }

    if (newMedia.length > mediaFiles.length) {
      setMediaFiles(newMedia);
      setSelectedMediaIndex(mediaFiles.length);
      setUploadSuccess(false);
    }
  };

  const handleFileInputChange = (e) => {
    // Filter out PDF files from file input
    const filteredFiles = Array.from(e.target.files).filter((file) => {
      if (
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf")
      ) {
        setError("PDF files are not allowed");
        return false;
      }
      return true;
    });

    if (filteredFiles.length > 0) {
      handleFiles(filteredFiles);
    }
  };

  const removeMedia = (idx) => {
    const updated = [...mediaFiles];
    if (updated[idx]?.preview) URL.revokeObjectURL(updated[idx].preview);
    updated.splice(idx, 1);
    setMediaFiles(updated);
    setSelectedMediaIndex((prev) => Math.max(0, prev - (idx <= prev ? 1 : 0)));
  };

  const getFileIcon = (type) => {
    switch (type) {
      case "video":
        return <Film className="h-6 w-6 text-blue-500" />;
      case "image":
        return <ImageIcon className="h-6 w-6 text-green-500" />;
      case "word":
        return <FileText className="h-6 w-6 text-blue-700" />;
      case "document":
        return <FileText className="h-6 w-6 text-purple-500" />;
      case "excel":
        return <BarChart2 className="h-6 w-6 text-green-700" />;
      case "powerpoint":
        return <PresentationIcon className="h-6 w-6 text-orange-600" />;
      default:
        return <File className="h-6 w-6 text-gray-500" />;
    }
  };

  const getFileTypeColor = (type) => {
    switch (type) {
      case "video":
        return "bg-blue-500";
      case "image":
        return "bg-green-500";
      case "word":
        return "bg-blue-700";
      case "document":
        return "bg-purple-500";
      case "excel":
        return "bg-green-700";
      case "powerpoint":
        return "bg-orange-600";
      default:
        return "bg-gray-500";
    }
  };

  const downloadMedia = (idx = selectedMediaIndex) => {
    const m = mediaFiles[idx];
    if (!m) return;
    if (m.preview) {
      const a = document.createElement("a");
      a.href = m.preview;
      a.download = m.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const downloadAllMedia = () => {
    mediaFiles.forEach((_, i) => setTimeout(() => downloadMedia(i), i * 500));
  };

  const resetAll = () => {
    mediaFiles.forEach((m) => m.preview && URL.revokeObjectURL(m.preview));
    setMediaFiles([]);
    setSelectedMediaIndex(0);
    setTitle("");
    setDescription("");
    setUploadSuccess(false);
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (multipleFileInputRef.current) multipleFileInputRef.current.value = "";
  };

  const handleUpload = async () => {
    if (!title.trim()) {
      setError("Please enter a title");
      return;
    }
    setIsUploading(true);
    setError("");
    setUploadProgress(0);

    try {
      let uploadedUrls = [];
      if (mediaFiles.length > 0) {
        for (let i = 0; i < mediaFiles.length; i++) {
          const item = mediaFiles[i];
          setUploadProgress(Math.floor((i / mediaFiles.length) * 100));
          const formData = new FormData();
          formData.append("file", item.file);
          formData.append("upload_preset", "rami123");
          let endpoint =
            "https://api.cloudinary.com/v1_1/drrpopjnm/image/upload";
          if (item.type === "video")
            endpoint = "https://api.cloudinary.com/v1_1/drrpopjnm/video/upload";
          else if (
            ["document", "word", "excel", "powerpoint", "other"].includes(
              item.type
            )
          )
            endpoint = "https://api.cloudinary.com/v1_1/drrpopjnm/raw/upload";
          const res = await fetch(endpoint, { method: "POST", body: formData });
          const data = await res.json();
          if (data.secure_url) {
            uploadedUrls.push({
              url: data.secure_url,
              type: item.type,
              name: item.name,
              size: item.size,
            });
          } else throw new Error(`Upload failed for ${item.name}`);
        }
        setUploadProgress(100);
      }

      const noteData = {
        title: title.trim(),
        description: description.trim(),
        createdAt: serverTimestamp(),
      };
      let collectionName = "all_notes";
      if (uploadedUrls.length) {
        noteData.mediaCount = uploadedUrls.length;
        noteData.mediaItems = uploadedUrls;
        // existing logic to pick mixed/images/videos collections:
        const hasVid = uploadedUrls.some((i) => i.type === "video");
        const hasImg = uploadedUrls.some((i) => i.type === "image");
        const hasDoc = uploadedUrls.some((i) =>
          ["document", "word", "excel", "powerpoint", "other"].includes(i.type)
        );
        if (hasVid && !hasImg && !hasDoc) collectionName = "all_videos";
        else if (hasImg && !hasVid && !hasDoc) collectionName = "all_images";
        else if (hasDoc && !hasVid && !hasImg) collectionName = "all_notes";
        else collectionName = "all_media";
      }

      await addDoc(collection(db, collectionName), noteData);
      setUploadSuccess(true);

      // Reset all fields after successful upload
      mediaFiles.forEach((m) => m.preview && URL.revokeObjectURL(m.preview));
      setMediaFiles([]);
      setSelectedMediaIndex(0);
      setTitle("");
      setDescription("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (multipleFileInputRef.current) multipleFileInputRef.current.value = "";

      // Set a timeout to clear the success message after a few seconds
      setTimeout(() => {
        setUploadSuccess(false);
      }, 3000);
    } catch (err) {
      console.error(err);
      setError("Failed to save. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleBackClick = () => navigate(-1);

  return (
    <div className="min-h-screen bg-gray-50" dir="ltr">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <button
            onClick={handleBackClick}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ChevronLeft className="h-5 w-5" />
            <span className="ml-1">Back</span>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            Add Notes & Media
          </h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
              <div>{error}</div>
            </div>
          </div>
        )}
        {uploadSuccess && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            <div className="flex items-center">
              <Check className="h-5 w-5 text-green-500 mr-2" />
              <div>Saved successfully!</div>
            </div>
          </div>
        )}

        {/* Upload Area */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold flex items-center">
              <Upload className="h-5 w-5 mr-2" /> Upload Files
            </h2>
            <button
              onClick={resetAll}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <RefreshCw className="h-4 w-4 mr-1" /> Reset
            </button>
          </div>
          <div
            ref={dropAreaRef}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`w-full border-2 border-dashed rounded-lg transition-colors ${
              dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"
            }`}
            style={{ minHeight: "250px" }}
          >
            <div className="flex flex-col items-center justify-center h-full py-8">
              <div className="flex space-x-4 mb-4">
                <Film className="h-8 w-8 text-gray-400" />
                <ImageIcon className="h-8 w-8 text-gray-400" />
                <FileText className="h-8 w-8 text-gray-400" />
                <BarChart2 className="h-8 w-8 text-gray-400" />
                <PresentationIcon className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-lg font-medium mb-2 text-gray-700">
                Drag and drop files here
              </p>
              <p className="mb-4 text-sm text-gray-500">
                You can upload images, videos, documents, Excel, and PowerPoint
                files
              </p>
              <p className="mb-6 text-gray-500">or</p>
              <div className="flex gap-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*,image/*,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                  className="hidden"
                  onChange={handleFileInputChange}
                  id="singleFileInput"
                />
                <label
                  htmlFor="singleFileInput"
                  className="flex items-center bg-gray-100 px-4 py-2 rounded-md cursor-pointer hover:bg-gray-200"
                >
                  <Upload className="h-4 w-4 mr-2" /> Choose File
                </label>
                <input
                  ref={multipleFileInputRef}
                  type="file"
                  multiple
                  accept="video/*,image/*,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                  className="hidden"
                  onChange={handleFileInputChange}
                  id="multipleFileInput"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Preview + Details */}
        <div
          className={`grid grid-cols-1 ${
            mediaFiles.length > 0 ? "md:grid-cols-2" : ""
          } gap-6 mb-6`}
        >
          {mediaFiles.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              {/* File Preview */}
              <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-semibold text-gray-900">File Preview</h3>
                <span className="text-gray-500 text-sm">
                  {selectedMediaIndex + 1} of {mediaFiles.length}
                </span>
              </div>
              <div className="p-4">
                <div className="relative w-full aspect-video bg-gray-50 rounded-lg overflow-hidden mb-4">
                  {mediaFiles[selectedMediaIndex]?.type === "video" ? (
                    <video
                      src={mediaFiles[selectedMediaIndex].preview}
                      controls
                      className="w-full h-full object-contain"
                    />
                  ) : mediaFiles[selectedMediaIndex]?.type === "image" ? (
                    <img
                      src={mediaFiles[selectedMediaIndex].preview}
                      alt="Selected"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full">
                      <div
                        className={`p-4 rounded-full ${getFileTypeColor(
                          mediaFiles[selectedMediaIndex].type
                        )} mb-4`}
                      >
                        {getFileIcon(mediaFiles[selectedMediaIndex].type)}
                      </div>
                      <p className="text-lg font-medium text-gray-700">
                        {mediaFiles[selectedMediaIndex].name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {(
                          mediaFiles[selectedMediaIndex].size /
                          1024 /
                          1024
                        ).toFixed(2)}{" "}
                        MB
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={() => downloadMedia()}
                    className="flex items-center bg-gray-100 px-4 py-2 rounded-md hover:bg-gray-200"
                  >
                    <Download className="h-4 w-4 mr-2" /> Download
                  </button>
                  {mediaFiles.length > 1 && (
                    <button
                      onClick={downloadAllMedia}
                      className="flex items-center bg-gray-100 px-4 py-2 rounded-md hover:bg-gray-200"
                    >
                      <Download className="h-4 w-4 mr-2" /> Download All
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Note Details */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">
                {mediaFiles.length > 0 ? "Note Details" : "New Note"}
              </h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label htmlFor="mediaTitle" className="block font-medium mb-1">
                  Title *
                </label>
                <input
                  id="mediaTitle"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Enter title"
                />
              </div>
              <div>
                <label
                  htmlFor="mediaDescription"
                  className="block font-medium mb-1"
                >
                  Description
                </label>
                <textarea
                  id="mediaDescription"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  rows={4}
                  placeholder="Enter description (optional)"
                />
              </div>
              <div>
                {!isUploading && !uploadSuccess ? (
                  <button
                    onClick={handleUpload}
                    className="w-full py-2 rounded bg-green-600 text-white hover:bg-green-700"
                  >
                    {mediaFiles.length > 0
                      ? `Upload ${mediaFiles.length > 1 ? "Files" : "File"}`
                      : "Save Note"}
                  </button>
                ) : isUploading ? (
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-green-600 h-2.5 rounded-full"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                    <p className="text-sm text-gray-600 mt-1">
                      Uploading... {uploadProgress}%
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center text-green-600">
                    <Check className="h-5 w-5 mr-2" /> Saved successfully!
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Thumbnails Grid */}
        {mediaFiles.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">
              Selected Files ({mediaFiles.length})
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {mediaFiles.map((m, i) => (
                <div
                  key={i}
                  onClick={() => setSelectedMediaIndex(i)}
                  className={`relative rounded-lg overflow-hidden cursor-pointer border ${
                    selectedMediaIndex === i
                      ? "border-blue-500"
                      : "border-gray-200"
                  }`}
                >
                  <div className="aspect-square flex items-center justify-center bg-gray-100 overflow-hidden">
                    {m.type === "video" && m.preview ? (
                      <>
                        <video
                          src={m.preview}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center">
                          <Film className="h-6 w-6 text-white" />
                        </div>
                      </>
                    ) : m.type === "image" && m.preview ? (
                      <img
                        src={m.preview}
                        alt={m.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div
                        className={`${getFileTypeColor(
                          m.type
                        )} w-full h-full flex items-center justify-center`}
                      >
                        {getFileIcon(m.type)}
                      </div>
                    )}
                  </div>
                  <div className="p-2 bg-white">
                    <p className="text-xs font-medium truncate">{m.name}</p>
                    <p className="text-xs text-gray-500">
                      {(m.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeMedia(i);
                    }}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Additional Info */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">
            Additional Information
          </h3>
          <div className="divide-y divide-gray-100">
            <div className="flex items-start py-3">
              <AlertTriangle className="h-5 w-5 text-blue-500 mr-3 mt-0.5" />
              <div>
                <p className="text-gray-900 font-medium">Supported Files</p>
                <p className="text-gray-600 text-sm">
                  Images (JPG, PNG, GIF), Videos (MP4, MOV), Documents (DOC,
                  DOCX), Spreadsheets (XLS, XLSX), Presentations (PPT, PPTX),
                  Text (TXT)
                </p>
              </div>
            </div>

            <div className="flex items-start py-3">
              <AlertTriangle className="h-5 w-5 text-blue-500 mr-3 mt-0.5" />
              <div>
                <p className="text-gray-900 font-medium">Upload Limits</p>
                <p className="text-gray-600 text-sm">
                  Maximum file size: 100MB per file
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NoteMediaUploader;
