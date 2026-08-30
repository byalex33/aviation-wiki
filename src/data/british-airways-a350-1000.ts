export type AviationSeedSource = {
  key: string;
  type:
    | "manufacturer"
    | "operator"
    | "regulator"
    | "government"
    | "database"
    | "news"
    | "community"
    | "other";
  title: string;
  publisher: string;
  url: string;
  citation?: string;
  licence?: string;
  retrievedAt: string;
};

export type BritishAirwaysA350Seed = {
  msn: string;
  registration: string;
  registeredOn: string;
  deliveredOn: string;
};

export const britishAirwaysA350Sources: AviationSeedSource[] = [
  {
    key: "plane-finder-fleet",
    type: "database",
    title: "British Airways fleet",
    publisher: "Plane Finder",
    url: "https://planefinder.net/data/airline/BAW/fleet",
    citation:
      "Fleet table identifying the registration, A350-1041 series, and construction number for each aircraft.",
    retrievedAt: "2026-08-30T00:00:00.000Z",
  },
  {
    key: "airfleets-fleet",
    type: "database",
    title: "British Airways fleet of A350 (active)",
    publisher: "Airfleets aviation",
    url: "https://www.airfleets.net/flottecie/British%20Airways-active-a350.htm",
    citation:
      "Fleet table identifying MSN, A350-1041 type, registration, and delivery date.",
    retrievedAt: "2026-08-30T00:00:00.000Z",
  },
  {
    key: "ba-fleet-facts",
    type: "operator",
    title: "Airbus A350-1000 fleet facts",
    publisher: "British Airways",
    url: "https://hotline.britishairways.com/content/information/about-ba/fleet-facts/airbus-a350-1000",
    citation:
      "Operator fleet page reporting 18 aircraft, 331 seats in three classes, and Rolls-Royce Trent XWB-97 engines.",
    retrievedAt: "2026-08-30T00:00:00.000Z",
  },
  {
    key: "airbus-first-delivery",
    type: "manufacturer",
    title: "British Airways takes delivery of its first A350-1000",
    publisher: "Airbus",
    url: "https://www.airbus.com/sites/g/files/jlcbta136/files/a08671b02232cb966f0171bf4f606d6c_EN-BA-First-Delivery-A350-1000.pdf",
    citation:
      "Manufacturer release dated 29 July 2019 reporting BA's first A350-1000 delivery and the 56/56/219 cabin layout.",
    retrievedAt: "2026-08-30T00:00:00.000Z",
  },
  {
    key: "commons-g-xwba-photo",
    type: "community",
    title: "British Airways G-XWBA Airbus A350-1041 at London Heathrow",
    publisher: "Wikimedia Commons",
    url: "https://commons.wikimedia.org/wiki/File:British_Airways_G-XWBA_Airbus_A350-1041_London_Heathrow_Airport_(LHR_EGLL)_(52677834060).jpg",
    citation:
      "Photograph identifying G-XWBA, MSN 326, at London Heathrow on 6 February 2023.",
    licence: "CC BY-SA 2.0",
    retrievedAt: "2026-08-30T00:00:00.000Z",
  },
];

/**
 * Curated vertical slice. Plane Finder supplies registration dates and MSNs;
 * Airfleets supplies delivery dates. The Airbus release is retained as a
 * competing 29 July claim for the first delivery rather than overwriting the
 * Airfleets 26 July value.
 */
export const britishAirwaysA350Airframes: BritishAirwaysA350Seed[] = [
  {
    msn: "326",
    registration: "G-XWBA",
    registeredOn: "2019-07-25",
    deliveredOn: "2019-07-26",
  },
  {
    msn: "340",
    registration: "G-XWBB",
    registeredOn: "2019-09-19",
    deliveredOn: "2019-09-19",
  },
  {
    msn: "362",
    registration: "G-XWBC",
    registeredOn: "2019-11-26",
    deliveredOn: "2019-11-26",
  },
  {
    msn: "374",
    registration: "G-XWBD",
    registeredOn: "2019-12-23",
    deliveredOn: "2019-12-23",
  },
  {
    msn: "386",
    registration: "G-XWBE",
    registeredOn: "2020-02-12",
    deliveredOn: "2020-02-12",
  },
  {
    msn: "402",
    registration: "G-XWBF",
    registeredOn: "2020-05-15",
    deliveredOn: "2020-05-20",
  },
  {
    msn: "432",
    registration: "G-XWBG",
    registeredOn: "2020-10-02",
    deliveredOn: "2020-10-02",
  },
  {
    msn: "446",
    registration: "G-XWBH",
    registeredOn: "2020-12-14",
    deliveredOn: "2020-12-14",
  },
  {
    msn: "473",
    registration: "G-XWBI",
    registeredOn: "2022-03-25",
    deliveredOn: "2022-03-26",
  },
  {
    msn: "490",
    registration: "G-XWBJ",
    registeredOn: "2022-02-25",
    deliveredOn: "2022-03-01",
  },
  {
    msn: "495",
    registration: "G-XWBK",
    registeredOn: "2022-03-10",
    deliveredOn: "2022-03-10",
  },
  {
    msn: "547",
    registration: "G-XWBL",
    registeredOn: "2022-04-28",
    deliveredOn: "2022-04-29",
  },
  {
    msn: "563",
    registration: "G-XWBM",
    registeredOn: "2022-08-26",
    deliveredOn: "2022-08-27",
  },
  {
    msn: "609",
    registration: "G-XWBN",
    registeredOn: "2023-06-09",
    deliveredOn: "2023-06-10",
  },
  {
    msn: "617",
    registration: "G-XWBO",
    registeredOn: "2023-07-19",
    deliveredOn: "2023-07-19",
  },
  {
    msn: "623",
    registration: "G-XWBP",
    registeredOn: "2023-08-18",
    deliveredOn: "2023-08-19",
  },
  {
    msn: "639",
    registration: "G-XWBR",
    registeredOn: "2023-12-15",
    deliveredOn: "2023-12-16",
  },
  {
    msn: "652",
    registration: "G-XWBS",
    registeredOn: "2024-02-20",
    deliveredOn: "2024-02-21",
  },
];

export const britishAirwaysA350Dataset = {
  id: "british-airways-a350-1000-v1",
  observedAt: "2026-08-30T00:00:00.000Z",
  reconciledAt: "2026-08-30T00:00:00.000Z",
  manufacturer: {
    name: "Airbus",
    slug: "airbus",
    countryCode: "FR",
  },
  operator: {
    name: "British Airways",
    slug: "british-airways",
    countryCode: "GB",
  },
  model: {
    family: "Airbus A350",
    variant: "A350-1000",
    designation: "A350-1041",
    icaoTypeCode: "A35K",
  },
  configuration: {
    totalSeats: 331,
    classes: {
      clubWorld: 56,
      worldTravellerPlus: 56,
      worldTraveller: 219,
    },
    engines: "2 × Rolls-Royce Trent XWB-97",
  },
  sources: britishAirwaysA350Sources,
  airframes: britishAirwaysA350Airframes,
  conflicts: [
    {
      msn: "326",
      predicate: "event.delivery_date",
      claimedValue: "2019-07-29",
      sourceKey: "airbus-first-delivery",
      note: "Airbus's dated release says BA took delivery on 29 July; the fleet database reports 26 July.",
    },
  ],
  media: [
    {
      registration: "G-XWBA",
      imageUrl:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/British_Airways_G-XWBA_Airbus_A350-1041_London_Heathrow_Airport_%28LHR_EGLL%29_%2852677834060%29.jpg/1920px-British_Airways_G-XWBA_Airbus_A350-1041_London_Heathrow_Airport_%28LHR_EGLL%29_%2852677834060%29.jpg",
      sourceKey: "commons-g-xwba-photo",
      creator: "Mitchul Hope",
      licence: "CC BY-SA 2.0",
      licenceUrl: "https://creativecommons.org/licenses/by-sa/2.0",
      caption: "G-XWBA arriving at London Heathrow as BA272 on 6 February 2023.",
      capturedOn: "2023-02-06",
    },
  ],
} as const;
