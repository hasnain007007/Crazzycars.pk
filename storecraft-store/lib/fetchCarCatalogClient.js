/**
 * Browser-side car catalog fetch with in-flight + memory dedupe.
 * Prevents ShopByCar + ShopByVehicle from each hitting /api/car-catalog.
 */
let memory = null;
let inflight = null;

export function fetchCarCatalogClient() {
  if (memory) return Promise.resolve(memory);
  if (inflight) return inflight;
  inflight = fetch("/api/car-catalog")
    .then((r) => r.json())
    .then((data) => {
      if (data && (Array.isArray(data.makes) || data.carData || data.vehicles)) {
        memory = data;
      }
      return data;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function seedCarCatalogClient(data) {
  if (data && (Array.isArray(data.makes) || data.carData || data.vehicles)) {
    memory = data;
  }
}
