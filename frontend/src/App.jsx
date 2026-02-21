import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'
import {
  createTutorial,
  deleteAllTutorials,
  deleteTutorial,
  listPublishedTutorials,
  listTutorials,
  toErrorMessage,
  updateTutorial,
} from './services/tutorialApi'

const emptyForm = {
  title: '',
  description: '',
  published: false,
}

function App() {
  const [tutorials, setTutorials] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [createForm, setCreateForm] = useState(emptyForm)
  const [editForm, setEditForm] = useState(emptyForm)
  const [searchTerm, setSearchTerm] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [showPublishedOnly, setShowPublishedOnly] = useState(false)
  const [loading, setLoading] = useState(false)
  const [pendingAction, setPendingAction] = useState('')
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')

  const selectedTutorial = useMemo(
    () => tutorials.find((tutorial) => tutorial.id === selectedId) ?? null,
    [selectedId, tutorials],
  )

  const loadTutorials = useCallback(async () => {
    setLoading(true)
    try {
      const data = showPublishedOnly
        ? await listPublishedTutorials()
        : await listTutorials(appliedSearch || undefined)

      setTutorials(Array.isArray(data) ? data : [])
      setError('')
    } catch (err) {
      setError(toErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [appliedSearch, showPublishedOnly])

  useEffect(() => {
    loadTutorials()
  }, [loadTutorials])

  useEffect(() => {
    if (!selectedId) return
    if (!tutorials.some((tutorial) => tutorial.id === selectedId)) {
      setSelectedId(null)
      setEditForm(emptyForm)
    }
  }, [selectedId, tutorials])

  useEffect(() => {
    if (selectedTutorial) {
      setEditForm({
        title: selectedTutorial.title ?? '',
        description: selectedTutorial.description ?? '',
        published: !!selectedTutorial.published,
      })
    }
  }, [selectedTutorial])

  const handleSearchSubmit = (event) => {
    event.preventDefault()
    setAppliedSearch(searchTerm.trim())
  }

  const handleClearFilters = () => {
    setSearchTerm('')
    setAppliedSearch('')
    if (showPublishedOnly) {
      setShowPublishedOnly(false)
    } else {
      loadTutorials()
    }
  }

  const handleCreateChange = (event) => {
    const { name, value, type, checked } = event.target
    setCreateForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleEditChange = (event) => {
    const { name, value, type, checked } = event.target
    setEditForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const runAction = async (name, callback) => {
    setPendingAction(name)
    try {
      await callback()
    } finally {
      setPendingAction('')
    }
  }

  const handleCreate = async (event) => {
    event.preventDefault()
    if (!createForm.title.trim()) {
      setError('A title is required to create a tutorial.')
      return
    }

    await runAction('create', async () => {
      try {
        await createTutorial({
          ...createForm,
          title: createForm.title.trim(),
          description: createForm.description.trim(),
        })
        setCreateForm(emptyForm)
        setStatus('Tutorial created successfully.')
        setError('')
        await loadTutorials()
      } catch (err) {
        setError(toErrorMessage(err))
      }
    })
  }

  const handleUpdate = async (event) => {
    event.preventDefault()
    if (!selectedId) return
    if (!editForm.title.trim()) {
      setError('A title is required to update a tutorial.')
      return
    }

    await runAction('update', async () => {
      try {
        await updateTutorial(selectedId, {
          ...editForm,
          title: editForm.title.trim(),
          description: editForm.description.trim(),
        })
        setStatus('Tutorial updated.')
        setError('')
        await loadTutorials()
      } catch (err) {
        setError(toErrorMessage(err))
      }
    })
  }

  const handleDelete = async () => {
    if (!selectedId) return
    const confirmed = window.confirm(
      'Delete this tutorial? This cannot be undone.',
    )
    if (!confirmed) return

    await runAction('delete', async () => {
      try {
        await deleteTutorial(selectedId)
        setStatus('Tutorial deleted.')
        setError('')
        setSelectedId(null)
        setEditForm(emptyForm)
        await loadTutorials()
      } catch (err) {
        setError(toErrorMessage(err))
      }
    })
  }

  const handleDeleteAll = async () => {
    if (!tutorials.length) return
    const confirmed = window.confirm(
      'Delete every tutorial in the database? This action is permanent.',
    )
    if (!confirmed) return

    await runAction('deleteAll', async () => {
      try {
        await deleteAllTutorials()
        setStatus('All tutorials were deleted.')
        setError('')
        setSelectedId(null)
        setEditForm(emptyForm)
        await loadTutorials()
      } catch (err) {
        setError(toErrorMessage(err))
      }
    })
  }

  const handleRefresh = () => {
    loadTutorials()
  }

  const handleTogglePublished = (event) => {
    setShowPublishedOnly(event.target.checked)
  }

  const isBusy = (name) => pendingAction === name

  const resultCountCopy = showPublishedOnly
    ? `Published tutorials (${tutorials.length})`
    : appliedSearch
      ? `Results for "${appliedSearch}" (${tutorials.length})`
      : `All tutorials (${tutorials.length})`

  return (
    <div className="app-shell" style={{ background: "#f1f5f9" }}>
      <header className="app-header">
        <div>
          <p className="eyebrow">Node + Express + MySQL</p>
          <h1>Tutorial Dashboard</h1>
          <p style={{color:"#16a34a", fontWeight:"600"}}>CI/CD Live Deploy ✅</p>
          <p className="lede">
            Manage the tutorials created by your backend API with a clean,
            responsive React interface.
          </p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="ghost"
            onClick={handleDeleteAll}
            disabled={!tutorials.length || isBusy('deleteAll')}
          >
            {isBusy('deleteAll') ? 'Clearing...' : 'Delete All'}
          </button>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </header>

      <div className="feedback-row">
        <span className="status-chip muted">{resultCountCopy}</span>
        {status && <span className="status-chip success">{status}</span>}
        {error && <span className="status-chip error">{error}</span>}
      </div>

      {/* rest of your file remains unchanged */}
    </div>
  )
}

export default App