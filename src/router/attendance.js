const ClockInOut = () => import('@/views/employee/ClockInOut.vue');
const MyAttendance = () => import('@/views/employee/MyAttendance.vue');
const AttendanceList = () => import('@/views/admin/attendance/AttendanceList.vue');
const AttendanceRecords = () => import('@/views/admin/attendance/AttendanceRecords.vue');
const LeaveRequestList = () => import('@/views/admin/attendance/LeaveRequestList.vue');
export default [
    {
        path: 'attendances',
        name: 'admin.attendances',
        component: AttendanceList,
    },
    {
        path: 'attendances/records',
        name: 'admin.attendances.records',
        component: AttendanceRecords,
    },
    {
        path: 'attendances/leave-requests',
        name: 'admin.leave-requests.dashboard',
        component: LeaveRequestList,
    },
    {
        path: 'attendance/my-attendances',
        name: 'employee.attendance.my-attendances',
        component: MyAttendance,
    },
    {
        path: 'attendance/clock',
        name: 'employee.attendance.clock',
        component: ClockInOut,
    },
];
