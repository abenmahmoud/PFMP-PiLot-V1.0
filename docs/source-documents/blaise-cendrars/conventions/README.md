# Conventions Blaise Cendrars

Documents sources fournis par le lycee pour auditer et adapter le module Document Intelligence PFMP.

Ces fichiers sont des references metier. Ils ne doivent pas etre modifies directement : les mappings et modeles numeriques doivent etre crees dans l'application a partir de ces sources.

| Fichier repo | Fichier original | Usage cible | SHA-256 |
| --- | --- | --- | --- |
| `convention-pcepc-2025.docx` | `convention PCEPC2025docx.docx` | Convention classe/filiere PCEPC 2025 | `4818D069941869A64AB236807B85F2865ED50D533C737A7C92843B2AE0CA58B3` |
| `convention-melec-2025.docx` | `convention MELEC2025.docx` | Convention classe/filiere MELEC 2025 | `BD004BD9B42BCE9288F85A652736DA697404157F89212E3DE32CBF4B9B2243D7` |
| `convention-cap-aqe-2025.docx` | `--nvention CAP AQE2025.docx` | Convention classe/filiere CAP AQE 2025 | `6FC8B3B6FF14409049DF76ED3864632B310649892F649E399279D727F52C24B9` |

## Attendu pour l'audit Claude

- Verifier les champs variables utiles : eleve, classe, formation, periode, entreprise, SIRET, tuteur, representant legal, signatures.
- Identifier les clauses fixes a conserver telles quelles.
- Proposer le mapping vers `document_template_fields`.
- Signaler les differences par filiere si elles imposent un modele par classe.
