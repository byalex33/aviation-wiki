"use client";

import { Select } from "@base-ui/react/select";
import { Check, ChevronDown } from "lucide-react";
import { motion } from "motion/react";
import { Children, isValidElement, useEffect, useRef, useState, type ComponentProps, type CSSProperties, type ReactNode } from "react";

import { useReducedMotion } from "@/lib/use-reduced-motion";
import { cn } from "@/lib/utils";

type MotionSelectProps = Omit<ComponentProps<"button">, "value" | "defaultValue" | "onChange" | "children" | "type"> & {
  value?: string;
  defaultValue?: string;
  required?: boolean;
  autoComplete?: string;
  onValueChange?: (value: string) => void;
  children: ReactNode;
};

/** beUI Select motion over Base UI's keyboard, focus, and form behavior. */
export function MotionSelect({ children, value, defaultValue, onValueChange, name, form, required, disabled, autoComplete, className, id, ...triggerProps }: MotionSelectProps) {
  const items = Children.toArray(children).flatMap((child) => {
    if (!isValidElement<ComponentProps<"option">>(child) || child.type !== "option") return [];
    const label = child.props.children;
    return [{ value: String(child.props.value ?? label ?? ""), label, disabled: child.props.disabled }];
  });
  const initialValue = defaultValue ?? items.find((item) => !item.disabled)?.value ?? "";
  const [internalValue, setInternalValue] = useState(initialValue);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const owner = inputRef.current?.form;
    if (!owner) return;
    const reset = (event: Event) => {
      queueMicrotask(() => {
        if (!event.defaultPrevented && value === undefined) {
          setInternalValue(initialValue);
          setOpen(false);
        }
      });
    };
    owner.addEventListener("reset", reset);
    return () => owner.removeEventListener("reset", reset);
  }, [form, initialValue, value]);

  return (
    <Select.Root
      items={items}
      value={value ?? internalValue}
      onValueChange={(next) => {
        if (next === null) return;
        if (value === undefined) setInternalValue(next);
        onValueChange?.(next);
      }}
      open={open}
      onOpenChange={setOpen}
      inputRef={inputRef}
      name={name}
      form={form}
      required={required}
      disabled={disabled}
      autoComplete={autoComplete}
    >
      <Select.Trigger
        {...triggerProps}
        id={id}
        className={cn("inline-flex w-full items-center justify-between gap-2 rounded-md border bg-background px-3 text-left text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50", className)}
      >
        <Select.Value className="truncate" />
        <motion.span aria-hidden animate={{ rotate: reduce ? 0 : open ? 180 : 0 }} transition={reduce ? { duration: 0 } : { type: "spring", duration: 0.22, bounce: 0.3 }}>
          <ChevronDown className="size-4 shrink-0" />
        </motion.span>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner alignItemWithTrigger={false} sideOffset={8} className="z-[70] outline-none">
          <Select.Popup
            className={cn("beui-select-popup", "w-[var(--anchor-width)] min-w-40 origin-[var(--transform-origin)] overflow-hidden rounded-xl border bg-background text-foreground shadow-lg outline-none")}
          >
            <Select.List className="max-h-[min(20rem,var(--available-height))] overflow-y-auto p-1">
              {items.map((item, index) => (
                <Select.Item key={item.value} value={item.value} disabled={item.disabled} style={{ "--item-delay": `${Math.min(index * 15, 75)}ms` } as CSSProperties} className={cn("beui-select-item", "flex cursor-default items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-sm outline-none data-highlighted:bg-muted data-disabled:opacity-50")}>
                  <Select.ItemText>{item.label}</Select.ItemText>
                  <Select.ItemIndicator><Check aria-hidden className="size-3.5" /></Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
