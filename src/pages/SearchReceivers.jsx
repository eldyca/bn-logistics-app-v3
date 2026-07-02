import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useOrders } from '../context/OrdersContext'
import OrderCard from '../components/OrderCard'

export default function SearchReceivers() {
  const { t } = useTranslation()
  const { orders, deleteOrder } = useOrders()
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [province, setProvince] = useState('')
  const [result, setResult] = useState(null)

  function doSearch() {
    const p = phone.trim().toLowerCase(), n = name.trim().toLowerCase(), pr = province.trim().toLowerCase()
    setResult(orders.filter((o) => {
      const bk = o.bank || {}
      const phHit = !p || o.ben.phone.toLowerCase().includes(p) || (bk.account || '').toLowerCase().includes(p)
      const region = (o.ben.state || o.ben.province || '').toLowerCase()
      return phHit &&
        (!n || (o.ben.first + ' ' + o.ben.last).toLowerCase().includes(n)) &&
        (!pr || region.includes(pr) || (bk.name || '').toLowerCase().includes(pr))
    }))
  }

  return (
    <>
      <div className="viewtitle">{t('searchPages.receiversTitle')}</div>
      <div className="viewsub">{t('searchPages.receiversSub')}</div>
      <div className="panel">
        <div className="phead">{t('search.title')}</div>
        <div className="pbody">
          <div className="field"><label>{t('search.phoneOrAccount')}</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <div className="grid">
            <div className="field tight"><label>{t('search.name')}</label>
              <input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="field tight"><label>{t('search.province')}</label>
              <input value={province} onChange={(e) => setProvince(e.target.value)} /></div>
          </div>
          <button className="searchbtn" style={{ marginTop: 14 }} onClick={doSearch}>🔍 {t('search.button')}</button>
        </div>
      </div>
      <div className="toolbar"><h3>{t('search.results')}</h3></div>
      <div className="list">
        {result === null ? <div className="empty">{t('search.enterAndSearch')}</div>
          : result.length === 0 ? <div className="empty">{t('search.noReceivers')}</div>
          : result.map((o) => <OrderCard key={o.id} order={o} onDelete={deleteOrder} />)}
      </div>
    </>
  )
}
