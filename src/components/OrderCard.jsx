import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { fmt, fdate, STATUS_KEYS } from '../lib/format'

export default function OrderCard({ order: x, showStatusSelect, onSetStatus, onDelete }) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const bank = x.bank || {}
  const hasBank = bank.name || bank.account

  return (
    <div className="rec">
      <div className="r1">
        <div>
          <div className="code">{x.code}</div>
          <div className="names">
            {x.sender.first} {x.sender.last}
            <span className="arrow">→</span>
            {x.ben.first} {x.ben.last}
          </div>
        </div>
        <div className="total">{fmt(x.tx.total)}</div>
      </div>

      <div className="r2">
        <span>{t('receipt.amount')} {fmt(x.tx.send)} @ {fmt(x.tx.rate)}</span>
        <span>{t('table.receive')} {fmt(x.tx.receive)}</span>
        {x.ben.state || x.ben.province ? <span className="pill">{x.ben.state || x.ben.province}</span> : null}
        <span>{fdate(x.createdAt)}</span>
        <span className={'badge b-' + x.status}>{t('status.' + x.status)}</span>
      </div>

      {hasBank ? (
        <div className="r2 bank">
          🏦 <span>{bank.name}</span>
          {bank.account ? <span>STK: <strong>{bank.account}</strong></span> : null}
          {bank.holder ? <span>CTK: {bank.holder}</span> : null}
        </div>
      ) : null}

      <div className="r3">
        {showStatusSelect ? (
          <select className="statussel" value={x.status} onChange={(e) => onSetStatus?.(x.id, e.target.value)}>
            {STATUS_KEYS.map((k) => (
              <option key={k} value={k}>{t('status.' + k)}</option>
            ))}
          </select>
        ) : null}
        <button className="mini" onClick={() => navigate('/receipt/' + x.id)}>{t('receipt.view')}</button>
        <button className="mini" onClick={() => navigate('/edit/' + x.id)}>{t('common.edit')}</button>
        <button className="mini del" onClick={() => onDelete?.(x.id)}>{t('common.delete')}</button>
      </div>
    </div>
  )
}
