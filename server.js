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
const channels = {
    "sampleChannel": {
        usersRecord: {
            "123234:Nikhil Nayyar": {
                total_time: 0,
                lastJoined: (new Date().getTime() / 1000)
            }
        },
        mainHost: { userId: "", userName: "" },
        usersList: [],
        startedAt: new Date().getTime()
    }
}

/************************************************** serve static assets and index.html */

app.use(express.static(path.join(__dirname, 'dist')))

app.get('/', (_req, res) => res.sendFile(__dirname + 'dist/index.html'))

/***************************************************************************************/

const genResObj = (status, message, data) => ({ status, message, data })
const genSuccResObj = (data = null) => genResObj(true, "success", data)
// const genErrResObj =  (data = null) => genResObj(false, "error", data)

app.post('/api/start_session', (req, res) => {
    const channelName = req.body["channelName"]
    const userId = req.body["userId"]
    const userName = req.body["userName"]

    if (!channels[channelName])
        channels[channelName] = {
            usersRecord: {},
            mainHost: { userId, userName },
            usersList: [],
            startedAt: new Date().getTime()
        }

    res.json(genSuccResObj())
})

app.get('/api/end_session/:channelName', (req, res) => {
    console.log(req.params["channelName"])
    res.json(genSuccResObj())
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

    socket.on('channelJoined', (channelName, userId) => {
        const userRecord = channels[channelName].usersRecord[userId]
        if (userRecord)
            userRecord.lastJoined = new Date().getTime()
        else
            channels[channelName].usersRecord[userId] = {
                total_time: 0,
                lastJoined: new Date().getTime()
            }
    })

    socket.on('disconnect', function (data) {
        // console.log(data);
        io.sockets.emit('chat', data);
    });
})