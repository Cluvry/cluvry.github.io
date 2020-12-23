const canvas = document.getElementById('mainCanvas');
const ctx = canvas.getContext('2d');
const cWidth = canvas.width;
const cHeight = canvas.height;
const brushPreview = document.getElementById("brush_preview");
const btx = brushPreview.getContext('2d');
let mouseX = 0;
let mouseY = 0;
let mouseDown = false;
let mouseButton = 0;
let updateInterval;

let brushSize = 100;
let brushStrenth = 10;

let shadingPower = 7;
let highlightingPower = 9;
let depthRelevance = 0.3; //less 0-1 more
let softnessModifier = 0.8; //softer 0-1 harder
let waterHue = 0.6;
let waterLevelHeight;
let waterLevel = 0;

const MAX_TERRAIN_HEIGHT = 2000;
const MAX_WATER_DEPTH = -2000;
const MAX_HEIGHT_COLOR_HSV = 0;
const MIN_HEIGHT_COLOR_HSV = 0.35;
const MIN_WATER_SAT = 0.35;
const MAX_WATER_SAT = 1;
const WATER_LEVELS = 5;

let heightMap = [];
for (let x = 0; x < cWidth; x++) {
    let column = []
    for (let y = 0; y < cHeight; y++) {
        column.push(MAX_TERRAIN_HEIGHT / 2);
    }
    heightMap.push(column);
}

/*for (let i = 0; i < cHeight*cWidth; i++){
    heightMap.push(MAX_TERRAIN_HEIGHT/2);
}*/

function showBrush() {
    ctx.beginPath();
    ctx.rect(mouseX - brushSize / 2, mouseY - brushSize / 2, brushSize, brushSize);
    ctx.stroke();
    ctx.beginPath();
    ctx.rect(mouseX - brushSize / 2 * softnessModifier, mouseY - brushSize / 2 * softnessModifier, brushSize * softnessModifier, brushSize * softnessModifier);
    ctx.stroke();
}

function updateBrushPreview() {
    let id = btx.createImageData(100, 100);
    let counter = 0;
    for (let y = 0; y < 100; y++) {
        for (let x = 0; x < 100; x++) {
            let fromCenterXl = x / (50 - softnessModifier * 50);
            let fromCenterXr = (100 - x) / (100 - (50 + softnessModifier * 50));
            let fromCenterYu = y / (50 - softnessModifier * 50);
            let fromCenterYd = (100 - y) / (100 - (50 + softnessModifier * 50));
            let hardness;
            if (x < 50) {
                if (y < 50) {
                    hardness = Math.min(fromCenterXl, fromCenterYu);
                } else {
                    hardness = Math.min(fromCenterXl, fromCenterYd);
                }
            } else {
                if (y < 50) {
                    hardness = Math.min(fromCenterXr, fromCenterYu);
                } else {
                    hardness = Math.min(fromCenterXr, fromCenterYd);
                }
            }
            if (hardness > 1) {
                hardness = 1;
            }
            id.data[counter] = 0;
            id.data[counter + 1] = 0;
            id.data[counter + 2] = 0;
            id.data[counter + 3] = Math.floor(255 * hardness * (brushStrenth / 100));
            counter += 4;
        }
    }
    btx.putImageData(id, 0, 0);
}

function hsv2rgb(color) {
    let h = color[0] % 1;
    let s = color[1];
    if (s > 1) {
        s = 1;
    } else if (s < 0) {
        s = 0;
    }
    let v = color[2];
    if (v > 1) {
        v = 1;
    } else if (v < 0) {
        v = 0;
    }

    let q = (1 - s) * v;

    let r = q;
    let g = q;
    let b = q;

    if (h >= 0 && h < 1 / 6) {
        r = v;
        g = v * (1 - (s * (1 - h / (1 / 6))));
    } else if (h >= 1 / 6 && h < 2 / 6) {
        g = v;
        r = v * (1 - (s * ((h - 1 / 6) / (1 / 6))));
    } else if (h >= 2 / 6 && h < 3 / 6) {
        g = v;
        b = v * (1 - (s * (1 - (h - 2 / 6) / (1 / 6))));
    } else if (h >= 3 / 6 && h < 4 / 6) {
        b = v;
        g = v * (1 - (s * ((h - 3 / 6) / (1 / 6))));
    } else if (h >= 4 / 6 && h < 5 / 6) {
        b = v;
        r = v * (1 - (s * (1 - (h - 4 / 6) / (1 / 6))));
    } else if (h >= 5 / 6 && h < 1) {
        r = v;
        b = v * (1 - (s * ((h - 5 / 6) / (1 / 6))));
    }
    let rgb = [r * 255, g * 255, b * 255];
    return rgb;
}

function heightToHSV(height) {
    //terrain
    if (height >= waterLevel) {
        let ratio = (height - waterLevel) / (MAX_TERRAIN_HEIGHT - waterLevel);
        let hue = MIN_HEIGHT_COLOR_HSV * (1 - ratio);
        hsv = [hue, 1, 1];
    }
    //water
    else {
        let hue = waterHue;
        let level = Math.floor((height - waterLevel) / waterLevelHeight);
        let sat = MIN_WATER_SAT + (MAX_WATER_SAT - MIN_WATER_SAT) / WATER_LEVELS * level;
        hsv = [hue, sat, 1];
    }

    return hsv;
}

function generateColorHeightMap() {
    let id = ctx.createImageData(cWidth, cHeight);
    //console.log(id.data.length);
    for (let i = 0; i < id.data.length; i += 4) {
        // console.log(Math.floor(i/cHeight));
        let row = Math.floor((i / 4) / cWidth);
        let column = (i / 4) % cWidth;
        let height = heightMap[column][row];
        //console.log(Math.floor((1/4)/cWidth));
        let hsv = heightToHSV(height);

        //SHADING
        if (height >= waterLevel) {
            //HORIZONTAL SHADING
            if (column > 0) {
                let neighbour = heightMap[column - 1][row];
                let difference = (height - neighbour) / (MAX_TERRAIN_HEIGHT - waterLevel);

                if (difference > 0) {
                    hsv[1] -= difference * highlightingPower;
                } else {
                    hsv[2] += difference * shadingPower;
                }
            }
            //VERTICAL SHADING
            if (row > 0) {
                let neighbour = heightMap[column][row - 1];
                let difference = (height - neighbour) / (MAX_TERRAIN_HEIGHT - waterLevel);

                if (difference > 0) {
                    hsv[1] -= difference * highlightingPower / 2;
                } else {
                    hsv[2] += difference * shadingPower / 2;
                }
            }
            //DEPTH SHADING
            let depth = (height - waterLevel) / (MAX_TERRAIN_HEIGHT - waterLevel);
            hsv[2] -= (1 - depth) * depthRelevance;
        }
        let rgb = hsv2rgb(hsv);
        //console.log(hsv);
        //console.log(rgb);
        id.data[i] = rgb[0];
        id.data[i + 1] = rgb[1];
        id.data[i + 2] = rgb[2];
        id.data[i + 3] = 255;
    }
    return id;
}


function testFill() {
    ctx.clearRect(0, 0, cWidth, cHeight);
    id = generateColorHeightMap();
    ctx.putImageData(id, 0, 0);
    //console.log("Filled!");
}

//WORLD MANIPULATION
function changeWaterLevel() {
    waterLevel = MAX_WATER_DEPTH + document.getElementById("wwater_level").value * (MAX_TERRAIN_HEIGHT - MAX_WATER_DEPTH);
    waterLevelHeight = (MAX_WATER_DEPTH - waterLevel) / WATER_LEVELS;
}

//BRUSHES
function squareBrush(mouseButton) {
    //console.log("raising");
    let leftX = 0;
    if (mouseX - brushSize / 2 > 0) {
        leftX = mouseX - brushSize / 2;
    }
    let rightX = cWidth;
    if (mouseX + brushSize / 2 < cWidth) {
        rightX = mouseX + brushSize / 2;
    }
    let topY = 0;
    if (mouseY - brushSize / 2 > 0) {
        topY = mouseY - brushSize / 2;
    }
    let bottomY = cHeight;
    if (mouseY + brushSize / 2 < cHeight) {
        bottomY = mouseY + brushSize / 2;
    }
    for (let x = leftX; x < rightX; x++) {
        for (let y = topY; y < bottomY; y++) {
            let fromCenterXl = (x - (mouseX - brushSize / 2)) / ((mouseX - softnessModifier * (brushSize / 2)) - (mouseX - brushSize / 2));
            let fromCenterXr = ((mouseX + brushSize / 2) - x) / ((mouseX + brushSize / 2) - (mouseX + softnessModifier * (brushSize / 2)));
            let fromCenterYu = (y - (mouseY - brushSize / 2)) / ((mouseY - softnessModifier * (brushSize / 2)) - (mouseY - brushSize / 2));
            let fromCenterYd = ((mouseY + brushSize / 2) - y) / ((mouseY + brushSize / 2) - (mouseY + softnessModifier * (brushSize / 2)));
            let hardness;
            if (x < mouseX) {
                if (y < mouseY) {
                    hardness = Math.min(fromCenterXl, fromCenterYu);
                } else {
                    hardness = Math.min(fromCenterXl, fromCenterYd);
                }
            } else {
                if (y < mouseY) {
                    hardness = Math.min(fromCenterXr, fromCenterYu);
                } else {
                    hardness = Math.min(fromCenterXr, fromCenterYd);
                }
            }
            if (hardness > 1) {
                hardness = 1;
            }
            if (heightMap[x][y] < MAX_TERRAIN_HEIGHT && mouseButton == 0) {
                //console.log(heightMap[x][y])


                heightMap[x][y] += brushStrenth * hardness;
                if (heightMap[x][y] > MAX_TERRAIN_HEIGHT) {
                    heightMap[x][y] = MAX_TERRAIN_HEIGHT;
                }
            } else if (heightMap[x][y] > MAX_WATER_DEPTH && mouseButton == 2) {
                //console.log(heightMap[x][y])
                heightMap[x][y] -= brushStrenth * hardness;
                if (heightMap[x][y] < MAX_WATER_DEPTH) {
                    heightMap[x][y] = MAX_WATER_DEPTH;
                }
            }
        }
    }
}

//Event handlers

canvas.addEventListener("mousedown", function (event) {
    //console.log(event.pageX  - canvas.offsetLeft - canvas.clientLeft);
    //console.log(event.pageY - canvas.offsetTop - canvas.clientTop);
    mouseButton = event.button;
    mouseDown = true;
})

canvas.addEventListener("mouseup", function (event) {
    mouseDown = false;
})

canvas.addEventListener("mouseenter", function (event) {
    updateInterval = setInterval(function () {
        if (mouseDown && (mouseButton == 0 || mouseButton == 2)) {
            squareBrush(mouseButton);
        }
        testFill();
        showBrush();
    }, 1);
})

canvas.addEventListener("mouseleave", function (event) {
    if (updateInterval) {
        clearInterval(updateInterval);
        testFill();
    }
})

canvas.addEventListener("mousemove", function (event) {
    mouseX = event.pageX - canvas.offsetLeft - canvas.clientLeft;
    mouseY = event.pageY - canvas.offsetTop - canvas.clientTop;
})

canvas.oncontextmenu = function () {
    return false;
}

//Brush control

document.getElementById("bhardness").addEventListener("change", function (event) {
    softnessModifier = event.target.value;
    updateBrushPreview();
})

document.getElementById("bsize").addEventListener("change", function (event) {
    brushSize = event.target.value;
})

document.getElementById("bstrenth").addEventListener("change", function (event) {
    brushStrenth = event.target.value;
    updateBrushPreview();
})

document.getElementById("wwater_level").addEventListener("change", function(){
    changeWaterLevel();
    testFill();
})

//instant invokation

softnessModifier = document.getElementById("bhardness").value;
brushSize = document.getElementById("bsize").value;
brushStrenth = document.getElementById("bstrenth").value;
waterLevel = MAX_WATER_DEPTH + document.getElementById("wwater_level").value * (MAX_TERRAIN_HEIGHT - MAX_WATER_DEPTH);
waterLevelHeight = (MAX_WATER_DEPTH - waterLevel) / WATER_LEVELS;
testFill();
updateBrushPreview();
