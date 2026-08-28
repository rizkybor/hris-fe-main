const ProjectList = () => import("@/views/admin/project/ProjectList.vue");
const ProjectCreate = () => import("@/views/admin/project/ProjectCreate.vue");
const ProjectEdit = () => import("@/views/admin/project/ProjectEdit.vue");
const ProjectDetail = () => import("@/views/admin/project/ProjectDetail.vue");
export default [
    {
        path: '/admin/projects',
        name: 'admin.projects',
        component: ProjectList
    },
    {
        path: '/admin/projects/:id',
        name: 'admin.projects.detail',
        component: ProjectDetail
    },
    {
        path: '/admin/projects/create',
        name: 'admin.projects.create',
        component: ProjectCreate
    },
    {
        path: '/admin/projects/:id',
        name: 'admin.projects.edit',
        component: ProjectEdit
    }
];