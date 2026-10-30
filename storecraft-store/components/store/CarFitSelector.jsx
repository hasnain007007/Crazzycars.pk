/**
 * "Shop by your car" — server-rendered GET form (works without JavaScript).
 * One labelled select grouped by make (Make → Model → Years); submit goes to `action`:
 * a category path (filters it with ?car=) or /cars/go (redirects to the car page).
 * CarFitSelectorMemory pre-selects the shopper's saved car and saves new choices.
 */
import { groupVehiclesForSelect } from "@/lib/carSelector";
import { CarFitSelectorMemory } from "@/components/store/CarFitSelectorMemory";

export function CarFitSelector({ vehicles = [], action = "/cars/go", currentCar = "", title = "Shop by your car", clearHref = null }) {
  const groups = groupVehiclesForSelect(vehicles);
  if (!groups.length) return null;
  const id = "car-fit-select";
  return (
    <form method="get" action={action} className="car-fit-selector store-container" data-car-fit-form>
      <label htmlFor={id} className="car-fit-selector__label">
        {title}
      </label>
      <div className="car-fit-selector__row">
        <select id={id} name="car" defaultValue={currentCar || ""} className="car-fit-selector__select" required>
          <option value="">Choose make, model and year…</option>
          {groups.map((g) => (
            <optgroup key={g.make} label={g.make}>
              {g.options.map((o) => (
                <option key={o.slug} value={o.slug}>
                  {g.make} {o.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <button type="submit" className="car-fit-selector__btn">
          Show parts
        </button>
        {currentCar && clearHref ? (
          <a href={clearHref} className="car-fit-selector__clear">
            Show all
          </a>
        ) : null}
      </div>
      <CarFitSelectorMemory hasCurrent={Boolean(currentCar)} />
    </form>
  );
}
