var Tawk_API=Tawk_API||{}, Tawk_LoadStart=new Date();
(function(){
var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
s1.async=true;
s1.src='https://embed.tawk.to/698bc38a55a5d71c35acc4ee/1jh7cqi06';
s1.charset='UTF-8';
s1.setAttribute('crossorigin','*');
s0.parentNode.insertBefore(s1,s0);
})();

const URL_JSON = "https://raw.githubusercontent.com/dalcocer-141103/Catalogo-productos/refs/heads/main/productos.json";
const TELEFONO = "525515107577"; 
const ITEMS_POR_PAGINA = 12; 

let productosGlobal = [];
let listaFiltrada = []; 
let listaFinal = [];    
let paginaActual = 1;
let categoriaActual = 'todo'; 
let scrollGuardado = 0;

let filtrosActivos = { subcategoria: null, marca: null, procesador: null, ram: null, almacenamiento: null };

// --- LÓGICA DE CARRITO ---
let carrito = JSON.parse(localStorage.getItem('eritech_cart')) || [];

function addToCart(prod, e) {
    if(e) e.stopPropagation();
    
    // Verificar si ya existe
    const existente = carrito.find(item => item.sku === (prod.sku || prod.clave));
    
    if(existente) {
        existente.cantidad++;
    } else {
        carrito.push({
            sku: prod.sku || prod.clave,
            nombre: prod.nombre,
            precio: prod.precio || 0,
            imagen: prod.imagen,
            cantidad: 1
        });
    }
    
    guardarCarrito();
    actualizarBadgeCarrito();
    
    // Feedback visual
    const btn = e ? e.currentTarget : document.getElementById('btn-add-detail');
    if(btn) {
        btn.style.transform = "scale(1.2)";
        setTimeout(() => btn.style.transform = "scale(1)", 200);
    }
    
    // Si el modal está abierto, renderizar
    if(document.getElementById('cart-overlay').classList.contains('open')) {
        renderCartItems();
    }
}

function removeFromCart(sku) {
    carrito = carrito.filter(item => item.sku !== sku);
    guardarCarrito();
    renderCartItems();
    actualizarBadgeCarrito();
}

function cambiarCant(sku, cambio) {
    const item = carrito.find(i => i.sku === sku);
    if (!item) return;

    item.cantidad += cambio;

    if (item.cantidad <= 0) {
        removeFromCart(sku);
    } else {
        guardarCarrito();
        renderCartItems();
        actualizarBadgeCarrito();
    }
}

function guardarCarrito() {
    localStorage.setItem('eritech_cart', JSON.stringify(carrito));
}

function actualizarBadgeCarrito() {
    const count = carrito.reduce((acc, item) => acc + item.cantidad, 0);
    document.getElementById('cart-counter').innerText = count;
    document.getElementById('cart-counter').style.display = count > 0 ? 'flex' : 'none';
}

function toggleCart() {
    const overlay = document.getElementById('cart-overlay');
    if (overlay.classList.contains('open')) {
        overlay.classList.remove('open');
    } else {
        overlay.classList.add('open');
        renderCartItems();
    }
}

const formatearDinero = (c) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(c);

function renderCartItems() {
    const container = document.getElementById('cart-items-container');
    const totalEl = document.getElementById('cart-total-price');
    
    if(carrito.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:50px; color:#ccc"><span class="material-icons-outlined" style="font-size:40px">remove_shopping_cart</span><br>Tu carrito está vacío</div>';
        totalEl.innerText = "$0.00";
        return;
    }
    
    container.innerHTML = '';
    let total = 0;
    
    carrito.forEach(item => {
        const subtotal = item.precio * item.cantidad;
        total += subtotal;
        
        container.innerHTML += `
            <div class="cart-item" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:10px;">
                <div style="flex:1">
                    <div style="font-size:0.85rem; font-weight:600; color:white; margin-bottom:5px;">${item.nombre}</div>
                    <div style="color:var(--eri-light); font-size:0.8rem;">$${item.precio} c/u</div>
                </div>
                
                <div style="display:flex; align-items:center; gap:8px;">
                    <button class="qty-btn" onclick="cambiarCant('${item.sku}', -1)">-</button>
                    <span class="qty-display">${item.cantidad}</span>
                    <button class="qty-btn" onclick="cambiarCant('${item.sku}', 1)">+</button>
                </div>

                <div style="margin-left:15px;">
                     <span class="material-icons-outlined btn-remove" onclick="removeFromCart('${item.sku}')" style="color:#ff5252; cursor:pointer;">delete</span>
                </div>
            </div>
        `;
    });
    
    totalEl.innerText = formatearDinero(total);
}

// --- CONFIRMACIÓN POR WHATSAPP (MÉTODO SEGURO) ---
function enviarPedidoWhatsApp() {
    if(carrito.length === 0) return;
    
    let mensaje = "Hola Eritech, deseo confirmar el siguiente pedido:%0A%0A";
    let total = 0;
    
    carrito.forEach(item => {
        const subtotal = item.precio * item.cantidad;
        total += subtotal;
        let nombreCorto = item.nombre.substring(0, 25);
        if(item.nombre.length > 25) nombreCorto += "...";
        
        mensaje += `*${item.cantidad}x* ${nombreCorto} - SKU:${item.sku} - ${formatearDinero(subtotal)}%0A`;
    });
    
    mensaje += `%0A*TOTAL APROX:* ${formatearDinero(total)}%0A%0A¿Me confirman existencia y método de pago?`;
    
    window.open(`https://wa.me/${TELEFONO}?text=${mensaje}`, '_blank');
}

// --- LÓGICA GENERAL ---
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
        actualizarBadgeCarrito(); 
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


// --- FAVORITOS ---
let favoritos = JSON.parse(localStorage.getItem('eritech_favs')) || [];
function toggleFavorito(e, sku) {
    e.stopPropagation(); 
    const index = favoritos.indexOf(sku);
    if (index > -1) favoritos.splice(index, 1);
    else favoritos.push(sku);
    localStorage.setItem('eritech_favs', JSON.stringify(favoritos));
    actualizarContador();
    if (categoriaActual === 'favoritos') mostrarFavoritos(document.getElementById('btn-ver-favoritos'));
    else cargarPagina(paginaActual); 
}

function mostrarFavoritos(elemento) {
    document.querySelectorAll('.cat-card').forEach(c => c.classList.remove('active', 'fav-active'));
    elemento.classList.add('fav-active');
    categoriaActual = 'favoritos';
    filtrosActivos = { subcategoria: null, marca: null, procesador: null, ram: null, almacenamiento: null };
    contenedorSub.innerHTML = ''; 
    listaFiltrada = productosGlobal.filter(p => favoritos.includes(p.sku || p.clave));
    listaFinal = [...listaFiltrada]; 
    const btnLimpiar = document.getElementById('btn-limpiar-favs');
    if(btnLimpiar) btnLimpiar.classList.remove('oculto');
    generarFiltrosSidebar(listaFiltrada);
    cargarPagina(1);
}

function actualizarContador() {
    const contador = document.getElementById('fav-counter');
    if(!contador) return;
    contador.innerText = favoritos.length;
    contador.style.display = favoritos.length > 0 ? 'flex' : 'none';
}

function limpiarFavoritos() {
    localStorage.removeItem('eritech_favs');
    favoritos = [];
    actualizarContador();
    if (categoriaActual === 'favoritos') {
        contenedor.innerHTML = '<p style="color:#777; text-align:center; grid-column: 1/-1; padding: 40px;">Lista vaciada con éxito.</p>';
        listaFiltrada = [];
        listaFinal = [];
        document.getElementById('btn-limpiar-favs').classList.add('oculto');
    }
}

function aplicarOrden() {
    const criterio = document.getElementById('sort-logic').value;
    listaFinal = [...listaFiltrada]; 
    if (criterio === 'p-menor') listaFinal.sort((a, b) => (a.precio || 0) - (b.precio || 0));
    else if (criterio === 'p-mayor') listaFinal.sort((a, b) => (b.precio || 0) - (a.precio || 0));
    else if (criterio === 'a-z') listaFinal.sort((a, b) => a.nombre.localeCompare(b.nombre));
    else if (criterio === 'z-a') listaFinal.sort((a, b) => b.nombre.localeCompare(a.nombre));
    cargarPagina(1);
}

const originalMostrarFavoritos = mostrarFavoritos;
mostrarFavoritos = function(elemento) {
    originalMostrarFavoritos(elemento);
    document.getElementById('btn-limpiar-favs').classList.remove('oculto');
};

window.onload = () => {
    actualizarContador();
    actualizarBadgeCarrito();
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
        let val = p[propJSON] || 'Otros';
        if(val === 'Hewlett Packard') val = 'HP'; 
        conteo[val] = (conteo[val] || 0) + 1;
    });
    const opcionesOrdenadas = Object.keys(conteo).sort((a, b) => {
        return conteo[b] - conteo[a];
    });
    if(opcionesOrdenadas.length > 0) {
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
  document.getElementById('btn-limpiar-favs').classList.add('oculto'); 
    if(elemento) {
        document.querySelectorAll('.cat-card').forEach(c => c.classList.remove('active'));
        elemento.classList.add('active');
    }
    categoriaActual = filtro;
    filtrosActivos = { subcategoria: null, marca: null, procesador: null, ram: null, almacenamiento: null };

    if(filtro === 'todo') {
        listaFiltrada = [...productosGlobal];
        listaFiltrada.sort((a, b) => (b.existenciaCUN || 0) - (a.existenciaCUN || 0));
        contenedorSub.innerHTML = ''; 
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
            
            if (filtro === 'redes') {
                return todo.includes('red') || todo.includes('switch') || todo.includes('router') || todo.includes('access point') || todo.includes('bobina') || todo.includes('transceptor') || todo.includes('cable de red') || todo.includes('jack') || todo.includes('placa de pared');
            }
            if (filtro === 'licencias') {
                return todo.includes('software') || todo.includes('licencia') || todo.includes('antivirus') || todo.includes('esd') || todo.includes('digital') || todo.includes('aspel') || todo.includes('microsoft');
            }
            if (filtro === 'seguridad') {
                return todo.includes('vigilancia') || todo.includes('cámara') || todo.includes('camera') || todo.includes('dvr') || todo.includes('nvr') || todo.includes('xvr') || todo.includes('cctv') || todo.includes('control de acceso') || todo.includes('alarma') || todo.includes('videoportero');
            }
            if (filtro === 'componentes') {
                return todo.includes('procesador') || todo.includes('tarjeta madre') || todo.includes('motherboard') || todo.includes('memoria ram') || todo.includes('ddr') || todo.includes('gabinete') || todo.includes('fuente de poder') || todo.includes('disipador') || todo.includes('ventilador') || todo.includes('disco duro') || todo.includes('ssd') || todo.includes('tarjeta de video');
            }
            return false;
        });
        generarSubcategorias(listaFiltrada);
    }
    generarFiltrosSidebar(listaFiltrada);
    listaFinal = listaFiltrada;
    cargarPagina(1);
}

function generarSubcategorias(lista) {
    contenedorSub.innerHTML = '';
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
    
    lista.forEach(prod => {
        const precio = prod.precio ? formatearDinero(prod.precio) : "$0.00";
        const clave = prod.sku || prod.clave || 'S/N';
        const stockInfo = obtenerInfoStock(prod.existenciaCUN);
        
        const esFav = favoritos.includes(clave) ? 'active' : '';
        const textoPrincipal = prod.descripcion_corta || prod.nombre;

        // Reemplazo comillas para el JSON stringify
        const prodString = JSON.stringify(prod).replace(/"/g, '&quot;');

        const card = document.createElement('div');
        card.className = 'producto-card';
        card.innerHTML = `
            <div class="card-header">
                <span class="badge-stock ${stockInfo.c}">${stockInfo.t}</span>
                <span class="prod-marca">${prod.marca||'ERITECH'}</span>
            </div>
            <div class="img-wrapper" onclick="verDetalle(${prodString})">
                <div class="fav-btn ${esFav}" onclick="toggleFavorito(event, '${clave}')">
                    <span class="material-icons-outlined" style="font-size:20px;">favorite</span>
                </div>
                <div class="img-bg"></div>
                <img src="${prod.imagen}" class="producto-img" onerror="this.src='https://via.placeholder.com/200?text=Eritech'">
            </div>
            
            <div class="card-body" onclick="verDetalle(${prodString})">
                <span class="sku-card">SKU: ${clave}</span>
                <h3 class="prod-titulo" title="${textoPrincipal}">${textoPrincipal}</h3>
            </div>
            
            <div class="card-footer">
                <div class="price-group"><span class="monto">${precio}<span> MXN</span></span></div>
                <button class="btn-add-cart" onclick="addToCart(${prodString}, event)" title="Agregar al pedido">
                    <span class="material-icons-outlined" style="font-size:18px;">add_shopping_cart</span>
                </button>
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

function verDetalle(prod) {
    scrollGuardado = window.scrollY;
    vistaCatalogo.classList.add('oculto'); 
    vistaDetalle.classList.remove('oculto'); 

    const anchor = document.getElementById('inicio-app');
    if(anchor) anchor.scrollIntoView({ behavior: 'auto' });
    else window.scrollTo(0,0);

    const precio = prod.precio ? formatearDinero(prod.precio) : "$0.00";
    const clave = prod.sku || prod.clave || 'S/N';
    const stock = obtenerInfoStock(prod.existenciaCUN);

    document.getElementById('det-img').src = prod.imagen;
    document.getElementById('det-marca').textContent = prod.marca || 'ERITECH';
    document.getElementById('det-sku').textContent = `SKU: ${clave}`;
    document.getElementById('det-titulo').textContent = prod.nombre;
    document.getElementById('det-precio').innerHTML = `${precio}<span>MXN</span>`;
    document.getElementById('det-stock').textContent = stock.t;
    document.getElementById('det-stock').className = `badge-stock ${stock.c}`;

    // Configurar el botón de AGREGAR AL CARRITO del detalle
    const btnAdd = document.getElementById('btn-add-detail');
    const newBtn = btnAdd.cloneNode(true);
    btnAdd.parentNode.replaceChild(newBtn, btnAdd);
    newBtn.onclick = () => addToCart(prod);

    // Botón de Duda Directa
    const msg = `Hola, tengo una duda sobre este producto: ${prod.nombre} (SKU: ${clave}).`;
    document.getElementById('btn-cotizar-final').href = `https://wa.me/${TELEFONO}?text=${encodeURIComponent(msg)}`;

    const tabla = document.getElementById('tabla-specs-completa');
    tabla.innerHTML = '';
    if(prod.especificaciones) {
        prod.especificaciones.forEach(s => {
            tabla.innerHTML += `<tr><td>${s.tipo}</td><td>${s.valor}</td></tr>`;
        });
    }
}

function cerrarDetalle() {
    vistaDetalle.classList.add('oculto');
    vistaCatalogo.classList.remove('oculto');
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
