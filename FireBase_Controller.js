//Firebase import
import { initializeApp } from 'firebase/app'
import { getFirestore, getDoc, getDocs, setDoc, doc, deleteDoc, collection, Timestamp} from 'firebase/firestore'
import { firebaseConfig } from './FB_Config.js'
import { fetchGameDetails, getBaseCollection} from './BGG_Controller.js'

const firebase_app = initializeApp(firebaseConfig)
const db = getFirestore(firebase_app)

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

// Firestore data converter
const gameConverter = {
    toFirestore: (game) => {
        return {
            id : String(game.id),
            versionID : String(game.versionID),
            title : String(game.title),
            x : parseFloat(game.x),
            y : parseFloat(game.y),
            z : parseFloat(game.z),
            mass : parseFloat(game.mass),
            img : String(game.img),
            thumbnail : String(game.thumbnail),
            minPlayers : parseInt(game.minPlayers),
            maxPlayers : parseInt(game.maxPlayers),
            minTime : parseInt(game.minTime),
            maxTime : parseInt(game.maxTime),
            officialTime : parseInt(game.officialTime),
            description : String(game.description),
            publishYear : parseInt(game.publishYear),
            minAge : parseInt(game.minAge),
            mechanics : game.mechanics,
            averageRating : parseFloat(game.averageRating),
            rank : parseFloat(game.rank),
            weight : parseFloat(game.weight),
            bestPlayers : parseInt(game.bestPlayers),
            languageDependence : String(game.languageDependence)
            };
    },
    fromFirestore: (snapshot, options) => {
        const data = snapshot.data(options);
        const game = new Game(data.id, data.versionID,data.x, data.y,data.z,data.mass,data.img,data.thumbnail)
        game.minPlayers = data.minPlayers,
        game.maxPlayers = data.maxPlayers,
        game.minTime = data.minTime,
        game.maxTime = data.maxTime,
        game.officialTime = data.officialTime,
        game.description = data.description,
        game.publishYear = data.publishYear,
        game.minAge = data.minAge,
        game.mechanics = data.mechanics,
        game.averageRating = data.averageRating,
        game.rank = data.rank,
        game.weight = data.weight,
        game.title = data.title,
        game.bestPlayers = data.bestPlayers,
        game.languageDependence = data.languageDependence

        return game
    }
};

/**
 * Gets all IDs from all games in the database
 * @returns array of IDs
 */
async function getIDsFromDB (username) {
    const dbGameCollection = collection(db, username)
    const gameDocs = await getDocs(dbGameCollection)
    let gamesIDs = gameDocs.docs.map( (gameDoc)=> {
        return String(gameDoc.id)
    })
    gamesIDs = [...new Set(gamesIDs)]
    return gamesIDs
}

/**
 * adds a game object to the database. If an entry with same id already exists, instead updates the entry.
 * @param {Game} gameObject a Game object
 */
async function addGameToDB (gameObject, username) {
    const id = gameObject.id
    const ref = doc(db, username, String(id)).withConverter(gameConverter)
    await setDoc(ref, gameObject, {merge: true});
}

/**
 * Deletes a game from database
 * @param {Int} objectID 
 */
async function deleteGameFromDB(objectID, username) {
    await deleteDoc(doc(db, username, String(objectID))) 
}

/**
 * Get an array of all games from the database
 * @returns an array containing game objects
 */
async function getGamesFromDB(username) {
    
    const userCollection = collection(db, username).withConverter(gameConverter)
    const gameDocs = await getDocs(userCollection)
 

    const games = gameDocs.docs.map( (gameDoc)=> {
        return gameDoc.data()
     })
    return games
}

/**
 * Gets a set of IDs based on the Games in the collection
 * @param {Array[Game]} collection 
 * @returns 
 */
function extractIDs(collection) {
    let collectionIDs = collection.map( (object) => object.id )
    return [...new Set(collectionIDs)]
}

/**
 * syncs the database with the collection of the given user on BGG. Will add any new games to DB, and 
 * remove games no longer present in collection. If fullSync is true, will also compare each game for 
 * changes and update fields where needed
 * @param {String} username name of the user that owns the collection
 * @param {Boolean} fullSync boolean argument, if true the functions also syncs every field on every game.
 * @returns an object with properties removedGames and addedGames, containing the number of games added and removed
 */
async function synchronizeCollection (username, fullSync) {
    
    let added = 0;
    let removed = 0;

    //Get IDs for games in collection
    let collection = await getBaseCollection(username, true)
    let collectionIDs = extractIDs(collection)

    //Get IDS from DB
    const DBIDs = await getIDsFromDB(username)
 
    console.log(`Comparing BGG collection with database and updating...`);

    if (Array.isArray(collectionIDs) && Array.isArray(DBIDs)) {
        //Sort lists of IDs
        collectionIDs.sort()
        DBIDs.sort()

        //run while both lists still have unhandled elements
        while (collectionIDs.length > 0 && DBIDs.length > 0) {
            //if both current elements are equal, do nothing, go on to next elements in both lists
            if (collectionIDs[0] === DBIDs[0]) {
                //if fullSync is true, merge the new game into db anyway
                if (fullSync) {
                        let currentGame = collection.find( (object) => object.id === collectionIDs[0] )
                        await fetchGameDetails(currentGame)
                        await addGameToDB(currentGame, username)
                        added++
                }
                collectionIDs.shift()
                DBIDs.shift()

            //If the collection id is lesser, game does not exists in DB and should be added
            } else if (collectionIDs[0] < DBIDs[0]) {
                    let currentGame = collection.find( (object) => object.id === collectionIDs[0] )
                    await fetchGameDetails(currentGame)
                    await addGameToDB(currentGame, username)
                    collectionIDs.shift()
                    added++

            //otherwise, the db id is lesser, and game does not exist in collection. It should be removed
            } else {
                await deleteGameFromDB(DBIDs[0], username)
                DBIDs.shift()
                removed++
            }
        }

        //if there is still elements in collectionIDs, add those to the db
        while (collectionIDs.length > 0) {
            let currentGame = collection.find( (object) => object.id === collectionIDs[0] )
            await fetchGameDetails(currentGame)
            await addGameToDB(currentGame, username)
            collectionIDs.shift()
            added++
        }

        //If there is still elements in DBIDs, remove those from DB
        while (DBIDs.length > 0) {
            await deleteGameFromDB(DBIDs[0], username)
            DBIDs.shift()
            removed++
        }
    } else {
        throw new Error('Either database list of IDs or collection list of IDs is not an array')
    }

    setLastSyncDate(new Date(), username)

    return {addedGames: added, removedGames: removed}
}

/**
 * Return Timestamp of the last sync
 * @returns  Timestamp
 */
async function getLastSyncDate(username) {
    const updateRef = doc(db, "metaData", username);
    const docSnap = await getDoc(updateRef);
    let update    
    if (docSnap.exists()) {
        update = await docSnap.data()
        return update.timestamp
    } else {
      throw new Error('cannot locate the update document in Firestore')
    }
}

/**
 * Sets the last sync date in the DB
 * @param {Date} Date a date
 */
async function setLastSyncDate (Date, username) {
    const timestamp = Timestamp.fromDate(Date) 
    await setDoc(doc(db, "metaData", username), {timestamp}, {merge: false});
}

export {synchronizeCollection, getLastSyncDate, setLastSyncDate, getGamesFromDB}