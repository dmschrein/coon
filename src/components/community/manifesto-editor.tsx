"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, Download, Loader2, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ManifestoSectionCard } from "./manifesto-section-card";
import type { ManifestoOutput, ManifestoSection } from "@/types";

interface ManifestoEditorProps {
  manifesto: ManifestoOutput;
  onRegenerateSection?: (section: ManifestoSection) => void;
  regeneratingSection?: ManifestoSection | null;
}

function valuesToText(manifesto: ManifestoOutput): string {
  return manifesto.values.map((v) => `${v.name} — ${v.description}`).join("\n");
}

export function ManifestoEditor({
  manifesto,
  onRegenerateSection,
  regeneratingSection = null,
}: ManifestoEditorProps) {
  const [communityName, setCommunityName] = useState("");
  const [mission, setMission] = useState(manifesto.mission);
  const [whoFor, setWhoFor] = useState(manifesto.whoFor);
  const [whoNotFor, setWhoNotFor] = useState(manifesto.whoNotFor);
  const [valuesText, setValuesText] = useState(valuesToText(manifesto));
  const [invitationLetter, setInvitationLetter] = useState(
    manifesto.invitationLetter
  );

  // Re-sync editable fields when a fresh manifesto arrives (e.g. after regenerate).
  useEffect(() => {
    setMission(manifesto.mission);
    setWhoFor(manifesto.whoFor);
    setWhoNotFor(manifesto.whoNotFor);
    setValuesText(valuesToText(manifesto));
    setInvitationLetter(manifesto.invitationLetter);
  }, [manifesto]);

  const buildMarkdown = (): string => {
    const title = communityName.trim() || manifesto.nameSuggestions[0];
    return [
      `# ${title}`,
      "",
      "## Mission",
      mission,
      "",
      "## Who It's For",
      whoFor,
      "",
      "## Who It's Not For",
      whoNotFor,
      "",
      "## Values",
      valuesText,
      "",
      "## Invitation Letter",
      invitationLetter,
      "",
      "## Name Ideas",
      ...manifesto.nameSuggestions.map((n) => `- ${n}`),
      "",
    ].join("\n");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildMarkdown());
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  const handleExport = () => {
    const blob = new Blob([buildMarkdown()], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const slug =
      (communityName.trim() || manifesto.nameSuggestions[0] || "manifesto")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "manifesto";
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${slug}.md`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const regen = (section: ManifestoSection) =>
    onRegenerateSection ? () => onRegenerateSection(section) : undefined;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base">Community Name</CardTitle>
          {onRegenerateSection ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRegenerateSection("nameSuggestions")}
              disabled={regeneratingSection === "nameSuggestions"}
            >
              {regeneratingSection === "nameSuggestions" ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Regenerating...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                  Regenerate
                </>
              )}
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="community-name">Community Name</Label>
            <Input
              id="community-name"
              value={communityName}
              placeholder="Pick a name or click a suggestion below"
              onChange={(e) => setCommunityName(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {manifesto.nameSuggestions.map((name) => (
              <Button
                key={name}
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setCommunityName(name)}
              >
                {name}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <ManifestoSectionCard
        title="Mission"
        value={mission}
        onChange={setMission}
        onRegenerate={regen("mission")}
        isRegenerating={regeneratingSection === "mission"}
      />
      <ManifestoSectionCard
        title="Who It's For"
        value={whoFor}
        onChange={setWhoFor}
        onRegenerate={regen("whoFor")}
        isRegenerating={regeneratingSection === "whoFor"}
      />
      <ManifestoSectionCard
        title="Who It's Not For"
        value={whoNotFor}
        onChange={setWhoNotFor}
        onRegenerate={regen("whoNotFor")}
        isRegenerating={regeneratingSection === "whoNotFor"}
      />
      <ManifestoSectionCard
        title="Values"
        value={valuesText}
        onChange={setValuesText}
        onRegenerate={regen("values")}
        isRegenerating={regeneratingSection === "values"}
        rows={6}
      />
      <ManifestoSectionCard
        title="Invitation Letter"
        value={invitationLetter}
        onChange={setInvitationLetter}
        onRegenerate={regen("invitationLetter")}
        isRegenerating={regeneratingSection === "invitationLetter"}
        rows={10}
      />

      <div className="bg-background sticky bottom-0 flex gap-2 border-t py-3">
        <Button variant="outline" onClick={handleCopy}>
          <Copy className="mr-2 h-4 w-4" />
          Copy to Clipboard
        </Button>
        <Button variant="outline" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Export as Markdown
        </Button>
      </div>
    </div>
  );
}
