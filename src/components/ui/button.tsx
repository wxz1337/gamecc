import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  [
    "inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-medium transition-all duration-200",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/10",
    "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60"
  ],
  {
    variants: {
      variant: {
        default: "bg-zinc-900 text-white shadow-sm hover:bg-zinc-800 disabled:bg-zinc-300 hover:shadow-md hover:-translate-y-[1px]",
        secondary: "bg-white text-zinc-900 shadow-sm border border-zinc-200/60 hover:bg-zinc-50 hover:shadow-md hover:-translate-y-[1px]",
        ghost: "text-zinc-600 hover:bg-zinc-100/80 hover:text-zinc-900",
        outline: "bg-white text-zinc-800 border border-zinc-200/60 hover:bg-zinc-50 hover:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] hover:-translate-y-[1px]"
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
