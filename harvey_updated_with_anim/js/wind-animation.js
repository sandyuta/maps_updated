/* wind-animation.js
   Wind animation controls + hover readout for the Harvey wind layer.

   IMPORTANT: the imageOverlay LAYER itself is created by a tiny inline snippet
   in index.html (so it exists synchronously before the layers tree is built).
   This file attaches the play/pause controls and the hover logic to that layer
   once the map is ready. Additive only; touches nothing in the qgis2web core.

   Requires (already loaded by index.html): leaflet.js, georaster, geoblaze,
   and the inline snippet that defines window.layer_WindAnim + window.WIND_CFG.
*/
(function () {
    function ready() {
        return (typeof map !== 'undefined' && map && map.getPane
                && window.layer_WindAnim && window.WIND_CFG);
    }
    function whenReady(cb) {
        if (ready()) { cb(); return; }
        var n = 0, iv = setInterval(function () {
            if (ready()) { clearInterval(iv); cb(); }
            else if (++n > 200) { clearInterval(iv);
                console.error('wind-animation.js: prerequisites never appeared'); }
        }, 50);
    }

    whenReady(function init() {
        var cfg          = window.WIND_CFG;
        var layer_WindAnim = window.layer_WindAnim;
        var WIND_NFRAMES   = cfg.nframes;
        var WIND_EVERY_HRS = cfg.everyHrs;
        var WIND_FRAME_PATH = cfg.framePath;   // function(i) -> url
        var WIND_TIF_URL    = cfg.tifUrl;

        // preload frames for smooth playback
        for (var wi = 0; wi < WIND_NFRAMES; wi++) {
            var im = new Image(); im.src = WIND_FRAME_PATH(wi);
        }

        var windFrame = 0, windPlaying = false, windTimer = null;

        function windShow(i) {
            windFrame = (i + WIND_NFRAMES) % WIND_NFRAMES;
            layer_WindAnim.setUrl(WIND_FRAME_PATH(windFrame));
            var lbl = document.getElementById('wind-frame-label');
            if (lbl) lbl.textContent = 'Frame ' + windFrame + '  \u00b7  hour ' + (windFrame * WIND_EVERY_HRS);
            var scrub = document.getElementById('wind-scrub');
            if (scrub) scrub.value = windFrame;
            windReadHover();
        }
        function windStep(d) { windPause(); windShow(windFrame + d); }
        function windPlay() {
            windPlaying = true;
            var b = document.getElementById('wind-play'); if (b) b.textContent = '\u23f8';
            windTimer = setInterval(function () { windShow(windFrame + 1); }, 400);
        }
        function windPause() {
            windPlaying = false;
            var b = document.getElementById('wind-play'); if (b) b.textContent = '\u25b6';
            if (windTimer) { clearInterval(windTimer); windTimer = null; }
        }

        var windCtl = L.control({ position: 'bottomleft' });
        windCtl.onAdd = function () {
            var d = L.DomUtil.create('div', 'wind-ctl');
            d.innerHTML =
              '<div class="wind-ctl-row">' +
                '<button id="wind-play" title="Play/Pause">\u25b6</button>' +
                '<button id="wind-prev" title="Previous">\u27e8</button>' +
                '<button id="wind-next" title="Next">\u27e9</button>' +
                '<input id="wind-scrub" type="range" min="0" max="' + (WIND_NFRAMES - 1) + '" value="0" step="1">' +
              '</div>' +
              '<div id="wind-frame-label" class="wind-ctl-label">Frame 0  \u00b7  hour 0</div>';
            L.DomEvent.disableClickPropagation(d);
            L.DomEvent.disableScrollPropagation(d);
            return d;
        };
        windCtl._added = false;
        function windCtlShow(show) {
            if (show && !windCtl._added) { windCtl.addTo(map); windCtl._added = true; wireButtons(); }
            if (!show && windCtl._added) { map.removeControl(windCtl); windCtl._added = false; }
        }
        function wireButtons() {
            document.getElementById('wind-play').onclick = function () { windPlaying ? windPause() : windPlay(); };
            document.getElementById('wind-prev').onclick = function () { windStep(-1); };
            document.getElementById('wind-next').onclick = function () { windStep(1); };
            document.getElementById('wind-scrub').oninput = function (e) { windPause(); windShow(+e.target.value); };
        }

        // show/hide controls when the layer is toggled in the tree
        map.on('overlayadd', function (e) {
            if (e.layer === layer_WindAnim) { windCtlShow(true); windShow(windFrame); }
        });
        map.on('overlayremove', function (e) {
            if (e.layer === layer_WindAnim) { windPause(); windCtlShow(false); }
        });
        // if the layer is already on the map at load, show controls now
        if (map.hasLayer(layer_WindAnim)) { windCtlShow(true); windShow(0); }

        // ---- hover: read the wind tif band for the current frame ----
        var windGeoraster = null;
        fetch(WIND_TIF_URL)
          .then(function (r) { if (!r.ok) throw new Error('wind tif not found'); return r.arrayBuffer(); })
          .then(parseGeoraster)
          .then(function (g) { windGeoraster = g; console.log('Wind tif loaded:', g.numberOfRasters, 'bands'); })
          .catch(function (err) { console.error('Wind tif load failed:', err); });

        var _last = null;
        function windReadHover() {
            if (!windGeoraster || !_last) return;
            if (!map.hasLayer(layer_WindAnim)) return;
            var box = document.getElementById('wind-info');
            if (!box) return;
            try {
                var p = L.CRS.EPSG3857.project(_last);
                var vals = geoblaze.identify(windGeoraster, [p.x, p.y]);
                if (vals && vals.length > windFrame) {
                    var v = vals[windFrame];
                    box.innerHTML = (v !== null && v > -9999)
                        ? '<b>Wind speed:</b> ' + v.toFixed(1) + ' m/s'
                        : '<b>Wind speed:</b> No data';
                }
            } catch (e) {
                box.innerHTML = '<b>Wind speed:</b> outside extent';
            }
        }
        map.on('mousemove', function (e) { _last = e.latlng; windReadHover(); });

        var windInfo = L.control({ position: 'topright' });
        windInfo.onAdd = function () {
            var d = L.DomUtil.create('div', 'info-box');
            d.id = 'wind-info';
            d.innerHTML = '<b>Wind speed:</b> hover with wind layer on';
            return d;
        };
        windInfo.addTo(map);
    });
})();