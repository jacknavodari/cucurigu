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
        { name: "Main Breaker", id: "main_breaker", width: 50, height: 70, color: '#FF6347', drawingType: 'mainBreaker' },
        { name: "CB 10A", id: "cb_10a", width: 25, height: 60, color: 'lightgrey', drawingType: 'circuitBreaker' },
        { name: "CB 15A", id: "cb_15a", width: 25, height: 60, color: 'lightblue', drawingType: 'circuitBreaker' },
        { name: "CB 20A", id: "cb_20a", width: 25, height: 60, color: 'lightpink', drawingType: 'circuitBreaker' },
        { name: "CB 30A", id: "cb_30a", width: 50, height: 60, color: 'lightgreen', drawingType: 'circuitBreaker' },
        { name: "Bus Bar", id: "bus_bar", width: 200, height: 20, color: '#D2B48C', drawingType: 'rectangle' },
        { name: "Neutral Bar", id: "neutral_bar", width: 150, height: 15, color: '#007bff', drawingType: 'rectangle' },
        { name: "Ground Bar", id: "ground_bar", width: 150, height: 15, color: '#90EE90', drawingType: 'rectangle' },
        { name: "Contactor", id: "contactor", width: 60, height: 70, color: '#4682B4', drawingType: 'contactor' },
        { name: "Overload Relay", id: "overload_relay", width: 50, height: 60, color: '#FFA07A', drawingType: 'overloadRelay' },
        { name: "Fuse Block 3P", id: "fuse_block_3p", width: 70, height: 50, color: '#808080', drawingType: 'fuseBlock' },
        { name: "Transformer", id: "transformer", width: 80, height: 90, color: '#F4A460', drawingType: 'transformer' },
        { name: "Terminal Strip", id: "terminal_block_strip", width: 120, height: 30, color: '#A9A9A9', drawingType: 'terminalStrip' },
        { name: "Pilot Light R", id: "pilot_light_red", width: 25, height: 25, color: 'red', drawingType: 'pilotLight' },
        { name: "Pilot Light G", id: "pilot_light_green", width: 25, height: 25, color: 'green', drawingType: 'pilotLight' },
        { name: "Push Button G", id: "push_button_green", width: 30, height: 30, color: '#2E8B57', drawingType: 'pushButton' },
        { name: "E-Stop", id: "emergency_stop", width: 40, height: 40, color: '#DC143C', drawingType: 'eStop' },
        { name: "Connection Point", id: "connection_point", width: 10, height: 10, color: 'black', drawingType: 'connectionPoint' }
    ];

    let placedComponents = [];
    let wires = [];
    let nextComponentInstanceId = 0;
    let nextWireInstanceId = 0; // New: for unique wire IDs
    let isWiringMode = false;
    let firstSelectedComponentForWire = null;
    let selectedComponentForMoving = null;
    let selectedJointPoint = null; // New: for moving joint points
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
        const clickedJoint = getClickedJointPoint(x, y);

        if (clickedComp) {
            selectedComponentForMoving = clickedComp;
            initialMoveX = clickedComp.x; // Store initial position for move
            initialMoveY = clickedComp.y;
            dragOffsetX = x - selectedComponentForMoving.x;
            dragOffsetY = y - selectedComponentForMoving.y;
            canvas.style.cursor = 'grabbing';
        } else if (clickedJoint) {
            selectedJointPoint = clickedJoint;
            initialMoveX = clickedJoint.x;
            initialMoveY = clickedJoint.y;
            dragOffsetX = x - selectedJointPoint.x;
            dragOffsetY = y - selectedJointPoint.y;
            canvas.style.cursor = 'grabbing';
        }
    });

    canvas.addEventListener('mousemove', (event) => {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        if (selectedComponentForMoving && !isWiringMode) {
            selectedComponentForMoving.x = x - dragOffsetX;
            selectedComponentForMoving.y = y - dragOffsetY;
            redrawCanvas();
        } else if (selectedJointPoint && !isWiringMode) {
            selectedJointPoint.wire.points[selectedJointPoint.pointIndex].x = x - dragOffsetX;
            selectedJointPoint.wire.points[selectedJointPoint.pointIndex].y = y - dragOffsetY;
            redrawCanvas();
        } else if (!selectedComponentForMoving && !selectedJointPoint && !isWiringMode) {
            const hoverComp = getClickedComponent(x, y);
            const hoverJoint = getClickedJointPoint(x, y);
            if (hoverComp) {
                canvas.style.cursor = 'grab';
            } else if (hoverJoint) {
                canvas.style.cursor = 'grab'; // Indicate draggable joint point
            } else {
                canvas.style.cursor = 'default';
            }
        }
    });

    canvas.addEventListener('mouseup', (event) => {
        if (selectedComponentForMoving && !isWiringMode) {
            if (selectedComponentForMoving.x !== initialMoveX || selectedComponentForMoving.y !== initialMoveY) {
                 saveStateForUndo();
            }
        } else if (selectedJointPoint && !isWiringMode) {
            if (selectedJointPoint.wire.points[selectedJointPoint.pointIndex].x !== initialMoveX || selectedJointPoint.wire.points[selectedJointPoint.pointIndex].y !== initialMoveY) {
                saveStateForUndo();
            }
        }
        selectedComponentForMoving = null;
        selectedJointPoint = null;
        initialMoveX = null;
        initialMoveY = null;
        if (!isWiringMode) {
            const rect = canvas.getBoundingClientRect();
            const mx = event.clientX - rect.left;
            const my = event.clientY - rect.top;
            const hoverComp = getClickedComponent(mx, my);
            const hoverJoint = getClickedJointPoint(mx, my);
            if (hoverComp || hoverJoint) {
                canvas.style.cursor = 'grab';
            } else {
                canvas.style.cursor = 'default';
            }
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
                    saveStateForUndo();
                    const startCenter = getComponentCenter(firstSelectedComponentForWire);
                    const endCenter = getComponentCenter(clickedComponent);
                    wires.push({
                        wireId: nextWireInstanceId++,
                        startComponentId: firstSelectedComponentForWire.instanceId,
                        endComponentId: clickedComponent.instanceId,
                        points: [
                            { x: startCenter.x, y: startCenter.y },
                            { x: endCenter.x, y: endCenter.y }
                        ]
                    });
                    firstSelectedComponentForWire = null;
                } else {
                    firstSelectedComponentForWire = null;
                }
            }
        } else {
            // Clicked on empty canvas or a wire
            firstSelectedComponentForWire = null; // Deselect any component if clicking on empty space

            // Check if a wire was clicked to add a joint point
            const clickedWireInfo = getClickedWireSegment(x, y);
            if (clickedWireInfo) {
                saveStateForUndo();
                clickedWireInfo.wire.points.splice(clickedWireInfo.segmentIndex + 1, 0, { x: x, y: y });
            }
        }
        redrawCanvas();
    });

    // New: Function to get clicked wire segment for adding a joint point
    function getClickedWireSegment(x, y) {
        const detectionRadius = 5; // Pixels around the line segment for click detection
        for (const wire of wires) {
            for (let i = 0; i < wire.points.length - 1; i++) {
                const p1 = wire.points[i];
                const p2 = wire.points[i + 1];

                // Check if click is on the segment (simplified for now, can be more precise)
                const dist = distToSegment(x, y, p1.x, p1.y, p2.x, p2.y);
                if (dist < detectionRadius) {
                    return { wire: wire, segmentIndex: i };
                }
            }
        }
        return null;
    }

    // Helper function to calculate distance from a point to a line segment
    // From: https://stackoverflow.com/questions/849211/shortest-distance-between-a-point-and-a-line-segment-in-c-sharp
    function distToSegment(px, py, x1, y1, x2, y2) {
        const l2 = Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2);
        if (l2 === 0) return Math.sqrt(Math.pow(px - x1, 2) + Math.pow(py - y1, 2)); // p1 == p2, return distance to point
        let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
        t = Math.max(0, Math.min(1, t));
        const projectionX = x1 + t * (x2 - x1);
        const projectionY = y1 + t * (y2 - y1);
        return Math.sqrt(Math.pow(px - projectionX, 2) + Math.pow(py - projectionY, 2));
    }

    function getComponentCenter(comp) {
        return {
            x: comp.x + comp.width / 2,
            y: comp.y + comp.height / 2
        };
    }

    function getClickedComponent(x, y) {
        for (let i = placedComponents.length - 1; i >= 0; i--) {
            const comp = placedComponents[i];
            if (x >= comp.x && x <= comp.x + comp.width && y >= comp.y && y <= comp.y + comp.height) {
                return comp;
            }
        }
        return null;
    }

    // New: Function to get clicked joint point
    function getClickedJointPoint(x, y) {
        const jointPointRadius = 5; // Radius for click detection
        for (const wire of wires) {
            for (let i = 0; i < wire.points.length; i++) {
                const point = wire.points[i];
                // Only consider intermediate points as draggable joint points for now
                if (i > 0 && i < wire.points.length - 1) {
                    const dist = Math.sqrt(Math.pow(x - point.x, 2) + Math.pow(y - point.y, 2));
                    if (dist <= jointPointRadius) {
                        return { wire: wire, pointIndex: i, x: point.x, y: point.y };
                    }
                }
            }
        }
        return null;
    }

    function redrawCanvas() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.lineWidth = 2;
        wires.forEach(wire => {
            const compStart = placedComponents.find(c => c.instanceId === wire.startComponentId);
            const compEnd = placedComponents.find(c => c.instanceId === wire.endComponentId);

            // Re-calculate start/end points based on current component positions
            if (compStart) wire.points[0] = getComponentCenter(compStart);
            if (compEnd) wire.points[wire.points.length - 1] = getComponentCenter(compEnd);

            if (compStart && compEnd) {
                // Determine wire color based on connection to Bus Bar or Ground Bar
                if (compStart.typeId === 'ground_bar' || compEnd.typeId === 'ground_bar') {
                    ctx.strokeStyle = 'green';
                } else if (compStart.typeId === 'bus_bar' || compEnd.typeId === 'bus_bar') {
                    ctx.strokeStyle = 'red';
                } else {
                    ctx.strokeStyle = 'black';
                }

                ctx.beginPath();
                ctx.moveTo(wire.points[0].x, wire.points[0].y);
                for (let i = 1; i < wire.points.length; i++) {
                    ctx.lineTo(wire.points[i].x, wire.points[i].y);
                }
                ctx.stroke();

                // Draw joint points (except start/end component centers)
                for (let i = 1; i < wire.points.length - 1; i++) {
                    const point = wire.points[i];
                    ctx.fillStyle = 'blue'; // Joint point color
                    ctx.beginPath();
                    ctx.arc(point.x, point.y, 4, 0, Math.PI * 2); // Joint point circle
                    ctx.fill();
                }

            } else {
                console.warn('Could not find start or end component for wire:', wire);
            }
        });
        placedComponents.forEach(comp => {
            drawComponentShape(comp);

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

            // Draw connection point (black dot in the center)
            ctx.fillStyle = 'black';
            ctx.beginPath();
            ctx.arc(comp.x + comp.width / 2, comp.y + comp.height / 2, 3, 0, Math.PI * 2); // 3 pixel radius black dot
            ctx.fill();
        });
        drawGrid();
    }

    function drawComponentShape(comp) {
        ctx.fillStyle = comp.color;
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;

        switch (comp.drawingType) {
            case 'rectangle':
                ctx.fillRect(comp.x, comp.y, comp.width, comp.height);
                ctx.strokeRect(comp.x, comp.y, comp.width, comp.height);
                break;
            case 'circuitBreaker':
                ctx.fillRect(comp.x, comp.y, comp.width, comp.height);
                ctx.strokeRect(comp.x, comp.y, comp.width, comp.height);
                // Add a simple toggle switch visual
                ctx.beginPath();
                ctx.moveTo(comp.x + comp.width / 2, comp.y + comp.height / 4);
                ctx.lineTo(comp.x + comp.width / 2, comp.y + comp.height * 3 / 4);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(comp.x + comp.width / 2, comp.y + comp.height / 4, 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(comp.x + comp.width / 2, comp.y + comp.height * 3 / 4, 3, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'mainBreaker':
                ctx.fillRect(comp.x, comp.y, comp.width, comp.height);
                ctx.strokeRect(comp.x, comp.y, comp.width, comp.height);
                // Thicker lines for main breaker
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(comp.x + comp.width / 2, comp.y + comp.height / 5);
                ctx.lineTo(comp.x + comp.width / 2, comp.y + comp.height * 4 / 5);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(comp.x + comp.width / 2, comp.y + comp.height / 5, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(comp.x + comp.width / 2, comp.y + comp.height * 4 / 5, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.lineWidth = 1; // Reset to default
                break;
            case 'contactor':
                ctx.fillRect(comp.x, comp.y, comp.width, comp.height);
                ctx.strokeRect(comp.x, comp.y, comp.width, comp.height);
                // Coil representation
                ctx.beginPath();
                ctx.arc(comp.x + comp.width / 2, comp.y + comp.height / 2, Math.min(comp.width, comp.height) / 4, 0, Math.PI * 2);
                ctx.stroke();
                // Contacts
                ctx.beginPath();
                ctx.moveTo(comp.x + comp.width / 4, comp.y + comp.height / 4);
                ctx.lineTo(comp.x + comp.width / 4, comp.y + comp.height * 3 / 4);
                ctx.stroke();
                ctx.moveTo(comp.x + comp.width * 3 / 4, comp.y + comp.height / 4);
                ctx.lineTo(comp.x + comp.width * 3 / 4, comp.y + comp.height * 3 / 4);
                ctx.stroke();
                break;
            case 'overloadRelay':
                ctx.fillRect(comp.x, comp.y, comp.width, comp.height);
                ctx.strokeRect(comp.x, comp.y, comp.width, comp.height);
                // Thermal symbol
                ctx.beginPath();
                ctx.moveTo(comp.x + comp.width / 4, comp.y + comp.height / 2);
                ctx.lineTo(comp.x + comp.width * 3 / 4, comp.y + comp.height / 2);
                ctx.moveTo(comp.x + comp.width / 3, comp.y + comp.height / 2 - 5);
                ctx.lineTo(comp.x + comp.width / 3, comp.y + comp.height / 2 + 5);
                ctx.moveTo(comp.x + comp.width * 2 / 3, comp.y + comp.height / 2 - 5);
                ctx.lineTo(comp.x + comp.width * 2 / 3, comp.y + comp.height / 2 + 5);
                ctx.stroke();
                break;
            case 'fuseBlock':
                ctx.fillRect(comp.x, comp.y, comp.width, comp.height);
                ctx.strokeRect(comp.x, comp.y, comp.width, comp.height);
                // Fuse symbol
                ctx.beginPath();
                ctx.rect(comp.x + comp.width / 4, comp.y + comp.height / 3, comp.width / 2, comp.height / 3);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(comp.x + comp.width / 4, comp.y + comp.height / 2);
                ctx.lineTo(comp.x, comp.y + comp.height / 2);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(comp.x + comp.width * 3 / 4, comp.y + comp.height / 2);
                ctx.lineTo(comp.x + comp.width, comp.y + comp.height / 2);
                ctx.stroke();
                break;
            case 'transformer':
                ctx.fillRect(comp.x, comp.y, comp.width, comp.height);
                ctx.strokeRect(comp.x, comp.y, comp.width, comp.height);
                // Coils
                ctx.beginPath();
                ctx.arc(comp.x + comp.width / 4, comp.y + comp.height / 2, Math.min(comp.width, comp.height) / 4, 0, Math.PI * 2);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(comp.x + comp.width * 3 / 4, comp.y + comp.height / 2, Math.min(comp.width, comp.height) / 4, 0, Math.PI * 2);
                ctx.stroke();
                // Core lines
                ctx.beginPath();
                ctx.moveTo(comp.x + comp.width / 2 - 5, comp.y + comp.height / 4);
                ctx.lineTo(comp.x + comp.width / 2 - 5, comp.y + comp.height * 3 / 4);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(comp.x + comp.width / 2 + 5, comp.y + comp.height / 4);
                ctx.lineTo(comp.x + comp.width / 2 + 5, comp.y + comp.height * 3 / 4);
                ctx.stroke();
                break;
            case 'terminalStrip':
                ctx.fillRect(comp.x, comp.y, comp.width, comp.height);
                ctx.strokeRect(comp.x, comp.y, comp.width, comp.height);
                // Terminal points
                const terminalCount = Math.floor(comp.width / 20); // Approximately every 20px
                for (let i = 0; i < terminalCount; i++) {
                    ctx.beginPath();
                    ctx.arc(comp.x + 10 + i * 20, comp.y + comp.height / 2, 3, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;
            case 'pilotLight':
                ctx.fillStyle = comp.color;
                ctx.beginPath();
                ctx.arc(comp.x + comp.width / 2, comp.y + comp.height / 2, Math.min(comp.width, comp.height) / 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                break;
            case 'pushButton':
                ctx.fillStyle = comp.color;
                ctx.beginPath();
                ctx.arc(comp.x + comp.width / 2, comp.y + comp.height / 2, Math.min(comp.width, comp.height) / 2 * 0.8, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                // Button outline
                ctx.beginPath();
                ctx.arc(comp.x + comp.width / 2, comp.y + comp.height / 2, Math.min(comp.width, comp.height) / 2, 0, Math.PI * 2);
                ctx.stroke();
                break;
            case 'eStop':
                ctx.fillStyle = comp.color;
                ctx.beginPath();
                ctx.arc(comp.x + comp.width / 2, comp.y + comp.height / 2, Math.min(comp.width, comp.height) / 2 * 0.9, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                // Yellow background for E-Stop
                ctx.fillStyle = 'yellow';
                ctx.beginPath();
                ctx.moveTo(comp.x, comp.y);
                ctx.lineTo(comp.x + comp.width, comp.y);
                ctx.lineTo(comp.x + comp.width, comp.y + comp.height);
                ctx.lineTo(comp.x, comp.y + comp.height);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.fillStyle = comp.color; // Reset fill style
                ctx.beginPath();
                ctx.arc(comp.x + comp.width / 2, comp.y + comp.height / 2, Math.min(comp.width, comp.height) / 2 * 0.7, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                break;
            case 'connectionPoint':
                ctx.fillStyle = comp.color;
                ctx.beginPath();
                ctx.arc(comp.x + comp.width / 2, comp.y + comp.height / 2, comp.width / 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                break;
            default: // Fallback to rectangle for undefined drawingTypes
                ctx.fillRect(comp.x, comp.y, comp.width, comp.height);
                ctx.strokeRect(comp.x, comp.y, comp.width, comp.height);
                break;
        }
    }

    function drawGrid() {
        ctx.strokeStyle = '#e0e0e0'; // Light grey for the grid lines
        ctx.lineWidth = 1;
        const gridSize = 20; // Size of each grid square

    // Draw vertical lines
    for (let x = 0; x <= canvasWidth; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvasHeight);
        ctx.stroke();
    }

    // Draw horizontal lines
    for (let y = 0; y <= canvasHeight; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvasWidth, y);
        ctx.stroke();
    }
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
