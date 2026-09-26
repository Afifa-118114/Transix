import React, { useState, useEffect } from "react";
import { FiFileText, FiX, FiDownload, FiAlertCircle } from "react-icons/fi";

/**
 * Reusable Document Preview Modal
 * Renders actual uploaded images and PDFs inside the modal dialog without navigating away
 */
export default function DocumentPreviewModal({
  isOpen,
  onClose,
  title,
  fileName,
  fileType,
  url,
  previewUrl,
  blobUrl,
}) {
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    setLoadError(false);
  }, [url, previewUrl, blobUrl, isOpen]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Determine source to display (prioritize local blob for immediate zero-latency rendering, then secure preview URL, then direct URL)
  const displaySrc = blobUrl || previewUrl || url;

  // Dynamically determine file type
  const isImage =
    fileType?.startsWith("image/") ||
    /\.(jpg|jpeg|png|webp)$/i.test(fileName || url || "");

  const isPdf =
    fileType === "application/pdf" ||
    /\.pdf$/i.test(fileName || url || "");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-white dark:bg-[#131b2e]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-lg shrink-0">
              <FiFileText />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                {title || "Document Preview"}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {fileName || "Uploaded Document"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition cursor-pointer"
            aria-label="Close Preview"
          >
            <FiX className="text-lg" />
          </button>
        </div>

        {/* Modal Body: Actual Document Render */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex items-center justify-center bg-slate-50/70 dark:bg-slate-950/40 min-h-[420px]">
          {loadError ? (
            <div className="flex flex-col items-center justify-center text-center p-8 max-w-sm">
              <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center text-xl mb-3">
                <FiAlertCircle />
              </div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
                Preview unavailable in this browser.
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                The document is securely stored. You can download it directly to view.
              </p>
              {displaySrc && (
                <a
                  href={displaySrc}
                  download={fileName || "document"}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white transition flex items-center gap-1.5"
                >
                  <FiDownload className="text-xs" />
                  <span>Download Document</span>
                </a>
              )}
            </div>
          ) : isImage ? (
            /* Image Document Render */
            <div className="flex items-center justify-center w-full h-full max-h-[68vh] overflow-auto">
              <img
                src={displaySrc}
                alt={title}
                onError={() => setLoadError(true)}
                className="max-h-[68vh] max-w-full rounded-xl object-contain shadow-sm border border-slate-200/80 dark:border-slate-800"
              />
            </div>
          ) : isPdf ? (
            /* PDF Document Render (Native Inline Viewer) */
            <div className="w-full h-[68vh] relative bg-white dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xs">
              <iframe
                src={displaySrc}
                title={title || "PDF Preview"}
                onError={() => setLoadError(true)}
                className="w-full h-full border-0 rounded-xl"
              />
            </div>
          ) : (
            /* Fallback generic document */
            <div className="w-full h-[68vh] relative bg-white dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xs">
              <iframe
                src={displaySrc}
                title={title}
                onError={() => setLoadError(true)}
                className="w-full h-full border-0 rounded-xl"
              />
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800/80 bg-white dark:bg-[#131b2e] flex items-center justify-between">
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            {fileName && <span>{fileName}</span>}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition cursor-pointer"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}
