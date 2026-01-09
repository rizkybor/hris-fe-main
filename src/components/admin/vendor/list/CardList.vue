<script setup>
import { formatToClientTimezone } from "@/helpers/format";
import { User, Phone, Mail, MapPin } from "lucide-vue-next";

const props = defineProps({
  data: {
    type: Object,
    required: true,
  },
});
</script>

<template>
  <div class="border border-[#DCDEDD] rounded-[20px] hover:border-[#0C51D9] hover:border-2 hover:shadow-lg transition-all duration-300 p-4">
    <!-- Vendor Name -->
    <h4 class="text-brand-dark text-lg font-bold mb-2">{{ data.name }}</h4>

    <!-- Vendor Type & Field -->
    <p class="text-brand-light text-sm mb-2">
      <span class="font-semibold">Type:</span> {{ data.type || "-" }}<br>
      <span class="font-semibold">Field:</span> {{ data.field || "-" }}
    </p>

    <!-- PIC -->
    <div class="flex items-center gap-2 text-sm text-gray-600 mb-2">
      <User class="w-4 h-4" />
      <span>{{ data.pic_name || "-" }}</span>
    </div>
    <div class="flex items-center gap-2 text-sm text-gray-600 mb-2">
      <Phone class="w-4 h-4" />
      <span>{{ data.pic_phone || "-" }}</span>
    </div>

    <!-- Email -->
    <div class="flex items-center gap-2 text-sm text-gray-600 mb-2">
      <Mail class="w-4 h-4" />
      <span>{{ data.email || "-" }}</span>
    </div>

    <!-- Address -->
    <div class="flex items-center gap-2 text-sm text-gray-600 mb-2">
      <MapPin class="w-4 h-4" />
      <span>{{ data.address || "-" }}</span>
    </div>

    <!-- Notes -->
    <p class="text-brand-light text-sm mb-2">
      {{ data.notes || "No notes" }}
    </p>

    <!-- Actions -->
    <div class="flex gap-2 mt-4">
      <RouterLink
        :to="{ name: 'admin.vendors.detail', params: { id: data.id } }"
        class="flex-1 border border-[#DCDEDD] rounded-[8px] hover:border-[#0C51D9] hover:border-2 hover:bg-gray-50 transition-all duration-300 px-3 py-2 flex items-center justify-center gap-2"
      >
        <span class="text-brand-dark text-sm font-semibold">View</span>
      </RouterLink>
      <RouterLink
        :to="{ name: 'admin.vendors.edit', params: { id: data.id } }"
        class="flex-1 border border-[#DCDEDD] rounded-[8px] hover:border-[#0C51D9] hover:border-2 hover:bg-gray-50 transition-all duration-300 px-3 py-2 flex items-center justify-center gap-2"
      >
        <span class="text-brand-dark text-sm font-semibold">Edit</span>
      </RouterLink>
    </div>
  </div>
</template>
