import { $ } from "@app/utils/misc";
import { gsap } from "gsap";

/**
 * Calculates the opacity of the mouse based on its distance from the edge of the window.
 *
 * @param x - The x-coordinate of the mouse.
 * @param y - The y-coordinate of the mouse.
 * @returns The opacity value between 0 and 1.
 */
function calculateMouseOpacity(x: number, y: number) {
  // Distance from edge where fading starts
  const margin = 150;

  const xDistance = Math.min(x, window.innerWidth - x);
  const yDistance = Math.min(y, window.innerHeight - y);
  const minDistance = Math.min(xDistance, yDistance);
  const opacity = Math.max(minDistance / margin, 0);

  return Math.min(opacity, 1);
}

/**
 * Sets up mouse effects for the page.
 * @returns A function that removes the event listeners for mouse movement and mouse leave.
 */
export function setupMouseSpotlight() {
  const light = $("#light") as HTMLDivElement;

  const followMouse = (event: MouseEvent) => {
    const x = event.clientX;
    const y = event.clientY;

    gsap.to(light, {
      x: x - light.offsetWidth / 2,
      y: y - light.offsetHeight / 2,
      duration: 0.1,
      ease: "sine.out"
    });

    const opacity = calculateMouseOpacity(x, y);
    gsap.to(light, { opacity, duration: 0.1, ease: "sine.out" });
  };

  const fadeOutLight = () => {
    gsap.to(light, { opacity: 0, duration: 0.2, ease: "sine.out" });
  };

  document.addEventListener("mousemove", followMouse);
  document.addEventListener("mouseleave", fadeOutLight);

  return () => {
    fadeOutLight();

    document.removeEventListener("mousemove", followMouse);
    document.removeEventListener("mouseleave", fadeOutLight);
  };
}
