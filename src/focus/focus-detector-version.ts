/**
 * The version of the focus detection: 1 faces (ADR-0012), 2 objects (ADR-0036), 3 scenery
 * (ADR-0037). Raised with any change to a model, a threshold or the order of the steps, so
 * results found before it are looked at again (ADR-0041).
 */
export const FOCUS_DETECTOR_VERSION = 3;
