/**
 * Logger console — horodaté, coloré, filtré par niveau.
 *
 * `LOG_LEVEL` (env, défaut `info`) coupe tout ce qui est en dessous : un cron
 * tourne en `info`, un diagnostic à la main en `debug`. Les messages `debug`
 * sont le bon endroit pour le détail (payloads, comptages intermédiaires) qui
 * polluait `/var/log/seo-automation.log`.
 */
import { env } from '../config/env.js';

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
};

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 } as const;
type Level = keyof typeof LEVELS;

let threshold: number | null = null;
function enabled(level: Level): boolean {
  // Lu paresseusement : `.env` est chargé par env.ts, pas forcément avant cet import.
  if (threshold === null) threshold = LEVELS[env.LOG_LEVEL];
  return LEVELS[level] >= threshold;
}

function timestamp(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

function line(color: string, label: string, msg: string): string {
  return `${COLORS.gray}[${timestamp()}]${COLORS.reset} ${color}${label}${COLORS.reset} ${msg}`;
}

export function debug(msg: string, ...args: unknown[]) {
  if (enabled('debug')) console.log(line(COLORS.gray, 'DEBUG', msg), ...args);
}

export function info(msg: string, ...args: unknown[]) {
  if (enabled('info')) console.log(line(COLORS.blue, 'INFO ', msg), ...args);
}

export function success(msg: string, ...args: unknown[]) {
  if (enabled('info')) console.log(line(COLORS.green, 'OK   ', msg), ...args);
}

export function warn(msg: string, ...args: unknown[]) {
  if (enabled('warn')) console.log(line(COLORS.yellow, 'WARN ', msg), ...args);
}

export function error(msg: string, ...args: unknown[]) {
  if (enabled('error')) console.error(line(COLORS.red, 'ERROR', msg), ...args);
}
