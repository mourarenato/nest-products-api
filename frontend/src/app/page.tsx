import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-center justify-center px-6 text-center">
      <h1 className="text-3xl font-semibold text-zinc-900">Products Dashboard</h1>
      <p className="mt-2 text-zinc-600">
        Authenticate and browse your product catalog with pagination.
      </p>
      <div className="mt-8 flex gap-3">
        <Link
          href="/login"
          className="rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-700"
        >
          Go to Login
        </Link>
        <Link
          href="/register"
          className="rounded-lg border border-zinc-300 px-4 py-2 font-medium text-zinc-700"
        >
          Register
        </Link>
        <Link
          href="/products?page=1&limit=8"
          className="rounded-lg border border-zinc-300 px-4 py-2 font-medium text-zinc-700"
        >
          View Products
        </Link>
      </div>
    </main>
  );
}
