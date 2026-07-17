import { modelWithYears, slugify } from './carCatalogUtils.js';

const MAKE_COUNTRIES = {
  Honda: "Japan",
  Toyota: "Japan",
  Suzuki: "Japan",
  KIA: "South Korea",
  Hyundai: "South Korea",
  MG: "China",
  Changan: "China",
  Haval: "China",
  Proton: "Malaysia",
  BAIC: "China",
  Isuzu: "Japan",
  Others: "Various",
};

/** Per-model defaults for Pakistani market catalog. */
export const MODEL_CATALOG_META = {
  "Honda|Civic": {
    bodyStyle: "Sedan",
    popularAccessories: ["Seat Covers", "Floor Mats", "Steering Cover", "Dashboard Mat"],
  },
  "Honda|City": { bodyStyle: "Sedan", popularAccessories: ["Seat Covers", "Floor Mats", "Steering Cover"] },
  "Honda|BRV": { bodyStyle: "SUV", popularAccessories: ["Seat Covers", "Floor Mats", "Roof Rails"] },
  "Toyota|Corolla": {
    bodyStyle: "Sedan",
    popularAccessories: ["Seat Covers", "Floor Mats", "Steering Cover", "Trunk Mat"],
  },
  "Toyota|Prado": {
    bodyStyle: "SUV",
    popularAccessories: ["Seat Covers", "Floor Mats", "Running Boards", "Roof Rails"],
  },
  "Toyota|Fortuner": { bodyStyle: "SUV", popularAccessories: ["Seat Covers", "Floor Mats", "Mud Flaps"] },
  "Suzuki|Alto": { bodyStyle: "Hatchback", popularAccessories: ["Seat Covers", "Floor Mats", "Steering Cover"] },
  "Suzuki|Mehran": { bodyStyle: "Hatchback", popularAccessories: ["Seat Covers", "Floor Mats"] },
  "Suzuki|Wagon R": { bodyStyle: "Hatchback", popularAccessories: ["Seat Covers", "Floor Mats"] },
  "KIA|Sportage": { bodyStyle: "SUV", popularAccessories: ["Seat Covers", "Floor Mats", "Cargo Liner"] },
};

/** Default variants for Pakistani market trims. */
export const MODEL_VARIANTS = {
  "Toyota|Yaris": [
    { name: "GLI", yearFrom: 2020, yearTo: 2025 },
    { name: "ATIV", yearFrom: 2020, yearTo: 2025 },
  ],
  "Toyota|Corolla XLI/GLI": [
    { name: "XLI", yearFrom: 2008, yearTo: 2014 },
    { name: "GLI", yearFrom: 2008, yearTo: 2014 },
  ],
  "Toyota|Corolla Altis": [
    { name: "Altis", yearFrom: 2014, yearTo: 2021 },
    { name: "Grande", yearFrom: 2014, yearTo: 2021 },
  ],
  "Toyota|Corolla Grande": [{ name: "Grande", yearFrom: 2014, yearTo: 2021 }],
  "Honda|Civic": [
    { name: "Oriel", yearFrom: 2016, yearTo: 2021 },
    { name: "VTi", yearFrom: 2012, yearTo: 2021 },
    { name: "VTi-S", yearFrom: 2016, yearTo: 2021 },
    { name: "RS", yearFrom: 2017, yearTo: 2021 },
  ],
  "Honda|City": [
    { name: "Aspire", yearFrom: 2021, yearTo: 2025 },
    { name: "Standard", yearFrom: 2009, yearTo: 2025 },
  ],
  "Suzuki|Alto VXR/VXL": [
    { name: "VX", yearFrom: 2019, yearTo: 2025 },
    { name: "VXR", yearFrom: 2019, yearTo: 2025 },
    { name: "VXL", yearFrom: 2019, yearTo: 2025 },
  ],
  "Suzuki|Cultus": [
    { name: "VXR", yearFrom: 2017, yearTo: 2025 },
    { name: "VXL", yearFrom: 2017, yearTo: 2025 },
    { name: "AGS", yearFrom: 2018, yearTo: 2025 },
  ],
  "KIA|Sportage": [
    { name: "Alpha", yearFrom: 2018, yearTo: 2025 },
    { name: "FWD", yearFrom: 2018, yearTo: 2025 },
    { name: "AWD", yearFrom: 2018, yearTo: 2025 },
  ],
};

function resolveVariants(makeName, name, overrides = {}) {
  if (Array.isArray(overrides.variants)) return overrides.variants;
  const key = `${makeName}|${name}`;
  return MODEL_VARIANTS[key] || [];
}

function modelEntry(makeName, name, yearFrom, yearTo, overrides = {}) {
  const key = `${makeName}|${name}`;
  const meta = MODEL_CATALOG_META[key] || MODEL_CATALOG_META[`${makeName}|${name.split(" ")[0]}`] || {};
  return modelWithYears({
    name,
    yearFrom,
    yearTo,
    bodyStyle: overrides.bodyStyle || meta.bodyStyle || "Sedan",
    popularAccessories: overrides.popularAccessories || meta.popularAccessories || [],
    description: overrides.description || meta.description || "",
    image: overrides.image || "",
    generation: overrides.generation || "",
    nickname: overrides.nickname || "",
    slug: overrides.slug,
    variants: resolveVariants(makeName, name, overrides),
  });
}

/** Pakistani-market generation splits (fresh seed). */
const HONDA_GENERATIONS = [
  { name: "Civic", generation: "10th Gen", nickname: "Civic X", yearFrom: 2016, yearTo: 2021 },
  { name: "Civic", generation: "9th Gen", nickname: "Civic FC", yearFrom: 2012, yearTo: 2015 },
  { name: "Civic", generation: "8th Gen", nickname: "Civic Reborn", yearFrom: 2006, yearTo: 2012 },
  { name: "Civic", generation: "7th Gen", nickname: "Civic Rebirth", yearFrom: 2001, yearTo: 2005 },
  { name: "Civic", generation: "6th Gen", nickname: "Civic EX", yearFrom: 1996, yearTo: 2000 },
  { name: "City", generation: "7th Gen", nickname: "City 2021+", yearFrom: 2021, yearTo: 2025 },
  { name: "City", generation: "4th Gen", nickname: "City Classic", yearFrom: 2009, yearTo: 2021 },
  { name: "City", generation: "3rd Gen", nickname: "City 2003-2008", yearFrom: 2003, yearTo: 2008 },
];

const TOYOTA_COROLLA_GENERATIONS = [
  { name: "Corolla Altis", generation: "11th Gen", nickname: "Altis", yearFrom: 2014, yearTo: 2021 },
  { name: "Corolla Grande", generation: "11th Gen", nickname: "Grande", yearFrom: 2014, yearTo: 2021 },
  { name: "Corolla XLI/GLI", generation: "10th Gen", nickname: "XLI/GLI", yearFrom: 2008, yearTo: 2014 },
  { name: "Corolla Classic", generation: "9th Gen", nickname: "Classic", yearFrom: 2002, yearTo: 2007 },
];

const SUZUKI_GENERATIONS = [
  { name: "Alto VXR/VXL", generation: "New Shape", nickname: "Alto 660cc", yearFrom: 2019, yearTo: 2025, bodyStyle: "Hatchback" },
  { name: "Cultus", generation: "New Shape", nickname: "New Cultus", yearFrom: 2017, yearTo: 2025, bodyStyle: "Hatchback" },
  { name: "Wagon R", generation: "New Shape", nickname: "Wagon R 2014+", yearFrom: 2014, yearTo: 2025, bodyStyle: "Hatchback" },
];

function generationModels(makeName, rows) {
  return rows.map((r) =>
    modelEntry(makeName, r.name, r.yearFrom, r.yearTo, {
      generation: r.generation,
      nickname: r.nickname,
      bodyStyle: r.bodyStyle,
    })
  );
}

function normalizeSeedModels(makeName, models) {
  return (models || []).map((row) => {
    if (row && typeof row === "object" && !Array.isArray(row) && row.name) return row;
    const [name, yearFrom, yearTo] = row;
    return modelEntry(makeName, name, yearFrom, yearTo);
  });
}

/** Default Pakistani car catalog — used by seed API (skips existing slugs). */
export function getDefaultCarCatalogSeed() {
  const makes = [
    {
      name: "Honda",
      models: [
        ...generationModels("Honda", HONDA_GENERATIONS),
        ["BRV", 2017, 2024],
        ["Vezel", 2014, 2024],
        ["HRV", 2014, 2024],
        ["Accord", 2000, 2018],
      ],
    },
    {
      name: "Toyota",
      models: [
        ...generationModels("Toyota", TOYOTA_COROLLA_GENERATIONS),
        ["Aqua", 2012, 2024],
        ["Prius", 2003, 2024],
        ["Prado", 2000, 2024],
        ["Hilux/Revo", 2005, 2024],
        ["Yaris", 2020, 2024],
        ["Vitz", 2000, 2020],
        ["Fortuner", 2012, 2024],
      ],
    },
    {
      name: "Suzuki",
      models: [
        ["Mehran", 1988, 2019],
        ...generationModels("Suzuki", SUZUKI_GENERATIONS),
        ["Cultus", 2000, 2016],
        ["Alto", 2000, 2018],
        ["Swift", 2004, 2024],
        ["Vitara", 2016, 2024],
        ["Ciaz", 2017, 2022],
      ],
    },
    {
      name: "KIA",
      models: [
        ["Sportage", 2012, 2024],
        ["Stonic", 2021, 2024],
        ["Sorento", 2021, 2024],
        ["Picanto", 2019, 2024],
      ],
    },
    {
      name: "Hyundai",
      models: [["Tucson", 2020, 2024], ["Elantra", 2021, 2024], ["Sonata", 2021, 2024]],
    },
    {
      name: "MG",
      models: [["HS", 2020, 2024], ["ZS", 2020, 2024]],
    },
    {
      name: "Changan",
      models: [["Alsvin", 2021, 2024], ["Oshan X7", 2022, 2024], ["Karvaan", 2018, 2024]],
    },
    {
      name: "Haval",
      models: [["H6", 2021, 2024], ["Jolion", 2021, 2024]],
    },
    {
      name: "Proton",
      models: [["X70", 2021, 2024]],
    },
    {
      name: "BAIC",
      models: [["BJ40", 2021, 2024]],
    },
    {
      name: "Isuzu",
      models: [["D-Max", 2018, 2024]],
    },
    {
      name: "Others",
      models: [
        ["Audi", 1998, 2024],
        ["BMW", 1998, 2024],
        ["Mercedes-Benz", 1998, 2024],
        ["Nissan", 1998, 2024],
      ],
    },
  ];

  return makes.map((make, order) => ({
    name: make.name,
    slug: slugify(make.name),
    order,
    isActive: true,
    country: MAKE_COUNTRIES[make.name] || "Japan",
    logo: '',
    models: normalizeSeedModels(make.name, make.models),
  }));
}
