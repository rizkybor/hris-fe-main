const DocumentsHub = () => import('@/views/admin/documents/DocumentsHub.vue');
const PurchaseOrderList = () => import('@/views/admin/documents/PurchaseOrderList.vue');
const PurchaseOrderCreate = () => import('@/views/admin/documents/PurchaseOrderCreate.vue');
const InvoiceList = () => import('@/views/admin/documents/InvoiceList.vue');
const InvoiceCreate = () => import('@/views/admin/documents/InvoiceCreate.vue');
const PaymentReceiptList = () => import('@/views/admin/documents/PaymentReceiptList.vue');
const PaymentReceiptCreate = () => import('@/views/admin/documents/PaymentReceiptCreate.vue');
const LetterList = () => import('@/views/admin/documents/LetterList.vue');
const LetterCreate = () => import('@/views/admin/documents/LetterCreate.vue');
const CertificateList = () => import('@/views/admin/documents/CertificateList.vue');
const CertificateGenerate = () => import('@/views/admin/documents/CertificateGenerate.vue');
const OfficialMemoList = () => import('@/views/admin/documents/OfficialMemoList.vue');
const OfficialMemoForm = () => import('@/views/admin/documents/OfficialMemoForm.vue');
const OfficialMemoDetail = () => import('@/views/admin/documents/OfficialMemoDetail.vue');
const MeetingNoteList = () => import('@/views/admin/documents/MeetingNoteList.vue');
const MeetingNoteForm = () => import('@/views/admin/documents/MeetingNoteForm.vue');
const MeetingNoteDetail = () => import('@/views/admin/documents/MeetingNoteDetail.vue');
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
    path: 'documents/purchase-orders/:id/edit',
    name: 'admin.purchase-orders.edit',
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
    path: 'documents/invoices/:id/edit',
    name: 'admin.invoices.edit',
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
    path: 'documents/payment-receipts/:id/edit',
    name: 'admin.payment-receipts.edit',
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
  {
    path: 'documents/letters/:id/edit',
    name: 'admin.letters.edit',
    component: LetterCreate,
  },
  {
    path: 'documents/certificates',
    name: 'admin.certificates.dashboard',
    component: CertificateList,
  },
  {
    path: 'documents/certificates/create',
    name: 'admin.certificates.create',
    component: CertificateGenerate,
  },
  {
    path: 'documents/official-memos',
    name: 'admin.official-memos.dashboard',
    component: OfficialMemoList,
  },
  {
    path: 'documents/official-memos/create',
    name: 'admin.official-memos.create',
    component: OfficialMemoForm,
  },
  {
    path: 'documents/official-memos/:id',
    name: 'admin.official-memos.detail',
    component: OfficialMemoDetail,
  },
  {
    path: 'documents/official-memos/:id/edit',
    name: 'admin.official-memos.edit',
    component: OfficialMemoForm,
  },
  {
    path: 'documents/meeting-notes',
    name: 'admin.meeting-notes.dashboard',
    component: MeetingNoteList,
  },
  {
    path: 'documents/meeting-notes/create',
    name: 'admin.meeting-notes.create',
    component: MeetingNoteForm,
  },
  {
    path: 'documents/meeting-notes/:id',
    name: 'admin.meeting-notes.detail',
    component: MeetingNoteDetail,
  },
  {
    path: 'documents/meeting-notes/:id/edit',
    name: 'admin.meeting-notes.edit',
    component: MeetingNoteForm,
  },
];
