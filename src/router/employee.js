const EmployeeList = () => import("@/views/admin/employee/EmployeeList.vue");
const EmployeeSuccess = () => import("@/views/admin/employee/EmployeeSuccess.vue");
export default [
    {
        path: 'employees',
        name: 'admin.employees',
        component: EmployeeList
    },
    {
        path: 'employees/success',
        name: 'admin.employees.success',
        component: EmployeeSuccess
    }
];