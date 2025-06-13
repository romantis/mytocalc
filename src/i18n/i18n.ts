import * as i18n from "@solid-primitives/i18n";
import type * as uk from "./uk.ts";

export type Locale = "uk" | "en";
export type RawDictionary = typeof uk.dict;
export type Dictionary = i18n.Flatten<RawDictionary>;
export const defaultLocale: Locale = "uk"; // default locale

const dictModules = import.meta.glob<{ dict: RawDictionary }>('./*.ts'); // lazy

export async function fetchDictionary(locale: Locale): Promise<Dictionary> {
  const importer = dictModules[`./${locale}.ts`];
  if (!importer) {
    throw new Error(`No dictionary for locale “${locale}”`);
  }

  const mod = await importer();          // довантажуємо лише потрібний файл
  return i18n.flatten(mod.dict);
}