//! Variable to change max number of iteration in collision detection and repair algorithm (EDIT VIA BROWSER CONSOLE)
let maxIterations = 100;


//! Main app
window.onload = () => {

    //! Global variables
    const updateBTN = document.querySelector("#updateBTN");
    const copyBTN = document.querySelector("#copyBTN");
    const sourceBTN = document.querySelector("#sourceBTN");
    const sourceWRAP = document.querySelector("#sourceWrapper");
    const sourceTXTAREA = document.querySelector("#source");
    const notificationELEM = document.querySelector("#notification");
    const highlight = document.querySelector("#highlight");
    const fileInput = document.querySelector("#filePicker");

    let Data = []; // Array of input data objects created by createDataObject()
    let Lines = []; // Array of line data objects created by createLineObject()
    let nodesStorage = [-1]; // Array of graph nodes (DOM elements)
    let highlightCurrLine = 0;
    let error = false;
    let LinesNotValid = true;
    let LineErrorNode; // End graph node of line with detected collision (DOM element)
    let ColumnNodeSwitches = 0; // Counter of node position swaps in a column - switchNodes()


    //! Window resize handler
    window.addEventListener('resize', () => {
        clearConnections();

        if (error) {
            highlightLineUpdate(false, highlightCurrLine);
        } else {
            generateConnections();
            console.clear();
        }
    });


    //! File input handler
    fileInput.addEventListener("change", () => {
        let fr = new FileReader();

        highlight.style.opacity = 0;

        fr.readAsText(fileInput.files[0]);
        fr.onload = () => {
            document.querySelector("#source").value = fr.result;
            notificationUpdate('Data loaded form file!', 1500);
        }
    });


    //! "Copy data" button handler
    copyBTN.addEventListener("click", () => {
        sourceTXTAREA.select();
        sourceTXTAREA.setSelectionRange(0, 99999);
        navigator.clipboard.writeText(sourceTXTAREA.value);

        notificationUpdate('Data copied to clipboard!', 1500);
    });

    //! "Update data" button handler
    updateBTN.addEventListener("click", () => {
        sourceBTN.classList.remove("hide");

        Data = [];
        nodesStorage = [-1];
        LinesNotValid = true;

        clearConnections();
        clearVisualization();

        parseSourceData();
        appendData();

        let loopTerminator = 0;
        while (LinesNotValid && loopTerminator < maxIterations) {
            Lines = [];

            clearConnections();
            generateConnections();

            loopTerminator++;
            if (LinesNotValid && loopTerminator < maxIterations) {
                switchNodes(LineErrorNode);
            }
        }

        if (loopTerminator == maxIterations) {
            highlightLineUpdate(true);
            clearVisualization();
            errorHandler();
            notificationUpdate('Graph cannot be created correctly!', 2000);
            throw new Error("Graph cannot be created correctly - Increase max number of algorithm iterations");
        }

        appendNodeTime();
        notificationUpdate('Visualization updated!', 1500);

        sourceWRAP.classList.add("hide");
    })


    //! Menu button handler
    sourceBTN.addEventListener("click", () => {
        if (!error) {
            if (sourceWRAP.classList.contains("hide")) {
                sourceWRAP.classList.remove("hide");
            } else {
                sourceWRAP.classList.add("hide");
            }
        }
    })


    //! Notification handler
    function notificationUpdate(notice, time) {
        notificationELEM.querySelector("p").innerText = notice;
        notificationELEM.style.opacity = 1;
        notificationELEM.style.pointerEvents = "auto";

        setTimeout(() => {
            notificationELEM.style.opacity = 0;
            notificationELEM.style.pointerEvents = "none";
        }, time);
    }


    //! Error handling function
    function errorHandler() {
        error = true;
        Data = [];
        nodesStorage = [-1];

        clearConnections();
        clearVisualization();
    }


    //! Highlight line in textarea function
    function highlightLineUpdate(hideHighlight, i) {
        if (!hideHighlight) {
            let pos = sourceTXTAREA.getBoundingClientRect();
            highlight.style.top = (pos.top + 30 + (i * 25.2)) + "px";
            highlight.style.left = (pos.left + 30) + "px";
            highlight.style.opacity = 0.3;
            highlightCurrLine = i;
        } else {
            highlight.style.top = 0;
            highlight.style.left = 0;
            highlight.style.opacity = 0;
        }
    }


    //! Connection clearing function
    function clearConnections() {
        let nodeConnection = document.querySelectorAll(".leader-line");

        nodeConnection.forEach(e => {
            e.remove();
        });
    }


    //! Data parsing function
    function parseSourceData() {
        let sourceData = sourceTXTAREA.value;

        if (sourceData.length == 0) {
            highlightLineUpdate(true);
            errorHandler();
            notificationUpdate('No input data!', 1500);
            throw new Error("No input data");
        }

        // Check if source data ends correctly
        if (sourceData.charAt(sourceData.length - 1) == "]") {
            sourceData = sourceTXTAREA.value + ",";
        } else {
            highlightLineUpdate(false, sourceData.split("\n").length - 1);
            errorHandler();
            notificationUpdate('Incorrect input data ending!', 2000);
            throw new Error("Inccorect end of last line");
        }

        sourceData = sourceData.split("\n");

        for (let i = 0; i < sourceData.length; i++) {
            validateSourceData(sourceData[i], i, sourceData.length);
            sourceData[i] = sourceData[i].slice(3, sourceData[i].length); // Remove "0p" from the beginning of the line

            for (let j = 0; j < sourceData[i].length; j++) {
                if (sourceData[i].charAt(j) == "[") {
                    let tmp = sourceData[i].slice(j, sourceData[i].length - 1).replaceAll(" ", ""); // Get and format succs/preds data array
                    sourceData[i] = sourceData[i].slice(0, j); // Get data without succs/preds data array
                    sourceData[i] += tmp;
                    sourceData[i] = sourceData[i].replace('"', "").replaceAll('"', "").split(" "); // Format and convert input string to array of separate elements
                }
            }

            Data[i] = createDataObject(sourceData[i]);
        }


        //! Data validation function
        function validateSourceData(data, i, dataLength) {


            //! Data structure check
            let regex = /([A-Z]{1,}p{1} [0-9]{1,} [0-9]{1,} (\"succs\"|\"preds\"){1} \[[0-9]{1,}((, [0-9]{1,}){0,})\]{1})/i;;

            if (!regex.test(data)) {
                highlightLineUpdate(false, i);
                errorHandler();

                notificationUpdate('Incorrect input data structure - Line ' + (i + 1), 2000);
                throw new Error("Inccorect data structure - Line " + (i + 1));
            }


            //! Task ID check
            let currIndex = 3;
            let dataIDtmp = data.slice(currIndex, data.length);
            let dataID = "";

            for (let j = 0; j < dataIDtmp.length; j++) {
                currIndex++;
                if (dataIDtmp.charAt(j) == " ") {
                    break;
                } else {
                    dataID += dataIDtmp[j];
                }
            }

            if (parseInt(dataID) != (i + 1)) {
                highlightLineUpdate(false, i);
                errorHandler();
                notificationUpdate('Incorrect task number - Line ' + (i + 1), 2000);
                throw new Error("Inccorect task number - Line " + (i + 1));
            }


            //! Task TIME check
            let dataTIMEtmp = data.slice(currIndex, data.length);
            let dataTIME = "";

            for (let j = 0; j < dataTIMEtmp.length; j++) {
                currIndex++;
                if (dataTIMEtmp.charAt(j) == " ") {
                    break;
                } else {
                    dataTIME += dataTIMEtmp[j];
                }
            }

            if (parseInt(dataTIME) == 0) {
                highlightLineUpdate(false, i);
                errorHandler();
                notificationUpdate('Incorrect task time (null) - Line ' + (i + 1), 2000);
                throw new Error("Inccorect task time (null) - Line " + (i + 1));
            }

            let dataTYPE = data.slice(currIndex + 1, currIndex + 6); // Get data type (succs/preds)

            //! Task NODES check
            currIndex += 9; // Added to skip past "succs"/"preds" and [
            let dataNODEtmp = data.slice(currIndex, data.length).replaceAll(" ", ""); // Get and format succs/preds array beginning with first node's ID
            let dataNODE = "";

            for (let j = 0; j < dataNODEtmp.length; j++) {
                if (dataNODEtmp.charAt(j) == "," || dataNODEtmp.charAt(j) == "]") {
                    if (parseInt(dataNODE) > dataLength) {
                        highlightLineUpdate(false, i);
                        errorHandler();
                        notificationUpdate('Incorrect succs / preds input (not existing) - Line ' + (i + 1), 2000);
                        throw new Error("Inccorect succs / preds input (not existing) - Line " + (i + 1));
                    }

                    if (parseInt(dataNODE) == dataID) {
                        highlightLineUpdate(false, i);
                        errorHandler();
                        notificationUpdate('Incorrect succs / preds input (identical to ID) - Line ' + (i + 1), 2000);
                        throw new Error("Inccorect succs / preds input (identical to ID) - Line " + (i + 1));
                    }

                    if ((dataTYPE == "succs" && parseInt(dataNODE) < dataID) || (dataTYPE == "preds" && parseInt(dataNODE) > dataID)) {
                        highlightLineUpdate(false, i);
                        errorHandler();
                        notificationUpdate('Incorrect succs / preds input (wrong task order) - Line ' + (i + 1), 2000);
                        throw new Error("Inccorect succs / preds input (wrong task order) - Line " + (i + 1));
                    }
                    dataNODE = "";
                } else {
                    dataNODE += dataNODEtmp[j];
                }
            }

            highlightLineUpdate(true);
            error = false;
        }


        //! Data object creation function
        function createDataObject(data) {
            return {
                ID: parseInt(data[0]),
                time: parseInt(data[1]),
                type: data[2],
                nodes: JSON.parse(data[3])
            };
        }
    }


    //! Data to HTML structure input function
    function appendData() {
        clearVisualization();

        let lastColumn = 0;
        let body = document.querySelector("#visualizationWrapper");

        for (let i = 0; i < Data.length * 2; i++) {
            body.innerHTML += '<div class="nodesColumn"></div>';
        }

        let nodesColumns = document.querySelectorAll(".nodesColumn");

        defaultNodeAppend(Data[0], lastColumn);

        for (let d = 1; d < Data.length; d++) {
            let nodeExists = [-1]; // Array of column numbers of existing nodes in the format: [ID, SUCCS/PREDS ID]

            // Check if node with ID exists in HTML
            if (findNode(Data[d].ID) != -1) {
                nodeExists[0] = findNode(Data[d].ID);
            }

            // Check if succs/preds exists in HTML
            for (let i = 0; i < Data[d].nodes.length; i++) {
                if (findNode(Data[d].nodes[i]) != -1) {
                    nodeExists[i + 1] = findNode(Data[d].nodes[i]);
                } else {
                    nodeExists[i + 1] = -1;
                }
            }

            if (nodeExists.every((val) => val === -1)) {
                defaultNodeAppend(Data[d], lastColumn);
                continue;
            }

            if (nodeExists[0] != -1) {
                for (let i = 0; i < Data[d].nodes.length; i++) {
                    if (nodeExists[i + 1] == -1) {
                        NodeAppendController(Data[d].nodes[i], Data[d].type, nodeExists[0], 1);
                    }
                }
            } else {
                for (let i = 0; i < Data[d].nodes.length; i++) {
                    if (nodeExists[i + 1] != -1) {
                        NodeAppendController(Data[d].ID, Data[d].type, nodeExists[i + 1], -1);
                    }
                }
            }
        }

        for (let i = 0; i < nodesColumns.length; i++) {
            let clmNodes = nodesColumns[i].querySelectorAll(".node span");

            if (clmNodes.length == 0) {
                nodesColumns[i].remove();
            }
        }

        updateNodesStorage();


        //! Function to check if node exists in HTML structure and return its column number
        function findNode(idNum) {
            for (let i = 0; i < nodesColumns.length; i++) {
                let clmNodes = nodesColumns[i].querySelectorAll(".node span");

                if (clmNodes.length != 0) {
                    for (let j = 0; j < clmNodes.length; j++) {
                        if (clmNodes[j].innerText == idNum) {
                            return i;
                        }
                    }
                }
            }
            return -1;
        }


        //! Function to append node at its first appearance without any succs/preds
        function defaultNodeAppend(data, index) {
            if (data.type == "succs") {
                nodesColumns[index].innerHTML += '<div class="node"><span>' + data.ID + '</span><p class="time"></p></div>';

                for (let i = 0; i < data.nodes.length; i++) {
                    nodesColumns[index + 1].innerHTML += '<div class="node"><span>' + data.nodes[i] + '</span><p class="time"></p></div>';
                }
            } else {
                nodesColumns[index + 1].innerHTML += '<div class="node"><span>' + data.ID + '</span><p class="time"></p></div>';

                for (let i = 0; i < data.nodes.length; i++) {
                    nodesColumns[index].innerHTML += '<div class="node"><span>' + data.nodes[i] + '</span><p class="time"></p></div>';
                }
            }
        }


        //! Function to append node at its first appearance
        function NodeAppendController(data, type, index, idSwitch) {
            if (type == "succs") {
                appendNode(data, index + idSwitch);
            } else {
                appendNode(data, index - idSwitch);
            }

            function appendNode(d, i) {
                if (i < 0) {
                    i = 0;
                }

                lastColumn = i;
                nodesColumns[i].innerHTML += '<div class="node"><span>' + d + '</span><p class="time"></p></div>';
            }
        }


        //! Nodes storage update function (DOM Elements)
        function updateNodesStorage() {
            for (let j = 0; j < nodesColumns.length; j++) {
                let columnNodeElements = nodesColumns[j].querySelectorAll(".node");

                for (let n = 0; n < columnNodeElements.length; n++) {
                    nodesStorage[parseInt(columnNodeElements[n].innerText)] = columnNodeElements[n];
                }
            }
        }
    }


    //! HTML structure flush function
    function clearVisualization() {
        let nodesColumns = document.querySelectorAll(".nodesColumn");

        nodesColumns.forEach(e => {
            e.innerHTML = "";
        });
    }


    //! Connections (arrows) generating function
    function generateConnections() {
        for (let d = 0; d < Data.length; d++) {
            for (let i = 0; i < Data[d].nodes.length; i++) {

                // IF to prevent lines in reverse directions
                if (Data[d].ID < Data[d].nodes[i]) {
                    Lines.push(createLineObject(nodesStorage[Data[d].ID], nodesStorage[Data[d].nodes[i]]));

                    if (!validateLine(Lines[Lines.length - 1])) {
                        LinesNotValid = true;
                        return;
                    } else {
                        LinesNotValid = false;
                        new LeaderLine(nodesStorage[Data[d].ID], nodesStorage[Data[d].nodes[i]], {
                            size: 4,
                            path: 'straight',
                            endPlug: 'arrow3',
                            color: '#989898',
                            endPlugSize: 1.5
                        });
                    }
                }
            }
        }


        //! Connection colision detection function
        function validateLine(currentLine) {
            if (currentLine.startNode.top == currentLine.endNode.top || currentLine.startNode.left == currentLine.endNode.left) {
                return true;
            } else {
                if (window.screen.width > 1025) {
                    for (let i = 0; i < Lines.length - 1; i++) {
                        if ((currentLine.startNode.top < Lines[i].startNode.top && currentLine.endNode.top > Lines[i].endNode.top) || (currentLine.startNode.top > Lines[i].startNode.top && currentLine.endNode.top < Lines[i].endNode.top)) {
                            if ((currentLine.startNode.left == Lines[i].startNode.left && currentLine.endNode.left == Lines[i].endNode.left)) {
                                LineErrorNode = currentLine.end;
                                return false;
                            }
                        }
                    }
                } else {
                    for (let i = 0; i < Lines.length - 1; i++) {
                        if ((currentLine.startNode.left < Lines[i].startNode.left && currentLine.endNode.left > Lines[i].endNode.left) || (currentLine.startNode.left > Lines[i].startNode.left && currentLine.endNode.left < Lines[i].endNode.left)) {
                            if ((currentLine.startNode.top == Lines[i].startNode.top && currentLine.endNode.top == Lines[i].endNode.top)) {
                                LineErrorNode = currentLine.end;
                                return false;
                            }
                        }
                    }
                }
                return true;
            }
        }


        //! Data object creation function
        function createLineObject(start, end) {
            return {
                start: start,
                end: end,
                startNode: start.getBoundingClientRect(),
                endNode: end.getBoundingClientRect()
            };
        }
    }


    //! Graph nodes position swapping function
    function switchNodes(node) {
        let parent = node.parentNode;
        if (ColumnNodeSwitches < parent.childElementCount) {
            parent.insertBefore(parent.lastChild, parent.firstChild);
            ColumnNodeSwitches++;
        } else {
            let randNum = Math.floor(Math.random() * (parent.childElementCount));
            parent.insertBefore(parent.children[randNum], parent.firstChild);
        }
    }


    //! Task time input function
    function appendNodeTime() {
        let nodesColumns = document.querySelectorAll(".nodesColumn");

        for (let j = 0; j < nodesColumns.length; j++) {
            let columnNodeElements = nodesColumns[j].querySelectorAll(".node span");
            let columnNodeElementsTime = nodesColumns[j].querySelectorAll(".node .time");

            for (let n = 0; n < columnNodeElements.length; n++) {
                columnNodeElementsTime[n].innerText += Data[parseInt(columnNodeElements[n].innerText) - 1].time;
            }
        }
    }
};