import type { Metadata } from "next";
import { BackToAppLink } from "@/components/BackToAppLink";
import { ConsentResetButton } from "@/components/ConsentResetButton";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Gizlilik Politikası ve KVKK Aydınlatma Metni",
  description:
    "Halı Saha Kadro'nun kişisel verileri nasıl işlediği, sakladığı ve KVKK kapsamındaki haklarınız.",
  alternates: { canonical: "/gizlilik" },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-bold text-white">{title}</h2>
      <div className="space-y-2 text-[15px] leading-relaxed text-zinc-300">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <main className="h-full overflow-y-auto bg-zinc-950 text-white">
      <article className="mx-auto max-w-3xl space-y-8 px-5 py-10 sm:py-14">
        <header className="space-y-3">
          <BackToAppLink className="inline-flex items-center gap-2 text-sm font-bold text-zinc-300 hover:text-white">
            <img src="/icon.svg" alt="" width={28} height={28} className="rounded-lg" />
            Halı Saha Kadro
          </BackToAppLink>
          <h1 className="text-2xl font-black sm:text-3xl">
            Gizlilik Politikası ve KVKK Aydınlatma Metni
          </h1>
          <p className="text-sm text-zinc-500">Son güncelleme: {LEGAL.lastUpdated}</p>
        </header>

        <Section title="1. Veri sorumlusu">
          <p>
            6698 sayılı Kişisel Verilerin Korunması Kanunu (&quot;KVKK&quot;) kapsamında
            veri sorumlusu {LEGAL.controllerName}&apos;dır. Bize {LEGAL.contactEmail}{" "}
            adresinden ulaşabilirsin.
          </p>
        </Section>

        <Section title="2. Hangi verileri işliyoruz?">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong className="text-white">Hesap bilgileri:</strong> giriş yaparsan
              e-posta adresin ve Firebase kullanıcı kimliğin (Google ile girişte
              Google hesabının e-postası).
            </li>
            <li>
              <strong className="text-white">Poster içeriği:</strong> eklediğin
              oyuncu isimleri, forma numaraları, oyuncu fotoğrafları, takım adları ve
              logoları, maç yeri/tarihi/saati.
            </li>
            <li>
              <strong className="text-white">Hata kayıtları:</strong> uygulamada
              bir hata oluştuğunda teknik ayrıntılar (hata mesajı, tarayıcı/sürüm
              bilgisi, giriş yaptıysan anonim kullanıcı kimliği). E-posta, IP
              adresi, oyuncu isimleri veya fotoğraflar gönderilmez.
            </li>
            <li>
              <strong className="text-white">İletişim mesajları:</strong> menüdeki
              İletişim formundan gönderdiğin mesaj, konusu, yazdıysan e-posta adresin,
              giriş yapıp yapmadığın ve tarayıcı bilgisi.
            </li>
            <li>
              <strong className="text-white">Kullanım istatistikleri:</strong> yalnızca
              onay verirsen, Google Analytics aracılığıyla anonimleştirilmiş kullanım
              verileri (hangi özelliklerin kullanıldığı, cihaz/tarayıcı türü).
            </li>
          </ul>
          <p>
            Oyuncu fotoğrafları başka kişilere ait olabilir. Fotoğrafını eklediğin
            kişilerin iznini almak senin sorumluluğundadır.
          </p>
        </Section>

        <Section title="3. Verileri hangi amaçla ve hangi hukuki sebeple işliyoruz?">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Kadro ve poster hazırlama hizmetini sunmak, hesabınla farklı cihazlardan
              erişebilmen için kaydetmek (KVKK m.5/2-c: sözleşmenin ifası).
            </li>
            <li>Hesap güvenliğini sağlamak (KVKK m.5/2-f: meşru menfaat).</li>
            <li>
              Hataları tespit edip düzeltmek (KVKK m.5/2-f: meşru menfaat). Hata
              kayıtları Sentry (Functional Software, Inc.) altyapısında, Avrupa
              Birliği (Almanya) veri merkezinde, 90 gün saklanır; çerez kullanılmaz.
            </li>
            <li>
              İletişim formundan gelen öneri, hata ve şikayetleri değerlendirmek ve
              istersen sana dönüş yapmak (KVKK m.5/2-f: meşru menfaat). Mesajlar
              Cloud Firestore&apos;da saklanır, en geç 1 yıl sonra silinir; silinmesini
              istersen {LEGAL.contactEmail} adresine yazabilirsin.
            </li>
            <li>
              Uygulamayı geliştirmek için kullanım istatistiği toplamak (KVKK m.5/1:
              açık rıza — çerez banner&apos;ından verilir ve her zaman geri alınabilir).
            </li>
          </ul>
        </Section>

        <Section title="4. Veriler nerede saklanıyor?">
          <p>
            <strong className="text-white">Giriş yapmadan</strong> kullanırsan tüm
            veriler yalnızca bu tarayıcıda (IndexedDB / localStorage) saklanır, bize
            gönderilmez.
          </p>
          <p>
            <strong className="text-white">Giriş yaparsan</strong> poster verilerin ve
            medya dosyaların Google Firebase (Authentication, Cloud Firestore, Cloud
            Storage) altyapısında saklanır. Arka plan
            kaldırma işlemi tamamen senin tarayıcında çalışır; fotoğrafın bu
            işlem için üçüncü bir tarafa gönderilmez. Bu özellik ilk
            kullanıldığında gerekli yapay zekâ modeli IMG.LY
            (staticimgly.com) sunucusundan indirilir; bu indirme sırasında
            yalnızca IP adresin ve tarayıcı bilgin bu sunucuya iletilir.
          </p>
        </Section>

        <Section title="5. Yurt dışına aktarım">
          <p>
            Firebase ve Google Analytics hizmet sağlayıcısı Google LLC&apos;nin
            sunucuları, arka plan kaldırma modelinin indirildiği IMG.LY GmbH sunucuları ve hata kayıtlarının tutulduğu Sentry (AB/Almanya) sunucuları yurt dışında bulunabilir. Giriş yaparak bulut kaydını
            kullanman, iletişim formundan mesaj göndermen ve analitik çerezlere onay vermen halinde verilerin KVKK m.9
            kapsamında yurt dışına aktarılmasına açık rıza vermiş olursun. Giriş
            yapmadan ve analitiği reddederek uygulamayı yurt dışına veri aktarımı
            olmadan kullanabilirsin.
          </p>
        </Section>

        <Section title="6. Saklama süresi">
          <p>
            Hesap verilerin ve posterin, hesabın silinene kadar saklanır. Hesabını
            ve tüm verilerini (bulut kadrosu, fotoğraflar, logolar) istediğin an
            uygulamada sağ üstteki hesap menüsü → Hesap ayarları → <strong className="text-white">Hesabımı sil</strong> ile
            kalıcı olarak silebilirsin; silme anında gerçekleşir. Yardım için{" "}
            {LEGAL.contactEmail} adresine de yazabilirsin. Çıkış
            yaptığında bu cihazdaki kopya silinir.
          </p>
        </Section>

        <Section title="7. Çerezler ve yerel depolama">
          <p>
            Uygulamanın çalışması için zorunlu olan tarayıcı depolaması (kadro
            verisi, oturum bilgisi, çerez tercihin) onay gerektirmez. Google Analytics
            çerezleri zorunlu değildir ve yalnızca onay verirsen kullanılır.
          </p>
          <ConsentResetButton />
        </Section>

        <Section title="8. KVKK kapsamındaki hakların">
          <p>KVKK m.11 uyarınca veri sorumlusuna başvurarak:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>kişisel verilerinin işlenip işlenmediğini öğrenme,</li>
            <li>işlenmişse buna ilişkin bilgi talep etme,</li>
            <li>işlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme,</li>
            <li>yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme,</li>
            <li>eksik veya yanlış işlenmişse düzeltilmesini isteme,</li>
            <li>silinmesini veya yok edilmesini isteme,</li>
            <li>
              otomatik sistemlerle analiz edilmesi sonucu aleyhine bir sonuç çıkmasına
              itiraz etme,
            </li>
            <li>kanuna aykırı işleme nedeniyle zarara uğrarsan zararın giderilmesini talep etme</li>
          </ul>
          <p>haklarına sahipsin. Başvurularını {LEGAL.contactEmail} adresine iletebilirsin.</p>
        </Section>

        <footer className="space-y-3 border-t border-zinc-800 pt-6 text-sm text-zinc-500">
          <p id="kullanilan-icerikler">
            <span className="font-semibold text-zinc-400">Kullanılan içerikler:</span> Logo
            tasarımındaki arma sembolleri{" "}
            <a
              href="https://game-icons.net"
              target="_blank"
              rel="noopener"
              className="text-zinc-300 underline underline-offset-2"
            >
              game-icons.net
            </a>{" "}
            (Lorc, Delapouite ve katkıcılar) kaynaklıdır ve{" "}
            <a
              href="https://creativecommons.org/licenses/by/3.0/"
              target="_blank"
              rel="noopener"
              className="text-zinc-300 underline underline-offset-2"
            >
              CC BY 3.0
            </a>{" "}
            lisansıyla kullanılmaktadır.
          </p>
          <BackToAppLink className="text-green-400 underline underline-offset-2">
            Uygulamaya dön
          </BackToAppLink>
        </footer>
      </article>
    </main>
  );
}
