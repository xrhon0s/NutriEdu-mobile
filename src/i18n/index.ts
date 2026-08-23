import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import { storage } from '@/services/storage';
import { en } from './locales/en';
import { es } from './locales/es';

const LANGUAGE_STORAGE_KEY = 'nutriedu.language';
const i18n = createInstance();

i18n.use(initReactI18next).init({
  resources: {
    es: { translation: es },
    en: { translation: en },
  },
  lng: 'es',
  fallbackLng: 'es',
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

export async function restoreAppLanguage() {
  const storedLanguage = await storage.get(LANGUAGE_STORAGE_KEY);
  if (storedLanguage !== 'es') {
    await storage.set(LANGUAGE_STORAGE_KEY, 'es');
  }
  await i18n.changeLanguage('es');
}

export default i18n;
