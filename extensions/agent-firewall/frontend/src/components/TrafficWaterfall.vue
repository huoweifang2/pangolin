<template>
  <div class="traffic-panel">
    <!-- Panel header -->
    <div class="panel-header">
      <div class="ph-left">
        <span class="ph-title">Traffic</span>
        <span class="ph-count">{{ filteredEvents.length }}</span>
      </div>
      <div class="ph-right">
        <select v-model="verdictFilter" class="ph-filter">
          <option value="">All</option>
          <option value="ALLOW">Allow</option>
          <option value="BLOCK">Block</option>
          <option value="ESCALATE">Escalate</option>
        </select>
        <input v-model="searchQuery" class="ph-search" placeholder="Filter..." />
        <button class="ph-btn" :class="{ active: autoScroll }" @click="autoScroll = !autoScroll" title="Auto-scroll">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
        <button class="ph-btn" @click="$emit('clear')" title="Clear">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Waterfall list -->
    <div class="waterfall" ref="waterfallEl">
      <div
        v-for="(event, idx) in filteredEvents"
        :key="idx"
        class="wf-row"
        :class="{
          alert: event.is_alert,
          blocked: event.analysis?.verdict === 'BLOCK',
          escalated: event.analysis?.verdict === 'ESCALATE',
          selected: selectedEvent === event,
        }"
        @click="selectedEvent = selectedEvent === event ? null : event"
      >
        <div class="wf-main">
          <span class="wf-time">{{ formatTime(event.timestamp) }}</span>
          <span class="wf-verdict" :class="(event.analysis?.verdict || 'ALLOW').toLowerCase()">
            {{ (event.analysis?.verdict || 'ALLOW').charAt(0) }}
          </span>
          <span class="wf-method">{{ event.method }}</span>
          <span class="wf-threat" :class="(event.analysis?.threat_level || 'NONE').toLowerCase()">
            {{ event.analysis?.threat_level || '—' }}
          </span>
        </div>
        <div class="wf-preview">{{ event.payload_preview?.slice(0, 120) }}</div>

        <!-- Expanded detail -->
        <div v-if="selectedEvent === event" class="wf-detail" @click.stop>
          <div class="detail-section">
            <div class="dl"><span class="dk">Session</span><span class="dv mono">{{ event.session_id }}</span></div>
            <div class="dl"><span class="dk">Agent</span><span class="dv">{{ event.agent_id || '—' }}</span></div>
            <div class="dl"><span class="dk">Type</span><span class="dv">{{ event.event_type }}</span></div>
          </div>

          <div v-if="event.analysis" class="detail-section">
            <div class="dl">
              <span class="dk">Verdict</span>
              <span class="verdict-chip" :class="event.analysis.verdict.toLowerCase()">{{ event.analysis.verdict }}</span>
            </div>
            <div class="dl">
              <span class="dk">Threat</span>
              <span class="threat-chip" :class="event.analysis.threat_level.toLowerCase()">{{ event.analysis.threat_level }}</span>
            </div>
            <div v-if="event.analysis.l1_matched_patterns?.length" class="dl">
              <span class="dk">L1</span>
              <div class="pattern-tags">
                <span v-for="p in event.analysis.l1_matched_patterns" :key="p" class="ptag">{{ p }}</span>
              </div>
            </div>
            <div class="dl">
              <span class="dk">L2</span>
              <span class="dv">{{ event.analysis.l2_is_injection ? `Injection (${(event.analysis.l2_confidence * 100).toFixed(0)}%)` : 'Clean' }}</span>
            </div>
            <div v-if="event.analysis.l2_reasoning" class="dl">
              <span class="dk">Reason</span>
              <span class="dv reasoning">{{ event.analysis.l2_reasoning }}</span>
            </div>
          </div>

          <div v-if="event.payload_preview" class="detail-section">
            <div class="dk">Payload</div>
            <pre class="payload-pre">{{ event.payload_preview }}</pre>
          </div>

          <div v-if="event.analysis?.verdict === 'ESCALATE'" class="detail-actions">
            <button class="da-btn allow" @click="$emit('verdict', event.analysis!.request_id, 'allow')">Allow</button>
            <button class="da-btn block" @click="$emit('verdict', event.analysis!.request_id, 'block')">Block</button>
          </div>
        </div>
      </div>

      <div v-if="filteredEvents.length === 0" class="wf-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="24" height="24">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
        <span>Waiting for traffic...</span>
      </div>
    </div>

    <!-- Panel footer -->
    <div class="panel-footer">
      <span>{{ filteredEvents.length }}<span v-if="verdictFilter || searchQuery"> / {{ events.length }}</span> events</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import type { FirewallEvent } from '../types'

const props = defineProps<{
  events: FirewallEvent[]
  compact?: boolean
}>()

defineEmits<{
  clear: []
  verdict: [requestId: string, action: 'allow' | 'block']
}>()

const selectedEvent = ref<FirewallEvent | null>(null)
const verdictFilter = ref('')
const searchQuery = ref('')
const autoScroll = ref(true)
const waterfallEl = ref<HTMLElement | null>(null)

const filteredEvents = computed(() => {
  return props.events.filter((e) => {
    if (verdictFilter.value && (e.analysis?.verdict || 'ALLOW') !== verdictFilter.value) return false
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      return e.method.toLowerCase().includes(q) || e.payload_preview?.toLowerCase().includes(q) || e.agent_id?.toLowerCase().includes(q)
    }
    return true
  })
})

watch(() => props.events.length, () => {
  if (autoScroll.value) {
    nextTick(() => { if (waterfallEl.value) waterfallEl.value.scrollTop = waterfallEl.value.scrollHeight })
  }
})

function formatTime(ts: number): string {
  return new Date(ts * 1000).toLocaleTimeString('en-US', { hour12: false, fractionalSecondDigits: 1 } as any)
}
</script>

<style scoped>
.traffic-panel { display: flex; flex-direction: column; height: 100%; background: var(--bg-primary); }

/* Header */
.panel-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 10px; border-bottom: 1px solid var(--border); background: var(--bg-secondary);
  flex-shrink: 0; height: 36px;
}
.ph-left { display: flex; align-items: center; gap: 6px; }
.ph-title { font-size: 11px; font-weight: 600; color: var(--text-primary); letter-spacing: -0.01em; }
.ph-count { font-size: 9px; padding: 1px 5px; border-radius: 8px; background: var(--bg-surface); color: var(--text-dim); font-family: var(--font-mono); }
.ph-right { display: flex; align-items: center; gap: 4px; }
.ph-filter {
  background: var(--bg-surface); border: 1px solid var(--border); color: var(--text-muted);
  padding: 2px 6px; border-radius: var(--radius-sm); font-size: 10px;
}
.ph-search {
  width: 100px; background: var(--bg-surface); border: 1px solid var(--border); color: var(--text-primary);
  padding: 2px 6px; border-radius: var(--radius-sm); font-size: 10px; outline: none;
}
.ph-search:focus { border-color: var(--accent); }
.ph-btn {
  width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;
  border: 1px solid var(--border); border-radius: var(--radius-sm); background: transparent;
  color: var(--text-dim); cursor: pointer; transition: all 0.1s;
}
.ph-btn:hover { border-color: var(--border-hover); color: var(--text-secondary); }
.ph-btn.active { color: var(--accent); border-color: var(--accent); }

/* Waterfall */
.waterfall { flex: 1; overflow-y: auto; font-size: 11px; }

.wf-row {
  padding: 5px 10px; border-bottom: 1px solid var(--border-subtle); cursor: pointer; transition: background 0.1s;
}
.wf-row:hover { background: var(--bg-hover); }
.wf-row.selected { background: var(--bg-active); }
.wf-row.blocked { border-left: 2px solid var(--accent-red); padding-left: 8px; }
.wf-row.escalated { border-left: 2px solid var(--accent-yellow); padding-left: 8px; }
.wf-row.alert { background: var(--accent-red-muted); }

.wf-main { display: flex; align-items: center; gap: 6px; }
.wf-time { font-size: 9px; color: var(--text-dim); font-family: var(--font-mono); white-space: nowrap; min-width: 65px; }
.wf-verdict {
  width: 16px; height: 16px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  font-size: 8px; font-weight: 800; flex-shrink: 0;
}
.wf-verdict.allow { background: var(--accent-green-muted); color: var(--accent-green); }
.wf-verdict.block { background: var(--accent-red-muted); color: var(--accent-red); }
.wf-verdict.escalate { background: var(--accent-yellow-muted); color: var(--accent-yellow); }
.wf-method { font-weight: 500; color: var(--accent); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; min-width: 0; }
.wf-threat { font-size: 9px; font-weight: 600; flex-shrink: 0; }
.wf-threat.none { color: var(--text-disabled); }
.wf-threat.low { color: var(--accent); }
.wf-threat.medium { color: var(--accent-yellow); }
.wf-threat.high { color: var(--accent-orange); }
.wf-threat.critical { color: var(--accent-red); }

.wf-preview {
  font-size: 10px; color: var(--text-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  margin-top: 1px; padding-left: 87px;
}

/* Detail (expanded) */
.wf-detail {
  margin-top: 6px; padding: 8px; background: var(--bg-elevated); border: 1px solid var(--border);
  border-radius: var(--radius-md); font-size: 10px;
}
.detail-section { margin-bottom: 8px; }
.detail-section:last-child { margin-bottom: 0; }
.dl { display: flex; align-items: flex-start; gap: 6px; margin-bottom: 3px; }
.dk { color: var(--text-dim); font-weight: 600; min-width: 50px; text-transform: uppercase; font-size: 9px; flex-shrink: 0; }
.dv { color: var(--text-secondary); word-break: break-all; }
.dv.mono { font-family: var(--font-mono); font-size: 9px; }
.dv.reasoning { line-height: 1.4; }

.verdict-chip, .threat-chip {
  font-size: 9px; padding: 1px 6px; border-radius: 3px; font-weight: 700; text-transform: uppercase;
}
.verdict-chip.allow { background: var(--accent-green-muted); color: var(--accent-green); }
.verdict-chip.block, .verdict-chip.escalate { background: var(--accent-red-muted); color: var(--accent-red); }
.threat-chip.none { background: var(--accent-green-muted); color: var(--accent-green); }
.threat-chip.low { background: var(--accent-muted); color: var(--accent); }
.threat-chip.medium { background: var(--accent-yellow-muted); color: var(--accent-yellow); }
.threat-chip.high, .threat-chip.critical { background: var(--accent-red-muted); color: var(--accent-red); }

.pattern-tags { display: flex; flex-wrap: wrap; gap: 3px; }
.ptag { font-size: 9px; padding: 1px 4px; border-radius: 2px; background: var(--accent-red-muted); color: var(--accent-red); font-family: var(--font-mono); }

.payload-pre {
  margin-top: 4px; padding: 6px 8px; background: var(--bg-primary); border: 1px solid var(--border);
  border-radius: var(--radius-sm); font-size: 9px; color: var(--text-muted);
  white-space: pre-wrap; word-break: break-all; max-height: 200px; overflow-y: auto;
  font-family: var(--font-mono);
}

.detail-actions { display: flex; gap: 6px; margin-top: 6px; padding-top: 6px; border-top: 1px solid var(--border); }
.da-btn {
  flex: 1; padding: 5px 0; border: none; border-radius: var(--radius-sm); cursor: pointer;
  font-size: 10px; font-weight: 700; transition: all 0.15s;
}
.da-btn.allow { background: var(--accent-green); color: white; }
.da-btn.block { background: var(--accent-red); color: white; }
.da-btn.allow:hover { filter: brightness(1.15); }
.da-btn.block:hover { filter: brightness(1.15); }

/* Empty */
.wf-empty {
  display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 48px 16px;
  color: var(--text-disabled); font-size: 11px;
}

/* Footer */
.panel-footer {
  padding: 4px 10px; border-top: 1px solid var(--border); background: var(--bg-secondary);
  font-size: 9px; color: var(--text-dim); flex-shrink: 0;
}
</style>
