// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  // SPA mode — this is a dashboard app with no SEO needs.
  // Avoids hydration mismatches from browser-only APIs
  // (DOMPurify, localStorage, sessionStorage) used throughout.
  ssr: false,

  modules: [
    'vuetify-nuxt-module',
    '@pinia/nuxt',
    '@nuxt/eslint',
  ],

  css: ['~/assets/global.scss'],

  vuetify: {
    moduleOptions: {
      styles: 'sass',
    },
    vuetifyOptions: {
      theme: {
        defaultTheme: 'dark',
        themes: {
          dark: {
            colors: {
              primary: '#8FA8A2',
              secondary: '#C39B63',
              info: '#77B6C8',
              error: '#EE8A7E',
              warning: '#D9B16D',
              success: '#78C08A',
              background: '#0F1819',
              surface: '#162425',
              'surface-bright': '#223537',
              'surface-light': '#1A2B2D',
              'surface-variant': '#AEC0BA',
              'on-surface-variant': '#142021',
            },
          },
          light: {
            colors: {
              primary: '#364548',
              secondary: '#6E867B',
              info: '#3C6A78',
              error: '#C4544A',
              warning: '#B88439',
              success: '#4E7A55',
              background: '#F1F4F1',
              surface: '#FFFFFF',
              'surface-bright': '#FFFFFF',
              'surface-light': '#E7EEEA',
              'surface-variant': '#445955',
              'on-surface-variant': '#E7EEEA',
            },
          },
        },
      },
      icons: {
        defaultSet: 'mdi',
      },
    },
  },

  runtimeConfig: {
    public: {
      apiBase: 'http://localhost:8000',
      agentApiBase: 'http://localhost:8002',
      openaiApiBase: 'https://api.openai.com',
      mistralApiBase: 'https://api.mistral.ai',
    },
  },

  typescript: {
    strict: true,
  },
})
