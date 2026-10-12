/** Which build of Glissando is running, as the settings show it (dev-docs/app/SETTINGS.md). */
export interface BuildInfo {
  /** The release version from package.json, e.g. "0.0.2". */
  readonly version: string;
  /** The abbreviated hash of the commit the build was made from. */
  readonly commit: string;
  /** That commit's date, ISO 8601 in UTC. */
  readonly commitDate: string;
}
