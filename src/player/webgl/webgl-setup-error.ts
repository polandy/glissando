/**
 * A GL object the renderer needs could not be created: a context lost at birth, a driver that
 * refuses a shader. The player then draws with the DOM fallback instead.
 */
export class WebGlSetupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebGlSetupError";
  }
}
