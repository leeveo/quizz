'use client'

import './globals.css'
import { useEffect } from 'react'
import { checkAndFixDatabase } from '@/lib/db-fix'
import { fixParticipantsTable } from '@/lib/fix-participants-table'
import { fixAllDatabaseSchemas } from '@/lib/fix-database-schema'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Vérifier et réparer la structure de la base de données au chargement de l'application
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Vérifier et réparer la base de données générale
      checkAndFixDatabase()
        .then(result => {
          if (result.success) {
            console.log('Vérification de la base de données terminée')
          }
        })
        .catch(err => {
          console.error('Erreur lors de la vérification de la base de données:', err)
        })
      
      // Vérifier spécifiquement la table participants
      fixParticipantsTable()
        .then(result => {
          if (result.success) {
            console.log('Vérification de la table participants terminée')
          }
        })
        .catch(err => {
          console.error('Erreur lors de la vérification de la table participants:', err)
        })

      // Vérifier et réparer toutes les tables et schémas
      fixAllDatabaseSchemas()
        .then(result => {
          if (result.success) {
            console.log('Vérification du schéma de la base de données terminée')
          } else {
            console.warn('Certaines réparations du schéma de la base de données ont échoué:', result.results)
          }
        })
        .catch(err => {
          console.error('Erreur lors de la vérification du schéma de la base de données:', err)
        })
    }
  }, [])

  return (
    <html lang="fr">
      <head>
        <title>Quiz App Live</title>
        <meta name="description" content="Quiz interactif en temps réel" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body className="font-sans">{children}</body>
    </html>
  )
}
