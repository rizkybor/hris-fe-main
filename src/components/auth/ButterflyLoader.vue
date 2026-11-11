<script setup>
// Sign-in loading screen: the company butterfly beating its wings over the
// brand navy, with a soft glow and a few rising sparks. Pure CSS 3D (each
// half of the logo turns on the centre line), so it runs everywhere,
// including phones that never load the three.js logo. Only transform and
// opacity animate. A loader is essential motion: with "reduce motion" it
// keeps going, just slower.
defineProps({
  show: { type: Boolean, default: false },
  text: { type: String, default: "" },
});

const LOGO = "/images/jcd-logo-light.png";
// Spark positions (% of the stage) and delays, fixed so nothing jumps.
const SPARKS = [
  [22, 64, 0], [74, 60, 0.35], [36, 74, 0.7], [62, 72, 1.05], [48, 58, 1.4],
  [28, 50, 1.75], [70, 48, 0.2], [55, 80, 0.9], [42, 66, 1.6], [80, 70, 1.25],
];
</script>

<template>
  <Teleport to="body">
    <Transition name="ui-fade">
      <div v-if="show" class="bfly-screen fixed inset-0 z-[120] flex items-center justify-center font-sans" role="status" aria-live="polite">
        <div class="flex flex-col items-center">
          <div class="bfly-stage" aria-hidden="true">
            <div class="bfly-glow"></div>
            <span
              v-for="(s, i) in SPARKS"
              :key="i"
              class="bfly-spark"
              :style="{ left: s[0] + '%', top: s[1] + '%', animationDelay: s[2] + 's' }"
            ></span>
            <div class="bfly-body">
              <img :src="LOGO" alt="" class="bfly-wing bfly-wing--left" />
              <img :src="LOGO" alt="" class="bfly-wing bfly-wing--right" />
            </div>
          </div>
          <p class="mt-6 text-ui-small font-medium text-white">{{ text || $t("common.states.pleaseWait") }}</p>
          <p class="text-ui-cap text-white/50 mt-0.5">PT Jendela Cakra Digital</p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.bfly-screen {
  background:
    radial-gradient(50% 40% at 50% 45%, rgb(31 91 216 / 0.35), transparent 70%),
    rgb(var(--ui-brand));
}
.bfly-stage {
  position: relative;
  width: 168px;
  height: 152px;
  perspective: 520px;
}
.bfly-glow {
  position: absolute;
  inset: 18% 22%;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgb(82 184 250 / 0.45), transparent);
  animation: bfly-glow 2.2s ease-in-out infinite;
}
.bfly-body {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  animation: bfly-float 1.8s ease-in-out infinite;
}
/* The same image twice, each cut to one half and hinged on the centre line. */
.bfly-wing {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  transform-origin: 50% 50%;
  backface-visibility: visible;
  filter: drop-shadow(0 6px 14px rgb(31 91 216 / 0.45));
}
.bfly-wing--left {
  clip-path: inset(0 50% 0 0);
  animation: bfly-flap-left 0.5s ease-in-out infinite alternate;
}
.bfly-wing--right {
  clip-path: inset(0 0 0 50%);
  animation: bfly-flap-right 0.5s ease-in-out infinite alternate;
}
.bfly-spark {
  position: absolute;
  width: 5px;
  height: 5px;
  margin: -2.5px 0 0 -2.5px;
  border-radius: 50%;
  background: rgb(230 242 255);
  box-shadow: 0 0 6px 1px rgb(82 184 250 / 0.9);
  opacity: 0;
  animation: bfly-spark 1.8s ease-out infinite;
}
.bfly-spark:nth-child(odd) {
  background: rgb(82 184 250);
}

@keyframes bfly-flap-left {
  from { transform: rotateY(-8deg); }
  to { transform: rotateY(62deg); }
}
@keyframes bfly-flap-right {
  from { transform: rotateY(8deg); }
  to { transform: rotateY(-62deg); }
}
@keyframes bfly-float {
  0%, 100% { transform: translateY(4px) rotateX(10deg); }
  50% { transform: translateY(-6px) rotateX(4deg); }
}
@keyframes bfly-glow {
  0%, 100% { opacity: 0.55; transform: scale(0.92); }
  50% { opacity: 1; transform: scale(1.08); }
}
@keyframes bfly-spark {
  0% { opacity: 0; transform: translateY(0) scale(0.6); }
  20% { opacity: 1; }
  100% { opacity: 0; transform: translateY(-46px) scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  .bfly-wing--left,
  .bfly-wing--right { animation-duration: 1.4s !important; animation-iteration-count: infinite !important; }
  .bfly-body,
  .bfly-glow,
  .bfly-spark { animation-duration: 4s !important; animation-iteration-count: infinite !important; }
}
</style>
