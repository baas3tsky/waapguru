async function askAI(){

let question=document.getElementById("question").value

let response=await fetch("https://api.openai.com/v1/chat/completions",{

method:"POST",

headers:{
"Content-Type":"application/json",
"Authorization":"Bearer YOUR_API_KEY"
},

body:JSON.stringify({

model:"gpt-4o-mini",

messages:[
{role:"user",content:question}
]

})

})

let data=await response.json()

document.getElementById("response").innerText=data.choices[0].message.content

}