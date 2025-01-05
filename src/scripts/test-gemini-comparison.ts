import { isSameProject, isSameClient } from '../backend/services/intelligentAggregationService';

async function testComparisons() {
  console.log('\n🧪 Testing project name comparisons:');
  const projectTests = [
    ['Tax Return Preparation', 'Tax Prep'],
    ['Tax Return Preparation 2024', 'Tax Prep 2024'],
    ['Website Development Phase 1', 'Website Dev P1'],
    ['Financial Statement Review', 'Financial Statements'],
    ['Audit Support', 'Audit Assistance'],
    ['Completely Different Project', 'Another Project']
  ];

  for (const [p1, p2] of projectTests) {
    const result = await isSameProject(p1, p2);
    console.log(`\n"${p1}" vs "${p2}": ${result ? '✅ MATCH' : '❌ NO MATCH'}`);
  }

  console.log('\n🧪 Testing client name comparisons:');
  const clientTests = [
    ['Acme Corporation', 'Acme Corp'],
    ['Johnson & Johnson Inc.', 'Johnson & Johnson'],
    ['Microsoft Corporation', 'Microsoft'],
    ['Apple Inc.', 'Apple'],
    ['Completely Different Client', 'Another Client']
  ];

  for (const [c1, c2] of clientTests) {
    const result = await isSameClient(c1, c2);
    console.log(`\n"${c1}" vs "${c2}": ${result ? '✅ MATCH' : '❌ NO MATCH'}`);
  }
}

testComparisons().catch(console.error);