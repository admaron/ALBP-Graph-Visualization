window.onload = () => {

    //! Global variables
    const updateBTN = document.querySelector("#updateBTN");
    const copyBTN = document.querySelector("#copyBTN");
    const sourceBTN = document.querySelector("#sourceBTN");
    const sourceWRAP = document.querySelector("#sourceWrapper");
    const sourceTXTAREA = document.querySelector("#source");
    const notificationElem = document.querySelector("#notification");
    const highlight = document.querySelector("#highlight");
    const fileInput = document.querySelector("#filePicker");

    let Data = [];
    let nodesStorage = [-1];
    let highlightCurrLine = 0;
    let error = false;

    //! Window resize handler
    window.addEventListener('resize', () => {
        let nodeConnection = document.querySelectorAll(".leader-line");

        nodeConnection.forEach(e => {
            e.remove();
        });

        if (error) {
            let pos = sourceTXTAREA.getBoundingClientRect();
            highlight.style.top = (pos.top + 30 + (highlightCurrLine * 25.2)) + "px";
            highlight.style.left = (pos.left + 30) + "px";
            highlight.style.opacity = 0.3;
        } else {
            console.clear();
            generateConnections();
        }
    });


    //! File input handler
    fileInput.addEventListener("change", () => {
        let fr = new FileReader();

        highlight.style.opacity = 0;

        fr.readAsText(fileInput.files[0]);
        fr.onload = () => {
            document.querySelector("#source").value = fr.result;

            notificationElem.querySelector("p").innerText = 'Data loaded form file!';
            notificationElem.style.opacity = 1;
            notificationElem.style.pointerEvents = "auto";

            setTimeout(() => {
                notificationElem.style.opacity = 0;
                notificationElem.style.pointerEvents = "none";
            }, 1500);
        }
    });


    //! "Copy data" button handler
    copyBTN.addEventListener("click", () => {
        sourceTXTAREA.select();
        sourceTXTAREA.setSelectionRange(0, 99999);
        navigator.clipboard.writeText(sourceTXTAREA.value);

        notificationElem.querySelector("p").innerText = 'Data copied to clipboard!';
        notificationElem.style.opacity = 1;
        notificationElem.style.pointerEvents = "auto";

        setTimeout(() => {
            notificationElem.style.opacity = 0;
            notificationElem.style.pointerEvents = "none";
        }, 1500);
    });


    //! "Update data" button handler
    updateBTN.addEventListener("click", () => {
        let nodeConnection = document.querySelectorAll(".leader-line");
        let columns = document.querySelectorAll(".nodeColumnds");

        sourceBTN.classList.remove("hide");

        Data = [];
        nodesStorage = [-1];

        nodeConnection.forEach(e => {
            e.remove();
        });

        columns.forEach(e => {
            e.remove();
        });

        parseSourceData();
        appendData();
        generateConnections();
        appendNodeTime();

        sourceWRAP.classList.add("hide");

        notificationElem.querySelector("p").innerText = 'Visualization updated!';
        notificationElem.style.opacity = 1;
        notificationElem.style.pointerEvents = "auto";

        setTimeout(() => {
            notificationElem.style.opacity = 0;
            notificationElem.style.pointerEvents = "none";
        }, 1500);
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


    function errorHandler() {
        let nodeConnection = document.querySelectorAll(".leader-line");
        let columns = document.querySelectorAll(".nodeColumnds");

        error = true;

        Data = [];
        nodesStorage = [-1];

        nodeConnection.forEach(e => {
            e.remove();
        });

        columns.forEach(e => {
            e.remove();
        });
    }


    //! Data parsing function
    function parseSourceData() {
        let sourceData = sourceTXTAREA.value;

        if (sourceData.length == 0) {
            notificationElem.querySelector("p").innerText = 'No input data!';
            notificationElem.style.opacity = 1;
            notificationElem.style.pointerEvents = "auto";

            setTimeout(() => {
                notificationElem.style.opacity = 0;
                notificationElem.style.pointerEvents = "none";
            }, 1500);
            throw new Error("No input data");
        }

        if (sourceData.charAt(sourceData.length - 1) == "]") {
            sourceData = sourceTXTAREA.value + ",";
        } else {
            notificationElem.querySelector("p").innerText = 'Incorrect input data ending!';
            notificationElem.style.opacity = 1;
            notificationElem.style.pointerEvents = "auto";

            let pos = sourceTXTAREA.getBoundingClientRect();
            highlightCurrLine = (sourceData.split("\n").length - 1);
            highlight.style.top = (pos.top + 30 + (highlightCurrLine * 25.2)) + "px";
            highlight.style.left = (pos.left + 30) + "px";
            highlight.style.opacity = 0.3;
            errorHandler();

            setTimeout(() => {
                notificationElem.style.opacity = 0;
                notificationElem.style.pointerEvents = "none";
            }, 2000);
            throw new Error("Inccorect end of last line");
        }

        sourceData = sourceData.split("\n");

        for (let i = 0; i < sourceData.length; i++) {
            validateSourceData(sourceData[i], i, sourceData.length);
            sourceData[i] = sourceData[i].slice(3, sourceData[i].length);

            for (let j = 0; j < sourceData[i].length; j++) {
                if (sourceData[i].charAt(j) == "[") {
                    let tmp = sourceData[i].slice(j, sourceData[i].length - 1).replaceAll(" ", "");

                    sourceData[i] = sourceData[i].slice(0, j);
                    sourceData[i] += tmp;
                    sourceData[i] = sourceData[i].replace('"', "").replaceAll('"', "").split(" ");
                }
            }

            Data[i] = createDataObject(sourceData[i]);
        }
    }


    //! Data validation function
    function validateSourceData(data, i, dataLength) {


        //! Data structure check
        let regex = /([A-Z]{1,}p{1} [0-9]{1,} [0-9]{1,} (\"succs\"|\"preds\"){1} \[{1}[0-9, ]{1,}\]{1},{1})/i;;

        if (!regex.test(data)) {
            notificationElem.querySelector("p").innerText = 'Incorrect input data structure - Line ' + (i + 1);
            notificationElem.style.opacity = 1;
            notificationElem.style.pointerEvents = "auto";
            highlightLine();
            errorHandler();

            setTimeout(() => {
                notificationElem.style.opacity = 0;
                notificationElem.style.pointerEvents = "none";
            }, 2000);
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
            notificationElem.querySelector("p").innerText = 'Incorrect task number - Line ' + (i + 1);
            notificationElem.style.opacity = 1;
            notificationElem.style.pointerEvents = "auto";
            highlightLine();
            errorHandler();

            setTimeout(() => {
                notificationElem.style.opacity = 0;
                notificationElem.style.pointerEvents = "none";
            }, 2000);
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
            notificationElem.querySelector("p").innerText = 'Incorrect task time - Line ' + (i + 1);
            notificationElem.style.opacity = 1;
            notificationElem.style.pointerEvents = "auto";
            highlightLine();
            errorHandler();

            setTimeout(() => {
                notificationElem.style.opacity = 0;
                notificationElem.style.pointerEvents = "none";
            }, 2000);
            throw new Error("Inccorect task time (null) - Line " + (i + 1));
        }


        //! Task NODES check
        currIndex += 9;
        let dataNODEStmp = data.slice(currIndex, data.length).replaceAll(" ", "");
        let dataNODES = "";
        for (let j = 0; j < dataNODEStmp.length; j++) {
            if (dataNODEStmp.charAt(j) == "," || dataNODEStmp.charAt(j) == "]") {
                if (parseInt(dataNODES) > dataLength || parseInt(dataNODES) == dataID) {
                    notificationElem.querySelector("p").innerText = 'Incorrect succs / preds input - Line ' + (i + 1);
                    notificationElem.style.opacity = 1;
                    notificationElem.style.pointerEvents = "auto";
                    highlightLine();
                    errorHandler();

                    setTimeout(() => {
                        notificationElem.style.opacity = 0;
                        notificationElem.style.pointerEvents = "none";
                    }, 2000);
                    throw new Error("Inccorect succs / preds input (not existing) - Line " + (i + 1));
                }
                dataNODES = "";
            } else {
                dataNODES += dataNODEStmp[j];
            }
        }

        highlight.style.opacity = 0;
        error = false;


        //! Highlight line in textarea function
        function highlightLine() {
            let pos = sourceTXTAREA.getBoundingClientRect();
            highlight.style.top = (pos.top + 30 + (i * 25.2)) + "px";
            highlight.style.left = (pos.left + 30) + "px";
            highlight.style.opacity = 0.3;
            highlightCurrLine = i;
        }

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


    //! Data to HTML structure input function
    function appendData() {

        clearVisualization();
        let body = document.querySelector("#visualizationWrapper");
        for (let i = 0; i < Data.length * 2; i++) {
            body.innerHTML += '<div class="nodesColumn"></div>';
        }

        let nodesColumns = document.querySelectorAll(".nodesColumn");

        defaultNodeappend(Data[0])

        for (let d = 1; d < Data.length; d++) {
            let nodeExists = [-1];

            if (findNode(Data[d].ID) != -1) {
                nodeExists[0] = findNode(Data[d].ID);
            }

            for (let i = 0; i < Data[d].nodes.length; i++) {
                if (findNode(Data[d].nodes[i]) != -1) {
                    nodeExists[i + 1] = findNode(Data[d].nodes[i]);
                } else {
                    nodeExists[i + 1] = -1;
                }
            }

            if (nodeExists.every((val) => val === -1)) {
                defaultNodeappend(Data[d]);
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

        function defaultNodeappend(data, i) {
            if (data.type == "succs") {
                nodesColumns[0].innerHTML += '<div class="node"><span>' + data.ID + '</span><p class="time"></p></div>';

                for (let i = 0; i < data.nodes.length; i++) {
                    nodesColumns[1].innerHTML += '<div class="node"><span>' + data.nodes[i] + '</span><p class="time"></p></div>';
                }
            } else {
                nodesColumns[1].innerHTML += '<div class="node"><span>' + data.ID + '</span><p class="time"></p></div>';

                for (let i = 0; i < data.nodes.length; i++) {
                    nodesColumns[0].innerHTML += '<div class="node"><span>' + data.nodes[i] + '</span><p class="time"></p></div>';
                }
            }
        }

        function NodeAppendController(data, type, index, idSwitch) {
            if (type == "succs") {
                appendNode(data, index + idSwitch)
            } else {
                appendNode(data, index - idSwitch);
            }

            function appendNode(d, i) {
                nodesColumns[i].innerHTML += '<div class="node"><span>' + d + '</span><p class="time"></p></div>';
            }
        }

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
                if (Data[d].ID < Data[d].nodes[i]) {
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
