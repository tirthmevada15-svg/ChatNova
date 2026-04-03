let currentChat = null;

/* QUICK BUTTONS */
function quickMsg(text){
    document.getElementById("msg").value = text;
    sendMsg();
}

/* CREATE NEW CHAT */
async function createChat(){
    let res = await fetch("/new_chat",{method:"POST"});

    if(!res.ok){
        console.error("New chat failed");
        return;
    }

    let data = await res.json();
    currentChat = data.id;

    document.getElementById("hero").style.display = "block";

    let chatBox = document.getElementById("chat-box");
    chatBox.classList.add("hidden");
    chatBox.innerHTML = "";

    loadChats();
}

/* SEND MESSAGE */
async function sendMsg(){
    let input = document.getElementById("msg");
    let text = input.value.trim();

    if(!text) return;

    // ensure chat exists
    if(!currentChat){
        let res = await fetch("/new_chat",{method:"POST"});

        if(!res.ok){
            console.error("Chat create failed");
            return;
        }

        let data = await res.json();
        currentChat = data.id;
    }

    input.value = "";

    document.getElementById("hero").style.display="none";
    document.getElementById("chat-box").classList.remove("hidden");

    addMessage("user", text);

    let typingDiv = addTyping();

    try{
        let res = await fetch("/chat",{
            method:"POST",
            headers:{"Content-Type":"application/json"},
            body:JSON.stringify({
                message:text,
                conversation_id:currentChat
            })
        });

        let data = await res.json();

        typingDiv.remove();

        if(!data || !data.response){
            addMessage("assistant","⚠️ No response");
            return;
        }

        addMessage("assistant", data.response);

        loadChats();

    }catch(e){
        typingDiv.remove();
        addMessage("assistant","❌ Error");
        console.error(e);
    }
}

/* LOAD CHATS */
async function loadChats(){
    let res = await fetch("/get_conversations");
    let chats = await res.json();

    let list = document.getElementById("chat-list");
    list.innerHTML = "";

    chats.forEach(chat=>{
        let div = document.createElement("div");
        div.className="p-2 cursor-pointer";

        div.innerText = chat.title || "New Chat";

        div.onclick = ()=>loadMessages(chat.id);

        list.appendChild(div);
    });
}

/* LOAD MESSAGES */
async function loadMessages(id){
    currentChat = id;

    document.getElementById("hero").style.display="none";
    document.getElementById("chat-box").classList.remove("hidden");

    let res = await fetch(`/get_messages/${id}`);
    let msgs = await res.json();

    let box = document.getElementById("chat-box");
    box.innerHTML = "";

    msgs.forEach(m=>{
        addMessage(m.role, m.content);
    });
}

/* ADD MESSAGE */
function addMessage(role,text){
    let box = document.getElementById("chat-box");

    let div = document.createElement("div");
    div.innerText = role + ": " + text;

    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
}

/* TYPING */
function addTyping(){
    let box = document.getElementById("chat-box");

    let div = document.createElement("div");
    div.innerText = "AI typing...";

    box.appendChild(div);
    return div;
}

/* ENTER KEY */
document.addEventListener("DOMContentLoaded",()=>{
    document.getElementById("msg").addEventListener("keydown",(e)=>{
        if(e.key==="Enter"){
            e.preventDefault();
            sendMsg();
        }
    });

    loadChats();
});