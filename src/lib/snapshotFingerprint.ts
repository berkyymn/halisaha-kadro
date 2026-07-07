import type { PosterSnapshot } from "@/lib/posterSnapshot";

/** Bulut kaydı dedup için snapshot parmak izi */
export function fingerprintPosterSnapshot(snapshot: PosterSnapshot): string {
  return JSON.stringify(snapshot);
}

export function fingerprintPosterBranding(snapshot: PosterSnapshot): string {
  return JSON.stringify({
    home: {
      logo: snapshot.homeTeam.logo,
      jersey: snapshot.homeTeam.jersey,
      atmosphereColor: snapshot.homeTeam.atmosphereColor,
    },
    away: {
      logo: snapshot.awayTeam.logo,
      jersey: snapshot.awayTeam.jersey,
      atmosphereColor: snapshot.awayTeam.atmosphereColor,
    },
    teamLogoDisplaySize: snapshot.teamLogoDisplaySize,
  });
}

/** Logo/forma hariç kadro verisi — branding-only değişimi ayırt etmek için */
export function fingerprintPosterData(snapshot: PosterSnapshot): string {
  const stripTeamBranding = (team: PosterSnapshot["homeTeam"]) => ({
    name: team.name,
    shortName: team.shortName,
    captainId: team.captainId,
    playerIds: team.playerIds,
  });

  return JSON.stringify({
    schemaVersion: snapshot.schemaVersion,
    mode: snapshot.mode,
    savedPlayers: snapshot.savedPlayers,
    benchPlayerIds: snapshot.benchPlayerIds,
    matchInfo: snapshot.matchInfo,
    squadSize: snapshot.squadSize,
    homeTeam: stripTeamBranding(snapshot.homeTeam),
    awayTeam: stripTeamBranding(snapshot.awayTeam),
    homeFormationId: snapshot.homeFormationId,
    awayFormationId: snapshot.awayFormationId,
    pitchPlayers: snapshot.pitchPlayers,
    playerCardSize: snapshot.playerCardSize,
    photoScalePercent: snapshot.photoScalePercent,
    posterTheme: snapshot.posterTheme,
    localUpdatedAt: snapshot.localUpdatedAt,
  });
}
