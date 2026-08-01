/* ==========================================================================
   STATE MANAGEMENT & CONSTANTS
   ========================================================================== */
const DEFAULT_STATE = {
  auth: {
    loggedIn: false,
    username: ""
  },
  profile: {
    // Permanent profile name (user requested immutable display name)
    firstName: "JACK",
    lastName: "CAVANAUGH",
    phone: "+1 (843) 256-3921",
    email: "JackCavnaugh@gmail.com"
  },
  accounts: {
    checking: 900193.29,
    savings: 270200.63
  },
  card: {
    number: "4815 1623 4264 2287",
    expiry: "09/29",
    cvv: "828",
    locked: true,
    limit: 5000,
    pin: "1234",
    revealed: false
  },
  transactions: [],
  darkMode: false
};

function getRelativeDateString(daysAgo, timeStr) {
  if (daysAgo === 0) return `Today • ${timeStr}`;
  if (daysAgo === 1) return `Yesterday • ${timeStr}`;
  
  const d = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[d.getMonth()]} ${d.getDate()} • ${timeStr}`;
}

// Generate deterministic monthly transactions for the specified months (inclusive)
function generateMonthlyTransactions(state, year = 2026, startMonth = 0, endMonth = 5, perMonthCounts) {
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const nMonths = endMonth - startMonth + 1;
  // Default: deterministic counts between 10 and 20 transactions per month
  const defaultCounts = Array.from({ length: nMonths }, (_, idx) => 10 + ((idx * 7 + 3) % 11));
  const counts = perMonthCounts && perMonthCounts.length === nMonths ? perMonthCounts : defaultCounts;

  const creditPayees = ["Employer Inc","Acme Corp","Prime Investments","Bright Consulting","Investment Partners","Global Tech","Settlement Network","JP Morgan","Contractor Payout","HR Payroll"];
  const debitPayees = ["Local Market","Corner Store","Whole Foods","The Bistro","Auto Group","Designer House","S. Contractors","Tech Shop","City Utilities","Mortgage Servicing"];

  const txs = [];

  function pad(n) { return String(n).padStart(2, '0'); }
  function fmtTime(h, m) {
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hh = h % 12 || 12;
    return `${hh}:${String(m).padStart(2,'0')} ${ampm}`;
  }
  function round2(v){ return Math.round(v * 100) / 100; }

  let idCounter = 1;

  // Stop generation at today's month if endMonth is in the future
  const today = new Date();
  const lastAllowedMonth = Math.min(endMonth, today.getMonth() + (today.getFullYear() - year) * 12);
  for (let m = startMonth; m <= lastAllowedMonth; m++) {
    const idx = m - startMonth;
    const count = counts[idx] || 12;
    for (let i = 0; i < count; i++) {
      const day = 1 + (i * 3) % 25; // 1..25
      const hour = 8 + (i * 5) % 10; // 8..17
      const minute = (i * 13) % 60;

      // Choose category deterministically
      const pick = i % 10;
      let category = 'card';
      if (pick === 0) category = 'payroll';
      else if (pick === 1) category = 'ach';
      else if (pick === 2) category = 'transfer';
      else if (pick === 3) category = 'card';
      else if (pick === 4) category = 'card';
      else if (pick === 5) category = 'card';
      else if (pick === 6) category = 'card';
      else if (pick === 7) category = 'card';
      else if (pick === 8) category = 'card';
      else category = 'card';

      let amount = 0;
      let title = '';
      let type = 'debit';
      let counterparty = '';

      if (category === 'payroll') {
        amount = 50000 + ((i + m) % 5) * 25000; // sizable payrolls
        type = 'credit';
        title = 'Payroll • Monthly Salary';
        counterparty = creditPayees[(i + m) % creditPayees.length];
      } else if (category === 'ach') {
        amount = 20000 + ((i + m) % 7) * 30000; // larger ACH deposits
        type = 'credit';
        title = 'ACH Deposit • Client Payment';
        counterparty = creditPayees[(i + 2 + m) % creditPayees.length];
      } else if (category === 'transfer') {
        // transfer can be either to savings (debit) or from savings (credit)
        const out = (i + m) % 3 !== 0;
        amount = 500 + ((i * 7) % 20000);
        type = out ? 'debit' : 'credit';
        title = out ? 'Transfer to Savings' : 'Transfer from Savings';
        counterparty = out ? 'Savings Account' : 'Savings Account';
        if (out) amount = -Math.abs(amount);
      } else { // card purchases / smaller debits
        // include many small grocery-like spends
        const smallPick = i % 6;
        if (smallPick === 0) {
          amount = -Math.round((20 + (i * 7) % 200) * 100) / 100; // groceries
          title = 'Grocery • Market';
        } else if (smallPick === 1) {
          amount = -Math.round((40 + (i * 11) % 400) * 100) / 100; // dining
          title = 'Dining • Local';
        } else if (smallPick === 2) {
          amount = -Math.round((150 + (i * 17) % 1200) * 100) / 100; // retail
          title = 'Retail Purchase • Store';
        } else if (smallPick === 3) {
          amount = -Math.round((8 + (i * 3) % 50) * 100) / 100; // coffee
          title = 'Coffee • Café';
        } else {
          amount = -Math.round((300 + (i * 9) % 5000) * 100) / 100; // larger card
          title = 'Card Purchase • Merchant';
        }
        type = 'debit';
        counterparty = debitPayees[(i + m) % debitPayees.length];
      }

      // Ensure amounts have 2 decimals
      amount = Math.round(amount * 100) / 100;

      const txDate = new Date(Date.UTC(year, m, Math.min(day, 28), hour, minute, i % 60));
      const displayDate = `${monthNames[m]} ${txDate.getUTCDate()} • ${fmtTime(txDate.getUTCHours(), txDate.getUTCMinutes())}`;

      const tx = {
        id: `TXN-${year}${pad(m+1)}${pad(txDate.getUTCDate())}-${pad(idCounter++)}`,
        title,
        category,
        date: displayDate,
        rawDate: txDate.toISOString(),
        amount: amount,
        type: type,
        status: 'completed',
        balanceAfter: 0,
        account: 'checking',
        counterpartyName: counterparty
      };

      txs.push(tx);
    }
  }

  // Sort chronologically ascending
  txs.sort((a,b) => new Date(a.rawDate) - new Date(b.rawDate));

  // Add recent transfer entries for Marvins and Mark Zuckerberg as separate, high-value credit transactions.
  // Use July 31st as the final transaction date
  const julyDate = new Date(Date.UTC(2026, 6, 31, 15, 30, 0)); // July 31, 2026
  const recentAmounts = [325000, 475000, 300000, 420000];
  const randomNames = ['North Point', 'Harbor Lane', 'Summit Market', 'Blue Ridge', 'Pine Street', 'Cedar House', 'Ridge View', 'Lakeside'];
  const randomName = () => randomNames[Math.floor(Math.random() * randomNames.length)];
  const recentTxs = [
    {
      id: `TXN-RECENT-MARVIN-1`,
      title: 'Transfer from Marvins',
      category: 'transfer',
      date: `${monthNames[6]} 31 • ${fmtTime(15, 30)}`,
      rawDate: new Date(julyDate.getTime() - 1000 * 60 * 45).toISOString(),
      amount: recentAmounts[0],
      type: 'credit',
      status: 'completed',
      balanceAfter: 0,
      account: 'checking',
      counterpartyName: 'Marvins'
    },
    {
      id: `TXN-RECENT-MARVIN-1-COFFEE`,
      title: `${randomName()} • Café`,
      category: 'card',
      date: `${monthNames[6]} 31 • ${fmtTime(15, 35)}`,
      rawDate: new Date(julyDate.getTime() - 1000 * 60 * 35).toISOString(),
      amount: -14.75,
      type: 'debit',
      status: 'completed',
      balanceAfter: 0,
      account: 'checking',
      counterpartyName: randomName()
    },
    {
      id: `TXN-RECENT-MARVIN-2`,
      title: 'Transfer from Marvins',
      category: 'transfer',
      date: `${monthNames[6]} 31 • ${fmtTime(14, 30)}`,
      rawDate: new Date(julyDate.getTime() - 1000 * 60 * 90).toISOString(),
      amount: recentAmounts[1],
      type: 'credit',
      status: 'completed',
      balanceAfter: 0,
      account: 'checking',
      counterpartyName: 'Marvins'
    },
    {
      id: `TXN-RECENT-MARVIN-2-GROCERY`,
      title: `${randomName()} • Market`,
      category: 'card',
      date: `${monthNames[6]} 31 • ${fmtTime(14, 50)}`,
      rawDate: new Date(julyDate.getTime() - 1000 * 60 * 80).toISOString(),
      amount: -68.42,
      type: 'debit',
      status: 'completed',
      balanceAfter: 0,
      account: 'checking',
      counterpartyName: randomName()
    },
    {
      id: `TXN-RECENT-ZUCK-1`,
      title: 'Transfer from Mark Zuckerberg',
      category: 'transfer',
      date: `${monthNames[6]} 31 • ${fmtTime(13, 30)}`,
      rawDate: new Date(julyDate.getTime() - 1000 * 60 * 120).toISOString(),
      amount: recentAmounts[2],
      type: 'credit',
      status: 'completed',
      balanceAfter: 0,
      account: 'checking',
      counterpartyName: 'Mark Zuckerberg'
    },
    {
      id: `TXN-RECENT-ZUCK-1-RETAIL`,
      title: `${randomName()} • Store`,
      category: 'card',
      date: `${monthNames[6]} 31 • ${fmtTime(13, 48)}`,
      rawDate: new Date(julyDate.getTime() - 1000 * 60 * 110).toISOString(),
      amount: -122.90,
      type: 'debit',
      status: 'completed',
      balanceAfter: 0,
      account: 'checking',
      counterpartyName: randomName()
    },
    {
      id: `TXN-RECENT-ZUCK-2`,
      title: 'Transfer from Mark Zuckerberg',
      category: 'transfer',
      date: `${monthNames[6]} 31 • ${fmtTime(12, 30)}`,
      rawDate: new Date(julyDate.getTime() - 1000 * 60 * 180).toISOString(),
      amount: recentAmounts[3],
      type: 'credit',
      status: 'completed',
      balanceAfter: 0,
      account: 'checking',
      counterpartyName: 'Mark Zuckerberg'
    },
    {
      id: `TXN-RECENT-ZUCK-2-COFFEE`,
      title: `${randomName()} • Café`,
      category: 'card',
      date: `${monthNames[6]} 31 • ${fmtTime(11, 55)}`,
      rawDate: new Date(julyDate.getTime() - 1000 * 60 * 170).toISOString(),
      amount: -9.50,
      type: 'debit',
      status: 'completed',
      balanceAfter: 0,
      account: 'checking',
      counterpartyName: randomName()
    }
  ];
  txs.push(...recentTxs);
  txs.sort((a,b) => new Date(a.rawDate) - new Date(b.rawDate));

  // Final adjustment to match target checking balance
  const target = state.accounts && state.accounts.checking ? state.accounts.checking : 0;
  const txsBeforeAdj = txs.slice();
  const diff = Math.round((target - txsBeforeAdj.reduce((sum, tx) => sum + (tx.amount || 0), 0)) * 100) / 100;
  if (Math.abs(diff) > 0.005) {
    const adjDate = new Date(Date.UTC(year, endMonth, 28, 23, 59, 59));
    const adjTx = {
      id: `TXN-ADJ-${year}${pad(endMonth+1)}`,
      title: 'Adjustment Deposit • Account Reconciliation',
      category: 'ach',
      date: `${monthNames[endMonth]} ${adjDate.getUTCDate()} • ${fmtTime(adjDate.getUTCHours(), adjDate.getUTCMinutes())}`,
      rawDate: adjDate.toISOString(),
      amount: diff,
      type: diff >= 0 ? 'credit' : 'debit',
      status: 'completed',
      balanceAfter: 0,
      account: 'checking',
      counterpartyName: 'Reconciliation'
    };
    txs.push(adjTx);
  }

  // Compute running balances from the actual checking balance so transaction history matches the main account balance.
  const txsAsc = txs.slice().sort((a,b) => new Date(a.rawDate) - new Date(b.rawDate));
  const totalTxAmount = round2(txsAsc.reduce((sum, tx) => sum + (tx.amount || 0), 0));
  const openingBalance = round2(target - totalTxAmount);
  let balanceRunning = openingBalance;
  txsAsc.forEach(tx => {
    balanceRunning = round2(balanceRunning + (tx.amount || 0));
    tx.balanceAfter = balanceRunning;
  });

  // Return newest-first order as used by the UI
  state.transactions = txsAsc.slice().sort((a,b) => new Date(b.rawDate) - new Date(a.rawDate));
}

// Return a time-sensitive greeting based on current hour
function getGreeting() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Good morning';
  if (h >= 12 && h < 18) return 'Good afternoon';
  return 'Good evening';
}

// Format number into USD currency structure
function formatUSD(value) {
  const isNegative = value < 0;
  const absValue = Math.abs(value);
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(absValue);
  return isNegative ? `-${formatted}` : formatted;
}

// Save/Load state functions
function saveStateToStorage() {
  // Persistence to localStorage disabled per user request.
  // Intentionally no-op to prevent writing `boa_clone_state_desktop` while user works.
}

function loadStateFromStorage() {
  // Loading from localStorage disabled per user request — always initialize fresh in-memory state
  appState = JSON.parse(JSON.stringify(DEFAULT_STATE));
}

// Firestore sync utilities (debounced saves + init)
let __firebaseSaveTimer = null;
function scheduleFirebaseSave() {
  if (!window.firebase || !window.firebase.auth || !window.firebase.db) return;
  const { auth, db, doc, setDoc } = window.firebase;
  if (!auth.currentUser) return;
  clearTimeout(__firebaseSaveTimer);
  __firebaseSaveTimer = setTimeout(async () => {
    try {
      await setDoc(doc(db, 'users', auth.currentUser.uid), { state: appState }, { merge: true });
      console.log('Saved appState to Firestore for', auth.currentUser.uid);
    } catch (err) {
      console.error('Firestore save failed', err);
    }
  }, 800);
}

function initFirebaseSync() {
  if (!window.firebase || !window.firebase.auth) return;
  const { auth, db, onAuthStateChanged, signInAnonymously, doc, getDoc, setDoc, onSnapshot } = window.firebase;

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      const uid = user.uid;
      const userRef = doc(db, 'users', uid);
      try {
        const snap = await getDoc(userRef);
        if (snap && snap.exists()) {
          const serverState = snap.data().state;
          if (serverState) {
            appState = serverState;
            saveStateToStorage();
            applyAuthState();
            renderAll();
            showToast('Loaded account data from cloud.');
          } else {
            await setDoc(userRef, { state: appState }, { merge: true });
            showToast('Initialized cloud state from local data.');
          }
        } else {
          await setDoc(userRef, { state: appState }, { merge: true });
          showToast('Saved local state to cloud storage.');
        }
      } catch (err) {
        console.error('Firestore load error', err);
      }

      // Listen for remote changes and merge
      try {
        onSnapshot(userRef, (snap) => {
          if (snap.exists()) {
            const serverState = snap.data().state;
            if (serverState && JSON.stringify(serverState) !== JSON.stringify(appState)) {
              appState = serverState;
              saveStateToStorage();
              renderAll();
              showToast('Account synchronized from cloud.');
            }
          }
        });
      } catch (e) {
        console.error('onSnapshot error', e);
      }
    } else {
      // Not signed in -> sign in anonymously
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.error('Anonymous sign-in failed', err);
      }
    }
  });
}

/* ==========================================================================
   INITIALIZATION AND RENDERING
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  loadStateFromStorage();
  // Populate richer monthly transactions if the state has few or no transactions
  try {
    if (!appState.transactions || appState.transactions.length < 60) {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = 6; // July (month 6, 0-based)
      const startMonth = Math.max(0, currentMonth - 5);
      generateMonthlyTransactions(DEFAULT_STATE, currentYear, startMonth, currentMonth);
      // ensure appState mirrors DEFAULT_STATE newly generated transactions
      appState = JSON.parse(JSON.stringify(DEFAULT_STATE));
      // Remove transactions between June 19-28, 2026 (inclusive)
      try {
        const year = 2026;
        const monthIndex = 5; // June (0-based)
        const startDay = 19;
        const endDay = 28;
        const startTs = Date.UTC(year, monthIndex, startDay, 0, 0, 0);
        const endTs = Date.UTC(year, monthIndex, endDay, 23, 59, 59, 999);

        appState.transactions = (appState.transactions || []).filter(tx => {
          const ts = Date.parse(tx.rawDate || tx.date || '');
          return !(ts >= startTs && ts <= endTs);
        });

        // Ensure final balance matches target by adding an adjustment before the removed range
        const target = appState.accounts && appState.accounts.checking ? appState.accounts.checking : 0;
        const txsBeforeAdj = appState.transactions.slice();
        const diff = Math.round((target - txsBeforeAdj.reduce((sum, tx) => sum + (tx.amount || 0), 0)) * 100) / 100;
        if (Math.abs(diff) > 0.005) {
          // Place adjustment one millisecond before the removed range starts
          let adjMs = startTs - 1;
          const nowMs = Date.now();
          if (adjMs > nowMs) adjMs = nowMs;
          const adjDate = new Date(adjMs);
          const pad = (n) => String(n).padStart(2, '0');
          const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
          const fmtTime = (h, m) => {
            const ampm = h >= 12 ? 'PM' : 'AM';
            const hh = h % 12 || 12;
            return `${hh}:${String(m).padStart(2,'0')} ${ampm}`;
          };

          const adjTx = {
            id: `TXN-ADJ-POSTREMOVE-${adjDate.getUTCFullYear()}${pad(adjDate.getUTCMonth()+1)}${pad(adjDate.getUTCDate())}`,
            title: 'Adjustment Deposit • Account Reconciliation (Post-Removal)',
            category: 'ach',
            date: `${monthNames[adjDate.getUTCMonth()]} ${adjDate.getUTCDate()} • ${fmtTime(adjDate.getUTCHours(), adjDate.getUTCMinutes())}`,
            rawDate: new Date(adjMs).toISOString(),
            amount: diff,
            type: diff >= 0 ? 'credit' : 'debit',
            status: 'completed',
            balanceAfter: 0,
            account: 'checking',
            counterpartyName: 'Reconciliation'
          };

          // Remove any old adjustment transactions inside the removed range
          appState.transactions = appState.transactions.filter(tx => {
            try {
              const ts = Date.parse(tx.rawDate || '');
              return !(tx.id && tx.id.startsWith('TXN-ADJ-') && ts >= startTs && ts <= endTs);
            } catch (e) { return true; }
          });

          appState.transactions.push(adjTx);
          // Recompute running balances from the actual checking balance so transaction history matches the main account balance.
          const asc = appState.transactions.slice().sort((a, b) => new Date(a.rawDate) - new Date(b.rawDate));
          const totalTxAmount = Math.round(asc.reduce((sum, tx) => sum + (tx.amount || 0), 0) * 100) / 100;
          const openingBalance = Math.round((target - totalTxAmount) * 100) / 100;
          let balanceRunning = openingBalance;
          asc.forEach(t => {
            balanceRunning = Math.round((balanceRunning + (t.amount || 0)) * 100) / 100;
            t.balanceAfter = balanceRunning;
          });
          appState.transactions = asc.slice().sort((a,b) => new Date(b.rawDate) - new Date(a.rawDate));
        }
      } catch (remErr) {
        console.error('Failed to prune June 19-28 transactions', remErr);
      }
    }
  } catch (e) { console.error('Transaction generation failed', e); }
  // Initialize Firebase sync (anonymous sign-in + cloud load/save)
  initFirebaseSync();
  applyAuthState();
  applyTheme();
  renderAll();
  setupEventListeners();
  initCardPhysics();
});

// Sync authentication visibility with body classes
function applyAuthState() {
  if (appState.auth && appState.auth.loggedIn) {
    document.body.classList.remove('logged-out');
    document.body.classList.add('logged-in');
  } else {
    document.body.classList.remove('logged-in');
    document.body.classList.add('logged-out');
  }
}

// Apply theme class based on state
function applyTheme() {
  if (appState.darkMode) {
    document.body.classList.add('dark-theme');
    const darkModeBtn = document.getElementById('btn-toggle-dark-mode');
    if (darkModeBtn) darkModeBtn.textContent = "Light Mode";
  } else {
    document.body.classList.remove('dark-theme');
    const darkModeBtn = document.getElementById('btn-toggle-dark-mode');
    if (darkModeBtn) darkModeBtn.textContent = "Dark Mode";
  }
}

// Render dynamic state elements across views
function renderAll() {
  const { profile, accounts, card, transactions, auth } = appState;
  const initials = (profile.firstName[0] || "") + (profile.lastName[0] || "");
  const fullName = `${profile.firstName} ${profile.lastName}`;

  // Update Ribbon Authentication Name
  const ribUserName = document.getElementById('ribbon-username');
  if (ribUserName) ribUserName.textContent = fullName;

  // Update Greetings Header (time-sensitive)
  const greetingEl = document.getElementById('greeting');
  if (greetingEl) greetingEl.textContent = `${getGreeting()}, ${profile.firstName}!`;

  // Update avatar and sideboards initials/names
  const avatarEl = document.getElementById('profile-avatar-letters');
  if (avatarEl) avatarEl.textContent = initials;
  
  const editAvatarEl = document.getElementById('profile-edit-avatar');
  if (editAvatarEl) editAvatarEl.textContent = initials;

  const displayNameEl = document.getElementById('profile-display-name');
  if (displayNameEl) displayNameEl.textContent = fullName;

  const displayPhoneEl = document.getElementById('profile-display-phone');
  if (displayPhoneEl) displayPhoneEl.textContent = profile.phone;

  const displayEmailEl = document.getElementById('profile-display-email');
  if (displayEmailEl) displayEmailEl.textContent = profile.email;

  // Update accounts dashboard balances
  const balanceCells = document.querySelectorAll('.balance-cell');
  const shouldHideBalances = document.body.classList.contains('balances-hidden');
  const formatBalanceText = (value) => shouldHideBalances ? '••••••••' : formatUSD(value);

  balanceCells.forEach(cell => {
    const valueEl = cell.querySelector('.balance-value');
    const balanceValue = Number(cell.dataset.balance || 0);

    if (valueEl) {
      valueEl.textContent = formatBalanceText(balanceValue);
    }

    cell.classList.toggle('is-hidden', shouldHideBalances);
  });

  // Update checking balance card
  const checkingBalanceCard = document.getElementById('checking-card-balance');
  if (checkingBalanceCard) {
    const checkingBalance = accounts.checking || 0;
    const cardValueEl = checkingBalanceCard.querySelector('.balance-value-card');
    if (cardValueEl) {
      cardValueEl.textContent = formatBalanceText(checkingBalance);
    }
    checkingBalanceCard.classList.toggle('is-hidden', shouldHideBalances);
  }

  // Calculate and update checking trend display (using payroll transaction as the trend indicator)
  const payrollTx = transactions.find(t => t.category === 'payroll');
  const trendAmount = payrollTx ? payrollTx.amount : 248920.50;
  const trendEl = document.getElementById('display-trend-amount');
  if (trendEl) trendEl.textContent = `+ ${formatUSD(trendAmount)}`;

  // Update sidebar card lock status
  const sidebarCardStatus = document.getElementById('sidebar-card-status');
  if (sidebarCardStatus) {
    sidebarCardStatus.textContent = card.locked ? "LOCKED" : "Active";
    sidebarCardStatus.className = card.locked ? "red-dot" : "";
    const dot = sidebarCardStatus.previousElementSibling;
    if (dot) {
      dot.className = card.locked ? "status-dot red-dot" : "status-dot green-dot";
    }
  }

  // Update profile inputs
  const fNameIn = document.getElementById('profile-first-name');
  const lNameIn = document.getElementById('profile-last-name');
  const phoneIn = document.getElementById('profile-phone');
  const emailIn = document.getElementById('profile-email');

  if (fNameIn) fNameIn.value = profile.firstName;
  if (lNameIn) lNameIn.value = profile.lastName;
  if (phoneIn) phoneIn.value = profile.phone;
  if (emailIn) emailIn.value = profile.email;

  // Update Transfer selector balance display details
  const checkingOption = document.querySelector('#transfer-from-select option[value="checking"]');
  const savingsOption = document.querySelector('#transfer-from-select option[value="savings"]');
  if (checkingOption) checkingOption.textContent = `Checking (•••• 2287) - ${formatUSD(accounts.checking)}`;
  if (savingsOption) savingsOption.textContent = `Savings (•••• 5821) - ${formatUSD(accounts.savings)}`;

  // Cards layout rendering
  const cardEl = document.getElementById('physical-card');
  const cardNumVal = document.getElementById('card-num-val');
  const cardCvvVal = document.getElementById('card-cvv-val');
  const cardHolderVal = document.getElementById('card-holder-val');
  const cardExpiryVal = document.getElementById('card-expiry-val');

  if (cardHolderVal) cardHolderVal.textContent = fullName.toUpperCase();
  if (cardExpiryVal) cardExpiryVal.textContent = card.expiry;

  if (cardNumVal && cardCvvVal) {
    if (card.revealed) {
      cardNumVal.textContent = card.number;
      cardCvvVal.textContent = card.cvv;
      document.getElementById('btn-reveal-card').textContent = "Hide credentials";
    } else {
      cardNumVal.textContent = "•••• •••• •••• " + card.number.split(' ').pop();
      cardCvvVal.textContent = "•••";
      document.getElementById('btn-reveal-card').textContent = "Reveal";
    }
  }

  // Card Freeze status
  const cardLockCheck = document.getElementById('card-lock-checkbox');
  if (cardLockCheck) cardLockCheck.checked = card.locked;
  if (cardEl) {
    if (card.locked) cardEl.classList.add('card-locked');
    else cardEl.classList.remove('card-locked');
  }

  // Card spend limit slider
  const limitRange = document.getElementById('card-limit-range');
  const limitVal = document.getElementById('card-limit-val');
  if (limitRange) limitRange.value = card.limit;
  if (limitVal) limitVal.textContent = formatUSD(card.limit);

  // Render recent activity transactions in the table view
  renderTransactionsTable(transactions);

  // Render a compact recent activity list on the home dashboard
  renderHomeRecentTransactions();
}

// Render the top N recent transactions on the home dashboard
function renderHomeRecentTransactions(limit = 3) {
  const tbody = document.getElementById('home-transactions-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  const recent = appState.transactions.slice(0, limit);
  if (recent.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;padding:16px;color:var(--text-secondary)">No recent activity</td></tr>`;
    return;
  }

  recent.forEach(tx => {
    const tr = document.createElement('tr');
    tr.className = 'account-row-link home-tx-row';
    tr.dataset.txnId = tx.id;

    let amtPrefix = tx.type === 'credit' ? '+' : '';
    tr.innerHTML = `
      <td>${tx.date}</td>
      <td style="font-weight:700">${escapeHTML(tx.title)}</td>
      <td class="text-right">${amtPrefix}${formatUSD(tx.amount)}</td>
    `;

    tr.addEventListener('click', () => {
      // Navigate to full transactions view and open receipt for the clicked tx
      switchView('transactions');
      setTimeout(() => {
        showTransactionReceipt(tx);
      }, 220);
    });

    tbody.appendChild(tr);
  });
}

// See more button handler
const seeMoreBtn = document.getElementById('btn-see-more-transactions');
if (seeMoreBtn) {
  seeMoreBtn.addEventListener('click', (e) => {
    e.preventDefault();
    switchView('transactions');
  });
}

// Render transactions into the main desktop portal table
function renderTransactionsTable(txs, filterText = '', filterCategory = '', filterMonths = []) {
  const tableBody = document.getElementById('transactions-table-body');
  if (!tableBody) return;

  tableBody.innerHTML = '';

  const filtered = txs.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(filterText.toLowerCase()) ||
                          formatUSD(t.amount).includes(filterText) ||
                          t.date.toLowerCase().includes(filterText.toLowerCase());
    const matchesCategory = filterCategory === '' || t.category === filterCategory;
    // Month filter: if filterMonths is empty => match all; else match if tx.rawDate month-year in filterMonths
    let matchesMonth = true;
    if (filterMonths && filterMonths.length > 0) {
      try {
        const d = new Date(t.rawDate);
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        matchesMonth = filterMonths.includes(key);
      } catch (e) {
        matchesMonth = true;
      }
    }

    return matchesSearch && matchesCategory && matchesMonth;
  });

  if (filtered.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 32px; color: var(--text-secondary);">
          No transactions match the filter criteria.
        </td>
      </tr>
    `;
    return;
  }

  filtered.forEach(tx => {
    const tr = document.createElement('tr');
    tr.className = 'account-row-link';
    tr.dataset.txnId = tx.id;

    let amtClass = 'amt-minus';
    let amtPrefix = '';
    if (tx.type === 'credit') {
      amtClass = 'amt-plus';
      amtPrefix = '+';
    } else if (tx.category === 'card' || tx.amount < 0) {
      amtClass = 'amt-debit';
    }

    const categoryLabels = {
      payroll: "Payroll Deposit",
      transfer: "Account Transfer",
      ach: "ACH & Electronic Transfer",
      card: "Card Purchase",
      check: "Deposit",
      cash: "Cash Deposit"
    };

    const methodIcons = {
      payroll: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"></circle><path d="M12 8v8"></path><path d="M8 12h8"></path></svg>`,
      ach: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18"/><path d="M3 6h18"/></svg>`,
      check: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>`,
      cash: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/></svg>`,
      card: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"/></svg>`
    };

    const iconSvg = methodIcons[tx.category] || '';
    const statusText = tx.status === 'pending' ? 'Pending' : 'Completed';
    const statusClass = tx.status === 'pending' ? 'status-pending' : 'status-completed';

    tr.innerHTML = `
      <td>${tx.date}</td>
      <td style="font-weight: 700;"><span class="tx-icon" style="margin-right:8px;vertical-align:middle">${iconSvg}</span>${escapeHTML(tx.title)} <span class="tx-status ${statusClass}" style="margin-left:8px;font-weight:600;font-size:12px">${statusText}</span></td>
      <td><span class="cat-badge cat-${tx.category}">${categoryLabels[tx.category] || tx.category}</span></td>
      <td>${tx.account.charAt(0).toUpperCase() + tx.account.slice(1)} (•••• 2287)</td>
      <td class="text-right txn-amount-td ${amtClass}">${amtPrefix}${formatUSD(tx.amount)}</td>
      <td class="text-right bold-amount">${formatUSD(tx.balanceAfter)}</td>
    `;

    // Click handler to open receipt overlay modal
    tr.addEventListener('click', () => {
      showTransactionReceipt(tx);
    });

    tableBody.appendChild(tr);
  });
}

// Utility: Prevent XSS
function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

/* ==========================================================================
   EVENT HANDLERS & ROUTING
   ========================================================================== */
function setupEventListeners() {
  
  /* LOGIN FORM HANDLER */
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const usernameInput = document.getElementById('login-username').value.trim();
      const passwordInput = document.getElementById('login-password').value;
      const errMsgEl = document.getElementById('login-err-msg');

      if (!usernameInput || !passwordInput) {
        errMsgEl.textContent = "Please fill in all authorization fields.";
        errMsgEl.style.display = 'block';
        return;
      }

      if (usernameInput !== "JACKC" || passwordInput !== "Jack$$") {
        errMsgEl.textContent = "Invalid Online ID or Password. Please try again.";
        errMsgEl.style.display = 'block';
        return;
      }

      // Simulate authentication; do NOT overwrite the permanent profile name.
      triggerProcessingOverlay("Verifying Online Credentials", "Securing connection to Bank of America auth nodes...", 1200, () => {
        appState.auth.loggedIn = true;
        // Store only the online id/email used to sign in
        appState.auth.username = usernameInput;
        saveStateToStorage();
        applyAuthState();
        renderAll();
        switchView('home');
        showToast("Signed in securely as Online Banking User.");

        // Clear login form fields
        loginForm.reset();
        errMsgEl.style.display = 'none';
      });
    });
  }

  const balanceToggleBtn = document.getElementById('btn-toggle-balances');
  if (balanceToggleBtn) {
    balanceToggleBtn.addEventListener('click', () => {
      const hidden = document.body.classList.toggle('balances-hidden');
      const eyeIcon = balanceToggleBtn.querySelector('.balance-eye-icon');
      if (eyeIcon) {
        eyeIcon.classList.toggle('is-closed', hidden);
      }
      balanceToggleBtn.setAttribute('aria-pressed', hidden ? 'true' : 'false');
      balanceToggleBtn.title = hidden ? 'Show balances' : 'Hide balances';
      renderAll();
    });
  }

  /* LOGOUT BUTTON HANDLER */
  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      triggerProcessingOverlay("Terminating Online Session", "Closing secure credentials window...", 1000, () => {
        // Ensure any open overlays are closed when logging out
        try { hideTransactionFailure(); } catch (e) {}
        try { hideReceiptModal(); } catch (e) {}

        appState.auth.loggedIn = false;
        appState.auth.username = "";
        saveStateToStorage();
        applyAuthState();
        showToast("Logged out successfully.");
      });
    });
  }

  /* PORTAL NAV TABS SWITCHER */
  const navItems = document.querySelectorAll('.portal-nav-menu .nav-menu-item');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetView = item.dataset.view;
      switchView(targetView);
    });
  });

  /* QUICK ACTIONS DASHBOARD ROUTING */
  const actionBtns = document.querySelectorAll('.quick-action-card');
  actionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.target;
      if (target) {
        switchView(target);
      }
    });
  });

  /* DYNAMIC TRANSACTIONS SEARCH FILTERS */
  const searchInput = document.getElementById('transaction-search-desktop');
  const categorySelect = document.getElementById('filter-category-select');
  const clearFiltersBtn = document.getElementById('btn-clear-filters');

  if (searchInput && categorySelect) {
    // Month dropdown controls (hidden until a category chip asks for month selection)
    const monthDropdown = document.getElementById('month-dropdown');
    const monthCheckboxList = document.getElementById('month-checkbox-list');
    const applyMonthBtn = document.getElementById('apply-month-filter');
    const closeMonthBtn = document.getElementById('close-month-filter');

    // Build months dynamically from generated transactions
    function buildMonthOptions() {
      monthCheckboxList.innerHTML = '';
      const monthsSet = new Set(appState.transactions.map(t => {
        const d = new Date(t.rawDate);
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      }));
      const monthsArr = Array.from(monthsSet).sort();
      monthsArr.forEach(mk => {
        const lbl = document.createElement('label');
        lbl.style.marginRight = '8px';
        lbl.innerHTML = `<input type="checkbox" name="month-filter" value="${mk}" checked> ${mk}`;
        monthCheckboxList.appendChild(lbl);
      });

      // Attach change listeners to newly created checkboxes
      const monthCheckboxes = monthCheckboxList.querySelectorAll('input[name="month-filter"]');
      monthCheckboxes.forEach(cb => cb.addEventListener('change', handleFiltersChange));
    }

    const getSelectedMonths = () => {
      const monthCheckboxes = document.querySelectorAll('input[name="month-filter"]');
      if (!monthCheckboxes || monthCheckboxes.length === 0) return [];
      return Array.from(monthCheckboxes).filter(cb => cb.checked).map(cb => cb.value);
    };

    const handleFiltersChange = () => {
      renderTransactionsTable(appState.transactions, searchInput.value, categorySelect.value, getSelectedMonths());
    };

    searchInput.addEventListener('input', handleFiltersChange);
    categorySelect.addEventListener('change', handleFiltersChange);

    

    // Category chips (clickable quick filters)
    const categoryChips = document.querySelectorAll('.category-chip');
    if (categoryChips && categoryChips.length) {
      categoryChips.forEach(chip => {
        chip.addEventListener('click', () => {
          // toggle active class
          categoryChips.forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          const catVal = chip.dataset.cat || '';
          categorySelect.value = catVal;
          // If user clicked a non-empty category, show the month dropdown to pick months
          if (catVal) {
            buildMonthOptions();
            monthDropdown.classList.remove('hidden');
          } else {
            // All selected -> hide month dropdown and render all
            monthDropdown.classList.add('hidden');
            handleFiltersChange();
          }
        });
      });
    }

    if (clearFiltersBtn) {
      clearFiltersBtn.addEventListener('click', () => {
        searchInput.value = '';
        categorySelect.value = '';
        // reset: hide month dropdown and render all
        if (monthDropdown) monthDropdown.classList.add('hidden');
        renderTransactionsTable(appState.transactions);
        showToast("Transaction list filters cleared.");
      });
    }

    if (applyMonthBtn) {
      applyMonthBtn.addEventListener('click', () => {
        monthDropdown.classList.add('hidden');
        handleFiltersChange();
      });
    }
    if (closeMonthBtn) {
      closeMonthBtn.addEventListener('click', () => {
        monthDropdown.classList.add('hidden');
      });
    }
  }

  /* DASHBOARD ACCOUNTS ROWS CLICK ROUTING */
  const checkingRow = document.querySelector('.account-row-link[data-account="checking"]');
  const savingsRow = document.querySelector('.account-row-link[data-account="savings"]');

  if (checkingRow) {
    checkingRow.addEventListener('click', () => {
      switchView('transactions');
      if (categorySelect) {
        categorySelect.value = '';
        categorySelect.dispatchEvent(new Event('change'));
      }
    });
  }
  if (savingsRow) {
    savingsRow.addEventListener('click', () => {
      switchView('transactions');
      if (searchInput) {
        searchInput.value = 'Savings';
        searchInput.dispatchEvent(new Event('input'));
      }
    });
  }

  /* FORM ACTION: Transfer Submit */
  const transferForm = document.getElementById('transfer-form');
  if (transferForm) {
    transferForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const transferButton = document.querySelector('#transfer-form button[type="submit"]');
      if (transferButton) transferButton.disabled = true;

      triggerProcessingOverlay("Processing Transfer", "Preparing transfer request and verifying account details...", 4000, () => {
        if (transferButton) transferButton.disabled = false;
        showTransactionFailure();
      });
      return;

      if (appState.card.locked) {
        showToast("Operation Denied: Account Card is Locked.");
        return;
      }

      const fromAcc = document.getElementById('transfer-from-select').value;
      const toAcc = document.getElementById('transfer-to-select').value;
      const amount = parseFloat(document.getElementById('transfer-amount').value);
      const memo = document.getElementById('transfer-memo').value;

      let toName = "";
      if (toAcc === 'savings') toName = "Savings Account";
      else if (toAcc === 'checking') toName = "Checking Account";
      else if (toAcc === 'external-hg') toName = "JACK CAVANAUGH (Personal Checking)";
      else if (toAcc === 'custom') {
        toName = (document.getElementById('custom-recipient-name') || {}).value || "External Recipient";
      }

      // If custom recipient selected, validate name and account number
      if (toAcc === 'custom') {
        const rName = (document.getElementById('custom-recipient-name') || {}).value || '';
        const rAccount = (document.getElementById('custom-recipient-account') || {}).value || '';
        if (!rName.trim()) { showToast('Please enter recipient full name.'); return; }
        if (!rAccount.trim()) { showToast('Please enter recipient account number.'); return; }
      }

      // Validations
      const fromBalance = appState.accounts[fromAcc];
      if (isNaN(amount) || amount <= 0) {
        showInputError('transfer-amount', "Please enter a valid positive amount");
        return;
      }
      if (amount > fromBalance) {
        showInputError('transfer-amount', `Insufficient funds. Available: ${formatUSD(fromBalance)}`);
        return;
      }
      if (fromAcc === toAcc) {
        showInputError('transfer-amount', "Source and destination accounts must be different");
        return;
      }

      clearInputError('transfer-amount');

      // Instead of performing the transfer, show the failure modal immediately
      showTransactionFailure();
      return;
    });

    document.getElementById('transfer-to-select').addEventListener('change', (e) => {
      const customGroup = document.getElementById('custom-recipient-group');
      if (e.target.value === 'custom') {
        customGroup.classList.remove('hidden-field');
        document.getElementById('custom-recipient-name').setAttribute('required', 'true');
        document.getElementById('custom-recipient-account').setAttribute('required', 'true');
      } else {
        customGroup.classList.add('hidden-field');
        document.getElementById('custom-recipient-name').removeAttribute('required');
        document.getElementById('custom-recipient-account').removeAttribute('required');
      }
    });
  }

  /* FORM ACTION: Deposit Submit */
  const depositForm = document.getElementById('deposit-form');
  if (depositForm) {
    depositForm.addEventListener('submit', (e) => {
      e.preventDefault();
      // Block all deposits and show the failure dialog instead of performing any state changes
      showTransactionFailure();
      return;
      const targetAcc = document.getElementById('deposit-to-select').value;
      const amount = parseFloat(document.getElementById('deposit-amount').value);
      const method = (document.getElementById('deposit-method-select') || {}).value || 'check';

      if (amount <= 0) {
        showToast("Please enter a valid deposit amount.");
        return;
      }

      if (method === 'check') {
        // existing simulated check flow
        let currentStep = 0;
        const steps = [
          { title: "Uploading Scans", desc: "Sending check digital images to security server..." },
          { title: "AI Image Verification", desc: "Matching routing digits and check value lines..." },
          { title: "Signatures Verification", desc: "Checking backing endorsements endorsement status..." },
          { title: "Finalizing Credits", desc: "Clearing check logs and updating account balance..." }
        ];

        const overlay = document.getElementById('global-processing-overlay');
        const titleEl = document.getElementById('processing-title');
        const descEl = document.getElementById('processing-desc');

        overlay.classList.add('active');

        function runNextStep() {
          if (currentStep < steps.length) {
            titleEl.textContent = steps[currentStep].title;
            descEl.textContent = steps[currentStep].desc;
            currentStep++;
            setTimeout(runNextStep, 800);
          } else {
            overlay.classList.remove('active');
            appState.accounts[targetAcc] += amount;

            const newTx = {
              id: `TXN-${Math.floor(100000000000 + Math.random() * 900000000000)}`,
              title: "Deposit",
              category: "check",
              date: getRelativeDateString(0, getCurrentTimeFormatted()),
              rawDate: new Date().toISOString(),
              amount: amount,
              type: "credit",
              status: 'completed',
              balanceAfter: appState.accounts[targetAcc],
              account: targetAcc
            };

            appState.transactions.unshift(newTx);
            saveStateToStorage();
            renderAll();
            switchView('home');
            showToast(`Deposit of ${formatUSD(amount)} has been cleared.`);

            depositForm.reset();
            resetCheckUploadBoxes();
          }
        }
        runNextStep();
      } else if (method === 'ach') {
        // ACH: create a pending transaction, simulate clearance after a short delay
        const now = new Date();
        const availDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // +3 days
        const availStr = availDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

        const pendingTx = {
          id: `TXN-${Math.floor(100000000000 + Math.random() * 900000000000)}`,
          title: "ACH Deposit",
          category: "ach",
          date: getRelativeDateString(0, getCurrentTimeFormatted()),
          rawDate: new Date().toISOString(),
          amount: amount,
          type: "credit",
          status: 'pending',
          availableDate: availStr,
          balanceAfter: appState.accounts[targetAcc],
          account: targetAcc
        };

        appState.transactions.unshift(pendingTx);
        saveStateToStorage();
        renderAll();
        switchView('home');
        showToast(`ACH deposit of ${formatUSD(amount)} is pending and will be available on ${availStr}.`);

        // Simulate clearance after a short timeout (e.g., 3s -> 3 days in real world)
        setTimeout(() => {
          appState.accounts[targetAcc] += amount;
          // find tx and mark complete
          const tx = appState.transactions.find(t => t.id === pendingTx.id);
          if (tx) {
            tx.status = 'completed';
            tx.balanceAfter = appState.accounts[targetAcc];
          }
          saveStateToStorage();
          renderAll();
          showToast(`ACH deposit of ${formatUSD(amount)} has cleared.`);
        }, ACH_CLEAR_DELAY_MS);

        depositForm.reset();
      } else {
        // Cash deposit: immediate credit
        triggerProcessingOverlay('Processing Cash Deposit', 'Finalizing in-branch cash deposit...', 800, () => {
          appState.accounts[targetAcc] += amount;

          const newTx = {
            id: `TXN-${Math.floor(100000000000 + Math.random() * 900000000000)}`,
            title: "Cash Deposit",
            category: "cash",
            date: getRelativeDateString(0, getCurrentTimeFormatted()),
            rawDate: new Date().toISOString(),
            amount: amount,
            type: "credit",
            status: 'completed',
            balanceAfter: appState.accounts[targetAcc],
            account: targetAcc
          };

          appState.transactions.unshift(newTx);
          saveStateToStorage();
          renderAll();
          switchView('home');
          showToast(`Cash deposit of ${formatUSD(amount)} completed.`);

          depositForm.reset();
        });
      }
    });

    setupCheckUploadListeners();
  }

  /* CARD INTERACTIVITY: Reveal Credentials */
  const revealBtn = document.getElementById('btn-reveal-card');
  if (revealBtn) {
    revealBtn.addEventListener('click', () => {
      appState.card.revealed = !appState.card.revealed;
      renderAll();
    });
  }

  /* CARD INTERACTIVITY: Lock Card Checkbox */
  const cardLockCheck = document.getElementById('card-lock-checkbox');
  if (cardLockCheck) {
    cardLockCheck.addEventListener('change', (e) => {
      // Card is permanently locked - prevent unfreezing
      if (!e.target.checked) {
        // User tried to unfreeze - show spinner and then error message
        e.target.checked = true; // Keep checkbox checked
        triggerProcessingOverlay(
          "Processing",
          "Attempting to unfreeze card...",
          2500,
          () => {
            showToast("Sorry, we are unable to unfreeze your card at this moment, Please contact the bank for further assistance");
          }
        );
        return;
      }
      // Card is already locked, no change needed
      appState.card.locked = true;
      saveStateToStorage();
    });
  }

  /* CARD INTERACTIVITY: Spending Limit Slider */
  const limitRange = document.getElementById('card-limit-range');
  if (limitRange) {
    limitRange.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      document.getElementById('card-limit-val').textContent = formatUSD(val);
    });

    limitRange.addEventListener('change', (e) => {
      appState.card.limit = parseInt(e.target.value);
      saveStateToStorage();
      showToast(`Daily credit spend limit updated to ${formatUSD(appState.card.limit)}`);
    });
  }

  /* CARD INTERACTIVITY: Save PIN */
  const changePinBtn = document.getElementById('btn-change-pin');
  if (changePinBtn) {
    changePinBtn.addEventListener('click', () => {
      const pinNew = document.getElementById('pin-new').value;
      const pinConf = document.getElementById('pin-confirm').value;
      const msgEl = document.getElementById('pin-status-message');

      if (pinNew.length !== 4 || pinConf.length !== 4 || isNaN(pinNew) || isNaN(pinConf)) {
        msgEl.textContent = "Error: PIN must be exactly 4 digits.";
        msgEl.style.color = "var(--danger)";
        return;
      }

      if (pinNew !== pinConf) {
        msgEl.textContent = "Error: Passcodes do not match.";
        msgEl.style.color = "var(--danger)";
        return;
      }

      appState.card.pin = pinNew;
      saveStateToStorage();
      msgEl.textContent = "Passcode PIN changed successfully!";
      msgEl.style.color = "var(--success)";

      document.getElementById('pin-new').value = '';
      document.getElementById('pin-confirm').value = '';
      setTimeout(() => { msgEl.textContent = ''; }, 3000);
    });
  }

  /* PROFILE SETTINGS: Save Contact Form */
  const profileForm = document.getElementById('profile-form');
  if (profileForm) {
    profileForm.addEventListener('submit', (e) => {
      e.preventDefault();
      // First/Last name are permanent and must not be changed via the profile form.
      appState.profile.phone = document.getElementById('profile-phone').value;
      appState.profile.email = document.getElementById('profile-email').value;

      saveStateToStorage();
      renderAll();
      showToast("Profile contact info saved successfully.");
      switchView('home');
    });
  }

  /* PROFILE SETTINGS: Toggle Theme */
  const themeBtn = document.getElementById('btn-toggle-dark-mode');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      appState.darkMode = !appState.darkMode;
      saveStateToStorage();
      applyTheme();
      showToast(`Theme changed to ${appState.darkMode ? 'Dark' : 'Light'} Mode.`);
    });
  }

  /* MODAL RECEIPT CLOSE */
  const closeReceiptBtn = document.getElementById('btn-close-receipt');
  if (closeReceiptBtn) {
    closeReceiptBtn.addEventListener('click', hideReceiptModal);
  }
  
  const receiptOverlay = document.getElementById('receipt-modal-overlay');
  if (receiptOverlay) {
    receiptOverlay.addEventListener('click', (e) => {
      if (e.target.id === 'receipt-modal-overlay') hideReceiptModal();
    });
  }

  const printReceiptBtn = document.getElementById('btn-print-receipt');
  if (printReceiptBtn) {
    printReceiptBtn.addEventListener('click', () => {
      alert("Transferring receipt layout to printer nodes...");
    });
  }

  // Transaction failure modal close handlers
  const closeTxnFailureBtn = document.getElementById('btn-close-txn-failure');
  if (closeTxnFailureBtn) {
    closeTxnFailureBtn.addEventListener('click', hideTransactionFailure);
  }
  const txnFailureOverlay = document.getElementById('txn-failure-modal-overlay');
  if (txnFailureOverlay) {
    txnFailureOverlay.addEventListener('click', (e) => {
      if (e.target.id === 'txn-failure-modal-overlay') hideTransactionFailure();
    });
  }

  /* INFO LINKS: Open informational modal for privacy, help, contact etc. */
  const INFO_CONTENT = {
    'locations': {
      title: 'Locations',
      body: '<p>Find nearby branches and ATMs by entering your city or ZIP code.</p><p>For demo purposes, this is placeholder content.</p>'
    },
    'contact': {
      title: 'Contact Us',
      body: '<p>Call us at 1-800-000-0000 or email support@example.com.</p><p>Office hours: Mon-Fri 8am-8pm ET.</p>'
    },
    'help': {
      title: 'Help',
      body: '<p>Visit our help center for FAQs, tutorials, and troubleshooting guides.</p>'
    },
    'security-center': {
      title: 'Security Center',
      body: '<p>Learn about account protection, fraud prevention, and secure login options.</p>'
    },
    'privacy': {
      title: 'Privacy',
      body: '<p>We respect your privacy. This demo does not collect personal information.</p>'
    },
    'security': {
      title: 'Security',
      body: '<p>Security policies and practices for protecting your account.</p>'
    },
    'terms': {
      title: 'Terms & Conditions',
      body: '<p>Standard terms and conditions apply to the use of this demo portal.</p>'
    },
    'advertising': {
      title: 'Advertising Practices',
      body: '<p>Advertising and marketing practices overview.</p>'
    }
  };

  const infoLinks = document.querySelectorAll('.info-link');
  const infoOverlay = document.getElementById('info-modal-overlay');
  const infoTitle = document.getElementById('info-modal-title');
  const infoBody = document.getElementById('info-modal-body');
  const infoSub = document.getElementById('info-modal-sub');

  if (infoLinks && infoOverlay) {
    infoLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const topic = link.dataset.topic;
        const content = INFO_CONTENT[topic] || { title: 'Info', body: '<p>Information not found.</p>' };
        if (infoTitle) infoTitle.textContent = content.title;
        if (infoSub) infoSub.textContent = '';
        if (infoBody) infoBody.innerHTML = content.body;
        infoOverlay.style.display = 'flex';
        setTimeout(() => { infoOverlay.classList.add('active'); }, 10);
      });
    });

    // Close handlers
    const closeInfoBtn = document.getElementById('btn-close-info');
    if (closeInfoBtn) closeInfoBtn.addEventListener('click', () => {
      infoOverlay.classList.remove('active');
      setTimeout(() => { infoOverlay.style.display = 'none'; }, 300);
    });

    infoOverlay.addEventListener('click', (e) => {
      if (e.target.id === 'info-modal-overlay') {
        infoOverlay.classList.remove('active');
        setTimeout(() => { infoOverlay.style.display = 'none'; }, 300);
      }
    });
  }
}

// Router to slide/fade portal active section views
function switchView(viewName) {
  const views = document.querySelectorAll('.portal-main-content .portal-view');
  const navTabs = document.querySelectorAll('.portal-nav-menu .nav-menu-item');

  // Update navbar items active indicators
  navTabs.forEach(tab => {
    if (tab.dataset.view === viewName) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });

  const currentActive = document.querySelector('.portal-main-content .portal-view.active');
  const targetView = document.getElementById(`view-${viewName}`);

  if (!targetView) return;

  if (currentActive && currentActive.id !== `view-${viewName}`) {
    currentActive.style.opacity = '0';
    currentActive.style.transform = 'translateY(10px)';
    
    setTimeout(() => {
      currentActive.classList.remove('active');
      targetView.classList.add('active');
      
      targetView.offsetWidth; // Force reflow
      
      targetView.style.opacity = '1';
      targetView.style.transform = 'translateY(0)';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 200);
  } else if (!currentActive) {
    targetView.classList.add('active');
    targetView.style.opacity = '1';
    targetView.style.transform = 'translateY(0)';
  }
}

/* ==========================================================================
   INTERACTIVE RECEIPT MODAL & NOTIFICATIONS
   ========================================================================== */

// Helper to get present HH:MM AM/PM structure
function getCurrentTimeFormatted() {
  const now = new Date();
  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${ampm}`;
}

// Show validation field error messages
function showInputError(inputId, msg) {
  const el = document.getElementById(`${inputId}-error`);
  if (el) el.textContent = msg;
}

function clearInputError(inputId) {
  const el = document.getElementById(`${inputId}-error`);
  if (el) el.textContent = '';
}

// Display receipt detailed overlay
function showTransactionReceipt(tx) {
  const overlay = document.getElementById('receipt-modal-overlay');
  const iconBox = document.getElementById('receipt-icon-box');
  
  if (!overlay || !iconBox) return;

  // Set Icon matching list style
  let iconBgClass = 'transfer-bg';
  let iconSvg = '';
  if (tx.category === 'payroll' || tx.type === 'credit') {
    iconBgClass = 'deposit-bg';
    iconSvg = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>`;
  } else if (tx.category === 'card') {
    iconBgClass = 'pay-bg';
    iconSvg = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="2" y="5" width="20" height="14" rx="2" ry="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>`;
  } else {
    iconBgClass = 'transfer-bg';
    iconSvg = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>`;
  }

  iconBox.className = `receipt-icon-wrapper ${iconBgClass}`;
  iconBox.innerHTML = iconSvg;

  // Set amounts
  const amountPrefix = tx.type === 'credit' ? '+' : '';
  const amountVal = document.getElementById('receipt-amount-val');
  if (amountVal) {
    amountVal.textContent = `${amountPrefix}${formatUSD(tx.amount)}`;
    amountVal.className = `receipt-amount ${tx.type === 'credit' ? 'amt-plus' : 'amt-debit'}`;
  }

  // Populate data
  document.getElementById('receipt-title').textContent = tx.title;
  document.getElementById('receipt-date-val').textContent = tx.date;
  document.getElementById('receipt-id-val').textContent = tx.id;
  document.getElementById('receipt-account-val').textContent = `${tx.account.charAt(0).toUpperCase() + tx.account.slice(1)} Account (•••• 2287)`;
  document.getElementById('receipt-balance-val').textContent = formatUSD(tx.balanceAfter);

  // Status badge (pending/completed) and availability
  const statusBadge = document.querySelector('.receipt-badge');
  if (statusBadge) {
    if (tx.status === 'pending') {
      const availText = tx.availableDate ? ` · Available ${tx.availableDate}` : '';
      statusBadge.textContent = `Pending${availText}`;
      statusBadge.className = 'receipt-badge status-pending';
    } else {
      statusBadge.textContent = 'Completed';
      statusBadge.className = 'receipt-badge status-completed';
    }
  }

  // Counterparty display (From for credits, To for debits)
  const cpLabel = document.getElementById('receipt-counterparty-label');
  const cpVal = document.getElementById('receipt-counterparty-val');
  if (cpLabel && cpVal) {
    cpLabel.textContent = tx.type === 'credit' ? 'From' : 'To';
    cpVal.textContent = tx.counterpartyName || (tx.type === 'credit' ? 'Unknown Sender' : 'Unknown Recipient');
  }

  overlay.style.display = 'flex';
  setTimeout(() => { overlay.classList.add('active'); }, 10);
}

function hideReceiptModal() {
  const overlay = document.getElementById('receipt-modal-overlay');
  if (overlay) {
    overlay.classList.remove('active');
    setTimeout(() => { overlay.style.display = 'none'; }, 300);
  }
}

// Display transaction failure modal with provided message
function showTransactionFailure(customMessage) {
  const overlay = document.getElementById('txn-failure-modal-overlay');
  const titleEl = document.getElementById('txn-failure-title');
  const msgEl = document.getElementById('txn-failure-message');
  const iconBox = document.getElementById('txn-failure-icon');
  if (!overlay) return;
  if (titleEl) titleEl.textContent = 'sorry!';
  const defaultMsg = "Sorry! Due to a technical issue, we can't complete this transaction at the moment. We apologize for this, as we try our best to sort this issue. Do try again in some time. Your CAF request has been Failed.";
  if (msgEl) msgEl.textContent = customMessage || defaultMsg;
  if (iconBox) {
    // keep the SVG already in markup; ensure class for styling
    iconBox.classList.add('pay-bg');
  }
  overlay.style.display = 'flex';
  setTimeout(() => { overlay.classList.add('active'); }, 10);
}

function hideTransactionFailure() {
  const overlay = document.getElementById('txn-failure-modal-overlay');
  if (overlay) {
    overlay.classList.remove('active');
    setTimeout(() => { overlay.style.display = 'none'; }, 300);
  }
}

// Processing spinner screen controller
function triggerProcessingOverlay(title, desc, duration, onComplete) {
  const overlay = document.getElementById('global-processing-overlay');
  const titleEl = document.getElementById('processing-title');
  const descEl = document.getElementById('processing-desc');

  if (!overlay) return;

  if (titleEl) titleEl.textContent = title;
  if (descEl) descEl.textContent = desc;

  overlay.classList.add('active');
  setTimeout(() => {
    overlay.classList.remove('active');
    if (onComplete) onComplete();
  }, duration);
}

// Custom Toast notification banner
let toastTimeout;
function showToast(msg) {
  const toast = document.getElementById('global-toast');
  const msgVal = document.getElementById('toast-message-val');
  
  if (!toast || !msgVal) return;

  msgVal.textContent = msg;

  clearTimeout(toastTimeout);
  toast.classList.add('active');

  toastTimeout = setTimeout(() => {
    toast.classList.remove('active');
  }, 3000);
}

/* ==========================================================================
   UI MOCK SIMULATORS
   ========================================================================== */

// Check Drag/Drop file input events
function setupCheckUploadListeners() {
  const frontInput = document.getElementById('check-front-input');
  const backInput = document.getElementById('check-back-input');

  if (frontInput) frontInput.addEventListener('change', (e) => handleCheckUpload(e, 'front'));
  if (backInput) backInput.addEventListener('change', (e) => handleCheckUpload(e, 'back'));

  // Canvas clicks simulate capture if inputs empty
  const frontBox = document.getElementById('check-front-box');
  const backBox = document.getElementById('check-back-box');

  if (frontBox) {
    frontBox.addEventListener('click', (e) => {
      if (e.target.type !== 'file') simulateCheckImage('front');
    });
  }
  if (backBox) {
    backBox.addEventListener('click', (e) => {
      if (e.target.type !== 'file') simulateCheckImage('back');
    });
  }
}

function handleCheckUpload(e, face) {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(event) {
      const box = document.getElementById(`check-${face}-box`);
      const preview = box.querySelector('.upload-preview');
      const placeholder = box.querySelector('.upload-placeholder');

      preview.style.backgroundImage = `url(${event.target.result})`;
      preview.classList.remove('hidden');
      placeholder.classList.add('hidden');
    };
    reader.readAsDataURL(file);
  }
}

// Draw a mock Canvas representation of check to simulate scanning visual feedback
function simulateCheckImage(face) {
  const box = document.getElementById(`check-${face}-box`);
  if (!box) return;

  const preview = box.querySelector('.upload-preview');
  const placeholder = box.querySelector('.upload-placeholder');

  const canvas = document.createElement('canvas');
  canvas.width = 300;
  canvas.height = 120;
  const ctx = canvas.getContext('2d');

  // Check background
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 300, 120);
  
  // Security borders
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, 292, 112);

  // Micro print check details
  ctx.fillStyle = '#64748b';
  ctx.font = '10px monospace';
  ctx.fillText("BANK OF AMERICA SECURITY CHECK", 14, 24);
  
  ctx.font = '8px Courier New';
  ctx.fillText("Memo: Mobile Deposit", 14, 100);
  ctx.fillText("⑆123456789⑆ 987654321⑈ 2287", 60, 100);

  if (face === 'front') {
  // Check Value fields
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText("DAVID ALTON MOON", 14, 45);
    
    ctx.font = '14px sans-serif';
    ctx.fillText("$  [ Amount Entered ]", 170, 45);

    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(14, 75);
    ctx.lineTo(286, 75);
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = 'italic 10px sans-serif';
    ctx.fillText("Authorized Signature", 180, 88);
  } else {
    // Endorsement line
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(40, 20);
    ctx.lineTo(40, 100);
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = '9px sans-serif';
    
    // Rotate text vertical
    ctx.save();
    ctx.translate(32, 60);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("ENDORSE HERE", -35, 0);
    ctx.restore();

    ctx.font = 'italic 11px Courier New';
    ctx.fillStyle = '#1e3a8a';
    ctx.save();
    ctx.translate(52, 60);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("DAVID ALTON MOON", -45, 0);
    ctx.fillText("For Mobile Deposit Only", -55, 12);
    ctx.restore();
  }

  // Set as background
  preview.style.backgroundImage = `url(${canvas.toDataURL()})`;
  preview.classList.remove('hidden');
  placeholder.classList.add('hidden');
  showToast(`Simulated check ${face} image upload.`);
}

function resetCheckUploadBoxes() {
  ['front', 'back'].forEach(face => {
    const box = document.getElementById(`check-${face}-box`);
    if (box) {
      box.querySelector('.upload-preview').classList.add('hidden');
      box.querySelector('.upload-placeholder').classList.remove('hidden');
    }
  });
}

// 3D Credit Card Mouse Hover Physics
function initCardPhysics() {
  const card = document.getElementById('physical-card');
  const wrapper = document.querySelector('.card-3d-wrapper');

  if (!card || !wrapper) return;

  wrapper.addEventListener('mousemove', (e) => {
    if (appState.card.locked) return; // Disable hover tilts if card is frozen

    const rect = wrapper.getBoundingClientRect();
    const x = e.clientX - rect.left; // x position within wrapper
    const y = e.clientY - rect.top;  // y position within wrapper

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateY = ((x - centerX) / centerX) * 16;
    const rotateX = ((centerY - y) / centerY) * 16;

    card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
  });

  wrapper.addEventListener('mouseleave', () => {
    card.style.transform = 'rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
  });
}
