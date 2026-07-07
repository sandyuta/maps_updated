function addOpacityControl(map) {
    var OpacityControl = L.Control.extend({
        options: { position: 'topleft' }, 

        onAdd: function (map) {
            var container = L.DomUtil.create('div', 'leaflet-control leaflet-control-opacity-custom');
            
            // 1. Set the HTML
            container.innerHTML = `
                <div class="opacity-toggle-btn" title="Adjust Transparency">
                    <svg viewBox="0 0 24 24" width="24" height="24">
                        <circle cx="10" cy="10" r="7" stroke="#464646" stroke-width="2" fill="none"/>
                        <circle cx="14" cy="14" r="7" stroke="#464646" stroke-width="2" fill="none" stroke-dasharray="3 3"/>
                    </svg>
                </div>
                <div class="opacity-slider-panel">
                    <div class="opacity-row">
                        <label>Historical Depth <span id="hist-val">100%</span></label>
                        <input type="range" id="hist-opacity" min="0" max="1" step="0.05" value="1">
                    </div>
                    <div class="opacity-row">
                        <label>Future Depth <span id="fut-val">100%</span></label>
                        <input type="range" id="fut-opacity" min="0" max="1" step="0.05" value="1">
                    </div>
                </div>
            `;
            
            // 2. Prevent map interactions
            L.DomEvent.disableClickPropagation(container);
            L.DomEvent.disableScrollPropagation(container);

            // 3. Attach Listeners INSIDE onAdd
            var histInput = container.querySelector('#hist-opacity');
            var futInput = container.querySelector('#fut-opacity');

            L.DomEvent.on(histInput, 'input', function(e) {
                var val = e.target.value;
                container.querySelector('#hist-val').textContent = Math.round(val * 100) + '%';
                var pane = map.getPane('pane_HarveyHistorical_2');
                if (pane) pane.style.opacity = val;
            });

            L.DomEvent.on(futInput, 'input', function(e) {
                var val = e.target.value;
                container.querySelector('#fut-val').textContent = Math.round(val * 100) + '%';
                var pane = map.getPane('pane_HarveyFuture_1');
                if (pane) pane.style.opacity = val;
            });

            return container;
        }
    });
    
    map.addControl(new OpacityControl());
}