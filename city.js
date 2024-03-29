console.log('loaded city.js');
// pequena alteração pra carregar o cnd
// Create a new canvas element
var canvas = document.createElement('canvas');

// Add attributes to the canvas element if needed
canvas.id = 'myCanvas'; // Example ID
canvas.width = 800; // Example width
canvas.height = 600; // Example height

// Get a reference to the body element
var body = document.getElementsByTagName('body')[0];

// Insert the canvas element right after the opening body tag
body.insertBefore(canvas, body.firstChild);


var cell_count_x = 0;
var cell_count_y = 0;
var SIZE = 2; // default = 3

var lifeTime = 8000; //> config
var lifeTime_branch = 15; //> config
var prop_city2land = 12.0; //> config
var prop_land2city = 0.003;
var prop_branchOff = 15; //> config
var prop_branchOff_land = 6; //> config
var prop_branchOff_tomain = 1;
var branch_fallOff = 50;
var change_hue_newMain = 9;
var start_branches = 2; // 3
var max_steps_back = 300; //> config

var lightness_default = 130;
var lightness_branch = 50;

var cells = [];
var branchList = [];

class Pos {
    constructor(x, y) { 
        this.x = x; 
        this.y = y;
    }
    toIdx(off_x = 0, off_y = 0) {
        return (this.y + off_y) * cell_count_x + (this.x + off_x);
    }
    static fromIdx(idx) { 
        let y = Math.floor(idx / cell_count_x);
        let x = idx - y * cell_count_x;
        return new Pos(x, y);
    }
}

class Branch {
    constructor(pos) {
        this.pos = pos;
        this.state = "RUNNING";
        this.mode = "CITY";
        this.expandDirection = new Pos(0,0);
        this.ownFields = [pos];
        this.age = 0;
        this.lifeTime = lifeTime;
        this.reds = 192;
        this.blues = 192;
        this.yellows = 192;
        this.opacity = 0.2;
    }
    getColor() {

        var blue = `rgba( 0, 78, 151, ${this.opacity})`;
        var orange = `rgba( 255, 103, 0, ${this.opacity})`

        // return blue if branchLisht lenght is even, orange if odd
        if (branchList.length % 2 == 0){
            return blue;
        } else {
            return orange;
        }
    }
    createLine(toPos, context, fromPos = null) {
        if(!fromPos) {
            fromPos = this.pos;
        }
        context.lineWidth = 2;
        context.strokeStyle = this.getColor();
        context.beginPath();
        context.moveTo(2*SIZE*fromPos.x, 2*SIZE*fromPos.y);
        context.lineTo(2*SIZE*toPos.x, 2*SIZE*toPos.y);
        context.stroke();
        this.pos = toPos;
        this.ownFields.push(toPos);
    }
    moveToNewPos() {
        for(let i = this.ownFields.length-1; i >= Math.max(0, this.ownFields.length - max_steps_back); i--) {
            let testPos = this.ownFields[i];
            if(this.getFreeFields(testPos).length > 0) {
                this.pos = testPos;
                return true;
            }
        }
        return false;
    }
    getFreeFields(pos = null) {
        if(!pos) { pos = this.pos; }
        let freeFields = [];
        if (pos.x + 1 < cell_count_x && cells[pos.toIdx(1,0)] === 0) {
            freeFields.push(new Pos(pos.x+1, pos.y));
        }
        if (pos.x - 1 > 0 && cells[pos.toIdx(-1,0)] === 0) {
            freeFields.push(new Pos(pos.x-1, pos.y));
        }
        if (pos.y + 1 < cell_count_y && cells[pos.toIdx(0,1)] === 0) { 
            freeFields.push(new Pos(pos.x, pos.y+1));
        }
        if (pos.x - 1 > 0 && cells[pos.toIdx(0,-1)] === 0) { 
            freeFields.push(new Pos(pos.x, pos.y-1));
        }
        return freeFields;
    }
    findNextMove() {
        if(this.state !== "RUNNING") {return null;}
        let freeFields = this.getFreeFields();
        if(freeFields.length === 0) { 
            if(this.moveToNewPos()) {
                return this.findNextMove();
            }
            this.state = "STOPPED";
            return null;
        }
        if(this.lifeTime - this.age < lifeTime_branch) {
            this.mode = "CITY";
        } else {
            if(this.mode === "LAND") {
                let expandField = new Pos(this.pos.x + this.expandDirection.x, this.pos.y + this.expandDirection.y);
                if (freeFields.find(field => {return field.x === expandField.x && field.y === expandField.y })) {
                    for(let i = 0; i < 10; i++) {
                        freeFields.push(expandField);
                    }
                } else {
                    this.mode = "CITY";
                    this.age = Math.round(Math.random() * this.age);
                }
            }
        }
        return freeFields[Math.round(Math.random() * (freeFields.length-1))];
    }
    setExpandDirection() {
        let freeFields = this.getFreeFields();
        if(freeFields.length === 0) {return;}
        let targetPos = randomChoice(freeFields);
        this.expandDirection = new Pos(targetPos.x - this.pos.x, targetPos.y - this.pos.y);
    }
    drawMove(context) {
        if(this.age >= this.lifeTime) {
            this.state = "STOPPED";
            return null;
        }
        if(this.mode === "CITY" && Math.random() <= prop_city2land/100.0) {
            this.mode = "LAND";
            this.setExpandDirection();
        } else if(this.mode === "CITY" && Math.random() <= prop_land2city/100.0) {
            this.mode = "CITY";
            this.age = Math.round(Math.random() * this.age);
        }
        let newPos = this.findNextMove();
        if(!newPos) {
            return null;
        }
        this.createLine(newPos, context);
        this.age++;
        cells[newPos.toIdx()] = 1;
    }
    setMain() {
        this.saturation = 255;
        this.lightness = lightness_default;
        this.hue += change_hue_newMain;
        if(this.hue > 255) {
            this.hue -= 255;
        }
        this.lifeTime = lifeTime;
    }
    branchOff(context) {
        if(this.ownFields.length <= 1) {return null;}
        let searchPos = this.ownFields[this.ownFields.length-1];
        let freeFields = this.getFreeFields(searchPos);
        if(freeFields.length === 0) {return null;}
        let newPos = randomChoice(freeFields);
        this.createLine(newPos, context, searchPos);
        let newBranch = new Branch(this.pos);
        newBranch.hue = this.hue;
        newBranch.lightness = lightness_branch;
        newBranch.lifeTime = lifeTime_branch;
        cells[newPos.toIdx()] = 1;
        return newBranch;
    }
}

function randomChoice(fromList) {
    return fromList[Math.round(Math.random() * (fromList.length-1))];
}

function randomPos() {
    return Pos.fromIdx(Math.round(Math.random() * cells.length));
}

function initialize() {
    for(let y=0;y<cell_count_y;y++) {
        for(let x=0;x<cell_count_x;x++) {
            let idx = y*cell_count_x+x;
            cells[idx] = 0;
        }
    }
    branchList = [];
    for(let i = 0; i < start_branches; i++) {
        branchList.push(new Branch(randomPos()));
    }
}

function dimensionChanged(width,height) {
  cell_count_x = Math.round(width / SIZE / 2);
  cell_count_y = Math.round(height / SIZE / 2);
  initialize();
}

function paintMatrix(ctx){
    branchList.forEach(oldBranch => {
        let scaled_branchOff = prop_branchOff * (1.0+branch_fallOff) / (branch_fallOff + branchList.length);
        let scaled_branchOff_land = prop_branchOff_land * (1.0+branch_fallOff) / (branch_fallOff + branchList.length);
        if((oldBranch.mode === "CITY" && Math.random() <= scaled_branchOff/100.0) || (oldBranch.mode === "LAND" && Math.random() <= scaled_branchOff_land/100.0)) {
            let newBranch = oldBranch.branchOff(ctx);
            if(newBranch) {
                if(Math.random() <= prop_branchOff_tomain/100.0) {
                    newBranch.setMain();
                }
                branchList.push(newBranch);
            }
        }
    });
    branchList = branchList.filter(branch => {
        branch.drawMove(ctx);
        return branch.state === "RUNNING";
    });
    if(branchList.length === 0) {
        return false;
    }
    return true;
}

function restart(ctx) {
    ctx.reset();
    initialize();
}

// Define a function for drawing on the canvas
function drawOnCanvas(ctx) {
    var bRunning = paintMatrix(ctx);
    if (!bRunning) {
        clearInterval(stepInterval);
        setTimeout(() => {
            restartCanvas(ctx);
            stepInterval = setInterval(() => drawOnCanvas(ctx), 90);
        }, 5000);
    }
}

// Function to handle canvas resizing
function handleCanvasResize(width, height, ctx) {
    dimensionChanged(width, height);
    restartCanvas(ctx);
}

// Function to restart the canvas animation
function restartCanvas(ctx) {
    restart(ctx);
}

// Initialize the canvas and related elements
var canvas = document.getElementById('myCanvas');
var ctx = canvas.getContext('2d');

// Event listeners for canvas resizing
window.addEventListener('resize', function() {
    handleCanvasResize(canvas.width, canvas.height, ctx);
});

// Initial canvas setup
handleCanvasResize(canvas.width, canvas.height, ctx);

// Set up timers for animation
var stepInterval = setInterval(() => drawOnCanvas(ctx), 90);