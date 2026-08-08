(function() {
    'use strict';

    function initScript() {
        // 1. Logika Limit 200 yang Lebih Aman
        const url = new URL(window.location.href);
        if (url.searchParams.get('limit') !== '200') {
            const limitSelect = document.querySelector('select[name="limit"]');
            if (limitSelect && limitSelect.value !== '200') {
                limitSelect.value = '200';
                limitSelect.form.submit();
                return;
            }
        }

        // Helper: Format angka ke Rupiah
        const formatRp = (angka) => {
            return new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                minimumFractionDigits: 0
            }).format(angka);
        };

        // Helper: Ekstrak data dari document
        const extractData = (doc) => {
            let extracted = [];
            const checkboxes = doc.querySelectorAll('.withdraw-checkbox');

            checkboxes.forEach(cb => {
                // Status 101: "Menunggu Konfirmasi"
                if (cb.getAttribute('data-status') === '101') {
                    const tr = cb.closest('tr');
                    const copyIcon = tr.querySelector('.copy-data i');

                    if (copyIcon) {
                        const bank = copyIcon.getAttribute('data-member-bank') || 'LAINNYA';
                        const amount = parseFloat(copyIcon.getAttribute('data-amount') || 0);

                        extracted.push({
                            bank: bank.toUpperCase(),
                            amount: amount
                        });
                    }
                }
            });
            return extracted;
        };

        // Helper: Mendapatkan warna sesuai brand Bank/E-Wallet
        const getBankStyle = (bankName) => {
            const name = bankName.toUpperCase();
            if (name.includes('BCA')) return 'background: linear-gradient(135deg, #0056A6, #003366); color: white;';
            if (name.includes('DANA')) return 'background: linear-gradient(135deg, #118EEA, #0a66ab); color: white;';
            if (name.includes('SEABANK')) return 'background: linear-gradient(135deg, #FF7E00, #cc6500); color: white;';
            if (name.includes('BRI')) return 'background: linear-gradient(135deg, #00529C, #00305b); color: white;';
            if (name.includes('BNI')) return 'background: linear-gradient(135deg, #F15A23, #c14619); color: white;';
            if (name.includes('MANDIRI')) return 'background: linear-gradient(135deg, #FFB71B, #d69a00); color: white;'; 
            if (name.includes('OVO')) return 'background: linear-gradient(135deg, #4C3494, #312163); color: white;';
            if (name.includes('GOPAY')) return 'background: linear-gradient(135deg, #00B14F, #00873c); color: white;';
            if (name.includes('QRIS')) return 'background: linear-gradient(135deg, #ED1C24, #b9151c); color: white;';
            if (name.includes('JAGO')) return 'background: linear-gradient(135deg, #F57C00, #c86400); color: white;';
            if (name.includes('OCBC')) return 'background: linear-gradient(135deg, #E31837, #a91228); color: white;';
            
            // Default style untuk bank lainnya
            return 'background: linear-gradient(135deg, #6c757d, #495057); color: white;';
        };

        // Inject CSS kecil untuk animasi
        const style = document.createElement('style');
        style.innerHTML = `
            @keyframes gemini-spin { 100% { transform: rotate(360deg); } }
            .gemini-spinning { animation: gemini-spin 1s linear infinite; display: inline-block; }
            .bank-card-hover { transition: transform 0.2s ease, box-shadow 0.2s ease; border-radius: 8px; }
            .bank-card-hover:hover { transform: translateY(-3px); box-shadow: 0 6px 12px rgba(0,0,0,0.15) !important; }
            .total-banner { background: linear-gradient(135deg, #198754, #146c43); border-radius: 8px; color: white; }
            
            /* Animasi Berdenyut untuk Ikon */
            @keyframes pulse-icon { 
                0% { transform: scale(1); } 
                50% { transform: scale(1.15); } 
                100% { transform: scale(1); } 
            }
            .icon-animated { animation: pulse-icon 1.5s infinite ease-in-out; display: inline-block; }
        `;
        document.head.appendChild(style);

        // 2. Buat kerangka Panel Summary (Jika belum ada)
        let summaryPanel = document.getElementById('gemini-sapatoto-panel');
        if (!summaryPanel) {
            summaryPanel = document.createElement('div');
            summaryPanel.id = 'gemini-sapatoto-panel';
            summaryPanel.className = 'card mb-4 border-0 shadow-sm';

            summaryPanel.innerHTML = `
                <div class="card-header bg-dark text-white d-flex justify-content-between align-items-center border-0">
                    <div class="d-flex align-items-center">
                        <svg class="svg-inline--fa fa-calculator fa-fw me-2 text-warning" aria-hidden="true" focusable="false" data-prefix="fas" data-icon="calculator" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" width="16" height="16"><path fill="currentColor" d="M400 0H48C21.49 0 0 21.49 0 48v416c0 26.51 21.49 48 48 48h352c26.51 0 48-21.49 48-48V48C448 21.49 426.51 0 400 0zM128 432H64v-64h64V432zM128 304H64v-64h64V304zM224 432h-64v-64h64V432zM224 304h-64v-64h64V304zM320 432h-64v-64h64V432zM320 304h-64v-64h64V304zM384 432h-64v-192h64V432zM384 192H64V80h320V192z"></path></svg>
                        <h5 class="mb-0 fw-bold">Estimasi Withdraw <span class="badge bg-warning text-dark ms-2">Menunggu Konfirmasi</span></h5>
                    </div>
                    <button id="btn-refresh-wd" class="btn btn-sm btn-outline-light fw-bold" style="padding: 2px 10px;">
                        <i class="bi bi-arrow-clockwise me-1" id="icon-refresh-wd"></i> <span id="text-refresh-wd">Refresh</span>
                    </button>
                </div>
                <div class="card-body bg-light rounded-bottom" id="gemini-wd-body">
                    <div class="text-center py-4 text-muted">
                        <i class="bi bi-hourglass-split gemini-spinning fs-4 mb-2"></i><br>
                        Mengkalkulasi data...
                    </div>
                </div>
            `;

            const filterCard = document.querySelector('.card.mb-3.bg-light');
            const tableContainer = document.querySelector('.table-responsive');
            
            if (filterCard && filterCard.parentNode) {
                filterCard.parentNode.insertBefore(summaryPanel, filterCard);
            } else if (tableContainer && tableContainer.parentNode) {
                tableContainer.parentNode.insertBefore(summaryPanel, tableContainer);
            }
        }

        // Fungsi Utama untuk menghitung
        const calculateData = async () => {
            const bodyContainer = document.getElementById('gemini-wd-body');
            const btnRefresh = document.getElementById('btn-refresh-wd');
            const iconRefresh = document.getElementById('icon-refresh-wd');
            const textRefresh = document.getElementById('text-refresh-wd');

            if (btnRefresh) {
                btnRefresh.disabled = true;
                iconRefresh.classList.add('gemini-spinning');
                textRefresh.innerText = 'Menghitung...';
            }

            let allWithdrawals = extractData(document);

            const paginationLinks = document.querySelectorAll('.pagination a.page-link');
            let urlsToFetch = new Set();

            paginationLinks.forEach(link => {
                const href = link.getAttribute('href');
                if (href && href !== '#' && !href.includes(`page=${url.searchParams.get('page') || 1}`)) {
                    urlsToFetch.add(href);
                }
            });

            if (urlsToFetch.size > 0) {
                const fetchPromises = Array.from(urlsToFetch).map(async (fetchUrl) => {
                    try {
                        const response = await fetch(fetchUrl);
                        const html = await response.text();
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(html, 'text/html');
                        return extractData(doc);
                    } catch (error) {
                        return [];
                    }
                });

                const results = await Promise.all(fetchPromises);
                results.forEach(pageData => {
                    allWithdrawals = allWithdrawals.concat(pageData);
                });
            }

            let grandTotalCount = allWithdrawals.length;
            let grandTotalAmount = 0;
            let summaryByBank = {};

            allWithdrawals.forEach(wd => {
                grandTotalAmount += wd.amount;
                if (!summaryByBank[wd.bank]) {
                    summaryByBank[wd.bank] = { count: 0, amount: 0 };
                }
                summaryByBank[wd.bank].count++;
                summaryByBank[wd.bank].amount += wd.amount;
            });

            // PERUBAHAN UI DI SINI: Ikon Bootstrap beranimasi & Teks warna Emas
            let html = `
                <div class="total-banner p-3 mb-4 shadow-sm d-flex justify-content-between align-items-center">
                    <h5 class="mb-0 fw-bold d-flex align-items-center" style="opacity: 0.95;">
                        <i class="bi bi-wallet-fill me-3 text-warning icon-animated" style="font-size: 1.5rem;"></i>
                        TOTAL KESELURUHAN (${grandTotalCount} REQUEST)
                    </h5>
                    <h3 class="mb-0 fw-bolder text-warning" style="text-shadow: 1px 1px 2px rgba(0,0,0,0.3);">${formatRp(grandTotalAmount)}</h3>
                </div>
                <div class="row g-3">
            `;

            if (grandTotalCount === 0) {
                html += `<div class="col-12 text-muted fst-italic text-center py-3">Tidak ada request withdraw yang menunggu konfirmasi.</div>`;
            } else {
                for (const [bank, stat] of Object.entries(summaryByBank)) {
                    const inlineStyle = getBankStyle(bank);
                    html += `
                        <div class="col-6 col-md-4 col-lg-3">
                            <div class="card h-100 shadow-sm border-0 bank-card-hover" style="${inlineStyle}">
                                <div class="card-body p-3">
                                    <div class="small text-uppercase mb-1 fw-bold" style="opacity: 0.85;">
                                        ${bank} (${stat.count})
                                    </div>
                                    <div class="fw-bold fs-5">
                                        ${formatRp(stat.amount)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                }
            }

            html += `</div>`;
            bodyContainer.innerHTML = html;

            if (btnRefresh) {
                btnRefresh.disabled = false;
                iconRefresh.classList.remove('gemini-spinning');
                textRefresh.innerText = 'Refresh';
            }
        };

        calculateData();
        
        const btnRefresh = document.getElementById('btn-refresh-wd');
        if (btnRefresh) {
            btnRefresh.addEventListener('click', calculateData);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initScript);
    } else {
        initScript();
    }

})();
