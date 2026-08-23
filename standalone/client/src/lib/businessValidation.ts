export function getBusinessDescriptionError(value: string) {
  if (value.trim().length > 0) return null;
  return "Add a brief business description before continuing.";
}
