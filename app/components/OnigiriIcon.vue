<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 632 585"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    class="inline-block"
  >
    <path
      d="M177.307 80.0176C238.887 -26.6725 392.876 -26.6725 454.456 80.0176L607.368 344.947C668.934 451.614 609.354 584.93 486.195 584.93C475.15 584.93 466.196 575.976 466.196 564.93V344.93C466.196 333.884 457.242 324.93 446.196 324.93H186.196C175.15 324.93 166.196 333.884 166.196 344.93V564.929C166.196 575.975 157.241 584.93 146.195 584.93C23.0364 584.93 -37.1715 451.614 24.3943 344.947L177.307 80.0176Z"
      :fill="fillColor"
    />
  </svg>
</template>

<script setup lang="ts">
interface Props {
  /** アイコンのサイズ（px） */
  size?: number | string
  /** 白背景かどうか（true: テーマカラー、false: 白） */
  whiteBackground?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 24,
  whiteBackground: false
})

const fillColor = computed(() => {
  if (props.whiteBackground) {
    // 白背景ではテーマカラー（primary）
    return 'currentColor'
  } else {
    // 色がついている背景では白
    return 'white'
  }
})
</script>

<style scoped>
/* currentColorを使うことで、親要素のtext-primaryクラスで色を制御 */
</style>
