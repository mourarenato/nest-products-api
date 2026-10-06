"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createProduct, enrichProductDescription } from "@/lib/api";
import { getRoleFromToken, getToken } from "@/lib/auth";

export default function NewProductPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichMessage, setEnrichMessage] = useState("");
  const [savedProductId, setSavedProductId] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    const role = token ? getRoleFromToken(token) : null;

    if (!token) {
      router.replace("/login");
      return;
    }

    if (role !== "ADMIN") {
      router.replace("/products");
    }
  }, [router]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const token = getToken();
    if (!token || getRoleFromToken(token) !== "ADMIN") {
      router.replace("/products");
      return;
    }

    const parsedPrice = Number(price);
    if (Number.isNaN(parsedPrice) || parsedPrice <= 0) {
      setError("Price must be a valid number greater than 0.");
      return;
    }

    if (savedProductId) {
      router.push(`/products/${savedProductId}/edit`);
      return;
    }

    setIsSubmitting(true);
    try {
      await createProduct({
        token,
        payload: {
          name,
          description: description || undefined,
          price: parsedPrice,
        },
      });
      router.push("/products");
    } catch {
      setError("Could not create product. Please check data and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGenerateDescription() {
    setError("");
    setEnrichMessage("");

    const token = getToken();
    if (!token || getRoleFromToken(token) !== "ADMIN") {
      router.replace("/products");
      return;
    }

    const parsedPrice = Number(price);
    if (!name.trim() || Number.isNaN(parsedPrice) || parsedPrice <= 0) {
      setError("Name and a price greater than 0 are required before generating a description.");
      return;
    }

    setIsEnriching(true);
    try {
      let productId = savedProductId;
      if (!productId) {
        const created = await createProduct({
          token,
          payload: {
            name,
            description: description || undefined,
            price: parsedPrice,
          },
        });
        productId = created.id;
        setSavedProductId(created.id);
      }

      const result = await enrichProductDescription({ token, productId });
      setEnrichMessage(`${result.message} (${result.jobId})`);
    } catch {
      setError("Could not queue automatic description. Please try again.");
    } finally {
      setIsEnriching(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900">Create Product</h1>
        <Link href="/products" className="text-sm font-medium text-zinc-700 underline">
          Back to products
        </Link>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Name</label>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 outline-none ring-blue-500 focus:ring-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Description</label>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 outline-none ring-blue-500 focus:ring-2"
          />
          <button
            type="button"
            onClick={handleGenerateDescription}
            disabled={isEnriching}
            className="mt-2 rounded-lg border border-violet-300 bg-violet-50 px-3 py-2 text-sm font-medium text-violet-800 hover:bg-violet-100 disabled:opacity-60"
          >
            {isEnriching ? "Enfileirando..." : "Gerar Descrição Automática (IA)"}
          </button>
          {enrichMessage ? <p className="mt-2 text-sm text-emerald-700">{enrichMessage}</p> : null}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Price</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            required
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 outline-none ring-blue-500 focus:ring-2"
          />
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-700 disabled:opacity-60"
        >
          {isSubmitting ? "Creating..." : savedProductId ? "Open saved product" : "Create Product"}
        </button>
      </form>
    </main>
  );
}
