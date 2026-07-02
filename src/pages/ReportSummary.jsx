import { useTranslation } from 'react-i18next'
import { useOrders } from '../context/OrdersContext'
import { fmt, STATUS_KEYS } from '../lib/format'
import Stat from '../components/Stat'

export default function ReportSummary() {
  const { t } = useTranslation()
  const { orders } = useOrders()
  const send = orders.reduce((s, x) => s + x.tx.send, 0)
  const receive = orders.reduce((s, x) => s + x.tx.receive, 0)
  const fee = orders.reduce((s, x) => s + x.tx.fee + x.tx.tax, 0)
  return (
    <>
      <div className="viewtitle">{t('reports.summaryTitle')}</div>
      <div className="viewsub">{t('reports.summarySub')}</div>
      <div className="stats">
        <Stat label={t('home.totalOrders')} value={orders.length} />
        <Stat label={t('home.totalSend')} value={fmt(send)} />
        <Stat label={t('reports.totalReceive')} value={fmt(receive)} />
        <Stat label={t('home.totalFee')} value={fmt(fee)} />
      </div>
      <div className="panel">
        <div className="phead">{t('reports.byStatus')}</div>
        <div className="pbody">
          {STATUS_KEYS.map((k) => {
            const c = orders.filter((o) => o.status === k).length
            return (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--line)' }}>
                <span className={'badge b-' + k}>{t('status.' + k)}</span>
                <strong>{c} {t('reports.ordersWord')}</strong>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
