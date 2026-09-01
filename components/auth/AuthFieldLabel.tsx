import { cn } from '@/lib/utils';

export function AuthFieldLabel({
  htmlFor,
  children,
  required,
  optional,
  className,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  required?: boolean;
  optional?: boolean;
  className?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn('mb-1 flex items-center gap-1.5 text-xs font-semibold text-neutral-600', className)}
    >
      <span>{children}</span>
      {required ? (
        <span className="rounded bg-primary/10 px-1 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
          Required
        </span>
      ) : null}
      {optional ? (
        <span className="text-[10px] font-medium text-neutral-400">Optional</span>
      ) : null}
    </label>
  );
}
