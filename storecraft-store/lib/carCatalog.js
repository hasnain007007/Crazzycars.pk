/** Hardcoded make → model → year ranges for Shop by Car (expand via admin later). */

export const CAR_MAKES = [
  "Honda",
  "Toyota",
  "Suzuki",
  "KIA",
  "Hyundai",
  "MG",
  "Changan",
  "Haval",
  "Proton",
  "BAIC",
  "Others",
];

export const CAR_DATA = {
  Honda: [
    { model: "Civic", yearFrom: 2001, yearTo: 2024 },
    { model: "City", yearFrom: 2000, yearTo: 2024 },
    { model: "BRV", yearFrom: 2016, yearTo: 2024 },
    { model: "Vezel", yearFrom: 2013, yearTo: 2024 },
    { model: "HRV", yearFrom: 2015, yearTo: 2024 },
    { model: "Accord", yearFrom: 1998, yearTo: 2024 },
  ],
  Toyota: [
    { model: "Corolla", yearFrom: 2000, yearTo: 2024 },
    { model: "Aqua", yearFrom: 2011, yearTo: 2024 },
    { model: "Prius", yearFrom: 2003, yearTo: 2024 },
    { model: "Prado", yearFrom: 2002, yearTo: 2024 },
    { model: "Hilux", yearFrom: 2005, yearTo: 2024 },
    { model: "Yaris", yearFrom: 2005, yearTo: 2024 },
    { model: "Vitz", yearFrom: 2005, yearTo: 2024 },
  ],
  Suzuki: [
    { model: "Mehran", yearFrom: 1998, yearTo: 2022 },
    { model: "Wagon R", yearFrom: 2003, yearTo: 2024 },
    { model: "Cultus", yearFrom: 2000, yearTo: 2024 },
    { model: "Alto", yearFrom: 2000, yearTo: 2024 },
    { model: "Swift", yearFrom: 2005, yearTo: 2024 },
    { model: "Vitara", yearFrom: 2016, yearTo: 2024 },
    { model: "Ciaz", yearFrom: 2015, yearTo: 2024 },
  ],
  KIA: [
    { model: "Sportage", yearFrom: 2010, yearTo: 2024 },
    { model: "Stonic", yearFrom: 2018, yearTo: 2024 },
    { model: "Sorento", yearFrom: 2010, yearTo: 2024 },
    { model: "Picanto", yearFrom: 2008, yearTo: 2024 },
  ],
  Hyundai: [
    { model: "Tucson", yearFrom: 2010, yearTo: 2024 },
    { model: "Elantra", yearFrom: 2005, yearTo: 2024 },
    { model: "Sonata", yearFrom: 2005, yearTo: 2024 },
  ],
  MG: [
    { model: "HS", yearFrom: 2019, yearTo: 2024 },
    { model: "ZS", yearFrom: 2019, yearTo: 2024 },
  ],
  Changan: [
    { model: "Alsvin", yearFrom: 2018, yearTo: 2024 },
    { model: "Oshan X7", yearFrom: 2020, yearTo: 2024 },
    { model: "Karvaan", yearFrom: 2018, yearTo: 2024 },
  ],
  Haval: [
    { model: "H6", yearFrom: 2020, yearTo: 2024 },
    { model: "Jolion", yearFrom: 2021, yearTo: 2024 },
  ],
  Proton: [{ model: "Saga", yearFrom: 2016, yearTo: 2024 }],
  BAIC: [{ model: "BJ40", yearFrom: 2020, yearTo: 2024 }],
  Others: [
    { model: "Audi", yearFrom: 1998, yearTo: 2024 },
    { model: "BMW", yearFrom: 1998, yearTo: 2024 },
    { model: "Mercedes", yearFrom: 1998, yearTo: 2024 },
    { model: "Nissan", yearFrom: 1998, yearTo: 2024 },
    { model: "Isuzu", yearFrom: 1998, yearTo: 2024 },
  ],
};

export const QUICK_CAR_PILLS = [
  { make: "Honda", model: "Civic" },
  { make: "Toyota", model: "Corolla" },
  { make: "Suzuki", model: "Alto" },
  { make: "KIA", model: "Sportage" },
  { make: "Toyota", model: "Prado" },
];

export function yearsForModel(make, model) {
  const entry = CAR_DATA[make]?.find((m) => m.model === model);
  if (!entry) return [];
  const years = [];
  for (let y = entry.yearTo; y >= entry.yearFrom; y--) years.push(y);
  return years;
}

export const BRAND_CAROUSEL = [
  { name: "Honda", slug: "honda" },
  { name: "Toyota", slug: "toyota" },
  { name: "Suzuki", slug: "suzuki" },
  { name: "KIA", slug: "kia" },
  { name: "Hyundai", slug: "hyundai" },
  { name: "MG", slug: "mg" },
  { name: "Changan", slug: "changan" },
  { name: "Haval", slug: "haval" },
  { name: "Isuzu", slug: "isuzu" },
  { name: "Audi", slug: "audi" },
];

export const TRENDING_SEARCH_TAGS = [
  "Seat Covers",
  "Floor Mats",
  "Steering Wheels",
  "Fog Lights",
  "Car Care",
];
