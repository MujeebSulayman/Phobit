import { Suspense } from "react";
import { AppleCard } from "@/components/home/AppleCard";
import { AvatarMarquee } from "@/components/home/AvatarMarquee";
import { BentoCard } from "@/components/home/BentoCard";
import { DocsDemo } from "@/components/home/DocsDemo";
import { FeesChart } from "@/components/home/FeesChart";
import { Hero } from "@/components/home/Hero";
import { LaunchDemo } from "@/components/home/LaunchDemo";
import { PaymentsFeed } from "@/components/home/PaymentsFeed";
import { TopTokens } from "@/components/home/TopTokens";
import { Reveal } from "@/components/motion";
import { getCoins, getFeed, getFees } from "@/lib/server-data";

export const revalidate = 30;

const HOW_IT_WORKS = [
  "Launch a coin and name who gets its fees — just a phone number.",
  "Every trade accrues 30 bps to that coin's own vault.",
  "They verify the number once and pick a card in Apple Pay.",
  "The keeper sweeps and pays their card in USD.",
];

function GridSkeleton() {
  return (
    <div className="-mt-6 flex flex-col gap-4">
      <section className="grid gap-4 md:grid-cols-5">
        <div className="skeleton h-[340px] rounded-[22px] md:col-span-3" />
        <div className="skeleton h-[340px] rounded-[22px] md:col-span-2" />
      </section>
      <section className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton h-[330px] rounded-[22px]" />
        ))}
      </section>
    </div>
  );
}

async function HomeGrid() {
  const [{ coins, solUsd }, feed, fees] = await Promise.all([getCoins(), getFeed(), getFees()]);

  return (
    <>
      <div className="-mt-6 flex flex-col gap-4">
        <section className="grid gap-4 md:grid-cols-5">
          <Reveal delay={0.42} className="md:col-span-3">
            <BentoCard href="/explore" label="Explore" className="h-[340px]">
              <AvatarMarquee />
            </BentoCard>
          </Reveal>
          <Reveal delay={0.48} className="md:col-span-2">
            <BentoCard href="/payouts" label="Payouts" className="h-[340px]">
              <PaymentsFeed items={feed} />
            </BentoCard>
          </Reveal>
        </section>
        <section className="grid gap-4 md:grid-cols-3">
          <Reveal delay={0.54}>
            <BentoCard href="/analytics" label="Analytics" className="h-[330px]">
              <FeesChart series={fees.series} totalUsd={fees.totalUsd} />
            </BentoCard>
          </Reveal>
          <Reveal delay={0.6}>
            <BentoCard href="/launch" label="Launch" className="h-[330px]">
              <LaunchDemo />
            </BentoCard>
          </Reveal>
          <Reveal delay={0.66}>
            <BentoCard href="/claim" label="Claim fees" className="h-[330px]">
              <AppleCard />
            </BentoCard>
          </Reveal>
        </section>
      </div>

      <Reveal inView>
        <section className="grid gap-4 md:grid-cols-3">
          <BentoCard href="/docs" label="Docs" className="h-[290px] md:col-span-1">
            <DocsDemo />
          </BentoCard>
          <div className="card flex h-[290px] flex-col justify-between p-7 md:col-span-2">
            <div>
              <div className="eyebrow">How it works</div>
              <h3 className="mt-3 max-w-md text-[26px] font-semibold leading-tight tracking-[-0.025em]">
                One signature to launch. Zero to get paid.
              </h3>
            </div>
            <ol className="grid gap-x-8 gap-y-3 text-[13.5px] leading-relaxed text-fg-2 sm:grid-cols-2">
              {HOW_IT_WORKS.map((text, i) => (
                <li key={i} className="flex gap-3">
                  <span className="text-fg-3">{String(i + 1).padStart(2, "0")}</span> {text}
                </li>
              ))}
            </ol>
          </div>
        </section>
      </Reveal>

      <Reveal inView>
        <TopTokens coins={coins} solUsd={solUsd} />
      </Reveal>

      <p className="pb-4 text-center text-[12px] text-fg-3">
        Fees are swept in SOL and shown in USD at the time of sweep. Payouts settle to the debit card behind your Apple Pay.
      </p>
    </>
  );
}

export default function HomePage() {
  return (
    <div className="flex flex-col gap-20">
      <Hero />
      <Suspense fallback={<GridSkeleton />}>
        <HomeGrid />
      </Suspense>
    </div>
  );
}
