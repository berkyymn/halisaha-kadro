import { describe, expect, it } from "vitest";
import {
  orphanedStoragePaths,
  parseCloudDocument,
  slimPlayerForCloud,
  slimSnapshotForCloud,
} from "@/lib/cloud/cloudDocument";
import { buildBrandingSnapshot, slimTeamConfigForCloud } from "@/lib/brandingSnapshot";
import { finalizePosterSnapshot } from "@/lib/posterSnapshot";
import { testSnapshot } from "@/test/fixtures";

describe("parseCloudDocument", () => {
  it("yeni biçim: data olduğu gibi okunur", () => {
    const snapshot = testSnapshot();
    const parsed = parseCloudDocument({ data: snapshot, revision: 3, updatedAt: "x" })!;
    expect(parsed.revision).toBe(3);
    expect(parsed.legacy).toBe(false);
    expect(parsed.snapshot.homeTeam.jersey).toEqual(snapshot.homeTeam.jersey);
  });

  it("eski biçim: slim takımlara branding uygulanır, legacy işaretlenir", () => {
    const full = testSnapshot();
    full.homeTeam = { ...full.homeTeam, jersey: { ...full.homeTeam.jersey, primaryColor: "#abcdef" } };
    const branding = buildBrandingSnapshot({ ...full, players: full.savedPlayers });
    const slim = {
      ...full,
      homeTeam: slimTeamConfigForCloud(full.homeTeam),
      awayTeam: slimTeamConfigForCloud(full.awayTeam),
    };
    const parsed = parseCloudDocument({
      data: slim,
      branding,
      brandingUpdatedAt: "2020-01-01T00:00:00.000Z", // data'dan eski olsa bile uygulanmalı
      revision: 9,
      updatedAt: "2026-09-28T00:00:00.000Z",
    })!;
    expect(parsed.legacy).toBe(true);
    expect(parsed.snapshot.homeTeam.jersey.primaryColor).toBe("#abcdef");
    expect(() => finalizePosterSnapshot({ ...parsed.snapshot, players: parsed.snapshot.savedPlayers })).not.toThrow();
  });

  it("bozuk doküman null döner", () => {
    expect(parseCloudDocument({ data: "bozuk" })).toBeNull();
    expect(parseCloudDocument(undefined)).toBeNull();
  });
});

describe("bulut biçimi", () => {
  it("Storage yolu varsa indirme URL'si ve data URL taşınmaz", () => {
    const slim = slimPlayerForCloud({
      id: "p", name: "A", number: 1,
      cutoutUrl: "https://storage/...", cutoutStoragePath: "users/u/players/p/cutout.webp",
      photoSource: "data:image/jpeg;base64,xx", photoSourceStoragePath: "users/u/players/p/source.jpg",
    });
    expect(slim).toEqual({
      id: "p", name: "A", number: 1,
      cutoutStoragePath: "users/u/players/p/cutout.webp",
      photoSourceStoragePath: "users/u/players/p/source.jpg",
    });
  });

  it("Storage yoksa cutout inline kalır, kaynak foto çift taşınmaz", () => {
    const slim = slimPlayerForCloud({
      id: "p", name: "A", number: 1,
      cutoutUrl: "data:image/webp;base64,c", photoSource: "data:image/jpeg;base64,s",
    });
    expect(slim.cutoutUrl).toBe("data:image/webp;base64,c");
    expect(slim.photoSource).toBeUndefined();
  });

  it("takım logosu ve forması data içinde kalır (tek parça doküman)", () => {
    const snapshot = slimSnapshotForCloud(testSnapshot());
    expect(snapshot.homeTeam.logo).toBeDefined();
    expect(snapshot.homeTeam.jersey).toBeDefined();
  });
});

describe("orphanedStoragePaths", () => {
  it("yalnızca artık referans verilmeyen yolları döner", () => {
    const before = testSnapshot();
    const id = before.homeTeam.playerIds[0];
    before.savedPlayers[id] = { ...before.savedPlayers[id], cutoutStoragePath: "a", photoSourceStoragePath: "b" };
    const after = structuredClone(before);
    after.savedPlayers[id] = { ...after.savedPlayers[id], cutoutStoragePath: undefined };
    expect(orphanedStoragePaths(before, after)).toEqual(["a"]);
    expect(orphanedStoragePaths(null, after)).toEqual([]);
  });
});
