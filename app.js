//CONSTANTS  -------------------------------------------------------------------------------------------------------------
const host = 'localhost'
const port = 80
const username = 'LuciusWriter'

class Game {
    constructor(id, versionID, x, y, z, mass, img, thumbnail) {
        this.id = String(id)
        this.versionID = String(versionID)
        this.x = parseFloat(x)
        this.y = parseFloat(y)
        this.z = parseFloat(z)
        this.mass = parseFloat(mass)
        this.img = String(img)
        this.thumbnail = String(thumbnail)
    }
}

//IMPORTS  -------------------------------------------------------------------------------------------
//Firebase import
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, setDoc, getDoc, doc, deleteDoc, addDoc, Timestamp } from 'firebase/firestore'
import { firebaseConfig } from './FB_Config.js'
import { synchronizeCollection,  getLastSyncDate, setLastSyncDate, getGamesFromDB } from './FireBase_Controller.js';

const firebase_app = initializeApp(firebaseConfig)
const db = getFirestore(firebase_app)

//cors import
import cors from 'cors'

//express import
import express, { json } from 'express'
const app = express();

//Set view engine
app.set('view engine', 'pug')

//Middleware -------------------------------------------------------------------------------------------------------------
app.use(express.static('Assets'))
app.use(cors())
app.use(express.json())

//endpoints -------------------------------------------------------------------------------------------------------------
app.get('/', async (req, res) => {
   
    res.render('home', {  })
})

app.get('/collection/:name', async (req, res) => {
    const username = req.params.name

    let games = await getGamesFromDB(username)

     games = await JSON.stringify(games)
     res.send(games)
})

//Functions -------------------------------------------------------------------------------------------------------------
async function synchronizeWithDB (username, fullsync) {
    console.log('Synchronizing with BGG');
    const syncStats = await synchronizeCollection(username, fullsync)
    console.log(`Database synchronized. ${syncStats.addedGames} added or updated, ${syncStats.removedGames} removed.`);
}

async function checkForSync(fullsync) {
    const now = Timestamp.fromDate(new Date()).toMillis()
    let lastSync = await getLastSyncDate(username)
    lastSync = lastSync.toMillis()


    if ( (now - lastSync) / 1000 / 60 / 60  > 24) {
        await synchronizeWithDB(username, fullsync)
    } else {
        console.log(`Did not sync database.`);
        console.log(`Hours since last sync : ${(now - lastSync) / 1000 / 60 / 60}`);
    }
}

//MAIN  -------------------------------------------------------------------------------------------------------------

await checkForSync(true)
app.listen(port, console.log(`server running on ${port}`))