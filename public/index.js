function getData() {
  const contentDom = document.getElementById('content')
  var xhr = new XMLHttpRequest()
  var url = 'https://api.wrdan.com/hitokoto'

  contentDom.innerHTML = ''

  xhr.onreadystatechange = () => {
    if (xhr.readyState === 4 && xhr.status === 200) {
      const res = JSON.parse(xhr.responseText)

      contentDom.innerHTML = res.text
    }
  }
  xhr.open('GET', url, true)
  xhr.send(null)
}
