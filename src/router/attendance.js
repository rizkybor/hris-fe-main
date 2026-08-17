import ClockInOut from '@/views/employee/ClockInOut.vue';
import MyAttendance from '@/views/employee/MyAttendance.vue';
import AttendanceList from '@/views/admin/attendance/AttendanceList.vue';
import AttendanceRecords from '@/views/admin/attendance/AttendanceRecords.vue';
import LeaveRequestList from '@/views/admin/attendance/LeaveRequestList.vue';

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
