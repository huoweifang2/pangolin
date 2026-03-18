import { ref, reactive } from 'vue'
import {
  streamChat,
  extractPipelineDecision,
  extractBlockDecision,
} from '~/services/chatService'
import type { ChatMessage, PipelineDecision, ApiError } from '~/types/api'

export const useChat = () => {
  const messages = ref<ChatMessage[]>([])
  const isStreaming = ref(false)
  const lastDecision = ref<PipelineDecision | null>(null)
  const error = ref<string | null>(null)

  let abortController: AbortController | null = null

  const config = reactive({
    policy: 'balanced',
    model: '',          // auto-selected by playground once models load
    temperature: 0.7,
    maxTokens: null as number | null,
    systemPrompt: '',
  })

  async function send(text: string) {
    // Push user message
    messages.value.push({ role: 'user', content: text })
    // Push empty assistant placeholder for streaming
    messages.value.push({ role: 'assistant', content: '' })

    isStreaming.value = true
    error.value = null
    lastDecision.value = null

    abortController = new AbortController()

    const assistantIdx = messages.value.length - 1

    const apiMessages = messages.value.slice(0, -1)
    if (config.systemPrompt?.trim()) {
      apiMessages.unshift({ role: 'system', content: config.systemPrompt.trim() })
    }

    try {
      const response = await streamChat(
        {
          body: {
            model: config.model,
            messages: apiMessages,
            temperature: config.temperature,
            max_tokens: config.maxTokens ?? undefined,
            stream: true,
          },
          headers: {
            'x-policy': config.policy,
          },
          signal: abortController.signal,
        },
        {
          onToken: (token: string) => {
            const assistantMessage = messages.value[assistantIdx]
            if (!assistantMessage) {return}
            assistantMessage.content = (assistantMessage.content ?? '') + token
          },
          onToolCallDelta: (toolCalls: unknown[]) => {
            const assistantMessage = messages.value[assistantIdx]
            if (!assistantMessage) {return}
            if (!assistantMessage.tool_calls) {
              assistantMessage.tool_calls = []
            }
            for (const delta of toolCalls) {
              const idx = delta.index
              if (!assistantMessage.tool_calls[idx]) {
                assistantMessage.tool_calls[idx] = { 
                  id: delta.id || '', 
                  type: 'function', 
                  function: { name: delta.function?.name || '', arguments: '' } 
                }
              } else if (delta.function?.name) {
                assistantMessage.tool_calls[idx].function.name += delta.function.name
              }
              if (delta.function?.arguments) {
                assistantMessage.tool_calls[idx].function.arguments += delta.function.arguments
              }
            }
          },
          onDone: () => {
            isStreaming.value = false
          },
          onError: (err: Error) => {
            error.value = err.message
            // Show error in assistant message instead of removing
            if (!messages.value[assistantIdx]?.content) {
              messages.value[assistantIdx] = {
                role: 'assistant',
                content: `⚠️ ${err.message}`,
              }
            }
            isStreaming.value = false
          },
        },
      )

      // Extract pipeline decision from response headers
      lastDecision.value = extractPipelineDecision(response)
      // Attach decision to assistant message
      if (lastDecision.value && messages.value[assistantIdx]) {
        messages.value[assistantIdx].decision = lastDecision.value
      }
    } catch (err: unknown) {
      isStreaming.value = false

      // Handle abort
      if (err instanceof DOMException && err.name === 'AbortError') {
        return
      }

      // Handle BLOCK response (403) — ApiError body
      const apiErr = err as ApiError
      if (apiErr?.error?.message) {
        lastDecision.value = extractBlockDecision(apiErr)
        // Replace empty assistant message with block message
        messages.value[assistantIdx] = {
          role: 'assistant',
          content: `⛔ Blocked: ${apiErr.error.message}`,
          decision: lastDecision.value ?? undefined,
        }
        error.value = apiErr.error.message
      } else {
        // Unknown error — show in message bubble instead of silently removing
        const errMsg = err instanceof Error ? err.message : String(err)
        messages.value[assistantIdx] = {
          role: 'assistant',
          content: `⚠️ ${errMsg || 'An unexpected error occurred'}`,
        }
        error.value = errMsg || 'An unexpected error occurred'
      }
    }
  }

  function clear() {
    messages.value = []
    lastDecision.value = null
    error.value = null
  }

  function abort() {
    if (abortController) {
      abortController.abort()
      abortController = null
      isStreaming.value = false
    }
  }

  return {
    messages,
    isStreaming,
    lastDecision,
    error,
    config,
    send,
    clear,
    abort,
  }
}
