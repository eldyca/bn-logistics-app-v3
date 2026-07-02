import { useTranslation } from 'react-i18next'
import { useOrders } from '../context/OrdersContext'
import { fmt } from '../lib/format'
import { exportStatement } from '../lib/exportCsv'

export default function ReportStatement() {
  const { t } = useTranslation()
  const { orders } = useOrders()
  const f = (k) => orders.reduce((s, x) => s + x.tx[k], 0)
  const rows = [
    [t('home.totalSend'), f('send')],
    [t('reports.totalReceive'), f('receive')],
    [t('order.fee'), f('fee')],
    [t('order.tax'), f('tax')],
    [t('order.total'), f('total')],
  ]
  return (
    <>
      <div className="viewtitle">{t('reports.statementTitle')}</div>
      <div className="viewsub">{t('reports.statementSub')}</div>
      <div className="panel">
        <div className="phead">{t('reports.statementTitle')}</div>
        <div className="pbody">
          {rows.map((r, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: i === rows.length - 1 ? 'none' : '1px solid var(--line)', fontWeight: i === rows.length - 1 ? 700 : 400 }}>
              <span>{r[0]}</span><span>{fmt(r[1])}</span>
            </div>
          ))}
        </div>
      </div>
      <button className="export" onClick={() => exportStatement(orders)}>{t('common.exportExcel')}</button>
    </>
  )
}
