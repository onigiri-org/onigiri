<template>
  <UApp>
    <NuxtRouteAnnouncer />
    <NuxtLoadingIndicator />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>

<script setup lang="ts">
// OGPとメタタグの設定
const config = useRuntimeConfig()
const route = useRoute()

// ベースURL（本番環境では環境変数から取得、開発環境ではlocalhost）
const baseUrl = process.env.NUXT_PUBLIC_SITE_URL || 'https://onigiri.yamakawa.workers.dev'

useHead({
  title: 'ONIGIRI - 飲食店の口コミSNS',
  meta: [
    {
      name: 'description',
      content: '飲食店の口コミに特化したSNSアプリケーション。美味しいお店を共有しましょう。'
    },
    // OGP設定
    {
      property: 'og:title',
      content: 'ONIGIRI - 飲食店の口コミSNS'
    },
    {
      property: 'og:description',
      content: '飲食店の口コミに特化したSNSアプリケーション。美味しいお店を共有しましょう。'
    },
    {
      property: 'og:image',
      content: `${baseUrl}/og-image.png`
    },
    {
      property: 'og:url',
      content: `${baseUrl}${route.path}`
    },
    {
      property: 'og:type',
      content: 'website'
    },
    {
      property: 'og:site_name',
      content: 'ONIGIRI'
    },
    // Twitter Card
    {
      name: 'twitter:card',
      content: 'summary_large_image'
    },
    {
      name: 'twitter:title',
      content: 'ONIGIRI - 飲食店の口コミSNS'
    },
    {
      name: 'twitter:description',
      content: '飲食店の口コミに特化したSNSアプリケーション。美味しいお店を共有しましょう。'
    },
    {
      name: 'twitter:image',
      content: `${baseUrl}/og-image.png`
    },
    // Apple Touch Icon
    {
      name: 'apple-mobile-web-app-capable',
      content: 'yes'
    },
    {
      name: 'apple-mobile-web-app-status-bar-style',
      content: 'default'
    },
    {
      name: 'apple-mobile-web-app-title',
      content: 'ONIGIRI'
    }
  ],
  link: [
    {
      rel: 'icon',
      type: 'image/x-icon',
      href: '/favicon.ico'
    },
    {
      rel: 'icon',
      type: 'image/png',
      sizes: '192x192',
      href: '/favicon.png'
    },
    {
      rel: 'icon',
      type: 'image/png',
      sizes: '512x512',
      href: '/favicon-512.png'
    },
    {
      rel: 'apple-touch-icon',
      sizes: '180x180',
      href: '/apple-touch-icon.png'
    }
  ]
})
</script>
