import { Modal } from "bootstrap"
import { decodeUserIdName } from "./helper"

// dom elements
export const appIdInp = document.getElementById("appid")
export const tokenInp = document.getElementById("token")
export const roomNameInp = document.getElementById("roomName")
export const fullNmInp = document.getElementById("fullName")
export const joinForm = document.getElementById("joinForm")
export const joinBtn = document.getElementById("join")
export const leaveBtn = document.getElementById("leave")
export const localVideoItem = document.getElementById("appLocalVideoItem")
export const localVideoItemText = document.getElementById("appLocalVideoText")
export const videosContainer = document.getElementById("appVideoItems")
export const appParticipant = document.getElementById("appParticipant")
export const appChatMessages = document.getElementById("appChatMessages")
export const bigScreenVideoCont = document.getElementById("bigScreenVideo")
export const becomeHostBtn = document.getElementById("becomeHost")
export const sendMessageBtn = document.getElementById("sendMessage")
export const messageInput = document.getElementById("messageInput")

export const rtmErrorBoxCont = document.getElementById("rtmErrorBoxCont")
export const rtmErrorReason = document.getElementById("rtmErrorReason")
export const rtmRetrySetup = document.getElementById("rtmRetrySetup")


// bootstrap modal
export const joinFormModal = new Modal(document.getElementById('joinFormModal'), {
    keyboard: false,
    backdrop: "static"
})

/** local user id */
let userId = null
export const setUserId = val => userId = val
export const getUserId = () => userId
export const getLocalUserName = () => decodeUserIdName(getUserId())
export const setClientRole = role => localStorage.setItem(`clientRole${getUserId()}`, role)
export const getClientRole = () => localStorage.getItem(`clientRole${getUserId()}`)