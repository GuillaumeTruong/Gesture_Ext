
const button = document.getElementById( "switch_gesture" );
const buttonLabel = document.getElementById( "switch_label" );
const btn_push_mode = document.getElementById( "push_mode" );
const btn_pinch_mode = document.getElementById( "pinch_mode" );
const btn_keyboard_mode = document.getElementById( "keyboard_mode" );
const select_videoRes_select = document.getElementById( "videoRes-select" );
const btn_drawHands = document.getElementById( "drawHands" );
const btn_opacityGlobal = document.getElementById( "opacity-global" );
const btn_opacityHand = document.getElementById( "opacity-hand" );
const btn_opacityBody = document.getElementById( "opacity-body" );

init_PopUp();

async function init_PopUp() {

    let tabs = await getCurrentTab();
    const gestureState = await chrome.action.getBadgeText({ tabId: tabs[ 0 ].id });
    button.className = gestureState === 'ON' ? 'gesture_checked': 'gesture_unchecked';

    buttonLabel.innerText = gestureState === 'ON' ? 'ON': 'OFF';
    
    chrome.storage.local.get( [ "mode" ] ).then( ( result ) => {

        btn_push_mode.className = result.mode ==='PUSH' ? 'checked' : 'unchecked';
        btn_pinch_mode.className = result.mode ==='PINCH' ? 'checked' : 'unchecked';
        btn_keyboard_mode.className = result.mode ==='KEYBOARD' ? 'checked' : 'unchecked';

    } );

    chrome.storage.local.get( [ "video_resolution" ] ).then( ( result ) => {
        select_videoRes_select.value = result.video_resolution;
    } );
    
    chrome.storage.local.get( [ "drawhands" ] ).then( ( result ) => {
        btn_drawHands.checked = result.drawhands;
    } );
    
    chrome.storage.local.get( [ "opacityglobal" ] ).then( ( result ) => {
        btn_opacityGlobal.value = result.opacityglobal;
    } );

    chrome.storage.local.get( [ "opacityhand" ] ).then( ( result ) => {
        btn_opacityHand.value = result.opacityhand;
    } );

    chrome.storage.local.get( [ "opacitybody" ] ).then( ( result ) => {
        btn_opacityBody.value = result.opacitybody;
    } );

}

button.addEventListener("click", async () => {

    console.log( "Gesture Click");
    let tabs = await getCurrentTab();
    let tabId = tabs[ 0 ].id;

    if( !tabId ) {
        console.log( 'No tab id' );
        return;
    }

    const prevState = await chrome.action.getBadgeText({ tabId: tabId });
        // Next state will always be the opposite
    const nextState = prevState === 'ON' ? 'OFF' : 'ON';
    let stateExt = {
        tabId: tabId,
        state: nextState,
    };

    button.className = nextState === 'ON' ? 'gesture_checked': 'gesture_unchecked';
    // const buttonLabel = document.getElementById( "switch_label" );
    buttonLabel.innerText = nextState === 'ON' ? 'ON': 'OFF';

    chrome.storage.local.set({ stateExt: stateExt }).then(() => {
        console.log("Storage stateExt : " + nextState);
    });

    // Set the action badge to the next state
    await chrome.action.setBadgeText({
        tabId: tabId,
        text: nextState,
    });

    console.log('on click');
    console.log("click sur tab : " + tabId);

    let dataPopUp = await getDataFromStorage();

    let url = tabs[0].url;
    url = url.split('#')[ 0 ];

    if ( !dataPopUp.links.includes( url ) ) {

        dataPopUp.links.push( url );
        if ( dataPopUp.links.length > 4 ) dataPopUp.links.shift();

    }

    chrome.storage.local.set({ links: dataPopUp.links }).then(() => {
        console.log( "Storage links : " + dataPopUp.links );
    });

    chrome.scripting.executeScript({
        target: {
        tabId: tabId,
        },
        world: 'MAIN',
        func: injectedFunction,
        args: [ chrome.runtime.id, dataPopUp ]
    });

    chrome.scripting.insertCSS({
        files: ["gesture.css"],
        target: { tabId: tabId },
    });

});

async function getCurrentTab() {

    let queryOptions = { active: true };//, lastFocusedWindow: true };
    // `tab` will either be a `tabs.Tab` instance or `undefined`.
    let tab = await chrome.tabs.query(queryOptions);
    // console.log( "tab" )
    // console.log( tab )
    return tab;

}

function injectedFunction( extensionId, dataPopUp ) {

    console.log( window.gestureExtension );
  
    if(!window.gestureExtension) {
  
        window.gestureExtension = true;
        console.log('injected');
        console.log( extensionId );
        var a = document.createElement('script');
        a.setAttribute('src', `chrome-extension://${extensionId}/scripts/env.js`);
        a.setAttribute('data-gesture', "1");
        a.setAttribute('data-runtime-id', `${extensionId}`);
        console.log(`chrome-extension://${extensionId}/scripts/env.js`)
        document.body.appendChild(a);
    
        var fp = document.createElement( 'script' );
        fp.setAttribute( 'src', `chrome-extension://${extensionId}/scripts/FingerPose.js` );
        document.body.appendChild( fp );
        
        var fp = document.createElement( 'script' );
        fp.setAttribute( 'src', `chrome-extension://${extensionId}/scripts/kalman.js` );
        document.body.appendChild( fp );
    
        var c = document.createElement('script');
        c.setAttribute('src', `chrome-extension://${extensionId}/scripts/vision_bundle.js`);
        document.body.appendChild(c);
        
        var d = document.createElement('span');
        d.id = "data-popup-gesture"
        d.style = "display: none";
        document.body.appendChild(d);

        for (const property in dataPopUp) {

            d.dataset[ property ] = dataPopUp[ property ];

        }

  
    } else {
  
      console.log('not injected');
  
    }

}

btn_push_mode.addEventListener("click", async () => {
    
    chrome.storage.local.set({ mode: "PUSH" }).then(() => {
        console.log("Storage mode : PUSH");
    });

    btn_push_mode.className = 'checked';
    btn_pinch_mode.className = 'unchecked';
    btn_keyboard_mode.className = 'unchecked';

} );

btn_pinch_mode.addEventListener("click", async () => {
    
    chrome.storage.local.set({ mode: "PINCH" }).then(() => {
        console.log("Storage mode : PINCH");
    });

    btn_push_mode.className = 'unchecked';
    btn_pinch_mode.className = 'checked';
    btn_keyboard_mode.className = 'unchecked';

} );

btn_keyboard_mode.addEventListener("click", async () => {
    
    chrome.storage.local.set({ mode: "KEYBOARD" }).then(() => {
        console.log("Storage mode : KEYBOARD");
    });

    btn_push_mode.className = 'unchecked';
    btn_pinch_mode.className = 'unchecked';
    btn_keyboard_mode.className = 'checked';
    
} );

select_videoRes_select.addEventListener("change", ( e ) => {

    chrome.storage.local.set({ video_resolution: select_videoRes_select.value }).then(() => {
        console.log("Storage video_resolution : "+ select_videoRes_select.value);
    });
    
} );

btn_drawHands.addEventListener("change", ( e ) => {

    chrome.storage.local.set({ drawhands: btn_drawHands.checked }).then(() => {
        console.log("Storage drawhands : "+ btn_drawHands.checked);
    });
    
} );

btn_opacityGlobal.addEventListener("change", ( e ) => {

    chrome.storage.local.set({ opacityglobal: btn_opacityGlobal.value }).then(() => {
        console.log("Storage opacityglobal : "+ btn_opacityGlobal.value);
    });
    
} );

btn_opacityHand.addEventListener("change", ( e ) => {

    chrome.storage.local.set({ opacityhand: btn_opacityHand.value }).then(() => {
        console.log("Storage opacityHand : "+ btn_opacityHand.value);
    });
    
} );

btn_opacityBody.addEventListener("change", ( e ) => {

    chrome.storage.local.set({ opacitybody: btn_opacityBody.value }).then(() => {
        console.log("Storage opacityBody : "+ btn_opacityBody.value);
    });
    
} );


async function getDataFromStorage() {
    
    let dataset = {};
  
    await chrome.storage.local.get( [ "mode" ] ).then( ( result ) => {
      dataset.mode = result.mode;
    } );
  
    await chrome.storage.local.get( [ "video_resolution" ] ).then( ( result ) => {
        dataset.video_resolution = result.video_resolution;
    } );
    
    await chrome.storage.local.get( [ "drawhands" ] ).then( ( result ) => {
        dataset.drawhands = result.drawhands;
    } );
    
    await chrome.storage.local.get( [ "opacityglobal" ] ).then( ( result ) => {
        dataset.opacityidle = result.opacityglobal;
    } );

    await chrome.storage.local.get( [ "opacityhand" ] ).then( ( result ) => {
        dataset.opacityhand = result.opacityhand;
    } );

    await chrome.storage.local.get( [ "opacitybody" ] ).then( ( result ) => {
        dataset.opacitybody = result.opacitybody;
    } );

    await chrome.storage.local.get( [ "links" ] ).then( ( result ) => {
        dataset.links = result.links;
    } );
  
    return dataset;
  
}