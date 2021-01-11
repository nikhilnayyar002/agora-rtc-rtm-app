const fetchJsonRes = (url, options = null) => fetch(url, options).then(res => res.json()).catch(() => alert("network error"))

export const isChannelLive = channelName => fetchJsonRes(`/api/channel_status/${channelName}`)
export const endSession = channelName => fetchJsonRes(`/api/end_session/${channelName}`)
export const doesChannelExist = channelName => fetchJsonRes(`/api/channel_exists/${channelName}`)

export const startSession = (channelName, userId, userName) => {
    return fetchJsonRes("/api/start_session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelName, userId, userName })
    })
}