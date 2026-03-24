"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { deleteProduct, downloadReport, generateReport, getProducts, getReport, Product, Report } from "@/lib/api";
import { clearToken, getRoleFromToken, getToken, UserRole } from "@/lib/auth";

const DEFAULT_LIMIT = 8;

function formatPrice(value: number | string): string {
  const parsed = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(parsed)) {
    return String(value);
  }

  return parsed.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function ProductsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [role, setRole] = useState<UserRole | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportNotificationVisible, setReportNotificationVisible] = useState(false);
  const [downloadedReportId, setDownloadedReportId] = useState<string | null>(null);

  const page = useMemo(() => {
    const raw = Number(searchParams.get("page") ?? 1);
    return Number.isNaN(raw) || raw < 1 ? 1 : raw;
  }, [searchParams]);

  const limit = useMemo(() => {
    const raw = Number(searchParams.get("limit") ?? DEFAULT_LIMIT);
    if (Number.isNaN(raw) || raw < 1) {
      return DEFAULT_LIMIT;
    }

    return Math.min(raw, 24);
  }, [searchParams]);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    setRole(getRoleFromToken(token));

    let isMounted = true;

    getProducts({ token, page, limit })
      .then((data) => {
        if (isMounted) {
          setProducts(data);
        }
      })
      .catch(() => {
        if (isMounted) {
          setError("Could not load products. Please try again.");
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [router, page, limit]);

  function goToPage(nextPage: number) {
    const safePage = Math.max(1, nextPage);
    router.push(`/products?page=${safePage}&limit=${limit}`);
  }

  function logout() {
    clearToken();
    router.replace("/login");
  }

  async function handleDelete(productId: string) {
    const token = getToken();
    if (!token || role !== "ADMIN") {
      return;
    }

    setIsDeleting(productId);
    try {
      await deleteProduct({ token, productId });
      setProducts((current) => current.filter((product) => product.id !== productId));
    } catch {
      setError("Could not delete product. Please try again.");
    } finally {
      setIsDeleting(null);
    }
  }

  async function handleGenerateReport() {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    setIsGeneratingReport(true);
    setError("");
    try {
      const queued = await generateReport({ token });
      const current = await getReport({ token, reportId: queued.reportId });
      setReport(current);
      setReportNotificationVisible(true);
    } catch {
      setError("Could not start report generation. Please try again.");
    } finally {
      setIsGeneratingReport(false);
    }
  }

  useEffect(() => {
    if (!report || (report.status !== "PENDING" && report.status !== "PROCESSING")) {
      return;
    }

    const token = getToken();
    if (!token) {
      return;
    }

    const intervalId = window.setInterval(async () => {
      try {
        const current = await getReport({ token, reportId: report.id });
        setReport(current);
        setReportNotificationVisible(true);
      } catch {
        setError("Could not refresh report status.");
      }
    }, 3000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [report]);

  useEffect(() => {
    if (!report || report.status !== "COMPLETED" || downloadedReportId === report.id) {
      return;
    }

    const token = getToken();
    if (!token) {
      return;
    }

    downloadReport({ token, reportId: report.id })
      .then(() => {
        setDownloadedReportId(report.id);
      })
      .catch(() => {
        setError("Report was generated, but download failed.");
      });
  }, [report, downloadedReportId]);

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-zinc-900">Products</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Page {page} - Showing up to {limit} items
          </p>
          <p className="mt-1 text-xs font-medium text-zinc-500">
            Role: {role ?? "Unknown"}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleGenerateReport}
            disabled={isGeneratingReport}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
          >
            {isGeneratingReport ? "Queuing..." : "Generate Report"}
          </button>
          {role === "ADMIN" ? (
            <Link
              href="/products/new"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
            >
              New Product
            </Link>
          ) : null}
          <Link
            href="/login"
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700"
          >
            Login
          </Link>
          <button
            onClick={logout}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            Logout
          </button>
        </div>
      </div>

      {loading ? <p className="text-zinc-600">Loading products...</p> : null}
      {error ? <p className="text-red-600">{error}</p> : null}
      {report && reportNotificationVisible ? (
        <div className="mb-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-medium text-zinc-800">
              Report generation status: {report.status}
            </p>
            <button
              onClick={() => setReportNotificationVisible(false)}
              className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-100"
            >
              Close
            </button>
          </div>
          {report.status === "FAILED" ? (
            <p className="mt-1 text-sm text-red-600">{report.errorMessage ?? "Report failed."}</p>
          ) : null}
        </div>
      ) : null}

      {!loading && !error ? (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product) => (
              <article
                key={product.id}
                className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
              >
                <h2 className="line-clamp-1 text-lg font-semibold text-zinc-900">
                  {product.name}
                </h2>
                <p className="mt-2 line-clamp-3 min-h-18 text-sm text-zinc-600">
                  {product.description || "No description"}
                </p>
                <p className="mt-4 text-base font-semibold text-zinc-900">
                  {formatPrice(product.price)}
                </p>
                {role === "ADMIN" ? (
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Link
                      href={`/products/${product.id}/edit`}
                      className="rounded-lg border border-zinc-300 px-3 py-2 text-center text-sm font-medium text-zinc-700 hover:bg-zinc-100"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(product.id)}
                      disabled={isDeleting === product.id}
                      className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-60"
                    >
                      {isDeleting === product.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                ) : null}
              </article>
            ))}
          </section>

          <div className="mt-8 flex items-center justify-center gap-3">
            <button
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-zinc-600">Page {page}</span>
            <button
              onClick={() => goToPage(page + 1)}
              disabled={products.length < limit}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </>
      ) : null}
    </main>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<main className="mx-auto w-full max-w-6xl px-6 py-8">Loading...</main>}>
      <ProductsPageContent />
    </Suspense>
  );
}
