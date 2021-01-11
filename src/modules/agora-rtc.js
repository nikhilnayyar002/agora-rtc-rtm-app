import AgoraRTC from "agora-rtc-sdk-ng"
import { CLIENT_ROLES, copyTextToClipboard, decodeUserIdName, decodeUserIdRndNum, generateUserId } from "./helper"
import { appIdInp, channelInp, joinForm, leaveBtn, localVideoItem, tokenInp, joinFormModal, joinBtn, fullNmInp, localVideoItemText, videosContainer, setUserId, getUserId, getLocalUserName } from "./elements"
import { endSession, isChannelLive, startSession } from './apis';
import { socket } from './socket';

/** client */
const client = AgoraRTC.createClient({ mode: "live", codec: "vp8" })

/** local tracks */
const localTracks = { videoTrack: null, audioTrack: null }

/** remote users */
let remoteHosts = {}

/** client role */
let clientRole = CLIENT_ROLES.audience

/** options passed on joining channel */
let options = { appid: null, channelName: null, token: null }

let currBigScreenPlayedVideoItemId = null
let currBigScreenPlayedVideoItemTrack = null

/** the main host of channel, the one who starts the meeting. */
let isSessionInitiator = false

/** is channel successfully joined */
let channelJoined = false

/***************************************************************************************************************************************************************/

joinForm.onsubmit = (e) => {
    e.preventDefault()
    onSubmit()
}

leaveBtn.onclick = () => {
    leaveBtn.disabled = true
    leave()
}

localVideoItem.onclick = onAppVideoItemClick

document.getElementById("copyShareLink").onclick = () => {
    copyTextToClipboard(`${location.origin}/index.html?token=${encodeURIComponent(JSON.stringify(options))}`)
    alert("Link Copied !")
}

socket.on("connect", () => {
    if (channelJoined)
        socket.emit("channelJoined", options.channelName, getUserId(), getLocalUserName())
})

/***************************************************************************************************************************************************************/

/** function to run on start of page load. */
async function onInit() {
    // the demo can auto join channel with params in url
    // originally this was the url form : `index.html?appid=${options.appid}&channel=${options.channelName}&token=${options.token}`
    const urlParams = new URL(location.href).searchParams;
    const token = urlParams.get("token")
    if (token) {
        options = JSON.parse(decodeURIComponent(token))

        /**
         * when you create project in console. You have the option to authenticate using appid  or appid + token.
         * In case you choose appid only then token can be null
         */
        if (options.appid && options.channelName) {
            appIdInp.value = options.appid
            tokenInp.value = options.token
            channelInp.value = options.channelName
            // onSubmit()
        }
    }
    else
      /** since there is no token then one can become host and share joining link afterward to audience */ {
        await client.setClientRole(CLIENT_ROLES.host)
        clientRole = CLIENT_ROLES.host
        isSessionInitiator = true
    }

    joinFormModal.show()
}
onInit()

function onSubmit() {
    joinBtn.disabled = true
    options.appid = appIdInp.value
    options.token = tokenInp.value ? tokenInp.value : null
    options.channelName = channelInp.value
    setUserId(generateUserId(fullNmInp.value));
    (async () => {
        try {
            await join()
            joinFormModal.hide()
            leaveBtn.disabled = false
        } catch (error) {
            console.error(error)
            if (typeof error === "string")
                alert(error)
            joinBtn.disabled = false
        }
    })();
}

/** leave channel */
async function leave() {

    // end the channel on backend
    if (isSessionInitiator && !await endSession(options.channelName)) {
        leaveBtn.disabled = false
        alert("Failed to end Live Session. Please try again")
        return
    }
    channelJoined = false

    for (let trackName in localTracks) {
        const track = localTracks[trackName]
        if (track) {
            track.stop()
            track.close()
            localTracks[trackName] = null
        }
    }

    // remove remote users and player views
    for (let hostId in remoteHosts)
        document.getElementById(`appVideoItem${hostId}`).remove()
    remoteHosts = {}
    checkIfVideoPlayedOnBigScreen(null, true)

    // leave the channel
    await client.leave()

    localVideoItem.style.display = "none"
    joinBtn.disabled = false
    joinFormModal.show()
}

/** join channel */
async function join() {

    // check if channel is live
    const data = await isChannelLive(options.channelName)
    if (!data)
        return
    else if (!data.status)
        throw "Channel is not live!"

    // add event listener to play remote tracks when remote user publishs.
    client.on("user-published", handleUserPublished)
    client.on("user-unpublished", handleUserUnpublished)

    // join the channel
    const proms = [client.join(...Object.values(options), getUserId())]
    if (clientRole === CLIENT_ROLES.host) {
        // create local tracks, using microphone and camera
        proms.push(AgoraRTC.createMicrophoneAudioTrack(), AgoraRTC.createCameraVideoTrack())
    }

    // join a channel and create local tracks, we can use Promise.all to run them concurrently
    [, localTracks.audioTrack, localTracks.videoTrack] = await Promise.all(proms)

    // play local video track
    if (localTracks.videoTrack && localTracks.audioTrack) {
        localTracks.videoTrack.play("appLocalVideo")
        localVideoItemText.textContent = getLocalUserName()
        localVideoItem.style.display = "block"

        // publish local tracks to channel
        await client.publish(Object.values(localTracks))
    }

    // make the channel live
    if (isSessionInitiator && !await startSession(options.channelName, getUserId(), getLocalUserName()))
        throw "Failed to start Live Session. Please try again"

    // join the channel on backend
    socket.emit("channelJoined", options.channelName, getUserId(), getLocalUserName())
    channelJoined = true
}

function handleUserPublished(user, mediaType) {
    const id = decodeUserIdRndNum(user.uid)
    remoteHosts[id] = user
    subscribe(user, mediaType)
}

function handleUserUnpublished(user, mediaType) {
    if (mediaType === 'video') {
        const id = decodeUserIdRndNum(user.uid)
        if (remoteHosts[id]) {
            delete remoteHosts[id]
            document.getElementById(`appVideoItem${id}`).remove()
            checkIfVideoPlayedOnBigScreen(`appVideo${id}`)
        }
    }
}

async function subscribe(user, mediaType) {
    const id = decodeUserIdRndNum(user.uid)
    // subscribe to a remote user
    await client.subscribe(user, mediaType)

    if (mediaType === 'video') {
        const div = document.createElement("div")
        div.className = "appVideoItem bg-dark border-end"
        div.id = `appVideoItem${id}`
        div.setAttribute("data", id)
        div.onclick = onAppVideoItemClick
        div.innerHTML = `
            <div id="appVideo${id}" class="w-100 h-100"></div>
            <div id="appVideoText" class="bottom-0 p-2 position-absolute text-truncate text-white w-100">${decodeUserIdName(user.uid)}</div>
        `
        videosContainer.appendChild(div)
        user.videoTrack.play(`appVideo${id}`)
    }
    else if (mediaType === 'audio') {
        user.audioTrack.play()
    }
}

/***************************************************************************************************************************************************************/

function checkIfVideoPlayedOnBigScreen(id, clear) {
    if (clear || currBigScreenPlayedVideoItemId === id)
        currBigScreenPlayedVideoItemId = currBigScreenPlayedVideoItemTrack = null
}

function onAppVideoItemClick(e) {
    if (currBigScreenPlayedVideoItemId) {
        document.getElementById(currBigScreenPlayedVideoItemId).parentElement.style.display = "block"
        currBigScreenPlayedVideoItemTrack.play(currBigScreenPlayedVideoItemId)
    }

    const appVideoItem = e.currentTarget
    const userIdRndNum = appVideoItem.getAttribute("data")

    currBigScreenPlayedVideoItemId = appVideoItem.firstElementChild.id

    if (remoteHosts[userIdRndNum])
        currBigScreenPlayedVideoItemTrack = remoteHosts[userIdRndNum].videoTrack
    else
        currBigScreenPlayedVideoItemTrack = localTracks.videoTrack

    appVideoItem.style.display = "none"
    currBigScreenPlayedVideoItemTrack.play("bigScreenVideo")
}