import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getContainer } from "@/lib/core/di/container";
import { CommunityHub } from "@/components/community/community-hub";
import { loadCommunityHubData } from "@/lib/community/load-hub-data";

export default async function CommunityPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const [data, config] = await Promise.all([
    loadCommunityHubData(userId),
    getContainer().communityConfigRepo.getConfig(userId),
  ]);

  const missionPreview = config?.manifesto?.mission?.slice(0, 100);
  const rulesCount = config?.rules?.length;

  return (
    <CommunityHub
      data={data}
      missionPreview={missionPreview}
      rulesCount={rulesCount}
    />
  );
}
