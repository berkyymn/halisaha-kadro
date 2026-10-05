import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/app";
import { trackEvent } from "@/lib/analytics";

/** Google ile giriş (açılır pencere). Giriş penceresi ve giriş teşviki kartı ortak kullanır. */
export async function signInWithGoogle(source: "auth-modal" | "signin-nudge"): Promise<void> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  await signInWithPopup(getFirebaseAuth(), provider);
  trackEvent("sign_in_completed", { method: "google", is_new_user: false, source });
}

/** Kullanıcı pencereyi kendisi kapattıysa hata gösterilmez. */
export function isPopupDismissed(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request";
}
