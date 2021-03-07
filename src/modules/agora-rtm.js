import AgoraRTM from 'agora-rtm-sdk'
import { appChatMessages, getUserId, sendMessageBtn, messageInput, rtmErrorBoxCont, rtmErrorReason, rtmRetrySetup } from './elements';
import { decodeUserIdName } from './helper';

const client = AgoraRTM.createInstance(process.env.APP_ID)
let channel = null

client.on('ConnectionStateChanged', (newState, reason) => {
    console.log("RTM Connection: State- ", newState, ", Reason- ", reason)
})

rtmRetrySetup.onclick = () => {
    rtmErrorReason.textContent = "Please wait .."
    rtmRetrySetup.disabled = true
    setupRTM()
}

export async function setupRTM(channelName) {
    try {
        await client.login({ uid: getUserId() }).catch(err => {
            if (err.code === 8) return
            throw err
        })
        channel = await client.createChannel(channelName)
        await channel.join().catch(err => {
            if (err.code === 6) return
            throw err
        })
        channel.on('ChannelMessage', insertMessage)

        rtmErrorBoxCont.style.display = "none"

    } catch (error) {
        const mess = "Failed to load the RTM system."

        rtmErrorReason.textContent = mess
        rtmRetrySetup.disabled = false

        console.error(mess)
        console.error(error)
    }
}

sendMessageBtn.onclick = () => {
    sendMessageBtn.disabled = true
    const message = messageInput.value.trim()
    if (message) {
        const messageObj = { text: message }
        channel.sendMessage(messageObj)
            .then(() => insertMessage(messageObj, getUserId()))
            .catch(console.log)
            .finally(() => {
                messageInput.value = ""
                sendMessageBtn.disabled = false
            })
    }

}

function insertMessage({ text }, senderId) {
    const userName = decodeUserIdName(senderId)
    appChatMessages.insertAdjacentHTML(
        "beforeend",
        `
        <div class="bg-light border mb-2 p-2">
            <p class="mb-2 text-truncate">${userName}</p>
            <p class="mb-0 small">${text}</p>
        </div>
    `)
}