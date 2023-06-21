let extId;

let video;
let canvasElementSegmentation, canvasElement, canvasTmp;
let canvasCtxSeg, canvasCtx, canvasTmpCtx;

let gestureRecognizer, imageSegmenter;
let drawing;
let stream_settings;
let HAND_CONNECTIONS = [
    { start: 0, end: 1},
    { start: 1, end: 2},
    { start: 2, end: 3},
    { start: 3, end: 4},
    { start: 0, end: 5},
    { start: 5, end: 6},
    { start: 6, end: 7},
    { start: 7, end: 8},
    { start: 5, end: 9},
    { start: 9, end: 10},
    { start: 10, end: 11},
    { start: 11, end: 12},
    { start: 9, end: 13},
    { start: 13, end: 14},
    { start: 14, end: 15},
    { start: 15, end: 16},
    { start: 13, end: 17},
    { start: 0, end: 17},
    { start: 17, end: 18},
    { start: 18, end: 19},
    { start: 19, end: 20}
]
let gestureEstimator;
let handAction = {
    Left: {
        actionState: "IDLE",
        actionParam: {},
    },
    Right: {
        actionState: "IDLE",
        actionParam: {},
    }
};

clickOption = {
    clickDualTime: 1000,
    clickMaxTime: 500,
    clickMaxRange: 150
};

let rectClickSizeX = 50;
let rectClickSizeY = 50;
let rectClickBorderSize = 2;
let mouseClickSpace = 6;

init();

async function init() {
    
    console.log( 'Init Gesture' );
    initDocument();
    initMediapipe();
    initFingerPose();
    enableCam();

}

function initDocument() {

    document.body.style.overflowX = "hidden";

    let camContainer = document.createElement('div');
    camContainer.style = "position: fixed; left: 0px; top: 0px; z-index: 10000;";
    document.body.appendChild( camContainer );
    
    video = document.createElement( 'video' );
    video.autoplay = true;
    video.playsinline = true;
    video.id = "webcam";
    video.width  = 1224;
    video.height = 768;
    video.style = "position: absolute; left: 0px; top: 0px; transform: scaleX(-1); display: none;";
    
    camContainer.appendChild( video );
    
    canvasElementSegmentation = document.createElement( 'canvas' );
    canvasElementSegmentation.id = "segmentation_canvas";
    canvasElementSegmentation.class = "segmentation_canvas";
    canvasElementSegmentation.width  = 1280;
    canvasElementSegmentation.height = 720;
    canvasElementSegmentation.style = "position: absolute; left: 0px; top: 0px; transform: scaleX(-1); pointer-events: none;"
    camContainer.appendChild( canvasElementSegmentation );
    canvasCtxSeg = canvasElementSegmentation.getContext( "2d" );
    
    canvasElement = document.createElement( 'canvas' );
    canvasElement.id = "output_canvas";
    canvasElement.class = "output_canvas";
    canvasElement.width  = 1280;
    canvasElement.height = 720;
    canvasElement.style = "position: absolute; left: 0px; top: 0px; transform: scaleX(-1); pointer-events: none;"
    camContainer.appendChild( canvasElement );
    canvasCtx = canvasElement.getContext( "2d" );
    
    
    canvasTmp = document.createElement( 'canvas' );
    canvasTmp.id = "tmp_canvas";
    canvasTmp.class = "tmp_canvas";
    canvasTmp.width  = 1280;
    canvasTmp.height = 720;
    canvasTmp.style = "position: absolute; left: 0px; top: 0px; transform: scaleX(-1); pointer-events: none; display: none;"
    camContainer.appendChild( canvasTmp );
    canvasTmpCtx = canvasTmp.getContext( "2d" );
    
    
    extId = document.querySelector('[data-gesture]');
    extId = extId.getAttribute('data-runtime-id');
    console.log( extId );

}

async function initMediapipe() {

    vision = await FilesetResolver.forVisionTasks(
        `chrome-extension://${extId}/scripts`
    );
    
    // Hand
    gestureRecognizer = await GestureRecognizer.createFromOptions( vision, {
        baseOptions: {
            modelAssetPath: `chrome-extension://${extId}/models/gesture_recognizer.task`,
            delegate: "GPU"
        },
        numHands: 2,
        runningMode: "video"
    });

    // Segmenter
    imageSegmenter = await ImageSegmenter.createFromOptions( vision, {
        baseOptions: {
            // modelAssetPath: `chrome-extension://${extId}/models/deeplab_v3.tflite`,
            // modelAssetPath: `chrome-extension://${extId}/models/selfie_segmenter.tflite`,
            modelAssetPath: `chrome-extension://${extId}/models/selfie_segmenter_landscape.tflite`,
            delegate: "GPU"
        },
        runningMode: "video",
        outputCategoryMask: true,
        outputConfidenceMasks: false
    });

    drawing = new DrawingUtils( canvasCtx );

}

function initFingerPose() {
    
    // FingerPose
    const knownGestures = [
        closedFistGestureDescription,
        pointingGestureDescription,
        OpenoalmGestureDescription
    ];
    gestureEstimator = new GestureEstimator( knownGestures );

}

async function enableCam() {

    // let camera1Id = "";

    // if (!navigator.mediaDevices?.enumerateDevices) {

    //     console.log("enumerateDevices() not supported.");

    // } else {
    //     // List cameras and microphones.
    //     navigator.mediaDevices
    //     .enumerateDevices()
    //     .then((devices) => {
    //         devices.forEach((device) => {
                
    //             console.log(`${device.kind}: ${device.label} id = ${device.deviceId}`);
    //             if( device.kind === "videoinput" & device.label !== "OBS Virtual Camera" ) {

    //                 camera1Id = device.deviceId;
    //                 console.log( camera1Id );

    //             }
    //         });
    //     })
    //     .catch((err) => {

    //         console.error(`${err.name}: ${err.message}`);

    //     });
    //   }

    // if ( !gestureRecognizer ) {

    //   alert( "Please wait for gestureRecognizer to load" );
    //   return;
    // }
  
    // getUsermedia parameters.
    // console.log( window.innerWidth );
    const constraints = {
        video: {
            // deviceId: camera1Id,
            width: window.innerWidth,
            // height: window.innerHeight,
        },
    };

  
    // Activate the webcam stream.
    let stream = await navigator.mediaDevices.getUserMedia(constraints);
    stream_settings = stream.getVideoTracks()[0].getSettings();
    startStream( stream, stream_settings );

}

function startStream( stream, stream_settings ) {

    // video.height = window.innerHeight;
    // video.width = Math.floor( window.innerHeight * stream_settings.aspectRatio );

    console.log( stream_settings );
    video.height = Math.floor( window.innerWidth / stream_settings.aspectRatio );
    video.width = window.innerWidth;
    
    const webcamElement = document.getElementById( "webcam" );

    // video.videoHeight =  video.height;
    // video.videoWidth =  video.width;
    canvasElement.height = video.height;
    canvasElement.width = video.width;
    webcamElement.height = video.height;
    webcamElement.width = video.width;
    canvasElementSegmentation.height = video.height;
    canvasElementSegmentation.width = video.width;
    // let scale = window.innerWidth / stream_settings.width;
    // canvasCtxSeg.scale(scale, scale);

    video.srcObject = stream;
    video.addEventListener("loadeddata", predictWebcam);

}

async function predictWebcam() {

    // Hand
    let nowInMs = Date.now();
    const resultsGesture = gestureRecognizer.recognizeForVideo( video, nowInMs );
  
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    drawHands( resultsGesture );
    canvasCtx.restore();

    // Selfie Segmenter
    imageSegmenter.segmentForVideo( video, nowInMs, callbackForVideo );
  
    // Handle Action
    for ( let i = 0; i < resultsGesture.handednesses.length; i++ ) {

        actionHandler(
            // resultsGesture.gestures[ i ][ 0 ],
            resultsGesture.landmarks[ i ],
            resultsGesture.handednesses[ i ][ 0 ]
        );

    }
    
    window.requestAnimationFrame( predictWebcam );

}

function drawHands( results ) {

    const webcamElement = document.getElementById( "webcam" );

    let colorRight = "rgba(0, 255, 0, 0.5)";
    let colorLeft = "rgba(255, 0, 0, 0.5)";
    let color = "rgba(0, 0, 0, 0.5)";

    for ( let i = 0; i < results.handednesses.length; i++ ) {

        if ( results.handednesses[ i ][ 0 ].categoryName === "Right" ) {

            color = colorRight;

        } else if ( results.handednesses[ i ][ 0 ].categoryName === "Left" ) {

            color = colorLeft;

        }

        drawing.drawConnectors( results.landmarks[ i ], HAND_CONNECTIONS, {
            color: color,
            lineWidth: 5
        });

        drawing.drawLandmarks( results.landmarks[ i ], { color: "#FFF", lineWidth: 2 });

    }

}

const legendColors = [
    [255, 197, 0, 0], // Vivid Yellow
    [0, 161, 194, 0.8], // Vivid Blue
];           

function callbackForVideo( result ) {
    
    canvasTmp.width = video.videoWidth;
    canvasTmp.height = video.videoHeight;
    
    canvasTmpCtx.clearRect(0, 0, canvasTmp.width, canvasTmp.height);
    canvasTmpCtx.drawImage( video, 0, 0, video.videoWidth, video.videoHeight );
    let imageData = canvasTmpCtx.getImageData(
        0,
        0,
        video.videoWidth,
        video.videoHeight
    ).data;

    const mask = result.categoryMask.getAsFloat32Array();

    let j = 0;
    for (let i = 0; i < mask.length; ++i) {

        const maskVal = Math.round(mask[i] * 255.0);
        const legendColor = legendColors[maskVal % legendColors.length];
        // imageData[j + 0] = legendColor[0] * imageData[j + 0];
        // imageData[j + 1] = legendColor[1] * imageData[j + 1];
        // imageData[j + 2] = legendColor[2] * imageData[j + 2];
        imageData[j + 3] = legendColor[3] * imageData[j + 3];
        j += 4;

    }

    const uint8Array = new Uint8ClampedArray(imageData.buffer);
    const dataNew = new ImageData(
        uint8Array,
        video.videoWidth,
        video.videoHeight
    );

    // canvasTmp.width = dataNew.width;
    // canvasTmp.height = dataNew.height;
    canvasTmpCtx.putImageData( dataNew, 0, 0 );
    canvasCtxSeg.clearRect(0, 0, canvasElementSegmentation.width, canvasElementSegmentation.height);
    canvasCtxSeg.drawImage( canvasTmp, 0, 0, video.width, video.height );

    // let scale = window.innerWidth / stream_settings.width;

    // canvasCtxSeg.putImageData( dataNew, 0, 0 );
    // canvasCtxSeg.drawImage( canvasElementSegmentation, 0, 0, video.videoWidth, video.videoHeight,
    //     0, 0, video.width, video.height );

    // canvasCtxSeg.putImageData(dataNew, 0, 0, 0, 0, video.width, video.height );

}
  
function actionHandler( landmarks, handednesses ) {

    // Gesture Estimator
    const est = gestureEstimator.estimate( landmarks, 9 );

    let gesture = {
        name: "None"
    }

    if ( est.gestures.length > 0 ) {

        // find gesture with highest match score
        gesture = est.gestures.reduce((p, c) => {
            return (p.score > c.score) ? p : c
        });
        // console.log( gesture );

    }
    

    // console.log( landmarks );
    // console.log( fingerEst.estimate( landmarks ).curls );

    switch( gesture.name ) {

        case "Closed_Fist": {

            // console.log( "Closed_Fist" );
            closedFistHandler( landmarks, handednesses.categoryName );
            break;

        }

        case "Pointing": {

            // console.log( "Pointing" );
            pointingHandler( landmarks, handednesses.categoryName );
            break;
            
        }

        case "Open_Palm":
        case "None": {

            // console.log( "Open_Palm" );
            openPalmHandler( handednesses.categoryName );
            break;
            
        }

    }

}

function openPalmHandler( handedness ) {

    switch ( handAction[ handedness ].actionState ) {

        case "IDLE": {

            break;

        }

        case "SCROLL":
        case "HOVER": {

            handAction[ handedness ].actionState = "IDLE";
            handAction[ handedness ].actionParam = {};
            break;

        };

    }

}

function closedFistHandler( landmarks, handedness ) {

    switch ( handAction[ handedness ].actionState ) {

        case "IDLE": 
        case "HOVER": {

            handAction[ handedness ].actionState = "SCROLL";
            handAction[ handedness ].actionParam = {
                firstP0: landmarks[ 0 ]
            };
            break;

        };

        case "SCROLL": {

            scrollHandler( landmarks[ 0 ], handedness );
            break;

        }
        

    }

}

function pointingHandler( landmarks, handedness ) {

    switch ( handAction[ handedness ].actionState ) {

        case "IDLE": 
        case "SCROLL": {

            handAction[ handedness ].actionState = "HOVER";
            handAction[ handedness ].actionParam = {
                firstP8: landmarks[ 8 ],
                readyToClick: false,
                elementReadyToClick: null,
                clickP8: null,
                timerClick: 0,
                currentElement: null
            };
            break;

        };

        case "HOVER": {

            hoverHandler( landmarks[ 8 ], handedness );
            break;

        }
        

    }

}

function scrollHandler( p0, handedness ) {

    let pixelToScroll = Math.floor( ( handAction[ handedness ].actionParam.firstP0.y - p0.y ) * 120 );
    window.scrollBy( 0, pixelToScroll );

}

function hoverHandler( point, handedness ) {

    let x = video.width - ( point.x * video.width );
    let y = ( point.y * video.height );
    x = Math.max( x, 0 );
    x = Math.min( x, video.width );
    y = Math.max( y, 0 );
    y = Math.min( y, video.height );

    let elements2 = document.elementsFromPoint( x, y );

    // remove the two canva (hand & segmenter)s displayed in front
    if ( elements2[ 0 ] ) {

        if ( elements2[ 0 ].id === "output_canvas" ) elements2.shift();
        if ( elements2[ 0 ].id === "segmentation_canvas" ) elements2.shift();

    }

    // If pointer over an element
    if ( elements2[ 0 ] ) {

        let newElement = elements2[ 0 ];


        let offSet = getRelativeCoordinates( newElement, x, y );

        // Check if the element under the pointer changed
        if ( newElement.isSameNode( handAction[ handedness ].actionParam.currentElement ) ) {

            newElement.dispatchEvent( new MouseEvent( 'mousemove',
            {
                view: window,
                bubbles: true,
                cancelable: true,
                clientX: x,
                clientY: y,
                offsetX: offSet.x,
                offsetY: offSet.y
            } ) );    

        } else {

            // If the pointer is over another element then trigger a mouse leave event to the older element if it exists 
            if( handAction[ handedness ].actionParam.currentElement !== null ) {

                let offSetOld = getRelativeCoordinates( handAction[ handedness ].actionParam.currentElement, x, y );
                handAction[ handedness ].actionParam.currentElement.dispatchEvent( new MouseEvent( 'mouseleave',
                {
                    view: window,
                    bubbles: true,
                    cancelable: true,
                    clientX: x,
                    clientY: y,
                    offsetX: offSetOld.x,
                    offsetY: offSetOld.y
                } ) );

            }

            newElement.dispatchEvent( new MouseEvent( 'mouseenter',
            {
                view: window,
                bubbles: true,
                cancelable: true,
                clientX: x,
                clientY: y,
                offsetX: offSet.x,
                offsetY: offSet.y
            } ) );
            
            document.activeElement.blur();
            newElement.focus();

            handAction[ handedness ].actionParam.currentElement = newElement;
            handAction[ handedness ].actionParam.timerClick = Date.now();

        }

    }

    if ( !handAction[ handedness ].actionParam.readyToClick ) {

        let progression = ( Date.now() - handAction[ handedness ].actionParam.timerClick ) / clickOption.clickDualTime;
        progression = Math.min( progression, 1);

        if ( progression === 1 ) {

            handAction[ handedness ].actionParam.readyToClick = true;
            handAction[ handedness ].actionParam.clickP8 = point;
            handAction[ handedness ].actionParam.elementReadyToClick = handAction[ handedness ].actionParam.currentElement;
            handAction[ handedness ].actionParam.timerClick = Date.now();

        }

        // drawRectClick( point, progression );
        drawPointer( point, progression, handedness );

    } else {

        drawPointer( point, 1, handedness );
        clickHandler( point, handedness );

        if ( distanceBetweenPointsInPixel( point, handAction[ handedness ].actionParam.clickP8 ) > clickOption.clickMaxRange ) {
        // if ( !handAction[ handedness ].actionParam.currentElement.isSameNode( handAction[ handedness ].actionParam.elementReadyToClick )
        //     && Date.now() - handAction[ handedness ].actionParam.timerClick > clickOption.clickMaxTime ) {

            handAction[ handedness ].actionParam.readyToClick = false;
            handAction[ handedness ].actionParam.elementReadyToClick = null;
            handAction[ handedness ].actionParam.timerClick = Date.now();

        } 

    }


}

function getRelativeCoordinates( element, x, y ) {
  
    var rect = element.getBoundingClientRect(); // Obtenir les coordonnées relatives de l'élément
  
    var offsetX = x - rect.left - window.pageXOffset; // Calculer la coordonnée x relative
    var offsetY = y - rect.top - window.pageYOffset; // Calculer la coordonnée y relative
  
    return { x: offsetX, y: offsetY };

}

function distanceBetweenPoints( p1, p2 ) {

    return Math.sqrt( Math.pow( p2.x - p1.x, 2 ) + Math.pow( p2.y - p1.y, 2 ) );

}

function distanceBetweenPointsInPixel( p1, p2 ) {

    let x1 = ( p1.x * video.width );
    let y1 = ( p1.y * video.height );
    
    let x2 = ( p2.x * video.width );
    let y2 = ( p2.y * video.height );
    return Math.sqrt( Math.pow( x2 - x1, 2 ) + Math.pow( y2 - y1, 2 ) );

}

function drawPointer( point, progression, handedness ) {
    
    let color, colorOutline;
    let radius = 16;
    let p = Math.min( progression, 1 ) * 2 * Math.PI;

    canvasCtx.beginPath();

    if ( progression < 1 ) {

        color = 'rgba( 3, 140, 252, 0.5 )';
        colorOutline = 'rgba( 0, 0, 0, 0.5 )';
        canvasCtx.moveTo( point.x * video.width, point.y * video.height );
        canvasCtx.arc(
            ( point.x * video.width ),
            ( point.y * video.height ),
            radius,
            0,
            p
        );

    } else {

        color = 'rgba( 11, 143, 31, 0.5 )';
        colorOutline = 'rgba( 0, 0, 0, 0.5 )';
        canvasCtx.arc(
            ( handAction[ handedness ].actionParam.clickP8.x * video.width ),
            ( handAction[ handedness ].actionParam.clickP8.y * video.height ),
            radius,
            0,
            p
        );

    }
    
    canvasCtx.closePath();
    canvasCtx.fillStyle = color;
    canvasCtx.fill();
    canvasCtx.lineWidth = 2;
    canvasCtx.strokeStyle = colorOutline;
    canvasCtx.stroke();

    
    // Draw the range indicator
    if ( progression === 1 ) {

        // Calculer la distance entre les deux points
        let distance = distanceBetweenPointsInPixel( point, handAction[ handedness ].actionParam.clickP8 );

        // Calculer la tension de la corde (valeur entre 0 et 1)
        let tension = Math.max( 0, 1 - distance / ( clickOption.clickMaxRange * 0.95) );
        
        // console.log( distance );
        // console.log( tension );

        // Calculer la position du point de contrôle pour simuler le pendule
        let controlPoint = {
            x: ( point.x * video.width + handAction[ handedness ].actionParam.clickP8.x * video.width ) / 2,
            y: ( point.y * video.height + handAction[ handedness ].actionParam.clickP8.y * video.height ) / 2 + tension * 100 // Ajustez la valeur 100 pour contrôler l'amplitude de la corde
        };

        // Dessiner la courbe de Bézier quadratique reliant les deux points avec les extrémités attachées
        canvasCtx.beginPath();
        canvasCtx.lineWidth = 1;
        canvasCtx.moveTo( point.x * video.width, point.y * video.height );
        canvasCtx.quadraticCurveTo( controlPoint.x, controlPoint.y,
            handAction[ handedness ].actionParam.clickP8.x * video.width, handAction[ handedness ].actionParam.clickP8.y * video.height );
        canvasCtx.strokeStyle = "black";
        canvasCtx.stroke();

    }

}


function drawRectClick( point, progression ) {

    // Border
    canvasCtx.fillStyle = "rgba(0, 0, 0, 0.5)";
    // Up
    canvasCtx.fillRect(
        ( point.x * video.width ) - ( mouseClickSpace + rectClickBorderSize * 2 + rectClickSizeX ),
        ( point.y * video.height ) - ( mouseClickSpace + rectClickBorderSize * 2 + rectClickSizeY ),
        rectClickSizeX + rectClickBorderSize * 2,
        rectClickBorderSize
    );
    // Down
    canvasCtx.fillRect(
        ( point.x * video.width ) - ( mouseClickSpace + rectClickBorderSize * 2 + rectClickSizeX ),
        ( point.y * video.height ) - ( mouseClickSpace + rectClickBorderSize ),
        rectClickSizeX + rectClickBorderSize * 2,
        rectClickBorderSize
    );
    // Right
    canvasCtx.fillRect(
        ( point.x * video.width ) - ( mouseClickSpace + rectClickBorderSize * 2 + rectClickSizeX ),
        ( point.y * video.height ) - ( mouseClickSpace + rectClickBorderSize + rectClickSizeY ),
        rectClickBorderSize,
        rectClickSizeX
    );
    // Left
    canvasCtx.fillRect(
        ( point.x * video.width ) - ( mouseClickSpace + rectClickBorderSize ),
        ( point.y * video.height ) - ( mouseClickSpace + rectClickBorderSize + rectClickSizeY ),
        rectClickBorderSize,
        rectClickSizeX
    );

    let p = Math.round( progression * rectClickSizeX );
    // Left Part
    canvasCtx.fillStyle = "rgba(255, 0, 0, 0.5)";
    canvasCtx.fillRect(
        ( point.x * video.width ) - ( mouseClickSpace + rectClickBorderSize + p ),
        ( point.y * video.height ) - ( mouseClickSpace + rectClickBorderSize + rectClickSizeY ),
        p,
        rectClickSizeY
    );
    // Right Part
    canvasCtx.fillStyle = "rgba(255, 255, 255, 0.5)";
    canvasCtx.fillRect(
        ( point.x * video.width ) - ( mouseClickSpace + rectClickBorderSize + rectClickSizeX ),
        ( point.y * video.height ) - ( mouseClickSpace + rectClickBorderSize + rectClickSizeY ),
        rectClickSizeX - p,
        rectClickSizeY
    );

}

function clickHandler( point, handedness ) {

    // console.log( handAction[ handedness ].actionParam.clickP8.z );
    // console.log( point.z );
    // console.log( Math.abs( 1 - ( handAction[ handedness ].actionParam.clickP8.z / point.z ) ) );
    if ( 1 - ( handAction[ handedness ].actionParam.clickP8.z / point.z ) > 0.30 ) {

        console.log( "click!" );
        handAction[ handedness ].actionParam.elementReadyToClick

        let x = video.width - ( point.x * video.width );
        let y = ( point.y * video.height );
        let offSet = getRelativeCoordinates( handAction[ handedness ].actionParam.elementReadyToClick, x, y );
        handAction[ handedness ].actionParam.elementReadyToClick.dispatchEvent( new MouseEvent( 'click',
        {
            view: window,
            bubbles: true,
            cancelable: true,
            clientX: x,
            clientY: y,
            offsetX: offSet.x,
            offsetY: offSet.y
        } ) );

        handAction[ handedness ].actionParam.readyToClick = false;
        handAction[ handedness ].actionParam.elementReadyToClick = null;
        handAction[ handedness ].actionParam.timerClick = Date.now();

    }

}