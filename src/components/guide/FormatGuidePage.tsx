import type { Metadata } from "next";
import Link from "next/link";
import { getFormationById } from "@/lib/formations";
import { FORMAT_GUIDES, formationDeepLink, type FormatGuide } from "@/lib/formationGuide";
import { FormationPitch, ROLE_COLORS } from "@/components/guide/FormationPitch";
import { GuideFaq, GuideFooterCta, GuideShell } from "@/components/guide/GuideShell";

export const FORMATIONS_HUB_PATH = "/hali-saha-dizilisleri";

export function formatGuideMetadata(guide: FormatGuide): Metadata {
  return {
    title: { absolute: `${guide.title}: En İyi Diziliş Hangisi? | Halı Saha Kadro` },
    description: guide.description,
    alternates: { canonical: `${FORMATIONS_HUB_PATH}/${guide.slug}` },
  };
}

function RoleLegend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-400">
      {Object.values(ROLE_COLORS).map((r) => (
        <li key={r.short} className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full" style={{ background: r.color }} aria-hidden />
          {r.label}
        </li>
      ))}
    </ul>
  );
}

export function FormatGuidePage({ guide }: { guide: FormatGuide }) {
  const others = FORMAT_GUIDES.filter((g) => g.size !== guide.size);
  return (
    <GuideShell
      breadcrumb={
        <>
          <span className="text-zinc-600">/</span>
          <Link href={FORMATIONS_HUB_PATH} className="text-zinc-400 hover:text-white">
            Dizilişler
          </Link>
        </>
      }
    >
      <header className="space-y-4">
        <h1 className="text-3xl font-black leading-tight sm:text-4xl">{guide.title}</h1>
        <p className="text-[17px] leading-relaxed text-zinc-300">{guide.intro}</p>
        <RoleLegend />
      </header>

      <section className="space-y-6">
        <h2 className="text-xl font-bold sm:text-2xl">
          {guide.size} kişilik dizilişler ve ne zaman kullanılır
        </h2>
        {guide.formations.map((f) => {
          const formation = getFormationById(f.id);
          if (!formation) return null;
          const popular = f.id === guide.popularId;
          return (
            <div
              key={f.id}
              id={formation.name}
              className="grid gap-5 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 sm:grid-cols-[150px_1fr]"
            >
              <div className="mx-auto w-[130px] sm:w-full">
                <FormationPitch formation={formation} title={`${guide.size} kişilik ${formation.name} dizilişi şeması`} />
              </div>
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-2xl font-black tracking-wide">{formation.name}</h3>
                  <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-xs font-semibold text-zinc-300">{f.style}</span>
                  {popular && (
                    <span className="rounded-md bg-green-600/20 px-2 py-0.5 text-xs font-semibold text-green-400">En yaygın</span>
                  )}
                </div>
                <p className="text-[15px] leading-relaxed text-zinc-200">{f.summary}</p>
                <dl className="space-y-1.5 text-[14px] leading-relaxed">
                  <div>
                    <dt className="inline font-semibold text-green-400">Güçlü yanı: </dt>
                    <dd className="inline text-zinc-300">{f.strengths}</dd>
                  </div>
                  <div>
                    <dt className="inline font-semibold text-red-400">Zayıf yanı: </dt>
                    <dd className="inline text-zinc-300">{f.weaknesses}</dd>
                  </div>
                  <div>
                    <dt className="inline font-semibold text-zinc-200">Kime uygun: </dt>
                    <dd className="inline text-zinc-300">{f.bestFor}</dd>
                  </div>
                </dl>
                <Link
                  href={formationDeepLink(f.id)}
                  className="inline-flex h-10 items-center rounded-lg bg-green-600 px-4 text-sm font-bold text-white hover:bg-green-500"
                >
                  {formation.name} ile kadro kur
                </Link>
              </div>
            </div>
          );
        })}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold sm:text-2xl">{guide.size} kişilik kadro kurarken ipuçları</h2>
        <ul className="space-y-2">
          {guide.tips.map((t) => (
            <li key={t} className="flex gap-2 text-[15px] leading-relaxed text-zinc-300">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" aria-hidden />
              {t}
            </li>
          ))}
        </ul>
      </section>

      <GuideFaq items={guide.faq} />

      <section className="space-y-2">
        <h2 className="text-lg font-bold">Diğer formatlar</h2>
        <div className="flex flex-wrap gap-2">
          {others.map((g) => (
            <Link
              key={g.slug}
              href={`${FORMATIONS_HUB_PATH}/${g.slug}`}
              className="rounded-lg border border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-200 hover:border-zinc-500"
            >
              {g.title}
            </Link>
          ))}
          <Link
            href="/hali-saha-kadro-kur"
            className="rounded-lg border border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-200 hover:border-zinc-500"
          >
            Halı saha kadro nasıl kurulur?
          </Link>
        </div>
      </section>

      <GuideFooterCta title={`${guide.size} kişilik kadronu kur, posterini paylaş`} />
    </GuideShell>
  );
}
