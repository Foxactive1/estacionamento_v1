// script.js - ELVIS VEÍCULOS (público)
// Integrado ao painel admin via localStorage (chave: elvis_vehicles)

const STORAGE_KEY = 'elvis_vehicles';

// Dados de fallback (caso localStorage esteja vazio — ex: primeiro acesso sem admin)
const VEHICLES_DEFAULT = [
    {
        id: 1,
        marca: 'Hyundai', modelo: 'Azera',
        versao: '3.0 V6 GLS — Automático',
        anoFab: '2011', anoMod: '2012',
        preco: '74.990', km: '98.000',
        cor: 'Prata', cambio: 'Automático',
        combustivel: 'Gasolina', finalPlaca: '3',
        portas: '4 Portas', motor: '3.0 V6 270cv',
        fipe: '79.100', destaque: true, status: 'ativo',
        optionals: ['Ar Cond. Digital', 'Bancos em Couro', 'GPS de Fábrica', 'Som Premium', 'Teto Solar']
    },
    {
        id: 2,
        marca: 'Hyundai', modelo: 'Tucson',
        versao: '2.0 GLS — Automático',
        anoFab: '2014', anoMod: '2015',
        preco: '64.990', km: '72.000',
        cor: 'Branco', cambio: 'Automático',
        combustivel: 'Flex', finalPlaca: '5',
        portas: '4 Portas', motor: '2.0 16v',
        fipe: '68.000', destaque: false, status: 'ativo',
        optionals: ['Ar Cond. Digital', 'Câmera de Ré']
    },
    {
        id: 3,
        marca: 'Toyota', modelo: 'Corolla',
        versao: '2.0 XEI — Automático',
        anoFab: '2018', anoMod: '2019',
        preco: '89.900', km: '55.000',
        cor: 'Preto', cambio: 'Automático',
        combustivel: 'Flex', finalPlaca: '7',
        portas: '4 Portas', motor: '2.0 Flex',
        fipe: '92.000', destaque: false, status: 'ativo',
        optionals: ['GPS de Fábrica', 'Alarme', 'Ar Cond. Digital']
    },
    {
        id: 4,
        marca: 'Volkswagen', modelo: 'Jetta',
        versao: '2.0 TSI — Automático',
        anoFab: '2017', anoMod: '2017',
        preco: '78.500', km: '68.000',
        cor: 'Cinza', cambio: 'Automático',
        combustivel: 'Gasolina', finalPlaca: '2',
        portas: '4 Portas', motor: '2.0 Turbo',
        fipe: '81.000', destaque: false, status: 'ativo',
        optionals: ['Bancos em Couro', 'Som Premium']
    }
];

// ─── CARREGAMENTO DE DADOS ────────────────────────────────────────────────────
function loadVehicles() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed;
            }
        }
    } catch (e) {
        console.warn('Erro ao ler localStorage:', e);
    }
    return VEHICLES_DEFAULT;
}

// Retorna apenas veículos ativos (status 'ativo' ou sem status definido)
function getActiveVehicles(all) {
    return all.filter(v => !v.status || v.status === 'ativo');
}

// Retorna o veículo de destaque (flag destaque=true, ou o primeiro ativo)
function getDestaque(active) {
    return active.find(v => v.destaque) || active[0] || null;
}

// ─── ESTADO GLOBAL ────────────────────────────────────────────────────────────
let allVehicles   = loadVehicles();
let activeVehicles = getActiveVehicles(allVehicles);

// Escuta mudanças no localStorage feitas pelo admin em outra aba
window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
        allVehicles    = loadVehicles();
        activeVehicles = getActiveVehicles(allVehicles);
        renderCards(activeVehicles);
        populateFilters(activeVehicles);
        const destaque = getDestaque(activeVehicles);
        if (destaque) showDetail(destaque);
        showToast('🔄', 'Estoque atualizado!', 'Admin sincronizou novos dados.');
    }
});

// ─── TOAST ───────────────────────────────────────────────────────────────────
const toast = document.getElementById('toast');
const toastIcon = toast.querySelector('.toast-icon');
const toastText = toast.querySelector('.toast-text');
const toastSub  = toast.querySelector('.toast-sub');
let toastTimer;

function showToast(icon, text, sub = '') {
    toastIcon.textContent = icon;
    toastText.textContent = text;
    toastSub.textContent  = sub;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
}

// ─── FILTROS DINÂMICOS ────────────────────────────────────────────────────────
function populateFilters(vehicles) {
    const marcas   = [...new Set(vehicles.map(v => v.marca))].sort();
    const modelos  = [...new Set(vehicles.map(v => v.modelo))].sort();
    const anos     = [...new Set(vehicles.map(v => v.anoMod))].sort((a,b) => b - a);
    const cambios  = [...new Set(vehicles.map(v => v.cambio))].sort();

    const fill = (id, values) => {
        const sel = document.getElementById(id);
        const cur = sel.value;
        sel.innerHTML = `<option value="">Todas</option>` +
            values.map(v => `<option value="${v}">${v}</option>`).join('');
        sel.value = cur;
    };

    fill('filter-marca',  marcas);
    fill('filter-modelo', modelos);
    fill('filter-ano',    anos);
    fill('filter-cambio', cambios);
}

// ─── CARDS ───────────────────────────────────────────────────────────────────
function renderCards(filtered = activeVehicles) {
    const grid = document.getElementById('carsGrid');

    if (!filtered.length) {
        grid.innerHTML = `
            <div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:#888;">
                <div style="font-size:3rem;margin-bottom:12px">🔍</div>
                <div style="font-size:1.1rem;font-weight:600">Nenhum veículo encontrado</div>
                <div style="font-size:.9rem;margin-top:6px">Tente outros filtros ou entre em contato.</div>
            </div>`;
        return;
    }

    grid.innerHTML = filtered.map(v => {
        const featuredClass = v.destaque ? 'featured' : '';
        // Foto real se cadastrada pelo admin, senão emoji
        const imgContent = (v.photos && v.photos.length > 0)
            ? `<img src="${v.photos[0]}" alt="${v.marca} ${v.modelo}" style="width:100%;height:100%;object-fit:cover;border-radius:12px 12px 0 0;">`
            : `<span class="car-img-emoji">🚗</span>`;

        return `
            <div class="car-card ${featuredClass}" data-id="${v.id}">
                <div class="car-img">
                    ${imgContent}
                    ${v.destaque ? '<div class="car-label destaque">⭐ DESTAQUE</div>' : ''}
                    ${v.optionals && v.optionals.length > 3 ? `<div class="car-label" style="top:auto;bottom:10px;left:10px;right:auto;background:rgba(0,0,0,.55);font-size:.65rem;">${v.optionals.length} opcionais</div>` : ''}
                </div>
                <div class="car-info">
                    <div class="car-name">${v.marca} ${v.modelo}</div>
                    <div class="car-sub">${v.versao || ''} — ${v.anoFab}/${v.anoMod}</div>
                    <div class="car-optionals">
                        ${(v.optionals || []).slice(0, 3).map(opt => `<span class="opt-tag">${opt}</span>`).join('')}
                        ${(v.optionals || []).length > 3 ? `<span class="opt-tag">+${v.optionals.length - 3}</span>` : ''}
                    </div>
                    <div class="car-specs">
                        <div class="spec"><span class="spec-icon">📅</span> ${v.anoFab}/${v.anoMod}</div>
                        <div class="spec"><span class="spec-icon">🛣️</span> ${v.km} km</div>
                        <div class="spec"><span class="spec-icon">⛽</span> ${v.combustivel}</div>
                        <div class="spec"><span class="spec-icon">🎨</span> ${v.cor}</div>
                    </div>
                    <div class="car-footer">
                        <div>
                            <div class="car-price-lbl">Preço</div>
                            <div class="car-price">R$ ${v.preco}</div>
                        </div>
                        <a href="#" class="wpp-btn" data-wpp="${v.id}">💬 WhatsApp</a>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Eventos — clique no card abre detalhe
    document.querySelectorAll('.car-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('.wpp-btn')) return;
            const id = parseInt(card.dataset.id);
            const vehicle = activeVehicles.find(v => v.id === id);
            if (vehicle) {
                showDetail(vehicle);
                document.getElementById('veiculo-destaque').scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    document.querySelectorAll('.wpp-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const id = parseInt(btn.dataset.wpp);
            const vehicle = activeVehicles.find(v => v.id === id);
            openWhatsApp(vehicle);
        });
    });
}

// ─── DETALHE ─────────────────────────────────────────────────────────────────
function showDetail(vehicle) {
    const detailInner = document.getElementById('detailInner');

    // Galeria de fotos ou emoji
    const hasPhotos = vehicle.photos && vehicle.photos.length > 0;
    const galleryHTML = hasPhotos
        ? `<img id="detail-main-img" src="${vehicle.photos[0]}" alt="${vehicle.marca} ${vehicle.modelo}"
               style="width:100%;height:100%;object-fit:cover;border-radius:16px;">`
        : `<span style="font-size:5rem">🚗</span>`;

    const thumbsHTML = hasPhotos
        ? vehicle.photos.map((p, i) => `
            <div class="thumb ${i === 0 ? 'active' : ''}" data-src="${p}" style="background:url('${p}') center/cover no-repeat;">
            </div>`).join('')
        : `<div class="thumb active">🚗</div>
           <div class="thumb">🪑</div>
           <div class="thumb">🔧</div>`;

    // Diferença FIPE
    const precoNum = parseFloat((vehicle.preco || '0').replace(/\./g, '').replace(',', '.'));
    const fipeNum  = parseFloat((vehicle.fipe  || '0').replace(/\./g, '').replace(',', '.'));
    const desconto = (fipeNum > precoNum && fipeNum > 0)
        ? `<span style="font-size:.8rem;color:#22c55e;font-weight:600;margin-left:8px">▼ R$ ${(fipeNum - precoNum).toLocaleString('pt-BR')} abaixo da FIPE</span>`
        : '';

    detailInner.innerHTML = `
        <div>
            <div class="detail-gallery">${galleryHTML}</div>
            <div class="thumb-row">${thumbsHTML}</div>
        </div>
        <div class="detail-info">
            <div class="detail-tag">✦ Ficha Completa</div>
            <div class="detail-name">${vehicle.marca} ${vehicle.modelo}</div>
            <div class="detail-version">${vehicle.versao || ''} — ${vehicle.anoFab}/${vehicle.anoMod} — ${vehicle.cor}</div>
            <div class="detail-price-block">
                ${vehicle.fipe ? `<div class="detail-price-old">FIPE: R$ ${vehicle.fipe}</div>` : ''}
                <div class="detail-price">R$ ${vehicle.preco} ${desconto}</div>
                <div class="detail-price-note">ou parcele em até 60x no financiamento</div>
            </div>
            <div class="detail-specs-grid">
                <div class="dspec"><div class="dspec-lbl">Ano</div><div class="dspec-val">${vehicle.anoFab}/${vehicle.anoMod}</div></div>
                <div class="dspec"><div class="dspec-lbl">Quilometragem</div><div class="dspec-val">${vehicle.km} km</div></div>
                <div class="dspec"><div class="dspec-lbl">Câmbio</div><div class="dspec-val">${vehicle.cambio}</div></div>
                <div class="dspec"><div class="dspec-lbl">Combustível</div><div class="dspec-val">${vehicle.combustivel}</div></div>
                <div class="dspec"><div class="dspec-lbl">Motor</div><div class="dspec-val">${vehicle.motor || '—'}</div></div>
                <div class="dspec"><div class="dspec-lbl">Final de Placa</div><div class="dspec-val">${vehicle.finalPlaca || '—'}</div></div>
                <div class="dspec"><div class="dspec-lbl">Portas</div><div class="dspec-val">${vehicle.portas || '—'}</div></div>
                <div class="dspec"><div class="dspec-lbl">Cor</div><div class="dspec-val">${vehicle.cor}</div></div>
            </div>

            ${vehicle.optionals && vehicle.optionals.length > 0 ? `
            <div style="margin:20px 0">
                <div style="font-size:.75rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#888;margin-bottom:10px">Opcionais</div>
                <div style="display:flex;flex-wrap:wrap;gap:8px">
                    ${vehicle.optionals.map(o => `<span class="opt-tag" style="font-size:.8rem">✨ ${o}</span>`).join('')}
                </div>
            </div>` : ''}

            <div class="detail-actions">
                <a href="#" class="btn-wpp" id="detailWppBtn">💬 FALAR NO WHATSAPP</a>
                <div class="btn-row">
                    ${vehicle.fipe ? `<button class="btn-fipe" id="detailFipeBtn">📊 Tabela FIPE</button>` : ''}
                    <button class="btn-fin" id="detailFinBtn">💳 Simular Financiamento</button>
                </div>
                <a href="#" class="btn-proposta" id="detailPropostaBtn">📋 ENVIAR PROPOSTA</a>
            </div>
        </div>
    `;

    // Galeria — clique nas thumbs troca foto principal
    if (hasPhotos) {
        detailInner.querySelectorAll('.thumb').forEach(thumb => {
            thumb.addEventListener('click', () => {
                detailInner.querySelectorAll('.thumb').forEach(t => t.classList.remove('active'));
                thumb.classList.add('active');
                document.getElementById('detail-main-img').src = thumb.dataset.src;
            });
        });
    }

    // Botões
    document.getElementById('detailWppBtn').addEventListener('click', (e) => {
        e.preventDefault();
        openWhatsApp(vehicle);
    });

    const fipeBtn = document.getElementById('detailFipeBtn');
    if (fipeBtn) {
        fipeBtn.addEventListener('click', () => {
            showToast('📊', `Tabela FIPE — ${vehicle.marca} ${vehicle.modelo} ${vehicle.anoMod}: R$ ${vehicle.fipe}`);
        });
    }

    document.getElementById('detailFinBtn').addEventListener('click', () => {
        showToast('💳', 'Simulação enviada!', 'Em breve entraremos em contato.');
    });

    document.getElementById('detailPropostaBtn').addEventListener('click', (e) => {
        e.preventDefault();
        showToast('📋', 'Formulário de proposta em breve!', 'Estamos preparando esta funcionalidade.');
    });
}

// ─── WHATSAPP ─────────────────────────────────────────────────────────────────
function openWhatsApp(vehicle) {
    // Substitua pelo número real: 5511999999999
    const numero = '5511999999999';
    const msg = vehicle
        ? `Olá! Vi o *${vehicle.marca} ${vehicle.modelo} ${vehicle.anoFab}/${vehicle.anoMod}* (R$ ${vehicle.preco}) no site e gostaria de mais informações.`
        : 'Olá! Vim pelo site da Elvis Veículos e gostaria de mais informações.';
    const url = `https://wa.me/${numero}?text=${encodeURIComponent(msg)}`;
    // Em protótipo: apenas toast. Em produção: window.open(url, '_blank');
    showToast('💬', vehicle ? `${vehicle.marca} ${vehicle.modelo}` : 'Elvis Veículos', 'Mensagem pronta para o WhatsApp!');
}

// ─── BUSCA / FILTROS ──────────────────────────────────────────────────────────
document.getElementById('searchBtn').addEventListener('click', () => {
    const marca   = document.getElementById('filter-marca').value;
    const modelo  = document.getElementById('filter-modelo').value;
    const ano     = document.getElementById('filter-ano').value;
    const preco   = document.getElementById('filter-preco').value;
    const cambio  = document.getElementById('filter-cambio').value;

    const filtered = activeVehicles.filter(v => {
        if (marca  && v.marca !== marca) return false;
        if (modelo && v.modelo !== modelo) return false;
        if (ano    && v.anoMod !== ano) return false;
        if (cambio && v.cambio !== cambio) return false;
        if (preco) {
            const n = parseFloat((v.preco || '0').replace(/\./g, '').replace(',', '.'));
            if (preco === '40000'  && n > 40000)  return false;
            if (preco === '60000'  && n > 60000)  return false;
            if (preco === '80000'  && n > 80000)  return false;
            if (preco === '80000+' && n <= 80000) return false;
        }
        return true;
    });

    renderCards(filtered);
    showToast(
        filtered.length ? '✅' : '🔍',
        filtered.length ? `${filtered.length} veículo(s) encontrado(s)` : 'Nenhum veículo encontrado',
        filtered.length ? '' : 'Tente outros filtros.'
    );
});

// ─── INICIALIZAÇÃO ────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    populateFilters(activeVehicles);
    renderCards(activeVehicles);

    const destaque = getDestaque(activeVehicles);
    if (destaque) showDetail(destaque);

    // Botões WhatsApp genéricos
    document.querySelectorAll('#headerWppBtn, #heroWppBtn, #footerWppBtn, #floatWpp').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            openWhatsApp(null);
        });
    });
});
