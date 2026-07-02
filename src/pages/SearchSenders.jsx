import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useOrders } from '../context/OrdersContext'
import OrderCard from '../components/OrderCard'

export default function SearchSenders() {
  const { t } = useTranslation()
  const { orders, deleteOrder } = useOrders()
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [result, setResult] = useState(null)

  function doSearch() {
    const p = phone.trim().toLowerCase(), n = name.trim().toLowerCase(), c = city.trim().toLowerCase()
    setResult(orders.filter((o) =>
      (!p || o.sender.phone.toLowerCase().includes(p)) &&
      (!n || (o.sender.first + ' ' + o.sender.last).toLowerCase().includes(n)) &&
      (!c || (o.sender.city || '').toLowerCase().includes(c))
    ))
  }

  return (
    <>
      <div className="viewtitle">{t('searchPages.sendersTitle')}</div>
      <div className="viewsub">{t('searchPages.sendersSub')}</div>
      <div className="panel">
        <div className="phead">{t('search.title')}</div>
        <div className="pbody">
          <div className="field"><label>{t('search.phone')}</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <div className="grid">
            <div className="field tight"><label>{t('search.name')}</label>
              <input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="field tight"><label>{t('search.city')}</label>
              <input value={city} onChange={(e) => setCity(e.target.value)} /></div>
          </div>
          <button className="searchbtn" style={{ marginTop: 14 }} onClick={doSearch}>🔍 {t('search.button')}</button>
        </div>
      </div>
      <div className="toolbar"><h3>{t('search.results')}</h3></div>
      <div className="list">
        {result === null ? <div className="empty">{t('search.enterAndSearch')}</div>
          : result.length === 0 ? <div className="empty">{t('search.noSenders')}</div>
          : result.map((o) => <OrderCard key={o.id} order={o} onDelete={deleteOrder} />)}
      </div>
    </>
  )
}
