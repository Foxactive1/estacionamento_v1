// admin-script.js - ELVIS VEÍCULOS (painel administrativo)

// Estado global
let vehicles = [];
let nextId = 1;
const STORAGE_KEY = 'elvis_vehicles';

// Opcionais disponíveis
const optionalsList = [
    'Ar Cond. Digital', 'Bancos em Couro', 'GPS de Fábrica', 'Som Premium',
    'Teto Solar', 'Faróis de Neblina', 'Alarme', 'Rodas Aro 17',
    'Câmera de Ré', 'Sensor de Ré', 'Partida Elétrica', 'Vidros Elétricos',
    'Banco Elétrico', 'Multimídia', 'Chuva/Luz Auto', 'Freios ABS'
];

// Elementos DOM
const toast = document.getElementById('toast');
const toastIcon = toast.querySelector('.toast-icon');
const toastText = toast.querySelector('.toast-text');
const toastSub = toast.querySelector('.toast-sub');
let toastTimer;

// Utilitários
function $(id) { return document.getElementById(id); }

function showToast(icon, text, sub = '') {
    toastIcon.textContent = icon;
    toastText.textContent = text;
    toastSub.textContent = sub;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
}

// Carrega dados do localStorage
function loadVehicles() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        vehicles = JSON.parse(stored);
        nextId = vehicles.length ? Math.max(...vehicles.map(v => v.id)) + 1 : 1;
    } else {
        // Dados iniciais
        vehicles = [
            { id:1, marca:'Hyundai', modelo:'Azera', versao:'3.0 V6 GLS', anoFab:'2011', anoMod:'2012', preco:'74.990', km:'98.000', cor:'Prata', cambio:'Automático', combustivel:'Gasolina', finalPlaca:'3', portas:'4 Portas', motor:'3.0 V6 270cv', fipe:'79.100', status:'ativo', optionals:['Ar Cond. Digital','Bancos em Couro','GPS de Fábrica','Teto Solar','Som Premium'] },
            { id:2, marca:'Hyundai', modelo:'Tucson', versao:'2.0 GLS', anoFab:'2014', anoMod:'2015', preco:'64.990', km:'72.000', cor:'Branco', cambio:'Automático', combustivel:'Flex', finalPlaca:'5', portas:'4 Portas', motor:'2.0 16v', fipe:'68.000', status:'ativo', optionals:['Ar Cond. Digital','Câmera de Ré'] },
            { id:3, marca:'Toyota', modelo:'Corolla', versao:'2.0 XEI', anoFab:'2018', anoMod:'2019', preco:'89.900', km:'55.000', cor:'Preto', cambio:'Automático', combustivel:'Flex', finalPlaca:'7', portas:'4 Portas', motor:'2.0 Flex', fipe:'92.000', status:'ativo', optionals:['GPS de Fábrica','Alarme','Ar Cond. Digital'] },
            { id:4, marca:'Volkswagen', modelo:'Jetta', versao:'2.0 TSI', anoFab:'2017', anoMod:'2017', preco:'78.500', km:'68.000', cor:'Cinza', cambio:'Automático', combustivel:'Gasolina', finalPlaca:'2', portas:'4 Portas', motor:'2.0 Turbo', fipe:'81.000', status:'pause', optionals:['Bancos em Couro','Som Premium'] }
        ];
        nextId = 5;
        saveVehicles();
    }
}

function saveVehicles() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(vehicles));
}

// Login
function doLogin() {
    const user = $('login-user').value.trim();
    const pass = $('login-pass').value;
    const err = $('login-error');
    if (user === 'admin' && pass === 'elvis2026') {
        $('login-screen').style.display = 'none';
        $('admin-screen').style.display = 'block';
        initAdmin();
    } else {
        err.style.display = 'block';
        setTimeout(() => err.style.display = 'none', 3000);
    }
}

function doLogout() {
    $('admin-screen').style.display = 'none';
    $('login-screen').style.display = 'flex';
    $('login-user').value = '';
    $('login-pass').value = '';
}

// Inicialização do admin
function initAdmin() {
    const now = new Date();
    $('topbar-date').textContent = now.toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
    buildOptionalsCheck();
    renderDashboard();
    renderEstoque();
}

// Opcionais checkboxes
function buildOptionalsCheck() {
    const container = $('optionals-container');
    container.innerHTML = optionalsList.map(o => `
        <div class="opt-check" data-opt="${o}">
            <div class="check-box"></div>
            <span>${o}</span>
        </div>
    `).join('');

    container.addEventListener('click', (e) => {
        const item = e.target.closest('.opt-check');
        if (!item) return;
        item.classList.toggle('checked');
        const box = item.querySelector('.check-box');
        box.textContent = item.classList.contains('checked') ? '✓' : '';
    });
}

function getCheckedOptionals() {
    return Array.from(document.querySelectorAll('.opt-check.checked')).map(el => el.querySelector('span').textContent);
}

// Navegação
const pageTitles = {
    dashboard: ['Dashboard', 'Visão geral do estoque'],
    cadastro:  ['Cadastrar Veículo', 'Preencha os dados do novo veículo'],
    estoque:   ['Estoque', 'Gerencie todos os veículos cadastrados']
};

function showPage(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const pageEl = $('page-' + page);
    if (pageEl) pageEl.classList.add('active');
    const navEl = document.querySelector(`.nav-item[data-page="${page}"]`);
    if (navEl) navEl.classList.add('active');
    if (pageTitles[page]) {
        $('page-title').textContent = pageTitles[page][0];
        $('page-sub').textContent = pageTitles[page][1];
    }
    if (page === 'estoque') renderEstoque();
}

// Dashboard
function renderDashboard() {
    const total = vehicles.length;
    const ativos = vehicles.filter(v => v.status === 'ativo').length;
    const valorTotal = vehicles.reduce((acc, v) => {
        const num = parseFloat((v.preco || '0').replace(/\./g, '').replace(',', '.'));
        return acc + (isNaN(num) ? 0 : num);
    }, 0);
    const media = total ? (valorTotal / total) : 0;

    $('stat-total').textContent = total;
    $('stat-ativos').textContent = ativos;
    $('stat-valor').textContent = `R$ ${Math.round(valorTotal / 1000)}k`;
    $('stat-media').textContent = `Média R$ ${Math.round(media / 1000)}k`;

    const dashboardList = $('dashboard-list');
    dashboardList.innerHTML = vehicles.slice().reverse().slice(0, 4).map(v => `
        <div class="stock-row">
            <div class="s-car-icon">🚗</div>
            <div class="s-car-info">
                <div class="s-car-name">${v.marca} ${v.modelo}</div>
                <div class="s-car-sub">${v.versao || ''} · ${v.anoFab}/${v.anoMod} · ${v.km} km</div>
            </div>
            <div class="s-car-price">R$ ${v.preco}</div>
            <div class="status-badge ${statusClass(v.status)}">${statusLabel(v.status)}</div>
        </div>
    `).join('');
}

function statusClass(s) {
    return s === 'ativo' ? 's-active' : s === 'vendido' ? 's-sold' : 's-pause';
}
function statusLabel(s) {
    return s === 'ativo' ? '✅ Ativo' : s === 'vendido' ? '❌ Vendido' : '⏸ Pausado';
}

// Estoque
function renderEstoque(filter = '') {
    filter = filter.toLowerCase();
    const filtered = vehicles.filter(v =>
        (v.marca + ' ' + v.modelo + ' ' + (v.versao || '')).toLowerCase().includes(filter)
    );

    if (!filtered.length) {
        $('estoque-list').innerHTML = '<div style="text-align:center;padding:40px;color:var(--gray)">Nenhum veículo encontrado</div>';
        return;
    }

    $('estoque-list').innerHTML = filtered.map(v => `
        <div class="stock-row" data-id="${v.id}">
            <div class="s-car-icon">🚗</div>
            <div class="s-car-info" style="flex:2">
                <div class="s-car-name">${v.marca} ${v.modelo} ${v.versao ? '— ' + v.versao : ''}</div>
                <div class="s-car-sub">${v.anoFab}/${v.anoMod} · ${v.km} km · ${v.cambio} · ${v.cor}</div>
            </div>
            <div style="font-size:11px;color:var(--gray);flex:1;min-width:100px">
                ${(v.optionals || []).slice(0, 2).join(', ') || '—'}
            </div>
            <div class="s-car-price">R$ ${v.preco}</div>
            <div class="status-badge ${statusClass(v.status)}">${statusLabel(v.status)}</div>
            <div style="display:flex;gap:6px;flex-shrink:0">
                <button class="action-btn action-toggle" data-toggle="${v.id}">${v.status === 'ativo' ? 'Pausar' : 'Ativar'}</button>
                <button class="action-btn action-edit" data-edit="${v.id}">✏️</button>
                <button class="action-btn action-del" data-del="${v.id}">🗑</button>
            </div>
        </div>
    `).join('');
}

// Upload de fotos
let uploadedPhotos = [];

function handleFiles(files) {
    Array.from(files).forEach(file => {
        if (uploadedPhotos.length >= 12) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            uploadedPhotos.push(e.target.result);
            renderPhotos();
        };
        reader.readAsDataURL(file);
    });
}

function renderPhotos() {
    const preview = $('photos-preview');
    preview.innerHTML = uploadedPhotos.map((src, i) => `
        <div class="photo-thumb">
            <img src="${src}" alt="Foto ${i+1}">
            ${i === 0 ? '<div class="photo-main-badge">PRINCIPAL</div>' : ''}
            <button class="remove-photo" data-rm="${i}">✕</button>
        </div>
    `).join('');

    const cnt = uploadedPhotos.length;
    $('photo-count').innerHTML = cnt > 0
        ? `<span>${cnt}</span> foto${cnt > 1 ? 's' : ''} selecionada${cnt > 1 ? 's' : ''} — máximo 12`
        : '';
}

// Máscara de preço
function maskPrice(input) {
    let v = input.value.replace(/\D/g, '');
    if (v) v = parseInt(v, 10).toLocaleString('pt-BR');
    input.value = v;
}

// Salvar veículo
function saveVehicle() {
    const marca = $('f-marca').value;
    const modelo = $('f-modelo').value.trim();
    const preco = $('f-preco').value.trim();

    if (!marca || !modelo || !preco) {
        showToast('⚠️', 'Campos obrigatórios', 'Preencha Marca, Modelo e Preço');
        return;
    }

    const editingId = $('btn-salvar').dataset.editingId;
    const vehicleData = {
        id: editingId ? parseInt(editingId) : nextId++,
        marca,
        modelo,
        versao: $('f-versao').value || '',
        anoFab: $('f-ano-fab').value || '—',
        anoMod: $('f-ano-mod').value || '—',
        preco,
        km: $('f-km').value || '—',
        cor: $('f-cor').value || '—',
        cambio: $('f-cambio').value,
        combustivel: $('f-comb').value,
        finalPlaca: $('f-placa').value,
        portas: $('f-portas').value,
        fipe: $('f-fipe').value || '',
        status: $('f-status').value,
        optionals: getCheckedOptionals(),
        photos: uploadedPhotos.slice()
    };

    if (editingId) {
        const index = vehicles.findIndex(v => v.id == editingId);
        if (index !== -1) vehicles[index] = vehicleData;
        showToast('✅', 'Veículo atualizado!', `${marca} ${modelo} foi modificado.`);
        delete $('btn-salvar').dataset.editingId;
    } else {
        vehicles.unshift(vehicleData);
        showToast('✅', 'Veículo salvo com sucesso!', `${marca} ${modelo} adicionado ao estoque.`);
    }

    saveVehicles();
    resetForm();
    renderDashboard();
    renderEstoque();
    showPage('estoque');
}

// Editar veículo
function editVehicle(id) {
    const v = vehicles.find(v => v.id === id);
    if (!v) return;

    $('f-marca').value = v.marca;
    $('f-modelo').value = v.modelo;
    $('f-versao').value = v.versao || '';
    $('f-ano-fab').value = v.anoFab;
    $('f-ano-mod').value = v.anoMod;
    $('f-preco').value = v.preco;
    $('f-km').value = v.km;
    $('f-fipe').value = v.fipe || '';
    $('f-cor').value = v.cor;
    $('f-cambio').value = v.cambio;
    $('f-comb').value = v.combustivel;
    $('f-portas').value = v.portas;
    $('f-placa').value = v.finalPlaca || '1';
    $('f-status').value = v.status;

    // Marcar opcionais
    document.querySelectorAll('.opt-check').forEach(el => {
        const optText = el.querySelector('span').textContent;
        if (v.optionals && v.optionals.includes(optText)) {
            el.classList.add('checked');
            el.querySelector('.check-box').textContent = '✓';
        } else {
            el.classList.remove('checked');
            el.querySelector('.check-box').textContent = '';
        }
    });

    uploadedPhotos = v.photos || [];
    renderPhotos();

    $('btn-salvar').dataset.editingId = id;
    showPage('cadastro');
}

// Reset formulário
function resetForm() {
    ['f-marca','f-modelo','f-versao','f-ano-fab','f-ano-mod','f-preco','f-km','f-fipe','f-cor','f-desc'].forEach(id => {
        const el = $(id);
        if (el) el.value = '';
    });
    $('f-marca').value = '';
    $('f-cambio').value = 'Automático';
    $('f-comb').value = 'Flex';
    $('f-portas').value = '4 Portas';
    $('f-placa').value = '1';
    $('f-status').value = 'ativo';

    document.querySelectorAll('.opt-check').forEach(el => {
        el.classList.remove('checked');
        el.querySelector('.check-box').textContent = '';
    });

    uploadedPhotos = [];
    renderPhotos();
    $('file-input').value = '';

    delete $('btn-salvar').dataset.editingId;
}

// Inicialização de eventos
document.addEventListener('DOMContentLoaded', () => {
    loadVehicles();

    // Login
    $('btn-login').addEventListener('click', doLogin);
    $('login-pass').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
    $('btn-logout').addEventListener('click', doLogout);

    // Navegação
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const page = item.dataset.page;
            const action = item.dataset.action;
            if (page) showPage(page);
            else if (action === 'soon') showToast('🚧', 'Em breve', 'Este módulo está em desenvolvimento');
            else if (action === 'site') window.open('index.html', '_blank');
        });
    });

    // Topbar
    $('btn-new-veiculo').addEventListener('click', () => {
        resetForm();
        showPage('cadastro');
    });

    // Upload
    $('btn-upload').addEventListener('click', () => $('file-input').click());
    $('file-input').addEventListener('change', e => handleFiles(e.target.files));
    const zone = $('upload-zone');
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', e => {
        e.preventDefault();
        zone.classList.remove('drag-over');
        handleFiles(e.dataTransfer.files);
    });

    $('photos-preview').addEventListener('click', e => {
        const btn = e.target.closest('.remove-photo');
        if (!btn) return;
        uploadedPhotos.splice(parseInt(btn.dataset.rm, 10), 1);
        renderPhotos();
    });

    // Máscaras
    $('f-preco').addEventListener('input', e => maskPrice(e.target));
    $('f-fipe').addEventListener('input', e => maskPrice(e.target));

    // Salvar e limpar
    $('btn-salvar').addEventListener('click', saveVehicle);
    $('btn-limpar').addEventListener('click', resetForm);

    // Busca estoque
    $('search-estoque').addEventListener('input', e => renderEstoque(e.target.value));

    // Ações na lista de estoque (delegação)
    $('estoque-list').addEventListener('click', e => {
        const toggleBtn = e.target.closest('[data-toggle]');
        const editBtn = e.target.closest('[data-edit]');
        const delBtn = e.target.closest('[data-del]');

        if (toggleBtn) {
            const id = parseInt(toggleBtn.dataset.toggle);
            const v = vehicles.find(x => x.id === id);
            if (v) {
                v.status = v.status === 'ativo' ? 'pause' : 'ativo';
                saveVehicles();
                renderEstoque($('search-estoque').value);
                renderDashboard();
                showToast('✅', 'Status atualizado!', `${v.marca} ${v.modelo} agora está ${v.status === 'ativo' ? 'ativo' : 'pausado'}.`);
            }
        }

        if (editBtn) {
            const id = parseInt(editBtn.dataset.edit);
            editVehicle(id);
        }

        if (delBtn) {
            const id = parseInt(delBtn.dataset.del);
            const v = vehicles.find(x => x.id === id);
            if (v && confirm(`Remover ${v.marca} ${v.modelo} do estoque?`)) {
                vehicles = vehicles.filter(x => x.id !== id);
                saveVehicles();
                renderEstoque($('search-estoque').value);
                renderDashboard();
                showToast('🗑️', 'Veículo removido', 'Removido do estoque com sucesso.');
            }
        }
    });
});