// script.js - ELVIS VEÍCULOS (público) - Versão integrada com admin

const STORAGE_KEY = 'elvis_vehicles';
let vehicles = [];

// Dados iniciais (caso não haja nada no localStorage)
const initialVehicles = [
    {
        id: 1,
        marca: 'Hyundai',
        modelo: 'Azera',
        versao: '3.0 V6 GLS — Automático',
        anoFab: '2011',
        anoMod: '2012',
        preco: '74.990',
        km: '98.000',
        cor: 'Prata',
        cambio: 'Automático',
        combustivel: 'Gasolina',
        finalPlaca: '3',
        portas: '4 Portas',
        motor: '3.0 V6 270cv',
        fipe: '79.100',
        destaque: true,
        descricao: 'Veículo completo, único dono, revisado, com todos os opcionais de fábrica.',
        optionals: ['Ar Cond. Digital', 'Bancos em Couro', 'GPS de Fábrica', 'Som Premium', 'Teto Solar']
    },
    {
        id: 2,
        marca: 'Hyundai',
        modelo: 'Tucson',
        versao: '2.0 GLS — Automático',
        anoFab: '2014',
        anoMod: '2015',
        preco: '64.990',
        km: '72.000',
        cor: 'Branco',
        cambio: 'Automático',
        combustivel: 'Flex',
        finalPlaca: '5',
        portas: '4 Portas',
        motor: '2.0 16v',
        fipe: '68.000',
        destaque: false,
        descricao: 'Ótimo estado, revisado, ar condicionado digital, câmera de ré.',
        optionals: ['Ar Cond. Digital', 'Câmera de Ré']
    },
    {
        id: 3,
        marca: 'Toyota',
        modelo: 'Corolla',
        versao: '2.0 XEI — Automático',
        anoFab: '2018',
        anoMod: '2019',
        preco: '89.900',
        km: '55.000',
        cor: 'Preto',
        cambio: 'Automático',
        combustivel: 'Flex',
        finalPlaca: '7',
        portas: '4 Portas',
        motor: '2.0 Flex',
        fipe: '92.000',
        destaque: false,
        descricao: 'Carro muito econômico, completo, com manual e chave reserva.',
        optionals: ['GPS de Fábrica', 'Alarme', 'Ar Cond. Digital']
    },
    {
        id: 4,
        marca: 'Volkswagen',
        modelo: 'Jetta',
        versao: '2.0 TSI — Automático',
        anoFab: '2017',
        anoMod: '2017',
        preco: '78.500',
        km: '68.000',
        cor: 'Cinza',
        cambio: 'Automático',
        combustivel: 'Gasolina',
        finalPlaca: '2',
        portas: '4 Portas',
        motor: '2.0 Turbo',
        fipe: '81.000',
        destaque: false,
        descricao: 'Performance e conforto, bancos em couro, som premium.',
        optionals: ['Bancos em Couro', 'Som Premium']
    }
];

// Carrega veículos do localStorage ou usa dados iniciais
function loadVehicles() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        vehicles = JSON.parse(stored);
    } else {
        vehicles = initialVehicles;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(vehicles));
    }
}

// Elementos DOM
const toast = document.getElementById('toast');
const toastIcon = toast.querySelector('.toast-icon');
const toastText = toast.querySelector('.toast-text');
const toastSub = toast.querySelector('.toast-sub');
let toastTimer;

function showToast(icon, text, sub = '') {
    toastIcon.textContent = icon;
    toastText.textContent = text;
    toastSub.textContent = sub;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
}

// Função para converter string de preço (ex: "74.990" ou "74.990,50") para número
function parsePrice(priceStr) {
    if (!priceStr) return 0;
    // Remove pontos e substitui vírgula por ponto
    const normalized = priceStr.replace(/\./g, '').replace(',', '.');
    return parseFloat(normalized) || 0;
}

// Renderiza os cards de veículos
function renderCards(filteredVehicles = vehicles) {
    const grid = document.getElementById('carsGrid');
    if (!filteredVehicles.length) {
        grid.innerHTML = '<div class="no-results">Nenhum veículo encontrado.</div>';
        return;
    }
    grid.innerHTML = filteredVehicles.map(v => {
        const featuredClass = v.destaque ? 'featured' : '';
        return `
            <div class="car-card ${featuredClass}" data-id="${v.id}">
                <div class="car-img">
                    <span class="car-img-emoji" role="img" aria-label="Imagem do veículo">🚗</span>
                    ${v.destaque ? '<div class="car-label destaque">⭐ DESTAQUE</div>' : ''}
                </div>
                <div class="car-info">
                    <div class="car-name">${v.marca} ${v.modelo}</div>
                    <div class="car-sub">${v.versao || ''} — ${v.anoFab}/${v.anoMod}</div>
                    <div class="car-optionals">
                        ${(v.optionals || []).slice(0, 3).map(opt => `<span class="opt-tag">${opt}</span>`).join('')}
                        ${(v.optionals || []).length > 3 ? '<span class="opt-tag">+...</span>' : ''}
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
                        <a href="https://wa.me/5511999999999?text=Olá! Vi o ${v.marca} ${v.modelo} no site e gostaria de mais informações." class="wpp-btn" target="_blank">💬 WhatsApp</a>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Eventos nos cards (exceto botão WhatsApp)
    document.querySelectorAll('.car-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('.wpp-btn')) return;
            const id = parseInt(card.dataset.id);
            const vehicle = vehicles.find(v => v.id === id);
            if (vehicle) showDetail(vehicle);
        });
    });
}

// Renderiza a seção de detalhe
function showDetail(vehicle) {
    const detailInner = document.getElementById('detailInner');
    detailInner.innerHTML = `
        <div>
            <div class="detail-gallery" role="img" aria-label="Galeria de imagens do veículo">🚗</div>
            <div class="thumb-row">
                <div class="thumb active" role="button" tabindex="0" aria-label="Foto principal">🚗</div>
                <div class="thumb" role="button" tabindex="0" aria-label="Foto interna">🪑</div>
                <div class="thumb" role="button" tabindex="0" aria-label="Foto do motor">🔧</div>
                <div class="thumb" role="button" tabindex="0" aria-label="Foto da cor">🎨</div>
                <div class="thumb" role="button" tabindex="0" aria-label="Foto de detalhe">📐</div>
            </div>
        </div>
        <div class="detail-info">
            <div class="detail-tag">✦ Ficha Completa</div>
            <div class="detail-name">${vehicle.marca} ${vehicle.modelo}</div>
            <div class="detail-version">${vehicle.versao || ''} — ${vehicle.anoFab}/${vehicle.anoMod} — ${vehicle.cor}</div>
            ${vehicle.descricao ? `<div class="detail-description">${vehicle.descricao}</div>` : ''}
            <div class="detail-price-block">
                <div class="detail-price-old">FIPE: R$ ${vehicle.fipe || '—'}</div>
                <div class="detail-price">R$ ${vehicle.preco}</div>
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
            <!-- Opcionais -->
            <div class="optionals-grid" style="margin-top:20px">
                ${(vehicle.optionals || []).map(opt => `
                    <div class="opt-item"><span class="oi">✨</span>${opt}</div>
                `).join('')}
            </div>
            <div class="detail-actions">
                <a href="https://wa.me/5511999999999?text=Olá! Vi o ${vehicle.marca} ${vehicle.modelo} no site e gostaria de mais informações." class="btn-wpp" target="_blank">💬 FALAR NO WHATSAPP</a>
                <div class="btn-row">
                    <button class="btn-fipe" id="detailFipeBtn">📊 Tabela FIPE</button>
                    <button class="btn-fin" id="detailFinBtn">💳 Simular Financiamento</button>
                </div>
                <a href="#" class="btn-proposta" id="detailPropostaBtn">📋 ENVIAR PROPOSTA</a>
            </div>
        </div>
    `;

    // Eventos dos botões do detalhe
    document.getElementById('detailFipeBtn').addEventListener('click', () => {
        showToast('📊', `Tabela FIPE — ${vehicle.marca} ${vehicle.modelo} ${vehicle.anoMod}: R$ ${vehicle.fipe || '—'}`);
    });
    document.getElementById('detailFinBtn').addEventListener('click', () => {
        showToast('💳', 'Simulação enviada!', 'Em breve entraremos em contato.');
    });
    document.getElementById('detailPropostaBtn').addEventListener('click', (e) => {
        e.preventDefault();
        showToast('📋', 'Formulário de proposta aberto!');
    });
}

// Busca com filtros atualizados
document.getElementById('searchBtn').addEventListener('click', () => {
    const marca = document.getElementById('filter-marca').value;
    const modelo = document.getElementById('filter-modelo').value;
    const ano = document.getElementById('filter-ano').value;
    const precoMin = document.getElementById('filter-preco-min').value;
    const precoMax = document.getElementById('filter-preco-max').value;
    const cambio = document.getElementById('filter-cambio').value;

    const filtered = vehicles.filter(v => {
        if (marca && v.marca !== marca) return false;
        if (modelo && v.modelo !== modelo) return false;
        if (ano && v.anoMod !== ano) return false;
        if (cambio && v.cambio !== cambio) return false;

        const priceNum = parsePrice(v.preco);
        if (precoMin) {
            const min = parsePrice(precoMin);
            if (priceNum < min) return false;
        }
        if (precoMax) {
            const max = parsePrice(precoMax);
            if (priceNum > max) return false;
        }
        return true;
    });

    renderCards(filtered);
    if (filtered.length === 0) {
        showToast('🔍', 'Nenhum veículo encontrado', 'Tente outros filtros.');
    } else {
        showToast('✅', `${filtered.length} veículo(s) encontrado(s)`);
    }
});

// Menu mobile
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const mobileNav = document.getElementById('mobileNav');
mobileMenuBtn.addEventListener('click', () => {
    if (mobileNav.style.display === 'flex') {
        mobileNav.style.display = 'none';
    } else {
        mobileNav.style.display = 'flex';
    }
});

// Fechar menu ao clicar em link
mobileNav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
        mobileNav.style.display = 'none';
    });
});

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    loadVehicles();
    renderCards();
    if (vehicles.length > 0) {
        showDetail(vehicles[0]); // mostra o primeiro como destaque
    } else {
        document.getElementById('detailInner').innerHTML = '<p style="text-align:center;padding:40px">Nenhum veículo cadastrado.</p>';
    }

    // Eventos dos botões de WhatsApp flutuante e mobile (já têm href direto)
    // O toast pode ser exibido como confirmação adicional (opcional)
    document.querySelectorAll('.float-wpp, .mobile-wpp').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Não previne o padrão, pois queremos abrir o link
            showToast('💬', 'Redirecionando para WhatsApp...');
        });
    });
});