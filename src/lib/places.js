// Google Places Autocomplete (tuỳ chọn).
// Nếu có VITE_GOOGLE_MAPS_API_KEY -> nạp script và bật gợi ý địa chỉ.
// Nếu không -> trả về chưa sẵn sàng, ứng dụng dùng nhập tay.

const KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
export const placesEnabled = Boolean(KEY)

let loadingPromise = null

export function loadGooglePlaces() {
  if (!placesEnabled) return Promise.resolve(null)
  if (window.google?.maps?.places) return Promise.resolve(window.google)
  if (loadingPromise) return loadingPromise

  loadingPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src =
      'https://maps.googleapis.com/maps/api/js?key=' +
      encodeURIComponent(KEY) +
      '&libraries=places'
    s.async = true
    s.defer = true
    s.onload = () => resolve(window.google)
    s.onerror = () => reject(new Error('Không nạp được Google Maps'))
    document.head.appendChild(s)
  })
  return loadingPromise
}

// Gắn autocomplete vào 1 input. Trả về hàm cleanup.
export async function attachAutocomplete(inputEl, onPlace) {
  if (!placesEnabled || !inputEl) return () => {}
  try {
    const google = await loadGooglePlaces()
    if (!google) return () => {}
    const ac = new google.maps.places.Autocomplete(inputEl, {
      types: ['address'],
      fields: ['address_components', 'formatted_address'],
    })
    const listener = ac.addListener('place_changed', () => {
      const place = ac.getPlace()
      if (!place || !place.address_components) return
      const get = (type) => {
        const c = place.address_components.find((x) => x.types.includes(type))
        return c ? c.long_name : ''
      }
      onPlace({
        formatted: place.formatted_address || '',
        streetNumber: get('street_number'),
        route: get('route'),
        city: get('locality') || get('sublocality') || '',
        state: get('administrative_area_level_1'),
        zip: get('postal_code'),
        country: get('country'),
      })
    })
    return () => listener.remove()
  } catch {
    return () => {}
  }
}
