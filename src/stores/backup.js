import { defineStore } from "pinia";
import { axiosInstance } from "@/plugins/axios";
import { handleError } from "@/helpers/errorHelper";

export const useBackupStore = defineStore("backup", {
    state: () => ({
        loading: false,
        error: null,
    }),

    actions: {
        async downloadBackup() {
            this.loading = true;
            this.error = null;

            try {
                const response = await axiosInstance.get("/backup/download", {
                    responseType: "blob",
                });

                const url = window.URL.createObjectURL(new Blob([response.data]));
                const link = document.createElement("a");
                link.href = url;

                const contentDisposition = response.headers["content-disposition"];
                let filename = "hris-backup.sql";
                if (contentDisposition) {
                    const filenameMatch = contentDisposition.match(/filename="(.+)"/);
                    if (filenameMatch && filenameMatch.length === 2) {
                        filename = filenameMatch[1];
                    }
                }

                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
            } catch (error) {
                this.error = handleError(error);
                throw error;
            } finally {
                this.loading = false;
            }
        },
    },
});
