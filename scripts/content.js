let mode = "PUSH"; // "PUSH" "PINCH" "KEYBOARD"

let activateKalman = true;

let extId;

let getDataTimer;
let getDataDelay = 10000;

let display_Hands = true;
let videoResolution = 720; // 720 // 1280 // 1920
let video;
let canvasElementSegmentation, canvasElement, canvasTmp;
let canvasCtxSeg, canvasCtx, canvasTmpCtx;
let currentKey = new Set();

let links = [];

let gestureRecognizer, imageSegmenter;
let drawingMediapipe;
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

let twoHandsZoomParams = {
    fistDist: null,
    zoomPercent: 100
};

let clickOption = {
    readyDualTime: 1000,
    clickMaxTime: 500,
    clickMaxRange: 150,
    clickTimeTolerance: 150,
    clickZRatio: 0.3
};

let mouseDownOption = {
    mouseDownTimeTolerance: 400,
    sliderXRatio: 0.1
}

let scrollOption = {
    timeTolerance: 150,
    scrollRatio: 60,
    threshold: 0.05
}

let landmarksPoints = {
    Left: [],
    Right: []
};

let selfieState = "IDLE";
let selfieOption = {
    enable: true,
    fadeTime: 500,
    timer: 0,
    spaceAround: 0.05,
    opacityBackground: 0,
    opacityIdle: Math.floor( 0.7 * 255 ),
    opacityHand: Math.floor( 0.8 * 255 ),
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

let cameraMode = {
    state: "FULL", // "FULL" "WINDOW"
    timer: null,
    fadeTime: 1500
}

init();

async function init() {
    
    console.log( 'Init Gesture' );
    getDataFromStorage();
    initDocument();
    initKeyboard();
    initKalmanFilter();
    await initMediapipe();
    initFingerPose();
    enableCam();

}

function initDocument() {

    document.body.style.overflowX = "hidden";

    let camContainer = document.createElement('div');
    camContainer.style = "position: fixed; left: 0px; top: 0px; z-index: 2147483647;";
    camContainer.className  = "cam_container";
    document.body.appendChild( camContainer );

    let btnLinksContainer = document.createElement( 'div' );
    btnLinksContainer.id = "btn_links_container";
    btnLinksContainer.className  = "btn_links_container";
    camContainer.appendChild( btnLinksContainer );

    let btnLinksTitle = document.createElement( 'div' );
    btnLinksTitle.id = "btn_links_title";
    btnLinksTitle.className  = "btn_links_title";
    camContainer.appendChild( btnLinksTitle );
    

    for ( let link of links ) {

        let btnLink = document.createElement( 'div' );
        btnLink.id = "btn_links";
        btnLink.dataset.url = link;
        btnLink.className = "btn_links";
        let txtUrl = link.replace( 'http://', '' );
        txtUrl = txtUrl.replace( 'https://', '' );
        txtUrl = (txtUrl.length > 24) ? txtUrl.slice(0, 8) + '...' + txtUrl.slice( -8 ): txtUrl;
        btnLink.innerText = txtUrl;
        btnLink.title = link;
        btnLink.addEventListener("click", (e) => {
            window.location.href = ( e.target.dataset.url );
        });
        btnLinksContainer.appendChild( btnLink );
        
        btnLink.addEventListener("mousemove", function(e) {
            btnLinksTitle.innerText = e.target.dataset.url;
            btnLinksTitle.style.display = "block";
            btnLinksTitle.style.left = (e.pageX + 10) + "px"; // Ajustez la position en fonction de vos besoins
            btnLinksTitle.style.top = (e.pageY + 10) + "px";  // Ajustez la position en fonction de vos besoins
        });
        
        btnLink.addEventListener("mouseleave", function() {
            btnLinksTitle.style.display = "none";
        });

    }
    
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
    canvasElementSegmentation.className  = "segmentation_canvas";
    canvasElementSegmentation.width  = 1280;
    canvasElementSegmentation.height = 720;
    canvasElementSegmentation.style = "position: absolute; left: 0px; top: 0px; transform: scaleX(-1); pointer-events: none;"
    camContainer.appendChild( canvasElementSegmentation );
    canvasCtxSeg = canvasElementSegmentation.getContext( "2d" );
    
    canvasElement = document.createElement( 'canvas' );
    canvasElement.id = "output_canvas";
    canvasElement.className  = "output_canvas";
    canvasElement.width  = 1280;
    canvasElement.height = 720;
    canvasElement.style = "position: absolute; left: 0px; top: 0px; transform: scaleX(-1); pointer-events: none;"
    camContainer.appendChild( canvasElement );
    canvasCtx = canvasElement.getContext( "2d" );
    
    
    canvasTmp = document.createElement( 'canvas' );
    canvasTmp.id = "tmp_canvas";
    canvasTmp.className  = "tmp_canvas";
    canvasTmp.width  = 1280;
    canvasTmp.height = 720;
    canvasTmp.style = "position: absolute; left: 0px; top: 0px; transform: scaleX(-1); pointer-events: none; display: none;"
    camContainer.appendChild( canvasTmp );
    canvasTmpCtx = canvasTmp.getContext( "2d" );
    
    
    extId = document.querySelector('[data-gesture]');
    extId = extId.getAttribute('data-runtime-id');
    console.log( extId );

    canvasTmpCtx = canvasTmp.getContext( "2d" );


    // modify all <select> elements
    // let selectElements = document.querySelectorAll("select");
    // for (var i = 0; i < selectElements.length; i++) {
    //     selectElements[i].classList.add("custom-select");
    // }

    // window.addEventListener( 'resize', e => onWindowResize( e ) );

}

function initCameraMode() {
    
    if ( cameraMode.state === "FULL" ) {

        canvasElementSegmentation.style.transform = 'scaleX(-1)';
        canvasElement.style.transform = 'scaleX(-1)';

    } else {
        
        let windowScale = 0.2;
        let translationY = Math.round( window.innerHeight - ( ( video.height +  video.height * windowScale ) / 2 ) );
        let translationX = Math.round( window.innerWidth - ( ( video.width +  video.width * windowScale ) / 2 ) );
        canvasElementSegmentation.style.transform = 'translate( ' + translationX + 'px, '
            + translationY + 'px ) scale( -0.2, 0.2 )';
        canvasElement.style.transform = 'translate( ' + translationX + 'px, '
            + translationY + 'px ) scale( -0.2, 0.2 )';

    }

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

    drawingMediapipe = new DrawingUtils( canvasCtx );

}

function initFingerPose() {

    let knownGestures;

    switch ( mode ) {

        case "PUSH": {

            knownGestures = [
                closedFistGestureDescription,
                pointingGestureDescription
            ];
            break;

        }

        case "PINCH": {

            knownGestures = [
                closedFistGestureDescription,
                pointingThumbGestureDescription,
                readyToPinchGestureDescription
            ];
            break;

        }

        case "KEYBOARD": {

            knownGestures = [
                closedFistGestureDescription,
                pointingGestureDescription
            ];
            break;

        }

    }

    // FingerPose
    gestureEstimator = new GestureEstimator( knownGestures );

}

function initKeyboard() {

    document.body.onkeydown = function( e ) {

        currentKey.add( e.code );

    }

    document.body.onkeyup = function(e) {

        if ( ( e.code === "AltLeft" && currentKey.has( "KeyS" ) )
            || ( currentKey.has( "AltLeft" ) && e.code === "KeyS" ) ) {

            switchCameraMode();

        }

        currentKey.delete( e.code );

    }

    window.addEventListener('keydown', function(e) {
        
        switch ( mode ) {

            case "PUSH":
            case "PINCH": {

                if( e.code == "Space" && e.target == document.body ) {
                    e.preventDefault();
                }
                break;

            }

            case "KEYBOARD": {

                if( e.code == "Space" ) {
                    e.preventDefault();
                }
                break;

            }

        }

    });

}

function initKalmanFilter() {

    pF = .1;
    qF = Math.pow( 10, 1);
    rF = Math.pow( 10, 3 );
    
    let state = new Matrix(4,1);                                                    // X
    let estimation = Matrix.eye(4).mul(pF);                                          // P

    let stateModel = Matrix.arr([[1,0,1,0],[0,1,0,1],[0,0,1,0],[0,0,0,1]]);   // A
    let observationModel = Matrix.arr([[1,0,0,0],[0,1,0,0]]);                       // H

    let processNoiseCovariance = Matrix.arr([[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]]).mul(qF);  // Q
    let measurementNoiseCovariance = Matrix.arr([[1,0],[0,1]]).mul(rF);                          // R

    // Dummy Control Input terms
    let B = new Matrix( state.rows, state.rows );  
    let U = new Matrix( state.rows, state.cols );

    for ( let i = 0; i < 21; i++ ) {

        landmarksPoints.Left.push( {
            pointsList: [],
            kf: new KalmanFilter(state,estimation,stateModel,observationModel,processNoiseCovariance,measurementNoiseCovariance, B, U)
        } );
        landmarksPoints.Right.push( {
            pointsList: [],
            kf: new KalmanFilter(state,estimation,stateModel,observationModel,processNoiseCovariance,measurementNoiseCovariance, B, U)
        } );

    };

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

    initCameraMode();

}

async function predictWebcam() {

    if ( Date.now() - getDataTimer > getDataDelay ) getDataFromStorageDynamic();

    let gesturesName = [];

    // Hand
    let nowInMs = Date.now();
    const resultsGesture = gestureRecognizer.recognizeForVideo( video, nowInMs );
  
    if ( cameraMode.state === "FULL" ) {

    
        if ( activateKalman ) {

            for ( let i = 0; i < resultsGesture.handednesses.length; i++ ) {

                resultsGesture.landmarks[ i ] = updateKalman( resultsGesture.handednesses[ i ][ 0 ].categoryName, resultsGesture.landmarks[ i ] );

            }

        }

        canvasCtx.save();
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
        drawHands( resultsGesture );
        canvasCtx.restore();

        let actionHandlerFct;

        switch ( mode ) {

            case "PUSH": {

                actionHandlerFct = actionHandler;
                break;

            }

            case "PINCH": {

                actionHandlerFct = actionHandlerPINCH;
                break;

            }

            case "KEYBOARD": {

                actionHandlerFct = actionHandlerKEYBOARD;
                break;

            }

        }

        // Handle Action

        // Two hands
        let resultTH = false;

        resultTH ||= twoHandZoomHandler( 
            resultsGesture.landmarks,
            resultsGesture.handednesses
        );


        if( !resultTH ) {

            // Each hand
            for ( let i = 0; i < resultsGesture.handednesses.length; i++ ) {

                gesturesName.push(
                    actionHandlerFct(
                        resultsGesture.landmarks[ i ],
                        resultsGesture.handednesses[ i ][ 0 ]
                    )
                );

            }

        }


        if ( selfieOption.enable ) {

            let oldState = selfieState;

            selfieState = false;

            gesturesName.forEach( gName => {
                selfieState ||= gName === "Pointing" || gName === "Closed_Fist" || gName === "ReadyToPinch" || gName === "Pinch";
            } )

            selfieState = selfieState ? "HANDS_UP" : "IDLE";

            if ( oldState !== selfieState ) selfieOption.timer = Date.now();

        }

    }

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


    if ( display_Hands ) {

        let colorRight = "rgba(0, 255, 0, 0.5)";
        let colorLeft = "rgba(255, 0, 0, 0.5)";
        let color = "rgba(0, 0, 0, 0.5)";

        for ( let i = 0; i < results.handednesses.length; i++ ) {

            if ( results.handednesses[ i ][ 0 ].categoryName === "Right" ) {

                color = colorRight;

            } else if ( results.handednesses[ i ][ 0 ].categoryName === "Left" ) {

                color = colorLeft;

            }

            drawingMediapipe.drawConnectors( results.landmarks[ i ], HAND_CONNECTIONS, {
                color: color,
                lineWidth: 5
            });

            drawingMediapipe.drawLandmarks( results.landmarks[ i ], { color: "#FFF", lineWidth: 2 });

        }

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

    let cModeFadeProgression = ( Date.now() - cameraMode.timer ) / cameraMode.fadeTime;
    
    if ( cameraMode.state === "FULL" || cModeFadeProgression < 1 ) {

        const mask = resultSegmenter.categoryMask.getAsFloat32Array();

        let fadeProgression = ( Date.now() - selfieOption.timer ) / selfieOption.fadeTime;
        fadeProgression = Math.min ( fadeProgression, 1 );

        switch ( selfieState ) {

            case "IDLE" : {

                let j = 0;
                for ( let i = 0; i < mask.length; ++i ) {
        
                    imageData[ j + 3 ] = ( mask[ i ] === 0 ) ? selfieOption.opacityBackground
                        : lerp ( selfieOption.opacityBody, selfieOption.opacityIdle, fadeProgression );
                    j += 4;
            
                }
                break;

            }

            case "HANDS_UP" : {

                let distMax = [];
                let distFade = [];
                let pMoy = [];
                
                for ( let h = 0; h < resultsGesture.landmarks.length; h++ ) {

                    pMoy.push( {
                        x: 0,
                        y: 0,
                        n: 0
                    } );

                    resultsGesture.landmarks[ h ].forEach( element => {

                        pMoy[ h ].x += Math.floor( element.x * video.videoWidth );
                        pMoy[ h ].y += Math.floor( element.y * video.videoHeight );
                        pMoy[ h ].n++;

                    } );

                    pMoy[ h ].x /= pMoy[ h ].n;
                    pMoy[ h ].y /= pMoy[ h ].n;

                }
                
                for ( let h = 0; h < resultsGesture.landmarks.length; h++ ) {

                    distMax.push( 0 );

                    resultsGesture.landmarks[ h ].forEach( element => {

                        distMax[ h ] = Math.max(
                            distMax[ h ],
                            Math.sqrt(
                                Math.pow( pMoy[ h ].x - Math.floor( element.x * video.videoWidth ), 2 )
                                + Math.pow( pMoy[ h ].y - Math.floor( element.y * video.videoHeight ), 2 )
                            )
                        );

                    } );

                    distFade[ h ] = distMax[ h ] * 0.95;
                    distMax[ h ] *= 1.3;

                }
                
                let j = 0;
                let isBody, dist, x, y;

                for (let i = 0; i < mask.length; ++i) {

                    if ( mask[ i ] === 0 ) {

                        imageData[ j + 3 ] = selfieOption.opacityBackground

                    } else {

                        isBody = true;
                        x = i % video.videoWidth;
                        y = Math.floor( i / video.videoWidth );
                        let d = 10000;
                        let hNum = 0;

                        for ( let h = 0; h < resultsGesture.landmarks.length; h++ ) {

                            dist = Math.sqrt( Math.pow( pMoy[ h ].x - x, 2 ) + Math.pow( pMoy[ h ].y - y, 2 ) );
                            isBody &&= ( dist > distMax[ h ] );
                            if ( dist < distMax[ h ] && dist < d ) {
                                hNum = h;
                                d = dist;
                            }

                        }

                        if ( isBody ) {

                            imageData[ j + 3 ] = lerp (
                                selfieOption.opacityIdle,
                                selfieOption.opacityBody,
                                fadeProgression
                            );

                        } else {
                            
                            imageData[ j + 3 ] = lerp (
                                selfieOption.opacityIdle,
                                lerp (
                                    selfieOption.opacityHand,
                                    selfieOption.opacityBody,
                                    easeIn( Math.max( 0, ( d - distFade[ hNum ] ) / ( distMax[ hNum ] - distFade[ hNum ] ) ), 1 )
                                ), 
                                fadeProgression
                            );

                        }

                    }

                    j += 4;
            
                }

                
                break;

            }

        }

        
        if ( cameraMode.state === "WINDOW" ) {

            let j = 0;
            for ( let i = 0; i < mask.length; ++i ) {
    
                imageData[ j + 3 ] = lerp (
                    imageData[ j + 3 ],
                    255,
                    cModeFadeProgression
                );
                j += 4;
        
            }

        } else if ( cModeFadeProgression < 1 ) {

            let j = 0;
            for ( let i = 0; i < mask.length; ++i ) {
    
                imageData[ j + 3 ] = lerp (
                    255,
                    imageData[ j + 3 ],
                    cModeFadeProgression
                );
                j += 4;
        
            }

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



/*------*
 * PUSH *
 *------*/


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

            if ( Date.now() - handAction[ handedness ].actionParam.timerScroll > scrollOption.timeTolerance ) {
            
                handAction[ handedness ].actionState = "IDLE";
                resetAction( handedness );

            }
            break;

        };

        case "HOVER": {

            handAction[ handedness ].actionState = "IDLE";
            exitHover( handedness, landmarks );
            resetAction( handedness );
            break;

        };

        case "READY": {

            if ( clickCheck( handedness, landmarks ) ) {

                handAction[ handedness ].actionState = "HOVER";
                clickHandler( handedness, landmarks );
                exitReady( handedness, landmarks );
                initHover( handedness, landmarks );

            } else {

                if ( Date.now() - handAction[ handedness ].actionParam.timerReady > clickOption.clickTimeTolerance ) {

                    handAction[ handedness ].actionState = "IDLE";
                    resetAction( handedness );

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

            if ( clickCheck( handedness, landmarks ) ) {

                handAction[ handedness ].actionState = "HOVER";
                clickHandler( handedness, landmarks );
                exitReady( handedness, landmarks );
                initHover( handedness, landmarks );

            } else {

                if ( Date.now() - handAction[ handedness ].actionParam.timerReady > clickOption.clickTimeTolerance ) {

                    handAction[ handedness ].actionState = "MOUSEDOWN";
                    initMouseDown( handedness, landmarks );

                }
            }
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

            if ( Date.now() - handAction[ handedness ].actionParam.timerScroll > scrollOption.timeTolerance ) {

                handAction[ handedness ].actionState = "IDLE";
                resetAction( handedness )

            }
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

            if ( clickCheck( handedness, landmarks ) ) {

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
        elementsToScroll: elements,
        timerScroll: Date.now()
    };

}

function initHover( handedness, landmarks ) {

    let newElement = getElementatPosition( landmarks[ 8 ] );

    let p = landmarksToXYPixelDocument( landmarks[ 8 ] );

    let offSet = getRelativeCoordinates( newElement, p.x, p.y );

    dispatchEventMouseOver(
        newElement,
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
        }
    );

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

    dispatchEventMouseDown(
        handAction[ handedness ].actionParam.elementReady,
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
        }
    );

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

    dispatchEventMouseLeave(
        handAction[ handedness ].actionParam.currentElement,
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
        }
    );

    document.activeElement.blur();

};

function exitReady( handedness, landmarks ) {
    
    let p = landmarksToXYPixelDocument( landmarks[ 8 ] );

    let offSetOld = getRelativeCoordinates( handAction[ handedness ].actionParam.elementReady, p.x, p.y );

    dispatchEventMouseLeave(
        handAction[ handedness ].actionParam.elementReady,
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
        }
    );

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

    dispatchEventMouseUp(
        handAction[ handedness ].actionParam.elementMD,
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
        }
    );

    dispatchEventMouseLeave(
        handAction[ handedness ].actionParam.elementMD,
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
        }
    );

    document.activeElement.blur();

};


function scrollHandler( handedness, landmarks ) {

    let pixelToScroll = handAction[ handedness ].actionParam.firstP0.y - landmarks[ 0 ].y;
    let direction = Math.sign( pixelToScroll );

    pixelToScroll = Math.abs( pixelToScroll );
    pixelToScroll = Math.max( pixelToScroll - scrollOption.threshold, 0);
    pixelToScroll *= scrollOption.scrollRatio;

    if( pixelToScroll > 0 ) {

        pixelToScroll = direction * Math.floor( pixelToScroll );

        let p = landmarksToXYPixelDocument( handAction[ handedness ].actionParam.firstP0 );
        let offSetOld = getRelativeCoordinates( handAction[ handedness ].actionParam.elementsToScroll[ 0 ], p.x, p.y );

        handAction[ handedness ].actionParam.elementsToScroll[ 0 ].dispatchEvent( new WheelEvent( 'wheel',
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

    }

    handAction[ handedness ].actionParam.timerScroll = Date.now();

}

function hoverHandler( handedness, landmarks, element ) {

    let p = landmarksToXYPixelDocument( landmarks[ 8 ] );

    let offSet = getRelativeCoordinates( element, p.x, p.y );

    if ( element.isSameNode( handAction[ handedness ].actionParam.currentElement ) ) {

        dispatchEventMouseMove( element, 
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
        } );

    } else {
        
        let offSetOld = getRelativeCoordinates( handAction[ handedness ].actionParam.currentElement, p.x, p.y );
        
        dispatchEventMouseLeave(
            handAction[ handedness ].actionParam.currentElement,
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
            }
        );
            
        dispatchEventMouseOver(
            element,
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
            }
        );
        
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

    dispatchEventMouseMove(
        handAction[ handedness ].actionParam.elementReady ,
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
        }
    );
    
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

    dispatchEventMouseDown(
        handAction[ handedness ].actionParam.elementReady,
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
        }
    );
    
    dispatchEventMouseUp(
        handAction[ handedness ].actionParam.elementReady,
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
        }
    );

}

function mouseDownHandler( handedness, landmarks ) {

    let p = {
        x: handAction[ handedness ].actionParam.positionDiff.x + landmarks[ 5 ].x,
        y: handAction[ handedness ].actionParam.positionDiff.y + landmarks[ 5 ].y,
        z: handAction[ handedness ].actionParam.positionDiff.z + landmarks[ 5 ].z
    };

    p = landmarksToXYPixelDocument( p );
    let offSet = getRelativeCoordinates( handAction[ handedness ].actionParam.elementMD, p.x, p.y );

    if (
        handAction[ handedness ].actionParam.elementMD.tagName.toLowerCase() === "input"
        && handAction[ handedness ].actionParam.elementMD.type.toLowerCase()  === "range"
    ) {

        let diffP5 = handAction[ handedness ].actionParam.mdP5.x - landmarks[ 5 ].x;
        let min = parseInt( handAction[ handedness ].actionParam.elementMD.min );
        let max = parseInt( handAction[ handedness ].actionParam.elementMD.max );
        let value = min + ( max - min )
            * ( ( diffP5 - ( - mouseDownOption.sliderXRatio ) ) / ( mouseDownOption.sliderXRatio - ( - mouseDownOption.sliderXRatio ) ) );
        value = Math.max( value, handAction[ handedness ].actionParam.elementMD.min );
        value = Math.min( value, handAction[ handedness ].actionParam.elementMD.max );
        handAction[ handedness ].actionParam.elementMD.value = value;

    }

    dispatchEventMouseMove(
        handAction[ handedness ].actionParam.elementMD,
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
        }
    );

    handAction[ handedness ].actionParam.timerMD = Date.now();

    drawPointer( landmarks[ 5 ], 1, handedness );

}


/*-------*
 * PINCH *
 *-------*/


function actionHandlerPINCH( landmarks, handednesses ) {

    // Gesture Estimator
    const est = gestureEstimator.estimate( landmarks, 9 );

    let gesture = {
        name: "None"
    }

    if ( est.gestures.length > 0 ) {

        gesture = est.gestures.reduce((p, c) => {
            return (p.score > c.score) ? p : c
        });

    }
    
    let distP4P8 = distanceBetweenPoints3D( landmarks[ 4 ], landmarks[ 8 ] );
    let distP0P17 = distanceBetweenPoints3D( landmarks[ 0 ], landmarks[ 17 ] );

    gesture = distP4P8 < distP0P17 * 0.2 ? "Pinch" : gesture.name;

    switch( gesture ) {

        case "Closed_Fist": {

            closedFistHandlerPINCH( landmarks, handednesses.categoryName );
            break;

        }

        case "ReadyToPinch":
        case "Pointing": {

            pointingHandlerPINCH( landmarks, handednesses.categoryName, gesture );
            break;
            
        }

        case "Pinch": {

            pinchHandlerPINCH( landmarks, handednesses.categoryName );
            break;
            
        }

        case "None": {

            noneHandlerPINCH( landmarks, handednesses.categoryName );
            break;
            
        }

    }

    return gesture;

}

function noneHandlerPINCH( landmarks, handedness ) {

    switch ( handAction[ handedness ].actionState ) {

        case "IDLE": {
            
            exitHoverPINCH( handedness, landmarks );
            handAction[ handedness ].actionState = "IDLE";
            resetAction( handedness );
            break;

        };
        
        case "SCROLL": {

            if ( Date.now() - handAction[ handedness ].actionParam.timerScroll > scrollOption.timeTolerance ) {

                handAction[ handedness ].actionState = "IDLE";
                resetAction( handedness );

            }
            break;

        };
        
        case "MOUSEDOWN": {

            if ( Date.now() - handAction[ handedness ].actionParam.timerMD > mouseDownOption.mouseDownTimeTolerance ) {

                handAction[ handedness ].actionState = "IDLE";
                exitMDPinch( handedness, landmarks );
                resetAction( handedness );

            }
            break;

        };

    }

}

function closedFistHandlerPINCH( landmarks, handedness ) {

    switch ( handAction[ handedness ].actionState ) {

        case "IDLE": {

            exitHoverPINCH( handedness, landmarks );
            handAction[ handedness ].actionState = "SCROLL";
            initScroll( handedness, landmarks );
            break;

        };
        
        case "SCROLL": {

            handAction[ handedness ].actionState = "SCROLL";
            scrollHandler( handedness, landmarks );
            break;

        };

        case "MOUSEDOWN": {

            if ( Date.now() - handAction[ handedness ].actionParam.timerMD > mouseDownOption.mouseDownTimeTolerance ) {

                handAction[ handedness ].actionState = "IDLE";
                exitMDPinch( handedness, landmarks );
                resetAction( handedness );

            }
            break;

        };

    }

}

function pointingHandlerPINCH( landmarks, handedness, gesture ) {

    switch ( handAction[ handedness ].actionState ) {

        case "IDLE": {

            handAction[ handedness ].actionState = "IDLE";
            hoverHandlerPINCH( handedness, landmarks, gesture === "Pointing" ? 8 : 4 );
            break;

        };
        
        case "SCROLL": {

            if ( Date.now() - handAction[ handedness ].actionParam.timerScroll > scrollOption.timeTolerance ) {

                handAction[ handedness ].actionState = "IDLE";
                resetAction( handedness );

            }
            break;

        };

        case "MOUSEDOWN": {

            if ( Date.now() - handAction[ handedness ].actionParam.timerMD > mouseDownOption.mouseDownTimeTolerance ) {

                handAction[ handedness ].actionState = "IDLE";
                exitMDPinch( handedness, landmarks );
                resetAction( handedness );

            }
            break;

        };

    }

}

function pinchHandlerPINCH( landmarks, handedness ) {

    switch ( handAction[ handedness ].actionState ) {

        case "IDLE": {
            
            exitHoverPINCH( handedness, landmarks );
            handAction[ handedness ].actionState = "MOUSEDOWN";
            initMDPinch( handedness, landmarks );
            break;

        };
        
        case "SCROLL": {

            if ( Date.now() - handAction[ handedness ].actionParam.timerScroll > scrollOption.timeTolerance ) {

                handAction[ handedness ].actionState = "IDLE";
                resetAction( handedness );

            }
            break;

        };

        case "MOUSEDOWN": {

            handAction[ handedness ].actionState = "MOUSEDOWN";
            handlerMDPinch( handedness, landmarks );
            break;

        };

    }

}

function hoverHandlerPINCH( handedness, landmarks, finger = 8 ) {

    let element = getElementatPosition( landmarks[ finger ] );

    let p = landmarksToXYPixelDocument( landmarks[ finger ] );

    let offSet = getRelativeCoordinates( element, p.x, p.y );

    if (
        handAction[ handedness ].actionParam.currentElement
        && element.isSameNode( handAction[ handedness ].actionParam.currentElement )
    ) {

        dispatchEventMouseMove(
            element,
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
            }
        );

    } else {
        
        if ( handAction[ handedness ].actionParam.currentElement ) {

            let offSetOld = getRelativeCoordinates( handAction[ handedness ].actionParam.currentElement, p.x, p.y );

            dispatchEventMouseLeave(
                handAction[ handedness ].actionParam.currentElement,
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
                }
            );

        }
        
        dispatchEventMouseOver(
            element,
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
            }
        );
        
        document.activeElement.blur();
        element.focus();

        handAction[ handedness ].actionParam.currentElement = element;
        handAction[ handedness ].actionParam.timerReady = Date.now();

    }
    
    // let progression = ( Date.now() - handAction[ handedness ].actionParam.timerReady ) / clickOption.readyDualTime;
    // drawPointer( landmarks[ 8 ], progression, handedness );

}

function exitHoverPINCH( handedness, landmarks ) {
    
    if ( handAction[ handedness ].actionParam.currentElement ) {
    
        let p = landmarksToXYPixelDocument( landmarks[ 8 ] );

        let offSetOld = getRelativeCoordinates( handAction[ handedness ].actionParam.currentElement, p.x, p.y );

        dispatchEventMouseLeave(
            handAction[ handedness ].actionParam.currentElement,
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
            }
        );

        document.activeElement.blur();

    }

};

function initMDPinch( handedness, landmarks ) {

    let pmoy = {
        x: ( landmarks[ 8 ].x + landmarks[ 4 ].x ) /2,
        y: ( landmarks[ 8 ].y + landmarks[ 4 ].y ) /2,
        z: ( landmarks[ 8 ].z + landmarks[ 4 ].z ) /2,
    };

    let element = findElementNearPosition( pmoy, 8 );

    let p = landmarksToXYPixelDocument( pmoy );

    let offSet = getRelativeCoordinates( element, p.x, p.y );

    dispatchEventMouseDown(
        element,
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
        }
    );

    let positionDiff = {
        x: pmoy.x - landmarks[ 5 ].x,
        y: pmoy.y - landmarks[ 5 ].y,
        z: pmoy.z - landmarks[ 5 ].z
    }

    handAction[ handedness ].actionParam = {
        firstP: pmoy,
        positionDiff: positionDiff,
        mdP4: landmarks[ 4 ],
        elementMD: element,
        timerMD: Date.now()
    };

}

function handlerMDPinch( handedness, landmarks ) {

    let p = {
        x: ( landmarks[ 8 ].x + landmarks[ 4 ].x ) /2,
        y: ( landmarks[ 8 ].y + landmarks[ 4 ].y ) /2,
        z: ( landmarks[ 8 ].z + landmarks[ 4 ].z ) /2,
    };

    p = landmarksToXYPixelDocument( p );
    let offSet = getRelativeCoordinates( handAction[ handedness ].actionParam.elementMD, p.x, p.y );

    if (
        handAction[ handedness ].actionParam.elementMD.tagName.toLowerCase() === "input"
        && handAction[ handedness ].actionParam.elementMD.type.toLowerCase()  === "range"
    ) {

        let box = handAction[ handedness ].actionParam.elementMD.getBoundingClientRect();
        let valueRatio = offSet.x / box.width;
        valueRatio = Math.min( valueRatio, 1 );
        valueRatio = Math.max( valueRatio, 0 );

        let min = parseInt( handAction[ handedness ].actionParam.elementMD.min );
        let max = parseInt( handAction[ handedness ].actionParam.elementMD.max );
        let value = min + ( max - min ) * valueRatio;
        value = Math.max( value, handAction[ handedness ].actionParam.elementMD.min );
        value = Math.min( value, handAction[ handedness ].actionParam.elementMD.max );
        handAction[ handedness ].actionParam.elementMD.value = value;

    }

    dispatchEventMouseMove(
        handAction[ handedness ].actionParam.elementMD,
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
        } 
    );

    drawPointerPINCH( landmarks[ 4 ], handedness );

    handAction[ handedness ].actionParam.timerMD = Date.now();

}

function exitMDPinch( handedness, landmarks ) {

    let p = {
        x: ( landmarks[ 8 ].x + landmarks[ 4 ].x ) /2,
        y: ( landmarks[ 8 ].y + landmarks[ 4 ].y ) /2,
        z: ( landmarks[ 8 ].z + landmarks[ 4 ].z ) /2,
    };

    p = landmarksToXYPixelDocument( p );

    let offSet = getRelativeCoordinates( handAction[ handedness ].actionParam.elementMD, p.x, p.y );

    dispatchEventMouseUp(
        handAction[ handedness ].actionParam.elementMD,
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
        }
    );

    dispatchEventMouseLeave(
        handAction[ handedness ].actionParam.elementMD,
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
        }
    );
    
    handAction[ handedness ].actionParam.elementMD.dispatchEvent( new MouseEvent( 'click',
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
        offsetY: offSet.y,
        detail: 1
    } ) );

    document.activeElement.blur();
    
}

function drawPointerPINCH( point, handedness ) {
    
    let color, colorOutline;
    let radius = 16;
    let p = 2 * Math.PI;

    switch ( handAction[ handedness ].actionState ) {

        case "IDLE" : {

            break;

        }

        case "MOUSEDOWN" : {

            canvasCtx.beginPath();

            if (
                handAction[ handedness ].actionParam.elementMD.tagName.toLowerCase() === "input"
                && handAction[ handedness ].actionParam.elementMD.type.toLowerCase()  === "range"
            ) {

                let box = handAction[ handedness ].actionParam.elementMD.getBoundingClientRect();
                let min = parseInt( handAction[ handedness ].actionParam.elementMD.min );
                let max = parseInt( handAction[ handedness ].actionParam.elementMD.max );
                let value = parseInt( handAction[ handedness ].actionParam.elementMD.value );
                let valueRatio =  ( value - min ) / ( max - min );

                point = {
                    x: video.width - ( box.x + box.width * valueRatio ),
                    y: box.y + box.height * 0.5
                };

            } else {

                point = {
                    x: point.x,
                    y: point.y,
                    z: point.z
                };

                point.x *= video.width;
                point.y *= video.height;

            }
    
            color = 'rgba( 11, 143, 31, 0.5 )';
            colorOutline = 'rgba( 0, 0, 0, 0.5 )';
            canvasCtx.arc(
                point.x,
                point.y,
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


/*----------*
 * KEYBOARD *
 *----------*/


function actionHandlerKEYBOARD( landmarks, handednesses ) {

    // Gesture Estimator
    const est = gestureEstimator.estimate( landmarks, 9 );

    let gesture = {
        name: "None"
    }

    if ( est.gestures.length > 0 ) {

        gesture = est.gestures.reduce((p, c) => {
            return (p.score > c.score) ? p : c
        });

    }

    switch( gesture.name ) {

        case "Closed_Fist": {

            closedFistHandlerKEYBOARD( landmarks, handednesses.categoryName );
            break;

        }

        case "Pointing": {

            pointingHandlerKEYBOARD( landmarks, handednesses.categoryName, gesture );
            break;
            
        }

        case "None": {

            noneHandlerKEYBOARD( landmarks, handednesses.categoryName );
            break;
            
        }

    }

    return gesture.name;

}

function noneHandlerKEYBOARD( landmarks, handedness ) {

    switch ( handAction[ handedness ].actionState ) {

        case "IDLE": {
            
            exitHoverKEYBOARD( handedness, landmarks );
            handAction[ handedness ].actionState = "IDLE";
            resetAction( handedness );
            break;

        };
        
        case "SCROLL": {

            if ( Date.now() - handAction[ handedness ].actionParam.timerScroll > scrollOption.timeTolerance ) {

                handAction[ handedness ].actionState = "IDLE";
                resetAction( handedness );

            }
            break;

        };
        
        case "MOUSEDOWN": {

            if ( Date.now() - handAction[ handedness ].actionParam.timerMD > mouseDownOption.mouseDownTimeTolerance ) {

                handAction[ handedness ].actionState = "IDLE";
                exitMDKEYBOARD( handedness, landmarks );
                resetAction( handedness );

            }
            break;

        };

    }

}

function closedFistHandlerKEYBOARD( landmarks, handedness ) {

    switch ( handAction[ handedness ].actionState ) {

        case "IDLE": {

            exitHoverKEYBOARD( handedness, landmarks );
            handAction[ handedness ].actionState = "SCROLL";
            initScroll( handedness, landmarks );
            break;

        };
        
        case "SCROLL": {

            handAction[ handedness ].actionState = "SCROLL";
            scrollHandler( handedness, landmarks );
            break;

        };

        case "MOUSEDOWN": {

            if ( Date.now() - handAction[ handedness ].actionParam.timerMD > mouseDownOption.mouseDownTimeTolerance ) {

                handAction[ handedness ].actionState = "IDLE";
                exitMDKEYBOARD( handedness, landmarks );
                resetAction( handedness );

            }
            break;

        };

    }

}

function pointingHandlerKEYBOARD( landmarks, handedness ) {

    switch ( handAction[ handedness ].actionState ) {

        case "IDLE": {

            if ( currentKey.has( "KeyX" ) ) {

                handAction[ handedness ].actionState = "MOUSEDOWN";
                initMDKEYBOARD( handedness, landmarks );

            } else {

                handAction[ handedness ].actionState = "IDLE";
                hoverHandlerKEYBOARD( handedness, landmarks );

            }
            break;

        };
        
        case "SCROLL": {

            if ( Date.now() - handAction[ handedness ].actionParam.timerScroll > scrollOption.timeTolerance ) {

                handAction[ handedness ].actionState = "IDLE";
                resetAction( handedness );

            }
            break;

        };

        case "MOUSEDOWN": {

            if ( !currentKey.has( "KeyX" ) ) {

                handAction[ handedness ].actionState = "IDLE";
                exitMDKEYBOARD( handedness, landmarks );
                resetAction( handedness );

            } else {

                handAction[ handedness ].actionState = "MOUSEDOWN";
                handlerMDKEYBOARD( handedness, landmarks );

            }
            break;

        };

    }

}


function hoverHandlerKEYBOARD( handedness, landmarks ) {

    let element = getElementatPosition( landmarks[ 8 ] );

    let p = landmarksToXYPixelDocument( landmarks[ 8 ] );

    let offSet = getRelativeCoordinates( element, p.x, p.y );

    if (
        handAction[ handedness ].actionParam.currentElement
        && element.isSameNode( handAction[ handedness ].actionParam.currentElement )
    ) {

        dispatchEventMouseMove(
            element,
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
            }
        );

    } else {
        
        if ( handAction[ handedness ].actionParam.currentElement ) {

            let offSetOld = getRelativeCoordinates( handAction[ handedness ].actionParam.currentElement, p.x, p.y );

            dispatchEventMouseLeave(
                handAction[ handedness ].actionParam.currentElement,
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
                }
            );

        }
        
        dispatchEventMouseOver(
            element,
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
            }
        );
        
        document.activeElement.blur();
        element.focus();

        handAction[ handedness ].actionParam.currentElement = element;
        handAction[ handedness ].actionParam.timerReady = Date.now();

    }
    
    // let progression = ( Date.now() - handAction[ handedness ].actionParam.timerReady ) / clickOption.readyDualTime;
    // drawPointer( landmarks[ 8 ], progression, handedness );

}

function exitHoverKEYBOARD( handedness, landmarks ) {
    
    if ( handAction[ handedness ].actionParam.currentElement ) {
    
        let p = landmarksToXYPixelDocument( landmarks[ 8 ] );

        let offSetOld = getRelativeCoordinates( handAction[ handedness ].actionParam.currentElement, p.x, p.y );

        dispatchEventMouseLeave(
            handAction[ handedness ].actionParam.currentElement,
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
            }
        );

        document.activeElement.blur();

    }

};

function initMDKEYBOARD( handedness, landmarks ) {

    let p = landmarksToXYPixelDocument( landmarks[ 8 ] );

    let element = getElementatPosition( landmarks[ 8 ], false );
    let offSet = getRelativeCoordinates( element, p.x, p.y );

    dispatchEventMouseDown(
        element,
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
        }
    );

    handAction[ handedness ].actionParam = {
        firstP: landmarks[ 8 ],
        mdP8: landmarks[ 8 ],
        elementMD: element,
        timerMD: Date.now()
    };

}

function handlerMDKEYBOARD( handedness, landmarks ) {

    let p = landmarksToXYPixelDocument( landmarks[ 8 ] );

    let offSet = getRelativeCoordinates( handAction[ handedness ].actionParam.elementMD, p.x, p.y );

    if (
        handAction[ handedness ].actionParam.elementMD.tagName.toLowerCase() === "input"
        && handAction[ handedness ].actionParam.elementMD.type.toLowerCase()  === "range"
    ) {

        let box = handAction[ handedness ].actionParam.elementMD.getBoundingClientRect();
        let valueRatio = offSet.x / box.width;
        valueRatio = Math.min( valueRatio, 1 );
        valueRatio = Math.max( valueRatio, 0 );

        let min = parseInt( handAction[ handedness ].actionParam.elementMD.min );
        let max = parseInt( handAction[ handedness ].actionParam.elementMD.max );
        let value = min + ( max - min ) * valueRatio;
        value = Math.max( value, handAction[ handedness ].actionParam.elementMD.min );
        value = Math.min( value, handAction[ handedness ].actionParam.elementMD.max );
        handAction[ handedness ].actionParam.elementMD.value = value;

    }

    dispatchEventMouseMove(
        handAction[ handedness ].actionParam.elementMD,
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
        }
    );

    drawPointerKEYBOARD( landmarks[ 8 ], handedness );

    handAction[ handedness ].actionParam.timerMD = Date.now();

}

function exitMDKEYBOARD( handedness, landmarks ) {

    let p = landmarksToXYPixelDocument( landmarks[ 8 ] );

    let offSet = getRelativeCoordinates( handAction[ handedness ].actionParam.elementMD, p.x, p.y );

    dispatchEventMouseUp(
        handAction[ handedness ].actionParam.elementMD,
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
        }
    );

    dispatchEventMouseLeave(
        handAction[ handedness ].actionParam.elementMD,
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
        }
    );

    console.log( "Click!" );

    handAction[ handedness ].actionParam.elementMD.dispatchEvent( new MouseEvent( 'click',
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
        offsetY: offSet.y,
        detail: 1
    } ) );

    document.activeElement.blur();
    
}

function drawPointerKEYBOARD( point, handedness ) {
    
    let color, colorOutline;
    let radius = 16;
    let p = 2 * Math.PI;

    switch ( handAction[ handedness ].actionState ) {

        case "IDLE" : {

            break;

        }

        case "MOUSEDOWN" : {

            canvasCtx.beginPath();

            if (
                handAction[ handedness ].actionParam.elementMD.tagName.toLowerCase() === "input"
                && handAction[ handedness ].actionParam.elementMD.type.toLowerCase()  === "range"
            ) {

                let box = handAction[ handedness ].actionParam.elementMD.getBoundingClientRect();
                let min = parseInt( handAction[ handedness ].actionParam.elementMD.min );
                let max = parseInt( handAction[ handedness ].actionParam.elementMD.max );
                let value = parseInt( handAction[ handedness ].actionParam.elementMD.value );
                let valueRatio =  ( value - min ) / ( max - min );

                point = {
                    x: video.width - ( box.x + box.width * valueRatio ),
                    y: box.y + box.height * 0.5
                };

            } else {

                point = {
                    x: point.x,
                    y: point.y,
                    z: point.z
                };

                point.x *= video.width;
                point.y *= video.height;

            }
    
            color = 'rgba( 11, 143, 31, 0.5 )';
            colorOutline = 'rgba( 0, 0, 0, 0.5 )';
            canvasCtx.arc(
                point.x,
                point.y,
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



/*-----------*
 * TWO HANDS *
 *-----------*/

function twoHandZoomHandler( landmarks, handednesses ) {

    if ( landmarks.length > 1 ) {

        const est1 = gestureEstimator.estimate( landmarks[ 0 ], 9 );

        let gesture1 = {
            name: "None"
        }

        if ( est1.gestures.length > 0 ) {

            gesture1 = est1.gestures.reduce((p, c) => {
                return (p.score > c.score) ? p : c
            });

        }
        
        const est2 = gestureEstimator.estimate( landmarks[ 1 ], 9 );

        let gesture2 = {
            name: "None"
        }

        if ( est2.gestures.length > 0 ) {

            gesture2 = est2.gestures.reduce((p, c) => {
                return (p.score > c.score) ? p : c
            });

        }

        if (  gesture1.name === "Closed_Fist" && gesture2.name === "Closed_Fist" ) {

            let dist = distanceBetweenPoints( landmarks[ 0 ][ 0 ], landmarks[ 1 ][ 0 ] );
            twoHandsZoomParams.fistDist = twoHandsZoomParams.fistDist ?? dist;
            twoHandsZoomParams.zoomTmp = twoHandsZoomParams.zoomTmp ?? twoHandsZoomParams.zoomPercent;

            let zoomToAdd = 100 * ( ( dist / twoHandsZoomParams.fistDist ) - 1 );
            zoomToAdd = Math.sign( zoomToAdd ) * Math.floor( Math.abs( zoomToAdd ) / 20 );
            zoomToAdd *= 10;

            twoHandsZoomParams.zoomPercent = twoHandsZoomParams.zoomTmp + zoomToAdd;

            resizecanvas();


            document.body.style.zoom = twoHandsZoomParams.zoomPercent + "%";

            return true;

        } else {

            twoHandsZoomParams.fistDist = null;
            twoHandsZoomParams.zoomTmp = null;
            canvasElementSegmentation.style.transition = "";
            canvasElement.style.transition = "";
            return false;

        }
        
    }

    twoHandsZoomParams.fistDist = null;
    twoHandsZoomParams.zoomTmp = null;
    canvasElementSegmentation.style.transition = "";
    canvasElement.style.transition = "";

    return false;

}


function resizecanvas() {

    console.log( canvasElementSegmentation.style.transform );

    let scale = 1 / ( twoHandsZoomParams.zoomPercent / 100 );    

    canvasElementSegmentation.style.transition = "transform 0s ease-in-out 0s";
    canvasElement.style.transition = "transform 0s ease-in-out 0s";

    let translationY = - Math.round( ( video.height - video.height * scale ) / 2 );
    let translationX = - Math.round( ( video.width - video.width * scale ) / 2 );
    
    // let translationY = Math.round( window.innerHeight - ( ( video.height +  video.height * windowScale ) / 2 ) );
    // let translationX = Math.round( window.innerWidth - ( ( video.width +  video.width * windowScale ) / 2 ) );

    // canvasElementSegmentation.style.transform = 'scale(-2,2)';
    canvasElementSegmentation.style.transform = 'translate( ' + translationX + 'px, '
        + translationY + 'px )' + 'scale(-' + scale + ', ' + scale + ')';
    canvasElement.style.transform = 'translate( ' + translationX + 'px, '
        + translationY + 'px )' + 'scale(-' + scale + ', ' + scale + ')';
    
    // canvasElementSegmentation, canvasElement, canvasTmp
    // camera.aspect = window.innerWidth / window.innerHeight;
    // camera.updateProjectionMatrix();
    // renderer.setSize( window.innerWidth, window.innerHeight );
    
    // canvasElementSegmentation.setSize( window.innerWidth, window.innerHeight );
    // finalComposer.setSize( window.innerWidth, window.innerHeight );

}


/*-------*
 * UTILS *
 *-------*/

function clickCheck( handedness, landmarks ) {

    return ( 1 - ( handAction[ handedness ].actionParam.readyP8.z / landmarks[ 8 ].z ) > clickOption.clickZRatio );

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

            if (
                handAction[ handedness ].actionParam.elementMD.tagName.toLowerCase() === "input"
                && handAction[ handedness ].actionParam.elementMD.type.toLowerCase()  === "range"
            ) {

                let box = handAction[ handedness ].actionParam.elementMD.getBoundingClientRect();
                let min = parseInt( handAction[ handedness ].actionParam.elementMD.min );
                let max = parseInt( handAction[ handedness ].actionParam.elementMD.max );
                let value = parseInt( handAction[ handedness ].actionParam.elementMD.value );
                let valueRatio =  ( value - min ) / ( max - min );

                point = {
                    x: video.width - ( box.x + box.width * valueRatio ),
                    y: box.y + box.height * 0.5
                };

            } else {

                point = {
                    x: handAction[ handedness ].actionParam.positionDiff.x + point.x,
                    y: handAction[ handedness ].actionParam.positionDiff.y + point.y,
                    z: handAction[ handedness ].actionParam.positionDiff.z + point.z
                };

                point.x *= video.width;
                point.y *= video.height;

            }
    
            color = 'rgba( 11, 143, 31, 0.5 )';
            colorOutline = 'rgba( 0, 0, 0, 0.5 )';
            canvasCtx.arc(
                point.x,
                point.y,
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

function distanceBetweenPoints3D( p1, p2 ) {

    return Math.sqrt( Math.pow( p2.x - p1.x, 2 ) + Math.pow( p2.y - p1.y, 2 ) + Math.pow( p2.z - p1.z, 2 ) );

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

function findElementNearPosition( position, near ) {

    let p = landmarksToXYPixelDocument( position );
    let elemList = [];
    let occurences = [];

    for ( let x = Math.max( p.x - near, 1 ); x < Math.min( p.x + near, document.body.clientWidth - 1 ); x++ ) {
        
        for ( let y = Math.max( p.y - near, 1 );
                y < Math.min( p.y + near, window.innerHeight - ( window.innerWidth - document.body.clientWidth ) - 1 ); y++ ) {

            let elements = document.elementsFromPoint( x, y );

            // remove the two canva (hand & segmenter) displayed in front
            if ( elements[ 0 ] ) {
        
                if ( elements[ 0 ].id === "output_canvas" ) elements.shift();
                if ( elements[ 0 ].id === "segmentation_canvas" ) elements.shift();
        
            }

            if ( !elemList.includes( elements[ 0 ] ) ) {

                elemList.push( elements[ 0 ] );
                occurences.push( 1 );

            } else {

                elemList.indexOf( elements[ 0 ] );
                occurences[ elemList.indexOf( elements[ 0 ] ) ] += 1;

            }

        }
    
    }

    return elemList[ occurences.indexOf( Math.max( ...occurences ) ) ];

}

function updateKalman( handedness, landmarks ) {

    let newLandmarks = [];
    
    for ( let i = 0; i < landmarks.length; i++ ) {

        landmarksPoints[ handedness ][ i ].kf.update(
            Matrix.arr( [ landmarks[ i ].x, landmarks[ i ].y ] ) );
        
        let projection = landmarksPoints[ handedness ][ i ].kf.project().data;
        newLandmarks.push( {
            x: projection[ 0 ][ 0 ],
            y: projection[ 1 ][ 0 ],
            z: landmarks[ i ].z
        } );

    }

    return newLandmarks;

}

function switchCameraMode() {

    if ( cameraMode.state === "FULL" ) {

        let windowScale = 0.2;
        cameraMode.state = "WINDOW";
        let translationY = Math.round( window.innerHeight - ( ( video.height +  video.height * windowScale ) / 2 ) );
        let translationX = Math.round( window.innerWidth - ( ( video.width +  video.width * windowScale ) / 2 ) );
        canvasElementSegmentation.style.transform = 'translate( ' + translationX + 'px, '
            + translationY + 'px ) scale( -0.2, 0.2 )';
        canvasElement.style.transform = 'translate( ' + translationX + 'px, '
            + translationY + 'px ) scale( -0.2, 0.2 )';
            
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

        cameraMode.timer = Date.now();

    } else {
        
        cameraMode.state = "FULL";
        canvasElementSegmentation.style.transform = 'scaleX(-1)';
        canvasElement.style.transform = 'scaleX(-1)';
        cameraMode.timer = Date.now();

    }

}

function getDataFromStorage() {

    // console.log( "data pop up :" );

    let dataDOM = document.getElementById( "data-popup-gesture" );

    mode = dataDOM.dataset.mode;
    // console.log( "mode : " + mode );

    videoResolution = parseInt( dataDOM.dataset.video_resolution );
    // console.log( "videoResolution : " + videoResolution );

    display_Hands = dataDOM.dataset.drawhands === "true";
    // console.log( "display_Hands : " + display_Hands );

    selfieOption.opacityIdle = Math.floor( parseFloat( dataDOM.dataset.opacityidle ) * 255 );
    // console.log( "opacityIdle : " + selfieOption.opacityIdle );

    selfieOption.opacityHand = Math.floor( parseFloat( dataDOM.dataset.opacityhand ) * 255 );
    // console.log( "opacityHand : " + selfieOption.opacityHand );

    selfieOption.opacityBody = Math.floor( parseFloat( dataDOM.dataset.opacitybody ) * 255 );
    // console.log( "opacityBody : " + selfieOption.opacityBody );
    
    links = dataDOM.dataset.links.split(',');
    links.pop();
    // console.log( "opacityBody : " + selfieOption.opacityBody );

    getDataTimer = Date.now();

}

function getDataFromStorageDynamic() {

    let dataDOM = document.getElementById( "data-popup-gesture" );

    display_Hands = dataDOM.dataset.drawhands === "true";

    selfieOption.opacityIdle = Math.floor( parseFloat( dataDOM.dataset.opacityidle ) * 255 );
    // console.log( "opacityIdle : " + selfieOption.opacityIdle );

    selfieOption.opacityHand = Math.floor( parseFloat( dataDOM.dataset.opacityhand ) * 255 );
    // console.log( "opacityHand : " + selfieOption.opacityHand );

    selfieOption.opacityBody = Math.floor( parseFloat( dataDOM.dataset.opacitybody ) * 255 );
    // console.log( "opacityBody : " + selfieOption.opacityBody );

    getDataTimer = Date.now();

}


function dispatchEventMouseMove( target, params ) {
    
    target.dispatchEvent( new MouseEvent( 'mousemove', params ) );
    target.dispatchEvent( new PointerEvent( 'pointermove', params ) );

}

function dispatchEventMouseDown( target, params ) {
    
    target.dispatchEvent( new MouseEvent( 'mousedown', params ) );
    target.dispatchEvent( new PointerEvent( 'pointerdown', params ) );

}

function dispatchEventMouseUp( target, params ) {
    
    target.dispatchEvent( new MouseEvent( 'mouseup', params ) );
    target.dispatchEvent( new PointerEvent( 'pointerup', params ) );

}

function dispatchEventMouseOver( target, params ) {
    
    target.dispatchEvent( new MouseEvent( 'mouseover', params ) );
    target.dispatchEvent( new PointerEvent( 'pointerover', params ) );

}

function dispatchEventMouseEnter( target, params ) {
    
    target.dispatchEvent( new MouseEvent( 'mouseenter', params ) );
    target.dispatchEvent( new PointerEvent( 'pointerenter', params ) );

}

function dispatchEventMouseLeave( target, params ) {
    
    target.dispatchEvent( new MouseEvent( 'mouseleave', params ) );
    target.dispatchEvent( new PointerEvent( 'pointerleave', params ) );

}