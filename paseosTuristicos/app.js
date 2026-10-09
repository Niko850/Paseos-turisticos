const estado = {
    experiencias: [],
    textoBusqueda: "",
    categoriaActual: "todas",
    ordenActual: "normal",
    precioMaximo: "",
    reservaciones: []
};

// Elementos
const catalogo = document.querySelector("#catalogo");
const estadoTexto = document.querySelector("#estado");
const mensajeEstado = document.querySelector("#mensajeEstado");
const buscador = document.querySelector("#buscador");
const filtroCategoria = document.querySelector("#filtroCategoria");
const ordenPrecio = document.querySelector("#ordenPrecio");
const filtroPrecioMax = document.querySelector("#filtroPrecioMax");
const listaReservas = document.querySelector("#listaReservas");
const totalSpan = document.querySelector("#total");
const totalPersonasSpan = document.querySelector("#totalPersonas");
const btnVaciar = document.querySelector("#btnVaciar");

// Función para mostrar mensajes de validación en pantalla
function mostrarMensaje(texto, tipo = "error") {
    mensajeEstado.textContent = texto;
    mensajeEstado.className = `mensaje-estado ${tipo}`;
    setTimeout(() => {
        mensajeEstado.textContent = "";
        mensajeEstado.className = "mensaje-estado";
    }, 4000);
}

// Carga con fetch, async/await y try/catch desde el JSON
async function cargarExperiencias() {
    try {
        estadoTexto.textContent = "Cargando experiencias...";
        const respuesta = await fetch("data/experiencias.json");
        
        if (!respuesta.ok) {
            throw new Error("No se pudo conectar con el archivo de datos.");
        }
        
        estado.experiencias = await respuesta.json();
        estadoTexto.textContent = "";
        renderizarApp();
    } catch (error) {
        console.error("Error al cargar datos:", error);
        estadoTexto.textContent = "";
        mostrarMensaje("Error al cargar el catálogo de experiencias. Asegúrate de ejecutar un servidor local.", "error");
    }
}

// Limpiar acentos y minúsculas
function limpiar(texto) {
    return texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Filtrar y ordenar
function obtenerResultadosFiltrados() {
    let resultados = estado.experiencias.filter(exp => {
        const coincideCategoria = (estado.categoriaActual === "todas" || exp.categoria === estado.categoriaActual);
        const coincideTexto = limpiar(exp.nombre).includes(limpiar(estado.textoBusqueda));
        const coincidePrecioMax = estado.precioMaximo === "" || exp.precio <= Number(estado.precioMaximo);
        return coincideCategoria && coincideTexto && coincidePrecioMax;
    });

    if (estado.ordenActual === "ascendente") {
        resultados.sort((a, b) => a.precio - b.precio);
    } else if (estado.ordenActual === "descendente") {
        resultados.sort((a, b) => b.precio - a.precio);
    }

    return resultados;
}

// Renderizar tarjetas
function renderizarCatalogo(lista) {
    catalogo.innerHTML = "";

    if (lista.length === 0) {
        catalogo.innerHTML = `<div class="sin-resultados"><p>No se encontraron experiencias con esos criterios.</p></div>`;
        return;
    }

    catalogo.innerHTML = lista.map(exp => `
        <article class="tarjeta">
            <div class="imagen">${exp.icono || "🌴"}</div>
            <div class="informacion">
                <span class="categoria">${exp.categoria}</span>
                <h3>${exp.nombre}</h3>
                <p>Cupo disponible: ${exp.cupo}</p>
                <p class="precio">$${exp.precio} MXN</p>
                <div class="tarjeta-controles">
                    <input type="number" class="input-cantidad" data-id="${exp.id}" min="1" max="${exp.cupo}" value="1">
                    <button type="button" class="btn-reservar" data-id="${exp.id}">Reservar</button>
                </div>
            </div>
        </article>
    `).join("");

    document.querySelectorAll(".btn-reservar").forEach(boton => {
        boton.addEventListener("click", (e) => {
            const id = Number(e.target.dataset.id);
            const inputCantidad = document.querySelector(`.input-cantidad[data-id="${id}"]`);
            const cantidadDeseada = Number(inputCantidad.value);
            agregarReserva(id, cantidadDeseada);
        });
    });
}

// Renderizar la sección de resumen
function renderizarReserva() {
    if (estado.reservaciones.length === 0) {
        listaReservas.innerHTML = "<p>No hay experiencias seleccionadas.</p>";
        totalSpan.textContent = "$0 MXN";
        totalPersonasSpan.textContent = "0";
        btnVaciar.style.display = "none";
        return;
    }

    btnVaciar.style.display = "block";

    const totalPrecio = estado.reservaciones.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
    const totalPersonas = estado.reservaciones.reduce((acc, item) => acc + item.cantidad, 0);

    listaReservas.innerHTML = estado.reservaciones.map(res => `
        <div class="item-reserva">
            <div>
                <strong>${res.nombre}</strong><br>
                <small>$${res.precio} MXN x ${res.cantidad} = <strong>$${res.precio * res.cantidad} MXN</strong></small>
            </div>
            <div class="item-reserva-acciones">
                <button type="button" class="btn-disminuir" data-id="${res.id}">-</button>
                <span>${res.cantidad}</span>
                <button type="button" class="btn-aumentar" data-id="${res.id}">+</button>
                <button type="button" class="btn-eliminar-item" data-id="${res.id}">❌</button>
            </div>
        </div>
    `).join("");

    totalSpan.textContent = `$${totalPrecio} MXN`;
    totalPersonasSpan.textContent = totalPersonas;

    document.querySelectorAll(".btn-aumentar").forEach(btn => {
        btn.addEventListener("click", (e) => cambiarCantidad(Number(e.target.dataset.id), 1));
    });

    document.querySelectorAll(".btn-disminuir").forEach(btn => {
        btn.addEventListener("click", (e) => cambiarCantidad(Number(e.target.dataset.id), -1));
    });

    document.querySelectorAll(".btn-eliminar-item").forEach(btn => {
        btn.addEventListener("click", (e) => eliminarReservaCompleta(Number(e.target.dataset.id)));
    });
}

// Agregar reserva con validación de cupos
function agregarReserva(id, cantidad) {
    const experiencia = estado.experiencias.find(exp => exp.id === id);
    if (!experiencia) return;

    if (isNaN(cantidad) || cantidad < 1) {
        mostrarMensaje("Ingresa una cantidad válida de personas.", "error");
        return;
    }

    const itemExistente = estado.reservaciones.find(res => res.id === id);
    const cantidadActualEnReserva = itemExistente ? itemExistente.cantidad : 0;
    const cantidadTotalSolicitada = cantidadActualEnReserva + cantidad;

    if (cantidadTotalSolicitada > experiencia.cupo) {
        mostrarMensaje(`No puedes reservar ${cantidadTotalSolicitada} lugares. El cupo máximo para ${experiencia.nombre} es ${experiencia.cupo}.`, "error");
        return;
    }

    if (itemExistente) {
        itemExistente.cantidad = cantidadTotalSolicitada;
    } else {
        estado.reservaciones.push({
            id: experiencia.id,
            nombre: experiencia.nombre,
            precio: experiencia.precio,
            cantidad: cantidad,
            cupo: experiencia.cupo
        });
    }

    mostrarMensaje(`¡Se agregó "${experiencia.nombre}" (${cantidad} pers.) a tu reservación!`, "exito");
    renderizarReserva();
}

// Cambiar cantidad
function cambiarCantidad(id, delta) {
    const item = estado.reservaciones.find(res => res.id === id);
    if (!item) return;

    const nuevaCantidad = item.cantidad + delta;

    if (nuevaCantidad < 1) {
        eliminarReservaCompleta(id);
        return;
    }

    if (nuevaCantidad > item.cupo) {
        mostrarMensaje(`Has alcanzado el cupo máximo (${item.cupo}) para esta experiencia.`, "error");
        return;
    }

    item.cantidad = nuevaCantidad;
    renderizarReserva();
}

function eliminarReservaCompleta(id) {
    estado.reservaciones = estado.reservaciones.filter(res => res.id !== id);
    renderizarReserva();
}

btnVaciar.addEventListener("click", () => {
    if (confirm("¿Estás seguro de que deseas vaciar toda tu reservación?")) {
        estado.reservaciones = [];
        renderizarReserva();
        mostrarMensaje("Se ha vaciado la reservación.", "exito");
    }
});

function renderizarApp() {
    const resultados = obtenerResultadosFiltrados();
    renderizarCatalogo(resultados);
    renderizarReserva();
}

// eventos
buscador.addEventListener("input", (e) => {
    estado.textoBusqueda = e.target.value;
    renderizarApp();
});

filtroCategoria.addEventListener("change", (e) => {
    estado.categoriaActual = e.target.value;
    renderizarApp();
});

ordenPrecio.addEventListener("change", (e) => {
    estado.ordenActual = e.target.value;
    renderizarApp();
});

filtroPrecioMax.addEventListener("input", (e) => {
    estado.precioMaximo = e.target.value;
    renderizarApp();
});

// Inicialización
cargarExperiencias();