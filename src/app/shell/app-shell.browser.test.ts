import { afterEach, describe, expect, it } from "vitest";
import { handOverFromShell, showStartupFailure } from "./app-shell";

// Long enough that a real fade never ends during a test; the tests end it themselves.
const FADING = "opacity 1000s";

let mounted: HTMLElement | undefined;
afterEach(() => mounted?.remove());

function mountShell(transition: string): HTMLElement {
  mounted = document.createElement("div");
  mounted.style.transition = transition;
  mounted.append(document.createElement("span"));
  document.body.append(mounted);
  return mounted;
}

function endTransition(target: Element, type = "transitionend"): void {
  target.dispatchEvent(new TransitionEvent(type, { propertyName: "opacity", bubbles: true }));
}

describe("handOverFromShell", () => {
  it("marks the shell as leaving and keeps it until its fade-out ends", async () => {
    const shell = mountShell(FADING);
    const handedOver = handOverFromShell(shell);
    expect(shell.hasAttribute("data-leaving")).toBe(true);
    expect(shell.isConnected).toBe(true);

    endTransition(shell);
    await handedOver;
    expect(shell.isConnected).toBe(false);
  });

  it("removes the shell when its fade-out is cancelled", async () => {
    const shell = mountShell(FADING);
    const handedOver = handOverFromShell(shell);

    endTransition(shell, "transitioncancel");
    await handedOver;
    expect(shell.isConnected).toBe(false);
  });

  it("ignores a transition that ends inside the shell", async () => {
    const shell = mountShell(FADING);
    const handedOver = handOverFromShell(shell);
    const child = shell.firstElementChild;
    if (child === null) throw new Error("the shell has no child");

    endTransition(child);
    expect(shell.isConnected).toBe(true);

    endTransition(shell);
    await handedOver;
    expect(shell.isConnected).toBe(false);
  });

  it("removes a shell without a fade (reduced motion) at once", async () => {
    const shell = mountShell("none");
    const handedOver = handOverFromShell(shell);
    expect(shell.isConnected).toBe(false);
    await handedOver;
  });
});

describe("showStartupFailure", () => {
  function mountShellWithStage(): HTMLElement {
    const shell = mountShell("none");
    shell.setAttribute("aria-hidden", "true");
    const stage = document.createElement("div");
    stage.className = "app-shell-stage";
    shell.append(stage);
    return shell;
  }

  it("shows the message as an alert on the shell's stage", () => {
    const shell = mountShellWithStage();
    showStartupFailure(shell, "Glissando cannot start.");

    const alert = shell.querySelector(".app-shell-stage [role=alert]");
    expect(alert?.textContent).toBe("Glissando cannot start.");
  });

  it("makes the shell readable by assistive technology and stops its waiting breath", () => {
    const shell = mountShellWithStage();
    showStartupFailure(shell, "Glissando cannot start.");

    expect(shell.querySelector("[role=alert]")).not.toBeNull();
    expect(shell.hasAttribute("aria-hidden")).toBe(false);
    expect(shell.hasAttribute("data-failed")).toBe(true);
  });

  it("fails loud when the shell has no stage", () => {
    const shell = mountShell("none");
    expect(() => showStartupFailure(shell, "Glissando cannot start.")).toThrow(/app-shell-stage/);
  });
});
