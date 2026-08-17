import { defineStore } from "pinia";
import { axiosInstance } from "@/plugins/axios";
import { handleError } from "@/helpers/errorHelper";

export const useEmployeeFileStore = defineStore("employeeFile", {
    state: () => ({
        files: [],
        loading: false,
        uploading: false,
        error: null,
    }),

    actions: {
        async fetchByEmployee(employeeId) {
            this.loading = true;
            this.error = null;

            try {
                const response = await axiosInstance.get(`employees/${employeeId}/files`);
                this.files = response.data.data;
            } catch (error) {
                this.error = handleError(error);
            } finally {
                this.loading = false;
            }
        },

        async uploadFiles(employeeId, fileList, names = []) {
            this.uploading = true;
            this.error = null;

            try {
                const formData = new FormData();
                fileList.forEach((file, index) => {
                    formData.append("files[]", file);
                    formData.append("names[]", names[index] || file.name);
                });

                const response = await axiosInstance.post(`employees/${employeeId}/files`, formData);
                this.files = [...response.data.data, ...this.files];
                return response.data.data;
            } catch (error) {
                this.error = handleError(error);
                throw error;
            } finally {
                this.uploading = false;
            }
        },

        async deleteFile(id) {
            try {
                await axiosInstance.delete(`employee-files/${id}`);
                this.files = this.files.filter((file) => file.id !== id);
            } catch (error) {
                this.error = handleError(error);
                throw error;
            }
        },
    },
});
