"use strict";

const pool = require("../config/database");
const accountingService = {
  /**
   * Get all journal entries for a tenant
   */
  getJournalEntries: async (user, companyIdParam) => {
    const companyId = resolveCompanyContext(user, companyIdParam);

    if (!companyId) {
      throw new Error("Company context is required");
    }

    try {
      const [headers] = await pool.execute(
        `SELECT
          je.journal_entry_id,
          je.journal_number,
          je.journal_type,
          je.entry_date,
          je.reference,
          je.memo,
          je.created_at,
          u.user_id,
          CONCAT(u.first_name, ' ', u.last_name) AS created_by_name,
          COALESCE(SUM(jel.debit_amount), 0) AS total_debit,
          COALESCE(SUM(jel.credit_amount), 0) AS total_credit
         FROM journal_entries je
         LEFT JOIN users u ON je.created_by = u.user_id
         LEFT JOIN journal_entry_lines jel ON je.journal_entry_id = jel.journal_entry_id
         WHERE je.company_id = :companyId
         GROUP BY je.journal_entry_id
         ORDER BY je.entry_date DESC, je.created_at DESC`,
        { companyId },
      );

      const [lineRows] = await pool.execute(
        `SELECT
          jel.journal_entry_line_id,
          jel.journal_entry_id,
          jel.account_id,
          jel.debit_amount,
          jel.credit_amount,
          coa.account_code,
          coa.name AS account_name
         FROM journal_entry_lines jel
         LEFT JOIN chart_of_accounts coa ON coa.account_id = jel.account_id
         WHERE jel.journal_entry_id IN (
           SELECT journal_entry_id FROM journal_entries WHERE company_id = :companyId
         )
         ORDER BY jel.journal_entry_id, jel.journal_entry_line_id`,
        { companyId },
      );

      const linesByEntry = (lineRows || []).reduce((acc, row) => {
        const id = row.journal_entry_id;
        if (!acc[id]) acc[id] = [];
        acc[id].push({
          journal_entry_line_id: row.journal_entry_line_id,
          account_id: row.account_id,
          account_code: row.account_code,
          account_name: row.account_name,
          debit_amount: Number(row.debit_amount) || 0,
          credit_amount: Number(row.credit_amount) || 0,
        });
        return acc;
      }, {});

      const result = (headers || []).map((row) => ({
        journal_entry_id: row.journal_entry_id,
        journal_number: row.journal_number,
        journal_type: row.journal_type,
        entry_date: row.entry_date,
        reference: row.reference,
        memo: row.memo,
        created_at: row.created_at,
        user_id: row.user_id,
        created_by_name: row.created_by_name,
        total_debit: Number(row.total_debit) || 0,
        total_credit: Number(row.total_credit) || 0,
        lines: linesByEntry[row.journal_entry_id] || [],
      }));
      return result;
    } catch (err) {
      if (isMissingTableError(err)) {
        console.warn("[accounting] journal_entries table missing");
        return [];
      }
      throw err;
    }
  },

  /**
   * Create a journal entry and its lines
   */
  createJournalEntry: async (user, data) => {
    const companyId = resolveCompanyContext(user, data.company_id);
    if (!companyId) throw new Error("Company context is required");

    const journalNumber = (data.reference && String(data.reference).trim()) || null;
    if (!journalNumber) throw new Error("Reference is required");

    const journalType = (data.journal_type === "manual" ? "general" : data.journal_type) || "general";
    const entryDate = data.entry_date || new Date().toISOString().slice(0, 10);
    const memo = data.memo ? String(data.memo).trim() : null;
    const lines = Array.isArray(data.lines) ? data.lines : [];
    if (lines.length === 0) throw new Error("At least one entry line is required");

    // Ensure journal_number is unique for this company
    const [existing] = await pool.execute(
      "SELECT 1 FROM journal_entries WHERE company_id = :companyId AND journal_number = :journalNumber LIMIT 1",
      { companyId, journalNumber }
    );
    if (existing.length > 0) throw new Error(`Reference "${journalNumber}" is already used. Please use a different reference.`);

    const [insertHeader] = await pool.execute(
      `INSERT INTO journal_entries (company_id, journal_number, journal_type, entry_date, reference, memo, created_by)
       VALUES (:company_id, :journal_number, :journal_type, :entry_date, :reference, :memo, :created_by)`,
      {
        company_id: companyId,
        journal_number: journalNumber,
        journal_type: journalType,
        entry_date: entryDate,
        reference: journalNumber,
        memo,
        created_by: user?.user_id || null,
      }
    );
    const journalEntryId = insertHeader.insertId;
    let linesInserted = 0;

    for (const line of lines) {
      const rawAccountId = line.account_id;
      if (rawAccountId == null || String(rawAccountId).startsWith("bank_")) continue;
      const accountId = Number(rawAccountId);
      if (!Number.isInteger(accountId) || accountId <= 0) continue;
      const debit = Number(line.debit_amount) || 0;
      const credit = Number(line.credit_amount) || 0;
      if (debit === 0 && credit === 0) continue;

      await pool.execute(
        `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit_amount, credit_amount)
         VALUES (:journal_entry_id, :account_id, :debit_amount, :credit_amount)`,
        {
          journal_entry_id: journalEntryId,
          account_id: accountId,
          debit_amount: debit,
          credit_amount: credit,
        }
      );
      linesInserted += 1;
    }

    if (linesInserted === 0) throw new Error("At least one valid entry line (Chart of Accounts) is required.");

    const [created] = await pool.execute(
      `SELECT
          je.journal_entry_id,
          je.journal_number,
          je.journal_type,
          je.entry_date,
          je.reference,
          je.memo,
          je.created_at,
          je.created_by,
          COALESCE(SUM(jel.debit_amount), 0) AS total_debit,
          COALESCE(SUM(jel.credit_amount), 0) AS total_credit
       FROM journal_entries je
       LEFT JOIN journal_entry_lines jel ON je.journal_entry_id = jel.journal_entry_id
       WHERE je.journal_entry_id = :id
       GROUP BY je.journal_entry_id`,
      { id: journalEntryId }
    );
    return created[0];
  },

  /**
   * Get chart of accounts for a tenant
   */
  getChartOfAccounts: async (user, companyIdParam) => {
    const companyId = resolveCompanyContext(user, companyIdParam);

    if (!companyId) {
      throw new Error("Company context is required");
    }

    try {
      let rows;
      try {
        const [r] = await pool.execute(
          `SELECT
            coa.account_id,
            coa.parent_account_id,
            coa.account_code,
            coa.name,
            coa.account_type,
            coa.account_category,
            coa.is_posting,
            coa.currency,
            coa.notes,
            coa.is_active,
            coa.created_at,
            COALESCE(bal.balance, 0) AS balance
           FROM chart_of_accounts coa
           LEFT JOIN (
             SELECT
               jel.account_id,
               SUM(jel.debit_amount - jel.credit_amount) AS balance
             FROM journal_entry_lines jel
             INNER JOIN journal_entries je ON je.journal_entry_id = jel.journal_entry_id
             WHERE je.company_id = :companyId
             GROUP BY jel.account_id
           ) bal ON bal.account_id = coa.account_id
           WHERE coa.company_id = :companyId
           ORDER BY coa.account_code`,
          { companyId },
        );
        rows = r;
      } catch (colErr) {
        if (isBadFieldError(colErr)) {
          const [r] = await pool.execute(
            `SELECT
              coa.account_id,
              coa.parent_account_id,
              coa.account_code,
              coa.name,
              coa.account_type,
              coa.is_posting,
              coa.currency,
              coa.notes,
              coa.is_active,
              coa.created_at,
              0 AS balance
             FROM chart_of_accounts coa
             WHERE coa.company_id = :companyId
             ORDER BY coa.account_code`,
            { companyId },
          );
          rows = (r || []).map((row) => ({ ...row, account_category: null }));
        } else {
          throw colErr;
        }
      }
      // Map DB 'income' to 'revenue' for frontend consistency
      return (rows || []).map((row) => ({
        ...row,
        account_type: row.account_type === "income" ? "revenue" : row.account_type,
      }));
    } catch (err) {
      if (isMissingTableError(err)) {
        console.warn("[accounting] chart_of_accounts table missing");
        return [];
      }
      throw err;
    }
  },

  /**
   * Create a chart of accounts entry
   */
  createChartOfAccount: async (user, data) => {
    const companyId = resolveCompanyContext(user, data.company_id);
    if (!companyId) throw new Error("Company context is required");

    const accountType = (data.account_type === "revenue" ? "income" : data.account_type) || "asset";
    const params = {
      company_id: companyId,
      parent_account_id: data.parent_account_id || null,
      account_code: String(data.account_code).trim(),
      name: String(data.name).trim(),
      account_type: accountType,
      account_category: data.account_category ? String(data.account_category).trim() : null,
      is_posting: data.is_posting !== false ? 1 : 0,
      currency: (data.currency || "USD").substring(0, 3),
      notes: data.notes ? String(data.notes).trim() : null,
      is_active: data.is_active !== false ? 1 : 0,
    };
    let result;
    try {
      [result] = await pool.execute(
        `INSERT INTO chart_of_accounts (
          company_id, parent_account_id, account_code, name, account_type, account_category,
          is_posting, currency, notes, is_active
        ) VALUES (
          :company_id, :parent_account_id, :account_code, :name, :account_type, :account_category,
          :is_posting, :currency, :notes, :is_active
        )`,
        params
      );
    } catch (err) {
      if (isBadFieldError(err)) {
        [result] = await pool.execute(
          `INSERT INTO chart_of_accounts (
            company_id, parent_account_id, account_code, name, account_type,
            is_posting, currency, notes, is_active
          ) VALUES (
            :company_id, :parent_account_id, :account_code, :name, :account_type,
            :is_posting, :currency, :notes, :is_active
          )`,
          { ...params, account_category: undefined }
        );
      } else throw err;
    }
    const [created] = await pool.execute(
      `SELECT account_id, parent_account_id, account_code, name, account_type, is_posting, currency, notes, is_active, created_at
       FROM chart_of_accounts WHERE account_id = :id`,
      { id: result.insertId }
    );
    const row = created[0] || {};
    const withCategory = row.account_category !== undefined ? row : { ...row, account_category: params.account_category };
    return { ...withCategory, account_type: row.account_type === "income" ? "revenue" : row.account_type };
  },

  /**
   * Update a chart of accounts entry
   */
  updateChartOfAccount: async (user, accountId, data) => {
    const companyId = resolveCompanyContext(user, data.company_id);
    if (!companyId) throw new Error("Company context is required");

    const [existing] = await pool.execute(
      "SELECT account_id FROM chart_of_accounts WHERE account_id = :id AND company_id = :companyId",
      { id: Number(accountId), companyId }
    );
    if (!existing.length) throw new Error("Account not found");

    const accountType = data.account_type === "revenue" ? "income" : data.account_type;
    const updateParams = {
      id: Number(accountId),
      parent_account_id: data.parent_account_id != null ? data.parent_account_id : null,
      name: data.name != null ? String(data.name).trim() : null,
      account_type: accountType || null,
      account_category: data.account_category ? String(data.account_category).trim() : null,
      is_posting: data.is_posting !== undefined ? (data.is_posting ? 1 : 0) : null,
      currency: data.currency ? data.currency.substring(0, 3) : null,
      notes: data.notes != null ? String(data.notes).trim() : null,
      is_active: data.is_active !== undefined ? (data.is_active ? 1 : 0) : null,
    };
    try {
      await pool.execute(
        `UPDATE chart_of_accounts SET
          parent_account_id = COALESCE(:parent_account_id, parent_account_id),
          name = COALESCE(:name, name),
          account_type = COALESCE(:account_type, account_type),
          account_category = :account_category,
          is_posting = COALESCE(:is_posting, is_posting),
          currency = COALESCE(:currency, currency),
          notes = :notes,
          is_active = COALESCE(:is_active, is_active),
          updated_at = CURRENT_TIMESTAMP
         WHERE account_id = :id`,
        updateParams
      );
    } catch (err) {
      if (isBadFieldError(err)) {
        await pool.execute(
          `UPDATE chart_of_accounts SET
            parent_account_id = COALESCE(:parent_account_id, parent_account_id),
            name = COALESCE(:name, name),
            account_type = COALESCE(:account_type, account_type),
            is_posting = COALESCE(:is_posting, is_posting),
            currency = COALESCE(:currency, currency),
            notes = :notes,
            is_active = COALESCE(:is_active, is_active),
            updated_at = CURRENT_TIMESTAMP
           WHERE account_id = :id`,
          { ...updateParams, account_category: undefined }
        );
      } else throw err;
    }
    const [updated] = await pool.execute(
      `SELECT account_id, parent_account_id, account_code, name, account_type, is_posting, currency, notes, is_active, created_at, updated_at
       FROM chart_of_accounts WHERE account_id = :id`,
      { id: Number(accountId) }
    );
    const row = updated[0] || {};
    const withCategory = row.account_category !== undefined ? row : { ...row, account_category: updateParams.account_category };
    return { ...withCategory, account_type: row.account_type === "income" ? "revenue" : row.account_type };
  },

  /**
   * Aggregate accountant dashboard metrics
   */
  getDashboardOverview: async (user, companyIdParam) => {
    const companyId = resolveCompanyContext(user, companyIdParam);
    if (!companyId) {
      throw new Error("Company context is required");
    }

    function emptyOverview() {
      return {
        currency: "USD",
        fiscalPeriod: null,
        criticalAlerts: { criticalAlertsCount: 0, unreconciledTransactions: 0, pendingApprovals: 0 },
        cashPosition: {
          cashOnHand: 0,
          bankBalance: 0,
          totalAvailableFunds: 0,
          totalCashOnHand: 0,
          availableCash: 0,
          changeVsYesterday: 0,
          trend: [],
        },
        receivables: {
          totalOutstanding: 0,
          overdueAmount: 0,
          aging: { current: 0, "1_30": 0, "31_60": 0, "61_90": 0, "90_plus": 0 },
          dso: null,
          overdue: { count: 0 },
        },
        payables: {
          totalOutstanding: 0,
          overdueBills: 0,
          dueThisWeek: 0,
          dueNext30Days: 0,
          dpo: null,
          overdue: { count: 0 },
        },
        taxSummary: {
          totalLiability: 0,
          salesTax: 0,
          vatPayable: 0,
          upcomingDeadlines: 0,
          collectionStatus: { collected: 0, paid: 0 },
        },
        periodReadiness: {
          periodCloseCountdown: null,
          completionPercent: 0,
          outstandingItems: {
            unreconciledTransactions: 0,
            unapprovedJournalEntries: 0,
            inventoryVerified: false,
            missingReceipts: 0,
          },
        },
        performanceSnapshot: {
          revenue: { mtd: 0, ytd: 0 },
          grossProfitMargin: null,
          netProfitMTD: null,
          inventory: { totalValue: 0, slowMovingValue: 0, pendingWriteOffs: 0 },
        },
        actionItems: {
          approvals: {
            expenseReports: { count: 0, amount: 0 },
            purchaseOrders: { count: 0, amount: 0 },
            supplierPayments: { count: 0, amount: 0 },
            destroyedItems: { count: 0, amount: 0 },
            adjustmentJournals: 0,
          },
          reconciliation: [],
          missingDocumentation: { expenseItems: 0, supplierBills: 0 },
          exceptions: { failedPayments: 0 },
        },
        quickStats: {
          customersWithBalance: 0,
          suppliersWithBalance: 0,
          openPurchaseOrders: 0,
          openSalesOrders: 0,
          unpostedTransactions: 0,
          lastBackupAt: null,
          exchangeRatesUpdatedAt: null,
          auditAlerts: 0,
        },
        recentActivity: [],
      };
    }

    const empty = emptyOverview();
    const defaults = {
      currency: empty.currency,
      fiscalPeriod: empty.fiscalPeriod,
      cashPosition: empty.cashPosition,
      receivables: empty.receivables,
      payables: empty.payables,
      taxSummary: empty.taxSummary,
      periodReadiness: empty.periodReadiness,
      performanceSnapshot: empty.performanceSnapshot,
      actionItems: empty.actionItems,
      quickStats: empty.quickStats,
      recentActivity: empty.recentActivity,
    };

    const run = async (fn, key) => {
      try {
        return await fn();
      } catch (err) {
        if (isSchemaError(err)) {
          console.warn("[accounting] Dashboard section failed (", key, "):", err.message);
        }
        return null;
      }
    };

    const [
      currency,
      fiscalPeriod,
      unreconciledTransactions,
      pendingApprovals,
      cashPosition,
      receivables,
      payables,
      taxSummary,
      periodReadiness,
      performanceSnapshot,
      actionItems,
      quickStats,
      recentActivity,
    ] = await Promise.all([
      run(() => resolveCompanyCurrency(companyId), "currency"),
      run(() => getFiscalPeriodStatus(companyId), "fiscalPeriod"),
      run(() => countUnreconciledTransactions(companyId), "unreconciled"),
      run(() => countPendingApprovals(companyId), "pendingApprovals"),
      run(() => getCashPosition(companyId), "cashPosition"),
      run(() => getReceivablesSnapshot(companyId), "receivables"),
      run(() => getPayablesSnapshot(companyId), "payables"),
      run(() => getTaxSummary(companyId), "taxSummary"),
      run(() => getPeriodReadiness(companyId), "periodReadiness"),
      run(() => getFinancialPerformance(companyId), "performance"),
      run(() => getActionItems(companyId), "actionItems"),
      run(() => getQuickStats(companyId), "quickStats"),
      run(() => getAccountingActivityFeed(companyId), "recentActivity"),
    ]);

    const receivablesRes = receivables || defaults.receivables;
    const payablesRes = payables || defaults.payables;
    const taxSummaryRes = taxSummary || defaults.taxSummary;
    const criticalAlertsCount =
      Number((pendingApprovals && pendingApprovals.totalPending) || 0) +
      Number(receivablesRes.overdue?.count || 0) +
      Number(payablesRes.overdue?.count || 0) +
      (taxSummaryRes.upcomingDeadlines || 0);

    return {
      currency: currency || defaults.currency,
      fiscalPeriod: fiscalPeriod != null ? fiscalPeriod : defaults.fiscalPeriod,
      criticalAlerts: {
        criticalAlertsCount,
        unreconciledTransactions: unreconciledTransactions ?? 0,
        pendingApprovals: (pendingApprovals && pendingApprovals.totalPending) || 0,
      },
      cashPosition: cashPosition || defaults.cashPosition,
      receivables: receivablesRes,
      payables: payablesRes,
      taxSummary: taxSummaryRes,
      periodReadiness: periodReadiness || defaults.periodReadiness,
      performanceSnapshot: performanceSnapshot || defaults.performanceSnapshot,
      actionItems: actionItems || defaults.actionItems,
      quickStats: quickStats || defaults.quickStats,
      recentActivity: Array.isArray(recentActivity) ? recentActivity : defaults.recentActivity,
    };
  },
};

function resolveCompanyContext(user, providedCompanyId) {
  if (user?.is_super_admin) {
    return providedCompanyId || user.company_id || null;
  }
  return user?.company_id || null;
}

function isMissingTableError(error) {
  return error && error.code === "ER_NO_SUCH_TABLE";
}

function isBadFieldError(error) {
  return error && (error.code === "ER_BAD_FIELD_ERROR" || error.code === "ER_NO_SUCH_COLUMN_IN_TABLE");
}

/** Catch missing table or missing column (schema mismatch) */
function isSchemaError(error) {
  if (!error || !error.code) return false;
  return (
    error.code === "ER_NO_SUCH_TABLE" ||
    error.code === "ER_BAD_FIELD_ERROR" ||
    (error.message && String(error.message).toLowerCase().includes("column does not exist"))
  );
}

async function resolveCompanyCurrency(companyId) {
  try {
    const [rows] = await pool.execute(
      "SELECT currency FROM companies WHERE company_id = :companyId",
      { companyId },
    );
    const currency = rows[0]?.currency;
    return currency ? currency.toUpperCase() : "USD";
  } catch (error) {
    if (isMissingTableError(error)) return "USD";
    throw error;
  }
}

async function getFiscalPeriodStatus(companyId) {
  try {
    const [rows] = await pool.execute(
      `SELECT fiscal_period_id, period_name, status, start_date, end_date
       FROM fiscal_periods
       WHERE company_id = :companyId
       ORDER BY CASE WHEN status = 'open' THEN 0 ELSE 1 END, end_date DESC
       LIMIT 1`,
      { companyId },
    );
    const period = rows[0];
    if (!period) {
      return null;
    }
    const now = new Date();
    const endDate = period.end_date ? new Date(period.end_date) : null;
    const closesInDays = endDate ? Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24))) : null;
    return {
      ...period,
      closesInDays,
    };
  } catch (error) {
    if (isMissingTableError(error)) {
      console.warn("[accounting] fiscal_periods table missing");
      return null;
    }
    throw error;
  }
}

async function countUnreconciledTransactions(companyId) {
  try {
    const [rows] = await pool.execute(
      `SELECT COUNT(*) AS cnt
       FROM cash_transactions
       WHERE company_id = :companyId
         AND (journal_entry_id IS NULL OR journal_entry_id = 0)`,
      { companyId },
    );
    return Number(rows[0]?.cnt || 0);
  } catch (error) {
    if (isMissingTableError(error)) {
      console.warn("[accounting] cash_transactions table missing");
      return 0;
    }
    throw error;
  }
}

async function countPendingApprovals(companyId) {
  try {
    const [rows] = await pool.execute(
      `SELECT COUNT(*) AS cnt
       FROM expense_reports
       WHERE company_id = :companyId
         AND status = 'submitted'`,
      { companyId },
    );

    const expenseCount = Number(rows[0]?.cnt || 0);
    return {
      expenseCount,
      totalPending: expenseCount,
    };
  } catch (error) {
    if (isMissingTableError(error)) {
      console.warn("[accounting] pending approvals tables missing");
      return { expenseCount: 0, totalPending: 0 };
    }
    throw error;
  }
}

async function getCashPosition(companyId) {
  const empty = {
    cashOnHand: 0,
    bankBalance: 0,
    totalAvailableFunds: 0,
    totalCashOnHand: 0,
    availableCash: 0,
    changeVsYesterday: 0,
    trend: [],
  };

  const gl = await getCashAndBankFromGeneralLedger(companyId);
  if (gl !== null) {
    const total = gl.cashOnHand + gl.bankBalance;
    return {
      cashOnHand: gl.cashOnHand,
      bankBalance: gl.bankBalance,
      totalAvailableFunds: total,
      totalCashOnHand: gl.cashOnHand,
      availableCash: total,
      changeVsYesterday: 0,
      trend: [{ date: new Date().toISOString().slice(0, 10), value: total }],
    };
  }

  try {
    const [openingRows] = await pool.execute(
      `SELECT COALESCE(SUM(opening_balance), 0) AS opening_balance
       FROM cash_accounts
       WHERE company_id = :companyId`,
      { companyId },
    );
    const openingBalance = Number(openingRows[0]?.opening_balance || 0);

    const [nets] = await pool.execute(
      `SELECT
          transaction_date,
          SUM(CASE
                WHEN transaction_type IN ('receipt','transfer_in') THEN amount
                WHEN transaction_type IN ('disbursement','transfer_out') THEN -amount
                ELSE 0
              END) AS net_amount
       FROM cash_transactions
       WHERE company_id = :companyId
       GROUP BY transaction_date`,
      { companyId },
    );

    const netMap = nets.reduce((acc, row) => {
      const key = formatDateKey(row.transaction_date);
      if (!key) return acc;
      return { ...acc, [key]: Number(row.net_amount || 0) };
    }, {});

    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const todayKey = today.toISOString().slice(0, 10);
    const yesterdayKey = yesterday.toISOString().slice(0, 10);

    const changeVsYesterday = (netMap[todayKey] || 0) - (netMap[yesterdayKey] || 0);

    let runningBalance = openingBalance;
    const trend = [];
    for (let i = 6; i >= 0; i -= 1) {
      const day = new Date();
      day.setDate(today.getDate() - i);
      const key = day.toISOString().slice(0, 10);
      runningBalance += netMap[key] || 0;
      trend.push({ date: key, value: Number(runningBalance.toFixed(2)) });
    }

    const totalCashOnHand = Number(runningBalance.toFixed(2));

    return {
      cashOnHand: 0,
      bankBalance: totalCashOnHand,
      totalAvailableFunds: totalCashOnHand,
      totalCashOnHand,
      availableCash: totalCashOnHand,
      changeVsYesterday,
      trend,
    };
  } catch (error) {
    if (isMissingTableError(error)) {
      return empty;
    }
    throw error;
  }
}

/**
 * Get Cash and Bank balances from GL by account_category.
 * Cash on Hand = Asset accounts where category = Cash
 * Bank Balance = Asset accounts where category = Bank
 */
function getCashAndBankFromGeneralLedger(companyId) {
  return pool
    .execute(
      `SELECT
          LOWER(TRIM(COALESCE(coa.account_category, ''))) AS cat,
          COALESCE(SUM(jel.debit_amount - jel.credit_amount), 0) AS balance
       FROM journal_entry_lines jel
       INNER JOIN journal_entries je ON je.journal_entry_id = jel.journal_entry_id
       INNER JOIN chart_of_accounts coa ON coa.account_id = jel.account_id AND coa.company_id = je.company_id
       WHERE je.company_id = :companyId
         AND (LOWER(TRIM(COALESCE(coa.account_type, ''))) = 'asset'
              OR LOWER(TRIM(COALESCE(coa.account_type, ''))) LIKE 'asset%')
         AND LOWER(TRIM(COALESCE(coa.account_category, ''))) IN ('cash', 'bank')
       GROUP BY LOWER(TRIM(COALESCE(coa.account_category, '')))`,
      { companyId },
    )
    .then(([rows]) => {
      let cashOnHand = 0;
      let bankBalance = 0;
      for (const row of rows || []) {
        const bal = Number(row.balance || 0);
        if (row.cat === 'cash') cashOnHand += bal;
        else if (row.cat === 'bank') bankBalance += bal;
      }
      return { cashOnHand, bankBalance };
    })
    .catch((err) => {
      console.warn("[accounting] GL cash/bank balance failed:", err.message);
      return null;
    });
}

async function getReceivablesSnapshot(companyId) {
  try {
    const [rows] = await pool.execute(
      `SELECT
          SUM(total_amount) AS total,
          SUM(CASE WHEN due_date < CURDATE() THEN total_amount ELSE 0 END) AS overdue,
          SUM(CASE WHEN due_date IS NULL OR due_date >= CURDATE() THEN total_amount ELSE 0 END) AS current_bucket,
          SUM(CASE WHEN DATEDIFF(CURDATE(), due_date) BETWEEN 1 AND 30 THEN total_amount ELSE 0 END) AS bucket_30,
          SUM(CASE WHEN DATEDIFF(CURDATE(), due_date) BETWEEN 31 AND 60 THEN total_amount ELSE 0 END) AS bucket_60,
          SUM(CASE WHEN DATEDIFF(CURDATE(), due_date) BETWEEN 61 AND 90 THEN total_amount ELSE 0 END) AS bucket_90,
          SUM(CASE WHEN DATEDIFF(CURDATE(), due_date) > 90 THEN total_amount ELSE 0 END) AS bucket_90_plus,
          AVG(DATEDIFF(CURDATE(), invoice_date)) AS avg_days
       FROM customer_invoices
       WHERE company_id = :companyId
         AND status NOT IN ('paid','void')`,
      { companyId },
    );

    const row = rows[0] || {};
    return {
      totalOutstanding: Number(row.total || 0),
      overdueAmount: Number(row.overdue || 0),
      aging: {
        current: Number(row.current_bucket || 0),
        "1_30": Number(row.bucket_30 || 0),
        "31_60": Number(row.bucket_60 || 0),
        "61_90": Number(row.bucket_90 || 0),
        "90_plus": Number(row.bucket_90_plus || 0),
      },
      dso: row.avg_days ? Math.round(Number(row.avg_days)) : null,
      overdue: {
        count: row.overdue ? 1 : 0,
      },
    };
  } catch (error) {
    if (isMissingTableError(error)) {
      console.warn("[accounting] customer_invoices table missing, using sales_orders fallback");
      return getReceivablesFromSalesOrders(companyId);
    }
    throw error;
  }
}

async function getReceivablesFromSalesOrders(companyId) {
  try {
    const [rows] = await pool.execute(
      `SELECT COALESCE(SUM(so.total_amount), 0) AS total
       FROM sales_orders so
       WHERE so.company_id = :companyId
         AND so.status NOT IN ('cancelled', 'delivered', 'returned', 'paid')`,
      { companyId },
    );
    const total = Number(rows[0]?.total || 0);
    return {
      totalOutstanding: total,
      overdueAmount: 0,
      aging: { current: total, "1_30": 0, "31_60": 0, "61_90": 0, "90_plus": 0 },
      dso: null,
      overdue: { count: 0 },
    };
  } catch (err) {
    if (isMissingTableError(err)) return { totalOutstanding: 0, overdueAmount: 0, aging: { current: 0, "1_30": 0, "31_60": 0, "61_90": 0, "90_plus": 0 }, dso: null, overdue: { count: 0 } };
    throw err;
  }
}

async function getPayablesSnapshot(companyId) {
  try {
    const [rows] = await pool.execute(
      `SELECT
          SUM(total_amount) AS total,
          SUM(CASE WHEN due_date < CURDATE() THEN total_amount ELSE 0 END) AS overdue,
          SUM(CASE WHEN DATEDIFF(due_date, CURDATE()) BETWEEN 0 AND 7 THEN total_amount ELSE 0 END) AS due_week,
          SUM(CASE WHEN DATEDIFF(due_date, CURDATE()) BETWEEN 0 AND 30 THEN total_amount ELSE 0 END) AS due_month,
          AVG(DATEDIFF(CURDATE(), bill_date)) AS avg_days
       FROM supplier_bills
       WHERE company_id = :companyId
         AND status NOT IN ('paid','void')`,
      { companyId },
    );

    const row = rows[0] || {};
    return {
      totalOutstanding: Number(row.total || 0),
      overdueBills: Number(row.overdue || 0),
      dueThisWeek: Number(row.due_week || 0),
      dueNext30Days: Number(row.due_month || 0),
      dpo: row.avg_days ? Math.round(Number(row.avg_days)) : null,
      overdue: {
        count: row.overdue ? 1 : 0,
      },
    };
  } catch (error) {
    if (isMissingTableError(error)) {
      console.warn("[accounting] supplier_bills table missing, using purchase_orders fallback");
      return getPayablesFromPurchaseOrders(companyId);
    }
    throw error;
  }
}

async function getPayablesFromPurchaseOrders(companyId) {
  try {
    const [rows] = await pool.execute(
      `SELECT COALESCE(SUM(po.total_amount), 0) AS total
       FROM purchase_orders po
       WHERE po.company_id = :companyId
         AND po.status NOT IN ('cancelled', 'completed')`,
      { companyId },
    );
    const total = Number(rows[0]?.total || 0);
    return {
      totalOutstanding: total,
      overdueBills: 0,
      dueThisWeek: 0,
      dueNext30Days: total,
      dpo: null,
      overdue: { count: 0 },
    };
  } catch (err) {
    if (isMissingTableError(err)) return { totalOutstanding: 0, overdueBills: 0, dueThisWeek: 0, dueNext30Days: 0, dpo: null, overdue: { count: 0 } };
    throw err;
  }
}

async function getTaxSummary(companyId) {
  try {
    const [salesRows] = await pool.execute(
      `SELECT COALESCE(SUM(tax_amount), 0) AS sales_tax
       FROM customer_invoices
       WHERE company_id = :companyId
         AND status NOT IN ('void')`,
      { companyId },
    );

    const [vatRows] = await pool.execute(
      `SELECT COALESCE(SUM(tax_amount), 0) AS vat_tax
       FROM supplier_bills
       WHERE company_id = :companyId
         AND status NOT IN ('void')`,
      { companyId },
    );

    const [deadlinesRows] = await pool.execute(
      `SELECT COUNT(*) AS cnt
       FROM tax_codes
       WHERE company_id = :companyId
         AND is_active = 1`,
      { companyId },
    );

    const collected = Number(salesRows?.[0]?.sales_tax || 0);
    const paid = Number(vatRows?.[0]?.vat_tax || 0);

    return {
      totalLiability: collected - paid,
      salesTax: collected,
      vatPayable: paid,
      upcomingDeadlines: Number(deadlinesRows?.[0]?.cnt || 0),
      collectionStatus: {
        collected,
        paid,
      },
    };
  } catch (error) {
    if (isMissingTableError(error)) {
      console.warn("[accounting] tax tables missing");
      return {
        totalLiability: 0,
        salesTax: 0,
        vatPayable: 0,
        upcomingDeadlines: 0,
        collectionStatus: { collected: 0, paid: 0 },
      };
    }
    throw error;
  }
}

async function getPeriodReadiness(companyId) {
  try {
    const [periodRows] = await pool.execute(
      `SELECT fiscal_period_id, end_date
       FROM fiscal_periods
       WHERE company_id = :companyId
         AND status = 'open'
       ORDER BY end_date DESC
       LIMIT 1`,
      { companyId },
    );
    const period = periodRows[0];

    const [
      [unrecRows],
      [pendingJournalRows],
      [inventoryRows],
      [receiptsRows],
    ] = await Promise.all([
      pool.execute(
        `SELECT COUNT(*) AS cnt
         FROM cash_transactions
         WHERE company_id = :companyId
           AND (journal_entry_id IS NULL OR journal_entry_id = 0)`,
        { companyId },
      ),
      pool.execute(
        `SELECT COUNT(*) AS cnt
         FROM journal_entries
         WHERE company_id = :companyId
           AND journal_type = 'adjustment'
           ${period?.fiscal_period_id ? "AND fiscal_period_id = :periodId" : ""}`,
        period?.fiscal_period_id ? { companyId, periodId: period.fiscal_period_id } : { companyId },
      ),
      pool.execute(
        `SELECT COUNT(*) AS cnt
         FROM inventory_checks
         WHERE company_id = :companyId
           AND status = 'completed'
           AND completed_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
        { companyId },
      ),
      pool.execute(
        `SELECT COUNT(*) AS cnt
         FROM expense_items ei
         JOIN expense_reports er ON er.expense_report_id = ei.expense_report_id
         WHERE er.company_id = :companyId
           AND (ei.description IS NULL OR ei.description = '')`,
        { companyId },
      ),
    ]);

    const outstanding = {
      unreconciled: Number(unrecRows?.[0]?.cnt || 0),
      unapprovedJournals: Number(pendingJournalRows?.[0]?.cnt || 0),
      inventoryVerified: Number(inventoryRows?.[0]?.cnt || 0) > 0,
      missingReceipts: Number(receiptsRows?.[0]?.cnt || 0),
    };

    const steps = [
      outstanding.unreconciled === 0,
      outstanding.unapprovedJournals === 0,
      outstanding.inventoryVerified,
      outstanding.missingReceipts === 0,
    ];
    const completedSteps = steps.filter(Boolean).length;
    const completionPercent = Math.round((completedSteps / steps.length) * 100);

    return {
      periodCloseCountdown: period?.end_date || null,
      completionPercent,
      outstandingItems: {
        unreconciledTransactions: outstanding.unreconciled,
        unapprovedJournalEntries: outstanding.unapprovedJournals,
        inventoryVerified: outstanding.inventoryVerified,
        missingReceipts: outstanding.missingReceipts,
      },
    };
  } catch (error) {
    if (isMissingTableError(error)) {
      console.warn("[accounting] period readiness tables missing");
      return {
        periodCloseCountdown: null,
        completionPercent: 0,
        outstandingItems: {
          unreconciledTransactions: 0,
          unapprovedJournalEntries: 0,
          inventoryVerified: false,
          missingReceipts: 0,
        },
      };
    }
    throw error;
  }
}

async function getFinancialPerformance(companyId) {
  try {
    const [
      [revenueMTDRows],
      [revenueYTDRows],
      [inventoryValueRows],
      [slowMovingRows],
      [writeOffRows],
    ] = await Promise.all([
      pool.execute(
        `SELECT COALESCE(SUM(total_amount), 0) AS total
         FROM customer_invoices
         WHERE company_id = :companyId
           AND status NOT IN ('void')
           AND MONTH(invoice_date) = MONTH(CURDATE())
           AND YEAR(invoice_date) = YEAR(CURDATE())`,
        { companyId },
      ),
      pool.execute(
        `SELECT COALESCE(SUM(total_amount), 0) AS total
         FROM customer_invoices
         WHERE company_id = :companyId
           AND status NOT IN ('void')
           AND YEAR(invoice_date) = YEAR(CURDATE())`,
        { companyId },
      ),
      pool.execute(
        `SELECT COALESCE(SUM(sl.quantity * COALESCE(p.cost_price, 0)), 0) AS total_value
         FROM stock_levels sl
         JOIN products p ON p.product_id = sl.product_id
         WHERE sl.company_id = :companyId
           AND p.company_id = sl.company_id`,
        { companyId },
      ),
      pool.execute(
        `SELECT COUNT(*) AS cnt, COALESCE(SUM(sl.quantity * COALESCE(p.cost_price, 0)), 0) AS slow_value
         FROM stock_levels sl
         JOIN products p ON p.product_id = sl.product_id
         WHERE sl.company_id = :companyId
           AND p.company_id = sl.company_id
           AND DATEDIFF(CURDATE(), p.updated_at) > 90`,
        { companyId },
      ),
      pool.execute(
        `SELECT COALESCE(SUM(quantity * COALESCE(p.cost_price, 0)), 0) AS total_value
         FROM destroyed_items di
         JOIN products p ON p.product_id = di.product_id
         WHERE di.company_id = :companyId
           AND approved_by IS NULL`,
        { companyId },
      ),
    ]);

    const revenueMTDValue = Number(revenueMTDRows?.[0]?.total || 0);
    const revenueYTDValue = Number(revenueYTDRows?.[0]?.total || 0);
    const inventoryValueTotal = Number(inventoryValueRows?.[0]?.total_value || 0);
    const slowMovingValue = Number(slowMovingRows?.[0]?.slow_value || 0);
    const pendingWriteOffs = Number(writeOffRows?.[0]?.total_value || 0);

    return {
      revenue: {
        mtd: revenueMTDValue,
        ytd: revenueYTDValue,
      },
      grossProfitMargin: null,
      netProfitMTD: null,
      inventory: {
        totalValue: inventoryValueTotal,
        slowMovingValue,
        pendingWriteOffs,
      },
    };
  } catch (error) {
    if (isMissingTableError(error)) {
      console.warn("[accounting] financial performance tables missing, using sales_orders and stock_inventory fallbacks");
      const [inventoryValue, revenue] = await Promise.all([
        getInventoryValueFallback(companyId),
        getRevenueFromSalesOrders(companyId),
      ]);
      return {
        revenue: revenue || { mtd: 0, ytd: 0 },
        grossProfitMargin: null,
        netProfitMTD: null,
        inventory: { totalValue: inventoryValue, slowMovingValue: 0, pendingWriteOffs: 0 },
      };
    }
    throw error;
  }
}

async function getRevenueFromSalesOrders(companyId) {
  try {
    const [[mtdRows], [ytdRows]] = await Promise.all([
      pool.execute(
        `SELECT COALESCE(SUM(total_amount), 0) AS total FROM sales_orders
         WHERE company_id = :companyId AND status NOT IN ('void', 'cancelled')
           AND MONTH(order_date) = MONTH(CURDATE()) AND YEAR(order_date) = YEAR(CURDATE())`,
        { companyId },
      ),
      pool.execute(
        `SELECT COALESCE(SUM(total_amount), 0) AS total FROM sales_orders
         WHERE company_id = :companyId AND status NOT IN ('void', 'cancelled')
           AND YEAR(order_date) = YEAR(CURDATE())`,
        { companyId },
      ),
    ]);
    return {
      mtd: Number(mtdRows?.[0]?.total || 0),
      ytd: Number(ytdRows?.[0]?.total || 0),
    };
  } catch (err) {
    if (isMissingTableError(err)) return { mtd: 0, ytd: 0 };
    throw err;
  }
}

async function getInventoryValueFallback(companyId) {
  try {
    const [rows] = await pool.execute(
      `SELECT COALESCE(SUM(si.quantity_on_hand * COALESCE(p.cost_price, 0)), 0) AS total_value
       FROM stock_inventory si
       INNER JOIN products p ON si.product_id = p.product_id
       WHERE si.company_id = :companyId`,
      { companyId },
    );
    return Number(rows[0]?.total_value || 0);
  } catch (err) {
    if (isMissingTableError(err)) return 0;
    throw err;
  }
}

async function getActionItems(companyId) {
  try {
    const [
      [expenseRows],
      [destroyedRows],
      [journalRows],
      [purchaseOrderRows],
      [supplierPaymentRows],
      [reconRows],
      [missingExpenseRows],
      [missingBillRows],
      [failedPaymentRows],
    ] = await Promise.all([
      pool.execute(
        `SELECT COUNT(*) AS cnt, COALESCE(SUM(total_amount), 0) AS total
         FROM expense_reports
         WHERE company_id = :companyId
           AND status = 'submitted'`,
        { companyId },
      ),
      pool.execute(
        `SELECT COUNT(*) AS cnt, COALESCE(SUM(quantity * COALESCE(p.cost_price, 0)), 0) AS total
         FROM destroyed_items di
         JOIN products p ON p.product_id = di.product_id
          AND p.company_id = di.company_id
         WHERE di.company_id = :companyId
           AND di.approved_by IS NULL`,
        { companyId },
      ),
      pool.execute(
        `SELECT COUNT(*) AS cnt
         FROM journal_entries
         WHERE company_id = :companyId
           AND journal_type = 'adjustment'`,
        { companyId },
      ),
      pool.execute(
        `SELECT COUNT(*) AS cnt, COALESCE(SUM(total_amount), 0) AS total
         FROM purchase_orders
         WHERE company_id = :companyId
           AND status = 'submitted'`,
        { companyId },
      ),
      pool.execute(
        `SELECT COUNT(*) AS cnt, COALESCE(SUM(total_amount), 0) AS total
         FROM supplier_bills
         WHERE company_id = :companyId
           AND status = 'approved'`,
        { companyId },
      ),
      pool.execute(
        `SELECT
            ca.cash_account_id,
            ca.name,
            COUNT(ct.cash_transaction_id) AS unmatched
         FROM cash_accounts ca
         LEFT JOIN cash_transactions ct
           ON ct.cash_account_id = ca.cash_account_id
          AND (ct.journal_entry_id IS NULL OR ct.journal_entry_id = 0)
         WHERE ca.company_id = :companyId
         GROUP BY ca.cash_account_id`,
        { companyId },
      ),
      pool.execute(
        `SELECT COUNT(*) AS cnt
         FROM expense_items ei
         JOIN expense_reports er ON er.expense_report_id = ei.expense_report_id
         WHERE er.company_id = :companyId
           AND (ei.description IS NULL OR ei.description = '')`,
        { companyId },
      ),
      pool.execute(
        `SELECT COUNT(*) AS cnt
         FROM supplier_bills
         WHERE company_id = :companyId
           AND po_id IS NULL
           AND status NOT IN ('void')`,
        { companyId },
      ),
      pool.execute(
        `SELECT COUNT(*) AS cnt
         FROM customer_payments
         WHERE company_id = :companyId
           AND amount <= 0`,
        { companyId },
      ),
    ]);

    return {
      approvals: {
        expenseReports: {
          count: Number(expenseRows?.[0]?.cnt || 0),
          amount: Number(expenseRows?.[0]?.total || 0),
        },
        purchaseOrders: {
          count: Number(purchaseOrderRows?.[0]?.cnt || 0),
          amount: Number(purchaseOrderRows?.[0]?.total || 0),
        },
        supplierPayments: {
          count: Number(supplierPaymentRows?.[0]?.cnt || 0),
          amount: Number(supplierPaymentRows?.[0]?.total || 0),
        },
        destroyedItems: {
          count: Number(destroyedRows?.[0]?.cnt || 0),
          amount: Number(destroyedRows?.[0]?.total || 0),
        },
        adjustmentJournals: Number(journalRows?.[0]?.cnt || 0),
      },
      reconciliation: (reconRows || []).map((row) => ({
        accountId: row.cash_account_id,
        name: row.name,
        unmatched: Number(row.unmatched || 0),
      })),
      missingDocumentation: {
        expenseItems: Number(missingExpenseRows?.[0]?.cnt || 0),
        supplierBills: Number(missingBillRows?.[0]?.cnt || 0),
      },
      exceptions: {
        failedPayments: Number(failedPaymentRows?.[0]?.cnt || 0),
      },
    };
  } catch (error) {
    if (isMissingTableError(error)) {
      console.warn("[accounting] action items tables missing");
      return {
        approvals: {
          expenseReports: { count: 0, amount: 0 },
          purchaseOrders: { count: 0, amount: 0 },
          supplierPayments: { count: 0, amount: 0 },
          destroyedItems: { count: 0, amount: 0 },
          adjustmentJournals: 0,
        },
        reconciliation: [],
        missingDocumentation: { expenseItems: 0, supplierBills: 0 },
        exceptions: { failedPayments: 0 },
      };
    }
    throw error;
  }
}

async function getQuickStats(companyId) {
  try {
    const [
      [customerRows],
      [supplierRows],
      [poRows],
      [soRows],
      [journalRows],
      [backupRows],
      [rateRows],
      [auditRows],
    ] = await Promise.all([
      pool.execute(
        `SELECT COUNT(*) AS cnt
         FROM customers
         WHERE company_id = :companyId`,
        { companyId },
      ),
      pool.execute(
        `SELECT COUNT(*) AS cnt
         FROM suppliers
         WHERE company_id = :companyId`,
        { companyId },
      ),
      pool.execute(
        `SELECT COALESCE(SUM(total_amount), 0) AS total
         FROM purchase_orders
         WHERE company_id = :companyId
           AND status NOT IN ('completed','cancelled')`,
        { companyId },
      ),
      pool.execute(
        `SELECT COALESCE(SUM(total_amount), 0) AS total
         FROM sales_orders
         WHERE company_id = :companyId
           AND status NOT IN ('completed','cancelled')`,
        { companyId },
      ),
      pool.execute(
        `SELECT COUNT(*) AS cnt
         FROM journal_entries
         WHERE company_id = :companyId
           AND fiscal_period_id IS NULL`,
        { companyId },
      ),
      pool.execute(
        `SELECT MAX(created_at) AS backup_time
         FROM reports
         WHERE company_id = :companyId`,
        { companyId },
      ),
      pool.execute(
        `SELECT MAX(rate_date) AS rate_date
         FROM exchange_rates
         WHERE company_id = :companyId`,
        { companyId },
      ),
      pool.execute(
        `SELECT COUNT(*) AS cnt
         FROM audit_logs
         WHERE company_id = :companyId
           AND action = 'delete'
           AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`,
        { companyId },
      ),
    ]);

    return {
      customersWithBalance: Number(customerRows?.[0]?.cnt || 0),
      suppliersWithBalance: Number(supplierRows?.[0]?.cnt || 0),
      openPurchaseOrders: Number(poRows?.[0]?.total || 0),
      openSalesOrders: Number(soRows?.[0]?.total || 0),
      unpostedTransactions: Number(journalRows?.[0]?.cnt || 0),
      lastBackupAt: backupRows?.[0]?.backup_time || null,
      exchangeRatesUpdatedAt: rateRows?.[0]?.rate_date || null,
      auditAlerts: Number(auditRows?.[0]?.cnt || 0),
    };
  } catch (error) {
    if (isMissingTableError(error)) {
      console.warn("[accounting] quick stats tables missing");
      return {
        customersWithBalance: 0,
        suppliersWithBalance: 0,
        openPurchaseOrders: 0,
        openSalesOrders: 0,
        unpostedTransactions: 0,
        lastBackupAt: null,
        exchangeRatesUpdatedAt: null,
        auditAlerts: 0,
      };
    }
    throw error;
  }
}

async function getAccountingActivityFeed(companyId) {
  const events = [];
  try {
    const [customerPayments] = await pool.execute(
      `SELECT payment_date AS event_date, amount, payment_number
       FROM customer_payments
       WHERE company_id = :companyId
       ORDER BY payment_date DESC
       LIMIT 5`,
      { companyId },
    );
    customerPayments.forEach((row) =>
      events.push({
        type: "customer_payment",
        description: `Customer payment ${row.payment_number}`,
        amount: Number(row.amount || 0),
        event_date: row.event_date,
      }),
    );
  } catch (error) {
    if (!isMissingTableError(error)) throw error;
  }

  try {
    const [supplierBills] = await pool.execute(
      `SELECT bill_date AS event_date, total_amount, bill_number
       FROM supplier_bills
       WHERE company_id = :companyId
       ORDER BY bill_date DESC
       LIMIT 5`,
      { companyId },
    );
    supplierBills.forEach((row) =>
      events.push({
        type: "supplier_bill",
        description: `Supplier bill ${row.bill_number}`,
        amount: Number(row.total_amount || 0),
        event_date: row.event_date,
      }),
    );
  } catch (error) {
    if (!isMissingTableError(error)) throw error;
  }

  try {
    const [journalEntries] = await pool.execute(
      `SELECT entry_date AS event_date, journal_number
       FROM journal_entries
       WHERE company_id = :companyId
       ORDER BY entry_date DESC
       LIMIT 5`,
      { companyId },
    );
    journalEntries.forEach((row) =>
      events.push({
        type: "journal_entry",
        description: `Journal entry ${row.journal_number}`,
        event_date: row.event_date,
      }),
    );
  } catch (error) {
    if (!isMissingTableError(error)) throw error;
  }

  events.sort((a, b) => new Date(b.event_date) - new Date(a.event_date));
  return events.slice(0, 10);
}

function formatDateKey(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString().slice(0, 10);
}

module.exports = accountingService;
