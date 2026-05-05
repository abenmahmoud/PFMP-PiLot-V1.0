import type { AiResponse, AssistantType } from './aiTypes'

const RESPONSES: Record<AssistantType, (prompt: string) => AiResponse> = {
  superadmin: (prompt) => {
    const lower = prompt.toLowerCase()

    if (
      lower.includes('accompagn') ||
      (lower.includes('quel') && lower.includes('établissement') && lower.includes('aider'))
    ) {
      return {
        draft:
          "Établissements à accompagner en priorité :\n\n" +
          "1. Lycée Marie Curie (Lille) — score d'activité 18/100, aucune connexion depuis le 12 mars 2026, base entreprises sous-dimensionnée (6 fiches, 28% complétude). Risque d'abandon élevé.\n" +
          "2. Lycée Émile Zola (Rennes) — score 36/100, base entreprises faible (5 fiches, 31% complétude). Accompagnement à prévoir avant la rentrée 2026-2027.\n" +
          "3. Lycée Voltaire (Marseille) — score 64/100 mais usage en baisse. Mérite un point informel.\n\n" +
          "Pour Marie Curie, recommandation d'un accompagnement « réseau entreprises » : audit de la base, atelier d'enrichissement, modèle d'import.",
        suggestedActions: [
          'Programmer un appel avec le référent Marie Curie cette semaine',
          'Préparer un audit de la base entreprises pour Émile Zola',
          'Proposer une revue trimestrielle au DDFPT du Lycée Voltaire',
        ],
        requiresHumanValidation: true,
        generatedAt: new Date().toISOString(),
      }
    }

    if (
      lower.includes('base') &&
      (lower.includes('entreprise') || lower.includes('faible'))
    ) {
      return {
        draft:
          "Établissements avec une base entreprises faible (< 8 fiches) :\n\n" +
          "• Lycée Marie Curie (Lille) — 6 entreprises, complétude 28%.\n" +
          "• Lycée Émile Zola (Rennes) — 5 entreprises, complétude 31%.\n\n" +
          "Conséquences observées : taux d'affectation inégal, recours à des entreprises de dernière minute, suivi tutoral fragile.\n\n" +
          "Recommandation : proposer à ces deux établissements un atelier « base intelligente entreprises PFMP » (1h30, à distance) et un modèle d'import CSV/Excel.",
        suggestedActions: [
          'Préparer un atelier d\'enrichissement de base entreprises',
          'Partager le modèle d\'import CSV',
          'Suivre la complétude moyenne sur 30 jours',
        ],
        requiresHumanValidation: true,
        generatedAt: new Date().toISOString(),
      }
    }

    if (lower.includes('secteur') || lower.includes('famille')) {
      return {
        draft:
          "Cartographie des secteurs et familles de métiers (réseau démo, Lycée Jean Moulin) :\n\n" +
          "Secteurs les plus représentés :\n" +
          "• Automobile : 3 entreprises (Renault Vaise, Peugeot Lyon Sud, Norauto).\n" +
          "• Commerce et grande distribution : 4 entreprises (Carrefour, Fnac, Decathlon, Brico Dépôt).\n" +
          "• Gestion et administration : 2 entreprises (AXA, Banque Populaire).\n\n" +
          "Familles sous-représentées (≤ 1 entreprise) : Hôtellerie-restauration, Artisanat d'art (hors ébénisterie), Santé/social, Numérique.\n\n" +
          "À l'échelle réseau, ces familles sont systématiquement plus rares — un travail conjoint entre établissements pourrait permettre de mutualiser des contacts.",
        suggestedActions: [
          'Identifier les établissements ayant des contacts hôtellerie-restauration',
          'Proposer un échange inter-établissement sur les familles sous-représentées',
        ],
        requiresHumanValidation: true,
        generatedAt: new Date().toISOString(),
      }
    }

    if (
      lower.includes('inactif') ||
      lower.includes('peu actif') ||
      lower.includes('relance') ||
      lower.includes('relancer')
    ) {
      return {
        draft:
          "Brouillon de message de relance pour un établissement peu actif :\n\n" +
          "« Bonjour [Prénom],\n\n" +
          "Nous remarquons que l'usage de PFMP Pilot AI s'est ralenti ces dernières semaines au sein de votre établissement. Avant la fin de la PFMP en cours, nous aimerions faire un point rapide (20 minutes) pour identifier ensemble les éventuels blocages : prise en main, base entreprises, suivi des visites.\n\n" +
          "Quelques créneaux possibles cette semaine : mardi 14h, jeudi 10h ou 16h.\n\n" +
          "Bien cordialement,\n" +
          "L'équipe PFMP Pilot AI »\n\n" +
          "Personnaliser : prénom du DDFPT, nom de l'établissement, rappel d'un point fort observé (ex. : nombre de visites validées le trimestre dernier).",
        missingInformation: [
          'Nom du correspondant principal',
          'Historique des échanges support des 30 derniers jours',
        ],
        suggestedActions: [
          'Personnaliser le brouillon avant envoi',
          'Préparer un export d\'usage à présenter en réunion',
        ],
        requiresHumanValidation: true,
        generatedAt: new Date().toISOString(),
      }
    }

    if (lower.includes('rapport') || lower.includes('hebdo')) {
      return {
        draft:
          "Rapport hebdomadaire PFMP Pilot AI — semaine du 28 avril au 4 mai 2026\n\n" +
          "• 5 établissements clients, dont 3 actifs et 2 à accompagner.\n" +
          "• 1 360 élèves suivis au total (cumul démo).\n" +
          "• Réseau entreprises : 58 fiches, 9 partenaires forts identifiés, complétude moyenne 50%.\n" +
          "• 18 visites enregistrées sur la semaine.\n" +
          "• 9 alertes ouvertes, dont 2 urgentes (stage interrompu, élèves sans stage).\n" +
          "• 2 clients à relancer (Marie Curie, Émile Zola).\n\n" +
          "Recommandation : déclencher l'atelier « base intelligente entreprises » avant fin mai.",
        suggestedActions: [
          'Envoyer le rapport au COO',
          'Préparer la relance Marie Curie / Émile Zola',
        ],
        requiresHumanValidation: true,
        generatedAt: new Date().toISOString(),
      }
    }

    return {
      draft:
        "Brouillon prêt à être adapté. Précisez l'établissement ou le sujet pour une réponse plus ciblée — ex. : « quels établissements ont une base entreprises faible ? », « prépare une relance pour Voltaire ».",
      missingInformation: ['Établissement ou thématique concernée'],
      requiresHumanValidation: true,
      generatedAt: new Date().toISOString(),
    }
  },

  establishment: (prompt) => {
    const lower = prompt.toLowerCase()

    if (
      lower.includes('relancer') &&
      (lower.includes('entreprise') || lower.includes('tuteur'))
    ) {
      return {
        draft:
          "Entreprises à relancer cette semaine (Lycée Jean Moulin, PFMP 2) :\n\n" +
          "• Mairie du 8e — tuteur peu réactif (Olivier Roux). Vérifier sa disponibilité avant la prochaine visite de Liam Mercier.\n" +
          "• Norauto Confluence — turn-over de tuteurs et un stage interrompu en avril. Brief renforcé recommandé avant tout nouveau placement.\n" +
          "• SNCF Gare Part-Dieu — pas de retour suite au contact de février. Relance courte par email.\n\n" +
          "Brouillon de message générique :\n\n" +
          "« Bonjour, dans le cadre du suivi de notre partenariat PFMP, nous souhaitions faire un point rapide. Une visite ou un échange téléphonique cette semaine serait-il possible ? »",
        suggestedActions: [
          'Envoyer la relance à la Mairie du 8e',
          'Préparer un brief PFMP renforcé pour Norauto',
          'Replanifier la prospection SNCF',
        ],
        requiresHumanValidation: true,
        generatedAt: new Date().toISOString(),
      }
    }

    if (
      lower.includes('point') ||
      lower.includes('résume') ||
      lower.includes('résumé') ||
      lower.includes('synthese') ||
      lower.includes('synthèse')
    ) {
      return {
        draft:
          "Point sur la PFMP 2 — Printemps 2026 (Lycée Jean Moulin)\n\n" +
          "• 20 élèves concernés sur 4 classes.\n" +
          "• Taux d'affectation : 80 % (4 élèves sans stage).\n" +
          "• Taux de visites réalisées : 35 % à mi-période.\n" +
          "• 6 documents manquants (1 convention, 5 attestations PFMP1).\n" +
          "• Réseau entreprises : 14 fiches, 4 partenaires forts, 2 entreprises à relancer (Mairie du 8e, Norauto).\n" +
          "• Points de vigilance : Nathan Faure (stage interrompu), Liam Mercier (tuteur peu disponible).\n\n" +
          "Priorités proposées :\n" +
          "1. Trouver une affectation aux 4 élèves sans stage avant le 12 mai.\n" +
          "2. Replanifier les visites en retard (Maxime Dubois en priorité).\n" +
          "3. Récupérer les attestations PFMP1 manquantes.\n" +
          "4. Relancer les entreprises identifiées comme « à surveiller ».",
        suggestedActions: [
          'Préparer une réunion équipe pédagogique',
          'Rédiger un message au proviseur',
          'Lancer une relance des tuteurs pour les attestations',
        ],
        requiresHumanValidation: true,
        generatedAt: new Date().toISOString(),
      }
    }

    if (lower.includes('retard') || lower.includes('classe')) {
      return {
        draft:
          "Classes en retard sur la PFMP 2 :\n\n" +
          "• 1ère MVA — 1 élève sans stage, 1 stage interrompu, 1 visite à replanifier.\n" +
          "• 2nde GATL — 1 élève sans stage, 1 visite avec tuteur absent.\n\n" +
          "Term Commerce et CAP EBT sont sur la trajectoire attendue.",
        requiresHumanValidation: true,
        generatedAt: new Date().toISOString(),
      }
    }

    return {
      draft:
        "Brouillon prêt. Précisez la période, la classe ou le sujet — ex. : « fais le point sur la PFMP 2 », « quelles entreprises faut-il relancer ? ».",
      missingInformation: ['Période, classe ou thématique concernée'],
      requiresHumanValidation: true,
      generatedAt: new Date().toISOString(),
    }
  },

  teacher: (prompt) => {
    if (!prompt.trim()) {
      return {
        draft: "Aucune note fournie. Ajoutez vos notes brutes pour que l'IA propose une reformulation.",
        missingInformation: ['Notes brutes du professeur'],
        requiresHumanValidation: true,
        generatedAt: new Date().toISOString(),
      }
    }
    const lines = prompt
      .split(/\n|;|·|•|- /)
      .map((s) => s.trim())
      .filter(Boolean)
    const bullets = lines.map((l) => `- ${l.charAt(0).toUpperCase() + l.slice(1)}`).join('\n')
    return {
      draft:
        "Brouillon de compte rendu (à valider par le professeur)\n\n" +
        "Conditions et déroulement :\n" +
        bullets +
        "\n\nL'élève s'inscrit dans une posture professionnelle conforme aux attendus du référentiel. " +
        "Les points positifs et les difficultés ont été abordés avec le tuteur. " +
        "Une prochaine étape de suivi a été convenue.",
      missingInformation: [
        "Vérifier la concordance avec les notes saisies",
        "Compléter le niveau d'alerte si nécessaire",
        'Compléter la prochaine action attendue',
      ],
      requiresHumanValidation: true,
      generatedAt: new Date().toISOString(),
    }
  },
}

export const mockAiResponses = RESPONSES
