export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Standalone build: send the user to the in-app /login page (Firebase
// email + Google sign-in) instead of Manus's OAuth portal. Kept as a named
// export so existing call sites (Home.tsx, useAuth.ts) don't need to change.
export const startLogin = () => {
  window.location.href = "/login";
};
