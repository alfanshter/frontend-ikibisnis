<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  width?: number | string
  height?: number | string
}>()

const emit = defineEmits<{
  (e: 'save', base64: string): void
  (e: 'clear'): void
}>()

const canvas = ref<HTMLCanvasElement | null>(null)
const isDrawing = ref(false)

const getCoordinates = (e: MouseEvent | TouchEvent) => {
  if (!canvas.value) return { x: 0, y: 0 }
  const rect = canvas.value.getBoundingClientRect()
  if (e instanceof MouseEvent) {
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  } else {
    return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top }
  }
}

const startDrawing = (e: MouseEvent | TouchEvent) => {
  isDrawing.value = true
  const { x, y } = getCoordinates(e)
  const ctx = canvas.value?.getContext('2d')
  if (ctx) {
    ctx.beginPath()
    ctx.moveTo(x, y)
  }
}

const draw = (e: MouseEvent | TouchEvent) => {
  if (!isDrawing.value) return
  e.preventDefault()
  const { x, y } = getCoordinates(e)
  const ctx = canvas.value?.getContext('2d')
  if (ctx) {
    ctx.lineTo(x, y)
    ctx.stroke()
  }
}

const stopDrawing = () => {
  if (isDrawing.value) {
    const ctx = canvas.value?.getContext('2d')
    if (ctx) {
      ctx.closePath()
    }
    isDrawing.value = false
  }
}

const clear = () => {
  const ctx = canvas.value?.getContext('2d')
  if (ctx && canvas.value) {
    ctx.clearRect(0, 0, canvas.value.width, canvas.value.height)
  }
  emit('clear')
}

const save = () => {
  if (canvas.value) {
    const dataUrl = canvas.value.toDataURL('image/png')
    emit('save', dataUrl)
  }
}

onMounted(() => {
  const ctx = canvas.value?.getContext('2d')
  if (ctx) {
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#000000'
  }
})

defineExpose({ clear, save })
</script>

<template>
  <div class="signature-pad-container" :style="{ width: props.width || '100%' }">
    <canvas
      ref="canvas"
      :width="typeof props.width === 'number' ? props.width : 400"
      :height="typeof props.height === 'number' ? props.height : 200"
      @mousedown="startDrawing"
      @mousemove="draw"
      @mouseup="stopDrawing"
      @mouseleave="stopDrawing"
      @touchstart="startDrawing"
      @touchmove="draw"
      @touchend="stopDrawing"
      class="signature-canvas"
    ></canvas>
    <div class="signature-actions">
      <button type="button" class="btn-clear" @click="clear">Hapus TTD</button>
      <button type="button" class="btn-save" @click="save">Simpan TTD</button>
    </div>
  </div>
</template>

<style scoped>
.signature-pad-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.signature-canvas {
  border: 1px dashed rgba(255, 255, 255, 0.3);
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  cursor: crosshair;
  touch-action: none; /* prevent scrolling when drawing */
}
.signature-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}
.btn-clear {
  padding: 6px 12px;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  border-radius: 4px;
  cursor: pointer;
}
.btn-save {
  padding: 6px 12px;
  background: var(--accent-orange, #f97316);
  border: none;
  color: #fff;
  border-radius: 4px;
  cursor: pointer;
}
.btn-clear:hover {
  background: rgba(255, 255, 255, 0.1);
}
.btn-save:hover {
  background: #ea580c;
}
</style>
