<script setup lang="ts">
import {
  SearchIcon,
  BuildingIcon,
  ChevronDownIcon,
  CheckCircleIcon,
} from "lucide-vue-next";
</script>

<template>
  <!-- Search Section -->
  <div class="bg-white border border-[#DCDEDD] rounded-[20px] mb-6 p-4">
    <div
      class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4"
    >
      <!-- Search Bar -->
      <div class="flex-1 relative">
        <div
          class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"
        >
          <SearchIcon class="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          class="w-full pl-12 pr-4 py-3 border border-[#DCDEDD] rounded-[16px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 focus:bg-white transition-all duration-300"
          placeholder="Search employees, tasks, reports, projects..."
        />
      </div>

      <!-- Filter and Action Buttons -->
      <div class="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
        <!-- Department Filter -->
        <div class="relative w-full sm:w-auto">
          <div
            class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"
          >
            <BuildingIcon class="h-4 w-4 text-gray-400" />
          </div>
          <select
            class="w-full sm:w-auto pl-10 pr-8 py-3 border border-[#DCDEDD] rounded-[16px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 transition-all duration-300 bg-white appearance-none"
          >
            <option>All Departments</option>
            <option>Engineering</option>
            <option>Marketing</option>
            <option>Sales</option>
            <option>HR</option>
          </select>
          <div
            class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"
          >
            <ChevronDownIcon class="h-4 w-4 text-gray-400" />
          </div>
        </div>

        <!-- Status Filter -->
        <div class="relative w-full sm:w-auto">
          <div
            class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"
          >
            <CheckCircleIcon class="h-4 w-4 text-gray-400" />
          </div>
          <select
            class="w-full sm:w-auto pl-10 pr-8 py-3 border border-[#DCDEDD] rounded-[16px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 transition-all duration-300 bg-white appearance-none"
          >
            <option>All Status</option>
            <option>Active</option>
            <option>Inactive</option>
            <option>Pending</option>
          </select>
          <div
            class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"
          >
            <ChevronDownIcon class="h-4 w-4 text-gray-400" />
          </div>
        </div>

        <!-- Search Button -->
        <button
          class="btn-primary w-full sm:w-auto rounded-[8px] border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-6 py-3 flex items-center justify-center sm:justify-start gap-2"
        >
          <SearchIcon class="w-4 h-4 text-white" />
          <span class="text-brand-white text-base font-semibold">Search</span>
        </button>
      </div>
    </div>
  </div>
</template>
