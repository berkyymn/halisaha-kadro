"use client";

import type { MouseEvent, ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

/**
 * Gizlilik sayfasından uygulamaya dönüş. Sayfa uygulamadan yeni sekmede
 * açıldıysa (geçmişi tek sayfa) sekmeyi kapatır: kullanıcı açık olan uygulama
 * sekmesine döner, ikinci bir kopya açılmaz. Aynı sekmede gelindiyse geri gider.
 * Hiçbiri olmazsa (doğrudan bağlantı) ana sayfayı açar.
 */
export function BackToAppLink({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    const cameFromApp =
      document.referrer !== "" && new URL(document.referrer).origin === window.location.origin;
    if (!cameFromApp) return; // doğrudan geldi: normal bağlantı "/" açar

    e.preventDefault();
    if (window.history.length <= 1) {
      // Uygulamadan yeni sekmede açıldı: kapat, uygulama sekmesi zaten açık.
      window.close();
      // Tarayıcı kapatmaya izin vermezse aynı sekmede devam et.
      window.setTimeout(() => router.push("/"), 150);
      return;
    }
    window.history.back();
  };

  return (
    <Link href="/" onClick={handleClick} className={className}>
      {children}
    </Link>
  );
}
