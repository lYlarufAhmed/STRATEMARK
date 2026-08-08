import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-ink text-ink-fg hover:bg-ink-hover active:scale-[0.98]',
        ghost: 'border border-border bg-surface text-content hover:bg-surface-2 active:scale-[0.98]',
        blue: 'bg-primary text-primary-fg hover:opacity-90 active:scale-[0.98]',
        link: 'text-primary-ink underline-offset-4 hover:underline',
        destructive: 'bg-negative text-white hover:opacity-90 active:scale-[0.98]',
      },
      size: {
        default: 'px-5 py-2',
        sm: 'px-3.5 py-1.5 text-xs',
        lg: 'px-6 py-2.5 text-base',
        icon: 'h-9 w-9 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
