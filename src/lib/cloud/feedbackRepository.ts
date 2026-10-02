import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/app";

/** İletişim formu: Firestore `feedback` koleksiyonuna yalnızca ekleme yapılır (okuma kapalı). */
export const FEEDBACK_TOPICS = [
  { id: "oneri", label: "Öneri" },
  { id: "hata", label: "Hata bildirimi" },
  { id: "sikayet", label: "Şikayet" },
  { id: "diger", label: "Diğer" },
] as const;

export type FeedbackTopic = (typeof FEEDBACK_TOPICS)[number]["id"];

export const FEEDBACK_MESSAGE_MIN = 10;
export const FEEDBACK_MESSAGE_MAX = 2000;
export const FEEDBACK_EMAIL_MAX = 120;

const SEND_TIMEOUT_MS = 15_000;

export type FeedbackInput = {
  topic: FeedbackTopic;
  message: string;
  email?: string;
  signedIn: boolean;
};

export function isValidFeedbackEmail(email: string): boolean {
  return email.length <= FEEDBACK_EMAIL_MAX && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function sendFeedback(input: FeedbackInput): Promise<void> {
  const message = input.message.trim();
  const email = input.email?.trim();
  const write = addDoc(collection(getFirebaseDb(), "feedback"), {
    topic: input.topic,
    message,
    ...(email ? { email } : {}),
    signedIn: input.signedIn,
    userAgent: navigator.userAgent.slice(0, 300),
    createdAt: serverTimestamp(),
  });
  // Çevrimdışıyken addDoc sunucu onayını bekler; kullanıcıyı sonsuza dek bekletme.
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("feedback-timeout")), SEND_TIMEOUT_MS);
  });
  try {
    await Promise.race([write, timeout]);
  } finally {
    clearTimeout(timer);
  }
}
