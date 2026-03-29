// Función para cargar e incluir un archivo HTML en un div
function includeHTML(divId, htmlFile) {
  // Obtener el elemento div por su ID
  const targetDiv = document.getElementById(divId);

  if (!targetDiv) {
    console.error(`Div con ID "${divId}" no encontrado.`);
    return;
  }

  // Usar fetch para cargar el archivo HTML
  fetch(htmlFile)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Error al cargar ${htmlFile}: ${response.statusText}`);
      }
      return response.text();
    })
    .then((html) => {
      // Insertar el contenido HTML dentro del div
      targetDiv.innerHTML = html;
    })
    .catch((error) => {
      console.error("Error al incluir HTML:", error);
    });
}

// Ejemplo de uso
document.addEventListener("DOMContentLoaded", () => {
  includeHTML("corousel", "carousel.html");

  // Incluir el contenido de "footer.html" en el div con ID "footer-container"
  includeHTML("menuheader", "menuheader.html");
});
