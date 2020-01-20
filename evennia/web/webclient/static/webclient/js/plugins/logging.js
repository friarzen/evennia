/*
 *
 * Evennia Webclient basic indexedDB logging plugin
 *
 * The goal is to write indexedDB log records directly to a downloaded text file via something similar to:
 
        (function(console){

            console.save = function(data, filename){

                if(!data) {
                    console.error('Console.save: No data')
                    return;
                }

                if(!filename) filename = 'console.json'

                if(typeof data === "object"){
                    data = JSON.stringify(data, undefined, 4)
                }

                var blob = new Blob([data], {type: 'text/json'}),
                    e    = document.createEvent('MouseEvents'),
                    a    = document.createElement('a')

                a.download = filename
                a.href = window.URL.createObjectURL(blob)
                a.dataset.downloadurl =  ['text/json', a.download, a.href].join(':')
                e.initMouseEvent('click', true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null)
                a.dispatchEvent(e)
            }
        })(console)

        console.save( data, filename );
 */
let logging_plugin = (function () {

    var idb = null;

    //
    // Record each Text message received from the server into the clientlog Object Store
    var onText = function (args, kwargs) {
        if( idb ) {
            // open a clientlog transaction to add args[0]
            var tx = idb.transaction(['clientlog'], 'readwrite');
            var clientlog = tx.objectStore('clientlog');
            var msg = {text: args[0], timestamp: Date.now()};
            clientlog.add(msg);
            tx.oncomplete = function () {};
        }

        return false;
    }

    //
    // Display the UI to select what to log
    var onOptionsUI = function (parentdiv) {

        if( idb ) {
            parentdiv.append("<div>Client Logging Settings:</div>");

            var tx = idb.transaction(['clientlog'], 'readonly');
            var clientlog = tx.objectStore('clientlog');
            var req = clientlog.getAll();
            req.onsuccess = function (evnt) {
                var val = evnt.target.result;
                console.log(val);
            }
        }
    }

    //
    // Mandatory plugin init function
    var init = function () {
        if( ! window.indexedDB ) {
            console.log("This browser lacks IndexedDB support, client-side logging is unavailable");
            return;
        } else {
            var dbPromise = window.indexedDB.open( "evennia_webclient", 1);

            dbPromise.onupgradeneeded = function (evnt) {
                upgradeDb = evnt.target.result;
                // does the clientlog object store already exist?
                if( ! upgradeDb.objectStoreNames.contains('clientlog') ) {
                    var clientlog = upgradeDb.createObjectStore('clientlog', {autoIncrement: true});
                    clientlog.createIndex('msg', 'msg', {unique: false});
                }
            };

            dbPromise.onsuccess = function (evnt) {
                idb = evnt.target.result;
            };

            dbPromise.onerror = function (evnt) {
                console.log("error opening evennia_webclient database: " + evnt.target.errorCode );
                idb = null;
            };

            console.log("Logging Plugin initialized");
        }
    }

    return {
        init: init,
        onText: onText,
        onOptionsUI: onOptionsUI,
    }
})();
plugin_handler.add('logging', logging_plugin);
