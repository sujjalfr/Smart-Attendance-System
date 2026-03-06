import React, { useEffect, useState, useMemo } from 'react'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE;

export default function ChainedSelects({ onChange }) {
  const [allDepartments, setAllDepartments] = useState([])
  const [allBatches, setAllBatches] = useState([])
  const [allClassGroups, setAllClassGroups] = useState([])

  const [deptId, setDeptId] = useState('')
  const [batchId, setBatchId] = useState('')
  const [classGroupId, setClassGroupId] = useState('')

  // Load all options on mount
  useEffect(() => {
    let mounted = true
    
    // Load all departments
    axios.get(`${API_BASE}/api/departments/`)
      .then(r => {
        if (!mounted) return
        setAllDepartments((r.data || []).map(d => ({ ...d, id: String(d.id) })))
      })
      .catch(() => setAllDepartments([]))

    // Load all batches
    axios.get(`${API_BASE}/api/batches/`)
      .then(r => {
        if (!mounted) return
        setAllBatches((r.data || []).map(b => ({ ...b, id: String(b.id) })))
      })
      .catch(() => setAllBatches([]))

    // Load all class groups with department and batch info
    axios.get(`${API_BASE}/api/classgroups/`)
      .then(r => {
        if (!mounted) return
        setAllClassGroups((r.data || []).map(c => ({ 
          ...c, 
          id: String(c.id),
          department_id: String(c.department_id || ''),
          batch_id: String(c.batch_id || '')
        })))
      })
      .catch(() => setAllClassGroups([]))

    return () => { mounted = false }
  }, [])

  // Filter batches based on selected department
  const filteredBatches = useMemo(() => {
    if (!deptId) return allBatches
    
    // Get class groups for this department
    const classesInDept = allClassGroups.filter(c => String(c.department_id) === String(deptId))
    
    // Extract unique batch IDs from those classes
    const batchIds = new Set(classesInDept.map(c => c.batch_id).filter(Boolean))
    
    // Filter batches to only those with classes in this department
    return allBatches.filter(b => batchIds.has(String(b.id)))
  }, [deptId, allBatches, allClassGroups])

  // Filter class groups based on selected department and/or batch
  const filteredClassGroups = useMemo(() => {
    let filtered = allClassGroups
    
    // Filter by department if selected
    if (deptId) {
      filtered = filtered.filter(c => String(c.department_id) === String(deptId))
    }
    
    // Filter by batch if selected
    if (batchId) {
      filtered = filtered.filter(c => String(c.batch_id) === String(batchId))
    }
    
    return filtered
  }, [deptId, batchId, allClassGroups])

  // When department changes, clear batch and class selections
  const handleDeptChange = (e) => {
    setDeptId(e.target.value)
    setBatchId('')
    setClassGroupId('')
  }

  // When batch changes, clear class selection
  const handleBatchChange = (e) => {
    setBatchId(e.target.value)
    setClassGroupId('')
  }

  // Notify parent of filter changes
  useEffect(() => {
    if (onChange) onChange({ deptId, batchId, classGroupId })
  }, [deptId, batchId, classGroupId, onChange])

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <select 
        value={deptId} 
        onChange={handleDeptChange}
        style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #e5e7eb' }}
        title="Select department to filter batches and classes"
      >
        <option value="">All departments</option>
        {allDepartments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
      </select>

      <select 
        value={batchId} 
        onChange={handleBatchChange}
        style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #e5e7eb' }}
        title={deptId ? `Batches in ${allDepartments.find(d => String(d.id) === deptId)?.name || 'selected department'}` : 'All batches'}
      >
        <option value="">All batches</option>
        {filteredBatches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
      </select>

      <select 
        value={classGroupId} 
        onChange={e => setClassGroupId(e.target.value)}
        style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #e5e7eb' }}
        title={deptId || batchId ? 'Classes in selected filters' : 'All classes'}
      >
        <option value="">All classes</option>
        {filteredClassGroups.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
    </div>
  )
}