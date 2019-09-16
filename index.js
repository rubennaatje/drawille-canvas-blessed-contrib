var Canvas = require('drawille-blessed-contrib');
var bresenham = require('bresenham');
var glMatrix = require('gl-matrix');
var x256 = require('x256');
var path = require('svg-path-properties');
var mat2d = glMatrix.mat2d;
var vec2 = glMatrix.vec2;

//temporary
var numPoints = 400;
var properties = path.svgPathProperties("M56.2711 5.20879C53.5525 0.443239 56.0215 -1.04062 59.2662 0.709214C62.511 2.45905 102.946 28.2067 108.437 31.9563C113.928 35.706 117.822 39.7886 121.166 43.7052C126.574 50.0376 146.875 74.5354 151.118 79.4519C153.175 81.8347 155.332 84.1295 158.981 85.2304C159.637 85.4284 160.345 85.5634 161.102 85.7014C163.848 86.2013 169.708 87.9371 173.582 94.4505C177.991 101.867 178.49 104.95 177.742 114.032C177.309 119.287 177.886 124.351 179.738 127.031C184.231 133.53 193.641 147.056 200.039 155.944C207.777 166.693 215.015 181.692 218.01 191.691C221.005 201.69 254.701 320.179 256.448 327.179C258.195 334.178 259.992 335.802 251.581 340.802C247.587 343.177 244.122 346.517 245.591 353.051C246.714 358.051 254.207 376.548 246.339 382.049C244.5 383.335 203.529 411.103 195.921 416.045C191.303 419.045 184.969 416.832 182.443 412.421C179.917 408.011 179.344 402.087 186.062 398.297C191.303 395.34 194.299 393.672 208.775 385.007C212.308 382.892 214.241 378.119 211.603 372.174C209.274 366.925 204.926 353.736 202.785 347.677C197.793 333.553 193.561 304.657 190.18 286.182C188.807 278.683 183.691 271.184 173.208 270.184C170.899 269.964 163.224 269.434 156.609 269.684C150.15 269.929 138.2 273.937 132.149 289.932C127.656 301.806 118.421 325.554 110.933 345.427C105.105 360.893 91.2146 356.676 89.093 355.051C84.2029 351.306 71.6902 342.177 61.5126 356.551C56.6455 363.425 46.5368 380.174 40.6713 389.298C34.1249 399.482 26.6939 392.548 6.35176 377.299C-2.2783 370.83 -0.0289366 357.926 1.23502 353.051C7.05862 330.587 17.8332 317.43 28.8154 307.93C39.7977 298.431 55.2727 287.182 73.7428 280.683C92.213 274.183 97.796 268.693 102.946 259.185C117.297 232.687 124.286 221.063 122.789 208.065C121.291 195.066 105.941 169.193 102.696 157.944C100.317 149.695 98.4739 128.739 98.0546 111.199C97.9807 108.116 97.4565 104.858 103.445 105.7C112.93 107.032 110.312 99.3681 108.936 97.3673C101.947 87.2012 98.9232 82.2717 93.2114 72.2026C86.9715 61.2036 58.2679 8.70847 56.2711 5.20879Z");

function Context(width, height, canvasClass) { 
  var canvasClass = canvasClass || Canvas;
  this._canvas = new canvasClass(width, height);  
  this.canvas = this._canvas; //compatability  
  this._matrix = mat2d.create();
  this._stack = [];
  this._currentPath = [];
  this._trackPath = [];
  this.width = width;
  this.height = height;

  //remove
  this.carpercentage = 0;
  
  for (var i=0; i < numPoints; i++){
    var p = properties.getPointAtLength( i * properties.getTotalLength() / numPoints);
    var x=Math.round(p.x * 0.3 + 3), y = Math.round(p.y * 0.3 + 3);
    addPoint(this._matrix,this._trackPath, x, y, true);
}
  this._currentPath = this._trackPath;
  this.strokeStyle = 'white'; 
  this.fillText(width, 100,100)
  this.stroke();
  this.save();
}

exports.colors = {
    black: 0
  , red: 1
  , green: 2
  , yellow: 3
  , blue: 4
  , magenta: 5
  , cyan: 6
  , white: 7
};

var methods = ['save', 'restore', 'scale', 'rotate', 'translate', 'transform', 'setTransform', 'resetTransform', 'createLinearGradient', 'createRadialGradient', 'createPattern', 'clearRect', 'fillRect', 'strokeRect', 'beginPath', 'fill', 'stroke', 'drawFocusIfNeeded', 'clip', 'isPointInPath', 'isPointInStroke', 'fillText', 'strokeText', 'measureText', 'drawImage', 'createImageData', 'getImageData', 'putImageData', 'getContextAttributes', 'setLineDash', 'getLineDash', 'setAlpha', 'setCompositeOperation', 'setLineWidth', 'setLineCap', 'setLineJoin', 'setMiterLimit', 'clearShadow', 'setStrokeColor', 'setFillColor', 'drawImageFromRect', 'setShadow', 'closePath', 'moveTo', 'lineTo', 'quadraticCurveTo', 'bezierCurveTo', 'arcTo', 'rect', 'arc', 'ellipse'];

methods.forEach(function(name) {
  Context.prototype[name] = function() {};
});

function getFgCode(color) {
    // String Value
    if(typeof color == 'string' && color != 'normal') {
        return '\033[3' + exports.colors[color] + 'm';
    }
    // RGB Value
    else if (Array.isArray(color) && color.length == 3)
    {
        return '\033[38;5;' + x256(color[0],color[1],color[2]) + 'm';
    }
    // Number
    else if (typeof color == 'number')
    {
        return '\033[38;5;' + color + 'm';
    }
    // Default
    else
    {
        return '\033[39m'
    }
}

function getBgCode(color) {
    // String Value
    if(typeof color == 'string' && color != 'normal') {
        return '\033[4' + exports.colors[color] + 'm';
    }
    // RGB Value
    else if (Array.isArray(color) && color.length == 3)
    {
        return '\033[48;5;' + x256(color[0],color[1],color[2]) + 'm';
    }
    // Number
    else if (typeof color == 'number')
    {
        return '\033[48;5;' + color + 'm';
    }
    // Default
    else
    {
        return '\033[49m'
    }
}

function br(p1, p2) {
  return bresenham(
    Math.floor(p1[0]),
    Math.floor(p1[1]),
    Math.floor(p2[0]),
    Math.floor(p2[1])
  );
}

function triangle(pa, pb, pc, f) {
  var a = br(pb, pc);
  var b = br(pa, pc);
  var c = br(pa, pb);
  var s = a.concat(b).concat(c).sort(function(a, b) {
    if(a.y == b.y) {
      return a.x - b.x;
    }
    return a.y-b.y;
  });
  for(var i = 0; i < s.length - 1; i++) {
    var cur = s[i];
    var nex = s[i+1];
    if(cur.y == nex.y) {
      for(var j = cur.x; j <= nex.x; j++) {
        f(j, cur.y);
      }
    } else {
      f(cur.x, cur.y);
    }
  }
}

function quad(m, x, y, w, h, f) {
  var p1 = vec2.transformMat2d(vec2.create(), vec2.fromValues(x, y), m);
  var p2 = vec2.transformMat2d(vec2.create(), vec2.fromValues(x+w, y), m);
  var p3 = vec2.transformMat2d(vec2.create(), vec2.fromValues(x, y+h), m);
  var p4 = vec2.transformMat2d(vec2.create(), vec2.fromValues(x+w, y+h), m);
  triangle(p1, p2, p3, f);
  triangle(p3, p2, p4, f);
};

Context.prototype.__defineSetter__('fillStyle', function(val){
  this._canvas.fontFg = val
});

Context.prototype.__defineSetter__('strokeStyle', function(val){
  this._canvas.color = val
  //this._canvas.fontBg = val
});

Context.prototype.clearRect = function(x, y, w, h) {
  quad(this._matrix, x, y, w, h, this._canvas.unset.bind(this._canvas));  
};

Context.prototype.fillRect = function(x, y, w, h) {
  quad(this._matrix, x, y, w, h, this._canvas.set.bind(this._canvas));
};

Context.prototype.save = function save() {
  this._stack.push(mat2d.clone(mat2d.create(), this._matrix));
};

Context.prototype.restore = function restore() {
  var top = this._stack.pop();
  if(!top) return;
  this._matrix = top;
};

Context.prototype.translate = function translate(x, y) {  
  mat2d.translate(this._matrix, this._matrix, vec2.fromValues(x, y));
};

Context.prototype.rotate = function rotate(a) {
  mat2d.rotate(this._matrix, this._matrix, a/180*Math.PI);
};

Context.prototype.scale = function scale(x, y) {
  mat2d.scale(this._matrix, this._matrix, vec2.fromValues(x, y));
};

Context.prototype.beginPath = function beginPath() {
  this._currentPath = [];
};

Context.prototype.closePath = function closePath() {
  /*
  this._currentPath.push({
    point: this._currentPath[0].point,
    stroke: false
  });*/
};

Context.prototype.stroke = function stroke() {
  
  if (this.lineWidth==0) return;

  var set = this._canvas.set.bind(this._canvas);
  for(var i = 0; i < this._currentPath.length - 1; i++) {
    var cur = this._currentPath[i];
    var nex = this._currentPath[i+1];
    if(nex.stroke) {
      bresenham(cur.point[0], cur.point[1], nex.point[0], nex.point[1], set);
    }
  }
};

Context.prototype.clear = function(w ,h) {
  this.clearRect(0,0,w,h);
}


Context.prototype.loadFromSVG = function() {
  this.clearRect(0,0,this.width,this.height);
  
  
  this._currentPath = this._trackPath;
  this.strokeStyle = 'white'; 
  this.stroke();
  
  //draw the car at 33 percent
}

Context.prototype.drawCar = function(obj){
  var section = (this._trackPath.length / 100) * obj.carpercentage;
  
  var pointA = Math.floor(section);
  var pointB = pointA + 1;
  var leftPercentage = section - pointA;

  var p1 = this._trackPath[pointA];
  var p2 = this._trackPath[pointB];
  
  this.beginPath();
  
  this.strokeStyle = obj.color|'red'; 
  
  // this.stroke();
  
  var pixels = bresenham(p1.point[0],p1.point[1],p2.point[0],p2.point[1]);
  this.beginPath();
  var precisepos = pixels[Math.round(leftPercentage * pixels.length)];
  if(pixels.length = 1){
    precisepos = pixels[0];
  }
  this.strokeStyle = obj.color; 
  //hack because this has encapsulated the c.set function this is the only way to do it.
  this.lineTo(precisepos.x,precisepos.y);
  this.lineTo(precisepos.x,precisepos.y);
  this.stroke();
  this.beginPath();
  //draw the numbers

  //draw lines to the numbers
  var textpos =   {x: precisepos.x + 10, y: precisepos.y + 5 }; 
  this.strokeStyle = 'yellow';
  this.lineTo(precisepos.x + 2,precisepos.y + 2);
  this.lineTo(textpos.x - 2,textpos.y - 2);
  this.fillStyle = obj.color;
  this.fillText((obj.number + ""),textpos.x,textpos.y)
  this.stroke();
  this.beginPath();
}

function addPoint(m, p, x, y, s) {
  var v = vec2.transformMat2d(vec2.create(), vec2.fromValues(x, y), m);
  p.push({
    point: [Math.floor(v[0]), Math.floor(v[1])],
    stroke: s
  });
}

Context.prototype.moveTo = function moveTo(x, y) {
  addPoint(this._matrix, this._currentPath, x, y, false);
};

Context.prototype.lineTo = function lineTo(x, y) {
  addPoint(this._matrix, this._currentPath, x, y, true);
};

Context.prototype.fillText = function lineTo(str, x, y) {
  var v = vec2.transformMat2d(vec2.create(), vec2.fromValues(x, y), this._matrix);
  this._canvas.writeText(str, Math.floor(v[0]), Math.floor(v[1]))
};

Context.prototype.measureText = function measureText(str) {
  return this._canvas.measureText(str)
};

Canvas.prototype.writeText = function(str, x, y) {  
  var coord = this.getCoord(x, y)
  for (var i=0; i<str.length; i++) {    
    this.chars[coord+i]=str[i]
  }

  var bg = getBgCode(this.fontBg);
  var fg = getFgCode(this.fontFg);

  this.chars[coord] = fg + bg + this.chars[coord]
  this.chars[coord+str.length-1] += '\033[39m\033[49m'
}

var map = [
  [0x1, 0x8],
  [0x2, 0x10],
  [0x4, 0x20],
  [0x40, 0x80]
]

Canvas.prototype.set = function(x,y) {
    if(!(x >= 0 && x < this.width && y >= 0 && y < this.height)) {
      return;
    }
    
    var coord = this.getCoord(x, y)
    var mask = map[y%4][x%2];

    this.content[coord] |= mask;
    this.colors[coord] = getFgCode(this.color);
    this.chars[coord] = null
}


Canvas.prototype.frame = function frame(delimiter) {
  delimiter = delimiter || '\n';
  var result = [];

  for(var i = 0, j = 0; i < this.content.length; i++, j++) {
    if(j == this.width/2) {
      result.push(delimiter);
      j = 0;
    }
    if (this.chars[i]) {
      result.push(this.chars[i])
    }
    else if(this.content[i] == 0) {
      result.push(' ');
    } else {   
        var colorCode = this.colors[i];
        result.push(colorCode+String.fromCharCode(0x2800 + this.content[i]) + '\033[39m')      
      //result.push(String.fromCharCode(0x2800 + this.content[i]))      
    }
  }
  result.push(delimiter);
  return result.join('');
};

module.exports = Context;
module.exports.Canvas = function(width, height, canvasClass) {
  
  var ctx;

  this.getContext = function() {
   return ctx = ctx || new Context(width, height, canvasClass)
 }

}
