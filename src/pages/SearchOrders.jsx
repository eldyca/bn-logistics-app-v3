import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useOrders } from '../context/OrdersContext'
import OrderCard from '../components/OrderCard'
import { exportOrders } from '../lib/exportCsv'
import { STATUS_KEYS } from '../lib/format'

export default function SearchOrders() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { orders, deleteOrder } = useOrders()
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [status, setStatus] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [result, setResult] = useState(null)

  const list = result ?? orders

  function doSearch() {
    const p = phone.trim().toLowerCase()
    const n = name.trim().toLowerCase()
    const c = code.trim().toLowerCase()
    const fromT = from ? new Date(from).getTime() : null
    const toT = to ? new Date(to).getTime() + 86400000 : null
    setResult(
      orders.filter((o) => {
        const ph = (o.sender.phone + ' ' + o.ben.phone).toLowerCase()
        const nm = (o.sender.first + ' ' + o.sender.last + ' ' + o.ben.first + ' ' + o.ben.last).toLowerCase()
        return (
          (!p || ph.includes(p)) &&
          (!n || nm.includes(n)) &&
          (!c || o.code.toLowerCase().includes(c)) &&
          (!status || o.status === status) &&
          (!fromT || o.createdAt >= fromT) &&
          (!toT || o.createdAt <= toT)
        )
      })
    )
  }

  return (
    <>
      <div className="viewtitle">{t('searchPages.ordersTitle')}</div>
      <div className="viewsub">{t('searchPages.ordersSub')}</div>

      <div className="panel">
        <div className="phead">{t('search.title')}</div>
        <div className="pbody">
          <div className="grid">
            <div className="field tight"><label>{t('search.phone')}</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
            <div className="field tight"><label>{t('search.name')}</label>
              <input value={name} onChange={(e) => setName(e.target.value)} /></div>
          </div>
          <div className="grid" style={{ marginTop: 12 }}>
            <div className="field tight"><label>{t('search.transactionNo')}</label>
              <input value={code} onChange={(e) => setCode(e.target.value)} /></div>
            <div className="field tight"><label>{t('search.status')}</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">{t('search.all')}</option>
                {STATUS_KEYS.map((k) => <option key={k} value={k}>{t('status.' + k)}</option>)}
              </select></div>
          </div>
          <div className="grid" style={{ marginTop: 12 }}>
            <div className="field tight"><label>{t('search.fromDate')}</label>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
            <div className="field tight"><label>{t('search.toDate')}</label>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          </div>
          <button className="searchbtn" style={{ marginTop: 14 }} onClick={doSearch}>🔍 {t('search.button')}</button>
        </div>
      </div>

      <div className="toolbar">
        <h3>{t('search.results')} ({list.length})</h3>
        <button className="export" onClick={() => exportOrders(orders)}>{t('common.exportExcel')}</button>
      </div>
      <div className="list">
        {list.length === 0 ? (
          <div className="empty">{t('search.noOrders')} <a onClick={() => navigate('/create')}>{t('nav.createOrder')}</a></div>
        ) : (
          list.map((o) => <OrderCard key={o.id} order={o} onDelete={deleteOrder} />)
        )}
      </div>
    </>
  )
}
