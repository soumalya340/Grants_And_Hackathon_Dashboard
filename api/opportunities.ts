import { randomUUID, timingSafeEqual } from 'node:crypto'
import { neon } from '@neondatabase/serverless'

type OpportunityInput = {
  id?: string
  title: string
  organization: string
  kind: 'grant' | 'hackathon' | 'bounty'
  status: 'saved' | 'in progress' | 'submitted' | 'won'
  deadline: string
  reward: string
  url: string
  description: string
  tags: string[]
}

const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } })

function authorized(request: Request, secret: string) {
  const supplied = request.headers.get('authorization')?.replace(/^Bearer /i, '') || ''
  const a = Buffer.from(supplied)
  const b = Buffer.from(secret)
  return a.length === b.length && timingSafeEqual(a, b)
}

function parseInput(value: unknown): OpportunityInput | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const item = value as Record<string, unknown>
  const text = (key: string, max: number) => typeof item[key] === 'string' && item[key].length <= max ? item[key].trim() as string : null
  const title = text('title', 200)
  const organization = text('organization', 200)
  const deadline = text('deadline', 10)
  const url = item.url === undefined ? '' : text('url', 2000)
  if (!title || !organization || !deadline || url === null) return null
  if (!['grant', 'hackathon', 'bounty'].includes(String(item.kind))) return null
  if (!['saved', 'in progress', 'submitted', 'won'].includes(String(item.status ?? 'saved'))) return null
  const parsedDeadline = new Date(`${deadline}T00:00:00Z`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(deadline) || Number.isNaN(parsedDeadline.getTime()) || parsedDeadline.toISOString().slice(0, 10) !== deadline) return null
  if (url && (!URL.canParse(url) || !['http:', 'https:'].includes(new URL(url).protocol))) return null
  const tags = item.tags ?? []
  if (!Array.isArray(tags) || tags.length > 5 || tags.some(tag => typeof tag !== 'string' || tag.length > 60)) return null
  const reward = item.reward === undefined ? '' : text('reward', 200)
  const description = item.description === undefined ? '' : text('description', 5000)
  if (reward === null || description === null) return null
  const id = item.id === undefined ? undefined : text('id', 100)
  if (id === null || (id !== undefined && !id)) return null
  return {
    id,
    title,
    organization,
    kind: item.kind as OpportunityInput['kind'],
    status: (item.status ?? 'saved') as OpportunityInput['status'],
    deadline,
    reward,
    url,
    description,
    tags: tags.map(tag => (tag as string).trim()).filter(Boolean),
  }
}

export async function handleOpportunityRequest(request: Request): Promise<Response> {
  const secret = process.env.ORBIT_API_KEY
  const databaseUrl = process.env.DATABASE_URL
  if (!secret || !databaseUrl) return json({ error: 'DATABASE_URL and ORBIT_API_KEY must be configured.' }, 503)
  if (!authorized(request, secret)) return json({ error: 'Unauthorized' }, 401)
  const sql = neon(databaseUrl)

  try {
    if (request.method === 'GET') {
      const rows = await sql`SELECT id, title, organization, kind, status, deadline::text AS deadline, reward, url, description, tags FROM opportunities ORDER BY deadline ASC`
      return json(rows)
    }

    const id = new URL(request.url).searchParams.get('id')
    if (request.method === 'DELETE') {
      if (!id) return json({ error: 'Missing id' }, 400)
      const rows = await sql`DELETE FROM opportunities WHERE id = ${id} RETURNING id`
      return rows.length ? json({ id }) : json({ error: 'Not found' }, 404)
    }

    if (request.method === 'POST' || request.method === 'PUT') {
      let body: unknown
      try { body = await request.json() } catch { return json({ error: 'Invalid JSON' }, 400) }
      const item = parseInput(body)
      if (!item || (request.method === 'PUT' && !id)) return json({ error: 'Invalid opportunity' }, 400)
      if (request.method === 'POST') {
        const rowId = item.id ?? randomUUID()
        const rows = await sql`INSERT INTO opportunities (id, title, organization, kind, status, deadline, reward, url, description, tags)
          VALUES (${rowId}, ${item.title}, ${item.organization}, ${item.kind}, ${item.status}, ${item.deadline}, ${item.reward}, ${item.url}, ${item.description}, ${item.tags})
          RETURNING id, title, organization, kind, status, deadline::text AS deadline, reward, url, description, tags`
        return json(rows[0], 201)
      }
      const rows = await sql`UPDATE opportunities SET title = ${item.title}, organization = ${item.organization}, kind = ${item.kind}, status = ${item.status}, deadline = ${item.deadline}, reward = ${item.reward}, url = ${item.url}, description = ${item.description}, tags = ${item.tags}, updated_at = now()
        WHERE id = ${id} RETURNING id, title, organization, kind, status, deadline::text AS deadline, reward, url, description, tags`
      return rows.length ? json(rows[0]) : json({ error: 'Not found' }, 404)
    }

    return json({ error: 'Method not allowed' }, 405)
  } catch (error) {
    console.error('Opportunity API failed', error)
    return json({ error: 'Database request failed. Check that db/schema.sql has been run.' }, 500)
  }
}

export default { fetch: handleOpportunityRequest }
