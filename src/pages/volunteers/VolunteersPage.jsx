import { useState, useEffect, useCallback } from 'react'
import { Star, CheckSquare, Plus, X, ClipboardList } from 'lucide-react'
import { VolunteersAPI, VolunteerTasksAPI } from '../../api/adminApis'
import { Skeleton, ApiError, useToast } from '../../hooks/useFetch.jsx'
import { confirmDialog } from '../../utils/sweetAlert'

const EMPTY_TASK = { title: '', description: '', deadline: '', volunteerId: '' }

export default function VolunteersPage() {
  const { show, Toast } = useToast()
  const [tab, setTab] = useState('volunteers')
  const [items, setItems] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showTask, setShowTask] = useState(false)
  const [taskForm, setTaskForm] = useState(EMPTY_TASK)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      if (tab === 'tasks') {
        const res = await VolunteerTasksAPI.getAll({ page: 1, limit: 50 })
        const data = res?.data ?? res
        setTasks(Array.isArray(data?.tasks ?? data) ? (data?.tasks ?? data) : [])
      } else {
        const res = await VolunteersAPI.getAll({ page: 1, limit: 50 })
        const data = res?.data ?? res
        setItems(Array.isArray(data?.volunteers ?? data) ? (data?.volunteers ?? data) : [])
      }
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [tab])

  useEffect(() => { load() }, [load])

  const handleCreateTask = async () => {
    if (!taskForm.title.trim()) { show('Title required', 'error'); return }
    setSaving(true)
    try { await VolunteerTasksAPI.create(taskForm); show('Task assigned!'); setShowTask(false); setTaskForm(EMPTY_TASK); load() }
    catch (e) { show(e.message, 'error') }
    finally { setSaving(false) }
  }
  const handleRemoveVolunteer = async (id) => {
    const confirmed = await confirmDialog({
      title: 'Remove Volunteer?',
      text: 'Are you sure you want to remove this volunteer?',
      confirmButtonText: 'Yes, Remove',
    })
    if (!confirmed) return
    try { await VolunteersAPI.remove(id); show('Removed!'); load() } catch (e) { show(e.message, 'error') }
  }
  const handleUpdateVolunteer = async (id, data) => {
    try { await VolunteersAPI.update(id, data); show('Updated!'); load() } catch (e) { show(e.message, 'error') }
  }
  const handleRemoveTask = async (id) => {
    const confirmed = await confirmDialog({
      title: 'Delete Task?',
      text: 'Are you sure you want to delete this volunteer task?',
      confirmButtonText: 'Yes, Delete',
    })
    if (!confirmed) return
    try { await VolunteerTasksAPI.remove(id); show('Task deleted!'); load() } catch (e) { show(e.message, 'error') }
  }

  const filteredItems = tab === 'applications'
    ? items.filter(v => v.status === 'pending')
    : items.filter(v => v.status !== 'pending')

  return (
    <div className="space-y-4">
      <Toast />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-900">Volunteers</h1>
          <p className="text-xs text-gray-400">{items.length} total</p>
        </div>
        {tab === 'tasks' && (
          <button onClick={() => setShowTask(true)} className="btn-primary flex items-center gap-1.5 px-4 py-2.5 text-sm">
            <Plus className="w-4 h-4" />Assign Task
          </button>
        )}
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl w-fit">
        {['volunteers', 'applications', 'tasks'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl capitalize transition-all ${tab === t ? 'text-white shadow-sm' : 'text-gray-500'}`}
            style={tab === t ? { background: 'var(--primary)' } : {}}>{t}</button>
        ))}
      </div>

      {/* Task Form */}
      {showTask && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center">
          <div className="bg-white rounded-t-3xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <h2 className="text-base font-bold">Assign Task</h2>
              <button onClick={() => setShowTask(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="overflow-y-auto p-5 space-y-3">
              {[['title', 'Task Title'], ['description', 'Description'], ['deadline', 'Deadline']].map(([k, label]) => (
                <div key={k}>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">{label}</label>
                  <input type={k === 'deadline' ? 'date' : 'text'} value={taskForm[k]} onChange={e => setTaskForm({ ...taskForm, [k]: e.target.value })}
                    className="w-full border border-gray-200 rounded-2xl px-4 h-11 text-sm outline-none focus:border-[var(--primary)]" />
                </div>
              ))}
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Assign To</label>
                <select value={taskForm.volunteerId} onChange={e => setTaskForm({ ...taskForm, volunteerId: e.target.value })}
                  className="w-full border border-gray-200 rounded-2xl px-4 h-11 text-sm outline-none">
                  <option value="">Select Volunteer</option>
                  {filteredItems.map(v => <option key={v._id} value={v._id}>{v.user?.name || v.name || v._id}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100 shrink-0">
              <button onClick={handleCreateTask} disabled={saving} className="btn-primary flex-1 h-11 text-sm disabled:opacity-70">{saving ? 'Assigning...' : 'Assign'}</button>
              <button onClick={() => setShowTask(false)} className="flex-1 h-11 border border-gray-200 text-sm font-bold rounded-2xl">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {loading ? <Skeleton rows={5} /> : error ? <ApiError message={error} onRetry={load} /> : (
        <>
          {tab !== 'tasks' && (
            <div className="space-y-2.5">
              {filteredItems.map(v => (
                <div key={v._id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-black text-base shrink-0"
                    style={{ background: 'var(--primary)' }}>
                    {(v.user?.name || v.name || 'V')[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800">{v.user?.name || v.name || '—'}</p>
                    <p className="text-[10px] text-gray-400">{v.user?.mobile || '—'} · {v.area?.name || v.role || '—'}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${v.status === 'active' ? 'bg-green-100 text-green-700' : v.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>
                      {v.status || 'active'}
                    </span>
                    <button onClick={() => handleRemoveVolunteer(v._id)} className="text-[10px] font-bold text-red-400 bg-red-50 px-2 py-1 rounded-lg">Remove</button>
                  </div>
                </div>
              ))}
              {filteredItems.length === 0 && (
                <div className="bg-white rounded-2xl p-10 text-center border border-gray-100 flex flex-col items-center">
                  <Star className="w-10 h-10 text-gray-300 mb-2" />
                  <p className="text-sm text-gray-400">No {tab} found</p>
                </div>
              )}
            </div>
          )}

          {tab === 'tasks' && (
            <div className="space-y-2.5">
              {tasks.map(t => (
                <div key={t._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'var(--primary-light)' }}><CheckSquare className="w-5 h-5 text-[var(--primary)]" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800 truncate">{t.title}</p>
                    <p className="text-[10px] text-gray-400">{t.volunteer?.user?.name || '—'} · {t.deadline ? new Date(t.deadline).toLocaleDateString('en-IN') : '—'}</p>
                  </div>
                  <select value={t.status || 'pending'} onChange={e => VolunteerTasksAPI.updateStatus(t._id, e.target.value).then(() => { show('Updated!'); load() }).catch(e => show(e.message, 'error'))}
                    className="text-[10px] font-bold border border-gray-200 rounded-xl px-2 py-1 outline-none bg-white shrink-0">
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                  <button onClick={() => handleRemoveTask(t._id)} className="text-[10px] font-bold text-red-400 bg-red-50 px-2 py-1 rounded-lg shrink-0">Del</button>
                </div>
              ))}
              {tasks.length === 0 && (
                <div className="bg-white rounded-2xl p-10 text-center border border-gray-100 flex flex-col items-center">
                  <ClipboardList className="w-10 h-10 text-gray-300 mb-2" />
                  <p className="text-sm text-gray-400">No tasks yet</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

