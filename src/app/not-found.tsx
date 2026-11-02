import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card mx-auto flex max-w-md flex-col items-center gap-3 px-6 py-16 text-center">
      <p className="text-[15px] font-medium">This page could not be found.</p>
      <Link href="/" className="btn btn-secondary mt-2 h-9 px-4 text-[13px]">
        Back home
      </Link>
    </div>
  );
}
