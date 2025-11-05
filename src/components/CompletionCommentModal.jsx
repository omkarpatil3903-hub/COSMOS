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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-content-secondary mb-3">
          You can add a brief comment about the completion.
        </p>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          placeholder={placeholder}
          maxLength={maxLength}
          className="mt-1 block w-full rounded-md border border-subtle bg-transparent px-3 py-2 text-sm text-content-primary"
        />
        <div className="mt-1 flex items-center justify-between text-xs">
          <div className={`font-medium ${tooShort ? "text-red-600" : "text-content-secondary"}`}>
            {minLength > 0 ? `Minimum ${minLength} characters` : "Optional"}
          </div>
          <div className={`${tooLong ? "text-red-600" : "text-content-tertiary"}`}>
            {(comment || "").length}/{maxLength}
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <Button onClick={onClose} variant="secondary" type="button">
            Cancel
          </Button>
          <Button
            onClick={() => !invalid && onSubmit(comment)}
            variant="primary"
            type="button"
            disabled={invalid}
          >
            {confirmLabel}
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default CompletionCommentModal;
