/** Bloody Dave's suite destinations — Control is the persistent family return. */
export const CONTROL_URL = "https://control.bloodydaves.com";

export const SUITE_PRODUCTS = [
  { id: "control", name: "Control", href: CONTROL_URL, current: false },
  { id: "fishin", name: "Fishin", href: "https://weather.bloodydaves.com", current: true },
  { id: "recipes", name: "Recipes", href: "https://recipes.bloodydaves.com", current: false },
  { id: "pantry", name: "Pantry", href: "https://pantry.bloodydaves.com", current: false },
  { id: "get-list", name: "Get List", href: "https://list.bloodydaves.com", current: false },
  { id: "lift-log", name: "Lift Log", href: "https://lift.bloodydaves.com", current: false },
] as const;
