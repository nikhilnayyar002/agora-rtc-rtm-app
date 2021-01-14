import AgoraRTC from "agora-rtc-sdk-ng"
import { CLIENT_ROLES, copyTextToClipboard, decodeUserIdName, generateUserId } from "./helper"
import { appIdInp, roomNameInp, joinForm, leaveBtn, localVideoItem, tokenInp, joinFormModal, joinBtn, fullNmInp, localVideoItemText, videosContainer, setUserId, getUserId, getLocalUserName, appParticipant, bigScreenVideoCont } from "./elements"
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
let options = { appid: null, roomName: null, token: null }

/** successfully joined channelName*/
let channelName = null

/** the main host of channel, the one who starts the meeting. */
let isSessionInitiator = false

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
    if (channelName)
        socket.emit("subscribe", channelName, getUserId(), getLocalUserName())
})

socket.on("channelInActive", () => alert("channel is not live."))
socket.on("onlineUsers", data => {
    let str = ""
    data.forEach(userData => str += `<p class="bg-light border mb-2 p-2 text-truncate">${userData.userName}</p>`)
    appParticipant.innerHTML = str
})

/***************************************************************************************************************************************************************/

/** function to run on start of page load. */
async function onInit() {
    // the demo can auto join channel with params in url
    // originally this was the url form : `index.html?appid=${options.appid}&channel=${options.roomName}&token=${options.token}`
    const urlParams = new URL(location.href).searchParams;
    const token = urlParams.get("token")
    if (token) {
        options = JSON.parse(decodeURIComponent(token))

        /**
         * when you create project in console. You have the option to authenticate using appid  or appid + token.
         * In case you choose appid only then token can be null
         */
        if (options.appid && options.roomName) {
            appIdInp.value = options.appid
            tokenInp.value = options.token
            roomNameInp.value = options.roomName
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
    options.roomName = roomNameInp.value
    setUserId(generateUserId(fullNmInp.value));
    (async () => {
        try {
            await join()
            joinFormModal.hide()
            leaveBtn.disabled = false
        } catch (error) {
            console.error(error)
            joinBtn.disabled = false
        }
    })();
}

/** leave channel */
async function leave() {

    if (isSessionInitiator) {
        // end the channel on backend
        const res = await endSession(options.roomName)
        console.log(res && res.data) // log name of channel that ended
        if (isSessionInitiator && !res) {
            leaveBtn.disabled = false
            return // network error occurred. Dont do anything.
        }
    }
    channelName = null
    socket.emit("unsubscribe")

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

    // leave the channel
    await client.leave()

    localVideoItem.style.display = "none"
    joinBtn.disabled = false
    joinFormModal.show()
}

/** join channel */
async function join() {
    await client.setClientRole(CLIENT_ROLES.host)
    clientRole = CLIENT_ROLES.host

    let res = null
    if (!isSessionInitiator) {
        //audience must check if channel is live
        res = await isChannelLive(options.roomName)
        if (!res)
            return //"network error"
        else if (!res.status)
            throw "Channel is not live!"
    } else {
        // make the channel live
        res = await startSession(options.roomName, getUserId(), getLocalUserName())
        if (!res)
            throw "Failed to start Live Session. Please try again" //"network error"
    }
    channelName = res.data

    // add event listener to play remote tracks when remote user publishs.
    client.on("user-published", handleUserPublished)
    client.on("user-unpublished", handleUserUnpublished)

    // join the channel
    const proms = [client.join(options.appid, channelName, options.token, getUserId())]
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

    // join the channel on backend
    socket.emit("subscribe", channelName, getUserId(), getLocalUserName())
}

function handleUserPublished(user, mediaType) {
    const id = user.uid
    remoteHosts[id] = user
    subscribe(user, mediaType)
}

function handleUserUnpublished(user, mediaType) {
    if (mediaType === 'video') {
        const id = user.uid
        if (remoteHosts[id]) {
            delete remoteHosts[id]
            document.getElementById(`appVideoItem${id}`).remove()
        }
    }
}

async function subscribe(user, mediaType) {
    const id = user.uid
    // subscribe to a remote user
    await client.subscribe(user, mediaType)

    if (mediaType === 'video') {
        const div = document.createElement("div")
        div.className = "appVideoItem bg-dark border-end"
        div.id = `appVideoItem${id}`
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

function onAppVideoItemClick(e) {
    if(bigScreenVideoCont.firstElementChild) {
        videosContainer.appendChild(bigScreenVideoCont.firstElementChild)
    }
    bigScreenVideoCont.appendChild(e.currentTarget)
}