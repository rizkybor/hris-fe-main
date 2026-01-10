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
  <div
    class="bg-white border border-[#DCDEDD] rounded-[20px] p-5 shadow-sm hover:shadow-lg transition-all duration-300 hover:border-[#0C51D9]"
  >
    <!-- Vendor Name -->
    <h4 class="text-brand-dark text-xl font-bold mb-3 truncate">
      {{ data.name || "Unnamed Vendor" }}
    </h4>

   <!-- Vendor Type & Field as Chips -->
<div class="flex flex-wrap gap-2 mb-3">
  <span
    v-if="data.type"
    class="bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-1 rounded-full"
  >
    {{ data.type }}
  </span>
  <span
    v-if="data.field"
    class="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-1 rounded-full"
  >
    {{ data.field }}
  </span>

  <!-- fallback jika tidak ada type/field -->
  <span
    v-if="!data.type && !data.field"
    class="bg-gray-100 text-gray-500 text-xs font-medium px-2.5 py-1 rounded-full"
  >
    -
  </span>
</div>


    <!-- PIC -->
    <div class="flex items-center gap-3 text-sm text-gray-600 mb-2">
      <User class="w-5 h-5 text-gray-400" />
      <span>{{ data.pic_name || "-" }}</span>
    </div>
    <div class="flex items-center gap-3 text-sm text-gray-600 mb-2">
      <Phone class="w-5 h-5 text-gray-400" />
      <span>{{ data.pic_phone || "-" }}</span>
    </div>

    <!-- Email -->
    <div class="flex items-center gap-3 text-sm text-gray-600 mb-2">
      <Mail class="w-5 h-5 text-gray-400" />
      <span class="truncate">{{ data.email || "-" }}</span>
    </div>

    <!-- Address -->
    <div class="flex items-start gap-3 text-sm text-gray-600 mb-3">
      <MapPin class="w-5 h-5 text-gray-400 mt-0.5" />
      <span class="truncate">{{ data.address || "-" }}</span>
    </div>

    <!-- Notes -->
    <p class="text-gray-400 text-sm mb-4 line-clamp-3">
      {{ data.notes || "No notes" }}
    </p>

    <!-- Actions -->
    <div class="flex gap-3">
      <RouterLink
        :to="{ name: 'admin.vendors.detail', params: { id: data.id } }"
        class="flex-1 text-center py-2 px-3 rounded-lg border border-gray-300 hover:border-[#0C51D9] hover:bg-blue-50 text-gray-700 font-semibold transition-all duration-300"
      >
        View
      </RouterLink>
      <RouterLink
        :to="{ name: 'admin.vendors.edit', params: { id: data.id } }"
        class="flex-1 text-center py-2 px-3 rounded-lg border border-gray-300 hover:border-[#0C51D9] hover:bg-blue-50 text-gray-700 font-semibold transition-all duration-300"
      >
        Edit
      </RouterLink>
    </div>
  </div>
</template>

