export type ClassValue = string | false | null | undefined;

/** Minimal class-name joiner, avoiding a dependency on `clsx`/`classnames`. */
export function cx(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}
