"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarClock } from "lucide-react";

interface SchedulePickerProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (date: Date) => void;
  defaultDate?: Date;
  title?: string;
}

export function SchedulePicker({
  open,
  onClose,
  onConfirm,
  defaultDate,
  title = "Schedule Content",
}: SchedulePickerProps) {
  const defaultDateStr = defaultDate
    ? defaultDate.toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0];
  const defaultTimeStr = defaultDate
    ? `${String(defaultDate.getHours()).padStart(2, "0")}:${String(defaultDate.getMinutes()).padStart(2, "0")}`
    : "09:00";

  const [date, setDate] = useState(defaultDateStr);
  const [time, setTime] = useState(defaultTimeStr);

  const handleConfirm = () => {
    const scheduled = new Date(`${date}T${time}:00`);
    if (isNaN(scheduled.getTime())) return;
    onConfirm(scheduled);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="schedule-date">Date</Label>
            <Input
              id="schedule-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="schedule-time">Time</Label>
            <Input
              id="schedule-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>Schedule</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
