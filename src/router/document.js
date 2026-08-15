import DocumentsHub from '@/views/admin/documents/DocumentsHub.vue';
import PurchaseOrderList from '@/views/admin/documents/PurchaseOrderList.vue';
import PurchaseOrderCreate from '@/views/admin/documents/PurchaseOrderCreate.vue';
import InvoiceList from '@/views/admin/documents/InvoiceList.vue';
import InvoiceCreate from '@/views/admin/documents/InvoiceCreate.vue';
import PaymentReceiptList from '@/views/admin/documents/PaymentReceiptList.vue';
import PaymentReceiptCreate from '@/views/admin/documents/PaymentReceiptCreate.vue';
import LetterList from '@/views/admin/documents/LetterList.vue';
import LetterCreate from '@/views/admin/documents/LetterCreate.vue';

export default [
  {
    path: 'documents',
    name: 'admin.documents.dashboard',
    component: DocumentsHub,
  },
  {
    path: 'documents/purchase-orders',
    name: 'admin.purchase-orders.dashboard',
    component: PurchaseOrderList,
  },
  {
    path: 'documents/purchase-orders/create',
    name: 'admin.purchase-orders.create',
    component: PurchaseOrderCreate,
  },
  {
    path: 'documents/invoices',
    name: 'admin.invoices.dashboard',
    component: InvoiceList,
  },
  {
    path: 'documents/invoices/create',
    name: 'admin.invoices.create',
    component: InvoiceCreate,
  },
  {
    path: 'documents/payment-receipts',
    name: 'admin.payment-receipts.dashboard',
    component: PaymentReceiptList,
  },
  {
    path: 'documents/payment-receipts/create',
    name: 'admin.payment-receipts.create',
    component: PaymentReceiptCreate,
  },
  {
    path: 'documents/letters',
    name: 'admin.letters.dashboard',
    component: LetterList,
  },
  {
    path: 'documents/letters/create',
    name: 'admin.letters.create',
    component: LetterCreate,
  },
];
