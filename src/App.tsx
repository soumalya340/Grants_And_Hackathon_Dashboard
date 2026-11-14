import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Award,
  Bookmark,
  CalendarDays,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  Command,
  Download,
  ExternalLink,
  Filter,
  Gift,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  Plus,
  Search,
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

function daysUntil(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  const due = new Date(year, month - 1, day)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((due.getTime() - today.getTime()) / 86400000)
}

function formatDate(value: string, monthStyle: 'short' | 'long' = 'short') {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-US', { month: monthStyle, day: 'numeric', year: monthStyle === 'long' ? 'numeric' : undefined })
}

function deadlineLabel(value: string) {
  const days = daysUntil(value)
  if (days < 0) return 'Closed'
  if (days === 0) return 'Due today'
  if (days === 1) return '1 day left'
  return `${days} days left`
}

function kindIcon(kind: Kind): LucideIcon {
  return kind === 'grant' ? Gift : kind === 'hackathon' ? Trophy : Target
}

function isOpen(item: Opportunity) {
  return item.status !== 'won' && daysUntil(item.deadline) >= 0
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

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(opportunities))
  }, [opportunities])

  useEffect(() => {
    if (!isFormOpen && !showHelp) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setIsFormOpen(false); setShowHelp(false) }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isFormOpen, showHelp])

  const active = useMemo(() => opportunities.filter(isOpen), [opportunities])
  const upcoming = useMemo(() => [...active].sort((a, b) => a.deadline.localeCompare(b.deadline)), [active])
  const closingSoon = active.filter(item => daysUntil(item.deadline) <= 7).length
  const submitted = opportunities.filter(item => item.status === 'submitted').length
  const won = opportunities.filter(item => item.status === 'won').length
  const sampleCount = opportunities.filter(item => item.sample).length

  const filtered = useMemo(() => opportunities
    .filter(item => kindFilter === 'all' || item.kind === kindFilter)
    .filter(item => statusFilter === 'all' || item.status === statusFilter)
    .filter(item => `${item.title} ${item.organization} ${item.tags.join(' ')}`.toLowerCase().includes(search.toLowerCase().trim()))
    .sort((a, b) => a.deadline.localeCompare(b.deadline)), [opportunities, kindFilter, statusFilter, search])

  function navigate(next: View, kind: Kind | 'all' = 'all') {
    setView(next)
    setKindFilter(kind)
    setStatusFilter('all')
    setSearch('')
    setMenuOpen(false)
  }

  function saveOpportunity(value: Opportunity) {
    setOpportunities(current => editing
      ? current.map(item => item.id === editing.id ? value : item)
      : [value, ...current])
    setIsFormOpen(false)
    setEditing(null)
  }

  function updateStatus(id: string, status: Status) {
    setOpportunities(current => current.map(item => item.id === id ? { ...item, status, sample: false } : item))
  }

  function deleteOpportunity(item: Opportunity) {
    if (window.confirm(`Delete “${item.title}”?`)) {
      setOpportunities(current => current.filter(entry => entry.id !== item.id))
    }
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(opportunities, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'orbit-opportunities.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  function removeSamples() {
    setOpportunities(current => current.filter(item => !item.sample))
  }

  const highlighted = upcoming[0]
  const counts = Object.fromEntries(kinds.map(kind => [kind, active.filter(item => item.kind === kind).length])) as Record<Kind, number>
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`} aria-label="Primary navigation">
        <button className="brand" type="button" onClick={() => navigate('overview')} aria-label="Orbit overview">
          <span className="brand-mark"><span /></span>
          <span>orbit<span className="brand-dot">.</span></span>
        </button>

        <div className="workspace-switcher">
          <div className="workspace-avatar">M</div>
          <div className="workspace-label"><strong>My workspace</strong><span>Personal dashboard</span></div>
        </div>

        <div className="nav-group">
          <span className="nav-caption">WORKSPACE</span>
          <NavButton icon={LayoutDashboard} label="Overview" active={view === 'overview'} onClick={() => navigate('overview')} />
          <NavButton icon={Bookmark} label="All opportunities" active={view === 'opportunities' && kindFilter === 'all'} onClick={() => navigate('opportunities')} count={opportunities.length} />
          <NavButton icon={CalendarDays} label="Deadlines" active={view === 'deadlines'} onClick={() => navigate('deadlines')} />
        </div>
        <div className="nav-group category-nav">
          <span className="nav-caption">EXPLORE</span>
          <NavButton icon={Gift} label="Grants" active={view === 'opportunities' && kindFilter === 'grant'} onClick={() => navigate('opportunities', 'grant')} dot="mint" />
          <NavButton icon={Trophy} label="Hackathons" active={view === 'opportunities' && kindFilter === 'hackathon'} onClick={() => navigate('opportunities', 'hackathon')} dot="peach" />
          <NavButton icon={Target} label="Bounties" active={view === 'opportunities' && kindFilter === 'bounty'} onClick={() => navigate('opportunities', 'bounty')} dot="lavender" />
        </div>

        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <div className="tip-icon"><Sparkles size={17} aria-hidden="true" /></div>
            <strong>Keep your momentum.</strong>
            <p>Every big win starts with one application.</p>
            <button type="button" onClick={() => { setEditing(null); setIsFormOpen(true); setMenuOpen(false) }}>Add an opportunity <ArrowUpRight size={14} aria-hidden="true" /></button>
          </div>
          <button className="sidebar-help" type="button" onClick={() => setShowHelp(true)}><CircleHelp size={18} aria-hidden="true" /> How it works</button>
        </div>
      </aside>

      {menuOpen && <button className="mobile-scrim" aria-label="Close menu" onClick={() => setMenuOpen(false)} />}

      <main className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <button className="mobile-menu icon-button" type="button" aria-label="Open menu" onClick={() => setMenuOpen(true)}><Menu size={21} /></button>
            <span className="breadcrumb">Workspace <span>/</span> <strong>{view === 'overview' ? 'Overview' : view === 'deadlines' ? 'Deadlines' : kindFilter === 'all' ? 'Opportunities' : `${kindFilter[0].toUpperCase()}${kindFilter.slice(1)}s`}</strong></span>
          </div>
          <div className="topbar-actions">
            <label className="search-box"><Search size={17} aria-hidden="true" /><span className="sr-only">Search opportunities</span><input value={search} onChange={event => { setSearch(event.target.value); if (event.target.value) setView('opportunities') }} placeholder="Search opportunities..." /></label>
            <button className="topbar-icon icon-button" type="button" aria-label="Export data" title="Export data" onClick={exportData}><Download size={18} /></button>
            <div className="topbar-avatar" aria-label="My workspace">M</div>
          </div>
        </header>

        <div className="page-content">
          {view === 'overview' ? <>
            <div className="page-intro">
              <div><div className="eyebrow"><span className="eyebrow-line" /> YOUR OPPORTUNITY SPACE</div><h1>{greeting}<span className="heading-period">.</span></h1><p>One place for the things worth building toward.</p></div>
              <button className="primary-button" type="button" onClick={() => { setEditing(null); setIsFormOpen(true) }}><Plus size={18} aria-hidden="true" /> Add opportunity</button>
            </div>

            {sampleCount > 0 && <div className="sample-notice"><Sparkles size={16} aria-hidden="true" /><span>You’re viewing {sampleCount} fictional starter example{sampleCount === 1 ? '' : 's'}. Add your own opportunities to make this space yours.</span><button type="button" onClick={removeSamples}>Remove examples <X size={14} aria-hidden="true" /></button></div>}

            <section className="hero-grid" aria-label="Overview highlights">
              <div className="hero-card">
                <div className="hero-card-top"><span className="hero-pill"><span /> YOUR NEXT MOVE</span><Command size={20} strokeWidth={1.5} aria-hidden="true" /></div>
                <div className="hero-art" aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="orbit orbit-three" /><div className="planet planet-one" /><div className="planet planet-two" /><div className="planet-center"><Sparkles size={25} strokeWidth={1.5} /></div><div className="orbit-cross">✳</div></div>
                <div className="hero-copy"><span className="hero-kicker">THE CLOSEST DEADLINE</span><h2>{highlighted ? highlighted.title : 'Your next big thing'}</h2><p>{highlighted ? `${highlighted.organization} · ${formatDate(highlighted.deadline, 'long')}` : 'Add an opportunity to get started.'}</p></div>
                <button className="hero-arrow" type="button" aria-label="View closest deadline" onClick={() => navigate('deadlines')}><ArrowUpRight size={22} /></button>
              </div>
              <div className="metrics-grid">
                <MetricCard label="Active opportunities" value={active.length} icon={ArrowUpRight} tone="green" note="On your radar" />
                <MetricCard label="Closing this week" value={closingSoon} icon={Clock3} tone="orange" note="Give these focus" />
                <MetricCard label="Submitted" value={submitted} icon={ArrowDownRight} tone="purple" note="In the pipeline" />
                <MetricCard label="Wins" value={won} icon={Award} tone="yellow" note="Keep it going" />
              </div>
            </section>

            <div className="overview-lower">
              <section className="panel opportunity-panel">
                <div className="panel-heading"><div><span className="section-kicker">STAY ON TRACK</span><h2>Coming up next</h2></div><button className="text-button" type="button" onClick={() => navigate('deadlines')}>View deadlines <ArrowRight size={16} aria-hidden="true" /></button></div>
                {upcoming.length ? <div className="upcoming-list">{upcoming.slice(0, 4).map(item => <UpcomingRow key={item.id} item={item} onEdit={() => { setEditing(item); setIsFormOpen(true) }} />)}</div> : <EmptyState title="Nothing on the horizon" body="Add a deadline to see your next moves here." onAdd={() => { setEditing(null); setIsFormOpen(true) }} />}
              </section>
              <section className="panel focus-panel">
                <div className="panel-heading"><div><span className="section-kicker">AT A GLANCE</span><h2>Your mix</h2></div><MoreHorizontal size={20} aria-hidden="true" /></div>
                <div className="mix-chart"><div className="mix-total"><strong>{active.length}</strong><span>active<br />opportunities</span></div><div className={`mix-ring ${active.length ? '' : 'empty'}`} style={{ '--grant': `${active.length ? counts.grant / active.length * 100 : 0}%`, '--hackathon': `${active.length ? (counts.grant + counts.hackathon) / active.length * 100 : 0}%` } as React.CSSProperties}><div /></div></div>
                <div className="mix-legend">{kinds.map(kind => <div key={kind}><span className={`legend-dot ${kind}`} /><span>{kind[0].toUpperCase() + kind.slice(1)}s</span><strong>{counts[kind]}</strong></div>)}</div>
              </section>
            </div>
            <section className="featured-section"><div className="panel-heading"><div><span className="section-kicker">YOUR RADAR</span><h2>Opportunities to watch</h2></div><button className="text-button" type="button" onClick={() => navigate('opportunities')}>See all <ArrowRight size={16} aria-hidden="true" /></button></div><div className="card-grid">{upcoming.slice(0, 3).map(item => <OpportunityCard key={item.id} item={item} onEdit={() => { setEditing(item); setIsFormOpen(true) }} onDelete={() => deleteOpportunity(item)} onStatus={status => updateStatus(item.id, status)} />)}{!upcoming.length && <EmptyState title="Build your radar" body="Your saved opportunities will appear here." onAdd={() => { setEditing(null); setIsFormOpen(true) }} />}</div></section>
          </> : view === 'opportunities' ? <>
            <PageHeading kicker="YOUR RADAR" title={kindFilter === 'all' ? 'All opportunities' : `${kindFilter[0].toUpperCase()}${kindFilter.slice(1)}s`} subtitle="Keep every possibility in sight, from first idea to final result." onAdd={() => { setEditing(null); setIsFormOpen(true) }} />
            <div className="filter-row"><div className="filter-tabs">{(['all', ...kinds] as const).map(kind => <button key={kind} className={kindFilter === kind ? 'active' : ''} type="button" onClick={() => setKindFilter(kind)}>{kind === 'all' ? 'All' : `${kind[0].toUpperCase()}${kind.slice(1)}s`}</button>)}</div><label className="status-filter"><Filter size={16} aria-hidden="true" /><span className="sr-only">Filter by status</span><select value={statusFilter} onChange={event => setStatusFilter(event.target.value as Status | 'all')}><option value="all">All statuses</option>{statuses.map(status => <option key={status} value={status}>{status[0].toUpperCase() + status.slice(1)}</option>)}</select><ChevronDown size={15} aria-hidden="true" /></label></div>
            <div className="list-summary">Showing <strong>{filtered.length}</strong> {filtered.length === 1 ? 'opportunity' : 'opportunities'}{search ? <> matching <strong>“{search}”</strong></> : null}</div>
            {filtered.length ? <div className="card-grid all-cards">{filtered.map(item => <OpportunityCard key={item.id} item={item} onEdit={() => { setEditing(item); setIsFormOpen(true) }} onDelete={() => deleteOpportunity(item)} onStatus={status => updateStatus(item.id, status)} />)}</div> : <EmptyState title="No opportunities found" body="Try another search or add a new opportunity." onAdd={() => { setEditing(null); setIsFormOpen(true) }} />}
          </> : <>
            <PageHeading kicker="PLAN AHEAD" title="Deadlines" subtitle="A clear view of what needs your attention next." onAdd={() => { setEditing(null); setIsFormOpen(true) }} />
            <div className="deadline-summary"><div><Clock3 size={19} aria-hidden="true" /><span><strong>{closingSoon}</strong> closing this week</span></div><div><CalendarDays size={19} aria-hidden="true" /><span><strong>{active.length}</strong> active deadlines</span></div></div>
            {upcoming.length ? <div className="deadline-list">{upcoming.map((item, index) => <div className="deadline-entry" key={item.id}><div className="timeline-rail"><span className={index === 0 ? 'timeline-dot first' : 'timeline-dot'} /></div><div className="deadline-date"><strong>{formatDate(item.deadline).split(' ')[1]}</strong><span>{formatDate(item.deadline).split(' ')[0].toUpperCase()}</span></div><div className="deadline-main"><span className={`kind-label ${item.kind}`}>{item.kind}</span><h3>{item.title}</h3><p>{item.organization} <span>·</span> {item.reward || 'Reward not set'}</p></div><div className="deadline-right"><span className={daysUntil(item.deadline) <= 7 ? 'urgent' : ''}>{deadlineLabel(item.deadline)}</span><button className="round-arrow" type="button" aria-label={`Edit ${item.title}`} onClick={() => { setEditing(item); setIsFormOpen(true) }}><ArrowUpRight size={18} /></button></div></div>)}</div> : <EmptyState title="No upcoming deadlines" body="Add an opportunity with a deadline to plan your next move." onAdd={() => { setEditing(null); setIsFormOpen(true) }} />}
          </>}
        </div>
      </main>

      {isFormOpen && <OpportunityForm initial={editing} onClose={() => { setIsFormOpen(false); setEditing(null) }} onSave={saveOpportunity} />}
      {showHelp && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setShowHelp(false) }}><div className="help-dialog" role="dialog" aria-modal="true" aria-labelledby="help-title"><button className="modal-close icon-button" type="button" aria-label="Close" onClick={() => setShowHelp(false)}><X size={20} /></button><span className="section-kicker">WELCOME TO ORBIT</span><h2 id="help-title">Your opportunity command center.</h2><p>Save grants, hackathons, and bounties in one place. Track deadlines, update your progress, and keep the next move visible.</p><div className="help-steps"><div><span>01</span><strong>Add opportunities</strong><p>Record the details and deadline that matter to you.</p></div><div><span>02</span><strong>Move them forward</strong><p>Change status as you work, submit, and win.</p></div><div><span>03</span><strong>Keep a copy</strong><p>Use the download button to export your entries as JSON.</p></div></div><p className="help-note">Your data is stored in this browser. Starter examples are fictional.</p><button className="primary-button" type="button" onClick={() => { setShowHelp(false); setEditing(null); setIsFormOpen(true) }}>Add your first opportunity <ArrowRight size={17} /></button></div></div>}
    </div>
  )
}

function NavButton({ icon: Icon, label, active, onClick, count, dot }: { icon: LucideIcon, label: string, active: boolean, onClick: () => void, count?: number, dot?: string }) {
  return <button className={`nav-button ${active ? 'active' : ''}`} type="button" onClick={onClick}><Icon size={18} strokeWidth={1.8} aria-hidden="true" /><span>{label}</span>{count !== undefined && <small>{count}</small>}{dot && <i className={`nav-dot ${dot}`} />}</button>
}

function MetricCard({ label, value, icon: Icon, tone, note }: { label: string, value: number, icon: LucideIcon, tone: string, note: string }) {
  return <div className="metric-card"><div className="metric-top"><span>{label}</span><div className={`metric-icon ${tone}`}><Icon size={18} strokeWidth={2} aria-hidden="true" /></div></div><strong>{String(value).padStart(2, '0')}</strong><span className="metric-note"><span className={`note-dot ${tone}`} />{note}</span></div>
}

function UpcomingRow({ item, onEdit }: { item: Opportunity, onEdit: () => void }) {
  const Icon = kindIcon(item.kind)
  return <div className="upcoming-row"><div className={`upcoming-icon ${item.kind}`}><Icon size={19} strokeWidth={1.8} aria-hidden="true" /></div><div className="upcoming-info"><strong>{item.title}</strong><span>{item.organization} <b>·</b> {item.kind}</span></div><div className="upcoming-deadline"><strong>{formatDate(item.deadline)}</strong><span className={daysUntil(item.deadline) <= 7 ? 'urgent' : ''}>{deadlineLabel(item.deadline)}</span></div><button className="row-arrow" type="button" aria-label={`Edit ${item.title}`} onClick={onEdit}><ArrowUpRight size={18} /></button></div>
}

function OpportunityCard({ item, onEdit, onDelete, onStatus }: { item: Opportunity, onEdit: () => void, onDelete: () => void, onStatus: (status: Status) => void }) {
  const Icon = kindIcon(item.kind)
  return <article className="opportunity-card"><div className="card-top"><span className={`card-icon ${item.kind}`}><Icon size={21} strokeWidth={1.8} aria-hidden="true" /></span><div className="card-actions"><button className="card-action" type="button" aria-label={`Edit ${item.title}`} onClick={onEdit}><MoreHorizontal size={20} /></button><button className="card-action delete-action" type="button" aria-label={`Delete ${item.title}`} onClick={onDelete}><Trash2 size={17} /></button></div></div><div className="card-body"><div className="card-kind"><span className={`kind-dot ${item.kind}`} />{item.kind.toUpperCase()}{item.sample && <span className="sample-tag">SAMPLE</span>}</div><h3>{item.title}</h3><p>{item.organization}</p><div className="tag-list">{item.tags.slice(0, 2).map(tag => <span key={tag}>{tag}</span>)}</div></div><div className="card-divider" /><div className="card-bottom"><div><span className="card-meta-label">DEADLINE</span><strong><CalendarDays size={14} aria-hidden="true" /> {formatDate(item.deadline)}</strong></div><div><span className="card-meta-label">REWARD</span><strong>{item.reward || '—'}</strong></div></div><div className="card-footer"><label className={`card-status ${item.status.replace(' ', '-')}`}><span className="sr-only">Status for {item.title}</span><select value={item.status} onChange={event => onStatus(event.target.value as Status)}>{statuses.map(status => <option key={status} value={status}>{status[0].toUpperCase() + status.slice(1)}</option>)}</select><ChevronDown size={13} aria-hidden="true" /></label>{item.url ? <a href={item.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${item.title} website`} className="card-link"><ExternalLink size={17} /></a> : <button className="card-link" type="button" aria-label={`Edit ${item.title} to add a link`} onClick={onEdit}><ArrowUpRight size={18} /></button>}</div></article>
}

function EmptyState({ title, body, onAdd }: { title: string, body: string, onAdd: () => void }) {
  return <div className="empty-state"><div><Sparkles size={24} strokeWidth={1.5} aria-hidden="true" /></div><h3>{title}</h3><p>{body}</p><button type="button" onClick={onAdd}><Plus size={16} aria-hidden="true" /> Add opportunity</button></div>
}

function PageHeading({ kicker, title, subtitle, onAdd }: { kicker: string, title: string, subtitle: string, onAdd: () => void }) {
  return <div className="page-intro inner-intro"><div><div className="eyebrow"><span className="eyebrow-line" /> {kicker}</div><h1>{title}<span className="heading-period">.</span></h1><p>{subtitle}</p></div><button className="primary-button" type="button" onClick={onAdd}><Plus size={18} aria-hidden="true" /> Add opportunity</button></div>
}

function OpportunityForm({ initial, onClose, onSave }: { initial: Opportunity | null, onClose: () => void, onSave: (item: Opportunity) => void }) {
  const [form, setForm] = useState<Omit<Opportunity, 'id'>>(initial ? { ...initial, sample: false } : emptyOpportunity)
  const [tagsText, setTagsText] = useState(initial?.tags.join(', ') || '')
  const [error, setError] = useState('')

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) { setForm(current => ({ ...current, [key]: value })); setError('') }
  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!form.title.trim() || !form.organization.trim() || !form.deadline) { setError('Add a title, organization, and deadline.'); return }
    if (form.url && !/^https?:\/\//i.test(form.url)) { setError('Website link must start with http:// or https://.'); return }
    onSave({ ...form, id: initial?.id || crypto.randomUUID(), title: form.title.trim(), organization: form.organization.trim(), reward: form.reward.trim(), url: form.url.trim(), description: form.description.trim(), tags: tagsText.split(',').map(tag => tag.trim()).filter(Boolean).slice(0, 5), sample: false })
  }

  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}><div className="form-dialog" role="dialog" aria-modal="true" aria-labelledby="form-title"><div className="modal-header"><div><span className="section-kicker">YOUR RADAR</span><h2 id="form-title">{initial ? 'Edit opportunity' : 'New opportunity'}</h2><p>Capture the details now. Make the next move later.</p></div><button className="modal-close icon-button" type="button" aria-label="Close" onClick={onClose}><X size={20} /></button></div><form onSubmit={submit}><div className="form-grid"><label className="field field-full"><span>Opportunity name <b>*</b></span><input autoFocus value={form.title} onChange={event => update('title', event.target.value)} placeholder="e.g. Open Source Builder Grant" required /></label><label className="field"><span>Organization <b>*</b></span><input value={form.organization} onChange={event => update('organization', event.target.value)} placeholder="Who runs it?" required /></label><label className="field"><span>Type</span><select value={form.kind} onChange={event => update('kind', event.target.value as Kind)}>{kinds.map(kind => <option key={kind} value={kind}>{kind[0].toUpperCase() + kind.slice(1)}</option>)}</select></label><label className="field"><span>Deadline <b>*</b></span><input type="date" value={form.deadline} onChange={event => update('deadline', event.target.value)} required /></label><label className="field"><span>Status</span><select value={form.status} onChange={event => update('status', event.target.value as Status)}>{statuses.map(status => <option key={status} value={status}>{status[0].toUpperCase() + status.slice(1)}</option>)}</select></label><label className="field"><span>Reward / funding</span><input value={form.reward} onChange={event => update('reward', event.target.value)} placeholder="e.g. $10k funding" /></label><label className="field"><span>Website link</span><input type="url" value={form.url} onChange={event => update('url', event.target.value)} placeholder="https://" /></label><label className="field field-full"><span>Tags <small>(separate with commas)</small></span><input value={tagsText} onChange={event => setTagsText(event.target.value)} placeholder="AI, Open source, Design" /></label><label className="field field-full"><span>Notes</span><textarea value={form.description} onChange={event => update('description', event.target.value)} placeholder="What makes this one interesting?" rows={3} /></label></div>{error && <p className="form-error" role="alert">{error}</p>}<div className="modal-footer"><button className="secondary-button" type="button" onClick={onClose}>Cancel</button><button className="primary-button" type="submit"><Check size={17} aria-hidden="true" /> {initial ? 'Save changes' : 'Add opportunity'}</button></div></form></div></div>
}

export default App
