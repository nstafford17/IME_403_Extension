document.getElementById("scanBtn").onclick = function () {
    sendMessageToOutlook("scan");
};

document.getElementById("showBtn").onclick = function () {
    sendMessageToOutlook("show");
};

document.getElementById("hideBtn").onclick = function () {
    sendMessageToOutlook("hide");
};

function sendMessageToOutlook(actionName) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (!tabs[0]) {
            return;
        }

        chrome.tabs.sendMessage(
            tabs[0].id,
            { action: actionName },
            function (response) {
                if (chrome.runtime.lastError) {
                    console.log("Message error:", chrome.runtime.lastError.message);
                } else {
                    console.log("Response:", response);
                }
            }
        );
    });
}