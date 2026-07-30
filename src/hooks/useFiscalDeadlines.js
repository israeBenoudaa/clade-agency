import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const TABLE = 'fiscal_deadlines'
const LS_KEY = 'clade_fiscal_deadlines'

function uid() { return `fd_${Date.now()}_${Math.random().toString(36).slice(2, 7)}` }

function addMonths(dateStr, n) {
  const d = new Date(dateStr)
  d.setMonth(d.getMonth() + n)
  return d.toISOString().slice(0, 10)
}

function generateOccurrences(base) {
  const { recurrence, due_date, series_id, ...rest } = base
  const now = new Date().toISOString()
  if (!recurrence || recurrence === 'none') {
    return [{ ...rest, id: uid(), due_date, recurrence: 'none', series_id: null, status: 'pending', created_at: now }]
  }
  const step  = recurrence === 'monthly' ? 1 : recurrence === 'quarterly' ? 3 : 12
  const count = recurrence === 'monthly' ? 12 : recurrence === 'quarterly' ? 8 : 3
  return Array.from({ length: count }, (_, i) => ({
    ...rest,
    id: uid(),
    due_date: addMonths(due_date, i * step),
    recurrence,
    series_id,
    status: 'pending',
    created_at: now,
  }))
}

export function useFiscalDeadlines() {
  const [deadlines, setDeadlines] = useState(() => {
    try { const s = localStorage.getItem(LS_KEY); return s ? JSON.parse(s) : [] } catch { return [] }
  })
  const [loading, setLoading] = useState(true)

  // Persist to localStorage on every change
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(deadlines)) } catch {}
  }, [deadlines])

  // Load from Supabase — merge avec items locaux non encore synchronisés
  const load = useCallback(async () => {
    const { data, error } = await supabase.from(TABLE).select('*').order('due_date', { ascending: true })
    if (!error && data) {
      setDeadlines(prev => {
        // Garder les items locaux (temp ID) pas encore confirmés par Supabase
        const sbIds = new Set(data.map(d => d.id))
        const pendingLocal = prev.filter(d => d.id?.startsWith('fd_') && !sbIds.has(d.id))
        return sort([...data, ...pendingLocal])
      })
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const sort = arr => [...arr].sort((a, b) => a.due_date.localeCompare(b.due_date))

  const addDeadline = async (fields) => {
    const seriesId = fields.recurrence && fields.recurrence !== 'none' ? `series_${Date.now()}` : null
    const rows = generateOccurrences({ ...fields, series_id: seriesId })
    // Immediate local update
    setDeadlines(prev => sort([...prev, ...rows]))
    // Persist to Supabase
    const { data } = await supabase.from(TABLE).insert(rows.map(({ id, ...r }) => r)).select()
    if (data?.length) {
      // Replace local temp IDs with Supabase UUIDs
      const tempIds = rows.map(r => r.id)
      setDeadlines(prev => sort([...prev.filter(d => !tempIds.includes(d.id)), ...data]))
    }
    return rows
  }

  const updateDeadline = async (id, updates) => {
    setDeadlines(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d))
    const { data } = await supabase.from(TABLE).update(updates).eq('id', id).select()
    if (data?.[0]) setDeadlines(prev => prev.map(d => d.id === id ? data[0] : d))
    return data?.[0]
  }

  const deleteDeadline = async (id) => {
    setDeadlines(prev => prev.filter(d => d.id !== id))
    await supabase.from(TABLE).delete().eq('id', id)
  }

  const deleteSeries = async (seriesId) => {
    setDeadlines(prev => prev.filter(d => !(d.series_id === seriesId && d.status === 'pending')))
    await supabase.from(TABLE).delete().eq('series_id', seriesId).eq('status', 'pending')
  }

  return { deadlines, loading, addDeadline, updateDeadline, deleteDeadline, deleteSeries, reload: load }
}

export function getDeadlineStatus(d) {
  if (d.status === 'paid') return 'paid'
  if (new Date(d.due_date) < new Date(new Date().toISOString().slice(0, 10))) return 'overdue'
  return 'pending'
}

export function getUpcomingAlerts(deadlines) {
  const today = new Date(new Date().toISOString().slice(0, 10))
  const alerts = []
  for (const d of deadlines) {
    if (d.status === 'paid') continue
    const due  = new Date(d.due_date)
    const diff = Math.round((due - today) / 86400000)
    if (diff === 7 || diff === 3 || diff === 1 || diff === 0 || diff < 0) {
      alerts.push({ deadline: d, daysLeft: diff })
    }
  }
  return alerts
}
