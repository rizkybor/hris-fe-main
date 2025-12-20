import PayrollDashboard from '@/views/admin/payroll/PayrollDashboard.vue';
import PayrollCreate from '@/views/admin/payroll/PayrollCreate.vue';
import PayrollDetail from '@/views/admin/payroll/PayrollDetail.vue';
import MyPayslips from '@/views/employee/MyPayslips.vue';
import PayslipDetail from '@/views/employee/PayslipDetail.vue';

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
