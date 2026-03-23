"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  campaignCreatorSchema,
  type CampaignCreatorFormData,
} from "@/lib/validations/campaign";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GoalSelector } from "./goal-selector";
import { PlatformFrequencyConfig } from "./platform-frequency-config";
import { Loader2 } from "lucide-react";

interface CampaignCreatorFormProps {
  onSubmit: (data: CampaignCreatorFormData) => void;
  isSubmitting: boolean;
}

export function CampaignCreatorForm({
  onSubmit,
  isSubmitting,
}: CampaignCreatorFormProps) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CampaignCreatorFormData>({
    resolver: zodResolver(campaignCreatorSchema),
    defaultValues: {
      name: "",
      goal: "build-awareness",
      topic: "",
      platforms: [],
      duration: "4-weeks",
      frequencyConfig: {},
    },
  });

  const platforms = watch("platforms");
  const frequencyConfig = watch("frequencyConfig");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <div className="space-y-2">
        <Label htmlFor="name">Campaign Name</Label>
        <Input
          id="name"
          placeholder="e.g., Product Launch Q2"
          {...register("name")}
        />
        {errors.name && (
          <p className="text-destructive text-sm">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Campaign Goal</Label>
        <Controller
          name="goal"
          control={control}
          render={({ field }) => (
            <GoalSelector value={field.value} onChange={field.onChange} />
          )}
        />
        {errors.goal && (
          <p className="text-destructive text-sm">{errors.goal.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="topic">Topic / Focus</Label>
        <Textarea
          id="topic"
          placeholder="What's this campaign about? e.g., Launching our new AI-powered feature..."
          {...register("topic")}
          rows={3}
        />
        {errors.topic && (
          <p className="text-destructive text-sm">{errors.topic.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Platforms & Frequency</Label>
        <p className="text-muted-foreground text-sm">
          Select platforms and set how often to post per week
        </p>
        <PlatformFrequencyConfig
          selectedPlatforms={platforms}
          onPlatformsChange={(p) => setValue("platforms", p)}
          frequencyConfig={frequencyConfig}
          onFrequencyChange={(c) => setValue("frequencyConfig", c)}
        />
        {errors.platforms && (
          <p className="text-destructive text-sm">{errors.platforms.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Duration</Label>
        <Controller
          name="duration"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1-week">1 Week</SelectItem>
                <SelectItem value="2-weeks">2 Weeks</SelectItem>
                <SelectItem value="4-weeks">4 Weeks</SelectItem>
                <SelectItem value="8-weeks">8 Weeks</SelectItem>
                <SelectItem value="12-weeks">12 Weeks</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        size="lg"
        className="w-full"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating Campaign...
          </>
        ) : (
          "Create Campaign"
        )}
      </Button>
    </form>
  );
}
