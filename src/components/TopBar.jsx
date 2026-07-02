import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'

export default function TopBar({ onToggleMenu }) {
  const { signOut, company } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <div className="topbar">
      <div className="brand">
        {company?.name || t('app.title')}
        <small>{t('app.subtitle')}</small>
      </div>
      <div className="icons">
        <button className="iconbtn" title={t('nav.settings')} onClick={() => navigate('/settings')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
          </svg>
        </button>
        <button className="iconbtn" title={t('auth.logout')} onClick={() => signOut()}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M16 17l5-5-5-5M21 12H9M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          </svg>
        </button>
        <button className="iconbtn" title="Menu" onClick={onToggleMenu}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      </div>
    </div>
  )
}
