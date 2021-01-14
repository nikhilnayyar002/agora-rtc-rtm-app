import 'bootstrap/dist/css/bootstrap.min.css'
import "./index.css"
import "./modules/agora-rtc"
// import "./modules/agora-rtm"
import "./modules/socket"
import { appParticipant } from './modules/elements'

/***************************************************************************************************************************************************************/

document.getElementById("appParticipantBtn").onclick = () => toggleAppSideView(0)
document.getElementById("appChatMessagesBtn").onclick = () => toggleAppSideView(1)

/***************************************************************************************************************************************************************/

/** toggle between app side views */
function toggleAppSideView(num) {
    appParticipant.style.display = !num ? "block" : "none"
    document.getElementById("appChatMessages").style.display = num ? "flex" : "none"
}