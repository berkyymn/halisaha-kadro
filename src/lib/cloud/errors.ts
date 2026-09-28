/** Firebase hata kodları → karar ve kullanıcı mesajı. */

export function errorCode(error: unknown): string {
  return error && typeof error === "object" && "code" in error
    ? String((error as { code: unknown }).code)
    : "";
}

export function isResourceExhaustedError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return errorCode(error) === "resource-exhausted" || message.includes("resource-exhausted");
}

/** Beklenen revision tutmadı: başka bir cihaz/sekme araya yazdı. */
export function isRevisionConflictError(error: unknown): boolean {
  return errorCode(error) === "failed-precondition";
}

/** Ağ/sunucu kaynaklı, kendiliğinden düzelebilecek hatalar. */
export function isRetryableFirestoreError(error: unknown): boolean {
  const code = errorCode(error);
  if (["aborted", "deadline-exceeded", "internal", "resource-exhausted", "unavailable"].includes(code)) {
    return true;
  }
  if (code.startsWith("storage/") && ["storage/retry-limit-exceeded", "storage/unknown"].includes(code)) {
    return true;
  }
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return message.includes("offline") || message.includes("network");
}

export function mapFirestoreError(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  switch (errorCode(error)) {
    case "permission-denied":
      return "Buluta erişim izni yok. Çıkış yapıp tekrar giriş yapmayı dene.";
    case "unavailable":
      return "Bulut şu an ulaşılamıyor. İnternet bağlantını kontrol et.";
    case "invalid-argument":
      return "Kadro buluta sığmadı (1 MB sınırı). Bazı fotoğrafları kaldırmayı dene.";
    case "resource-exhausted":
      return "Buluta çok sık kayıt gönderildi. Biraz sonra otomatik tekrar denenecek.";
    case "not-found":
      return "Bulut veritabanı bulunamadı.";
    default:
      if (message.toLowerCase().includes("offline")) {
        return "Çevrimdışı görünüyorsun. Bağlantı gelince otomatik kaydedilecek.";
      }
      return message || "Buluta kayıt başarısız.";
  }
}

export function mapAuthError(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  switch (errorCode(error)) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "E-posta veya şifre hatalı.";
    case "auth/email-already-in-use":
      return "Bu e-posta ile zaten kayıt var. Giriş yapmayı deneyin.";
    case "auth/weak-password":
      return "Şifre en az 6 karakter olmalı.";
    case "auth/invalid-email":
      return "Geçerli bir e-posta adresi girin.";
    case "auth/too-many-requests":
      return "Çok fazla deneme. Biraz bekleyip tekrar deneyin.";
    case "auth/popup-closed-by-user":
      return "Google penceresi kapatıldı.";
    case "auth/cancelled-popup-request":
      return "Giriş iptal edildi.";
    case "auth/popup-blocked":
      return "Tarayıcı Google penceresini engelledi. Açılır pencerelere izin verip tekrar dene.";
    case "auth/network-request-failed":
      return "Bağlantı hatası. İnternetini kontrol edip tekrar dene.";
    case "auth/missing-email":
      return "E-posta adresini yaz.";
    case "auth/requires-recent-login":
      return "Güvenlik için yeniden giriş yapman gerekiyor. Çıkış yapıp tekrar girip dene.";
    case "auth/user-mismatch":
      return "Farklı bir hesapla doğrulama yapıldı. Aynı hesabı seç.";
    case "auth/missing-password":
      return "Şifreni gir.";
    default:
      return message || "İşlem başarısız.";
  }
}
