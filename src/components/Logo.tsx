import Image from "next/image";

export function Logo({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <Image
      src="/logo.png"
      alt="Debit"
      width={size}
      height={size}
      priority={size >= 40}
      className={`rounded-[22%] ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
