import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function SideMenu({ open, onNavigate }) {
  const { t } = useTranslation()
  const GROUPS = [
    {
      icon: '📄', title: t('nav.orders'), open: true,
      items: [
        { to: '/create', label: t('nav.createOrder') },
        { to: '/search-senders', label: t('nav.searchSenders') },
        { to: '/search-receivers', label: t('nav.searchReceivers') },
        { to: '/search-orders', label: t('nav.searchOrders') },
        { to: '/order-status', label: t('nav.orderStatus') },
      ],
    },
    {
      icon: '📊', title: t('nav.reports'),
      items: [
        { to: '/reports/summary', label: t('nav.summary') },
        { to: '/reports/detail', label: t('nav.detail') },
        { to: '/reports/activities', label: t('nav.activities') },
        { to: '/reports/statement', label: t('nav.statement') },
      ],
    },
    {
      icon: '🔧', title: t('nav.admin'),
      items: [
        { to: '/company', label: t('nav.company') },
        { to: '/settings', label: t('nav.settings') },
      ],
    },
  ]
  const [openGroups, setOpenGroups] = useState(() => GROUPS.map((g) => !!g.open))
  const toggle = (i) => setOpenGroups((p) => p.map((v, idx) => (idx === i ? !v : v)))

  return (
    <nav className={'menu' + (open ? ' open' : '')}>
      <NavLink to="/" className="single" onClick={onNavigate} end>
        🏠&nbsp; {t('nav.home')}
      </NavLink>
      {GROUPS.map((g, i) => (
        <div key={g.title} className={'grp' + (openGroups[i] ? ' open' : '')}>
          <button onClick={() => toggle(i)}>
            <span className="ico">{g.icon}</span> {g.title} <span className="chev">▼</span>
          </button>
          <div className="sub">
            {g.items.map((it) => (
              <NavLink
                key={it.to}
                to={it.to}
                onClick={onNavigate}
                className={({ isActive }) => (isActive ? 'active' : '')}
              >
                {it.label}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  )
}
