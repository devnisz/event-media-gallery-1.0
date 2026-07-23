import { describe, expect, it } from "vitest";
import type { GalleryEventRecord } from "@/types/event";
import {
  booleanFromDb,
  booleanToDb,
  eventToRow,
  isGuestUploadAllowed,
  rowToLoose,
} from "@/repositories/eventMappers";

function baseEvent(
  overrides: Partial<GalleryEventRecord> = {},
): GalleryEventRecord {
  return {
    id: "evt_test",
    name: "Teste",
    slug: "teste",
    uploadToken: "tok_test",
    createdAt: "2026-01-01T00:00:00.000Z",
    coverImage: "",
    videosCount: 0,
    allowPublicDelete: false,
    requireDeletePin: false,
    allowGuestUpload: false,
    requireGuestUploadApproval: false,
    frameUrl: "",
    galleryLayout: "premium",
    ...overrides,
  };
}

describe("eventMappers — allowGuestUpload", () => {
  it("booleanToDb: true → true, false/undefined → false", () => {
    expect(booleanToDb(true)).toBe(true);
    expect(booleanToDb(false)).toBe(false);
    expect(booleanToDb(undefined)).toBe(false);
    expect(booleanToDb(null)).toBe(false);
  });

  it("booleanFromDb: só true literal", () => {
    expect(booleanFromDb(true)).toBe(true);
    expect(booleanFromDb(false)).toBe(false);
    expect(booleanFromDb(null)).toBe(false);
    expect(booleanFromDb(undefined)).toBe(false);
  });

  it("domínio → banco grava allow_guest_upload: true", () => {
    const row = eventToRow(baseEvent({ allowGuestUpload: true }));
    expect(row.allow_guest_upload).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(row, "allow_guest_upload")).toBe(
      true,
    );
  });

  it("domínio → banco grava allow_guest_upload: false (nunca omite)", () => {
    const row = eventToRow(baseEvent({ allowGuestUpload: false }));
    expect(row.allow_guest_upload).toBe(false);
  });

  it("domínio → banco: undefined no domínio vira false explícito", () => {
    const event = baseEvent();
    // simula registro legado sem o campo
    delete (event as { allowGuestUpload?: boolean }).allowGuestUpload;
    const row = eventToRow(event);
    expect(row.allow_guest_upload).toBe(false);
  });

  it("banco → domínio hidrata allowGuestUpload true", () => {
    const loose = rowToLoose({
      ...eventToRow(baseEvent({ allowGuestUpload: true })),
      allow_guest_upload: true,
    });
    expect(loose.allowGuestUpload).toBe(true);
  });

  it("banco → domínio hidrata allowGuestUpload false", () => {
    const loose = rowToLoose({
      ...eventToRow(baseEvent({ allowGuestUpload: false })),
      allow_guest_upload: false,
    });
    expect(loose.allowGuestUpload).toBe(false);
  });

  it("round-trip preserva allowGuestUpload true em full replace payload", () => {
    const events = [
      baseEvent({ id: "evt_a", allowGuestUpload: true }),
      baseEvent({ id: "evt_b", allowGuestUpload: false }),
      baseEvent({ id: "evt_c", allowGuestUpload: true }),
    ];
    const rows = events.map(eventToRow);
    expect(rows.every((r) => typeof r.allow_guest_upload === "boolean")).toBe(
      true,
    );
    expect(rows.map((r) => r.allow_guest_upload)).toEqual([true, false, true]);

    const back = rows.map(rowToLoose);
    expect(back.map((e) => e.allowGuestUpload)).toEqual([true, false, true]);
  });

  it("isGuestUploadAllowed: true → permite; false/ausente → bloqueia", () => {
    expect(isGuestUploadAllowed({ allowGuestUpload: true })).toBe(true);
    expect(isGuestUploadAllowed({ allowGuestUpload: false })).toBe(false);
    expect(isGuestUploadAllowed(undefined)).toBe(false);
    expect(isGuestUploadAllowed(null)).toBe(false);
  });
});

describe("guest-upload/sign gate (regra de autorização)", () => {
  it("retorna permitido quando evento persistido tem allowGuestUpload true", () => {
    const event = baseEvent({ allowGuestUpload: true });
    // Espelha a condição do sign route: event.allowGuestUpload !== true → 403
    const wouldAllow = event.allowGuestUpload === true;
    expect(wouldAllow).toBe(true);
    expect(isGuestUploadAllowed(event)).toBe(true);
  });

  it("retorna bloqueado (403) quando allowGuestUpload false", () => {
    const event = baseEvent({ allowGuestUpload: false });
    const wouldForbid = event.allowGuestUpload !== true;
    expect(wouldForbid).toBe(true);
    expect(isGuestUploadAllowed(event)).toBe(false);
  });
});

describe("create payload shape (ADR-024)", () => {
  it("create com allowGuestUpload true produz row com allow_guest_upload true", () => {
    const created = baseEvent({
      allowGuestUpload: true,
      ownerUserId: "user-1",
    });
    expect(created.allowGuestUpload).toBe(true);
    expect(eventToRow(created).allow_guest_upload).toBe(true);
  });

  it("create default (sem flag) produz allow_guest_upload false", () => {
    const created = baseEvent({
      allowGuestUpload: false,
    });
    expect(eventToRow(created).allow_guest_upload).toBe(false);
  });
});

describe("PATCH false → true", () => {
  it("após atualizar allowGuestUpload para true, eventToRow grava true", () => {
    const before = baseEvent({ allowGuestUpload: false });
    const after: GalleryEventRecord = {
      ...before,
      allowGuestUpload: true,
    };
    expect(eventToRow(after).allow_guest_upload).toBe(true);
    expect(rowToLoose(eventToRow(after)).allowGuestUpload).toBe(true);
  });
});
