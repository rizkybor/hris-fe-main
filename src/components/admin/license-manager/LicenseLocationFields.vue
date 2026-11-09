<script setup>
// Location fields of a license (both categories). Country is a searchable
// ISO list; Indonesia gets cascading Province → City/Regency → District →
// Village selects (stored as codes, names filled in), other countries free
// text. Then postal code and street address.
import { computed, onMounted, ref, watch } from "vue";
import { Globe, MapPin, Map as MapIcon, Building, Home, Mail as MailIcon, Hash } from "lucide-vue-next";
import LicenseFormField from "@/components/admin/license-manager/LicenseFormField.vue";
import SearchSelect from "@/components/admin/license-manager/SearchSelect.vue";
import { COUNTRY_OPTIONS } from "@/components/admin/license-manager/countries";
import { useLicenseManagerStore } from "@/stores/licenseManager";
import { isIndonesia, isRequiredField } from "@/components/admin/license-manager/licenseHelpers";

const form = defineModel({ type: Object, required: true });
const props = defineProps({
  category: { type: String, default: "individual" },
  errors: { type: Object, default: () => ({}) },
  inputClass: { type: Function, required: true },
});

const store = useLicenseManagerStore();

const indonesia = computed(() => isIndonesia(form.value.country));
const required = (field) => isRequiredField(props.category, field, form.value.country);
const fieldError = (field) => {
  const value = props.errors?.[field];
  return Array.isArray(value) ? value[0] : value || "";
};

// Region lists, keyed by level.
const LEVELS = ["province", "regency", "district", "village"];
const PARENT = { regency: "province", district: "regency", village: "district" };
const lists = ref({ province: [], regency: [], district: [], village: [] });
const loading = ref({ province: false, regency: false, district: false, village: false });
const loadError = ref("");

const options = (level) => lists.value[level].map((r) => ({ value: r.code, label: r.name }));

const load = async (level) => {
  const parentLevel = PARENT[level];
  const parentCode = parentLevel ? form.value[`${parentLevel}_code`] : null;
  if (parentLevel && !parentCode) {
    lists.value[level] = [];
    return;
  }
  loading.value[level] = true;
  loadError.value = "";
  try {
    lists.value[level] = await store.fetchRegions(level, parentCode);
  } catch {
    lists.value[level] = [];
    loadError.value = "Could not load the region list. Check the connection and try again.";
  } finally {
    loading.value[level] = false;
  }
};

// Load the lists the current values need (create: provinces; edit: the
// whole chain of the stored address).
const loadChain = async () => {
  if (!indonesia.value) return;
  for (const level of LEVELS) {
    const parentLevel = PARENT[level];
    if (parentLevel && !form.value[`${parentLevel}_code`]) break;
    await load(level);
  }
};
onMounted(loadChain);

// Picking a region sets its code and name and clears everything below it.
const pick = (level, option) => {
  form.value[`${level}_code`] = option.value;
  form.value[level] = option.label;
  const below = LEVELS.slice(LEVELS.indexOf(level) + 1);
  for (const child of below) {
    form.value[`${child}_code`] = "";
    form.value[child] = "";
    lists.value[child] = [];
  }
  if (below.length) load(below[0]);
};

// Switching between Indonesia and another country clears the region part.
watch(
  () => indonesia.value,
  (now, before) => {
    if (now === before) return;
    for (const level of LEVELS) {
      form.value[`${level}_code`] = "";
      form.value[level] = "";
      lists.value[level] = [];
    }
    if (now) load("province");
  }
);
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
    <LicenseFormField field="country" label="Country" :required="required('country')" :error="fieldError('country')" wide v-slot="{ id }">
      <SearchSelect
        :id="id"
        v-model="form.country"
        :options="COUNTRY_OPTIONS"
        :icon="Globe"
        :invalid="!!fieldError('country')"
        placeholder="Choose a country"
        search-placeholder="Search country..."
      />
    </LicenseFormField>

    <!-- Indonesia: cascading region selects -->
    <template v-if="indonesia">
      <LicenseFormField field="province_code" label="Province" :required="required('province_code')" :error="fieldError('province_code')" v-slot="{ id }">
        <SearchSelect
          :id="id"
          :model-value="form.province_code"
          :options="options('province')"
          :loading="loading.province"
          :icon="MapIcon"
          :invalid="!!fieldError('province_code')"
          placeholder="Choose a province"
          search-placeholder="Search province..."
          @change="(o) => pick('province', o)"
        />
      </LicenseFormField>
      <LicenseFormField field="regency_code" label="City / Regency" :required="required('regency_code')" :error="fieldError('regency_code')" v-slot="{ id }">
        <SearchSelect
          :id="id"
          :model-value="form.regency_code"
          :options="options('regency')"
          :loading="loading.regency"
          :disabled="!form.province_code"
          :icon="Building"
          :invalid="!!fieldError('regency_code')"
          :placeholder="form.province_code ? 'Choose a city / regency' : 'Choose a province first'"
          search-placeholder="Search Kota / Kabupaten..."
          @change="(o) => pick('regency', o)"
        />
      </LicenseFormField>
      <LicenseFormField field="district_code" label="District (Kecamatan)" :required="required('district_code')" :error="fieldError('district_code')" v-slot="{ id }">
        <SearchSelect
          :id="id"
          :model-value="form.district_code"
          :options="options('district')"
          :loading="loading.district"
          :disabled="!form.regency_code"
          :icon="MapPin"
          :invalid="!!fieldError('district_code')"
          :placeholder="form.regency_code ? 'Choose a district' : 'Choose a city / regency first'"
          search-placeholder="Search Kecamatan..."
          @change="(o) => pick('district', o)"
        />
      </LicenseFormField>
      <LicenseFormField field="village_code" label="Village (Kelurahan / Desa)" :required="required('village_code')" :error="fieldError('village_code')" v-slot="{ id }">
        <SearchSelect
          :id="id"
          :model-value="form.village_code"
          :options="options('village')"
          :loading="loading.village"
          :disabled="!form.district_code"
          :icon="Home"
          :invalid="!!fieldError('village_code')"
          :placeholder="form.district_code ? 'Choose a village' : 'Choose a district first'"
          search-placeholder="Search Kelurahan / Desa..."
          @change="(o) => pick('village', o)"
        />
      </LicenseFormField>
      <p v-if="loadError" class="md:col-span-2 text-xs text-red-600 -mt-2">{{ loadError }}</p>
    </template>

    <!-- Other countries: free text -->
    <template v-else>
      <LicenseFormField field="province" label="State / Province" :required="required('province')" :error="fieldError('province')" :icon="MapIcon" v-slot="{ id }">
        <input :id="id" v-model="form.province" type="text" autocomplete="address-level1" placeholder="e.g. Selangor" :class="inputClass('province')" />
      </LicenseFormField>
      <LicenseFormField field="regency" label="City" :required="required('regency')" :error="fieldError('regency')" :icon="Building" v-slot="{ id }">
        <input :id="id" v-model="form.regency" type="text" autocomplete="address-level2" placeholder="e.g. Shah Alam" :class="inputClass('regency')" />
      </LicenseFormField>
      <LicenseFormField field="district" label="District" :required="required('district')" :error="fieldError('district')" :icon="MapPin" v-slot="{ id }">
        <input :id="id" v-model="form.district" type="text" autocomplete="address-level3" :class="inputClass('district')" />
      </LicenseFormField>
    </template>

    <LicenseFormField field="postal_code" label="Postal Code" :required="required('postal_code')" :error="fieldError('postal_code')" :icon="MailIcon" v-slot="{ id }">
      <input
        :id="id"
        v-model.trim="form.postal_code"
        type="text"
        :inputmode="indonesia ? 'numeric' : 'text'"
        :maxlength="indonesia ? 5 : 20"
        autocomplete="postal-code"
        :placeholder="indonesia ? 'e.g. 10110' : 'e.g. 40000'"
        :class="inputClass('postal_code')"
      />
    </LicenseFormField>

    <LicenseFormField field="address" label="Street Address" :required="required('address')" :error="fieldError('address')" :icon="Hash" wide v-slot="{ id }">
      <textarea
        :id="id"
        v-model="form.address"
        rows="2"
        autocomplete="street-address"
        placeholder="Street, number, building, RT/RW"
        :class="[inputClass('address'), 'font-normal resize-none']"
      ></textarea>
    </LicenseFormField>
  </div>
</template>
