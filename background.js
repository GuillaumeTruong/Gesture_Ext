
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


// injectedFunction( chrome.runtime.id );
chrome.runtime.onInstalled.addListener(() => {

    chrome.action.setBadgeText({
      text: "OFF",
    });
    console.log( "chrome.runtime.onInstalled");
    
    chrome.storage.local.set({ mode: "PUSH" }).then(() => {
        console.log("Storage mode : PUSH");
    });
    
    chrome.storage.local.set({ video_resolution: 720 }).then(() => {
        console.log("Storage video_resolution : 720");
    });
    
    chrome.storage.local.set({ drawhands: true}).then(() => {
        console.log("Storage drawhands : true" );
    });

    chrome.storage.local.set({ opacityglobal: 0.7 }).then(() => {
        console.log("Storage opacityglobal : 0.7" );
    });
    
    chrome.storage.local.set({ opacityhand: 0.8 }).then(() => {
        console.log("Storage opacityHand : 0.8" );
    });
    
    chrome.storage.local.set({ opacitybody: 0.2 }).then(() => {
        console.log("Storage opacityBody : 0.2");
    });
  
});

  
// // chrome.tabs.onUpdated.addListener(function (tab) {
// chrome.action.onClicked.addListener( async function (tab) {

//   if(!tab.id) {
//     console.log('No tab id');
//     return;
//   }

//   const prevState = await chrome.action.getBadgeText({ tabId: tab.id });
//     // Next state will always be the opposite
//   const nextState = prevState === 'ON' ? 'OFF' : 'ON';
//   let stateExt = {
//     tabId: tab.id,
//     state: nextState,
//   };

//   chrome.storage.local.set({ stateExt: stateExt }).then(() => {
//     console.log("Storage stateExt : " + nextState);
//   });

//   // Set the action badge to the next state
//   await chrome.action.setBadgeText({
//     tabId: tab.id,
//     text: nextState,
//   });

//   console.log('on click');
//   console.log("click sur tab : " + tab.id);

//   chrome.scripting.executeScript({
//     target: {
//       tabId: tab.id,
//     },
//     world: 'MAIN',
//     func: injectedFunction,
//     args: [chrome.runtime.id]
//   });

//   chrome.scripting.insertCSS({
//     files: ["gesture.css"],
//     target: { tabId: tab.id },
//   });

// });


chrome.tabs.onUpdated.addListener( async function ( tabID ) {

  console.log( "chrome.tabs.onUpdated" );

  chrome.storage.local.get( [ "stateExt" ] ).then( async ( result ) => {

    let isSameTab = true;
    console.log( "Value currently is " + result.stateExt );

    if( result.stateExt ) {

      isSameTab &&= result.stateExt.state === 'ON';
      isSameTab &&= tabID === result.stateExt.tabId;

    } else {

      isSameTab = false;

    }

    console.log( isSameTab );

    if( isSameTab ) {
      
      chrome.action.setBadgeText({
        tabId: tabID,
        text: result.stateExt.state,
      });
      
      let dataPopUp = await getDataFromStorage();
      
      chrome.scripting.executeScript({
        target: {
          tabId: tabID,
        },
        world: 'MAIN',
        func: injectedFunction,
        args: [chrome.runtime.id, dataPopUp]
      });
      
      chrome.scripting.insertCSS({
        files: ["gesture.css"],
        target: { tabId: tabID },
      });

    }

  });


});

// chrome.tabs.onActivated.addListener(handleActivated);
// chrome.tabs.onActivated.addListener(handleActivated);

chrome.storage.onChanged.addListener( async ( changes, namespace ) => {

  let tabs = await getCurrentTab();
  let tabID = tabs[ 0 ].id;

  let dataPopUp = await getDataFromStorage();

  console.log( dataPopUp );
  
  chrome.scripting.executeScript({
    target: {
      tabId: tabID,
    },
    world: 'MAIN',
    func: updateDataPopUp,
    args: [ changes, namespace, dataPopUp ]
  });

} );

function updateDataPopUp( changes, namespace, dataPopUp ) {

  console.log("updateDataPopUp");

  let dataDOM = document.getElementById( "data-popup-gesture" );

  if( dataDOM ) {

    for (let [key, { oldValue, newValue }] of Object.entries(changes)) {

      dataDOM.dataset[ key ] = newValue;

    }

  } else {

    var d = document.createElement('span');
    d.id = "data-popup-gesture"
    d.style = "display: none";
    document.body.appendChild(d);
  
    for (const property in dataPopUp) {
  
      d.dataset[ property ] = dataPopUp[ property ];
  
    }

  }

}

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

  return dataset;

}

async function getCurrentTab() {

  let queryOptions = { active: true };//, lastFocusedWindow: true };
  // `tab` will either be a `tabs.Tab` instance or `undefined`.
  let tab = await chrome.tabs.query(queryOptions);
  return tab;

}