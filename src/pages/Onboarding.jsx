import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { createCompany, acceptInvitation, pendingInvitesForMe } from '../lib/supabase'

export default function Onboarding() {
  const { t } = useTranslation()
  const { refreshMembership, signOut, user } = useAuth()
  const [name, setName] = useState('')
  const [invites, setInvites] = useState([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  useEffect(() => {
    pendingInvitesForMe().then(setInvites).catch(() => setInvites([]))
  }, [])

  async function doCreate() {
    setErr(null)
    setBusy(true)
    try {
      await createCompany(name)
      await refreshMembership()
    } catch (e) {
      setErr(e.message || String(e))
    } finally {
      setBusy(false)
    }
  }

  async function doJoin() {
    setErr(null)
    setBusy(true)
    try {
      await acceptInvitation()
      await refreshMembership()
    } catch (e) {
      setErr(e.message || String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="mark"><span /></div>
        <h1>{t('onboarding.title')}</h1>
        <p className="sub">{t('onboarding.subtitle')}</p>

        {err ? <div className="banner err">{err}</div> : null}

        {invites.length > 0 ? (
          <div className="banner warn" style={{ display: 'block' }}>
            <strong>{t('onboarding.pendingInvite')}:</strong>{' '}
            {invites[0].company?.name}
            <button className="btn btn-primary" style={{ marginTop: 10 }} onClick={doJoin} disabled={busy}>
              {t('onboarding.join')}
            </button>
          </div>
        ) : null}

        <div className="field" style={{ marginTop: 8 }}>
          <label>{t('onboarding.companyName')}</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ABC Money Transfer" />
        </div>
        <button className="btn btn-primary" onClick={doCreate} disabled={busy}>
          {busy ? t('auth.processing') : t('onboarding.createCompany')}
        </button>

        <div className="switch">
          {user?.email} ·{' '}
          <button onClick={() => signOut()}>{t('auth.logout')}</button>
        </div>
      </div>
    </div>
  )
}
