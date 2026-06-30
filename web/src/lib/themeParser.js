// useThemeVar.js
import { useState, useEffect } from "react";
import { formatHex } from "culori"; // Import the converter

// One-shot read of a theme CSS var as a THREE-safe hex string (oklch → hex via culori). Use this for imperative colouring (e.g. recolouring a material once) where a reactive hook would force a re-render: see Diamond/Intro/Loading.

export function getThemeColor(variableName) {
  const cssVar = variableName.startsWith("--")
    ? variableName
    : `--${variableName}`;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(cssVar)
    .trim();
  if (!raw) return null;
  return formatHex(raw) || raw;
}

export function useThemeVar(variableName) {
  const cssVar = variableName.startsWith("--")
    ? variableName
    : `--${variableName}`;
  const [value, setValue] = useState("#ffffff"); // Default to a valid hex

  useEffect(() => {
    const updateValue = () => {
      const rootStyles = getComputedStyle(document.documentElement);
      const rawCssValue = rootStyles.getPropertyValue(cssVar).trim();

      if (rawCssValue) {
        // MAGIC HAPPENS HERE:
        // formatHex reads 'oklch(0.5 0.2 200)' and spits out '#00747b'
        // If it's already a hex, it just passes it through safely.
        const safeHexColor = formatHex(rawCssValue) || rawCssValue;
        setValue(safeHexColor);
      }
    };

    updateValue();

    const observer = new MutationObserver(() => updateValue());
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => observer.disconnect();
  }, [cssVar]);

  return [value];
}
