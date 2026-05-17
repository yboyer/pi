import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

import type { ExtensionAPI, ExtensionContext } from '@earendil-works/pi-coding-agent'

const execFileAsync = promisify(execFile)
const STATUS_KEY = 'copilot-usage'
const REFRESH_INTERVAL_MS = 1 * 60 * 1000
const GH_ARGS = ['api', '/copilot_internal/user']

type PremiumInteractionsSnapshot = {
  overage_count?: number
  overage_permitted?: boolean
  percent_remaining?: number
  quota_id?: string
  quota_remaining?: number
  unlimited?: boolean
  timestamp_utc?: string
  has_quota?: boolean
  quota_reset_at?: number
  token_based_billing?: boolean
  remaining?: number
  entitlement?: number
}

type CopilotUserResponse = {
  copilot_plan?: string
  quota_reset_date?: string
  quota_reset_date_utc?: string
  quota_snapshots?: {
    premium_interactions?: PremiumInteractionsSnapshot
  }
}

type UsageState = {
  status: string
  detail: string
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
    maximumFractionDigits: 1,
  }).format(value)
}

function formatDate(value?: string): string {
  if (!value) return 'inconnue'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('fr-FR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'UTC',
  }).format(date)
}

function buildUsageState(payload: CopilotUserResponse): UsageState {
  const snapshot = payload.quota_snapshots?.premium_interactions
  if (!snapshot) {
    return {
      status: 'GH: indisponible',
      detail: 'Quota `premium_interactions` absent dans réponse GitHub.',
    }
  }

  if (snapshot.unlimited) {
    return {
      status: 'GH: illimitées',
      detail: 'Plan sans quota mensuel pour `premium_interactions`.',
    }
  }

  const entitlement = Number(snapshot.entitlement ?? 0)
  const remaining = Number(snapshot.quota_remaining ?? snapshot.remaining ?? 0)
  const percentRemaining = Number(snapshot.percent_remaining ?? 0)
  const used = Math.floor(Math.max(0, entitlement - remaining))
  const percentUsed = Math.floor(Math.max(0, Math.min(100, 100 - percentRemaining)))
  const resetAt = formatDate(payload.quota_reset_date_utc ?? payload.quota_reset_date)
  const overage = snapshot.overage_permitted ? 'oui' : 'non'
  const plan = payload.copilot_plan ?? 'inconnu'

  return {
    status: `${formatNumber(percentUsed)}% (${formatNumber(used)} / ${formatNumber(entitlement)})`,
    detail: `Plan: ${plan} · restant: ${formatNumber(remaining)} · reset: ${resetAt} · overage: ${overage}`,
  }
}

async function fetchUsage(): Promise<UsageState> {
  const { stdout } = await execFileAsync('gh', GH_ARGS, {
    timeout: 15_000,
    maxBuffer: 1024 * 1024,
  })

  const payload = JSON.parse(stdout) as CopilotUserResponse
  return buildUsageState(payload)
}

export default function copilotUsageExtension(pi: ExtensionAPI) {
  let timer: NodeJS.Timeout | undefined
  let refreshPromise: Promise<void> | undefined

  const refresh = async (ctx: ExtensionContext, notify = false) => {
    if (refreshPromise) return refreshPromise

    refreshPromise = (async () => {
      try {
        const usage = await fetchUsage()
        const theme = ctx.ui.theme
        ctx.ui.setStatus(STATUS_KEY, theme.fg('accent', usage.status))
        if (notify) ctx.ui.notify(`${usage.status} — ${usage.detail}`, 'info')
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        const theme = ctx.ui.theme
        ctx.ui.setStatus(STATUS_KEY, theme.fg('dim', 'GH: erreur'))
        if (notify) ctx.ui.notify(`Impossible de lire usage Copilot: ${message}`, 'error')
      }
    })()

    try {
      await refreshPromise
    } finally {
      refreshPromise = undefined
    }
  }

  pi.registerCommand('copilot-usage', {
    description: 'Rafraîchir et afficher usage actuel des demandes Premium Copilot',
    handler: async (_args, ctx) => {
      await refresh(ctx, true)
    },
  })

  pi.on('session_start', async (_event, ctx) => {
    const theme = ctx.ui.theme
    ctx.ui.setStatus(STATUS_KEY, theme.fg('dim', 'GH: chargement…'))
    await refresh(ctx, false)

    if (timer) clearInterval(timer)
    timer = setInterval(() => {
      void refresh(ctx, false)
    }, REFRESH_INTERVAL_MS)
  })

  pi.on('session_shutdown', async () => {
    if (timer) {
      clearInterval(timer)
      timer = undefined
    }
  })
}
