/**
 * Country options for admin (Pakistan-focused store).
 */
export const COUNTRY_OPTIONS = [{ code: "PK", name: "Pakistan" }];

export function countryNameFromCode(c) {
  return COUNTRY_OPTIONS.find((x) => x.code === c)?.name || c;
}

export function countryLabel(code) {
  return countryNameFromCode(code);
}
