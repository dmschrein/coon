"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PinterestBoard } from "@/types";

interface BoardSelectorProps {
  /** Boards cached on the connected account (`metadata.boards`). */
  boards: PinterestBoard[];
  value: string | null;
  onChange: (boardId: string) => void;
}

export function BoardSelector({ boards, value, onChange }: BoardSelectorProps) {
  const hasBoards = boards.length > 0;

  return (
    <div className="space-y-2">
      <Label htmlFor="pinterest-board">Pinterest board</Label>
      <Select
        value={value ?? undefined}
        onValueChange={onChange}
        disabled={!hasBoards}
      >
        <SelectTrigger id="pinterest-board" className="w-64">
          <SelectValue
            placeholder={hasBoards ? "Select a board" : "No boards"}
          />
        </SelectTrigger>
        <SelectContent>
          {boards.map((board) => (
            <SelectItem key={board.id} value={board.id}>
              {board.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
