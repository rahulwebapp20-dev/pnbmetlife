// js/script.js

// Initialize Supabase Client (if keys are set)
const supabaseLib = window.supabase;
let supabase = null;
let useLocalFallback = true;

if (typeof SUPABASE_URL !== 'undefined' && typeof SUPABASE_ANON_KEY !== 'undefined' && 
    SUPABASE_URL !== "https://your-project-id.supabase.co" && SUPABASE_ANON_KEY !== "your-anon-key") {
    try {
        supabase = supabaseLib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        useLocalFallback = false;
        console.log("Supabase client initialized successfully.");
    } catch (e) {
        console.warn("Failed to initialize Supabase. Falling back to local mock data.", e);
    }
} else {
    console.warn("Supabase credentials not configured in js/config.js. Running in Mock Mode.");
}

// Local Fallback Data (for testing when Supabase keys are not set)
const localFallbackPolicy = {
    policyNumber: "PNB45896231",
    holderName: "Rahul Kumar",
    dob: "1998-05-15",
    gender: "Male",
    mobile: "9876543210",
    email: "rahul@email.com",
    policyType: "Life Insurance",
    sumAssured: 1000000,
    nomineeName: "Sunita Devi",
    startDate: "2020-08-25",
    endDate: "2040-08-25",
    premiumAmount: 24500,
    dueDate: "2026-08-25",
    status: "Active"
};

const localFallbackUpi = {
    upi_id: "pay@insurecorp",
    account_holder_name: "InsureCorp Ltd"
};

// Global State
let activePolicy = null;
let activeUpi = null;
let loadedFile = null;
let globalRefId = '';

document.addEventListener('DOMContentLoaded', () => {
    
    // Ripple Effect for buttons
    const buttons = document.querySelectorAll('.ripple-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            const rect = this.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const ripple = document.createElement('span');
            ripple.classList.add('ripple');
            ripple.style.left = `${x}px`;
            ripple.style.top = `${y}px`;
            
            this.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });

    // Step Navigation Logic
    let currentStep = 1;
    const totalSteps = 4;
    
    // Step 1 Elements
    const policyInput = document.getElementById('policyNumber');
    const verifyBtn = document.getElementById('verifyBtn');
    const policyError = document.getElementById('policyError');
    
    // Step 2 Elements
    const backToStep1Btn = document.getElementById('backToStep1Btn');
    const continueToStep3Btn = document.getElementById('continueToStep3Btn');
    
    // Step 3 Elements
    const backToStep2Btn = document.getElementById('backToStep2Btn');
    const payNowBtn = document.getElementById('payNowBtn');
    const uploadArea = document.getElementById('uploadArea');
    const screenshotInput = document.getElementById('screenshotInput');
    const screenshotPreview = document.getElementById('screenshotPreview');
    const previewContainer = document.getElementById('previewContainer');
    const txnIdInput = document.getElementById('txnIdInput');
    
    // Step 4 Elements
    const printReceiptBtn = document.getElementById('printReceiptBtn');
    const downloadReceiptBtn = document.getElementById('downloadReceiptBtn');
    const goHomeBtn = document.getElementById('goHomeBtn');

    // File Upload Handler
    if (uploadArea && screenshotInput) {
        uploadArea.addEventListener('click', () => {
            screenshotInput.click();
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            uploadArea.addEventListener(eventName, (e) => {
                e.preventDefault();
                uploadArea.style.borderColor = 'var(--primary)';
                uploadArea.style.background = '#e0effe';
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, (e) => {
                e.preventDefault();
                uploadArea.style.borderColor = 'var(--border-color)';
                uploadArea.style.background = '#f8fafc';
            }, false);
        });

        uploadArea.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files.length > 0) {
                screenshotInput.files = files;
                handleFile(files[0]);
            }
        });

        screenshotInput.addEventListener('change', function() {
            if (this.files.length > 0) {
                handleFile(this.files[0]);
            }
        });
    }

    function handleFile(file) {
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file (screenshot).');
            return;
        }
        loadedFile = file;
        const reader = new FileReader();
        reader.onload = function(e) {
            screenshotPreview.src = e.target.result;
            previewContainer.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }

    // Format Dates
    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        const options = { day: 'numeric', month: 'long', year: 'numeric' };
        return d.toLocaleDateString('en-IN', options);
    };

    // Format Currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    };

    // Step Progress Updates
    const updateProgress = (step) => {
        const fillPercentage = ((step - 1) / (totalSteps - 1)) * 100;
        const progressLine = document.getElementById('progressLineFill');
        if (progressLine) {
            progressLine.style.width = `${fillPercentage}%`;
        }
        
        for (let i = 1; i <= totalSteps; i++) {
            const indicator = document.getElementById(`stepIndicator${i}`);
            const circle = document.getElementById(`circle${i}`);
            if (indicator && circle) {
                if (i < step) {
                    indicator.classList.add('completed');
                    indicator.classList.remove('active');
                    circle.innerHTML = '<i class="fa-solid fa-check"></i>';
                } else if (i === step) {
                    indicator.classList.add('active');
                    indicator.classList.remove('completed');
                    circle.innerHTML = `${i}`;
                } else {
                    indicator.classList.remove('active', 'completed');
                    circle.innerHTML = `${i}`;
                }
            }
        }
    };
    
    const showStep = (step) => {
        document.querySelectorAll('.step-content').forEach(el => {
            el.classList.remove('active');
        });
        
        const stepEl = document.getElementById(`step${step}`);
        if (stepEl) {
            stepEl.classList.add('active');
        }
        
        currentStep = step;
        updateProgress(step);
        
        const card = document.querySelector('.multi-step-card');
        if (card) {
            const cardTop = card.getBoundingClientRect().top + window.scrollY - 100;
            window.scrollTo({ top: cardTop, behavior: 'smooth' });
        }
    };

    // Validation Input Check
    if (policyInput) {
        policyInput.addEventListener('input', () => {
            if (policyInput.value.trim().length >= 8) {
                policyInput.classList.remove('is-invalid');
                policyError.style.display = 'none';
            }
        });
    }

    // Step 1 -> Step 2: Fetch policy details from Supabase
    if (verifyBtn) {
        verifyBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const val = policyInput.value.trim().toUpperCase();
            
            if (val.length < 8) {
                policyInput.classList.add('is-invalid');
                policyError.style.display = 'block';
                return;
            }
            
            verifyBtn.classList.add('btn-loading');
            
            try {
                if (useLocalFallback) {
                    // Load policies list from localStorage (synced with admin panel)
                    const policies = JSON.parse(localStorage.getItem('insurecorp_policies')) || [localFallbackPolicy];
                    const foundPolicy = policies.find(p => p.policy_number === val);
                    
                    if (!foundPolicy) {
                        throw new Error(`Policy number ${val} not found in database.`);
                    }
                    
                    activePolicy = {
                        policy_number: foundPolicy.policy_number,
                        holder_name: foundPolicy.holder_name,
                        dob: foundPolicy.dob,
                        mobile: foundPolicy.mobile,
                        email: foundPolicy.email,
                        policy_type: foundPolicy.policy_type,
                        sum_assured: foundPolicy.sum_assured,
                        nominee_name: foundPolicy.nominee_name,
                        start_date: foundPolicy.start_date,
                        end_date: foundPolicy.end_date,
                        premium_amount: foundPolicy.premium_amount,
                        due_date: foundPolicy.due_date,
                        status: foundPolicy.status
                    };
                } else {
                    // Query Supabase Policies Table
                    const { data, error } = await supabase
                        .from('policies')
                        .select('*')
                        .eq('policy_number', val)
                        .single();
                    
                    if (error || !data) {
                        throw new Error(error ? error.message : "Policy number not found in database.");
                    }
                    activePolicy = data;
                }
                
                // Update Step 2 Elements
                document.getElementById('lblPolicyNo').innerText = activePolicy.policy_number || activePolicy.policyNumber;
                document.getElementById('lblHolder').innerText = activePolicy.holder_name || activePolicy.holderName;
                document.getElementById('lblDob').innerText = formatDate(activePolicy.dob);
                document.getElementById('lblMobile').innerText = activePolicy.mobile;
                document.getElementById('lblEmail').innerText = activePolicy.email;
                document.getElementById('lblType').innerText = activePolicy.policy_type || activePolicy.policyType;
                document.getElementById('lblSumAssured').innerText = formatCurrency(activePolicy.sum_assured || activePolicy.sumAssured);
                document.getElementById('lblNominee').innerText = activePolicy.nominee_name || activePolicy.nomineeName;
                document.getElementById('lblStartDate').innerText = formatDate(activePolicy.start_date || activePolicy.startDate);
                document.getElementById('lblEndDate').innerText = formatDate(activePolicy.end_date || activePolicy.endDate);
                
                const premAmt = activePolicy.premium_amount || activePolicy.premiumAmount;
                document.getElementById('lblAmount').innerText = formatCurrency(premAmt);
                document.getElementById('lblDueDate').innerText = formatDate(activePolicy.due_date || activePolicy.dueDate);
                
                const statusBadge = document.getElementById('lblStatus');
                statusBadge.innerText = activePolicy.status;
                if (activePolicy.status === "Active") {
                    statusBadge.style.backgroundColor = "var(--success-light)";
                    statusBadge.style.color = "var(--success)";
                } else {
                    statusBadge.style.backgroundColor = "var(--danger-light)";
                    statusBadge.style.color = "var(--danger)";
                }

                // Generate Step 3 Unique Reference Number
                globalRefId = 'REF' + Math.floor(100000 + Math.random() * 900000);

                setTimeout(() => {
                    verifyBtn.classList.remove('btn-loading');
                    showStep(2);
                }, 1000);

            } catch (err) {
                console.error("Policy fetch error:", err);
                verifyBtn.classList.remove('btn-loading');
                policyInput.classList.add('is-invalid');
                policyError.innerText = err.message || "Failed to load policy details. Please try again.";
                policyError.style.display = 'block';
            }
        });
    }

    // Step 2 -> Step 3: Fetch UPI config and generate dynamic QR Code
    if (continueToStep3Btn) {
        continueToStep3Btn.addEventListener('click', async () => {
            try {
                if (useLocalFallback) {
                    activeUpi = JSON.parse(localStorage.getItem('insurecorp_upi')) || localFallbackUpi;
                } else {
                    // Fetch Active UPI settings
                    const { data, error } = await supabase
                        .from('upi_settings')
                        .select('*')
                        .eq('id', 1)
                        .single();
                        
                    if (error || !data) {
                        throw new Error(error ? error.message : "Failed to load active UPI configuration.");
                    }
                    activeUpi = data;
                }

                // Populate billing details in Step 3
                const premAmt = activePolicy.premium_amount || activePolicy.premiumAmount;
                const policyNo = activePolicy.policy_number || activePolicy.policyNumber;
                const holderName = activePolicy.holder_name || activePolicy.holderName;

                document.getElementById('payPolicyNo').innerText = policyNo;
                document.getElementById('payHolder').innerText = holderName;
                document.getElementById('payTotalAmount').innerText = formatCurrency(premAmt);
                document.getElementById('payAmountLabel').innerText = formatCurrency(premAmt);
                document.getElementById('instructionPayAmount').innerText = formatCurrency(premAmt);
                document.getElementById('payRefLabel').innerText = globalRefId;

                // Update QR Code details
                const qrUpiId = activeUpi.upi_id;
                const qrHolderName = activeUpi.account_holder_name;
                document.querySelector('.qr-details-row:nth-child(1) span').innerText = qrUpiId;
                document.querySelector('.qr-details-row:nth-child(2) span').innerText = qrHolderName;

                // Generate Dynamic scan-ready QR code using Google Charts API
                // Format: upi://pay?pa={upi_id}&pn={holder_name}&am={amount}&tr={ref_no}
                const upiString = `upi://pay?pa=${encodeURIComponent(qrUpiId)}&pn=${encodeURIComponent(qrHolderName)}&am=${premAmt}&tr=${globalRefId}`;
                const qrUrl = `https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=${encodeURIComponent(upiString)}&choe=UTF-8`;
                
                // Replace inline SVG with dynamic QR image
                const qrWrapper = document.querySelector('.qr-card-wrapper');
                if (qrWrapper) {
                    qrWrapper.innerHTML = `<img src="${qrUrl}" alt="Scan QR Code to Pay" style="width: 200px; height: 200px; display: block; margin: 0 auto;">`;
                }

                showStep(3);

            } catch (err) {
                console.error("UPI config load error:", err);
                alert("Failed to load active payment parameters. " + err.message);
            }
        });
    }

    if (backToStep1Btn) {
        backToStep1Btn.addEventListener('click', () => {
            showStep(1);
        });
    }

    if (backToStep2Btn) {
        backToStep2Btn.addEventListener('click', () => {
            showStep(2);
        });
    }

    // Step 3 -> Step 4: Upload screenshot and submit transaction details
    if (payNowBtn) {
        payNowBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            
            if (!loadedFile) {
                alert('Please upload a screenshot of your payment receipt before submitting.');
                return;
            }

            payNowBtn.classList.add('btn-loading');
            
            try {
                let screenshotUrl = "mock_screenshot_url.jpg";
                const premAmt = activePolicy.premium_amount || activePolicy.premiumAmount;
                const policyNo = activePolicy.policy_number || activePolicy.policyNumber;
                const holderName = activePolicy.holder_name || activePolicy.holderName;
                const txnId = txnIdInput.value.trim() || null;

                if (useLocalFallback) {
                    // Use base64 URL of screenshot for mock presentation
                    screenshotUrl = screenshotPreview.src;
                    
                    const newSub = {
                        id: 'mock-sub-' + Date.now(),
                        reference_number: globalRefId,
                        policy_number: policyNo,
                        amount_paid: premAmt,
                        screenshot_url: screenshotUrl,
                        txn_id: txnId,
                        status: "Pending Verification",
                        created_at: new Date().toISOString()
                    };

                    const submissions = JSON.parse(localStorage.getItem('insurecorp_submissions')) || [];
                    submissions.push(newSub);
                    localStorage.setItem('insurecorp_submissions', JSON.stringify(submissions));
                } else {
                    // 1. Upload screenshot file to Supabase Storage Bucket 'screenshots'
                    const fileExt = loadedFile.name.split('.').pop();
                    const fileName = `${Date.now()}-${Math.floor(Math.random() * 1000)}.${fileExt}`;
                    const filePath = `uploads/${fileName}`;

                    const { error: uploadError } = await supabase.storage
                        .from('screenshots')
                        .upload(filePath, loadedFile);

                    if (uploadError) {
                        throw new Error("Receipt upload failed: " + uploadError.message);
                    }

                    // 2. Retrieve public URL
                    const { data: publicUrlData } = supabase.storage
                        .from('screenshots')
                        .getPublicUrl(filePath);

                    screenshotUrl = publicUrlData.publicUrl;

                    // 3. Insert record to Submissions database table
                    const { error: dbError } = await supabase
                        .from('submissions')
                        .insert({
                            reference_number: globalRefId,
                            policy_number: policyNo,
                            amount_paid: premAmt,
                            screenshot_url: screenshotUrl,
                            txn_id: txnId
                        });

                    if (dbError) {
                        throw new Error("Failed to register submission: " + dbError.message);
                    }
                }

                // 4. Update Step 4 elements
                document.getElementById('receiptRefNo').innerText = globalRefId;
                document.getElementById('receiptPolicyNo').innerText = policyNo;
                document.getElementById('receiptHolder').innerText = holderName;
                document.getElementById('receiptAmount').innerText = formatCurrency(premAmt);

                const today = new Date();
                const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
                document.getElementById('receiptDate').innerText = today.toLocaleDateString('en-IN', options);

                setTimeout(() => {
                    payNowBtn.classList.remove('btn-loading');
                    showStep(4);
                }, 1500);

            } catch (err) {
                console.error("Submission error:", err);
                payNowBtn.classList.remove('btn-loading');
                alert("Failed to submit payment. " + err.message);
            }
        });
    }

    // Step 4 actions
    if (printReceiptBtn) {
        printReceiptBtn.addEventListener('click', () => {
            window.print();
        });
    }
    
    if (downloadReceiptBtn) {
        downloadReceiptBtn.addEventListener('click', () => {
            alert('Receipt acknowledgement downloaded. (In production, this downloads a compiled PDF)');
        });
    }
    
    if (goHomeBtn) {
        goHomeBtn.addEventListener('click', () => {
            policyInput.value = '';
            loadedFile = null;
            activePolicy = null;
            if (previewContainer) previewContainer.style.display = 'none';
            if (screenshotPreview) screenshotPreview.src = '';
            if (txnIdInput) txnIdInput.value = '';
            
            showStep(1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // Scroll to Top Logic
    const scrollToTopBtn = document.getElementById('scrollToTopBtn');
    if (scrollToTopBtn) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                scrollToTopBtn.classList.add('visible');
            } else {
                scrollToTopBtn.classList.remove('visible');
            }
        });
        
        scrollToTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
});
