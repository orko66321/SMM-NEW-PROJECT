import type { ButtonHTMLAttributes } from "react";
import { cn } from "./cn.js";
import { Icon, type IconName } from "./Icon.js";

type Variant = "primary" | "ghost" | "subtle" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANT_CLASS: Record<Variant, string> = {
  primary: "btn-primary",
  ghost: "btn-ghost",
  subtle: "btn-subtle",
  danger: "btn-danger",
};

const SIZE_CLASS: Record<Size, string> = {
  sm: "!min-h-[36px] !px-3 !py-1.5 !text-xs",
  md: "",
  lg: "!min-h-[48px] !px-5 !text-[15px]",
};

// Wraps the .btn-* component classes from styles/index.css so buttons stay
// consistent with the design system's interaction states (brightness hover +
// 1px lift + ambient violet shadow, press opacity .7, soft violet focus ring).
export function Button({
  variant = "primary",
  size = "md",
  icon,
  iconAfter,
  fullWidth = false,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  iconAfter?: IconName;
  fullWidth?: boolean;
}) {
  return (
    <button
      type="button"
      className={cn(VARIANT_CLASS[variant], SIZE_CLASS[size], fullWidth && "w-full", className)}
      {...rest}
    >
      {icon && <Icon name={icon} size={size === "sm" ? 16 : 18} />}
      {children}
      {iconAfter && <Icon name={iconAfter} size={size === "sm" ? 16 : 18} />}
    </button>
  );
}
