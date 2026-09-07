import type { CSSProperties } from "react";

// Small helper so custom-property inline styles (`--ll-delay`, …) type-check
// without sprinkling `as CSSProperties` casts through the JSX.
export function cssVars(vars: Record<string, string | number>): CSSProperties {
  return vars as CSSProperties;
}
