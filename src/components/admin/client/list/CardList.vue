<script setup>
import { Mail, Phone, Star, User, Briefcase, Edit, Trash2 } from "lucide-vue-next";
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
  router.push({ name: "admin.clients.edit", params: { id: props.data.id } });
};

const goToDetail = () => {
  router.push({ name: "admin.clients.detail", params: { id: props.data.id } });
};
</script>

<template>
  <!-- Client Row -->
  <div
    class="bg-white border border-[#DCDEDD] rounded-[14px] p-4 hover:border-[#0C51D9] transition-all duration-300 cursor-pointer"
    @click="goToDetail"
  >
    <div class="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 flex-wrap mb-1.5">
          <h4 class="text-brand-dark text-sm font-bold truncate">{{ data?.name || "Unnamed Client" }}</h4>
          <span
            v-if="data?.type"
            class="px-2 py-0.5 rounded-md text-xs font-semibold bg-[#F0FDF4] text-[#166534]"
          >
            {{ data.type }}
          </span>
          <span
            v-if="data?.average_rating"
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-[#EBF8FF] text-[#1E40AF]"
          >
            <Star class="w-3 h-3" fill="currentColor" />
            {{ data.average_rating }}
          </span>
        </div>
        <div class="flex items-center gap-1.5 flex-wrap text-xs text-gray-500">
          <span v-if="data?.field" class="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md font-medium">
            <Briefcase class="w-3 h-3" /> {{ data.field }}
          </span>
          <span class="inline-flex items-center gap-1">
            <User class="w-3 h-3" /> {{ data?.pic_name || "-" }}
          </span>
          <span class="inline-flex items-center gap-1">
            <Phone class="w-3 h-3" /> {{ data?.pic_phone || "-" }}
          </span>
          <span class="inline-flex items-center gap-1">
            <Mail class="w-3 h-3" /> {{ data?.email || "-" }}
          </span>
        </div>
      </div>

      <div class="flex items-center gap-1.5 shrink-0" @click.stop>
        <button
          v-if="can('clients-edit')"
          type="button"
          @click="goToEdit"
          title="Edit"
          class="w-9 h-9 shrink-0 flex items-center justify-center border border-[#DCDEDD] rounded-[8px] hover:border-[#0C51D9] hover:bg-gray-50 transition-all duration-300"
        >
          <Edit class="w-3.5 h-3.5 text-gray-600" />
        </button>
        <button
          type="button"
          v-if="can('clients-delete')"
          @click="emit('delete', data)"
          class="w-9 h-9 shrink-0 flex items-center justify-center border border-[#DCDEDD] rounded-[8px] hover:border-red-400 hover:bg-red-50 group/delete transition-all duration-300"
          title="Delete"
        >
          <Trash2 class="w-3.5 h-3.5 text-gray-500 group-hover/delete:text-red-600" />
        </button>
      </div>
    </div>
  </div>
</template>
