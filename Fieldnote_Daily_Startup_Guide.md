# Fieldnote --- Daily Startup Guide (Windows)

Use this checklist whenever you want to run Fieldnote again. You do
**not** need to reinstall dependencies, recreate the admin account, or
reseed the catalog every day.

## 1. Open the project in VS Code

Open this folder:

``` text
C:\Users\Vivobook\Desktop\training
```

Open the integrated terminal with **Ctrl + \`**.

## 2. Start MongoDB

Open a separate PowerShell window and run:

``` powershell
mongod --dbpath C:\data\db --replSet rs0 --port 27017
```

Keep this window open while using Fieldnote.

If `mongod` is not recognized, run it using the full path:

``` powershell
& "C:\Program Files\MongoDB\Server\9.0\bin\mongod.exe" --dbpath C:\data\db --replSet rs0 --port 27017
```

## 3. Verify that MongoDB is PRIMARY

Open another PowerShell window:

``` powershell
mongosh --port 27017
```

At the `mongosh` prompt, run:

``` javascript
rs.status().myState
```

Expected result:

``` text
1
```

`1` means the replica-set node is PRIMARY.

Then leave the MongoDB shell:

``` javascript
exit
```

**Important:** Run `rs.initiate()` only once, when setting up the
replica set for the first time. Do not run it every day.

## 4. Start the frontend and backend

Return to the VS Code terminal. Make sure the current directory is the
project root:

``` text
C:\Users\Vivobook\Desktop\training
```

Run:

``` powershell
npm run dev
```

This starts both services:

-   React/Vite frontend
-   Express backend

Expected local addresses:

``` text
Frontend: http://localhost:5173
Backend:  http://localhost:5000
```

Vite may choose another port if 5173 is already occupied. If so, use the
exact URL printed in the terminal.

Keep this terminal open while using the application.

## 5. Open Fieldnote

Storefront: http://localhost:5173/

Admin login: http://localhost:5173/login

Admin dashboard: http://localhost:5173/admin

Sign in with the admin email and password configured in `server/.env`.
Do not share or commit that file.

## 6. Check backend health

Open a separate PowerShell window and run:

``` powershell
Invoke-RestMethod http://localhost:5000/api/health
```

Expected response should indicate:

``` text
status    : ok
service   : fieldnote-api
database  : connected
```

If the API uses a different port, substitute the port shown in the
backend terminal.

## Daily startup checklist

-   [ ] Open VS Code and the `training` project folder.
-   [ ] Start MongoDB with `mongod`.
-   [ ] Confirm `rs.status().myState` returns `1`.
-   [ ] Run `npm run dev` from the project root.
-   [ ] Open the Vite URL printed in the terminal.
-   [ ] Sign in if you need the admin dashboard.

## Commands you do not need to run every day

  -----------------------------------------------------------------------
  Command                             When to run it
  ----------------------------------- -----------------------------------
  `npm run install:all`               First installation, or after
                                      dependencies need to be installed
                                      again

  `npm run seed:admin`                Initial admin creation, or an
                                      intentional admin reset/update

  `npm run seed:catalog`              Initial catalog setup, or
                                      intentional catalog reseeding

  `rs.initiate()`                     First-time replica-set
                                      initialization only

  `npm run dev`                       Every development session
  -----------------------------------------------------------------------

## If something does not work

### `mongod` is not recognized

Use the full executable path shown in Step 2, or add the MongoDB `bin`
directory to Windows PATH.

### MongoDB is not PRIMARY

Make sure the `mongod` process was started with `--replSet rs0`. Then
connect with `mongosh --port 27017` and check:

``` javascript
rs.status()
```

Do not repeatedly run `rs.initiate()` on an already initialized replica
set.

### The backend cannot connect to MongoDB

Check that the MongoDB terminal is still running and that `server/.env`
contains the expected local connection string:

``` dotenv
MONGODB_URI=mongodb://127.0.0.1:27017/fieldnote?replicaSet=rs0
```

### Port 5173 is occupied

Use the alternative Vite URL printed in the terminal. The frontend may
start on 5174 or another available port. If the frontend origin changes,
make sure `CLIENT_URL` in `server/.env` matches that origin, then
restart the backend.

### The browser cannot reach the backend

Confirm the backend terminal says it is listening on port 5000 and
check:

``` powershell
Invoke-RestMethod http://localhost:5000/api/health
```

## Stopping Fieldnote

When finished:

1.  In the terminal running `npm run dev`, press **Ctrl + C**.
2.  In the terminal running `mongod`, press **Ctrl + C**.

The next time you want to use Fieldnote, repeat the daily startup
checklist.

------------------------------------------------------------------------

**Reminder:** Keep both the MongoDB terminal and the `npm run dev`
terminal open while using Fieldnote. Never share `server/.env` or
`client/.env`, and never commit secrets.
