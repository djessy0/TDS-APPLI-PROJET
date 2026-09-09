import express from "express";
import "dotenv/config";
// L'import de Vite est déplacé en dynamique plus bas pour éviter l'erreur en production
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import cron from "node-cron";
import { exec, spawn } from "child_process";
import { HttpsProxyAgent } from "https-proxy-agent";
import { GoogleGenAI, Type } from "@google/genai";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

import nodemailer from "nodemailer";
import https from "https";
import net from "net";

import { Resend } from "resend";

let cachedProxyStatus: boolean | null = null;
let lastProxyCheckTime = 0;

let aiClient: any = null;

function getGeminiClient() {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      return null;
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

async function translateWithGemini(summary: string, details: string): Promise<{ summary: string; details: string }> {
  const ai = getGeminiClient();
  if (!ai) {
    return { summary, details };
  }
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
    console.error("[GEMINI TRANSLATION ERROR]", error);
  }
  return { summary, details };
}

function translateLocal(summary: string, details: string): { summary: string; details: string; isTranslated: boolean } {
  const cleanSummary = (summary || '').trim();
  const cleanDetails = (details || '').trim();

  const summaryMap: Record<string, string> = {
    "chore(i18n): update translation map for commit history": "chore(i18n) : mise à jour du dictionnaire de traduction pour le journal des mises à jour",
    "chore(i18n) : update translation map for commit history": "chore(i18n) : mise à jour du dictionnaire de traduction pour le journal des mises à jour",
    "feat: add circuit breaker for Gemini translation": "feat : ajout d'un coupe-circuit pour la traduction Gemini",
    "feat : add circuit breaker for Gemini translation": "feat : ajout d'un coupe-circuit pour la traduction Gemini",
    "refactor: improve update date logic and cleanup": "refactor : amélioration de la logique des dates de mise à jour et nettoyage",
    "refactor : improve update date logic and cleanup": "refactor : amélioration de la logique des dates de mise à jour et nettoyage",
    "chore: improve commit message translation parsing": "chore : amélioration du traitement des traductions de messages de commits",
    "chore : improve commit message translation parsing": "chore : amélioration du traitement des traductions de messages de commits",
    "feat: add Gemini translation and dynamic versioning": "feat : intégration de l'API Gemini et versionnage dynamique",
    "feat : add Gemini translation and dynamic versioning": "feat : intégration de l'API Gemini et versionnage dynamique",
    "fix: adjust comment styling for MR-MGA entity": "fix : ajustement du style des commentaires pour l'entité MR-MGA",
    "fix : adjust comment styling for MR-MGA entity": "fix : ajustement du style des commentaires pour l'entité MR-MGA",
    "fix: adjust legend layout for MR-MGA in print mode": "fix : ajustement de la disposition de la légende pour MR-MGA à l'impression",
    "fix : adjust legend layout for MR-MGA in print mode": "fix : ajustement de la disposition de la légende pour MR-MGA à l'impression",
    "feat(ui): display status label in tooltip for MR-MGA": "feat(ui) : affichage du libellé de statut dans l'infobulle pour MR-MGA",
    "feat(ui) : display status label in tooltip for MR-MGA": "feat(ui) : affichage du libellé de statut dans l'infobulle pour MR-MGA",
    "refactor: simplify status priority logic": "refactor : simplification de la logique de priorité des statuts",
    "refactor : simplify status priority logic": "refactor : simplification de la logique de priorité des statuts",
    "fix(shifts): exclude weekends from weekly entry counts": "fix(shifts) : exclusion des week-ends des totaux d'entrées hebdomadaires",
    "fix(shifts) : exclude weekends from weekly entry counts": "fix(shifts) : exclusion des week-ends des totaux d'entrées hebdomadaires",
    "fix: update display logic for MR-MGA off-days": "fix : mise à jour de la logique d'affichage des jours de repos de MR-MGA",
    "fix : update display logic for MR-MGA off-days": "fix : mise à jour de la logique d'affichage des jours de repos de MR-MGA",
    "feat: add EPI status and update auto-fill logic": "feat : ajout du statut EPI et mise à jour des priorités de remplissage",
    "feat : add EPI status and update auto-fill logic": "feat : ajout du statut EPI et mise à jour des priorités de remplissage",
    "feat: add automated expiry alerts and UI styling": "feat : alertes d'expiration automatiques et mise en style de l'IHM",
    "feat : add automated expiry alerts and UI styling": "feat : alertes d'expiration automatiques et mise en style de l'IHM",
    "refactor: fix synthesized status logic in App.tsx": "refactor : correction de la logique de synthèse des statuts dans App.tsx",
    "refactor : fix synthesized status logic in App.tsx": "refactor : correction de la logique de synthèse des statuts dans App.tsx",
    "refactor: remove redundant weekly entry cleanup": "refactor : nettoyage de la suppression redondante des entrées de semaine",
    "refactor : remove redundant weekly entry cleanup": "refactor : nettoyage de la suppression redondante des entrées de semaine",
    "fix: clear database entries for empty weekly status": "fix : nettoyage en base des entrées pour les statuts hebdomadaires vides",
    "fix : clear database entries for empty weekly status": "fix : nettoyage en base des entrées pour les statuts hebdomadaires vides",
    "fix: restrict weekly entry matching for MR-MGA": "fix : restriction de la correspondance d'entrée hebdomadaire pour MR-MGA",
    "fix : restrict weekly entry matching for MR-MGA": "fix : restriction de la correspondance d'entrée hebdomadaire pour MR-MGA",
    "feat(mail): implement email workflow and template management": "feat(mail) : intégration du flux d'e-mails et de la gestion des modèles",
    "feat(mail) : implement email workflow and template management": "feat(mail) : intégration du flux d'e-mails et de la gestion des modèles",
    "fix: adjust trigram header sizing for MR-TTA print": "fix : ajustement de la taille de l'en-tête du trigramme à l'impression pour MR-TTA",
    "fix : adjust trigram header sizing for MR-TTA print": "fix : ajustement de la taille de l'en-tête du trigramme à l'impression pour MR-TTA",
    "style: increase font size for MR-TTA trigrams": "style : agrandissement de la police des trigrammes de MR-TTA",
    "style : increase font size for MR-TTA trigrams": "style : agrandissement de la police des trigrammes de MR-TTA",
    "style(ui): update absence colors for MR-TTA entity": "style(ui) : couleurs d'absences mises à jour pour MR-TTA",
    "style(ui) : update absence colors for MR-TTA entity": "style(ui) : couleurs d'absences mises à jour pour MR-TTA",
    "fix: hide comments for MR-TTA entity in service display": "fix : masquage des commentaires pour MR-TTA dans l'affichage du service",
    "fix : hide comments for MR-TTA entity in service display": "fix : masquage des commentaires pour MR-TTA dans l'affichage du service",
    "fix(ui): prevent comment display for MR-TTA entity": "fix(ui) : blocage de l'affichage des commentaires pour MR-TTA",
    "fix(ui) : prevent comment display for MR-TTA entity": "fix(ui) : blocage de l'affichage des commentaires pour MR-TTA",
    "feat: apply specific style for FOR in MR-TTA": "feat : style spécifique appliqué au statut FOR pour MR-TTA",
    "feat : apply specific style for FOR in MR-TTA": "feat : style spécifique appliqué au statut FOR pour MR-TTA",
    "fix(ui): adjust font sizes for MR-TTA print layout": "fix(ui) : ajustement des tailles de police pour la mise en page de MR-TTA",
    "fix(ui) : adjust font sizes for MR-TTA print layout": "fix(ui) : ajustement des tailles de police pour la mise en page de MR-TTA",
    "feat(ui): enhance MR-TTA header layout": "feat(ui) : amélioration de la mise en page de l'en-tête de MR-TTA",
    "feat(ui) : enhance MR-TTA header layout": "feat(ui) : amélioration de la mise en page de l'en-tête de MR-TTA",
    "feat: add bulk annual MGA update functionality": "feat : fonction de mise à jour annuelle groupée pour MGA",
    "feat : add bulk annual MGA update functionality": "feat : fonction de mise à jour annuelle groupée pour MGA",
    "refactor(email): remove inline styles from email template": "refactor(email) : suppression des styles en ligne dans le modèle d'e-mail",
    "refactor(email) : remove inline styles from email template": "refactor(email) : suppression des styles en ligne dans le modèle d'e-mail",
    "style: update MR-MGA week separator styling": "style : mise à jour du style des séparateurs de semaine de MR-MGA",
    "style : update MR-MGA week separator styling": "style : mise à jour du style des séparateurs de semaine de MR-MGA",
    "feat(ui): add weekly separator for MR-MGA entity": "feat(ui) : séparateurs de semaine ajoutés pour MR-MGA",
    "feat(ui) : add weekly separator for MR-MGA entity": "feat(ui) : séparateurs de semaine ajoutés pour MR-MGA",
    "refactor: remove conditional border styling in table": "refactor : suppression des styles de bordure de cellule du tableau",
    "refactor : remove conditional border styling in table": "refactor : suppression des styles de bordure de cellule du tableau",
    "feat: add support for Siège entity status mapping": "feat : ajouter le support pour le mappage des statuts pour l'entité Siège",
    "feat : add support for Siège entity status mapping": "feat : ajouter le support pour le mappage des statuts pour l'entité Siège",
    "fix: update email action link paths": "fix : mise à jour des chemins des liens d'action par e-mail",
    "fix : update email action link paths": "fix : mise à jour des chemins des liens d'action par e-mail",
    "chore(i18n): update commit message translation map": "chore(i18n) : mise à jour du dictionnaire de traduction pour le journal des mises à jour",
    "chore(i18n) : update commit message translation map": "chore(i18n) : mise à jour du dictionnaire de traduction pour le journal des mises à jour",
    "style: update MO color and add new service codes": "style : mise à jour de la couleur MO et ajout de nouveaux codes de service",
    "style : update MO color and add new service codes": "style : mise à jour de la couleur MO et ajout de nouveaux codes de service",
    "feat: add custom status legend for MR-MGA entity": "feat : ajouter une légende de statuts personnalisée pour l'entité MR-MGA",
    "feat : add custom status legend for MR-MGA entity": "feat : ajouter une légende de statuts personnalisée pour l'entité MR-MGA",
    "feat: allow MR-MGA entity to use simplified entry lookup": "feat : permettre à l'entité MR-MGA d'utiliser la recherche simplifiée des saisies",
    "feat : allow MR-MGA entity to use simplified entry lookup": "feat : permettre à l'entité MR-MGA d'utiliser la recherche simplifiée des saisies",
    "feat: initial commit": "feat : premier commit (initialisation)",
    "feat : initial commit": "feat : premier commit (initialisation)",
    "initial commit": "initialisation du projet",
    "feat : add dynamic expiry status indicator": "feat : ajout d'un indicateur dynamique du statut d'expiration",
    "feat: add dynamic expiry status indicator": "feat : ajout d'un indicateur dynamique du statut d'expiration",
    "feat(ui): optimize schedule popover positioning": "feat(ui) : optimiser le positionnement de l'infobulle du planning",
    "feat(ui) : optimize schedule popover positioning": "feat(ui) : optimiser le positionnement de l'infobulle du planning",
    "feat : improve hover visibility for schedule cells": "feat : améliorer la visibilité au survol des cellules du planning",
    "feat: improve hover visibility for schedule cells": "feat : améliorer la visibilité au survol des cellules du planning",
    "docs: add MR-MGA business rules and update version": "docs : ajout des règles de gestion MR-MGA et mise à jour de la version",
    "docs : add MR-MGA business rules and update version": "docs : ajout des règles de gestion MR-MGA et mise à jour de la version",
    "fix(ui): adjust tooltip position for cell hover": "fix(ui) : ajuster la position de l'infobulle au survol des cellules",
    "fix(ui) : adjust tooltip position for cell hover": "fix(ui) : ajuster la position de l'infobulle au survol des cellules",
    "refactor: extract getSiegeWeekDetails logic": "refactor : extraire la logique de getSiegeWeekDetails",
    "refactor : extract getSiegeWeekDetails logic": "refactor : extraire la logique de getSiegeWeekDetails"
  };

  const detailsMap: Record<string, string> = {
    "Add new entries to the translation dictionary to support recent localization updates for documentation, UI fixes, and refactoring tasks.":
      "Ajouter de nouvelles entrées au dictionnaire de traduction pour prendre en charge les récentes mises à jour de localisation pour la documentation, les correctifs d'interface utilisateur et les tâches de refactorisation.",
    "Disable Gemini API calls automatically when encountering invalid API key errors to prevent repeated failed requests and ensure fallback to dictionary-based translation.":
      "Désactiver automatiquement les appels à l'API Gemini en cas d'erreurs de clé d'API non valide afin d'éviter la répétition des requêtes échouées et assurer le basculement vers la traduction du dictionnaire.",
    "Sort app updates by ID to ensure the latest version is identified.\n- Enhance date parsing robustness with manual fallback formats.\n- Remove redundant translation logic in the server.":
      "Trier les mises à jour par ID pour identifier la dernière version.\n- Renforcer la lecture des dates par des formats de secours.\n- Retirer les traitements de traduction superflus côté serveur.",
    "Update regex patterns to support flexible spacing around colons and parentheses, and add new mappings to the translation dictionary to improve support for commit log localization.":
      "Mettre à jour les expressions régulières pour accepter des espacements souples autour des deux-points et parenthèses, et enrichir le dictionnaire pour la localisation du journal des modifications.",
    "Integrate Google Gemini API for automated French translation of commit messages.\n- Implement dynamic version and date display in the UI based on repository updates.\n- Update GitHub repository configuration.\n- Document specific business logic rules for MR-MGA in AGENTS.md.":
      "Intégrer l'API Google Gemini pour la traduction automatique en français des messages de commits.\n- Mettre en œuvre l'affichage dynamique de la version et de sa date dans l'IHM selon l'historique.\n- Configurer l'accès au dépôt GitHub.\n- Spécifier les règles métier de MR-MGA dans AGENTS.md.",
    "Update comment display formatting to improve readability for the MR-MGA entity by enabling word wrapping and adjusting font sizing.":
      "Ajuster le rendu visuel des commentaires de MR-MGA pour faciliter leur lecture en activant le retour à la ligne et en calibrant la taille des de polices de caractères.",
    "Hide the legend column for MR-MGA when printing to optimize document space and layout.":
      "Masquer la section de légende pour les agents MR-MGA lors de l'impression afin d'utiliser au mieux l'espace disponible de la page imprimée.",
    "Enhance the tooltip functionality for MR-MGA entries to show the status label alongside the optional comment, improving readability and information clarity.":
      "Enrichir le contenu des infobulles annuelles de MR-MGA pour afficher la description complète et officielle du statut en plus de l'éventuel commentaire enregistré.",
    "Replace manual conditional checks with an ordered array lookup to improve maintainability and readability of status priority assignment.":
      "Rationaliser la recherche des priorités de statuts par une indexation ordonnée dans un tableau plutôt que par une série de conditions manuelles imbriquées.",
    "Update entry filtering logic to ignore Saturdays and Sundays when calculating weekly totals for users.":
      "Ajuster le décompte d'activité hebdomadaire de MR-MGA pour filtrer et exclure systématiquement les week-ends (samedis et dimanches) de la somme de présences.",
    "Adjust the display conditions for 'OFF' statuses in MR-MGA to ensure consistent rendering within the service schedule.":
      "Harmoniser les conditions de rendu graphique du code 'OFF' au sein du tableau de service hebdomadaire de l'entité MR-MGA.",
    "Include EPI in the status list and refine the auto-fill priority rankings to support a wider range of statuses for MGA scheduling.":
      "Intégrer le code EPI dans le barème des présences et mettre au point l'ordre d'auto-remplissage pour gérer une plus grande panoplie de statuts de l'entité MGA.",
    "Implement database tracking for professional title expiry alerts and update the UI with color-coded status indicators to improve monitoring of upcoming deadlines.":
      "Développer le suivi en base de données pour les dates d'expiration des habilitations et titres professionnels, et ajouter des jalons colorés au planning pour signaler les dates d'échéances critiques.",
    "Adjust the scope of status synthesis to ensure current saved entries are processed correctly even when no valid daily counts exist.":
      "Ajuster le calcul de synthèse de statut pour veiller à valoriser les saisies enregistrées même si aucun relevé journalier n'est rattaché.",
    "Remove logic that explicitly clears weekly entries when no valid status is provided, as it is no longer required for the current state management.":
      "Retirer le processus de purge explicite des données de semaine d'un agent si aucun statut n'est en cours, pour correspondre au nouveau cycle d'état.",
    "Ensure that when no valid status is provided for a week, any existing entry in the database is cleared to maintain data consistency.":
      "Garantir la cohérence des données en effaçant l'enregistrement d'une semaine en base de données des entrées de l'agent si aucun statut n'est affecté.",
    "Exclude weekly entry fallback logic for MR-MGA users to ensure correct daily entry resolution in the service schedule.":
      "Désactiver la logique de secours hebdomadaire par défaut pour l'entité MR-MGA de sorte à prioriser la saisie journalière dans le planning de service.",
    "Added backend mail routing logic for operational/test modes and created a configuration interface in the admin panel to customize mail templates, subjects, and recipients.":
      "Ajouter une couche d'envoi et de routage des courriels (e-mails) sous forme opérationnelle ou bac à sable, et intégrer un panneau d'administration pour configurer les modèles et listes d'expédition.",
    "Update CSS and header classes to ensure correct font sizing for MR-TTA entities during print operations.":
      "Corriger l'affichage CSS et les éléments d'en-tête pour avoir des gabarits de textes optimaux à l'impression pour la division MR-TTA.",
    "Adjust the print text size for MR-TTA trigram headers to improve readability in printed reports.":
      "Modifier l'échelle typographique des en-têtes de trigrammes pour MR-TTA pour bonifier la lisibilité sur support papier.",
    "Apply specific gray-themed styling for absence statuses (ABS, ABS_V, ABS_D) when the entity is set to MR-TTA.":
      "Appliquer des couleurs grises caractéristiques aux différents types de congés et d'absences spécifiques à l'entité TTA.",
    "Disable comment tooltips and indicators for the MR-TTA entity to align with specific display requirements.":
      "Masquer tous les drapeaux d'indicateurs et les textes de commentaires pour MR-TTA selon ses politiques de confidentialité de données.",
    "Restricts the visibility of entry comments specifically for the MR-TTA entity in the service table display.":
      "Empêcher formellement la lecture ou l'affichage de commentaires d'entrées pour les structures opérationnelles de l'entité TTA.",
    "Update getStatusColor to handle entity-specific styling, using a distinct color for Formation (FOR) when the entity is MR-TTA.":
      "Attribuer une coloration jaune orangée unique au code Formation FOR spécifiquement pour le personnel MR-TTA.",
    "Standardize print font sizes and improve text readability for the MR-TTA entity by increasing font scale in print mode.":
      "Homogénéiser et agrandir les polices à l'impression pour le planning d'affectation hebdomadaire de l'entité MR-TTA.",
    "Update the print header for MR-TTA to improve readability by highlighting the week number in a dedicated badge and restructuring the date display.":
      "Embellir et réouvrir l'en-tête d'impression de MR-TTA, en plaçant le numéro de la semaine dans une étiquette visuelle bien identifiée.",
    "Implement server-side endpoint and client-side logic to automatically populate and update annual TDS entries for the MGA division based on defined status priorities.":
      "Créer un point d'accès côté serveur pour remplir et recalculer automatiquement toutes les entrées de l'année pour les équipes MGA en appliquant la grille des priorités.",
    "Clean up email HTML template by removing unused inline CSS styles to improve code maintainability.":
      "Supprimer les styles CSS superflus et épurations d'e-mails pour simplifier l'intégration technique.",
    "Improve visual distinction for MR-MGA week separators by updating background and border styles.":
      "Donner un meilleur aspect de démarcation pour les discontinuités de semaine de MR-MGA en redessinant les bordures.",
    "Extend the weekly separator display logic to include MR-MGA and apply specific styling for better visual distinction.":
      "Appliquer l'affichage du séparateur de semaines pour la commission MR-MGA pour faciliter la lecture rythmique.",
    "Clean up the table cell rendering by removing the specific MR-MGA weekend styling to maintain a consistent UI across all entities.":
      "Supprimer la surcharge de bordure de week-end pour l'entité MR-MGA afin de standardiser le look général des tableaux de service.",
    "Move weekly schedule calculation logic to a dedicated function to improve maintainability and handle daily versus weekly entry resolution for the Siege entity.":
      "Déplacer la logique de calcul du planning hebdomadaire dans une fonction isolée afin d'assurer la séparation des rôles et de mieux arbitrer entre saisies journalières et hebdomadaires de l'entité Siège.",
    "Update status resolution logic to correctly handle Siège-specific codes (CA/FOR) and update the repository.":
      "Mettre à jour la résolution de statuts pour la prise en charge correcte des types de codes propres à l'entité Siège comme Congés Annuels (CA) et Formation (FOR).",
    "Standardize email redirection paths to root-based URLs to ensure consistent navigation within the application.":
      "Standardiser les chemins de redirection des e-mails vers des URL basées sur la racine afin de garantir une navigation cohérente au sein de l'application.",
    "Expand the translation dictionary to include recent feature, fix, and refactor commit messages for better UI localization.":
      "Enrichir le dictionnaire de traduction pour inclure les récents messages de commit (fonctionnalités, corrections et refactorisations) afin d'améliorer la localisation de l'interface utilisateur."
  };

  let hasSummary = summaryMap[cleanSummary] !== undefined;
  let summaryVal = hasSummary ? summaryMap[cleanSummary] : summary;

  let hasDetails = detailsMap[cleanDetails] !== undefined;
  let detailsVal = hasDetails ? detailsMap[cleanDetails] : details;

  // Let's do a few simple regex replacements as a fallback
  if (!hasSummary) {
    summaryVal = summaryVal
      .replace(/^feat\s*:\s*/i, "feat : ")
      .replace(/^fix\s*:\s*/i, "fix : ")
      .replace(/^style\s*:\s*/i, "style : ")
      .replace(/^refactor\s*:\s*/i, "refactor : ")
      .replace(/^chore\s*:\s*/i, "chore : ")
      .replace(/^docs\s*:\s*/i, "docs : ")
      .replace(/add dynamic expiry status indicator/gi, "ajout d'un indicateur dynamique du statut d'expiration")
      .replace(/optimize schedule popover positioning/gi, "optimiser le positionnement de l'infobulle du planning")
      .replace(/improve hover visibility for schedule cells/gi, "améliorer la visibilité au survol des cellules du planning")
      .replace(/update MO color and add new service codes/gi, "mise à jour de la couleur de la MO et ajout de nouveaux codes de service")
      .replace(/add custom status legend for MR-MGA entity/gi, "ajout d'une légende de statuts personnalisée pour l'entité MR-MGA")
      .replace(/allow MR-MGA entity to use simplified entry lookup/gi, "permettre à l'entité MR-MGA d'utiliser la recherche simplifiée des saisies")
      .replace(/update getWeekEntry to support MR-MGA entity logic/gi, "mettre à jour getWeekEntry pour prendre en charge la logique de l'entité MR-MGA")
      .replace(/add MR-MGA business rules and update version/gi, "ajout des règles de gestion MR-MGA et mise à jour de la version")
      .replace(/adjust tooltip position for cell hover/gi, "ajuster la position de l'infobulle au survol des cellules")
      .replace(/extract getSiegeWeekDetails logic/gi, "extraire la logique de getSiegeWeekDetails")
      .replace(/add support for Siège entity status mapping/gi, "ajouter le support de la correspondance des statuts de l'entité Siège")
      .replace(/update translation map for commit history/gi, "mettre à jour la table de traduction du journal des modifications")
      .replace(/add circuit breaker for Gemini translation/gi, "ajouter un coupe-circuit pour la traduction Gemini")
      .replace(/improve update date logic and cleanup/gi, "améliorer la logique des dates de mise à jour et nettoyage")
      .replace(/improve commit message translation parsing/gi, "améliorer l'analyse des traductions des messages de commits")
      .replace(/add Gemini translation and dynamic versioning/gi, "ajouter la traduction Gemini et le versionnage dynamique")
      .replace(/adjust comment styling for MR-MGA entity/gi, "ajuster le style des commentaires pour l'entité MR-MGA")
      .replace(/adjust legend layout for MR-MGA in print mode/gi, "ajuster la mise en page de la légende MR-MGA pour l'impression")
      .replace(/display status label in tooltip for MR-MGA/gi, "afficher le libellé de statut dans l'infobulle MR-MGA")
      .replace(/simplify status priority logic/gi, "simplifier la logique de priorité des statuts")
      .replace(/exclude weekends from weekly entry counts/gi, "exclure les week-ends du décompte hebdomadaire")
      .replace(/update display logic for MR-MGA off-days/gi, "mettre à jour la logique d'affichage des jours de repos MR-MGA")
      .replace(/add EPI status and update auto-fill logic/gi, "ajouter le statut EPI et mettre à jour le remplissage de sécurité")
      .replace(/add automated expiry alerts and UI styling/gi, "ajouter les alertes d'expiration automatiques et le style d'IHM")
      .replace(/fix synthesized status logic in App.tsx/gi, "corriger la logique de calcul de statut combiné dans App.tsx")
      .replace(/remove redundant weekly entry cleanup/gi, "enlever le vidage redondant des entrées hebdomadaires")
      .replace(/clear database entries for empty weekly status/gi, "nettoyer en base les statuts de semaine vides")
      .replace(/restrict weekly entry matching for MR-MGA/gi, "restreindre les équivalences d'entrées de semaine pour MR-MGA")
      .replace(/implement email workflow and template management/gi, "intégrer le processus de courriels et les gabarits de messages")
      .replace(/adjust trigram header sizing for MR-TTA print/gi, "ajuster l'en-tête de trigramme de MR-TTA pour l'impression")
      .replace(/increase font size for MR-TTA trigrams/gi, "agrandir le texte des trigrammes MR-TTA")
      .replace(/update absence colors for MR-TTA entity/gi, "actualiser la couleur des absences de MR-TTA")
      .replace(/hide comments for MR-TTA entity in service display/gi, "masquer les notes MR-TTA du tableau de service")
      .replace(/prevent comment display for MR-TTA entity/gi, "bloquer l'affichage des notes d'agents pour MR-TTA")
      .replace(/apply specific style for FOR in MR-TTA/gi, "marquer d'un style propre les formations (FOR) dans MR-TTA")
      .replace(/adjust font sizes for MR-TTA print layout/gi, "calibrer l'échelle typographique d'impression pour MR-TTA")
      .replace(/enhance MR-TTA header layout/gi, "améliorer les en-têtes d'état de MR-TTA")
      .replace(/add bulk annual MGA update functionality/gi, "déployer la mise à jour annuelle groupée de MGA")
      .replace(/remove inline styles from email template/gi, "alléger les styles du modèle d'e-mail")
      .replace(/update MR-MGA week separator styling/gi, "modifier les séparateurs de semaines de MR-MGA")
      .replace(/add weekly separator for MR-MGA entity/gi, "ajouter un marquage hebdomadaire pour MR-MGA")
      .replace(/remove conditional border styling in table/gi, "retirer la bordure conditionnelle des cellules du tableau")
      .replace(/update email action link paths/gi, "mise à jour des chemins des liens d'action par e-mail")
      .replace(/update commit message translation map/gi, "mise à jour du dictionnaire de traduction pour le journal des mises à jour")
      .replace(/initial commit/gi, "premier commit");

    if (summaryVal !== summary) {
      hasSummary = true;
    }
  }

  if (!hasDetails) {
    detailsVal = detailsVal
      .replace(/Implement renderExpiryCell to display color-coded visual alerts for qualification expiration dates, improving visibility of critical deadlines\./gi, "Implémenter l'affichage dynamique d'alertes visuelles colorées pour les dates d'expiration des qualifications, améliorant ainsi la visibilité des échéances critiques.")
      .replace(/Adjust popover display logic to prevent overflow by detecting when rows are near the bottom of the container\./gi, "Ajuster la logique d'affichage des infobulles/popovers pour éviter les débordements en détectant quand les lignes sont proches du bas du tableau.")
      .replace(/Add hover:z-50 to td elements to ensure cell overlays are fully visible when hovered\./gi, "Ajouter la propriété 'hover:z-50' aux éléments de cellule (td) pour s'assurer que les infobulles de planification soient entièrement visibles au survol.")
      .replace(/Adjust the color for MO code and register Abs and EPI service codes to improve visual clarity and coverage in the service schedule\./gi, "Ajuster la couleur du code MO et enregistrer les codes de service Abs et EPI pour améliorer la clarté visuelle et la couverture dans le planning de service.")
      .replace(/Define a specific status legend for the MR-MGA entity to accurately reflect its work patterns and types of absence, separating it from the logic used for other entities\./gi, "Définir une légende de statuts spécifique pour l'entité MR-MGA afin de refléter fidèlement ses rythmes de travail et types d'absence, en la séparant de la logique des autres entités.")
      .replace(/Update getWeekEntry to support MR-MGA entity logic, ensuring consistent entry retrieval for agents in that department\./gi, "Mettre à jour getWeekEntry pour prendre en charge la logique de l'entité MR-MGA, assurant une récupération cohérente des saisies pour les agents de ce service.")
      .replace(/Document specific calculation and display rules for the MR-MGA entity and update the application version to 1\.8\.13\./gi, "Documenter les règles spécifiques de calcul et d'affichage pour l'entité MR-MGA, et mettre à jour la version de l'application en 1.8.13.")
      .replace(/Move the tooltip below the cell to prevent it from being obscured by overflow or being off-screen when hovering over elements at the top of the grid\./gi, "Déplacer l'infobulle sous la cellule pour éviter qu'elle ne soit masquée par un débordement ou positionnée hors de l'écran lors du survol d'éléments en haut de la grille.")
      .replace(/extract getSiegeWeekDetails logic/gi, "extraire la logique de getSiegeWeekDetails")
      .replace(/Add new entries to the translation dictionary to support recent localization updates for documentation, UI fixes, and refactoring tasks\./gi, "Ajouter de nouvelles entrées au dictionnaire de traduction pour prendre en charge les récentes localisations pour la documentation, les correctifs d'interface utilisateur et les tâches de refactorisation.")
      .replace(/Disable Gemini API calls automatically when encountering invalid API key errors to prevent repeated failed requests and ensure fallback to dictionary-based translation\./gi, "Désactiver automatiquement les appels à l'API Gemini en cas d'erreurs d'API key invalide afin d'éviter la répétition des requêtes échouées et assurer la traduction de secours du dictionnaire.")
      .replace(/Sort app updates by ID to ensure the latest version is identified\./gi, "Trier les mises à jour par ID pour identifier la dernière version.")
      .replace(/Enhance date parsing robustness with manual fallback formats\./gi, "Renforcer l'analyse des dates avec des formats de secours.")
      .replace(/Remove redundant translation logic in the server\./gi, "Retirer la logique de traduction redondante sur le serveur.")
      .replace(/Update regex patterns to support flexible spacing around colons and parentheses, and add new mappings to the translation dictionary to improve support for commit log localization\./gi, "Mettre à jour les regex pour accepter des espacements souples autour des deux-points et parenthèses, et enrichir le dictionnaire pour la localisation du journal des modifications.")
      .replace(/Integrate Google Gemini API for automated French translation of commit messages\./gi, "Intégrer l'API Google Gemini pour la traduction automatique en français des messages de commits.")
      .replace(/Implement dynamic version and date display in the UI based on repository updates\./gi, "Mettre en œuvre l'affichage dynamique de la version et de sa date dans l'IHM selon l'historique.")
      .replace(/Update GitHub repository configuration\./gi, "Mettre à jour la configuration du dépôt GitHub.")
      .replace(/Document specific business logic rules for MR-MGA in AGENTS.md\./gi, "Spécifier les règles métier de MR-MGA dans AGENTS.md.")
      .replace(/Update comment display formatting to improve readability for the MR-MGA entity by enabling word wrapping and adjusting font sizing\./gi, "Améliorer la lisibilité des commentaires pour l'entité MR-MGA en activant les retours automatiques à la ligne et en calibrant la taille des polices.")
      .replace(/Hide the legend column for MR-MGA when printing to optimize document space and layout\./gi, "Masquer la section de légende pour les agents MR-MGA lors de l'impression afin d'utiliser au mieux l'espace de la page.")
      .replace(/Enhance the tooltip functionality for MR-MGA entries to show the status label alongside the optional comment, improving readability and information clarity\./gi, "Enrichir le contenu des infobulles de MR-MGA pour afficher la description complète du statut en plus de l'éventuel commentaire.")
      .replace(/Replace manual conditional checks with an ordered array lookup to improve maintainability and readability of status priority assignment\./gi, "Remplacer les tests conditionnels manuels par une recherche d'index ordonnée dans un tableau pour améliorer la maintenabilité.")
      .replace(/Update entry filtering logic to ignore Saturdays and Sundays when calculating weekly totals for users\./gi, "Filtrer et exclure systématiquement les week-ends (samedis et dimanches) de la somme de présences.")
      .replace(/Adjust the display conditions for 'OFF' statuses in MR-MGA to ensure consistent rendering within the service schedule\./gi, "Optimiser le rendu graphique du statut 'OFF' au sein du tableau de service de l'entité MR-MGA.")
      .replace(/Include EPI in the status list and refine the auto-fill priority rankings to support a wider range of statuses for MGA scheduling\./gi, "Intégrer le code EPI dans la liste des statuts et affiner les priorités automatiques pour l'entité MGA.")
      .replace(/Implement database tracking for professional title expiry alerts and update the UI with color-coded status indicators to improve monitoring of upcoming deadlines\./gi, "Développer le suivi pour les d'échéances d'habilitations et ajouter des jalons colorés d'expiration sur l'échelle de temps.")
      .replace(/Adjust the scope of status synthesis to ensure current saved entries are processed correctly even when no valid daily counts exist\./gi, "Ajuster la synthèse pour s'assurer que les entrées enregistrées soient traitées même si aucun relevé journalier n'existe.")
      .replace(/Remove logic that explicitly clears weekly entries when no valid status is provided, as it is no longer required for the current state management\./gi, "Retirer le nettoyage automatique des entrées de semaine vides.")
      .replace(/Ensure that when no valid status is provided for a week, any existing entry in the database is cleared to maintain data consistency\./gi, "Garantir la cohérence des données en vidant l'entrée de semaine s'il n'y a pas de statut actif.")
      .replace(/Exclude weekly entry fallback logic for MR-MGA users to ensure correct daily entry resolution in the service schedule\./gi, "Éviter la logique de secours hebdomadaire par défaut pour MR-MGA pour donner la priorité au planning journalier.")
      .replace(/Added backend mail routing logic for operational\/test modes and created a configuration interface in the admin panel to customize mail templates, subjects, and recipients\./gi, "Développer le système d'expédition des e-mails en mode bac à sable ou production et ajouter le panneau d'administration des gabarits.")
      .replace(/Update CSS and header classes to ensure correct font sizing for MR-TTA entities during print operations\./gi, "Corriger l'en-tête et les styles pour assurer des tailles de fonts idéales lors de l'impression de MR-TTA.")
      .replace(/Adjust the print text size for MR-TTA trigram headers to improve readability in printed reports\./gi, "Ajuster l'échelle de texte d'en-tête d'impression de MR-TTA pour l'impression finale.")
      .replace(/Apply specific gray-themed styling for absence statuses \(ABS, ABS_V, ABS_D\) when the entity is set to MR-TTA\./gi, "Assigner des teintes grises significatives aux absences de l'entité TTA.")
      .replace(/Disable comment tooltips and indicators for the MR-TTA entity to align with specific display requirements\./gi, "Masquer les bulles d'aide et les commentaires d'agents de MR-TTA.")
      .replace(/Restricts the visibility of entry comments specifically for the MR-TTA entity in the service table display\./gi, "Restreindre l'affichage des commentaires d'entrée pour la division TTA.")
      .replace(/Update getStatusColor to handle entity-specific styling, using a distinct color for Formation \(FOR\) when the entity is MR-TTA\./gi, "Donner un jaune unique d'affichage au code Formation de l'entité MR-TTA.")
      .replace(/Standardize print font sizes and improve text readability for the MR-TTA entity by increasing font scale in print mode\./gi, "Harmoniser et agrandir l'échelle typographique à l'impression pour MR-TTA.")
      .replace(/Update the print header for MR-TTA to improve readability by highlighting the week number in a dedicated badge and restructuring the date display\./gi, "Améliorer l'en-tête d'impression de MR-TTA en valorisant le numéro de la semaine par un badge.")
      .replace(/Implement server-side endpoint and client-side logic to automatically populate and update annual TDS entries for the MGA division based on defined status priorities\./gi, "Mettre en place la mise à jour globale annuelle en lot de MGA selon l'échelle logique de préséance.")
      .replace(/Clean up email HTML template by removing unused inline CSS styles to improve code maintainability\./gi, "Simplifier les styles pour le modèle HTML d'expédition des courriels.")
      .replace(/Improve visual distinction for MR-MGA week separators by updating background and border styles\./gi, "Peaufiner les limites visuelles de semaines pour MR-MGA.")
      .replace(/Extend the weekly separator display logic to include MR-MGA and apply specific styling for better visual distinction\./gi, "Activer la séparation par semaine pour MR-MGA pour faciliter la lecture rythmique.")
      .replace(/Clean up the table cell rendering by removing the specific MR-MGA weekend styling to maintain a consistent UI across all entities\./gi, "Enlever la stylisation particulière de week-ends pour MR-MGA afin de conserver des grilles standardisées.")
      .replace(/Move weekly schedule calculation logic to a dedicated function to improve maintainability and handle daily versus weekly entry resolution for the Siege entity\./gi, "Déplacer le calcul d'équivalent hebdo du Siège vers une fonction isolée afin de pérenniser le code.")
      .replace(/Update status resolution logic to correctly handle Siège-specific codes \(CA\/FOR\) and update the repository\./gi, "Compléter la résolution logique pour s'adapter aux statuts Congés Annuels (CA) ou Formation (FOR) exclusifs au Siège.")
      .replace(/Standardize email redirection paths to root-based URLs to ensure consistent navigation within the application\./gi, "Standardiser les chemins de redirection des e-mails vers des URL basées sur la racine afin de garantir une navigation cohérente au sein de l'application.")
      .replace(/Expand the translation dictionary to include recent feature, fix, and refactor commit messages for better UI localization\./gi, "Enrichir le dictionnaire de traduction pour inclure les récents messages de commit (fonctionnalités, corrections et refactorisations) afin d'améliorer la localisation de l'interface utilisateur.");

    if (detailsVal !== details) {
      hasDetails = true;
    }
  }

  return {
    summary: summaryVal,
    details: detailsVal,
    isTranslated: hasSummary || hasDetails
  };
}

async function translateAndCacheCommits(rawCommits: { version_code: string, update_date: string, summary: string, details: string, is_github: boolean }[]): Promise<any[]> {
  try {
    const cachedUpdates = await db.all("SELECT * FROM app_updates");
    const existingMap = new Map<string, any>();
    cachedUpdates.forEach((u: any) => {
      existingMap.set(u.version_code, u);
    });

    // Load static file dictionary
    const dictPath = path.join(process.cwd(), 'translated_commits.json');
    let localJsonDict: Record<string, { summary: string; details: string }> = {};
    if (fs.existsSync(dictPath)) {
      try {
        localJsonDict = JSON.parse(fs.readFileSync(dictPath, 'utf8'));
      } catch (e) {
        console.error("[TRANSLATION-JSON-READ-ERROR]", e);
      }
    }

    const processed = [];
    const totalCount = rawCommits.length;
    let hasNewTranslations = false;

    for (let index = 0; index < totalCount; index++) {
      const item = rawCommits[index];
      const sha = item.version_code;
      const date = item.update_date;
      const origSummary = item.summary;
      const origDetails = item.details || "Mise à jour et application des derniers correctifs.";

      let summary = origSummary;
      let details = origDetails;

      const normSummary = origSummary.replace(/\s*:\s*/g, ': ').trim();

      // Check database cache first
      if (existingMap.has(sha)) {
        const cached = existingMap.get(sha);
        summary = cached.summary;
        details = cached.details || details;
      }
      // Check translated_commits.json dictionary
      else if (localJsonDict[sha] || localJsonDict[origSummary] || localJsonDict[normSummary]) {
        const matched = localJsonDict[sha] || localJsonDict[origSummary] || localJsonDict[normSummary];
        summary = matched.summary;
        details = matched.details || details;

        // Save to DB cache for fast future retrieval
        try {
          await db.run(`
            INSERT OR IGNORE INTO app_updates (version_code, update_date, summary, details)
            VALUES (?, ?, ?, ?)
          `, [sha, date, summary, details]);
          existingMap.set(sha, { summary, details });
        } catch (dbErr) {
          console.error("[DB CACHE WRITE ERROR]", dbErr);
        }
      }
      else {
        // Try local hardcoded dictionary translation first
        const localTrans = translateLocal(origSummary, origDetails);
        if (localTrans.isTranslated) {
          summary = localTrans.summary;
          details = localTrans.details || details;
        } else {
          // Not in database, not in json file, not in local dict -> use Gemini
          const translated = await translateWithGemini(origSummary, origDetails);
          summary = translated.summary;
          details = translated.details || details;

          // Auto-heal: Save to translated_commits.json if running with active API key (development)
          if (translated.summary && translated.summary !== origSummary) {
            try {
              localJsonDict[sha] = translated;
              localJsonDict[origSummary] = translated;
              localJsonDict[normSummary] = translated;
              hasNewTranslations = true;
            } catch (err) {
              console.error("[AUTO-HEAL SAVE PREPARATION ERROR]", err);
            }
          }
        }

        // Permanently save to database cache so we never translate it again!
        try {
          await db.run(`
            INSERT OR IGNORE INTO app_updates (version_code, update_date, summary, details)
            VALUES (?, ?, ?, ?)
          `, [sha, date, summary, details]);
          existingMap.set(sha, { summary, details });
        } catch (dbErr) {
          console.error("[DB CACHE WRITE ERROR]", dbErr);
        }
      }

      processed.push({
        id: totalCount - index,
        version_code: sha,
        update_date: date,
        summary: summary,
        details: details,
        is_github: item.is_github
      });
    }

    // Write back any new autogenerated translations to the file
    if (hasNewTranslations) {
      try {
        fs.writeFileSync(dictPath, JSON.stringify(localJsonDict, null, 2), 'utf8');
        console.log(`[AUTO-HEAL] Saved newly translated commits to translated_commits.json`);
      } catch (writeErr) {
        console.error("[AUTO-HEAL FILE WRITE ERROR]", writeErr);
      }
    }

    return processed;
  } catch (error) {
    console.error("[translateAndCacheCommits ERROR]", error);
    return rawCommits;
  }
}

const isProxyConfiguredAndReachable = async (): Promise<boolean> => {
  if (!process.env.HTTPS_PROXY) return false;
  
  const now = Date.now();
  // Cache check for 1 minute to avoid spamming connection tests
  if (cachedProxyStatus !== null && (now - lastProxyCheckTime) < 60000) {
    return cachedProxyStatus;
  }

  try {
    const url = new URL(process.env.HTTPS_PROXY);
    const host = url.hostname;
    const port = parseInt(url.port || '8080');
    
    const reachable = await new Promise<boolean>((resolve) => {
      const socket = net.connect({ host, port }, () => {
        socket.end();
        resolve(true);
      });
      socket.setTimeout(300); // 300ms is more than enough for local/intranet proxies
      socket.on('error', () => {
        socket.destroy();
        resolve(false);
      });
      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });
    });

    cachedProxyStatus = reachable;
    lastProxyCheckTime = now;
    return reachable;
  } catch {
    cachedProxyStatus = false;
    lastProxyCheckTime = now;
    return false;
  }
};

let db: any;

// Helper functions pour la gestion et la normalisation des e-mails sans accents
function cleanEmail(email: string | null | undefined): string {
  if (!email) return '';
  return email
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Supprime les accents et diacritiques (é, è, ê, à, ç, etc.)
    .replace(/æ/gi, "ae")
    .replace(/œ/gi, "oe")
    .toLowerCase();
}

function getAgentDefaultEmail(firstname: string = '', lastname: string = ''): string {
  const cleanFirst = cleanEmail(firstname).replace(/[^a-z0-9._-]/g, "");
  const cleanLast = cleanEmail(lastname).replace(/[^a-z0-9._-]/g, "");
  if (cleanFirst && cleanLast) {
    return `${cleanFirst}.${cleanLast}@aviation-civile.gouv.fr`;
  } else if (cleanFirst) {
    return `${cleanFirst}@aviation-civile.gouv.fr`;
  } else if (cleanLast) {
    return `${cleanLast}@aviation-civile.gouv.fr`;
  }
  return `agent@aviation-civile.gouv.fr`;
}

function getFormattedEmail(email: string | null | undefined, firstname: string = '', lastname: string = ''): string {
  const cleaned = cleanEmail(email);
  if (cleaned) return cleaned;
  return getAgentDefaultEmail(firstname, lastname);
}

async function initDb(database: any) {
  try {
    await database.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trigram TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        firstname TEXT NOT NULL,
        lastname TEXT NOT NULL,
        role TEXT CHECK(role IN ('admin', 'user', 'secretary')) DEFAULT 'user',
        entity TEXT CHECK(entity IN ('Siège', 'MR-MGA', 'MR-TTA')) NOT NULL,
        professional_num TEXT,
        mobile_num TEXT,
        email TEXT,
        address TEXT,
        comment TEXT,
        first_login INTEGER DEFAULT 1,
        olaf_link TEXT,
        birth_date TEXT,
        corps TEXT,
        profil TEXT,
        licence_num TEXT,
        ae_issue_date TEXT,
        ae_expiry_date TEXT,
        he_expiry_date TEXT,
        he_training_date TEXT,
        safety_badge_num TEXT,
        safety_badge_expiry_date TEXT,
        zcp_expiry_date TEXT,
        english_test_date TEXT,
        english_level TEXT,
        english_next_test_date TEXT,
        display_order INTEGER DEFAULT 0,
        off_day TEXT DEFAULT 'Vendredi',
        tlt_day TEXT DEFAULT 'Aucun'
      );

      CREATE TABLE IF NOT EXISTS tds_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        status TEXT NOT NULL,
        comment TEXT,
        is_sandbox INTEGER DEFAULT 0,
        border_color TEXT,
        FOREIGN KEY(user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS leave_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        status TEXT CHECK(status IN ('pending', 'approved_chef', 'approved_dt', 'rejected')) DEFAULT 'pending',
        type TEXT NOT NULL,
        updated_at TEXT,
        FOREIGN KEY(user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS global_settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );

      CREATE TABLE IF NOT EXISTS marquee_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        entities TEXT NOT NULL,
        admin_only INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS tds_validations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity TEXT NOT NULL,
        week_str TEXT NOT NULL,
        mr_chef_validated INTEGER DEFAULT 0,
        dt_chef_validated INTEGER DEFAULT 0,
        mr_validation_date TEXT,
        dt_validation_date TEXT,
        mr_signature TEXT,
        dt_signature TEXT,
        mr_chef_id INTEGER,
        dt_chef_id INTEGER,
        UNIQUE(entity, week_str)
      );

      CREATE TABLE IF NOT EXISTS connection_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trigram TEXT NOT NULL,
        login_time TEXT NOT NULL,
        ip_address TEXT,
        action TEXT DEFAULT 'Connexion'
      );

      CREATE TABLE IF NOT EXISTS app_updates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version_code TEXT NOT NULL,
        update_date TEXT NOT NULL,
        summary TEXT NOT NULL,
        details TEXT
      );

      CREATE TABLE IF NOT EXISTS title_alerts_sent (
        user_id INTEGER,
        title_type TEXT,
        threshold TEXT,
        last_expiry_date TEXT,
        PRIMARY KEY(user_id, title_type, threshold, last_expiry_date)
      );

      CREATE TABLE IF NOT EXISTS equipment_interventions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        equipment_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        is_sandbox INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS promess_data (
        equipment TEXT PRIMARY KEY,
        lastSemestrielle TEXT,
        lastAnnuelle TEXT,
        butee9Mois TEXT,
        butee18Mois TEXT,
        maintSemestrielle TEXT,
        maintAnnuelle TEXT
      );

      CREATE TABLE IF NOT EXISTS mga_projects_tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        section TEXT,
        project TEXT,
        manager TEXT,
        task TEXT,
        taskManager TEXT,
        dueDate TEXT,
        status TEXT,
        followUp TEXT
      );

      CREATE TABLE IF NOT EXISTS mga_missions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT
      );

      CREATE TABLE IF NOT EXISTS mga_equipments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT
      );

      CREATE TABLE IF NOT EXISTS mr_directory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        terrain TEXT,
        entity TEXT,
        contact TEXT,
        function TEXT,
        landline TEXT,
        mobile TEXT,
        email TEXT,
        comments TEXT
      );
    `);

    // Pre-populate default missions
    const missionsCount = await database.get("SELECT COUNT(*) as count FROM mga_missions");
    if (missionsCount.count === 0) {
      console.log("[DB INIT] Pre-populating mga_missions...");
      const defaultMissions = [
        // CNS/ATM
        { name: 'CEV', category: 'CNS/ATM', description: '' },
        { name: 'VOR MGA', category: 'CNS/ATM', description: '' },
        { name: 'DME MGA', category: 'CNS/ATM', description: '' },
        { name: 'NDB MG', category: 'CNS/ATM', description: '' },
        { name: 'NDB MD', category: 'CNS/ATM', description: '' },
        { name: 'NDB KO', category: 'CNS/ATM', description: '' },
        { name: 'NDB IP', category: 'CNS/ATM', description: '' },
        { name: 'NDB OA', category: 'CNS/ATM', description: '' },
        { name: 'NDB MR', category: 'CNS/ATM', description: '' },
        { name: 'NDB BL', category: 'CNS/ATM', description: '' },
        { name: 'NDB LU', category: 'CNS/ATM', description: '' },
        { name: 'NDB KQ', category: 'CNS/ATM', description: '' },
        { name: 'Mont-Dore', category: 'CNS/ATM', description: '' },
        { name: 'Fréquences MGA', category: 'CNS/ATM', description: '' },
        { name: 'Gonio Tjibaou', category: 'CNS/ATM', description: '' },
        { name: 'Gonio Lifou', category: 'CNS/ATM', description: '' },
        { name: 'Tour Lifou', category: 'CNS/ATM', description: '' },
        { name: 'AA Lifou', category: 'CNS/ATM', description: '' },
        { name: 'Koné', category: 'CNS/ATM', description: '' },
        { name: 'CLEOPATRE', category: 'CNS/ATM', description: '' },
        { name: 'WAM Amédée', category: 'CNS/ATM', description: '' },
        { name: 'WAM Montravel', category: 'CNS/ATM', description: '' },
        { name: 'WAM Ouen', category: 'CNS/ATM', description: '' },
        { name: 'WAM Lifou', category: 'CNS/ATM', description: '' },
        { name: 'WAM Mont-Dore', category: 'CNS/ATM', description: '' },
        { name: 'WAM Ouvéa', category: 'CNS/ATM', description: '' },
        { name: 'WAM Maré', category: 'CNS/ATM', description: '' },
        { name: 'WAM IdP', category: 'CNS/ATM', description: '' },
        { name: 'WAM Uéré', category: 'CNS/ATM', description: '' },
        { name: 'TRESCAL', category: 'CNS/ATM', description: '' },

        // SE
        { name: 'Amédée', category: 'SE', description: '' },
        { name: 'IdP', category: 'SE', description: '' },
        { name: 'Koné', category: 'SE', description: '' },
        { name: 'Maré', category: 'SE', description: '' },
        { name: 'Lifou', category: 'SE', description: '' },
        { name: 'Ouvéa', category: 'SE', description: '' },
        { name: 'Poindimié', category: 'SE', description: '' },
        { name: 'Touho', category: 'SE', description: '' },
        { name: 'Koumac', category: 'SE', description: '' },
        { name: 'Belep', category: 'SE', description: '' },
        { name: 'Ouloup', category: 'SE', description: '' },
        { name: 'Ile de Lumière', category: 'SE', description: '' },
        { name: 'Chépénéhé', category: 'SE', description: '' },
        { name: 'Mou', category: 'SE', description: '' },
        { name: 'Hnaipan', category: 'SE', description: '' },
        { name: 'Tadine', category: 'SE', description: '' },
        { name: 'La Roche', category: 'SE', description: '' },
        { name: 'Hnanemucca', category: 'SE', description: '' },
        { name: 'Ouanaham', category: 'SE', description: '' },
        { name: 'Hnathalo', category: 'SE', description: '' }
      ];

      for (const m of defaultMissions) {
        await database.run("INSERT INTO mga_missions (name, category, description) VALUES (?, ?, ?)", [m.name, m.category, m.description]);
      }
    }

    // Migrations et patches de schéma
    const tableInfo = await database.all("PRAGMA table_info(users)");
    if (!tableInfo.find((c: any) => c.name === 'display_order')) {
      await database.exec("ALTER TABLE users ADD COLUMN display_order INTEGER DEFAULT 0");
    }

    const leaveTableInfo = await database.all("PRAGMA table_info(leave_requests)");
    if (!leaveTableInfo.find((c: any) => c.name === 'updated_at')) {
      await database.exec("ALTER TABLE leave_requests ADD COLUMN updated_at TEXT");
    }

    const usersTableSql = await database.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'");
    
    // Migration pour off_day
    if (usersTableSql && usersTableSql.sql && !usersTableSql.sql.includes("off_day")) {
      console.log("[DB INIT] Migrating users table for 'off_day' column...");
      await database.exec("ALTER TABLE users ADD COLUMN off_day TEXT DEFAULT 'Vendredi'");
    }

    // Migration pour tlt_day
    if (usersTableSql && usersTableSql.sql && !usersTableSql.sql.includes("tlt_day")) {
      console.log("[DB INIT] Migrating users table for 'tlt_day' column...");
      await database.exec("ALTER TABLE users ADD COLUMN tlt_day TEXT DEFAULT 'Aucun'");
    }

    const tdsEntriesTableInfo = await database.all("PRAGMA table_info(tds_entries)");
    if (!tdsEntriesTableInfo.find((c: any) => c.name === 'border_color')) {
      console.log("[DB INIT] Migrating tds_entries table for 'border_color' column...");
      await database.exec("ALTER TABLE tds_entries ADD COLUMN border_color TEXT");
    }

    const validationsTableInfo = await database.all("PRAGMA table_info(tds_validations)");
    if (!validationsTableInfo.find((c: any) => c.name === 'mr_signature')) {
      console.log("[DB INIT] Migrating tds_validations table for 'mr_signature' column...");
      await database.exec("ALTER TABLE tds_validations ADD COLUMN mr_signature TEXT");
    }
    if (!validationsTableInfo.find((c: any) => c.name === 'dt_signature')) {
      console.log("[DB INIT] Migrating tds_validations table for 'dt_signature' column...");
      await database.exec("ALTER TABLE tds_validations ADD COLUMN dt_signature TEXT");
    }

    const marqueeTableInfo = await database.all("PRAGMA table_info(marquee_messages)");
    if (!marqueeTableInfo.find((c: any) => c.name === 'admin_only')) {
      console.log("[DB INIT] Migrating marquee_messages table for 'admin_only' column...");
      await database.exec("ALTER TABLE marquee_messages ADD COLUMN admin_only INTEGER DEFAULT 0");
    }

    if (usersTableSql && usersTableSql.sql && !usersTableSql.sql.includes("'secretary'")) {
      console.log("[DB INIT] Migrating users table for 'secretary' role...");
      await database.exec(`
        CREATE TABLE users_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          trigram TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          firstname TEXT NOT NULL,
          lastname TEXT NOT NULL,
          role TEXT CHECK(role IN ('admin', 'user', 'secretary')) DEFAULT 'user',
          entity TEXT CHECK(entity IN ('Siège', 'MR-MGA', 'MR-TTA')) NOT NULL,
          professional_num TEXT,
          mobile_num TEXT,
          email TEXT,
          address TEXT,
          comment TEXT,
          first_login INTEGER DEFAULT 1,
          olaf_link TEXT,
          birth_date TEXT,
          corps TEXT,
          profil TEXT,
          licence_num TEXT,
          ae_issue_date TEXT,
          ae_expiry_date TEXT,
          he_expiry_date TEXT,
          he_training_date TEXT,
          safety_badge_num TEXT,
          safety_badge_expiry_date TEXT,
          zcp_expiry_date TEXT,
          english_test_date TEXT,
          english_level TEXT,
          english_next_test_date TEXT,
          display_order INTEGER DEFAULT 0
        );
        INSERT INTO users_new SELECT id, trigram, password, firstname, lastname, role, entity, professional_num, mobile_num, email, address, comment, first_login, olaf_link, birth_date, corps, profil, licence_num, ae_issue_date, ae_expiry_date, he_expiry_date, he_training_date, safety_badge_num, safety_badge_expiry_date, zcp_expiry_date, english_test_date, english_level, english_next_test_date, display_order FROM users;
        DROP TABLE users;
        ALTER TABLE users_new RENAME TO users;
      `);
      console.log("[DB INIT] Migration 'secretary' role successful.");
    }

    // Supprimer définitivement Jean-Michel GIRARD (JMG) et Sonia Secretary (SEC)
    console.log("[DB INIT] Definitively deleting JMG (Jean-Michel GIRARD) and SEC (Sonia Secretary) accounts...");
    await database.run("DELETE FROM tds_entries WHERE user_id IN (SELECT id FROM users WHERE trigram IN ('JMG', 'SEC'))");
    await database.run("DELETE FROM leave_requests WHERE user_id IN (SELECT id FROM users WHERE trigram IN ('JMG', 'SEC'))");
    await database.run("DELETE FROM users WHERE trigram IN ('JMG', 'SEC')");

    // Ensure standard default seed users exist (excluding JMG and SEC)
    console.log("[DB INIT] Ensuring default seed users exist...");
    const seedUsers = [
      ['DSN', 'password123', 'Demba', 'NDIAYE', 'admin', 'Siège'],
      ['CHN', 'password123', 'Florent', 'CHAHINIAN', 'admin', 'MR-MGA'],
      ['DSO', 'DSO2026', 'David', 'SOULARD', 'admin', 'Siège'],
      ['MAY', 'maysha', 'Maysha', 'ADMIN', 'admin', 'Siège']
    ];
    for (const u of seedUsers) {
      await database.run(
        "INSERT INTO users (trigram, password, firstname, lastname, role, entity) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(trigram) DO UPDATE SET password=excluded.password, role=excluded.role",
        u
      );
    }
    console.log("[DB MIGRATION] Nettoyage et cohérence des statuts 'SEC'...");
    const cleanSiege = await database.run(`
      UPDATE tds_entries 
      SET status = 'PRE' 
      WHERE status = 'SEC' 
        AND user_id IN (SELECT id FROM users WHERE entity = 'Siège')
    `);
    console.log(`[DB MIGRATION] Corrigé ${cleanSiege.changes || 0} statuts SEC en PRE pour le Siège.`);

    const cleanMga = await database.run(`
      UPDATE tds_entries 
      SET status = 'TRV' 
      WHERE status = 'SEC' 
        AND user_id IN (SELECT id FROM users WHERE entity = 'MR-MGA')
    `);
    console.log(`[DB MIGRATION] Corrigé ${cleanMga.changes || 0} statuts SEC en TRV pour MR-MGA.`);
    
    // S'assurer aussi que si Demba NDIAYE (le login principal du test) est admin au Siège dans la DB, on applique la cohérence
    await database.run("UPDATE users SET entity = 'Siège' WHERE trigram = 'DSN' AND role = 'admin'");

    // Migration: Nettoyage et normalisation des adresses e-mail des agents (sans accents)
    console.log("[DB MIGRATION] Normalisation des e-mails des agents sans accents...");
    try {
      const allUsers = await database.all("SELECT id, firstname, lastname, email FROM users");
      for (const u of allUsers) {
        const cleaned = getFormattedEmail(u.email, u.firstname, u.lastname);
        if (cleaned !== u.email) {
          console.log(`[DB MIGRATION] Correction e-mail agent ID ${u.id} (${u.firstname} ${u.lastname}): "${u.email}" -> "${cleaned}"`);
          await database.run("UPDATE users SET email = ? WHERE id = ?", [cleaned, u.id]);
        }
      }
    } catch (emailMigErr) {
      console.error("[DB MIGRATION ERROR] Erreur lors de la normalisation des e-mails:", emailMigErr);
    }

    // Seed default tasks for mga_projects_tasks if empty
    const tasksCount = await database.get("SELECT COUNT(*) as count FROM mga_projects_tasks");
    if (tasksCount && tasksCount.count === 0) {
      console.log("[DB INIT] Seeding mga_projects_tasks with default tasks...");
      const defaultTasks = [
        ["CNS/ATM", "Basculement fibre", "PRI", "Gérer la migration des accès Numéris en fibre", "PRI", "2026-12-31", "En cours", ""],
        ["CNS/ATM", "Basculement fibre", "PRI", "Faire le point avec la PIL sur le basculement fibre Ouvéa/Maré", "DSO", "2026-07-10", "En cours", "Fibre temporaire en service à Ouvéa (Idem prévu à Maré). Devis en cours pour fibre DAC/Météo. Faire le point avec HAOCAS sur fibre PIL."],
        ["MR", "BP 2026", "DSO", "Faire le point sur les dépenses INV & FONC", "DSO", "", "En cours", ""],
        ["MR", "BP 2026", "DSO", "Refaire le point avec Florent sur le remplacement des batteries WAM (WAM Waé ?)", "GBT", "", "Non affectée", ""],
        ["MR", "BP 2027", "DSO", "Réaliser un devis pour remplacer l'onduleur OP", "PRI", "", "En cours", ""],
        ["CNS/ATM", "BSS CLEOPATRE", "PRI", "Faire un point avec CS sur le sujet", "PDO", "", "Non affectée", ""],
        ["CNS/ATM", "Cartographie du MCO des équipements", "DSO", "Contribuer au projet de cartographie du MCO des équipements", "PRI", "", "En cours", ""],
        ["CNS/ATM", "Cartographie du MCO des équipements", "DSO", "Faire le point sur le lot de secours du SIMU. Possibilité de demander du matériel à la DTI (décomissionnement SCANSIM en cours)", "DSO", "", "Non affectée", ""],
        ["CNS/ATM", "Cartographie du MCO des équipements", "DSO", "Faire le point sur le reste à faire", "GDN", "", "Non affectée", ""],
        ["CNS/ATM", "Cartographie du MCO des équipements", "DSO", "Réaliser un devis pour un lot de secours pour les transceivers du réseau bureautique", "PRI", "", "Non affectée", ""],
        ["CNS/ATM", "Divers", "GDN", "Achat de joints d'étanchéité pour les NDB", "GDN", "", "Non affectée", ""],
        ["MR", "Divers", "PRI", "Assurer la diffusion de la nouvelle adresse de groupe (liste les utilisateurs)", "PDO", "", "Non affectée", ""]
      ];
      for (const t of defaultTasks) {
        await database.run(`
          INSERT INTO mga_projects_tasks (section, project, manager, task, taskManager, dueDate, status, followUp)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, t);
      }
    }
  } catch (error) {
    console.error("[DB INIT ERROR]", error);
  }
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

  let currentMailMode = "TEST";

  console.log("[DEBUG] Environment check:");
  console.log("- SMTP_HOST:", process.env.SMTP_HOST ? "Defined" : "Undefined");
  console.log("- SMTP_USER:", process.env.SMTP_USER ? "Defined" : "Undefined");
  console.log("- RESEND_API_KEY:", process.env.RESEND_API_KEY ? `Defined (starts with ${process.env.RESEND_API_KEY.substring(0, 5)}...)` : "Undefined");
  console.log("- EMAIL_DEBUG_RECIPIENT:", process.env.EMAIL_DEBUG_RECIPIENT || "Undefined (Normal Mode)");

  const getActualRecipient = (intendedRecipient: string) => {
    const cleanedIntended = cleanEmail(intendedRecipient);
    if (currentMailMode === "OPE") {
      return cleanedIntended;
    }
    const debugEmail = cleanEmail(process.env.EMAIL_DEBUG_RECIPIENT) || "dac-nc-sna-tds-dt-bf@aviation-civile.gouv.fr";
    if (debugEmail && debugEmail.trim() !== "") {
      console.log(`[MAIL DEBUG] TEST Mode: Redirecting mail from ${cleanedIntended} to ${debugEmail}`);
      return debugEmail;
    }
    return cleanedIntended;
  };

  const replacePlaceholders = (template: string, data: { type: string, trigram: string, firstname: string, lastname: string, start_date: string, end_date: string }) => {
    if (!template) return "";
    return template
      .replace(/{type}/gi, data.type)
      .replace(/{trigram}/gi, data.trigram)
      .replace(/{firstname}/gi, data.firstname)
      .replace(/{lastname}/gi, data.lastname)
      .replace(/{start_date}/gi, data.start_date)
      .replace(/{end_date}/gi, data.end_date);
  };

  const dispatchWorkflowEmail = async (dbInstance: any, eventType: 'creation' | 'approved_chef' | 'approved_dt' | 'rejected', agent: any, leaveReq: any) => {
    const customSettingsRows = await dbInstance.all("SELECT * FROM global_settings WHERE key LIKE 'mail_%'");
    const config: Record<string, string> = {};
    for (const row of customSettingsRows) {
      config[row.key] = row.value || "";
    }

    const defaultTemplates: Record<string, { subject: string, body: string }> = {
      creation: {
        subject: `Nouvelle demande de {type} - {trigram}`,
        body: `Une nouvelle demande de <strong>{type}</strong> a été déposée par l'agent <strong>{firstname} {lastname}</strong> ({trigram}).<br><br><strong>Période :</strong> du {start_date} au {end_date}.`
      },
      approved_chef_agent: {
        subject: `[TDS DT] Validation intermédiaire de votre demande de congé - Chef d'Entité`,
        body: `Votre demande de <strong>{type}</strong> du {start_date} au {end_date} a été <strong>validée par votre Chef d'Entité (N+1)</strong>.<br><br>Elle est dorénavant en attente de la validation finale par la Direction Technique (N+2).`
      },
      approved_chef_n2: {
        subject: `[TDS DT] Validation requise N+2 - Demande de congé de {trigram}`,
        body: `La demande de <strong>{type}</strong> de l'agent <strong>{firstname} {lastname}</strong> ({trigram}) du {start_date} au {end_date} a été validée par son Chef d'Entité (N+1).<br><br>Votre <strong>validation finale (N+2)</strong> est désormais attendue dans l'application.`
      },
      approved_dt_agent: {
        subject: `[TDS DT] Validation de votre demande de congé`,
        body: `Votre demande de <strong>{type}</strong> du {start_date} au {end_date} a été <strong>validée définitivement</strong> par la Direction Technique (N+2).<br><br>Le planning du Tableau de Service (TDS) a été mis à jour en conséquence.`
      },
      rejected_agent: {
        subject: `[TDS DT] Demande de congé refusée`,
        body: `Votre demande de <strong>{type}</strong> du {start_date} au {end_date} a été <strong>refusée</strong>.<br><br>Pour plus de détails, nous vous invitons à vous rapprocher de votre responsable d'entité.`
      }
    };

    const startDateStr = new Date(leaveReq.start_date).toLocaleDateString('fr-FR');
    const endDateStr = new Date(leaveReq.end_date).toLocaleDateString('fr-FR');

    const replaceData = {
      type: leaveReq.type,
      trigram: agent.trigram,
      firstname: agent.firstname,
      lastname: agent.lastname,
      start_date: startDateStr,
      end_date: endDateStr
    };

    const recipientsConfigKey = `mail_recipients_${eventType}`;
    let recipientsConfig = "n1";
    if (eventType === 'approved_chef') {
      recipientsConfig = "agent,n2";
    } else if (eventType === 'approved_dt') {
      recipientsConfig = "agent";
    } else if (eventType === 'rejected') {
      recipientsConfig = "agent";
    }

    if (config[recipientsConfigKey] !== undefined) {
      recipientsConfig = config[recipientsConfigKey];
    }

    const activeTags = recipientsConfig.split(',').map((s: string) => s.trim()).filter(Boolean);

    const agentEmails: string[] = [];
    if (activeTags.includes('agent')) {
      const agEmail = getFormattedEmail(agent.email, agent.firstname, agent.lastname);
      agentEmails.push(agEmail);
    }

    const n1Emails: string[] = [];
    if (activeTags.includes('n1')) {
      let admins: any[] = [];
      if (agent.entity === 'Siège' || agent.role === 'admin') {
        admins = await dbInstance.all("SELECT email, firstname, lastname FROM users WHERE role = 'admin' AND entity = 'Siège'");
      } else {
        admins = await dbInstance.all("SELECT email, firstname, lastname FROM users WHERE role = 'admin' AND entity = ?", [agent.entity]);
      }
      for (const admin of admins) {
        n1Emails.push(getFormattedEmail(admin.email, admin.firstname, admin.lastname));
      }
    }

    const n2Emails: string[] = [];
    if (activeTags.includes('n2')) {
      const hqAdmins = await dbInstance.all("SELECT email, firstname, lastname FROM users WHERE role = 'admin' AND entity = 'Siège'");
      for (const admin of hqAdmins) {
        n2Emails.push(getFormattedEmail(admin.email, admin.firstname, admin.lastname));
      }
    }

    const customEmails: string[] = [];
    if (activeTags.includes('secretaries')) {
      const customList = config['mail_custom_emails'] || "";
      const list = customList.split(',').map((s: string) => cleanEmail(s.trim())).filter((e: string) => e.includes('@'));
      customEmails.push(...list);
    }

    const sendToRecipients = async (addressList: string[], templateKey: string, sectionTitle: string, defaultGreeting: string) => {
      if (addressList.length === 0) return;

      const rawSubject = config[`mail_subject_${templateKey}`] || defaultTemplates[templateKey]?.subject || `Notification TDS DT`;
      const rawBody = config[`mail_body_${templateKey}`] || defaultTemplates[templateKey]?.body || ``;

      const subject = replacePlaceholders(rawSubject, replaceData);
      const bodyHtml = replacePlaceholders(rawBody, replaceData);
      const plainText = bodyHtml.replace(/<[^>]*>/g, '');

      for (const email of addressList) {
        const htmlContent = buildEmailTemplate(
          sectionTitle,
          defaultGreeting,
          bodyHtml,
          "/#/leaves",
          "Accéder à l'application"
        );

        sendUnifiedEmail(email, subject, plainText, false, htmlContent)
          .catch((e: any) => console.error(`[DISPATCH WORKFLOW EMAIL ERROR] Event: ${eventType}, Template: ${templateKey}, To: ${email}`, e));
      }
    };

    if (eventType === 'creation') {
      const recipients = [...new Set([...agentEmails, ...n1Emails, ...n2Emails, ...customEmails])];
      await sendToRecipients(recipients, 'creation', "Nouvelle Demande de Congé", `Bonjour,`);
    } 
    else if (eventType === 'approved_chef') {
      const recipientsNoAgent = [...new Set([...n1Emails, ...n2Emails, ...customEmails])];
      if (agentEmails.length > 0) {
        await sendToRecipients(agentEmails, 'approved_chef_agent', "Validation Intermédiaire N+1", `Bonjour ${agent.firstname},`);
      }
      if (recipientsNoAgent.length > 0) {
        await sendToRecipients(recipientsNoAgent, 'approved_chef_n2', "Validation Requise N+2", `Bonjour,`);
      }
    } 
    else if (eventType === 'approved_dt') {
      const recipients = [...new Set([...agentEmails, ...n1Emails, ...n2Emails, ...customEmails])];
      await sendToRecipients(recipients, 'approved_dt_agent', "Demande de Congé Validée", `Bonjour,`);
    } 
    else if (eventType === 'rejected') {
      const recipients = [...new Set([...agentEmails, ...n1Emails, ...n2Emails, ...customEmails])];
      await sendToRecipients(recipients, 'rejected_agent', "Demande de Congé Refusée", `Bonjour,`);
    }
  };

  const getBaseUrl = () => {
    let url = process.env.BASE_URL || "https://dt.dac-nc.aviation";
    if (url.endsWith("/")) {
      url = url.slice(0, -1);
    }
    return url;
  };

  const buildEmailTemplate = (title: string, greeting: string, contentHtml: string, actionPath: string = "/#/leaves", actionText: string = "Accéder aux Validations") => {
    const baseUrl = getBaseUrl();
    const actionUrl = `${baseUrl}${actionPath}`;
    return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <!--[if mso]>
    <style type="text/css">
      body, table, td, a, p, span, h1 { font-family: Arial, Helvetica, sans-serif !important; }
    </style>
    <![endif]-->
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f6f9fc; color: #333333; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; width: 100% !important;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#f6f9fc" style="background-color: #f6f9fc; margin: 0; padding: 40px 0; width: 100% !important; border-collapse: collapse;">
      <tr>
        <td align="center">
          <table border="0" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; width: 600px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); border-collapse: separate;" bgcolor="#ffffff">
            <!-- Header -->
            <tr>
              <td align="center" bgcolor="#0c111d" style="background-color: #0c111d; padding: 32px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 18px; font-weight: 900; letter-spacing: 0.05em; text-transform: uppercase;">${title}</h1>
              </td>
            </tr>
            <!-- Body -->
            <tr>
              <td style="padding: 40px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                <div style="font-size: 15px; font-weight: bold; color: #01040d; margin-bottom: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">${greeting}</div>
                <div style="font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                  ${contentHtml}
                </div>
                <!-- Action Button Container Table -->
                <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 32px auto 16px auto; text-align: center; border-collapse: separate;">
                  <tr>
                    <td align="center" bgcolor="#4f46e5" style="-webkit-border-radius: 8px; -moz-border-radius: 8px; border-radius: 8px; background-color: #4f46e5; padding: 14px 28px;" valign="middle">
                      <a href="${actionUrl}" target="_blank" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 12px; font-weight: bold; color: #ffffff !important; text-decoration: none; display: inline-block; text-transform: uppercase; letter-spacing: 0.05em; line-height: 100%; border: none; outline: none; background: transparent;">${actionText}</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td align="center" bgcolor="#f8fafc" style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 11px; color: #64748b; line-height: 1.5;">
                Cet e-mail a été envoyé de manière automatique par l'application <strong>TDS-DT</strong>.<br>
                Veuillez ne pas y répondre.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
    `.trim();
  };

  const getTitleThreshold = (dateStr: string | null | undefined): '1_month' | '3_months' | '6_months' | null => {
    if (!dateStr) return null;
    const today = new Date();
    today.setHours(0,0,0,0);
    const expiry = new Date(dateStr);
    expiry.setHours(0,0,0,0);
    
    const diffMs = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 30) {
      return '1_month';
    } else if (diffDays <= 90) {
      return '3_months';
    } else if (diffDays <= 180) {
      return '6_months';
    }
    return null;
  };

  const checkAndTriggerAllTitleAlerts = async (database: any) => {
    try {
      const usersList = await database.all(`
        SELECT id, trigram, firstname, lastname, entity, 
               ae_expiry_date, he_expiry_date, safety_badge_expiry_date, zcp_expiry_date, english_next_test_date 
        FROM users 
        WHERE role != 'secretary'
      `);
      
      const titlesConfig = {
        ae_expiry_date: "AE (Autorisation d'Exercer)",
        he_expiry_date: "HE (Habilitation Électrique)",
        safety_badge_expiry_date: "Badge (Badge de Sécurité)",
        zcp_expiry_date: "ZCP (Zone Côté Piste)",
        english_next_test_date: "Prochain Test d'Anglais"
      };

      const smtpUser = process.env.SMTP_USER;

      for (const u of usersList) {
        for (const [field, label] of Object.entries(titlesConfig)) {
          const dateVal = u[field];
          if (!dateVal) continue;

          const threshold = getTitleThreshold(dateVal);
          if (!threshold) continue; 

          // Vérifier si cette alerte a déjà été émise pour cet agent, ce titre spécifique, ce seuil et cette date d'échéance
          const alreadySent = await database.get(
            `SELECT 1 FROM title_alerts_sent 
             WHERE user_id = ? AND title_type = ? AND threshold = ? AND last_expiry_date = ?`,
            [u.id, field, threshold, dateVal]
          );

          if (!alreadySent) {
            console.log(`[ALERT TRIGGER] Émission alerte pour ${u.firstname} ${u.lastname} (${u.trigram}) - ${label} échéance ${dateVal} (seuil: ${threshold})`);
            
            let thresholdLabel = "";
            if (threshold === '1_month') thresholdLabel = "Échéance imminente (Moins d'un mois)";
            else if (threshold === '3_months') thresholdLabel = "Échéance proche (Moins de 3 mois)";
            else if (threshold === '6_months') thresholdLabel = "Préalerte (Moins de 6 mois)";

            // On enregistre d'abord pour éviter des boucles d'envoi simultanées
            await database.run(
              `INSERT INTO title_alerts_sent (user_id, title_type, threshold, last_expiry_date) 
               VALUES (?, ?, ?, ?)`,
              [u.id, field, threshold, dateVal]
            ).catch((err: any) => console.error("[ALERT TRIG INT ERROR] Error recording sent alert", err));

            // Destinataires : le N+1 (admins de l'entité de l'agent) ET SMTP_USER
            const recipients = new Set<string>();
            if (smtpUser) recipients.add(smtpUser.trim());

            // Récupérer les admins N+1
            const admins = await database.all("SELECT email FROM users WHERE role = 'admin' AND entity = ?", [u.entity]);
            for (const admin of admins) {
              if (admin.email) {
                recipients.add(admin.email.trim());
              }
            }

            // S'il n'y a aucun admin dans cette entité, on récupère tous les admins
            if (admins.length === 0) {
              const fallbackAdmins = await database.all("SELECT email FROM users WHERE role = 'admin'");
              for (const admin of fallbackAdmins) {
                if (admin.email) {
                  recipients.add(admin.email.trim());
                }
              }
            }

            const subject = `[ALERTE ÉCHÉANCE] Renouvellement de titre requis - ${label} pour ${u.firstname} ${u.lastname} (${u.trigram})`;
            
            const text = `Bonjour,\n\nUne échéance concernant le titre d'un agent de votre entité approche :\n\n- Agent : ${u.firstname} ${u.lastname} (${u.trigram})\n- Titre : ${label}\n- Date d'échéance : ${new Date(dateVal).toLocaleDateString('fr-FR')}\n- Seuil : ${thresholdLabel}\n\nMerci de prendre les dispositions nécessaires pour son renouvellement avant échéance.\n\nCordialement,\nL'équipe TDS DT`;

            const html = buildEmailTemplate(
              "Alerte de titre approchant de l'échéance",
              `Bonjour,`,
              `Une échéance concernant le titre d'un agent de votre entité approche :<br/><br/>
               <strong>Agent :</strong> ${u.firstname} ${u.lastname} (${u.trigram})<br/>
               <strong>Entité :</strong> ${u.entity}<br/>
               <strong>Titre concerné :</strong> ${label}<br/>
               <strong>Date d'échéance :</strong> ${new Date(dateVal).toLocaleDateString('fr-FR')}<br/>
               <strong>Niveau d'alerte :</strong> ${thresholdLabel}<br/><br/>
               Veuillez planifier le renouvellement de cette habilitation ou licence au plus vite.`,
              "/titles#/titles",
              "Voir le suivi des titres"
            );

            // Envoyer à tous les destinataires
            for (const recipient of recipients) {
              sendUnifiedEmail(recipient, subject, text, false, html)
                .then(res => {
                  if (res.error) console.error(`[ALERT MAIL ERROR] Failed to send email to ${recipient}: ${res.error}`);
                  else console.log(`[ALERT MAIL SUCCESS] Sent to ${recipient} via ${res.provider}`);
                })
                .catch(err => console.error(`[ALERT MAIL PROMISE EXCEPTION] to ${recipient}`, err));
            }
          }
        }
      }
    } catch (err) {
      console.error("[ALERT CHECK ERROR] Failed to scan or process title alerts:", err);
    }
  };

  // Fonction pour envoyer un mail via le SDK Resend (avec support Proxy)
  const sendEmailViaResend = async (to: string, subject: string, text: string, skipRedirect: boolean = false, html?: string): Promise<EmailResult> => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return { success: false, provider: "Resend", error: "RESEND_API_KEY non configurée" };

    const recipient = skipRedirect ? cleanEmail(to) : getActualRecipient(to);
    const debugPrefix = "";
    const from = process.env.RESEND_FROM_EMAIL || "TDS DT <onboarding@resend.dev>";

    // Si on a un proxy opérationnel, on utilise un appel direct via https/HttpsProxyAgent
    // car le SDK Resend (basé sur node-fetch ou axios selon version) ignore souvent le proxy système
    const useProxy = await isProxyConfiguredAndReachable();
    if (useProxy) {
      console.log(`[RESEND] Proxy détecté et opérationnel : ${process.env.HTTPS_PROXY}. Utilisation d'une requête manuelle vers api.resend.com.`);
      return new Promise((resolve) => {
        const payloadObj: any = {
          from: from,
          to: [recipient],
          subject: debugPrefix + subject,
          text: text,
        };
        if (html) {
          payloadObj.html = html;
        }
        const payload = JSON.stringify(payloadObj);

        try {
          const agent = new HttpsProxyAgent(process.env.HTTPS_PROXY as string);
          const options = {
            hostname: 'api.resend.com',
            path: '/emails',
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Content-Length': Buffer.byteLength(payload),
              'User-Agent': 'Node.js/TDS-DT-App'
            },
            agent: agent,
            timeout: 30000 // 30 secondes pour le proxy
          };

          const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
              console.log(`[RESEND PROXY] Terminé avec Code: ${res.statusCode}`);
              if (!body) {
                return resolve({ success: false, provider: "Resend", error: `Réponse vide du serveur (Code: ${res.statusCode})`, statusCode: res.statusCode });
              }

              try {
                const parsed = JSON.parse(body);
                if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                  resolve({ success: true, provider: "Resend", data: parsed, details: `Sent to ${recipient} via Resend Proxy` });
                } else {
                  console.error("[RESEND PROXY ERROR RESPONSE]", parsed);
                  const errDetails = parsed.message || parsed.error || JSON.stringify(parsed);
                  resolve({ success: false, provider: "Resend", error: errDetails, statusCode: res.statusCode, details: parsed });
                }
              } catch (e) {
                // Si ce n'est pas du JSON, c'est probablement une erreur du Proxy (HTML)
                console.error("[RESEND PROXY NON-JSON RESPONSE]", body.substring(0, 500));
                resolve({ 
                  success: false,
                  provider: "Resend",
                  error: "Le serveur ou le proxy a renvoyé une réponse non-JSON.", 
                  body: body.substring(0, 200),
                  statusCode: res.statusCode 
                });
              }
            });
          });

          req.on('error', (err) => {
            console.error("[RESEND PROXY REQ ERROR]", err);
            resolve({ success: false, provider: "Resend", error: `Erreur de connexion via Proxy : ${err.message}` });
          });

          req.on('timeout', () => {
            req.destroy();
            console.error("[RESEND PROXY TIMEOUT]");
            resolve({ success: false, provider: "Resend", error: "Timeout : Le proxy ou api.resend.com ne répond pas (30s)." });
          });

          req.write(payload);
          req.end();
        } catch (agentErr: any) {
          console.error("[RESEND AGENT ERROR]", agentErr);
          resolve({ success: false, provider: "Resend", error: `Erreur initialisation Proxy Agent : ${agentErr.message}` });
        }
      });
    }

    // Sinon on utilise le SDK classique (sans proxy)
    if (!resend) return { success: false, provider: "Resend", error: "SDK Resend non initialisé" };
    try {
      const sendOptions: any = {
        from: from,
        to: [recipient],
        subject: debugPrefix + subject,
        text: text,
      };
      if (html) {
        sendOptions.html = html;
      }
      const { data, error } = await resend.emails.send(sendOptions);

      if (error) {
        console.error("[RESEND ERROR DETAILS]", error);
        return { success: false, provider: "Resend", error: (error as any).message || JSON.stringify(error) };
      }
      return { success: true, provider: "Resend", data, details: `Sent to ${recipient} via Resend` };
    } catch (error: any) {
      console.error("[RESEND EXCEPTION]", error);
      return { success: false, provider: "Resend", error: error.message || "Erreur inconnue lors de l'envoi via Resend" };
    }
  };

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_PORT === "465", // true pour 465, false pour les autres
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      // Nécessaire pour certains environnements cloud
      rejectUnauthorized: false,
      minVersion: "TLSv1.2"
    },
    connectionTimeout: 10000, // 10 secondes
    greetingTimeout: 10000,
    socketTimeout: 15000
  });

  // Interface pour le résultat d'envoi de mail
  interface EmailResult {
    success?: boolean;
    error?: any;
    provider?: string;
    statusCode?: number;
    details?: any;
    result?: any;
    data?: any;
    body?: string;
    smtpError?: string;
  }

  // Fonction d'envoi unifiée qui gère la priorité (SMTP d'abord si configuré)
  const sendUnifiedEmail = async (to: string, subject: string, text: string, skipRedirect: boolean = false, html?: string): Promise<EmailResult> => {
    const hasSmtpConfig = !!process.env.SMTP_HOST && !!process.env.SMTP_USER;
    const hasResendConfig = !!process.env.RESEND_API_KEY;

    // On nettoie et applique le redirecteur
    const cleanTo = cleanEmail(to);
    const recipient = skipRedirect ? cleanTo : getActualRecipient(cleanTo);

    if (hasSmtpConfig) {
      try {
        console.log(`[MAIL] Attempting SMTP send via ${process.env.SMTP_HOST} to ${recipient}`);
        
        // Test de connectivité bas niveau avant nodemailer
        const canConnect = await new Promise((resolve) => {
          const socket = net.connect({
            host: process.env.SMTP_HOST as string,
            port: parseInt(process.env.SMTP_PORT || '587'),
          });
          socket.setTimeout(5000);
          socket.on('connect', () => {
            socket.end();
            resolve(true);
          });
          socket.on('error', (err) => {
            console.log(`[SMTP CONNECT TEST FAIL] ${err.message}`);
            socket.destroy();
            resolve(false);
          });
          socket.on('timeout', () => {
            console.log(`[SMTP CONNECT TIMEOUT]`);
            socket.destroy();
            resolve(false);
          });
        });

        if (!canConnect) {
           throw new Error(`Le serveur ${process.env.SMTP_HOST} n'est pas joignable sur le port ${process.env.SMTP_PORT}. Port possiblement bloqué par votre réseau ou proxy requis.`);
        }

        // On crée un transporteur frais pour s'assurer de prendre les dernières variables d'env
        const smtpOptions: any = {
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_PORT === '465',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
          tls: {
            rejectUnauthorized: false,
            minVersion: "TLSv1.2",
            servername: process.env.SMTP_HOST
          },
          connectionTimeout: 15000,
          greetingTimeout: 15000,
          debug: true,
          logger: true
        };

        const currentTransporter = nodemailer.createTransport(smtpOptions);

        const mailOptions: any = {
          from: `"Gestion TDS DT" <${process.env.SMTP_USER}>`,
          to: recipient,
          subject: subject,
          text,
        };
        if (html) {
          mailOptions.html = html;
        }

        await currentTransporter.sendMail(mailOptions);
        return { success: true, provider: "SMTP", details: `Sent to ${recipient} via ${process.env.SMTP_HOST}` };
      } catch (error: any) {
        console.error("[SMTP ERROR]", error);
        // Si SMTP échoue et qu'on a Resend en secours, on essaie Resend en gardant l'erreur SMTP
        if (hasResendConfig) {
          console.log("[MAIL] SMTP failed, falling back to Resend...");
          // On passe directement le recipient déjà "actualisé" pour éviter double redirection
          const resendResult = await sendEmailViaResend(recipient, subject, text, true, html) as any;
          return { 
            ...resendResult, 
            smtpError: error.message || "Erreur SMTP inconnue",
            provider: `Resend (Fallback from ${process.env.SMTP_HOST})`
          };
        }
        return { success: false, provider: "SMTP", error: error.message || "Erreur SMTP", details: error };
      }
    } else if (hasResendConfig) {
      console.log(`[MAIL] Sending via Resend to ${recipient}`);
      return await sendEmailViaResend(recipient, subject, text, true, html);
    } else {
      return { success: false, error: "Aucun service d'email configuré (SMTP ou Resend)" };
    }
  };

  app.use(express.json());

  // Logger middleware
  app.use((req, res, next) => {
    console.log(`[REQUEST] ${req.method} ${req.url}`);
    next();
  });

  // Route de test PRIORITAIRE pour l'administrateur
  app.get("/api/ping", (req, res) => res.json({ status: "alive", time: new Date().toISOString() }));

  app.get("/api/admin/check-update", async (req, res) => {
    const repo = process.env.GITHUB_REPO;
    if (!repo) {
      return res.json({ skip: true, message: "GITHUB_REPO non configuré" });
    }

    try {
      const githubUrl = `https://api.github.com/repos/${repo}/contents/package.json`;
      const options: any = {
        headers: {
          'Accept': 'application/vnd.github.v3.raw',
          'User-Agent': 'Node.js/TDS-DT-App'
        }
      };
      
      if (process.env.GITHUB_TOKEN) {
        options.headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
      }

      const fetchRemoteWithConfig = (useProxy: boolean) => new Promise<string>((resolve, reject) => {
        const currentOptions = { ...options };
        if (useProxy && process.env.HTTPS_PROXY) {
           currentOptions.agent = new (HttpsProxyAgent as any)(process.env.HTTPS_PROXY);
        } else {
           delete currentOptions.agent;
        }

        const req = https.get(githubUrl, currentOptions, (res) => {
          if (res.statusCode === 404) return reject(new Error("Dépôt ou package.json introuvable"));
          if (res.statusCode !== 200) return reject(new Error(`Erreur GitHub: ${res.statusCode}`));

          let data = "";
          res.on("data", chunk => data += chunk);
          res.on("end", () => resolve(data));
        });

        req.on("error", reject);
        req.setTimeout(10000, () => {
          req.destroy();
          reject(new Error("Timeout (10s) lors de la connexion à GitHub. Votre serveur a peut-être un accès internet limité."));
        });
      });

      const fetchRemote = async () => {
        try {
          const useProxy = await isProxyConfiguredAndReachable();
          return await fetchRemoteWithConfig(useProxy);
        } catch (error: any) {
          if (process.env.HTTPS_PROXY && (error.code === 'ETIMEDOUT' || error.message.includes('Timeout') || error.code === 'ECONNREFUSED')) {
            console.log("[UPDATE CHECK] Proxy failed, retrying without proxy...");
            return await fetchRemoteWithConfig(false);
          }
          throw error;
        }
      };

      const remoteData = await fetchRemote();
      const remotePackage = JSON.parse(remoteData);
      const remoteVersion = remotePackage.version;

      const localPackagePath = path.resolve(process.cwd(), "package.json");
      let localVersion = "0.9.3";
      if (fs.existsSync(localPackagePath)) {
        try {
          const pkg = JSON.parse(fs.readFileSync(localPackagePath, "utf-8"));
          localVersion = pkg.version || localVersion;
        } catch(e) {}
      }

      res.json({
        localVersion,
        remoteVersion,
        updateAvailable: remoteVersion !== localVersion,
        repoUrl: `https://github.com/${repo}`
      });
    } catch (error: any) {
      console.error("[UPDATE CHECK ERROR]", error);
      // On renvoie un code 200 avec l'erreur pour que l'interface puisse l'afficher calmement
      res.json({ 
        error: true, 
        message: `Vérification impossible : ${error.message || "Erreur réseau"}.`,
        details: error.toString()
      });
    }
  });

  app.get("/api/admin/test-email-trigger", async (req, res) => {
    // On privilégie l'email de l'utilisateur ou l'email vérifié Resend pour le test
    const rawTo = req.query.email as string || "demba.ndiaye@gmail.com";
    
    // Si l'utilisateur a passé un email en paramètre, on bypass le redirect global pour tester le compte pro
    const skipRedirect = !!req.query.email;
    const testEmail = rawTo;

    const subject = "TEST TECHNIQUE - TDS DT";
    const text = `Ceci est un message de test envoyé le ${new Date().toLocaleString()} pour vérifier la configuration du serveur de mail via Proxy Microsoft 365.`;
    
    console.log(`[TEST ROUTE] Attempting to send test email to ${testEmail} (SkipRedirect: ${skipRedirect})`);
    
    try {
      const result = await sendUnifiedEmail(testEmail, subject, text, skipRedirect);
      
      if (result.error) {
        const errorContent = result.error;
        const statusCode = result.statusCode;
        
        // Gestion spécifique des erreurs Resend Sandbox pour plus de clarté
        if (statusCode === 403 || (typeof errorContent === 'string' && errorContent.includes("403"))) {
          return res.json({ 
            provider: result.provider || "Resend", 
            status: "Action requise",
            message: "Erreur d'envoi (probalement Sandbox ou Proxy). Veuillez vérifier vos accès.",
            details: errorContent
          });
        }
        return res.status(500).json({ status: "Erreur", ...result } as any);
      }
      
      return res.json({ status: "Succès", ...result } as any);
    } catch (error: any) {
      console.error("[TEST ROUTE ERROR]", error);
      return res.status(500).json({ error: error instanceof Error ? error.message : "Erreur inconnue" });
    }
  });

  const hasResendConfig = !!process.env.RESEND_API_KEY;

  // Vérification de la connexion SMTP au démarrage
  if (process.env.SMTP_HOST && !hasResendConfig) {
    transporter.verify((error, success) => {
      if (error) {
        console.error("[SMTP CONNECTION ERROR]", error);
      } else {
        console.log("[SMTP CONNECTION SUCCESS] Server is ready to take our messages");
      }
    });
  }

  if (hasResendConfig) {
    console.log("[RESEND INFO] Resend API is configured and will be used for emails.");
  }

  // Database setup - Priority: DATABASE_PATH env > DISK_PATH env > local .db file
  let dbPath = path.resolve(process.cwd(), "tds_dt.db");
  
  if (process.env.DATABASE_PATH) {
    dbPath = path.isAbsolute(process.env.DATABASE_PATH.trim()) 
      ? process.env.DATABASE_PATH.trim() 
      : path.resolve(process.cwd(), process.env.DATABASE_PATH.trim());
  } else if (process.env.DISK_PATH) {
    dbPath = path.join(process.env.DISK_PATH.trim(), "tds_dt.db");
  }

  // Backup directory setup - Priority: BACKUP_PATH/BACKUP_DIR env > Default in same folder as DB
  let backupDir = path.resolve(path.dirname(dbPath), "backups");
  const envBackupDir = (process.env.BACKUP_PATH || process.env.BACKUP_DIR || "").trim();
  if (envBackupDir) {
    backupDir = path.isAbsolute(envBackupDir)
      ? envBackupDir
      : path.resolve(process.cwd(), envBackupDir);
  }

  const dbDir = path.dirname(dbPath);
  try {
    if (!fs.existsSync(dbDir) && dbDir !== "." && dbDir !== "/") {
      fs.mkdirSync(dbDir, { recursive: true });
    }
  } catch (e) {
    console.warn(`[DB WARNING] Could not create directory ${dbDir}: ${e instanceof Error ? e.message : String(e)}`);
  }

  try {
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
  } catch (e) {
    console.warn(`[BACKUP WARNING] Could not create directory ${backupDir}: ${e instanceof Error ? e.message : String(e)}`);
  }
  
  console.log(`[DB INFO] Using database at: ${dbPath}`);
  console.log(`[BACKUP INFO] Using backups at: ${backupDir}`);
  
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    // Test if the database is actually readable
    await db.get("SELECT name FROM sqlite_master LIMIT 1");
    await initDb(db);
  } catch (error: any) {
    if (error.code === 'SQLITE_CANTOPEN') {
      const defaultDbPath = path.resolve(process.cwd(), "tds_dt.db");
      if (dbPath !== defaultDbPath) {
        console.warn(`[DB WARNING] Could not open database at ${dbPath}. Falling back to default: ${defaultDbPath}`);
        dbPath = defaultDbPath;
        try {
          db = await open({
            filename: dbPath,
            driver: sqlite3.Database
          });
          await db.get("SELECT name FROM sqlite_master LIMIT 1");
        } catch (fallbackError: any) {
          console.error("[DB FATAL] Even default database failed to open:", fallbackError);
          throw fallbackError;
        }
      } else {
        throw error;
      }
    } else if (error.code === 'SQLITE_CORRUPT' || (error.message && error.message.includes('malformed'))) {
      console.error("[DB CORRUPTION] The database file is malformed. Deleting and recreating...");
      
      // CRITICAL: Close the handle before unlinking, otherwise Windows will throw EBUSY
      try {
        if (db) await db.close();
      } catch (closeError) {
        // Ignorer l'erreur de fermeture car on va supprimer le fichier
      }

      if (fs.existsSync(dbPath)) {
        try {
          fs.unlinkSync(dbPath);
        } catch (unlinkError: any) {
          if (unlinkError.code === 'EBUSY') {
            console.error("================================================================================");
            console.error("ERREUR : Le fichier de base de données est verrouillé par un autre programme.");
            console.error(`Chemin : ${dbPath}`);
            console.error("ACTIONS À TENTER :");
            console.error("1. Fermez tout logiciel ouvert qui pourrait utiliser ce fichier (OneDrive, Explorateur, SQLite Browser).");
            console.error("2. Supprimez MANUELLEMENT le fichier 'tds_dt.db' dans le dossier du projet.");
            console.error("3. Relancez la commande 'npm run dev'.");
            console.error("================================================================================");
            process.exit(1);
          }
          throw unlinkError;
        }
      }
      
      db = await open({
        filename: dbPath,
        driver: sqlite3.Database
      });
      await initDb(db);
      console.log("[DB] OK - Database initialized correctly after repair");
    } else {
      throw error;
    }
  }

  // Load routing mode for mails
  try {
    const modeSetting = await db.get("SELECT value FROM global_settings WHERE key = 'mail_mode'");
    if (modeSetting) {
      currentMailMode = modeSetting.value || "TEST";
    } else {
      await db.run("INSERT OR REPLACE INTO global_settings (key, value) VALUES ('mail_mode', 'TEST')");
      currentMailMode = "TEST";
    }
    console.log(`[MAIL CONFIG] Initial mail mode loaded: ${currentMailMode}`);
  } catch (err) {
    console.error("[MAIL CONFIG ERROR] Could not load initial mail_mode:", err);
  }

  // Trigger initial checks for title expirations on startup
  checkAndTriggerAllTitleAlerts(db).catch(e => console.error("[INITIAL TITLE CHECK ERROR]", e));

  // API Routes
  app.post("/api/login", async (req, res) => {
    const { trigram, password } = req.body;
    const cleanTrigram = trigram ? trigram.trim() : "";
    console.log(`[LOGIN] Attempt for "${cleanTrigram}"`);
    
    // On cherche l'utilisateur (trigramme insensible à la casse)
    const user = await db.get("SELECT * FROM users WHERE UPPER(trigram) = UPPER(?) AND password = ?", [cleanTrigram, password]);
    
    if (user) {
      console.log(`[LOGIN] Success for ${user.trigram} (Role: ${user.role})`);
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      const loginTime = new Date().toISOString();
      const result = await db.run(
        "INSERT INTO connection_logs (trigram, login_time, ip_address, action) VALUES (?, ?, ?, ?)",
        [user.trigram, loginTime, String(ip), "Connexion"]
      );
      res.json({ ...user, logId: result.lastID });
    } else {
      console.warn(`[LOGIN] Failed for "${cleanTrigram}". User not found or password incorrect.`);
      // Vérification si le trigramme existe au moins (pour le debug interne)
      const trigramExists = await db.get("SELECT 1 FROM users WHERE UPPER(trigram) = UPPER(?)", [cleanTrigram]);
      if (trigramExists) {
        console.warn(`[LOGIN DEBUG] Trigram "${cleanTrigram}" exists, so password was incorrect.`);
      } else {
        console.warn(`[LOGIN DEBUG] Trigram "${cleanTrigram}" not found in database.`);
      }
      res.status(401).json({ error: "Identifiants invalides" });
    }
  });

  app.post("/api/logout", async (req, res) => {
    const { logId } = req.body;
    if (logId) {
      const logoutTime = new Date().toISOString();
      const log = await db.get("SELECT login_time, action FROM connection_logs WHERE id = ?", [logId]);
      if (log) {
        const duration = Math.floor((new Date(logoutTime).getTime() - new Date(log.login_time).getTime()) / 1000);
        const newAction = log.action ? `${log.action}, Déconnexion` : "Déconnexion";
        await db.run(
          "UPDATE connection_logs SET logout_time = ?, duration = ?, action = ? WHERE id = ?",
          [logoutTime, duration, newAction, logId]
        );
      }
    }
    res.json({ success: true });
  });

  app.get("/api/logs", async (req, res) => {
    const logs = await db.all("SELECT * FROM connection_logs ORDER BY login_time DESC LIMIT 1000");
    res.json(logs);
  });

  // MAINTENANCE & MISE À JOUR (POUR ADMIN)
  app.post("/api/admin/system/update", async (req, res) => {
    const { trigram } = req.body;
    const user = await db.get("SELECT role FROM users WHERE trigram = ?", [trigram]);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: "Accès refusé : Droits administrateur requis." });
    }

    console.log(`[SYSTEM] Update triggered by ${trigram}`);
    const scriptPath = path.join(process.cwd(), "scripts", "update-prod.sh");
    
    if (!fs.existsSync(scriptPath)) {
      return res.status(404).json({ error: "Script de mise à jour introuvable." });
    }

    try {
      fs.chmodSync(scriptPath, "755");
    } catch (e) {}

    const logPath = path.join(process.cwd(), "update.log");
    const logFile = fs.openSync(logPath, "w");
    const child = spawn("bash", [scriptPath], {
      detached: true,
      stdio: ["ignore", logFile, logFile]
    });
    child.unref();

    res.json({ success: true, message: "Mise à jour lancée." });
  });

  app.get("/api/admin/system/update-logs", async (req, res) => {
    const logPath = path.join(process.cwd(), "update.log");
    if (!fs.existsSync(logPath)) return res.json({ logs: "" });
    try {
      const content = fs.readFileSync(logPath, "utf-8");
      res.json({ logs: content.split("\n").slice(-200).join("\n") });
    } catch (error: any) {
      res.status(500).json({ error: "Erreur lecture logs" });
    }
  });

  app.get("/api/admin/db/download", async (req, res) => {
    try {
      if (fs.existsSync(dbPath)) {
        res.download(dbPath, "tds_dt.db");
      } else {
        res.status(404).json({ error: "Fichier base de données introuvable" });
      }
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // GESTION DES SAUVEGARDES
  app.get("/api/admin/backups", async (req, res) => {
    try {
      if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
      const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.db'));
      const stats = files.map(f => {
        const s = fs.statSync(path.join(backupDir, f));
        return { name: f, size: s.size, date: s.mtime };
      });
      res.json(stats.sort((a, b) => b.date.getTime() - a.date.getTime()));
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/admin/backups/create", async (req, res) => {
    const result = await createBackup(false);
    res.json(result);
  });

  app.post("/api/admin/backups/restore", async (req, res) => {
    const { name } = req.body;
    const backupPath = path.join(backupDir, name);
    if (!fs.existsSync(backupPath)) return res.status(404).json({ error: "Introuvable" });

    try {
      await db.close();
      fs.copyFileSync(backupPath, dbPath);
      db = await open({ filename: dbPath, driver: sqlite3.Database });
      await initDb(db);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
      try { db = await open({ filename: dbPath, driver: sqlite3.Database }); } catch(reErr) {}
    }
  });

  app.delete("/api/admin/backups/:name", async (req, res) => {
    try {
      fs.unlinkSync(path.join(backupDir, req.params.name));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/recover", async (req, res) => {
    const { trigram } = req.body;
    if (!trigram || typeof trigram !== 'string') {
      return res.status(400).json({ error: "Trigramme requis" });
    }

    const cleanTri = trigram.trim().toUpperCase();
    const user = await db.get("SELECT id, trigram, firstname, lastname, email FROM users WHERE UPPER(trigram) = ?", [cleanTri]);

    if (!user) {
      return res.status(404).json({ error: "Trigramme inconnu" });
    }

    // Normalisation de l'adresse e-mail (sans accents)
    const email = getFormattedEmail(user.email, user.firstname, user.lastname);

    // Génération d'un mot de passe temporaire aléatoire
    const tempPassword = Math.random().toString(36).slice(-8);

    const textTemp = `Bonjour ${user.firstname},\n\nVotre mot de passe temporaire pour l'application Gestion TDS DT est : ${tempPassword}\n\nVeuillez le changer dès votre prochaine connexion.\n\nCordialement,\nL'équipe DAC-NC/SNA/DT`;
    const htmlTemp = buildEmailTemplate(
      "Nouveau Mot de Passe Temporaire",
      `Bonjour ${user.firstname},`,
      `À votre demande (ou à celle de votre administrateur), un mot de passe temporaire a été généré pour votre compte.<br><br>
       Votre mot de passe temporaire est : <strong style="font-family: monospace; font-size: 16px; background: #f1f5f9; padding: 4px 8px; border-radius: 4px; display: inline-block;">${tempPassword}</strong><br><br>
       Veuillez le modifier dès votre première connexion pour sécuriser votre compte.`,
      "/#/",
      "Se Connecter à l'Application"
    );

    console.log(`[AUTH RECOVER] Envoi e-mail de réinitialisation pour ${user.trigram} à ${email}...`);
    const emailResult = await sendUnifiedEmail(
      email,
      "Votre mot de passe temporaire - TDS DT",
      textTemp,
      false,
      htmlTemp
    );

    if (emailResult.error && !emailResult.success) {
      console.error("[RESET PASSWORD MAIL ERROR]", emailResult.error);
      return res.status(500).json({
        error: `Erreur d'envoi du mail de réinitialisation à ${email} : ${typeof emailResult.error === 'string' ? emailResult.error : JSON.stringify(emailResult.error)}`
      });
    }

    // Mise à jour en base uniquement après envoi réussi (ou en mode test)
    await db.run("UPDATE users SET password = ?, first_login = 1 WHERE id = ?", [tempPassword, user.id]);
    console.log(`[AUTH] Temporary password generated and saved for ${user.trigram}: ${tempPassword}`);

    return res.json({ 
      success: true, 
      message: `Un mot de passe temporaire a été généré et envoyé par e-mail à ${email}.` 
    });
  });

  app.get("/api/settings", async (req, res) => {
    const settings = await db.all("SELECT * FROM global_settings");
    const settingsObj = settings.reduce((acc: any, s: any) => {
      acc[s.key] = s.value;
      return acc;
    }, {});
    // Envoyer également la valeur configurée dans le fichier .env
    settingsObj.email_debug_recipient = process.env.EMAIL_DEBUG_RECIPIENT || "demba.ndiaye@aviation-civile.gouv.fr";
    res.json(settingsObj);
  });

  app.post("/api/settings", async (req, res) => {
    const { key, value } = req.body;
    await db.run("INSERT OR REPLACE INTO global_settings (key, value) VALUES (?, ?)", [key, value]);
    if (key === "mail_mode") {
      currentMailMode = value;
      console.log(`[MAIL CONFIG] In-memory mail mode updated to: ${currentMailMode}`);
    }
    res.json({ success: true });
  });

  app.get("/api/marquee", async (req, res) => {
    const messages = await db.all("SELECT * FROM marquee_messages");
    res.json(messages);
  });

  app.post("/api/marquee", async (req, res) => {
    const { content, start_date, end_date, entities, admin_only } = req.body;
    try {
      await db.run(`
        INSERT INTO marquee_messages (content, start_date, end_date, entities, admin_only)
        VALUES (?, ?, ?, ?, ?)
      `, [content, start_date, end_date, entities, admin_only ? 1 : 0]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de la création du message." });
    }
  });

  app.patch("/api/marquee/:id", async (req, res) => {
    const { id } = req.params;
    const { content, start_date, end_date, entities, admin_only } = req.body;
    try {
      await db.run(`
        UPDATE marquee_messages 
        SET content = ?, start_date = ?, end_date = ?, entities = ?, admin_only = ?
        WHERE id = ?
      `, [content, start_date, end_date, entities, admin_only ? 1 : 0, id]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de la mise à jour du message." });
    }
  });

  app.delete("/api/marquee/:id", async (req, res) => {
    const { id } = req.params;
    console.log(`DELETE request received for marquee message ID: ${id}`);
    try {
      const result = await db.run("DELETE FROM marquee_messages WHERE id = ?", [id]);
      console.log(`Delete result:`, result);
      res.json({ success: true });
    } catch (error) {
      console.error(`Delete error for ID ${id}:`, error);
      res.status(500).json({ error: "Erreur lors de la suppression du message." });
    }
  });

  app.get("/api/users", async (req, res) => {
    const users = await db.all("SELECT * FROM users ORDER BY display_order ASC, lastname ASC");
    res.json(users);
  });

  app.get("/api/updates", async (req, res) => {
    const repo = process.env.GITHUB_REPO;
    
    // 1. Try Git API (GitHub)
    if (repo) {
      try {
        console.log(`[COMMITS-FETCH] Fetching commits for GITHUB_REPO: ${repo}`);
        const githubUrl = `https://api.github.com/repos/${repo}/commits?per_page=30`;
        const options: any = {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Node.js/TDS-DT-App'
          }
        };

        if (process.env.GITHUB_TOKEN) {
          options.headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
        }

        const fetchCommitsWithConfig = (useProxy: boolean) => new Promise<string>((resolve, reject) => {
          const currentOptions = { ...options };
          if (useProxy && process.env.HTTPS_PROXY) {
            currentOptions.agent = new (HttpsProxyAgent as any)(process.env.HTTPS_PROXY);
          } else {
            delete currentOptions.agent;
          }

          const request = https.get(githubUrl, currentOptions, (response) => {
            if (response.statusCode !== 200) {
              return reject(new Error(`GitHub labels responded with status ${response.statusCode}`));
            }

            let data = "";
            response.on("data", chunk => data += chunk);
            response.on("end", () => resolve(data));
          });

          request.on("error", reject);
          request.setTimeout(8000, () => {
            request.destroy();
            reject(new Error("Timeout calling GitHub API"));
          });
        });

        const fetchCommits = async () => {
          try {
            const useProxy = await isProxyConfiguredAndReachable();
            return await fetchCommitsWithConfig(useProxy);
          } catch (error) {
            if (process.env.HTTPS_PROXY) {
              console.log("[COMMITS-FETCH] Proxy failed, trying direct...");
              return await fetchCommitsWithConfig(false);
            }
            throw error;
          }
        };

        const rawData = await fetchCommits();
        const commits = JSON.parse(rawData);

        if (Array.isArray(commits)) {
          const mappedUpdates = commits.map((item: any, index: number) => {
            const message = item.commit?.message || "No commit message";
            const parts = message.split('\n');
            const summary = parts[0].trim();
            const details = parts.slice(1).join('\n').trim();

            return {
              version_code: item.sha ? item.sha.substring(0, 7) : 'git',
              update_date: item.commit?.author?.date || new Date().toISOString(),
              summary: summary,
              details: details,
              is_github: true
            };
          });

          const translated = await translateAndCacheCommits(mappedUpdates);
          return res.json(translated);
        }
      } catch (e: any) {
        console.warn("[COMMITS-FETCH] GitHub API fetch failed, trying local git log...", e.message || e);
      }
    }

    // 2. Try local git log fallback
    const localCommits = await new Promise<any[]>((resolve) => {
      exec('git log -n 30 --pretty=format:"%H|%cI|%s|%b%n---COMMIT_END---"', (error, stdout, stderr) => {
        if (error) {
          console.warn("[COMMITS-FETCH] Local git log failed:", error.message);
          return resolve([]);
        }
        try {
          const commits: any[] = [];
          const blocks = stdout.split('---COMMIT_END---');
          
          for (const block of blocks) {
            const trimmed = block.trim();
            if (!trimmed) continue;
            
            const firstLineBreak = trimmed.indexOf('\n');
            const header = firstLineBreak === -1 ? trimmed : trimmed.substring(0, firstLineBreak);
            const body = firstLineBreak === -1 ? '' : trimmed.substring(firstLineBreak + 1);
            
            const parts = header.split('|');
            if (parts.length >= 3) {
              const sha = parts[0];
              const date = parts[1];
              const summary = parts[2];
              const details = parts[3] ? (parts[3] + '\n' + body).trim() : body.trim();
              commits.push({
                version_code: sha.substring(0, 7),
                update_date: date,
                summary: summary,
                details: details,
                is_github: true
              });
            }
          }
          
          resolve(commits);
        } catch (e) {
          console.error("[COMMITS-FETCH] Local git log parse error:", e);
          resolve([]);
        }
      });
    });

    if (localCommits.length > 0) {
      const translated = await translateAndCacheCommits(localCommits);
      return res.json(translated);
    }

    // 3. SQLite Fallback
    console.log("[COMMITS-FETCH] Falling back to SQLite table database...");
    const updates = await db.all("SELECT * FROM app_updates ORDER BY update_date DESC, id DESC");
    res.json(updates);
  });

  app.post("/api/updates", async (req, res) => {
    const { version_code, summary, details } = req.body;
    try {
      const update_date = new Date().toISOString(); // ISO Full string avec heure
      await db.run(`
        INSERT INTO app_updates (version_code, update_date, summary, details)
        VALUES (?, ?, ?, ?)
      `, [version_code, update_date, summary, details]);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/tds", async (req, res) => {
    let { entity, is_sandbox } = req.query;
    // Normalisation de l'entité pour gérer les problèmes d'accents
    if (entity === 'Siege' || entity === 'siege') entity = 'Siège';
    
    console.log(`[DEBUG] /api/tds requested for entity: ${entity}, is_sandbox: ${is_sandbox}`);
    const entries = await db.all(`
      SELECT t.*, u.trigram, u.firstname, u.lastname, u.entity 
      FROM tds_entries t 
      LEFT JOIN users u ON t.user_id = u.id 
      WHERE (u.entity = ? OR (t.user_id <= -200 AND ? = 'MR-MGA')) AND t.is_sandbox = ?
    `, [entity, entity, is_sandbox === 'true' || is_sandbox === '1' ? 1 : 0]);
    console.log(`[DEBUG] Found ${entries.length} entries for ${entity} (sandbox: ${is_sandbox})`);
    if (entries.length > 0) {
      console.log(`[DEBUG] Trigrams found: ${Array.from(new Set(entries.map(e => e.trigram || 'EQUIPMENT'))).join(', ')}`);
    }
    res.json(entries);
  });

  app.post("/api/tds", async (req, res) => {
    const { user_id, date, status, comment, is_sandbox } = req.body;
    
    try {
      await db.exec("BEGIN TRANSACTION");
      const existing = await db.get("SELECT id FROM tds_entries WHERE user_id = ? AND date = ? AND is_sandbox = ?", [user_id, date, is_sandbox ? 1 : 0]);
      
      if (existing) {
        await db.run("UPDATE tds_entries SET status = ?, comment = ?, border_color = NULL WHERE id = ?", [status, comment, existing.id]);
      } else {
        await db.run("INSERT INTO tds_entries (user_id, date, status, comment, is_sandbox, border_color) VALUES (?, ?, ?, ?, ?, NULL)", [user_id, date, status, comment, is_sandbox ? 1 : 0]);
      }

      // Automatiquement créer une demande de congé si c'est un statut de congé
      if (!is_sandbox && ['CA', 'RTT', 'REC'].includes(status)) {
        // Vérifier si une demande existe déjà pour ce jour pour éviter les doublons
        const existingLeave = await db.get(
          "SELECT id FROM leave_requests WHERE user_id = ? AND start_date = ? AND end_date = ? AND type = ? AND status != 'rejected'",
          [user_id, date, date, status]
        );
        if (!existingLeave) {
          await createLeaveRequest(db, { user_id, start_date: date, end_date: date, type: status });
        }
      }

      await db.exec("COMMIT");
      res.json({ success: true });
    } catch (error) {
      await db.exec("ROLLBACK");
      res.status(500).json({ error: "Erreur lors de la mise à jour du TDS." });
    }
  });

  app.get("/api/equipment_interventions", async (req, res) => {
    const is_sandbox = req.query.is_sandbox === 'true' || req.query.is_sandbox === '1' ? 1 : 0;
    try {
      const rows = await db.all("SELECT * FROM equipment_interventions WHERE is_sandbox = ?", [is_sandbox]);
      res.json(rows);
    } catch (error) {
      console.error("[GET INTERVENTIONS ERROR]", error);
      res.status(500).json({ error: "Erreur lors de la récupération des interventions." });
    }
  });

  app.delete("/api/equipment_interventions/:id", async (req, res) => {
    const { id } = req.params;
    try {
      await db.run("DELETE FROM equipment_interventions WHERE id = ?", [Number(id)]);
      res.json({ success: true });
    } catch (error) {
      console.error("[DELETE INTERVENTION ERROR]", error);
      res.status(500).json({ error: "Erreur lors de la suppression de l'intervention." });
    }
  });

  app.post("/api/equipment_interventions", async (req, res) => {
    const { user_id, date, equipment_ids, is_sandbox } = req.body;
    const sandboxVal = is_sandbox ? 1 : 0;
    try {
      await db.exec("BEGIN TRANSACTION");
      await db.run(
        "DELETE FROM equipment_interventions WHERE user_id = ? AND date = ? AND is_sandbox = ?",
        [user_id, date, sandboxVal]
      );
      if (Array.isArray(equipment_ids)) {
        for (const eqId of equipment_ids) {
          await db.run(
            "INSERT INTO equipment_interventions (user_id, equipment_id, date, is_sandbox) VALUES (?, ?, ?, ?)",
            [user_id, eqId, date, sandboxVal]
          );
        }
      }
      await db.exec("COMMIT");
      res.json({ success: true });
    } catch (error) {
      await db.exec("ROLLBACK");
      console.error("[POST INTERVENTIONS ERROR]", error);
      res.status(500).json({ error: "Erreur lors de l'enregistrement des interventions." });
    }
  });

  app.post("/api/tds/bulk", async (req, res) => {
    const { user_id, start_date, end_date, status, comment, is_sandbox } = req.body;
    
    try {
      await db.exec("BEGIN TRANSACTION");
      const start = new Date(start_date);
      const end = new Date(end_date);
      
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const existing = await db.get("SELECT id FROM tds_entries WHERE user_id = ? AND date = ? AND is_sandbox = ?", [user_id, dateStr, is_sandbox ? 1 : 0]);
        
        if (existing) {
          await db.run("UPDATE tds_entries SET status = ?, comment = ?, border_color = NULL WHERE id = ?", [status, comment, existing.id]);
        } else {
          await db.run("INSERT INTO tds_entries (user_id, date, status, comment, is_sandbox, border_color) VALUES (?, ?, ?, ?, ?, NULL)", [user_id, dateStr, status, comment, is_sandbox ? 1 : 0]);
        }
      }

      // Automatiquement créer UNE SEULE demande de congé pour toute la période
      if (!is_sandbox && ['CA', 'RTT', 'REC'].includes(status)) {
        // Vérifier si une demande identique existe déjà pour éviter les doublons
        const existingLeave = await db.get(
          "SELECT id FROM leave_requests WHERE user_id = ? AND start_date = ? AND end_date = ? AND type = ? AND status != 'rejected'",
          [user_id, start_date, end_date, status]
        );
        if (!existingLeave) {
          await createLeaveRequest(db, { user_id, start_date, end_date, type: status });
        }
      }

      await db.exec("COMMIT");
      res.json({ success: true });
    } catch (error) {
      await db.exec("ROLLBACK");
      res.status(500).json({ error: "Erreur lors de la mise à jour groupée du TDS." });
    }
  });

  app.post("/api/tds/bulk-update-annual-mga", async (req, res) => {
    const { updates } = req.body;
    try {
      await db.exec("BEGIN TRANSACTION");
      for (const update of updates) {
        const { user_id, date, status, comment, is_sandbox } = update;
        const existing = await db.get("SELECT id FROM tds_entries WHERE user_id = ? AND date = ? AND is_sandbox = ?", [user_id, date, is_sandbox ? 1 : 0]);
        if (existing) {
          await db.run("UPDATE tds_entries SET status = ?, comment = ?, border_color = NULL WHERE id = ?", [status, comment || "", existing.id]);
        } else {
          await db.run("INSERT INTO tds_entries (user_id, date, status, comment, is_sandbox, border_color) VALUES (?, ?, ?, ?, ?, NULL)", [user_id, date, status, comment || "", is_sandbox ? 1 : 0]);
        }
      }
      await db.exec("COMMIT");
      res.json({ success: true });
    } catch (error: any) {
      await db.exec("ROLLBACK");
      console.error("[BULK ANNUAL UPDATE ERROR]", error);
      res.status(500).json({ error: "Erreur lors de la mise à jour automatique de l'annuel MGA." });
    }
  });

  app.post("/api/tds/import-ics", async (req, res) => {
    const { user_id, entries, overwrite, is_sandbox } = req.body;
    if (!user_id || !Array.isArray(entries)) {
      return res.status(400).json({ error: "Paramètres manquants ou invalides." });
    }

    try {
      await db.exec("BEGIN TRANSACTION");
      let count = 0;

      for (const entry of entries) {
        const { date, status, comment } = entry;
        if (!date || !status) continue;

        const existing = await db.get(
          "SELECT id FROM tds_entries WHERE user_id = ? AND date = ? AND is_sandbox = ?",
          [user_id, date, is_sandbox ? 1 : 0]
        );

        if (existing) {
          if (overwrite) {
            await db.run(
              "UPDATE tds_entries SET status = ?, comment = ?, border_color = NULL WHERE id = ?",
              [status, comment || "", existing.id]
            );
            count++;
          }
        } else {
          await db.run(
            "INSERT INTO tds_entries (user_id, date, status, comment, is_sandbox, border_color) VALUES (?, ?, ?, ?, ?, NULL)",
            [user_id, date, status, comment || "", is_sandbox ? 1 : 0]
          );
          count++;
        }

        if (!is_sandbox && ['CA', 'RTT', 'REC'].includes(status)) {
          const existingLeave = await db.get(
            "SELECT id FROM leave_requests WHERE user_id = ? AND start_date = ? AND end_date = ? AND type = ? AND status != 'rejected'",
            [user_id, date, date, status]
          );
          if (!existingLeave) {
            await createLeaveRequest(db, { user_id, start_date: date, end_date: date, type: status });
          }
        }
      }

      await db.exec("COMMIT");
      res.json({ success: true, count });
    } catch (error: any) {
      await db.exec("ROLLBACK");
      console.error("[ICS IMPORT ERROR]", error);
      res.status(500).json({ error: "Erreur lors de l'importation de l'agenda ICS." });
    }
  });

  async function createLeaveRequest(db: any, { user_id, start_date, end_date, type }: any) {
    const result = await db.run(`
      INSERT INTO leave_requests (user_id, start_date, end_date, type)
      VALUES (?, ?, ?, ?)
    `, [user_id, start_date, end_date, type]);

    // Notification email au N+1 gérée par le dispatch paramétrable
    const agent = await db.get("SELECT * FROM users WHERE id = ?", [user_id]);
    if (agent) {
      dispatchWorkflowEmail(db, 'creation', agent, { start_date, end_date, type })
        .catch(e => console.error("[WORKFLOW EMAIL CREATION ERROR]", e));
    }
    return result.lastID;
  }

  app.get("/api/leaves", async (req, res) => {
    const leaves = await db.all(`
      SELECT l.*, u.trigram, u.firstname, u.lastname, u.entity, u.role
      FROM leave_requests l 
      JOIN users u ON l.user_id = u.id
    `);
    res.json(leaves);
  });

  app.post("/api/leaves", async (req, res) => {
    const { user_id, start_date, end_date, type } = req.body;
    
    if (!start_date || !end_date || isNaN(Date.parse(start_date)) || isNaN(Date.parse(end_date))) {
      return res.status(400).json({ error: "Dates de début et de fin invalides ou manquantes." });
    }

    try {
      const id = await createLeaveRequest(db, { user_id, start_date, end_date, type });
      res.json({ id });
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de la création de la demande." });
    }
  });

  // PROMESS Endpoints
  app.get("/api/promess", async (req, res) => {
    try {
      const rows = await db.all("SELECT * FROM promess_data");
      const data: any = {};
      rows.forEach(r => {
        data[r.equipment] = {
          lastSemestrielle: r.lastSemestrielle || '',
          lastAnnuelle: r.lastAnnuelle || '',
          butee9Mois: r.butee9Mois || '',
          butee18Mois: r.butee18Mois || '',
          maintSemestrielle: r.maintSemestrielle || '',
          maintAnnuelle: r.maintAnnuelle || '',
        };
      });
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/promess", async (req, res) => {
    const { equipment, lastSemestrielle, lastAnnuelle, butee9Mois, butee18Mois, maintSemestrielle, maintAnnuelle } = req.body;
    if (!equipment) {
      return res.status(400).json({ error: "Équipement manquant." });
    }
    try {
      await db.run(`
        INSERT OR REPLACE INTO promess_data (equipment, lastSemestrielle, lastAnnuelle, butee9Mois, butee18Mois, maintSemestrielle, maintAnnuelle)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [equipment, lastSemestrielle || '', lastAnnuelle || '', butee9Mois || '', butee18Mois || '', maintSemestrielle || '', maintAnnuelle || '']);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Projects/Tasks Endpoints
  app.get("/api/projects_tasks", async (req, res) => {
    try {
      const rows = await db.all("SELECT * FROM mga_projects_tasks ORDER BY id ASC");
      const tasks = rows.map(r => ({
        ...r,
        id: String(r.id)
      }));
      res.json(tasks);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/projects_tasks", async (req, res) => {
    const { id, section, project, manager, task, taskManager, dueDate, status, followUp } = req.body;
    try {
      if (id && !isNaN(Number(id))) {
        await db.run(`
          UPDATE mga_projects_tasks
          SET section = ?, project = ?, manager = ?, task = ?, taskManager = ?, dueDate = ?, status = ?, followUp = ?
          WHERE id = ?
        `, [section, project, manager, task, taskManager, dueDate, status, followUp, Number(id)]);
        res.json({ id: String(id), success: true });
      } else {
        const result = await db.run(`
          INSERT INTO mga_projects_tasks (section, project, manager, task, taskManager, dueDate, status, followUp)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [section || '', project || '', manager || '', task || '', taskManager || '', dueDate || '', status || 'Non affectée', followUp || '']);
        res.json({ id: String(result.lastID), success: true });
      }
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/projects_tasks/:id", async (req, res) => {
    const { id } = req.params;
    try {
      await db.run("DELETE FROM mga_projects_tasks WHERE id = ?", [Number(id)]);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Annuaire MR Endpoints
  app.get("/api/mr_directory", async (req, res) => {
    try {
      const rows = await db.all("SELECT * FROM mr_directory ORDER BY id ASC");
      const items = rows.map(r => ({
        ...r,
        id: String(r.id)
      }));
      res.json(items);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/mr_directory", async (req, res) => {
    const { id, terrain, entity, contact, function: fn, landline, mobile, email, comments } = req.body;
    try {
      if (id && !isNaN(Number(id))) {
        await db.run(`
          UPDATE mr_directory
          SET terrain = ?, entity = ?, contact = ?, function = ?, landline = ?, mobile = ?, email = ?, comments = ?
          WHERE id = ?
        `, [terrain || '', entity || '', contact || '', fn || '', landline || '', mobile || '', email || '', comments || '', Number(id)]);
        res.json({ id: String(id), success: true });
      } else {
        const result = await db.run(`
          INSERT INTO mr_directory (terrain, entity, contact, function, landline, mobile, email, comments)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [terrain || '', entity || '', contact || '', fn || '', landline || '', mobile || '', email || '', comments || '']);
        res.json({ id: String(result.lastID), success: true });
      }
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/mr_directory/bulk", async (req, res) => {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: "items array required" });
    }
    try {
      await db.run("BEGIN TRANSACTION");
      for (const item of items) {
        const { terrain, entity, contact, function: fn, landline, mobile, email, comments } = item;
        await db.run(`
          INSERT INTO mr_directory (terrain, entity, contact, function, landline, mobile, email, comments)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [terrain || '', entity || '', contact || '', fn || '', landline || '', mobile || '', email || '', comments || '']);
      }
      await db.run("COMMIT");
      const allRows = await db.all("SELECT * FROM mr_directory ORDER BY id ASC");
      const formatted = allRows.map(r => ({ ...r, id: String(r.id) }));
      res.json({ success: true, items: formatted });
    } catch (e: any) {
      await db.run("ROLLBACK").catch(() => {});
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/mr_directory/:id", async (req, res) => {
    const { id } = req.params;
    try {
      await db.run("DELETE FROM mr_directory WHERE id = ?", [Number(id)]);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // MGA Missions Endpoints
  app.get("/api/mga_missions", async (req, res) => {
    try {
      const rows = await db.all("SELECT * FROM mga_missions ORDER BY id ASC");
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/mga_missions", async (req, res) => {
    const { id, name, category, description } = req.body;
    try {
      if (id) {
        await db.run(`
          UPDATE mga_missions
          SET name = ?, category = ?, description = ?
          WHERE id = ?
        `, [name, category, description, Number(id)]);
        res.json({ id, success: true });
      } else {
        const result = await db.run(`
          INSERT INTO mga_missions (name, category, description)
          VALUES (?, ?, ?)
        `, [name, category, description || '']);
        res.json({ id: result.lastID, success: true });
      }
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/mga_missions/:id", async (req, res) => {
    const { id } = req.params;
    try {
      await db.run("DELETE FROM mga_missions WHERE id = ?", [Number(id)]);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // MGA Equipments Endpoints
  app.get("/api/mga_equipments", async (req, res) => {
    try {
      const rows = await db.all("SELECT * FROM mga_equipments ORDER BY id ASC");
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/mga_equipments", async (req, res) => {
    const { id, name, category, description } = req.body;
    try {
      if (id) {
        await db.run(`
          UPDATE mga_equipments
          SET name = ?, category = ?, description = ?
          WHERE id = ?
        `, [name, category, description, Number(id)]);
        res.json({ id, success: true });
      } else {
        const result = await db.run(`
          INSERT INTO mga_equipments (name, category, description)
          VALUES (?, ?, ?)
        `, [name, category, description || '']);
        res.json({ id: result.lastID, success: true });
      }
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/mga_equipments/:id", async (req, res) => {
    const { id } = req.params;
    try {
      await db.run("DELETE FROM mga_equipments WHERE id = ?", [Number(id)]);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/tds/copy-active-to-sandbox", async (req, res) => {
    const { entity, year } = req.body;
    if (entity !== 'MR-TTA') return res.status(400).json({ error: "Seul MR-TTA possède un bac à sable." });
    const targetYear = year || 2026;

    try {
      await db.exec("BEGIN TRANSACTION");

      // 1. Delete all existing sandbox entries (is_sandbox = 1) for MR-TTA users in that year
      await db.run(`
        DELETE FROM tds_entries 
        WHERE is_sandbox = 1 
        AND user_id IN (SELECT id FROM users WHERE entity = 'MR-TTA')
        AND date LIKE ?
      `, [`${targetYear}%`]);

      // 2. Fetch all MR-TTA users
      const users = await db.all(`
        SELECT id, trigram, off_day, profil 
        FROM users 
        WHERE entity = 'MR-TTA' 
        AND role != 'secretary'
      `);

      const getDatesOfWeekHelper = (yearNum: number, weekNum: number) => {
        const firstDayOfYear = new Date(yearNum, 0, 1);
        firstDayOfYear.setHours(12, 0, 0, 0);
        const firstDayOfWeek = firstDayOfYear.getDay();
        const toThursday = (4 - firstDayOfWeek + 7) % 7;
        const firstThursday = new Date(firstDayOfYear);
        firstThursday.setDate(firstDayOfYear.getDate() + toThursday);
        const targetThursday = new Date(firstThursday);
        targetThursday.setDate(firstThursday.getDate() + (weekNum - 1) * 7);
        const monday = new Date(targetThursday);
        monday.setDate(targetThursday.getDate() - 3);
        const days = [];
        for(let i=0; i<7; i++) {
          const d = new Date(monday);
          d.setDate(monday.getDate() + i);
          const yStr = d.getFullYear();
          const mStr = String(d.getMonth() + 1).padStart(2, '0');
          const dStr = String(d.getDate()).padStart(2, '0');
          days.push(`${yStr}-${mStr}-${dStr}`);
        }
        return days;
      };

      // 3. For each user and each week of the year
      for (const u of users) {
        // Fetch all active entries for this user
        const activeEntries = await db.all(`
          SELECT * FROM tds_entries 
          WHERE user_id = ? 
          AND is_sandbox = 0
        `, [u.id]);

        for (let weekNum = 1; weekNum <= 53; weekNum++) {
          const dateStr = `${targetYear}-W${String(weekNum).padStart(2, '0')}`;
          
          // A. Try direct weekly match first
          const directEntry = activeEntries.find(e => e.date === dateStr);
          if (directEntry) {
            await db.run(`
              INSERT INTO tds_entries (user_id, date, status, comment, is_sandbox, border_color)
              VALUES (?, ?, ?, ?, ?, ?)
            `, [u.id, dateStr, directEntry.status, directEntry.comment || "", 1, directEntry.border_color || null]);
            continue;
          }

          // B. Try daily match
          const weekDates = getDatesOfWeekHelper(targetYear, weekNum);
          const weekEntries = activeEntries.filter(e => weekDates.includes(e.date));

          if (weekEntries.length > 0) {
            let status = "";
            let comment = "";
            let border_color: string | null = null;

            // Check if any has cycle border
            const cycle1Entry = weekEntries.find(e => e.border_color === '#4FB6E1');
            const cycle2Entry = weekEntries.find(e => e.border_color === '#1B6486');
            const cycle3Entry = weekEntries.find(e => e.border_color === '#E77E31');

            if (cycle1Entry) {
              status = '1';
              border_color = '#4FB6E1';
              comment = cycle1Entry.comment || weekEntries.map(e => e.comment).filter(Boolean).join(' / ') || '';
            } else if (cycle2Entry) {
              status = '2';
              border_color = '#1B6486';
              comment = cycle2Entry.comment || weekEntries.map(e => e.comment).filter(Boolean).join(' / ') || '';
            } else if (cycle3Entry) {
              status = '3';
              border_color = '#E77E31';
              comment = cycle3Entry.comment || weekEntries.map(e => e.comment).filter(Boolean).join(' / ') || '';
            } else {
              // Standard status calculation
              const statusCounts: Record<string, number> = {};
              let bestComment = '';
              for (const e of weekEntries) {
                if (e.status && e.status !== 'OFF') {
                  statusCounts[e.status] = (statusCounts[e.status] || 0) + 1;
                }
                if (e.comment) {
                  bestComment = e.comment;
                }
              }

              const sortedStatuses = Object.keys(statusCounts).sort((a, b) => statusCounts[b] - statusCounts[a]);
              if (sortedStatuses.length > 0) {
                let weekStatus = sortedStatuses[0];
                if (weekStatus === 'CA') weekStatus = 'C';
                if (weekStatus === 'FOR') weekStatus = 'F';
                status = weekStatus;
                comment = bestComment;
              } else {
                const hasOff = weekEntries.some(e => e.status === 'OFF');
                if (hasOff) {
                  status = 'OFF';
                  comment = bestComment;
                } else {
                  const firstWithStatus = weekEntries.find(e => e.status);
                  if (firstWithStatus) {
                    status = firstWithStatus.status;
                    comment = firstWithStatus.comment || '';
                  }
                }
              }
            }

            if (status) {
              await db.run(`
                INSERT INTO tds_entries (user_id, date, status, comment, is_sandbox, border_color)
                VALUES (?, ?, ?, ?, ?, ?)
              `, [u.id, dateStr, status, comment, 1, border_color]);
            }
          }
        }
      }

      await db.exec("COMMIT");
      res.json({ success: true, message: "Le tableau actuel a été basculé avec succès vers le tableau BAS." });
    } catch (error: any) {
      await db.exec("ROLLBACK");
      console.error("[COPY ACTIVE TO SANDBOX ERROR]", error);
      res.status(500).json({ error: "Erreur lors du basculement: " + (error.message || "Erreur inconnue") });
    }
  });

  app.post("/api/tds/publish", async (req, res) => {
    const { entity, startWeek, endWeek } = req.body;
    if (entity !== 'MR-TTA') return res.status(400).json({ error: "Seul MR-TTA possède un bac à sable." });
    
    // Helper pour obtenir les dates d'une semaine ISO de manière robuste et indépendante des fuseaux horaires
    const getDatesOfWeek = (year: number, week: number) => {
      // Trouver le premier jeudi de l'année
      const firstDayOfYear = new Date(year, 0, 1);
      firstDayOfYear.setHours(12, 0, 0, 0); // Protéger contre les décalages DST
      const firstDayOfWeek = firstDayOfYear.getDay(); // 0 est Dimanche, 1 est Lundi, ...
      
      // Décalage pour aller au premier jeudi (jour 4)
      const toThursday = (4 - firstDayOfWeek + 7) % 7;
      const firstThursday = new Date(firstDayOfYear);
      firstThursday.setDate(firstDayOfYear.getDate() + toThursday);
      
      // Trouver le jeudi de la semaine demandée
      const targetThursday = new Date(firstThursday);
      targetThursday.setDate(firstThursday.getDate() + (week - 1) * 7);
      
      // Le lundi de cette semaine est 3 jours avant ce jeudi
      const monday = new Date(targetThursday);
      monday.setDate(targetThursday.getDate() - 3);
      
      const days = [];
      for(let i=0; i<7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const yStr = d.getFullYear();
        const mStr = String(d.getMonth() + 1).padStart(2, '0');
        const dStr = String(d.getDate()).padStart(2, '0');
        days.push(`${yStr}-${mStr}-${dStr}`);
      }
      return days;
    };

    const daysMapping: Record<string, number> = {
      'Lundi': 0, 'Mardi': 1, 'Mercredi': 2, 'Jeudi': 3, 'Vendredi': 4, 'Samedi': 5, 'Dimanche': 6
    };

    try {
      await db.exec("BEGIN TRANSACTION");
      
      let sandboxWeekFilter = "";
      let activeDateFilter = "";
      const sandboxParams = [entity];
      const activeParams = [entity];
      
      if (startWeek && endWeek) {
        const swStr = `2026-W${String(startWeek).padStart(2, '0')}`;
        const ewStr = `2026-W${String(endWeek).padStart(2, '0')}`;
        sandboxWeekFilter = " AND t.date >= ? AND t.date <= ?";
        sandboxParams.push(swStr, ewStr);

        const startDates = getDatesOfWeek(2026, startWeek);
        const endDates = getDatesOfWeek(2026, endWeek);
        activeDateFilter = " AND date >= ? AND date <= ?";
        activeParams.push(startDates[0], endDates[6]);
      }

      // 1. Récupérer les entrées sandbox à basculer
      const sandboxEntries = await db.all(`
        SELECT t.*, u.trigram, u.off_day 
        FROM tds_entries t
        JOIN users u ON t.user_id = u.id
        WHERE t.is_sandbox = 1 
        AND u.entity = ?
        ${sandboxWeekFilter}
      `, sandboxParams);

      // 2. Nettoyer les entrées actives actuelles pour cette plage
      await db.run(`
        DELETE FROM tds_entries 
        WHERE is_sandbox = 0 
        AND user_id IN (SELECT id FROM users WHERE entity = ?)
        ${activeDateFilter}
      `, activeParams);

      // 3. Processus de transcription complexe
      for (const entry of sandboxEntries) {
        if (entry.date.includes('-W')) {
          const [year, weekPart] = entry.date.split('-W');
          const weekNum = parseInt(weekPart);
          const weekDates = getDatesOfWeek(parseInt(year), weekNum);
          const offDayIdx = daysMapping[entry.off_day] !== undefined ? daysMapping[entry.off_day] : 4; // Défaut Vendredi

          if (entry.status === 'MS') {
            // MS du lundi au vendredi sauf off_day. WE vides.
            for (let i = 0; i < 7; i++) {
              let status = "";
              if (i < 5) {
                status = (i === offDayIdx) ? "OFF" : "MS";
              }
              if (status || i >= 5) { // On insère même si status vide pour écraser/nettoyer si besoin, ou on skip
                await db.run(
                   "INSERT INTO tds_entries (user_id, date, status, comment, is_sandbox) VALUES (?, ?, ?, ?, 0)",
                  [entry.user_id, weekDates[i], (i < 5 ? status : ""), ""]
                );
              }
            }
          } else if (entry.status === '1') {
            // Cycle 1: Ven, Sam, Dim vides. Contour #4FB6E1 Lun-Jeu. Lun, Mar: MO. Mer, Jeu: MS.
            for (let i = 0; i < 7; i++) {
              let status = "";
              let border = null;
              if (i <= 3) {
                status = (i <= 1) ? "MO" : "MS";
                border = "#4FB6E1";
              }
              await db.run(
                "INSERT INTO tds_entries (user_id, date, status, comment, is_sandbox, border_color) VALUES (?, ?, ?, ?, 0, ?)",
                [entry.user_id, weekDates[i], status, entry.comment || "", border]
              );
            }
          } else if (entry.status === '2') {
            // Cycle 2: Lun vide. Contour #1B6486 Mar-Dim. Mar: MS. Mer, Jeu: MO. Ven: MO+RIT. Sam, Dim: RIT.
            for (let i = 0; i < 7; i++) {
              let status = "";
              let border = null;
              if (i >= 1) {
                border = "#1B6486";
                if (i === 1) status = "MS";
                else if (i === 2 || i === 3) status = "MO";
                else if (i === 4) status = "MO+RIT";
                else status = "RIT";
              }
              await db.run(
                "INSERT INTO tds_entries (user_id, date, status, comment, is_sandbox, border_color) VALUES (?, ?, ?, ?, 0, ?)",
                [entry.user_id, weekDates[i], status, entry.comment || "", border]
              );
            }
          } else if (entry.status === '3') {
            // Cycle 3: Contour #E77E31 Lun-Jeu. Lun-Jeu: MS+RIT. Ven-Dim vides.
            for (let i = 0; i < 7; i++) {
              let status = "";
              let border = null;
              if (i <= 3) {
                status = "MS+RIT";
                border = "#E77E31";
              }
              await db.run(
                "INSERT INTO tds_entries (user_id, date, status, comment, is_sandbox, border_color) VALUES (?, ?, ?, ?, 0, ?)",
                [entry.user_id, weekDates[i], status, entry.comment || "", border]
              );
            }
          } else {
            // Autre statut : On le met partout ? Ou on skip ? 
            // Pour C (Congé par ex), on le met toute la semaine.
            for (let i = 0; i < 7; i++) {
              await db.run(
                "INSERT INTO tds_entries (user_id, date, status, comment, is_sandbox) VALUES (?, ?, ?, ?, 0)",
                [entry.user_id, weekDates[i], entry.status, entry.comment || ""]
              );
            }
          }
        }
      }
      
      await db.exec("COMMIT");
      res.json({ success: true });
    } catch (error: any) {
      await db.exec("ROLLBACK");
      console.error("[PUBLISH ERROR]", error);
      res.status(500).json({ error: "Erreur lors du basculement: " + (error.message || "Erreur inconnue") });
    }
  });

  // HELPER: Création de sauvegarde
  const createBackup = async (isAuto: boolean = false) => {
    try {
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, '0');
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const yyyy = now.getFullYear();
      const hh = String(now.getHours()).padStart(2, '0');
      const min = String(now.getMinutes()).padStart(2, '0');
      
      const timestamp = `${dd}-${mm}-${yyyy}_${hh}-${min}`;
      const prefix = isAuto ? "auto_backup" : "backup";
      const filename = `${prefix}_${timestamp}.db`;
      
      if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
      const backupPath = path.join(backupDir, filename);
      
      await db.run("PRAGMA wal_checkpoint(FULL)");
      fs.copyFileSync(dbPath, backupPath);
      
      console.log(`[BACKUP] Sauvegarde ${isAuto ? 'automatique' : 'manuelle'} réussie: ${filename}`);

      // Nettoyage des sauvegardes de plus d'un mois (30 jours) dans le dossier backups
      try {
        if (fs.existsSync(backupDir)) {
          const files = fs.readdirSync(backupDir);
          const oneMonthAgo = new Date();
          oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
          
          let deletedCount = 0;
          for (const file of files) {
            if (file.endsWith('.db')) {
              const filePath = path.join(backupDir, file);
              const stat = fs.statSync(filePath);
              if (stat.mtime < oneMonthAgo) {
                fs.unlinkSync(filePath);
                console.log(`[BACKUP CLEANUP] Supprimé sauvegarde obsolète (plus de 30 jours) : ${file}`);
                deletedCount++;
              }
            }
          }
          if (deletedCount > 0) {
            console.log(`[BACKUP CLEANUP] Nettoyage terminé : ${deletedCount} sauvegarde(s) supprimée(s).`);
          }
        }
      } catch (cleanupErr: any) {
        console.error("[BACKUP CLEANUP ERROR] Impossible de nettoyer les anciennes sauvegardes:", cleanupErr);
      }

      return { success: true, name: filename };
    } catch (e: any) {
      console.error("[BACKUP ERROR] Échec de la sauvegarde:", e);
      return { success: false, error: e.message };
    }
  };

  // Planification des sauvegardes automatiques (00:00 et 12:00 locale)
  cron.schedule('0 0 * * *', () => {
    console.log("[CRON] Déclenchement sauvegarde automatique de minuit (00:00)");
    createBackup(true);
  }, {
    timezone: "Pacific/Noumea" // On suppose que l'utilisateur veut l'heure locale de NC
  });

  cron.schedule('0 12 * * *', () => {
    console.log("[CRON] Déclenchement sauvegarde automatique de midi (12:00)");
    createBackup(true);
  }, {
    timezone: "Pacific/Noumea"
  });

  // Vérification quotidienne des échéances des titres (exécuté à 4h60 -> 04:00 heure locale de NC)
  cron.schedule('0 4 * * *', () => {
    console.log("[CRON] Déclenchement de la vérification quotidienne des alertes d'échéance de titres (04:00)");
    checkAndTriggerAllTitleAlerts(db).catch(e => console.error("[CRON TITLE CHECK ERROR]", e));
  }, {
    timezone: "Pacific/Noumea"
  });

  // GESTION DES VALIDATIONS TDS
  app.get("/api/validations", async (req, res) => {
    const { week_str } = req.query;
    try {
      if (week_str) {
        const validations = await db.all("SELECT * FROM tds_validations WHERE week_str = ?", [week_str]);
        res.json(validations);
      } else {
        const validations = await db.all("SELECT * FROM tds_validations");
        res.json(validations);
      }
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/tds/validate", async (req, res) => {
    const { entity, week_str, role, validator_trigram } = req.body;
    const now = new Date();
    const dateStr = now.toLocaleDateString('fr-FR');
    const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const isoDate = now.toISOString();
    
    try {
      const validator = await db.get("SELECT firstname, lastname, profil FROM users WHERE trigram = ?", [validator_trigram]);
      const signature = validator 
        ? `Validé par ${validator.firstname} ${validator.lastname.toUpperCase()}, ${validator.profil || role} le ${dateStr} à ${timeStr}`
        : `Validé par ${validator_trigram} le ${dateStr} à ${timeStr}`;

      let validation = await db.get("SELECT * FROM tds_validations WHERE entity = ? AND week_str = ?", [entity, week_str]);
      
      if (!validation) {
        await db.run("INSERT INTO tds_validations (entity, week_str) VALUES (?, ?)", [entity, week_str]);
        validation = await db.get("SELECT * FROM tds_validations WHERE entity = ? AND week_str = ?", [entity, week_str]);
      }
      
      if (role === 'MR') {
        await db.run("UPDATE tds_validations SET mr_chef_validated = 1, mr_validation_date = ?, mr_signature = ? WHERE id = ?", [isoDate, signature, validation.id]);
        
        // Notification au Chef DT
        const dtChefs = await db.all("SELECT email, firstname FROM users WHERE profil = 'Chef DT'");
        for (const chef of dtChefs) {
          const email = chef.email || "chef-dt@aviation-civile.gouv.fr";
          const subject = `Notification: Validation MR effectuée - ${entity} - Semaine ${week_str}`;
          const text = `Bonjour ${chef.firstname},\n\nLe Chef MR de l'entité ${entity} vient de valider le tableau de service pour la semaine ${week_str.split('-W')[1]}.\n\nSignature: ${signature}\n\nVotre validation finale est maintenant attendue sur l'application TDS DT.\n\nCordialement,\nSystème TDS-DT`;
          const htmlContent = buildEmailTemplate(
            "Validation MR Effectuée",
            `Bonjour ${chef.firstname},`,
            `Le Chef MR de l'entité <strong>${entity}</strong> vient de valider le tableau de service pour la <strong>semaine ${week_str.split('-W')[1]}</strong>.<br><br>
             <strong>Signature :</strong> ${signature}<br><br>
             Votre validation finale en tant que Chef DT est désormais attendue.`,
            "/#/dashboard",
            "Accéder au Tableau de Service"
          );
          
          sendUnifiedEmail(email, subject, text, false, htmlContent).catch(e => console.error("[NOTIF DT ERROR]", e));
        }
      } else if (role === 'DT') {
        await db.run("UPDATE tds_validations SET dt_chef_validated = 1, dt_validation_date = ?, dt_signature = ? WHERE id = ?", [isoDate, signature, validation.id]);
      }
      
      const updated = await db.get("SELECT * FROM tds_validations WHERE id = ?", [validation.id]);
      
      // Si validé par les deux
      if (updated.mr_chef_validated && updated.dt_chef_validated) {
        console.log(`[VALIDATION] Validation complète pour ${entity} - Semaine ${week_str}.`);
        
        const subject = `Validation FINALE du TDS - ${entity} - Semaine ${week_str}`;
        const text = `Bonjour,\n\nLe tableau de service pour l'entité ${entity} (Semaine ${week_str.split('-W')[1]}) a été validé par le chef MR et le chef DT.\n\nSignatures:\n- MR: ${updated.mr_signature}\n- DT: ${updated.dt_signature}\n\nIl est maintenant disponible en consultation officielle.\n\nCordialement,\nSystème TDS-DT`;
        const htmlContent = buildEmailTemplate(
          "Validation Finale de la Semaine",
          `Bonjour,`,
          `Le tableau de service pour l'entité <strong>${entity}</strong> (<strong>Semaine ${week_str.split('-W')[1]}</strong>) a été validé par le chef MR et le chef DT.<br><br>
           Le document officiel est désormais disponible en consultation.<br><br>
           <strong>Signatures :</strong><br>
           - MR : ${updated.mr_signature}<br>
           - DT : ${updated.dt_signature}`,
          "/#/dashboard",
          "Consulter le TDS"
        );
        
        // Notification au secrétariat
        try {
          await sendUnifiedEmail(
            "seac-nc.sna-nc.sec-tous-ld@aviation-civile.gouv.fr",
            subject,
            text,
            false,
            htmlContent
          );
          console.log(`[MAIL] Email envoyé au secrétariat pour la validation de ${entity} W${week_str}`);
        } catch (mailErr) {
          console.error("[MAIL ERROR] Échec de l'envoi de mail au secrétariat", mailErr);
        }
      }
      
      res.json({ success: true, validation: updated });
    } catch (e: any) {
      console.error("[VALIDATE ERROR]", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/tds/unvalidate", async (req, res) => {
    const { entity, week_str, role } = req.body;
    try {
      if (role === 'MR') {
        await db.run(
          "UPDATE tds_validations SET mr_chef_validated = 0, mr_validation_date = NULL, mr_signature = NULL WHERE entity = ? AND week_str = ?",
          [entity, week_str]
        );
      } else if (role === 'DT') {
        await db.run(
          "UPDATE tds_validations SET dt_chef_validated = 0, dt_validation_date = NULL, dt_signature = NULL WHERE entity = ? AND week_str = ?",
          [entity, week_str]
        );
      }
      res.json({ success: true });
    } catch (e: any) {
      console.error("[UNVALIDATE ERROR]", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/tds/notify-validation", async (req, res) => {
    const { entity, week_str, initiator_trigram } = req.body;
    try {
      const initiator = await db.get("SELECT firstname, lastname FROM users WHERE trigram = ?", [initiator_trigram]);
      const mrChefs = await db.all("SELECT email, firstname FROM users WHERE role = 'admin' AND entity = ?", [entity]);
      
      for (const chef of mrChefs) {
        const email = chef.email || `${chef.firstname.toLowerCase()}@aviation-civile.gouv.fr`;
        const weekNum = week_str.split('-W')[1];
        const subject = `Action requise: Validation TDS ${entity} - Semaine ${weekNum}`;
        const text = `Bonjour ${chef.firstname},\n\nLe secrétariat (${initiator ? initiator.firstname + ' ' + initiator.lastname : initiator_trigram}) vous informe que le tableau de service pour l'entité ${entity} (Semaine ${weekNum}) est prêt pour votre validation.\n\nVeuillez vous connecter sur l'application TDS DT pour effectuer la validation hebdomadaire.\n\nCordialement,\nL'équipe DAC-NC/SNA/DT`;
        const htmlContent = buildEmailTemplate(
          "Action Requise : Validation TDS",
          `Bonjour ${chef.firstname},`,
          `Le secrétariat (${initiator ? initiator.firstname + ' ' + initiator.lastname : initiator_trigram}) vous informe que le tableau de service pour l'entité <strong>${entity}</strong> (<strong>Semaine ${weekNum}</strong>) est prêt pour votre validation.<br><br>
           Votre validation hebdomadaire est attendue dans l'application.`,
          "/#/dashboard",
          "Valider le TDS"
        );
        
        sendUnifiedEmail(email, subject, text, false, htmlContent).catch(e => console.error("[NOTIF MR ERROR]", e));
      }
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/leaves/:id", async (req, res) => {
    const { id } = req.params;
    const { status, start_date, end_date, type } = req.body;
    try {
      const existing = await db.get("SELECT * FROM leave_requests WHERE id = ?", [id]);
      if (!existing) return res.status(404).json({ error: "Congé non trouvé" });

      const updates: string[] = [];
      const params: any[] = [];

      if (status) {
        updates.push("status = ?");
        params.push(status);
      }
      if (start_date) {
        updates.push("start_date = ?");
        params.push(start_date);
      }
      if (end_date) {
        updates.push("end_date = ?");
        params.push(end_date);
      }
      if (type) {
        updates.push("type = ?");
        params.push(type);
      }

      if (updates.length > 0) {
        params.push(id);
        await db.run(`UPDATE leave_requests SET ${updates.join(", ")} WHERE id = ?`, params);
      }

      // Notification email lors du changement de statut (workflow approbation/refus paramétrable)
      if (status && status !== existing.status) {
        const agent = await db.get("SELECT * FROM users WHERE id = ?", [existing.user_id]);
        if (agent) {
          let eventType: 'approved_chef' | 'approved_dt' | 'rejected' | null = null;
          if (status === 'approved_chef') eventType = 'approved_chef';
          else if (status === 'approved_dt') eventType = 'approved_dt';
          else if (status === 'rejected') eventType = 'rejected';

          if (eventType) {
            dispatchWorkflowEmail(db, eventType, agent, existing)
              .catch(e => console.error("[WORKFLOW EMAIL DISPATCH ERROR]", e));
          }
        }
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de la mise à jour du congé." });
    }
  });

  app.delete("/api/leaves/:id", async (req, res) => {
    const { id } = req.params;
    try {
      await db.run("DELETE FROM leave_requests WHERE id = ?", [id]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de la suppression du congé." });
    }
  });

  app.post("/api/users", async (req, res) => {
    const { 
      trigram, 
      password, 
      firstname, 
      lastname, 
      role, 
      entity,
      email,
      mobile_num,
      professional_num,
      address,
      comment,
      olaf_link,
      birth_date,
      corps,
      profil,
      licence_num,
      ae_issue_date,
      ae_expiry_date,
      he_expiry_date,
      he_training_date,
      safety_badge_num,
      safety_badge_expiry_date,
      zcp_expiry_date,
      english_test_date,
      english_level,
      english_next_test_date,
      display_order,
      off_day,
      tlt_day
    } = req.body;
    try {
      const formattedEmail = getFormattedEmail(email, firstname, lastname);
      await db.run(`
        INSERT INTO users (
          trigram, password, firstname, lastname, role, entity, email, mobile_num, professional_num, address, comment,
          olaf_link, birth_date, corps, profil, licence_num, ae_issue_date, ae_expiry_date, he_expiry_date, he_training_date,
          safety_badge_num, safety_badge_expiry_date, zcp_expiry_date, english_test_date, english_level, english_next_test_date,
          display_order, off_day, tlt_day
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        trigram, password, firstname, lastname, role, entity, formattedEmail, mobile_num, professional_num, address, comment,
        olaf_link, birth_date, corps, profil, licence_num, ae_issue_date, ae_expiry_date, he_expiry_date, he_training_date,
        safety_badge_num, safety_badge_expiry_date, zcp_expiry_date, english_test_date, english_level, english_next_test_date,
        display_order || 0, off_day || 'Vendredi', tlt_day || 'Aucun'
      ]);
      checkAndTriggerAllTitleAlerts(db).catch(e => console.error("[POST USER TITLE CHECK ERROR]", e));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de la création de l'utilisateur." });
    }
  });

  app.patch("/api/users/:id", async (req, res) => {
    const { id } = req.params;
    const { 
      firstname, 
      lastname, 
      email, 
      mobile_num, 
      professional_num, 
      address, 
      comment, 
      password, 
      first_login,
      trigram,
      role,
      entity,
      olaf_link,
      birth_date,
      corps,
      profil,
      licence_num,
      ae_issue_date,
      ae_expiry_date,
      he_expiry_date,
      he_training_date,
      safety_badge_num,
      safety_badge_expiry_date,
      zcp_expiry_date,
      english_test_date,
      english_level,
      english_next_test_date,
      display_order,
      off_day,
      tlt_day
    } = req.body;
    try {
      const sets = [];
      const params = [];
      if (firstname) { sets.push("firstname = ?"); params.push(firstname); }
      if (lastname) { sets.push("lastname = ?"); params.push(lastname); }
      if (email !== undefined) { sets.push("email = ?"); params.push(getFormattedEmail(email, firstname || '', lastname || '')); }
      if (mobile_num) { sets.push("mobile_num = ?"); params.push(mobile_num); }
      if (professional_num) { sets.push("professional_num = ?"); params.push(professional_num); }
      if (address) { sets.push("address = ?"); params.push(address); }
      if (comment) { sets.push("comment = ?"); params.push(comment); }
      if (password) { sets.push("password = ?"); params.push(password); }
      if (first_login !== undefined) { sets.push("first_login = ?"); params.push(first_login); }
      if (trigram) { sets.push("trigram = ?"); params.push(trigram); }
      if (role) { sets.push("role = ?"); params.push(role); }
      if (entity) { sets.push("entity = ?"); params.push(entity); }
      if (olaf_link !== undefined) { sets.push("olaf_link = ?"); params.push(olaf_link); }
      if (birth_date !== undefined) { sets.push("birth_date = ?"); params.push(birth_date); }
      if (corps !== undefined) { sets.push("corps = ?"); params.push(corps); }
      if (profil !== undefined) { sets.push("profil = ?"); params.push(profil); }
      if (licence_num !== undefined) { sets.push("licence_num = ?"); params.push(licence_num); }
      if (ae_issue_date !== undefined) { sets.push("ae_issue_date = ?"); params.push(ae_issue_date); }
      if (ae_expiry_date !== undefined) { sets.push("ae_expiry_date = ?"); params.push(ae_expiry_date); }
      if (he_expiry_date !== undefined) { sets.push("he_expiry_date = ?"); params.push(he_expiry_date); }
      if (he_training_date !== undefined) { sets.push("he_training_date = ?"); params.push(he_training_date); }
      if (safety_badge_num !== undefined) { sets.push("safety_badge_num = ?"); params.push(safety_badge_num); }
      if (safety_badge_expiry_date !== undefined) { sets.push("safety_badge_expiry_date = ?"); params.push(safety_badge_expiry_date); }
      if (zcp_expiry_date !== undefined) { sets.push("zcp_expiry_date = ?"); params.push(zcp_expiry_date); }
      if (english_test_date !== undefined) { sets.push("english_test_date = ?"); params.push(english_test_date); }
      if (english_level !== undefined) { sets.push("english_level = ?"); params.push(english_level); }
      if (english_next_test_date !== undefined) { sets.push("english_next_test_date = ?"); params.push(english_next_test_date); }
      if (display_order !== undefined) { sets.push("display_order = ?"); params.push(display_order); }
      if (off_day !== undefined) { sets.push("off_day = ?"); params.push(off_day); }
      if (tlt_day !== undefined) { sets.push("tlt_day = ?"); params.push(tlt_day); }
      
      if (sets.length > 0) {
        params.push(id);
        await db.run(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`, params);
      }
      checkAndTriggerAllTitleAlerts(db).catch(e => console.error("[PATCH USER TITLE CHECK ERROR]", e));
      const updatedUser = await db.get("SELECT * FROM users WHERE id = ?", [id]);
      res.json({ success: true, user: updatedUser });
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de la mise à jour de l'utilisateur." });
    }
  });

  app.post("/api/users/reorder", async (req, res) => {
    const { orders } = req.body; // Array of { id: number, display_order: number }
    try {
      await db.exec("BEGIN TRANSACTION");
      for (const item of orders) {
        await db.run("UPDATE users SET display_order = ? WHERE id = ?", [item.display_order, item.id]);
      }
      await db.exec("COMMIT");
      res.json({ success: true });
    } catch (error) {
      await db.exec("ROLLBACK");
      res.status(500).json({ error: "Erreur lors du réordonnancement." });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    const { id } = req.params;
    try {
      // Delete entries first (foreign key constraints)
      await db.run("DELETE FROM tds_entries WHERE user_id = ?", [id]);
      await db.run("DELETE FROM leave_requests WHERE user_id = ?", [id]);
      await db.run("DELETE FROM users WHERE id = ?", [id]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de la suppression de l'utilisateur." });
    }
  });

  app.post("/api/admin/seed-sandbox", async (req, res) => {
    const sandboxData: Record<string, Record<number, string>> = {
      "CRZ": { 
        2: "S", 3: "W", 15: "S", 16: "W", 21: "C", 22: "C",
        27: "MS", 28: "MS", 29: "MS", 30: "MS", 31: "MS", 32: "MS", 33: "MS", 34: "MS", 35: "MS", 36: "MS", 37: "MS",
        38: "2", 39: "3", 40: "C", 41: "C", 42: "MS", 43: "MS", 44: "MS", 45: "MS", 46: "MS", 47: "MS", 48: "MS", 49: "MS", 50: "MS",
        51: "2", 52: "3", 53: "MS"
      },
      "MTP": {
        6: "S", 7: "W", 11: "S", 12: "W", 16: "C", 17: "C", 19: "C", 20: "C", 21: "C", 22: "C", 23: "C",
        27: "MS", 28: "MS", 29: "MS", 30: "MS", 31: "MS", 32: "MS", 33: "MS", 34: "MS", 35: "1", 36: "2", 37: "3", 38: "C", 39: "C",
        40: "MS", 41: "MS", 42: "MS", 43: "MS", 44: "MS", 45: "MS", 46: "MS", 47: "1", 48: "2", 49: "3", 50: "MS", 51: "MS", 52: "MS", 53: "MS"
      },
      "DFS": {
        4: "S", 5: "W", 10: "F", 11: "F", 14: "S", 15: "W", 19: "C", 20: "C", 21: "C", 22: "S", 23: "W", 24: "C", 25: "C",
        27: "MS", 28: "MS", 29: "MS", 30: "1", 31: "2", 32: "3", 33: "MS", 34: "MS", 35: "MS", 36: "1", 37: "2", 38: "3", 39: "C", 40: "C", 41: "C", 42: "C",
        43: "MS", 44: "MS", 45: "MS", 46: "1", 47: "2", 48: "3", 49: "MS", 50: "MS", 51: "MS", 52: "MS", 53: "MS"
      },
      "CLM": {
        8: "C", 9: "C", 10: "C", 11: "C", 12: "C", 13: "C", 14: "C", 15: "C", 16: "C", 20: "S", 21: "W", 24: "S", 25: "W",
        27: "1", 28: "2", 29: "3", 30: "MS", 31: "MS", 32: "MS", 33: "1", 34: "2", 35: "3", 36: "MS", 37: "MS", 38: "MS", 39: "1", 40: "2", 41: "3", 42: "MS", 43: "MS", 44: "MS", 45: "F", 46: "C", 47: "C", 48: "C", 49: "C", 50: "C",
        51: "1", 52: "2", 53: "3"
      },
      "LCU": {
        12: "S", 13: "W", 16: "C", 17: "C", 18: "S", 19: "W", 20: "C", 21: "F", 22: "C", 23: "C", 24: "C", 25: "C", 26: "C",
        27: "2", 28: "3", 29: "MS", 30: "MS", 31: "MS", 32: "1", 33: "2", 34: "3", 35: "MS", 36: "MS", 37: "MS", 38: "1", 39: "2", 40: "3", 41: "MS", 42: "MS", 43: "MS", 44: "1", 45: "2", 46: "3", 47: "C", 48: "C", 49: "C",
        50: "MS", 51: "MS", 52: "MS", 53: "MS"
      },
      "GVR": {
        8: "S", 9: "W", 17: "C", 18: "C", 19: "C", 20: "C", 21: "C",
        27: "3", 28: "MS", 29: "MS", 30: "MS", 31: "1", 32: "2", 33: "3", 34: "MS", 35: "MS", 36: "MS", 37: "1", 38: "2", 39: "3", 40: "MS", 41: "MS", 42: "MS", 43: "1", 44: "2", 45: "3", 46: "MS", 47: "MS", 48: "MS", 49: "1", 50: "2", 51: "3", 52: "MS", 53: "MS"
      },
      "TXR": {
        1: "S", 2: "W", 5: "S", 6: "W", 13: "S", 14: "W", 16: "C", 17: "C", 18: "C", 19: "C", 20: "C", 22: "S", 23: "W", 26: "F",
        27: "C", 28: "1", 29: "2", 30: "3", 31: "MS", 32: "MS", 33: "MS", 34: "1", 35: "2", 36: "3", 37: "MS", 38: "MS", 39: "MS", 40: "1", 41: "2", 42: "3", 43: "MS", 44: "MS", 45: "MS", 46: "1", 47: "2", 48: "3", 49: "C", 50: "C", 51: "C", 52: "C", 53: "C"
      },
      "LPE": {
        3: "S", 4: "W", 7: "S", 8: "W", 10: "S", 11: "W", 13: "C", 17: "S", 18: "W", 21: "S", 22: "W", 25: "S", 26: "W",
        27: "C", 28: "C", 29: "1", 30: "2", 31: "3", 32: "MS", 33: "MS", 34: "MS", 35: "1", 36: "2", 37: "3", 38: "MS", 39: "MS", 40: "MS", 41: "1", 42: "2", 43: "3", 44: "MS", 45: "MS", 46: "MS", 47: "1", 48: "2", 49: "3", 50: "MS", 51: "C", 52: "F", 53: "C"
      }
    };

    try {
      await db.exec("BEGIN TRANSACTION");
      const year = 2026;
      
      // Nettoyer les entrées sandbox MR-TTA existantes pour 2026
      await db.run("DELETE FROM tds_entries WHERE is_sandbox = 1 AND date LIKE '2026%'");

      for (const [trigram, weeks] of Object.entries(sandboxData)) {
        const user = await db.get("SELECT id FROM users WHERE trigram = ?", trigram);
        if (user) {
          for (const [weekNum, status] of Object.entries(weeks)) {
            const dateStr = `${year}-W${String(weekNum).padStart(2, '0')}`;
            await db.run(
              "INSERT INTO tds_entries (user_id, date, status, comment, is_sandbox) VALUES (?, ?, ?, ?, ?)",
              [user.id, dateStr, status, '', 1]
            );
          }
        }
      }
      await db.exec("COMMIT");
      res.json({ success: true, message: "Bac à Sable re-peuplé avec succès" });
    } catch (error) {
      await db.exec("ROLLBACK");
      res.status(500).json({ error: "Erreur lors du peuplement du Bac à Sable." });
    }
  });

  app.post("/api/admin/fix-shift-date", async (req, res) => {
    try {
      console.log("[FIX SHIFT DATE] Starting shift-correction process for MR-TTA active entries...");
      
      const result = await db.run(`
        UPDATE tds_entries 
        SET date = date(date, '+1 day') 
        WHERE is_sandbox = 0 
        AND date >= '2026-01-01'
        AND user_id IN (SELECT id FROM users WHERE entity = 'MR-TTA')
      `);
      
      console.log(`[FIX SHIFT DATE] Shift-correction completed. Rows modified: ${result.changes}`);
      res.json({ success: true, message: `Décalage corrigé (Avancement d'1 jour effectué sur ${result.changes} entrées).` });
    } catch (error: any) {
      console.error("[FIX SHIFT DATE ERROR]", error);
      res.status(500).json({ error: "Erreur lors de la correction du décalage: " + (error.message || "Erreur inconnue") });
    }
  });

  app.post("/api/admin/test-email", async (req, res) => {
    const { action, to, subject, body, workflowType, agentId, leaveType, startDate, endDate } = req.body;
    
    try {
      if (action === 'test_connection') {
        const testTransporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_PORT === '465',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
          tls: {
            rejectUnauthorized: false,
            minVersion: "TLSv1.2",
            servername: process.env.SMTP_HOST
          },
          connectionTimeout: 10000
        });
        await testTransporter.verify();
        return res.json({ success: true, message: "Connexion SMTP établie et vérifiée avec succès !" });
      }
      
      if (action === 'send_raw') {
        if (!to || !subject || !body) {
          return res.status(400).json({ error: "Champs to, subject, body obligatoires pour un test brut." });
        }
        const result = await sendUnifiedEmail(to, subject, body);
        if (result.error) {
          return res.status(500).json({ error: result.error, details: result.details });
        }
        return res.json({ success: true, message: `Email de test brut envoyé avec succès via ${result.provider}. Destinataire effectif : ${getActualRecipient(to)}`, details: result });
      }
      
      if (action === 'trigger_leave_workflow') {
        if (!agentId || !workflowType) {
          return res.status(400).json({ error: "Agent et type de workflow de simulation obligatoires." });
        }
        
        const agent = await db.get("SELECT * FROM users WHERE id = ?", [agentId]);
        if (!agent) {
          return res.status(404).json({ error: "Agent non trouvé en base." });
        }
        
        const typeStr = leaveType || "CA";
        const startStr = startDate || new Date().toISOString().split('T')[0];
        const endStr = endDate || new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0];
        
        const agentEmail = agent.email || `${agent.firstname.toLowerCase()}@aviation-civile.gouv.fr`;
        const logEntries: string[] = [];
        
        if (workflowType === 'request') {
          // Demande de congés - Mail vers le N+1 (Admins de l'entité ou du Siège)
          let admins: any[] = [];
          if (agent.entity === 'Siège') {
            admins = await db.all("SELECT email, firstname FROM users WHERE role = 'admin' AND entity = 'Siège'");
          } else if (agent.role === 'admin') {
            admins = await db.all("SELECT email, firstname FROM users WHERE role = 'admin' AND entity = 'Siège'");
          } else {
            admins = await db.all("SELECT email, firstname FROM users WHERE role = 'admin' AND entity = ?", [agent.entity]);
          }
          if (admins.length === 0) {
            logEntries.push("Aucun admin N+1 identifié en base pour cette simulation.");
          }
          
          for (const admin of admins) {
            const adminEmail = admin.email || `${admin.firstname.toLowerCase()}@aviation-civile.gouv.fr`;
            const subject = `[SIMULATION] Nouvelle demande de ${typeStr} - ${agent.trigram}`;
            const text = `Bonjour (Simulé),\n\nUne nouvelle demande de ${typeStr} a été déposée par ${agent.firstname} ${agent.lastname} (${agent.trigram}) du ${new Date(startStr).toLocaleDateString('fr-FR')} au ${new Date(endStr).toLocaleDateString('fr-FR')}.\n\nVeuillez vous connecter à l'application TDS DT pour la traiter.\n\nCordialement,\nL'équipe DAC-NC/SNA/DT`;
            const htmlSimulation = buildEmailTemplate(
              "[SIMULATION] Nouvelle Demande de Congé",
              `Bonjour ${admin.firstname} [Simulé],`,
              `Une nouvelle demande de <strong>${typeStr}</strong> a été déposée par l'agent <strong>${agent.firstname} ${agent.lastname}</strong> (${agent.trigram}).<br><br>
               <strong>Période :</strong> du ${new Date(startStr).toLocaleDateString('fr-FR')} au ${new Date(endStr).toLocaleDateString('fr-FR')}.`,
              "/#/leaves",
              "Traiter la demande"
            );
            
            const resNotif = await sendUnifiedEmail(adminEmail, subject, text, false, htmlSimulation);
            logEntries.push(`Mail envoyé au N+1 Admin (${admin.firstname} - ${adminEmail}) : ${resNotif.success ? 'Succès via ' + resNotif.provider : 'Échec (' + (resNotif.error || 'Erreur SMTP') + ')'}`);
          }
          
          return res.json({ success: true, message: "Workflow de Demande (N+1) simulé avec succès.", logs: logEntries });
        }
        
        if (workflowType === 'approved_chef') {
          // Validation Chef d'Entité - Mail à l'agent + N+2 (Admins Siège) si applicable
          const subject = `[SIMULATION] [TDS DT] Validation intermédiaire de votre demande de congé - Chef d'Entité`;
          const text = `Bonjour (Simulé) ${agent.firstname},\n\nVotre demande de ${typeStr} du ${new Date(startStr).toLocaleDateString('fr-FR')} au ${new Date(endStr).toLocaleDateString('fr-FR')} a été validée par votre Chef d'Entité (N+1).\n\nElle est en attente de la validation finale par la Direction Technique (N+2).\n\nCordialement,\nL'équipe DAC-NC/SNA/DT`;
          const htmlAgent = buildEmailTemplate(
            "[SIMULATION] Validation Intermédiaire N+1",
            `Bonjour ${agent.firstname} [Simulé],`,
            `Votre demande de <strong>${typeStr}</strong> du ${new Date(startStr).toLocaleDateString('fr-FR')} au ${new Date(endStr).toLocaleDateString('fr-FR')} a été <strong>validée par votre Chef d'Entité (N+1)</strong>.<br><br>
             Elle est dorénavant en attente de la validation finale par la Direction Technique (N+2).`,
            "/#/leaves",
            "Consulter mon statut"
          );
          
          const resNotif = await sendUnifiedEmail(agentEmail, subject, text, false, htmlAgent);
          logEntries.push(`Mail envoyé à l'agent (${agent.firstname} - ${agentEmail}) : ${resNotif.success ? 'Succès via ' + resNotif.provider : 'Échec (' + (resNotif.error || 'Erreur SMTP') + ')'}`);
          
          if (agent.entity !== 'Siège') {
            const hqAdmins = await db.all("SELECT email, firstname FROM users WHERE role = 'admin' AND entity = 'Siège'");
            if (hqAdmins.length === 0) {
              logEntries.push("Aucun admin N+2 (Siège) identifié.");
            }
            for (const admin of hqAdmins) {
              const adminEmail = admin.email || `${admin.firstname.toLowerCase()}@aviation-civile.gouv.fr`;
              const subjectN2 = `[SIMULATION] [TDS DT] Validation requise N+2 - Demande de congé de ${agent.trigram}`;
              const textN2 = `Bonjour (Simulé),\n\nLa demande de ${typeStr} déposée par ${agent.firstname} ${agent.lastname} (${agent.trigram}) du ${new Date(startStr).toLocaleDateString('fr-FR')} au ${new Date(endStr).toLocaleDateString('fr-FR')} a été validée par son Chef d'Entité (N+1).\n\nVotre validation finale en tant que N+2 est désormais requise sur l'application TDS DT.\n\nCordialement,\nL'équipe DAC-NC/SNA/DT`;
              const htmlN2 = buildEmailTemplate(
                "[SIMULATION] Validation Requise N+2",
                `Bonjour ${admin.firstname} [Simulé],`,
                `La demande de <strong>${typeStr}</strong> de l'agent <strong>${agent.firstname} ${agent.lastname}</strong> (${agent.trigram}) du ${new Date(startStr).toLocaleDateString('fr-FR')} au ${new Date(endStr).toLocaleDateString('fr-FR')} a été validée par son Chef d'Entité (N+1).<br><br>
                 Votre <strong>validation finale (N+2)</strong> est désormais attendue dans l'application.`,
                "/#/leaves",
                "Valider la demande"
              );
              
              const resNotif2 = await sendUnifiedEmail(adminEmail, subjectN2, textN2, false, htmlN2);
              logEntries.push(`Mail envoyé au N+2 Admin (${admin.firstname} - ${adminEmail}) : ${resNotif2.success ? 'Succès via ' + resNotif2.provider : 'Échec (' + (resNotif2.error || 'Erreur SMTP') + ')'}`);
            }
          } else {
            logEntries.push("Agent de l'entité Siège : Pas de validation N+2 distincte requise.");
          }
          
          return res.json({ success: true, message: "Workflow d'Acceptation N+1 simulé avec succès.", logs: logEntries });
        }
        
        if (workflowType === 'approved_dt') {
          // Validation Finale DT
          const subject = `[SIMULATION] [TDS DT] Validation de votre demande de congé`;
          const text = `Bonjour (Simulé) ${agent.firstname},\n\nVotre demande de ${typeStr} du ${new Date(startStr).toLocaleDateString('fr-FR')} au ${new Date(endStr).toLocaleDateString('fr-FR')} a été validée définitivement par le Chef DT (N+2).\n\nLe planning a été mis à jour.\n\nCordialement,\nL'équipe DAC-NC/SNA/DT`;
          const htmlAgent = buildEmailTemplate(
            "[SIMULATION] Demande de Congé Validée",
            `Bonjour ${agent.firstname} [Simulé],`,
            `Votre demande de <strong>${typeStr}</strong> du ${new Date(startStr).toLocaleDateString('fr-FR')} au ${new Date(endStr).toLocaleDateString('fr-FR')} a été <strong>validée définitivement</strong> par la Direction Technique (N+2).<br><br>
             Le planning du Tableau de Service (TDS) a été mis à jour en conséquence.`,
            "/#/leaves",
            "Consulter mes congés"
          );
          
          const resNotif = await sendUnifiedEmail(agentEmail, subject, text, false, htmlAgent);
          logEntries.push(`Mail envoyé à l'agent (${agent.firstname} - ${agentEmail}) : ${resNotif.success ? 'Succès via ' + resNotif.provider : 'Échec (' + (resNotif.error || 'Erreur SMTP') + ')'}`);
          
          return res.json({ success: true, message: "Workflow d'Acceptation DT (N+2) simulé avec succès.", logs: logEntries });
        }
        
        if (workflowType === 'rejected') {
          // Refus
          const subject = `[SIMULATION] [TDS DT] Demande de congé refusée`;
          const text = `Bonjour (Simulé) ${agent.firstname},\n\nVotre demande de ${typeStr} du ${new Date(startStr).toLocaleDateString('fr-FR')} au ${new Date(endStr).toLocaleDateString('fr-FR')} a été refusée par votre responsable.\n\nPour toute précision, veuillez vous rapprocher d'elle/de lui.\n\nCordialement,\nL'équipe DAC-NC/SNA/DT`;
          const htmlAgent = buildEmailTemplate(
            "[SIMULATION] Demande de Congé Refusée",
            `Bonjour ${agent.firstname} [Simulé],`,
            `Votre demande de <strong>${typeStr}</strong> du ${new Date(startStr).toLocaleDateString('fr-FR')} au ${new Date(endStr).toLocaleDateString('fr-FR')} a été <strong>refusée</strong>.<br><br>
             Pour plus de détails, nous vous invitons à vous rapprocher de votre responsable d'entité.`,
            "/#/leaves",
            "Consulter l'application"
          );
          
          const resNotif = await sendUnifiedEmail(agentEmail, subject, text, false, htmlAgent);
          logEntries.push(`Mail envoyé à l'agent (${agent.firstname} - ${agentEmail}) : ${resNotif.success ? 'Succès via ' + resNotif.provider : 'Échec (' + (resNotif.error || 'Erreur SMTP') + ')'}`);
          
          return res.json({ success: true, message: "Workflow de Refus simulé avec succès.", logs: logEntries });
        }
        
        return res.status(400).json({ error: "Type de workflow de simulation invalide." });
      }
      
      return res.status(400).json({ error: "Action non supportée." });
    } catch (err: any) {
      console.error("[TEST EMAIL ENDPOINT ERROR]", err);
      return res.status(500).json({ error: err.message || "Erreur interne de traitement." });
    }
  });

  // GESTION DU MANUEL UTILISATEUR
  app.get("/api/help/manual/status", async (req, res) => {
    try {
      const manualPath = path.resolve(process.cwd(), "user_manual.pdf");
      if (fs.existsSync(manualPath)) {
        const stats = fs.statSync(manualPath);
        return res.json({
          exists: true,
          size: stats.size,
          lastModified: stats.mtime.toISOString(),
        });
      }
      return res.json({ exists: false });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/help/manual", async (req, res) => {
    try {
      const manualPath = path.resolve(process.cwd(), "user_manual.pdf");
      if (!fs.existsSync(manualPath)) {
        return res.status(404).send("Manuel utilisateur introuvable.");
      }
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "attachment; filename=\"manuel_utilisateur.pdf\"");
      return res.sendFile(manualPath);
    } catch (e: any) {
      return res.status(500).send(e.message);
    }
  });

  app.post("/api/help/manual/chunk", express.raw({ type: () => true, limit: "5mb" }), async (req, res) => {
    try {
      const trigram = req.headers['x-user-trigram'];
      const chunkIndex = parseInt(req.headers['x-chunk-index'] as string, 10);
      const totalChunks = parseInt(req.headers['x-total-chunks'] as string, 10);
      const uploadId = req.headers['x-upload-id'] as string;

      if (!trigram) {
        return res.status(401).json({ error: "Authentification requise." });
      }
      const user = await db.get("SELECT role FROM users WHERE trigram = ?", [trigram]);
      if (!user) {
        return res.status(403).json({ error: "Accès refusé : Utilisateur introuvable." });
      }
      if (user.role !== 'admin') {
        return res.status(403).json({ error: "Accès refusé : Droits administrateur requis." });
      }

      if (isNaN(chunkIndex) || isNaN(totalChunks) || !uploadId) {
        return res.status(400).json({ error: "En-têtes de découpage (chunks) manquants ou invalides." });
      }

      if (!req.body || !Buffer.isBuffer(req.body) || req.body.length === 0) {
        return res.status(400).json({ error: "Contenu du bloc vide." });
      }

      // Create temporary directory for chunks
      const tempDir = path.resolve(process.cwd(), "temp_uploads", uploadId);
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const chunkPath = path.join(tempDir, `chunk_${chunkIndex}`);
      fs.writeFileSync(chunkPath, req.body);

      // Check if all chunks are uploaded
      let allChunksUploaded = true;
      for (let i = 0; i < totalChunks; i++) {
        if (!fs.existsSync(path.join(tempDir, `chunk_${i}`))) {
          allChunksUploaded = false;
          break;
        }
      }

      if (allChunksUploaded) {
        console.log(`[USER MANUAL UPLOAD] All ${totalChunks} chunks received. Merging...`);
        const manualPath = path.resolve(process.cwd(), "user_manual.pdf");
        
        const writeStream = fs.createWriteStream(manualPath);
        for (let i = 0; i < totalChunks; i++) {
          const currentChunkPath = path.join(tempDir, `chunk_${i}`);
          const chunkBuffer = fs.readFileSync(currentChunkPath);
          writeStream.write(chunkBuffer);
        }
        writeStream.end();

        await new Promise<void>((resolve, reject) => {
          writeStream.on("finish", () => {
            try {
              for (let i = 0; i < totalChunks; i++) {
                fs.unlinkSync(path.join(tempDir, `chunk_${i}`));
              }
              fs.rmdirSync(tempDir);
              console.log(`[USER MANUAL UPLOAD] Merge successful. Cleaned up temp files.`);
              resolve();
            } catch (err) {
              console.error("[USER MANUAL UPLOAD] Clean up error:", err);
              resolve();
            }
          });
          writeStream.on("error", (err) => {
            reject(err);
          });
        });

        return res.json({ success: true, merged: true });
      }

      return res.json({ success: true, merged: false });
    } catch (e: any) {
      console.error("[USER MANUAL CHUNK UPLOAD ERROR]", e);
      return res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/help/manual", express.raw({ type: () => true, limit: "50mb" }), async (req, res) => {
    try {
      const trigram = req.headers['x-user-trigram'];
      console.log(`[USER MANUAL UPLOAD] Trigram from header: "${trigram}"`);
      if (!trigram) {
        console.warn("[USER MANUAL UPLOAD] Missing x-user-trigram header");
        return res.status(401).json({ error: "Authentification requise." });
      }
      const user = await db.get("SELECT role FROM users WHERE trigram = ?", [trigram]);
      if (!user) {
        console.warn(`[USER MANUAL UPLOAD] User "${trigram}" not found in database`);
        return res.status(403).json({ error: "Accès refusé : Utilisateur introuvable." });
      }
      if (user.role !== 'admin') {
        console.warn(`[USER MANUAL UPLOAD] User "${trigram}" is not an admin (role: ${user.role})`);
        return res.status(403).json({ error: "Accès refusé : Droits administrateur requis." });
      }

      console.log(`[USER MANUAL UPLOAD] Body is Buffer: ${Buffer.isBuffer(req.body)}, Body type: ${typeof req.body}`);
      if (!req.body || !Buffer.isBuffer(req.body) || req.body.length === 0) {
        console.warn("[USER MANUAL UPLOAD] Empty or invalid body");
        return res.status(400).json({ error: "Fichier PDF vide ou manquant." });
      }

      console.log(`[USER MANUAL UPLOAD] Received PDF file of size: ${req.body.length} bytes`);
      const manualPath = path.resolve(process.cwd(), "user_manual.pdf");
      fs.writeFileSync(manualPath, req.body);
      console.log(`[USER MANUAL] Updated successfully by admin ${trigram} at ${manualPath}`);
      return res.json({ success: true });
    } catch (e: any) {
      console.error("[USER MANUAL UPDATE ERROR]", e);
      return res.status(500).json({ error: e.message });
    }
  });

  // Support /leaves and /leaves/ directly by serving the SPA (avoids infinite redirect loops)
  app.get(/^\/leaves\/?$/, async (req, res, next) => {
    const IS_PROD = process.env.NODE_ENV === "production";
    if (IS_PROD) {
      const possiblePaths = [
        path.resolve(__dirname, "dist"),
        path.resolve(__dirname, "LIVRABLE_PRODUCTION"),
        path.join(process.cwd(), "dist"),
        path.join(process.cwd(), "LIVRABLE_PRODUCTION"),
        path.resolve(__dirname, "."),
        process.cwd()
      ];
      let finalDistPath = possiblePaths[0];
      for (const p of possiblePaths) {
        if (fs.existsSync(path.join(p, "index.html"))) {
          finalDistPath = p;
          break;
        }
      }
      const indexPath = path.resolve(finalDistPath, "index.html");
      if (fs.existsSync(indexPath)) {
        return res.sendFile(indexPath);
      }
    }
    next();
  });

  // Vite configuration
  const IS_PROD = process.env.NODE_ENV === "production";
  console.log(`[SERVER START] NODE_ENV: ${process.env.NODE_ENV}, IS_PROD: ${IS_PROD}`);

  if (!IS_PROD) {
    try {
      console.log("[VITE] Loading Vite middleware...");
      const { createServer } = await import("vite");
      const vite = await createServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      console.log("[VITE] Vite server created.");
      app.use(vite.middlewares);
      console.log("[VITE] Vite middleware registered.");
      
      // Fallback for SPA in dev mode
      app.get("*", async (req, res, next) => {
        if (req.url.startsWith('/api')) return next();
        if (req.url.includes('.') && !req.url.endsWith('.html')) return next();
        
        try {
          const indexPath = path.resolve(__dirname, "index.html");
          if (!fs.existsSync(indexPath)) {
            return res.status(404).send("index.html missing in root");
          }
          let template = fs.readFileSync(indexPath, "utf-8");
          template = await vite.transformIndexHtml(req.url, template);
          res.status(200).set({ "Content-Type": "text/html" }).end(template);
        } catch (e) {
          console.error("[VITE FALLBACK ERROR]", e);
          next(e);
        }
      });
    } catch (e) {
      console.error("[VITE ERROR] Failed to load Vite middleware:", e);
      // Absolute fallback if Vite fails
      app.get("*", (req, res, next) => {
        if (req.url.startsWith('/api')) return next();
        res.sendFile(path.resolve(__dirname, "index.html"));
      });
    }
  } else {
    // Mode Production
    // On cherche les fichiers statiques dans dist ou LIVRABLE_PRODUCTION
    const possiblePaths = [
      path.resolve(__dirname, "dist"),
      path.resolve(__dirname, "LIVRABLE_PRODUCTION"),
      path.join(process.cwd(), "dist"),
      path.join(process.cwd(), "LIVRABLE_PRODUCTION"),
      path.resolve(__dirname, "."),
      process.cwd()
    ];

    let finalDistPath = possiblePaths[0];
    for (const p of possiblePaths) {
      if (fs.existsSync(path.join(p, "index.html"))) {
        finalDistPath = p;
        break;
      }
    }
      
    console.log(`[INFO] Production Mode: Serving files from ${finalDistPath}`);
    app.use(express.static(finalDistPath, {
      setHeaders: (res, path) => {
        console.log(`[STATIC] Serving ${path}`);
      }
    }));
    app.get("*", (req, res) => {
      if (req.path.startsWith('/api')) return res.status(404).json({ error: "Not found" });
      const indexPath = path.resolve(finalDistPath, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        console.error(`[ERROR] Index file not found at ${indexPath}. Current directory: ${process.cwd()}, __dirname: ${__dirname}`);
        res.status(404).send(`Index file not found in production folder (${finalDistPath}).`);
      }
    });
  }

  const server = app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });

  server.on("error", (err: any) => {
    console.error("[FATAL ERROR] HTTP Server failed:", err.message);
    if (err.code === "EADDRINUSE") {
      console.error(`Port ${PORT} is already in use.`);
    }
  });

  // Support HTTPS optionnel (pour le serveur interne)
  const sslDir = path.resolve(process.cwd(), "ssl");
  const keyPath = path.join(sslDir, "server.key");
  const certPath = path.join(sslDir, "server.crt");

  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    try {
      const credentials = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
      };
      const httpsServer = https.createServer(credentials, app);
      httpsServer.on("error", (err: any) => {
        console.error("[ERROR] HTTPS Server error:", err.message);
        if (err.code === "EACCES") {
          console.error("Permission denied for port 443. Use sudo or a higher port.");
        }
      });
      httpsServer.listen(443, "0.0.0.0", () => {
        console.log("[INFO] HTTPS Server running on https://localhost:443");
      });
    } catch (err) {
      console.error("[ERROR] Failed to start HTTPS server:", err);
    }
  }
}

startServer().catch(err => {
  console.error("[FATAL ERROR] Server failed to start:", err);
});

async function shutdown() {
  console.log("[INFO] Shutting down server...");
  if (db) {
    try {
      await db.close();
      console.log("[INFO] Database connection closed.");
    } catch (e) {
      console.error("[ERROR] Error closing database:", e);
    }
  }
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
