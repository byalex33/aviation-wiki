const OPENFLIGHTS_AIRLINES_URL =
  "https://raw.githubusercontent.com/jpatokal/openflights/master/data/airlines.dat";

export type OpenFlightsAirline = {
  id: string;
  name: string;
  alias: string | null;
  iata: string;
  icao: string;
  callsign: string | null;
  country: string | null;
  active: boolean;
};

function parseCsvLine(line: string) {
  const values: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      values.push(value);
      value = "";
    } else {
      value += character;
    }
  }

  values.push(value);
  return values;
}

function nullable(value: string) {
  return value && value !== "\\N" ? value : null;
}

export type AirlineIdentity = { iata: string; icao?: string; name?: string; id?: string };

export function matchOpenFlightsAirlines(csv: string, identities: AirlineIdentity[]) {
  const records = csv.split(/\r?\n/).filter(Boolean).map(parseCsvLine)
    .filter((fields) => fields.length >= 8)
    .map((fields): OpenFlightsAirline => ({
      id: fields[0], name: fields[1], alias: nullable(fields[2]), iata: fields[3],
      icao: fields[4], callsign: nullable(fields[5]), country: nullable(fields[6]), active: fields[7] === "Y",
    }));
  const matches = new Map<string, OpenFlightsAirline>();
  for (const identity of identities) {
    const candidates = records.filter((record) => record.iata === identity.iata &&
      (identity.id ? record.id === identity.id :
        identity.icao ? record.icao === identity.icao :
          identity.name ? record.name.toLowerCase() === identity.name.toLowerCase() : false));
    // Reused codes and ambiguous identities must never choose an arbitrary carrier.
    if (candidates.length === 1) matches.set(identity.iata, candidates[0]);
  }
  return matches;
}

export async function getOpenFlightsAirlines(identities: AirlineIdentity[]) {
  try {
    const response = await fetch(OPENFLIGHTS_AIRLINES_URL, { next: { revalidate: 86_400 } });
    return response.ok ? matchOpenFlightsAirlines(await response.text(), identities) : new Map<string, OpenFlightsAirline>();
  } catch {
    return new Map<string, OpenFlightsAirline>();
  }
}
