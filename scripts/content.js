let extId;

let videoResolution = 720; // 720 // 1280 // 1920
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

let clickOption = {
    readyDualTime: 1000,
    clickMaxTime: 500,
    clickMaxRange: 150,
    clickTimeTolerance: 100,
    clickZRatio: 0.3
};

let mouseDownOption = {
    mouseDownTimeTolerance: 200
}

let selfieState = "IDLE";
let selfieOption = {
    enable: true,
    spaceAround: 0.05,
    opacityBackground: 0,
    opacityIdle: Math.floor( 0.7 * 255 ),
    opacityHand: Math.floor( 0.6 * 255 ),
    opacityBody: Math.floor( 0.2 * 255 )
}
// let rectClickSizeX = 50;
// let rectClickSizeY = 50;
// let rectClickBorderSize = 2;
// let mouseClickSpace = 6;


let fps = {
    start: 0,
    img: 0
};


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
    camContainer.style = "position: fixed; left: 0px; top: 0px; z-index: 2147483647;";
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
        `chrome-extension://${extId}/wasm`
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
        // OpenPalmGestureDescription
    ];
    gestureEstimator = new GestureEstimator( knownGestures );

}

async function enableCam() {

    const constraints = {
        video: {
            // width: window.innerWidth
            width: videoResolution
        },
    };

  
    // Activate the webcam stream.
    let stream = await navigator.mediaDevices.getUserMedia(constraints);
    stream_settings = stream.getVideoTracks()[0].getSettings();
    startStream( stream, stream_settings );

}

function startStream( stream, stream_settings ) {

    console.log( stream_settings );
    video.height = Math.floor( window.innerWidth / stream_settings.aspectRatio );
    video.width = window.innerWidth;
    
    const webcamElement = document.getElementById( "webcam" );

    canvasElement.height = video.height;
    canvasElement.width = video.width;
    webcamElement.height = video.height;
    webcamElement.width = video.width;
    canvasElementSegmentation.height = video.height;
    canvasElementSegmentation.width = video.width;

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

    let gesturesName = [];

    // Handle Action
    for ( let i = 0; i < resultsGesture.handednesses.length; i++ ) {

        gesturesName.push( 
            actionHandler(
                // resultsGesture.gestures[ i ][ 0 ],
                resultsGesture.landmarks[ i ],
                resultsGesture.handednesses[ i ][ 0 ]
            )
        );

    }

    selfieState = "IDLE";

    if ( selfieOption.enable ) {

        gesturesName.forEach( gName => {
            selfieState = ( gName === "Pointing" ) ? "HANDS_UP" : "IDLE";
        } )

    }
    // selfieState = ( selfieOption.enable && resultsGesture.handednesses.length > 0 ) ? "HANDS_UP" : "IDLE";

    // Selfie Segmenter
    imageSegmenter.segmentForVideo(
        video, nowInMs,
        function callbackForVideo( result ) {
            drawSelfie( result, resultsGesture, gesturesName );
        }
    );

    window.requestAnimationFrame( predictWebcam );
    showFPS();

}

function drawHands( results ) {

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

function drawSelfie( resultSegmenter, resultsGesture, gesturesName ) {

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

    const mask = resultSegmenter.categoryMask.getAsFloat32Array();

    switch ( selfieState ) {

        case "IDLE" : {

            let j = 0;
            for (let i = 0; i < mask.length; ++i) {
    
                imageData[ j + 3 ] = ( mask[ i ] === 0 ) ? selfieOption.opacityBackground : selfieOption.opacityIdle;
                j += 4;
        
            }
            break;

        }

        case "HANDS_UP" : {

            let maxLandMark = { xH1: 0, yH1: 0, xH2: 0, yH2: 0 };
            let minLandmark = { xH1: 1, yH1: 1, xH2: 1, yH2: 1 };
            let nHand = resultsGesture.handednesses.length;
            if ( nHand < 1 ) console.log( nHand );

            resultsGesture.landmarks[ 0 ].forEach( element => {
    
                maxLandMark.xH1 = Math.min( 1, Math.max( element.x * ( 1 + selfieOption.spaceAround ), maxLandMark.xH1 ) );
                maxLandMark.yH1 = Math.min( 1, Math.max( element.y * ( 1 + selfieOption.spaceAround ), maxLandMark.yH1 ) );
                minLandmark.xH1 = Math.max( 0, Math.min( element.x * ( 1 - selfieOption.spaceAround ), minLandmark.xH1 ) );
                minLandmark.yH1 = Math.max( 0, Math.min( element.y * ( 1 - selfieOption.spaceAround ), minLandmark.yH1 ) );
                
            });

            maxLandMark.xH1 = Math.floor( maxLandMark.xH1 * video.videoWidth );
            maxLandMark.yH1 = Math.floor( maxLandMark.yH1 * video.videoHeight );
            minLandmark.xH1 = Math.floor( minLandmark.xH1 * video.videoWidth );
            minLandmark.yH1 = Math.floor( minLandmark.yH1 * video.videoHeight );

            let startH1 = minLandmark.xH1 + minLandmark.yH1 * video.videoWidth;
            let endH1 = maxLandMark.xH1 + maxLandMark.yH1 * video.videoWidth;
            let diffH1 = maxLandMark.xH1 - minLandmark.xH1;
            
            let startH2, endH2, diffH2;
            let nH1 = 0, nH2 = 0;

            if ( nHand === 2 ) {
                
                resultsGesture.landmarks[ 1 ].forEach( element => {
        
                    maxLandMark.xH2 = Math.min( 1, Math.max( element.x * ( 1 + selfieOption.spaceAround ), maxLandMark.xH2 ) );
                    maxLandMark.yH2 = Math.min( 1, Math.max( element.y * ( 1 + selfieOption.spaceAround ), maxLandMark.yH2 ) );
                    minLandmark.xH2 = Math.max( 0, Math.min( element.x * ( 1 - selfieOption.spaceAround ), minLandmark.xH2 ) );
                    minLandmark.yH2 = Math.max( 0, Math.min( element.y * ( 1 - selfieOption.spaceAround ), minLandmark.yH2 ) );
                    
                });
                
                maxLandMark.xH2 = Math.floor( maxLandMark.xH2 * video.videoWidth );
                maxLandMark.yH2 = Math.floor( maxLandMark.yH2 * video.videoHeight );
                minLandmark.xH2 = Math.floor( minLandmark.xH2 * video.videoWidth );
                minLandmark.yH2 = Math.floor( minLandmark.yH2 * video.videoHeight );
                
                startH2 = minLandmark.xH2 + minLandmark.yH2 * video.videoWidth;
                endH2 = maxLandMark.xH2 + maxLandMark.yH2 * video.videoWidth;
                diffH2 = maxLandMark.xH2 - minLandmark.xH2;

            }
            
            let j = 0;

            for (let i = 0; i < mask.length; ++i) {

                if ( i === startH1 ) nH1 = 0;
                if ( nHand === 2 && i === startH2 ) nH2 = 0;

                if ( i > startH1 && i < endH1 && nH1 < diffH1 ) {
                    imageData[j + 3] = ( mask[ i ] === 0 ) ? selfieOption.opacityBackground : selfieOption.opacityHand;

                } else if ( nHand === 2 && i > startH2 && i < endH2 && nH2 < diffH2 ) {

                    imageData[j + 3] = ( mask[ i ] === 0 ) ? selfieOption.opacityBackground : selfieOption.opacityHand;

                } else {

                    imageData[j + 3] = ( mask[ i ] === 0 ) ? selfieOption.opacityBackground : selfieOption.opacityBody;

                }

                j += 4;
                if ( i < endH1 ) nH1 = ( nH1 + 1 ) % video.videoWidth;
                if ( nHand === 2 && i < endH2 ) nH2 = ( nH2 + 1 ) % video.videoWidth;
        
            }

            
            break;

        }

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
    

    // if ( handednesses.categoryName === "Left" )
    //     console.log( handednesses.categoryName + " : " +handAction[ handednesses.categoryName ].actionState + " ; " + gesture.name );

    switch( gesture.name ) {

        case "Closed_Fist": {

            closedFistHandler( landmarks, handednesses.categoryName );
            break;

        }

        case "Pointing": {

            pointingHandler( landmarks, handednesses.categoryName );
            break;
            
        }

        case "None": {

            noneHandler( landmarks, handednesses.categoryName );
            break;
            
        }

    }

    return gesture.name;

}

function noneHandler( landmarks, handedness ) {

    switch ( handAction[ handedness ].actionState ) {

        case "IDLE": {

            handAction[ handedness ].actionState = "IDLE";
            resetAction( handedness );
            break;

        };
        
        case "SCROLL": {

            handAction[ handedness ].actionState = "IDLE";
            resetAction( handedness );
            break;

        };

        case "HOVER": {

            handAction[ handedness ].actionState = "IDLE";
            exitHover( handedness, landmarks );
            resetAction( handedness );
            break;

        };

        case "READY": {

            if ( Date.now() - handAction[ handedness ].actionParam.timerReady > clickOption.clickTimeTolerance ) {

                handAction[ handedness ].actionState = "IDLE";
                resetAction( handedness );

            }
            break;

        };

        case "MOUSEDOWN": {

            if ( Date.now() - handAction[ handedness ].actionParam.timerMD > mouseDownOption.mouseDownTimeTolerance ) {

                handAction[ handedness ].actionState = "IDLE";
                exitMouseDown( handedness, landmarks );
                resetAction( handedness );

            }
            break;

        };

    }

}

function closedFistHandler( landmarks, handedness ) {

    switch ( handAction[ handedness ].actionState ) {

        case "IDLE": {

            handAction[ handedness ].actionState = "SCROLL";
            initScroll( handedness, landmarks );
            break;

        };
        
        case "SCROLL": {

            handAction[ handedness ].actionState = "SCROLL";
            scrollHandler( handedness, landmarks );
            break;

        };

        case "HOVER": {

            handAction[ handedness ].actionState = "IDLE";
            exitHover( handedness, landmarks );
            resetAction( handedness );
            break;

        };

        case "READY": {

            handAction[ handedness ].actionState = "MOUSEDOWN";
            initMouseDown( handedness, landmarks );
            break;

        };

        case "MOUSEDOWN": {

            handAction[ handedness ].actionState = "MOUSEDOWN";
            mouseDownHandler( handedness, landmarks );
            break;

        };

    }

}

function pointingHandler( landmarks, handedness ) {

    switch ( handAction[ handedness ].actionState ) {

        case "IDLE": {

            handAction[ handedness ].actionState = "HOVER";
            initHover( handedness, landmarks )
            break;

        };
        
        case "SCROLL": {

            handAction[ handedness ].actionState = "IDLE";
            resetAction( handedness )
            break;

        };

        case "HOVER": {

            // check same element
            let newElement = getElementatPosition( landmarks[ 8 ] );

            if ( newElement.isSameNode( handAction[ handedness ].actionParam.currentElement ) &&
                ( Date.now() - handAction[ handedness ].actionParam.timerReady > clickOption.readyDualTime ) ) {

                handAction[ handedness ].actionState = "READY";
                initReady( handedness, landmarks );

            } else {

                handAction[ handedness ].actionState = "HOVER";
                hoverHandler( handedness, landmarks, newElement );

            }

            break;

        };

        case "READY": {

            if ( 1 - ( handAction[ handedness ].actionParam.readyP8.z / landmarks[ 8 ].z ) > clickOption.clickZRatio ) {

                handAction[ handedness ].actionState = "HOVER";
                clickHandler( handedness, landmarks );
                exitReady( handedness, landmarks );
                initHover( handedness, landmarks );

            } else {
            
                if ( distanceBetweenPointsInPixel( landmarks[ 8 ], handAction[ handedness ].actionParam.readyP8 ) > clickOption.clickMaxRange ) {

                    // check Out
                    handAction[ handedness ].actionState = "HOVER";
                    exitReady( handedness, landmarks );
                    initHover( handedness, landmarks );

                } else {
 
                    handAction[ handedness ].actionState = "READY";
                    readyHandler( handedness, landmarks );

                }

            }

            break;

        };

        case "MOUSEDOWN": {

            if ( Date.now() - handAction[ handedness ].actionParam.timerMD > mouseDownOption.mouseDownTimeTolerance ) {

                handAction[ handedness ].actionState = "IDLE";
                exitMouseDown( handedness, landmarks );
                resetAction( handedness );

            }
            break;

        };

    }

}



function resetAction( handedness ) {

    handAction[ handedness ].actionParam = {};

}

function initScroll( handedness, landmarks ) {
    
    let elements = getElementatPosition( landmarks[ 5 ], true );

    handAction[ handedness ].actionParam = {
        firstP0: landmarks[ 0 ],
        elementsToScroll: elements
    };

}

function initHover( handedness, landmarks ) {

    let newElement = getElementatPosition( landmarks[ 8 ] );

    let p = landmarksToXYPixelDocument( landmarks[ 8 ] );

    let offSet = getRelativeCoordinates( newElement, p.x, p.y );

    newElement.dispatchEvent( new MouseEvent( 'mouseenter',
    {
        target: newElement,
        view: window,
        bubbles: true,
        cancelable: true,
        x: p.x,
        y: p.y,
        clientX: p.x,
        clientY: p.y,
        offsetX: offSet.x,
        offsetY: offSet.y
    } ) );

    newElement.focus();

    handAction[ handedness ].actionParam = {
        firstP8: landmarks[ 8 ],
        currentElement: newElement,
        timerReady: Date.now()
    };

}

function initReady( handedness, landmarks ) {

    handAction[ handedness ].actionParam = {
        timerReady: Date.now(),
        elementReady: handAction[ handedness ].actionParam.currentElement,
        readyP8: landmarks[ 8 ]
    };

}

function initMouseDown( handedness, landmarks ) {

    let p = landmarksToXYPixelDocument( landmarks[ 8 ] );

    let offSet = getRelativeCoordinates( handAction[ handedness ].actionParam.elementReady, p.x, p.y );

    handAction[ handedness ].actionParam.elementReady.dispatchEvent( new MouseEvent( 'mousedown',
    {
        target: handAction[ handedness ].actionParam.elementReady,
        view: window,
        bubbles: true,
        cancelable: true,
        x: p.x,
        y: p.y,
        clientX: p.x,
        clientY: p.y,
        offsetX: offSet.x,
        offsetY: offSet.y
    } ) );

    let positionDiff = {
        x: handAction[ handedness ].actionParam.readyP8.x - landmarks[ 5 ].x,
        y: handAction[ handedness ].actionParam.readyP8.y - landmarks[ 5 ].y,
        z: handAction[ handedness ].actionParam.readyP8.z - landmarks[ 5 ].z
    }

    handAction[ handedness ].actionParam = {
        firstP8: handAction[ handedness ].actionParam.readyP8,
        mdP5: landmarks[ 5 ],
        positionDiff: positionDiff,
        elementMD: handAction[ handedness ].actionParam.elementReady,
        timerMD: Date.now()
    };

}



function exitHover( handedness, landmarks ) {
    
    let p = landmarksToXYPixelDocument( landmarks[ 8 ] );

    let offSetOld = getRelativeCoordinates( handAction[ handedness ].actionParam.currentElement, p.x, p.y );

    handAction[ handedness ].actionParam.currentElement.dispatchEvent( new MouseEvent( 'mouseleave',
    {
        target: handAction[ handedness ].actionParam.currentElement,
        view: window,
        bubbles: true,
        cancelable: true,
        x: p.x,
        y: p.y,
        clientX: p.x,
        clientY: p.y,
        offsetX: offSetOld.x,
        offsetY: offSetOld.y
    } ) );

    document.activeElement.blur();

};

function exitReady( handedness, landmarks ) {
    
    let p = landmarksToXYPixelDocument( landmarks[ 8 ] );

    let offSetOld = getRelativeCoordinates( handAction[ handedness ].actionParam.elementReady, p.x, p.y );

    handAction[ handedness ].actionParam.elementReady.dispatchEvent( new MouseEvent( 'mouseleave',
    {
        target: handAction[ handedness ].actionParam.elementReady,
        view: window,
        bubbles: true,
        cancelable: true,
        x: p.x,
        y: p.y,
        clientX: p.x,
        clientY: p.y,
        offsetX: offSetOld.x,
        offsetY: offSetOld.y
    } ) );

    document.activeElement.blur();

};

function exitMouseDown( handedness, landmarks ) {

    let p = {
        x: handAction[ handedness ].actionParam.positionDiff.x + landmarks[ 5 ].x,
        y: handAction[ handedness ].actionParam.positionDiff.y + landmarks[ 5 ].y,
        z: handAction[ handedness ].actionParam.positionDiff.z + landmarks[ 5 ].z
    };

    p = landmarksToXYPixelDocument( p );

    let offSetOld = getRelativeCoordinates( handAction[ handedness ].actionParam.elementMD, p.x, p.y );

    handAction[ handedness ].actionParam.elementMD.dispatchEvent( new MouseEvent( 'mouseup',
    {
        target: handAction[ handedness ].actionParam.elementMD,
        view: window,
        bubbles: true,
        cancelable: true,
        x: p.x,
        y: p.y,
        clientX: p.x,
        clientY: p.y,
        offsetX: offSetOld.x,
        offsetY: offSetOld.y
    } ) );

    handAction[ handedness ].actionParam.elementMD.dispatchEvent( new MouseEvent( 'mouseleave',
    {
        target: handAction[ handedness ].actionParam.elementMD,
        view: window,
        bubbles: true,
        cancelable: true,
        x: p.x,
        y: p.y,
        clientX: p.x,
        clientY: p.y,
        offsetX: offSetOld.x,
        offsetY: offSetOld.y
    } ) );

    document.activeElement.blur();

};



function scrollHandler( handedness, landmarks ) {

    let pixelToScroll = Math.floor(
        ( handAction[ handedness ].actionParam.firstP0.y - landmarks[ 0 ].y )
        * 60
    );
    let direction = Math.sign( pixelToScroll );

    // pixelToScroll = Math.abs( pixelToScroll );
    // pixelToScroll = Math.max( pixelToScroll - 0.2, 0);
    // pixelToScroll *= 60;
    // window.scrollBy( 0, pixelToScroll );
    
    let p = landmarksToXYPixelDocument( handAction[ handedness ].actionParam.firstP0 );
    let offSetOld = getRelativeCoordinates( handAction[ handedness ].actionParam.elementsToScroll[ 0 ], p.x, p.y );

    handAction[ handedness ].actionParam.elementsToScroll[ 0 ].dispatchEvent( new MouseEvent( 'mousewheel',
    {
        target: handAction[ handedness ].actionParam.elementToScroll,
        view: window,
        bubbles: true,
        cancelable: true,
        x: p.x,
        y: p.y,
        clientX: p.x,
        clientY: p.y,
        offsetX: offSetOld.x,
        offsetY: offSetOld.y,
        deltaX: 0,
        deltaY: direction === -1 ? 150 : -150,
        wheelDeltaX: direction * 180,
        wheelDeltaX: 0,
        wheelDeltaY: direction === -1 ? 180 : -180
    } ) );

    handAction[ handedness ].actionParam.elementsToScroll.forEach( element => {
        element.scrollBy( 0, pixelToScroll );
    } );

    // handAction[ handedness ].actionParam.elementToScroll.scrollBy( 0, pixelToScroll );




}

function hoverHandler( handedness, landmarks, element ) {

    let p = landmarksToXYPixelDocument( landmarks[ 8 ] );

    let offSet = getRelativeCoordinates( element, p.x, p.y );

    if ( element.isSameNode( handAction[ handedness ].actionParam.currentElement ) ) {

        element.dispatchEvent( new MouseEvent( 'mousemove',
        {
            target: element,
            view: window,
            bubbles: true,
            cancelable: true,
            x: p.x,
            y: p.y,
            clientX: p.x,
            clientY: p.y,
            offsetX: offSet.x,
            offsetY: offSet.y
        } ) );

    } else {
        
        let offSetOld = getRelativeCoordinates( handAction[ handedness ].actionParam.currentElement, p.x, p.y );
        handAction[ handedness ].actionParam.currentElement.dispatchEvent( new MouseEvent( 'mouseleave',
        {
            target: handAction[ handedness ].actionParam.currentElement,
            view: window,
            bubbles: true,
            cancelable: true,
            x: p.x,
            y: p.y,
            clientX: p.x,
            clientY: p.y,
            offsetX: offSetOld.x,
            offsetY: offSetOld.y
        } ) );
        
        element.dispatchEvent( new MouseEvent( 'mouseenter',
        {
            target: element,
            view: window,
            bubbles: true,
            cancelable: true,
            x: p.x,
            y: p.y,
            clientX: p.x,
            clientY: p.y,
            offsetX: offSet.x,
            offsetY: offSet.y
        } ) );
        
        document.activeElement.blur();
        element.focus();

        handAction[ handedness ].actionParam.currentElement = element;
        handAction[ handedness ].actionParam.timerReady = Date.now();

    }
    
    let progression = ( Date.now() - handAction[ handedness ].actionParam.timerReady ) / clickOption.readyDualTime;
    drawPointer( landmarks[ 8 ], progression, handedness );

}

function readyHandler( handedness, landmarks ) {

    let p = landmarksToXYPixelDocument( landmarks[ 8 ] );

    let offSet = getRelativeCoordinates( handAction[ handedness ].actionParam.elementReady, p.x, p.y );

    handAction[ handedness ].actionParam.elementReady.dispatchEvent( new MouseEvent( 'mousemove',
    {
        target: handAction[ handedness ].actionParam.elementReady,
        view: window,
        bubbles: true,
        cancelable: true,
        x: p.x,
        y: p.y,
        clientX: p.x,
        clientY: p.y,
        offsetX: offSet.x,
        offsetY: offSet.y
    } ) );
    
    handAction[ handedness ].actionParam.timerReady = Date.now();

    drawPointer( landmarks[ 8 ], 1, handedness );

}

function clickHandler( handedness, landmarks ) {

    console.log( "Click!" );
    
    let p = landmarksToXYPixelDocument( landmarks[ 8 ] );
    let offSet = getRelativeCoordinates( handAction[ handedness ].actionParam.elementReady, p.x, p.y );
    
    handAction[ handedness ].actionParam.elementReady.dispatchEvent( new MouseEvent( 'click',
    {
        target: handAction[ handedness ].actionParam.elementReady,
        view: window,
        bubbles: true,
        cancelable: true,
        x: p.x,
        y: p.y,
        clientX: p.x,
        clientY: p.y,
        offsetX: offSet.x,
        offsetY: offSet.y,
        detail: 1
    } ) );

    
    handAction[ handedness ].actionParam.elementReady.dispatchEvent( new MouseEvent( 'mousedown',
    {
        target: handAction[ handedness ].actionParam.elementReady,
        view: window,
        bubbles: true,
        cancelable: true,
        x: p.x,
        y: p.y,
        clientX: p.x,
        clientY: p.y,
        offsetX: offSet.x,
        offsetY: offSet.y
    } ) );
    
    handAction[ handedness ].actionParam.elementReady.dispatchEvent( new MouseEvent( 'mouseup',
    {
        target: handAction[ handedness ].actionParam.elementReady,
        view: window,
        bubbles: true,
        cancelable: true,
        x: p.x,
        y: p.y,
        clientX: p.x,
        clientY: p.y,
        offsetX: offSet.x,
        offsetY: offSet.y
    } ) );

}

function mouseDownHandler( handedness, landmarks ) {

    let p = {
        x: handAction[ handedness ].actionParam.positionDiff.x + landmarks[ 5 ].x,
        y: handAction[ handedness ].actionParam.positionDiff.y + landmarks[ 5 ].y,
        z: handAction[ handedness ].actionParam.positionDiff.z + landmarks[ 5 ].z
    };

    p = landmarksToXYPixelDocument( p );
    let offSet = getRelativeCoordinates( handAction[ handedness ].actionParam.elementMD, p.x, p.y );

    handAction[ handedness ].actionParam.elementMD.dispatchEvent( new MouseEvent( 'mousemove',
    {
        target: handAction[ handedness ].actionParam.elementMD,
        view: window,
        bubbles: true,
        cancelable: true,
        x: p.x,
        y: p.y,
        clientX: p.x,
        clientY: p.y,
        offsetX: offSet.x,
        offsetY: offSet.y
    } ) );

    handAction[ handedness ].actionParam.timerMD = Date.now();

    drawPointer( landmarks[ 5 ], 1, handedness );

}



function drawPointer( point, progression, handedness ) {
    
    let color, colorOutline;
    let radius = 16;
    let p = Math.min( progression, 1 ) * 2 * Math.PI;
    let distance, vLerp, opacity;

    switch ( handAction[ handedness ].actionState ) {

        case "HOVER" : {

            canvasCtx.beginPath();
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
            
            canvasCtx.closePath();
            canvasCtx.fillStyle = color;
            canvasCtx.fill();
            canvasCtx.lineWidth = 2;
            canvasCtx.strokeStyle = colorOutline;
            canvasCtx.stroke();
            break;

        }

        case "READY" : {

            canvasCtx.beginPath();

            distance = distanceBetweenPointsInPixel( point, handAction[ handedness ].actionParam.readyP8 );
            vLerp = easeIn( ( distance / clickOption.clickMaxRange ), 4 );
            opacity = lerp( 0.6, 0.1, vLerp );
    
            color = 'rgba( 11, 143, 31, ' + opacity + ' )';
            colorOutline = 'rgba( 0, 0, 0, ' + opacity + ' )';
            canvasCtx.arc(
                ( handAction[ handedness ].actionParam.readyP8.x * video.width ),
                ( handAction[ handedness ].actionParam.readyP8.y * video.height ),
                radius,
                0,
                p
            );
            
            canvasCtx.closePath();
            canvasCtx.fillStyle = color;
            canvasCtx.fill();
            canvasCtx.lineWidth = 2;
            canvasCtx.strokeStyle = colorOutline;
            canvasCtx.stroke();

            // Draw rope
            let opacityStart =  Math.min( ( distance / clickOption.clickMaxRange ) * 10, 1 );
            opacity = opacityStart * lerp( 0.8, 0.1, vLerp );

            let tension = Math.max( 0, 1 - distance / ( clickOption.clickMaxRange * 0.95) );
            
            let controlPoint = {
                x: ( point.x * video.width + handAction[ handedness ].actionParam.readyP8.x * video.width ) / 2,
                y: ( point.y * video.height + handAction[ handedness ].actionParam.readyP8.y * video.height ) / 2 + tension * 100
            };

            canvasCtx.beginPath();
            canvasCtx.lineWidth = 1;
            canvasCtx.moveTo( point.x * video.width, point.y * video.height );
            canvasCtx.quadraticCurveTo(
                controlPoint.x, controlPoint.y,
                handAction[ handedness ].actionParam.readyP8.x * video.width,
                handAction[ handedness ].actionParam.readyP8.y * video.height
            );
            canvasCtx.strokeStyle = 'rgba( 0, 0, 0, ' + opacity + ' )';
            canvasCtx.stroke();
            break;

        }

        case "MOUSEDOWN" : {

            canvasCtx.beginPath();
            
            point = {
                x: handAction[ handedness ].actionParam.positionDiff.x + point.x,
                y: handAction[ handedness ].actionParam.positionDiff.y + point.y,
                z: handAction[ handedness ].actionParam.positionDiff.z + point.z
            };
    
            color = 'rgba( 11, 143, 31, 0.5 )';
            colorOutline = 'rgba( 0, 0, 0, 0.5 )';
            canvasCtx.arc(
                ( point.x * video.width ),
                ( point.y * video.height ),
                radius,
                0,
                p
            );
            
            canvasCtx.closePath();
            canvasCtx.fillStyle = color;
            canvasCtx.fill();
            canvasCtx.lineWidth = 2;
            canvasCtx.strokeStyle = colorOutline;
            canvasCtx.stroke();
            break;

        }

    }

}

function getRelativeCoordinates( element, x, y ) {
  
    var rect = element.getBoundingClientRect();
  
    var offsetX = x - rect.left - window.pageXOffset;
    var offsetY = y - rect.top - window.pageYOffset;
  
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

function getElementatPosition( position, getAll = false ) {
    
    let p = landmarksToXYPixelDocument( position );

    let elements = document.elementsFromPoint( p.x, p.y );

    // remove the two canva (hand & segmenter)s displayed in front
    if ( elements[ 0 ] ) {

        if ( elements[ 0 ].id === "output_canvas" ) elements.shift();
        if ( elements[ 0 ].id === "segmentation_canvas" ) elements.shift();

    }

    return getAll ? elements : elements[ 0 ];

}

function landmarksToXYPixelDocument( position ) {

    let x = video.width - ( position.x * video.width );
    let y = ( position.y * video.height );
    x = Math.max( x, 1 );
    x = Math.min( x, document.body.clientWidth - 1 );
    y = Math.max( y, 1 );
    y = Math.min( y, window.innerHeight - ( window.innerWidth - document.body.clientWidth ) - 1 );
    return { x, y }

}

function lerp( value1, value2, factor ) {
    
    return ( 1 - factor ) * value1 + factor * value2;

}

function easeIn( x, pow ) {

    if ( pow > 1 ) {

        return Math.pow( x, pow );

    } else {

        return 1 - Math.cos( ( x * Math.PI ) / 2);

    }

}

function showFPS() {

    let t = Date.now();

    if ( t - fps.start < 1000 ) {

        fps.img++;

    } else {

        console.log( fps.img );
        fps.start = t;
        fps.img = 1;

    }

}