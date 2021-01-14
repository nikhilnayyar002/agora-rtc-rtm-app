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
export const bigScreenVideoCont = document.getElementById("bigScreenVideo")

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