"use client";

import { useEffect } from "react";
import { Copy, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDraftOutreach, type Prospect } from "@/hooks/use-prospects";

interface DraftMessageDialogProps {
  prospect: Prospect | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DraftMessageDialog({
  prospect,
  open,
  onOpenChange,
}: DraftMessageDialogProps) {
  const draft = useDraftOutreach();
  const { mutate, reset, data, isPending, error } = draft;

  useEffect(() => {
    if (open && prospect) {
      mutate({ id: prospect.id });
    }
    if (!open) {
      reset();
    }
  }, [open, prospect, mutate, reset]);

  function handleCopy(text: string) {
    void navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  }

  function handleRegenerate() {
    if (prospect) mutate({ id: prospect.id });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Draft Outreach
            {prospect ? (
              <span className="text-muted-foreground ml-2 text-sm font-normal">
                @{prospect.handle.replace(/^@/, "")} · {prospect.platform}
              </span>
            ) : null}
          </DialogTitle>
          <DialogDescription>
            AI-generated message variants you can copy and personalize.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-3 overflow-y-auto">
          {isPending ? (
            <div className="text-muted-foreground flex items-center justify-center py-8 text-sm">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Drafting messages...
            </div>
          ) : error ? (
            <p className="text-destructive py-4 text-sm">{error.message}</p>
          ) : data ? (
            data.variants.map((variant, idx) => (
              <Card key={idx}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">
                      {variant.approach === "direct" ? "Direct" : "Value-first"}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopy(variant.message)}
                    >
                      <Copy className="mr-1 h-3 w-3" /> Copy
                    </Button>
                  </div>
                  <div className="bg-muted/50 rounded-md p-3 text-sm whitespace-pre-wrap">
                    {variant.message}
                  </div>
                  <div className="text-muted-foreground space-y-1 text-xs">
                    <div className="font-medium">Follow-up</div>
                    <div className="whitespace-pre-wrap">
                      {variant.followUp}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          <Button
            type="button"
            onClick={handleRegenerate}
            disabled={isPending || !prospect}
          >
            <RefreshCw className="mr-1 h-4 w-4" />
            Regenerate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
