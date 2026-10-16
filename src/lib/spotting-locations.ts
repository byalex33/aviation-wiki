export type SpottingLocation = {
  name: string;
  latitude: number | null;
  longitude: number | null;
  runways: string;
  placeholder: boolean;
  note: string;
};

export type SpottingLocationsBlock = {
  title: string;
  placeholder: boolean;
  locations: SpottingLocation[];
};

export type SpottingLocationError = {
  line: number;
  column: number;
  message: string;
};

const locationKeys = new Set(["name", "latitude", "longitude", "runways", "placeholder", "note"]);

function coordinate(value: string, limit: number) {
  if (!/^-?\d+(?:\.\d+)?$/.test(value)) return null;
  const number = Number(value);
  if (!Number.isFinite(number) || Math.abs(number) > limit) return null;
  return number;
}

function placeholderFlag(value: string) {
  const normalized = value.trim().toLowerCase();
  if (["true", "yes"].includes(normalized)) return true;
  if (["false", "no"].includes(normalized)) return false;
  return null;
}

type LocationDraft = {
  line: number;
  values: Record<string, string>;
};

export function parseSpottingLocationsBlock({
  attributes,
  body,
  blockLine,
  bodyLine,
}: {
  attributes: Record<string, string>;
  body: string;
  blockLine: number;
  bodyLine: number;
}): { block: SpottingLocationsBlock | null; errors: SpottingLocationError[] } {
  const errors: SpottingLocationError[] = [];
  const title = attributes.title?.trim() || "Spotting locations";
  const blockPlaceholderRaw = attributes.placeholder?.trim() ?? "";
  const blockPlaceholder = blockPlaceholderRaw ? placeholderFlag(blockPlaceholderRaw) : false;
  if (blockPlaceholderRaw && blockPlaceholder === null) {
    errors.push({
      line: blockLine,
      column: 1,
      message: 'SpottingLocations placeholder must be "true" or "false".',
    });
  }

  const drafts: LocationDraft[] = [];
  const lines = body.split(/\r?\n/);
  for (const [index, rawLine] of lines.entries()) {
    const lineNumber = bodyLine + index;
    const line = rawLine.trim().replace(/^[-*]\s+/, "");
    if (!line) continue;
    const separator = line.indexOf(":");
    const key = separator > 0 ? line.slice(0, separator).trim().toLowerCase() : "";
    const value = separator > 0 ? line.slice(separator + 1).trim() : "";
    if (!key || !locationKeys.has(key) || !value) {
      errors.push({
        line: lineNumber,
        column: 1,
        message: "Spotting locations use “Name:”, “Latitude:”, “Longitude:”, “Runways:”, “Placeholder:”, and “Note:” lines.",
      });
      continue;
    }
    if (key === "name" || !drafts.length) {
      if (key !== "name") {
        errors.push({ line: lineNumber, column: 1, message: "Each spotting location starts with a Name line." });
        continue;
      }
      drafts.push({ line: lineNumber, values: { name: value } });
      continue;
    }
    const current = drafts[drafts.length - 1];
    if (current.values[key]) {
      errors.push({ line: lineNumber, column: 1, message: `Duplicate ${key} line in a spotting location.` });
      continue;
    }
    current.values[key] = value;
  }

  const locations: SpottingLocation[] = [];
  const inheritedPlaceholder = blockPlaceholder === true;
  for (const draft of drafts) {
    const name = draft.values.name?.trim() ?? "";
    if (!name) errors.push({ line: draft.line, column: 1, message: "A spotting location needs a name." });
    const explicitPlaceholder = draft.values.placeholder ? placeholderFlag(draft.values.placeholder) : null;
    if (draft.values.placeholder && explicitPlaceholder === null) {
      errors.push({ line: draft.line, column: 1, message: 'Placeholder must be "true" or "false".' });
    }
    const placeholder = explicitPlaceholder ?? inheritedPlaceholder;
    if (inheritedPlaceholder && explicitPlaceholder === false) {
      errors.push({
        line: draft.line,
        column: 1,
        message: "A placeholder spotting block cannot include a location marked as verified.",
      });
    }
    const runways = draft.values.runways?.trim() ?? "";
    const note = draft.values.note?.trim() ?? "";
    if (!runways) errors.push({ line: draft.line, column: 1, message: `${name || "A location"} needs a Runways line.` });
    if (!note) errors.push({ line: draft.line, column: 1, message: `${name || "A location"} needs a Note line.` });
    if (placeholder && note && !note.includes("PLACEHOLDER")) {
      errors.push({
        line: draft.line,
        column: 1,
        message: "A placeholder location note must include PLACEHOLDER so it is not read as a verified spot.",
      });
    }
    const latitudeRaw = draft.values.latitude?.trim() ?? "";
    const longitudeRaw = draft.values.longitude?.trim() ?? "";
    const latitude = latitudeRaw ? coordinate(latitudeRaw, 90) : null;
    const longitude = longitudeRaw ? coordinate(longitudeRaw, 180) : null;
    if (latitudeRaw && latitude === null) {
      errors.push({ line: draft.line, column: 1, message: `${name || "A location"} has a latitude outside -90 to 90. Use decimal degrees.` });
    }
    if (longitudeRaw && longitude === null) {
      errors.push({ line: draft.line, column: 1, message: `${name || "A location"} has a longitude outside -180 to 180. Use decimal degrees.` });
    }
    if (Boolean(latitudeRaw) !== Boolean(longitudeRaw)) {
      errors.push({ line: draft.line, column: 1, message: `${name || "A location"} needs both latitude and longitude, or neither.` });
    }
    if (!placeholder && (latitude === null || longitude === null)) {
      errors.push({
        line: draft.line,
        column: 1,
        message: `${name || "A verified location"} needs decimal latitude and longitude.`,
      });
    }
    if (name && runways && note && !(latitudeRaw && latitude === null) && !(longitudeRaw && longitude === null)) {
      locations.push({
        name,
        latitude: latitudeRaw ? latitude : null,
        longitude: longitudeRaw ? longitude : null,
        runways,
        placeholder,
        note,
      });
    }
  }

  if (!drafts.length) {
    errors.push({ line: blockLine, column: 1, message: "Add at least one spotting location, starting with a Name line." });
  }
  const seen = new Set<string>();
  for (const location of locations) {
    const key = location.name.toLocaleLowerCase("en");
    if (seen.has(key)) errors.push({ line: blockLine, column: 1, message: `Duplicate spotting location: ${location.name}.` });
    seen.add(key);
  }

  return {
    block: errors.length ? null : { title, placeholder: inheritedPlaceholder, locations },
    errors,
  };
}
