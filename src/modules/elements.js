import { Modal } from "bootstrap"

// dom elements
export const appIdInp = document.getElementById("appid")
export const tokenInp = document.getElementById("token")
export const channelInp = document.getElementById("channel")
export const fullNmInp = document.getElementById("fullName")
export const joinForm = document.getElementById("joinForm")
export const joinBtn = document.getElementById("join")
export const leaveBtn = document.getElementById("leave")
export const localVideoItem = document.getElementById("appLocalVideoItem")
export const localVideoItemText = document.getElementById("appLocalVideoText")
export const videosContainer = document.getElementById("appVideoItems")

// bootstrap modal
export const joinFormModal = new Modal(document.getElementById('joinFormModal'), {
    keyboard: false,
    backdrop: "static"
})