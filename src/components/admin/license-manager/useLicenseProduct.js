import { computed, watch } from "vue";
import { useRoute } from "vue-router";
import { useLicenseManagerStore } from "@/stores/licenseManager";

// licensePage: the page is about licenses (list / create / edit / detail),
// so an app without licensing gets the "unlicensed" state instead.
export function useLicenseProduct({ licensePage = true } = {}) {
  const route = useRoute();
  const store = useLicenseManagerStore();

  const code = computed(() => String(route.params.product || ""));
  const product = computed(() => store.productByCode(code.value));

  const state = computed(() => {
    if (!store.productsLoaded) return store.error && !store.productsLoading ? "missing" : "loading";
    if (!product.value) return "missing";
    if (!product.value.is_active) return "inactive";
    if (licensePage && product.value.is_licensed === false) return "unlicensed";
    return "ready";
  });

  watch(code, (value) => store.setProduct(value), { immediate: true });
  store.fetchProducts().catch(() => {});

  // "OCCA" etc.; falls back to the code while products load.
  const productName = computed(() => product.value?.name || code.value.toUpperCase());

  return { code, product, productName, state };
}

export function onProductReady(state, fn, extra = null) {
  watch(
    () => [state.value, extra ? extra() : null],
    ([value]) => {
      if (value === "ready") fn();
    },
    { immediate: true }
  );
}
