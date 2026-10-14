import { FormatGuidePage, formatGuideMetadata } from "@/components/guide/FormatGuidePage";
import { getFormatGuide } from "@/lib/formationGuide";

const guide = getFormatGuide(6);

export const metadata = formatGuideMetadata(guide);

export default function Page() {
  return <FormatGuidePage guide={guide} />;
}
