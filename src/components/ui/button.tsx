import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  [
    "inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-semibold transition-all duration-200",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#172033]/20 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f6f1e7]",
    "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60"
  ],
  {
    variants: {
      variant: {
        default:
          "bg-[#172033] text-white shadow-[0_12px_30px_rgba(23,32,51,0.18)] hover:-translate-y-0.5 hover:bg-[#273653] disabled:bg-slate-300",
        secondary:
          "bg-white text-slate-900 ring-1 ring-stone-200 hover:-translate-y-0.5 hover:bg-white hover:ring-stone-300",
        ghost: "text-slate-600 hover:bg-stone-100 hover:text-slate-950",
        outline:
          "bg-white/80 text-slate-700 ring-1 ring-stone-300 hover:-translate-y-0.5 hover:bg-white hover:ring-slate-400/40"
      },
      size: {
        sm: "h-9 px-3 text-xs",
        default: "h-11 px-4 text-sm",
        icon: "size-11 p-0"
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
