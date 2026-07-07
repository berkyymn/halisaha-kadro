/** Store ↔ cloud sync arasında döngüsel import önlemek için ince köprü */

type BrandingFlushListener = () => void;

let brandingFlushListener: BrandingFlushListener | null = null;

export function setBrandingFlushListener(listener: BrandingFlushListener | null) {
  brandingFlushListener = listener;
}

export function requestBrandingCloudFlush() {
  brandingFlushListener?.();
}
