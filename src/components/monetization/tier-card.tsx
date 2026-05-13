"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatTierPrice } from "@/lib/utils";
import type { MembershipTier } from "@/lib/validations/tier";

interface TierCardProps {
  tier: MembershipTier;
  onGenerateCopy: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onUpdatePaymentUrl: (url: string) => void;
  isGeneratingCopy: boolean;
}

export function TierCard({
  tier,
  onGenerateCopy,
  onEdit,
  onDelete,
  onUpdatePaymentUrl,
  isGeneratingCopy,
}: TierCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tier.id });

  const externalUrl = tier.externalPaymentUrl ?? "";
  const [paymentUrl, setPaymentUrl] = useState(externalUrl);
  const [lastExternalUrl, setLastExternalUrl] = useState(externalUrl);
  if (externalUrl !== lastExternalUrl) {
    setLastExternalUrl(externalUrl);
    setPaymentUrl(externalUrl);
  }

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const billingCycle = tier.billingCycle as "monthly" | "yearly" | "one_time";
  const priceLabel = formatTierPrice(tier.priceCents, billingCycle);

  const handlePaymentUrlBlur = () => {
    const trimmed = paymentUrl.trim();
    if (trimmed !== (tier.externalPaymentUrl ?? "")) {
      onUpdatePaymentUrl(trimmed);
    }
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className="flex w-80 shrink-0 cursor-grab flex-col p-4 active:cursor-grabbing"
    >
      <div {...attributes} {...listeners} className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg leading-tight font-bold">{tier.name}</h3>
          <Badge variant="secondary" className="text-xs">
            {tier.memberCount} member{tier.memberCount === 1 ? "" : "s"}
          </Badge>
        </div>
        <p className="text-foreground text-2xl font-semibold">{priceLabel}</p>
        {tier.tagline && (
          <p className="text-muted-foreground text-sm">{tier.tagline}</p>
        )}
        {tier.description && (
          <p className="text-muted-foreground text-xs">{tier.description}</p>
        )}
      </div>

      <ul className="my-4 flex-1 space-y-1.5 text-sm">
        {tier.benefits.map((benefit, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="text-primary mt-0.5">✓</span>
            <span>{benefit}</span>
          </li>
        ))}
        {tier.benefits.length === 0 && (
          <li className="text-muted-foreground text-xs italic">
            No benefits yet — click Generate Copy to draft some.
          </li>
        )}
      </ul>

      <div className="mt-2 space-y-2">
        <div>
          <label className="text-muted-foreground text-xs font-medium">
            Payment URL
          </label>
          <Input
            type="url"
            placeholder="https://stripe.com/..."
            value={paymentUrl}
            onChange={(e) => setPaymentUrl(e.target.value)}
            onBlur={handlePaymentUrlBlur}
            className="h-8 text-xs"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button
            size="sm"
            variant="secondary"
            onClick={onGenerateCopy}
            disabled={isGeneratingCopy}
            className="h-7 text-xs"
          >
            {isGeneratingCopy ? "Generating…" : "Generate Copy"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onEdit}
            className="h-7 text-xs"
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onDelete}
            className="text-destructive h-7 text-xs"
          >
            Delete
          </Button>
        </div>
      </div>
    </Card>
  );
}
