import { useTranslation } from 'react-i18next'
import { useOrders } from '../context/OrdersContext'
import { fmt, fdate } from '../lib/format'
import { exportOrders } from '../lib/exportCsv'

export default function ReportDetail() {
  const { t } = useTranslation()
  const { orders } = useOrders()
  return (
    <>
      <div className="viewtitle">{t('reports.detailTitle')}</div>
      <div className="viewsub">{t('reports.detailSub')}</div>
      <div className="toolbar">
        <h3>{t('reports.allOrders')}</h3>
        <button className="export" onClick={() => exportOrders(orders)}>{t('common.exportExcel')}</button>
      </div>
      {orders.length === 0 ? <div className="empty">{t('reports.noData')}</div> : (
        <div className="tablewrap">
          <table>
            <thead><tr>
              <th>{t('table.code')}</th><th>{t('table.date')}</th><th>{t('table.sender')}</th><th>{t('table.receiver')}</th>
              <th>{t('table.send')}</th><th>{t('table.receive')}</th><th>{t('table.total')}</th><th>{t('table.status')}</th>
            </tr></thead>
            <tbody>
              {orders.map((x) => (
                <tr key={x.id}>
                  <td>{x.code}</td><td>{fdate(x.createdAt)}</td>
                  <td>{x.sender.first} {x.sender.last}</td><td>{x.ben.first} {x.ben.last}</td>
                  <td>{fmt(x.tx.send)}</td><td>{fmt(x.tx.receive)}</td><td>{fmt(x.tx.total)}</td>
                  <td>{t('status.' + x.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
