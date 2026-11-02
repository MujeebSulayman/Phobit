import type { ReactNode } from "react";

export function PageHeader({ title, subtitle, right }: { title: ReactNode; subtitle?: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[34px] font-semibold leading-none tracking-[-0.035em]">{title}</h1>
        {subtitle && <p className="mt-2.5 text-[15px] text-fg-2">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}
