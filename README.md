# Agora Live + RTM (Custom)

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
* **Enable Eslint in vscode**

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
