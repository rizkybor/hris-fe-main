<script setup lang="ts">
defineProps<{ show: boolean }>();
</script>

<template>
  <transition name="overlay">
    <div
      v-if="show"
      class="fixed inset-0 z-50 flex items-center justify-center"
    >
      <!-- BLUR BACKDROP (INI KUNCINYA) -->
      <div class="absolute inset-0 backdrop"></div>

      <!-- CONTENT -->
      <div class="relative z-10 flex flex-col items-center gap-6">
        <!-- SPINNER -->
        <div class="flex items-end gap-2 spinner-bars">
          <span class="bar"></span>
          <span class="bar"></span>
          <span class="bar"></span>
          <span class="bar"></span>
          <span class="bar"></span>
          <span class="bar"></span>
          <span class="bar"></span>
          <span class="bar"></span>
          <span class="bar"></span>
        </div>

        <!-- TEXT -->
        <p class="brand-text">PT. Jendela Cakra Digital</p>
      </div>
    </div>
  </transition>
</template>

<style scoped>
/* ===== BACKDROP BLUR (REAL) ===== */
.backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);   /* dim */
  backdrop-filter: blur(18px);       /* REAL BLUR */
  -webkit-backdrop-filter: blur(18px);
}

/* ===== SPINNER ===== */
.spinner-bars {
  height: 64px;
}

.spinner-bars .bar {
  width: 10px;
  height: 100%;
  background: linear-gradient(
    135deg,
    #38bdf8 0%,
    #2563eb 50%,
    #1e3a8a 100%
  );
  border-radius: 6px;
  animation: pulse 1.2s ease-in-out infinite;
  transform-origin: center bottom;
}

.spinner-bars .bar:nth-child(1) { animation-delay: 0s; }
.spinner-bars .bar:nth-child(2) { animation-delay: 0.1s; }
.spinner-bars .bar:nth-child(3) { animation-delay: 0.2s; }
.spinner-bars .bar:nth-child(4) { animation-delay: 0.3s; }
.spinner-bars .bar:nth-child(5) { animation-delay: 0.4s; }
.spinner-bars .bar:nth-child(6) { animation-delay: 0.5s; }
.spinner-bars .bar:nth-child(7) { animation-delay: 0.6s; }
.spinner-bars .bar:nth-child(8) { animation-delay: 0.7s; }
.spinner-bars .bar:nth-child(9) { animation-delay: 0.8s; }

@keyframes pulse {
  0% { transform: scaleY(0.3); opacity: 0.4; }
  50% { transform: scaleY(1); opacity: 1; }
  100% { transform: scaleY(0.3); opacity: 0.4; }
}

/* ===== TEXT ===== */
.brand-text {
  font-size: 13px;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.85);
  animation: textFade 2.2s ease-in-out infinite;
}

@keyframes textFade {
  0% { opacity: 0.4; transform: translateY(4px); }
  50% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0.4; transform: translateY(4px); }
}

/* ===== FADE ===== */
.overlay-enter-active,
.overlay-leave-active {
  transition: opacity .2s ease;
}
.overlay-enter-from,
.overlay-leave-to {
  opacity: 0;
}
</style>
