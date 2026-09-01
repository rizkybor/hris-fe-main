<script setup>
import { formatToClientTimezone } from "@/helpers/format";
import { User, Phone, Mail, MapPin, Star } from "lucide-vue-next";

const props = defineProps({
  data: {
    type: Object,
    required: true,
  },
});
</script>

<template>
  <div
    class="bg-white border border-[#DCDEDD] rounded-[14px] p-4 shadow-sm hover:shadow-lg transition-all duration-300 hover:border-[#0C51D9]"
  >
    <!-- Vendor Name -->
    <div class="flex items-center justify-between gap-2 mb-2.5">
      <h4 class="text-brand-dark text-base font-bold truncate">
        {{ data.name || "Unnamed Vendor" }}
      </h4>
      <div v-if="data.average_rating" class="flex items-center gap-1 shrink-0">
        <Star class="w-4 h-4 text-amber-400" fill="currentColor" />
        <span class="text-brand-dark text-sm font-semibold">{{ data.average_rating }}</span>
      </div>
    </div>

   <!-- Vendor Type & Field as Chips -->
<div class="flex flex-wrap gap-1.5 mb-2.5">
  <span
    v-if="data.type"
    class="bg-purple-100 text-purple-800 text-xs font-medium px-2 py-1 rounded-full"
  >
    {{ data.type }}
  </span>
  <span
    v-if="data.field"
    class="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full"
  >
    {{ data.field }}
  </span>

  <!-- fallback jika tidak ada type/field -->
  <span
    v-if="!data.type && !data.field"
    class="bg-gray-100 text-gray-500 text-xs font-medium px-2 py-1 rounded-full"
  >
    -
  </span>
</div>


    <!-- PIC -->
    <div class="flex items-center gap-2.5 text-sm text-gray-600 mb-1.5">
      <User class="w-5 h-5 text-gray-400" />
      <span>{{ data.pic_name || "-" }}</span>
    </div>
    <div class="flex items-center gap-2.5 text-sm text-gray-600 mb-1.5">
      <Phone class="w-5 h-5 text-gray-400" />
      <span>{{ data.pic_phone || "-" }}</span>
    </div>

    <!-- Email -->
    <div class="flex items-center gap-2.5 text-sm text-gray-600 mb-1.5">
      <Mail class="w-5 h-5 text-gray-400" />
      <span class="truncate">{{ data.email || "-" }}</span>
    </div>

    <!-- Address -->
    <div class="flex items-start gap-2.5 text-sm text-gray-600 mb-2.5">
      <MapPin class="w-5 h-5 text-gray-400 mt-0.5" />
      <span class="truncate">{{ data.address || "-" }}</span>
    </div>

    <!-- Notes -->
    <p class="text-gray-400 text-sm mb-3.5 line-clamp-3">
      {{ data.notes || "No notes" }}
    </p>

    <!-- Actions -->
    <div class="flex gap-2.5">
      <RouterLink
        :to="{ name: 'admin.vendors.detail', params: { id: data.id } }"
        class="flex-1 btn-view-soft"
      >
        View
      </RouterLink>
      <RouterLink
        :to="{ name: 'admin.vendors.edit', params: { id: data.id } }"
        class="flex-1 btn-edit-soft"
      >
        Edit
      </RouterLink>
    </div>
  </div>
</template>

