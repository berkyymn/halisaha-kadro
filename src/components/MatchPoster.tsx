"use client";

import { useEffect, useState } from "react";
import { Calendar, MapPin, Plus, Wallet } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { useAppStore } from "@/store/useAppStore";
import { PitchPlayerLayer } from "./PitchPlayerLayer";
import { PosterDateField } from "./PosterDateField";
import { PosterTimeField } from "./PosterTimeField";
import {
  clampMatchTimeForDate,
  isPastMatchDate,
  isTodayMatchDate,
  nextQuarterHour,
  todayDisplayDate,
  todayIsoDate,
} from "@/lib/matchDate";
import { PosterEditableText } from "./PosterEditableText";
import { PosterTitleDisplay } from "./PosterTitleDisplay";
import { StaticPosterBackground } from "./StaticPosterBackground";
import { TeamLogoBadge } from "./TeamLogoBadge";
import { usePosterMetrics } from "@/hooks/usePosterMetrics";
import { feePerPerson, formatLira } from "@/lib/matchFee";
import { SINGLE_PITCH_AREA } from "@/lib/formationEngine";
import { teamNameScale } from "@/lib/posterLayout";
import { DEFAULT_LOGO_DISPLAY_SIZE } from "@/types";
import { MatchFeeModal } from "./MatchFeeModal";

/**
 * Logo boyutu ayarı bu poster genişliğindeki piksel boyutudur (≈1440px ekran).
 * Kartlar posterle ölçeklendiği için logo da ölçeklenir; aksi halde küçük
 * ekranda logo kaleci kartına biner.
 */
const LOGO_REFERENCE_POSTER_WIDTH = { versus: 1120, single: 560 } as const;

function scaledLogoSize(size: number, posterWidth: number, single: boolean): number {
  const reference = single
    ? LOGO_REFERENCE_POSTER_WIDTH.single
    : LOGO_REFERENCE_POSTER_WIDTH.versus;
  // Kırpma yok: logo her ekranda ve JPEG'de postere aynı oranda.
  return Math.round(size * (posterWidth / reference));
}

function TeamPosterBlock({
  team,
  side,
  onLogoClick,
}: {
  team: {
    logo: Parameters<typeof TeamLogoBadge>[0]["logo"];
    shortName: string;
  };
  side: "left" | "right";
  onLogoClick?: (team: "home" | "away") => void;
}) {
  const isLeft = side === "left";
  const teamKey = isLeft ? "home" : "away";
  const configuredLogoSize = useAppStore((s) => s.teamLogoDisplaySize);
  const posterMetrics = usePosterMetrics();
  const teamLogoDisplaySize = scaledLogoSize(configuredLogoSize, posterMetrics.width, false);
  // Ad boyutu poster genişliğine bağlı: ekranda ve PNG çıktısında aynı oran.
  // Ad logo boyutuyla birlikte ölçeklenir (logo kaydırıcısı adı da büyütür).
  const nameFontPx = posterMetrics.width * 0.018 * teamNameScale(configuredLogoSize);
  const nameFontSize = `${nameFontPx.toFixed(1)}px`;
  const nameGap = "0.375rem";
  // Ad logonun üstünde: blok, ad yüksekliği kadar yukarı kayar; logo eski
  // yerinde kalır ve ad kaleci kartının satırından uzak durur.
  const baseTop = "6%";
  // Varsayılandan büyük logo yukarı (köşedeki ışık alanına) doğru büyür, alt
  // kenarı sabit kalır: kaleci kartına binmez. Küçük logo üstten sabit kalır;
  // kalecinin hizasına inip üstünde boşluk bırakmaz. Görsel logolar 1,12× çizilir.
  const renderScale = team.logo.mode === "generated" ? 1 : 1.12;
  const growPx = Math.max(
    0,
    (teamLogoDisplaySize - scaledLogoSize(DEFAULT_LOGO_DISPLAY_SIZE, posterMetrics.width, false)) *
      renderScale
  );

  return (
    <div
      className={`absolute z-20 ${isLeft ? "left-[-5%]" : "right-[-5%]"}`}
      style={{
        top: `calc(${baseTop} - ${nameFontSize} - ${nameGap} - ${growPx.toFixed(1)}px)`,
        width: "22%",
        maxWidth: Math.round(teamLogoDisplaySize + posterMetrics.width * 0.025),
      }}
    >
      <div
        className="absolute -inset-[30%] -z-10 blur-xl pointer-events-none"
           style={{
             background: isLeft
            ? "radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%)"
            : "radial-gradient(circle, rgba(220,38,38,0.25) 0%, transparent 70%)",
        }}
      />
      <button
        type="button"
        onClick={() => onLogoClick?.(teamKey)}
        className={`group relative flex w-full flex-col pointer-events-auto cursor-pointer rounded-lg transition-transform duration-200 ease-out hover:scale-[1.05] active:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500/80 ${
          isLeft ? "items-start" : "items-end"
        }`}
        style={{ gap: nameGap }}
        title="Takım görünümünü düzenle"
      >
        <span
          className="block text-white font-black italic uppercase leading-none whitespace-nowrap overflow-hidden text-ellipsis pointer-events-none transition-transform duration-200 ease-out group-hover:translate-y-[-1px]"
          style={{
            fontSize: nameFontSize,
            // Üstte kaleci kartı yok; uzun adlar logo genişliğini aşabilir.
            maxWidth: "195%",
            letterSpacing: "0.06em",
            textAlign: isLeft ? "left" : "right",
            textShadow:
              "0 2px 16px rgba(0,0,0,0.95), 0 0 24px rgba(0,0,0,0.8)",
          }}
        >
          {team.shortName}
        </span>
        <TeamLogoBadge
          logo={team.logo}
          shortName={team.shortName}
          size={teamLogoDisplaySize}
        />
      </button>
    </div>
  );
}

/**
 * Tek takım posterinin üst şeridi: logo solda, takım adı yanında. Sabit
 * yükseklikte (%15) olduğu için saha %19'dan başlar ve hiçbir dizilişte
 * forvet hattı logoya binmez.
 */
const SINGLE_HEADER = { top: 3, height: 15 } as const;

function SingleTeamHeader({
  team,
  onLogoClick,
}: {
  team: { logo: Parameters<typeof TeamLogoBadge>[0]["logo"]; shortName: string };
  onLogoClick?: (team: "home" | "away") => void;
}) {
  const configuredLogoSize = useAppStore((s) => s.teamLogoDisplaySize);
  const posterMetrics = usePosterMetrics();
  // Görsel logolar 1,12× çizilir; şeride sığsın.
  const maxLogo = (posterMetrics.height * SINGLE_HEADER.height) / 100 / 1.12;
  const logoSize = Math.round(
    Math.min(scaledLogoSize(configuredLogoSize, posterMetrics.width, true), maxLogo)
  );

  return (
    <div
      className="absolute z-20"
      style={{ top: `${SINGLE_HEADER.top}%`, height: `${SINGLE_HEADER.height}%`, left: "4%", right: "4%" }}
    >
      <button
        type="button"
        onClick={() => onLogoClick?.("home")}
        title="Takım görünümünü düzenle"
        style={{ gap: `${Math.round(posterMetrics.width * 0.03)}px` }}
        className="group flex h-full max-w-full items-center rounded-lg pointer-events-auto cursor-pointer transition-transform duration-200 ease-out hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500/80"
      >
        <span className="shrink-0">
          <TeamLogoBadge logo={team.logo} shortName={team.shortName} size={logoSize} />
        </span>
        <span
          className="min-w-0 truncate text-left text-white font-black italic uppercase leading-none"
          style={{
            // italik harfin sağa taşan ucu kesilmesin
            paddingRight: "0.15em",
            fontSize: `${(posterMetrics.width * 0.06 * teamNameScale(configuredLogoSize)).toFixed(1)}px`,
            letterSpacing: "0.06em",
            textShadow: "0 2px 16px rgba(0,0,0,0.95), 0 0 24px rgba(0,0,0,0.8)",
          }}
        >
          {team.shortName}
        </span>
      </button>
    </div>
  );
}

function PosterFooter({
  venue,
  time,
  date,
  onVenueChange,
  onVenueBlur,
  onTimeChange,
  onDateChange,
  single = false,
  feePerPerson = 0,
  onFeeClick,
}: {
  single?: boolean;
  /** 0: ücret kapalı → yalnızca düzenleyicide "+ Saha ücreti" */
  feePerPerson?: number;
  onFeeClick: () => void;
  venue: string;
  time: string;
  date: string;
  onVenueChange: (v: string) => void;
  onVenueBlur?: () => void;
  onTimeChange: (v: string) => void;
  onDateChange: (v: string) => void;
}) {
  // Boyutlar poster genişliğine (#match-poster container, cqw) bağlı: ekran
  // boyutundan bağımsız, önizleme ve JPEG çıktısında aynı oran.
  const size = single
    ? { text: 3.2, icon: 2.9, gap: 1 }
    : { text: 2.1, icon: 1.7, gap: 0.6 };
  const footerTextStyle = {
    fontSize: `${size.text}cqw`,
    fontFamily: "var(--font-display), system-ui, sans-serif",
    fontWeight: 400,
    letterSpacing: "0.08em",
  } as const;
  const footerIconSize = `${size.icon}cqw`;
  const showFee = feePerPerson > 0;
  const footerGap = `${size.gap}cqw`;

  return (
    <div
      className="absolute left-[4%] right-[4%] z-50 pointer-events-auto"
      style={{ bottom: "1.5%", height: "10%" }}
    >
      <div className="relative h-full">
        <div
          className="absolute -top-px left-[3%] right-[3%] h-[3px] pointer-events-none rounded-full"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(147,197,253,0.4) 25%, rgba(255,255,255,0.6) 50%, rgba(147,197,253,0.4) 75%, transparent)",
            boxShadow: "0 0 10px rgba(147,197,253,0.3)",
          }}
        />

        <div
          className={`grid h-full items-center overflow-hidden rounded-sm ${
            showFee
              ? "grid-cols-[1.5fr_auto_0.8fr_auto_1fr_auto_1.1fr]"
              : "grid-cols-[1.7fr_auto_0.8fr_auto_1fr]"
          }`}
          style={{
            background:
              "linear-gradient(180deg, rgba(28,28,34,0.96) 0%, rgba(10,10,14,0.98) 100%)",
            border: "1px solid rgba(255,255,255,0.14)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.1), 0 8px 28px rgba(0,0,0,0.6)",
          }}
        >
          <div className="flex items-center justify-center min-w-0 px-2 h-full" style={{ gap: footerGap }}>
            <MapPin className="text-red-500 shrink-0" strokeWidth={2.5} style={{ width: footerIconSize, height: footerIconSize }} />
            <PosterEditableText
              value={venue}
              onChange={onVenueChange}
              onBlur={onVenueBlur}
              placeholder="SAHA ADI"
              maxLength={24}
              variant="footer"
              align="center"
              style={footerTextStyle}
            />
          </div>

          <FooterDivider />

          <div className="flex items-center justify-center min-w-0 px-2 h-full">
            <PosterTimeField
              value={time}
              min={isTodayMatchDate(date) ? nextQuarterHour() : undefined}
              onChange={onTimeChange}
              style={footerTextStyle}
              iconSize={footerIconSize}
              gap={footerGap}
            />
          </div>

          <FooterDivider />

          <div className="flex items-center justify-center min-w-0 px-3 h-full" style={{ gap: footerGap }}>
            <Calendar className="text-red-500 shrink-0" strokeWidth={2.5} style={{ width: footerIconSize, height: footerIconSize }} />
            <PosterDateField
              value={date}
              min={todayIsoDate()}
              onChange={onDateChange}
              placeholder={todayDisplayDate()}
              style={footerTextStyle}
            />
          </div>

          {showFee && (
            <>
              <FooterDivider />
              <div className="flex items-center justify-center min-w-0 px-2 h-full">
                <button
                  type="button"
                  onClick={onFeeClick}
                  title="Saha ücretini düzenle"
                  className="poster-editable poster-editable-footer-accent flex h-full items-center justify-center whitespace-nowrap rounded px-1"
                  style={{ ...footerTextStyle, gap: footerGap }}
                >
                  <Wallet className="text-red-500 shrink-0" strokeWidth={2.5} style={{ width: footerIconSize, height: footerIconSize }} />
                  {single ? `${formatLira(feePerPerson)}/KİŞİ` : `KİŞİ BAŞI ${formatLira(feePerPerson)}`}
                </button>
              </div>
            </>
          )}
        </div>

        {!showFee && (
          // Ücret kapalı: düzenleyicide soluk ekleme düğmesi, JPEG'e girmez.
          <button
            type="button"
            onClick={onFeeClick}
            data-export-ignore="true"
            className="absolute right-[3%] bottom-full mb-1.5 inline-flex items-center gap-1 rounded-full border border-dashed border-white/30 bg-black/50 px-2.5 py-0.5 text-[11px] font-semibold text-white/80 opacity-60 transition-opacity hover:opacity-100 focus-visible:opacity-100"
          >
            <Plus className="w-3 h-3" />
            Saha ücreti
          </button>
        )}
      </div>
    </div>
  );
}

function FooterDivider() {
  return (
    <div
      className="h-[55%] w-px shrink-0"
      style={{
        background:
          "linear-gradient(to bottom, transparent, rgba(255,255,255,0.3) 40%, rgba(255,255,255,0.3) 60%, transparent)",
        transform: "skewX(-14deg)",
      }}
    />
  );
}

export function MatchPoster({
  onEditPlayer,
  onLogoClick,
}: {
  onEditPlayer: (team: "home" | "away", slotIndex: number) => void;
  onLogoClick?: (team: "home" | "away") => void;
}) {
  const matchInfo = useAppStore((s) => s.matchInfo);
  const setMatchInfo = useAppStore((s) => s.setMatchInfo);
  const homeTeam = useAppStore((s) => s.homeTeam);
  const awayTeam = useAppStore((s) => s.awayTeam);
  const teamMode = useAppStore((s) => s.teamMode);
  const squadSize = useAppStore((s) => s.squadSize);
  const isSingle = teamMode === "single";
  const [feeOpen, setFeeOpen] = useState(false);
  const perPerson = matchInfo.feeEnabled
    ? feePerPerson(matchInfo.feeTotal, squadSize, {
        goalkeepersPay: matchInfo.feeGoalkeepersPay,
        // "Yalnızca takımımız" tek takım posterine özgü; iki takımda ücret maça bölünür.
        teamOnly: isSingle && matchInfo.feeTeamOnly,
      })
    : 0;

  // Poster her zaman yaklaşan maç içindir: kayıtlı tarih geçmişte kaldıysa
  // (geçen haftanın kadrosu, buluttan gelen eski kayıt) bugüne çekilir.
  useEffect(() => {
    if (!isPastMatchDate(matchInfo.date)) return;
    const date = todayDisplayDate();
    setMatchInfo({ date, time: clampMatchTimeForDate(date, matchInfo.time) });
  }, [matchInfo.date, matchInfo.time, setMatchInfo]);

  return (
    <div
      id="match-poster"
      // PNG çıktısında klonlanan düğüm de Türkçe büyük harf kuralını (i → İ) kullansın.
      lang="tr"
      className="relative shrink-0 overflow-hidden"
      style={{
        // Alana oranı bozmadan sığ: genişlik hem kapsayıcı genişliğiyle hem de
        // yükseklik × oran ile sınırlı (üst div container-type: size).
        aspectRatio: isSingle ? "4 / 5" : "16 / 10",
        width: isSingle
          ? "min(100cqw, calc(100cqh * 0.8))"
          : "min(100cqw, calc(100cqh * 1.6))",
      }}
    >
      <StaticPosterBackground />

      <div className="relative z-10 h-full">
        {!isSingle && <PosterTitleDisplay />}
        {isSingle && <SingleTeamHeader team={homeTeam} onLogoClick={onLogoClick} />}

        <div
          className="absolute"
          style={
            isSingle
              ? {
                  top: `${SINGLE_PITCH_AREA.top}%`,
                  left: "5%",
                  width: "90%",
                  height: `${SINGLE_PITCH_AREA.height}%`,
                }
              : { top: "14.5%", left: "7%", width: "86%", height: "63%" }
          }
        >
          {!isSingle && (
            <>
              <TeamPosterBlock team={homeTeam} side="left" onLogoClick={onLogoClick} />
              <TeamPosterBlock team={awayTeam} side="right" onLogoClick={onLogoClick} />
            </>
          )}

          <div className="absolute inset-0 overflow-hidden">
            <PitchPlayerLayer onEditPlayer={onEditPlayer} />
          </div>
        </div>

        <PosterFooter
          single={isSingle}
          feePerPerson={perPerson}
          onFeeClick={() => setFeeOpen(true)}
          venue={matchInfo.venue}
          time={matchInfo.time}
          date={matchInfo.date}
          onVenueChange={(venue) => setMatchInfo({ venue })}
          onVenueBlur={() => trackEvent("venue_changed")}
          onTimeChange={(time) => {
            trackEvent("match_date_changed", { field: "time" });
            // Maç bugünse geçmiş saat seçilemez.
            setMatchInfo({ time: clampMatchTimeForDate(matchInfo.date, time) });
          }}
          onDateChange={(date) => {
            if (isPastMatchDate(date)) return;
            trackEvent("match_date_changed", { field: "date" });
            setMatchInfo({ date, time: clampMatchTimeForDate(date, matchInfo.time) });
          }}
        />
      </div>

      <MatchFeeModal open={feeOpen} onClose={() => setFeeOpen(false)} />
    </div>
  );
}
