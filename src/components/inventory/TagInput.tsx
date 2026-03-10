"use client";

import { useState, KeyboardEvent } from "react";
import { X } from "lucide-react";

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

export function TagInput({ tags, onChange, placeholder = "Add tag…" }: TagInputProps) {
  const [input, setInput] = useState("");

  function addTag(raw: string) {
    const value = raw.trim().toLowerCase().replace(/,+$/, "");
    if (!value || tags.includes(value)) return;
    onChange([...tags, value]);
    setInput("");
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(input);
    } else if (e.key === "Backspace" && input === "" && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  }

  function removeTag(tag: string) {
    onChange(tags.filter((t) => t !== tag));
  }

  return (
    <div className="flex flex-wrap gap-1.5 items-center p-2 bg-white border border-stone-200 rounded-xl focus-within:ring-2 focus-within:ring-amber-400 min-h-[42px]">
      {tags.map((tag) => (
        <span key={tag}
          className="flex items-center gap-1 px-2.5 py-1 bg-stone-100 text-stone-700 text-sm rounded-full">
          #{tag}
          <button type="button" onClick={() => removeTag(tag)}
            className="text-stone-400 hover:text-stone-700 transition-colors">
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKey}
        onBlur={() => { if (input.trim()) addTag(input); }}
        placeholder={tags.length === 0 ? placeholder : ""}
        className="flex-1 min-w-[100px] text-sm text-stone-800 placeholder-stone-300 outline-none bg-transparent"
      />
    </div>
  );
}
