"use client";

import { useId, type InputHTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export const settingsInputClass =
  "h-10 w-full rounded-lg border bg-card px-3 text-sm outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground/80 focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/15 disabled:opacity-60";

/** A settings card row: title and hint on the left, the control on the right. */
export function SettingsRow({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return <div className="flex flex-wrap gap-x-8 gap-y-3 border-t p-6 first:border-t-0">
    <div className="max-w-[220px] flex-[1_1_160px]">
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-[13px] leading-normal text-muted-foreground">{hint}</p>
    </div>
    <div className="min-w-0 flex-[1_1_280px]">{children}</div>
  </div>;
}

type SettingsInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "prefix"> & {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Visually hide the label when a row title already names the field. */
  hideLabel?: boolean;
  /** Fixed text shown inside the field before the value, such as a URL. */
  prefix?: string;
  hint?: ReactNode;
};

export function SettingsInput({ label, value, onChange, hideLabel, prefix, hint, id: givenId, className, ...props }: SettingsInputProps) {
  const generated = useId();
  const id = givenId ?? generated;
  const describedBy = hint ? `${id}-hint` : undefined;
  let control: ReactNode;
  if (prefix) {
    control = <div className="flex h-10 overflow-hidden rounded-lg border bg-card transition-[border-color,box-shadow] focus-within:border-primary focus-within:ring-[3px] focus-within:ring-primary/15">
      <span className="flex items-center whitespace-nowrap border-r bg-muted px-2.5 font-mono text-xs text-muted-foreground" aria-hidden="true">{prefix}</span>
      <input {...props} id={id} value={value} aria-describedby={describedBy} onChange={(event) => onChange(event.target.value)}
        className={cn("min-w-0 flex-1 bg-transparent px-2.5 font-mono text-[13px] outline-none", className)}/>
    </div>;
  } else {
    control = <input {...props} id={id} value={value} aria-describedby={describedBy} onChange={(event) => onChange(event.target.value)} className={cn(settingsInputClass, className)}/>;
  }
  return <div className="min-w-0 flex-1">
    <label htmlFor={id} className={hideLabel ? "sr-only" : "mb-1.5 block text-[13px] font-medium"}>{label}</label>
    {control}
    {hint && <div id={describedBy} className="mt-1.5 text-xs text-muted-foreground">{hint}</div>}
  </div>;
}
