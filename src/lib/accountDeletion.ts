import { deleteDoc, doc } from "firebase/firestore";
import { deleteObject, listAll, ref, type StorageReference } from "firebase/storage";
import { getFirebaseDb } from "@/lib/firebase/app";
import { getFirebaseStorage, isFirebaseStorageConfigured } from "@/lib/firebase/storage";

/** Kullanıcının Storage klasöründeki tüm dosyaları (alt klasörler dahil) toplar. */
async function collectFiles(folder: StorageReference): Promise<StorageReference[]> {
  const { items, prefixes } = await listAll(folder);
  const nested = await Promise.all(prefixes.map(collectFiles));
  return [...items, ...nested.flat()];
}

/**
 * Hesaba ait bulut verisini siler: önce Storage (fotoğraf/logo), sonra poster
 * dokümanı. Auth hesabının kendisi çağıran tarafta (yeniden doğrulama sonrası)
 * silinir. Tekrar çağrılabilir: eksik dosya/doküman hata sayılmaz.
 */
export async function deleteCloudAccountData(uid: string): Promise<{ files: number }> {
  let files = 0;
  if (isFirebaseStorageConfigured()) {
    const all = await collectFiles(ref(getFirebaseStorage(), `users/${uid}`));
    await Promise.all(
      all.map(async (file) => {
        try {
          await deleteObject(file);
          files += 1;
        } catch (error) {
          if ((error as { code?: string })?.code !== "storage/object-not-found") throw error;
        }
      })
    );
  }
  await deleteDoc(doc(getFirebaseDb(), "posters", uid));
  return { files };
}
