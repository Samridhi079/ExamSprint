import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useOfflineSync } from '../context/OfflineSyncContext';
import { apiRequest } from '../services/apiClient';
import { queueOfflineAction } from '../db/indexedDb';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import {
  CreditCard,
  CheckCircle,
  FileText,
  DollarSign,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  QrCode,
  Sparkles,
  ShieldCheck
} from 'lucide-react';

export default function PaymentsLedger() {
  const { activeSociety, user } = useAuth();
  const { networkMode, refreshPendingCount } = useOfflineSync();
  const [dues, setDues] = useState([]);
  const [ledgerData, setLedgerData] = useState({ entries: [], summary: {} });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dues'); // 'dues' | 'ledger'

  // Digital Ticket Modal
  const [activeTicket, setActiveTicket] = useState(null);

  // Expense Modal
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('EQUIPMENT');

  const loadData = async () => {
    if (!activeSociety) return;
    try {
      setLoading(true);
      const [duesRes, ledgerRes] = await Promise.all([
        apiRequest(`/api/payments/${activeSociety.id}/dues`),
        apiRequest(`/api/payments/${activeSociety.id}/ledger`)
      ]);
      setDues(duesRes.dues || []);
      setLedgerData(ledgerRes);
    } catch (e) {
      console.warn('Could not load payments data:', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeSociety, networkMode]);

  // Handle Dues Payment (Razorpay Test Mode / Instant Simulation)
  const handlePayDue = async (due) => {
    const offlineIntentId = 'pay_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

    const body = {
      due_id: due.id,
      society_id: activeSociety.id,
      amount_paise: due.amount_paise,
      payment_method: 'RAZORPAY_TEST',
      offline_intent_id: offlineIntentId
    };

    if (networkMode === 'OFFLINE') {
      await queueOfflineAction('PAY_DUES', '/api/payments/checkout', 'POST', body);
      await refreshPendingCount();

      // Show offline ticket
      setActiveTicket({
        title: due.title,
        amount: `₹${(due.amount_paise / 100).toFixed(2)}`,
        txRef: 'OFFLINE_QUEUED_' + offlineIntentId.slice(-6).toUpperCase(),
        qrPayload: `CC-TICKET:OFFLINE:${due.id}:${user?.id}:${due.amount_paise}`,
        isOfflineQueued: true
      });
      confetti({ particleCount: 60, spread: 60 });
    } else {
      try {
        const res = await apiRequest('/api/payments/checkout', {
          method: 'POST',
          body: JSON.stringify(body)
        });

        setActiveTicket({
          title: due.title,
          amount: res.amountFormatted,
          txRef: res.transactionRef,
          qrPayload: res.ticketQrPayload,
          isOfflineQueued: false
        });

        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        loadData();
      } catch (err) {
        alert(`Payment error: ${err.message}`);
      }
    }
  };

  // Add Expense to Ledger
  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!expenseDesc.trim() || !expenseAmount || !activeSociety) return;

    try {
      const amountPaise = Math.round(parseFloat(expenseAmount) * 100);
      await apiRequest(`/api/payments/${activeSociety.id}/ledger/expense`, {
        method: 'POST',
        body: JSON.stringify({
          category: expenseCategory,
          amount_paise: amountPaise,
          description: expenseDesc.trim()
        })
      });
      setShowExpenseModal(false);
      setExpenseDesc('');
      setExpenseAmount('');
      loadData();
    } catch (err) {
      alert(`Could not add expense: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Switcher */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <CreditCard size={20} className="text-blue-400" /> Society Payments & Public Ledger
          </h2>
          <p className="text-xs text-slate-400">
            Dues with signed QR receipts and an append-only transparent club treasury ledger.
          </p>
        </div>

        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('dues')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              activeTab === 'dues' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Membership Dues
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              activeTab === 'ledger' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Public Ledger
          </button>
        </div>
      </div>

      {activeTab === 'dues' ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {dues.map((due) => {
              const isPaid = due.payment_status === 'SUCCESS';
              const formattedAmt = `₹${(due.amount_paise / 100).toFixed(2)}`;

              return (
                <div key={due.id} className="card-glass p-5 border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="font-bold text-slate-100 text-base">{due.title}</h3>
                      <span className="text-lg font-mono font-extrabold text-blue-400">
                        {formattedAmt}
                      </span>
                    </div>

                    <div className="text-xs text-slate-400 mb-4 space-y-1">
                      <div>Due Date: {new Date(due.due_date).toLocaleDateString()}</div>
                      <div className="text-emerald-400 font-medium">
                        Payment rewards: <span className="font-bold">+25 Activity Points</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    {isPaid ? (
                      <div className="flex items-center gap-2">
                        <span className="badge-pill badge-active text-[10px]">
                          <CheckCircle size={11} /> Paid
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          Ref: {due.transaction_ref}
                        </span>
                      </div>
                    ) : (
                      <span className="badge-pill badge-at-risk text-[10px]">Pending</span>
                    )}

                    {!isPaid ? (
                      <button
                        onClick={() => handlePayDue(due)}
                        className="btn-primary !text-xs !py-1.5 !px-3"
                      >
                        Pay Now ({formattedAmt})
                      </button>
                    ) : (
                      <button
                        onClick={() =>
                          setActiveTicket({
                            title: due.title,
                            amount: formattedAmt,
                            txRef: due.transaction_ref,
                            qrPayload: `CC-TICKET:${due.id}:${user?.id}:${due.amount_paise}`
                          })
                        }
                        className="btn-secondary !text-xs !py-1 !px-2.5 flex items-center gap-1"
                      >
                        <QrCode size={12} /> View Ticket
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* PUBLIC TRANSPARENT LEDGER TAB */
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card-glass p-4 border-slate-800">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                <ArrowDownLeft size={14} className="text-emerald-400" /> Total Inflow (Credits)
              </span>
              <div className="text-2xl font-bold font-mono text-emerald-400 mt-2">
                ₹{((ledgerData.summary.totalCreditsPaise || 0) / 100).toFixed(2)}
              </div>
            </div>

            <div className="card-glass p-4 border-slate-800">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                <ArrowUpRight size={14} className="text-rose-400" /> Total Outflow (Expenses)
              </span>
              <div className="text-2xl font-bold font-mono text-rose-400 mt-2">
                ₹{((ledgerData.summary.totalDebitsPaise || 0) / 100).toFixed(2)}
              </div>
            </div>

            <div className="card-glass p-4 border-slate-800">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                <DollarSign size={14} className="text-blue-400" /> Current Treasury Balance
              </span>
              <div className="text-2xl font-bold font-mono text-blue-400 mt-2">
                {ledgerData.summary.balanceFormatted || '₹0.00'}
              </div>
            </div>
          </div>

          {/* Action to add expense */}
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
              <FileText size={16} className="text-blue-400" /> Append-Only Transaction Log
            </h3>

            <button
              onClick={() => setShowExpenseModal(true)}
              className="btn-secondary !text-xs !py-1.5 !px-3 flex items-center gap-1"
            >
              <Plus size={13} /> Record Expense
            </button>
          </div>

          {/* Ledger Table */}
          <div className="card-glass p-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="pb-2">Type</th>
                    <th className="pb-2">Category</th>
                    <th className="pb-2">Description</th>
                    <th className="pb-2">Amount</th>
                    <th className="pb-2">Authorized By</th>
                    <th className="pb-2">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {ledgerData.entries.map((entry) => {
                    const isCredit = entry.entry_type === 'CREDIT';
                    return (
                      <tr key={entry.id} className="text-slate-300">
                        <td className="py-2.5">
                          <span
                            className={`badge-pill text-[9px] ${
                              isCredit
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            }`}
                          >
                            {entry.entry_type}
                          </span>
                        </td>
                        <td className="py-2.5 font-semibold text-slate-200">{entry.category}</td>
                        <td className="py-2.5 text-slate-300 max-w-xs">{entry.description}</td>
                        <td
                          className={`py-2.5 font-mono font-bold ${
                            isCredit ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isCredit ? '+' : '-'}₹{(entry.amount_paise / 100).toFixed(2)}
                        </td>
                        <td className="py-2.5 text-slate-400">{entry.created_by}</td>
                        <td className="py-2.5 text-slate-500 text-[11px] font-mono">
                          {new Date(entry.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* DIGITAL SIGNED TICKET MODAL */}
      {activeTicket && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-blue-500/40 rounded-2xl w-full max-w-sm p-6 shadow-2xl text-center">
            <div className="flex items-center justify-between mb-3">
              <span className="badge-pill bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px]">
                <ShieldCheck size={12} /> Verified Receipt
              </span>
              <button
                onClick={() => setActiveTicket(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <h3 className="text-base font-bold text-white mb-1">{activeTicket.title}</h3>
            <p className="text-xl font-extrabold font-mono text-emerald-400 mb-4">
              {activeTicket.amount}
            </p>

            <div className="bg-white p-3 rounded-2xl inline-block shadow-inner mb-3">
              <QRCodeSVG value={activeTicket.qrPayload} size={180} level="M" />
            </div>

            <div className="text-[11px] text-slate-400 space-y-1 mb-4 bg-slate-800 p-2.5 rounded-xl border border-slate-700">
              <div className="font-mono text-slate-300">Ref: {activeTicket.txRef}</div>
              <div className="text-emerald-400">Status: Verified & Synced</div>
            </div>

            <button
              onClick={() => setActiveTicket(null)}
              className="btn-secondary w-full text-xs justify-center"
            >
              Close Ticket
            </button>
          </div>
        </div>
      )}

      {/* RECORD EXPENSE MODAL */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">Record Society Expense</h3>
            <p className="text-xs text-slate-400 mb-4">
              Appends a debit entry to the transparent society treasury ledger.
            </p>

            <form onSubmit={handleAddExpense} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Expense Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bought 3 ESP32 boards & cables for workshop"
                  value={expenseDesc}
                  onChange={(e) => setExpenseDesc(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white placeholder-slate-500 outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Category</label>
                  <select
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white outline-none focus:border-blue-500"
                  >
                    <option value="EQUIPMENT">Equipment & Hardware</option>
                    <option value="REFRESHMENTS">Refreshments</option>
                    <option value="PRINTING">Printing / Posters</option>
                    <option value="PRIZES">Prizes & Swag</option>
                    <option value="SERVER">Cloud & Hosting</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 450.00"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white font-mono outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary text-xs">
                  Save to Public Ledger
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
