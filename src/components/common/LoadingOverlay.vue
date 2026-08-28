<script setup lang="ts">
withDefaults(defineProps<{ show: boolean; text?: string }>(), {
  text: "Please wait a moment",
});
</script>

<template>
  <transition name="overlay">
    <div
      v-if="show"
      class="fixed inset-0 z-50 flex items-center justify-center"
    >
      <!-- BACKDROP -->
      <div class="absolute inset-0 backdrop"></div>
      <div class="absolute inset-0 glow"></div>

      <!-- CARD -->
      <transition name="card" appear>
        <div class="relative z-10 card flex flex-col items-center gap-5">
          <!-- LOGO + RING SPINNER -->
          <div class="relative flex items-center justify-center w-20 h-20">
            <svg class="ring" viewBox="0 0 80 80">
              <circle
                class="ring-track"
                cx="40"
                cy="40"
                r="34"
                fill="none"
                stroke-width="3"
              />
              <circle
                class="ring-progress"
                cx="40"
                cy="40"
                r="34"
                fill="none"
                stroke-width="3"
              />
            </svg>
            <div class="logo-wrap">
              <img
                src="/images/jcd-only-color.png"
                alt="Company Logo"
                class="logo-img"
              />
            </div>
          </div>

          <!-- TEXT -->
          <div class="flex flex-col items-center gap-1">
            <p class="loading-text">{{ text }}</p>
            <p class="brand-text">PT. Jendela Cakra Digital</p>
          </div>
        </div>
      </transition>
    </div>
  </transition>
</template>

<style scoped>
/* ===== BACKDROP ===== */
.backdrop {
  position: absolute;
  inset: 0;
  background: rgba(4, 8, 20, 0.55);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    circle at 50% 45%,
    rgba(37, 99, 235, 0.28) 0%,
    rgba(37, 99, 235, 0) 55%
  );
  pointer-events: none;
}

/* ===== CARD ===== */
.card {
  padding: 40px 48px;
  border-radius: 20px;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.08) 0%,
    rgba(255, 255, 255, 0.03) 100%
  );
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow:
    0 20px 60px rgba(0, 0, 0, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

/* ===== RING SPINNER ===== */
.ring {
  position: absolute;
  inset: 0;
  width: 80px;
  height: 80px;
  animation: spin 1.4s linear infinite;
}

.ring-track {
  stroke: rgba(255, 255, 255, 0.12);
}

.ring-progress {
  stroke: #4f8bff;
  stroke-linecap: round;
  stroke-dasharray: 214;
  stroke-dashoffset: 160;
  filter: drop-shadow(0 0 4px rgba(79, 139, 255, 0.7));
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* ===== LOGO ===== */
.logo-wrap {
  width: 52px;
  height: 52px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
  animation: breathe 2.4s ease-in-out infinite;
}

.logo-img {
  width: 32px;
  height: 32px;
  object-fit: contain;
}

@keyframes breathe {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.06);
  }
}

/* ===== TEXT ===== */
.loading-text {
  font-size: 13.5px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.92);
  letter-spacing: 0.02em;
}

.brand-text {
  font-size: 10.5px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.45);
}

/* ===== TRANSITIONS ===== */
.overlay-enter-active,
.overlay-leave-active {
  transition: opacity 0.25s ease;
}
.overlay-enter-from,
.overlay-leave-to {
  opacity: 0;
}

.card-enter-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.card-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}
.card-enter-from {
  opacity: 0;
  transform: scale(0.92) translateY(8px);
}
.card-leave-to {
  opacity: 0;
  transform: scale(0.96);
}
</style>
