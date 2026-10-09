import { LocalesEnum } from '@activepieces/core-utils';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import i18n from 'i18next';
import Backend from 'i18next-http-backend';
import ICU from 'i18next-icu';
import { initReactI18next } from 'react-i18next';

import enTranslations from '../public/locales/en/translation.json';
import idTranslations from '../public/locales/id/translation.json';

// Initialize dayjs locale to Indonesian by default
dayjs.locale('id');

// Read stored language preference; default to Indonesian if none or unsupported
const storedLng =
  typeof window !== 'undefined'
    ? window.localStorage.getItem('i18nextLng')
    : null;

const initialLng =
  storedLng && Object.values(LocalesEnum).includes(storedLng as LocalesEnum)
    ? storedLng
    : LocalesEnum.INDONESIAN;

// Persist the resolved language so subsequent loads are consistent
if (typeof window !== 'undefined') {
  window.localStorage.setItem('i18nextLng', initialLng);
}

i18n
  .use(ICU)
  .use(Backend)
  .use(initReactI18next)
  .init({
    lng: initialLng,
    fallbackLng: LocalesEnum.ENGLISH,
    debug: false,
    resources: {
      [LocalesEnum.INDONESIAN]: {
        translation: idTranslations,
      },
      [LocalesEnum.ENGLISH]: {
        translation: enTranslations,
      },
    },
    interpolation: {
      escapeValue: false,
    },
    supportedLngs: Object.values(LocalesEnum),
    keySeparator: false,
    nsSeparator: false,
    returnEmptyString: false,
  });

i18n.on('languageChanged', (lng) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('i18nextLng', lng);
  }
  if (lng && lng.startsWith('id')) {
    dayjs.locale('id');
  } else {
    dayjs.locale('en');
  }
});

export default i18n;
