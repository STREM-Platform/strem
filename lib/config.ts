/**
 * Runtime configuration for the STREM mobile app.
 *
 * The API base URL is configurable so the same build can point at local
 * development, staging, or production. It targets the STREM API gateway, which
 * routes to the auth, user, and domain services under a single `/v1` base
 * (see `strem-docs/architecture/service-map.md`). Set `EXPO_PUBLIC_API_URL` to
 * override; the default is the local gateway port.
 */

const DEFAULT_API_URL = "http://localhost:8000/v1";

export const API_BASE_URL: string = process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_URL;
