import ClockInOut from '@/views/employee/ClockInOut.vue';
import MyAttendance from '@/views/employee/MyAttendance.vue';
import AttendanceList from '@/views/admin/attendance/AttendanceList.vue';

export default [
    {
        path: 'attendances',
        name: 'admin.attendances',
        component: AttendanceList,
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
