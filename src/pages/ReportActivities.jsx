import { useTranslation } from 'react-i18next'
import { useOrders } from '../context/OrdersContext'
import { ftime } from '../lib/format'

export default function ReportActivities() {
  const { t } = useTranslation()
  const { acts } = useOrders()
  return (
    <>
      <div className="viewtitle">{t('reports.activitiesTitle')}</div>
      <div className="viewsub">{t('reports.activitiesSub')}</div>
      <div className="actlog">
        {acts.length === 0 ? <div className="empty">{t('reports.noActivity')}</div>
          : acts.map((a, i) => (
            <div className="act" key={i}><span>{a.text}</span><span className="t">{ftime(a.t)}</span></div>
          ))}
      </div>
    </>
  )
}
