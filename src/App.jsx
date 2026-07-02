import { useState } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { OrdersProvider } from './context/OrdersContext'
import TopBar from './components/TopBar'
import SideMenu from './components/SideMenu'

import Login from './pages/Login'
import Onboarding from './pages/Onboarding'
import Home from './pages/Home'
import CreateOrder from './pages/CreateOrder'
import SearchOrders from './pages/SearchOrders'
import SearchSenders from './pages/SearchSenders'
import SearchReceivers from './pages/SearchReceivers'
import OrderStatus from './pages/OrderStatus'
import ReportSummary from './pages/ReportSummary'
import ReportDetail from './pages/ReportDetail'
import ReportActivities from './pages/ReportActivities'
import ReportStatement from './pages/ReportStatement'
import Company from './pages/Company'
import Settings from './pages/Settings'
import Receipt from './pages/Receipt'

function Shell() {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <>
      <header className="appbar">
        <TopBar onToggleMenu={() => setMenuOpen((v) => !v)} />
        <SideMenu open={menuOpen} onNavigate={() => setMenuOpen(false)} />
      </header>
      <div className="content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/create" element={<CreateOrder />} />
          <Route path="/edit/:id" element={<CreateOrder />} />
          <Route path="/receipt/:id" element={<Receipt />} />
          <Route path="/search-orders" element={<SearchOrders />} />
          <Route path="/search-senders" element={<SearchSenders />} />
          <Route path="/search-receivers" element={<SearchReceivers />} />
          <Route path="/order-status" element={<OrderStatus />} />
          <Route path="/reports/summary" element={<ReportSummary />} />
          <Route path="/reports/detail" element={<ReportDetail />} />
          <Route path="/reports/activities" element={<ReportActivities />} />
          <Route path="/reports/statement" element={<ReportStatement />} />
          <Route path="/company" element={<Company />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </div>
    </>
  )
}

function Gate() {
  const { session, loading, membership, memberLoading } = useAuth()
  const location = useLocation()

  if (location.pathname === '/login' && !session) return <Login />
  if (loading) return <div className="empty" style={{ margin: 40 }}>Loading…</div>
  if (!session) return <Login />
  if (memberLoading) return <div className="empty" style={{ margin: 40 }}>Loading…</div>
  if (!membership) return <Onboarding />

  return (
    <OrdersProvider>
      <Shell />
    </OrdersProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}
