let map;
let markers = [];
let allCompanies = [];

// Initialize map
function initMap() {
    // Center to Seoul
    map = L.map('map', {
        zoomControl: false
    }).setView([37.5665, 126.9780], 12);

    L.control.zoom({
        position: 'bottomright'
    }).addTo(map);

    // Bright theme map tiles (CartoDB Positron)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);

    // 지하철 노선 및 역명 오버레이 (OpenRailwayMap)
    L.tileLayer('https://{s}.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openrailwaymap.org/">OpenRailwayMap</a>',
        maxZoom: 19,
        opacity: 0.65 // 기존 지도와 자연스럽게 겹치도록 투명도 설정
    }).addTo(map);
}

// Custom icon
const createIcon = (isActive = false) => {
    return L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="
            background-color: ${isActive ? '#818CF8' : '#4F46E5'};
            width: 20px;
            height: 20px;
            border-radius: 50%;
            border: 3px solid #fff;
            box-shadow: 0 0 10px rgba(79, 70, 229, 0.6);
            transition: all 0.3s ease;
            transform: ${isActive ? 'scale(1.2)' : 'scale(1)'};
        "></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });
};

// Load data
function loadData() {
    try {
        // companyData is loaded from data.js
        allCompanies = companyData;
        renderCompanies(allCompanies);
    } catch (error) {
        console.error('Error loading data:', error);
        document.getElementById('companyList').innerHTML = 
            '<div class="empty-state">데이터를 불러오는데 실패했습니다.</div>';
    }
}

// Render companies list and markers
function renderCompanies(companies) {
    const listContainer = document.getElementById('companyList');
    listContainer.innerHTML = '';
    
    // Clear existing markers
    markers.forEach(m => map.removeLayer(m));
    markers = [];
    
    document.getElementById('totalCount').textContent = companies.length;
    
    if (companies.length === 0) {
        listContainer.innerHTML = '<div class="empty-state">검색 결과가 없습니다.</div>';
        return;
    }

    const bounds = L.latLngBounds();

    companies.forEach((company, index) => {
        // Create List Item
        const card = document.createElement('div');
        card.className = 'company-card';
        card.innerHTML = `
            <h3>${company.name}</h3>
            <p>${company.address || '주소 정보 없음'}</p>
            ${company.url ? `<a href="${company.url}" target="_blank">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                홈페이지 방문
            </a>` : ''}
        `;
        listContainer.appendChild(card);

        // Create Marker if coordinates exist
        if (company.lat && company.lng) {
            const marker = L.marker([company.lat, company.lng], {
                icon: createIcon()
            }).addTo(map);

            const popupContent = `
                <div class="popup-content">
                    <h3>${company.name}</h3>
                    <p>${company.address}</p>
                </div>
            `;
            marker.bindPopup(popupContent);
            
            bounds.extend([company.lat, company.lng]);
            markers.push(marker);

            // Interaction: List hover/click -> Map marker highlight
            card.addEventListener('mouseenter', () => {
                marker.setIcon(createIcon(true));
            });
            card.addEventListener('mouseleave', () => {
                marker.setIcon(createIcon(false));
            });
            card.addEventListener('click', () => {
                map.flyTo([company.lat, company.lng], 15);
                marker.openPopup();
                
                // Highlight card
                document.querySelectorAll('.company-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');
            });

            // Interaction: Map marker click -> List item highlight & scroll
            marker.on('click', () => {
                document.querySelectorAll('.company-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            });
        }
    });

    // Fit map bounds to show all markers smoothly
    if (markers.length > 0) {
        setTimeout(() => {
            map.invalidateSize();
            // 전체 회원을 다 보여줄 때는 전 세계(두바이 등)로 너무 축소되지 않도록 서울 중심으로 고정
            if (companies.length === allCompanies.length) {
                map.flyTo([37.5115, 127.0286], 11, { duration: 1.2 }); // 서울 강남권 중심
            } else {
                map.flyToBounds(bounds, { 
                    padding: [50, 50], 
                    maxZoom: 14, 
                    duration: 1.2 
                });
            }
        }, 100);
    } else {
        // Reset to Seoul if no results
        map.flyTo([37.5115, 127.0286], 11);
    }
}

// Search functionality
function handleSearch() {
    const query = document.getElementById('searchInput').value.trim();
    if (!query) {
        renderCompanies(allCompanies);
        return;
    }
    
    // Exact or partial match on address (specifically for "구")
    const filtered = allCompanies.filter(company => {
        if (!company.address) return false;
        return company.address.includes(query) || company.name.includes(query);
    });
    
    renderCompanies(filtered);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    loadData();
    
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    
    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });
    
    // Live search (optional)
    searchInput.addEventListener('input', () => {
        handleSearch();
    });
});
