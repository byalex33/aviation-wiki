export type CommercialOperatingStatus = "active" | "historic" | "unknown";

export type CommercialFilter = {
  status: "all" | CommercialOperatingStatus;
  sort: "asc" | "desc";
  country: string;
};

export type CommercialAirlineCard = {
  name: string;
  href: string;
  iata: string;
  icao: string;
  callsign: string;
  status: string;
  operatingStatus: Exclude<CommercialOperatingStatus, "unknown"> | "unknown";
  country: string;
  countryCode: string;
  detailLabel: "Alias" | "Main hub";
  detailValue: string;
  showLogo: boolean;
};

type FilterableAirline = {
  name: string;
  country: string;
  operatingStatus: CommercialOperatingStatus;
};

export const defaultCommercialFilter: CommercialFilter = {
  status: "all",
  sort: "asc",
  country: "all",
};

export function commercialFilterFromParams(
  params: { get(name: string): string | null },
  countries: readonly string[],
): CommercialFilter {
  const status = params.get("status");
  const country = params.get("country");
  return {
    status: status === "active" || status === "historic" ? status : "all",
    sort: params.get("sort") === "desc" ? "desc" : "asc",
    country: country && countries.includes(country) ? country : "all",
  };
}

export function commercialFilterHref(
  current: URLSearchParams,
  updates: Partial<CommercialFilter>,
) {
  const params = new URLSearchParams(current);
  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined) continue;
    const omit = value === "all" || (key === "sort" && value === "asc");
    if (omit) params.delete(key);
    else params.set(key, value);
  }
  const query = params.toString();
  return query ? `/commercial?${query}` : "/commercial";
}

export function sameCommercialFilter(left: CommercialFilter, right: CommercialFilter) {
  return left.status === right.status && left.sort === right.sort && left.country === right.country;
}

export function groupCommercialAirlines<T extends FilterableAirline>(
  airlines: readonly T[],
  filter: CommercialFilter,
) {
  const direction = filter.sort === "desc" ? -1 : 1;
  const visible = airlines.filter((airline) => {
    const matchesStatus = filter.status === "all" || airline.operatingStatus === filter.status;
    const matchesCountry = filter.country === "all" || airline.country === filter.country;
    return matchesStatus && matchesCountry;
  });
  const sorted = visible.toSorted(
    (left, right) => left.name.localeCompare(right.name) * direction,
  );
  const letters = [...new Set(sorted.map((airline) => airline.name[0]?.toUpperCase() ?? ""))].sort(
    (left, right) => left.localeCompare(right) * direction,
  );
  return letters.filter(Boolean).map((letter) => ({
    letter,
    airlines: sorted.filter((airline) => airline.name[0]?.toUpperCase() === letter),
  }));
}
