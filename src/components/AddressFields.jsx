import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { COUNTRIES, statesFor, citiesFor } from '../lib/geo'
import { placesEnabled, attachAutocomplete } from '../lib/places'

// value: { country, state, city, zip, addr }
// onField(field, val)
export default function AddressFields({ value, onField, idPrefix }) {
  const { t } = useTranslation()
  const addrRef = useRef(null)

  const states = statesFor(value.country)
  const cities = citiesFor(value.country, value.state)

  useEffect(() => {
    let cleanup = () => {}
    if (placesEnabled && addrRef.current) {
      attachAutocomplete(addrRef.current, (p) => {
        const full = [p.streetNumber, p.route].filter(Boolean).join(' ') || p.formatted
        onField('addr', full)
        if (p.country) onField('country', p.country === 'United States' ? 'United States' : p.country)
        if (p.state) onField('state', p.state)
        if (p.city) onField('city', p.city)
        if (p.zip) onField('zip', p.zip)
      }).then((fn) => {
        cleanup = fn
      })
    }
    return () => cleanup()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cityListId = (idPrefix || 'a') + '-citylist'

  return (
    <>
      <div className="grid">
        <div className="field tight">
          <label>{t('order.country')}</label>
          <select
            value={value.country || ''}
            onChange={(e) => {
              onField('country', e.target.value)
              onField('state', '')
              onField('city', '')
            }}
          >
            <option value="">—</option>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="field tight">
          <label>{t('order.state')}</label>
          <select
            value={value.state || ''}
            onChange={(e) => {
              onField('state', e.target.value)
              onField('city', '')
            }}
            disabled={!states.length}
          >
            <option value="">{t('common.selectState')}</option>
            {states.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid" style={{ marginTop: 12 }}>
        <div className="field tight">
          <label>{t('order.city')}</label>
          <input
            list={cityListId}
            value={value.city || ''}
            onChange={(e) => onField('city', e.target.value)}
            placeholder={t('common.selectCity')}
          />
          <datalist id={cityListId}>
            {cities.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div className="field tight">
          <label>{t('order.zip')}</label>
          <input value={value.zip || ''} onChange={(e) => onField('zip', e.target.value)} />
        </div>
      </div>

      <div className="field full" style={{ marginTop: 12 }}>
        <label>
          {t('order.address')} <span className="r">*</span>
        </label>
        <input
          ref={addrRef}
          value={value.addr || ''}
          onChange={(e) => onField('addr', e.target.value)}
          placeholder={placesEnabled ? t('common.typeToSearch') : ''}
        />
      </div>
    </>
  )
}
