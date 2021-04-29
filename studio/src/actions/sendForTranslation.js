import React, { useEffect, useState } from 'react'
import { useDocumentOperation } from '@sanity/react-hooks'
import { getTranslatableFields,
         translatedDocumentToBlocks,
         googleTranslate } from '../translationTooling'
import schema from 'part:@sanity/base/schema'
import { languages, baseLanguage } from '../../schemas/languages'

export const SendForTranslation = ({
  id,
  type,
  draft,
  published,
  onComplete}) => {

  const { patch, publish } = useDocumentOperation(id, type)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  
  return {
    label: 'Send For Translation',
    icon: () =>  'T',
    onHandle: async () => {
      const docType = schema.get(type)
      const toTranslate = getTranslatableFields(draft, docType.fields)
      // const translatableLangs = [languages.filter(lang => lang.name != baseLanguage.name)[0]]
      // const allTranslations = await Promise.all(
      //   translatableLangs.map(async lang => await googleTranslate(toTranslate, lang.name))
      // )
      // const translatedDocsAsBlocks = allTranslations.map(trans => (
      //   {lang: trans.lang, doc: translatedDocumentToBlocks(trans.doc, docType.fields, draft)})
      // )
      const deserialized = translatedDocumentToBlocks(toTranslate, docType.fields, draft)
      debugger
      await publish.execute()
      setDialogOpen(true)
    },
    dialog: dialogOpen && {
      type: 'popover',
      onClose: onComplete,
      content: "Done!"
    }
  }
}

