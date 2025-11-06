const isEnabled = (value: string | undefined, fallback = false) => {
  if (typeof value !== 'string') {
    return fallback;
  }
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
};

/**
 * Feature flag controlling access to the custom workflow builder surface.
 *
 * When false (the default), workflow management affordances are hidden and
 * `/workflows` renders a preview/coming-soon message instead of the full UI.
 * Set `VITE_ENABLE_CUSTOM_WORKFLOWS=true` to re-enable the tooling once the
 * persistence layer is ready for prime time.
 */
export const ENABLE_CUSTOM_WORKFLOWS = isEnabled(
  import.meta.env.VITE_ENABLE_CUSTOM_WORKFLOWS as string | undefined,
  false,
);

export const featureFlags = {
  ENABLE_CUSTOM_WORKFLOWS,
} as const;

export type FeatureFlag = keyof typeof featureFlags;
