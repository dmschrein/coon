"use client";

import { useState, type KeyboardEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

interface HashtagInputProps {
  hashtags: string[];
  onChange: (hashtags: string[]) => void;
}

export function HashtagInput({ hashtags, onChange }: HashtagInputProps) {
  const [inputValue, setInputValue] = useState("");

  const addTag = (raw: string) => {
    const tag = raw.trim().replace(/^#*/, "");
    if (!tag) return;
    const formatted = `#${tag}`;
    if (!hashtags.includes(formatted)) {
      onChange([...hashtags, formatted]);
    }
    setInputValue("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(inputValue);
    }
    if (e.key === "Backspace" && !inputValue && hashtags.length > 0) {
      onChange(hashtags.slice(0, -1));
    }
  };

  const removeTag = (index: number) => {
    onChange(hashtags.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {hashtags.map((tag, i) => (
          <Badge key={tag} variant="secondary" className="gap-1 pr-1">
            {tag}
            <button
              type="button"
              onClick={() => removeTag(i)}
              className="hover:bg-muted rounded-full p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <Input
        placeholder="Type a hashtag and press Enter..."
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => inputValue && addTag(inputValue)}
      />
    </div>
  );
}
