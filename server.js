require('dotenv').config()
const express = require('express')
const http = require('http')
const path = require('path')
const socket = require("socket.io")

const port = process.env.PORT || 3000
const app = express()
const server = http.createServer(app)
const io = socket(server)


/***************** serve static assets and index.html */

app.use(express.static(path.join(__dirname, 'dist')))

app.get('/', (req, res) => res.sendFile(__dirname + 'dist/index.html'))

/******************** */


// catch 404 and forward to error handler
app.use(() => { throw { message: "invalid location", status: "404" } })

// error handler, renders the error page
app.use((err, req, res, next) => res.status(err.status || 500).json({ error: err }))

server.listen(port, () => console.log(`App listening at http://localhost:${port}`))

io.on('connection', (socket) => {
    console.log('a user connected')
});