<script setup>
import { Building2, Mail, Phone, Star, User, Eye, Edit, Trash2 } from "lucide-vue-next";
import { can } from "@/helpers/permissionHelper";
import { useRouter } from "vue-router";

const router = useRouter();

const props = defineProps({
  data: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(["delete"]);

const goToEdit = () => {
  router.push({ name: "admin.vendors.edit", params: { id: props.data.id } });
};

const goToDetail = () => {
  router.push({ name: "admin.vendors.detail", params: { id: props.data.id } });
};
</script>

<template>
  <!-- Vendor Card -->
  <div
    class="bg-white border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:border-2 hover:shadow-lg transition-all duration-300 p-3.5"
  >
    <div class="flex items-start justify-between mb-2.5">
      <div
        class="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center shrink-0"
      >
        <Building2 class="w-5 h-5 text-blue-500" />
      </div>
      <span
        v-if="data?.type"
        class="px-1.5 py-1 rounded-md text-xs font-semibold bg-[#F0FDF4] text-[#166534]"
      >
        {{ data.type }}
      </span>
    </div>
    <div class="flex items-center justify-between mb-2.5">
      <div class="text-left">
        <h4
          class="text-[#0C1C3C] font-['Plus_Jakarta_Sans'] text-[16px] font-bold"
        >
          {{ data?.name || "Unnamed Vendor" }}
        </h4>
        <p
          class="mt-1 text-[#6B7280] font-['Plus_Jakarta_Sans'] text-[14px] font-normal"
        >
          {{ data?.field || "-" }}
        </p>
      </div>
      <span
        v-if="data?.average_rating"
        class="inline-flex items-center gap-1 px-1.5 py-1 rounded-md text-xs font-semibold bg-[#EBF8FF] text-[#1E40AF]"
      >
        <Star class="w-3 h-3" fill="currentColor" />
        {{ data.average_rating }}
      </span>
    </div>

    <!-- Divider -->
    <div class="border-b border-[#DCDEDD] mb-2.5"></div>

    <!-- Vendor Details -->
    <div class="space-y-1.5 mb-3.5">
      <div class="flex items-center gap-1.5 text-sm text-gray-500">
        <User class="w-3.5 h-3.5" />
        <span>{{ data?.pic_name || "-" }}</span>
      </div>
      <div class="flex items-center gap-1.5 text-sm text-gray-500">
        <Phone class="w-3.5 h-3.5" />
        <span>{{ data?.pic_phone || "-" }}</span>
      </div>
      <div class="flex items-center gap-1.5 text-sm text-gray-500">
        <Mail class="w-3.5 h-3.5" />
        <span class="truncate">{{ data?.email || "-" }}</span>
      </div>
    </div>
    <div class="flex gap-1.5">
      <button @click="goToDetail" class="flex-1 btn-view-soft">
        <Eye class="w-4 h-4" />
        <span>View</span>
      </button>
      <button @click="goToEdit" class="flex-1 btn-edit-soft">
        <Edit class="w-4 h-4" />
        <span>Edit</span>
      </button>
      <button
        type="button"
        v-if="can('vendors-delete')"
        @click="emit('delete', data)"
        class="w-9 h-9 shrink-0 flex items-center justify-center border border-[#DCDEDD] rounded-[8px] hover:border-red-400 hover:bg-red-50 group/delete transition-all duration-300"
        title="Delete"
      >
        <Trash2 class="w-3.5 h-3.5 text-gray-500 group-hover/delete:text-red-600" />
      </button>
    </div>
  </div>
</template>
