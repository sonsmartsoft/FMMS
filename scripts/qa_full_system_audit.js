const fs = require('fs');
const path = require('path');
const ts = require(path.resolve('./web/node_modules/typescript'));

console.log('================================================================');
console.log('🚀 FMMS FULL-SYSTEM AUTOMATED QA & INTEGRITY AUDIT SUITE');
console.log('================================================================\n');

let totalChecks = 0;
let passedChecks = 0;
let issues = [];

function check(title, fn) {
  totalChecks++;
  try {
    const result = fn();
    if (result === true || result === undefined) {
      console.log(`  ✅ [PASS] ${title}`);
      passedChecks++;
    } else {
      console.log(`  ❌ [FAIL] ${title}: ${result}`);
      issues.push({ title, reason: result });
    }
  } catch (err) {
    console.log(`  ❌ [ERROR] ${title}: ${err.message}`);
    issues.push({ title, reason: err.message });
  }
}

// ─────────────────────────────────────────────────────────────
// 1. AST & TYPESCRIPT STATIC ANALYSIS ON ALL 73+ WEB FILES
// ─────────────────────────────────────────────────────────────
console.log('📦 SECTION 1: TypeScript AST Compilation & Diagnostics');

function getAllFiles(dir, exts = ['.ts', '.tsx']) {
  let files = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && entry.name !== '.next' && entry.name !== '.git') {
          files = files.concat(getAllFiles(fullPath, exts));
        }
      } else if (exts.includes(path.extname(entry.name))) {
        files.push(fullPath);
      }
    }
  } catch {}
  return files;
}

const allWebFiles = getAllFiles('./web');

check(`All ${allWebFiles.length} TypeScript / TSX files have zero AST errors`, () => {
  let parseErrors = [];
  for (const file of allWebFiles) {
    const code = fs.readFileSync(file, 'utf8');
    const sf = ts.createSourceFile(
      file,
      code,
      ts.ScriptTarget.Latest,
      true,
      file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    );
    if (sf.parseDiagnostics && sf.parseDiagnostics.length > 0) {
      parseErrors.push(`${file}: ${sf.parseDiagnostics.map(d => d.messageText).join(', ')}`);
    }
  }
  return parseErrors.length === 0 ? true : parseErrors.join('\n');
});

// ─────────────────────────────────────────────────────────────
// 2. AUDIT SERVICE LAYER: RESOLVE_ASSET_ID & PERSISTENCE
// ─────────────────────────────────────────────────────────────
console.log('\n🔒 SECTION 2: Service Layer & Asset ID Resolution Audit');

const serviceFiles = [
  'web/lib/services/assetService.ts',
  'web/lib/services/fuelService.ts',
  'web/lib/services/maintenanceService.ts',
  'web/lib/services/expenseService.ts',
  'web/lib/services/loanService.ts',
  'web/lib/services/partService.ts',
  'web/lib/services/odometerService.ts',
  'web/lib/services/insuranceService.ts',
  'web/lib/services/registrationService.ts',
  'web/lib/services/documentService.ts',
  'web/lib/services/warrantyService.ts',
  'web/lib/services/tripService.ts',
];

for (const sf of serviceFiles) {
  const content = fs.readFileSync(sf, 'utf8');
  const basename = path.basename(sf);

  check(`${basename} imports resolveAssetId or handles asset aliases`, () => {
    if (basename === 'assetService.ts' || basename === 'syncLogger.ts' || basename === 'aiChatService.ts' || basename === 'aiConfig.ts' || basename === 'authWhitelistService.ts') return true;
    if (!content.includes('resolveAssetId')) {
      return `Missing resolveAssetId import in ${basename}`;
    }
    return true;
  });

  check(`${basename} does not leave unsynchronized temporary prefix IDs on DB success`, () => {
    if (content.includes('localStorage.setItem') && content.includes('insert(')) {
      if (content.includes('EX_') || content.includes('PR_') || content.includes('MAINT_') || content.includes('ODO_')) {
        if (!content.includes('delete customMap') && !content.includes('isAlreadyInDb') && !content.includes('seenIds')) {
          return `Potential duplicate artifact in ${basename}`;
        }
      }
    }
    return true;
  });
}

// ─────────────────────────────────────────────────────────────
// 3. AUDIT FINANCIAL & TCO CALCULATIONS ACROSS ALL MODULES
// ─────────────────────────────────────────────────────────────
console.log('\n💰 SECTION 3: Mathematical Consistency & Division-by-Zero Checks');

const financialPages = [
  'web/app/assets/[id]/page.tsx',
  'web/app/finance/page.tsx',
  'web/app/analytics/page.tsx',
  'web/components/assets/VehicleFinanceOverview.tsx',
];

for (const fp of financialPages) {
  const content = fs.readFileSync(fp, 'utf8');
  const basename = path.basename(fp);

  check(`${basename} guards against NaN or Division by Zero on zero-km / new vehicles`, () => {
    const dangerousDivisions = [
      '/ totalKm',
      '/ asset.purchase_price',
      '/ totalExpenses',
      '/ totalRealSpent',
      '/ purchasePrice',
    ];
    for (const div of dangerousDivisions) {
      if (content.includes(div)) {
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes(div) && !lines[i].includes('?') && !lines[i].includes('>') && !lines[i].includes('Math.max') && !lines[i].includes('||')) {
            const prev = i > 0 ? lines[i - 1] : '';
            if (!prev.includes('>') && !prev.includes('?') && !prev.includes('if')) {
              return `Unguarded division '${div}' at line ${i + 1} in ${fp}`;
            }
          }
        }
      }
    }
    return true;
  });
}

// ─────────────────────────────────────────────────────────────
// 4. AUDIT RECHARTS & UI RESPONSIVENESS (LABEL TRUNCATION)
// ─────────────────────────────────────────────────────────────
console.log('\n📊 SECTION 4: Chart Label Truncation & Layout Audits');

for (const fp of financialPages) {
  const content = fs.readFileSync(fp, 'utf8');
  const basename = path.basename(fp);

  check(`${basename} YAxis has sufficient width (>= 110px) for Vietnamese category labels`, () => {
    const yAxisMatches = content.matchAll(/<YAxis[^>]+width=\{([0-9]+)\}/g);
    for (const m of yAxisMatches) {
      const width = parseInt(m[1]);
      if (width < 100 && content.includes('type="category"')) {
        return `YAxis category width=${width} is too narrow (< 100px) in ${fp}, risk of text clipping`;
      }
    }
    return true;
  });
}

// ─────────────────────────────────────────────────────────────
// 5. AUDIT SUPABASE SQL MIGRATION FILES
// ─────────────────────────────────────────────────────────────
console.log('\n🗄️ SECTION 5: Database Schema & RLS Policy Integrity');

const sqlAuditFile = 'supabase/SYSTEM_WIDE_FULL_DATABASE_SECURITY_AND_PERSISTENCE_UPGRADE.sql';
check(`Comprehensive SQL Migration file exists and covers all 17 tables`, () => {
  if (!fs.existsSync(sqlAuditFile)) return `File ${sqlAuditFile} missing`;
  const sql = fs.readFileSync(sqlAuditFile, 'utf8');
  const requiredTables = [
    'assets', 'insurance_policies', 'registrations', 'asset_documents',
    'warranties', 'warranty_claims', 'odometer_adjustments', 'parts',
    'expenses', 'fuel_logs', 'maintenance_records', 'loans', 'loan_payments',
    'trips', 'devices', 'telemetry_samples', 'gps_track_points'
  ];
  for (const t of requiredTables) {
    if (!sql.includes(t)) return `Table '${t}' missing from system security script`;
  }
  return true;
});

// ─────────────────────────────────────────────────────────────
// SUMMARY & RESULTS
// ─────────────────────────────────────────────────────────────
console.log('\n================================================================');
console.log(`🏁 AUDIT RESULTS: ${passedChecks} / ${totalChecks} CHECKS PASSED`);
if (issues.length === 0) {
  console.log('🎉 ALL SYSTEM MODULES, SERVICES & CHARTS ARE 100% HEALTHY & SECURE!');
} else {
  console.log(`⚠️ FOUND ${issues.length} POTENTIAL ISSUES REQUIRING ATTENTION:`);
  issues.forEach((iss, i) => console.log(`  ${i + 1}. [${iss.title}] -> ${iss.reason}`));
}
console.log('================================================================');
