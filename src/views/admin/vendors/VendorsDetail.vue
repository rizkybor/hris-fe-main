<script setup>
import { useProjectStore } from "@/stores/project";
import {
  Briefcase,
  Crown,
  Target,
  DollarSign,
  CalendarCheck,
  Clock,
  Calendar,
  User,
} from "lucide-vue-next";
import { useRoute } from "vue-router";
import router from "@/router";
import { onMounted, ref, computed } from "vue";
import { formatDate, calculateDuration } from "@/utils/dateUtils";
import { formatRupiah } from "@/utils/formatUtils";
import {
  getPriorityColor,
  getProjectStatusColor,
  getProgressColor,
} from "@/utils/badgeUtils";
import _ from "lodash";
import TaskBoard from "@/components/admin/project/detail/TaskBoard.vue";

const route = useRoute();
const id = route.params.id;

const projectStore = useProjectStore();
const { fetchProject } = projectStore;

const project = ref({});

const handleFetchProject = async () => {
  try {
    const response = await fetchProject(id);

    if (response) {
      project.value = response;
    } else {
      router.push({ name: "admin.projects" });
    }
  } catch (error) {
    console.error("Error fetching project:", error);
    project.value = {};
  }
};

const aboutParagraphs = computed(() => {
  if (!project.value.description) return [];
  return project.value.description.split("\n\n").map((p) => p.trim());
});

const projectProgress = computed(() => {
  if (!project.value.tasks || project.value.tasks.length === 0) {
    console.log("No tasks found:", project.value.tasks);
    return 0;
  }
  const totalTasks = project.value.tasks.length;
  const completedTasks = project.value.tasks.filter(
    (task) => task.status === "done"
  ).length;

  const progress = Math.round((completedTasks / totalTasks) * 100);

  return progress;
});

onMounted(async () => {
  await handleFetchProject();
});
</script>

<template>
  <!-- Project Information Section -->
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
    <!-- Project Details Card -->
    <div
      class="lg:col-span-2 bg-white border border-[#DCDEDD] rounded-[20px] p-6"
    >
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3">
          <div
            class="w-12 h-12 bg-blue-50 rounded-[12px] flex items-center justify-center"
          >
            <Briefcase class="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 class="text-brand-dark text-xl font-bold">
              Project Information
            </h3>
            <p class="text-brand-light text-sm font-normal">
              Complete project overview
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <div
            class="px-3 py-1 rounded-full text-base font-semibold"
            :class="getProjectStatusColor(project.status)"
          >
            {{ _.capitalize(project.status) }}
          </div>
          <div
            class="px-3 py-1 rounded-full text-base font-semibold"
            :class="getPriorityColor(project.priority)"
          >
            {{ _.capitalize(project.priority) }}
          </div>
        </div>
      </div>

      <!-- Project Image -->
      <div
        class="w-full bg-gradient-to-br from-blue-100 to-purple-100 relative overflow-hidden rounded-[12px] mb-6"
      >
        <img
          :src="project.photo"
          alt="Project Image"
          class="w-full h-full object-cover rounded-[12px]"
        />
      </div>

      <!-- Project Basic Info -->
      <div class="space-y-4">
        <div>
          <h4 class="text-brand-dark text-2xl font-bold mb-2">
            {{ project.name }}
          </h4>
        </div>

        <!-- About Project Section -->
        <div>
          <h5 class="text-brand-dark text-base font-semibold mb-3">
            About Project
          </h5>
          <div class="text-brand-light text-base leading-relaxed space-y-3">
            <p v-for="(paragraph, index) in aboutParagraphs" :key="index">
              {{ paragraph }}
            </p>
          </div>
        </div>

        <!-- Assigned Teams Section -->
        <div>
          <h5 class="text-brand-dark text-base font-semibold mb-3">
            Assigned Teams
          </h5>
          <div
            v-if="!project.teams || project.teams.length === 0"
            class="text-center py-8 text-gray-500 text-sm"
          >
            No teams assigned
          </div>
          <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              v-for="team in project.teams"
              :key="team.id"
              class="border border-[#DCDEDD] rounded-[16px] hover:border-[#0C51D9] hover:shadow-lg transition-all duration-300 p-4"
            >
              <div class="flex items-center gap-3">
                <div
                  class="w-12 h-12 relative flex items-center justify-center rounded-[12px] overflow-hidden flex-shrink-0"
                >
                  <div
                    class="w-full h-full absolute bg-gradient-to-br from-primary-500 to-primary-600 rounded-[12px]"
                  ></div>
                  <component
                    :is="Briefcase"
                    class="w-5 h-5 text-white relative z-10"
                  />
                </div>
                <div class="flex-1">
                  <h4 class="text-brand-dark text-base font-bold mb-1">
                    {{ team.name }}
                  </h4>
                  <div class="flex items-center gap-2">
                    <User class="w-3.5 h-3.5 text-brand-light" />
                    <p class="text-brand-light text-sm">
                      {{ team.members_count }} Members
                    </p>
                  </div>
                </div>
              </div>

              <div class="mt-4 pt-4 border-t border-[#DCDEDD]">
                <div v-if="team.leader" class="flex items-center gap-3">
                  <img
                    v-if="team.leader.profile_photo"
                    :src="team.leader.profile_photo"
                    :alt="team.leader.name"
                    class="w-9 h-9 rounded-full object-cover"
                  />
                  <div
                    v-else
                    class="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center"
                  >
                    <User class="w-4 h-4 text-gray-400" />
                  </div>
                  <div class="flex-1">
                    <p class="text-brand-dark text-sm font-semibold">
                      {{ team.leader.name }}
                    </p>
                    <p class="text-brand-light text-xs">Team Leader</p>
                  </div>
                </div>
                <div
                  v-else
                  class="w-full h-10 rounded-md bg-gray-200 flex items-center justify-center text-gray-400 text-xs"
                >
                  No Leader
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Right Sidebar -->
    <div class="space-y-4">
      <!-- Project Leader Card -->
      <div class="bg-white border border-[#DCDEDD] rounded-[20px] p-6 h-fit">
        <div class="flex items-center gap-3 mb-4">
          <div
            class="w-12 h-12 bg-green-50 rounded-[12px] flex items-center justify-center"
          >
            <Crown class="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h3 class="text-brand-dark text-xl font-bold">Project Leader</h3>
            <p class="text-brand-light text-sm font-normal">
              Team leader information
            </p>
          </div>
        </div>

        <div v-if="project.leader" class="flex items-center gap-4">
          <img
            :src="project.leader.user.profile_photo"
            :alt="project.leader.user.name"
            class="w-16 h-16 rounded-full object-cover"
            v-if="project.leader.user.profile_photo"
          />
          <div
            class="w-12 h-12 rounded-[12px] flex items-center justify-center bg-gray-100"
            v-else
          >
            <User class="w-5 h-5 text-gray-400" />
          </div>
          <div class="flex-1">
            <h4 class="text-brand-dark text-md font-bold mb-1">
              {{ project.leader?.user?.name }}
            </h4>
            <p class="text-brand-light text-sm">
              {{ project.leader?.job_information?.job_title }}
            </p>
          </div>
          <RouterLink
            :to="{
              name: 'admin.employees.detail',
              params: { id: project.leader.id },
            }"
            class="border border-[#DCDEDD] text-brand-dark py-2 px-4 rounded-[8px] font-medium hover:bg-gray-50 hover:border-[#0C51D9] hover:border-2 transition-all duration-300 flex items-center gap-2"
          >
            <User class="w-4 h-4" />
            <span class="text-sm font-semibold">Profile</span>
          </RouterLink>
        </div>
      </div>

      <!-- Progress Card -->
      <div
        class="bg-white border border-[#DCDEDD] rounded-[20px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-5"
      >
        <div class="flex items-center justify-between mb-4">
          <div>
            <p class="text-brand-dark text-sm font-medium">Progress</p>
            <p class="text-brand-dark text-xl font-extrabold leading-none my-2">
              {{ projectProgress }}%
            </p>
            <p class="text-purple-600 text-sm font-medium">
              Project completion
            </p>
          </div>
          <div
            class="w-14 h-14 bg-purple-50 rounded-[16px] flex items-center justify-center"
          >
            <Target class="w-6 h-6 text-purple-600" />
          </div>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-3">
          <div
            class="h-3 rounded-full transition-all duration-300"
            :class="getProgressColor(projectProgress)"
            :style="{ width: `${projectProgress}%` }"
          ></div>
        </div>
      </div>

      <!-- Budget Card -->
      <div
        class="bg-white border border-[#DCDEDD] rounded-[20px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-5"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-brand-dark text-sm font-medium">Budget</p>
            <p class="text-brand-dark text-xl font-extrabold leading-none my-2">
              {{ formatRupiah(project.budget) }}
            </p>
            <p class="text-success text-sm font-medium">Project budget</p>
          </div>
          <div
            class="w-14 h-14 bg-green-50 rounded-[16px] flex items-center justify-center"
          >
            <DollarSign class="w-6 h-6 text-green-600" />
          </div>
        </div>
      </div>

      <!-- Start Date Card -->
      <div
        class="bg-white border border-[#DCDEDD] rounded-[20px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-5"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-brand-dark text-sm font-medium">Start Date</p>
            <p class="text-brand-dark text-xl font-extrabold leading-none my-2">
              {{ formatDate(project.start_date) || "N/A" }}
            </p>
            <p class="text-indigo-600 text-sm font-medium">Project kickoff</p>
          </div>
          <div
            class="w-14 h-14 bg-indigo-50 rounded-[16px] flex items-center justify-center"
          >
            <Calendar class="w-6 h-6 text-indigo-600" />
          </div>
        </div>
      </div>

      <!-- End Date Card -->
      <div
        class="bg-white border border-[#DCDEDD] rounded-[20px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-5"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-brand-dark text-sm font-medium">End Date</p>
            <p class="text-brand-dark text-xl font-extrabold leading-none my-2">
              {{ formatDate(project.end_date) || "N/A" }}
            </p>
            <p class="text-orange-600 text-sm font-medium">Project deadline</p>
          </div>
          <div
            class="w-14 h-14 bg-orange-50 rounded-[16px] flex items-center justify-center"
          >
            <CalendarCheck class="w-6 h-6 text-orange-600" />
          </div>
        </div>
      </div>

      <!-- Duration Card -->
      <div
        class="bg-white border border-[#DCDEDD] rounded-[20px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-5"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-brand-dark text-sm font-medium">Duration</p>
            <p class="text-brand-dark text-xl font-extrabold leading-none my-2">
              {{ calculateDuration(project.start_date, project.end_date) }}
            </p>
            <p class="text-blue-600 text-sm font-medium">Project timeline</p>
          </div>
          <div
            class="w-14 h-14 bg-blue-50 rounded-[16px] flex items-center justify-center"
          >
            <Clock class="w-6 h-6 text-blue-600" />
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Tasks Section -->
  <TaskBoard />
</template>
