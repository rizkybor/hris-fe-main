import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AuthLayout from '@/layouts/Auth.vue'
import AdminLayout from '@/layouts/Admin.vue'
const Login = () => import('@/views/auth/Login.vue')
const ForgotPassword = () => import('@/views/auth/ForgotPassword.vue')
const ResetPassword = () => import('@/views/auth/ResetPassword.vue')
const AdminDashboard = () => import('@/views/admin/Dashboard.vue')
import teamRoutes from './team';
import employeeRoutes from './employee';
const EmployeeCreate = () => import('@/views/admin/employee/EmployeeCreate.vue');
const EmployeeEdit = () => import('@/views/admin/employee/EmployeeEdit.vue');
const EmployeeDetail = () => import('@/views/admin/employee/EmployeeDetail.vue');
const EmployeeProfile = () => import('@/views/employee/EmployeeProfile.vue');
const EmployeeTeam = () => import('@/views/employee/EmployeeTeam.vue');
const MyTasks = () => import('@/views/employee/MyTasks.vue');
import EmployeeCreateLayout from '@/layouts/EmployeeCreateLayout.vue';
import projectRoutes from './project';
import attendanceRoutes from './attendance';
import payrollRoutes from './payroll';
import accountPasswordRoutes from './accountPassword';
import filesCompanyRoutes from './filesCompany';
import vendorsRoutes from './vendor';
import companyAboutRoutes from './companyAbout';
import companyFinanceRoutes from './companyFinance'
import companyCashBookRoutes from './companyCashBook'
import reportRoutes from './report';
import settingsRoutes from './settings';
import documentRoutes from './document';
import historyRoutes from './history';
import announcementRoutes from './announcement';
import assetRoutes from './asset';
import orgchartRoutes from './orgchart';
import projectCalculatorRoutes from './projectCalculator';




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
        ...accountPasswordRoutes,
        ...filesCompanyRoutes,
        ...vendorsRoutes,
        ...companyAboutRoutes,
        ...companyFinanceRoutes,
        ...companyCashBookRoutes,
        ...reportRoutes,
        ...settingsRoutes,
        ...documentRoutes,
        ...historyRoutes,
        ...announcementRoutes,
        ...assetRoutes,
        ...orgchartRoutes,
        ...projectCalculatorRoutes,
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
        },
        {
          path: 'my-tasks',
          name: 'employee.tasks',
          component: MyTasks,
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
        {
          path: 'forgot-password',
          name: 'forgot-password',
          component: ForgotPassword,
        },
        {
          path: 'reset-password',
          name: 'reset-password',
          component: ResetPassword,
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
    next({ name: 'admin.dashboard' })
  } else {
    next()
  }
})


export default router
