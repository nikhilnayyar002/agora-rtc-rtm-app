import AgoraRTC from "agora-rtc-sdk-ng"

import "bootstrap/dist/js/bootstrap.bundle.min.js"
import "jquery/dist/jquery.slim.min.js"
import 'bootstrap/dist/css/bootstrap.min.css'
import "./index.css"
import { CLIENT_ROLES, generateUserId, decodeUserIdRndNum, decodeUserIdName } from "./helper"

/** client */
const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" })

/** local tracks */
const localTracks = { videoTrack: null, audioTrack: null }

/** remote users */
let remoteUsers = {}

/** options passed on joining channel */
let options = { appid: null, channelName: null, token: null }
/** local user id */
let userId = null

// dom elements
const appIdInp = document.getElementById("appid")
const tokenInp = document.getElementById("token")
const channelInp = document.getElementById("channel")
const fullNmInp = document.getElementById("full-name")
const form = document.getElementById("join-form")
const joinBtn = document.getElementById("join")
const leaveBtn = document.getElementById("leave")
const localPlayerName = document.getElementById("local-player-name")
const remotePlayerlist = document.getElementById("remote-playerlist")

/** form submit */
form.addEventListener("submit", (e) => {
    e.preventDefault()
    onSubmit()
})

leaveBtn.addEventListener("click", () => {
    leaveBtn.disabled = true
    leave()
})

/** function to run on start of page load. */
function onInit() {
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

    joinBtn.disabled = false
}
onInit()

function onSubmit() {
    joinBtn.disabled = true
    options.appid = appIdInp.value
    options.token = tokenInp.value ? tokenInp.value : null
    options.channelName = channelInp.value;
    (async () => {
        try {
            await join()
            document.querySelector("#success-alert a").href = `index.html?token=${encodeURIComponent(JSON.stringify(options))}`
            document.getElementById("success-alert").style.display = "block"
        } catch (error) {
            console.error(error)
            joinBtn.disabled = false
        } finally {
            leaveBtn.disabled = false
        }
    })();
}

/** leave channel */
async function leave() {
    for (let trackName in localTracks) {
        const track = localTracks[trackName]
        if (track) {
            track.stop()
            track.close()
            localTracks[trackName] = null
        }
    }

    // remove remote users and player views
    remoteUsers = {};
    remotePlayerlist.innerHTML = ""

    // leave the channel
    await client.leave()

    localPlayerName.textContent = ""
    joinBtn.disabled = false
    document.getElementById("success-alert").style.display = "none"
    console.log("client leaves channel success")
}

/** join channel */
async function join() {
    // add event listener to play remote tracks when remote user publishs.
    client.on("user-published", handleUserPublished)
    client.on("user-unpublished", handleUserUnpublished);

    // join a channel and create local tracks, we can use Promise.all to run them concurrently
    [userId, localTracks.audioTrack, localTracks.videoTrack] = await Promise.all([
        // join the channel
        client.join(...Object.values(options), generateUserId(fullNmInp.value)),
        // create local tracks, using microphone and camera
        AgoraRTC.createMicrophoneAudioTrack(),
        AgoraRTC.createCameraVideoTrack()
    ]);

    // play local video track
    if (localTracks.videoTrack && localTracks.audioTrack) {
    localTracks.videoTrack.play("local-player")
        localPlayerName.textContent = `localVideo(${decodeUserIdName(userId)})`

    // publish local tracks to channel
    await client.publish(Object.values(localTracks))
    console.log("publish success")
}
}

function handleUserPublished(user, mediaType) {
    const id = decodeUserIdRndNum(user.uid)
    remoteUsers[id] = user
    subscribe(user, mediaType)
}

function handleUserUnpublished(user, mediaType) {
    if (mediaType === 'video') {
        const id = decodeUserIdRndNum(user.uid)
    delete remoteUsers[id]
    document.getElementById(`player-wrapper-${id}`).remove()
}
}

async function subscribe(user, mediaType) {
    const id = decodeUserIdRndNum(user.uid)
    // subscribe to a remote user
    await client.subscribe(user, mediaType)
    console.log("subscribe success")
    if (mediaType === 'video') {

        const str = `
            <div id="player-wrapper-${id}">
              <p class="player-name">remoteUser(${decodeUserIdName(user.uid)})</p>
              <div id="player-${id}" class="player"></div>
            </div>
        `
        const doc = new DOMParser().parseFromString(str, 'text/html')

        remotePlayerlist.appendChild(doc.body.firstChild)
        user.videoTrack.play(`player-${id}`)
    }
    else if (mediaType === 'audio') {
        user.audioTrack.play()
    }
}