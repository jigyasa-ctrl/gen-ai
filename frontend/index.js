const input = document.getElementById("input");
const container = document.querySelector("#chat-container");
const ask = document.querySelector("#ask");

input?.addEventListener("keyup", handleEnter);
ask?.addEventListener("click", handleAsk);

async function handleAsk(e) {
    const text = input?.value.trim();
    if (!text) {
        return;
    }
    await generate(text);
}

async function generate(text) {
    // append user message to UI
    const userChat = document.createElement("div");
    userChat.className = "my-6 bg-neutral-800 p-3 rounded-xl ml-auto max-w-fit";
    userChat.textContent = text;
    container.appendChild(userChat);
    input.value = '';

    // send message to LLM
    const assistantReply = await callServer(text);

    // append response to ui
    const assistantDiv = document.createElement("div");
    assistantDiv.className = "max-w-fit";
    assistantDiv.textContent = assistantReply;
    container.appendChild(assistantDiv);
}

async function callServer(inputText) {
    const response = await fetch("http://localhost:3001/chat", {
        method: "POST",
        headers: {
            "Content-type": "application/json"
        },
        body: JSON.stringify({
            message: inputText
        })
    });
    if (!response.ok) {
        throw new Error("Something went wrong");
    }
    const result = await response.json();
    return result.message;
}

async function handleEnter(e) {
    if (e.key === "Enter") {
        const text = input?.value.trim();
        if (!text) {
            return;
        }
        await generate(text);
    }
}
