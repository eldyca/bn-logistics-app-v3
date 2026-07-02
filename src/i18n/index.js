import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './en.json'
import vi from './vi.json'

const saved = (() => {
  try {
    return localStorage.getItem('lang')
  } catch {
    return null
  }
})()

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    vi: { translation: vi },
  },
  lng: saved || 'vi',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

export function setLanguage(lng) {
  i18n.changeLanguage(lng)
  try {
    localStorage.setItem('lang', lng)
  } catch {
    /* ignore */
  }
}

export default i18n
