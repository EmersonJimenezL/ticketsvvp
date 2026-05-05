export const STORAGE_USER_KEY = "usuario";
export const STORAGE_ISSUED_AT_KEY = "usuario_issued_at";
export const STORAGE_TOKEN_KEY = "usuario_token";

export function getStoredAuthToken() {
  const raw =
    typeof window !== "undefined"
      ? window.localStorage.getItem(STORAGE_TOKEN_KEY)
      : null;
  return typeof raw === "string" && raw.trim() ? raw.trim() : "";
}
