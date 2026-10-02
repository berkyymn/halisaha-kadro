"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, MessageSquare, X } from "lucide-react";
import { ModalShell } from "@/components/ModalShell";
import { useAuth } from "@/contexts/AuthContext";
import { trackEvent } from "@/lib/analytics";
import { reportError } from "@/lib/errorReporting";
import { LEGAL } from "@/lib/legal";
import {
  FEEDBACK_EMAIL_MAX,
  FEEDBACK_MESSAGE_MAX,
  FEEDBACK_MESSAGE_MIN,
  FEEDBACK_TOPICS,
  isValidFeedbackEmail,
  sendFeedback,
  type FeedbackTopic,
} from "@/lib/cloud/feedbackRepository";

/** Öneri, hata bildirimi ve şikayet için iletişim formu. */
export function ContactModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <ModalShell
      open={open}
      onClose={onClose}
      busy={busy}
      panelClassName="bg-zinc-900 border border-zinc-700/80 rounded-2xl w-full max-w-md max-h-[92vh] shadow-2xl overflow-hidden flex flex-col"
    >
      {open && <ContactForm onClose={onClose} busy={busy} setBusy={setBusy} />}
    </ModalShell>
  );
}

function ContactForm({
  onClose,
  busy,
  setBusy,
}: {
  onClose: () => void;
  busy: boolean;
  setBusy: (busy: boolean) => void;
}) {
  const { configured, user } = useAuth();
  const [topic, setTopic] = useState<FeedbackTopic>("oneri");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState(user?.email ?? "");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const trimmed = message.trim();
  const emailTrimmed = email.trim();
  const emailInvalid = emailTrimmed.length > 0 && !isValidFeedbackEmail(emailTrimmed);
  const canSend = trimmed.length >= FEEDBACK_MESSAGE_MIN && !emailInvalid && !busy;

  const submit = async () => {
    if (!canSend) return;
    setBusy(true);
    setError(null);
    try {
      await sendFeedback({
        topic,
        message: trimmed,
        email: emailTrimmed || undefined,
        signedIn: Boolean(user),
      });
      trackEvent("feedback_sent", { topic });
      setSent(true);
    } catch (err) {
      reportError(err, "feedback", { level: "warning" });
      setError(`Mesaj gönderilemedi. İnternet bağlantını kontrol edip tekrar dene ya da ${LEGAL.contactEmail} adresine yaz.`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
        <div>
          <h3 className="text-sm font-bold text-white">İletişim</h3>
          <p className="text-[10px] text-zinc-500">Öneri, hata ya da şikayetini bize yaz</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-40"
          aria-label="Kapat"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {sent ? (
        <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
          <CheckCircle2 className="w-10 h-10 text-green-400" aria-hidden />
          <p className="text-sm font-semibold text-white">Mesajın bize ulaştı, teşekkürler!</p>
          <p className="text-xs text-zinc-400 leading-relaxed">
            {emailTrimmed ? "Gerekirse yazdığın e-posta adresinden dönüş yapacağız." : "Her mesajı okuyoruz."}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-2 h-9 px-5 rounded-lg bg-zinc-800 text-xs font-semibold text-zinc-200 hover:bg-zinc-700"
          >
            Kapat
          </button>
        </div>
      ) : (
        <>
          <div className="p-4 space-y-4 overflow-y-auto min-h-0">
            <div>
              <p className="mb-1.5 text-[11px] font-semibold text-zinc-300">Konu</p>
              <div className="grid grid-cols-4 gap-1 rounded-lg border border-zinc-800 bg-zinc-950 p-1" role="radiogroup" aria-label="Konu">
                {FEEDBACK_TOPICS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={topic === option.id}
                    onClick={() => setTopic(option.id)}
                    className={`rounded-md px-1 py-1.5 text-[11px] font-semibold transition-colors ${
                      topic === option.id ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="block">
              <span className="text-[11px] font-semibold text-zinc-300">Mesajın</span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, FEEDBACK_MESSAGE_MAX))}
                rows={6}
                autoFocus
                placeholder={
                  topic === "hata"
                    ? "Ne yaparken oldu? Ne bekliyordun, ne oldu?"
                    : "Aklındakini yaz…"
                }
                className="mt-1 w-full resize-none rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-green-500/70 focus:ring-1 focus:ring-green-500/30"
              />
              <span className="mt-0.5 flex justify-between text-[10px] text-zinc-500">
                <span>
                  {trimmed.length > 0 && trimmed.length < FEEDBACK_MESSAGE_MIN
                    ? `En az ${FEEDBACK_MESSAGE_MIN} karakter`
                    : ""}
                </span>
                <span className="tabular-nums">
                  {message.length}/{FEEDBACK_MESSAGE_MAX}
                </span>
              </span>
            </label>

            <label className="block">
              <span className="text-[11px] font-semibold text-zinc-300">
                E-posta <span className="font-normal text-zinc-500">(isteğe bağlı, dönüş için)</span>
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value.slice(0, FEEDBACK_EMAIL_MAX))}
                placeholder="ornek@eposta.com"
                autoComplete="email"
                className="mt-1 w-full h-10 rounded-xl border border-zinc-700 bg-zinc-800 px-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-green-500/70 focus:ring-1 focus:ring-green-500/30"
              />
              {emailInvalid && (
                <span className="mt-0.5 block text-[10px] text-amber-300/90">E-posta adresini kontrol et</span>
              )}
            </label>

            {error && (
              <p className="text-xs text-red-400 bg-red-950/40 border border-red-900/50 rounded-lg px-3 py-2" role="alert">
                {error}
              </p>
            )}

            <p className="text-[10px] leading-relaxed text-zinc-500">
              Mesajın ve yazdıysan e-posta adresin yalnızca sana dönüş yapmak ve uygulamayı
              geliştirmek için saklanır (
              <a href="/gizlilik" target="_blank" rel="noopener" className="underline underline-offset-2 hover:text-zinc-300">
                Gizlilik ve KVKK
              </a>
              ). Doğrudan {LEGAL.contactEmail} adresine de yazabilirsin.
            </p>
          </div>

          <div className="flex items-center gap-2 px-4 py-3 border-t border-zinc-800 shrink-0">
            <div className="flex-1" />
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="h-9 px-4 rounded-lg bg-zinc-800 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 disabled:opacity-40"
            >
              Vazgeç
            </button>
            <button
              type="button"
              onClick={() => void submit()}
              disabled={!canSend || !configured}
              className="h-9 px-5 rounded-lg bg-green-600 text-xs font-semibold text-white hover:bg-green-500 disabled:opacity-40 inline-flex items-center gap-1.5"
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageSquare className="w-3.5 h-3.5" />}
              Gönder
            </button>
          </div>
        </>
      )}
    </>
  );
}
