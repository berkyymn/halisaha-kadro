"use client";

import { Users, Cloud, Merge, AlertTriangle } from "lucide-react";
import { ModalShell } from "@/components/ModalShell";
import type { ConflictSummary } from "@/lib/loginConflict";

export type LoginConflictChoice = "local" | "cloud" | "merge";

type LoginConflictModalProps = {
  open: boolean;
  busy?: boolean;
  localSummary: ConflictSummary;
  cloudSummary: ConflictSummary;
  cloudUpdatedAt?: string;
  onResolve: (choice: LoginConflictChoice) => void;
};

function formatDate(iso?: string) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString("tr-TR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function SummaryCard({
  title,
  icon: Icon,
  summary,
  updatedAt,
  highlight = false,
}: {
  title: string;
  icon: React.ElementType;
  summary: ConflictSummary;
  updatedAt?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex-1 rounded-xl border p-4 space-y-3 ${
        highlight
          ? "bg-zinc-800/60 border-zinc-600"
          : "bg-zinc-900/60 border-zinc-700/80"
      }`}
    >
      <div className="flex items-center gap-2 text-zinc-200">
        <Icon className="w-4 h-4" />
        <h4 className="text-sm font-semibold">{title}</h4>
      </div>
      <div className="space-y-1 text-[12px] text-zinc-400">
        <p>
          <span className="text-zinc-500">Takımlar:</span>{" "}
          {summary.homeTeamName} vs {summary.awayTeamName}
        </p>
        <p>
          <span className="text-zinc-500">Oyuncu / foto:</span>{" "}
          {summary.playerCount} / {summary.photoCount}
        </p>
        <p>
          <span className="text-zinc-500">Yedek:</span> {summary.benchCount}
        </p>
        <p>
          <span className="text-zinc-500">Saha:</span> {summary.venue}
        </p>
        <p>
          <span className="text-zinc-500">Son güncelleme:</span>{" "}
          {formatDate(updatedAt ?? summary.lastUpdatedAt)}
        </p>
      </div>
    </div>
  );
}

export function LoginConflictModal({
  open,
  busy = false,
  localSummary,
  cloudSummary,
  cloudUpdatedAt,
  onResolve,
}: LoginConflictModalProps) {
  return (
    <ModalShell
      open={open}
      onClose={() => {}}
      busy={busy}
      panelClassName="bg-zinc-900 border border-zinc-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
    >
      <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-400" />
        <h3 className="text-sm font-semibold text-white">
          Hesabında başka bir kadro var
        </h3>
      </div>

      <div className="p-5 space-y-4">
        <p className="text-sm text-zinc-300 leading-relaxed">
          Bu cihazdaki kadro ile buluttaki kadro birbirinden farklı. Hangisini
          kullanmak istediğini seç:
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <SummaryCard
            title="Bu cihaz"
            icon={Users}
            summary={localSummary}
            highlight
          />
          <SummaryCard
            title="Bulut"
            icon={Cloud}
            summary={cloudSummary}
            updatedAt={cloudUpdatedAt}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
          <button
            type="button"
            onClick={() => onResolve("local")}
            disabled={busy}
            className="h-10 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-sm font-semibold text-zinc-200"
          >
            Bu cihazı kullan
          </button>
          <button
            type="button"
            onClick={() => onResolve("cloud")}
            disabled={busy}
            className="h-10 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-sm font-semibold text-zinc-200"
          >
            Bulutu kullan
          </button>
          <button
            type="button"
            onClick={() => onResolve("merge")}
            disabled={busy}
            className="h-10 rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-50 text-sm font-semibold text-white flex items-center justify-center gap-1.5"
          >
            <Merge className="w-3.5 h-3.5" />
            Birleştir
          </button>
        </div>

        <p className="text-[11px] text-zinc-500 leading-relaxed">
          “Birleştir” seçeneği bulut kaydını temel alır ama bu cihazdaki
          fotoğrafları/logoları korur (eğer bulutta yoksa). “Bu cihazı kullan”
          buluttaki kadroyu siler.
        </p>
      </div>
    </ModalShell>
  );
}
