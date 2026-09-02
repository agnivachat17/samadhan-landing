import { type ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="grid place-items-center border border-dashed border-[#a58c6d]/55 bg-[#f8f2e8]/25 px-6 py-12 text-center">
      {icon && <div className="text-[#5e7966]">{icon}</div>}
      <p className="mt-3 font-display text-[1.55rem] leading-none">{title}</p>
      {description && (
        <p className="mt-2 max-w-[28rem] font-body text-[0.78rem] leading-relaxed text-[#586d63]">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
