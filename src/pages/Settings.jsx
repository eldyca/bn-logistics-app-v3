import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { updateCompany, updateCompanyAds, changePassword } from '../lib/supabase'
import { setLanguage } from '../i18n'

export default function Settings() {
  const { t, i18n } = useTranslation()
  const { company, role, user, isSuperAdmin, refreshMembership } = useAuth()
  const canEdit = isSuperAdmin
  const isAdmin = role === 'admin' || isSuperAdmin

  const [form, setForm] = useState({
    name: company?.name || '',
    address: company?.address || '',
    phone: company?.phone || '',
    currency: company?.currency || 'USD',
    receipt_footer: company?.receipt_footer || '',
    logo_url: company?.logo_url || '',
    ad_left: company?.ad_left || '',
    ad_right: company?.ad_right || '',
  })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const [newPass, setNewPass] = useState('')
  const [newPass2, setNewPass2] = useState('')

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  function onLogo(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => set('logo_url', String(reader.result))
    reader.readAsDataURL(file)
  }

  // Upload banner quảng cáo: thu nhỏ về tối đa rộng 320px để nhẹ, lưu data URL
  function onAd(side, e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const maxW = 320
        const scale = Math.min(1, maxW / img.width)
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, w, h)
        let out
        try { out = canvas.toDataURL('image/jpeg', 0.85) } catch { out = String(reader.result) }
        set(side, out)
      }
      img.onerror = () => set(side, String(reader.result))
      img.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  }

  async function save() {
    setMsg(null)
    setBusy(true)
    try {
      await updateCompany({
        name: form.name,
        address: form.address,
        phone: form.phone,
        currency: form.currency,
        receipt_footer: form.receipt_footer,
        logo_url: form.logo_url,
      })
      await refreshMembership()
      setMsg(t('settings.saved'))
    } catch (e) {
      setMsg(e.message || String(e))
    } finally {
      setBusy(false)
    }
  }

  async function saveAds() {
    setMsg(null)
    setBusy(true)
    try {
      await updateCompanyAds(form.ad_left, form.ad_right)
      await refreshMembership()
      setMsg('Đã lưu quảng cáo')
    } catch (e) {
      setMsg(e.message || String(e))
    } finally {
      setBusy(false)
    }
  }

  async function doChangePassword() {
    setMsg(null)
    if (newPass.length < 6) { setMsg('Mật khẩu mới phải từ 6 ký tự'); return }
    if (newPass !== newPass2) { setMsg('Mật khẩu nhập lại không khớp'); return }
    setBusy(true)
    try {
      await changePassword(newPass)
      setNewPass(''); setNewPass2('')
      setMsg('Đã đổi mật khẩu thành công')
    } catch (e) {
      setMsg(e.message || String(e))
    } finally {
      setBusy(false)
    }
  }

  function changeLang(lng) {
    setLanguage(lng)
  }

  return (
    <>
      <div className="viewtitle">{t('settings.title')}</div>
      <div className="viewsub">{t('settings.subtitle')}</div>

      <div className="panel">
        <div className="phead">{t('settings.language')}</div>
        <div className="pbody">
          <div className="btn-row">
            <button
              className={'btn ' + (i18n.language === 'vi' ? 'btn-primary' : 'btn-ghost')}
              onClick={() => changeLang('vi')}
            >
              {t('settings.vietnamese')}
            </button>
            <button
              className={'btn ' + (i18n.language === 'en' ? 'btn-primary' : 'btn-ghost')}
              onClick={() => changeLang('en')}
            >
              {t('settings.english')}
            </button>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="phead">{t('settings.companyInfo')}</div>
        <div className="pbody">
          {!canEdit ? <div className="banner warn">Chỉ super_admin mới được sửa thông tin công ty. Bạn có thể xem nhưng không sửa.</div> : null}
          {msg ? <div className="banner warn">{msg}</div> : null}

          <div className="field"><label>{t('settings.companyName')}</label>
            <input value={form.name} disabled={!canEdit} onChange={(e) => set('name', e.target.value)} /></div>
          <div className="field"><label>{t('settings.address')}</label>
            <input value={form.address} disabled={!canEdit} onChange={(e) => set('address', e.target.value)} /></div>
          <div className="grid">
            <div className="field tight"><label>{t('settings.phone')}</label>
              <input value={form.phone} disabled={!canEdit} onChange={(e) => set('phone', e.target.value)} /></div>
            <div className="field tight"><label>{t('settings.currency')}</label>
              <select value={form.currency} disabled={!canEdit} onChange={(e) => set('currency', e.target.value)}>
                <option>USD</option><option>VND</option><option>EUR</option>
              </select></div>
          </div>

          <div className="field full" style={{ marginTop: 12 }}>
            <label>{t('settings.logo')}</label>
            {form.logo_url ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <img src={form.logo_url} alt="logo" style={{ height: 48, borderRadius: 8 }} />
                {canEdit ? (
                  <button className="export" onClick={() => set('logo_url', '')}>{t('settings.removeLogo')}</button>
                ) : null}
              </div>
            ) : null}
            {canEdit ? <input type="file" accept="image/*" onChange={onLogo} /> : null}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="phead">{t('settings.receiptSettings')}</div>
        <div className="pbody">
          <div className="field full tight">
            <label>{t('settings.receiptFooter')}</label>
            <input value={form.receipt_footer} disabled={!canEdit} onChange={(e) => set('receipt_footer', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="phead">Quảng cáo 2 bên Trang chủ</div>
        <div className="pbody">
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>
            2 banner hiển thị ở lề trái/phải của Trang chủ (chỉ trên màn hình rộng ≥ 1200px;
            không hiển thị khi in). Thiết kế ảnh dọc, <strong>kích thước khuyến nghị 160 × 600 px</strong>
            {' '}(tỉ lệ 4:15), định dạng PNG/JPG. Ảnh sẽ tự thu nhỏ vừa cột rộng 160px.
            {!isAdmin ? <><br />Chỉ admin công ty mới sửa được quảng cáo.</> : null}
          </p>

          <div className="field full" style={{ marginBottom: 16 }}>
            <label>Quảng cáo 1 — bên trái (160 × 600 px)</label>
            {form.ad_left ? (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
                <img src={form.ad_left} alt="ad-left" style={{ width: 80, border: '1px solid var(--line)', borderRadius: 6 }} />
                {isAdmin ? <button className="export" onClick={() => set('ad_left', '')}>Xoá</button> : null}
              </div>
            ) : null}
            {isAdmin ? <input type="file" accept="image/*" onChange={(e) => onAd('ad_left', e)} /> : null}
          </div>

          <div className="field full">
            <label>Quảng cáo 2 — bên phải (160 × 600 px)</label>
            {form.ad_right ? (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
                <img src={form.ad_right} alt="ad-right" style={{ width: 80, border: '1px solid var(--line)', borderRadius: 6 }} />
                {isAdmin ? <button className="export" onClick={() => set('ad_right', '')}>Xoá</button> : null}
              </div>
            ) : null}
            {isAdmin ? <input type="file" accept="image/*" onChange={(e) => onAd('ad_right', e)} /> : null}
          </div>

          {isAdmin ? (
            <button className="searchbtn" style={{ marginTop: 14 }} onClick={saveAds} disabled={busy}>
              {busy ? '…' : 'Lưu quảng cáo'}
            </button>
          ) : null}
        </div>
      </div>

      <div className="panel">
        <div className="phead">Đổi mật khẩu</div>
        <div className="pbody">
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 10 }}>
            Đổi mật khẩu đăng nhập của chính bạn (nên đổi sau lần đăng nhập đầu).
          </p>
          <div className="field tight"><label>Mật khẩu mới (≥ 6 ký tự)</label>
            <input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} placeholder="••••••••" autoComplete="new-password" /></div>
          <div className="field tight"><label>Nhập lại mật khẩu mới</label>
            <input type="password" value={newPass2} onChange={(e) => setNewPass2(e.target.value)} placeholder="••••••••" autoComplete="new-password" /></div>
          <button className="searchbtn" style={{ marginTop: 12 }} onClick={doChangePassword} disabled={busy}>
            {busy ? '…' : 'Đổi mật khẩu'}
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="phead">{t('settings.userPrefs')}</div>
        <div className="pbody">
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>
            {t('settings.loggedInAs')}: <strong style={{ color: 'var(--ink)' }}>{user?.email}</strong>
            {' · '}{t('company.yourRole')}: <strong style={{ color: 'var(--ink)' }}>{role}</strong>
          </div>
        </div>
      </div>

      {canEdit ? (
        <button className="btn btn-primary" onClick={save} disabled={busy} style={{ width: '100%' }}>
          {busy ? t('auth.processing') : t('settings.save')}
        </button>
      ) : null}
    </>
  )
}
