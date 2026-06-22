import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { HubPage } from "@/components/monetization/hub-page";
import { loadMonetizationHubData } from "@/lib/monetization/load-hub-data";

export default async function MonetizationHubPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const data = await loadMonetizationHubData(userId);
  return <HubPage data={data} />;
}
