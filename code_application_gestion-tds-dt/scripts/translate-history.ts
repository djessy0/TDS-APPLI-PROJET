import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const GITHUB_REPO = process.env.GITHUB_REPO || 'qsi-dacnc/tds-dt-main';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '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';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

console.log('--- STARTING HISTORY TRANSLATION ---');
console.log('GITHUB_REPO:', GITHUB_REPO);
console.log('GEMINI_API_KEY present:', !!GEMINI_API_KEY);

if (!GEMINI_API_KEY) {
  console.error('Error: GEMINI_API_KEY is not defined in the environment!');
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

function fetchCommits(): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const githubUrl = `https://api.github.com/repos/${GITHUB_REPO}/commits?per_page=40`;
    const options: any = {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Node.js/Translation-Script'
      }
    };

    if (GITHUB_TOKEN) {
      options.headers['Authorization'] = `token ${GITHUB_TOKEN}`;
    }

    https.get(githubUrl, options, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`GitHub API returned status ${res.statusCode}`));
      }

      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function translateWithGemini(summary: string, details: string): Promise<{ summary: string; details: string }> {
  try {
    const prompt = `Translate the following git commit message from English to French. Keep the original prefix if present (e.g. "feat:", "fix:", "style:", "refactor:", "feat(ui):", "fix(shifts):" at the beginning of the summary).
Translate both the summary and details clearly and professionally in French.

English Summary: ${summary}
English Details: ${details}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING, description: "The translated summary in French, preserving the commit prefix like feat:, fix: etc." },
            details: { type: Type.STRING, description: "The translated details in French." }
          },
          required: ["summary", "details"]
        }
      }
    });

    if (response.text) {
      const parsed = JSON.parse(response.text.trim());
      if (parsed.summary && parsed.details) {
        return {
          summary: parsed.summary,
          details: parsed.details
        };
      }
    }
  } catch (error) {
    console.error(`[GEMINI TRANSLATION ERROR] for summary "${summary}":`, error);
  }
  return { summary, details };
}

// Manual translation map as fallback or boost
const manualMap: Record<string, { summary: string; details: string }> = {
  "feat : integrate Gemini for automated commit translation": {
    summary: "feat : intégration de l'API Gemini pour la traduction automatique",
    details: "Ajout du client API Google Gemini côté serveur pour traduire automatiquement en français les messages de commits."
  },
  "style : update expiration status colors to blue": {
    summary: "style : modification de la couleur des échéances en bleu",
    details: "Remplacement des styles clignotants vert et turquoise par une couleur bleue fixe pour les habilitations expirant sous 3 à 6 mois afin d'améliorer la clarté visuelle."
  },
  "fix : adjust week separator colSpan for MR-MGA": {
    summary: "fix : ajustement du colSpan du séparateur de semaine pour MR-MGA",
    details: "Mise à jour de la portée des colonnes du séparateur pour garantir un alignement cohérent lors du rendu du tableau de service MR-MGA."
  },
  "style : adjust MR-MGA table header widths": {
    summary: "style : ajustement de la largeur des en-têtes pour MR-MGA",
    details: "Mise à jour de la largeur des colonnes figées et de la taille de police du tableau de service MR-MGA pour optimiser la lisibilité."
  },
  "style : adjust table layout for MR-MGA entity": {
    summary: "style : ajustement de la disposition du tableau MR-MGA",
    details: "Optimisation de la largeur des colonnes et de la position figée des colonnes Date et Équipe dans le tableau de service MR-MGA pour une meilleure lisibilité."
  }
};

async function run() {
  const dictPath = path.join(process.cwd(), 'translated_commits.json');
  let dict: Record<string, { summary: string; details: string }> = {};

  if (fs.existsSync(dictPath)) {
    try {
      dict = JSON.parse(fs.readFileSync(dictPath, 'utf8'));
      console.log(`Loaded ${Object.keys(dict).length} existing translations from translated_commits.json`);
    } catch (e) {
      console.warn('Could not read existing translated_commits.json, starting fresh.');
    }
  }

  // Pre-fill manual mappings
  for (const [eng, val] of Object.entries(manualMap)) {
    dict[eng] = val;
    // Normalize spaces
    const normEng = eng.replace(/\s*:\s*/g, ': ').trim();
    dict[normEng] = val;
  }

  try {
    const commits = await fetchCommits();
    console.log(`Fetched ${commits.length} commits from GitHub.`);

    // Prepare translation promises to run in parallel
    const promises = commits.map(async (item) => {
      const sha = item.sha ? item.sha.substring(0, 7) : '';
      const message = item.commit?.message || '';
      const parts = message.split('\n');
      const summary = parts[0].trim();
      const details = parts.slice(1).join('\n').trim();

      const normalizedSummary = summary.replace(/\s*:\s*/g, ': ').trim();

      // Check if already in dictionary (by SHA or by Summary)
      const hasTranslation = dict[sha] || dict[summary] || dict[normalizedSummary];

      if (hasTranslation) {
        return { sha, summary, normalizedSummary, translated: hasTranslation, isNew: false };
      }

      console.log(`[QUEUED TRANSLATION] ${sha || 'git'} - ${summary.substring(0, 40)}...`);
      const translated = await translateWithGemini(summary, details);
      return { sha, summary, normalizedSummary, translated, isNew: true };
    });

    const results = await Promise.all(promises);

    for (const res of results) {
      if (res.sha) dict[res.sha] = res.translated;
      dict[res.summary] = res.translated;
      dict[res.normalizedSummary] = res.translated;
      if (res.isNew) {
        console.log(`[TRANSLATED] ${res.sha || 'git'} => FR: ${res.translated.summary}`);
      }
    }

    // Write back to file
    fs.writeFileSync(dictPath, JSON.stringify(dict, null, 2), 'utf8');
    console.log(`Successfully wrote ${Object.keys(dict).length} translation keys to translated_commits.json!`);
  } catch (error) {
    console.error('Translation process failed:', error);
  }
}

run();
