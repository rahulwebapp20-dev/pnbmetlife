// js/admin.js

// Initialize Supabase Client (if keys are set)
const supabaseLib = window.supabase;
let supabase = null;
let useLocalFallback = true;

if (typeof SUPABASE_URL !== 'undefined' && typeof SUPABASE_ANON_KEY !== 'undefined' && 
    SUPABASE_URL !== "https://your-project-id.supabase.co" && SUPABASE_ANON_KEY !== "your-anon-key") {
    try {
        supabase = supabaseLib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        useLocalFallback = false;
        console.log("Supabase Client initialized in Admin Panel.");
    } catch (e) {
        console.warn("Failed to initialize Supabase. Falling back to local data.", e);
    }
}

// Initial Mock Datasets (for seeding localStorage if empty)
const defaultPolicies = [
    {
        policy_number: "PNB45896231",
        holder_name: "Rahul Kumar",
        dob: "1998-05-15",
        mobile: "9876543210",
        email: "rahul@email.com",
        policy_type: "Life Insurance",
        sum_assured: 1000000,
        nominee_name: "Sunita Devi",
        start_date: "2020-08-25",
        end_date: "2040-08-25",
        premium_amount: 24500,
        due_date: "2026-08-25",
        status: "Active"
    }
];

const defaultUpi = {
    upi_id: "pay@insurecorp",
    account_holder_name: "InsureCorp Ltd"
};

const defaultSubmissions = [
    {
        id: "mock-sub-1",
        reference_number: "REF493820",
        policy_number: "PNB45896231",
        amount_paid: 24500,
        screenshot_url: "assets/hero-image.jpg",
        txn_id: "348920193829",
        status: "Pending Verification",
        created_at: new Date().toISOString()
    }
];

// Seed localStorage if empty (Offline Mock Mode sync setup)
const seedLocalStorage = () => {
    if (!localStorage.getItem('insurecorp_policies')) {
        localStorage.setItem('insurecorp_policies', JSON.stringify(defaultPolicies));
    }
    if (!localStorage.getItem('insurecorp_upi')) {
        localStorage.setItem('insurecorp_upi', JSON.stringify(defaultUpi));
    }
    if (!localStorage.getItem('insurecorp_submissions')) {
        localStorage.setItem('insurecorp_submissions', JSON.stringify(defaultSubmissions));
    }
};

// LocalStorage Helper Getters / Setters
const getLocalPolicies = () => JSON.parse(localStorage.getItem('insurecorp_policies')) || [];
const setLocalPolicies = (policies) => localStorage.setItem('insurecorp_policies', JSON.stringify(policies));

const getLocalUpi = () => JSON.parse(localStorage.getItem('insurecorp_upi')) || defaultUpi;
const setLocalUpi = (upi) => localStorage.setItem('insurecorp_upi', JSON.stringify(upi));

const getLocalSubmissions = () => JSON.parse(localStorage.getItem('insurecorp_submissions')) || [];
const setLocalSubmissions = (submissions) => localStorage.setItem('insurecorp_submissions', JSON.stringify(submissions));

// Helper functions for modals
window.openModal = function(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.style.display = 'flex';
};

window.closeModal = function(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.style.display = 'none';
};

document.addEventListener('DOMContentLoaded', () => {
    // Seed offline data
    seedLocalStorage();

    // Authentication Guard disabled as requested by the user. Accessing dashboard directly.

    // Connection indicator
    const connectionBadge = document.getElementById('dbConnectionBadge');
    if (connectionBadge) {
        if (useLocalFallback) {
            connectionBadge.innerText = "Offline Mode (Local Sync)";
            connectionBadge.style.backgroundColor = "var(--warning-light)";
            connectionBadge.style.color = "var(--warning)";
        } else {
            connectionBadge.innerText = "Supabase Connected";
            connectionBadge.style.backgroundColor = "var(--success-light)";
            connectionBadge.style.color = "var(--success)";
        }
    }

    // Sidebar navigation tabs switching
    const menuItems = {
        menuSubmissions: { panel: 'panelSubmissions', title: 'Payment Audit Panel', subtitle: 'Review and verify user premium payment uploads' },
        menuPolicies: { panel: 'panelPolicies', title: 'Policy Record Manager', subtitle: 'Add, view, or modify customer policy portfolios' },
        menuUpi: { panel: 'panelUpi', title: 'UPI Billing Config', subtitle: 'Update corporate payment details' }
    };

    Object.keys(menuItems).forEach(menuId => {
        const item = document.getElementById(menuId);
        if (item) {
            item.addEventListener('click', () => {
                document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
                document.querySelectorAll('.admin-panel').forEach(el => el.classList.remove('active'));
                
                item.classList.add('active');
                document.getElementById(menuItems[menuId].panel).classList.add('active');
                
                document.getElementById('dashboardTitle').innerText = menuItems[menuId].title;
                document.getElementById('dashboardSubtitle').innerText = menuItems[menuId].subtitle;
            });
        }
    });

    // Format helpers
    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    };

    // Load Data triggers
    const refreshData = () => {
        loadStats();
        loadSubmissions();
        loadPolicies();
        loadUpiConfig();
    };

    // Stats calculations
    const loadStats = () => {
        if (useLocalFallback) {
            const policies = getLocalPolicies();
            const submissions = getLocalSubmissions();
            
            document.getElementById('statTotalPolicies').innerText = policies.length;
            const pendingCount = submissions.filter(s => s.status === 'Pending Verification').length;
            document.getElementById('statPendingAudits').innerText = pendingCount;
            
            const collection = submissions
                .filter(s => s.status === 'Approved')
                .reduce((acc, curr) => acc + parseFloat(curr.amount_paid || 0), 0);
            document.getElementById('statApprovedCollections').innerText = formatCurrency(collection);
        } else {
            fetchStatsDb();
        }
    };

    const fetchStatsDb = async () => {
        try {
            const { count: policyCount } = await supabase.from('policies').select('*', { count: 'exact', head: true });
            document.getElementById('statTotalPolicies').innerText = policyCount || 0;

            const { count: pendingCount } = await supabase.from('submissions').select('*', { count: 'exact', head: true }).eq('status', 'Pending Verification');
            document.getElementById('statPendingAudits').innerText = pendingCount || 0;

            const { data } = await supabase.from('submissions').select('amount_paid').eq('status', 'Approved');
            const totalCollected = data ? data.reduce((acc, c) => acc + parseFloat(c.amount_paid), 0) : 0;
            document.getElementById('statApprovedCollections').innerText = formatCurrency(totalCollected);
        } catch (e) {
            console.error("Stats fetching error: ", e);
        }
    };

    // PANEL 1: Audit submissions
    const loadSubmissions = async () => {
        const tableBody = document.getElementById('submissionsTableBody');
        if (!tableBody) return;
        tableBody.innerHTML = '';

        try {
            let submissionsList = [];
            if (useLocalFallback) {
                submissionsList = getLocalSubmissions();
            } else {
                const { data, error } = await supabase
                    .from('submissions')
                    .select('*')
                    .order('created_at', { ascending: false });
                if (error) throw error;
                submissionsList = data;
            }

            if (submissionsList.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-light); padding: 40px;">No payment submissions registered yet.</td></tr>`;
                return;
            }

            // Sort mock submissions by date descending
            if (useLocalFallback) {
                submissionsList.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            }

            submissionsList.forEach(sub => {
                const tr = document.createElement('tr');
                
                let badgeClass = 'pending';
                if (sub.status === 'Approved') badgeClass = 'approved';
                if (sub.status === 'Rejected') badgeClass = 'rejected';

                const actionsHtml = sub.status === 'Pending Verification' ? `
                    <div class="action-btn-group">
                        <button class="btn btn-success btn-sm" onclick="auditSubmission('${sub.id}', 'Approved')">Approve</button>
                        <button class="btn btn-outline btn-sm" style="color: var(--danger); border-color: var(--danger);" onclick="auditSubmission('${sub.id}', 'Rejected')">Reject</button>
                    </div>
                ` : `<span style="font-size: 0.85rem; color: var(--text-light); font-weight:700;">No actions</span>`;

                tr.innerHTML = `
                    <td style="font-weight:700;">${sub.reference_number}</td>
                    <td>${sub.policy_number}</td>
                    <td style="font-weight:700;">${formatCurrency(sub.amount_paid)}</td>
                    <td style="font-family: monospace;">${sub.txn_id || 'N/A'}</td>
                    <td>
                        <button class="btn btn-outline btn-sm" onclick="viewScreenshot('${sub.screenshot_url}')">
                            <i class="fa-solid fa-image"></i> View Screenshot
                        </button>
                    </td>
                    <td>${formatDate(sub.created_at)}</td>
                    <td><span class="badge-status ${badgeClass}">${sub.status}</span></td>
                    <td>${actionsHtml}</td>
                `;
                tableBody.appendChild(tr);
            });

        } catch (err) {
            console.error("Submissions load error:", err);
            tableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--danger); padding: 40px;">Failed to load submissions: ${err.message}</td></tr>`;
        }
    };

    window.viewScreenshot = function(url) {
        const modalImg = document.getElementById('screenshotModalImage');
        if (modalImg) {
            modalImg.src = url;
            openModal('screenshotModal');
        }
    };

    window.auditSubmission = async function(id, newStatus) {
        try {
            if (useLocalFallback) {
                const submissions = getLocalSubmissions();
                const subIdx = submissions.findIndex(s => s.id === id);
                if (subIdx !== -1) {
                    submissions[subIdx].status = newStatus;
                    setLocalSubmissions(submissions);
                }
            } else {
                const { error } = await supabase
                    .from('submissions')
                    .update({ status: newStatus })
                    .eq('id', id);
                if (error) throw error;
            }

            alert(`Submission marked as ${newStatus} successfully.`);
            refreshData();

        } catch (err) {
            console.error("Audit error:", err);
            alert("Audit failed: " + err.message);
        }
    };

    // PANEL 2: Policy Manager
    const loadPolicies = async () => {
        const tableBody = document.getElementById('policiesTableBody');
        if (!tableBody) return;
        tableBody.innerHTML = '';

        try {
            let policiesList = [];
            if (useLocalFallback) {
                policiesList = getLocalPolicies();
            } else {
                const { data, error } = await supabase.from('policies').select('*').order('policy_number', { ascending: true });
                if (error) throw error;
                policiesList = data;
            }

            if (policiesList.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-light); padding: 40px;">No policies created.</td></tr>`;
                return;
            }

            policiesList.forEach(policy => {
                const tr = document.createElement('tr');
                const pNo = policy.policy_number;
                
                tr.innerHTML = `
                    <td style="font-weight:700;">${pNo}</td>
                    <td>${policy.holder_name}<br><span style="font-size:0.75rem; color:var(--text-light);">${policy.email}</span></td>
                    <td style="font-weight:700;">${formatCurrency(policy.premium_amount)}</td>
                    <td>${formatDate(policy.due_date)}</td>
                    <td><span class="badge-status ${policy.status === 'Active' ? 'approved' : 'rejected'}">${policy.status}</span></td>
                    <td>
                        <button class="btn btn-outline btn-sm" onclick="editPolicyClick('${pNo}')">
                            <i class="fa-solid fa-pen-to-square"></i> Edit
                        </button>
                    </td>
                `;
                tableBody.appendChild(tr);
            });

        } catch (err) {
            console.error("Policies loading error:", err);
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--danger); padding: 40px;">Failed to load policies: ${err.message}</td></tr>`;
        }
    };

    // Policy Create Submit
    const createPolicyForm = document.getElementById('createPolicyForm');
    if (createPolicyForm) {
        createPolicyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const newPolicy = {
                policy_number: document.getElementById('policyNumberInput').value.trim().toUpperCase(),
                holder_name: document.getElementById('holderNameInput').value.trim(),
                dob: document.getElementById('dobInput').value,
                mobile: document.getElementById('mobileInput').value.trim(),
                email: document.getElementById('emailInput').value.trim(),
                policy_type: document.getElementById('typeInput').value.trim(),
                nominee_name: document.getElementById('nomineeInput').value.trim(),
                sum_assured: parseFloat(document.getElementById('sumAssuredInput').value),
                premium_amount: parseFloat(document.getElementById('premiumAmountInput').value),
                start_date: document.getElementById('startDateInput').value,
                end_date: document.getElementById('endDateInput').value,
                due_date: document.getElementById('dueDateInput').value,
                status: document.getElementById('statusSelect').value
            };

            try {
                if (useLocalFallback) {
                    const policies = getLocalPolicies();
                    const exists = policies.some(p => p.policy_number === newPolicy.policy_number);
                    if (exists) throw new Error("Policy number already exists locally.");
                    policies.push(newPolicy);
                    setLocalPolicies(policies);
                } else {
                    const { error } = await supabase
                        .from('policies')
                        .insert(newPolicy);
                    if (error) throw error;
                }

                alert("Policy created successfully.");
                createPolicyForm.reset();
                refreshData();

            } catch (err) {
                console.error("Policy creation error:", err);
                alert("Failed to create policy: " + err.message);
            }
        });
    }

    // Policy Edit Click Handler
    window.editPolicyClick = async function(policyNo) {
        try {
            let policy = null;
            if (useLocalFallback) {
                const policies = getLocalPolicies();
                policy = policies.find(p => p.policy_number === policyNo);
            } else {
                const { data, error } = await supabase
                    .from('policies')
                    .select('*')
                    .eq('policy_number', policyNo)
                    .single();
                if (error) throw error;
                policy = data;
            }

            if (!policy) return;

            document.getElementById('editPolicyNo').value = policy.policy_number;
            document.getElementById('editHolder').value = policy.holder_name;
            document.getElementById('editDob').value = policy.dob;
            document.getElementById('editMobile').value = policy.mobile;
            document.getElementById('editEmail').value = policy.email;
            document.getElementById('editType').value = policy.policy_type;
            document.getElementById('editNominee').value = policy.nominee_name;
            document.getElementById('editSumAssured').value = policy.sum_assured;
            document.getElementById('editPremiumAmount').value = policy.premium_amount;
            document.getElementById('editStartDate').value = policy.start_date;
            document.getElementById('editEndDate').value = policy.end_date;
            document.getElementById('editDueDate').value = policy.due_date;
            document.getElementById('editStatus').value = policy.status;

            openModal('editPolicyModal');

        } catch (err) {
            console.error("Fetch policy for edit error:", err);
            alert("Failed to load policy details: " + err.message);
        }
    };

    // Policy Edit Modal Submit
    const editPolicyForm = document.getElementById('editPolicyForm');
    if (editPolicyForm) {
        editPolicyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const policyNo = document.getElementById('editPolicyNo').value;
            const updatedData = {
                holder_name: document.getElementById('editHolder').value.trim(),
                dob: document.getElementById('editDob').value,
                mobile: document.getElementById('editMobile').value.trim(),
                email: document.getElementById('editEmail').value.trim(),
                policy_type: document.getElementById('editType').value.trim(),
                nominee_name: document.getElementById('editNominee').value.trim(),
                sum_assured: parseFloat(document.getElementById('editSumAssured').value),
                premium_amount: parseFloat(document.getElementById('editPremiumAmount').value),
                start_date: document.getElementById('editStartDate').value,
                end_date: document.getElementById('editEndDate').value,
                due_date: document.getElementById('editDueDate').value,
                status: document.getElementById('editStatus').value
            };

            try {
                if (useLocalFallback) {
                    const policies = getLocalPolicies();
                    const idx = policies.findIndex(p => p.policy_number === policyNo);
                    if (idx !== -1) {
                        policies[idx] = { ...policies[idx], ...updatedData, policy_number: policyNo };
                        setLocalPolicies(policies);
                    }
                } else {
                    const { error } = await supabase
                        .from('policies')
                        .update(updatedData)
                        .eq('policy_number', policyNo);
                    if (error) throw error;
                }

                alert("Policy record updated successfully.");
                closeModal('editPolicyModal');
                refreshData();

            } catch (err) {
                console.error("Policy update error:", err);
                alert("Failed to update policy: " + err.message);
            }
        });
    }

    // PANEL 3: UPI settings Config
    const loadUpiConfig = async () => {
        try {
            let activeUpi = null;
            if (useLocalFallback) {
                activeUpi = getLocalUpi();
            } else {
                const { data, error } = await supabase
                    .from('upi_settings')
                    .select('*')
                    .eq('id', 1)
                    .single();
                if (error) throw error;
                activeUpi = data;
            }

            document.getElementById('upiIdInput').value = activeUpi.upi_id;
            document.getElementById('upiHolderInput').value = activeUpi.account_holder_name;

        } catch (err) {
            console.error("UPI config load error:", err);
        }
    };

    const upiConfigForm = document.getElementById('upiConfigForm');
    if (upiConfigForm) {
        upiConfigForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const newUpiId = document.getElementById('upiIdInput').value.trim();
            const newUpiHolder = document.getElementById('upiHolderInput').value.trim();

            try {
                if (useLocalFallback) {
                    const upi = { upi_id: newUpiId, account_holder_name: newUpiHolder };
                    setLocalUpi(upi);
                } else {
                    const { error } = await supabase
                        .from('upi_settings')
                        .upsert({
                            id: 1,
                            upi_id: newUpiId,
                            account_holder_name: newUpiHolder
                        });
                    if (error) throw error;
                }

                alert("UPI parameters updated successfully.");
                refreshData();

            } catch (err) {
                console.error("UPI configuration save error:", err);
                alert("Failed to update UPI settings: " + err.message);
            }
        });
    }

    // Initial load of dashboard data directly
    refreshData();

    // Supabase Real-Time Subscriptions
    if (!useLocalFallback && supabase) {
        console.log("Subscribing to realtime postgres changes...");
        supabase
            .channel('schema-db-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'submissions' },
                (payload) => {
                    console.log("Realtime submissions change detected:", payload);
                    refreshData();
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'policies' },
                (payload) => {
                    console.log("Realtime policies change detected:", payload);
                    refreshData();
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'upi_settings' },
                (payload) => {
                    console.log("Realtime upi_settings change detected:", payload);
                    refreshData();
                }
            )
            .subscribe();
    }
});
