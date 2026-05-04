import { useState, useRef, useEffect } from "react";

const DEFAULT_NAME = "User";

interface EditableUserNameProps {
  /** External signal to reset the name back to default */
  resetSignal?: number;
}

/**
 * Editable participant name — displayed as a chat-style header.
 * Double-click to edit, Enter/blur to confirm.
 * Resets to "User" when resetSignal changes.
 */
export function EditableUserName({ resetSignal }: EditableUserNameProps) {
  const [name, setName] = useState(DEFAULT_NAME);
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset name when the external reset signal fires
  useEffect(() => {
    if (resetSignal !== undefined && resetSignal > 0) {
      setName(DEFAULT_NAME);
      setIsEditing(false);
    }
  }, [resetSignal]);

  // Auto-focus & select-all when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const commitEdit = (value: string) => {
    const trimmed = value.trim();
    setName(trimmed || DEFAULT_NAME);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      commitEdit((e.target as HTMLInputElement).value);
    } else if (e.key === "Escape") {
      setIsEditing(false);
    }
  };

  return (
    <div className="editable-username-bar">
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          defaultValue={name}
          maxLength={40}
          onBlur={(e) => commitEdit(e.target.value)}
          onKeyDown={handleKeyDown}
          className="editable-username-input"
        />
      ) : (
        <span
          onDoubleClick={() => setIsEditing(true)}
          className="editable-username-display"
          title="Double-click to edit participant name"
        >
          <svg
            className="editable-username-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          {name}
          <svg
            className="editable-username-edit-hint"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
            <path d="m15 5 4 4" />
          </svg>
        </span>
      )}
    </div>
  );
}
