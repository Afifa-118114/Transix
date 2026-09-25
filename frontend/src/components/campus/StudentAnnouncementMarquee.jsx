import React, { useState } from "react";
import { FiBell, FiX } from "react-icons/fi";

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export default function StudentAnnouncementMarquee({ announcements = [] }) {
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

  // Filter active announcements and sort newest first
  const activeAnnouncements = (announcements || [])
    .filter((a) => a.active !== false)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // If no announcements, show compact empty state (no moving marquee)
  if (activeAnnouncements.length === 0) {
    return (
      <div className="flex items-center gap-3 bg-white dark:bg-[#131c31] border border-slate-200 dark:border-slate-800 p-3 rounded-xl mb-6 text-slate-500 dark:text-slate-400 text-xs font-medium shadow-xs">
        <div className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg shrink-0">
          <FiBell className="w-4 h-4" />
        </div>
        <span>No announcements</span>
      </div>
    );
  }

  // Duplicate the announcements array to create a seamless infinite loop
  const displayItems = [...activeAnnouncements, ...activeAnnouncements];

  return (
    <>
      {/* Marquee Banner Container */}
      <div className="relative flex items-center overflow-hidden bg-gradient-to-r from-indigo-50/80 via-white to-indigo-50/80 dark:from-indigo-950/70 dark:via-[#131c31] dark:to-indigo-950/70 border border-indigo-200/80 dark:border-indigo-500/30 p-2 sm:p-2.5 rounded-xl mb-6 shadow-xs group">
        {/* Left Fixed Badge / Label */}
        <div className="flex items-center gap-1.5 shrink-0 z-10 bg-indigo-600 text-white px-2.5 py-1 rounded-lg text-xs font-bold mr-3 shadow-xs">
          <FiBell className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden sm:inline uppercase tracking-wider text-[10px]">
            Announcements
          </span>
        </div>

        {/* Scrolling Marquee Track */}
        <div className="overflow-hidden flex-1 relative whitespace-nowrap">
          <div className="inline-flex items-center animate-marquee-scroll group-hover:[animation-play-state:paused]">
            {displayItems.map((ann, idx) => (
              <button
                key={`${ann._id || idx}-${idx}`}
                type="button"
                onClick={() => setSelectedAnnouncement(ann)}
                title="Click to view announcement details"
                className="inline-flex items-center gap-3 shrink-0 text-xs font-medium text-slate-800 hover:text-indigo-600 dark:text-indigo-100 dark:hover:text-white hover:underline underline-offset-4 cursor-pointer transition-colors px-2 py-0.5 focus:outline-none"
              >
                <span className="truncate max-w-xs sm:max-w-md md:max-w-lg">
                  {ann.message}
                </span>
                <span className="text-indigo-500 dark:text-indigo-400 font-black text-sm px-2 select-none" aria-hidden="true">
                  •
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Announcement Detail Modal */}
      {selectedAnnouncement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-[#131c31] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl text-slate-900 dark:text-white">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FiBell className="text-indigo-600 dark:text-indigo-400" />
                Announcement
              </h3>
              <button
                type="button"
                onClick={() => setSelectedAnnouncement(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Announcement Full Content */}
            <div className="bg-slate-50 dark:bg-[#0a101f] border border-slate-200 dark:border-slate-800/80 rounded-xl p-4 mb-4">
              <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                {selectedAnnouncement.message}
              </p>
            </div>

            {/* Posted Date */}
            <div className="flex items-center justify-between text-xs text-indigo-600 dark:text-indigo-300 font-medium">
              <span>
                Posted on {formatDate(selectedAnnouncement.createdAt)}
              </span>
              <button
                type="button"
                onClick={() => setSelectedAnnouncement(null)}
                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
