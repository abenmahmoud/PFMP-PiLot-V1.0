import type { AiResponse, AssistantType } from './aiTypes'

const RESPONSES: Record<AssistantType, (prompt: string) => AiResponse> = {
  superadmin: (prompt) => {
    const lower = prompt.toLowerCase()
    if (lower.includes('inactif') || lower.includes('peu actif') || lower.includes('relance')) {
      return {
        draft:
          "Sur les 3 établissements connectés, deux nécessitent une attention :\n\n" +
          "• Lycée Marie Curie (Lille) — 0 connexion depuis le 12 mars, score d'activité 18/100. Risque d'abandon élevé.\n" +
          "• Lycée Voltaire (Marseille) — usage en baisse, 2 visites enregistrées sur les 4 dernières semaines.\n\n" +
          "Brouillon de message de relance pour Marie Curie :\n\n" +
          "« Bonjour, nous remarquons que l'usage de PFMP Pilot AI s'est interrompu mi-mars. Pouvons-nous prévoir un point de 20 minutes pour identifier ensemble les blocages éventuels ? Nous proposons un créneau cette semaine. »",
        missingInformation: [
          "Nom du correspondant principal du Lycée Marie Curie",
          "Historique des échanges support des 30 derniers jours",
        ],
        suggestedActions: [
          'Programmer un appel avec le référent Marie Curie cette semaine',
          'Préparer un export d\'usage à présenter en réunion',
          'Activer un suivi hebdomadaire pour Voltaire',
        ],
        requiresHumanValidation: true,
        generatedAt: new Date().toISOString(),
      }
    }
    if (lower.includes('rapport') || lower.includes('hebdo')) {
      return {
        draft:
          "Rapport hebdomadaire PFMP Pilot AI — semaine du 28 avril au 4 mai 2026\n\n" +
          "• 3 établissements clients, dont 2 actifs.\n" +
          "• 930 élèves suivis au total.\n" +
          "• 18 visites enregistrées sur la semaine.\n" +
          "• 8 alertes ouvertes, dont 2 urgentes (stage interrompu, élèves sans stage).\n" +
          "• 1 client à relancer (Marie Curie, score 18/100).\n\n" +
          "Recommandation : programmer la relance Marie Curie avant vendredi.",
        suggestedActions: [
          'Envoyer le rapport au COO',
          'Préparer un message de relance pour Marie Curie',
        ],
        requiresHumanValidation: true,
        generatedAt: new Date().toISOString(),
      }
    }
    return {
      draft:
        "Brouillon prêt à être adapté. Précisez l'établissement ou le sujet pour une réponse plus ciblée (ex. : « résume l'activité du Lycée Voltaire »).",
      missingInformation: ['Établissement ou période concernée'],
      requiresHumanValidation: true,
      generatedAt: new Date().toISOString(),
    }
  },

  establishment: (prompt) => {
    const lower = prompt.toLowerCase()
    if (lower.includes('point') || lower.includes('résume') || lower.includes('résumé') || lower.includes('synthese') || lower.includes('synthèse')) {
      return {
        draft:
          "Point sur la PFMP 2 — Printemps 2026 (Lycée Jean Moulin)\n\n" +
          "• 20 élèves concernés sur 4 classes.\n" +
          "• Taux d'affectation : 80 % (4 élèves sans stage).\n" +
          "• Taux de visites réalisées : 35 % à mi-période.\n" +
          "• 6 documents manquants (1 convention, 5 attestations PFMP1).\n" +
          "• Points de vigilance : Nathan Faure (stage interrompu), Liam Mercier (tuteur peu disponible).\n\n" +
          "Priorités proposées :\n" +
          "1. Trouver une affectation aux 4 élèves sans stage avant le 12 mai.\n" +
          "2. Replanifier les visites en retard (Maxime Dubois en priorité).\n" +
          "3. Récupérer les attestations PFMP1 manquantes.",
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
        "Brouillon prêt. Précisez la période ou la classe pour affiner (ex. : « fais le point sur la PFMP 2 pour la 1ère MVA »).",
      missingInformation: ['Période ou classe concernée'],
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
