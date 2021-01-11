/* eslint-env node */

require('dotenv-flow').config()
const express = require('express')
const http = require('http')
const path = require('path')
const socket = require("socket.io")

const port = process.env.SERVER_PORT || 3000
const app = express()
const server = http.createServer(app)
const io = socket(server)

/***************************************************************************************/

app.use(express.json())

/***************************************************************************************/
const channels = {}

/** { [socketId] : string } */
const socketIdToUserDataMap = {}

/***************************************************************************************/

const genResObj = (status, message, data) => ({ status, message, data })
const genSuccResObj = (data = null) => genResObj(true, "success", data)
const genErrResObj = (data = null) => genResObj(false, "error", data)

function getCurrTimeInSeconds() {
    return Math.round(new Date().getTime() / 1000)
}

function onUserLeft(channelName, userRecord, socketId) {
    // update users list and emit to all members of the channel
    channels[channelName].usersList = channels[channelName].usersList.filter(data => data.userId !== userRecord.userId) // code not optimized
    io.to(channelName).emit("onlineUsers", channels[channelName].usersList)

    // delete the channelName joined by this socket
    delete socketIdToUserDataMap[socketId]
}

/************************************************** serve static assets and index.html */

app.use(express.static(path.join(__dirname, 'dist')))

app.get('/', (_req, res) => res.sendFile(__dirname + 'dist/index.html'))

/***************************************************************************************/

/**
 * returns @gSuccResObj or @ErrResObj
 */
app.get('/api/channel_status/:channelName', (req, res) => {
    const channelName = req.params["channelName"]
    if (channels[channelName] && !channels[channelName].endedAt)
        //channel is live
        res.json(genSuccResObj())
    else
        //channel is not live
        res.json(genErrResObj())
})

/**
 * returns @gSuccResObj or @ErrResObj
 */
app.get('/api/channel_exists/:channelName', (req, res) => {
    const channelName = req.params["channelName"]
    if (channels[channelName])
        res.json(genSuccResObj())
    else
        res.json(genErrResObj())
})

/**
 * returns @gSuccResObj
 */
app.post('/api/start_session', (req, res) => {
    const channelName = req.body["channelName"]
    const userId = req.body["userId"]
    const userName = req.body["userName"]

    if (!channels[channelName])
        channels[channelName] = {
            usersRecord: {},
            mainHost: { userId, userName },
            usersList: [],
            startedAt: getCurrTimeInSeconds(),
            endedAt: null
        }

    res.json(genSuccResObj())
})

/**
 * returns @gSuccResObj or @ErrResObj
 */
app.get('/api/end_session/:channelName', (req, res) => {
    const channelName = req.params["channelName"]
    if (channelName && channels[channelName]) {
        if (!channels[channelName].endedAt) {
            channels[channelName].endedAt = getCurrTimeInSeconds()
            io.to(channelName).emit("channelInActive")
        }
        res.json(genSuccResObj())
    }
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

    socket.on('channelJoined', (channelName, userId, userName) => {
        try {
            // if channel is not live dont do anything
            if (channels[channelName].endedAt) return

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
                    lastJoined: new Date().getTime()
                }

            // update users list and emit to all members of the channel
            channels[channelName].usersList.push({ userId, userName })
            io.to(channelName).emit("onlineUsers", channels[channelName].usersList)

            // map this socket id to channelName
            socketIdToUserDataMap[socket.id] = { channelName, userId }
        } catch (err) {
            console.log("Error occurred in ws:channelJoined event.", err)
        }
    })

    socket.on('channelLeft', () => {
        try {
            // get channelName joined by this socket
            const userData = socketIdToUserDataMap[socket.id]

            if (userData) {
                const channelName = userData.channelName
                const userId = userData.userId
                const userRecord = channels[channelName].usersRecord[userId]

                onUserLeft(channelName, userRecord, socket.id)
            }
        } catch (err) {
            console.log("Error occurred in ws:channelLeft event.", err)
        }
    })

    socket.on('disconnect', () => {
        try {
            // get channelName joined by this socket
            const userData = socketIdToUserDataMap[socket.id]

            if (userData) {
                const channelName = userData.channelName
                const userId = userData.userId

                // update user total joining time
                const userRecord = channels[channelName].usersRecord[userId]
                userRecord.total_time += (channels[channelName].endedAt ? channels[channelName].endedAt : getCurrTimeInSeconds()) - userRecord.lastJoined
                userRecord.lastJoined = null

                onUserLeft(channelName, userRecord, socket.id)
            }
        } catch (err) {
            console.log("Error occurred in ws:disconnect event.", err)
        }
    })
})