# Agora Live + RTM (Custom)

## Environment Variables (defined in ```.env``` file)

* ```SERVER_PORT```
* ```CLIENT_PORT```

## Information

Both the server and client will run on localhost.

The server will be available at port ```SERVER_PORT```.

The client will be available at port ```CLIENT_PORT``` only in case of client **Hot Reload** mentioned below.

In case for client (**Hot Reload + build**) / **Build** the client build will be served at port ```SERVER_PORT```.

## Instructions

* **Installation**
    ```
    npm ci
    ```

### Server

```server.js``` is the server file.

* **Hot Reload**
    ```
    npm run server
    ```

### Client

```src/*.*``` files comes under client. Build files are generated in ```dist``` folder.

* **Hot Reload**
    ```
    npm run start
    ```

* **Hot Reload + build**: 
    ```
    npm run watch
    ```
    
* **Build**
    ```
    npm run build
    ```
