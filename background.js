
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
  
chrome.action.onClicked.addListener(function (tab) {
  if(!tab.id) {
    console.log('No tab id');
    return;
  }

  console.log('on click');
  chrome.scripting.executeScript({
    target: {
      tabId: tab.id,
    },
    world: 'MAIN',
    func: injectedFunction,
    args: [chrome.runtime.id]
  });
});
  