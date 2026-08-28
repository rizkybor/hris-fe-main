const TeamList = () => import("@/views/admin/team/TeamList.vue");
const TeamCreate = () => import("@/views/admin/team/TeamCreate.vue");
const TeamEdit = () => import("@/views/admin/team/TeamEdit.vue");
const TeamDetail = () => import("@/views/admin/team/TeamDetail.vue");
// team routes
export default [
    {
        path: '/admin/teams',
        name: 'admin.teams',
        component: TeamList
    },
    {
        path: '/admin/teams/:id',
        name: 'admin.team.detail',
        component: TeamDetail
    },
    {
        path: '/admin/teams/create',
        name: 'admin.team.create',
        component: TeamCreate
    },
    {
        path: '/admin/teams/edit/:id',
        name: 'admin.team.edit',
        component: TeamEdit
    }
];