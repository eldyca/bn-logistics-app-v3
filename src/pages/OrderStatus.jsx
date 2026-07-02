import { useTranslation } from 'react-i18next'
import { useOrders } from '../context/OrdersContext'
import OrderCard from '../components/OrderCard'

export default function OrderStatus() {
  const { t } = useTranslation()
  const { orders, setStatus, deleteOrder } = useOrders()
  return (
    <>
      <div className="viewtitle">{t('orderStatusPage.title')}</div>
      <div className="viewsub">{t('orderStatusPage.subtitle')}</div>
      <div className="list">
        {orders.length === 0 ? (
          <div className="empty">{t('search.noOrders')}</div>
        ) : (
          orders.map((o) => (
            <OrderCard key={o.id} order={o} showStatusSelect onSetStatus={setStatus} onDelete={deleteOrder} />
          ))
        )}
      </div>
    </>
  )
}
