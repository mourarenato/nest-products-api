"use client";

import { useEffect, useState } from "react";
import { getProductAnalysisStreamUrl } from "@/lib/api";
import { getToken } from "@/lib/auth";

type StreamPayload = {
  chunk?: string;
  done?: boolean;
};

type AiStreamModalProps = {
  productId: string;
  buttonLabel?: string;
  buttonClassName?: string;
};

export default function AiStreamModal({
  productId,
  buttonLabel = "Gerar Insights com IA",
  buttonClassName = "rounded-lg border border-violet-300 bg-violet-50 px-3 py-2 text-sm font-medium text-violet-800 hover:bg-violet-100",
}: AiStreamModalProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function openModal() {
    const token = getToken();
    setText("");
    if (!token) {
      setError("Faça login para gerar insights.");
      setLoading(false);
      setOpen(true);
      return;
    }

    setError("");
    setLoading(true);
    setOpen(true);
  }

  useEffect(() => {
    if (!open) {
      return;
    }

    const token = getToken();
    if (!token) {
      return;
    }

    const source = new EventSource(getProductAnalysisStreamUrl(productId, token));
    let finished = false;

    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as StreamPayload;
        if (payload.done) {
          finished = true;
          setLoading(false);
          source.close();
          return;
        }

        if (payload.chunk) {
          setText((current) => current + payload.chunk);
        }
      } catch {
        setText((current) => current + event.data);
      }
    };

    source.onerror = () => {
      if (finished) {
        return;
      }

      finished = true;
      setLoading(false);
      setError("Não foi possível gerar os insights. Tente novamente.");
      source.close();
    };

    return () => {
      finished = true;
      source.close();
    };
  }, [open, productId]);

  function closeModal() {
    setOpen(false);
    setLoading(false);
  }

  return (
    <>
      <button type="button" onClick={openModal} className={buttonClassName}>
        {buttonLabel}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-insights-title"
            className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4">
              <div>
                <h2 id="ai-insights-title" className="text-lg font-semibold text-zinc-900">
                  Insights de mercado
                </h2>
                <p className="mt-1 text-sm text-zinc-500">Análise gerada em tempo real</p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
              >
                Fechar
              </button>
            </div>

            <div className="overflow-y-auto px-5 py-4">
              {loading ? (
                <p className="mb-3 flex items-center gap-2 text-sm font-medium text-violet-700">
                  <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-violet-600" />
                  Gerando insights...
                </p>
              ) : null}
              {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
              <p className="min-h-32 whitespace-pre-wrap text-sm leading-6 text-zinc-800">
                {text || (loading ? "" : "Nenhum insight recebido.")}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
