import { type FolderApi, Pane } from "tweakpane";

/** The unique instance for our GUI pane. */
const globalPane = new Pane();

/** All the tweakable params of the app. */
const params = {
  Clock: "current",
  Hours: 0,
  Minutes: 0,
  Neutral: false
};

/** The callbacks fired when any of the general options change. */
type GUICallbacks = {
  onClockModeChange?: (
    mode: "current" | "custom",
    setUIValues: (hours: number, minutes: number) => void
  ) => void;

  onClockChange?: (hours: number, minutes: number) => void;
  onNeutralChange?: (isNeutral: boolean) => void;

  onReset?: () => void;
};

/*
 * Adds time controls to the given folder.
 *
 * @param folder - The pane or folder to add the time controls to.
 * @param onClockChange - The callback function to be called when the clock value changes.
 */
function addTimeControls(
  folder: Pane | FolderApi,
  onClockModeChange?: GUICallbacks["onClockModeChange"],
  onClockChange?: GUICallbacks["onClockChange"]
) {
  const clockGUI = folder
    .addBinding(params, "Clock", {
      options: {
        "Show Current Time": "current",
        "Show Custom Time": "custom"
      }
    })
    .on("change", (controller) => {
      timeFolder.hidden = controller.value !== "custom";
      onClockModeChange?.(controller.value as "current" | "custom", (hours, minutes) => {
        hoursGUI.controller.value.setRawValue(hours);
        minutesGUI.controller.value.setRawValue(minutes);
      });
    });

  const timeFolder = folder.addFolder({ title: "Time" });
  timeFolder.hidden = params.Clock !== "custom";

  const hoursLimit = { min: 0, max: 23, step: 1 };
  const hoursGUI = timeFolder
    .addBinding(params, "Hours", hoursLimit)
    .on("change", (controller) => {
      onClockChange?.(controller.value, params.Minutes);
    });

  const minutesLimit = { min: 0, max: 59, step: 1 };
  const minutesGUI = timeFolder
    .addBinding(params, "Minutes", minutesLimit)
    .on("change", (controller) => {
      onClockChange?.(params.Hours, controller.value);
    });

  return { clockGUI, hoursGUI, minutesGUI };
}

/**
 * Adds style controls to the given folder.
 *
 * @param folder - The folder or pane to add the style controls to.
 * @param onNeutralChange - Optional callback function to be called when the "Neutral" style parameter changes.
 */
function addStyleControls(
  folder: Pane | FolderApi,
  onNeutralChange?: GUICallbacks["onNeutralChange"]
) {
  const neutralGUI = folder.addBinding(params, "Neutral").on("change", (controller) => {
    onNeutralChange?.(controller.value);
  });

  return { neutralGUI };
}

/**
 * Adds camera controls to the GUI pane.
 *
 * @param callbacks - The callbacks to be called when any of the controls change.
 * @returns The GUI pane.
 */
export function addControls(callbacks: GUICallbacks) {
  const general = globalPane.addFolder({ title: "Settings" });

  const { clockGUI, hoursGUI, minutesGUI } = addTimeControls(
    general,
    callbacks.onClockModeChange,
    callbacks.onClockChange
  );

  const style = globalPane.addFolder({ title: "Style" });
  const { neutralGUI } = addStyleControls(style, callbacks.onNeutralChange);

  const actions = globalPane.addFolder({ title: "Actions" });
  actions.addButton({ title: "Reset Scene" }).on("click", () => {
    clockGUI.controller.value.setRawValue("current");
    hoursGUI.controller.value.setRawValue(0);
    minutesGUI.controller.value.setRawValue(0);
    neutralGUI.controller.value.setRawValue(false);

    callbacks.onReset?.();
  });

  return globalPane;
}
