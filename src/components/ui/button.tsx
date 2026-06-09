import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  [
    "inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-medium transition-all duration-200",
    "focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]",
    "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60"
  ],
  {
    variants: {
      variant: {
        default: "bg-[var(--brand-primary)] text-[var(--text-primary)] hover:bg-[var(--brand-primary-hover)] disabled:bg-[var(--bg-surface-hover)] hover:-translate-y-[1px]",
        secondary:
          "border border-[var(--border-default)] bg-[var(--bg-surface-raised)] text-[var(--text-primary)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-surface-hover)] hover:-translate-y-[1px]",
        ghost: "text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]",
        outline:
          "border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)] hover:-translate-y-[1px]"
      },
      size: {
        sm: "h-8 px-4 text-xs",
        default: "h-10 px-5 text-sm",
        icon: "size-10 p-0"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>;

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      ref={ref}
      {...props}
    />
  )
);

Button.displayName = "Button";
