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

/** { [socketId] : string } */
const socketIdToUserDataMapObj = {}

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

function onUserLeft(socketId) {
    // get channelName joined by this socket
    const userData = socketIdToUserDataMapObj[socketId]

    if (userData) {
        const channelName = userData.channelName

        /** if channel live */
        if (channels[channelName]) {
            const userId = userData.userId
            const userRecord = channels[channelName].usersRecord[userId]

            updateUserTimePeriod(channelName, userRecord)
            updateUserList(channelName, userId, false)
        }

        // delete the channelName joined by this socket
        delete socketIdToUserDataMapObj[socketId]
    }
}

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

    if (channelName && !channels[channelName].endedAt)
        //channel is live
        res.json(genSuccResObj(channelName))
    else
        //channel is not live
        res.json(genErrResObj())
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
            mainHost: { userId, userName },
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

            for (let userId in channelData.usersRecord)
                updateUserTimePeriod(channelName, channelData.usersRecord[userId])

            delete roomNameToUniqueChannelMapObj[roomName]
            delete channels[channelName].usersList
            delete channels[channelName]

            /** move channel data to ended channel list and clear it from current list */
            endedChannels[channelName] = channelData

            res.json(genSuccResObj(channelName))
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
            if (!channels[channelName] || channels[channelName].endedAt) return

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

            // map this socket id to channelName
            socketIdToUserDataMapObj[socket.id] = { channelName, userId }
        } catch (err) {
            console.log("Error occurred in ws:subscribe event.", err)
        }
    })

    socket.on('unsubscribe', () => {
        try {
            onUserLeft(socket.id)
        } catch (err) {
            console.log("Error occurred in ws:unsubscribe event.", err)
        }
    })

    socket.on('disconnect', () => {
        try {
            onUserLeft(socket.id)
        } catch (err) {
            console.log("Error occurred in ws:disconnect event.", err)
        }
    })
})