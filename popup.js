document.getElementById("saveKeyBtn").onclick = function () {
    const key = document.getElementById("apiKeyInput").value.trim();
    if (!key) return;

    chrome.storage.local.set({ outlookOptimizerApiKey: key }, function () {
        alert("API key saved for demo use.");
        document.getElementById("apiKeyInput").value = "";
    });
};

document.getElementById("showBtn").onclick = function () { sendMessage("show"); };
document.getElementById("aiBtn").onclick = function () { sendMessage("aiCurrent"); };
document.getElementById("currentBtn").onclick = function () { sendMessage("current"); };
document.getElementById("scanBtn").onclick = function () { sendMessage("scan"); };
document.getElementById("hideBtn").onclick = function () { sendMessage("hide"); };

function sendMessage(actionName) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (!tabs[0]) return;
        chrome.tabs.sendMessage(tabs[0].id, { action: actionName }, function (response) {
            if (chrome.runtime.lastError) console.log("Error:", chrome.runtime.lastError.message);
            else console.log("Response:", response);
        });
    });
}