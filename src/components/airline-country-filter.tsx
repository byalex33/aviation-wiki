"use client";

import { useRouter, useSearchParams } from "next/navigation";

type AirlineCountryFilterProps = {
  countries: string[];
  value: string;
};

export function AirlineCountryFilter({ countries, value }: AirlineCountryFilterProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  function updateCountry(country: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (country === "all") {
      params.delete("country");
    } else {
      params.set("country", country);
    }

    router.push(`/commercial?${params.toString()}`, { scroll: false });
  }

  return (
    <select
      value={value}
      onChange={(event) => updateCountry(event.target.value)}
      className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring"
      aria-label="Filter airlines by country"
    >
      <option value="all">All countries</option>
      {countries.map((country) => <option key={country} value={country}>{country}</option>)}
    </select>
  );
}
