import { takeOutPictures } from "../../library/slideshow-edits";
import type { StoredSlideshow } from "../../library/stored-slideshow";
import { AddUndo, type AddUndoPorts } from "./add-undo";
import { RemovalUndo, type RemovalUndoPorts } from "./removal-undo";
import { ResetUndo } from "./reset-undo";

export type EditorUndosPorts = Omit<RemovalUndoPorts, "track"> & Omit<AddUndoPorts, "takeOut">;

/** The slideshow the undos act on, as the editor holds it. */
interface EditedSlideshow {
  current(): StoredSlideshow;
  apply(slideshow: StoredSlideshow): void;
  /** Keeps the editor unsettled until `work` is done. */
  track(work: Promise<void>): void;
}

/**
 * The editor's undo toasts: of removals, of resets and of an adding. Taking added pictures out
 * ends a pending batch of removals, as any other edit does.
 */
export class EditorUndos {
  readonly removal: RemovalUndo;
  readonly reset: ResetUndo;
  readonly add: AddUndo;

  constructor(ports: EditorUndosPorts, edited: EditedSlideshow) {
    this.reset = new ResetUndo(ports.toaster, ports.undoLabel);
    this.removal = new RemovalUndo({ ...ports, track: (work) => edited.track(work) });
    this.add = new AddUndo({
      ...ports,
      takeOut: (pictureIds) => {
        const takenOut = takeOutPictures(edited.current(), pictureIds);
        this.removal.end();
        edited.apply(takenOut);
      },
    });
  }

  /** Every pending undo toast goes; none acts any more. */
  end(): void {
    this.removal.end();
    this.reset.end();
    this.add.end();
  }
}
