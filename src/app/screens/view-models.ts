/** What the screens show; the composition root derives these from the stored slideshows. */

export interface SlideshowSummary {
  readonly id: string;
  readonly title: string;
  /** Object URLs of the first pictures' thumbnails, in play order; one to three. */
  readonly coverUrls: readonly string[];
  readonly pictureCount: number;
  readonly durationSeconds: number;
  readonly hasMusic: boolean;
}

export interface PictureTile {
  readonly id: string;
  readonly thumbnailUrl: string;
  /** ISO 8601 date-time. */
  readonly capturedAt: string;
}

export interface SlideshowDetails {
  readonly title: string;
  readonly coverUrl: string;
  readonly durationSeconds: number;
  /** The music file's name, or null without music. */
  readonly musicTitle: string | null;
  /** In play order; never empty. */
  readonly pictures: readonly PictureTile[];
}
