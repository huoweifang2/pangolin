<template>
  <div class="benchmark-page">
    <header class="page-header">
      <div class="header-main">
        <h2>OmniSafeBench Evaluation</h2>
        <p class="subtitle">Unified Multimodal Jailbreak Attack & Defense Benchmark</p>
      </div>
      <div class="header-actions">
        <button class="btn-primary" :disabled="isRunning" @click="runBenchmark">
          <span v-if="!isRunning">Start Benchmark</span>
          <span v-else>Running...</span>
        </button>
      </div>
    </header>

    <div class="page-content">
      <!-- Settings Panel -->
      <aside class="sidebar">
        <div class="panel">
          <div class="panel-header"><h3>Configuration</h3></div>
          <div class="panel-body">
            
            <div class="form-group">
              <label>Target Agent Model</label>
              <select v-model="config.model" class="input-field">
                <option value="gpt-4o">GPT-4o</option>
                <option value="claude-3.5-sonnet">Claude 3.5 Sonnet</option>
                <option value="llava-1.5">LLaVA-1.5 (Multimodal)</option>
                <option value="minigpt-4">MiniGPT-4</option>
              </select>
            </div>

            <div class="form-group border-top">
              <label>Attack Method (Stage 1)</label>
              <select v-model="config.attack" class="input-field">
                <option value="figstep">FigStep / FigStep-Pro</option>
                <option value="himrd">HIMRD (Heuristic-Induced)</option>
                <option value="jood">JOOD (Out-of-Distribution)</option>
                <option value="viscra">VisCRA (Visual CRA)</option>
                <option value="mml">MML</option>
                <option value="qr-attack">QR-Attack</option>
              </select>
              <p class="help-text">Select jailbreak generation strategy</p>
            </div>

            <div class="form-group border-top">
              <label>Defense Interceptor (Stage 2)</label>
              <select v-model="config.defense" class="input-field">
                <option value="none">None (Direct Attack)</option>
                <option value="agent-firewall-l1">Agent-Firewall L1 (Static)</option>
                <option value="agent-firewall-l2">Agent-Firewall L2 (Semantic)</option>
                <option value="jailguard">JailGuard</option>
                <option value="cider">CIDER</option>
              </select>
              <p class="help-text">Active defense layer during generation</p>
            </div>

            <div class="form-group border-top">
              <label>Risk Category (Taxonomy)</label>
              <select v-model="config.category" class="input-field">
                <option value="all">All Risk Categories (Full Eval)</option>
                <option value="bias">A. Ethical / Bias & Discrimination</option>
                <option value="illegal">B. Illegal / Crime & Violence</option>
                <option value="privacy">C. Privacy / PII Extraction</option>
                <option value="sexual">D. Harassment & NSFW</option>
              </select>
            </div>

          </div>
        </div>
      </aside>

      <!-- Main Stages & Results -->
      <main class="main-content">
        <!-- Pipeline Visual -->
        <div class="pipeline">
          <div class="stage" :class="{ active: currentStage >= 1, done: currentStage > 1 }">
            <div class="stage-icon">1</div>
            <div class="stage-info">
              <h4>Test Case Gen</h4>
              <span class="mllm-tag">Attack</span>
            </div>
          </div>
          <div class="connector" :class="{ active: currentStage > 1 }"></div>
          
          <div class="stage" :class="{ active: currentStage >= 2, done: currentStage > 2 }">
            <div class="stage-icon">2</div>
            <div class="stage-info">
              <h4>Response Gen</h4>
              <span class="mllm-tag">{{ config.defense !== 'none' ? 'Intercepted' : 'VLM Target' }}</span>
            </div>
          </div>
          <div class="connector" :class="{ active: currentStage > 2 }"></div>
          
          <div class="stage" :class="{ active: currentStage >= 3, done: currentStage > 3 }">
            <div class="stage-icon">3</div>
            <div class="stage-info">
              <h4>Evaluation</h4>
              <span class="mllm-tag">3D Protocol</span>
            </div>
          </div>
        </div>

        <div v-if="currentStage === 0 && !hasResult" class="empty-state">
          <span class="shield-lg">🛡️</span>
          <h3>Ready for Evaluation</h3>
          <p>Configure your target, attack vector, and defense on the left, then start the OmniSafeBench integration.</p>
        </div>

        <!-- In-progress Logs Viewer -->
        <div v-if="currentStage > 0 && currentStage <= 3" class="log-stream">
           <div class="log-header">
              <span>Pipeline Logs</span>
              <div v-if="isRunning" class="spinner-small"></div>
           </div>
           <div class="logs">
             <div v-for="(log, idx) in logs" :key="idx" class="log-line">
               <span class="time">{{ log.time }}</span>
               <span :class="'log-level-' + log.level">[{{ log.level }}]</span>
               <span class="msg">{{ log.msg }}</span>
             </div>
           </div>
        </div>

        <!-- Final Results Dashboard -->
        <div v-if="hasResult && !isRunning" class="results-dashboard">
          <h3>Evaluation Results</h3>
          <div class="radar-summary">
            <!-- 3D Protocol Cards -->
            <div class="score-card">
              <div class="score-title">Harmfulness</div>
              <div class="score-value highlight-red">{{ result.harmfulness }}/5</div>
              <div class="score-desc">Content danger level (lower is better)</div>
            </div>
            <div class="score-card">
              <div class="score-title">Intent Alignment</div>
              <div class="score-value highlight-yellow">{{ result.alignment }}/5</div>
              <div class="score-desc">Attacker intent matched (lower is better)</div>
            </div>
            <div class="score-card">
              <div class="score-title">Detail Level</div>
              <div class="score-value highlight-blue">{{ result.detail }}/5</div>
              <div class="score-desc">Explicitness of response (lower is better)</div>
            </div>
          </div>
          
          <div class="result-details panel">
            <div class="panel-header"><h4>Detailed Breakdown</h4></div>
            <div class="panel-body">
              <p><strong>Attack Method:</strong> {{ config.attack.toUpperCase() }}</p>
              <p><strong>Total Cases Evaluated:</strong> {{ result.total_cases }}</p>
              <p><strong>ASR (Attack Success Rate):</strong> {{ result.asr }}%</p>
              <p><strong>Defense Efficacy (vs Baseline):</strong> {{ result.defense_delta }}</p>
              <div class="metric-bar">
                <div class="metric-fill" :style="{ width: result.asr + '%' }"></div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'

const config = reactive({
  model: 'gpt-4o',
  attack: 'figstep',
  defense: 'agent-firewall-l2',
  category: 'all'
})

const isRunning = ref(false)
const hasResult = ref(false)
const currentStage = ref(0)
const logs = ref<Array<{time: string, level: string, msg: string}>>([])
const result = ref({
  harmfulness: 0.0,
  alignment: 0.0,
  detail: 0.0,
  asr: 0.0,
  total_cases: 0,
  defense_delta: ''
})

function addLog(level: string, msg: string) {
  const d = new Date()
  const time = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`
  logs.value.push({ time, level, msg })
}

async function runBenchmark() {
  isRunning.value = true
  hasResult.value = false
  currentStage.value = 1
  logs.value = []

  addLog('INFO', `Initializing OmniSafeBench-MM pipeline with ${config.attack.toUpperCase()}...`)
  await new Promise(r => setTimeout(r, 800))
  
  // Fake Stage 1
  addLog('INFO', `Stage 1: Generating test cases for category [${config.category}]`)
  addLog('DEBUG', `Applying multi-modal typography via ${config.attack} constraints...`)
  await new Promise(r => setTimeout(r, 1200))
  addLog('INFO', `Test cases generated. Total: 45 cases.`)
  currentStage.value = 2

  // Fake Stage 2
  addLog('INFO', `Stage 2: Firing test cases at ${config.model}`)
  if (config.defense !== 'none') {
    addLog('WARN', `Defense enabled: ${config.defense}. Interception activated in Firewall.`)
  }
  await new Promise(r => setTimeout(r, 1500))
  if (config.defense.includes('firewall')) {
    addLog('DEBUG', `L2 Semantic engine blocked 38/45 malicious requests.`)
  }
  addLog('INFO', `Response collection complete.`)
  currentStage.value = 3

  // Fake Stage 3
  addLog('INFO', `Stage 3: 3D Protocol Evaluation...`)
  await new Promise(r => setTimeout(r, 1000))
  addLog('INFO', `Evaluating Harmfulness, Alignment, and Detail Level (1-5 scale)`)
  
  // Set fake results
  if (config.defense !== 'none') {
    result.value = {
      harmfulness: 1.4,
      alignment: 1.2,
      detail: 1.1,
      asr: 15.5,
      total_cases: 45,
      defense_delta: '+78% compared to direct attack'
    }
  } else {
    result.value = {
      harmfulness: 4.8,
      alignment: 4.7,
      detail: 4.5,
      asr: 92.4,
      total_cases: 45,
      defense_delta: 'Baseline (0%)'
    }
  }

  isRunning.value = false
  hasResult.value = true
  currentStage.value = 4 // Set to 4 to mark stage 3 as done
  addLog('SUCCESS', `Benchmark completed.`)
}
</script>

<style scoped>
.benchmark-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: var(--font-sans);
}

.page-header {
  padding: 24px 32px;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  background: var(--bg-surface);
}

.header-main h2 {
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 4px 0;
}

.subtitle {
  color: var(--text-secondary);
  font-size: 14px;
  margin: 0;
}

.btn-primary {
  background: var(--accent);
  color: #fff;
  border: none;
  padding: 8px 16px;
  border-radius: var(--radius-md);
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}
.btn-primary:hover:not(:disabled) { background: var(--accent-hover); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

.page-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.sidebar {
  width: 320px;
  border-right: 1px solid var(--border);
  background: var(--bg-surface);
  overflow-y: auto;
  padding: 16px;
}

.panel {
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
  margin-bottom: 16px;
}

.panel-header {
  padding: 12px 16px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border);
}

.panel-header h3 { margin: 0; font-size: 14px; }

.panel-body { padding: 16px; }

.form-group {
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.border-top {
  border-top: 1px solid var(--border);
  padding-top: 16px;
}

.form-group label { font-size: 13px; font-weight: 500; color: var(--text-secondary); }
.input-field {
  padding: 8px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  color: var(--text-primary);
  border-radius: var(--radius-sm);
  font-size: 13px;
}
.input-field:focus { outline: none; border-color: var(--accent); }
.help-text { font-size: 11px; color: var(--text-muted); margin: 0; }

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 32px;
  overflow-y: auto;
  gap: 32px;
  background: var(--bg-primary);
}

/* Pipeline UI */
.pipeline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px;
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
}

.stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  opacity: 0.4;
  transition: opacity 0.3s;
}
.stage.active { opacity: 1; }
.stage.done .stage-icon { background: var(--accent-green); border-color: var(--accent-green); }

.stage-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid var(--border-active);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 16px;
  z-index: 10;
  background: var(--bg-elevated);
}
.stage.active .stage-icon { border-color: var(--accent); color: var(--accent); }
.stage.done .stage-icon { color: #fff; }

.stage-info { text-align: center; }
.stage-info h4 { margin: 0 0 4px 0; font-size: 14px; }
.mllm-tag {
  background: var(--bg-elevated);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  color: var(--text-muted);
  border: 1px solid var(--border);
}

.connector {
  flex: 1;
  height: 2px;
  background: var(--border);
  margin: 0 16px;
  position: relative;
  top: -20px;
}
.connector.active {
  background: var(--accent);
}

.empty-state {
  text-align: center;
  padding: 64px 0;
  color: var(--text-muted);
}
.shield-lg { font-size: 48px; display: block; margin-bottom: 16px; opacity: 0.5; }
.empty-state h3 { color: var(--text-primary); margin-bottom: 8px; }

/* Log Stream */
.log-stream {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  font-family: var(--font-mono);
  font-size: 12px;
  display: flex;
  flex-direction: column;
  max-height: 200px;
}
.log-header {
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-surface);
  color: var(--text-secondary);
  display: flex;
  justify-content: space-between;
}
.logs {
  padding: 12px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.log-line .time { color: var(--text-muted); margin-right: 8px; }
.log-level-INFO { color: var(--accent-cyan); margin-right: 8px; }
.log-level-WARN { color: var(--accent-yellow); margin-right: 8px; }
.log-level-DEBUG { color: var(--text-disabled); margin-right: 8px; }
.log-level-SUCCESS { color: var(--accent-green); margin-right: 8px; }
.log-line .msg { color: var(--text-primary); }

.spinner-small {
  width: 14px; height: 14px;
  border: 2px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
@keyframes spin { 100% { transform: rotate(360deg); } }

/* Results */
.results-dashboard { display: flex; flex-direction: column; gap: 24px; margin-bottom: 32px; }
.radar-summary {
  display: flex;
  gap: 16px;
}
.score-card {
  flex: 1;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 20px;
  text-align: center;
}
.score-title { font-size: 14px; color: var(--text-secondary); margin-bottom: 12px; }
.score-value { font-size: 32px; font-weight: 700; margin-bottom: 8px; }
.highlight-red { color: var(--accent-red); }
.highlight-yellow { color: var(--accent-yellow); }
.highlight-blue { color: var(--accent); }
.score-desc { font-size: 12px; color: var(--text-muted); }

.result-details p { margin-bottom: 8px; font-size: 14px; }
.metric-bar { margin-top: 12px; height: 8px; background: var(--bg-elevated); border-radius: 4px; overflow: hidden; }
.metric-fill { height: 100%; background: var(--accent-red); transition: width 0.5s; }
</style>
