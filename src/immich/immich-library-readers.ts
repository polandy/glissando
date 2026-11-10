import type { ImmichPerson, TimelineMonth } from "./immich-client";
import type { ImmichJsonReader } from "./immich-json";
import { TIMELINE_PATH } from "./immich-paths";

/** `YYYY-MM` of a bucket's `YYYY-MM-DD…` start. */
const MONTH_PATTERN = /^(\d{4}-(?:0[1-9]|1[0-2]))-\d{2}(?:T.*)?$/;

export function readTimelineMonths(
  reader: ImmichJsonReader,
  answer: unknown,
): readonly TimelineMonth[] {
  return reader.array(answer, "a body").map((value) => {
    const bucket = reader.record(value, "a time bucket");
    const start = reader.string(bucket, "timeBucket");
    const month = MONTH_PATTERN.exec(start)?.[1];
    if (month === undefined) {
      throw new Error(
        `GET ${TIMELINE_PATH} answered a "timeBucket" that is not "YYYY-MM-DD" (got ${JSON.stringify(start)})`,
      );
    }
    return { month, count: reader.number(bucket, "count") };
  });
}

/** The named, visible people of one page, and whether another page follows. */
export function readPeoplePage(
  reader: ImmichJsonReader,
  answer: unknown,
): { readonly people: readonly ImmichPerson[]; readonly hasNextPage: boolean } {
  const body = reader.record(answer, "a body");
  if (typeof body.hasNextPage !== "boolean") {
    throw new Error(`the people answer has a "hasNextPage" that is not a boolean`);
  }
  const people = reader.array(body.people, '"people"').flatMap((value): ImmichPerson[] => {
    const person = reader.record(value, "a person");
    const name = reader.string(person, "name");
    return name === "" || person.isHidden === true
      ? []
      : [{ id: reader.string(person, "id"), name }];
  });
  return { people, hasNextPage: body.hasNextPage };
}

export function readFolderPaths(reader: ImmichJsonReader, answer: unknown): readonly string[] {
  return reader.array(answer, "a body").map((path) => {
    if (typeof path !== "string") {
      throw new Error(`the folder paths answer has a path that is not a string`);
    }
    return path;
  });
}
