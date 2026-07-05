export type AppEnv = "dev" | "test" | "prod";

/**
 * Get the current application environment.
 * Controlled by the APP_ENV environment variable.
 * Defaults to "dev" if not set.
 */
export function getAppEnv(): AppEnv {
  return (process.env.APP_ENV || "dev") as AppEnv;
}

export function isDev(): boolean {
  return getAppEnv() === "dev";
}

export function isTest(): boolean {
  return getAppEnv() === "test";
}

export function isProd(): boolean {
  return getAppEnv() === "prod";
}
