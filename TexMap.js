/**
Victor Vahram Shahbazian
vshahbaz
1498494
May 19, 2016

Using code from webgl fundamentals
view-source:http://webglfundamentals.org/webgl/webgl-3d-lighting-directional-world.html
http://www.upvector.com/?section=Tutorials&subsection=Intro%20to%20Procedural%20Textures

The purpose of this program is to learn how to:
Fix all of our previous issues
Map a texture to coordinates and display texture
Learned about Procedural Textures and how they are generated. I wanted to implement Perlin Noise as well, will do in future.

Table of Contents:(In order top to bottom based on importance)
	Global Variables
	Shaders : Variable VSHADER and FSHADER
	drawScene() : Camera, Box Light, Orthographic, Perspective, Draw
	File/(Coordinates/Indices) functions : Create Object Arrays
	setShaderBool() : Turn on and off shader conditions
	setGeomery() : Transformations and Vertices to array buffer
	setNormals() : Generate Normals per loop
	setTexture() : Texture to array buffer
	Main Loop
	Html Load
	ui() : Switch buttons
	inputs() : Mouse and Keyboard inputs
	Parsing Functions
	Boiler Plate Functions
	checkPixel()
	General Matrix Functions
**/

/*===============*/

"use strict";

/*===============*/

/* === GL Variables === */
var canvas;//html to js
var program;//js to shader
var gl;//magic

//Base variables
var lightDir = [0,0,1];
var light2pos = [0.5,-0.5,0.9];
var bg = [.9,.9,.9,1];

//camera controls
var camera = [0,0,420];
var lookAt = [0,0,0];
var fov = 90;

/* === Shader Variables === */
var specOn;//Specular on/off
var persOn;//Perspective on/off
var shadingOn;//Shading on/off
var spotLightOn;//Second light on/off, disabled
var textureOn;//Texture on/off fshader
var useTextureLocation;//Texture on/off vshader
var useProceduralTexture;

var positionLocation;//Object location
var normalLocation;//Object normal location
var textureLocation;//Object texture location

var worldLocation;
var worldViewProjectionLocation;
var colorLocation;
var worldInverseTransposeLocation;

var lightColorLocation;
var specularColorLocation;
var shininessLocation;

var lightWorldPositionLocation;
var viewWorldPositionLocation;

var matWorld;
var matPerspective;
var matPerspectiveTransposeInverse;

//Spotlight variables
var lightWorldPositionLocation2;
var viewWorldPositionLocation2;
var boxCenterPosition;

/* === Object Variables === */
var orderedVerts = [];//Vertices of objects
var orderedIndices = [];//Indices of objects
var objColor = [];//Color of objects
var objTexture = [];

var polyfinal;//Parsed Indices
var coordsfinal;//Parsed Vertices
var fnormals;//Calculated Flat Normals
var snormals;//Calculated Smooth Normals

var coorLoaded = false;//Check if coor file is loaded
var indexLoaded = false;//Check if poly file is loaded

//drawing methods
var vc = false;//ortho/perspective
var vs = false;//smooth
var wf = false;//wire frame
var spec = false;//specular
var sl = false;//spotlight
var so = true;//shading
var texOn = false;//Texture
var procTexOn = false;//Procedural Texture
var shine = 0.0;//specular amount

//Camera Bools
var cdm = false;//middle click
var cdl = false;//left click
var cdr = false;//right click

//Camera Translation From Mouse
var cTranslateX = 0;
var cTranslateY = 0;
var cTranslateZ = 0;

//Camera Rotation From Mouse
var rTranslateX = 0;
var rTranslateY = 0;
var rRotateX = -Math.PI/2;
var rRotateY = 0;

//object controls
var mwc = 0;//scale amount
var theta = 0;//rotate amount
var mTranslateX = 0;//translate x amount
var mTranslateY = 0;//translate y amount
var mTranslateZ = 0;//translate z amount

var selectedObject;

var mdl = false;//left click
var mdm = false;//middle click
var mdr = false;//right click
var ctrl = false;//Keydown control

var cube3Vertices = [
	[8],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1],[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1]
];

var cube3Indices = [
	[1,2,3],[1,3,4],[2,6,7],[2,7,3],[7,6,5],[7,5,8],[8,5,1],[8,1,4],[4,3,7],[4,7,8],[6,2,1],[6,1,5]
];

//https://codepen.io/qq99/pen/Ggrqrd

/* ========================================== SHADERS ========================================================= */
var VSHADER_SOURCE = 
	'uniform bool useOrtho;\n'+//perspective/ortho
	'uniform bool useTexture;\n'+//texture on/off
	
	'attribute vec4 a_position;\n'+//vertices
	
	'attribute vec2 a_texture;\n'+//texture
	'varying vec2 vTextureCoord;\n'+//texture
	
	'attribute vec3 a_normal;\n'+//normals
	'varying vec3 v_normal;\n'+
	
	'uniform vec3 u_lightWorldPosition;\n'+//global light
	'uniform vec3 u_viewWorldPosition;\n'+//from light
	
	'uniform vec3 u_spotLightPosition;\n'+//light position
	'uniform vec3 u_boxCenterPosition;\n'+//box position
	'varying vec3 v_spotLightDirection;\n'+//direction of light
	
	'uniform mat4 u_world;\n'+
	'uniform mat4 u_worldViewProjection;\n'+
	'uniform mat4 u_worldInverseTranspose;\n'+

	'varying vec3 v_surfaceToLight;\n'+
	'varying vec3 v_surfaceToView;\n'+

	'void main() {\n'+
	'	gl_Position = u_worldViewProjection * a_position;\n'+

	'	if(useTexture){\n'+//Texture on/off
	'		vTextureCoord = a_texture;\n'+//texture
	'	}\n'+
	
	'	if(useOrtho){\n'+
	'		v_normal = mat3(u_worldInverseTranspose) * a_normal;\n'+//pers
	'	}else{\n'+
	'		v_normal = mat3(u_worldInverseTranspose) * a_normal;\n'+//ortho	
	'	}\n'+
	
	'	vec3 surfaceWorldPosition = (u_world * a_position).xyz;\n'+
	'	v_surfaceToLight = u_lightWorldPosition - surfaceWorldPosition;\n'+
	'	v_surfaceToView = u_viewWorldPosition - surfaceWorldPosition;\n'+
	
	'	v_spotLightDirection = u_boxCenterPosition - u_spotLightPosition;\n'+
	'}\n';

var FSHADER_SOURCE = 
	'precision highp float;\n'+
	
	'#define PI 3.14159265358979323;\n'+
	
	'uniform bool useSpecular;\n'+ //bool for specular
	'uniform bool uShadeOn;\n'+ //bool for shader
	'uniform bool uspotLightOn;\n'+ //bool for spotlight
	'uniform bool uTextureOn;\n'+ //bool for texture
	'uniform bool uProceduralOn;\n'+//bool for Procedural Texture
	
	'varying vec2 vTextureCoord;\n'+//Texture
	'uniform sampler2D uSampler;\n'+ //Texture
	
	'varying vec3 v_normal;\n'+ //normals
	'varying vec3 v_surfaceToLight;\n'+ //global light
	
	'varying vec3 v_surfaceToView;\n'+ //Vector From Surface to View
	
	'uniform vec4 u_color;\n'+ //Object color
	'uniform float u_shininess;\n'+ //Specular Intensity
	
	'uniform vec3 u_lightColor;\n'+ //Global Light Color
	'uniform vec3 u_specularColor;\n'+ //Specular Color
	
	'varying vec3 v_spotLightDirection;\n'+ //spotlight
	
	'void main() {\n'+
	'	float light;\n'+
	'	vec3 normal = normalize(v_normal);\n'+
	
	'	vec3 surfaceToLightDirection = normalize(v_surfaceToLight);\n'+
	'	vec3 u_spotLightDirection = normalize(v_spotLightDirection);\n'+
	
	'	vec3 surfaceToViewDirection = normalize(v_surfaceToView);\n'+
	'	vec3 halfVector = normalize(surfaceToLightDirection + surfaceToViewDirection);\n'+
	'	vec3 halfVector2 = normalize(u_spotLightDirection + surfaceToViewDirection);\n'+
	
	'	if(uspotLightOn){\n'+ //Spotlight on/off
	'		light += max(dot(normal, u_spotLightDirection), 0.0);\n'+//spot light
	'	}\n'+
	
	'	light += dot(normal, surfaceToLightDirection);\n'+//global light
	'	light += dot(normal, vec3(.1,.1,.1));\n'+//ambient
	
	'	float specular = 0.0;\n'+
	'	float specular2 = 0.0;\n'+ //SpotLight
	
	'	if(light > 0.0){\n'+//Specular Intensity
	'		specular = pow(dot(normal, halfVector), u_shininess);\n'+
	'		specular2 = pow(dot(normal, halfVector2), u_shininess);\n'+
	'	}\n'+
	
	'	if(uTextureOn){\n'+//Texture on/off
	'		float rand = fract(sin(dot(vec2(1.0 - vTextureCoord.s, 1.0 - vTextureCoord.t) ,vec2(5.0,5.0))) * 43758.5453);\n'+
	'		if(uProceduralOn){\n'+//Procedural/ImageTexture
	'			vec2 pos = vTextureCoord.st;\n'+
	'			float feq = (1.0 + sin( (pos.x + rand / 2.0 ) * 50.0) ) / 2.0;\n'+
	'			float piRand = rand * PI;\n'+
	'			//float ang = pos.x * (1.0 - rand) + pos.y * rand;\n'+
	'			float ft = (1.0 - cos(rand)) * 0.5;\n'+
	'			float ang = pos.x * (1.0 - ft) + pos.y * ft;\n'+
	'			float dist = length(vTextureCoord);\n'+
	'			gl_FragColor = vec4(0.0, 10.0, 200.0, feq);\n'+
	'		}else{\n'+//Image Texture	
	'			gl_FragColor = texture2D(uSampler, vec2(vTextureCoord.s, vTextureCoord.t));\n'+//texture to color
	'		}\n'+
	'	}else{\n'+
	'		gl_FragColor = u_color;\n'+ //Original color
	'	}\n'+
	
	'	if(uShadeOn){\n'+//Light to Frag Color
	'		gl_FragColor.rgb *= light * vec3(1,1,1); //u_lightColor;\n'+//multiply labertian here
	'	}\n'+
	
		//spec on/off
	'	if(useSpecular){\n'+
	'		gl_FragColor.rgb += specular * u_specularColor;\n'+
	'		//gl_FragColor.rgb += specular2 * u_specularColor;\n'+
	'	}\n'+
	'}\n';
	
//Work in progress

var SHADOW_VSHADER_SOURCE = 
	'attribute vec4 a_Position;\n'+
	'uniform mat4 u_MvpMatrix;\n'+
	'void main() {\n'+
	'	gl_Position = u_MvpMatrix * a_Position;\n'+
	'}\n';

var SHADOW_FSHADER_SOURCE = 
	'precision mediump float;\n'+
	'void main() {\n'+
	'	const vec4 bitShift = vec4(1.0, 256.0, 256.0*256.0, 256.0*256.0*2256.0);\n'+
	'	const vec4 bitMask = vec4(1.0/256.0, 1.0/256.0, 1.0/256.0, 0.0);\n'+
	'	vec4 rgbaDepth = fract(gl_FragCoord.z * bitShift);\n'+
	'	rgbaDepth -= rgbaDepth.gbaa * bitMask;\n'+
	'	gl_FragColor = rgbaDepth;\n'+
	'}\n';


/* =================================== END OF SHADERS =========================================== */
	
/* ========================================= BEGIN DRAW SCENE ========================================== */
function drawScene(tt) {
	var boxCenter = calcCenter(orderedVerts[0]);
	var objCenter = calcCenter(orderedVerts[tt]);
	
	//set light location and color of object
	gl.uniform4fv(colorLocation, objColor[tt]);//set object color
	gl.uniform3fv(lightWorldPositionLocation, [0,0,400]);//set global light location
	gl.uniform1f(shininessLocation, (21-shine)*10);//send specular value to shader
	gl.uniform3fv(lightColorLocation, [1.0, .6, .6]);//send color of light to shader: this is for light2 currently disabled
	gl.uniform3fv(specularColorLocation, [1.0, 1.0, 1.0]);//send
	
	//Switch between Perspective and Ortho
	if(vc){//Perspective Camera
		gl.uniform3fv(lightWorldPositionLocation2, [-boxCenter[0], -boxCenter[1], boxCenter[2]]);
		gl.uniform3fv(boxCenterPosition, [-objCenter[0], -objCenter[1], objCenter[2]]);
		/* =========== Rotate Camera ============ */
		//Calculate rotation of camera
		//rRotateY is theta between x&z: theta(S)
		//rRotateX is theta between y&z: phi(T)
		//using formula found at:https://sidvind.com/wiki/Yaw,_pitch,_roll_camera
		//I think I only need to translate the Z of cam to center, but for consistency, I'm translating the whole camera
		var holdCam = [];
		//Hold the previous camera position
		holdCam[0] = camera[0];
		holdCam[1] = camera[1];
		holdCam[2] = camera[2];
		
		//Translate camera to center
		camera[0] = camera[0] - camera[0];
		camera[1] = camera[1] - camera[1];
		camera[2] = camera[2] - camera[2];
		
		//Parametrically set lookAt Postion for rotation based on mouse movement
		lookAt[0] = -holdCam[2]*Math.sin(rRotateY)*Math.sin(rRotateX);
		lookAt[1] = holdCam[2]*Math.cos(rRotateX);
		lookAt[2] = holdCam[2]*Math.cos(rRotateY)*Math.sin(rRotateX);
		
		//return the camera to original location
		camera[0] = holdCam[0];
		camera[1] = holdCam[1];
		camera[2] = holdCam[2];
		
		/* =========== Translate Camera =========== */
		//pan the camera by translating both the Camera position and lookAt position
		camera[0] += parseInt(cTranslateX);
		camera[1] += parseInt(cTranslateY);
		camera[2] += parseInt(cTranslateZ);
		
		//Traslate lookAt in relation to Camera
		lookAt[0] += camera[0];
		lookAt[1] += camera[1];
		lookAt[2] += camera[2];
		
		/* ======== Set Perspective Matrices ========== */
		//The camera matrix is generated here
		var cameraMatrix = makeLookAt(camera, lookAt, [0, 1, 0]);
		//The projection Matrix is generated here
		var worldViewProjectionMatrix = matrixMultiply(makeInverse(cameraMatrix), makePerspective(degToRad(fov), canvas.clientWidth/canvas.clientHeight, 1, 1000));
		//This is somewhat irrelevant and I don't know why I'm scared to remove it
		var worldInverseMatrix = makeInverse(makeYRotation(0));
		
		gl.uniformMatrix4fv(worldLocation, false, makeYRotation(0));//send world location to shader: set to 0,0,0
		gl.uniformMatrix4fv(worldViewProjectionLocation, false, worldViewProjectionMatrix);//send projection matrix to shader
		gl.uniformMatrix4fv(worldInverseTransposeLocation, false, worldInverseMatrix);//send world matrix to shader
		gl.uniform3fv(viewWorldPositionLocation, camera);//Send camera positions to shader
		
	}else{//Orthographic Camera	
		gl.uniform3fv(lightWorldPositionLocation2, [400-boxCenter[0], 400-boxCenter[1], boxCenter[2]]);
		gl.uniform3fv(boxCenterPosition, [400-objCenter[0], 400-objCenter[1], objCenter[2]]);
		var projectionMatrix = make2DProjection(canvas.clientWidth, canvas.clientHeight, 400);
		var orthoTransformation = matrixMultiply(makeYRotation(180*Math.PI/180) , makeZRotation(180*Math.PI/180));
		orthoTransformation = matrixMultiply(orthoTransformation, makeTranslation(-cTranslateX,cTranslateY,0));
		var worldViewProjectionMatrix = matrixMultiply(orthoTransformation, projectionMatrix);

		gl.uniformMatrix4fv(worldViewProjectionLocation, false, worldViewProjectionMatrix);
		gl.uniformMatrix4fv(worldLocation, false, projectionMatrix);
	}	
	
	if(wf){
		gl.drawArrays(gl.LINE_STRIP, 0, orderedVerts[tt].length/3);
		gl.flush();
	}else{
		gl.drawArrays(gl.TRIANGLES, 0, orderedVerts[tt].length/3);
		gl.flush();
	}
}

/* ========================================= END DRAW SCENE ========================================== */

/************************************START OF FILE OPEN AND RENDER OBJECT****************************************/

function fileOpen(files){
	var polyP = false;
	var coorP = false;
	for (var i = 0; i < files.length; i++) {         
		(function(file) {
			var reader = new FileReader();
			var type = file.name.substring(file.name.indexOf('.'),file.name.length);

			reader.onload = function(e) {  
				var text = e.target.result; 
				
				if(type == ".coor"){
					coordsfinal = parseVerts(text);
					coorLoaded = true;
				}
				if(type == ".poly"){
					polyfinal = parsePoly(text);
					indexLoaded = true;
				}
				if(coorLoaded && indexLoaded){
					coorLoaded = indexLoaded = false;
					
					fileToGL(coordsfinal, polyfinal);					
					main();
				}
			}
			reader.readAsText(file, "UTF-8");
		})(files[i]);
	}
}

//Transfer parsed coor and poly files to arrays
function fileToGL(vv, ii, scale){
	var matrix = new Float32Array([
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		0, 0, 0, 1
	]);
	
	var cpolys = createPolys(vv, ii);
	orderedVerts.push(buildVertices(cpolys[0]));
	orderedIndices.push(cpolys[1]);
	objTexture.push(cpolys[2]);
	
	var positions = orderedVerts[orderedVerts.length -1];
	
	var max = calcMax(positions);
	var persScale = 25;
	var setScale = 10;
	if(scale != null){
		setScale = scale;
	}
	
	var centers = calcCenter(positions);
	matrix = matrixMultiply(matrix, makeTranslation(-centers[0], -centers[1], -centers[2]));
	matrix = matrixMultiply(matrix, makeScale(1/(max/(setScale*persScale)),1/(max/(setScale*persScale)),1/(max/(setScale*persScale))));
	
	//For initial light box only
	if(scale != null){
		matrix = matrixMultiply(matrix, makeTranslation(50, 50, 50));
	}
	
	for (var ii = 0; ii < positions.length; ii += 3) {
		var vector = matrixVectorMultiply([positions[ii + 0], positions[ii + 1], positions[ii + 2], 1], matrix);
		positions[ii + 0] = vector[0];
		positions[ii + 1] = vector[1];
		positions[ii + 2] = vector[2];
	}
	
	orderedVerts[orderedVerts.length -1] = positions;
	
	var textureHold = [];
	var centers = calcCenter(orderedVerts[orderedVerts.length -1]);

	for(var i = 0; i<orderedVerts[orderedVerts.length -1].length; i+=3){
		var dir = [];
		var x = orderedVerts[orderedVerts.length -1][i] - centers[0]; //x
		var y = orderedVerts[orderedVerts.length -1][i+1] - centers[1]; //y
		var z = orderedVerts[orderedVerts.length -1][i+2] - centers[2]; //z
		
		dir.push(x);
		dir.push(y);
		dir.push(z);
		
		dir = normalize(dir);
		
		var u = 0.5 + Math.atan2(dir[0],dir[2])/Math.PI * 2.0;
		var v = 0.5 - Math.asin(dir[1])/Math.PI;
				
		textureHold.push(u);
		textureHold.push(v);
	}

	//var textureX = new Float32Array(textureHold);//
	objTexture[objTexture.length - 1] = new Float32Array(textureHold);
	
	
	if(scale == null){
		objColor.push([(orderedVerts.length*.1).toPrecision(1), 1, 0, 1]);
	}else{
		objColor.push([1, 0, 0, 1]);
	}
}

/************************************START MAIN AND DRAW*********************************************************/


//Initialize webgl and attach shader source variables to javascript variables
function initialize(){
	gl = canvas.getContext('webgl', {preserveDrawingBuffer: true});
	if (!gl) {
		return;
	}
	
	gl.enable(gl.CULL_FACE);
	gl.enable(gl.DEPTH_TEST);
	
	program = createProgram(gl, compileShader(gl, VSHADER_SOURCE, gl.VERTEX_SHADER), compileShader(gl, FSHADER_SOURCE, gl.FRAGMENT_SHADER));
	gl.useProgram(program);

	specOn = gl.getUniformLocation(program, "useSpecular"); //Specular Bool
	persOn = gl.getUniformLocation(program, "useOrtho"); //Ortho/Perspective bool
	shadingOn = gl.getUniformLocation(program, "uShadeOn"); //shading bool
	spotLightOn = gl.getUniformLocation(program, "uspotLightOn"); //spotlight bool
	textureOn = gl.getUniformLocation(program, "uTextureOn");//texture
	useTextureLocation = gl.getUniformLocation(program, "useTexture"); //Texture bool
	useProceduralTexture = gl.getUniformLocation(program, "uProceduralOn");
	
	positionLocation = gl.getAttribLocation(program, "a_position"); //positions
	normalLocation = gl.getAttribLocation(program, "a_normal");	//normal
	textureLocation = gl.getAttribLocation(program, "a_texture"); //texture

	lightColorLocation = gl.getUniformLocation(program, "u_lightColor");
	specularColorLocation = gl.getUniformLocation(program, "u_specularColor");
	
	worldLocation = gl.getUniformLocation(program, "u_world");
	worldViewProjectionLocation = gl.getUniformLocation(program, "u_worldViewProjection");
	colorLocation = gl.getUniformLocation(program, "u_color");
	worldInverseTransposeLocation = gl.getUniformLocation(program, "u_worldInverseTranspose");
	
	shininessLocation = gl.getUniformLocation(program, "u_shininess");
	lightWorldPositionLocation = gl.getUniformLocation(program, "u_lightWorldPosition");
	viewWorldPositionLocation = gl.getUniformLocation(program, "u_viewWorldPosition");
	
	lightWorldPositionLocation2 = gl.getUniformLocation(program, "u_spotLightPosition");//don't need?
	boxCenterPosition = gl.getUniformLocation(program, "u_boxCenterPosition");//Position of spotlight
}

//Texture Functions
//Information taken from http://learningwebgl.com/blog/?p=507

function initTexture(){
	var texture1 = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, texture1);
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));//in case image doesn't load

	
	var img = new Image();
	img.src = "images/tx3.jpg";
	
	img.addEventListener('load', function(){
		gl.bindTexture(gl.TEXTURE_2D, texture1);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
		if(isPowerOf2(img.width) && isPowerOf2(img.height)){
			gl.generateMipmap(gl.TEXTURE_2D);
		}else{
			gl.texParameteri(gl.TETXURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TETXURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TETXURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		}
	});
}

//Set the shaders on/off in shader source
function setShaderBool(i){
	gl.uniform1i(specOn, spec);
	gl.uniform1i(persOn, vc);
	gl.uniform1i(shadingOn, so);
	gl.uniform1i(textureOn, texOn);
	gl.uniform1i(useTextureLocation, texOn);
	gl.uniform1i(useProceduralTexture, procTexOn);
	if(i == 0){
		sl = false;
		gl.uniform1i(spotLightOn, false);
	}else{
		sl = true;
		gl.uniform1i(spotLightOn, true);
	}
	
}
/*******************************************************SET GEOMETRY************************************************************/
//For Transformation of Objects
function setGeometry(tt) {
	if(tt == selectedObject){
		var centers = calcCenter(orderedVerts[tt]);
		var matrix = new Float32Array([
			1, 0, 0, 0,
			0, 1, 0, 0,
			0, 0, 1, 0,
			0, 0, 0, 1
		]);

		if(mwc != 0){
			matrix = matrixMultiply(matrix, makeScale(mwc, mwc, mwc));//scale
			mwc = 0;
		}
		
		matrix = matrixMultiply(makeTranslation(-centers[0], -centers[1], -centers[2]), matrix);//move to center
		matrix = matrixMultiply(matrix, makeYRotation(theta));//rotate
		matrix = matrixMultiply(matrix, makeTranslation(centers[0], centers[1], centers[2]));//move back from center
		matrix = matrixMultiply(matrix, makeTranslation(mTranslateX, mTranslateY, mTranslateZ));//Mouse translation, Z translate here
		
		//Apply transformations
		for (var ii = 0; ii < orderedVerts[tt].length; ii += 3) {
			var vector = matrixVectorMultiply([orderedVerts[tt][ii + 0], orderedVerts[tt][ii + 1], orderedVerts[tt][ii + 2], 1], matrix);
			orderedVerts[tt][ii + 0] = vector[0];
			orderedVerts[tt][ii + 1] = vector[1];
			orderedVerts[tt][ii + 2] = vector[2];
		}
	}
	
	gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
	gl.enableVertexAttribArray(positionLocation);
	gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
	gl.bufferData(gl.ARRAY_BUFFER, orderedVerts[tt], gl.STATIC_DRAW);
}

//Re-Calculate and set new normals for objects
function setNormals(tt){
	fnormals = calcFlatNormals(orderedVerts[tt]);
	snormals = calcSmoothNormals(fnormals, orderedIndices[tt]);	

	gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
	gl.enableVertexAttribArray(normalLocation);
	gl.vertexAttribPointer(normalLocation, 3, gl.FLOAT, false, 0, 0);
	
	if(vs){
		gl.bufferData(gl.ARRAY_BUFFER, snormals, gl.STATIC_DRAW);
	}else{
		gl.bufferData(gl.ARRAY_BUFFER, fnormals, gl.STATIC_DRAW);
	}
}

//set textures for each object
//Start of environment mapping
function setTextures(tt){
	var textureHold = [];
	var centers = calcCenter(orderedVerts[tt]);

	/*For Environment Mapping
	for(var i = 0; i<orderedVerts[tt].length; i+=3){
		var dir = [];
		var x = orderedVerts[tt][i] - centers[0]; //x
		var y = orderedVerts[tt][i+1] - centers[1]; //y
		var z = orderedVerts[tt][i+2] - centers[2]; //z
		
		dir.push(x);
		dir.push(y);
		dir.push(z);
		
		dir = normalize(dir);
		
		var u = Math.asin(dir[0])/Math.PI + 0.5;
		var v = Math.asin(dir[1])/Math.PI + 0.5;
				
		textureHold.push(u);
		textureHold.push(v);
	}
	*/
	
	var textureX = new Float32Array(objTexture[tt]);
	gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
	gl.enableVertexAttribArray(textureLocation);
	gl.vertexAttribPointer(textureLocation, 2, gl.FLOAT, false, 0, 0);
	gl.bufferData(gl.ARRAY_BUFFER, textureX, gl.STATIC_DRAW);	
}

/* =================================== ONLOAD HTML && MAIN FUNCTIONS ====================================== */

function main(){//Main Graphics Loop	
	gl.clearColor(bg[0],bg[1],bg[2],bg[3]);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	for(var i = 0; i<orderedVerts.length; i++){
		setShaderBool(i);
		setGeometry(i);
		setNormals(i);
		setTextures(i);
		drawScene(i);
	}
}

$(document).ready(function(){//Run when HTML is finished loading
	canvas = document.getElementById("myc");
	fileToGL(cube3Vertices, cube3Indices, 1);
	
	initialize();
	initTexture();
	inputs();
	ui();
	
	//Issue with specular, switching vc on and off fixes issue for some reason...
	//LOOK INTO THIS
	vc = true;
	main();
	vc = false;
	main();

});

/* ========================================= UI && INITIAL ============================================= */
function ui(){
	$('body').mousedown(function(evt){if(evt.button==1)return false});
	$('canvas').bind('mousewheel DOMMouseScroll', function(evt){return false;});
	
	$("#showNote").click(function(){
		//$("#note").show();
		//$("#showNote").hide();
		//$("#uiBox").css({'height': 310 +'px'});
	});
	
	$("#showNote").hide();
	$("#textureProceduralSwitch").hide();
	
	$("#note").click(function(){
		//$("#note").hide();
		//$("#showNote").show();
		//$("#uiBox").css({'height': 180 +'px'});
	});
	
	$("#viewSelect").click(function(){
		if(vc){vc = false;}else{vc = true;}
		
		main();
		$(this).toggleClass('on');
	});
	
	$("#lightSelect").click(function(){
		if(spec){spec = false;}else{spec = true;}
		
		main();
		$(this).toggleClass('on');
	});
	
	$("#shadeSelect").click(function(){
		if(vs){vs = false;}else{vs = true;}
		
		main();
		$(this).toggleClass('on');
	});
	
	$("#wireFrame").click(function(){
		if(wf){wf = false;}else{wf = true;}

		main();
		$(this).toggleClass('on');
	});
	
	$("#textureSwitch").click(function(){
		if(texOn){
			texOn = false;
			if(procTexOn == true){
				$("textureProceduralSwitch").toggleClass('on');
			}
			procTexOn = false;
			$("#textureProceduralSwitch").hide();
		}else{
			texOn = true;
			$("#textureProceduralSwitch").show();
		};
		
		main();
		$(this).toggleClass('on');
	});
	
	$("#textureProceduralSwitch").click(function(){
		if(procTexOn){procTexOn = false;}else(procTexOn = true);
		
		main();
		$(this).toggleClass('on');
	});
	
	$("#slider-1").slider({
		step: 1,
		min: 0,
		max: 20,
		range: false,
		value: 0, 
		slide: function(evt, ui) {
			shine = ui.value;
			main();//////////////////////////////////////////////////////////////////////callig main
		}
	}).each(function(){	
		var vals = 20;
		for(var i = 0; i<= vals; i++){
			var el = $('<label>'+(i)+'</label>').css('left', (i/vals*100)+'%');
			$("#slider-1").append(el);
		}
	});
}

/* =================================== END OF UI && INITIAL =========================================== */

/* ======================================= MOUSE INPUTS =========================================================== */
function inputs(){
	var mcy = 0;
	var mcx = 0;
	var rcy = 0;
	var rcx = 0;
	
	window.addEventListener('keydown', function(evt){//keydown
		if(evt.key == 'Control'){
			ctrl = true;
		}
	});
	
	window.addEventListener('keyup', function(evt){//keyup
		if(evt.key == 'Control'){
			ctrl = false;
		}
	});
	
	canvas.addEventListener('mousedown', function(evt){//mousedown
		var spState = spec;
		var texState = texOn;
		var y = evt.clientY;
		var x = evt.clientX;
		
		if(evt.button === 0){//left click
			//turn shading off
			so = false;
			spec = false;
			texOn = false;
			
			main();
			
			//check if object or background is selected
			selectedObject = checkPixel(x, invertY(y), objColor);
			if(selectedObject != -1){
				mdl = true;
			}else{
				cdl = true;
			}
			
			//turn shading on
			so = true;
			spec = spState;
			texOn = texState;
			main();
			
			//set left mouse click position as last click postion for drag
			mcx = x;
			mcy = y;
		}
		if(evt.button === 1){//middle click
			//turn shading off
			so = false;
			spec = false;
			texOn = false
			main();
			
			//check if object or background is selected
			selectedObject = checkPixel(x, invertY(y), objColor);
			if(selectedObject != -1){
				mdm = true;
			}else{
				cdm = true;
			}
			
			//turn shading on
			so = true;
			spec = spState;
			texOn = texState;
			main();
		}
		if(evt.button === 2){//right click
			//turn shading off
			so = false;
			spec = false;
			texOn = false
			main();
			
			//check if object or background is selected
			selectedObject = checkPixel(x, invertY(y), objColor);
			if(selectedObject != -1){
				mdr = true;
			}else{
				cdr = true;
			}
			
			//turn shading on
			so = true;
			spec = spState;
			texOn = texState;
			main();
			
			rcx = x;
			rcy = y;
		}
	});
	
	canvas.addEventListener('mousemove', function(evt){//mouse move events
		var x = evt.clientX;
		var y = evt.clientY;
		
		if(mdl){//translate object	
			mTranslateX = ((x - mcx)*2).toPrecision(2);
			mTranslateY = ((mcy - y)*2).toPrecision(2);
			main();
			mTranslateX = 0;
			mTranslateY = 0;
			mcx = x;
			mcy = y;
		}
		
		if(mdr){//rotate object
			theta = ((x - rcx)/(canvas.width/4))*Math.PI;
			main();
			theta = 0;
			rcx = x;
			rcy = y;
		}
		
		if(cdl && vc){//translate camera
			cTranslateX = ((x - mcx)*2).toPrecision(2);
			cTranslateY = ((mcy - y)*2).toPrecision(2);
			main();
			cTranslateX = 0;
			cTranslateY = 0;
			mcx = x;
			mcy = y;
		}
		
		if(cdr && vc){//rotate camera
			var rSpeed = 4;//speed of rotation, greater is slower
			rRotateY += (((x - rcx)/(canvas.width/4))*Math.PI)/rSpeed;
			rRotateX += (((rcy - y)/(canvas.height/4))*Math.PI)/rSpeed;

			main();

			rcx = x;
			rcy = y;
		}
	});
	
	canvas.addEventListener('DOMMouseScroll', function(evt){//firefox: on scroll events
		if(mdm && vc && !ctrl){//move object in and out
			if(evt.detail === -3){
				mTranslateZ = 10;
				main();
			}
			if(evt.detail === 3){
				mTranslateZ = -10;
				main();
			}
			mTranslateZ = 0;
		}else if(cdm && vc && !ctrl){//move camera along the viewing coordinate frame
			if(evt.detail === -3){
				cTranslateZ = 10;
				main();
			}
			if(evt.detail === 3){
				cTranslateZ = -10;
				main();
			}
			cTranslateZ = 0;
		}else if(vc && !ctrl){//change fov
			if(evt.detail === -3){
				fov += 1;
				main();
			}
			if(evt.detail === 3){
				fov -= 1;
				main();
			}
		}else if(ctrl && mdm){//scale object
			if(evt.detail === -3){
				mwc = 1.1;
				main();
			}
			if(evt.detail === 3){
				mwc = .9;
				main();
			}
			mwc = 1;
		}
	});

	canvas.addEventListener('mousewheel', function(evt){//(work in progress)all other browsers: mouse scroll
		if(mdm){
			if(evt.wheelDelta === -120){
				mwc =1.1;
				main();
			}
			if(evt.wheelDelta === 120){
				mwc =.9;
				main();
			}
		}
		if(cdm){
			//
		}
	});
	
	canvas.addEventListener('mouseup', function(evt){//reset on mouseup
		if(evt.button === 0){
			mdl = false;
			cdl = false;
		}
		if(evt.button === 1){
			mdm = false;
			cdm = false;
		}
		if(evt.button === 2){
			mdr = false;
			cdr = false;
		}
	});
}

/* ========================================= END MOUSE INPUTS ========================================== */

/* =================================== PARSING FUNCTIONS ============================================== */
//parse coors file
function parseVerts(verts){
	var vhold = [];
	var i = 0;
	
	var len = parseFloat(verts.substring(i, verts.indexOf('\n', i)));
	i = verts.indexOf('\n') + 1;
	vhold.push([len]);
	
	while(verts[i]){
		var id = parseFloat(verts.substring(i,verts.indexOf(',', i)));
		i = verts.indexOf(',', i) + 1;
		
		var x = parseFloat(verts.substring(i,verts.indexOf(',', i)));
		i = verts.indexOf(',', i) + 1;
		
		var y = parseFloat(verts.substring(i,verts.indexOf(',', i)));
		i = verts.indexOf(',', i) + 1;
				
		var z = parseFloat(verts.substring(i,verts.indexOf('\n', i)));
		i = verts.indexOf('\n', i) + 1;
		
		vhold.push([x,y,z]);
		
		while(!isNumber(verts[i]) && verts[i]){
			i++
		}
	}

	return vhold;
}

//Parse poly file
function parsePoly(poly){
	var phold = [];
	var i = 0;
	
	var len = parseFloat(poly.substring(i, poly.indexOf('\n', i)));
	i = poly.indexOf('\n') + 1;
	
	while(poly[i]){
		var id = [];
		var rt = poly.indexOf('\n', i);
		var sp = poly.indexOf(' ', i);
		
		var skip = true;
		while(sp<rt && sp != -1 && sp+1 != rt){
			if(!skip){
				id.push(parseFloat(poly.substring(i,poly.indexOf(' ', i))));
			}else{
				skip = false;
			}

			i = poly.indexOf(' ', i) + 1;
			sp = poly.indexOf(' ', i);
		}
		
		id.push(parseFloat(poly.substring(i,rt)));
		i = poly.indexOf('\n', i) + 1;
		
		phold.push(id);
		
		while(!isLetter(poly[i]) && poly[i]){
			i++
		}
	}
	return phold;
}

/* =================================== END OF PARSING FUNCTIONS =========================================== */

//Boiler Plate compile shaders
function compileShader(gl, shaderSource, shaderType) {
	var shader = gl.createShader(shaderType);
	gl.shaderSource(shader, shaderSource);
	gl.compileShader(shader);
	var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
	if (!success) {
		throw "could not compile shader:" + gl.getShaderInfoLog(shader);
	}
	return shader;
}

//Boiler Plate attach shader to variable
function createProgram(gl, vertexShader, fragmentShader) {
	var program = gl.createProgram();
	gl.attachShader(program, vertexShader);
	gl.attachShader(program, fragmentShader);
	gl.linkProgram(program);
	var success = gl.getProgramParameter(program, gl.LINK_STATUS);
	if (!success) {
		throw ("program filed to link:" + gl.getProgramInfoLog (program));
	}
	return program;
};

/* =========== CHECK PIXEL =============== */
function checkPixel(x, y, objColor){
	var selectedPixel =[];
	var selectedObject = -1;
	var pixels = new Uint8Array(4);
	gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

	selectedPixel.push((pixels[0]/255).toPrecision(1));
	selectedPixel.push((pixels[1]/255).toPrecision(1));
	selectedPixel.push((pixels[2]/255).toPrecision(1));
	selectedPixel.push((pixels[3]/255).toPrecision(1));
	
	for(var i = 0; i<objColor.length; i++){

		if(selectedPixel[0] == objColor[i][0] && selectedPixel[1] == objColor[i][1] && selectedPixel[2] == objColor[i][2] && selectedPixel[3] == objColor[i][3]){
			selectedObject = i;
		}
	}
	
	return selectedObject;
}

function isPowerOf2(value){
	return (value & (value - 1)) == 0;
}

/* ============= CALC POLY AND NORMALS ===============*/
function createPolys(verts, indics){
	var vfinal = [];
	var hold = [];
	var iv = [];
	var texPoly = [];

	for(var i = 0; i<indics.length; i++){
		//var vertCount = indics[i].length - 2;	
		var vertCount = indics[i].length-2;
		for(var j = 0; j<vertCount; j++){
			iv.push(indics[i][0]);
			iv.push(indics[i][j+1]);
			iv.push(indics[i][j+2]);
			
			hold.push(verts[indics[i][0]]);
			hold.push(verts[indics[i][1+j]]);
			hold.push(verts[indics[i][2+j]]);
		}	
		vfinal.push(hold);
		hold = [];
	}
	
	hold.push(vfinal);
	hold.push(iv);
	hold.push(texPoly);
	return hold;
}

function calcFandSnormals(positions, indices){
	var normals = [];
	var snormals = [];
	var subVert = [];
	var sn = [0];
	var ncnt = 0;
	var indexCount = 0;
	
	for(var i = 0; i<positions.length; i++){
		
		var a = positions[i][0];
		var b = positions[i][1];
		var c = positions[i][2];
		
		var U = [b[0]-a[0], b[1]-a[1], b[2]-a[2]];
		var V = [c[0]-a[0], c[1]-a[1], c[2]-a[2]];
		
		var n = [U[1]*V[2] - V[1]*U[2], V[0]*U[2] - U[0]*V[2], U[0]*V[1] - V[0]*U[1]];
		
		n = normalize(n);
		
		for(var j = 0; j<positions[i].length; j++){
			
			normals.push([n[0], n[1], n[2]]);
			
			if(sn[indices[ncnt]] == null){
				sn[indices[ncnt]] = [0,0,0];
			}	
			
			sn[indices[ncnt]][0] += normals[ncnt][0];
			sn[indices[ncnt]][1] += normals[ncnt][1];			
			sn[indices[ncnt]][2] += normals[ncnt][2];
			
			ncnt++;
		}
	}
		
	ncnt = 0;
	for(var i = 0; i<positions.length; i++){
		for(var j = 0; j<positions[i].length; j++){
			if(snormals[ncnt] == null){
				snormals[ncnt] = [];
				sn[indices[ncnt]] = normalize(sn[indices[ncnt]]);
			}
			snormals[ncnt][0] = sn[indices[ncnt]][0];
			snormals[ncnt][1] = sn[indices[ncnt]][1];			
			snormals[ncnt][2] = sn[indices[ncnt]][2];
			ncnt++;
		}
	}
	
	var jxp = [];
	jxp.push(normals);
	jxp.push(snormals);
	return jxp;
}

function calcFlatNormals(positions){
	
	var normals = [];
	
	for(var i = 0; i<positions.length; i+=9){
		var a = [positions[i],positions[i+1],positions[i+2]];
		var b = [positions[i+3],positions[i+4],positions[i+5]];
		var c = [positions[i+6],positions[i+7],positions[i+8]];
		
		var U = [b[0]-a[0], b[1]-a[1], b[2]-a[2]];
		var V = [c[0]-a[0], c[1]-a[1], c[2]-a[2]];
		
		var n = [U[1]*V[2] - V[1]*U[2], V[0]*U[2] - U[0]*V[2], U[0]*V[1] - V[0]*U[1]];
		n = normalize(n);
		
		normals.push(n[0]);
		normals.push(n[1]);
		normals.push(n[2]);
		
		normals.push(n[0]);
		normals.push(n[1]);
		normals.push(n[2]);
		
		normals.push(n[0]);
		normals.push(n[1]);
		normals.push(n[2]);
	}
	
	return new Float32Array(normals);
}

function calcSmoothNormals(unormals, indices){
	var fxnormals = unormals;
	var snormals = [];
	var fsum = [];
	
	for(var i = 0; i<indices.length; i++){
		if(fsum[indices[i]] == null){
			fsum[indices[i]] = [0, 0, 0];
		}
		fsum[indices[i]][0] += fxnormals[i*3];
		fsum[indices[i]][1] += fxnormals[i*3+1];
		fsum[indices[i]][2] += fxnormals[i*3+2];
	}

	for(var i = 0; i<indices.length; i++){
		var nx = normalize(fsum[indices[i]]);
		snormals.push(nx[0]);
		snormals.push(nx[1]);
		snormals.push(nx[2]);
	}

	return new Float32Array(snormals);
}

function buildNormals(normals){
	var hold = [];
	
	for(var i = 0; i<normals.length; i++){
		
		hold.push(normals[i][0], normals[i][1], normals[i][2]);
	}
	var fnm = new Float32Array(hold);
	return fnm;
}

function buildVertices(polys){
	var hold = []

	for(var i = 0; i<polys.length; i++){
		for(var j = 0; j<polys[i].length; j++){
			for(var k = 0; k<polys[i][j].length; k++){
				hold.push(polys[i][j][k]);
			}
		}
	}
	return new Float32Array(hold);
}

function unwind2d(a){
	var hold = [];
	for(var i = 0; i<a.length; i++){
		for(var j = 0; j<a[i].length; j++){
			hold.push(a[i][j]);
		}
	}
	return new Float32Array(hold);
}

/* ================== MATRIX OPERATIONS =================== */		
function radToDeg(r) {
	return r * 180 / Math.PI;
}

function degToRad(d) {
	return d * Math.PI / 180;
}

function makeTranslation(tx, ty, tz) {
	return [
		1,  0,  0,  0,
		0,  1,  0,  0,
		0,  0,  1,  0,
		tx, ty, tz, 1
	];
}

function makeXRotation(angleInRadians) {
	var c = Math.cos(angleInRadians);
	var s = Math.sin(angleInRadians);

	return [
		1, 0, 0, 0,
		0, c, s, 0,
		0, -s, c, 0,
		0, 0, 0, 1
	];
};

function makeYRotation(angleInRadians) {
	var c = Math.cos(angleInRadians);
	var s = Math.sin(angleInRadians);

	return [
		c, 0, -s, 0,
		0, 1, 0, 0,
		s, 0, c, 0,
		0, 0, 0, 1
	];
};

function makeZRotation(angleInRadians) {
	var c = Math.cos(angleInRadians);
	var s = Math.sin(angleInRadians);
	
	return [
		 c, s, 0, 0,
		-s, c, 0, 0,
		 0, 0, 1, 0,
		 0, 0, 0, 1
	];
}

function makeScale(sx, sy, sz) {
	return [
		sx, 0,  0,  0,
		0, sy,  0,  0,
		0,  0, sz,  0,
		0,  0,  0,  1
	];
}

function scale(positions, scaling){
	for(var j = 0; j<positions.length; j++){
		positions[j] = positions[j]/scaling;
	}
}

function matrixVectorMultiply(v, m) {
	var dst = [];
	for (var i = 0; i < 4; ++i) {
		dst[i] = 0.0;
		
		for (var j = 0; j < 4; ++j)
			dst[i] += v[j] * m[j * 4 + i];
	}
	return dst;
}

function subtractVectors(a, b) {
	return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function normalize(v) {
	var length = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
	if (length > 0.00001) {
		return [v[0] / length, v[1] / length, v[2] / length];
	} else {
		return [0, 0, 0];
	}
}

function cross(a, b) {
	return [a[1] * b[2] - a[2] * b[1],
			a[2] * b[0] - a[0] * b[2],
			a[0] * b[1] - a[1] * b[0]];
}

function negate(v) {
	return [-v[0], -v[1], -v[2]];
}

/*================== CENTER FUNCTIONS ====================*/
function calcMax(positions){
	var max = positions[0];
	for(var k = 0; k<positions.length; k++){
		if(max < Math.abs(positions[k])){
			max = Math.abs(positions[k]);
		}
	}
	return max;
}

function calcCenter(positions){

	var xmax = positions[0];
	var xmin = positions[0];
	var ymax = positions[1];
	var ymin = positions[1];
	var zmax = positions[2];
	var zmin = positions[2];
		
	for(var j = 0; j<positions.length; j+=3){
		if(xmax < positions[j]){
			xmax = positions[j];
		}
		if(xmin > positions[j]){
			xmin = positions[j];
		}
		if(ymax < positions[j+1]){
			ymax = positions[j+1];
		}
		if(ymin > positions[j+1]){
			ymin = positions[j+1];
		}
		if(zmax < positions[j+2]){
			zmax = positions[j+2];
		}
		if(zmin > positions[j+2]){
			zmin = positions[j+2];
		}
	}

	return [(xmax + xmin)/2, (ymax + ymin)/2, (zmax + zmin)/2];
}

function calcXMin(positions){
	var xmin = positions[0]; 

	for(var j = 0; j<positions.length; j+=3){
		if(xmin > positions[j]){
			xmin = positions[j];
		}
	}
	return xmin;
}

function calcXMax(positions){
	var xmax = positions[0]; 

	for(var j = 0; j<positions.length; j+=3){
		if(xmax < positions[j]){
			xmax = positions[j];
		}
	}
	return xmax;
}

/* ================ TRANSPOSE MULTIPLY INVERSE FUNCTIONS ============ */

function makeTranspose(m){
	return [
		m[0],m[4],m[8],m[12],
		m[1],m[5],m[9],m[13],
		m[2],m[6],m[10],m[14],
		m[3],m[7],m[11],m[15]
	];
}

function matrixMultiply(a, b) {
  var a00 = a[0*4+0];
  var a01 = a[0*4+1];
  var a02 = a[0*4+2];
  var a03 = a[0*4+3];
  var a10 = a[1*4+0];
  var a11 = a[1*4+1];
  var a12 = a[1*4+2];
  var a13 = a[1*4+3];
  var a20 = a[2*4+0];
  var a21 = a[2*4+1];
  var a22 = a[2*4+2];
  var a23 = a[2*4+3];
  var a30 = a[3*4+0];
  var a31 = a[3*4+1];
  var a32 = a[3*4+2];
  var a33 = a[3*4+3];
  var b00 = b[0*4+0];
  var b01 = b[0*4+1];
  var b02 = b[0*4+2];
  var b03 = b[0*4+3];
  var b10 = b[1*4+0];
  var b11 = b[1*4+1];
  var b12 = b[1*4+2];
  var b13 = b[1*4+3];
  var b20 = b[2*4+0];
  var b21 = b[2*4+1];
  var b22 = b[2*4+2];
  var b23 = b[2*4+3];
  var b30 = b[3*4+0];
  var b31 = b[3*4+1];
  var b32 = b[3*4+2];
  var b33 = b[3*4+3];
  return [a00 * b00 + a01 * b10 + a02 * b20 + a03 * b30,
          a00 * b01 + a01 * b11 + a02 * b21 + a03 * b31,
          a00 * b02 + a01 * b12 + a02 * b22 + a03 * b32,
          a00 * b03 + a01 * b13 + a02 * b23 + a03 * b33,
          a10 * b00 + a11 * b10 + a12 * b20 + a13 * b30,
          a10 * b01 + a11 * b11 + a12 * b21 + a13 * b31,
          a10 * b02 + a11 * b12 + a12 * b22 + a13 * b32,
          a10 * b03 + a11 * b13 + a12 * b23 + a13 * b33,
          a20 * b00 + a21 * b10 + a22 * b20 + a23 * b30,
          a20 * b01 + a21 * b11 + a22 * b21 + a23 * b31,
          a20 * b02 + a21 * b12 + a22 * b22 + a23 * b32,
          a20 * b03 + a21 * b13 + a22 * b23 + a23 * b33,
          a30 * b00 + a31 * b10 + a32 * b20 + a33 * b30,
          a30 * b01 + a31 * b11 + a32 * b21 + a33 * b31,
          a30 * b02 + a31 * b12 + a32 * b22 + a33 * b32,
          a30 * b03 + a31 * b13 + a32 * b23 + a33 * b33];
}

function makeInverse(m) {
  var m00 = m[0 * 4 + 0];
  var m01 = m[0 * 4 + 1];
  var m02 = m[0 * 4 + 2];
  var m03 = m[0 * 4 + 3];
  var m10 = m[1 * 4 + 0];
  var m11 = m[1 * 4 + 1];
  var m12 = m[1 * 4 + 2];
  var m13 = m[1 * 4 + 3];
  var m20 = m[2 * 4 + 0];
  var m21 = m[2 * 4 + 1];
  var m22 = m[2 * 4 + 2];
  var m23 = m[2 * 4 + 3];
  var m30 = m[3 * 4 + 0];
  var m31 = m[3 * 4 + 1];
  var m32 = m[3 * 4 + 2];
  var m33 = m[3 * 4 + 3];
  var tmp_0  = m22 * m33;
  var tmp_1  = m32 * m23;
  var tmp_2  = m12 * m33;
  var tmp_3  = m32 * m13;
  var tmp_4  = m12 * m23;
  var tmp_5  = m22 * m13;
  var tmp_6  = m02 * m33;
  var tmp_7  = m32 * m03;
  var tmp_8  = m02 * m23;
  var tmp_9  = m22 * m03;
  var tmp_10 = m02 * m13;
  var tmp_11 = m12 * m03;
  var tmp_12 = m20 * m31;
  var tmp_13 = m30 * m21;
  var tmp_14 = m10 * m31;
  var tmp_15 = m30 * m11;
  var tmp_16 = m10 * m21;
  var tmp_17 = m20 * m11;
  var tmp_18 = m00 * m31;
  var tmp_19 = m30 * m01;
  var tmp_20 = m00 * m21;
  var tmp_21 = m20 * m01;
  var tmp_22 = m00 * m11;
  var tmp_23 = m10 * m01;

  var t0 = (tmp_0 * m11 + tmp_3 * m21 + tmp_4 * m31) -
      (tmp_1 * m11 + tmp_2 * m21 + tmp_5 * m31);
  var t1 = (tmp_1 * m01 + tmp_6 * m21 + tmp_9 * m31) -
      (tmp_0 * m01 + tmp_7 * m21 + tmp_8 * m31);
  var t2 = (tmp_2 * m01 + tmp_7 * m11 + tmp_10 * m31) -
      (tmp_3 * m01 + tmp_6 * m11 + tmp_11 * m31);
  var t3 = (tmp_5 * m01 + tmp_8 * m11 + tmp_11 * m21) -
      (tmp_4 * m01 + tmp_9 * m11 + tmp_10 * m21);

  var d = 1.0 / (m00 * t0 + m10 * t1 + m20 * t2 + m30 * t3);

  return [
    d * t0,
    d * t1,
    d * t2,
    d * t3,
    d * ((tmp_1 * m10 + tmp_2 * m20 + tmp_5 * m30) -
          (tmp_0 * m10 + tmp_3 * m20 + tmp_4 * m30)),
    d * ((tmp_0 * m00 + tmp_7 * m20 + tmp_8 * m30) -
          (tmp_1 * m00 + tmp_6 * m20 + tmp_9 * m30)),
    d * ((tmp_3 * m00 + tmp_6 * m10 + tmp_11 * m30) -
          (tmp_2 * m00 + tmp_7 * m10 + tmp_10 * m30)),
    d * ((tmp_4 * m00 + tmp_9 * m10 + tmp_10 * m20) -
          (tmp_5 * m00 + tmp_8 * m10 + tmp_11 * m20)),
    d * ((tmp_12 * m13 + tmp_15 * m23 + tmp_16 * m33) -
          (tmp_13 * m13 + tmp_14 * m23 + tmp_17 * m33)),
    d * ((tmp_13 * m03 + tmp_18 * m23 + tmp_21 * m33) -
          (tmp_12 * m03 + tmp_19 * m23 + tmp_20 * m33)),
    d * ((tmp_14 * m03 + tmp_19 * m13 + tmp_22 * m33) -
          (tmp_15 * m03 + tmp_18 * m13 + tmp_23 * m33)),
    d * ((tmp_17 * m03 + tmp_20 * m13 + tmp_23 * m23) -
          (tmp_16 * m03 + tmp_21 * m13 + tmp_22 * m23)),
    d * ((tmp_14 * m22 + tmp_17 * m32 + tmp_13 * m12) -
          (tmp_16 * m32 + tmp_12 * m12 + tmp_15 * m22)),
    d * ((tmp_20 * m32 + tmp_12 * m02 + tmp_19 * m22) -
          (tmp_18 * m22 + tmp_21 * m32 + tmp_13 * m02)),
    d * ((tmp_18 * m12 + tmp_23 * m32 + tmp_15 * m02) -
          (tmp_22 * m32 + tmp_14 * m02 + tmp_19 * m12)),
    d * ((tmp_22 * m22 + tmp_16 * m02 + tmp_21 * m12) -
          (tmp_20 * m12 + tmp_23 * m22 + tmp_17 * m02))
  ];
}

/* ============================ CAMERA FUNCTIONS =====================*/
function makeLookAt(cameraPosition, target, up) {
  var zAxis = normalize(subtractVectors(cameraPosition, target));
  var xAxis = cross(up, zAxis);
  var yAxis = cross(zAxis, xAxis);

  return [
     xAxis[0], xAxis[1], xAxis[2], 0,
     yAxis[0], yAxis[1], yAxis[2], 0,
     zAxis[0], zAxis[1], zAxis[2], 0,
     cameraPosition[0],cameraPosition[1],cameraPosition[2],1
	 ];
}

function makePerspective(fieldOfViewInRadians, aspect, near, far) {
  var f = Math.tan(Math.PI * 0.5 - 0.5 * fieldOfViewInRadians);
  var rangeInv = 1.0 / (near - far);

  return [
    f / aspect, 0, 0, 0,
    0, f / aspect, 0, 0,
    0, 0, (near + far) * rangeInv, -1,
    0, 0, near * far * rangeInv * 2, 0
  ];
}

function make2DProjection(width, height, depth) {
  return [
     1 / width, 0, 0, 0,
     0, -1 / height, 0, 0,
     0, 0, 1 / depth, 0,
    0, 0, 0, 1,
  ];
}

/* ====================== CHECK TYPE FUNCTIONS ================== */
function isLetter(str) {
	if(str == null)
		return false;
	return str.length === 1 && str.match(/[a-z]/i);
}

function isNumber(str) {
	if(str == null)
		return false;
	return str.length === 1 && str.match(/[0-9]/i);
}

//For solving issue of inverted y axis on color picking
function invertY(y){
	if(y<0){
		y = y*-2;
	}
	if(y === 0){
		y = 200;
	}
	if(y > 0){
		y = 200 - (y - 200);
	}
	return y;
}