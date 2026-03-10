function toggleChat(){

let chat=document.getElementById("chat")

if(chat.style.display==="flex"){
chat.style.display="none"
}else{
chat.style.display="flex"
}

}

function sendMessage(){

let input=document.getElementById("chatInput")
let text=input.value

if(text==="") return

let messages=document.getElementById("messages")

messages.innerHTML+=`<div class="user-msg">${text}</div>`

/* mock AI reply */

let reply="You can compare WAAP platforms on our compare page."

if(text.toLowerCase().includes("best"))
reply="Akamai is one of the strongest WAAP platforms for enterprise security."

if(text.toLowerCase().includes("startup"))
reply="BytePlus or Cloudflare can be good for startups."

messages.innerHTML+=`<div class="ai-msg">${reply}</div>`

input.value=""

messages.scrollTop=messages.scrollHeight

}
