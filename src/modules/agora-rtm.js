import AgoraRTM from 'agora-rtm-sdk'
import { appChatMessages, getUserId, sendMessageBtn, messageInput } from './elements';
import { decodeUserIdName } from './helper';

const client = AgoraRTM.createInstance(process.env.APP_ID)
let channel = null

export async function setupRTM(channelName) {
    await client.login({ uid: getUserId() })
    channel = await client.createChannel(channelName)
    await channel.join()

    channel.on('ChannelMessage', insertMessage)
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