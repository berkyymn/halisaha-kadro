import type { Metadata } from "next";
import Link from "next/link";
import { getFormationById } from "@/lib/formations";
import { FORMAT_GUIDES } from "@/lib/formationGuide";
import { FORMATIONS_HUB_PATH } from "@/components/guide/FormatGuidePage";
import { FormationPitch } from "@/components/guide/FormationPitch";
import { GuideFaq, GuideFooterCta, GuideShell } from "@/components/guide/GuideShell";

export const metadata: Metadata = {
  title: { absolute: "Halı Saha Dizilişleri: 6, 7 ve 8 Kişilik En İyi Dizilişler | Halı Saha Kadro" },
  description:
    "6, 7 ve 8 kişilik halı saha dizilişleri tek yerde: 3-2-1, 2-3-1, 3-3-1 ve diğer şemalar, hangi dizilişin ne zaman işe yaradığı. Dizilişini seç, ücretsiz kadro kur ve maç posterini paylaş.",
  alternates: { canonical: FORMATIONS_HUB_PATH },
};

const HUB_FAQ = [
  {
    q: "Halı sahada en iyi diziliş hangisi?",
    a: "Tek bir doğru yok; oyuncu sayısına ve takımının güçlü yanına bağlı. En yaygın dengeli seçenekler: 6 kişilikte 2-2-1, 7 kişilikte 3-2-1, 8 kişilikte 3-3-1.",
  },
  {
    q: "Diziliş şemalarında harfler ne anlama geliyor?",
    a: "K kaleci, D defans, O orta saha, F forvet. 3-2-1 gibi rakamlar kaleci hariç geriden ileriye hatlardaki oyuncu sayısıdır.",
  },
  {
    q: "Seçtiğim dizilişle poster hazırlayabilir miyim?",
    a: "Evet. Her dizilişin altındaki düğme Halı Saha Kadro'yu o dizilişle açar; oyuncularını ekleyip posteri indirebilir ya da WhatsApp'ta paylaşabilirsin.",
  },
];

export default function FormationsHubPage() {
  return (
    <GuideShell>
      <header className="space-y-4">
        <h1 className="text-3xl font-black leading-tight sm:text-4xl">Halı Saha Dizilişleri</h1>
        <p className="text-[17px] leading-relaxed text-zinc-300">
          Halı sahada kaç kişi oynadığına göre doğru diziliş değişir. Aşağıdan formatını seç: her
          dizilişin şemasını, güçlü ve zayıf yanlarını ve hangi takıma uyduğunu gör, sonra tek
          dokunuşla o dizilişle kadronu kur.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        {FORMAT_GUIDES.map((g) => {
          const popular = getFormationById(g.popularId);
          return (
            <Link
              key={g.slug}
              href={`${FORMATIONS_HUB_PATH}/${g.slug}`}
              className="group space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 hover:border-green-600/60"
            >
              <div className="mx-auto w-[84px] sm:w-[110px]">
                {popular && <FormationPitch formation={popular} title={`${g.size} kişilik ${popular.name} dizilişi`} />}
              </div>
              <h2 className="text-lg font-bold group-hover:text-green-400">{g.title}</h2>
              <p className="text-sm text-zinc-400">
                {g.formations.length} diziliş · en yaygın {popular?.name}
              </p>
            </Link>
          );
        })}
      </section>

      <GuideFaq items={HUB_FAQ} />
      <GuideFooterCta />
    </GuideShell>
  );
}
