import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { useOrders } from '../context/OrdersContext'
import {
  listMembers, listMemberProfiles, adminCreateMember, removeMember,
  setMemberRole, setMemberPermissions, setMemberActive, adminResetMemberPassword,
  updateMemberName,
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
  const [editingUser, setEditingUser] = useState(null) // State cho chỉnh sửa tên
  const [editingName, setEditingName] = useState('') // Tên đang edit

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
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: '12px' }}>
            {t('company.yourRole')}: <strong style={{ color: 'var(--ink)' }}>{role}</strong>
          </div>
          {isAdmin && (
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>
              Tên của bạn: <strong style={{ color: 'var(--ink)' }}>{profiles[myId]?.display_name || profiles[myId]?.full_name || 'Chưa cập nhật'}</strong>
              <button className="mini" onClick={() => { setEditingUser(myId); setEditingName(profiles[myId]?.display_name || profiles[myId]?.full_name || ''); }} style={{ marginLeft: '8px' }}>
                ✏️ Sửa
              </button>
            </div>
          )}
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
          {/* Bảng danh sách thành viên */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ddd', backgroundColor: 'var(--bg-soft,#f9f9f9)' }}>
                <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 600 }}>STT</th>
                <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 600 }}>Tên nhân viên</th>
                <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 600 }}>Username/Email</th>
                <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 600 }}>Vai trò</th>
                <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 600 }}>Trạng thái</th>
                {isAdmin && <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 600 }}>Thao tác</th>}
              </tr>
            </thead>
            <tbody>
              {members.map((m, idx) => {
                const self = m.user_id === myId
                const profile = profiles[m.user_id] || {}
                // Lấy tên nhân viên: display_name → full_name → "Chưa cập nhật tên"
                const employeeName = profile.display_name || profile.full_name || 'Chưa cập nhật tên'
                // Lấy username hoặc email: username → email
                const usernameOrEmail = profile.username ? `@${profile.username}` : (profile.email || '—')
                
                return (
                  <tr key={m.id} style={{ borderBottom: '1px solid #eee', backgroundColor: self ? 'var(--bg-soft,#f9f9f9)' : 'transparent' }}>
                    <td style={{ padding: '10px 8px' }}>
                      <strong>{idx + 1}</strong>
                    </td>
                    <td style={{ padding: '10px 8px' }}>
                      <strong style={{ color: 'var(--ink)' }}>{employeeName}</strong>
                      {!m.active && <span style={{ color: 'var(--out,#c0392b)', fontSize: '11px', marginLeft: '6px' }}>(Bị khóa)</span>}
                    </td>
                    <td style={{ padding: '10px 8px', color: 'var(--muted)' }}>
                      {usernameOrEmail}
                    </td>
                    <td style={{ padding: '10px 8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: m.role === 'admin' ? 'var(--accent,#3498db)' : 'var(--muted)' }}>
                        {m.role === 'admin' ? 'Admin' : 'Nhân viên'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 8px' }}>
                      {m.active ? <span style={{ fontSize: '11px', color: 'green' }}>✓ Hoạt động</span> : <span style={{ fontSize: '11px', color: 'var(--out,#c0392b)' }}>✗ Khóa</span>}
                    </td>
                    {isAdmin && (
                      <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                        {!self ? (
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-start', flexWrap: 'wrap' }}>
                            <button className="mini" onClick={() => { setEditingUser(m.user_id); setEditingName(profile.display_name || profile.full_name || '') }} title="Chỉnh sửa tên">✏️</button>
                            <button className="mini" onClick={() => run(() => setMemberActive(m.user_id, !m.active))} title={m.active ? 'Khóa' : 'Mở khóa'}>
                              {m.active ? '🔒' : '🔓'}
                            </button>
                            <button className="mini" onClick={() => doResetPassword(m)} title="Đặt lại mật khẩu">🔑</button>
                            <button className="mini del" onClick={() => { if (confirm('Xóa ' + employeeName + '?')) run(() => removeMember(m.user_id)) }} title="Xóa">🗑️</button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '11px', color: 'var(--muted)' }}>(Bạn)</span>
                        )}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Quyền cho nhân viên không phải admin */}
          {isAdmin && members.some(m => m.role !== 'admin' && m.user_id !== myId) && (
            <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #ddd' }}>
              <p style={{ fontSize: '12px', fontWeight: 600, marginBottom: '12px' }}>⚙️ Cấp quyền cho Nhân viên:</p>
              {members.map((m) => {
                if (m.role === 'admin' || m.user_id === myId) return null
                const profile = profiles[m.user_id] || {}
                const employeeName = profile.display_name || profile.full_name || 'Chưa cập nhật tên'
                
                return (
                  <div key={m.id} style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #eee' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                      {employeeName}
                    </label>
                    <div className="perm-grid">
                      {PERM_KEYS.map((k) => (
                        <label key={k} className="perm-chk">
                          <input type="checkbox" checked={!!m.perms[k]}
                            onChange={(e) => run(() => setMemberPermissions(m.user_id, { [k]: e.target.checked }))} />
                          {t('perm.' + k)}
                        </label>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
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

      {/* Modal edit tên nhân viên */}
      {editingUser && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: '#fff', padding: '20px', borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)', maxWidth: '400px', width: '90%'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Chỉnh sửa tên nhân viên</h3>
            <div className="field" style={{ marginBottom: '12px' }}>
              <label>Tên nhân viên</label>
              <input 
                type="text" 
                value={editingName} 
                onChange={(e) => setEditingName(e.target.value)}
                placeholder="Nhập tên nhân viên"
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button 
                className="btn btn-ghost" 
                onClick={() => { setEditingUser(null); setEditingName('') }}
              >
                Hủy
              </button>
              <button 
                className="searchbtn" 
                onClick={async () => {
                  if (!editingName.trim()) {
                    setMsg('Tên nhân viên không được để trống')
                    return
                  }
                  try {
                    await updateMemberName(editingUser, editingName.trim(), editingName.trim())
                    setEditingUser(null)
                    setEditingName('')
                    await load()
                    setMsg('Cập nhật tên thành công')
                  } catch (e) {
                    setMsg(e.message || String(e))
                  }
                }}
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
