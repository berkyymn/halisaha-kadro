import type { ReactNode } from "react";
import Link from "next/link";
import { BackToAppLink } from "@/components/BackToAppLink";

/** Rehber sayfalarının ortak çerçevesi (gizlilik sayfasıyla aynı koyu stil). */
export function GuideShell({ children, breadcrumb }: { children: ReactNode; breadcrumb?: ReactNode }) {
  return (
    <main className="h-full overflow-y-auto bg-zinc-950 text-white">
      <article className="mx-auto max-w-3xl space-y-10 px-5 py-10 sm:py-14">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <BackToAppLink className="inline-flex items-center gap-2 font-bold text-zinc-300 hover:text-white">
            <img src="/icon.svg" alt="" width={28} height={28} className="rounded-lg" />
            Halı Saha Kadro
          </BackToAppLink>
          {breadcrumb}
        </div>
        {children}
      </article>
    </main>
  );
}

export function CtaButton({ href = "/", children = "Hemen kadro kur — ücretsiz" }: { href?: string; children?: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex h-12 items-center justify-center rounded-xl bg-green-600 px-6 text-base font-bold text-white hover:bg-green-500"
    >
      {children}
    </Link>
  );
}

export function GuideFaq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold sm:text-2xl">Sık sorulan sorular</h2>
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.q} className="space-y-1">
            <h3 className="font-bold">{item.q}</h3>
            <p className="text-[15px] leading-relaxed text-zinc-300">{item.a}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function GuideFooterCta({ title = "Kadron hazır mı?" }: { title?: string }) {
  return (
    <footer className="space-y-3 rounded-2xl border border-green-600/30 bg-green-600/10 p-6 text-center">
      <p className="text-lg font-bold">{title}</p>
      <CtaButton />
    </footer>
  );
}
