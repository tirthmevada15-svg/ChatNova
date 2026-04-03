let currentChat = null;

/* QUICK MESSAGE (HERO BUTTONS) */
function quickMsg(text){
    document.getElementById("msg").value = text;
    sendMsg();
}

/* CREATE NEW CHAT */
async function createChat(){
    try{
        let res = await fetch("/new_chat", { method: "POST" });

        if(!res.ok){
            console.error("Failed to create chat");
            return;
        }

        let data = await res.json();
        currentChat = data.id;

        // reset UI
        document.getElementById("hero").style.display = "flex";

        let chatBox = document.getElementById("chat-box");
        chatBox.classList.add("hidden");

        document.getElementById("chat-inner").innerHTML = "";

        loadChats();

    }catch(e){
        console.error("Create chat error:", e);
    }
}

/* SEND MESSAGE */
async function sendMsg(){
    let input = document.getElementById("msg");
    let text = input.value.trim();

    if(!text) return;

    // create chat if not exists
    if(!currentChat){
        try{
            let res = await fetch("/new_chat", { method: "POST" });

            if(!res.ok){
                console.error("Chat create failed");
                return;
            }

            let data = await res.json();
            currentChat = data.id;

        }catch(e){
            console.error(e);
            return;
        }
    }

    input.value = "";

    // switch UI to chat
    document.getElementById("hero").style.display = "none";
    document.getElementById("chat-box").classList.remove("hidden");

    // add user message
    addMessage("user", text);

    // typing indicator
    let typingDiv = addTyping();

    try{
        let res = await fetch("/chat", {
            method: "POST",
            headers: {"Content-Type":"application/json"},
            body: JSON.stringify({
                message: text,
                conversation_id: currentChat
            })
        });

        let data = await res.json();

        typingDiv.remove();

        if(!data || !data.response){
            addMessage("assistant", "⚠️ No response");
            return;
        }

        addMessage("assistant", data.response);

        loadChats();

    }catch(e){
        typingDiv.remove();
        addMessage("assistant", "❌ Error");
        console.error(e);
    }
}

/* ADD MESSAGE (CHATGPT STYLE) */
function addMessage(role, text){
    let box = document.getElementById("chat-inner");

    let wrapper = document.createElement("div");

    wrapper.className = role === "user"
        ? "flex justify-end"
        : "flex justify-start";

    let bubble = document.createElement("div");

    bubble.className = role === "user"
        ? "bg-blue-600 px-4 py-2 rounded-xl max-w-[75%] text-white"
        : "bg-white/10 px-4 py-2 rounded-xl max-w-[75%] text-white";

    bubble.innerText = text;

    wrapper.appendChild(bubble);
    box.appendChild(wrapper);

    box.scrollTop = box.scrollHeight;
}

/* TYPING INDICATOR */
function addTyping(){
    let box = document.getElementById("chat-inner");

    let wrapper = document.createElement("div");
    wrapper.className = "flex justify-start";

    let bubble = document.createElement("div");
    bubble.className = "bg-white/10 px-4 py-2 rounded-xl text-gray-300";
    bubble.innerText = "Typing...";

    wrapper.appendChild(bubble);
    box.appendChild(wrapper);

    box.scrollTop = box.scrollHeight;

    return wrapper;
}

/* LOAD CHAT LIST */
async function loadChats(){
    try{
        let res = await fetch("/get_conversations");
        let chats = await res.json();

        let list = document.getElementById("chat-list");
        list.innerHTML = "";

        chats.forEach(chat => {
            let div = document.createElement("div");

            div.className = "p-2 cursor-pointer hover:bg-white/10 rounded";
            div.innerText = chat.title || "New Chat";

            div.onclick = () => loadMessages(chat.id);

            list.appendChild(div);
        });

    }catch(e){
        console.error("Load chats error:", e);
    }
}

/* LOAD MESSAGES */
async function loadMessages(id){
    try{
        currentChat = id;

        document.getElementById("hero").style.display = "none";
        document.getElementById("chat-box").classList.remove("hidden");

        let res = await fetch(`/get_messages/${id}`);
        let msgs = await res.json();

        let box = document.getElementById("chat-inner");
        box.innerHTML = "";

        msgs.forEach(m => {
            addMessage(m.role, m.content);
        });

    }catch(e){
        console.error("Load messages error:", e);
    }
}

/* ENTER KEY SUPPORT */
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("msg").addEventListener("keydown", (e) => {
        if(e.key === "Enter"){
            e.preventDefault();
            sendMsg();
        }
    });

    loadChats();
});
