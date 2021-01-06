
export const CLIENT_ROLES = { audience: "audience", host: "host" }

function generateRandomString() {
    return Math.random().toString(20).substr(2, 8)
}

export function generateUserId(value) {
    return `${generateRandomString()}:${value}`
}
export function decodeUserIdRndNum(value) {
    return value.split(":")[0]
}
export function decodeUserIdName(value) {
    return value.split(":")[1]
}