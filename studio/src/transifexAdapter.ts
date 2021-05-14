import { Adapter, TranslationTask } from 'sanity-plugin-translation'
import { getSerializedDocument, getDeserializedDocument } from './serializationHelpers'

const baseTransifexUrl = 'https://rest.api.transifex.com'
const organizationSlug = 'sanity-1'
const projectSlug = 'sanity-file-upload'
const projectOrgSlug = `o:${organizationSlug}:p:${projectSlug}`
const headers = {
  'Authorization': 'Bearer {token}',
  'Content-Type': 'application/vnd.api+json'
}

const getLocales = async () => {

  //TODO: exclude base locale
  return fetch(`${baseTransifexUrl}/projects/${projectOrgSlug}/languages`,
    {headers})
      .then(res => res.json())
      .then(res => res.data.map(lang => (
        {
          enabled: true,
          description: lang.attributes.name,
          localeId: lang.attributes.code
        })
      ))
}


const getTranslationTask = async (documentId) => {

  const projectFilter = `filter[project]=${projectOrgSlug}`
  const resourceFilter = `filter[resource]=${projectOrgSlug}:r:${documentId}`

  const task = await fetch(`${baseTransifexUrl}/resource_language_stats?${projectFilter}&${resourceFilter}`,
        {headers})
          .then(res => res.json())
          .then(res => (
            {
              taskId: `${projectOrgSlug}:r:${documentId}`,
              documentId: documentId,
              locales: res.data.map(locale => (
                {
                  localeId: locale.relationships.language.data.id.split(':')[1],
                  //TODO: should this be reviewed_words? proofread_words?
                  progress: Math.floor(100 * (locale.attributes.translated_strings / parseFloat(locale.attributes.total_strings)))
                }
              )) //end locale iteration
            } //end TranslationTask obj
        )) //end json parse

  const locales = await getLocales()
  const localeIds = locales.map(l => l.localeId)
  const validLocales = task.locales.filter(locale => localeIds.find(id => id == locale.localeId))
  task.locales = validLocales

  return task

}


const createResource = async (doc) => {

  const resourceCreateBody = {
    data: {
      attributes: {
        accept_translations: true,
        //TODO: make this a choice for the user, prob on a per-document-type level
        name: doc.name ?? doc.title,
        slug: doc._id,
      },
      relationships: {
        i18n_format: {
          data: {
            //TODO: make this a choice for the user, prob on a per-document-type level
            id: 'HTML_FRAGMENT',
            type: 'i18n_formats'
          }
        },
        project: {
          data: {
            id: projectOrgSlug,
            type: 'projects'
          }
        }
      },
      type: 'resources'
    }
  }

  return fetch(`${baseTransifexUrl}/resources`, {
    headers: headers,
    method: 'POST',
    body: JSON.stringify(resourceCreateBody)
  })
    .then(res => res.json())
    .then(res => res.data.id)

}

const createTask = async (documentId: string, localeIds: string[])=> {
  
  const doc = await getSerializedDocument(documentId)
  let resourceId = await fetch(`${baseTransifexUrl}/resources/${projectOrgSlug}:r:${documentId}`,
    {headers})
    .then(res => res.json())
    .then(res => (res.data) ? res.data.id : null)

  if (!resourceId) {
    resourceId = await createResource(doc)
  }


  const resourceUploadUrl = `${baseTransifexUrl}/resource_strings_async_uploads`
  const resourceUploadBody = {
     data: {
       attributes: {
         content: doc.content,
         content_encoding: 'text'
       },
       relationships: {
         resource: {
           data: {
             id: resourceId,
             type: 'resources'
           }
         }
       },
       type: 'resource_strings_async_uploads'
     }
  }

  return fetch(resourceUploadUrl, {
    method: 'POST',
    body: JSON.stringify(resourceUploadBody),
    headers: headers
  })
  .then(res => res.json())
  .then(res => getTranslationTask(documentId))

}


const getTranslation = async (taskId: string, localeId: string) => {

  const resourceDownloadBody = {
    data: {
      attributes: {
        content_encoding: 'text',
        //TODO: remove for demo
      },
      relationships: {
        language: {
          data: {
            id: `l:${localeId}`,
            type: 'languages'
          }
        },
        resource: {
          data: {
            id: taskId,
            type: 'resources'
          }
        }
      },
      type: 'resource_translations_async_downloads'
    }
  }

  const resourceDownloadUrl = `${baseTransifexUrl}/resource_translations_async_downloads`
  const translationDownloadId = await fetch(resourceDownloadUrl, {
      headers: headers,
      method: 'POST',
      body: JSON.stringify(resourceDownloadBody)
    })
    .then(res => res.json())
    .then(res => res.data.id)

  return new Promise(resolve => {
    setTimeout(function() {
      fetch(
        `${resourceDownloadUrl}/${translationDownloadId}`,
        {headers})
          .then(res => {
            if (res.redirected) {
              resolve(handleFileDownload(res.url, taskId))
            } else {
              return res.json()
            }
          })
    }, 3000)
  })
}


const handleFileDownload = async (url, taskId) => {
  const html = await fetch(url)
    .then(res => res.text())
  const identifiers = taskId.split(':')
  const docId = identifiers[identifiers.length - 1]
  return getDeserializedDocument(docId, {content: html})
}

export const TransifexAdapter: Adapter = {
  getLocales,
  getTranslationTask,
  createTask,
  getTranslation
}
