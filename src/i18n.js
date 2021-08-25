import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import resources from './localization_i18n.json';

i18n
  .use(initReactI18next) 
  .init({
    resources,
    lng: localStorage.getItem("selected_language") || 'en',
    fallbackLng: "en",
    interpolation: {
      escapeValue: false 
    }
  });

export default i18n;