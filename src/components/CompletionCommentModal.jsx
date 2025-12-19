import React, { useEffect, useState } from "react";
import Card from "./Card";
import Button from "./Button";

function CompletionCommentModal({
  open,
  onClose,
  onSubmit,
  title = "Mark Task as Done",
  confirmLabel = "Mark Done",
  defaultComment = "",
  placeholder = "Add a completion comment (optional)...",
  minLength = 0,
  maxLength = 300,
}) {
  const [comment, setComment] = useState(defaultComment || "");

  useEffect(() => {
    setComment(defaultComment || "");
  }, [defaultComment, open]);

  const tooShort = (comment || "").trim().length < minLength;
  const tooLong = (comment || "").length > maxLength;
  const invalid = tooShort || tooLong;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white [.dark_&]:bg-[#181B2A] rounded-xl shadow-2xl border border-gray-200 [.dark_&]:border-white/10 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-2 text-gray-900 [.dark_&]:text-white">{title}</h3>
          <p className="text-sm text-gray-500 [.dark_&]:text-gray-400 mb-4">
            You can add a brief comment about the completion.
          </p>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            placeholder={placeholder}
            maxLength={maxLength}
            className="block w-full rounded-xl border border-gray-300 [.dark_&]:border-white/10 bg-white [.dark_&]:bg-white/5 px-4 py-3 text-sm text-gray-900 [.dark_&]:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all resize-none"
            spellCheck="true"
          />
          <div className="mt-2 flex items-center justify-between text-xs">
            <div
              className={`font-medium ${tooShort ? "text-red-600" : "text-gray-400"
                }`}
            >
              {minLength > 0 ? `Minimum ${minLength} characters` : "Optional"}
            </div>
            <div
              className={`${tooLong ? "text-red-600" : "text-gray-400"}`}
            >
              {(comment || "").length}/{maxLength}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-6">
            <Button onClick={onClose} variant="secondary" type="button" className="!bg-gray-100 [.dark_&]:!bg-white/5 !text-gray-700 [.dark_&]:!text-white hover:!bg-gray-200 [.dark_&]:hover:!bg-white/10 border-0">
              Cancel
            </Button>
            <Button
              onClick={() => !invalid && onSubmit(comment)}
              variant="primary"
              type="button"
              disabled={invalid}
              className="shadow-lg shadow-indigo-500/20"
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CompletionCommentModal;
