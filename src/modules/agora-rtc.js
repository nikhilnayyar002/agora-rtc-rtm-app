import AgoraRTC from "agora-rtc-sdk-ng"
import { CLIENT_ROLES, copyTextToClipboard, decodeUserIdName, generateUserId } from "./helper"
import {
    appIdInp, roomNameInp, joinForm, leaveBtn, localVideoItem, tokenInp, joinFormModal,
    joinBtn, fullNmInp, localVideoItemText, videosContainer, setUserId, getUserId, getLocalUserName, appParticipant,
    bigScreenVideoCont, raiseHandBtn, setClientRole, getClientRole
} from "./elements"
import { endSession, isChannelLive, startSession } from './apis';
import { socket } from './socket';
import MuteAudioIcon from '../assets/mute-audio.svg'
import MuteVideoIcon from '../assets/mute-video.svg'
import { setupRTM } from "./agora-rtm";

/** client */
const client = AgoraRTC.createClient({ mode: "live", codec: "vp8" })

/** local tracks */
const localTracks = { videoTrack: null, audioTrack: null }

/** remote users */
let remoteHosts = {}

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

document.getElementById("muteLocalMic").onclick = onLocalAppVideoItemBtnClick.bind(null, "audioTrack", "audio")
document.getElementById("muteLocalVideo").onclick = onLocalAppVideoItemBtnClick.bind(null, "videoTrack", "video")

raiseHandBtn.onclick = () => {
    if (getClientRole() === CLIENT_ROLES.host)
        publishLocalTracks()
    else if (channelName)
        socket.emit("handRaise", channelName, getLocalUserName(), getUserId())
}

socket.on("connect", () => {
    if (channelName)
        socket.emit("subscribe", channelName, getUserId(), getLocalUserName())
})

socket.on("channelInActive", () => alert("channel is not live."))
socket.on("onlineUsers", data => {
    let str = ""
    data.forEach(userData => str += `
        <div id="onlineUser${userData.userId}" class="bg-light border mb-2 p-2">
            <p class="mb-0 text-truncate">${userData.userName}</p>
        </div>
    `)
    appParticipant.innerHTML = str
})

socket.on("handRaiseReq", (socketId, userName, userId) => {
    console.log(`${userName} is requesting to become co-host.`)

    let onlineUser = document.getElementById(`onlineUser${userId}`)

    if (onlineUser) {
        onlineUser.insertAdjacentHTML("beforeend", `
            <div class="mt-2">
                <button data="accept" type="button" class="btn btn-sm btn-primary px-3 me-2">Yes</button>
                <button data="reject" type="button" class="btn btn-sm btn-primary px-3">No</button>
            </div>
        `)
        onlineUser.lastElementChild.onclick = e => {
            const data = e.target.getAttribute("data")
            if (data) {
                if (data === "accept")
                    socket.emit("handRaiseAcc", socketId)
                else
                    socket.emit("handRaiseRej", socketId)
                e.currentTarget.remove()
            }
        }
    }
})

socket.on("handRaiseNotAllow", () => alert("Hand raise request rejected"))
socket.on("handRaiseAllow", () => {
    setClientRole(CLIENT_ROLES.host)
    publishLocalTracks()
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

        // display raise hand button
        raiseHandBtn.style.display = "inline-block"
    }
    else
        /** since there is no token then one can become host and share joining link afterward to audience */
        isSessionInitiator = true

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
            setupRTM(channelName)
            joinFormModal.hide()
            leaveBtn.disabled = false
        } catch (error) {
            console.error(error)
            if (typeof error === "string") alert(error)
            joinBtn.disabled = false
        }
    })();
}

/** leave channel */
async function leave() {

    if (isSessionInitiator) {
        // end the channel on backend
        const res = await endSession(options.roomName)
        console.log(res && res.data) // log ended channel data
        if (!res) {
            leaveBtn.disabled = false
            return // network error occurred. Dont do anything.
        } else if (!res.status) {
            leaveBtn.disabled = false
            alert("Channel is not live!")
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
    let res = null
    if (!isSessionInitiator) {
        //audience must check if channel is live
        res = await isChannelLive(options.roomName)
        if (!res)
            throw null //"network error"
        else if (!res.status)
            throw "Channel is not live!"
        setClientRole(CLIENT_ROLES.audience)
    } else {
        // make the channel live
        res = await startSession(options.roomName, getUserId(), getLocalUserName())
        if (!res)
            throw null //"network error"
        setClientRole(CLIENT_ROLES.host)
    }
    channelName = res.data

    // add event listener to play remote tracks when remote user publishs.
    client.on("user-published", subscribe)
    client.on("user-left", handleUserLeft)
    client.on("user-joined", handleUserJoined)

    // join the channel
    await client.join(options.appid, channelName, options.token, getUserId())

    if (getClientRole() === CLIENT_ROLES.host)
        await publishLocalTracks()

    // join the channel on backend
    socket.emit("subscribe", channelName, getUserId(), getLocalUserName())
}

async function publishLocalTracks() {
    await client.setClientRole(CLIENT_ROLES.host);

    // create local tracks, using microphone and camera
    [localTracks.audioTrack, localTracks.videoTrack] = await Promise.all([AgoraRTC.createMicrophoneAudioTrack(), AgoraRTC.createCameraVideoTrack()])

    // play local video track
    localTracks.videoTrack.play("appLocalVideo")
    localVideoItemText.textContent = getLocalUserName()
    localVideoItem.style.display = "block"

    // publish local tracks to channel
    await client.publish(Object.values(localTracks))

    raiseHandBtn.disabled = true
}

function handleUserLeft(user) {
    const id = user.uid
    if (remoteHosts[id]) {
        delete remoteHosts[id]

        const divId = `appVideoItem${id}`
        document.getElementById(divId).remove()
    }
}

function handleUserJoined(user) {
    const id = user.uid
    remoteHosts[id] = user

    const divId = `appVideoItem${id}`
    const vidId = `appVideo${id}`
    if (!document.getElementById(divId)) {
        const div = document.createElement("div")
        div.className = "appVideoItem bg-dark border-end"
        div.id = divId
        div.onclick = onAppVideoItemClick

        const btn1 = document.createElement("button")
        const btn2 = document.createElement("button")
        btn1.className = btn2.className = "bg-dark border p-2 rounded-circle"
        btn1.innerHTML = `<img class="w-100 h-100" src=${MuteAudioIcon} alt="">`
        btn2.innerHTML = `<img class="w-100 h-100" src=${MuteVideoIcon} alt="">`
        btn1.onclick = onAppVideoItemBtnClick.bind(null, "audioTrack", "audio", user, vidId)
        btn2.onclick = onAppVideoItemBtnClick.bind(null, "videoTrack", "video", user, vidId)

        div.innerHTML = `
            <div id="${vidId}" class="w-100 h-100"></div>
            <div class="d-flex bottom-0 p-2 position-absolute w-100 align-items-center">
                <div class="appVideoText text-truncate text-white pe-3">${decodeUserIdName(user.uid)}</div>
                <div class="d-flex appVideoBtns">
                <div class="p-1"></div>
                </div>
            </div>
        `
        const appVideoBtns = div.getElementsByClassName("appVideoBtns")[0]
        appVideoBtns.prepend(btn1)
        appVideoBtns.append(btn2)
        videosContainer.appendChild(div)
    }
}

async function subscribe(user, mediaType) {
    const id = user.uid

    // subscribe to a remote user
    await client.subscribe(user, mediaType)

    if (mediaType === 'video') {
        const divId = `appVideoItem${id}`
        const vidId = `appVideo${id}`
        if (!document.getElementById(divId))
            handleUserJoined(user)
        user.videoTrack.play(vidId)
    }
    else if (mediaType === 'audio') {
        user.audioTrack.play()
    }
}

/***************************************************************************************************************************************************************/

function onAppVideoItemClick(e) {
    if (bigScreenVideoCont.firstElementChild) {
        videosContainer.appendChild(bigScreenVideoCont.firstElementChild)
    }
    bigScreenVideoCont.appendChild(e.currentTarget)
}

function changeAppVideoBtnBg(elem) {
    if (elem.classList.contains("bg-dark")) {
        elem.classList.remove("bg-dark")
        elem.classList.add("bg-danger")
    } else {
        elem.classList.remove("bg-danger")
        elem.classList.add("bg-dark")
    }
}
async function muteLocalTrack(elem, trackName, type) {
    try {
        if (localTracks[trackName]) {
            await client.unpublish(localTracks[trackName])
            localTracks[trackName] = null
            if (type === "video")
                document.getElementById("appLocalVideo").innerHTML = ""
        }
        else {
            if (type === "audio")
                localTracks[trackName] = await AgoraRTC.createMicrophoneAudioTrack()
            else {
                localTracks[trackName] = await AgoraRTC.createCameraVideoTrack()
                localTracks[trackName].play("appLocalVideo")
            }
            await client.publish(localTracks[trackName])
        }
        changeAppVideoBtnBg(elem)
    } catch (err) {
        console.log(err)
    } finally {
        elem.disabled = false
    }
}
async function muteTrack(elem, trackName, type, user, vidId) {
    try {
        if (user[trackName]) {
            await client.unsubscribe(user, type)
            if (type === "video")
                document.getElementById(vidId).innerHTML = ""
        }
        else {
            await client.subscribe(user, type)
            if (type === "video")
                user[trackName].play(vidId)
            else
                user[trackName].play()
        }
        changeAppVideoBtnBg(elem)
    } catch (err) {
        console.log(err)
    } finally {
        elem.disabled = false
    }
}
function onLocalAppVideoItemBtnClick(trackName, type, event) {
    event.stopPropagation()
    const elem = event.currentTarget
    elem.disabled = true
    muteLocalTrack(elem, trackName, type)
}
function onAppVideoItemBtnClick(trackName, type, user, vidId, event) {
    event.stopPropagation()
    const elem = event.currentTarget
    elem.disabled = true
    muteTrack(elem, trackName, type, user, vidId)
}