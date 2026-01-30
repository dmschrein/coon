"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex min-h-screen items-center justify-center p-6">
          <div className="max-w-md text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
            <h1 className="mt-4 text-2xl font-bold">Something went wrong</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {error.message || "An unexpected error occurred"}
            </p>
            <div className="mt-6 flex justify-center gap-2">
              <Button onClick={reset}>Try Again</Button>
              <Button onClick={() => (window.location.href = "/")} variant="outline">
                Go Home
              </Button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
