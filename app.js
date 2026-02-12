const URL_JSON = "https://raw.githubusercontent.com/dalcocer-141103/Catalogo-productos/refs/heads/main/productos.json";
const TELEFONO = "525515107577"; 
// REDUCCIÓN DE ITEMS PARA EVITAR SCROLL LARGO Y PANTALLA NEGRA
const ITEMS_POR_PAGINA = 12; 

let productosGlobal = [];
let listaFiltrada = []; 
let listaFinal = [];    
let paginaActual = 1;
let categoriaActual = 'todo'; 
let scrollGuardado = 0;

let filtrosActivos = { subcategoria: null, marca: null, procesador: null, ram: null, almacenamiento: null };

const contenedor = document.getElementById('contenedorProductos');
const contenedorPaginacion = document.getElementById('paginacion');
const contenedorSub = document.getElementById('contenedorSubcategorias');
const sidebarFilters = document.getElementById('sidebarFilters');
const sidebarWrapper = document.getElementById('sidebarWrapper');
const vistaCatalogo = document.getElementById('vista-catalogo');
const vistaDetalle = document.getElementById('vista-detalle');

fetch(URL_JSON)
    .then(res => res.json())
    .then(data => {
        productosGlobal = data;
        listaFiltrada = data; 
        listaFinal = data;
        filtrarPrincipal('todo', document.querySelector('.cat-card.active'));
    })
    .catch(err => contenedor.innerHTML = '<p style="text-align:center;">Error de conexión.</p>');

function toggleSidebar() { sidebarWrapper.classList.toggle('open'); }

/* NORMALIZADORES */
function normalizarProcesador(txt) {
    if(!txt) return null;
    const t = txt.toLowerCase();
    if(t.includes('i3')) return 'Intel Core i3';
    if(t.includes('i5')) return 'Intel Core i5';
    if(t.includes('i7')) return 'Intel Core i7';
    if(t.includes('i9')) return 'Intel Core i9';
    if(t.includes('ultra')) return 'Intel Core Ultra';
    if(t.includes('ryzen 3')) return 'AMD Ryzen 3';
    if(t.includes('ryzen 5')) return 'AMD Ryzen 5';
    if(t.includes('ryzen 7')) return 'AMD Ryzen 7';
    if(t.includes('ryzen 9')) return 'AMD Ryzen 9';
    if(t.includes('celeron')) return 'Intel Celeron';
    return null; 
}


// --- LÓGICA DE LOCALSTORAGE PARA FAVORITOS ---
let favoritos = JSON.parse(localStorage.getItem('eritech_favs')) || [];
// 1. Alternar favorito (Quitar/Poner)
function toggleFavorito(e, sku) {
    e.stopPropagation(); // Evita que se abra el detalle
    const index = favoritos.indexOf(sku);
    
    if (index > -1) {
        favoritos.splice(index, 1);
    } else {
        favoritos.push(sku);
    }
    
    localStorage.setItem('eritech_favs', JSON.stringify(favoritos));
    actualizarContador();
    
    // Si estamos viendo la lista de favoritos, refrescar al quitar uno
    if (categoriaActual === 'favoritos') {
        mostrarFavoritos(document.getElementById('btn-ver-favoritos'));
    } else {
        // Si no, solo refrescar la vista actual para que el corazón cambie de color
        cargarPagina(paginaActual); 
    }
}

// 2. Mostrar la sección de favoritos
function mostrarFavoritos(elemento) {
    // Estilo visual de los botones
    document.querySelectorAll('.cat-card').forEach(c => c.classList.remove('active', 'fav-active'));
    elemento.classList.add('fav-active');
    
    categoriaActual = 'favoritos';
    filtrosActivos = { subcategoria: null, marca: null, procesador: null, ram: null, almacenamiento: null };
    contenedorSub.innerHTML = ''; 

    // Filtrar los productos que coincidan con los SKUs guardados
    listaFiltrada = productosGlobal.filter(p => favoritos.includes(p.sku || p.clave));
    listaFinal = [...listaFiltrada]; // Copia para poder ordenar
    
    // Mostrar botón de limpiar solo aquí
    const btnLimpiar = document.getElementById('btn-limpiar-favs');
    if(btnLimpiar) btnLimpiar.classList.remove('oculto');

    generarFiltrosSidebar(listaFiltrada);
    cargarPagina(1);
}

// 3. Actualizar el circulito rojo
function actualizarContador() {
    const contador = document.getElementById('fav-counter');
    if(!contador) return;
    contador.innerText = favoritos.length;
    contador.style.display = favoritos.length > 0 ? 'flex' : 'none';
}

// 4. Limpiar todo
function limpiarFavoritos() {
    // 1. Borramos el dato de la memoria del navegador
    localStorage.removeItem('eritech_favs');
    
    // 2. Reseteamos la variable local en el código
    favoritos = [];
    
    // 3. Actualizamos el contador visual (el circulito rojo)
    actualizarContador();
    
    // 4. Si estamos en la sección de favoritos, limpiamos la pantalla de inmediato
    if (categoriaActual === 'favoritos') {
        contenedor.innerHTML = '<p style="color:#777; text-align:center; grid-column: 1/-1; padding: 40px;">Lista vaciada con éxito.</p>';
        listaFiltrada = [];
        listaFinal = [];
        // Ocultamos el botón de limpiar ya que no hay nada
        document.getElementById('btn-limpiar-favs').classList.add('oculto');
    }
    
    // 5. Opcional: Forzar un pequeño aviso en consola para debug
    console.log("Favoritos borrados correctamente");
}

// 3. Función de Ordenamiento
function aplicarOrden() {
    const criterio = document.getElementById('sort-logic').value;
    
    // 1. SIEMPRE reiniciamos la listaFinal basándonos en la lista actual filtrada
    // Esto es lo que permite "volver a la normalidad"
    listaFinal = [...listaFiltrada]; 

    // 2. Aplicamos el orden solo si NO es relevancia
    if (criterio === 'p-menor') {
        listaFinal.sort((a, b) => (a.precio || 0) - (b.precio || 0));
    } else if (criterio === 'p-mayor') {
        listaFinal.sort((a, b) => (b.precio || 0) - (a.precio || 0));
    } else if (criterio === 'a-z') {
        listaFinal.sort((a, b) => a.nombre.localeCompare(b.nombre));
    } else if (criterio === 'z-a') {
        listaFinal.sort((a, b) => b.nombre.localeCompare(a.nombre));
    }
    
    // Si es 'relevancia', no entra en los IF y se queda como la original
    
    cargarPagina(1);
}
// MODIFICACIÓN: Actualiza tu función mostrarFavoritos para que muestre el botón de limpiar
const originalMostrarFavoritos = mostrarFavoritos;
mostrarFavoritos = function(elemento) {
    originalMostrarFavoritos(elemento);
    document.getElementById('btn-limpiar-favs').classList.remove('oculto');
};

// MODIFICACIÓN: En tus otras funciones de filtrado (filtrarPrincipal), añade:
// document.getElementById('btn-limpiar-favs').classList.add('oculto');

// Inicializar contador al cargar la página
window.onload = () => {
    actualizarContador();
};




function normalizarRAM(txt) {
    if(!txt) return null;
    const match = txt.match(/(\d+)\s*GB/i);
    if(match) return `${match[1]} GB`;
    return null;
}
function normalizarDisco(txt) {
    if(!txt) return null;
    if(txt.includes('1 TB') || txt.includes('1000 GB')) return '1 TB';
    if(txt.includes('512') || txt.includes('480')) return '512 GB';
    if(txt.includes('256') || txt.includes('240')) return '256 GB';
    return null;
}

/* SIDEBAR */
function generarFiltrosSidebar(lista) {
    sidebarFilters.innerHTML = ''; 
    crearSeccionFiltro(lista, 'Marcas', 'marca', 'marca');

    if (categoriaActual === 'todo') return; 

    if (categoriaActual === 'computadoras') {
        const procesadores = extraerYAgrupar(lista, ['procesador', 'processor', 'cpu'], normalizarProcesador);
        if(procesadores.length > 0) renderHTMLFiltro('Procesador', 'procesador', procesadores);
        const rams = extraerYAgrupar(lista, ['memoria interna', 'ram', 'memoria ram'], normalizarRAM);
        if(rams.length > 0) renderHTMLFiltro('Memoria RAM', 'ram', rams);
        const discos = extraerYAgrupar(lista, ['capacidad', 'almacenamiento', 'disco'], normalizarDisco);
        if(discos.length > 0) renderHTMLFiltro('Almacenamiento', 'almacenamiento', discos);
    } 
}

function extraerYAgrupar(lista, keywords, normalizador) {
    const conteo = {};
    lista.forEach(prod => {
        if(prod.especificaciones) {
            prod.especificaciones.forEach(spec => {
                if(keywords.some(k => spec.tipo.toLowerCase().includes(k))) {
                    const valNormalizado = normalizador(spec.valor);
                    if(valNormalizado) conteo[valNormalizado] = (conteo[valNormalizado] || 0) + 1;
                }
            });
        }
    });
    return Object.keys(conteo).sort((a,b) => parseInt(a) - parseInt(b));
}

function crearSeccionFiltro(lista, titulo, keyFiltro, propJSON) {
    const conteo = {};
    lista.forEach(p => {
        // Normalizamos un poco para evitar duplicados como "HP" y "hp"
        let val = p[propJSON] || 'Otros';
        // Opcional: Unificar variaciones comunes si el JSON viene sucio
        if(val === 'Hewlett Packard') val = 'HP'; 
        
        conteo[val] = (conteo[val] || 0) + 1;
    });

    // AQUÍ ESTABA EL DETALLE: 
    // Antes ordenaba .sort() que es alfabético.
    // Ahora ordenamos por [1] (cantidad) de mayor a menor (b - a).
    const opcionesOrdenadas = Object.keys(conteo).sort((a, b) => {
        return conteo[b] - conteo[a];
    });

    // Solo mandamos las opciones si hay al menos una
    if(opcionesOrdenadas.length > 0) {
        // En renderHTMLFiltro pasamos todo, allá se hace el recorte a los top 15
        renderHTMLFiltro(titulo, keyFiltro, opcionesOrdenadas, conteo);
    }
}

function renderHTMLFiltro(titulo, keyFiltro, opciones, conteoObj) {
    const section = document.createElement('div');
    section.className = 'filter-section';
    let clearBtn = filtrosActivos[keyFiltro] ? `<small style="color:var(--eri-light); cursor:pointer;" onclick="limpiarFiltro('${keyFiltro}')">Borrar</small>` : '';
    section.innerHTML = `<div class="filter-title"><span>${titulo}</span> ${clearBtn}</div>`;
    const list = document.createElement('div');
    list.className = 'filter-list';
    opciones.slice(0, 15).forEach(opt => {
        const item = document.createElement('div');
        item.className = `filter-item ${filtrosActivos[keyFiltro] === opt ? 'active' : ''}`;
        const countSpan = conteoObj ? `<span class="filter-count">${conteoObj[opt]}</span>` : '';
        item.innerHTML = `<span><span class="f-check"></span>${opt}</span> ${countSpan}`;
        item.onclick = () => aplicarFiltroSidebar(keyFiltro, opt);
        list.appendChild(item);
    });
    section.appendChild(list);
    sidebarFilters.appendChild(section);
}

function aplicarFiltroSidebar(key, valor) {
    filtrosActivos[key] = (filtrosActivos[key] === valor) ? null : valor;
    ejecutarFiltradoFinal();
    if(window.innerWidth < 992) sidebarWrapper.classList.remove('open');
}
function limpiarFiltro(key) {
    filtrosActivos[key] = null;
    ejecutarFiltradoFinal();
}
function filtrarPorSub(subcategoria, elemento) {
    document.querySelectorAll('.subcat-chip').forEach(c => c.classList.remove('active'));
    if(elemento) elemento.classList.add('active');
    filtrosActivos.subcategoria = subcategoria;
    filtrosActivos.marca = null; 
    ejecutarFiltradoFinal();
}

function ejecutarFiltradoFinal() {
    let resultado = listaFiltrada; 
    if(filtrosActivos.subcategoria) resultado = resultado.filter(p => p.subcategoria === filtrosActivos.subcategoria);
    if(filtrosActivos.marca) resultado = resultado.filter(p => p.marca === filtrosActivos.marca);

    if(categoriaActual === 'computadoras') {
        if(filtrosActivos.procesador || filtrosActivos.ram || filtrosActivos.almacenamiento) {
            resultado = resultado.filter(p => {
                if(!p.especificaciones) return false;
                let cumpleProc = !filtrosActivos.procesador;
                let cumpleRam = !filtrosActivos.ram;
                let cumpleDisco = !filtrosActivos.almacenamiento;
                p.especificaciones.forEach(s => {
                    const tipo = s.tipo.toLowerCase();
                    const val = s.valor;
                    if(filtrosActivos.procesador && (tipo.includes('procesador') || tipo.includes('cpu'))) {
                        if(normalizarProcesador(val) === filtrosActivos.procesador) cumpleProc = true;
                    }
                    if(filtrosActivos.ram && (tipo.includes('ram') || tipo.includes('memoria'))) {
                        if(normalizarRAM(val) === filtrosActivos.ram) cumpleRam = true;
                    }
                    if(filtrosActivos.almacenamiento && (tipo.includes('disco') || tipo.includes('capacidad'))) {
                        if(normalizarDisco(val) === filtrosActivos.almacenamiento) cumpleDisco = true;
                    }
                });
                return cumpleProc && cumpleRam && cumpleDisco;
            });
        }
    }
    listaFinal = resultado;
    if(!filtrosActivos.marca && !filtrosActivos.procesador) generarFiltrosSidebar(listaFiltrada); 
    cargarPagina(1);
}

function filtrarPrincipal(filtro, elemento) {
  document.getElementById('sort-logic').value = 'relevancia';
  document.getElementById('btn-limpiar-favs').classList.add('oculto'); // <-- ESTO
    if(elemento) {
        document.querySelectorAll('.cat-card').forEach(c => c.classList.remove('active'));
        elemento.classList.add('active');
    }
    categoriaActual = filtro;
    filtrosActivos = { subcategoria: null, marca: null, procesador: null, ram: null, almacenamiento: null };

    if(filtro === 'todo') {
       listaFiltrada = [...productosGlobal];
        
        // 2. ORDENAMOS POR STOCK (Mayor a menor)
        // Así los productos con más inventario salen al principio
        listaFiltrada.sort((a, b) => (b.existenciaCUN || 0) - (a.existenciaCUN || 0));
        
        contenedorSub.innerHTML = ''; // Limpiar subcategorías
    } else {
        listaFiltrada = productosGlobal.filter(p => {
            const catLower = (p.categoria || '').toLowerCase();
            const subLower = (p.subcategoria || '').toLowerCase();
            const todo = catLower + ' ' + subLower;

            if (filtro === 'computo') return todo.includes('ensamble') || todo.includes('componente') || todo.includes('almacenamiento');
            if (filtro === 'computadoras') return todo.includes('computadora') || todo.includes('laptop') || todo.includes('workstation') || todo.includes('all in one') || todo.includes('tablet');
            if (filtro === 'energia') return todo.includes('energía') || todo.includes('energia') || todo.includes('respaldo') || todo.includes('batería') || todo.includes('regulador') || todo.includes('no break');
            if (filtro === 'accesorios') return todo.includes('accesorio') || todo.includes('mochila') || todo.includes('mouse') || todo.includes('teclado') || todo.includes('bocina') || todo.includes('audifono') || todo.includes('diadema');
            if (filtro === 'impresion') return todo.includes('impresi') || todo.includes('tinta') || todo.includes('toner') || todo.includes('cinta');
            
            // --- NUEVAS CATEGORÍAS AGREGADAS ---
            
            if (filtro === 'redes') {
                return todo.includes('red') || 
                       todo.includes('switch') || 
                       todo.includes('router') || 
                       todo.includes('access point') || 
                       todo.includes('bobina') || 
                       todo.includes('transceptor') ||
                       todo.includes('cable de red') ||
                       todo.includes('jack') ||
                       todo.includes('placa de pared');
            }

            if (filtro === 'licencias') {
                return todo.includes('software') || 
                       todo.includes('licencia') || 
                       todo.includes('antivirus') || 
                       todo.includes('esd') || 
                       todo.includes('digital') ||
                       todo.includes('aspel') ||
                       todo.includes('microsoft');
            }

            // ... (tus filtros anteriores de redes y licencias) ...

            if (filtro === 'seguridad') {
                return todo.includes('vigilancia') || 
                       todo.includes('cámara') || 
                       todo.includes('camera') || 
                       todo.includes('dvr') || 
                       todo.includes('nvr') || 
                       todo.includes('xvr') || 
                       todo.includes('cctv') || 
                       todo.includes('control de acceso') || 
                       todo.includes('alarma') ||
                       todo.includes('videoportero');
            }

            if (filtro === 'componentes') {
                // Filtramos hardware interno de PC y almacenamiento
                return todo.includes('procesador') || 
                       todo.includes('tarjeta madre') || 
                       todo.includes('motherboard') || 
                       todo.includes('memoria ram') || 
                       todo.includes('ddr') || 
                       todo.includes('gabinete') || 
                       todo.includes('fuente de poder') || 
                       todo.includes('disipador') || 
                       todo.includes('ventilador') || 
                       todo.includes('disco duro') || 
                       todo.includes('ssd') ||
                       todo.includes('tarjeta de video');
            }

            return false;
        });
        
        // Generar subcategorías para la selección actual
        generarSubcategorias(listaFiltrada);
    }
    generarFiltrosSidebar(listaFiltrada);
    listaFinal = listaFiltrada;
    cargarPagina(1);
}

function generarSubcategorias(lista) {
    contenedorSub.innerHTML = '';
    // FIX 2: Filtro manual ESTRICTO para Accesorios (SOLO BÁSICOS)
    if(categoriaActual === 'accesorios') {
        const permitidos = ['mouse', 'teclado', 'mochila', 'audifonos', 'diadema', 'kit'];
        const subcats = new Set();
        lista.forEach(p => {
            if(p.subcategoria) {
                const subLow = p.subcategoria.toLowerCase();
                if(permitidos.some(k => subLow.includes(k))) subcats.add(p.subcategoria);
            }
        });
        renderChips(subcats);
    } 
    // Para otras categorias (MENOS TODO)
    else if(categoriaActual !== 'todo') {
        const subcats = new Set();
        lista.forEach(p => { if(p.subcategoria) subcats.add(p.subcategoria); });
        renderChips(subcats);
    }
}

function renderChips(setSubcats) {
    if(setSubcats.size > 0) {
        const chipTodo = document.createElement('div');
        chipTodo.className = 'subcat-chip active';
        chipTodo.innerText = 'Ver todo';
        chipTodo.onclick = (e) => filtrarPorSub(null, e.target);
        contenedorSub.appendChild(chipTodo);
        Array.from(setSubcats).sort().slice(0, 15).forEach(sub => {
            const chip = document.createElement('div');
            chip.className = 'subcat-chip';
            chip.innerText = sub;
            chip.onclick = (e) => filtrarPorSub(sub, e.target);
            contenedorSub.appendChild(chip);
        });
    }
}

const formatearMoneda = (c) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(c);
function obtenerInfoStock(s) { return (s && Number(s) > 0) ? {t:"Disponible", c:"st-ok"} : {t:"Sobre Pedido", c:"st-wait"}; }

function cargarPagina(pagina) {
    paginaActual = pagina;
    const inicio = (pagina - 1) * ITEMS_POR_PAGINA;
    const fin = inicio + ITEMS_POR_PAGINA;
    renderizarProductos(listaFinal.slice(inicio, fin));
    renderizarControlesPaginacion();
}

function renderizarProductos(lista) {
    contenedor.innerHTML = '';
    
    // ... (tu código de validación de lista vacía) ...

    lista.forEach(prod => {
        const precio = prod.precio ? formatearMoneda(prod.precio) : "$0.00";
        const clave = prod.sku || prod.clave || 'S/N';
        const stockInfo = obtenerInfoStock(prod.existenciaCUN);
        
        const esFav = favoritos.includes(clave) ? 'active' : '';

        // === AQUÍ ESTÁ EL CAMBIO CLAVE ===
        // Priorizamos la descripción corta que tiene las specs
        const textoPrincipal = prod.descripcion_corta || prod.nombre;

        const card = document.createElement('div');
        card.className = 'producto-card';
        // Agregamos title="..." para que al pasar el mouse se vea el texto completo
        card.innerHTML = `
            <div class="card-header">
                <span class="badge-stock ${stockInfo.c}">${stockInfo.t}</span>
                <span class="prod-marca">${prod.marca||'ERITECH'}</span>
            </div>
            <div class="img-wrapper" onclick="verDetalle(${JSON.stringify(prod).replace(/"/g, '&quot;')})">
                <div class="fav-btn ${esFav}" onclick="toggleFavorito(event, '${clave}')">
                    <span class="material-icons-outlined" style="font-size:20px;">favorite</span>
                </div>
                <div class="img-bg"></div>
                <img src="${prod.imagen}" class="producto-img" onerror="this.src='https://via.placeholder.com/200?text=Eritech'">
            </div>
            
            <div class="card-body" onclick="verDetalle(${JSON.stringify(prod).replace(/"/g, '&quot;')})">
                <span class="sku-card">SKU: ${clave}</span>
                
                <h3 class="prod-titulo" title="${textoPrincipal}">${textoPrincipal}</h3>
                
            </div>
            
            <div class="card-footer">
                <div class="price-group"><span class="monto">${precio}<span> MXN</span></span></div>
                <div class="btn-card-action"><span class="material-icons-outlined" style="font-size:18px;">arrow_forward</span></div>
            </div>
        `;
        contenedor.appendChild(card);
    });
}

function renderizarControlesPaginacion() {
    contenedorPaginacion.innerHTML = '';
    const total = Math.ceil(listaFinal.length / ITEMS_POR_PAGINA);
    if(total <= 1) return;
    crearBtnPag('←', paginaActual > 1 ? paginaActual-1 : null);
    let start = Math.max(1, paginaActual - 2);
    let end = Math.min(total, start + 4);
    if(end - start < 4) start = Math.max(1, end - 4);
    for(let i=start; i<=end; i++) crearBtnPag(i, i, i===paginaActual);
    crearBtnPag('→', paginaActual < total ? paginaActual+1 : null);
}

function crearBtnPag(txt, targetPage, active=false) {
    const btn = document.createElement('button');
    btn.innerText = txt;
    btn.className = `page-btn ${active ? 'active' : ''}`;
    if(targetPage) btn.onclick = () => cargarPagina(targetPage);
    else btn.disabled = true;
    contenedorPaginacion.appendChild(btn);
}

/* ========================================================
   LOGICA SCROLL CON MEMORIA + FIX PANTALLA NEGRA
   ======================================================== */
function verDetalle(prod) {
    // 1. Guardar donde estamos (Memoria)
    scrollGuardado = window.scrollY;

    // 2. Swapeo simple: Ocultar uno, mostrar otro
    vistaCatalogo.classList.add('oculto'); // Oculta el catálogo
    vistaDetalle.classList.remove('oculto'); // Muestra el detalle

    // 3. SCROLL FORZADO AL TOPE (Para evitar la pantalla negra)
    // Usamos el ancla invisible que pusimos arriba del todo
    const anchor = document.getElementById('inicio-app');
    if(anchor) anchor.scrollIntoView({ behavior: 'auto' });
    else window.scrollTo(0,0);

    // Llenar datos...
    const precio = prod.precio ? formatearMoneda(prod.precio) : "$0.00";
    const clave = prod.sku || prod.clave || 'S/N';
    const stock = obtenerInfoStock(prod.existenciaCUN);

    document.getElementById('det-img').src = prod.imagen;
    document.getElementById('det-marca').textContent = prod.marca || 'ERITECH';
    document.getElementById('det-sku').textContent = `SKU: ${clave}`;
    document.getElementById('det-titulo').textContent = prod.nombre;
    document.getElementById('det-precio').innerHTML = `${precio}<span>MXN</span>`;
    document.getElementById('det-stock').textContent = stock.t;
    document.getElementById('det-stock').className = `badge-stock ${stock.c}`;

    const tabla = document.getElementById('tabla-specs-completa');
    tabla.innerHTML = '';
    if(prod.especificaciones) {
        prod.especificaciones.forEach(s => {
            tabla.innerHTML += `<tr><td>${s.tipo}</td><td>${s.valor}</td></tr>`;
        });
    }

    const msg = `Hola, me interesa: ${prod.nombre} (SKU: ${clave}).`;
    document.getElementById('btn-cotizar-final').href = `https://wa.me/${TELEFONO}?text=${encodeURIComponent(msg)}`;
}

function cerrarDetalle() {
    // 1. Restaurar vistas
    vistaDetalle.classList.add('oculto');
    vistaCatalogo.classList.remove('oculto');

    // 2. RECUPERAR POSICION (Usar la memoria)
    // El timeout ayuda a que GoDaddy procese el cambio de altura primero
    setTimeout(() => {
        window.scrollTo(0, scrollGuardado);
    }, 10);
}

document.getElementById('buscador').addEventListener('keyup', (e) => {
  document.getElementById('btn-limpiar-favs').classList.add('oculto');
    const txt = e.target.value.toLowerCase();
    listaFiltrada = productosGlobal.filter(p => 
        p.nombre.toLowerCase().includes(txt) || 
        (p.marca && p.marca.toLowerCase().includes(txt)) ||
        (p.sku && p.sku.toLowerCase().includes(txt)) ||
        (p.clave && p.clave.toLowerCase().includes(txt))
    );
    listaFinal = listaFiltrada;
    filtrosActivos = { subcategoria: null, marca: null, procesador: null, ram: null, almacenamiento: null };
    document.querySelectorAll('.cat-card').forEach(c => c.classList.remove('active'));
    contenedorSub.innerHTML = '';
    
    categoriaActual = 'busqueda'; 
    generarFiltrosSidebar(listaFiltrada);
    cargarPagina(1);
});
