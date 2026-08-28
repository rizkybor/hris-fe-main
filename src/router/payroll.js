const PayrollDashboard = () => import('@/views/admin/payroll/PayrollDashboard.vue');
const PayrollCreate = () => import('@/views/admin/payroll/PayrollCreate.vue');
const PayrollDetail = () => import('@/views/admin/payroll/PayrollDetail.vue');
const MyPayslips = () => import('@/views/employee/MyPayslips.vue');
const PayslipDetail = () => import('@/views/employee/PayslipDetail.vue');
export default [
    {
        path: 'payroll',
        name: 'admin.payroll.dashboard',
        component: PayrollDashboard,
    },
    {
        path: 'payroll/create',
        name: 'admin.payroll.create',
        component: PayrollCreate,
    },
    {
        path: 'payroll/:id',
        name: 'admin.payroll.detail',
        component: PayrollDetail,
    },
    {
        path: 'my-payslips',
        name: 'employee.payslips',
        component: MyPayslips,
    },
    {
        path: 'my-payslips/:id',
        name: 'employee.payslips.detail',
        component: PayslipDetail,
    }
];
