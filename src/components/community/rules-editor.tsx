"use client";

import { useRef, useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Download, FileText, GripVertical, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RulesEditorRow } from "./rules-editor-row";
import {
  rulesToMarkdown,
  rulesToPlainText,
} from "@/lib/community/rules-export";
import type { CommunityRule } from "@/types";

interface RulesEditorProps {
  communityName: string;
  rules: CommunityRule[];
  onSave?: (rules: CommunityRule[]) => void;
  isSaving?: boolean;
}

type Row = CommunityRule & { uid: string };

const EMPTY_RULE: CommunityRule = {
  title: "",
  description: "",
  exampleViolation: "",
  enforcement: "",
};

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "community-rules"
  );
}

function download(filename: string, body: string, mime: string) {
  const blob = new Blob([body], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function SortableRow({
  row,
  number,
  canMoveUp,
  canMoveDown,
  onChange,
  onMoveUp,
  onMoveDown,
  onDelete,
}: {
  row: Row;
  number: number;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onChange: (patch: Partial<CommunityRule>) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.uid });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <RulesEditorRow
        rule={row}
        number={number}
        canMoveUp={canMoveUp}
        canMoveDown={canMoveDown}
        onChange={onChange}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        onDelete={onDelete}
        dragHandle={
          <button
            type="button"
            aria-label="Drag to reorder"
            className="text-muted-foreground cursor-grab active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        }
      />
    </div>
  );
}

export function RulesEditor({
  communityName,
  rules,
  onSave,
  isSaving,
}: RulesEditorProps) {
  const uidCounter = useRef(0);
  const nextUid = () => `rule-new-${uidCounter.current++}`;

  const toRows = (list: CommunityRule[]): Row[] =>
    list.map((r, i) => ({ ...r, uid: `rule-${i}` }));

  const [rows, setRows] = useState<Row[]>(() => toRows(rules));
  // Re-sync local rows when the incoming rules reference changes (initial load,
  // regenerate) — adjust-state-during-render, no effect needed.
  const [syncedRules, setSyncedRules] = useState(rules);
  if (rules !== syncedRules) {
    setSyncedRules(rules);
    setRows(toRows(rules));
  }

  const sensors = useSensors(useSensor(PointerSensor));

  const move = (from: number, to: number) => {
    if (to < 0 || to >= rows.length) return;
    setRows((prev) => arrayMove(prev, from, to));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setRows((prev) => {
      const oldIndex = prev.findIndex((r) => r.uid === active.id);
      const newIndex = prev.findIndex((r) => r.uid === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const updateRow = (uid: string, patch: Partial<CommunityRule>) =>
    setRows((prev) =>
      prev.map((r) => (r.uid === uid ? { ...r, ...patch } : r))
    );

  const deleteRow = (uid: string) =>
    setRows((prev) => prev.filter((r) => r.uid !== uid));

  const addRow = () =>
    setRows((prev) => [...prev, { ...EMPTY_RULE, uid: nextUid() }]);

  const toRules = (): CommunityRule[] =>
    rows.map(({ title, description, exampleViolation, enforcement }) => ({
      title,
      description,
      exampleViolation,
      enforcement,
    }));

  const handleExportMarkdown = () =>
    download(
      `${slugify(communityName)}.md`,
      rulesToMarkdown(communityName, toRules()),
      "text/markdown"
    );

  const handleExportPlainText = () =>
    download(
      `${slugify(communityName)}.txt`,
      rulesToPlainText(communityName, toRules()),
      "text/plain"
    );

  return (
    <div className="space-y-3">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={rows.map((r) => r.uid)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {rows.map((row, i) => (
              <SortableRow
                key={row.uid}
                row={row}
                number={i + 1}
                canMoveUp={i > 0}
                canMoveDown={i < rows.length - 1}
                onChange={(patch) => updateRow(row.uid, patch)}
                onMoveUp={() => move(i, i - 1)}
                onMoveDown={() => move(i, i + 1)}
                onDelete={() => deleteRow(row.uid)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="bg-background sticky bottom-0 flex flex-wrap gap-2 border-t py-3">
        <Button variant="outline" onClick={addRow}>
          <Plus className="mr-2 h-4 w-4" />
          Add Rule
        </Button>
        <Button variant="outline" onClick={handleExportMarkdown}>
          <Download className="mr-2 h-4 w-4" />
          Export as Markdown
        </Button>
        <Button variant="outline" onClick={handleExportPlainText}>
          <FileText className="mr-2 h-4 w-4" />
          Export as Plain Text
        </Button>
        {onSave ? (
          <Button
            className="ml-auto"
            onClick={() => onSave(toRules())}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save Rules"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
