
function injectedFunction(extensionId) {

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

    var c = document.createElement('script');
    c.setAttribute('src', `chrome-extension://${extensionId}/scripts/vision_bundle.js`);
    document.body.appendChild(c);

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
});

  
// chrome.tabs.onUpdated.addListener(function (tab) {
chrome.action.onClicked.addListener( async function (tab) {

  if(!tab.id) {
    console.log('No tab id');
    return;
  }

  const prevState = await chrome.action.getBadgeText({ tabId: tab.id });
    // Next state will always be the opposite
  const nextState = prevState === 'ON' ? 'OFF' : 'ON';
  let stateExt = {
    tabId: tab.id,
    state: nextState,
  };

  chrome.storage.local.set({ stateExt: stateExt }).then(() => {
    console.log("Storage stateExt : " + nextState);
  });

  // Set the action badge to the next state
  await chrome.action.setBadgeText({
    tabId: tab.id,
    text: nextState,
  });

  console.log('on click');
  console.log("click sur tab : " + tab.id);

  chrome.scripting.executeScript({
    target: {
      tabId: tab.id,
    },
    world: 'MAIN',
    func: injectedFunction,
    args: [chrome.runtime.id]
  });

  chrome.scripting.insertCSS({
    files: ["gesture.css"],
    target: { tabId: tab.id },
  });

});


chrome.tabs.onUpdated.addListener( async function ( tabID ) {

  console.log( "chrome.tabs.onUpdated" );

  chrome.storage.local.get( [ "stateExt" ] ).then( ( result ) => {

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
      
      chrome.scripting.executeScript({
        target: {
          tabId: tabID,
        },
        world: 'MAIN',
        func: injectedFunction,
        args: [chrome.runtime.id]
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