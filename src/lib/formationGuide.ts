import type { SquadSize } from "@/types";

/**
 * Diziliş rehberi sayfalarının içeriği (app/hali-saha-dizilisleri). Diziliş
 * kimlikleri lib/formations.ts ile aynıdır; "Bu dizilişle kadro kur" bağlantısı
 * uygulamayı `?dizilis=<id>` ile açar (bkz. useFormationDeepLink).
 */

export type FormationGuide = {
  id: string;
  /** Kısa nitelik: "Dengeli", "Hücumcu" … */
  style: string;
  summary: string;
  strengths: string;
  weaknesses: string;
  bestFor: string;
};

export type FormatGuide = {
  size: SquadSize;
  slug: string;
  title: string;
  description: string;
  intro: string;
  popularId: string;
  formations: FormationGuide[];
  tips: string[];
  faq: { q: string; a: string }[];
};

export const FORMATION_DEEP_LINK_PARAM = "dizilis";

export function formationDeepLink(id: string): string {
  return `/?${FORMATION_DEEP_LINK_PARAM}=${encodeURIComponent(id)}`;
}

export const FORMAT_GUIDES: FormatGuide[] = [
  {
    size: 6,
    slug: "6-kisilik",
    title: "6 Kişilik Halı Saha Dizilişleri",
    description:
      "6 kişilik (6'ya 6) halı saha dizilişleri: 3-1-1, 2-2-1 ve 2-1-2 şemaları, güçlü ve zayıf yanları, hangi takıma uyduğu. Seçtiğin dizilişle ücretsiz kadro kur, maç posterini paylaş.",
    intro:
      "6'ya 6 halı sahada kaleci dışında 5 oyuncu var; saha dar olduğu için her oyuncu hem savunmaya hem hücuma katılmak zorunda. Doğru diziliş, kimin geride bekleyeceğini ve kimin baskıya çıkacağını baştan netleştirir.",
    popularId: "6-3-1-1",
    formations: [
      {
        id: "6-3-1-1",
        style: "Savunma ağırlıklı",
        summary: "Üç kişilik savunma hattının önünde tek orta saha, en önde tek forvet.",
        strengths: "Geride sayısal üstünlük; hızlı rakip forvetlere karşı arka alan kapalı kalır.",
        weaknesses: "Orta saha tek kişi, top kazanınca ileriye çıkmak yavaşlar.",
        bestFor: "Kondisyonu sınırlı ya da önde güçlü rakiple oynayan takımlar.",
      },
      {
        id: "6-2-2-1",
        style: "Dengeli",
        summary: "İki savunmacı, iki orta saha ve tek forvet; en çok tercih edilen düzen.",
        strengths: "Savunma ve hücum arasında boşluk az; orta sahadaki ikili top dolaşımını kolaylaştırır.",
        weaknesses: "Kanat bindirmelerinde savunmacılar açık verebilir.",
        bestFor: "Pas oyununu seven, oyuncuları birbirine yakın kalitede takımlar.",
      },
      {
        id: "6-2-1-2",
        style: "Hücumcu",
        summary: "İki savunmacı, bir orta saha ve önde iki forvet.",
        strengths: "Önde iki oyuncu rakip savunmayı sürekli meşgul eder, gol pozisyonu artar.",
        weaknesses: "Top kaybında orta saha boş kalır; tek orta sahacının çok koşması gerekir.",
        bestFor: "Bitiriciliği iyi iki oyuncusu olan, skor arayan takımlar.",
      },
    ],
    tips: [
      "Saha dar: savunmacıların da şut atabildiği bir düzen gol sayısını artırır.",
      "Tek orta sahalı dizilişlerde en çok koşan oyuncuyu ortaya koy.",
      "Kaleci elle oyun kurabiliyorsa savunmacılardan biri kanada açılsın.",
    ],
    faq: [
      {
        q: "6 kişilik halı sahada en iyi diziliş hangisi?",
        a: "Çoğu takım için 2-2-1 en dengeli seçenek. Savunmada zorlanıyorsan 3-1-1, gol bulamıyorsan 2-1-2 dene.",
      },
      {
        q: "6'ya 6 halı saha kaç kişiyle oynanır?",
        a: "Her takımda bir kaleci ve beş saha oyuncusu olmak üzere 6 kişi; kenarda yedek tutmak serbesttir.",
      },
    ],
  },
  {
    size: 7,
    slug: "7-kisilik",
    title: "7 Kişilik Halı Saha Dizilişleri",
    description:
      "7 kişilik (7'ye 7) halı saha dizilişleri: 3-2-1, 2-3-1, 2-2-2, 3-1-2 ve 2-1-3 şemaları, güçlü ve zayıf yanları, hangi takıma uyduğu. Seçtiğin dizilişle ücretsiz kadro kur, maç posterini paylaş.",
    intro:
      "7'ye 7, Türkiye'de halı sahanın en yaygın formatı: kaleci dışında 6 oyuncu var ve saha, oyuncuların görevlerini ayırmaya yetecek kadar geniş. Diziliş seçimi en çok burada fark yaratır.",
    popularId: "7-3-2-1",
    formations: [
      {
        id: "7-3-2-1",
        style: "Dengeli, savunması sağlam",
        summary: "Üç savunmacı, iki orta saha ve tek forvet; 7'ye 7'de en çok kullanılan diziliş.",
        strengths: "Arka alan güvende, orta sahadaki ikili hem savunmaya yardım eder hem forvete top taşır.",
        weaknesses: "Forvet yalnız kalabilir; orta sahacılar hücuma katılmazsa gol bulmak zorlaşır.",
        bestFor: "Gol yemekten kaçınan, kontratakla oynayan takımlar.",
      },
      {
        id: "7-2-3-1",
        style: "Orta saha hakimiyeti",
        summary: "İki savunmacı, üç orta saha ve tek forvet.",
        strengths: "Orta sahada sayısal üstünlük; topu ayakta tutmak ve rakibi kendi yarı sahasına hapsetmek kolay.",
        weaknesses: "Savunmada iki kişi kalır; orta saha geri dönmezse kontratağa açık.",
        bestFor: "Pas oyununa güvenen, orta sahası güçlü takımlar.",
      },
      {
        id: "7-2-2-2",
        style: "Dengeli, hücum seçenekli",
        summary: "Her hatta iki oyuncu: iki savunma, iki orta saha, iki forvet.",
        strengths: "Saha dengeli dolar; önde iki forvet savunmayı zorlar, rol dağılımı herkes için net.",
        weaknesses: "Hatlar arası mesafe açılırsa orta saha arada ezilir.",
        bestFor: "Oyuncuları her bölgede eşit kalitede olan takımlar.",
      },
      {
        id: "7-3-1-2",
        style: "Kontratak",
        summary: "Üç savunmacı, tek orta saha ve önde iki forvet.",
        strengths: "Geride sağlam; top kazanılınca iki forvete hızlı uzun pas ile tehlike yaratılır.",
        weaknesses: "Orta saha tek kişi; topa sahip olmak zorlaşır.",
        bestFor: "Önde hızlı iki oyuncusu olan, rakibe topu bırakmaktan çekinmeyen takımlar.",
      },
      {
        id: "7-2-1-3",
        style: "Çok hücumcu",
        summary: "İki savunmacı, tek orta saha ve önde üç forvet.",
        strengths: "Rakip yarı sahada yüksek baskı ve çok sayıda gol pozisyonu.",
        weaknesses: "Top kaybında savunma çok açık kalır; kondisyon ister.",
        bestFor: "Skoru kovalayan ya da rakibinden belirgin şekilde güçlü takımlar.",
      },
    ],
    tips: [
      "3-2-1 ile başla; maçın akışına göre bir orta sahacıyı forvete ya da savunmaya kaydır.",
      "İki forvetli dizilişlerde forvetlerden biri top kaybında ilk baskıyı yapmalı.",
      "Kondisyon farkı varsa en yorulan bölgeye (genelde orta saha) değişiklikle taze oyuncu sok.",
      "Kaleciyle oyun kurmak 7'ye 7'de fark yaratır: savunmacılar kanatlara açılıp pas istesin.",
    ],
    faq: [
      {
        q: "7 kişilik halı sahada en iyi diziliş hangisi?",
        a: "En yaygın ve dengeli seçenek 3-2-1. Orta sahası güçlü takımlar 2-3-1, önde iki iyi bitiricisi olanlar 2-2-2 ya da 3-1-2 ile daha verimli olur.",
      },
      {
        q: "7'ye 7 halı saha kaç kişiyle oynanır?",
        a: "Her takımda bir kaleci ve altı saha oyuncusu olmak üzere 7 kişi oynar.",
      },
      {
        q: "Maç sırasında diziliş değiştirebilir miyim?",
        a: "Evet; halı sahada değişiklik serbest olduğu için skor durumuna göre bir oyuncuyu hatlar arasında kaydırmak en kolay yoldur.",
      },
    ],
  },
  {
    size: 8,
    slug: "8-kisilik",
    title: "8 Kişilik Halı Saha Dizilişleri",
    description:
      "8 kişilik (8'e 8) halı saha dizilişleri: 3-3-1, 3-2-2, 2-3-2, 4-2-1 ve diğer şemalar, güçlü ve zayıf yanları, hangi takıma uyduğu. Seçtiğin dizilişle ücretsiz kadro kur, maç posterini paylaş.",
    intro:
      "8'e 8 maçlar büyük halı sahalarda oynanır ve kaleci dışında 7 oyuncu vardır. Oyuncu sayısı arttıkça kanat ve merkez görevlerini ayırmak mümkün olur; diziliş klasik futbola en çok burada benzer.",
    popularId: "8-3-3-1",
    formations: [
      {
        id: "8-3-3-1",
        style: "Dengeli",
        summary: "Üç savunmacı, üç orta saha, tek forvet; 8'e 8'in en yaygın dizilişi.",
        strengths: "Savunma ve orta saha kalabalık, takım kompakt kalır; kanat orta sahacıları hücuma da katılır.",
        weaknesses: "Tek forvet destek almazsa gol üretmek zorlaşır.",
        bestFor: "Dengeli oynamak isteyen, oyuncuları farklı seviyede olan takımlar.",
      },
      {
        id: "8-3-2-2",
        style: "Dengeli, iki forvetli",
        summary: "Üç savunmacı, iki orta saha ve önde iki forvet.",
        strengths: "Savunma güvende kalırken önde iki oyuncu rakip savunmayı ikiye böler.",
        weaknesses: "Orta saha iki kişi; geniş sahada kanatlar boş kalabilir.",
        bestFor: "Önde iki iyi oyuncusu olan, savunmadan taviz vermek istemeyen takımlar.",
      },
      {
        id: "8-2-3-2",
        style: "Hücum ağırlıklı",
        summary: "İki savunmacı, üç orta saha ve iki forvet.",
        strengths: "Orta saha ve hücum kalabalık; topa sahip olmak ve pozisyon üretmek kolay.",
        weaknesses: "İki kişilik savunma geniş sahada hızlı kontrataklara açık.",
        bestFor: "Topa sahip olmayı seven, savunmacıları hızlı takımlar.",
      },
      {
        id: "8-4-2-1",
        style: "Savunmacı",
        summary: "Dört savunmacı, iki orta saha ve tek forvet.",
        strengths: "Geniş sahada en sağlam arka hat; kenar savunmacılar kanatları kapatır.",
        weaknesses: "Hücumda az oyuncu; kontratak dışında gol bulmak zor.",
        bestFor: "Skoru korumak isteyen ya da güçlü bir rakibe karşı oynayan takımlar.",
      },
      {
        id: "8-4-1-2",
        style: "Savunmacı, kontratak",
        summary: "Dört savunmacı, tek orta saha ve iki forvet.",
        strengths: "Geride kalabalık, önde iki forvetle hızlı geçiş.",
        weaknesses: "Orta saha tek kişi; top uzun süre rakipte kalır.",
        bestFor: "Uzun pas ve hızlı forvetlerle oynayan takımlar.",
      },
      {
        id: "8-3-1-3",
        style: "Hücumcu",
        summary: "Üç savunmacı, tek orta saha ve önde üç forvet.",
        strengths: "Önde geniş bir hücum hattı; kanatlardan sürekli tehdit.",
        weaknesses: "Orta saha boşluğu; forvetler savunmaya dönmezse ortada açık verir.",
        bestFor: "Hızlı kanat oyuncuları olan, baskılı oynamak isteyen takımlar.",
      },
      {
        id: "8-2-2-3",
        style: "Çok hücumcu",
        summary: "İki savunmacı, iki orta saha ve üç forvet.",
        strengths: "Rakip yarı sahada çok oyuncu; yüksek pres ve bol pozisyon.",
        weaknesses: "Savunma iki kişi, top kaybında çok risk.",
        bestFor: "Geride kalan ve gol arayan ya da rakibinden açıkça güçlü takımlar.",
      },
      {
        id: "8-2-4-1",
        style: "Orta saha hakimiyeti",
        summary: "İki savunmacı, dört orta saha ve tek forvet.",
        strengths: "Orta sahada dört oyuncu; topu rakibe vermeden oyun kurulur.",
        weaknesses: "Savunma iki kişi; orta saha geri dönüş disiplini ister.",
        bestFor: "Pas oyunu oynayan, kondisyonu yüksek takımlar.",
      },
      {
        id: "8-2-1-4",
        style: "Tam hücum",
        summary: "İki savunmacı, tek orta saha ve önde dört oyuncu.",
        strengths: "Maksimum hücum; son dakikalarda gol aramak için.",
        weaknesses: "Orta saha ve savunma çok açık; uzun süre oynanması zor.",
        bestFor: "Maçın sonunda skoru çevirmeye çalışan takımlar.",
      },
    ],
    tips: [
      "Geniş sahada kanatları boş bırakma: üçlü hatlarda dıştaki oyuncular kenara açılsın.",
      "Tek forvetli dizilişlerde orta sahacılardan biri ceza sahasına koşmalı.",
      "Dörtlü savunmada kenar savunmacılar hücuma çıkabilir; ortadaki ikili sabit kalsın.",
    ],
    faq: [
      {
        q: "8 kişilik halı sahada en iyi diziliş hangisi?",
        a: "En dengeli seçenek 3-3-1. Önde iki iyi oyuncun varsa 3-2-2, topa sahip olmayı seviyorsan 2-3-2 dene.",
      },
      {
        q: "8'e 8 halı saha kaç kişiyle oynanır?",
        a: "Her takımda bir kaleci ve yedi saha oyuncusu olmak üzere 8 kişi oynar.",
      },
    ],
  },
];

export function getFormatGuide(size: SquadSize): FormatGuide {
  const guide = FORMAT_GUIDES.find((g) => g.size === size);
  if (!guide) throw new Error(`Diziliş rehberi yok: ${size}`);
  return guide;
}
