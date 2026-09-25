import React, { useState } from "react";
import { 
  FiBell, FiPlus, FiEye, FiEdit2, FiTrash2, FiX, FiArrowLeft, FiLoader, FiCheck
} from "react-icons/fi";
import toast from "react-hot-toast";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

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

export default function CoordinatorAnnouncementBar({ tripId, announcements = [], onRefresh }) {
  // Sort announcements newest first
  const sortedAnnouncements = [...(announcements || [])].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
  const activeAnnouncements = sortedAnnouncements.filter(a => a.active !== false);
  const latestAnnouncement = activeAnnouncements.length > 0 ? activeAnnouncements[0] : null;
  const previousAnnouncements = activeAnnouncements.length > 1 ? activeAnnouncements.slice(1) : [];

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createMessage, setCreateMessage] = useState("");
  const [createLoading, setCreateLoading] = useState(false);

  const [showReadModal, setShowReadModal] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [editMessage, setEditMessage] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  const [deletingAnnouncement, setDeletingAnnouncement] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Handlers
  const handleOpenCreate = () => {
    setCreateMessage("");
    setShowCreateModal(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createMessage.trim()) {
      toast.error("Announcement content cannot be empty");
      return;
    }

    try {
      setCreateLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/campus-trips/${tripId}/announcements`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: createMessage.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to create announcement");
      }

      toast.success("Announcement posted successfully");
      setShowCreateModal(false);
      setCreateMessage("");
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error(err.message || "Error creating announcement");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleOpenEdit = (announcement) => {
    if (!announcement) return;
    setEditingAnnouncement(announcement);
    setEditMessage(announcement.message || "");
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingAnnouncement) return;
    if (!editMessage.trim()) {
      toast.error("Announcement message cannot be empty");
      return;
    }

    try {
      setEditLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${API_URL}/campus-trips/${tripId}/announcements/${editingAnnouncement._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ message: editMessage.trim() }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to update announcement");
      }

      toast.success("Announcement updated successfully");
      
      // Update selected announcement if currently viewed inside read modal
      if (selectedAnnouncement && selectedAnnouncement._id === editingAnnouncement._id) {
        setSelectedAnnouncement({
          ...selectedAnnouncement,
          message: editMessage.trim(),
        });
      }

      setEditingAnnouncement(null);
      setEditMessage("");
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error(err.message || "Error updating announcement");
    } finally {
      setEditLoading(false);
    }
  };

  const handleOpenDelete = (announcement) => {
    if (!announcement) return;
    setDeletingAnnouncement(announcement);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingAnnouncement) return;

    try {
      setDeleteLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${API_URL}/campus-trips/${tripId}/announcements/${deletingAnnouncement._id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to delete announcement");
      }

      toast.success("Announcement deleted");
      
      // If deleted announcement was currently open in read modal, reset back to list
      if (selectedAnnouncement && selectedAnnouncement._id === deletingAnnouncement._id) {
        setSelectedAnnouncement(null);
      }

      setDeletingAnnouncement(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error(err.message || "Error deleting announcement");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <>
      {/* COMPACT DASHBOARD ANNOUNCEMENT CARD (ONE LAYER ONLY) */}
      <div className="bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/40 text-indigo-950 dark:text-indigo-200 p-3.5 rounded-xl mb-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Left: Bell Icon + Badge + Message Preview */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 p-2 rounded-lg shrink-0">
              <FiBell className="w-4 h-4" />
            </div>
            <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
              <span className="font-bold text-xs bg-indigo-200/70 dark:bg-indigo-900/60 px-2 py-0.5 rounded text-indigo-900 dark:text-indigo-200 shrink-0">
                Announcement
              </span>
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate max-w-full sm:max-w-md lg:max-w-xl">
                {latestAnnouncement ? latestAnnouncement.message : "No announcements yet"}
              </span>
            </div>
          </div>

          {/* Right: Date + Action Icons */}
          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 text-xs font-semibold pt-1 sm:pt-0 border-t sm:border-t-0 border-indigo-200/50 dark:border-indigo-800/40">
            {latestAnnouncement && (
              <span className="text-indigo-600 dark:text-indigo-400 text-xs whitespace-nowrap">
                Posted on {formatDate(latestAnnouncement.createdAt)}
              </span>
            )}
            <div className="flex items-center gap-1.5">
              {/* + Create Icon */}
              <button
                type="button"
                onClick={handleOpenCreate}
                title="Create Announcement"
                className="p-1.5 text-indigo-700 dark:text-indigo-300 hover:text-indigo-950 dark:hover:text-white hover:bg-indigo-200/60 dark:hover:bg-indigo-900/50 rounded-lg transition-colors cursor-pointer"
                aria-label="Create Announcement"
              >
                <FiPlus className="w-4 h-4" />
              </button>

              {/* Action icons available when announcements exist */}
              {latestAnnouncement && (
                <>
                  {/* Eye: Read / View Announcements */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAnnouncement(null);
                      setShowReadModal(true);
                    }}
                    title="View Announcements"
                    className="p-1.5 text-indigo-700 dark:text-indigo-300 hover:text-indigo-950 dark:hover:text-white hover:bg-indigo-200/60 dark:hover:bg-indigo-900/50 rounded-lg transition-colors cursor-pointer"
                    aria-label="View Announcements"
                  >
                    <FiEye className="w-4 h-4" />
                  </button>

                  {/* Pen: Edit Current Announcement */}
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(latestAnnouncement)}
                    title="Edit Current Announcement"
                    className="p-1.5 text-indigo-700 dark:text-indigo-300 hover:text-indigo-950 dark:hover:text-white hover:bg-indigo-200/60 dark:hover:bg-indigo-900/50 rounded-lg transition-colors cursor-pointer"
                    aria-label="Edit Current Announcement"
                  >
                    <FiEdit2 className="w-4 h-4" />
                  </button>

                  {/* Bin: Delete Current Announcement */}
                  <button
                    type="button"
                    onClick={() => handleOpenDelete(latestAnnouncement)}
                    title="Delete Current Announcement"
                    className="p-1.5 text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-200 hover:bg-rose-100 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                    aria-label="Delete Current Announcement"
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 1. CREATE ANNOUNCEMENT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white dark:bg-[#131c31] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl text-slate-900 dark:text-white">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FiBell className="text-indigo-600 dark:text-indigo-400" />
                Create Announcement
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div className="mb-5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
                  Announcement
                </label>
                <textarea
                  name="message"
                  rows="4"
                  value={createMessage}
                  onChange={(e) => setCreateMessage(e.target.value)}
                  placeholder="Enter announcement..."
                  className="w-full bg-slate-50 dark:bg-[#0a101f] border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none"
                  required
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={createLoading}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading || !createMessage.trim()}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  {createLoading ? (
                    <>
                      <FiLoader className="w-3.5 h-3.5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. READ / VIEW ANNOUNCEMENTS MODAL (HISTORY INSIDE MODAL ONLY) */}
      {showReadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-xl bg-white dark:bg-[#131c31] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl text-slate-900 dark:text-white max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                {selectedAnnouncement ? (
                  <button
                    type="button"
                    onClick={() => setSelectedAnnouncement(null)}
                    className="mr-1 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                    title="Back to all announcements"
                  >
                    <FiArrowLeft className="w-5 h-5" />
                  </button>
                ) : (
                  <FiBell className="text-indigo-600 dark:text-indigo-400" />
                )}
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {selectedAnnouncement ? "Announcement" : "Announcements"}
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowReadModal(false);
                  setSelectedAnnouncement(null);
                }}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto flex-1 pr-1 space-y-5">
              {/* Detailed View of a Selected Announcement */}
              {selectedAnnouncement ? (
                <div className="space-y-4">
                  <div className="bg-slate-50 dark:bg-[#0a101f] border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                    <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                      {selectedAnnouncement.message}
                    </p>
                    <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>Posted on {formatDate(selectedAnnouncement.createdAt)}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(selectedAnnouncement)}
                          className="flex items-center gap-1 px-2.5 py-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition-colors font-semibold cursor-pointer"
                          title="Edit this announcement"
                        >
                          <FiEdit2 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenDelete(selectedAnnouncement)}
                          className="flex items-center gap-1 px-2.5 py-1 text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors font-semibold cursor-pointer"
                          title="Delete this announcement"
                        >
                          <FiTrash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedAnnouncement(null)}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 underline underline-offset-4 flex items-center gap-1 cursor-pointer"
                  >
                    <FiArrowLeft className="w-3.5 h-3.5" />
                    Back to all announcements
                  </button>
                </div>
              ) : (
                <>
                  {/* Current / Latest Announcement */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Current Announcement
                    </h4>
                    {latestAnnouncement ? (
                      <div className="bg-slate-50 dark:bg-[#0a101f] border border-indigo-200 dark:border-indigo-900/40 rounded-xl p-4">
                        <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                          {latestAnnouncement.message}
                        </p>
                        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                          <span className="text-indigo-600 dark:text-indigo-300">
                            Posted on {formatDate(latestAnnouncement.createdAt)}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(latestAnnouncement)}
                              className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition-colors cursor-pointer"
                              title="Edit Current Announcement"
                            >
                              <FiEdit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenDelete(latestAnnouncement)}
                              className="p-1.5 text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                              title="Delete Current Announcement"
                            >
                              <FiTrash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 italic">No current announcement.</p>
                    )}
                  </div>

                  {/* Previous Announcements */}
                  <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Previous Announcements
                    </h4>
                    {previousAnnouncements.length > 0 ? (
                      <div className="space-y-2">
                        {previousAnnouncements.map((ann) => (
                          <div
                            key={ann._id}
                            className="bg-slate-50 dark:bg-[#0a101f]/60 hover:bg-slate-100 dark:hover:bg-[#0a101f] border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3 transition-colors"
                          >
                            <div className="min-w-0 flex-1">
                              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                                {formatDate(ann.createdAt)}
                              </span>
                              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                {ann.message}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => setSelectedAnnouncement(ann)}
                                className="px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-950/60 rounded-lg transition-colors cursor-pointer"
                              >
                                View →
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(ann)}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                                title="Edit"
                              >
                                <FiEdit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenDelete(ann)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                                title="Delete"
                              >
                                <FiTrash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic py-2">
                        No previous announcements.
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. EDIT ANNOUNCEMENT MODAL */}
      {editingAnnouncement && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white dark:bg-[#131c31] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl text-slate-900 dark:text-white">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FiEdit2 className="text-indigo-600 dark:text-indigo-400" />
                Edit Announcement
              </h3>
              <button
                onClick={() => {
                  setEditingAnnouncement(null);
                  setEditMessage("");
                }}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div className="mb-5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
                  Announcement
                </label>
                <textarea
                  name="editMessage"
                  rows="4"
                  value={editMessage}
                  onChange={(e) => setEditMessage(e.target.value)}
                  placeholder="Existing announcement text..."
                  className="w-full bg-slate-50 dark:bg-[#0a101f] border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none"
                  required
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingAnnouncement(null);
                    setEditMessage("");
                  }}
                  disabled={editLoading}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading || !editMessage.trim()}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  {editLoading ? (
                    <>
                      <FiLoader className="w-3.5 h-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. DELETE ANNOUNCEMENT CONFIRMATION MODAL */}
      {deletingAnnouncement && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-[#131c31] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl text-slate-900 dark:text-white">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FiTrash2 className="text-rose-500" />
                Delete Announcement
              </h3>
              <button
                onClick={() => setDeletingAnnouncement(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 mb-6">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Are you sure you want to delete this announcement?
              </p>
              <div className="bg-slate-50 dark:bg-[#0a101f] border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-600 dark:text-slate-400 italic line-clamp-3">
                "{deletingAnnouncement.message}"
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingAnnouncement(null)}
                disabled={deleteLoading}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleteLoading}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-xs"
              >
                {deleteLoading ? (
                  <>
                    <FiLoader className="w-3.5 h-3.5 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
