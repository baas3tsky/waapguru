fetch("data/vendors.json")
.then(res => res.json())
.then(data => {

let table = document.getElementById("compareTable")

data.vendors.forEach(v => {

let row = table.insertRow()

row.innerHTML = `
<td>${v.name}</td>
<td>${v.waf}</td>
<td>${v.bot}</td>
<td>${v.ddos}</td>
<td>${v.api}</td>
<td>${v.edge}</td>
`

})

})