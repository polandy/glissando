import { afterEach, describe, expect, it } from "vitest";
import { handOverFromShell, showInPlaceOfApp, showStartupFailure } from "./app-shell";

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

  it("offers a button that runs the given action", () => {
    const shell = mountShellWithStage();
    let reloads = 0;
    showStartupFailure(shell, "Reload to continue.", {
      label: "Reload",
      run: () => (reloads += 1),
    });

    const button = shell.querySelector<HTMLButtonElement>("[role=alert] button");
    expect(button?.textContent).toBe("Reload");
    button?.click();
    expect(reloads).toBe(1);
  });

  it("shows no button without an action", () => {
    const shell = mountShellWithStage();
    showStartupFailure(shell, "Glissando cannot start.");
    expect(shell.querySelector("button")).toBeNull();
  });

  it("fails loud when the shell has no stage", () => {
    const shell = mountShell("none");
    expect(() => showStartupFailure(shell, "Glissando cannot start.")).toThrow(/app-shell-stage/);
  });
});

describe("showInPlaceOfApp", () => {
  it("replaces the app with the message and a button that runs the action", () => {
    const target = mountShell("none");
    let reloads = 0;
    showInPlaceOfApp(target, "A newer version is open.", {
      label: "Reload",
      run: () => (reloads += 1),
    });

    expect(target.querySelector("span")).toBeNull();
    expect(target.querySelector("[role=alert]")?.textContent).toContain("A newer version is open.");
    target.querySelector("button")?.click();
    expect(reloads).toBe(1);
  });
});
