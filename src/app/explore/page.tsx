import { Suspense } from "react";
import { ExploreGrid } from "@/components/explore/ExploreGrid";
import { PageHeader } from "@/components/ui/PageHeader";
import { getCoins } from "@/lib/server-data";

export const revalidate = 30;

function GridSkeleton() {
  return (
    <>
      <div className="skeleton mb-6 h-[92px] rounded-[22px]" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="skeleton aspect-[3/4] rounded-[22px]" />
        ))}
      </div>
    </>
  );
}

async function Coins() {
  const { coins, solUsd } = await getCoins();
  return <ExploreGrid coins={coins} solUsd={solUsd} />;
}

export default function ExplorePage() {
  return (
    <div>
      <PageHeader
        title="Explore"
        subtitle="Every coin launched through Debit, where its fees go, and whether they've been claimed."
      />
      <Suspense fallback={<GridSkeleton />}>
        <Coins />
      </Suspense>
    </div>
  );
}
