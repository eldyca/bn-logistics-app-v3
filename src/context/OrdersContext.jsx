import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import {
  fetchOrders,
  fetchActivities,
  createOrder as apiCreate,
  updateOrder as apiUpdate,
  deleteOrder as apiDelete,
  setStatus as apiSetStatus,
  clearAll as apiClearAll,
} from '../lib/data'
import { useAuth } from './AuthContext'

const OrdersContext = createContext(null)

export function useOrders() {
  const ctx = useContext(OrdersContext)
  if (!ctx) throw new Error('useOrders must be used within OrdersProvider')
  return ctx
}

export function OrdersProvider({ children }) {
  const { user } = useAuth()
  const [orders, setOrders] = useState([])
  const [acts, setActs] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    if (!user) {
      setOrders([])
      setActs([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [o, a] = await Promise.all([fetchOrders(), fetchActivities()])
      setOrders(o)
      setActs(a)
    } catch (e) {
      console.error(e)
      setError(e.message || 'Lỗi tải dữ liệu')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    refresh()
  }, [refresh])

  const addOrder = useCallback(
    async (data) => {
      const newId = await apiCreate(data)
      await refresh()
      return newId
    },
    [refresh]
  )
  const updateOrder = useCallback(
    async (id, data) => {
      await apiUpdate(id, data)
      await refresh()
    },
    [refresh]
  )
  const deleteOrder = useCallback(
    async (id) => {
      await apiDelete(id)
      await refresh()
    },
    [refresh]
  )
  const setStatus = useCallback(
    async (id, status) => {
      await apiSetStatus(id, status)
      await refresh()
    },
    [refresh]
  )
  const clearAll = useCallback(async () => {
    await apiClearAll()
    await refresh()
  }, [refresh])

  return (
    <OrdersContext.Provider
      value={{
        orders,
        acts,
        loading,
        error,
        refresh,
        addOrder,
        updateOrder,
        deleteOrder,
        setStatus,
        clearAll,
      }}
    >
      {children}
    </OrdersContext.Provider>
  )
}
