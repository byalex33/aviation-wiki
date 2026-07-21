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

export async function getOpenFlightsAirlines(iataCodes: string[]) {
  try {
    const response = await fetch(OPENFLIGHTS_AIRLINES_URL, {
      next: { revalidate: 86_400 },
    });

    if (!response.ok) return new Map<string, OpenFlightsAirline>();

    const wantedCodes = new Set(iataCodes);
    const records = (await response.text())
      .split(/\r?\n/)
      .filter(Boolean)
      .map(parseCsvLine)
      .filter((fields) => wantedCodes.has(fields[3]))
      .map((fields): OpenFlightsAirline => ({
        id: fields[0],
        name: fields[1],
        alias: nullable(fields[2]),
        iata: fields[3],
        icao: fields[4],
        callsign: nullable(fields[5]),
        country: nullable(fields[6]),
        active: fields[7] === "Y",
      }));

    return new Map(records.map((airline) => [airline.iata, airline]));
  } catch {
    return new Map<string, OpenFlightsAirline>();
  }
}
