async function loadPage(id, file) {
  const response = await fetch(file);
  const html = await response.text();
  document.getElementById(id).innerHTML = html;
}


loadPage("header", "header.html");
loadPage("footer", "footer.html");