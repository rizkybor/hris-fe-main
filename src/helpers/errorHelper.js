export function handleError(error) {
    if (error.response && error.response.status === 422) {
        return error.response.data.errors
    } else if (error.response && error.response.status === 401) {
        return error.response.data.message
    } else if (error.response && error.response.status === 400) {
        return error.response.data.message
    } else if (error.response && error.response.status === 429) {
        return error.response.data.message
    } else if (error.response && error.response.status === 500) {
        return error.response.data.message
    } else {
        console.log(error)
    }
}

/**
 * handleError() returns a string for most statuses but the raw
 * {field: [messages]} object for 422 -- this flattens either shape into one
 * display-ready string, so a form's catch block never falls back to axios's
 * generic "Request failed with status code 422" instead of the real reason.
 */
export function errorMessage(error, fallback = "Something went wrong. Please try again.") {
    const handled = handleError(error)

    if (typeof handled === "string" && handled) {
        return handled
    }

    if (handled && typeof handled === "object") {
        const flattened = Object.values(handled).flat().join(" ")
        if (flattened) return flattened
    }

    return error?.response?.data?.message || fallback
}
