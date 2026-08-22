import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import {IncldBrowser, type IncldError} from '@incld/client';

export interface IncldThemeVariables {
  accent?: string;
  accentHover?: string;
  accentContrast?: string;
  accentInk?: string;
  accentSoft?: string;
  background?: string;
  surface?: string;
  surfaceHover?: string;
  border?: string;
  text?: string;
  muted?: string;
  danger?: string;
  dangerSoft?: string;
  dangerBorder?: string;
  success?: string;
  successSoft?: string;
  successBorder?: string;
  warning?: string;
  warningSoft?: string;
  warningBorder?: string;
  radius?: string;
  spacing?: string;
  shadow?: string;
  fontFamily?: string;
  fontSize?: string;
  lineHeight?: string;
  focusRing?: string;
}

export interface IncldAppearance {
  colorScheme?: 'light' | 'dark' | 'system';
  accentColor?: 'indigo' | 'blue' | 'emerald' | 'amber' | 'rose';
  radius?: 'small' | 'medium' | 'large';
  density?: 'compact' | 'comfortable';
  variables?: IncldThemeVariables;
}

export interface ResolvedIncldAppearance extends Required<Omit<IncldAppearance, 'variables'>> {
  variables: IncldThemeVariables;
}

export interface IncldContextValue {
  client: IncldBrowser;
  appearance: ResolvedIncldAppearance;
  labels: Readonly<Record<string, string>>;
  version: number;
  refresh: () => void;
  reportError: (error: IncldError) => void;
}

const Context = createContext<IncldContextValue | null>(null);

export interface IncldProviderProps {
  client?: IncldBrowser;
  baseUrl?: string;
  appearance?: IncldAppearance;
  labels?: Record<string, string>;
  onError?: (error: IncldError) => void;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

const variableNames: Record<keyof IncldThemeVariables, `--incld-${string}`> = {
  accent: '--incld-accent',
  accentHover: '--incld-accent-hover',
  accentContrast: '--incld-accent-contrast',
  accentInk: '--incld-accent-ink',
  accentSoft: '--incld-accent-soft',
  background: '--incld-bg',
  surface: '--incld-surface',
  surfaceHover: '--incld-surface-hover',
  border: '--incld-border',
  text: '--incld-text',
  muted: '--incld-muted',
  danger: '--incld-danger',
  dangerSoft: '--incld-danger-soft',
  dangerBorder: '--incld-danger-border',
  success: '--incld-success',
  successSoft: '--incld-success-soft',
  successBorder: '--incld-success-border',
  warning: '--incld-warning',
  warningSoft: '--incld-warning-soft',
  warningBorder: '--incld-warning-border',
  radius: '--incld-radius',
  spacing: '--incld-space',
  shadow: '--incld-shadow',
  fontFamily: '--incld-font-family',
  fontSize: '--incld-font-size',
  lineHeight: '--incld-line-height',
  focusRing: '--incld-focus-ring',
};

function themeStyle(variables: IncldThemeVariables): CSSProperties {
  return Object.fromEntries(
    Object.entries(variables)
      .filter((entry): entry is [keyof IncldThemeVariables, string] => typeof entry[1] === 'string')
      .map(([name, value]) => [variableNames[name], value]),
  ) as CSSProperties;
}

export function IncldProvider({
  client,
  baseUrl = '/api/incld',
  appearance,
  labels = {},
  onError,
  className = '',
  style,
  children,
}: IncldProviderProps) {
  const browser = useMemo(() => client ?? new IncldBrowser({baseUrl}), [client, baseUrl]);
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion(value => value + 1), []);
  const resolvedAppearance = useMemo<ResolvedIncldAppearance>(() => ({
    colorScheme: appearance?.colorScheme ?? 'system',
    accentColor: appearance?.accentColor ?? 'indigo',
    radius: appearance?.radius ?? 'medium',
    density: appearance?.density ?? 'comfortable',
    variables: appearance?.variables ?? {},
  }), [appearance]);
  const reportError = useCallback((error: IncldError) => {
    if (onError) onError(error);
  }, [onError]);
  const value = useMemo(() => ({
    client: browser,
    appearance: resolvedAppearance,
    labels,
    version,
    refresh,
    reportError,
  }), [browser, labels, refresh, reportError, resolvedAppearance, version]);

  return (
    <Context.Provider value={value}>
      <div
        className={`incld-root ${className}`.trim()}
        data-color-scheme={resolvedAppearance.colorScheme}
        data-accent={resolvedAppearance.accentColor}
        data-radius={resolvedAppearance.radius}
        data-density={resolvedAppearance.density}
        style={{...themeStyle(resolvedAppearance.variables), ...style}}
      >
        {children}
      </div>
    </Context.Provider>
  );
}

export function useIncld() {
  const value = useContext(Context);
  if (!value) throw new Error('INCLD components must be rendered inside <IncldProvider>.');
  return value;
}

export function useIncldLabel(key: string, fallback: string) {
  return useContext(Context)?.labels[key] ?? fallback;
}
