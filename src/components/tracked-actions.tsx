"use client";

import { track } from "@vercel/analytics/react";
import Link, { type LinkProps } from "next/link";
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  MouseEvent,
} from "react";

type EventProperties = Record<string, string | number | boolean>;

function recordEvent(name: string, properties?: EventProperties) {
  try {
    track(name, properties);
  } catch {
    // Analytics must never block navigation or form submission.
  }
}

export function TrackedLink({
  eventName,
  eventProperties,
  onClick,
  ...props
}: LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> & {
    eventName: string;
    eventProperties?: EventProperties;
  }) {
  return (
    <Link
      {...props}
      onClick={(event: MouseEvent<HTMLAnchorElement>) => {
        recordEvent(eventName, eventProperties);
        onClick?.(event);
      }}
    />
  );
}

export function TrackedSubmitButton({
  eventName,
  eventProperties,
  onClick,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  eventName: string;
  eventProperties?: EventProperties;
}) {
  return (
    <button
      {...props}
      onClick={(event: MouseEvent<HTMLButtonElement>) => {
        recordEvent(eventName, eventProperties);
        onClick?.(event);
      }}
    />
  );
}
