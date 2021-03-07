# Agora Live + RTM (Custom)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Environment Variables (defined in ```.env``` file)

* ```SERVER_PORT```
* ```CLIENT_PORT```

## Information

Both the server and client will run on localhost.

The server will be available at port ```SERVER_PORT```.

The client will be available at port ```CLIENT_PORT``` only in case of client **Hot Reload + Serve** mentioned below.

In case for client (**Hot Reload + Build**) / **Build** the client build will be served at port ```SERVER_PORT```. Note that the client served can be outdated, any new changes done in client build can only be seen by refreshing the browser tab. If you want to see live changes for the client served then go for client **Hot Reload + Serve**.

## Instructions

* **Installation**
    ```
    npm ci
    ```
* **create** ```.env.local``` file and add the following variables:
    ```
    APP_ID=XXXXXXXXXX
    ```    
* **Enable Eslint in vscode for visual errors & warnings (optional)**

    VS Marketplace Link: https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint

### Server

```server.js``` is the server file.

* **Hot Reload + Serve**
    ```
    npm run server
    ```

### Client

```src/*.*``` files comes under client. Build files are generated in ```dist``` folder.

* **Hot Reload + Serve**
    ```
    npm run start
    ```

* **Hot Reload + Build**: 
    ```
    npm run watch
    ```
    
* **Build**
    ```
    npm run build
    ```

## Stats


* **Generate stats:** a file named ``compilation-stats.json`` will be generated in root folder.

    ```
    npm run stats
    ```
* **Upload the stats:** [webpack-chart](https://alexkuz.github.io/webpack-chart/)


## Application

### Be a host and start meeting

* Fill up the form.
* Click on share button below and share the url copied to clipboard to your friends.
* Note that in order for them to join your meeting they must use the URL you sent to them.
* Once they joined they can see you as a host and they will be audience.
* In order to become a co-host (similar to host) an audience user can click Become Host button. Once the host accept the request, that user will become co-host.

### Get the report of time period for each audience user

```
GET /api/channel_report/:channelName
```
