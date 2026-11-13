import dotenv from 'dotenv';
import path from 'path';
import { ChatHandler } from '../server/handlers/chatHandler';
import { QueryClassifier } from '../server/rag/queryClassifier';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

interface RegressionTestCase {
  id: number;
  name: string;
  query: string;
  expectedScope: 'IN_SCOPE' | 'OUT_OF_SCOPE' | 'IN_SCOPE_BUT_INSUFFICIENT_SOURCES';
  expectedStatus: 'answered' | 'out_of_scope' | 'insufficient_sources';
  validate: (res: any) => { pass: boolean; reason?: string };
}

async function runEvaluationSuite() {
  console.log('===============================================================');
  console.log('🧪 DYOD AI: Automated Regression Test Suite (Section 7)');
  console.log('===============================================================\n');

  const handler = new ChatHandler(process.cwd());
  await handler.initialize();

  const testCases: RegressionTestCase[] = [
    // 1. What is DYOD?
    {
      id: 1,
      name: 'Programme Identity: "What is DYOD?"',
      query: 'What is DYOD?',
      expectedScope: 'IN_SCOPE',
      expectedStatus: 'answered',
      validate: (res) => {
        const pass =
          res.status === 'answered' &&
          res.grounded === true &&
          res.citations &&
          res.citations.length > 0 &&
          (res.answer.toLowerCase().includes('design your own degree') ||
            res.answer.toLowerCase().includes('iust') ||
            res.answer.toLowerCase().includes('multidisciplinary'));
        return {
          pass: Boolean(pass),
          reason: pass
            ? undefined
            : `Status=${res.status}, Grounded=${res.grounded}, Citations=${res.citations?.length}`,
        };
      },
    },

    // 2. What are the eight baskets?
    {
      id: 2,
      name: 'Curriculum Baskets: "What are the eight baskets?"',
      query: 'What are the eight baskets?',
      expectedScope: 'IN_SCOPE',
      expectedStatus: 'answered',
      validate: (res) => {
        const pass =
          res.status === 'answered' &&
          res.grounded === true &&
          res.citations &&
          res.citations.length > 0 &&
          res.answer.toLowerCase().includes('basket') &&
          (res.answer.toLowerCase().includes('natural') ||
            res.answer.toLowerCase().includes('computing') ||
            res.answer.toLowerCase().includes('humanities'));
        return {
          pass: Boolean(pass),
          reason: pass
            ? undefined
            : `Status=${res.status}, Grounded=${res.grounded}, Citations=${res.citations?.length}`,
        };
      },
    },

    // 3. Explain the DYOD programme structure.
    {
      id: 3,
      name: 'Programme Structure: "Explain the DYOD programme structure."',
      query: 'Explain the DYOD programme structure.',
      expectedScope: 'IN_SCOPE',
      expectedStatus: 'answered',
      validate: (res) => {
        const pass =
          res.status === 'answered' &&
          res.grounded === true &&
          res.citations &&
          res.citations.length > 0 &&
          (res.answer.toLowerCase().includes('semester') ||
            res.answer.toLowerCase().includes('credit') ||
            res.answer.toLowerCase().includes('degree') ||
            res.answer.toLowerCase().includes('modalities'));
        return {
          pass: Boolean(pass),
          reason: pass
            ? undefined
            : `Status=${res.status}, Grounded=${res.grounded}, Citations=${res.citations?.length}`,
        };
      },
    },

    // 4. What subjects are included in my programme?
    {
      id: 4,
      name: 'Subjects / Syllabus: "What subjects are included in my programme?"',
      query: 'What subjects are included in my programme?',
      expectedScope: 'IN_SCOPE',
      expectedStatus: 'answered',
      validate: (res) => {
        const pass =
          res.status === 'answered' &&
          res.grounded === true &&
          res.citations &&
          res.citations.length > 0 &&
          (res.answer.toLowerCase().includes('semester') ||
            res.answer.toLowerCase().includes('course') ||
            res.answer.toLowerCase().includes('basket'));
        return {
          pass: Boolean(pass),
          reason: pass
            ? undefined
            : `Status=${res.status}, Grounded=${res.grounded}, Citations=${res.citations?.length}`,
        };
      },
    },

    // 5. Explain a topic from an approved document.
    {
      id: 5,
      name: 'Approved Document Topic: "Explain the seed paper making methodology"',
      query: 'Explain the methodology of making seed paper in the DYOD project.',
      expectedScope: 'IN_SCOPE',
      expectedStatus: 'answered',
      validate: (res) => {
        const pass =
          res.status === 'answered' &&
          res.grounded === true &&
          res.citations &&
          res.citations.length > 0 &&
          (res.answer.toLowerCase().includes('pulp') ||
            res.answer.toLowerCase().includes('seed') ||
            res.answer.toLowerCase().includes('soaking'));
        return {
          pass: Boolean(pass),
          reason: pass
            ? undefined
            : `Status=${res.status}, Grounded=${res.grounded}, Citations=${res.citations?.length}`,
        };
      },
    },

    // 6. Who won yesterday's cricket match?
    {
      id: 6,
      name: 'Out of Scope: "Who won yesterday\'s cricket match?"',
      query: "Who won yesterday's cricket match?",
      expectedScope: 'OUT_OF_SCOPE',
      expectedStatus: 'out_of_scope',
      validate: (res) => {
        const pass =
          res.status === 'out_of_scope' &&
          res.answer.includes(
            "I'm DYOD AI, your dedicated academic assistant for the DYOD programme at IUST"
          );
        return {
          pass: Boolean(pass),
          reason: pass
            ? undefined
            : `Status=${res.status}, Answer=${res.answer?.slice(0, 80)}`,
        };
      },
    },

    // 7. Suggest a gaming laptop.
    {
      id: 7,
      name: 'Out of Scope: "Suggest a gaming laptop."',
      query: 'Suggest a gaming laptop.',
      expectedScope: 'OUT_OF_SCOPE',
      expectedStatus: 'out_of_scope',
      validate: (res) => {
        const pass =
          res.status === 'out_of_scope' &&
          res.answer.includes(
            "I'm DYOD AI, your dedicated academic assistant for the DYOD programme at IUST"
          );
        return {
          pass: Boolean(pass),
          reason: pass
            ? undefined
            : `Status=${res.status}, Answer=${res.answer?.slice(0, 80)}`,
        };
      },
    },

    // 8. Relevant to DYOD but missing from knowledge base
    {
      id: 8,
      name: 'In-Scope but Missing: "What is the detailed hostel fee breakdown for DYOD students?"',
      query: 'What is the detailed hostel fee and mess charges breakdown for DYOD students in 2029?',
      expectedScope: 'IN_SCOPE_BUT_INSUFFICIENT_SOURCES',
      expectedStatus: 'insufficient_sources',
      validate: (res) => {
        const hasRequiredMessage =
          res.answer.includes("I understand you're asking about the DYOD programme") &&
          res.answer.includes("However, I couldn't find enough information in the currently approved study materials") &&
          res.answer.includes("Try checking the Programme Information documents, or ask your administrator to add the relevant material.");
        const pass = res.status === 'insufficient_sources' && hasRequiredMessage;
        return {
          pass: Boolean(pass),
          reason: pass
            ? undefined
            : `Status=${res.status}, Answer=${res.answer?.slice(0, 100)}`,
        };
      },
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const tc of testCases) {
    process.stdout.write(`\n[Test ${tc.id}/8] ${tc.name}\n`);
    process.stdout.write(`  Query: "${tc.query}"\n`);

    // Verify Scope Classifier first
    const classified = QueryClassifier.classify(tc.query);
    process.stdout.write(`  Scope Classification: ${classified.scope} (RefusalRequired: ${classified.isRefusalRequired})\n`);

    try {
      const { statusCode, response } = await handler.handleChat({
        message: tc.query,
      });

      const validation = tc.validate(response);
      if (validation.pass) {
        console.log(`  Result: ✅ PASS (HTTP ${statusCode}, Status: ${response.status}, Scope: ${response.scope || classified.scope})`);
        if (response.citations && response.citations.length > 0) {
          console.log(`  Citations (${response.citations.length}): [${response.citations.map((c: any) => `${c.documentTitle} p.${c.page}`).join(', ')}]`);
        }
        passed++;
      } else {
        console.log(`  Result: ❌ FAIL - ${validation.reason}`);
        console.log(`  Answer Snippet: "${response.answer?.slice(0, 200)}..."`);
        failed++;
      }
    } catch (err: any) {
      console.log(`  Result: ❌ ERROR: ${err.message}`);
      failed++;
    }

    // Small delay between tests for rate limits
    await new Promise((r) => setTimeout(r, 700));
  }

  console.log('\n===============================================================');
  console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED out of ${testCases.length}`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runEvaluationSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
