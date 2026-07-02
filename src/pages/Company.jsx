import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { useOrders } from '../context/OrdersContext'
import {
  listMembers, listMemberProfiles, adminCreateMember, removeMember,
  setMemberRole, setMemberPermissions, setMemberActive, adminResetMemberPassword,
} from '../lib/supabase'
import { exportOrders } from '../lib/exportCsv'

const PERM_KEYS = [
  'can_create', 'can_edit', 'can_delete', 'can_change_status',
  'can_view_receipt', 'can_manage_customers', 'can_manage_members', 'can_manage_cargo',
]
const DEFAULT_PERMS = {
  can_create: true, can_edit: true, can_delete: false, can_change_status: true,
  can_view_receipt: true, can_manage_customers: true, can_manage_members: false, can_manage_cargo: true,
}

export default function Company() {
  const { t } = useTranslation()
  const { role, company, user } = useAuth()
  const { orders, clearAll } = useOrders()
  const isAdmin = role === 'admin'
  const myId = user?.id

  const [members, setMembers] = useState([])
  const [profiles, setProfiles] = useState({})
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [inviteRole, setInviteRole] = useState('staff')
  const [invitePerms, setInvitePerms] = useState({ ...DEFAULT_PERMS })
  const [creating, setCreating] = useState(false)
  const [msg, setMsg] = useState(null)

  const load = useCallback(async () => {
    try {
      const ms = await listMembers()
      setMembers(ms)
      const profs = await listMemberProfiles(ms.map((m) => m.user_id))
      setProfiles(profs)
    } catch (e) {
      setMsg(e.message || String(e))
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function run(fn) {
    setMsg(null)
    try { await fn(); await load() } catch (e) { setMsg(e.message || String(e)) }
  }

  async function doResetPassword(m) {
    const pw = window.prompt('Đặt mật khẩu tạm mới cho ' + (m.email || m.user_id) + ' (≥ 6 ký tự):')
    if (pw == null) return
    if (pw.length < 6) { setMsg('Mật khẩu phải từ 6 ký tự'); return }
    setMsg(null)
    try {
      await adminResetMemberPassword(m.user_id, pw)
      setMsg('Đã đặt lại mật khẩu cho ' + (m.email || m.user_id) + '. Hãy đưa mật khẩu mới cho nhân viên.')
    } catch (e) {
      setMsg(e.message || String(e))
    }
  }

  async function doCreate() {
    setMsg(null)
    if (!email.trim()) { setMsg('Bắt buộc nhập username hoặc email nhân viên'); return }
    if (!fullName.trim()) { setMsg('Bắt buộc nhập tên nhân viên'); return }
    if (password.length < 6) { setMsg('Mật khẩu khởi tạo phải từ 6 ký tự'); return }
    setCreating(true)
    try {
      await adminCreateMember({ identifier: email.trim(), fullName: fullName.trim(), password, role: inviteRole, perms: invitePerms })
      setEmail(''); setFullName(''); setPassword(''); setInvitePerms({ ...DEFAULT_PERMS })
      setMsg(t('company.created'))
      await load()
    } catch (e) {
      setMsg(e.message || String(e))
    } finally {
      setCreating(false)
    }
  }

  async function handleClear() {
    if (!confirm(t('company.confirmClear'))) return
    try { await clearAll(); alert(t('company.cleared')) } catch (e) { alert(e.message || String(e)) }
  }

  return (
    <>
      <div className="viewtitle">{t('company.title')}</div>
      <div className="viewsub">{t('company.subtitle')}</div>

      {msg ? <div className="banner warn">{msg}</div> : null}

      <div className="panel">
        <div className="phead">{company?.name}</div>
        <div className="pbody">
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>
            {t('company.yourRole')}: <strong style={{ color: 'var(--ink)' }}>{role}</strong>
          </div>
        </div>
      </div>

      {isAdmin ? (
        <div className="panel">
          <div className="phead">{t('company.createMember')}</div>
          <div className="pbody">
            <div className="grid">
              <div className="field tight"><label>Username hoặc email nhân viên</label>
                <input type="text" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="username hoặc staff@email.com" autoComplete="off" /></div>
              <div className="field tight"><label>Tên nhân viên <span className="r">*</span></label>
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nguyễn Văn A" autoComplete="off" /></div>
            </div>
            <div className="field tight" style={{ marginTop: 12 }}><label>Mật khẩu khởi tạo</label>
              <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="≥ 6 ký tự" autoComplete="new-password" /></div>
            <div className="field tight" style={{ marginTop: 12 }}><label>{t('company.role')}</label>
              <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                <option value="staff">{t('company.staff')}</option>
                <option value="admin">{t('company.admin')}</option>
              </select></div>
            <div style={{ marginTop: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600 }}>{t('company.permissions')}</label>
              <div className="perm-grid">
                {PERM_KEYS.map((k) => (
                  <label key={k} className="perm-chk">
                    <input type="checkbox" checked={!!invitePerms[k]}
                      onChange={(e) => setInvitePerms((p) => ({ ...p, [k]: e.target.checked }))} />
                    {t('perm.' + k)}
                  </label>
                ))}
              </div>
            </div>
            <button className="searchbtn" style={{ marginTop: 14 }} onClick={doCreate} disabled={creating}>
              {creating ? '…' : t('company.createAccount')}
            </button>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
              Nhập username (không có @) hoặc email. Admin tự đưa mật khẩu cho nhân viên (không gửi email mời).
            </p>
          </div>
        </div>
      ) : null}

      <div className="panel">
        <div className="phead">{t('company.members')}</div>
        <div className="pbody">
          {members.map((m) => {
            const self = m.user_id === myId
            return (
              <div key={m.id} className="member-row">
                <div className="member-head">
                  <span>
                    {(() => { const p = profiles[m.user_id] || {}; const nm = p.display_name || p.full_name; const u = p.username
                      return <><b>{nm || m.email}</b>{u ? ' · @' + u : (nm ? ' · ' + m.email : '')} </> })()}
                    <span className="pill">{m.role === 'admin' ? t('company.admin') : t('company.staff')}</span>{' '}
                    {!m.active ? <span className="pill" style={{ background: 'var(--out,#c0392b)', color: '#fff' }}>{t('company.locked')}</span> : null}
                  </span>
                  {isAdmin && !self ? (
                    <div className="member-actions">
                      <select value={m.role} onChange={(e) => run(() => setMemberRole(m.user_id, e.target.value))}>
                        <option value="staff">{t('company.staff')}</option>
                        <option value="admin">{t('company.admin')}</option>
                      </select>
                      <button className="mini" onClick={() => run(() => setMemberActive(m.user_id, !m.active))}>
                        {m.active ? t('company.lock') : t('company.unlock')}
                      </button>
                      <button className="mini" onClick={() => doResetPassword(m)}>Đặt lại MK</button>
                      <button className="mini del" onClick={() => { if (confirm(t('company.remove') + '?')) run(() => removeMember(m.user_id)) }}>
                        {t('company.remove')}
                      </button>
                    </div>
                  ) : null}
                </div>
                {isAdmin && !self && m.role !== 'admin' ? (
                  <div className="perm-grid" style={{ marginTop: 6 }}>
                    {PERM_KEYS.map((k) => (
                      <label key={k} className="perm-chk">
                        <input type="checkbox" checked={!!m.perms[k]}
                          onChange={(e) => run(() => setMemberPermissions(m.user_id, { [k]: e.target.checked }))} />
                        {t('perm.' + k)}
                      </label>
                    ))}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>

      <div className="panel">
        <div className="phead">{t('company.data')}</div>
        <div className="pbody">
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>{t('company.dataNote')}</p>
          <div className="btn-row">
            <button className="btn btn-ghost" onClick={() => exportOrders(orders)}>{t('company.exportAll')}</button>
            {isAdmin ? (
              <button className="btn btn-ghost" style={{ color: 'var(--out)' }} onClick={handleClear}>{t('company.clearAll')}</button>
            ) : null}
          </div>
        </div>
      </div>
    </>
  )
}
