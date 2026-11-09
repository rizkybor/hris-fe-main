import { computed, watch } from "vue";
import { useRoute } from "vue-router";
import { useLicenseManagerStore } from "@/stores/licenseManager";

/**
 * The product of the current License Manager page, from :product in the
 * URL. state is "loading" | "missing" | "inactive" | "ready"; pages load
 * their data once it is "ready". Also points the store's license calls at
 * this product.
 */
export function useLicenseProduct() {
  const route = useRoute();
  const store = useLicenseManagerStore();

  const code = computed(() => String(route.params.product || ""));
  const product = computed(() => store.productByCode(code.value));

  const state = computed(() => {
    if (!store.productsLoaded) return store.error && !store.productsLoading ? "missing" : "loading";
    if (!product.value) return "missing";
    if (!product.value.is_active) return "inactive";
    return "ready";
  });

  watch(code, (value) => store.setProduct(value), { immediate: true });
  store.fetchProducts().catch(() => {});

  // "OCCA" etc.; falls back to the code while products load.
  const productName = computed(() => product.value?.name || code.value.toUpperCase());

  return { code, product, productName, state };
}

/**
 * Run fn whenever the product becomes ready (and again when the product or
 * the given extra source changes).
 */
export function onProductReady(state, fn, extra = null) {
  watch(
    () => [state.value, extra ? extra() : null],
    ([value]) => {
      if (value === "ready") fn();
    },
    { immediate: true }
  );
}
