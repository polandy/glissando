import { describe, expect, it } from "vitest";
import { FakeScheduler } from "../testing/fake-scheduler";
import { createDownloader } from "./download-file";

describe("createDownloader", () => {
  it("clicks a link to the file under its name and revokes the URL only later", () => {
    const clicked: { href: string; download: string }[] = [];
    const revoked: string[] = [];
    const scheduler = new FakeScheduler();
    const link = {
      href: "",
      download: "",
      click() {
        clicked.push({ href: this.href, download: this.download });
      },
    };
    const download = createDownloader({
      document: { createElement: () => link } as unknown as Document,
      urls: { create: () => "blob:file", revoke: (url) => revoked.push(url) },
      scheduler,
    });

    download(new Blob(["x"]), "Herbst in Wien.glissando");

    expect(clicked).toEqual([{ href: "blob:file", download: "Herbst in Wien.glissando" }]);
    expect(revoked).toEqual([]);
    scheduler.advance(60_000);
    expect(revoked).toEqual(["blob:file"]);
  });
});
