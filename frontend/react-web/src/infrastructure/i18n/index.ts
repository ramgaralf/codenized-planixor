import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import es from './locales/es.json';
import en from './locales/en.json';

const SUPPORTED_LOCALES = ['es', 'en'];
const DEFAULT_LOCALE = 'es';
const STORAGE_KEY = 'planixor_locale';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      es: { translation: es },
      en: { translation: en },
    },
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: SUPPORTED_LOCALES,
    nonExplicitSupportedLngs: true,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: STORAGE_KEY,
      caches: ['localStorage'],
      convertDetectedLanguage: (lng: string): string => {
        const base = lng.split('-')[0] ?? DEFAULT_LOCALE;
        return SUPPORTED_LOCALES.includes(base) ? base : DEFAULT_LOCALE;
      },
    },
  });

export default i18n;
