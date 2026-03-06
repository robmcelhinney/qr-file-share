import React, { useEffect, useState } from 'react'
import axios from 'axios'
import Dropzone from 'react-dropzone'
import iconArchive from '../assets/icons/icon-archive.svg'
import iconCode from '../assets/icons/icon-code.svg'
import iconDownload from '../assets/icons/icon-download.svg'
import iconFile from '../assets/icons/icon-file.svg'
import iconFileBlank from '../assets/icons/icon-file-blank.svg'
import iconFolder from '../assets/icons/icon-folder.svg'
import iconMusic from '../assets/icons/icon-music.svg'
import iconPdf from '../assets/icons/icon-pdf.svg'
import iconPicture from '../assets/icons/icon-picture.svg'
import iconRefresh from '../assets/icons/icon-refresh.svg'
import iconUpload from '../assets/icons/icon-upload.svg'
import iconVideo from '../assets/icons/icon-video.svg'

const SORT_OPTIONS = [
  { key: 'name', label: 'Name' },
  { key: 'size', label: 'Size' },
  { key: 'modifiedAt', label: 'Modified' },
]

const KIND_ICONS = {
  archive: iconArchive,
  audio: iconMusic,
  code: iconCode,
  document: iconFileBlank,
  file: iconFile,
  folder: iconFolder,
  picture: iconPicture,
  pdf: iconPdf,
  video: iconVideo,
}

function formatBytes(size) {
  if (size === null || size === undefined) {
    return '-'
  }

  if (size < 1024) {
    return `${size} B`
  }

  const units = ['KB', 'MB', 'GB', 'TB']
  let value = size
  let unitIndex = -1

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }

  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`
}

function formatTimestamp(value) {
  if (!value) {
    return '-'
  }

  return new Date(value).toLocaleString()
}

function getShareModeLabel(capabilities) {
  switch (capabilities?.shareMode) {
    case 'read-only':
      return 'Read only'
    case 'session-token':
      return 'Session token'
    case 'protected-upload':
      return 'Protected uploads'
    default:
      return 'Open uploads'
  }
}

function normalizeLegacyEntries(payload, currentPath = '') {
  return Object.entries(payload || {})
    .map(([name, isDirectory]) => ({
      name,
      path: currentPath ? `${currentPath}/${name}` : name,
      isDirectory: Boolean(isDirectory),
      kind: isDirectory ? 'folder' : 'file',
      size: null,
      modifiedAt: null,
    }))
    .sort((left, right) => {
      if (left.isDirectory !== right.isDirectory) {
        return left.isDirectory ? -1 : 1
      }
      return left.name.localeCompare(right.name)
    })
}

function normalizeCapabilities(capabilities) {
  return {
    readOnly: Boolean(capabilities?.readOnly),
    deleteEnabled: Boolean(capabilities?.deleteEnabled),
    uploadTokenRequired: Boolean(capabilities?.uploadTokenRequired),
    uploadTokenMode: capabilities?.uploadTokenMode || 'none',
    shareMode: capabilities?.shareMode || 'open-upload',
  }
}

function normalizeListingPayload(payload, requestedPath = '') {
  if (payload && Array.isArray(payload.entries)) {
    return {
      rootLabel: payload.rootLabel || 'Shared files',
      currentPath: payload.currentPath || '',
      parentPath: payload.parentPath ?? null,
      entries: payload.entries.map((entry) => ({
        ...entry,
        kind: entry.kind || (entry.isDirectory ? 'folder' : 'file'),
      })),
      capabilities: normalizeCapabilities(payload.capabilities),
    }
  }

  return {
    rootLabel: 'Shared files',
    currentPath: requestedPath || '',
    parentPath: requestedPath ? requestedPath.split('/').slice(0, -1).join('/') || '' : null,
    entries: normalizeLegacyEntries(payload, requestedPath),
    capabilities: normalizeCapabilities(),
  }
}

function compareEntries(left, right, sortKey, sortDirection) {
  if (left.isDirectory !== right.isDirectory) {
    return left.isDirectory ? -1 : 1
  }

  const direction = sortDirection === 'asc' ? 1 : -1

  if (sortKey === 'size') {
    const leftSize = left.size ?? -1
    const rightSize = right.size ?? -1
    if (leftSize !== rightSize) {
      return (leftSize - rightSize) * direction
    }
  }

  if (sortKey === 'modifiedAt') {
    const leftTime = left.modifiedAt ? new Date(left.modifiedAt).getTime() : 0
    const rightTime = right.modifiedAt ? new Date(right.modifiedAt).getTime() : 0
    if (leftTime !== rightTime) {
      return (leftTime - rightTime) * direction
    }
  }

  return left.name.localeCompare(right.name) * (sortKey === 'name' ? direction : 1)
}

function getMutationHeaders(uploadToken) {
  return uploadToken ? { 'x-upload-token': uploadToken } : {}
}

async function fetchListing(path = '') {
  const response = await axios.get('/api/files', {
    params: { path },
  })
  return normalizeListingPayload(response.data, path)
}

async function uploadFiles(path, files, uploadToken, onUploadProgress) {
  const formData = new FormData()
  formData.append('rel_dir', path)

  if (uploadToken) {
    formData.append('upload_token', uploadToken)
  }

  for (const file of files) {
    formData.append('file', file)
  }

  const response = await axios.post('/api/upload', formData, {
    headers: getMutationHeaders(uploadToken),
    onUploadProgress,
  })

  return response.data
}

async function deleteEntry(entryPath, uploadToken) {
  const response = await axios.delete('/api/files', {
    data: {
      path: entryPath,
      upload_token: uploadToken,
    },
    headers: getMutationHeaders(uploadToken),
  })

  return response.data
}

function updateUrlPath(currentPath) {
  const url = new URL(window.location.href)
  if (currentPath) {
    url.searchParams.set('path', currentPath)
  } else {
    url.searchParams.delete('path')
  }
  window.history.replaceState({}, '', url)
}

function SortHeader({ label, sortKey, activeSortKey, sortDirection, onSort }) {
  const isActive = sortKey === activeSortKey
  const indicator = isActive ? (sortDirection === 'asc' ? '↑' : '↓') : ''

  return (
    <button
      type="button"
      className={`file-table__sort${isActive ? ' file-table__sort--active' : ''}`}
      onClick={() => onSort(sortKey)}
    >
      <span>{label}</span>
      <span className="file-table__sort-indicator" aria-hidden="true">{indicator}</span>
    </button>
  )
}

function ErrorBanner({ message, onRetry }) {
  if (!message) {
    return null
  }

  return (
    <div className="banner banner--error" role="alert">
      <span>{message}</span>
      {onRetry && (
        <button type="button" className="banner__action" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  )
}

function StatusBanner({ status, onDismiss }) {
  if (!status) {
    return null
  }

  return (
    <div className={`banner banner--${status.severity}`} role="status">
      <span>{status.message}</span>
      <button type="button" className="banner__action" onClick={onDismiss}>
        Close
      </button>
    </div>
  )
}

function MutationsPanel({ capabilities, uploadToken, onTokenChange }) {
  const description = capabilities.readOnly
    ? 'This share is read only. Uploads and deletions are disabled.'
    : capabilities.uploadTokenRequired
      ? `Uploads${capabilities.deleteEnabled ? ' and deletions' : ''} require an upload token.`
      : `Uploads are open on this local network${capabilities.deleteEnabled ? '. Deletions are enabled.' : '. Deletions are disabled.'}`

  return (
    <>
      <div className="mode-row">
        <span className="mode-label">Share mode</span>
        <p className="mode-copy">
          <strong>{getShareModeLabel(capabilities)}.</strong> {description}
        </p>
      </div>

      {capabilities.uploadTokenRequired && !capabilities.readOnly && (
        <div className="token-row">
          <label className="token-row__label" htmlFor="upload-token">Upload token</label>
          <input
            id="upload-token"
            type="password"
            className="token-row__input"
            value={uploadToken}
            onChange={(event) => onTokenChange(event.target.value)}
            placeholder="Enter token"
            autoComplete="off"
          />
        </div>
      )}
    </>
  )
}

function UploadPanel({ currentPath, capabilities, uploadToken, onUploadComplete, onStatus }) {
  const [selectedFiles, setSelectedFiles] = useState([])
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  const handleDrop = async (acceptedFiles) => {
    setDragActive(false)
    if (acceptedFiles.length === 0) {
      return
    }

    if (capabilities.readOnly) {
      onStatus({
        severity: 'error',
        message: 'This share is read-only. Uploads are disabled.',
      })
      return
    }

    if (capabilities.uploadTokenRequired && uploadToken.trim().length === 0) {
      onStatus({
        severity: 'error',
        message: 'Enter the upload token before uploading.',
      })
      return
    }

    setSelectedFiles(acceptedFiles)
    setUploadProgress(0)
    setUploading(true)
    onStatus({
      severity: 'info',
      message: `Uploading ${acceptedFiles.length} file${acceptedFiles.length > 1 ? 's' : ''}`,
    })

    try {
      const result = await uploadFiles(currentPath, acceptedFiles, uploadToken.trim(), (event) => {
        const total = event.total || 1
        setUploadProgress(Math.round((event.loaded / total) * 100))
      })

      onStatus({
        severity: 'success',
        message: result.message,
      })
      await onUploadComplete()
    } catch (error) {
      const message = error.response?.data?.message || 'Upload failed'
      onStatus({
        severity: 'error',
        message,
      })
    } finally {
      setUploading(false)
      setSelectedFiles([])
    }
  }

  return (
    <section className="panel">
      <Dropzone
        onDrop={handleDrop}
        disabled={uploading || capabilities.readOnly}
        onDragEnter={() => setDragActive(true)}
        onDragLeave={() => setDragActive(false)}
      >
        {({ getRootProps, getInputProps, isDragActive }) => (
          <div
            {...getRootProps({
              className: `dropzone${(uploading || capabilities.readOnly) ? ' dropzone--disabled' : ''}${(isDragActive || dragActive) ? ' dropzone--active' : ''}`,
            })}
          >
            <input {...getInputProps()} />
            <img src={iconUpload} alt="" className="panel__icon" />
            <p className="panel__title">Upload files to this folder</p>
            <p className="panel__copy">
              {capabilities.readOnly
                ? 'Uploads are disabled for this share.'
                : (isDragActive || dragActive)
                  ? 'Drop files here to upload them.'
                  : 'Drag and drop files, or click to select them.'}
            </p>
          </div>
        )}
      </Dropzone>

      {selectedFiles.length > 0 && (
        <div className="upload-selection">
          <strong>Queued:</strong>
          <ul>
            {selectedFiles.map((file) => (
              <li key={`${file.name}-${file.size}`}>{file.name}</li>
            ))}
          </ul>
        </div>
      )}

      {uploading && (
        <div className="upload-progress">
          <div className="upload-progress__label">{uploadProgress}%</div>
          <div className="upload-progress__track">
            <div className="upload-progress__value" style={{ width: `${uploadProgress}%` }} />
          </div>
        </div>
      )}
    </section>
  )
}

function FileRow({ entry, capabilities, uploadToken, onOpen, onDelete, onStatus }) {
  const encodedPath = encodeURIComponent(entry.path)
  const fileIcon = KIND_ICONS[entry.kind] || iconFile
  const downloadLabel = entry.isDirectory ? 'Download zip' : 'Download'

  const handleDelete = async () => {
    if (capabilities.readOnly) {
      onStatus({
        severity: 'error',
        message: 'This share is read-only. Deletions are disabled.',
      })
      return
    }

    if (capabilities.uploadTokenRequired && uploadToken.trim().length === 0) {
      onStatus({
        severity: 'error',
        message: 'Enter the upload token before deleting files.',
      })
      return
    }

    const confirmed = window.confirm(`Delete ${entry.isDirectory ? 'folder' : 'file'} "${entry.name}"?`)
    if (!confirmed) {
      return
    }

    try {
      const result = await deleteEntry(entry.path, uploadToken.trim())
      onStatus({
        severity: 'success',
        message: result.message,
      })
      await onDelete()
    } catch (error) {
      onStatus({
        severity: 'error',
        message: error.response?.data?.message || 'Delete failed.',
      })
    }
  }

  return (
    <div className="file-row">
      <div className="file-row__main">
        <img src={fileIcon} alt="" className="file-row__icon" />
        {entry.isDirectory ? (
          <button type="button" className="file-row__name file-row__button" onClick={() => onOpen(entry.path)}>
            {entry.name}
          </button>
        ) : (
          <a href={`/api/download?file=${encodedPath}`} className="file-row__name">
            {entry.name}
          </a>
        )}
      </div>
      <div className="file-row__meta">{entry.isDirectory ? 'Folder' : formatBytes(entry.size)}</div>
      <div className="file-row__meta">{formatTimestamp(entry.modifiedAt)}</div>
      <div className="file-row__actions">
        <a
          href={entry.isDirectory ? `/api/downloadDir?dir=${encodedPath}` : `/api/download?file=${encodedPath}`}
          className="file-row__download"
          aria-label={entry.isDirectory ? `Download ${entry.name} as zip` : `Download ${entry.name}`}
        >
          <img src={iconDownload} alt="" className="file-row__download-icon" />
          <span>{downloadLabel}</span>
        </a>
        {!capabilities.readOnly && capabilities.deleteEnabled && (
          <button type="button" className="file-row__delete" onClick={handleDelete}>
            Delete
          </button>
        )}
      </div>
    </div>
  )
}

function EmptyState({ currentPath }) {
  return (
    <div className="empty-state">
      <strong>Nothing in this folder yet.</strong>
      <p>{currentPath ? 'Upload files here or go up a folder.' : 'Upload files or create content in the shared directory to see it here.'}</p>
    </div>
  )
}

function BrowserPanel({
  listing,
  loading,
  error,
  uploadToken,
  onOpen,
  onRefresh,
  onDelete,
  onCopyLink,
  onStatus,
  sortKey,
  sortDirection,
  onSortChange,
}) {
  const relativePath = listing?.currentPath || ''
  const rootLabel = listing?.rootLabel || 'Shared files'
  const parentPath = listing?.parentPath ?? null
  const entries = Array.isArray(listing?.entries) ? listing.entries : []
  const capabilities = listing?.capabilities || normalizeCapabilities()
  const breadcrumb = relativePath ? `${rootLabel} / ${relativePath}` : rootLabel
  const currentFolderDownloadPath = encodeURIComponent(relativePath)
  const actionsHeading = capabilities.deleteEnabled && !capabilities.readOnly ? 'Download / Delete' : 'Download'

  const sortedEntries = [...entries].sort((left, right) => (
    compareEntries(left, right, sortKey, sortDirection)
  ))

  return (
    <section className="browser">
      <div className="browser__header">
        <div>
          <p className="browser__eyebrow">Shared folder</p>
          <h1 className="browser__title">{breadcrumb}</h1>
        </div>
        <div className="browser__actions">
          <button type="button" className="icon-button" onClick={onCopyLink}>
            <span>Copy link</span>
          </button>
          <a
            href={`/api/downloadDir?dir=${currentFolderDownloadPath}`}
            className="icon-button"
            aria-label={`Download ${relativePath || rootLabel} as zip`}
          >
            <img src={iconArchive} alt="" className="icon-button__icon" />
            <span>Download folder</span>
          </a>
          <button type="button" className="icon-button" onClick={onRefresh} disabled={loading}>
            <img src={iconRefresh} alt="" className="icon-button__icon" />
            <span>{loading ? 'Syncing' : 'Sync'}</span>
          </button>
        </div>
      </div>

      <div className="sort-bar sort-bar--mobile">
        <label className="sort-bar__label" htmlFor="sort-key-mobile">Sort by</label>
        <select
          id="sort-key-mobile"
          className="sort-bar__select"
          value={sortKey}
          onChange={(event) => onSortChange(event.target.value)}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.key} value={option.key}>{option.label}</option>
          ))}
        </select>
        <button type="button" className="sort-bar__direction" onClick={() => onSortChange(sortKey)}>
          {sortDirection === 'asc' ? 'Ascending' : 'Descending'}
        </button>
      </div>

      <ErrorBanner message={error} onRetry={onRefresh} />

      <div className="file-table">
        <div className="file-table__head">
          <SortHeader label="Name" sortKey="name" activeSortKey={sortKey} sortDirection={sortDirection} onSort={onSortChange} />
          <SortHeader label="Size" sortKey="size" activeSortKey={sortKey} sortDirection={sortDirection} onSort={onSortChange} />
          <SortHeader label="Modified" sortKey="modifiedAt" activeSortKey={sortKey} sortDirection={sortDirection} onSort={onSortChange} />
          <span>{actionsHeading}</span>
        </div>

        {parentPath !== null && (
          <div className="file-row">
            <div className="file-row__main">
              <span className="file-row__nav-icon" aria-hidden="true">←</span>
              <button type="button" className="file-row__name file-row__button" onClick={() => onOpen(parentPath)}>
                Up one folder
              </button>
            </div>
            <div className="file-row__meta">Folder</div>
            <div className="file-row__meta">-</div>
            <div className="file-row__actions" />
          </div>
        )}

        {!loading && sortedEntries.length === 0 && <EmptyState currentPath={relativePath} />}

        {sortedEntries.map((entry) => (
          <FileRow
            key={entry.path}
            entry={entry}
            capabilities={capabilities}
            uploadToken={uploadToken}
            onOpen={onOpen}
            onDelete={onDelete}
            onStatus={onStatus}
          />
        ))}
      </div>
    </section>
  )
}

const initialListing = {
  rootLabel: 'Shared files',
  currentPath: '',
  parentPath: null,
  entries: [],
  capabilities: normalizeCapabilities(),
}

export default function App() {
  const [listing, setListing] = useState(initialListing)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [status, setStatus] = useState(null)
  const [sortKey, setSortKey] = useState('name')
  const [sortDirection, setSortDirection] = useState('asc')
  const [uploadToken, setUploadToken] = useState('')

  const loadListing = async (path = listing.currentPath) => {
    setLoading(true)
    setError('')

    try {
      const nextListing = await fetchListing(path)
      setListing(nextListing)
      updateUrlPath(nextListing.currentPath)
    } catch (requestError) {
      const message = requestError.response?.status === 404
        ? 'That folder no longer exists.'
        : 'Unable to load files from the share.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleCopyLink = async () => {
    const url = new URL(window.location.href)
    if (listing.currentPath) {
      url.searchParams.set('path', listing.currentPath)
    } else {
      url.searchParams.delete('path')
    }

    try {
      await navigator.clipboard.writeText(url.toString())
      setStatus({
        severity: 'success',
        message: 'Current folder link copied.',
      })
    } catch {
      setStatus({
        severity: 'error',
        message: 'Unable to copy the current folder link.',
      })
    }
  }

  useEffect(() => {
    const initialPath = new URL(window.location.href).searchParams.get('path') || ''
    loadListing(initialPath)
  }, [])

  return (
    <div className="app-shell">
      <div className="app-card">
        <header className="hero">
          <p className="hero__eyebrow">QR File Share</p>
          <h1 className="hero__title">Fast local file transfer without setup friction.</h1>
          <p className="hero__copy">
            Browse the current share, download folders as zip archives, upload files with visible progress, and manage content safely.
          </p>
        </header>

        <StatusBanner status={status} onDismiss={() => setStatus(null)} />

        <MutationsPanel
          capabilities={listing.capabilities}
          uploadToken={uploadToken}
          onTokenChange={setUploadToken}
        />

        <UploadPanel
          currentPath={listing.currentPath}
          capabilities={listing.capabilities}
          uploadToken={uploadToken}
          onUploadComplete={() => loadListing(listing.currentPath)}
          onStatus={setStatus}
        />

        <BrowserPanel
          listing={listing}
          loading={loading}
          error={error}
          uploadToken={uploadToken}
          onOpen={loadListing}
          onRefresh={() => loadListing(listing.currentPath)}
          onDelete={() => loadListing(listing.currentPath)}
          onCopyLink={handleCopyLink}
          onStatus={setStatus}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSortChange={(nextKey) => {
            if (nextKey === sortKey) {
              setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
              return
            }

            setSortKey(nextKey)
            setSortDirection(nextKey === 'name' ? 'asc' : 'desc')
          }}
        />
      </div>
    </div>
  )
}
