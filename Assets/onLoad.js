const shelfContainer = document.querySelector('.shelfContainer')
const leftoverContainer = document.querySelector('.leftoverContainer')
const maxColumnsField = document.getElementById('shelfX')
const maxRowsField = document.getElementById('shelfY')
const shelfHeightField = document.getElementById('shelfHeight')
const shelfWidthField = document.getElementById('shelfWidth')
const shelfDepthField = document.getElementById('shelfDepth')
const usernameField = document.getElementById('user')
const fillShelvesButton = document.getElementById('fillShelvesButton')

fillShelvesButton.addEventListener('pointerdown', ()=> {
    onFillShelvesAction()
})

const SHRINKFACTOR = 4
const SORTCRITERIA_A ='weight'
const SORTCRITERIA_B ='officialTime'
const SCREENUNIT = 'rem'
const LASTUSER = ''
let GAMES = []

class Shelf {
    constructor() {
        this.remHeight = parseFloat(shelfHeightField.value)
        this.rows = []
        this.depth = parseFloat(shelfDepthField.value)
    }

    /**
     * Places a game in a row on the shelf. May construct a new row, if there is no space for the game in any row, 
     * and if there is still space for a row with the game on the shelf
     * @param {Game} game 
     * @returns true if game was placed correctly, false otherwise
     */
    place (game) {
        //check if game fits on shelf at all
        const sizes = [parseFloat(game.x), parseFloat(game.z), parseFloat(game.y)]
        sizes.sort( (a, b) => a - b)
        const gameHeight = sizes[0]
        const gameWidth = sizes[1]
        const gameDepth = sizes[2]

        if (gameWidth > shelfWidthField.value || gameDepth > shelfDepthField.value) {
            return false
        }

        //check if any rows exists on the shelf
        if (this.rows.length === 0) {
            if (gameHeight < this.remHeight) {
                const currentRow = new ShelfRow()
                if (currentRow.place(game)) {
                    this.remHeight -= currentRow.height
                    this.rows.push(currentRow)
                    return true
                } else {
                    return false
                }
            } else {
                return false
            }       
            
        //row exists already   
        } else {        
            //if there is space in any row, place and return true
            for ( let row of this.rows) {
                if (row.place(game)) {
                    return true
                }
            }

            // else A new row must be constructed, if there is space
            //check for space in height
            if (gameHeight <= this.remHeight) {
                const currentRow = new ShelfRow()
                //place game on in new row
                if (currentRow.place(game)) {
                    this.remHeight -= currentRow.height
                    this.rows.push(currentRow)
                    return true
                } else {
                    return false
                }
            } else {
                return false
            }
            
        }        
        
    }

    sortRows() {
        this.rows.sort( (a, b) => { return b.remWidth - a.remWidth})
    }

    getGames() {
        const array = []
        for (let row of this.rows) {
            for (let game of row.content) {
                array.push(game)
            }
        }
        return array
    }


}

class ShelfRow {
    constructor() {
        this.height = parseFloat(0),
        this.remWidth = parseFloat(shelfWidthField.value),
        this.content = []
    }

    /**
     * Places the game in this row if its height is less than the rows height, and there is remaining width to the row
     * @param {Game} game 
     * @returns true if game was placed, false otherwise
     */
    place(game) {
        

        //check for shortest side of game
        const sizes = [parseFloat(game.x), parseFloat(game.z), parseFloat(game.y)]
        sizes.sort( (a, b) => a - b)
        const gameHeight = sizes[0]
        const gameWidth = sizes[1]

        //check if game fits within width
        if (gameWidth > this.remWidth) {
            return false
        } else {
            if (this.height === 0) {
                //no game has been placed yet in this row
                this.content.push(game)
                this.height = parseFloat(gameHeight)
                this.remWidth -= parseFloat(gameWidth)
                return true

        } else {
                //a game is already placed on shelf, check if it fits in height
                if (gameHeight <= this.height) {
                    this.content.push(game)
                    this.height = parseFloat(gameHeight)
                    this.remWidth -= parseFloat(gameWidth)
                    return true
                } else {
                    return false
                }  
            }
        }

        
    }
}

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

async function onFillShelvesAction() {
    //clear all elements in shelfContainer and leftoverContainer
    while (shelfContainer.firstChild) {
        shelfContainer.removeChild(shelfContainer.lastChild)
    }
    while (leftoverContainer.firstChild) {
        leftoverContainer.removeChild(leftoverContainer.lastChild)
    }
    leftoverContainer.style.width = `${maxColumnsField.value*shelfWidthField.value / SHRINKFACTOR}${SCREENUNIT}`
    
    //fetch updated list of games
    if (!GAMES.length > 0 || LASTUSER !== usernameField.value) {
        GAMES = await fetchCollection(usernameField.value)
        LASTUSER === usernameField.value
    } 


    //fill out shelf array, sorted by second criteria
    const filledShelves = distributeGamesToShelves(GAMES, SORTCRITERIA_A, SORTCRITERIA_B)
    
    //display the shelf array
    displayShelves(filledShelves)
}

function distributeGamesToShelves(games, sortByA, sortByB) {
    function sortBy(list, criteria, reverse) {
        if (!Array.isArray(list)) {
            throw new Error('cannot sort list, was not passed an array')
        } else {
            if (!reverse){
                if (typeof list[0][criteria] === "number") {
                    return list.sort( (a, b) => {return a[criteria] - b[criteria]})
                } else {
                    return list.sort( (a, b) => {return  String(a[criteria]) - String(b[criteria])})
                }
            } else {
                if (typeof list[0][criteria] === "number") {
                    return list.sort( (a, b) => {return b[criteria] - a[criteria]})
                } else {
                    return list.sort( (a, b) => {return  String(b[criteria]) - String(a[criteria])})
                }
            }

        }
    }

    //creates an array of shelves
    const shelves = []
    for (let col = 0; col<maxColumnsField.value; col++) {
        const column = []
        for (let row = 0; row < maxRowsField.value; row++){
            column.push(new Shelf())
        }
        shelves.push(column)
    }


    
    if (!Array.isArray(games)) {
        throw new Error('cannot distribute games, was not passed an array of games')
    } else if (typeof sortByA !== 'string' || typeof sortByB !== 'string') {
        throw new Error('critera not a string')
    } else {

            //sort by criteria A
            const sortedGames = sortBy(games, sortByA, true)

            //divide into rows
            const rowArray = divideIntoRows(maxRowsField.value, sortedGames)
            
            //for each row
            for (let rowI in rowArray) {
                const rowIndex = parseInt(rowI)
                //sort the current row
                const currentRow = sortBy(rowArray[rowIndex], sortByB, false)

                //for each game in list, starting with the lowest
                for (let gameIndex = currentRow.length-1; gameIndex >= 0; gameIndex--) {

                    //variable to hold current shelf columns index in row
                    let shelfColumnIndex = parseInt(0)

                    //starting from the left, keep placing in row until there is no more space in row
                    let placed = false
                    while (!placed) {
                        //place in current column and row
                        placed = shelves[shelfColumnIndex][rowIndex].place(currentRow[gameIndex])
                        if (!placed){
                                shelfColumnIndex++
                            if (!shelves[shelfColumnIndex]) {
                                //place on row down
                                if ( rowArray[rowIndex+1]) {
                                    
                                    rowArray[rowIndex+1].push(currentRow[gameIndex])
                                    placed = true
                                } else {
                                     //place a game in leftovers
                                    createGameElement(leftoverContainer, currentRow[gameIndex])
                                    placed = true
                                }                                
                            }
                        }
                    }
                }
            }

            //remove any rows and columns containing ONLY empty shelves empty shelves?
            //TODO

            //sort shelves in array before returning
            for (let column of shelves) {
                for (let shelf of column) {
                    shelf.sortRows()
                }
            }

            return shelves
    }
}

function divideIntoRows(rows, sortedList) {
    const rowArray = []
    //create as many rows as the max amount of rows
    for (let i = 0; i < rows; i++) {
        rowArray.push( [] )
    }

    const chunkSize = Math.ceil(sortedList.length / rows);
    for (let row = 0; row < rows; row++) {
        for (let i = 0; i < chunkSize; i++) {
          const value = sortedList[i + row * chunkSize]
          if (!value) continue //avoid adding "undefined" values
          rowArray[row].push(value)
        }
    }
    return rowArray

}



/**
 * Fetches a collection of games from a users collection
 * @param {String} username 
 * @returns an array of Game objects
 */
async function fetchCollection (username) {
    const response = await fetch(`/collection/${username}`)
    const simpleGames = await JSON.parse( await response.text())
    const games = simpleGames.map( (input) => {
        const sizes = [parseFloat(input.x), parseFloat(input.z), parseFloat(input.y)]
        sizes.sort( (a, b) => a - b)

        const game = new Game(input.id, input.versionID, sizes[2], sizes[0],sizes[1],input.mass,input.img,input.thumbnail)
        game.minPlayers = input.minPlayers,
        game.maxPlayers = input.maxPlayers,
        game.minTime = input.minTime,
        game.maxTime = input.maxTime,
        game.officialTime = input.officialTime,
        game.description = input.description,
        game.publishYear = input.publishYear,
        game.minAge = input.minAge,
        game.mechanics = input.mechanics,
        game.averageRating = input.averageRating,
        game.rank = input.rank,
        game.weight = input.weight,
        game.title = input.title,
        game.bestPlayers = input.bestPlayers,
        game.languageDependence = input.languageDependence
        return game
    })
    return games
}

function displayShelves(shelfArray) {


    const shelfHeight = `${(parseFloat(shelfHeightField.value) / SHRINKFACTOR)+1}${SCREENUNIT}`
    const shelfWidth =`${(parseFloat(shelfWidthField.value) / SHRINKFACTOR)+1}${SCREENUNIT}`

    shelfContainer.style.width = (shelfWidth*parseFloat(maxColumnsField.value)+5)
    shelfContainer.style.height = (shelfWidth*parseFloat(maxRowsField.value)+5)

    let col = 0
    for (let row in shelfArray[col]) {
        const currentTableRow = document.createElement('tr')
        currentTableRow.style.height = shelfHeight
        currentTableRow.style.minHeight = shelfHeight
        currentTableRow.style.maxHeight = shelfHeight


        for ( let col in shelfArray) {
            const currentTCell = document.createElement('td')

            currentTCell.style.width = shelfWidth
            currentTCell.style.minWidth = shelfWidth
            currentTCell.style.maxWidth = shelfWidth
            currentTCell.style.height = shelfHeight
            currentTCell.style.minHeight = shelfHeight
            currentTCell.style.maxHeight = shelfHeight


            for (let shelfRow of shelfArray[col][row].rows) {
                const shelfRowElement = document.createElement('div')
                shelfRowElement.setAttribute('class', 'shelfRow')

                shelfRowElement.style.width = '100%'
                // shelfRowElement.style.height = `${(parseFloat(shelfRow.height)/ SHRINKFACTOR )+0.5 }${SCREENUNIT}`
       
                 
                for (let game of shelfRow.content) {
                    createGameElement(shelfRowElement, game)
                }

                currentTCell.appendChild(shelfRowElement)
            }
            ;

            currentTableRow.prepend(currentTCell)
            col++
        }
        if (currentTableRow.hasChildNodes()) {
            shelfContainer.prepend(currentTableRow)
        }
    }

}


function createGameElement(parent, game) {
    const gameElement = document.createElement('div')
    gameElement.setAttribute('class', 'game')

    const height =`${(game.y / SHRINKFACTOR ) -0.1}${SCREENUNIT}`
    const width =`${(game.z / SHRINKFACTOR ) -0.1}${SCREENUNIT}`

    gameElement.style.width = width
    gameElement.style.minWidth = width
    gameElement.style.maxWidth = width
    gameElement.style.height = height
    gameElement.style.minHeight = height
    gameElement.style.maxHeight = height
    gameElement.textContent = String( `${game.title}`)


    parent.prepend(gameElement)
}

