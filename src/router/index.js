import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AuthLayout from '@/layouts/Auth.vue'
import AdminLayout from '@/layouts/Admin.vue'
import Login from '@/views/auth/Login.vue'
import AdminDashboard from '@/views/admin/Dashboard.vue'
import teamRoutes from './team';
import employeeRoutes from './employee';
import EmployeeCreate from '@/views/admin/employee/EmployeeCreate.vue';
import EmployeeEdit from '@/views/admin/employee/EmployeeEdit.vue';
import EmployeeDetail from '@/views/admin/employee/EmployeeDetail.vue';
import EmployeeProfile from '@/views/employee/EmployeeProfile.vue';
import EmployeeTeam from '@/views/employee/EmployeeTeam.vue';
import EmployeeCreateLayout from '@/layouts/EmployeeCreateLayout.vue';
import projectRoutes from './project';
import attendanceRoutes from './attendance';
import payrollRoutes from './payroll';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(to, from, savedPosition) {
    // Scroll the main content area to top
    return new Promise((resolve) => {
      setTimeout(() => {
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
          mainContent.scrollTop = 0;
        }
        resolve({ top: 0, left: 0 });
      }, 100);
    });
  },
  routes: [
    {
      path: '/',
      redirect: '/admin/dashboard',
    },
    {
      path: '/admin',
      component: AdminLayout,
      meta: {
        requiresAuth: true,
      },
      children: [
        {
          path: 'dashboard',
          name: 'admin.dashboard',
          component: AdminDashboard,

        },
        ...teamRoutes,
        ...employeeRoutes,
        ...projectRoutes,
        ...attendanceRoutes,
        ...payrollRoutes,
        {
          path: 'my-profile',
          name: 'employee.profile',
          component: EmployeeProfile,
        },
        {
          path: 'my-profile/edit',
          name: 'employee.profile.edit',
          component: () => import('@/views/employee/EmployeeProfileEdit.vue'),
        },
        {
          path: 'my-team',
          name: 'employee.team',
          component: EmployeeTeam,
        }
      ],
    },
    {
      path: '/admin/employees/create',
      component: EmployeeCreateLayout,
      meta: {
        requiresAuth: true,
      },
      children: [
        {
          path: '',
          name: 'admin.employees.create',
          component: EmployeeCreate
        }
      ]
    },
    {
      path: '/admin/employees/:id/edit',
      component: EmployeeCreateLayout,
      meta: {
        requiresAuth: true,
      },
      children: [
        {
          path: '',
          name: 'admin.employees.edit',
          component: EmployeeEdit
        }
      ]
    },
    {
      path: '/admin/employees/:id',
      component: AdminLayout,
      meta: {
        requiresAuth: true,
      },
      children: [
        {
          path: '',
          name: 'admin.employees.detail',
          component: EmployeeDetail
        }
      ]
    },
    {
      path: '/auth',
      component: AuthLayout,
      children: [
        {
          path: 'login',
          name: 'login',
          component: Login,
        },
      ],
    },
  ],
})


router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth) {
    if (authStore.token) {
      try {
        if (!authStore.user) {
          await authStore.checkAuth()
        }

        next()
      } catch (error) {
        next({ name: 'login' })
      }
    } else {
      next({ name: 'login' })
    }
  } else if (to.meta.requiresUnauth && authStore.token) {
    next({ name: 'dashboard' })
  } else {
    next()
  }
})


export default router
