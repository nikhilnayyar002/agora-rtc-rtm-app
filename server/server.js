require('dotenv-flow').config()
const express = require('express')
const http = require('http')
const path = require('path')
const socket = require("socket.io")
const { v4: uuidv4 } = require('uuid');

/***************************************************************************************/
const port = process.env.SERVER_PORT || 3000
const app = express()
const server = http.createServer(app)
const io = socket(server)

/***************************************************************************************/

app.use(express.json())

/***************************************************************************************/
const roomNameToUniqueChannelMapObj = {}
const channels = {}
const endedChannels = {}


/***************************************************************************************/

const genResObj = (status, message, data) => ({ status, message, data })
const genSuccResObj = (data = null) => genResObj(true, "success", data)
const genErrResObj = (data = null) => genResObj(false, "error", data)

function getCurrTimeInSeconds() {
    return Math.round(new Date().getTime() / 1000)
}

/** update users list and emit to all members of the channel */
function updateUserList(channelName, data, addToList = true) {
    if (addToList)
        channels[channelName].usersList.push(data)
    else
        channels[channelName].usersList = channels[channelName].usersList.filter(u => u.userId !== data) // code not optimized

    io.to(channelName).emit("onlineUsers", channels[channelName].usersList)
}

/** update user total joining time */
function updateUserTimePeriod(channelName, userRecord) {
    userRecord.total_time += (channels[channelName].endedAt ? channels[channelName].endedAt : getCurrTimeInSeconds()) - userRecord.lastJoined
    userRecord.lastJoined = null
}

function onUserLeft(socket) {
    // get channelName joined by this socket
    const userData = socket.userData

    if (userData) {
        const channelName = userData.channelName

        /** if channel live */
        if (channels[channelName]) {
            const userId = userData.userId
            const userRecord = channels[channelName].usersRecord[userId]

            updateUserTimePeriod(channelName, userRecord)
            updateUserList(channelName, userId, false)
        }
        // delete socket.userData
    }
}

function isChannelLive(channelName) { return channels[channelName] && !channels[channelName].endedAt }

/************************************************** serve static assets and index.html */

app.use(express.static(path.join(__dirname, 'dist')))

app.get('/', (_req, res) => res.sendFile(__dirname + 'dist/index.html'))

/***************************************************************************************/

/**
 * returns @gSuccResObj or @ErrResObj
 */
app.get('/api/channel_status/:roomName', (req, res) => {
    const roomName = req.params["roomName"]
    const channelName = roomNameToUniqueChannelMapObj[roomName]

    isChannelLive(channelName) ? res.json(genSuccResObj(channelName)) : res.json(genErrResObj())
})

/**
 * returns @gSuccResObj
 */
app.post('/api/start_session', (req, res) => {
    const roomName = req.body["roomName"]
    const userId = req.body["userId"]
    const userName = req.body["userName"]

    let channelName = roomNameToUniqueChannelMapObj[roomName]

    if (!channelName) {
        channelName = uuidv4()
        channels[channelName] = {
            channelName,
            roomName,
            usersRecord: {},
            mainHost: { userId, userName, socketId: null },
            usersList: [],
            startedAt: getCurrTimeInSeconds(),
            endedAt: null
        }
        roomNameToUniqueChannelMapObj[roomName] = channelName
    }

    res.json(genSuccResObj(channelName))
})

/**
 * returns @gSuccResObj or @ErrResObj
 */
app.get('/api/end_session/:roomName', (req, res) => {
    try {
        const roomName = req.params["roomName"]
        const channelName = roomNameToUniqueChannelMapObj[roomName]
        if (channelName) {
            const channelData = channels[channelName]

            channelData.endedAt = getCurrTimeInSeconds()
            io.to(channelName).emit("channelInActive")

            for (let userId in channelData.usersRecord) {
                const userRecord = channelData.usersRecord[userId]
                if (userRecord.lastJoined)
                    updateUserTimePeriod(channelName, userRecord)
            }

            delete roomNameToUniqueChannelMapObj[roomName]
            delete channels[channelName].usersList
            delete channels[channelName]

            /** move channel data to ended channel list and clear it from current list */
            endedChannels[channelName] = channelData

            res.json(genSuccResObj(endedChannels[channelName]))
        }
        else
            res.json(genErrResObj())
    } catch (error) {
        console.log(error)
    }
})

/**
 * returns @gSuccResObj or @ErrResObj
 */
app.get('/api/channel_report/:channelName', (req, res) => {
    const channelName = req.params["channelName"]
    if (endedChannels[channelName])
        res.json(genSuccResObj(endedChannels[channelName]))
    else
        res.json(genErrResObj())
})

/***************************************************************************************/

// catch 404 and forward to error handler
app.use(() => { throw { message: "invalid location", status: "404" } })

// error handler, renders the error page
app.use((err, _req, res, _next) => res.status(err.status || 500).json({ error: err }))

server.listen(port, () => console.log(`App listening at http://localhost:${port}`))

/***************************************************************************************/

io.on('connection', (socket) => {
    console.log('A user connected: ', socket.id)

    socket.on('subscribe', (channelName, userId, userName) => {
        try {
            // if channel is not live dont do anything
            if (!isChannelLive(channelName)) return

            // join channel
            socket.join(channelName)

            // update user record
            const userRecord = channels[channelName].usersRecord[userId]
            if (userRecord)
                userRecord.lastJoined = getCurrTimeInSeconds()
            else
                channels[channelName].usersRecord[userId] = {
                    userId,
                    userName,
                    total_time: 0,
                    lastJoined: getCurrTimeInSeconds()
                }

            updateUserList(channelName, { userId, userName })

            // store user ref details
            socket.userData = { channelName, userId }

            // set the socket id of main host 
            if (channels[channelName].mainHost.userId === userId)
                channels[channelName].mainHost.socketId = socket.id

        } catch (err) {
            console.log("Error occurred in ws:subscribe event.", err)
        }
    })

    socket.on("handRaise", (channelName, userName, userId) => {
        if (isChannelLive(channelName)) {
            const mainHostSocketId = channels[channelName].mainHost.socketId
            socket.to(mainHostSocketId).emit("handRaiseReq", socket.id, userName, userId);
        }
    })
    socket.on("handRaiseAcc", socketId => socket.to(socketId).emit("handRaiseAllow"))
    socket.on("handRaiseRej", socketId => socket.to(socketId).emit("handRaiseNotAllow"))

    socket.on('unsubscribe', () => {
        try {
            onUserLeft(socket)
        } catch (err) {
            console.log("Error occurred in ws:unsubscribe event.", err)
        }
    })

    socket.on('disconnect', () => {
        try {
            onUserLeft(socket)
        } catch (err) {
            console.log("Error occurred in ws:disconnect event.", err)
        }
    })
})