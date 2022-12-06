function onClick(e) {
  getData()
}

function getData() {
  const contentDom = document.getElementById('content')
  const btnDom = document.getElementById('button')
  var xhr = new XMLHttpRequest()
  var url = 'https://api.wrdan.com/hitokoto'

  btnDom.disabled = true
  contentDom.innerHTML = ''

  xhr.open('GET', url, true)
  xhr.send(null)
  xhr.onreadystatechange = () => {
    if (xhr.readyState === 4 && xhr.status === 200) {
      const res = JSON.parse(xhr.responseText)

      contentDom.innerHTML = res.text
      btnDom.disabled = false
    }
  }
}
