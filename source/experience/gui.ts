import { CameraMode } from "@app/experience/camera";
import type { FolderApi, Pane } from "tweakpane";

const generalParams = {
  Camera: "perspective",
  Clock: "current",
  Hours: 0,
  Minutes: 0
};

const styleParams = {
  Neutral: false
};

/** The callbacks fired when any of the general options change. */
type GeneralParamsCallbacks = {
  onCameraModeChange?: (mode: CameraMode) => void;
  onClockModeChange?: (
    mode: "current" | "custom",
    setUIValues: (hours: number, minutes: number) => void
  ) => void;

  onClockChange?: (hours: number, minutes: number) => void;
};

/** The callbacks fired when any of the style options change. */
type StyleParamsCallbacks = {
  onNeutralChange?: (isNeutral: boolean) => void;
};

/**
 * Adds time controls to the given folder.
 *
 * @param folder - The pane or folder to add the time controls to.
 * @param onClockChange - The callback function to be called when the clock value changes.
 */
function addTimeControls(
  folder: Pane | FolderApi,
  onClockModeChange?: GeneralParamsCallbacks["onClockModeChange"],
  onClockChange?: GeneralParamsCallbacks["onClockChange"]
) {
  folder
    .addBinding(generalParams, "Clock", {
      options: {
        "Show Current Time": "current",
        "Show Custom Time": "custom"
      }
    })
    .on("change", (controller) => {
      timeFolder.hidden = controller.value !== "custom";
      onClockModeChange?.(controller.value as "current" | "custom", (hours, minutes) => {
        hoursHandle.controller.value.setRawValue(hours);
        minutesHandle.controller.value.setRawValue(minutes);
      });
    });

  const timeFolder = folder.addFolder({ title: "Time" });
  timeFolder.hidden = generalParams.Clock !== "custom";

  const hoursLimit = { min: 0, max: 23, step: 1 };
  const hoursHandle = timeFolder
    .addBinding(generalParams, "Hours", hoursLimit)
    .on("change", (controller) => {
      onClockChange?.(controller.value, generalParams.Minutes);
    });

  const minutesLimit = { min: 0, max: 59, step: 1 };
  const minutesHandle = timeFolder
    .addBinding(generalParams, "Minutes", minutesLimit)
    .on("change", (controller) => {
      onClockChange?.(generalParams.Hours, controller.value);
    });
}

/**
 * Adds camera controls to the given folder.
 *
 * @param folder - The pane or folder to add the camera controls to.
 * @param onCameraModeChange - Optional callback function to be called when the camera mode changes.
 */
function addCameraControls(
  folder: Pane | FolderApi,
  onCameraModeChange?: GeneralParamsCallbacks["onCameraModeChange"]
) {
  folder
    .addBinding(generalParams, "Camera", {
      options: {
        Perspective: "perspective",
        Orthographic: "orthographic"
      }
    })
    .on("change", (controller) => {
      onCameraModeChange?.(
        controller.value === "perspective"
          ? CameraMode.Perspective
          : CameraMode.Orthographic
      );
    });
}

/**
 * Adds style controls to the given folder.
 *
 * @param folder - The folder or pane to add the style controls to.
 * @param onNeutralChange - Optional callback function to be called when the "Neutral" style parameter changes.
 */
function addStyleControls(
  folder: Pane | FolderApi,
  onNeutralChange?: StyleParamsCallbacks["onNeutralChange"]
) {
  folder.addBinding(styleParams, "Neutral").on("change", (controller) => {
    onNeutralChange?.(controller.value);
  });
}

/**
 * Adds camera controls to the GUI pane.
 *
 * @param onChange - A callback function that is called when the camera mode is changed.
 * @returns void
 */
export function addControls(
  pane: Pane,
  callbacks: GeneralParamsCallbacks & StyleParamsCallbacks
) {
  const general = pane.addFolder({ title: "Settings" });
  addCameraControls(general, callbacks.onCameraModeChange);
  addTimeControls(general, callbacks.onClockModeChange, callbacks.onClockChange);

  const style = pane.addFolder({ title: "Style" });
  addStyleControls(style, callbacks.onNeutralChange);
}
