import React, { useEffect, useState } from 'react'
import { useDocumentOperation } from '@sanity/react-hooks'
import { getSerializedDocument} from '../serializationHelpers'
import schema from 'part:@sanity/base/schema'
import { languages, baseLanguage } from '../../schemas/languages'
import { createTask, getTranslation } from '../transifexAdapter'

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
      const task = await createTask(id)
      console.log(task)
      const translation = await getTranslation(task.taskId, 'fr')
      console.log(translation)
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

