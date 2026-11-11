<script setup lang="ts">
import { Lightbulb, Check, Zap, Users, ChevronRight } from "lucide-vue-next";

const TIPS = [
  { title: "Define Clear Goals", text: "Set specific, measurable objectives for project success." },
  { title: "Choose Right Leader", text: "Select someone with project management skills and domain expertise." },
  { title: "Set Realistic Timeline", text: "Plan achievable deadlines with buffer time for unexpected issues." },
  { title: "Assign Right Teams", text: "Match team skills with project requirements and workload." },
];

const browseTeams = () => {
  document
    .getElementById("team-assignment-section")
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
};
</script>

<template>
  <!-- Right Sidebar -->
  <aside class="w-full min-w-0 space-y-5 xl:sticky xl:top-6 hidden xl:block">
    <!-- Tips Section -->
    <section class="bg-ui-surface border border-ui-line rounded-ui-card p-5">
      <div class="flex items-start gap-3 pb-4 mb-4 border-b border-ui-line">
        <span class="w-8 h-8 rounded-ui-control border border-ui-line flex items-center justify-center text-ui-muted shrink-0">
          <Lightbulb class="w-4 h-4" />
        </span>
        <div class="min-w-0">
          <h3 class="text-ui-h3 text-ui-ink">Project Creation Tips</h3>
          <p class="text-ui-cap text-ui-muted mt-0.5">Best practices for setting up projects</p>
        </div>
      </div>

      <ul class="space-y-3.5">
        <li v-for="tip in TIPS" :key="tip.title" class="flex items-start gap-2.5">
          <Check class="w-4 h-4 text-ui-ok shrink-0 mt-0.5" />
          <div class="min-w-0">
            <p class="text-ui-small font-medium text-ui-ink">{{ tip.title }}</p>
            <p class="text-ui-cap text-ui-muted mt-0.5">{{ tip.text }}</p>
          </div>
        </li>
      </ul>
    </section>

    <!-- Quick Actions Section -->
    <section class="bg-ui-surface border border-ui-line rounded-ui-card p-5">
      <div class="flex items-start gap-3 pb-4 mb-4 border-b border-ui-line">
        <span class="w-8 h-8 rounded-ui-control border border-ui-line flex items-center justify-center text-ui-muted shrink-0">
          <Zap class="w-4 h-4" />
        </span>
        <div class="min-w-0">
          <h3 class="text-ui-h3 text-ui-ink">Quick Actions</h3>
          <p class="text-ui-cap text-ui-muted mt-0.5">Common project setup tasks</p>
        </div>
      </div>

      <button
        type="button"
        @click="browseTeams"
        class="ui-press w-full border border-ui-line rounded-ui-control hover:bg-ui-hover px-3.5 py-2.5 flex items-center gap-2.5 text-left transition-colors"
      >
        <Users class="w-4 h-4 text-ui-muted shrink-0" />
        <div class="flex-1 min-w-0">
          <p class="text-ui-small font-medium text-ui-ink">Browse Teams</p>
          <p class="text-ui-cap text-ui-muted">Jump to Team Assignment below</p>
        </div>
        <ChevronRight class="w-4 h-4 text-ui-faint shrink-0" />
      </button>
    </section>
  </aside>
</template>
