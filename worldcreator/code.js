const canvas = document.getElementById('mainCanvas');
const ctx = canvas.getContext('2d');
const cWidth = canvas.width;
const cHeight = canvas.height;
let mouseX = 0;
let mouseY = 0;
let mouseDown = false;
let mouseButton = 0;
let updateInterval;

let brushSize = 100;
let brushStrenth = 10;

let shadingPower = 5;
let highlightingPower = 7;
let depthRelevance = 0.3; //less 0-1 more
let softnessModifier = 0.8; //softer 0-1 harder
let waterColor = [0.6, 0.8, 1];

const MAX_TERRAIN_HEIGHT = 1000;
const MIN_TERRAIN_HEIGHT = 0;
const MAX_HEIGHT_COLOR_HSV = 0;
const MIN_HEIGHT_COLOR_HSV = 0.35;

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
    if (height != 0) {
        ratio = (height - MIN_TERRAIN_HEIGHT) / (MAX_TERRAIN_HEIGHT - MIN_TERRAIN_HEIGHT);
        hue = MIN_HEIGHT_COLOR_HSV * (1 - ratio);
        hsv = [hue, 1, 1];
    } else {
        hsv = waterColor;
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
        if (column > 0 && height != 0) {
            let neighbour = heightMap[column - 1][row];
            let difference = (height - neighbour) / (MAX_TERRAIN_HEIGHT - MIN_TERRAIN_HEIGHT);
            let depth = (height - MIN_TERRAIN_HEIGHT) / (MAX_TERRAIN_HEIGHT - MIN_TERRAIN_HEIGHT);

            if (difference > 0) {
                hsv[1] -= difference * highlightingPower;
            } else {
                hsv[2] += difference * shadingPower;
            }
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

function red(x, y) {

}

function testFill() {
    ctx.clearRect(0, 0, cWidth, cHeight);
    id = generateColorHeightMap();
    ctx.putImageData(id, 0, 0);
    //console.log("Filled!");
}

//Manipulation
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
            } else if (heightMap[x][y] > MIN_TERRAIN_HEIGHT && mouseButton == 2) {
                //console.log(heightMap[x][y])
                heightMap[x][y] -= brushStrenth * hardness;
                if (heightMap[x][y] < MIN_TERRAIN_HEIGHT) {
                    heightMap[x][y] = MIN_TERRAIN_HEIGHT;
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
    }, 1);
})

canvas.addEventListener("mouseleave", function (event) {
    if (updateInterval) {
        clearInterval(updateInterval);
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
})

document.getElementById("bsize").addEventListener("change", function (event) {
    brushSize = event.target.value;
})

document.getElementById("bstrenth").addEventListener("change", function (event) {
    brushStrenth = event.target.value;
})

//instant invokation

testFill();
softnessModifier = document.getElementById("bhardness").value;
brushSize = document.getElementById("bsize").value;
brushStrenth = document.getElementById("bstrenth").value;
