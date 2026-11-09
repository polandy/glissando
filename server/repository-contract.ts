import { describe } from "vitest";
import type { LibraryRepository } from "./library-repository";
import { describeFocusContract } from "./repository-contract-focus";
import { describeMusicContract } from "./repository-contract-music";
import { describeSlideshowsContract } from "./repository-contract-slideshows";

/** The behaviour every `LibraryRepository` adapter shares; each adapter's test runs it. */
export function describeLibraryRepositoryContract(
  adapter: string,
  createRepository: () => LibraryRepository,
): void {
  describe(`${adapter} LibraryRepository contract`, () => {
    describeSlideshowsContract(createRepository);
    describeMusicContract(createRepository);
    describeFocusContract(createRepository);
  });
}
