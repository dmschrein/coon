import {
  Crown,
  Megaphone,
  GraduationCap,
  Calendar,
  Briefcase,
  Gift,
  type LucideIcon,
} from "lucide-react";
import type { MonetizationModel } from "@/types";

export interface MonetizationModelCard {
  id: MonetizationModel;
  icon: LucideIcon;
  name: string;
  description: string;
  bestWhen: string;
}

export const MONETIZATION_MODEL_CARDS: readonly MonetizationModelCard[] = [
  {
    id: "paid_membership",
    icon: Crown,
    name: "Paid membership",
    description:
      "Charge a recurring fee for access to your community, exclusive content, or members-only spaces.",
    bestWhen:
      "you have ongoing value to deliver and members will renew month after month.",
  },
  {
    id: "sponsorships",
    icon: Megaphone,
    name: "Sponsorships",
    description:
      "Partner with brands or creators who pay to reach your audience through content slots or shoutouts.",
    bestWhen:
      "your audience is well-defined and your reach is meaningful to advertisers in your niche.",
  },
  {
    id: "courses",
    icon: GraduationCap,
    name: "Courses",
    description:
      "Sell structured learning experiences — async cohorts, live workshops, or on-demand video.",
    bestWhen:
      "you teach a skill your audience is actively trying to build and willing to pay to shortcut.",
  },
  {
    id: "events",
    icon: Calendar,
    name: "Events",
    description:
      "Host ticketed gatherings, AMAs, summits, or workshops — in person or online.",
    bestWhen:
      "your community values real-time interaction and would pay for curated access.",
  },
  {
    id: "job_board",
    icon: Briefcase,
    name: "Job board",
    description:
      "Charge employers to post roles to your audience of qualified professionals.",
    bestWhen:
      "your audience is composed of high-intent professionals and hiring managers value the channel.",
  },
  {
    id: "freemium",
    icon: Gift,
    name: "Freemium",
    description:
      "Offer a free tier with optional paid upgrades for power features, capacity, or perks.",
    bestWhen:
      "you have a wedge that's valuable on its own and an obvious next step worth paying for.",
  },
] as const;
