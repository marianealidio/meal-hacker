export const DIET_OPTIONS = [
  { value: "", label: "None" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "pescetarian", label: "Pescetarian" },
  { value: "gluten free", label: "Gluten free" },
  { value: "ketogenic", label: "Ketogenic" },
  { value: "paleo", label: "Paleo" },
];

export const INTOLERANCE_OPTIONS = [
  "dairy", "egg", "gluten", "grain", "peanut", "seafood", "sesame", "shellfish", "soy", "sulfite", "tree nut", "wheat",
].map((value) => ({ value, label: value.charAt(0).toUpperCase() + value.slice(1) }));
