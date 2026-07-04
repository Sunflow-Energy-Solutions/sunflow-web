import Link from "next/link";
import clsx from "clsx";
import { type ReactNode } from "react";

type BaseProps = {
  children: ReactNode;
  variant?: "solar" | "navy" | "outline" | "outline-light" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
  icon?: ReactNode;
};

type ButtonAsLink = BaseProps & {
  href: string;
  onClick?: () => void;
  type?: never;
  disabled?: never;
};

type ButtonAsButton = BaseProps & {
  href?: never;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
};

const variantClasses: Record<NonNullable<BaseProps["variant"]>, string> = {
  solar:
    "bg-solar-500 text-navy-950 hover:bg-solar-400 shadow-lg shadow-solar-500/25 hover:shadow-xl hover:shadow-solar-500/30",
  navy: "bg-navy-900 text-white hover:bg-navy-800 shadow-lg shadow-navy-900/20",
  outline:
    "border-2 border-navy-900 text-navy-900 hover:bg-navy-900 hover:text-white",
  "outline-light":
    "border-2 border-white/70 text-white hover:bg-white hover:text-navy-900",
  ghost: "text-navy-900 hover:bg-mist-100",
};

const sizeClasses: Record<NonNullable<BaseProps["size"]>, string> = {
  sm: "px-4 py-2 text-sm",
  md: "px-6 py-3 text-base",
  lg: "px-8 py-4 text-base",
};

function classes(variant: BaseProps["variant"] = "solar", size: BaseProps["size"] = "md", className?: string) {
  return clsx(
    "group inline-flex cursor-pointer items-center justify-center gap-2 rounded-full font-semibold transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solar-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
    variantClasses[variant],
    sizeClasses[size],
    className
  );
}

export default function Button(props: ButtonAsLink | ButtonAsButton) {
  const { children, variant, size, className, icon } = props;

  if ("href" in props && props.href) {
    return (
      <Link href={props.href} onClick={props.onClick} className={classes(variant, size, className)}>
        {children}
        {icon}
      </Link>
    );
  }

  const { onClick, type = "button", disabled } = props as ButtonAsButton;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={classes(variant, size, className)}
    >
      {children}
      {icon}
    </button>
  );
}
