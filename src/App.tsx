import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, FormEvent, ReactNode } from 'react'
import {
  ArrowRight,
  ArrowUpRight,
  Award,
  Bookmark,
  CalendarDays,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  Download,
  ExternalLink,
  Filter,
  Gift,
  LayoutDashboard,
  Menu,
  Pencil,
  Plus,
  Search,
  Send,
  Sparkles,
  Target,
  Trash2,
  Trophy,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type Kind = 'grant' | 'hackathon' | 'bounty'
type Status = 'saved' | 'in progress' | 'submitted' | 'won'
type View = 'overview' | 'opportunities' | 'deadlines'

type Opportunity = {
  id: string
  title: string
  organization: string
  kind: Kind
  status: Status
  deadline: string
  reward: string
  url: string
  description: string
  tags: string[]
  sample?: boolean
}

type Toast = { message: string, undo?: () => void }

const storageKey = 'orbit-opportunities-v1'
const kinds: Kind[] = ['grant', 'hackathon', 'bounty']
const statuses: Status[] = ['saved', 'in progress', 'submitted', 'won']

function dateAfter(days: number) {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() + days)
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
}

const starterOpportunities: Opportunity[] = [
  { id: 'sample-1', title: 'Open Source Builder Grant', organization: 'Community Foundation', kind: 'grant', status: 'in progress', deadline: dateAfter(5), reward: '$10k funding', url: '', description: 'A sample grant for an open source project.', tags: ['Open source', 'Infrastructure'], sample: true },
  { id: 'sample-2', title: 'Future Stack Hackathon', organization: 'Build Collective', kind: 'hackathon', status: 'saved', deadline: dateAfter(12), reward: '$25k prize pool', url: '', description: 'A sample weekend build event.', tags: ['AI', 'Developer tools'], sample: true },
  { id: 'sample-3', title: 'Design System Challenge', organization: 'Interface Guild', kind: 'bounty', status: 'saved', deadline: dateAfter(18), reward: '$2.5k bounty', url: '', description: 'A sample UI and component bounty.', tags: ['Design', 'Frontend'], sample: true },
  { id: 'sample-4', title: 'Climate Tech Microgrant', organization: 'Tomorrow Lab', kind: 'grant', status: 'submitted', deadline: dateAfter(24), reward: '$5k funding', url: '', description: 'A sample early stage climate grant.', tags: ['Climate', 'Impact'], sample: true },
  { id: 'sample-5', title: 'Product Sprint Weekend', organization: 'Launch House', kind: 'hackathon', status: 'in progress', deadline: dateAfter(31), reward: '$8k prize pool', url: '', description: 'A sample product sprint.', tags: ['Product', 'Startup'], sample: true },
  { id: 'sample-6', title: 'Docs & DevRel Bounty', organization: 'Open Network', kind: 'bounty', status: 'won', deadline: dateAfter(-8), reward: '$1k bounty', url: '', description: 'A sample completed bounty.', tags: ['Writing', 'Developer tools'], sample: true },
]

const emptyOpportunity: Omit<Opportunity, 'id'> = {
  title: '', organization: '', kind: 'grant', status: 'saved', deadline: '', reward: '', url: '', description: '', tags: [],
}

function readOpportunities(): Opportunity[] {
  try {
    const stored = localStorage.getItem(storageKey)
    if (!stored) return starterOpportunities
    const parsed: unknown = JSON.parse(stored)
    return Array.isArray(parsed) ? parsed as Opportunity[] : starterOpportunities
  } catch {
    return starterOpportunities
  }
}

function parseDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function daysUntil(value: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((parseDate(value).getTime() - today.getTime()) / 86400000)
}

function formatDate(value: string, monthStyle: 'short' | 'long' = 'short') {
  return parseDate(value).toLocaleDateString('en-US', { month: monthStyle, day: 'numeric', year: monthStyle === 'long' ? 'numeric' : undefined })
}

function deadlineLabel(value: string) {
  const days = daysUntil(value)
  if (days < 0) return 'Closed'
  if (days === 0) return 'Due today'
  if (days === 1) return '1 day left'
  return `${days} days left`
}

function capitalize(value: string) {
  return value[0].toUpperCase() + value.slice(1)
}

const kindPlural: Record<Kind, string> = { grant: 'Grants', hackathon: 'Hackathons', bounty: 'Bounties' }

function kindIcon(kind: Kind): LucideIcon {
  return kind === 'grant' ? Gift : kind === 'hackathon' ? Trophy : Target
}

function isOpen(item: Opportunity) {
  return item.status !== 'won' && daysUntil(item.deadline) >= 0
}

function isUrgent(item: Opportunity) {
  return isOpen(item) && daysUntil(item.deadline) <= 7
}

function App() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>(readOpportunities)
  const [view, setView] = useState<View>('overview')
  const [kindFilter, setKindFilter] = useState<Kind | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Opportunity | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [toast, setToast] = useState<Toast | null>(null)

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(opportunities))
    } catch {
      setToast({ message: 'Couldn’t save to this browser. Export a copy to keep your changes.' })
    }
  }, [opportunities])

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [menuOpen])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 6000)
    return () => window.clearTimeout(timer)
  }, [toast])

  const active = useMemo(() => opportunities.filter(isOpen), [opportunities])
  const upcoming = useMemo(() => [...active].sort((a, b) => a.deadline.localeCompare(b.deadline)), [active])
  const closingSoon = active.filter(isUrgent).length
  const submitted = opportunities.filter(item => item.status === 'submitted').length
  const won = opportunities.filter(item => item.status === 'won').length
  const sampleCount = opportunities.filter(item => item.sample).length

  const filtered = useMemo(() => opportunities
    .filter(item => kindFilter === 'all' || item.kind === kindFilter)
    .filter(item => statusFilter === 'all' || item.status === statusFilter)
    .filter(item => `${item.title} ${item.organization} ${item.tags.join(' ')}`.toLowerCase().includes(search.toLowerCase().trim()))
    .sort((a, b) => a.deadline.localeCompare(b.deadline)), [opportunities, kindFilter, statusFilter, search])

  const hasFilters = kindFilter !== 'all' || statusFilter !== 'all' || search.trim() !== ''

  function navigate(next: View, kind: Kind | 'all' = 'all') {
    setView(next)
    setKindFilter(kind)
    setStatusFilter('all')
    setSearch('')
    setMenuOpen(false)
  }

  function openForm(item: Opportunity | null = null) {
    setEditing(item)
    setIsFormOpen(true)
    setMenuOpen(false)
  }

  function closeForm() {
    setIsFormOpen(false)
    setEditing(null)
  }

  function saveOpportunity(value: Opportunity) {
    setOpportunities(current => editing
      ? current.map(item => item.id === editing.id ? value : item)
      : [value, ...current])
    setToast({ message: editing ? 'Changes saved' : `Added “${value.title}”` })
    closeForm()
  }

  function updateStatus(id: string, status: Status) {
    setOpportunities(current => current.map(item => item.id === id ? { ...item, status, sample: false } : item))
  }

  function restore(items: Opportunity[]) {
    setOpportunities(current => [...items.filter(item => !current.some(entry => entry.id === item.id)), ...current])
    setToast(null)
  }

  function deleteOpportunity(item: Opportunity) {
    setOpportunities(current => current.filter(entry => entry.id !== item.id))
    setToast({ message: `Deleted “${item.title}”`, undo: () => restore([item]) })
  }

  function removeSamples() {
    const samples = opportunities.filter(item => item.sample)
    setOpportunities(current => current.filter(item => !item.sample))
    setToast({ message: `Removed ${samples.length} example${samples.length === 1 ? '' : 's'}`, undo: () => restore(samples) })
  }

  function clearFilters() {
    setKindFilter('all')
    setStatusFilter('all')
    setSearch('')
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(opportunities, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'orbit-opportunities.json'
    link.click()
    URL.revokeObjectURL(url)
    setToast({ message: 'Exported orbit-opportunities.json' })
  }

  const highlighted = upcoming[0]
  const counts = Object.fromEntries(kinds.map(kind => [kind, active.filter(item => item.kind === kind).length])) as Record<Kind, number>
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const pageName = view === 'overview' ? 'Overview' : view === 'deadlines' ? 'Deadlines' : kindFilter === 'all' ? 'Opportunities' : kindPlural[kindFilter]
  const mixStyle = {
    '--grant': `${active.length ? counts.grant / active.length * 100 : 0}%`,
    '--hackathon': `${active.length ? (counts.grant + counts.hackathon) / active.length * 100 : 0}%`,
  } as CSSProperties

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`} aria-label="Primary navigation">
        <button className="brand" type="button" onClick={() => navigate('overview')} aria-label="Orbit overview">
          <span className="brand-mark" aria-hidden="true"><span /></span>
          <span>orbit<span className="brand-dot">.</span></span>
        </button>

        <nav className="nav-group" aria-label="Workspace">
          <span className="nav-caption">Workspace</span>
          <NavButton icon={LayoutDashboard} label="Overview" active={view === 'overview'} onClick={() => navigate('overview')} />
          <NavButton icon={Bookmark} label="All opportunities" active={view === 'opportunities' && kindFilter === 'all'} onClick={() => navigate('opportunities')} count={opportunities.length} />
          <NavButton icon={CalendarDays} label="Deadlines" active={view === 'deadlines'} onClick={() => navigate('deadlines')} />
        </nav>
        <nav className="nav-group" aria-label="Browse by type">
          <span className="nav-caption">Explore</span>
          <NavButton icon={Gift} label="Grants" active={view === 'opportunities' && kindFilter === 'grant'} onClick={() => navigate('opportunities', 'grant')} dot="grant" />
          <NavButton icon={Trophy} label="Hackathons" active={view === 'opportunities' && kindFilter === 'hackathon'} onClick={() => navigate('opportunities', 'hackathon')} dot="hackathon" />
          <NavButton icon={Target} label="Bounties" active={view === 'opportunities' && kindFilter === 'bounty'} onClick={() => navigate('opportunities', 'bounty')} dot="bounty" />
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <div className="tip-icon"><Sparkles size={16} aria-hidden="true" /></div>
            <strong>Keep your momentum.</strong>
            <p>Every big win starts with one application.</p>
            <button type="button" onClick={() => openForm()}>Add an opportunity <ArrowUpRight size={16} aria-hidden="true" /></button>
          </div>
          <button className="sidebar-help" type="button" onClick={() => { setShowHelp(true); setMenuOpen(false) }}><CircleHelp size={18} strokeWidth={1.8} aria-hidden="true" /> How it works</button>
        </div>
      </aside>

      {menuOpen && <button className="mobile-scrim" type="button" aria-label="Close menu" onClick={() => setMenuOpen(false)} />}

      <main className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <button className="mobile-menu icon-button" type="button" aria-label="Open menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}><Menu size={20} aria-hidden="true" /></button>
            <span className="breadcrumb">Workspace <span aria-hidden="true">/</span> <strong>{pageName}</strong></span>
          </div>
          <div className="topbar-actions">
            <label className="search-box">
              <Search size={16} aria-hidden="true" />
              <span className="sr-only">Search opportunities</span>
              <input
                type="search"
                name="search"
                autoComplete="off"
                value={search}
                onChange={event => { setSearch(event.target.value); if (event.target.value) setView('opportunities') }}
                placeholder="Search opportunities…"
              />
            </label>
            <button className="icon-button" type="button" aria-label="Export as JSON" title="Export as JSON" onClick={exportData}><Download size={18} aria-hidden="true" /></button>
          </div>
        </header>

        <div className="page-content">
          {view === 'overview' ? <>
            <PageHeading kicker="Your opportunity space" title={greeting} subtitle="One place for the things worth building toward." onAdd={() => openForm()} />

            {sampleCount > 0 && (
              <div className="sample-notice">
                <Sparkles size={16} aria-hidden="true" />
                <span>You’re viewing {sampleCount} fictional example{sampleCount === 1 ? '' : 's'}. Add your own to make this space yours.</span>
                <button type="button" onClick={removeSamples}>Remove examples</button>
              </div>
            )}

            <section className="hero-grid" aria-label="Overview highlights">
              <div className="hero-card">
                <span className="hero-pill"><i aria-hidden="true" /> {highlighted ? deadlineLabel(highlighted.deadline) : 'Nothing due'}</span>
                <div className="hero-art" aria-hidden="true">
                  <div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="orbit orbit-three" />
                  <div className="planet planet-one" /><div className="planet planet-two" />
                  <div className="planet-center"><Sparkles size={24} strokeWidth={1.5} /></div>
                </div>
                <div className="hero-copy">
                  <span className="hero-kicker">Closest deadline</span>
                  <h2>{highlighted ? highlighted.title : 'Your next big thing'}</h2>
                  <p>{highlighted ? `${highlighted.organization} · ${formatDate(highlighted.deadline, 'long')}` : 'Add an opportunity to get started.'}</p>
                </div>
                <button className="hero-arrow" type="button" aria-label="View all deadlines" onClick={() => navigate('deadlines')}><ArrowUpRight size={22} aria-hidden="true" /></button>
              </div>
              <div className="metrics-grid">
                <MetricCard label="Active opportunities" value={active.length} icon={Bookmark} tone="green" note="On your radar" />
                <MetricCard label="Closing this week" value={closingSoon} icon={Clock3} tone="orange" note="Give these focus" />
                <MetricCard label="Submitted" value={submitted} icon={Send} tone="purple" note="In the pipeline" />
                <MetricCard label="Wins" value={won} icon={Award} tone="yellow" note="Keep it going" />
              </div>
            </section>

            <div className="overview-lower">
              <section className="panel" aria-labelledby="upcoming-title">
                <div className="panel-heading">
                  <h2 id="upcoming-title">Coming up next</h2>
                  <button className="text-button" type="button" onClick={() => navigate('deadlines')}>View deadlines <ArrowRight size={16} aria-hidden="true" /></button>
                </div>
                {upcoming.length
                  ? <div className="upcoming-list">{upcoming.slice(0, 4).map(item => <UpcomingRow key={item.id} item={item} onEdit={() => openForm(item)} />)}</div>
                  : <EmptyState title="Nothing on the horizon" body="Add a deadline to see your next moves here." onAction={() => openForm()} />}
              </section>
              <section className="panel" aria-labelledby="mix-title">
                <div className="panel-heading"><h2 id="mix-title">Your mix</h2></div>
                <div className="mix-chart">
                  <div className="mix-total"><strong>{active.length}</strong><span>active<br />{active.length === 1 ? 'opportunity' : 'opportunities'}</span></div>
                  <div className={`mix-ring ${active.length ? '' : 'empty'}`} style={mixStyle} aria-hidden="true"><div /></div>
                </div>
                <div className="mix-legend">
                  {kinds.map(kind => <div key={kind}><span className={`legend-dot ${kind}`} /><span>{kindPlural[kind]}</span><strong>{counts[kind]}</strong></div>)}
                </div>
              </section>
            </div>

            <section className="featured-section" aria-labelledby="watch-title">
              <div className="panel-heading">
                <h2 id="watch-title">Opportunities to watch</h2>
                <button className="text-button" type="button" onClick={() => navigate('opportunities')}>See all <ArrowRight size={16} aria-hidden="true" /></button>
              </div>
              <div className="card-grid">
                {upcoming.slice(0, 3).map(item => <OpportunityCard key={item.id} item={item} onEdit={() => openForm(item)} onDelete={() => deleteOpportunity(item)} onStatus={status => updateStatus(item.id, status)} />)}
                {!upcoming.length && <EmptyState title="Build your radar" body="Opportunities you add appear here." onAction={() => openForm()} />}
              </div>
            </section>
          </> : view === 'opportunities' ? <>
            <PageHeading kicker="Your radar" title={kindFilter === 'all' ? 'All opportunities' : kindPlural[kindFilter]} subtitle="Keep every possibility in sight, from first idea to final result." onAdd={() => openForm()} />
            <div className="filter-row">
              <div className="filter-tabs" role="group" aria-label="Filter by type">
                {(['all', ...kinds] as const).map(kind => (
                  <button key={kind} className={kindFilter === kind ? 'active' : ''} type="button" aria-pressed={kindFilter === kind} onClick={() => setKindFilter(kind)}>
                    {kind === 'all' ? 'All' : kindPlural[kind]}
                  </button>
                ))}
              </div>
              <label className="status-filter">
                <Filter size={16} aria-hidden="true" />
                <span className="sr-only">Filter by status</span>
                <select value={statusFilter} onChange={event => setStatusFilter(event.target.value as Status | 'all')}>
                  <option value="all">All statuses</option>
                  {statuses.map(status => <option key={status} value={status}>{capitalize(status)}</option>)}
                </select>
                <ChevronDown size={16} aria-hidden="true" />
              </label>
            </div>
            <p className="list-summary" aria-live="polite">
              Showing <strong>{filtered.length}</strong> {filtered.length === 1 ? 'opportunity' : 'opportunities'}
              {search.trim() ? <> matching <strong>“{search.trim()}”</strong></> : null}
            </p>
            {filtered.length
              ? <div className="card-grid">{filtered.map(item => <OpportunityCard key={item.id} item={item} onEdit={() => openForm(item)} onDelete={() => deleteOpportunity(item)} onStatus={status => updateStatus(item.id, status)} />)}</div>
              : hasFilters
                ? <EmptyState title="No matches" body="Nothing fits these filters." actionLabel="Clear filters" actionIcon={X} onAction={clearFilters} />
                : <EmptyState title="No opportunities yet" body="Add your first grant, hackathon, or bounty." onAction={() => openForm()} />}
          </> : <>
            <PageHeading kicker="Plan ahead" title="Deadlines" subtitle="A clear view of what needs your attention next." onAdd={() => openForm()} />
            <div className="deadline-summary">
              <div><Clock3 size={18} aria-hidden="true" /><span><strong>{closingSoon}</strong> closing this week</span></div>
              <div><CalendarDays size={18} aria-hidden="true" /><span><strong>{active.length}</strong> active deadline{active.length === 1 ? '' : 's'}</span></div>
            </div>
            {upcoming.length ? (
              <div className="deadline-list">
                {upcoming.map((item, index) => {
                  const date = parseDate(item.deadline)
                  return (
                    <div className="deadline-entry" key={item.id}>
                      <div className="timeline-rail" aria-hidden="true"><span className={index === 0 ? 'timeline-dot first' : 'timeline-dot'} /></div>
                      <div className="deadline-date">
                        <strong>{date.getDate()}</strong>
                        <span>{date.toLocaleDateString('en-US', { month: 'short' })}</span>
                      </div>
                      <div className="deadline-main">
                        <span className={`kind-label ${item.kind}`}>{item.kind}</span>
                        <h3>{item.title}</h3>
                        <p>{item.organization}{item.reward ? ` · ${item.reward}` : ''}</p>
                      </div>
                      <div className="deadline-right">
                        <span className={isUrgent(item) ? 'urgent' : ''}>{deadlineLabel(item.deadline)}</span>
                        <button className="icon-button" type="button" aria-label={`Edit ${item.title}`} title="Edit" onClick={() => openForm(item)}><Pencil size={16} aria-hidden="true" /></button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : <EmptyState title="No upcoming deadlines" body="Add an opportunity with a deadline to plan your next move." onAction={() => openForm()} />}
          </>}
        </div>
      </main>

      {isFormOpen && <OpportunityForm initial={editing} onClose={closeForm} onSave={saveOpportunity} />}

      {showHelp && (
        <Modal className="help-dialog" labelledBy="help-title" onClose={() => setShowHelp(false)}>
          {close => <>
            <button className="modal-close icon-button" type="button" aria-label="Close" onClick={close}><X size={20} aria-hidden="true" /></button>
            <h2 id="help-title">Your opportunity command center.</h2>
            <p>Save grants, hackathons, and bounties in one place. Track deadlines, update your progress, and keep the next move visible.</p>
            <ol className="help-steps">
              <li><span aria-hidden="true">01</span><strong>Add opportunities</strong><p>Record the details and deadline that matter to you.</p></li>
              <li><span aria-hidden="true">02</span><strong>Move them forward</strong><p>Change status as you work, submit, and win.</p></li>
              <li><span aria-hidden="true">03</span><strong>Keep a copy</strong><p>Use the download button to export your entries as JSON.</p></li>
            </ol>
            <p className="help-note">Your data stays in this browser. Starter examples are fictional.</p>
            <button className="primary-button" type="button" data-autofocus onClick={() => { setShowHelp(false); openForm() }}>Add an opportunity <ArrowRight size={16} aria-hidden="true" /></button>
          </>}
        </Modal>
      )}

      <div className="toast-region" role="status" aria-live="polite">
        {toast && (
          <div className="toast" key={toast.message}>
            <span>{toast.message}</span>
            {toast.undo && <button type="button" onClick={toast.undo}>Undo</button>}
            <button className="toast-dismiss" type="button" aria-label="Dismiss" onClick={() => setToast(null)}><X size={16} aria-hidden="true" /></button>
          </div>
        )}
      </div>
    </div>
  )
}

function NavButton({ icon: Icon, label, active, onClick, count, dot }: { icon: LucideIcon, label: string, active: boolean, onClick: () => void, count?: number, dot?: Kind }) {
  return (
    <button className={`nav-button ${active ? 'active' : ''}`} type="button" aria-current={active ? 'page' : undefined} onClick={onClick}>
      <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
      <span>{label}</span>
      {count !== undefined && <small className="num">{count}</small>}
      {dot && <i className={`nav-dot ${dot}`} aria-hidden="true" />}
    </button>
  )
}

function MetricCard({ label, value, icon: Icon, tone, note }: { label: string, value: number, icon: LucideIcon, tone: string, note: string }) {
  return (
    <div className="metric-card">
      <div className="metric-top"><span>{label}</span><div className={`metric-icon ${tone}`}><Icon size={16} strokeWidth={1.8} aria-hidden="true" /></div></div>
      <strong className="metric-value">{value}</strong>
      <span className="metric-note"><span className={`note-dot ${tone}`} aria-hidden="true" />{note}</span>
    </div>
  )
}

function UpcomingRow({ item, onEdit }: { item: Opportunity, onEdit: () => void }) {
  const Icon = kindIcon(item.kind)
  return (
    <div className="upcoming-row">
      <div className={`kind-icon ${item.kind}`}><Icon size={18} strokeWidth={1.8} aria-hidden="true" /></div>
      <div className="upcoming-info"><strong>{item.title}</strong><span>{item.organization} · {capitalize(item.kind)}</span></div>
      <div className="upcoming-deadline"><strong>{formatDate(item.deadline)}</strong><span className={isUrgent(item) ? 'urgent' : ''}>{deadlineLabel(item.deadline)}</span></div>
      <button className="icon-button" type="button" aria-label={`Edit ${item.title}`} title="Edit" onClick={onEdit}><Pencil size={16} aria-hidden="true" /></button>
    </div>
  )
}

function OpportunityCard({ item, onEdit, onDelete, onStatus }: { item: Opportunity, onEdit: () => void, onDelete: () => void, onStatus: (status: Status) => void }) {
  const Icon = kindIcon(item.kind)
  return (
    <article className="opportunity-card">
      <div className="card-top">
        <div className={`card-kind ${item.kind}`}>
          <div className={`kind-icon ${item.kind}`}><Icon size={18} strokeWidth={1.8} aria-hidden="true" /></div>
          <span>{item.kind}</span>
        </div>
        <div className="card-actions">
          <button className="icon-button" type="button" aria-label={`Edit ${item.title}`} title="Edit" onClick={onEdit}><Pencil size={16} aria-hidden="true" /></button>
          <button className="icon-button danger" type="button" aria-label={`Delete ${item.title}`} title="Delete" onClick={onDelete}><Trash2 size={16} aria-hidden="true" /></button>
        </div>
      </div>
      <div className="card-body">
        <h3>{item.title}</h3>
        <p>{item.organization}</p>
        {(item.sample || item.tags.length > 0) && (
          <div className="tag-list">
            {item.sample && <span className="sample-tag">Sample</span>}
            {item.tags.slice(0, 3).map(tag => <span key={tag}>{tag}</span>)}
          </div>
        )}
      </div>
      <div className="card-meta">
        <div>
          <span className="card-meta-label">Deadline</span>
          <strong>{formatDate(item.deadline)}</strong>
          <small className={isUrgent(item) ? 'urgent' : ''}>{item.status === 'won' ? 'Won' : deadlineLabel(item.deadline)}</small>
        </div>
        <div>
          <span className="card-meta-label">Reward</span>
          <strong>{item.reward || '—'}</strong>
        </div>
      </div>
      <div className="card-footer">
        <label className={`card-status ${item.status.replace(' ', '-')}`}>
          <span className="sr-only">Status for {item.title}</span>
          <select value={item.status} onChange={event => onStatus(event.target.value as Status)}>
            {statuses.map(status => <option key={status} value={status}>{capitalize(status)}</option>)}
          </select>
          <ChevronDown size={14} aria-hidden="true" />
        </label>
        {item.url && (
          <a className="card-link" href={item.url} target="_blank" rel="noopener noreferrer">
            Visit<span className="sr-only"> {item.title} website (opens in a new tab)</span> <ExternalLink size={14} aria-hidden="true" />
          </a>
        )}
      </div>
    </article>
  )
}

function EmptyState({ title, body, onAction, actionLabel = 'Add opportunity', actionIcon: ActionIcon = Plus }: { title: string, body: string, onAction: () => void, actionLabel?: string, actionIcon?: LucideIcon }) {
  return (
    <div className="empty-state">
      <div><Sparkles size={22} strokeWidth={1.5} aria-hidden="true" /></div>
      <h3>{title}</h3>
      <p>{body}</p>
      <button type="button" onClick={onAction}><ActionIcon size={16} aria-hidden="true" /> {actionLabel}</button>
    </div>
  )
}

function PageHeading({ kicker, title, subtitle, onAdd }: { kicker: string, title: string, subtitle: string, onAdd: () => void }) {
  return (
    <div className="page-intro">
      <div>
        <div className="eyebrow"><span className="eyebrow-line" aria-hidden="true" /> {kicker}</div>
        <h1>{title}<span className="heading-period" aria-hidden="true">.</span></h1>
        <p>{subtitle}</p>
      </div>
      <button className="primary-button" type="button" onClick={onAdd}><Plus size={16} aria-hidden="true" /> Add opportunity</button>
    </div>
  )
}

/* Native <dialog> gives us the focus trap, Escape to close, and an inert page behind for free. */
function Modal({ className, labelledBy, onClose, children }: { className: string, labelledBy: string, onClose: () => void, children: (close: () => void) => ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  const trigger = useRef<Element | null>(null)

  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) {
      trigger.current = document.activeElement
      dialog.showModal()
      dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    }
    // Return focus to whatever opened the dialog once it unmounts.
    return () => { if (trigger.current instanceof HTMLElement) trigger.current.focus() }
  }, [])

  return (
    <dialog
      ref={ref}
      className={`modal ${className}`}
      aria-labelledby={labelledBy}
      onClose={onClose}
      onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}
    >
      <div className="modal-inner">{children(onClose)}</div>
    </dialog>
  )
}

type FieldName = 'title' | 'organization' | 'deadline' | 'url'

function OpportunityForm({ initial, onClose, onSave }: { initial: Opportunity | null, onClose: () => void, onSave: (item: Opportunity) => void }) {
  const [form, setForm] = useState<Omit<Opportunity, 'id'>>(initial ? { ...initial, sample: false } : emptyOpportunity)
  const [tagsText, setTagsText] = useState(initial?.tags.join(', ') || '')
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({})

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm(current => ({ ...current, [key]: value }))
    if (key in errors) setErrors(current => ({ ...current, [key]: undefined }))
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    // Accept "example.com" and quietly add the scheme rather than rejecting it.
    const rawUrl = form.url.trim()
    const url = rawUrl && !/^https?:\/\//i.test(rawUrl) ? `https://${rawUrl}` : rawUrl

    const next: Partial<Record<FieldName, string>> = {}
    if (!form.title.trim()) next.title = 'Enter a name.'
    if (!form.organization.trim()) next.organization = 'Enter who runs it.'
    if (!form.deadline) next.deadline = 'Pick a deadline.'
    if (url && !URL.canParse(url)) next.url = 'Enter a valid link, like https://example.com.'

    const firstInvalid = (Object.keys(next) as FieldName[])[0]
    if (firstInvalid) {
      setErrors(next)
      document.getElementById(`opp-${firstInvalid}`)?.focus()
      return
    }

    onSave({
      ...form,
      id: initial?.id || crypto.randomUUID(),
      title: form.title.trim(),
      organization: form.organization.trim(),
      reward: form.reward.trim(),
      url,
      description: form.description.trim(),
      tags: tagsText.split(',').map(tag => tag.trim()).filter(Boolean).slice(0, 5),
      sample: false,
    })
  }

  function control(name: string) {
    const error = errors[name as FieldName]
    return { id: `opp-${name}`, name, 'aria-invalid': error ? true : undefined, 'aria-describedby': error ? `opp-${name}-error` : undefined }
  }

  return (
    <Modal className="form-dialog" labelledBy="form-title" onClose={onClose}>
      {close => <>
        <div className="modal-header">
          <div>
            <h2 id="form-title">{initial ? 'Edit opportunity' : 'New opportunity'}</h2>
            <p>Capture the details now. Make the next move later.</p>
          </div>
          <button className="modal-close icon-button" type="button" aria-label="Close" onClick={close}><X size={20} aria-hidden="true" /></button>
        </div>
        <form onSubmit={submit} noValidate>
          <div className="form-grid">
            <Field name="title" label="Opportunity name" required full error={errors.title}>
              <input {...control('title')} data-autofocus autoComplete="off" value={form.title} onChange={event => update('title', event.target.value)} placeholder="e.g. Open Source Builder Grant" aria-required="true" />
            </Field>
            <Field name="organization" label="Organization" required error={errors.organization}>
              <input {...control('organization')} autoComplete="organization" value={form.organization} onChange={event => update('organization', event.target.value)} placeholder="Who runs it?" aria-required="true" />
            </Field>
            <Field name="kind" label="Type">
              <select {...control('kind')} value={form.kind} onChange={event => update('kind', event.target.value as Kind)}>
                {kinds.map(kind => <option key={kind} value={kind}>{capitalize(kind)}</option>)}
              </select>
            </Field>
            <Field name="deadline" label="Deadline" required error={errors.deadline}>
              <input {...control('deadline')} type="date" value={form.deadline} onChange={event => update('deadline', event.target.value)} aria-required="true" />
            </Field>
            <Field name="status" label="Status">
              <select {...control('status')} value={form.status} onChange={event => update('status', event.target.value as Status)}>
                {statuses.map(status => <option key={status} value={status}>{capitalize(status)}</option>)}
              </select>
            </Field>
            <Field name="reward" label="Reward or funding">
              <input {...control('reward')} autoComplete="off" value={form.reward} onChange={event => update('reward', event.target.value)} placeholder="e.g. $10k funding" />
            </Field>
            <Field name="url" label="Website link" error={errors.url}>
              <input {...control('url')} type="url" inputMode="url" autoComplete="url" autoCapitalize="none" spellCheck={false} value={form.url} onChange={event => update('url', event.target.value)} placeholder="https://" />
            </Field>
            <Field name="tags" label="Tags" hint="separate with commas" full>
              <input {...control('tags')} autoComplete="off" value={tagsText} onChange={event => setTagsText(event.target.value)} placeholder="AI, Open source, Design" />
            </Field>
            <Field name="description" label="Notes" full>
              <textarea {...control('description')} value={form.description} onChange={event => update('description', event.target.value)} placeholder="What makes this one interesting?" rows={3} />
            </Field>
          </div>
          <div className="modal-footer">
            <button className="secondary-button" type="button" onClick={close}>Cancel</button>
            <button className="primary-button" type="submit"><Check size={16} aria-hidden="true" /> {initial ? 'Save changes' : 'Add opportunity'}</button>
          </div>
        </form>
      </>}
    </Modal>
  )
}

function Field({ name, label, required, hint, error, full, children }: { name: string, label: string, required?: boolean, hint?: string, error?: string, full?: boolean, children: ReactNode }) {
  return (
    <div className={`field ${full ? 'field-full' : ''}`}>
      <label htmlFor={`opp-${name}`}>{label}{required && <b aria-hidden="true"> *</b>}{hint && <small> ({hint})</small>}</label>
      {children}
      {error && <p className="field-error" id={`opp-${name}-error`} role="alert">{error}</p>}
    </div>
  )
}

export default App
