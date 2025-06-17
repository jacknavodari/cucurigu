document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded event fired.');
    const componentLibrary = document.getElementById('component-library');
    const canvas = document.getElementById('panel-canvas');
    const controlsDiv = document.getElementById('controls');

    if (!canvas) {
        console.error('ERROR: Canvas element #panel-canvas not found!');
        return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('ERROR: Failed to get 2D rendering context for canvas!');
        return;
    }
    console.log('Canvas and context obtained.');

    const canvasWidth = 1000;
    const canvasHeight = 700;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    const components = [
        { name: "Main Breaker", id: "main_breaker", width: 50, height: 70, color: '#FF6347' },
        { name: "CB 10A", id: "cb_10a", width: 25, height: 60, color: 'lightgrey' },
        { name: "CB 15A", id: "cb_15a", width: 25, height: 60, color: 'lightblue' },
        { name: "CB 20A", id: "cb_20a", width: 25, height: 60, color: 'lightpink' },
        { name: "CB 30A", id: "cb_30a", width: 50, height: 60, color: 'lightgreen' },
        { name: "Bus Bar", id: "bus_bar", width: 200, height: 20, color: '#D2B48C' },
        { name: "Neutral Bar", id: "neutral_bar", width: 150, height: 15, color: '#007bff' },
        { name: "Ground Bar", id: "ground_bar", width: 150, height: 15, color: '#90EE90' },
        { name: "Contactor", id: "contactor", width: 60, height: 70, color: '#4682B4' },
        { name: "Overload Relay", id: "overload_relay", width: 50, height: 60, color: '#FFA07A' },
        { name: "Fuse Block 3P", id: "fuse_block_3p", width: 70, height: 50, color: '#808080' },
        { name: "Transformer", id: "transformer", width: 80, height: 90, color: '#F4A460' },
        { name: "Terminal Strip", id: "terminal_block_strip", width: 120, height: 30, color: '#A9A9A9' },
        { name: "Pilot Light R", id: "pilot_light_red", width: 25, height: 25, color: 'red' },
        { name: "Pilot Light G", id: "pilot_light_green", width: 25, height: 25, color: 'green' },
        { name: "Push Button G", id: "push_button_green", width: 30, height: 30, color: '#2E8B57' },
        { name: "E-Stop", id: "emergency_stop", width: 40, height: 40, color: '#DC143C' }
    ];

    let placedComponents = [];
    let wires = [];
    let nextComponentInstanceId = 0;
    let isWiringMode = false;
    let firstSelectedComponentForWire = null;
    let selectedComponentForMoving = null;
    let initialMoveX = null; // For checking if a move actually occurred
    let initialMoveY = null;
    let dragOffsetX = 0;
    let dragOffsetY = 0;

    let previousPlacedComponentsState = null;
    let previousWiresState = null;
    let undoButton = null;

    if (controlsDiv) {
        const wiringModeButton = document.createElement('button');
        wiringModeButton.textContent = 'Toggle Wiring Mode (OFF)';
        wiringModeButton.id = 'wiring-mode-button';
        controlsDiv.appendChild(wiringModeButton);
        wiringModeButton.addEventListener('click', () => {
            isWiringMode = !isWiringMode;
            wiringModeButton.textContent = `Toggle Wiring Mode (${isWiringMode ? 'ON' : 'OFF'})`;
            wiringModeButton.classList.toggle('active', isWiringMode);
            firstSelectedComponentForWire = null;
            selectedComponentForMoving = null;
            canvas.style.cursor = isWiringMode ? 'crosshair' : 'default';
            redrawCanvas();
        });

        const savePanelButton = document.createElement('button');
        savePanelButton.textContent = 'Save Panel';
        savePanelButton.id = 'save-panel-button';
        controlsDiv.appendChild(savePanelButton);
        savePanelButton.addEventListener('click', savePanelLayout);

        undoButton = document.createElement('button');
        undoButton.textContent = 'Undo';
        undoButton.id = 'undo-button';
        undoButton.disabled = true;
        controlsDiv.appendChild(undoButton);
        undoButton.addEventListener('click', undoLastAction);

        const clearPanelButton = document.createElement('button');
        clearPanelButton.textContent = 'Clear Panel';
        clearPanelButton.id = 'clear-panel-button';
        controlsDiv.appendChild(clearPanelButton);
        clearPanelButton.addEventListener('click', clearPanel); // clearPanel will be defined later
    } else {
        console.error("Controls DIV (#controls) not found. UI buttons cannot be added.");
    }

    // NEW function: clearPanel
    function clearPanel() {
        saveStateForUndo(); // Save current state so "clear" can be undone

        placedComponents = [];
        wires = [];
        nextComponentInstanceId = 0; // Reset instance ID counter

        // console.log("Panel cleared."); // Optional feedback
        redrawCanvas();
    }

    function saveStateForUndo() {
        previousPlacedComponentsState = JSON.parse(JSON.stringify(placedComponents));
        previousWiresState = JSON.parse(JSON.stringify(wires));
        if (undoButton) undoButton.disabled = false;
    }

    function undoLastAction() {
        if (previousPlacedComponentsState !== null && previousWiresState !== null) {
            placedComponents = JSON.parse(JSON.stringify(previousPlacedComponentsState));
            wires = JSON.parse(JSON.stringify(previousWiresState));
            previousPlacedComponentsState = null;
            previousWiresState = null;
            if (undoButton) undoButton.disabled = true;
            redrawCanvas();
        }
    }

    if (componentLibrary) {
        components.forEach(component => {
            const div = document.createElement('div');
            div.classList.add('component');
            div.setAttribute('draggable', true);
            div.setAttribute('data-component-id', component.id);
            div.setAttribute('data-component-name', component.name);
            div.setAttribute('data-component-width', component.width);
            div.setAttribute('data-component-height', component.height);
            div.textContent = component.name;
            div.style.cursor = 'grab';
            componentLibrary.appendChild(div);
            div.addEventListener('dragstart', (event) => {
                event.dataTransfer.setData('application/json', JSON.stringify(component));
                event.dataTransfer.effectAllowed = 'copy';
            });
        });
    }

    canvas.addEventListener('dragover', (event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy';});

    canvas.addEventListener('drop', (event) => {
        event.preventDefault();
        if (isWiringMode) return;
        const componentDataString = event.dataTransfer.getData('application/json');
        if (!componentDataString) return;
        const componentType = JSON.parse(componentDataString);
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        saveStateForUndo();

        const newComponent = {
            instanceId: nextComponentInstanceId++, typeId: componentType.id, name: componentType.name,
            x: x - (componentType.width / 2), y: y - (componentType.height / 2),
            width: componentType.width, height: componentType.height, color: componentType.color || 'black'
        };
        placedComponents.push(newComponent);
        redrawCanvas();
    });

    canvas.addEventListener('mousedown', (event) => {
        if (isWiringMode) return;
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const clickedComp = getClickedComponent(x, y);
        if (clickedComp) {
            selectedComponentForMoving = clickedComp;
            initialMoveX = clickedComp.x; // Store initial position for move
            initialMoveY = clickedComp.y;
            dragOffsetX = x - selectedComponentForMoving.x;
            dragOffsetY = y - selectedComponentForMoving.y;
            canvas.style.cursor = 'grabbing';
        }
    });

    canvas.addEventListener('mousemove', (event) => {
        if (selectedComponentForMoving && !isWiringMode) {
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            selectedComponentForMoving.x = x - dragOffsetX;
            selectedComponentForMoving.y = y - dragOffsetY;
            redrawCanvas();
        } else if (!selectedComponentForMoving && !isWiringMode) {
            const rect = canvas.getBoundingClientRect();
            const hoverX = event.clientX - rect.left;
            const hoverY = event.clientY - rect.top;
            canvas.style.cursor = getClickedComponent(hoverX, hoverY) ? 'grab' : 'default';
        }
    });

    canvas.addEventListener('mouseup', (event) => {
        if (selectedComponentForMoving && !isWiringMode) {
            // Check if the component actually moved
            if (selectedComponentForMoving.x !== initialMoveX || selectedComponentForMoving.y !== initialMoveY) {
                 saveStateForUndo();
            }
        }
        selectedComponentForMoving = null;
        initialMoveX = null;
        initialMoveY = null;
        if (!isWiringMode) {
            const rect = canvas.getBoundingClientRect();
            const mx = event.clientX - rect.left;
            const my = event.clientY - rect.top;
            canvas.style.cursor = getClickedComponent(mx, my) ? 'grab' : 'default';
        } else {
            canvas.style.cursor = 'crosshair';
        }
    });

    canvas.addEventListener('mouseleave', () => {
        if (selectedComponentForMoving && !isWiringMode) {
             if (selectedComponentForMoving.x !== initialMoveX || selectedComponentForMoving.y !== initialMoveY) {
                // saveStateForUndo(); // Decide if a move ending outside canvas is an "undoable" action
            }
        }
        selectedComponentForMoving = null;
        initialMoveX = null;
        initialMoveY = null;
        canvas.style.cursor = 'default';
    });

    canvas.addEventListener('mouseenter', (event) => {
        if (!isWiringMode && !selectedComponentForMoving) {
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            canvas.style.cursor = getClickedComponent(x,y) ? 'grab' : 'default';
        } else if (isWiringMode && !selectedComponentForMoving) {
            canvas.style.cursor = 'crosshair';
        } else if (selectedComponentForMoving) {
             canvas.style.cursor = 'grabbing';
        }
    });

    canvas.addEventListener('click', (event) => {
        if (canvas.style.cursor === 'grabbing') {
            if (!isWiringMode) {
                const rect = canvas.getBoundingClientRect();
                const x = event.clientX - rect.left;
                const y = event.clientY - rect.top;
                canvas.style.cursor = getClickedComponent(x, y) ? 'grab' : 'default';
            }
            return;
        }
        if (!isWiringMode) return;

        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const clickedComponent = getClickedComponent(x, y);

        if (clickedComponent) {
            if (!firstSelectedComponentForWire) {
                firstSelectedComponentForWire = clickedComponent;
            } else {
                if (firstSelectedComponentForWire.instanceId !== clickedComponent.instanceId) {
                    const wireExists = wires.some(w =>
                        (w.startInstanceId === firstSelectedComponentForWire.instanceId && w.endInstanceId === clickedComponent.instanceId) ||
                        (w.startInstanceId === clickedComponent.instanceId && w.endInstanceId === firstSelectedComponentForWire.instanceId)
                    );
                    if (!wireExists) {
                        saveStateForUndo();
                        wires.push({ startInstanceId: firstSelectedComponentForWire.instanceId, endInstanceId: clickedComponent.instanceId });
                    }
                    firstSelectedComponentForWire = null;
                } else {
                  firstSelectedComponentForWire = null;
                }
            }
        } else {
            firstSelectedComponentForWire = null;
        }
        redrawCanvas();
    });

    function getClickedComponent(x, y) {
        for (let i = placedComponents.length - 1; i >= 0; i--) {
            const comp = placedComponents[i];
            if (x >= comp.x && x <= comp.x + comp.width && y >= comp.y && y <= comp.y + comp.height) {
                return comp;
            }
        }
        return null;
    }

    function redrawCanvas() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        wires.forEach(wire => {
            const compStart = placedComponents.find(c => c.instanceId === wire.startInstanceId);
            const compEnd = placedComponents.find(c => c.instanceId === wire.endInstanceId);
            if (compStart && compEnd) {
                ctx.beginPath();
                ctx.moveTo(compStart.x + compStart.width / 2, compStart.y + compStart.height / 2);
                ctx.lineTo(compEnd.x + compEnd.width / 2, compEnd.y + compEnd.height / 2);
                ctx.stroke();
            } else {
                console.warn('Could not find start or end component for wire:', wire);
            }
        });
        placedComponents.forEach(comp => {
            ctx.fillStyle = comp.color;
            ctx.fillRect(comp.x, comp.y, comp.width, comp.height);
            ctx.lineWidth = 2;
            if (selectedComponentForMoving && selectedComponentForMoving.instanceId === comp.instanceId) {
                ctx.strokeStyle = 'dodgerblue';
                ctx.strokeRect(comp.x - 1, comp.y - 1, comp.width + 2, comp.height + 2);
            } else if (isWiringMode && firstSelectedComponentForWire && firstSelectedComponentForWire.instanceId === comp.instanceId) {
                ctx.strokeStyle = 'yellow';
                ctx.lineWidth = 3;
                ctx.strokeRect(comp.x, comp.y, comp.width, comp.height);
            }
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(comp.name, comp.x + comp.width / 2, comp.y + comp.height / 2);
        });
    }

    function savePanelLayout() {
        const layoutToSave = {
            placedComponents: placedComponents,
            wires: wires
        };
        const jsonString = JSON.stringify(layoutToSave, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'panel_layout.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    canvas.style.cursor = 'default';
    redrawCanvas();
    console.log('app.js loaded and initialized.');
});
