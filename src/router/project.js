import ProjectList from "@/views/admin/project/ProjectList.vue";
import ProjectCreate from "@/views/admin/project/ProjectCreate.vue";
import ProjectEdit from "@/views/admin/project/ProjectEdit.vue";
import ProjectDetail from "@/views/admin/project/ProjectDetail.vue";

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