import { launch, shotter } from "./lib.mjs";
import { createKit } from "./kit.mjs";
import { tourStart } from "./flow-start.mjs";
import { tourSlideshow } from "./flow-slideshow.mjs";
import { tourEditors } from "./flow-editors.mjs";
import { tourPlayer } from "./flow-player.mjs";

const kind = process.argv[2] ?? "phone";
const { browser, page } = await launch(kind);
const kit = createKit(page, shotter(page, kind, 0));

await tourStart(kit);
await tourSlideshow(kit);
await tourEditors(kit);
await tourPlayer(kit);
await browser.close();
