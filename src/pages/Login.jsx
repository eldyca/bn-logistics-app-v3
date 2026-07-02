import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { isSupabaseConfigured } from '../lib/supabase'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)

  async function submit() {
    setMsg(null)
    if (!email || !password) {
      setMsg({ type: 'err', text: t('auth.needBoth') })
      return
    }
    setBusy(true)
    try {
      const { error } = await signIn(email, password)
      if (error) throw error
      navigate('/')
    } catch (e) {
      setMsg({ type: 'err', text: e.message || t('auth.loginFailed') })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="mark"><span /></div>
        <h1>{t('auth.login')}</h1>
        <p className="sub">{t('app.title')}</p>

        {!isSupabaseConfigured ? <div className="banner warn">{t('auth.notConfigured')}</div> : null}
        {msg ? <div className={'banner ' + msg.type}>{msg.text}</div> : null}

        <div className="field">
          <label>Email hoặc tên đăng nhập</label>
          <input type="text" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email hoặc username" autoComplete="username" />
        </div>
        <div className="field">
          <label>{t('auth.password')}</label>
          <input
            type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••" autoComplete="current-password"
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </div>

        <button className="btn btn-primary" onClick={submit} disabled={busy}>
          {busy ? t('auth.processing') : t('auth.signIn')}
        </button>

        <p className="switch" style={{ color: 'var(--muted,#777)', fontSize: 13 }}>
          {t('auth.contactAdmin')}
        </p>
      </div>
    </div>
  )
}
