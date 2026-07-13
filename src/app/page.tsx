import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-4 p-6">
      <h1 className="text-3xl font-bold">Tech Pack Mobile App</h1>
      <p className="text-base text-neutral-600">
        Turn WhatsApp orders into reviewable job records and export-ready supplier
        files.
      </p>
      <Link href="/jobs" className="w-fit rounded-md bg-black px-4 py-2 text-white">
        Open jobs
      </Link>
    </main>
  );
}

