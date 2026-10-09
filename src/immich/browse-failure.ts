import { ImmichUnavailableError, type ImmichUnavailableKind } from "./immich-client";

/** A failure that is a bug to surface, not a problem of Immich to tell the user. */
export const UNEXPECTED_FAILURE = "unexpected";

/** Why a browse request failed: the Immich problem it met, or an unexpected error. */
export type BrowseFailure = ImmichUnavailableKind | typeof UNEXPECTED_FAILURE;

/** Tells the app why Immich cannot be used, e.g. a key Immich rejects (`ImmichAvailability`). */
export type ReportUnavailable = (kind: ImmichUnavailableKind) => void;

/** The failure `error` is; an Immich problem is reported, so the whole app knows it. */
export function browseFailureOf(
  error: unknown,
  reportUnavailable: ReportUnavailable,
): BrowseFailure {
  if (!(error instanceof ImmichUnavailableError)) return UNEXPECTED_FAILURE;
  reportUnavailable(error.kind);
  return error.kind;
}
