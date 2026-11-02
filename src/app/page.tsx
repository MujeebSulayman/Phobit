import Link from "next/link";
import { Suspense } from "react";
import { BentoCard } from "@/components/home/BentoCard";
import { DocsDemo } from "@/components/home/DocsDemo";
import { FeesChart } from "@/components/home/FeesChart";
import { Hero } from "@/components/home/Hero";
import { HowItRoutes } from "@/components/home/HowItRoutes";
import { LaunchDemo } from "@/components/home/LaunchDemo";
import { PaymentsFeed } from "@/components/home/PaymentsFeed";
import { PhobitCard } from "@/components/home/PhobitCard";
import { StatsStrip } from "@/components/home/StatsStrip";
import { TopTokens } from "@/components/home/TopTokens";
import { Icons } from "@/components/icons";
import { Reveal } from "@/components/motion";
import { getCoins, getFeed, getFees } from "@/lib/server-data";

export const revalidate = 30;

function GridSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="skeleton h-[110px] rounded-[24px]" />
      <section className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton h-[340px] rounded-[24px]" />
        ))}
      </section>
    </div>
  );
}

async function LiveSections() {
  const [{ coins, solUsd }, feed, fees] = await Promise.all([getCoins(), getFeed(), getFees()]);

  return (
    <>
      <StatsStrip feesUsd={fees.totalUsd} coins={coins.length} payouts={fees.payouts} />

      <HowItRoutes />

      <section className="flex flex-col gap-4">
        <div className="grid gap-4 md:grid-cols-5">
          <Reveal inView className="md:col-span-3">
            <BentoCard href="/payouts" label="Payouts" className="h-[350px]">
              <PaymentsFeed items={feed} />
            </BentoCard>
          </Reveal>
          <Reveal inView delay={0.08} className="md:col-span-2">
            <BentoCard href="/claim" label="Claim fees" className="h-[350px]">
              <PhobitCard />
            </BentoCard>
          </Reveal>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Reveal inView>
            <BentoCard href="/analytics" label="Analytics" className="h-[330px]">
              <FeesChart series={fees.series} totalUsd={fees.totalUsd} />
            </BentoCard>
          </Reveal>
          <Reveal inView delay={0.08}>
            <BentoCard href="/launch" label="Launch" className="h-[330px]">
              <LaunchDemo />
            </BentoCard>
          </Reveal>
          <Reveal inView delay={0.16}>
            <BentoCard href="/docs" label="Docs" className="h-[330px]">
              <DocsDemo />
            </BentoCard>
          </Reveal>
        </div>
      </section>

      <Reveal inView>
        <TopTokens coins={coins} solUsd={solUsd} />
      </Reveal>
    </>
  );
}

export default function HomePage() {
  return (
    <div className="flex flex-col gap-28">
      <Hero />
      <Suspense fallback={<GridSkeleton />}>
        <LiveSections />
      </Suspense>

      <Reveal inView>
        <section className="glass glass-refract relative overflow-hidden rounded-[32px] px-7 py-14 text-center sm:px-14 sm:py-20">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-70"
            style={{ background: "radial-gradient(60% 80% at 50% 120%, #7cf7e433, transparent 70%), radial-gradient(40% 60% at 90% -10%, #a594ff2e, transparent 70%)" }}
          />
          <span className="tag relative">
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-accent" /> Someone may have named you
          </span>
          <h2 className="relative mx-auto mt-6 max-w-2xl font-display text-[40px] font-semibold leading-[0.95] tracking-[-0.05em] sm:text-[60px]">
            Your number might <span className="text-iris">already be earning.</span>
          </h2>
          <p className="relative mx-auto mt-5 max-w-md text-[15px] leading-relaxed text-fg-2">
            Enter your phone number, confirm the texted code, and see every fee that&apos;s been routed to you.
          </p>
          <div className="relative mt-9 flex flex-wrap justify-center gap-3">
            <Link href="/claim" className="btn btn-primary h-12 px-7 text-[15px]">
              Check my number <Icons.Arrow width={16} height={16} />
            </Link>
            <Link href="/launch" className="btn btn-secondary h-12 px-7 text-[15px]">
              Launch a coin
            </Link>
          </div>
        </section>
      </Reveal>
    </div>
  );
}
