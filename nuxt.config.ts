// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  // https://nuxt.com/modules
  modules: [
    '@nuxthub/core',
    '@nuxt/ui',
    '@nuxt/fonts',
    '@nuxt/eslint',
    '@vite-pwa/nuxt'
  ],

  // https://devtools.nuxt.com
  devtools: { enabled: true },

  // Env variables - https://nuxt.com/docs/getting-started/configuration#environment-variables-and-private-tokens
  runtimeConfig: {
    // サーバーサイドのみ
    vapidPrivateKey: process.env.VAPID_PRIVATE_KEY,
    public: {
      // Can be overridden by NUXT_PUBLIC_HELLO_TEXT environment variable
      helloText: 'Hello from the Edge 👋',
      // VAPID公開鍵（クライアントサイドで使用）
      vapidPublicKey: process.env.NUXT_PUBLIC_VAPID_PUBLIC_KEY || ''
    }
  },
  // https://nuxt.com/docs/getting-started/upgrade#testing-nuxt-4
  future: { compatibilityVersion: 4 },
  compatibilityDate: '2025-03-01',

  // https://hub.nuxt.com/docs/getting-started/installation#options (v0.10: db は Drizzle)
  // NuxtHubが自動的にデプロイ環境を検出して設定します
  hub: {
    // 開発環境では自動的にローカルSQLiteを使用
    // Cloudflare環境では自動的にCloudflare D1を使用
    // NuxtHubが自動的に環境を検出するため、開発環境では'sqlite'を指定
    db: process.env.CF_PAGES || process.env.CF_WORKERS ? {
      dialect: 'sqlite',
      driver: 'd1',
      connection: {
        databaseId: '2420ed5a-2a4c-4400-acf5-15b14b5f43b7'
      }
    } : 'sqlite',
    // 開発環境では自動的にローカルファイルシステムを使用
    // Cloudflare環境では自動的にCloudflare R2を使用
    blob: process.env.CF_PAGES || process.env.CF_WORKERS ? {
      driver: 'cloudflare-r2',
      bucketName: 'onigiri-blob'
    } : true,
    // 開発環境では自動的にfs-liteを使用
    // Cloudflare環境では自動的にCloudflare KVバインディングを使用
    kv: process.env.CF_PAGES || process.env.CF_WORKERS ? {
      driver: 'cloudflare-kv-binding',
      namespaceId: 'beb16a371f1c413e8d77b6829a492b60'
    } : {
      driver: 'fs-lite',
      base: '.data/kv'
    }
  },

  // Cloudflare Workers向けのNitro設定
  // Workers Buildsを使用する場合、cloudflare_module preset（アンダースコア）を使用
  // deployConfig: trueを設定すると、Nitroが自動的にwrangler.jsonを生成します
  nitro: {
    preset: 'cloudflare_module',
    cloudflare: {
      deployConfig: true,
      nodeCompat: true
    }
  },

  // Development config
  eslint: {
    config: {
      stylistic: {
        quotes: 'single',
        commaDangle: 'never'
      }
    }
  },

  // CSS設定（compatibilityVersion 4 では ~ が app/ を指すため ~/assets で app/assets を参照）
  css: ['~/assets/css/main.css'],

  // PWA設定
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'ONIGIRI',
      short_name: 'ONIGIRI',
      description: '飲食店の口コミSNS',
      theme_color: '#FFE24E',
      background_color: '#ffffff',
      display: 'standalone',
      orientation: 'portrait',
      scope: '/',
      start_url: '/',
      icons: [
        {
          src: '/favicon.ico',
          sizes: '64x64',
          type: 'image/x-icon'
        },
        {
          src: '/favicon.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: '/favicon-512.png',
          sizes: '512x512',
          type: 'image/png'
        },
        {
          src: '/apple-touch-icon.png',
          sizes: '180x180',
          type: 'image/png'
        }
      ]
    },
    workbox: {
      navigateFallback: '/',
      globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
      // カスタムService Workerファイルをインポート（プッシュ通知処理）
      importScripts: ['/sw-custom.js'],
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'google-fonts-cache',
            expiration: {
              maxEntries: 10,
              maxAgeSeconds: 60 * 60 * 24 * 365 // 1年
            },
            cacheableResponse: {
              statuses: [0, 200]
            }
          }
        },
        {
          urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'gstatic-fonts-cache',
            expiration: {
              maxEntries: 10,
              maxAgeSeconds: 60 * 60 * 24 * 365 // 1年
            },
            cacheableResponse: {
              statuses: [0, 200]
            }
          }
        },
        {
          urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
          handler: 'CacheFirst',
          options: {
            cacheName: 'images-cache',
            expiration: {
              maxEntries: 50,
              maxAgeSeconds: 60 * 60 * 24 * 30 // 30日
            }
          }
        },
        {
          urlPattern: /\/api\/.*/i,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'api-cache',
            networkTimeoutSeconds: 10,
            expiration: {
              maxEntries: 50,
              maxAgeSeconds: 60 * 5 // 5分
            },
            cacheableResponse: {
              statuses: [0, 200]
            }
          }
        }
      ]
    },
    client: {
      installPrompt: true,
      periodicSyncForUpdates: 20
    },
    devOptions: {
      enabled: true,
      type: 'module'
    }
  }
})
